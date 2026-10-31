// Batch 17B - the ONE place that decides what the forecast says about rain.
// Pure: no React, no network. Imported by the site (/mausam, weatherRules, rainAlert) AND by scripts/morning (card, message,
// voice, tasks), so a rain statement can never differ between them. A weather provider is swapped in by passing a different
// `source` and feeding the same { hourly, daily } shape - no UI file has to change.
//
// Every threshold below is editable here and nowhere else. The founder confirms them with KVK Sagar (see
// docs/review/batch17b/DECISIONS.md).
import { istTimeMs, istParts } from './freshness.js'

// ---- how much rain is "rain" (mm in the window). The class edges follow IMD's daily-rainfall classes.
export const DRY_BELOW_MM = 1          // under 1 mm in the window is dry - a trace is not rain
export const LIGHT_MIN_MM = 2.5        // 1 to under 2.5 mm is drizzle; from 2.5 mm it is light rain
export const MODERATE_MIN_MM = 15.6    // IMD: moderate rain starts at 15.6 mm
export const HEAVY_MIN_MM = 64.5       // IMD: heavy rain starts at 64.5 mm
export const VERY_HEAVY_MIN_MM = 115.5 // IMD: very heavy rain starts at 115.5 mm (used by the Homepage rain strip)
export const EXTREME_MIN_MM = 204.5    // IMD: extremely heavy rain starts at 204.5 mm (used by the Homepage rain strip)
export const PROB_SHOWN_MIN_MM = 2.5   // a rain chance (%) is shown only when at least this much rain is expected
export const HOUR_RAIN_MM = 0.5        // an hour with at least this much counts as a rainy hour for "rain in N hours"
// ---- spraying
export const SPRAY_STOP_MM_6H = 2      // stop: this much rain (mm) or more in the next 6 hours
export const SPRAY_STOP_WIND_KMH = 15  // stop: wind over this (km/h) in the next 6 hours
export const SPRAY_CAUTION_MM_24H = 2.5 // caution: this much rain (mm) or more in the next 24 hours
export const SPRAY_CAUTION_WIND_KMH = 10 // caution: wind from this (km/h) up to the stop value
export const DAILY_ONLY_SPRAY_STOP_MM = 8 // only a day total is known: this much for the day means some 6 hours will be 2 mm or more
// ---- harvest / drying
export const HARVEST_STOP_MM_48H = 5   // stop: this much rain (mm) or more in the next 48 hours
export const HARVEST_CAUTION_MM_72H = 2.5 // caution: this much rain (mm) or more in the next 72 hours
// ---- irrigation and sowing (rain part only; soil and evaporation limits stay in weatherRules.js)
export const IRRIGATION_STOP_MM_48H = 10 // hold irrigation: this much rain (mm) or more in the next 48 hours
export const IRRIGATION_RAIN_WAIT_MM_48H = 2 // with rain this big or more coming, a dry field should wait
export const SOWING_STOP_MM_TODAY = 40 // wait: this much rain (mm) today
export const SOWING_OK_MM_5D = [10, 30] // sowing is fine when the next 5 days bring this much (min, max)

export const LEVELS = ['dry', 'drizzle', 'light', 'moderate', 'heavy']
const HOUR_MS = 3600000
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const round1 = (n) => Math.round(n * 10) / 10

// mm -> 'dry' | 'drizzle' | 'light' | 'moderate' | 'heavy'
export function classify(mm) {
  const m = num(mm)
  if (m < DRY_BELOW_MM) return 'dry'
  if (m < LIGHT_MIN_MM) return 'drizzle'
  if (m < MODERATE_MIN_MM) return 'light'
  if (m < HEAVY_MIN_MM) return 'moderate'
  return 'heavy'
}
export const levelIndex = (level) => LEVELS.indexOf(level)
// a rain chance may be shown only for light rain or more
export const showsProb = (mm) => num(mm) >= PROB_SHOWN_MIN_MM
export const isRain = (level) => levelIndex(level) >= 2 // light or more (drizzle is not "rain" for warnings)

