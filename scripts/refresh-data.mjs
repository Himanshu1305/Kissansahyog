// scripts/refresh-data.mjs  (was refresh-mandi-prices.mjs)
// Refreshes (a) mandi prices for Sagar Division/MP and (b) location-keyed weather into
// weather_cache_v2 for the pilot cells + any cell requested in the last 30 days.
// Open-Meteo needs no key. data.gov.in official API is used as a mandi fallback when
// DATA_GOV_IN_API_KEY is set (limit=1000). Run: npm run refresh-prices
//
// Batch 7L-1 — the mandi filter covers the six districts of Sagar Division (Sagar, Damoh,
// Panna, Tikamgarh, Chhatarpur, Niwari), not Sagar district alone. For each commodity every
// division mandi that reports is written (one row per market) with in_sagar_division = true;
// when no division mandi reports, the single best MP record is written as before (flag false).
//
//   node scripts/refresh-data.mjs --dry-run [--json]
// reads the price sources and prints the rows it WOULD write (--json: as one JSON document). It opens no
// database connection, needs no secret (the data.gov.in sample key is used when no real key is set) and skips weather.
//
// Batch 16C: price_date is the feed record's own arrival date (records without one are skipped, records older than
// 7 days are skipped); "today" is the IST date; the official feed is tried first and the third-party wrapper is only a
// labelled fallback; --expect-project-ref <ref> refuses to run against the wrong database; the script exits non-zero
// when no rows were written, the newest row is more than 3 days old, or the guard failed. Pure logic: lib/mandi-feed.mjs.

import { createClient } from '@supabase/supabase-js'
import { matchCommodity } from './lib/mandi-commodity.mjs'
import { divisionDistrict, filterFresh, pickRecords, buildRows, checkProjectRef, decideExit, summarize, redact, todayIST, MAX_AGE_DAYS } from './lib/mandi-feed.mjs'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DRY_RUN = process.argv.includes('--dry-run')
const JSON_OUT = process.argv.includes('--json')
const refArg = process.argv.indexOf('--expect-project-ref')
const EXPECT_REF = refArg > -1 ? process.argv[refArg + 1] : null
// No secret ever reaches the log: every console line is scrubbed of the keys in the environment.
const SECRETS = [process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.DATA_GOV_IN_API_KEY]
for (const k of ['log', 'error']) { const orig = console[k].bind(console); console[k] = (...a) => orig(...a.map((x) => (typeof x === 'string' ? redact(x, SECRETS) : x))) }
// --json keeps stdout a single JSON document: progress lines go to stderr.
const info = (...a) => (JSON_OUT ? console.error(...a) : console.log(...a))
// Lazy: a dry run never touches the database.
let _supabase = null
const db = () => (_supabase ||= createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY))
const supabase = new Proxy({}, { get: (_, k) => db()[k] })

// The six districts of Sagar Division, as the price feeds spell them (lower-case).
const DIVISION_DISTRICTS = ['Sagar', 'Damoh', 'Panna', 'Tikamgarh', 'Chhatarpur', 'Niwari']

const DATA_GOV_DEMO_KEY = '579b464db66ec23bdd000001c1c5e196de4b4c16e60a17fd58b04bc'
const DATA_GOV_KEY = process.env.DATA_GOV_IN_API_KEY || DATA_GOV_DEMO_KEY
const HAS_REAL_KEY = !!process.env.DATA_GOV_IN_API_KEY

const COMMODITIES = [
  { api: 'Wheat', hi: 'गेहूं' }, { api: 'Soyabean', hi: 'सोयाबीन' }, { api: 'Gram', hi: 'चना' },
  { api: 'Lentil', hi: 'मसूर' }, { api: 'Moong', hi: 'मूंग' }, { api: 'Urad', hi: 'उड़द' },
  { api: 'Paddy(Dhan)(Common)', hi: 'धान' }, { api: 'Maize', hi: 'मक्का' },
  { api: 'Mustard', hi: 'सरसों' }, { api: 'Garlic', hi: 'लहसुन' },
]

// Pilot cells (always refreshed) — Sagar district towns.
const PILOT = [
  { lat: 24.045, lon: 78.33 }, { lat: 23.8388, lon: 78.7378 }, { lat: 24.1817, lon: 78.1975 },
  { lat: 23.6372, lon: 79.0628 }, { lat: 23.39, lon: 79.017 }, { lat: 24.04, lon: 78.96 },
  { lat: 23.7833, lon: 78.3667 }, { lat: 24.205, lon: 78.364 },
]
const gridKey = (lat, lon) => `${(Math.round(lat * 10) / 10).toFixed(1)}_${(Math.round(lon * 10) / 10).toFixed(1)}`

