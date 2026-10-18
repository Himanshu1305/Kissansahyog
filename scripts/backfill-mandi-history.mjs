#!/usr/bin/env node
// scripts/backfill-mandi-history.mjs — Batch 10E Phase 2B (replaces the old broken backfill that
// read the today-only resource 9ef84268-… and matched commodities by token).
//
// Real daily mandi prices for the Sagar Division districts and the /msp crops, from data.gov.in
// resource 35985678-0d79-46b4-9ed6-6f13308a1d24 "Variety-wise Daily Market Prices Data of
// Commodity" (DMI / Agmarknet, Government Open Data License – India). Never invents, averages,
// interpolates or smooths a value; never updates or deletes a row (insert … on conflict do nothing,
// so rows the 3-hourly refresh already wrote always win).
//
//   node scripts/backfill-mandi-history.mjs [--days 120] [--until YYYY-MM-DD]       # DRY RUN (default)
//   node scripts/backfill-mandi-history.mjs --from-cache <file.json>                   # dry run, no refetch
//   node --env-file=.env scripts/backfill-mandi-history.mjs --project staging --apply --from-cache <f>
//   node scripts/backfill-mandi-history.mjs --project prod --from-cache <f>            # writes SQL files only
//   node --env-file=.env scripts/backfill-mandi-history.mjs --project staging --counts # read-only counts
//
// Key: DATA_GOV_IN_API_KEY from the environment only (never printed; masked in any log line).
// --project prod NEVER connects to anything but api.data.gov.in: it writes
// docs/review/batch10e/backfill-prod/part-NN.sql + verify.sql + README.md for the founder.
// --project staging --apply writes only to the STAGING project (ref checked against the env URL).
// Fetched source rows are cached as JSON (--cache-dir) so staging and production use the same rows.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { CROPS } from '../src/content/crops.js'
import {
  RESOURCE_ID, RESOURCE_TITLE, RESOURCE_URL, API_BASE, LICENCE, ATTRIBUTION, STATE,
  cropsToBackfill, parseDivisionDistricts, todayIST, addDays, windowFor, isIsoDate,
  mapSourceRow, pickOnePerKey, splitOutliers, transactionSql, countingSql, sortForLoad, chunk, maskKey,
} from './lib/mandi-backfill.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const STAGING_REF = 'wzxtqbqlahyahsnoqqva'
const PROD_REF = 'eltmcznjcqiahqhjvpjg'
const PAGE = 1000
const SPACING_MS = 1500
const ROWS_PER_FILE = 500
const PROD_DIR = join(ROOT, 'docs/review/batch10e/backfill-prod')
const SOURCE_MD = join(ROOT, 'docs/review/batch10e/evidence/backfill-source.md')

// ---------- args ----------
const argv = process.argv.slice(2)
const flag = (n) => argv.includes(n)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d }
const PROJECT = opt('--project', 'staging')
const APPLY = flag('--apply')
const COUNTS = flag('--counts')
const FROM_CACHE = opt('--from-cache', null)
const CACHE_DIR = opt('--cache-dir', join(tmpdir(), 'kissansahyog-backfill'))
if (!['staging', 'prod'].includes(PROJECT)) die(`--project must be staging or prod (got ${PROJECT})`)

