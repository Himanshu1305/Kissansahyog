// Farm-action rules for the /mausam ActionWindows (छिड़काव · सिंचाई · कटाई/सुखाई · बुवाई).
// Thresholds are deliberately explicit and commented so Shri A.K. Dixit can review
// them. Each rule returns { status: 'ok'|'caution'|'stop', reasonKey }. The reasonKey
// resolves to a bilingual one-liner in strings.js. No prediction — pure thresholds
// on the cached Open-Meteo forecast.
//
// Soil moisture is volumetric water content (m³/m³) for 0–7 cm:
//   dry < 0.20, high > 0.35 (comfortable band in between).
const SOIL_HIGH = 0.35
const SOIL_DRY = 0.20
const ET0_HIGH = 5 // mm/day — high evapotranspiration demand

// Sum hourly precipitation (mm) over the next `hours` from the (already now-anchored) hourly array.
const rainNextHours = (hourly, hours) => (hourly || []).slice(0, hours).reduce((s, h) => s + (Number(h.precip_mm) || 0), 0)
const maxWindNextHours = (hourly, hours) => Math.max(0, ...(hourly || []).slice(0, hours).map((h) => Number(h.wind_kmh) || 0))
const rainNextDays = (daily, n) => (daily || []).slice(0, n).reduce((s, d) => s + (Number(d.precip_mm) || 0), 0)
const rainDay0 = (daily) => Number(daily?.[0]?.precip_mm) || 0
const soilNow = (hourly, daily) => {
  const h = (hourly || []).find((x) => x.soil_moisture != null)
  if (h) return Number(h.soil_moisture)
  return daily?.[0]?.soil_moisture != null ? Number(daily[0].soil_moisture) : null
}

export function sprayWindow(hourly) {
  const rain6 = rainNextHours(hourly, 6)
  const rain24 = rainNextHours(hourly, 24)
  const wind6 = maxWindNextHours(hourly, 6)
  if (rain6 >= 2 || wind6 > 15) return { status: 'stop', reasonKey: rain6 >= 2 ? 'aw_spray_stop_rain' : 'aw_spray_stop_wind' }
  if (rain24 > 0 || (wind6 >= 10 && wind6 <= 15)) return { status: 'caution', reasonKey: 'aw_spray_caution' }
  return { status: 'ok', reasonKey: 'aw_spray_ok' }
}

export function irrigationWindow(hourly, daily) {
  const rain48 = rainNextDays(daily, 2)
  const soil = soilNow(hourly, daily)
  const et0 = Number(daily?.[0]?.et0) || 0
  if (rain48 >= 10) return { status: 'stop', reasonKey: 'aw_irrig_stop' }
  if (soil != null && soil > SOIL_HIGH) return { status: 'caution', reasonKey: 'aw_irrig_caution' }
  if (et0 >= ET0_HIGH && rain48 < 2 && (soil == null || soil < SOIL_DRY)) return { status: 'ok', reasonKey: 'aw_irrig_ok' }
  return { status: 'caution', reasonKey: 'aw_irrig_caution' }
}

export function harvestWindow(daily) {
  const rain48 = rainNextDays(daily, 2)
  const rain72 = rainNextDays(daily, 3)
  if (rain48 >= 5) return { status: 'stop', reasonKey: 'aw_harvest_stop' }
  if (rain72 > 0) return { status: 'caution', reasonKey: 'aw_harvest_caution' }
  return { status: 'ok', reasonKey: 'aw_harvest_ok' }
}

export function sowingWindow(daily) {
  const rain5 = rainNextDays(daily, 5)
  const rain24 = rainDay0(daily)
  if (rain24 >= 40) return { status: 'stop', reasonKey: 'aw_sow_stop' }
  if (rain5 >= 10 && rain5 <= 30 && rain24 < 40) return { status: 'ok', reasonKey: 'aw_sow_ok' }
  if (rain5 < 10) return { status: 'caution', reasonKey: 'aw_sow_caution' }
  return { status: 'caution', reasonKey: 'aw_sow_caution' }
}

export function actionWindows(hourly, daily) {
  return {
    spray: sprayWindow(hourly),
    irrigation: irrigationWindow(hourly, daily),
    harvest: harvestWindow(daily),
    sowing: sowingWindow(daily),
  }
}

// IMD 24-hour rainfall colour thresholds (mm). Returns { level, color } for a day's mm.
export function imdClass(mm) {
  if (mm == null) return null
  if (mm >= 204.5) return { level: 'red', color: '#DC2626' }
  if (mm >= 115.5) return { level: 'orange', color: '#EA580C' }
  if (mm >= 64.5) return { level: 'yellow', color: '#CA8A04' }
  if (mm >= 15.6) return { level: 'blue', color: '#2563EB' }
  if (mm > 0) return { level: 'green', color: '#16A34A' }
  return null
}

// Next rain event from the hourly series → { inHours, mm } or null (no rain in 48h).
export function nextRain(hourly) {
  let start = -1
  for (let i = 0; i < (hourly || []).length; i++) { if ((Number(hourly[i].precip_mm) || 0) >= 0.5) { start = i; break } }
  if (start < 0) return null
  let mm = 0
  for (let i = start; i < hourly.length && i < start + 12; i++) mm += Number(hourly[i].precip_mm) || 0
  return { inHours: start, mm: Math.round(mm), time: hourly[start].time }
}

export const STATUS_COLOR = {
  ok: { bg: 'var(--ks-green-tint)', fg: 'var(--ks-green-dark)' },
  caution: { bg: 'var(--ks-saffron-tint)', fg: 'var(--ks-orange-dark)' },
  stop: { bg: '#FDE2E2', fg: '#B4231F' },
}
