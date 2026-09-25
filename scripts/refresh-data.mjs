// scripts/refresh-data.mjs  (was refresh-mandi-prices.mjs)
// Refreshes (a) mandi prices for Sagar/MP and (b) location-keyed weather into
// weather_cache_v2 for the pilot cells + any cell requested in the last 30 days.
// Open-Meteo needs no key. data.gov.in official API is used as a mandi fallback when
// DATA_GOV_IN_API_KEY is set (limit=1000). Run: npm run refresh-prices

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const DATA_GOV_DEMO_KEY = '579b464db66ec23bdd000001c1c5e196de4b4c16e60a17fd58b04bc'
const DATA_GOV_KEY = process.env.DATA_GOV_IN_API_KEY || DATA_GOV_DEMO_KEY
const HAS_REAL_KEY = !!process.env.DATA_GOV_IN_API_KEY

const COMMODITIES = [
  { api: 'Wheat', hi: 'गेहूं' }, { api: 'Soyabean', hi: 'सोयाबीन' }, { api: 'Gram', hi: 'चना' },
  { api: 'Lentil', hi: 'मसूर' }, { api: 'Moong', hi: 'मूंग' }, { api: 'Urad', hi: 'उड़द' },
  { api: 'Paddy(Dhan)(Common)', hi: 'धान' }, { api: 'Maize', hi: 'मक्का' },
  { api: 'Mustard', hi: 'सरसों' }, { api: 'Garlic', hi: 'लहसुन' },
]
const MARKET_PRIORITY = ['Khurai', 'Sagar', 'Rehli', 'Banda', 'Deori']

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
const OFFICIAL_TOKENS = {
  Wheat: ['wheat'], Soyabean: ['soyabean', 'soybean', 'soya bean'], Gram: ['gram'],
  Lentil: ['lentil', 'masur'], Moong: ['moong', 'green gram'], Urad: ['urad', 'black gram'],
  'Paddy(Dhan)(Common)': ['paddy', 'dhan'], Maize: ['maize'], Mustard: ['mustard', 'sarson'],
  Garlic: ['garlic'],
}
function matchCommodity(name, api) {
  const n = String(name || '').toLowerCase()
  if (api === 'Gram') return n.includes('gram') && !n.includes('green') && !n.includes('black') // Bengal/Chana only
  return (OFFICIAL_TOKENS[api] || [api.toLowerCase()]).some((tok) => n.includes(tok))
}

// This resource's filter field names/format have varied (lowercase vs capitalised,
// plain vs .keyword). Rather than hard-code one, try candidate forms and use the
// first that returns rows; then narrow to MP + Sagar client-side. Logs the winner.
const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070'
const FILTER_FORMS = [
  'filters[state]=Madhya Pradesh&filters[district]=Sagar',
  'filters[state.keyword]=Madhya Pradesh&filters[district.keyword]=Sagar',
  'filters[State.keyword]=Madhya Pradesh&filters[District.keyword]=Sagar',
  'filters[State]=Madhya Pradesh&filters[District]=Sagar',
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
  for (const form of FILTER_FORMS) {
    try {
      const url = `https://api.data.gov.in/resource/${RESOURCE_ID}?api-key=${DATA_GOV_KEY}&format=json&limit=${limit}${form ? '&' + form : ''}`
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
      if (!res.ok) { console.error(`official form [${form || 'none'}] HTTP ${res.status}`); continue }
      const raw = (await res.json()).records || []
      const mpAny = raw.filter((r) => stateOf(r).includes('madhya'))
      const mp = mpAny.filter((r) => districtOf(r).includes('sagar'))
      console.log(`official form [${form || 'no-filter'}]: raw=${raw.length} mp=${mpAny.length} sagar=${mp.length}${raw.length && !form ? ' states=' + JSON.stringify([...new Set(raw.map(stateOf))].slice(0, 6)) : ''}`)
      if (mp.length) { recs = mp; winner = form || 'no-filter'; break }
    } catch (e) { console.error(`official form [${form || 'none'}] failed: ${e.message}`) }
  }
  console.log(`official API pool: ${recs.length} MP/Sagar records via [${winner}] (key: ${HAS_REAL_KEY ? 'real' : 'demo'})`)
  _officialPool = recs
  return recs
}
async function fetchFromOfficial(commodity) {
  const pool = await getOfficialPool()
  return pool.filter((r) => matchCommodity(r.commodity || r.Commodity, commodity))
}
function pickBestRecord(records) {
  const sagar = records.filter((r) => (r.district || r.District || '').toLowerCase() === 'sagar')
  const pool = sagar.length ? sagar : records
  for (const m of MARKET_PRIORITY) {
    const hit = pool.find((r) => (r.market || r.Market || '').toLowerCase() === m.toLowerCase())
    if (hit) return { record: hit, isSagar: sagar.length > 0 }
  }
  return pool.length ? { record: pool[0], isSagar: sagar.length > 0 } : null
}
function normalizeRecord(raw) {
  return {
    market: raw.market || raw.Market || 'Unknown', district: raw.district || raw.District || 'Unknown',
    min_price: parseFloat(raw.min_price || raw.Min_Price || 0) || null,
    max_price: parseFloat(raw.max_price || raw.Max_Price || 0) || null,
    modal_price: parseFloat(raw.modal_price || raw.Modal_Price || 0),
    arrivals: parseFloat(raw.arrivals || raw.Arrivals || raw.arrival_tonnes || 0) || null,
  }
}
async function refreshMandi() {
  const today = new Date().toISOString().split('T')[0]
  let ok = 0, fail = 0
  for (const { api, hi } of COMMODITIES) {
    let records = [], source = 'wrapper'
    try { records = await fetchFromWrapper(api); if (!records.length) throw new Error('empty') }
    catch { source = 'official'; try { records = await fetchFromOfficial(api) } catch (e) { console.error(`both failed ${api}: ${e.message}`); fail++; continue } }
    const best = pickBestRecord(records); if (!best) { console.log(`✗ ${hi} (${api}) — no records via ${source}`); fail++; continue }
    const n = normalizeRecord(best.record); if (!n.modal_price) { console.log(`✗ ${hi} (${api}) — no valid modal price`); fail++; continue }
    const row = { commodity_en: api, commodity_hi: hi, market: n.market, district: n.district, state: 'Madhya Pradesh', min_price: n.min_price, max_price: n.max_price, modal_price: n.modal_price, arrivals_tonnes: n.arrivals, price_date: today, is_sagar_district: best.isSagar, fetched_at: new Date().toISOString() }
    const { error } = await supabase.from('mandi_prices').upsert(row, { onConflict: 'commodity_en,market,price_date' })
    if (error) { console.error(`upsert fail ${api}: ${error.message}`); fail++ } else { console.log(`✓ ${hi} ₹${n.modal_price} ${n.market} [${source}]`); ok++ }
  }
  console.log(`mandi: ${ok} ok, ${fail} fail`)
}

// ---------- weather (per cell) ----------
const dayMean = (arr) => { const v = arr.filter((x) => x != null); return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 1000) / 1000 : null }

function computeSeasonRain(dailyTime, dailyPrecip) {
  if (!dailyTime?.length) return null
  const precipByDate = Object.fromEntries(dailyTime.map((d, i) => [d, dailyPrecip[i] || 0]))
  const today = new Date()
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

async function refreshCell(lat, lon) {
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
  try { await refreshMandi() } catch (e) { console.error('mandi refresh failed:', e.message) }
  try { await refreshWeather() } catch (e) { console.error('weather refresh failed:', e.message) }
}
main().catch((e) => { console.error(e); process.exit(0) })