function die(msg) { console.error(`BACKFILL: REFUSED — ${msg}`); process.exit(1) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.log(...a.map((x) => maskKey(typeof x === 'string' ? x : JSON.stringify(x))))

// ---------- the only network calls ----------
// data.gov.in: GET only, host pinned.
async function getSource(params, attempt = 1) {
  const key = process.env.DATA_GOV_IN_API_KEY
  if (!key) die('DATA_GOV_IN_API_KEY is not set in the environment')
  const url = new URL(API_BASE)
  if (url.host !== 'api.data.gov.in') die('unexpected source host')
  url.searchParams.set('api-key', key)
  url.searchParams.set('format', 'json')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  const retry = async (why) => {
    if (attempt >= 5) throw new Error(`gave up after ${attempt} attempts: ${why}`)
    const wait = 3000 * 2 ** (attempt - 1)
    log(`  retry ${attempt} in ${wait / 1000}s (${why})`)
    await sleep(wait)
    return getSource(params, attempt + 1)
  }
  let res
  try { res = await fetch(url, { signal: AbortSignal.timeout(60000) }) } catch (e) { return retry(e.name === 'TimeoutError' ? 'timeout' : e.message) }
  if (res.status >= 500 || res.status === 429) return retry(`HTTP ${res.status}`)
  const body = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${maskKey(body.slice(0, 200))}`)
  let j
  try { j = JSON.parse(body) } catch { return retry('non-JSON body') }
  if (!Array.isArray(j.records)) return retry(`no records array (${maskKey(String(j.message || j.error || '').slice(0, 120))})`)
  return j
}

// Supabase Management API SQL endpoint — STAGING only, ref pinned to the constant.
function assertStaging() {
  if (PROJECT !== 'staging') die('database access is only allowed with --project staging')
  const url = process.env.VITE_SUPABASE_URL || ''
  let host = ''
  try { host = new URL(url).host } catch { die('VITE_SUPABASE_URL is missing or invalid (start with --env-file=.env)') }
  if (url.includes(PROD_REF)) die('VITE_SUPABASE_URL points at the PRODUCTION project')
  if (host !== `${STAGING_REF}.supabase.co`) die('VITE_SUPABASE_URL is not the staging project')
  if (!process.env.SUPABASE_ACCESS_TOKEN) die('SUPABASE_ACCESS_TOKEN missing (.env)')
}
async function stagingSql(sql) {
  assertStaging()
  const res = await fetch(`https://api.supabase.com/v1/projects/${STAGING_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
    signal: AbortSignal.timeout(120000),
  })
  const t = await res.text()
  if (!res.ok) throw new Error(`staging SQL HTTP ${res.status}: ${t.slice(0, 300)}`)
  return t ? JSON.parse(t) : null
}

// ---------- read-only counts ----------
const COUNT_SQL = (where) => `select commodity_en, count(distinct price_date)::int as days, min(price_date) as min_date, max(price_date) as max_date, count(*)::int as rows
  from public.mandi_prices ${where} group by 1 order by 1`
const RECENT_SQL = `select commodity_en,
  count(distinct price_date) filter (where price_date > current_date - 90)::int as days_90,
  count(distinct price_date) filter (where price_date > current_date - 30)::int as days_30,
  count(distinct price_date) filter (where price_date > current_date - 7)::int as days_7
  from public.mandi_prices where in_sagar_division group by 1 order by 1`
async function printCounts() {
  assertStaging()
  const table = (rows, cols) => [cols.join(' | '), ...rows.map((r) => cols.map((c) => r[c]).join(' | '))].join('\n')
  const cols = ['commodity_en', 'days', 'min_date', 'max_date', 'rows']
  console.log(`# STAGING (${STAGING_REF}) mandi_prices — read-only — ${new Date().toISOString()}\n`)
  console.log('## where in_sagar_division\n' + table(await stagingSql(COUNT_SQL('where in_sagar_division')), cols))
  console.log('\n## all rows\n' + table(await stagingSql(COUNT_SQL('')), cols))
  console.log('\n## distinct days in the last 90 / 30 / 7 days (in_sagar_division; current_date on the DB)\n'
    + table(await stagingSql(RECENT_SQL), ['commodity_en', 'days_90', 'days_30', 'days_7']))
  const [tot] = await stagingSql('select count(*)::int as rows, count(distinct price_date)::int as days from public.mandi_prices')
  console.log(`\nTOTAL rows=${tot.rows} distinct_days=${tot.days}`)
}

