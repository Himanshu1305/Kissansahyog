// Batch 23 - ONE rule for "which date" and "which mandi" for every mandi price the site shows
// (homepage strip, homepage price tile, /msp snapshot, /msp crop page, the daily watchdog).
// Pure: no React, no network, no Node-only imports, so the app, the tests and scripts/ can all import it.
// Plain-words description: docs/review/batch23/DECISIONS.md.
import { CROPS } from '../../content/crops.js'

// TWO different pairs of numbers live here on purpose:
//  1. DISPLAY coverage (MIN_MANDIS / MIN_CROPS): decides WHICH DAY the strip and /msp show. A day only counts when enough mandis AND
//     at least 7 of the 10 tracked crops reported, so a thin Sunday (5-6 crops) is skipped and Monday shows Saturday.
//     MIN_MANDIS is also the number the morning post uses per crop (scripts/morning/lib/mandi.js).
//  2. WATCHDOG floor (WATCHDOG_MIN_MANDIS / WATCHDOG_MIN_CROPS): the GitHub job only has to catch BREAKAGE (a feed that has stopped or
//     is nearly empty), not choose a nice day, so its bar is lower: 3 mandis and 5 crops.
export const MIN_MANDIS = 3
export const MIN_CROPS = 7
export const WATCHDOG_MIN_MANDIS = 3
export const WATCHDOG_MIN_CROPS = 5
// How far back we look for a decent day (days before today IST, inclusive).
export const LOOKBACK_DAYS = 7
// The six districts of Sagar Division (a row also counts when the database flag in_sagar_division / is_local is true).
export const SAGAR_DIVISION_DISTRICTS = ['Sagar', 'Damoh', 'Tikamgarh', 'Chhatarpur', 'Panna', 'Niwari']
// Public holidays (IST dates, 'YYYY-MM-DD') on which a thin day is only a warning in the watchdog.
// Empty on purpose: the founder fills this in, e.g. ['2027-01-26'].
export const PUBLIC_HOLIDAYS_IST = []
// The 10 tracked crops, as mandi_prices.commodity_en (single source: src/content/crops.js).
export const TRACKED_CROPS = CROPS.map((c) => c.mandi_en)
const TRACKED = new Set(TRACKED_CROPS)

// ---- dates (always India time) ----------------------------------------------------------------
const IST_FMT = typeof Intl !== 'undefined' ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }) : null
// Today's calendar date in India as YYYY-MM-DD. Between 00:00 and 05:30 IST the UTC date is still yesterday: this fixes that.
export function istToday(now = new Date()) {
  const t = now instanceof Date ? now : new Date(now)
  if (IST_FMT) return IST_FMT.format(t)
  return new Date(t.getTime() + 330 * 60000).toISOString().slice(0, 10)
}
export const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10)
export const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000)
export const weekdayOf = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay() // 0 = Sunday