// ---------- mandi ----------
async function fetchFromWrapper(commodity) {
  const url = `https://mandi-api.onrender.com/v1/prices?state=Madhya Pradesh&commodity=${encodeURIComponent(commodity)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`Wrapper HTTP ${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data : (data.records || data.data || [])
}
// The official data.gov.in Agmarknet commodity names differ from our short api
// names (e.g. "Bengal Gram(Gram)(Whole)", "Green Gram (Moong)(Whole)"), and a
// filters[Commodity]=Gram query returns nothing. So instead of filtering by exact
// name we fetch the Sagar pool once (real key → limit=1000) and match by token.
// Batch 10E: matchCommodity lives in scripts/lib/mandi-commodity.mjs (unit-tested); Gram no
// longer matches "Red gram/Arhar/Tur(whole)".

// This resource's filter field names/format have varied (lowercase vs capitalised,
// plain vs .keyword). Rather than hard-code one, try candidate forms and use the
// first that returns rows; then narrow to MP + the six division districts client-side.
// A form containing {D} is run once per division district and the results are merged.
const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070'
const FILTER_FORMS = [
  'filters[state]=Madhya Pradesh&filters[district]={D}',
  'filters[state.keyword]=Madhya Pradesh&filters[district.keyword]={D}',
  'filters[State.keyword]=Madhya Pradesh&filters[District.keyword]={D}',
  'filters[State]=Madhya Pradesh&filters[District]={D}',
  'filters[state]=Madhya Pradesh',
  '', // no filter — last resort, narrowed client-side
]
const stateOf = (r) => (r.state || r.State || '').toLowerCase()
const districtOf = (r) => (r.district || r.District || '').toLowerCase()

let _officialPool = null
async function getOfficialPool() {
  if (_officialPool) return _officialPool
  const limit = HAS_REAL_KEY ? 1000 : 50
  let recs = [], winner = 'none'
  const fetchForm = async (form) => {
    const url = `https://api.data.gov.in/resource/${RESOURCE_ID}?api-key=${DATA_GOV_KEY}&format=json&limit=${limit}${form ? '&' + form : ''}`
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()).records || []
  }
  for (const form of FILTER_FORMS) {
    try {
      // A {D} form is asked once per division district; a plain form once.
      const forms = form.includes('{D}') ? DIVISION_DISTRICTS.map((d) => form.replace('{D}', d)) : [form]
      const raw = []
      for (const f of forms) { try { raw.push(...await fetchForm(f)) } catch (e) { console.error(`official form [${f || 'none'}] ${e.message}`) } }
      // The resource's text filter also returns other "*Pradesh" states, so narrow
      // to true MP client-side. Division rows are often absent from the daily feed,
      // so the last forms are MP-wide; per-commodity division preference happens later.
      const mpAny = raw.filter((r) => stateOf(r).includes('madhya'))
      const division = mpAny.filter((r) => divisionDistrict(districtOf(r)))
      info(`official form [${form || 'no-filter'}]: raw=${raw.length} mp=${mpAny.length} division=${division.length}`)
      if (mpAny.length) { recs = mpAny; winner = form || 'no-filter'; break }
    } catch (e) { console.error(`official form [${form || 'none'}] failed: ${e.message}`) }
  }
  info(`official API pool: ${recs.length} MP records via [${winner}] (key: ${HAS_REAL_KEY ? 'real' : 'demo'})`)
  _officialPool = recs
  return recs
}
async function fetchFromOfficial(commodity) {
  const pool = await getOfficialPool()
  return pool.filter((r) => matchCommodity(r.commodity || r.Commodity, commodity))
}
// Write rows; if the database does not have in_sagar_division yet (migration 0058 not
// applied) write the same rows without that column instead of failing the whole refresh.
let _hasDivisionCol = true
async function upsertPrices(rows) {
  const strip = (r) => { const { in_sagar_division: _drop, ...rest } = r; return rest }
  let { error } = await supabase.from('mandi_prices').upsert(_hasDivisionCol ? rows : rows.map(strip), { onConflict: 'commodity_en,market,price_date' })
  if (error && _hasDivisionCol && /in_sagar_division/.test(error.message || '')) {
    console.error('mandi_prices.in_sagar_division is missing — apply migration 0058. Writing without the flag for now.')
    _hasDivisionCol = false
    ;({ error } = await supabase.from('mandi_prices').upsert(rows.map(strip), { onConflict: 'commodity_en,market,price_date' }))
  }
  return error
}
// Official feed first; the third-party wrapper is only a labelled fallback (it is free, rate-limited per IP and has
// been seen answering HTTP 429). Both are filtered to dated, fresh records before anything is written.
async function refreshMandi() {
  const today = todayIST()
  const perCommodity = [], allRows = [], sources = new Set()
  for (const { api, hi } of COMMODITIES) {
    let records = [], source = 'official'
    try { records = await fetchFromOfficial(api) } catch (e) { console.error(`official failed ${api}: ${e.message}`) }
    if (!records.length) {
      source = 'wrapper (fallback)'
      try { records = await fetchFromWrapper(api) } catch (e) { console.error(`wrapper failed ${api}: ${e.message}`) }
    }
    const entry = { api, rows: 0, division: 0, newest: null, skipped: 0 }
    perCommodity.push(entry)
    if (!records.length) { info(`✗ ${hi} (${api}) — no records from either source`); continue }
    const { fresh, undated, stale, future } = filterFresh(records, today)
    entry.skipped = undated + stale + future
    if (entry.skipped) info(`  ${api}: skipped ${undated} undated, ${stale} older than ${MAX_AGE_DAYS} days, ${future} future-dated`)
    const picks = pickRecords(fresh); if (!picks.length) { info(`✗ ${hi} (${api}) — no dated record from the last ${MAX_AGE_DAYS} days via ${source}`); continue }
    const rows = buildRows(api, hi, picks)
    if (!rows.length) { info(`✗ ${hi} (${api}) — no valid modal price`); continue }
    if (!DRY_RUN) {
      const error = await upsertPrices(rows)
      if (error) { console.error(`upsert fail ${api}: ${error.message}`); continue }
    }
    sources.add(source)
    entry.rows = rows.length; entry.division = rows.filter((r) => r.in_sagar_division).length
    entry.newest = rows.map((r) => r.price_date).sort().slice(-1)[0]
    allRows.push(...rows)
    for (const r of rows) info(`${DRY_RUN ? '[dry-run] ' : '✓ '}${hi} ₹${r.modal_price} ${r.market} (${r.district}) ${r.price_date} division=${r.in_sagar_division} [${source}]`)
  }
  return { today, perCommodity, allRows, source: sources.size ? [...sources].join(' + ') : 'none answered' }
}