// One calendar day of the daily series -> { level, mm, probPct (null unless worth showing) }
export function dayRain(d) {
  const mm = num(d && (d.precip_mm ?? d.rainMm ?? d.precipitation_sum))
  const raw = d && (d.precip_prob ?? d.rainProb ?? d.precipitation_probability_max)
  return { mm: round1(mm), level: classify(mm), probPct: showsProb(mm) && raw != null ? Math.round(Number(raw)) : null }
}

const sum = (a) => a.reduce((s, x) => s + x, 0)
const maxOf = (a) => (a.length ? Math.max(...a) : 0)

// Rain (mm) over the next `hours` hours: the hourly series first, then - when the series is shorter than the window - the
// rest of the window from the daily totals at that day's average hourly rate (never from hours already covered).
function windowMm(hourly, daily, hours) {
  const take = hourly.slice(0, hours)
  let mm = sum(take.map((h) => num(h.precip_mm)))
  let remaining = hours - take.length
  if (remaining > 0 && take.length) {
    let t = istTimeMs(take[take.length - 1].time) + HOUR_MS
    while (remaining > 0 && !Number.isNaN(t)) {
      const p = istParts(t)
      const use = Math.min(remaining, 24 - p.hour)
      const day = (daily || []).find((d) => d.date === p.date)
      mm += (day ? num(day.precip_mm) : 0) * use / 24
      remaining -= use; t += use * HOUR_MS
    }
  }
  return mm
}
const windowProb = (hours) => {
  const p = hours.map((h) => h.precip_prob).filter((x) => x != null && Number.isFinite(Number(x))).map(Number)
  return p.length ? Math.max(...p) : null
}

function makeWindow(mm, probRaw) {
  const level = classify(mm)
  return { mm: round1(mm), level, probPct: probRaw == null ? null : Math.round(probRaw), showProb: showsProb(mm) && probRaw != null }
}

