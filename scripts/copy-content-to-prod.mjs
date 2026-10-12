#!/usr/bin/env node
// Kissan Sahyog — one-time copy of content rows from STAGING to PRODUCTION.
//
//   node scripts/copy-content-to-prod.mjs            # dry run (default): reads both, writes nothing
//   node scripts/copy-content-to-prod.mjs --apply    # write to production, fix sequences, re-count
//   optional: --exclude=table:pk,table:pk            # leave extra staging rows out
//
// Staging = .env, production = .env.production (both parsed here; do NOT use --env-file).
//
// Three kinds of table:
//   PK_TABLES       staging wins: upsert on the primary key (update existing ids, insert missing ids).
//   NATURAL_TABLES  production already has this content under other ids (seeded by migrations):
//                   match on a natural key and INSERT ONLY the keys production lacks. Existing rows are
//                   never updated, except the columns named in NATURAL_UPDATE_COLS.
//   COMPARE_TABLES  never written: printed side by side for the owner.
//
// Safety model:
//   - Staging is only ever touched by stagingGet() (HTTP GET) and sql() (read_only: true).
//   - Production rows are only ever written by prodWrite() (PostgREST insert/upsert, public schema).
//     The only other production write is prodSetval(), which moves a serial sequence forward.
//     No delete, no truncate, no DDL, no auth, no storage.
//   - Every line printed goes through scrub(), which removes any value read from the env files.
//   - Rows are compared first and only new/changed rows are sent, so re-running is a no-op.

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const APPLY = process.argv.includes('--apply')
const BATCH = 200
const PAGE = 1000

const PK_TABLES = [
  'cold_storage_directory', 'crops', 'equipment_types', 'pincodes', 'village_coordinates', 'mandi_prices',
  'sarkari_yojana', 'resources', 'videos', 'experts', 'kisan_mela', 'kisan_mela_candidates',
  'kisan_sawaal', 'kisan_sawaal_slug_redirects', 'kisan_safalta',
]
// Natural key per insert-only table. NULL and '' are the same key part (msp_prices.variety is
// NULL for most crops, which is why its unique constraint does not stop duplicates).
const NATURAL_TABLES = {
  page_faqs: ['page_key', 'q_hi'],
  procurement_centres: ['name_hi'],
  msp_prices: ['crop_en', 'variety', 'marketing_year'],
  articles: ['slug'],
}
// The only columns ever updated on an existing production row of an insert-only table (matched on
// the natural key, written to production's own id). Everything else on those rows stays as it is.
const NATURAL_UPDATE_COLS = { articles: ['cover_image_url'] }
// Not written. `key` pairs a staging row with a production row; `show` is what gets printed.
const COMPARE_TABLES = {
  input_prices: { key: ['item_hi', 'shop_name'], show: ['item_hi', 'item_en', 'shop_name', 'location', 'price', 'unit', 'updated_date', 'is_active'] },
  farm_events: { key: ['title_hi'], show: ['title_hi', 'title_en', 'event_date', 'location', 'organizer', 'is_active'] },
}
const WRITE_TABLES = [...PK_TABLES, ...Object.keys(NATURAL_TABLES)]
const ALL_TABLES = [...WRITE_TABLES, ...Object.keys(COMPARE_TABLES)]
const DISPLAY_ORDER = [
  'cold_storage_directory', 'crops', 'equipment_types', 'pincodes', 'village_coordinates', 'procurement_centres',
  'mandi_prices', 'msp_prices', 'input_prices', 'sarkari_yojana', 'resources', 'videos', 'articles', 'experts',
  'farm_events', 'page_faqs', 'kisan_mela', 'kisan_mela_candidates', 'kisan_sawaal', 'kisan_sawaal_slug_redirects', 'kisan_safalta',
]
// Never copied. The script refuses to start if one of these ends up in a write list.
const FORBIDDEN = [
  'profiles', 'listings', 'listing_private_contact', 'listing_unavailable_dates', 'listing_view_log',
  'listing_reports', 'alert_subscriptions', 'join_clicks', 'search_misses', 'voice_transcribe_calls',
  'kisan_mela_interest', 'cold_storage_claims', 'carbon_poll_votes', 'carbon_suggestions',
  'weather_cache_v2', 'weather_grid_requests', 'geocode_state', 'mela_merge_exclusions',
  'schema_migrations', 'seed_log', 'site_settings', ...Object.keys(COMPARE_TABLES),
]
const SETTINGS = 'site_settings' // keys + differs yes/no, never values, never written