// ---------- weather (per cell) ----------
const dayMean = (arr) => { const v = arr.filter((x) => x != null); return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 1000) / 1000 : null }

function computeSeasonRain(dailyTime, dailyPrecip) {
  if (!dailyTime?.length) return null
  const precipByDate = Object.fromEntries(dailyTime.map((d, i) => [d, dailyPrecip[i] || 0]))
  const [ty, tm, td] = todayIST().split('-').map(Number) // IST calendar, not the runner's UTC
  const today = { getFullYear: () => ty, getMonth: () => tm - 1, getDate: () => td }
  const m = today.getMonth()
  const kharif = m >= 5 && m <= 8 // Jun–Sep
  const startY = kharif ? today.getFullYear() : (m >= 9 ? today.getFullYear() : today.getFullYear() - 1)
  const startMonth = kharif ? 5 : 9 // Jun=5 / Oct=9
  const seasonStart = new Date(Date.UTC(startY, startMonth, 1))
  const end = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
  const windowDays = Math.round((end - seasonStart) / 86400000)
  const sumWindow = (from, days) => {
    let s = 0
    for (let i = 0; i <= days; i++) { const d = new Date(from.getTime() + i * 86400000).toISOString().slice(0, 10); s += precipByDate[d] || 0 }
    return s
  }
  const to_date_mm = Math.round(sumWindow(seasonStart, windowDays))
  const normals = []
  for (let y = 2015; y < startY; y++) {
    const ps = new Date(Date.UTC(y, startMonth, 1))
    if (dailyTime[0] && ps.toISOString().slice(0, 10) < dailyTime[0]) continue
    normals.push(sumWindow(ps, windowDays))
  }
  const normal_mm = normals.length ? Math.round(normals.reduce((a, b) => a + b, 0) / normals.length) : null
  return { season_start: seasonStart.toISOString().slice(0, 10), to_date_mm, normal_mm, source: 'Open-Meteo archive (2015–)' }
}