// input: { hourly, daily, nowIso, source }
//   hourly: [{ time (IST text), precip_mm, precip_prob, wind_kmh }] - may be missing or empty (daily-only fallback)
//   daily:  [{ date, precip_mm, precip_prob, wind_max, weathercode, ... }] (the site/cache shape; the morning generator maps
//           its days to this shape with toDailyShape)
//   nowIso: when given, hours before the current hour (IST) are dropped, so earlier rain of the day is never counted
// -> see the fields below. `level` is the level for the rest of today; `windows.h48` / `windows.h72` are the longer looks.
export function rainVerdict({ hourly, daily, nowIso = null, source = 'cache' } = {}) {
  const dailyArr = Array.isArray(daily) ? daily.filter(Boolean) : []
  let hrs = Array.isArray(hourly) ? hourly.filter((h) => h && !Number.isNaN(istTimeMs(h.time))) : []
  const nowMs = nowIso ? Date.parse(nowIso) : NaN
  if (!Number.isNaN(nowMs)) {
    const hourStart = Math.floor((nowMs + 19800000) / HOUR_MS) * HOUR_MS - 19800000
    hrs = hrs.filter((h) => istTimeMs(h.time) >= hourStart)
  }
  const hasHourly = hrs.length >= 6
  const today = dailyArr[0] || null
  const todayTotal = today ? dayRain(today).mm : 0

  let w, mm6 = 0, mm24 = 0, wind6, nextRainInHours = null, nextRainMm = 0
  if (hasHourly) {
    const todayDate = !Number.isNaN(nowMs) ? istParts(nowMs).date : String(hrs[0].time).slice(0, 10)
    const rest = hrs.filter((h) => String(h.time).slice(0, 10) === todayDate)
    const mmRest = sum(rest.map((h) => num(h.precip_mm)))
    const mm48 = windowMm(hrs, dailyArr, 48)
    const mm72 = windowMm(hrs, dailyArr, 72)
    w = {
      today: makeWindow(mmRest, windowProb(rest)),
      h48: makeWindow(mm48, windowProb(hrs.slice(0, 48))),
      h72: makeWindow(mm72, windowProb(hrs.slice(0, 72))),
    }
    mm6 = sum(hrs.slice(0, 6).map((h) => num(h.precip_mm)))
    mm24 = windowMm(hrs, dailyArr, 24)
    wind6 = maxOf(hrs.slice(0, 6).map((h) => num(h.wind_kmh)))
    if (w.h48.level !== 'dry') {
      const i = hrs.slice(0, 48).findIndex((h) => num(h.precip_mm) >= HOUR_RAIN_MM)
      if (i >= 0) { nextRainInHours = i; nextRainMm = round1(sum(hrs.slice(i, i + 12).map((h) => num(h.precip_mm)))) }
    }
  } else {
    // daily only: the day total is the best look at "the rest of today"; timing inside the day is unknown
    const mm = (n) => sum(dailyArr.slice(0, n).map((d) => num(d.precip_mm)))
    const p = (n) => { const v = dailyArr.slice(0, n).map((d) => d.precip_prob).filter((x) => x != null).map(Number); return v.length ? Math.max(...v) : null }
    w = { today: makeWindow(mm(1), p(1)), h48: makeWindow(mm(2), p(2)), h72: makeWindow(mm(3), p(3)) }
    mm24 = mm(1)
    wind6 = today ? num(today.wind_max) : 0
  }

  // spraying - stop / caution / ok
  let spray
  if (hasHourly ? mm6 >= SPRAY_STOP_MM_6H : mm24 >= DAILY_ONLY_SPRAY_STOP_MM) spray = { status: 'stop', reasonKey: 'aw_spray_stop_rain' }
  else if (wind6 > SPRAY_STOP_WIND_KMH) spray = { status: 'stop', reasonKey: 'aw_spray_stop_wind' }
  else if (mm24 >= SPRAY_CAUTION_MM_24H || (wind6 >= SPRAY_CAUTION_WIND_KMH && wind6 <= SPRAY_STOP_WIND_KMH)) spray = { status: 'caution', reasonKey: mm24 >= SPRAY_CAUTION_MM_24H ? 'aw_spray_caution_rain' : 'aw_spray_caution_wind' }
  else spray = { status: 'ok', reasonKey: 'aw_spray_ok' }

  // harvest / drying
  let harvest
  if (w.h48.mm >= HARVEST_STOP_MM_48H) harvest = { status: 'stop', reasonKey: 'aw_harvest_stop' }
  else if (w.h72.mm >= HARVEST_CAUTION_MM_72H) harvest = { status: 'caution', reasonKey: 'aw_harvest_caution' }
  else harvest = { status: 'ok', reasonKey: 'aw_harvest_ok' }

  return {
    source,
    hasHourly,
    level: w.today.level,
    mmRestOfToday: w.today.mm,
    mm48h: w.h48.mm,
    mm72h: w.h72.mm,
    probPct: w.today.probPct,
    showProb: w.today.showProb,
    nextRainInHours,
    nextRainMm,
    todayTotalMm: round1(todayTotal),
    todayTotalLevel: classify(todayTotal),
    windows: w,
    mm6h: round1(mm6),
    mm24h: round1(mm24),
    windKmh6h: round1(wind6),
    spray,
    harvest,
    days: dailyArr.slice(0, 3).map(dayRain),
  }
}

// The morning generator keeps days as { date, rainMm, rainProb, windMax, code }; the verdict reads the cache/site shape.
export const toDailyShape = (days) => (days || []).map((d) => ({ date: d.date, precip_mm: d.rainMm ?? 0, precip_prob: d.rainProb ?? null, wind_max: d.windMax ?? null, weathercode: d.code ?? null, tmax: d.tmax, tmin: d.tmin }))

// Rain-related text the pages and the morning post can say about a verdict, as keys (the callers own the words):
//   'none'      - nothing worth saying (dry, nothing earlier today)
//   'none_more' - dry from now, but rain already fell earlier today (the day total is drizzle or more)
//   'drizzle'   - only a drizzle is possible in the next 48 hours
//   'rain'      - light rain or more is expected within 48 hours (nextRainInHours / nextRainMm say when and how much)
export function bannerKind(v) {
  const l48 = v.windows.h48.level
  if (l48 === 'dry') return levelIndex(v.todayTotalLevel) >= 1 ? 'none_more' : 'none'
  if (l48 === 'drizzle') return 'drizzle'
  return 'rain'
}
