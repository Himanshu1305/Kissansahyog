// Mandi summary for "कल की मंडी". Reuses the site's own helpers (src/lib/mandi/basket.js etc.), so the headline
// price is the number /msp shows: the latest point of the 30-day stable-basket series of Sagar-division rows.
import { basketSeries } from '../../../src/lib/mandi/basket.js'
import { windowStart } from '../../../src/lib/mandi/mspWindow.js'
import { marketLabel } from '../../../src/lib/mandi/marketNames.js'
import { strings } from '../../../src/lib/i18n/strings.js'
import { CROPS } from '../../../src/content/crops.js'
import { addDays } from './ist.js'

export const WINDOW_DAYS = 30        // same window as the /msp default tab
export const MAX_CROPS = 4
export const MIN_MANDIS = 3
export const MAX_MOVE_PCT = 15       // bigger one-step move than this = suspect data
export const MEDIAN_BAND = [0.5, 2]  // price outside 0.5x..2x of the 30-day median = suspect data
export const FALLBACK_DAYS = 3

const ALWAYS = ['gehun', 'chana', 'masoor', 'sarson'] // the four rabi crops always eligible
const hiLabel = (k) => strings[k]?.hi
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2) }

// crops that may be shown on a date: the four rabi crops, plus crops whose harvest month is this or last month
export function eligibleCrops(date) {
  const month = Number(date.slice(5, 7)), prev = month === 1 ? 12 : month - 1
  return CROPS.filter((c) => ALWAYS.includes(c.slug) || c.harvest_months.includes(month) || c.harvest_months.includes(prev))
}

// rows: [{commodity_en, market, district, modal_price, price_date}] (Sagar division). -> { date, isYesterday } or null
export function chooseDate(rows, yesterday) {
  const have = new Set((rows || []).filter((r) => r.modal_price != null && Number(r.modal_price) > 0).map((r) => r.price_date))
  if (have.has(yesterday)) return { date: yesterday, isYesterday: true }
  for (let i = 1; i < FALLBACK_DAYS; i++) { const d = addDays(yesterday, -i); if (have.has(d)) return { date: d, isYesterday: false } }
  return null
}

// -> { shown: [...], extra: [...], suspect: [{crop, reason}], skipped: [{crop, reason}] }
export function summarize(rows, date, { maxCrops = MAX_CROPS } = {}) {
  const from = windowStart(WINDOW_DAYS, `${date}T12:00:00Z`)
  const shown = [], suspect = [], skipped = []
  for (const crop of eligibleCrops(date)) {
    const cr = (rows || []).filter((r) => r.commodity_en === crop.mandi_en && r.price_date >= from && r.price_date <= date)
    const onDay = cr.filter((r) => r.price_date === date && Number(r.modal_price) > 0)
    const markets = new Set(onDay.map((r) => r.market))
    if (markets.size < MIN_MANDIS) { skipped.push({ crop: crop.en, reason: `only ${markets.size} mandi(s) on ${date}` }); continue }
    const b = basketSeries(cr)
    const idx = b.series.findIndex((p) => p.date === date)
    if (idx < 0) { skipped.push({ crop: crop.en, reason: `no headline point for ${date} (day skipped by the basket rule)` }); continue }
    const price = b.series[idx].price, prev = idx > 0 ? b.series[idx - 1] : null
    const past = b.series.slice(0, idx).map((p) => p.price)
    if (prev) {
      const pct = Math.abs((price - prev.price) / prev.price) * 100
      if (pct > MAX_MOVE_PCT) { suspect.push({ crop: crop.en, reason: `moved ${pct.toFixed(1)}% vs ${prev.date} (limit ${MAX_MOVE_PCT}%)` }); continue }
    }
    if (past.length >= 3) {
      const med = median(past)
      if (price < MEDIAN_BAND[0] * med || price > MEDIAN_BAND[1] * med) { suspect.push({ crop: crop.en, reason: `price ${price} outside ${MEDIAN_BAND[0]}x-${MEDIAN_BAND[1]}x of 30-day median ${med}` }); continue }
    }
    const best = onDay.reduce((a, r) => (a == null || Number(r.modal_price) > Number(a.modal_price) ? r : a), null)
    shown.push({
      crop, name: crop.hi, price, nMandis: markets.size, date,
      prevDate: prev ? prev.date : null, delta: prev ? price - prev.price : null,
      best: best ? { market: marketLabel(best.market, best.district, hiLabel), price: Math.round(Number(best.modal_price)) } : null,
      series: b.series,
    })
  }
  shown.sort((a, b) => b.nMandis - a.nMandis || (a.crop.slug < b.crop.slug ? -1 : 1))
  return { shown: shown.slice(0, maxCrops), extra: shown.slice(maxCrops), suspect, skipped }
}

// largest absolute % move over the last 3 observed days among shown crops. -> { item, direction, pct } or null
export function trendHeadline(shown) {
  let top = null
  for (const it of shown) {
    const s = it.series
    if (!s || s.length < 3) continue
    const [p0, p1, p2] = s.slice(-3).map((p) => p.price)
    const pct = ((p2 - p0) / p0) * 100
    const direction = p2 > p0 && p1 >= p0 && p2 >= p1 ? 'up' : p2 < p0 && p1 <= p0 && p2 <= p1 ? 'down' : 'mixed'
    if (!top || Math.abs(pct) > Math.abs(top.pct)) top = { item: it, direction, pct }
  }
  return top
}

// the week's change (facts only): latest point vs the newest point at least 7 days older. null when there is none.
export function weekChange(item) {
  const cutoff = addDays(item.date, -7)
  const older = [...item.series].reverse().find((p) => p.date <= cutoff)
  return older ? item.price - older.price : null
}
