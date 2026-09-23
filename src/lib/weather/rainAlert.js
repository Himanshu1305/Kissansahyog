// IMD-informed rainfall classification, derived from the Open-Meteo daily
// precipitation already cached in weather_cache.forecast. Returns ascii metadata
// only (level/color/days/total/max) — all bilingual text is rendered via i18n in
// <RainAlert>. Thresholds follow IMD's 24-hour precipitation colour codes.
//
// IMPORTANT (per spec): only levels heavy+ (>= 64.5 mm/day) are an IMD "alert"
// (chetavni). light/moderate are only "expected" (sambhavna) — the bilingual
// wording is handled in <RainAlert> via i18n keys.

// Classify a single day's precipitation (mm) → { level, color } or null.
export function classifyDay(mm) {
  if (!mm || mm <= 0) return null
  if (mm < 15) return { level: 'light', color: 'green' }
  if (mm < 64.5) return { level: 'moderate', color: 'blue' }
  if (mm < 115.5) return { level: 'heavy', color: 'yellow' }     // IMD Yellow
  if (mm < 204.5) return { level: 'very_heavy', color: 'orange' } // IMD Orange
  return { level: 'extreme', color: 'red' }                       // IMD Red
}

const IMD_ALERT_LEVELS = new Set(['heavy', 'very_heavy', 'extreme'])
export const isImdAlert = (level) => IMD_ALERT_LEVELS.has(level)

// Compute the leading rainy streak (>3 mm/day) within the next 48h window and its
// severity. Returns { level, color, days, total, maxDay } or null (no rain).
export function getRainAlert(forecast) {
  if (!Array.isArray(forecast) || forecast.length === 0) return null
  const rain = (d) => Number(d?.precipitation_sum || 0)

  // Trigger only if rain in the next 48h (day 0 or 1), matching rain_alert_48h.
  let start = -1
  for (let i = 0; i < Math.min(2, forecast.length); i++) {
    if (rain(forecast[i]) > 3) { start = i; break }
  }
  if (start < 0) return null

  let days = 0, total = 0, maxDay = 0
  for (let i = start; i < forecast.length; i++) {
    if (rain(forecast[i]) > 3) { days++; total += rain(forecast[i]); maxDay = Math.max(maxDay, rain(forecast[i])) }
    else break
  }
  const cls = classifyDay(maxDay) || { level: 'light', color: 'green' }
  // max48: heaviest single day within the next 48h (day 0/1) — drives the IMD
  // advice wording. perDay: the next up-to-3 forecast days' totals (rounded), for
  // the "kal / parson / narson" (tomorrow / day-after / +3) pills.
  const max48 = Math.max(rain(forecast[0]), forecast.length > 1 ? rain(forecast[1]) : 0)
  const perDay = forecast.slice(start, start + 3).map((d) => Math.round(rain(d)))
  return { ...cls, days, total: Math.round(total), maxDay: Math.round(maxDay), max48: Math.round(max48), perDay }
}
