// scripts/refresh-data.mjs
// GitHub job (Batch 16E patch): refreshes location-keyed weather into weather_cache_v2 (pilot cells + any cell requested in
// the last 30 days; Open-Meteo, no key) and, for the PRODUCTION target, runs a read-only price freshness check.
// This job NEVER fetches or writes mandi prices: data.gov.in refuses GitHub's addresses, and the only price writer is the
// Supabase Edge Function mandi-refresh (Mumbai).
//
//   node scripts/refresh-data.mjs --target production --expect-project-ref <ref>
//     weather first, then the freshness check: RED only if the newest stored Sagar-division price_date is older than 3 days or empty.
//   node scripts/refresh-data.mjs --target staging --expect-project-ref <ref>
//     weather only; no freshness check; green if weather ran.
//   --dry-run  opens no database connection, needs no secret, does nothing (prints what it would do).
// Without --target the target is production when the expected ref is the production ref, otherwise staging.
// Pure logic: lib/mandi-daily.mjs (runWatchdogJob, freshnessCheck).

import { createClient } from '@supabase/supabase-js'
import { appendFileSync } from 'node:fs'
import { runWatchdogJob, freshnessCheck, describeError } from './lib/mandi-daily.mjs'
import { checkProjectRef, redact, todayIST, daysBetween } from './lib/mandi-feed.mjs'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DRY_RUN = process.argv.includes('--dry-run')
const refArg = process.argv.indexOf('--expect-project-ref')
const EXPECT_REF = refArg > -1 ? process.argv[refArg + 1] : null
// No secret ever reaches the log: every console line is scrubbed of the keys in the environment.
const SECRETS = [process.env.SUPABASE_SERVICE_ROLE_KEY]
for (const k of ['log', 'error']) { const orig = console[k].bind(console); console[k] = (...a) => orig(...a.map((x) => (typeof x === 'string' ? redact(x, SECRETS) : x))) }
const info = (...a) => console.log(...a)
// Lazy: a dry run never touches the database.
let _supabase = null
const db = () => (_supabase ||= createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY))
const supabase = new Proxy({}, { get: (_, k) => db()[k] })

// Pilot cells (always refreshed) — Sagar district towns.
const PILOT = [
  { lat: 24.045, lon: 78.33 }, { lat: 23.8388, lon: 78.7378 }, { lat: 24.1817, lon: 78.1975 },
  { lat: 23.6372, lon: 79.0628 }, { lat: 23.39, lon: 79.017 }, { lat: 24.04, lon: 78.96 },
  { lat: 23.7833, lon: 78.3667 }, { lat: 24.205, lon: 78.364 },
]
const gridKey = (lat, lon) => `${(Math.round(lat * 10) / 10).toFixed(1)}_${(Math.round(lon * 10) / 10).toFixed(1)}`

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

// Read-only watchdog: newest stored Sagar-division price. Needs only the database, not data.gov.in.
async function freshness() {
  const { data, error } = await supabase.from('mandi_prices').select('price_date').eq('in_sagar_division', true).order('price_date', { ascending: false }).limit(1)
  if (error) throw new Error(error.message)
  return freshnessCheck(data?.[0]?.price_date || null, todayIST(), daysBetween)
}

const PROD_REF = 'eltmcznjcqiahqhjvpjg'
const targetArg = process.argv.indexOf('--target')
const TARGET = targetArg > -1 ? process.argv[targetArg + 1] : (EXPECT_REF === PROD_REF ? 'production' : 'staging')

async function main() {
  if (!['production', 'staging'].includes(TARGET)) { console.error(`--target must be production or staging, got "${TARGET}"`); process.exitCode = 1; return }
  const guard = checkProjectRef(SUPABASE_URL, EXPECT_REF, DRY_RUN)
  if (!guard.ok) { console.error(guard.message); process.exitCode = 1; return }
  const summaryOut = (text) => { if (process.env.GITHUB_STEP_SUMMARY) { try { appendFileSync(process.env.GITHUB_STEP_SUMMARY, redact(text, SECRETS) + '\n\n') } catch {} } }
  const job = await runWatchdogJob({
    target: TARGET,
    dryRun: DRY_RUN,
    log: (m) => console.error(m),
    weather: refreshWeather, // runs first
    freshness: async () => { const f = await freshness(); console.log(f.text); summaryOut(`- target: ${TARGET}\n- ${f.text}`); return f },
  })
  if (TARGET === 'staging' && !DRY_RUN) summaryOut('- target: staging (weather only; prices are written by the Edge Function)')
  if (DRY_RUN) info(`dry run (${TARGET}): nothing written; weather${TARGET === 'production' ? ' and freshness check' : ''} skipped`)
  process.exitCode = job.code
}
main().catch((e) => { console.error(describeError(e, SECRETS)); process.exitCode = 1 })