// ---------- fetch ----------
function setup(meta) {
  const crops = cropsToBackfill(CROPS)
  const districts = parseDivisionDistricts(readFileSync(join(ROOT, 'src/lib/location/places.js'), 'utf8'))
  return { crops, districts, ...meta }
}
async function fetchAll() {
  const days = Number(opt('--days', '120'))
  const until = opt('--until', addDays(todayIST(), -1))
  const { from } = windowFor(until, days)
  const { crops, districts } = setup({})
  const fetchedAt = new Date().toISOString().replace(/\.\d+Z$/, 'Z')
  log(`fetching ${crops.length} crops × ${districts.length} districts, window ${from} … ${until}`)
  const raw = []
  const perCombo = []
  let requests = 0
  for (const crop of crops) {
    for (const district of districts) {
      let offset = 0, got = 0, pages = 0, total = null
      for (;;) {
        if (requests) await sleep(SPACING_MS)
        requests++; pages++
        const j = await getSource({
          'filters[State]': STATE, 'filters[District]': district, 'filters[Commodity]': crop.source,
          'sort[Arrival_Date]': 'desc', limit: PAGE, offset,
        })
        total = j.total ?? total
        const recs = j.records
        let oldest = null
        for (const r of recs) {
          const d = String(r.Arrival_Date || '').split(/[/-]/).reverse().join('-')
          if (!oldest || d < oldest) oldest = d
          if (d >= from) { raw.push({ _crop: crop.commodity_en, ...r }); got++ }
        }
        // Stop when the page is short, or its oldest row is already before the window.
        if (recs.length < PAGE || (oldest && oldest < from)) break
        offset += PAGE
        if (pages > 40) throw new Error(`paging runaway for ${crop.source}/${district}`)
      }
      perCombo.push({ crop: crop.commodity_en, district, rows_since_from: got, pages, source_total: total })
      log(`  ${crop.commodity_en.padEnd(20)} ${district.padEnd(11)} rows≥from=${String(got).padStart(5)} pages=${pages} total=${total}`)
    }
  }
  mkdirSync(CACHE_DIR, { recursive: true })
  const file = join(CACHE_DIR, `mandi-35985678-${from}_${until}.json`)
  const cache = { resource_id: RESOURCE_ID, fetched_at: fetchedAt, window: { from, until, days }, today: todayIST(), requests, per_combo: perCombo, records: raw }
  writeFileSync(file, JSON.stringify(cache))
  log(`cache written: ${file} (${raw.length} source rows, ${requests} requests)`)
  return { cache, file }
}

// ---------- validate (deterministic from the cache) ----------
function validate(cache) {
  if (cache.resource_id !== RESOURCE_ID) die('cache is not from the expected resource')
  const { from, until } = cache.window
  if (!isIsoDate(from) || !isIsoDate(until)) die('cache window is invalid')
  const { crops, districts } = setup({})
  const byCrop = new Map(crops.map((c) => [c.commodity_en, c]))
  // "today" = the later of the fetch day and now: a date after it is in the future.
  const ctx = { districts, from, until, today: todayIST(), fetchedAt: cache.fetched_at }
  const rejects = {}
  const rejectExamples = []
  const candidates = []
  for (const raw of cache.records) {
    const crop = byCrop.get(raw._crop)
    if (!crop) { rejects.unknown_crop = (rejects.unknown_crop || 0) + 1; continue }
    const m = mapSourceRow(raw, crop, ctx)
    if (m.ok) candidates.push(m)
    else {
      rejects[m.reason] = (rejects[m.reason] || 0) + 1
      if (m.reason !== 'outside_window' && rejectExamples.length < 25) rejectExamples.push({ reason: m.reason, row: strip(raw) })
    }
  }
  const pick = pickOnePerKey(candidates)
  const { kept, outliers, medians } = splitOutliers(pick.picked)
  return { crops, districts, from, until, candidates: candidates.length, rejects, rejectExamples, pick, kept: sortForLoad(kept), outliers, medians }
}
const strip = (r) => { const { _crop, ...rest } = r; return rest }