// 'today' | 'yesterday' | 'older' (IST calendar days); null for a missing/invalid date. A future date counts as today.
export function dayKind(date, today = istToday()) {
  const d = String(date || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null
  const n = daysBetween(d, today)
  if (n <= 0) return 'today'
  return n === 1 ? 'yesterday' : 'older'
}

// ---- which date -------------------------------------------------------------------------------
const hasPrice = (r) => r && r.modal_price != null && Number(r.modal_price) > 0
const valid = (r) => hasPrice(r) && r.price_date

// { 'YYYY-MM-DD': { rows, mandis, crops } } counting distinct mandis and distinct TRACKED crops with a real price.
export function coverageByDate(rows) {
  const by = {}
  for (const r of rows || []) {
    if (!valid(r)) continue
    const d = String(r.price_date).slice(0, 10)
    const c = (by[d] ||= { rows: 0, m: new Set(), c: new Set() })
    c.rows++
    c.m.add(r.market)
    if (TRACKED.has(r.commodity_en)) c.c.add(r.commodity_en)
  }
  const out = {}
  for (const [d, c] of Object.entries(by)) out[d] = { rows: c.rows, mandis: c.m.size, crops: c.c.size }
  return out
}
// th lets a test or a replay try other thresholds; the site always uses the defaults above.
export const isDecent = (cov, th = {}) => !!cov && cov.mandis >= (th.minMandis ?? MIN_MANDIS) && cov.crops >= (th.minCrops ?? MIN_CROPS)

// The date to show: the newest date up to today IST (looking back LOOKBACK_DAYS) with decent coverage.
// None decent -> the newest date with any rows, flagged stale. No rows at all -> null.
// -> { date, kind: 'today'|'yesterday'|'older', stale, mandis, crops } | null
export function chooseDisplayDate(rows, today = istToday(), th = {}) {
  const cov = coverageByDate(rows)
  const from = addDays(today, -LOOKBACK_DAYS)
  const dates = Object.keys(cov).filter((d) => d <= today).sort().reverse()
  const decent = dates.find((d) => d >= from && isDecent(cov[d], th))
  const date = decent || dates[0]
  if (!date) return null
  return { date, kind: dayKind(date, today), stale: !decent, mandis: cov[date].mandis, crops: cov[date].crops }
}

// ---- which mandi ------------------------------------------------------------------------------
// One crop on one date, one row, always the same row for the same data (any input order). The steps, in order:
//   a  the mandi nearest the visitor's device location - NOT used for the strip or /msp today (no such logic exists there; the
//      /msp nearest-mandi ranking only orders the long table), so this step never fires;
//   b  the Sagar town mandi ("Sagar APMC", the repo's own notion from the old strip pick: normMarket === 'sagar'), if it reported the crop;
//   c  else the MEDIAN-priced mandi among the Sagar-division mandis that reported it (even count: the lower middle price;
//      several mandis at that price: the lowest name);
//   d  else (no Sagar-division mandi reported it) the median-priced mandi among all that reported, same tie rules.
// arrivals_tonnes is not used (it is empty in production).
export const isDivisionRow = (r) => r.is_local === true || r.in_sagar_division === true
  || SAGAR_DIVISION_DISTRICTS.some((d) => d.toLowerCase() === String(r.district || '').trim().toLowerCase())
const nameOf = (r) => String(r.market ?? '')
const normName = (m) => String(m || '').toLowerCase().replace(/\s+/g, '').replace(/apmc$/, '')
const byName = (a, b) => { const x = nameOf(a), y = nameOf(b); return x < y ? -1 : x > y ? 1 : 0 }
function medianRow(list) {
  const sorted = [...list].sort((a, b) => Number(a.modal_price) - Number(b.modal_price) || byName(a, b))
  const price = Number(sorted[Math.floor((sorted.length - 1) / 2)].modal_price) // even count: the lower of the two middle prices
  return sorted.filter((r) => Number(r.modal_price) === price).sort(byName)[0]
}
// rows: rows of ONE crop on ONE date -> { row, step: 'b' | 'c' | 'd' } or null.
export function pickMandiStep(rows) {
  const ok = (rows || []).filter(hasPrice)
  if (!ok.length) return null
  const town = ok.filter((r) => normName(r.market) === 'sagar').sort(byName)[0]
  if (town) return { row: town, step: 'b' }
  const division = ok.filter(isDivisionRow)
  if (division.length) return { row: medianRow(division), step: 'c' }
  return { row: medianRow(ok), step: 'd' }
}
export const pickMandi = (rows) => pickMandiStep(rows)?.row || null

// ---- the whole choice -------------------------------------------------------------------------
// rows: price rows (any order, any dates, with commodity_en, market, district, modal_price, price_date, optional is_local/arrivals_tonnes).
// -> { date, kind, stale, mandis, crops, items: [{ crop, row, step, date, fallback }], missing: [crop] } ; date null when there are no rows.
// Every tracked crop with a price on the chosen date gets that day's picked mandi. A crop with none on that day gets
// its OWN latest earlier price (with its own date, fallback: true) when the rows hold one, never the other crops' date.
export function resolvePrices(rows, today = istToday(), th = {}) {
  const upTo = (rows || []).filter((r) => valid(r) && String(r.price_date).slice(0, 10) <= today)
  const ch = chooseDisplayDate(upTo, today, th)
  if (!ch) return { date: null, kind: null, stale: true, mandis: 0, crops: 0, items: [], missing: [...TRACKED_CROPS] }
  const items = [], missing = []
  for (const crop of TRACKED_CROPS) {
    const mine = upTo.filter((r) => r.commodity_en === crop)
    const onDay = mine.filter((r) => String(r.price_date).slice(0, 10) === ch.date)
    if (onDay.length) { items.push({ crop, ...pickMandiStep(onDay), date: ch.date, fallback: false }); continue }
    const earlier = mine.map((r) => String(r.price_date).slice(0, 10)).filter((d) => d < ch.date).sort().pop()
    if (earlier) items.push({ crop, ...pickMandiStep(mine.filter((r) => String(r.price_date).slice(0, 10) === earlier)), date: earlier, fallback: true })
    else missing.push(crop)
  }
  return { ...ch, items, missing }
}

// What the watchdog needs about a single day (counts only real prices).
export const coverageOn = (rows, date) => coverageByDate(rows)[date] || { rows: 0, mandis: 0, crops: 0 }
