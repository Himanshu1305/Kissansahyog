// Batch 16G — a cached forecast is only true for the moment it was fetched. These pure helpers (no network, no
// React, `now` injectable) cut a cached cell down to "from now on", say how old it is, and format the "Updated ..."
// line. Unit-tested in tests/unit/weather-freshness-16g.test.mjs.

// The refresh job runs every 3 hours, so up to ~3 h of age is normal.
export const FRESH_MAX_H = 4     // <= 4 h: fresh
export const AGING_MAX_H = 12    // > 4 h to 12 h: aging (amber line)
export const STALE_MAX_H = 24    // > 12 h to 24 h: stale (amber notice); > 24 h: expired (forecast hidden)
export const ESTIMATE_AFTER_MIN = 90  // older than this: "now" values come from the nearest forecast hour
export const HOURLY_KEEP = 48
const HOUR_MS = 3600000
const IST_MS = 19800000          // +05:30

export const weatherAge = (fetchedAt, nowMs = Date.now()) => {
  const t = Date.parse(fetchedAt || '')
  if (Number.isNaN(t)) return null
  return Math.max(0, nowMs - t)
}

export const freshnessLevel = (ageMs) => {
  if (ageMs == null || Number.isNaN(ageMs)) return 'expired'
  const h = ageMs / HOUR_MS
  if (h <= FRESH_MAX_H) return 'fresh'
  if (h <= AGING_MAX_H) return 'aging'
  if (h <= STALE_MAX_H) return 'stale'
  return 'expired'
}

// YYYY-MM-DD in India Standard Time, whatever zone the phone is set to.
export const istDate = (nowMs = Date.now()) => new Date(nowMs + IST_MS).toISOString().slice(0, 10)

// Open-Meteo hourly times are IST wall-clock text with no zone ("2026-10-29T09:00"): read them as IST (+05:30).
export const istTimeMs = (text) => {
  const s = String(text || '')
  if (/(Z|[+-]\d\d:?\d\d)$/.test(s)) return Date.parse(s)
  const full = /T\d\d:\d\d$/.test(s) ? `${s}:00` : s
  return Date.parse(`${full}+05:30`)
}

// Clock parts of an instant in IST: { date: 'YYYY-MM-DD', hour (0-23), minute }.
export const istParts = (ms) => {
  const d = new Date(ms + IST_MS)
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours(), minute: d.getUTCMinutes() }
}

// Returns a trimmed COPY of a normalized cell; never mutates the input, never invents values.
export function trimToNow(cell, nowMs = Date.now()) {
  if (!cell) return cell
  const today = istDate(nowMs)
  const hourStart = Math.floor((nowMs + IST_MS) / HOUR_MS) * HOUR_MS - IST_MS
  const allHourly = Array.isArray(cell.hourly) ? cell.hourly : []
  const dated = (arr) => (Array.isArray(arr) ? arr.filter((d) => d && typeof d.date === 'string' && d.date >= today) : [])
  const daily = dated(cell.daily)
  const forecast = Array.isArray(cell.forecast) ? dated(cell.forecast) : cell.forecast
  const hourly = allHourly.filter((h) => { const ms = istTimeMs(h?.time); return !Number.isNaN(ms) && ms >= hourStart }).slice(0, HOURLY_KEEP)
  const out = { ...cell, daily, forecast, hourly }

  const age = weatherAge(cell.fetched_at, nowMs)
  if (age == null || age > ESTIMATE_AFTER_MIN * 60000) {
    let best = null; let bestD = Infinity
    for (const h of allHourly) {
      const ms = istTimeMs(h?.time); if (Number.isNaN(ms)) continue
      const d = Math.abs(ms - nowMs)
      if (d < bestD) { bestD = d; best = h }
    }
    if (best) {
      out.current_temp = best.temp
      out.current_humidity = best.humidity
      out.current_wind = best.wind_kmh
      out.current_precip = best.precip_mm
      if (daily[0] && daily[0].date === today && daily[0].weathercode != null) out.current_weathercode = daily[0].weathercode
      out.current_estimated = true
      out.current = { ...(cell.current || {}), temp: out.current_temp, humidity: out.current_humidity, wind_kmh: out.current_wind, weathercode: out.current_weathercode, precipitation: out.current_precip }
    }
  }
  return out
}

// ---- the "Updated ..." line --------------------------------------------------------------------------------
// Hindi period words / English am-pm come from strings (wx_per_*), the day word from wx_upd_*.
export function periodKey(hour) {
  if (hour < 4) return 'wx_per_night_am'
  if (hour < 12) return 'wx_per_morning'
  if (hour < 16) return 'wx_per_afternoon'
  if (hour < 20) return 'wx_per_evening'
  return 'wx_per_night_pm'
}
const dd = (date) => `${date.slice(8, 10)}/${date.slice(5, 7)}`

// "Updated today 12:21 pm" / "आज दोपहर 12:21 बजे अपडेट"; yesterday likewise; older: the dd/mm date.
export function updatedLine(fetchedAt, nowMs, t, lang) {
  const ms = Date.parse(fetchedAt || '')
  if (Number.isNaN(ms)) return ''
  const p = istParts(ms)
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12
  const clock = `${h12}:${String(p.minute).padStart(2, '0')}`
  const today = istDate(nowMs)
  const yesterday = istDate(nowMs - 86400000)
  const day = p.date === today ? t('wx_upd_today') : p.date === yesterday ? t('wx_upd_yesterday') : `${t('wx_upd_on')} ${dd(p.date)}`
  const per = t(periodKey(p.hour))
  return lang === 'en' ? `${day} ${clock} ${per}` : `${day} ${per} ${clock} ${t('wx_upd_suffix')}`
}
