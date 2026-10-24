// Weather behind a small interface: getForecast(lat, lon, date) -> { provider, days: [{date,tmin,tmax,rainProb,rainMm,windMax,code}] x3 }
// or null on failure. The provider is replaceable (see docs/review/batch16a/RECON.md: Open-Meteo free tier is
// NOT cleared for production use here).
export const PROVIDER_NAME = 'open-meteo (free tier, NOT cleared for production use)'

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
  return { provider: PROVIDER_NAME, days }
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