function report(cache, v, mode) {
  const L = []
  const p = (s = '') => L.push(s)
  p(`# Mandi history backfill — ${mode}`)
  p(`generated ${new Date().toISOString()} · source data.gov.in ${RESOURCE_ID} (${RESOURCE_TITLE}) · ${LICENCE}`)
  p(`window ${v.from} … ${v.until} (${cache.window.days} days) · fetched ${cache.fetched_at} · ${cache.requests} API requests`)
  p(`districts (places.js DIVISION_DISTRICTS): ${v.districts.join(', ')}`)
  p(`crops (crops.js CROPS → exact source name): ${v.crops.map((c) => `${c.commodity_en}→"${c.source}"`).join('; ')}`)
  p()
  p(`source rows fetched (Arrival_Date ≥ from): ${cache.records.length}`)
  p(`passed row checks: ${v.candidates}`)
  p(`rejected by row checks: ${Object.values(v.rejects).reduce((a, b) => a + b, 0)} ${JSON.stringify(v.rejects)}`)
  p(`duplicate (commodity, market, date) keys: ${v.pick.duplicateKeys} keys, ${v.pick.droppedRows} extra source rows not used (rule: Grade FAQ first, then smallest Variety, then lowest modal/min/max)`)
  p(`one row per key: ${v.pick.picked.length}`)
  p(`outliers (modal > 5× or < 1/5 of the crop median in this batch), NOT loaded: ${v.outliers.length}`)
  p(`rows to load: ${v.kept.length}`)
  p()
  p('## per crop (rows to load / distinct days / markets / min … max date / batch median modal)')
  for (const c of v.crops) {
    const rs = v.kept.filter((r) => r.commodity_en === c.commodity_en)
    const days = new Set(rs.map((r) => r.price_date))
    const dates = [...days].sort()
    p(`${c.commodity_en.padEnd(20)} rows=${String(rs.length).padStart(5)} days=${String(days.size).padStart(3)} markets=${String(new Set(rs.map((r) => r.market)).size).padStart(3)} ${dates[0] || '-'} … ${dates.at(-1) || '-'} median=${v.medians[c.commodity_en] ?? '-'}`)
  }
  p()
  p('## per crop per month (rows to load)')
  const months = [...new Set(v.kept.map((r) => r.price_date.slice(0, 7)))].sort()
  p(`${'crop'.padEnd(20)} ${months.map((m) => m.padStart(8)).join(' ')}`)
  for (const c of v.crops) p(`${c.commodity_en.padEnd(20)} ${months.map((m) => String(v.kept.filter((r) => r.commodity_en === c.commodity_en && r.price_date.startsWith(m)).length).padStart(8)).join(' ')}`)
  p()
  p('## per district (rows to load)')
  for (const d of v.districts) p(`${d.padEnd(12)} ${v.kept.filter((r) => r.district === d).length}`)
  p()
  p('## fetch per (crop, district): rows ≥ from / pages / source total for the filter')
  for (const c of cache.per_combo) p(`${c.crop.padEnd(20)} ${c.district.padEnd(11)} ${String(c.rows_since_from).padStart(5)} / ${c.pages} / ${c.source_total}`)
  p()
  p('## duplicate-key picks (first 12 examples)')
  for (const e of v.pick.examples) p(`${e.key.commodity_en} | ${e.key.market} | ${e.key.price_date}: kept [${e.kept}] dropped ${e.dropped.map((x) => `[${x}]`).join(' ')}`)
  p()
  p('## outliers (not loaded)')
  if (!v.outliers.length) p('none')
  for (const o of v.outliers) p(`${o.commodity_en} | ${o.market} (${o.district}) | ${o.price_date} | min ${o.min_price} modal ${o.modal_price} max ${o.max_price} | crop median ${o.crop_median}`)
  p()
  p('## rejected rows (examples, outside_window not listed)')
  if (!v.rejectExamples.length) p('none')
  for (const e of v.rejectExamples) p(`${e.reason}: ${JSON.stringify(e.row)}`)
  return L.join('\n')
}

// ---------- writers ----------
async function applyStaging(v) {
  assertStaging()
  const [u] = await stagingSql(`select string_agg(c.conname || ':' || pg_get_constraintdef(c.oid), '; ') as def
    from pg_constraint c where c.conrelid = 'public.mandi_prices'::regclass and c.contype = 'u'`)
  if (!/UNIQUE \(commodity_en, market, price_date\)/.test(u?.def || '')) die(`unexpected unique constraint on mandi_prices: ${u?.def}`)
  log(`unique constraint OK: ${u.def}`)
  let inserted = 0
  const parts = chunk(v.kept, ROWS_PER_FILE)
  for (const [i, rows] of parts.entries()) {
    const [r] = await stagingSql(countingSql(rows))
    inserted += r.inserted
    log(`  part ${String(i + 1).padStart(2, '0')}: ${rows.length} rows (${rows[0].price_date} … ${rows.at(-1).price_date}) → inserted ${r.inserted}, skipped (key already present) ${rows.length - r.inserted}`)
  }
  log(`STAGING APPLY DONE: ${v.kept.length} validated rows offered, ${inserted} inserted, ${v.kept.length - inserted} already present (left untouched)`)
  return inserted
}

