import { rainVerdict, IRRIGATION_STOP_MM_48H, IRRIGATION_RAIN_WAIT_MM_48H, SOWING_STOP_MM_TODAY, SOWING_OK_MM_5D, DRY_BELOW_MM } from './rainVerdict.js'

// Farm-action rules for the /mausam ActionWindows (छिड़काव · सिंचाई · कटाई/सुखाई · बुवाई).
// Thresholds are deliberately explicit and commented so Shri A.K. Dixit can review
// them. Each rule returns { status: 'ok'|'caution'|'stop', reasonKey }. The reasonKey
// resolves to a bilingual one-liner in strings.js. No prediction — pure thresholds
// on the cached Open-Meteo forecast.
//
// Soil moisture is volumetric water content (m³/m³) for 0–7 cm: dry < 0.20, anything above is adequate or wet.
const SOIL_DRY = 0.20
const ET0_HIGH = 5 // mm/day — high evapotranspiration demand

// Batch 17B: every RAIN threshold now lives in rainVerdict.js (one verdict for the whole site and the morning post).
// What stays here is the soil / evaporation part of irrigation and the sowing arithmetic over the daily totals.
const rainNextDays = (daily, n) => (daily || []).slice(0, n).reduce((s, d) => s + (Number(d.precip_mm) || 0), 0)
const rainDay0 = (daily) => Number(daily?.[0]?.precip_mm) || 0
const soilNow = (hourly, daily) => {
  const h = (hourly || []).find((x) => x.soil_moisture != null)
  if (h) return Number(h.soil_moisture)
  return daily?.[0]?.soil_moisture != null ? Number(daily[0].soil_moisture) : null
}

// Same { status, reasonKey } shape as before. `daily` is optional (hours only is still enough for spraying).
export function sprayWindow(hourly, daily) {
  return rainVerdict({ hourly, daily }).spray
}

export function irrigationWindow(hourly, daily) {
  const v = rainVerdict({ hourly, daily })
  const rain48 = v.mm48h
  const soil = soilNow(hourly, daily)
  const et0 = Number(daily?.[0]?.et0) || 0
  if (rain48 >= IRRIGATION_STOP_MM_48H) return { status: 'stop', reasonKey: 'aw_irrig_stop' }
  const dry = soil != null && soil < SOIL_DRY
  const hotDry = et0 >= ET0_HIGH && rain48 < IRRIGATION_RAIN_WAIT_MM_48H && (soil == null || soil < SOIL_DRY)
  if (hotDry) return { status: 'ok', reasonKey: 'aw_irrig_ok' }
  // the soil is dry but rain is coming: wait for it (a real caution)
  if (dry && rain48 >= IRRIGATION_RAIN_WAIT_MM_48H) return { status: 'caution', reasonKey: 'aw_irrig_caution' }
  // moisture is adequate (or wet) and it is not hot-dry: nothing to do - green, not a warning
  return { status: 'ok', reasonKey: 'aw_irrig_none' }
}

export function harvestWindow(daily, hourly) {
  return rainVerdict({ hourly, daily }).harvest
}

export function sowingWindow(daily) {
  const rain5 = rainNextDays(daily, 5)
  const rain24 = rainDay0(daily)
  if (rain24 >= SOWING_STOP_MM_TODAY) return { status: 'stop', reasonKey: 'aw_sow_stop' }
  if (rain5 >= SOWING_OK_MM_5D[0] && rain5 <= SOWING_OK_MM_5D[1] && rain24 < SOWING_STOP_MM_TODAY) return { status: 'ok', reasonKey: 'aw_sow_ok' }
  return { status: 'caution', reasonKey: 'aw_sow_caution' }
}

export function actionWindows(hourly, daily) {
  const v = rainVerdict({ hourly, daily })
  return {
    spray: v.spray,
    irrigation: irrigationWindow(hourly, daily),
    harvest: v.harvest,
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
  if (mm >= DRY_BELOW_MM) return { level: 'green', color: '#16A34A' }
  return null
}

// Next rain event from the hourly series -> { inHours, mm, time } or null (no rain worth the name in 48h).
// Decided by rainVerdict: a few traces that add up to under 1 mm are not rain.
export function nextRain(hourly) {
  const v = rainVerdict({ hourly })
  if (v.nextRainInHours == null) return null
  return { inHours: v.nextRainInHours, mm: Math.round(v.nextRainMm), time: hourly[v.nextRainInHours]?.time }
}

export const STATUS_COLOR = {
  ok: { bg: 'var(--ks-green-tint)', fg: 'var(--ks-green-dark)' },
  caution: { bg: 'var(--ks-saffron-tint)', fg: 'var(--ks-orange-dark)' },
  stop: { bg: '#FDE2E2', fg: '#B4231F' },
}