async function refreshCell(rawLat, rawLon) {
  // Batch 7L-2: a requested cell may carry an exact position saved by an older app build.
  // Always work with (and save) the cell centre, the same point gridKey() names.
  const lat = Math.round(Number(rawLat) * 10) / 10, lon = Math.round(Number(rawLon) * 10) / 10
  const key = gridKey(lat, lon)
  const fUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation' +
    '&hourly=temperature_2m,precipitation,precipitation_probability,wind_speed_10m,relative_humidity_2m,soil_moisture_0_to_7cm' +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max,et0_fao_evapotranspiration' +
    '&timezone=Asia%2FKolkata&forecast_days=16'
  const res = await fetch(fUrl, { signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`)
  const d = await res.json()

  const cur = d.current
  const current = { temp: cur.temperature_2m, humidity: cur.relative_humidity_2m, wind_kmh: cur.wind_speed_10m, weathercode: cur.weather_code, precipitation: cur.precipitation }

  // next 48h hourly (from now)
  const now = Date.now()
  const H = d.hourly
  const hourly = []
  for (let i = 0; i < H.time.length && hourly.length < 48; i++) {
    if (new Date(H.time[i]).getTime() < now - 3600000) continue
    hourly.push({ time: H.time[i], temp: H.temperature_2m[i], precip_mm: H.precipitation[i], precip_prob: H.precipitation_probability[i], wind_kmh: H.wind_speed_10m[i], humidity: H.relative_humidity_2m[i], soil_moisture: H.soil_moisture_0_to_7cm?.[i] ?? null })
  }
  // daily soil moisture = mean of that date's hourly values
  const smByDate = {}
  H.time.forEach((t, i) => { const day = t.slice(0, 10); (smByDate[day] ||= []).push(H.soil_moisture_0_to_7cm?.[i]) })
  const D = d.daily
  const daily = D.time.map((date, i) => ({
    date, tmax: D.temperature_2m_max[i], tmin: D.temperature_2m_min[i], precip_mm: D.precipitation_sum[i] || 0,
    precip_prob: D.precipitation_probability_max[i] ?? null, wind_max: D.wind_speed_10m_max[i], weathercode: D.weather_code[i],
    et0: D.et0_fao_evapotranspiration?.[i] ?? null, soil_moisture: dayMean(smByDate[date] || []),
  }))

  // season rainfall from archive
  let season_rain = null
  try {
    const aStart = '2015-01-01'
    const aEnd = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10) // archive lags ~1-2 days
    const aUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${aStart}&end_date=${aEnd}&daily=precipitation_sum&timezone=Asia%2FKolkata`
    const ares = await fetch(aUrl, { signal: AbortSignal.timeout(30000) })
    if (ares.ok) { const a = await ares.json(); season_rain = computeSeasonRain(a.daily.time, a.daily.precipitation_sum) }
  } catch (e) { console.error(`archive fail ${key}: ${e.message}`) }

  const row = { grid_key: key, latitude: lat, longitude: lon, current, hourly, daily, season_rain, fetched_at: new Date().toISOString() }
  const { error } = await supabase.from('weather_cache_v2').upsert(row, { onConflict: 'grid_key' })
  if (error) throw new Error(error.message)
  console.log(`✓ weather ${key} — ${current.temp}°, ${daily.length}d, season ${season_rain?.to_date_mm ?? '?'}mm`)
}

async function refreshWeather() {
  // pilot cells + requested cells in last 30 days
  const cells = new Map()
  for (const c of PILOT) cells.set(gridKey(c.lat, c.lon), c)
  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  const { data: reqs } = await supabase.from('weather_grid_requests').select('grid_key,latitude,longitude').gte('last_requested_at', since)
  for (const r of reqs || []) cells.set(r.grid_key, { lat: Number(r.latitude), lon: Number(r.longitude) })
  let ok = 0, fail = 0
  for (const c of cells.values()) { try { await refreshCell(c.lat, c.lon); ok++ } catch (e) { console.error(`cell fail: ${e.message}`); fail++ } }
  console.log(`weather: ${ok} cells ok, ${fail} fail`)
}

async function main() {
  const guard = checkProjectRef(SUPABASE_URL, EXPECT_REF, DRY_RUN)
  if (!guard.ok) { console.error(guard.message); process.exitCode = 1; return }
  let mandi = null
  try { mandi = await refreshMandi() } catch (e) { console.error('mandi refresh failed:', e.message) }
  const today = mandi?.today || todayIST()
  const sum = summarize({ perCommodity: mandi?.perCommodity || [], today, source: mandi?.source || 'none', target: EXPECT_REF || (DRY_RUN ? 'dry run' : '') })
  const verdict = decideExit({ refOk: true, totalRows: sum.rows, newestDate: sum.newest, today })
  const text = `${sum.text}\n- result: ${verdict.code ? 'FAILED - ' + verdict.reasons.join('; ') : 'ok'}`
  if (JSON_OUT) console.log(JSON.stringify({ today, source: mandi?.source, rows: mandi?.allRows || [], exit: verdict }, null, 2)); else console.log(text)
  if (process.env.GITHUB_STEP_SUMMARY) { try { (await import('node:fs')).appendFileSync(process.env.GITHUB_STEP_SUMMARY, redact(text, SECRETS) + '\n\n') } catch {} }
  // Weather is refreshed even when mandi failed; the mandi verdict still decides the exit code.
  if (DRY_RUN) info('dry run: nothing written, weather skipped')
  else { try { await refreshWeather() } catch (e) { console.error('weather refresh failed:', e.message) } }
  process.exitCode = verdict.code
}
main().catch((e) => { console.error(e); process.exitCode = 1 })