function writeProd(cache, v) {
  // Never connects: only files. Old part files are removed so the folder holds exactly this run.
  mkdirSync(PROD_DIR, { recursive: true })
  for (const f of readdirSync(PROD_DIR)) if (/^part-\d+\.sql$/.test(f)) rmSync(join(PROD_DIR, f))
  const parts = chunk(v.kept, ROWS_PER_FILE)
  const gen = new Date().toISOString()
  parts.forEach((rows, i) => {
    const nn = String(i + 1).padStart(2, '0')
    const header = [
      `-- Kissan Sahyog · Batch 10E · mandi price history backfill · part ${nn} of ${String(parts.length).padStart(2, '0')}`,
      `-- Source: Agmarknet (Directorate of Marketing & Inspection, Ministry of Agriculture & Farmers Welfare) via data.gov.in`,
      `--   resource ${RESOURCE_ID} "${RESOURCE_TITLE}"`,
      `--   ${RESOURCE_URL}`,
      `-- Licence: ${LICENCE} — attribution required.`,
      `-- Window loaded: ${v.from} … ${v.until} · this file: ${rows[0].price_date} … ${rows.at(-1).price_date}`,
      `-- Scope: Madhya Pradesh, Sagar Division districts (${v.districts.join(', ')}); crops ${v.crops.map((c) => c.commodity_en).join(', ')}`,
      `-- Generated: ${gen} (source fetched ${cache.fetched_at}) by scripts/backfill-mandi-history.mjs --project prod`,
      `-- Rows in this file: ${rows.length}`,
      `-- Safe to re-run: insert … on conflict (commodity_en, market, price_date) do nothing — never updates or deletes;`,
      `--   rows already present (e.g. from the 3-hourly refresh) are left exactly as they are.`,
      '',
    ].join('\n')
    writeFileSync(join(PROD_DIR, `part-${nn}.sql`), header + transactionSql(rows))
  })
  writeFileSync(join(PROD_DIR, 'verify.sql'), verifySql(v))
  writeFileSync(join(PROD_DIR, 'README.md'), readme(cache, v, parts, gen))
  writeFileSync(SOURCE_MD, sourceMd(cache, v, parts, gen))
  log(`PROD FILES WRITTEN (nothing executed): ${parts.length} part files, ${v.kept.length} rows → ${PROD_DIR}`)
}

function verifySql(v) {
  return `-- Kissan Sahyog · Batch 10E · mandi_prices verification (read-only). Run BEFORE and AFTER the backfill parts.
-- Counts per crop: distinct days, first/last date, rows — Sagar Division rows, and all rows.
select 'sagar_division' as scope, commodity_en, count(distinct price_date) as days, min(price_date) as first_date,
       max(price_date) as last_date, count(*) as rows,
       count(distinct price_date) filter (where price_date > current_date - 90) as days_last_90,
       count(distinct price_date) filter (where price_date > current_date - 30) as days_last_30
  from public.mandi_prices where in_sagar_division group by commodity_en
union all
select 'all_rows', commodity_en, count(distinct price_date), min(price_date), max(price_date), count(*),
       count(distinct price_date) filter (where price_date > current_date - 90),
       count(distinct price_date) filter (where price_date > current_date - 30)
  from public.mandi_prices group by commodity_en
order by 1 desc, 2;
-- Rows inside the backfill window (${v.from} … ${v.until}) for the backfilled scope:
select count(*) as rows_in_window from public.mandi_prices
 where in_sagar_division and price_date between '${v.from}' and '${v.until}';
`
}

function expectedTable(v) {
  return v.crops.map((c) => {
    const rs = v.kept.filter((r) => r.commodity_en === c.commodity_en)
    const d = [...new Set(rs.map((r) => r.price_date))].sort()
    return `| ${c.commodity_en} | ${rs.length} | ${d.length} | ${d[0] || '—'} | ${d.at(-1) || '—'} |`
  }).join('\n')
}

function readme(cache, v, parts, gen) {
  return `# Production backfill — mandi price history (Batch 10E)

Generated ${gen} by \`scripts/backfill-mandi-history.mjs --project prod --from-cache …\` (no database was
contacted). Exactly the rows that passed validation in the same run that was applied to STAGING.

Source: Agmarknet (DMI, Ministry of Agriculture & Farmers Welfare) via data.gov.in resource
\`${RESOURCE_ID}\` "${RESOURCE_TITLE}", ${RESOURCE_URL} — ${LICENCE}. Details: \`docs/review/batch10e/evidence/backfill-source.md\`.

Window: **${v.from} … ${v.until}**. Scope: Madhya Pradesh, Sagar Division (${v.districts.join(', ')}). Rows: **${v.kept.length}** in **${parts.length}** files (≤ ${ROWS_PER_FILE} rows each, ordered by date).

## Order (Supabase dashboard → PRODUCTION project → SQL editor; paste each file, Run)

1. \`verify.sql\` — note the numbers (read-only).
${parts.map((_, i) => `${i + 2}. \`part-${String(i + 1).padStart(2, '0')}.sql\``).join('\n')}
${parts.length + 2}. \`verify.sql\` again.

Each part is one \`insert … on conflict (commodity_en, market, price_date) do nothing\` in \`begin; … commit;\`.
Safe to re-run; a part that fails changes nothing (paste it again). It never updates or deletes a row,
so prices the 3-hourly refresh already stored stay as they are.

## Expected after-counts (approximately)

These are the rows in the files per crop. After the run, \`verify.sql\` (scope \`sagar_division\`) should show
at least these distinct days for the window; rows can be a little lower than "+ rows" because a
(crop, market, date) the refresh already stored is skipped.

| crop | rows in files | distinct days | first | last |
|---|---|---|---|---|
${expectedTable(v)}
`
}