// Test rows left out of the copy. Each rule returns a reason, or null to keep the row.
const starts = (v, p) => typeof v === 'string' && v.trim().toUpperCase().startsWith(p)
const has = (v, p) => (Array.isArray(v) ? v : [v]).some((x) => typeof x === 'string' && x.toLowerCase().includes(p))
const TEST_NAME = 'REJECTED CANDIDATE BACKENDTEST', TEST_VENUE = 'Test Ground', TEST_HOST = 'verify-test.example'
const EXCLUDE_RULES = {
  kisan_mela: (r) =>
    starts(r.name_hi, TEST_NAME) || starts(r.name_en, TEST_NAME) ? `name starts with '${TEST_NAME}'`
      : (r.venue || '').trim() === TEST_VENUE ? `venue is '${TEST_VENUE}'`
        : has(r.source_url, TEST_HOST) || has(r.source_urls, TEST_HOST) ? `source URL contains '${TEST_HOST}'` : null,
  kisan_mela_candidates: (r, excluded) =>
    starts(r.raw_name, TEST_NAME) ? `name starts with '${TEST_NAME}'`
      : (r.raw_venue || '').trim() === TEST_VENUE ? `venue is '${TEST_VENUE}'`
        : has(r.source_url, TEST_HOST) || has(r.verified_primary_source_url, TEST_HOST) ? `source URL contains '${TEST_HOST}'`
          : r.kisan_mela_id != null && excluded.kisan_mela?.has(String(r.kisan_mela_id)) ? 'points to an excluded kisan_mela row' : null,
}

// ---------- env + secret scrubbing ----------
function parseEnv(file) {
  const path = join(ROOT, file)
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m) out[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2')
  }
  return out
}
const ENV = { staging: parseEnv('.env'), production: parseEnv('.env.production') }

function refOf(env) {
  try {
    const ref = new URL(env.VITE_SUPABASE_URL).host.split('.')[0]
    return /^[a-z0-9]{15,}$/.test(ref) ? ref : null
  } catch { return null }
}
const REF = { staging: refOf(ENV.staging), production: refOf(ENV.production) }

// URLs and project refs are public; everything else in the env files is treated as secret.
const SECRETS = Object.values(ENV)
  .flatMap((e) => Object.entries(e).filter(([k]) => k !== 'VITE_SUPABASE_URL').map(([, v]) => v))
  .filter((v) => v && v.length >= 8)
const scrub = (s) => {
  let t = String(s)
  for (const v of SECRETS) t = t.split(v).join('[redacted]')
  return t.replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[redacted-jwt]')
    .replace(/\b(sb_secret|sb_publishable|sbp)_[A-Za-z0-9_-]{8,}/g, '[redacted-key]')
}
const log = (...a) => console.log(scrub(a.join(' ')))
const fail = (msg) => { console.error(scrub(`\nERROR: ${msg}`)); process.exit(1) }

// ---------- transport ----------
const restHeaders = (side) => {
  const k = ENV[side].SUPABASE_SERVICE_ROLE_KEY
  return { apikey: k, Authorization: `Bearer ${k}` }
}
const restUrl = (side) => `${ENV[side].VITE_SUPABASE_URL.replace(/\/+$/, '')}/rest/v1`

async function restGet(side, pathAndQuery) {
  const res = await fetch(`${restUrl(side)}/${pathAndQuery}`, { method: 'GET', headers: restHeaders(side) })
  const text = await res.text()
  if (!res.ok) throw new Error(`${side} GET ${pathAndQuery.split('?')[0]} failed (HTTP ${res.status}): ${text.slice(0, 300)}`)
  return JSON.parse(text)
}
const stagingGet = (q) => restGet('staging', q)
const prodGet = (q) => restGet('production', q)

async function managementSql(side, query, readOnly) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF[side]}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ENV[side].SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, read_only: readOnly }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${side} SQL failed (HTTP ${res.status}): ${text.slice(0, 300)}`)
  return JSON.parse(text)
}
// Read-only SQL (introspection). read_only:true makes Postgres reject any write.
const sql = (side, query) => managementSql(side, query, true)

function assertProdWrite(table) {
  if (!APPLY) throw new Error('production write attempted without --apply')
  if (!REF.production || REF.production === REF.staging) throw new Error('refusing to write: bad production ref')
  if (!WRITE_TABLES.includes(table) || FORBIDDEN.includes(table)) throw new Error(`refusing to write table ${table}`)
}

// The ONLY function that writes rows. Production only, keyed on the primary key.
//   'merge'  = upsert (insert new ids, update existing ids)    — PK_TABLES
//   'ignore' = insert only (an existing id is left untouched)  — NATURAL_TABLES
async function prodWrite(table, pk, columns, rows, resolution) {
  assertProdWrite(table)
  if (resolution === 'merge' ? !PK_TABLES.includes(table) : resolution !== 'ignore') throw new Error(`refusing ${resolution} write on ${table}`)
  const url = `${restUrl('production')}/${table}?on_conflict=${pk.join(',')}&columns=${columns.join(',')}`
  if (!url.includes(`//${REF.production}.`)) throw new Error('refusing to write: URL is not the production project')
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...restHeaders('production'), 'Content-Type': 'application/json', Prefer: `resolution=${resolution}-duplicates,return=minimal` },
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`production write into ${table} failed (HTTP ${res.status}): ${(await res.text()).slice(0, 400)}`)
}

