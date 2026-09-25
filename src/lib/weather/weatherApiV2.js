// Location-keyed weather read from weather_cache_v2 (populated by the refresh cron;
// the browser never calls Open-Meteo). Returns a normalized object that keeps the
// old homepage Today-card shape (current_temp/current_weathercode/forecast) AND
// exposes the raw hourly/daily/season_rain for the /mausam page.
import { supabase } from '../supabaseClient'
import { haversineKm } from '../distance'
import { wdayKey } from './weatherApi'

export const gridKey = (lat, lon) => `${(Math.round(lat * 10) / 10).toFixed(1)}_${(Math.round(lon * 10) / 10).toFixed(1)}`

function normalize(row) {
  if (!row) return null
  const cur = row.current || {}
  const daily = Array.isArray(row.daily) ? row.daily : []
  // Back-compat forecast array for getRainAlert + homepage InfoTile.
  const forecast = daily.map((d) => ({
    date: d.date, day_hi: null, temp_max: d.tmax, temp_min: d.tmin,
    precipitation_sum: d.precip_mm, weathercode: d.weathercode,
    precipitation_probability_max: d.precip_prob,
  }))
  return {
    grid_key: row.grid_key, latitude: Number(row.latitude), longitude: Number(row.longitude),
    fetched_at: row.fetched_at,
    current_temp: cur.temp, current_humidity: cur.humidity, current_weathercode: cur.weathercode,
    current_wind: cur.wind_kmh, current_precip: cur.precipitation,
    current: cur, hourly: Array.isArray(row.hourly) ? row.hourly : [],
    daily, forecast, season_rain: row.season_rain || null,
  }
}

const DAY_MS = 86400000
const dayMean = (a) => { const v = (a || []).filter((x) => x != null); return v.length ? Math.round((v.reduce((s, x) => s + x, 0) / v.length) * 100) / 100 : null }

// Build a normalized weather cell live from Open-Meteo for ANY lat/lng on Earth (same
// params as the cron's refreshCell, minus the heavy 10-year archive — season_rain is left
// null and the cron fills it on its next pass). Best-effort persists the result so the
// next visitor + cron benefit (Phase 1b-i). Throws on network/API failure.
export async function fetchLiveWeatherCell(lat, lon) {
  const key = gridKey(lat, lon)
  const fUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation' +
    '&hourly=temperature_2m,precipitation,precipitation_probability,wind_speed_10m,relative_humidity_2m,soil_moisture_0_to_7cm' +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max,et0_fao_evapotranspiration' +
    '&timezone=Asia%2FKolkata&forecast_days=16'
  const res = await fetch(fUrl, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`)
  const d = await res.json()
  const cur = d.current || {}
  const current = { temp: cur.temperature_2m, humidity: cur.relative_humidity_2m, wind_kmh: cur.wind_speed_10m, weathercode: cur.weather_code, precipitation: cur.precipitation }
  const H = d.hourly || { time: [] }
  const now = Date.now()
  const hourly = []
  for (let i = 0; i < H.time.length && hourly.length < 48; i++) {
    if (new Date(H.time[i]).getTime() < now - 3600000) continue
    hourly.push({ time: H.time[i], temp: H.temperature_2m[i], precip_mm: H.precipitation[i], precip_prob: H.precipitation_probability[i], wind_kmh: H.wind_speed_10m[i], humidity: H.relative_humidity_2m[i], soil_moisture: H.soil_moisture_0_to_7cm?.[i] ?? null })
  }
  const smByDate = {}
  H.time.forEach((t, i) => { const day = t.slice(0, 10); (smByDate[day] ||= []).push(H.soil_moisture_0_to_7cm?.[i]) })
  const D = d.daily || { time: [] }
  const daily = D.time.map((date, i) => ({
    date, tmax: D.temperature_2m_max[i], tmin: D.temperature_2m_min[i], precip_mm: D.precipitation_sum[i] || 0,
    precip_prob: D.precipitation_probability_max[i] ?? null, wind_max: D.wind_speed_10m_max[i], weathercode: D.weather_code[i],
    et0: D.et0_fao_evapotranspiration?.[i] ?? null, soil_moisture: dayMean(smByDate[date] || []),
  }))
  // Persist for subsequent visits (RPC — anon can't write weather_cache_v2 directly) and
  // register the cell so the cron adds season_rain + keeps it fresh. Both best-effort.
  supabase.rpc('cache_weather_cell', { p_grid_key: key, p_lat: lat, p_lon: lon, p_current: current, p_hourly: hourly, p_daily: daily }).then(() => {}, () => {})
  requestGridCell(lat, lon)
  return normalize({ grid_key: key, latitude: lat, longitude: lon, current, hourly, daily, season_rain: null, fetched_at: new Date().toISOString() })
}

// Fetch the cell for lat/lon. Order: exact cached cell → LIVE Open-Meteo (global, any
// coordinates) → a genuinely NEARBY cached cell as an offline last resort. Never serves a
// far MP cell to a global user (the old nearest-cell fallback did — the residual MP-only
// assumption Phase 1b removes). Returns null only when there is truly nothing to show.
export async function fetchWeatherCell(lat, lon) {
  const key = gridKey(lat, lon)
  const { data: exact } = await supabase.from('weather_cache_v2').select('*').eq('grid_key', key).maybeSingle()
  if (exact) return normalize(exact)
  // Cache miss → live global fetch (Phase 1b-i) so an un-cron'd cell never shows "no data".
  const live = await fetchLiveWeatherCell(lat, lon).catch(() => null)
  if (live) return live
  // Offline last resort: a cached cell ONLY if it is genuinely nearby (~1 grid step),
  // never a distant MP cell for a far/global user.
  const { data: cells } = await supabase.from('weather_cache_v2').select('grid_key,latitude,longitude')
  if (!cells || !cells.length) return null
  let best = null, bestD = Infinity
  for (const c of cells) {
    const d = haversineKm(lat, lon, Number(c.latitude), Number(c.longitude))
    if (d < bestD) { bestD = d; best = c }
  }
  if (!best || bestD > 30) return null
  const { data: row } = await supabase.from('weather_cache_v2').select('*').eq('grid_key', best.grid_key).maybeSingle()
  return normalize(row)
}

// Record that this cell was requested so the refresh cron keeps it fresh. Best-effort.
export async function requestGridCell(lat, lon) {
  try {
    await supabase.from('weather_grid_requests').upsert(
      { grid_key: gridKey(lat, lon), latitude: lat, longitude: lon, last_requested_at: new Date().toISOString() },
      { onConflict: 'grid_key' },
    )
  } catch { /* ignore */ }
}

export { wdayKey }