function sourceMd(cache, v, parts, gen) {
  return `# Backfill source record (Batch 10E, Phase 2B/2C)

\`public.mandi_prices\` has no source column and this batch does not add one, so the source of the
backfilled rows is recorded here.

- **Source:** Agmarknet — Directorate of Marketing & Inspection (DMI), Department of Agriculture & Farmers
  Welfare, Ministry of Agriculture & Farmers Welfare — published on data.gov.in.
- **Resource:** \`${RESOURCE_ID}\` "${RESOURCE_TITLE}"
- **URL:** ${RESOURCE_URL} · API \`${API_BASE}\`
- **Licence:** ${LICENCE}. Attribution text to show (founder to approve wording, HUMAN-REVIEW):
  > ${ATTRIBUTION}
- **Date range loaded:** ${v.from} … ${v.until} (${cache.window.days} days; data fetched ${cache.fetched_at}).
- **Generated:** ${gen}.
- **Scope:** State = Madhya Pradesh; District ∈ {${v.districts.join(', ')}} (from \`src/lib/location/places.js\`);
  crops from \`src/content/crops.js\` with an exact source name: ${v.crops.map((c) => `${c.commodity_en} = "${c.source}"`).join('; ')}.
- **Row mapping:** Arrival_Date → price_date; Market (as spelled by the source) → market; District, State as given;
  Min/Max/Modal_Price → min/max/modal_price (₹/quintal); arrivals_tonnes NULL (not in the source);
  in_sagar_division = true; is_sagar_district = (District = 'Sagar'); commodity_hi from crops.js.
- **Selection rule (one row per commodity, market, date):** the source has one row per variety/grade. Picked
  deterministically, never averaged: Grade "FAQ" first; then the lexicographically smallest Variety; then
  (only for rows identical in grade and variety) the lowest modal, then min, then max price.
- **Validation:** all three prices > 0; min ≤ modal ≤ max; date a real calendar date, not in the future and
  inside the window; outliers (modal > 5× or < 1/5 of that crop's median modal in this batch) are listed and not loaded.
- **Counts:** source rows fetched ${cache.records.length}; passed row checks ${v.candidates}; rejected
  ${Object.values(v.rejects).reduce((a, b) => a + b, 0)} ${JSON.stringify(v.rejects)}; duplicate keys ${v.pick.duplicateKeys}
  (${v.pick.droppedRows} extra rows not used); outliers not loaded ${v.outliers.length}; **rows loaded/offered ${v.kept.length}**.
- **Production:** \`docs/review/batch10e/backfill-prod/\` — ${parts.length} part files, ${v.kept.length} rows, plus \`verify.sql\` and \`README.md\`.

| crop | rows | distinct days | first | last |
|---|---|---|---|---|
${expectedTable(v)}
`
}

// ---------- main ----------
async function main() {
  if (COUNTS) return printCounts()
  if (APPLY && PROJECT === 'staging') assertStaging() // refuse early, before any fetching
  let cache, file
  if (FROM_CACHE) { file = resolve(FROM_CACHE); if (!existsSync(file)) die(`cache not found: ${file}`); cache = JSON.parse(readFileSync(file, 'utf8')) }
  else ({ cache, file } = await fetchAll())
  const v = validate(cache)
  const mode = PROJECT === 'prod' ? 'PROD SQL FILES (no database contact)' : APPLY ? 'APPLY to STAGING' : 'DRY RUN (nothing written)'
  console.log(report(cache, v, mode))
  console.log(`\ncache: ${file}`)
  if (PROJECT === 'prod') return writeProd(cache, v)
  if (APPLY) return applyStaging(v)
  console.log('\nDRY RUN: nothing written. Add --apply (staging) or use --project prod (SQL files).')
}
main().catch((e) => { console.error(`BACKFILL FAILED: ${maskKey(e.message)}`); process.exit(1) })
