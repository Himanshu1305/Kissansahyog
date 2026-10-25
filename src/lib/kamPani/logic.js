// Batch 15B - /fasal-salah/kam-pani: pure logic (no network, no React). Unit tested in tests/unit/kam-pani-15b.test.mjs.
// Past numbers only: nothing here predicts a price or promises a yield.
import { WATER, BANNERS, SAGAR_YIELD_Q, GRAM_UPSIDE_Q } from '../../content/kamPani.js'

export const MIN_TODAY_REPORTS = 3 // fewer than this many Sagar-mandi reports in 14 days -> no "today" price
export const TODAY_DAYS = 14

// Water level 0, 1, 2, 3 (3 = three or more) -> ordered list of { crop, text, keep, reviewed } from the WATER table.
export function recommendForWater(level) {
  const k = Math.min(3, Math.max(0, Math.trunc(Number(level)) || 0))
  return WATER[k].recs
}
export const waterTitle = (level) => WATER[Math.min(3, Math.max(0, Math.trunc(Number(level)) || 0))].title

// Rupees of sale per hectare, before costs: yield (quintal/ha) x price (Rs/quintal). null if either is missing.
export function incomeEstimate({ yieldQ, price }) {
  const y = Number(yieldQ), p = Number(price)
  if (!Number.isFinite(y) || !Number.isFinite(p) || y <= 0 || p <= 0) return null
  return Math.round(y * p)
}

// The lines shown on one crop card. avg5 = 5-year harvest average price, today = today's Sagar price (either may be null).
// -> { yieldQ, atAvg, atToday, upside: { lo, hi } | null }; yieldQ null (mustard, barley) -> no lines at all.
export function incomeLines({ cropId, avg5, today }) {
  const yieldQ = SAGAR_YIELD_Q[cropId] ?? null
  if (yieldQ == null) return { yieldQ: null, atAvg: null, atToday: null, upside: null }
  const upside = cropId === 'gram' && avg5
    ? { lo: incomeEstimate({ yieldQ: GRAM_UPSIDE_Q.min, price: avg5 }), hi: incomeEstimate({ yieldQ: GRAM_UPSIDE_Q.max, price: avg5 }) }
    : null
  return { yieldQ, atAvg: incomeEstimate({ yieldQ, price: avg5 }), atToday: incomeEstimate({ yieldQ, price: today }), upside }
}

// Whole-percent gap of today against a reference (sign kept: + = today is higher). null if either is missing.
export function gapPercent(today, reference) {
  const t = Number(today), r = Number(reference)
  if (!Number.isFinite(t) || !Number.isFinite(r) || t <= 0 || r <= 0) return null
  return Math.round(((t - r) / r) * 100)
}

// Banners expire by date: a stale claim can never show. now = Date | ISO string. validUntil is the last day it may show.
const dayOf = (now) => (now instanceof Date ? now : new Date(now)).toISOString().slice(0, 10)
const live = (b, now) => (dayOf(now) < b.validUntil ? b : null)
export const sowingBanner = (now = new Date()) => live(BANNERS.sowing, now)
export const rainBanner = (now = new Date()) => live(BANNERS.rain, now)

// ---- today's price from the last 14 days of Sagar-division rows [{ market, modal_price, price_date }] ---------------
const median = (a) => {
  const s = [...a].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2)
}
const normMarket = (m) => String(m || '').toLowerCase().replace(/\s+/g, '').replace(/apmc$/, '')
const prices = (rows) => rows.map((r) => Number(r.modal_price)).filter((n) => Number.isFinite(n) && n > 0)

// Median Modal price at the Sagar mandi over the rows given (the caller passes the last TODAY_DAYS days).
// -> { price, reports } or null when there are fewer than MIN_TODAY_REPORTS reports.
export function sagarToday(rows) {
  const p = prices((rows || []).filter((r) => normMarket(r.market) === 'sagar'))
  return p.length >= MIN_TODAY_REPORTS ? { price: median(p), reports: p.length } : null
}

// The three Sagar-division mandis with the highest 14-day median. A mandi needs at least 2 reports.
// -> [{ market, price }] highest first. The Sagar mandi itself is included when it ranks.
export function topMandis(rows, n = 3) {
  const by = {}
  for (const r of rows || []) { const v = Number(r.modal_price); if (r.market && Number.isFinite(v) && v > 0) (by[r.market] ||= []).push(v) }
  return Object.entries(by).filter(([, a]) => a.length >= 2).map(([market, a]) => ({ market, price: median(a) }))
    .sort((a, b) => b.price - a.price || (a.market < b.market ? -1 : 1)).slice(0, n)
}
