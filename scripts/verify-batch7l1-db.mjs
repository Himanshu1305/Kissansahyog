#!/usr/bin/env node
// Batch 7L-1 Stage B — checks against the REAL databases with the public anon key only.
//   node scripts/verify-batch7l1-db.mjs staging      (reads .env)
//   node scripts/verify-batch7l1-db.mjs production   (reads .env.production)
// Reads only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and never prints a key. The write
// probes (b) are expected to be REJECTED; they are built so that nothing real changes even if
// one were accepted (the update writes a value back unchanged, the delete targets only the
// probe name). If the insert is accepted the script removes nothing itself and exits 2.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const target = process.argv[2]
const EXPECT = { staging: 'wzxtqbqlahyahsnoqqva', production: 'eltmcznjcqiahqhjvpjg' }
if (!EXPECT[target]) { console.error('usage: verify-batch7l1-db.mjs staging|production'); process.exit(1) }
const env = Object.fromEntries(readFileSync(join(ROOT, target === 'staging' ? '.env' : '.env.production'), 'utf8')
  .split(/\r?\n/).map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const url = env.VITE_SUPABASE_URL, key = env.VITE_SUPABASE_ANON_KEY
const ref = (url || '').match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1]
if (ref !== EXPECT[target]) { console.error(`STOP: ${target} env file points at project "${ref}", expected "${EXPECT[target]}"`); process.exit(1) }
const role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role
if (role !== 'anon') { console.error(`STOP: the key in the env file has role "${role}", not anon`); process.exit(1) }
const db = createClient(url, key, { auth: { persistSession: false } })

