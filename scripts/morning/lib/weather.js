// Weather behind a small interface: getForecast(lat, lon, date) -> { provider, days: [{date,tmin,tmax,rainProb,rainMm,windMax,code}] x3 }
// or null on failure. Batch 17B: loadWeather() reads the SAME saved forecast the /mausam page uses (weather_cache_v2, Sagar cell,
// public anon key) and only falls back to this direct Open-Meteo call (daily numbers only) when that cell is missing or too old. The provider is replaceable (see docs/review/batch16a/RECON.md: Open-Meteo free tier is
// NOT cleared for production use here).
export const PROVIDER_NAME = 'open-meteo (free tier, NOT cleared for production use)'
export const SAGAR_GRID_KEY = '23.8_78.7' // gridKey(23.8388, 78.7378) - the cell /mausam uses for Sagar
export const CACHE_MAX_AGE_H = 8          // a saved forecast older than this is not used for the morning post

export function skyGroup(code) {
  const c = Number(code)
  if (c === 0) return 'clear'
  if (c === 1 || c === 2) return 'fewClouds'
  if (c === 3) return 'cloudy'
  if (c === 45 || c === 48) return 'fog'
  if ([51, 53, 55, 56, 61, 80].includes(c)) return 'lightRain'
  if ([57, 63, 81].includes(c)) return 'rain'
  if ([65, 66, 67, 82].includes(c)) return 'heavyRain'
  if ([95, 96, 99].includes(c)) return 'storm'
  return 'cloudy'
}

async function getJson(url, fetchImpl, timeoutMs) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const r = await fetchImpl(url, { signal: ctl.signal })
    if (!r.ok) throw new Error(`http ${r.status}`)
    return await r.json()
  } finally { clearTimeout(timer) }
}

export function parseOpenMeteo(j) {
  const d = j && j.daily
  if (!d || !Array.isArray(d.time) || d.time.length < 3) return null
  const days = d.time.slice(0, 3).map((date, i) => ({
    date,
    tmin: d.temperature_2m_min?.[i] ?? null,
    tmax: d.temperature_2m_max?.[i] ?? null,
    rainProb: d.precipitation_probability_max?.[i] ?? null,
    rainMm: d.precipitation_sum?.[i] ?? null,
    windMax: d.wind_speed_10m_max?.[i] ?? null,
    code: d.weather_code?.[i] ?? null,
  }))
  if (days.some((x) => x.tmin == null || x.tmax == null)) return null
  return { provider: PROVIDER_NAME, source: 'open-meteo-direct', days }
}

export async function getForecast(lat, lon, date, { fetchImpl = fetch, timeoutMs = 10000, retries = 1 } = {}) {
  const end = new Date(Date.parse(`${date}T00:00:00Z`) + 2 * 86400000).toISOString().slice(0, 10)
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,weather_code' +
    `&timezone=Asia%2FKolkata&start_date=${date}&end_date=${end}`
  for (let a = 0; a <= retries; a++) {
    try { return parseOpenMeteo(await getJson(url, fetchImpl, timeoutMs)) } catch { /* retry once, then give up */ }
  }
  return null
}

// ---- Batch 17B: the saved forecast (weather_cache_v2) -------------------------------------------------------------
// -> weather object (days + hourly + daily, source 'cache') or null (missing / stale / unreadable). Never throws.
export function weatherFromCacheRow(row, date, nowMs = Date.now()) {
  if (!row || !Array.isArray(row.daily) || !Array.isArray(row.hourly)) return null
  const fetched = Date.parse(row.fetched_at || '')
  if (Number.isNaN(fetched)) return null
  if (nowMs - fetched > CACHE_MAX_AGE_H * 3600000) return null
  const daily = row.daily.filter((d) => d && typeof d.date === 'string' && d.date >= date)
  if (daily.length < 3 || daily[0].date !== date) return null
  const days = daily.slice(0, 3).map((d) => ({ date: d.date, tmin: d.tmin ?? null, tmax: d.tmax ?? null, rainProb: d.precip_prob ?? null, rainMm: d.precip_mm ?? 0, windMax: d.wind_max ?? null, code: d.weathercode ?? null }))
  if (days.some((x) => x.tmin == null || x.tmax == null)) return null
  return { provider: `weather_cache_v2 (Sagar cell ${SAGAR_GRID_KEY}, fetched ${row.fetched_at})`, source: 'cache', fetchedAt: row.fetched_at, days, hourly: row.hourly, daily }
}

export async function getForecastFromCache({ url, key, date, nowMs = Date.now(), fetchImpl = fetch, timeoutMs = 10000 }) {
  if (!url || !key) return null
  try {
    const rows = await getJson(`${url}/rest/v1/weather_cache_v2?grid_key=eq.${SAGAR_GRID_KEY}&select=grid_key,fetched_at,hourly,daily`, (u, o) => fetchImpl(u, { ...o, headers: { apikey: key, Authorization: `Bearer ${key}` } }), timeoutMs)
    return weatherFromCacheRow(Array.isArray(rows) ? rows[0] : null, date, nowMs)
  } catch { return null }
}

// cache first, direct Open-Meteo second. -> weather (with .source and .sourceNote) or null when both fail.
export async function loadWeather({ url, key, lat, lon, date, nowMs = Date.now(), fetchImpl = fetch, timeoutMs = 10000, retries = 1 }) {
  const cached = await getForecastFromCache({ url, key, date, nowMs, fetchImpl, timeoutMs })
  if (cached) return { ...cached, sourceNote: 'cache' }
  const direct = await getForecast(lat, lon, date, { fetchImpl, timeoutMs, retries })
  if (!direct) return null
  return { ...direct, sourceNote: 'open-meteo-direct (cache stale/missing)' }
}