// Updates the allowed columns of ONE existing production row, addressed by its full primary key.
async function prodPatch(table, pk, where, set) {
  assertProdWrite(table)
  const allowed = NATURAL_UPDATE_COLS[table] || []
  const cols = Object.keys(set)
  if (!cols.length || cols.some((c) => !allowed.includes(c))) throw new Error(`refusing patch on ${table}: column not allowed`)
  if (!pk.length || pk.some((c) => where[c] == null)) throw new Error(`refusing patch on ${table}: incomplete primary key`)
  const url = `${restUrl('production')}/${table}?${pk.map((c) => `${c}=eq.${encodeURIComponent(where[c])}`).join('&')}`
  if (!url.includes(`//${REF.production}.`)) throw new Error('refusing to write: URL is not the production project')
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...restHeaders('production'), 'Content-Type': 'application/json', Prefer: 'handling=strict,max-affected=1,return=representation' },
    body: JSON.stringify(set),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`production update of ${table} failed (HTTP ${res.status}): ${text.slice(0, 400)}`)
  if (JSON.parse(text).length !== 1) throw new Error(`production update of ${table} did not match exactly one row`)
}

// Moves a serial/identity sequence up to max(column). GREATEST() means it can never move backwards.
async function prodSetval(table, column, sequence) {
  assertProdWrite(table)
  const ident = /^[a-z_][a-z0-9_]*$/
  if (!ident.test(table) || !ident.test(column) || !/^public\.[a-z_][a-z0-9_]*$/.test(sequence)) throw new Error(`refusing setval: unexpected identifier for ${table}.${column}`)
  const out = await managementSql('production', `select setval('${sequence}'::regclass, greatest((select max(${column}) from public.${table}), (select last_value from ${sequence})), true) as value where exists (select 1 from public.${table})`, false)
  return out[0]?.value ?? null
}

// ---------- schema ----------
const inList = (names) => names.map((n) => `'${n}'`).join(',')

async function loadSchema(side, tables) {
  const [cols, pks, fks, uniq, trg] = await Promise.all([
    sql(side, `select table_name t, column_name c, is_generated g, is_identity i, identity_generation ig, coalesce(column_default,'') d,
                 pg_get_serial_sequence('public.'||table_name, column_name) seq
               from information_schema.columns where table_schema='public' and table_name in (${inList(tables)})
               order by table_name, ordinal_position`),
    sql(side, `select r.relname t, a.attname c from pg_index x
               join pg_class r on r.oid=x.indrelid join pg_namespace n on n.oid=r.relnamespace
               join unnest(x.indkey) with ordinality k(attnum, ord) on true
               join pg_attribute a on a.attrelid=r.oid and a.attnum=k.attnum
               where n.nspname='public' and x.indisprimary and r.relname in (${inList(tables)}) order by r.relname, k.ord`),
    sql(side, `select r.relname t, f.relname ft, fn.nspname fs, c.conname n,
                 (select array_agg(a.attname order by k.ord) from unnest(c.conkey) with ordinality k(attnum, ord)
                    join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum) cols,
                 (select array_agg(a.attname order by k.ord) from unnest(c.confkey) with ordinality k(attnum, ord)
                    join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.attnum) fcols
               from pg_constraint c join pg_class r on r.oid=c.conrelid join pg_namespace n on n.oid=r.relnamespace
               join pg_class f on f.oid=c.confrelid join pg_namespace fn on fn.oid=f.relnamespace
               where c.contype='f' and n.nspname='public' and r.relname in (${inList(tables)})`),
    sql(side, `select r.relname t, i.relname n,
                 (select array_agg(pg_get_indexdef(x.indexrelid, g, true) order by g) from generate_series(1, x.indnkeyatts) g) keys
               from pg_index x join pg_class r on r.oid=x.indrelid join pg_class i on i.oid=x.indexrelid
               join pg_namespace n on n.oid=r.relnamespace
               where n.nspname='public' and x.indisunique and not x.indisprimary and r.relname in (${inList(tables)})`),
    sql(side, `select c.relname t, tg.tgname n, p.proname f from pg_trigger tg
               join pg_class c on c.oid=tg.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=tg.tgfoid
               where n.nspname='public' and not tg.tgisinternal and c.relname in (${inList(tables)})`),
  ])
  const by = (rows) => rows.reduce((m, r) => ((m[r.t] ||= []).push(r), m), {})
  return { cols: by(cols), pks: by(pks), fks: by(fks), uniq: by(uniq), trg: by(trg) }
}

// Parents before children. Only FKs between written tables matter for ordering.
function fkOrder(tables, fks) {
  const deps = Object.fromEntries(tables.map((t) => [t, new Set()]))
  for (const t of tables) for (const fk of fks[t] || []) if (fk.ft !== t && tables.includes(fk.ft)) deps[t].add(fk.ft)
  const done = [], seen = new Set()
  const visit = (t, path = []) => {
    if (seen.has(t)) return
    if (path.includes(t)) throw new Error(`foreign key cycle: ${[...path, t].join(' -> ')}`)
    for (const d of deps[t]) visit(d, [...path, t])
    seen.add(t); done.push(t)
  }
  tables.forEach((t) => visit(t))
  return done
}