let pass = 0, fail = 0
const check = (name, ok, detail = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`) }
const err = (e) => (e ? `${e.code || ''} ${e.message || ''}`.trim() : 'no error')
console.log(`== ${target} database (${ref}), anon key ==`)

// ---- a. places: anon can read; the client drops verified=false -------------------------------
const { data: places, error: pErr } = await db.from('places').select('id,name_en,name_hi,district,kind,lat,lng,verified').limit(500)
check('a: anon can SELECT from places', !pErr && Array.isArray(places), err(pErr))
const rows = places || []
const hidden = rows.filter((p) => p.verified === false)
// Same filter as clean() in src/lib/location/places.js.
const offered = rows.map((p) => ({ ...p, lat: Number(p.lat), lng: Number(p.lng) })).filter((p) => p.name_en && p.verified !== false && Number.isFinite(p.lat) && Number.isFinite(p.lng))
check('a: the table returns 54 rows to anon, 53 verified and 1 not', rows.length === 54 && hidden.length === 1, `rows ${rows.length}, verified=false ${hidden.length}: ${hidden.map((p) => p.name_en).join(', ')}`)
check('a: the client filter offers exactly 53 places and never the unverified one', offered.length === 53 && !offered.some((p) => p.verified === false) && !offered.some((p) => /lavkush/i.test(p.name_en)), `offered ${offered.length}`)
const perDistrict = {}
for (const p of offered) perDistrict[p.district] = (perDistrict[p.district] || 0) + 1
check('a: all six districts are present', Object.keys(perDistrict).length === 6, JSON.stringify(perDistrict))
check('a: src/lib/location/places.js still filters verified=false', /p\.verified !== false/.test(readFileSync(join(ROOT, 'src/lib/location/places.js'), 'utf8')))

// ---- b. places: anon writes are rejected ---------------------------------------------------
const PROBE = '__ks_stageb_probe__'
const ins = await db.from('places').insert({ name_en: PROBE, name_hi: PROBE, district: 'Sagar', kind: 'town', lat: 0, lng: 0, verified: false }).select()
const insAccepted = !ins.error && (ins.data || []).length > 0
check('b: anon INSERT on places is rejected', !!ins.error && !insAccepted, err(ins.error))
const one = rows[0]
const upd = one ? await db.from('places').update({ name_en: one.name_en }).eq('id', one.id).select() : { error: { message: 'no row to test with' } }
const updAccepted = !upd.error && (upd.data || []).length > 0
check('b: anon UPDATE on places is rejected', !updAccepted, upd.error ? err(upd.error) : `no error, ${(upd.data || []).length} rows changed`)
const del = await db.from('places').delete().eq('name_en', PROBE).select()
const delAccepted = !del.error && (del.data || []).length > 0
check('b: anon DELETE on places is rejected', !!del.error && !delAccepted, err(del.error))
const { count: after } = await db.from('places').select('id', { count: 'exact', head: true })
check('b: row count is unchanged after the probes', after === rows.length, `before ${rows.length}, after ${after}`)
if (insAccepted || updAccepted || delAccepted) {
  console.log('\n!!! A WRITE WAS ACCEPTED WITH THE ANON KEY — STOP AND TELL THE OWNER. Probe row name: ' + PROBE)
  process.exit(2)
}

// ---- c. mandi_prices.in_sagar_division and the "local mandi" queries -------------------------
// The same three queries as src/lib/mandi/mandiApi.js builds with localCol = 'in_sagar_division'.
// An error mentioning the column is what would make the client fall back to is_sagar_district.
const fellBack = (e) => !!e && /in_sagar_division/.test(String(e.message || '') + String(e.details || ''))
const { data: latestRow } = await db.from('mandi_prices').select('price_date').order('price_date', { ascending: false }).limit(1)
const latest = latestRow?.[0]?.price_date || null
const ticker = await db.from('mandi_prices').select('commodity_hi,commodity_en,market,district,modal_price,price_date,is_local:in_sagar_division').eq('price_date', latest).order('in_sagar_division', { ascending: false }).order('modal_price', { ascending: true })
check('c: mandi_prices has in_sagar_division (ticker query, no error)', !ticker.error, err(ticker.error))
const tLocal = (ticker.data || []).filter((r) => r.is_local)
check(`c: ticker query for the latest date (${latest}) returns local rows through the new flag`, tLocal.length > 0, `${(ticker.data || []).length} rows, ${tLocal.length} local`)
const snap = await db.from('mandi_prices').select('commodity_en,modal_price,price_date,market,is_local:in_sagar_division').order('price_date', { ascending: false }).limit(3000)
check('c: /msp snapshot query returns local rows through the new flag', !snap.error && (snap.data || []).some((r) => r.is_local), `${(snap.data || []).length} rows, ${(snap.data || []).filter((r) => r.is_local).length} local  ${snap.error ? err(snap.error) : ''}`)
const crops = [...new Set((snap.data || []).filter((r) => r.is_local).map((r) => r.commodity_en))]
const crop = crops[0]
const perCrop = crop ? await db.from('mandi_prices').select('market,district,modal_price,min_price,max_price,arrivals_tonnes,price_date,is_local:in_sagar_division').eq('commodity_en', crop).order('price_date', { ascending: false }).limit(300) : { error: { message: 'no local crop' } }
check(`c: per-crop query (${crop}) returns local rows through the new flag`, !perCrop.error && (perCrop.data || []).some((r) => r.is_local), perCrop.error ? err(perCrop.error) : `${(perCrop.data || []).filter((r) => r.is_local).length} local of ${(perCrop.data || []).length}`)
const anyFallback = [ticker, snap, perCrop].some((r) => fellBack(r.error))
check('c: the is_sagar_district fallback path was NOT needed', !anyFallback)

// Which districts carry the flag, and does it reach beyond the old Sagar-only flag?
const flagged = await db.from('mandi_prices').select('district,market,is_sagar_district,price_date').eq('in_sagar_division', true).order('price_date', { ascending: false }).limit(5000)
const byDistrict = {}
for (const r of flagged.data || []) (byDistrict[r.district || '(none)'] ||= new Set()).add(r.market)
const summary = Object.entries(byDistrict).map(([d, s]) => `${d}: ${s.size} mandis`).join('; ')
const beyondSagar = (flagged.data || []).filter((r) => !r.is_sagar_district)
console.log(`INFO  flagged rows (newest ${(flagged.data || []).length}): ${summary || 'none'}`)
console.log(`INFO  flagged rows that the OLD is_sagar_district flag would have missed: ${beyondSagar.length}` + (beyondSagar.length ? ` (districts: ${[...new Set(beyondSagar.map((r) => r.district))].join(', ')})` : ''))
console.log(`INFO  local rows on the latest date by district: ${JSON.stringify(tLocal.reduce((a, r) => ((a[r.district] = (a[r.district] || 0) + 1), a), {}))}`)

console.log(`\n${target}: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