// ---------- rows ----------
async function fetchAll(get, table, pk) {
  const order = pk.map((c) => `${c}.asc`).join(',')
  const rows = []
  for (let offset = 0; ; offset += PAGE) {
    const page = await get(`${table}?select=*&order=${order}&limit=${PAGE}&offset=${offset}`)
    rows.push(...page)
    if (page.length < PAGE) return rows
  }
}
const canon = (v) => {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`
  return JSON.stringify(v ?? null)
}
const keyOf = (row, cols) => cols.map((c) => canon(row[c])).join('|')
const naturalKey = (row, cols) => cols.map((c) => String(row[c] ?? '').trim()).join('\u001f')
const pkText = (row, pk) => pk.map((c) => row[c]).join('/')
const pick = (row, cols) => Object.fromEntries(cols.map((c) => [c, row[c] ?? null]))

// A unique index key part is either a plain column or lower(column); anything else can't be checked here.
function uniqueKeyFn(keys) {
  const parts = keys.map((k) => {
    const plain = k.match(/^"?([a-z_][a-z0-9_]*)"?$/i)
    if (plain) return (r) => r[plain[1]]
    const lower = k.match(/^lower\("?([a-z_][a-z0-9_]*)"?\)$/i)
    if (lower) return (r) => (r[lower[1]] == null ? null : String(r[lower[1]]).toLowerCase())
    return null
  })
  if (parts.includes(null)) return null
  return (r) => {
    const vals = parts.map((f) => f(r))
    return vals.some((v) => v == null) ? null : vals.map(canon).join('|') // NULLs never collide
  }
}

// Self-referencing FK (kisan_mela.merged_into): referenced rows must land in an earlier batch.
function orderForSelfFk(rows, pk, selfFks) {
  const byPk = new Map(rows.map((r) => [canon(r[pk[0]]), r]))
  const out = [], state = new Map()
  const visit = (r) => {
    const k = canon(r[pk[0]])
    if (state.get(k) === 2) return
    if (state.get(k) === 1) throw new Error('self-referencing foreign key cycle in rows')
    state.set(k, 1)
    for (const fk of selfFks) { const parent = byPk.get(canon(r[fk.cols[0]])); if (parent && parent !== r) visit(parent) }
    state.set(k, 2); out.push(r)
  }
  rows.forEach(visit)
  return out
}

// ---------- test / placeholder scan (report only) ----------
const TEST_PATTERNS = [
  /\b(test|tests|tester|sample|dummy|placeholder|lorem|ipsum|demo|fake|todo|tbd|asdf|qwerty|x{3,})\b/i,
  /टेस्ट|डमी|नमूना डेटा|परीक्षण डेटा/,
  /(?<![\w-])(9{8,}\d*|0{8,}|1234567890|9876543210|99990000\d{2})(?![\w-])/, // not inside uuids
  /\bexample\.(com|org|in)\b|\.example\b|BACKENDTEST/i,
]
function scanRow(row) {
  const hits = []
  const walk = (v, col) => {
    if (typeof v === 'string') {
      for (const re of TEST_PATTERNS) {
        const m = v.match(re)
        if (m) { hits.push({ col, term: m[0], snippet: v.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30).replace(/\s+/g, ' ') }); break }
      }
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, col))
    else if (v && typeof v === 'object') Object.values(v).forEach((x) => walk(x, col))
  }
  for (const [col, v] of Object.entries(row)) walk(v, col)
  return hits
}

// ---------- output ----------
function printTable(headers, rows, leftCols = 1) {
  const w = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)))
  const line = (r) => r.map((c, i) => (i < leftCols ? String(c).padEnd(w[i]) : String(c).padStart(w[i]))).join('  ').trimEnd()
  log(line(headers)); log(w.map((n) => '-'.repeat(n)).join('  ')); rows.forEach((r) => log(line(r)))
}
const looksSecret = (key) => /key|token|secret|password|pass|pwd|credential|auth/i.test(key)
const cell = (v) => (v == null ? '—' : String(v))

// ---------- main ----------
async function main() {
  if (!REF.staging || !REF.production) fail('could not derive a project ref from VITE_SUPABASE_URL in .env (staging) and/or .env.production (production). Nothing was done.')
  if (REF.staging === REF.production) fail(`staging and production are the SAME project (${REF.staging}). Nothing was done.`)
  for (const side of ['staging', 'production']) {
    for (const k of ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ACCESS_TOKEN']) if (!ENV[side][k]) fail(`${k} missing for ${side}. Nothing was done.`)
  }
  const clash = WRITE_TABLES.filter((t) => FORBIDDEN.includes(t))
  if (clash.length) fail(`write list contains forbidden table(s): ${clash.join(', ')}`)

  log(`Staging project ref    (read-only): ${REF.staging}`)
  log(`Production project ref (target)   : ${REF.production}`)
  log(`Mode: ${APPLY ? 'APPLY — writing to production' : 'DRY RUN — nothing will be written'}\n`)

  const cliExclude = new Set((process.argv.find((a) => a.startsWith('--exclude=')) || '').slice(10).split(',').filter(Boolean))

  const [S, P] = await Promise.all([loadSchema('staging', [...ALL_TABLES, SETTINGS]), loadSchema('production', [...ALL_TABLES, SETTINGS])])
  const order = fkOrder(WRITE_TABLES, P.fks)

  const skipped = [], warnings = [], blockers = [], plan = [], summary = [], suspects = [], updateDetail = [], excludedList = [], dedupList = []
  const excluded = {} // table -> Set of excluded primary keys (as text)

  for (const table of order) {
    const natural = NATURAL_TABLES[table]
    const sCols = S.cols[table] || [], pCols = P.cols[table] || []
    if (!sCols.length) { blockers.push(`${table}: table missing in staging`); continue }
    if (!pCols.length) { blockers.push(`${table}: table missing in production`); continue }
    const pk = (P.pks[table] || []).map((r) => r.c)
    const sPk = (S.pks[table] || []).map((r) => r.c)
    if (!pk.length || pk.join() !== sPk.join()) { blockers.push(`${table}: primary key missing or different (staging: ${sPk.join(',') || 'none'}, production: ${pk.join(',') || 'none'})`); continue }

    // Column selection
    const pByName = new Map(pCols.map((c) => [c.c, c]))
    const columns = []
    for (const c of sCols) {
      const p = pByName.get(c.c)
      if (!p) skipped.push([table, c.c, 'column does not exist in production'])
      else if (c.g !== 'NEVER' || p.g !== 'NEVER') skipped.push([table, c.c, `generated column (is_generated: staging ${c.g}, production ${p.g})`])
      else if (p.i === 'YES' && p.ig === 'ALWAYS' && !pk.includes(c.c)) skipped.push([table, c.c, 'GENERATED ALWAYS identity column in production'])
      else columns.push(c.c)
    }
    for (const p of pCols) if (!sCols.some((c) => c.c === p.c)) warnings.push(`${table}.${p.c}: exists only in production; left to its default`)
    for (const c of pk) if (!columns.includes(c)) blockers.push(`${table}: primary key column ${c} cannot be written`)
    for (const c of natural || []) if (!columns.includes(c)) blockers.push(`${table}: natural key column ${c} is not available`)

    // Columns a production trigger rewrites on UPDATE can never match staging; keep them out of the diff.
    const ignore = new Set()
    for (const tg of P.trg[table] || []) {
      if (/touch_updated_at/.test(tg.f) && columns.includes('updated_at')) {
        ignore.add('updated_at')
        warnings.push(`${table}.updated_at: production trigger ${tg.n} sets it to now() on every UPDATE, so it is copied on insert but ignored when comparing`)
      } else warnings.push(`${table}: production trigger ${tg.n} (${tg.f}) will fire on write`)
    }
    const cmpCols = columns.filter((c) => !ignore.has(c))
    const bodyCols = cmpCols.filter((c) => !pk.includes(c) && !/now\(\)|current_timestamp/i.test(pByName.get(c).d))

    const [sAll, pRows] = await Promise.all([fetchAll(stagingGet, table, pk), fetchAll(prodGet, table, pk)])

    // Exclusions (test rows + --exclude)
    excluded[table] = new Set()
    let sRows = sAll.filter((r) => {
      const reason = cliExclude.has(`${table}:${pkText(r, pk)}`) ? '--exclude' : EXCLUDE_RULES[table]?.(r, excluded) ?? null
      if (!reason) return true
      excluded[table].add(String(pkText(r, pk)))
      excludedList.push([table, pkText(r, pk), reason])
      return false
    })
    let leftOut = sAll.length - sRows.length

    // FKs: a kept row must not point at an excluded row, and FKs to tables that are not copied need
    // the referenced row to exist in production already.
    const selfFks = []
    for (const fk of P.fks[table] || []) {
      if (fk.cols.length !== 1) continue
      const col = fk.cols[0]
      if (fk.ft === table) selfFks.push(fk)
      if (WRITE_TABLES.includes(fk.ft)) {
        const bad = sRows.filter((r) => r[col] != null && excluded[fk.ft]?.has(String(r[col])))
        if (bad.length) blockers.push(`${table}.${col}: ${bad.length} kept row(s) reference excluded ${fk.ft} rows — e.g. ${pk.join(',')}=${pkText(bad[0], pk)}`)
        continue
      }
      const vals = [...new Set(sRows.map((r) => r[col]).filter((v) => v != null))]
      if (!vals.length) continue
      const found = new Set()
      if (fk.fs === 'public') {
        for (let i = 0; i < vals.length; i += 100) {
          const got = await prodGet(`${fk.ft}?select=${fk.fcols[0]}&${fk.fcols[0]}=in.(${vals.slice(i, i + 100).map((v) => `"${v}"`).join(',')})`)
          got.forEach((g) => found.add(String(g[fk.fcols[0]])))
        }
      }
      const missing = vals.filter((v) => !found.has(String(v)))
      if (missing.length) blockers.push(`${table}.${col}: ${missing.length} value(s) reference ${fk.fs}.${fk.ft} rows that do not exist in production (${fk.ft} is not copied)`)
    }

    const pByPk = new Map(pRows.map((r) => [keyOf(r, pk), r]))
    let toInsert = [], toUpdate = [], unchanged = 0, prodOnly = 0, lookalikes = 0
    const patches = []
    const updCols = (NATURAL_UPDATE_COLS[table] || []).filter((c) => columns.includes(c))

    if (natural) {
      // De-duplicate staging on the natural key: keep the most recently updated row, then the lowest id.
      const best = new Map()
      const newer = (a, b) => (a.updated_at || '') > (b.updated_at || '') || ((a.updated_at || '') === (b.updated_at || '') && pkText(a, pk) < pkText(b, pk))
      for (const r of sRows) { const k = naturalKey(r, natural); if (!best.has(k) || newer(r, best.get(k))) best.set(k, r) }
      const dropped = sRows.filter((r) => best.get(naturalKey(r, natural)) !== r)
      if (dropped.length) dedupList.push(`${table}: ${dropped.length} staging duplicate row(s) dropped, ${best.size} distinct natural keys kept`)
      leftOut += dropped.length
      sRows = [...best.values()]

      const pByKey = new Map()
      for (const r of pRows) pByKey.set(naturalKey(r, natural), r)
      if (pByKey.size !== pRows.length) warnings.push(`${table}: production itself has ${pRows.length - pByKey.size} row(s) sharing a natural key (left alone)`)
      const diffCols = {}
      let differing = 0
      for (const r of sRows) {
        const p = pByKey.get(naturalKey(r, natural))
        if (!p) { toInsert.push(r); continue }
        if (updCols.some((c) => canon(r[c]) !== canon(p[c]))) patches.push({ where: pick(p, pk), set: pick(r, updCols) })
        else unchanged++
        const d = bodyCols.filter((c) => !updCols.includes(c) && canon(r[c]) !== canon(p[c]))
        if (d.length) { differing++; d.forEach((c) => { diffCols[c] = (diffCols[c] || 0) + 1 }) }
      }
      if (patches.length) updateDetail.push(`${table}: ${updCols.join(', ')} (${patches.length}) — only ${updCols.length > 1 ? 'these columns' : 'this column'}, on the production row with the same natural key`)
      if (differing) warnings.push(`${table}: ${differing} of the ${unchanged + patches.length} row(s) already in production (by natural key) differ from staging in columns that are NOT updated — ${Object.entries(diffCols).map(([c, n]) => `${c} (${n})`).join(', ')}`)
      const sKeys = new Set(sRows.map((r) => naturalKey(r, natural)))
      prodOnly = [...pByKey.keys()].filter((k) => !sKeys.has(k)).length
      const pkClash = toInsert.filter((r) => pByPk.has(keyOf(r, pk)))
      if (pkClash.length) blockers.push(`${table}: ${pkClash.length} row(s) to insert reuse a primary key that production already holds for different content — e.g. ${pkText(pkClash[0], pk)}`)
    } else {
      const diffCols = {}
      for (const r of sRows) {
        const p = pByPk.get(keyOf(r, pk))
        if (!p) toInsert.push(r)
        else if (keyOf(r, cmpCols) !== keyOf(p, cmpCols)) {
          toUpdate.push(r)
          for (const c of cmpCols) if (canon(r[c]) !== canon(p[c])) diffCols[c] = (diffCols[c] || 0) + 1
        } else unchanged++
      }
      if (toUpdate.length) updateDetail.push(`${table}: ${Object.entries(diffCols).map(([c, n]) => `${c} (${n})`).join(', ')}`)
      const sPkSet = new Set(sRows.map((r) => keyOf(r, pk)))
      const prodOnlyRows = pRows.filter((r) => !sPkSet.has(keyOf(r, pk)))
      prodOnly = prodOnlyRows.length
      // Same content already in production under a different id: inserting would show it twice.
      const bodies = new Set(prodOnlyRows.map((r) => keyOf(r, bodyCols)))
      lookalikes = bodyCols.length ? toInsert.filter((r) => bodies.has(keyOf(r, bodyCols))).length : 0
      if (lookalikes) blockers.push(`${table}: ${lookalikes} of the ${toInsert.length} row(s) to insert already exist in production with identical content under a different primary key — inserting them would create duplicates`)
    }

    // Two phases (updates, then inserts) unless a self-FK forces dependency order instead.
    const phased = !natural && !selfFks.length
    const phases = natural ? [{ label: `update (${updCols.join(', ')} only)`, rows: [], patches }, { label: 'insert', rows: toInsert, resolution: 'ignore' }].filter((ph) => ph.rows.length || ph.patches?.length || ph.label === 'insert')
      : phased ? [{ label: 'update', rows: toUpdate, resolution: 'merge' }, { label: 'insert', rows: toInsert, resolution: 'merge' }]
        : [{ label: 'upsert', rows: orderForSelfFk([...toInsert, ...toUpdate], pk, selfFks), resolution: 'merge' }]

    // Secondary unique keys, checked against production as it will look once the update phase has run
    // (so equipment_types id 1 'Water tanker' -> 'Tractor' frees the name for staging id 34).
    const sByPk = new Map(sRows.map((r) => [keyOf(r, pk), r]))
    const after = pRows.map((r) => (phased && sByPk.get(keyOf(r, pk))) || r)
    for (const u of P.uniq[table] || []) {
      const fn = uniqueKeyFn(u.keys)
      if (!fn) { warnings.push(`${table}: unique index ${u.n} uses an expression this script cannot evaluate; not checked`); continue }
      const held = new Map()
      for (const r of after) { const k = fn(r); if (k != null) held.set(k, r) }
      const hits = [...toUpdate, ...toInsert].filter((r) => { const k = fn(r); const p = k != null && held.get(k); return p && keyOf(p, pk) !== keyOf(r, pk) })
      if (hits.length) blockers.push(`${table}: ${hits.length} staging row(s) collide with production rows on unique index ${u.n} (${u.keys.join(', ')}) under a different primary key — e.g. staging ${pk.join(',')}=${pkText(hits[0], pk)}`)
    }

    for (const r of sRows) {
      const hits = scanRow(r)
      if (hits.length) suspects.push({ table, id: pkText(r, pk), hits })
    }

    const seqs = pCols.filter((c) => c.seq && columns.includes(c.c)).map((c) => ({ col: c.c, seq: c.seq }))
    const mode = natural ? `insert-only on (${natural.join(', ')})${updCols.length ? ` + update ${updCols.join(', ')}` : ''}` : 'upsert on primary key'
    plan.push({ table, pk, columns, phases, natural, expected: sRows, seqs })
    summary.push([table, mode, sAll.length, leftOut, pRows.length, toInsert.length, toUpdate.length + patches.length, unchanged, prodOnly])
  }

  // Compare-only tables: counted in the summary, never written.
  const sideBySide = []
  for (const [table, cfg] of Object.entries(COMPARE_TABLES)) {
    const pk = (P.pks[table] || []).map((r) => r.c)
    const [s, p] = await Promise.all([fetchAll(stagingGet, table, pk), fetchAll(prodGet, table, pk)])
    summary.push([table, 'NOT WRITTEN (compare only)', s.length, s.length, p.length, 0, 0, 0, p.length])
    const group = (rows) => rows.reduce((m, r) => { const k = naturalKey(r, cfg.key); (m.get(k) || m.set(k, []).get(k)).push(r); return m }, new Map())
    const sg = group(s), pg = group(p), lines = []
    for (const k of new Set([...sg.keys(), ...pg.keys()])) {
      const a = sg.get(k) || [], b = pg.get(k) || []
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const sr = a[i], pr = b[i]
        const status = !sr ? 'only in production' : !pr ? 'only in staging' : cfg.show.every((c) => canon(sr[c]) === canon(pr[c])) ? 'same' : `DIFFERS: ${cfg.show.filter((c) => canon(sr[c]) !== canon(pr[c])).join(', ')}`
        if (sr) lines.push(['staging', ...cfg.show.map((c) => cell(sr[c])), status])
        if (pr) lines.push(['production', ...cfg.show.map((c) => cell(pr[c])), sr ? '' : status])
      }
    }
    sideBySide.push({ table, cfg, lines, counts: [s.length, p.length] })
  }

  summary.sort((a, b) => DISPLAY_ORDER.indexOf(a[0]) - DISPLAY_ORDER.indexOf(b[0]))
  log(`Write order (foreign keys respected): ${order.join(' -> ')}\n`)
  printTable(['table', 'mode', 'staging rows', 'staging rows left out', 'production rows before', APPLY ? 'to insert' : 'would insert', APPLY ? 'to update' : 'would update', 'unchanged / already there', 'prod-only rows (left alone)'], summary, 2)
  const tot = (i) => summary.reduce((n, r) => n + r[i], 0)
  log(`\nTotals: staging ${tot(2)}, left out ${tot(3)}, production before ${tot(4)}, insert ${tot(5)}, update ${tot(6)}, unchanged/already there ${tot(7)}`)
  log('"staging rows left out" = excluded test rows + staging duplicates on the natural key (+ all rows of compare-only tables).')

  log('\nNatural keys used for the insert-only tables:')
  for (const [t, k] of Object.entries(NATURAL_TABLES)) log(`  - ${t}: (${k.join(', ')})`)
  dedupList.forEach((d) => log(`  - ${d}`))

  log('\nExcluded staging rows (not copied):')
  if (excludedList.length) printTable(['table', 'id', 'reason'], excludedList, 3); else log('  none')

  log('\nSkipped columns:')
  if (skipped.length) printTable(['table', 'column', 'reason'], skipped, 3); else log('  none — every staging column exists in production and none is generated')

  log('\nColumns that differ in the rows to update (column, number of rows):')
  if (updateDetail.length) updateDetail.forEach((u) => log(`  - ${u}`)); else log('  none')

  log('\nNotes:')
  if (warnings.length) warnings.forEach((w) => log(`  - ${w}`)); else log('  none')

  // Sequences
  log(`\nSequences (${APPLY ? 'moved after the copy' : '--apply moves each to max(id) after the copy'}; never lowered):`)
  const seqRows = []
  for (const t of plan) for (const s of t.seqs) {
    const [cur] = await sql('production', `select last_value, is_called from ${s.seq}`)
    const maxAfter = Math.max(0, ...t.expected.map((r) => Number(r[s.col])).filter(Number.isFinite))
    seqRows.push([`${t.table}.${s.col}`, s.seq, `${cur.last_value}${cur.is_called ? '' : ' (not yet used)'}`, Math.max(maxAfter, Number(cur.last_value))])
  }
  if (seqRows.length) printTable(['column', 'sequence', 'production value now', 'value after copy (at least)'], seqRows, 2); else log('  none')

  // equipment_types: who points at these ids in production?
  {
    log('\nequipment_types — references in production (ids are renumbered to match staging):')
    const fks = await sql('production', `select c.conrelid::regclass::text t, pg_get_constraintdef(c.oid) d from pg_constraint c where c.contype='f' and c.confrelid='public.equipment_types'::regclass`)
    log(`  Foreign keys pointing at equipment_types: ${fks.length ? fks.map((f) => `${f.t} ${f.d}`).join('; ') : 'none'}`)
    const cols = await sql('production', `select table_name||'.'||column_name c from information_schema.columns where table_schema='public' and column_name ilike '%equipment_type%'`)
    log(`  Columns named like equipment_type: ${cols.length ? cols.map((c) => c.c).join(', ') : 'none'}`)
    const refs = await sql('production', `select details->>'equipment_type_id' id, count(*)::int n, count(*) filter (where is_test_data)::int test, count(*) filter (where details->>'is_tanker'='true')::int tanker from public.listings where details ? 'equipment_type_id' group by 1 order by 1`)
    const [sE, pE] = await Promise.all([stagingGet('equipment_types?select=id,name_en'), prodGet('equipment_types?select=id,name_en')])
    const name = (rows, id) => rows.find((r) => String(r.id) === String(id))?.name_en ?? '(no such id)'
    if (!refs.length) log("  listings.details->>'equipment_type_id': no production listing uses it")
    else printTable(['equipment_type_id in listings.details', 'listings', 'of which is_test_data', 'of which is_tanker=true', 'name in production now', 'name after copy'], refs.map((r) => [r.id, r.n, r.test, r.tanker, name(pE, r.id), name(sE, r.id)]))
  }

  log('\nBlockers (--apply refuses to write while any exist):')
  if (blockers.length) blockers.forEach((b) => log(`  ! ${b}`)); else log('  none')

  for (const sb of sideBySide) {
    log(`\n${sb.table} — NOT written. Side by side (staging ${sb.counts[0]} rows, production ${sb.counts[1]} rows; paired on ${sb.cfg.key.join(' + ')}):`)
    printTable(['side', ...sb.cfg.show, 'status'], sb.lines, sb.cfg.show.length + 2)
  }

  // site_settings: compare only
  {
    const [s, p] = await Promise.all([stagingGet(`${SETTINGS}?select=*`), prodGet(`${SETTINGS}?select=*`)])
    const sm = new Map(s.map((r) => [r.key, r])), pm = new Map(p.map((r) => [r.key, r]))
    log(`\n${SETTINGS} (NOT written — compare only, values never printed):`)
    printTable(['key', 'in staging', 'in production', 'status'], [...new Set([...sm.keys(), ...pm.keys()])].sort().map((k) => {
      const a = sm.get(k), b = pm.get(k)
      const status = !a ? 'only in production' : !b ? 'only in staging' : canon(a.value) === canon(b.value) ? 'same' : 'DIFFERS'
      return [looksSecret(k) ? `${k} (secret-looking)` : k, a ? 'yes' : 'no', b ? 'yes' : 'no', status]
    }), 4)
  }

  log('\nPossible test / placeholder content in the staging rows still to be copied (heuristic — review by hand):')
  if (!suspects.length) log('  none found')
  for (const s of suspects) log(`  ${s.table}  ${s.id}  ${s.hits.slice(0, 3).map((h) => `[${h.col}: "${h.term}" …${h.snippet}…]`).join(' ')}${s.hits.length > 3 ? ` (+${s.hits.length - 3} more)` : ''}`)

  if (!APPLY) { log('\nDry run complete. Nothing was written. Re-run with --apply to copy.'); return }

  if (blockers.length) fail('blockers listed above — nothing was written to production.')

  log('\nWriting to production ...')
  for (const t of plan) {
    const done = []
    for (const ph of t.phases) {
      for (let i = 0; i < ph.rows.length; i += BATCH) {
        await prodWrite(t.table, t.pk, t.columns, ph.rows.slice(i, i + BATCH).map((r) => pick(r, t.columns)), ph.resolution)
      }
      for (const pt of ph.patches || []) await prodPatch(t.table, t.pk, pt.where, pt.set)
      done.push(`${ph.rows.length + (ph.patches?.length || 0)} ${ph.label}`)
    }
    log(`  ${t.table}: ${done.join(', ')}`)
  }

  log('\nSequences:')
  for (const t of plan) for (const s of t.seqs) log(`  ${s.seq}: now ${await prodSetval(t.table, s.col, s.seq)}`)

  log('\nRe-count after write ("expected" = staging rows minus excluded rows and staging duplicates):')
  const after = []
  for (const t of [...plan].sort((a, b) => DISPLAY_ORDER.indexOf(a.table) - DISPLAY_ORDER.indexOf(b.table))) {
    const [s, p] = await Promise.all([fetchAll(stagingGet, t.table, t.pk), fetchAll(prodGet, t.table, t.pk)])
    const keyFn = t.natural ? (r) => naturalKey(r, t.natural) : (r) => keyOf(r, t.pk)
    const have = new Set(p.map(keyFn))
    const missing = t.expected.filter((r) => !have.has(keyFn(r))).length
    after.push([t.table, s.length, t.expected.length, p.length, missing, p.length < t.expected.length || missing ? 'FEWER IN PRODUCTION' : 'ok'])
  }
  printTable(['table', 'staging rows', 'expected in production', 'production rows', 'expected rows missing', 'check'], after)
  const short = after.filter((r) => r[5] !== 'ok')
  log(short.length ? `\nWARNING: production is missing rows in: ${short.map((r) => r[0]).join(', ')}` : '\nAll tables: production holds every row that was meant to be copied.')
}

main().catch((e) => fail(e.message))
