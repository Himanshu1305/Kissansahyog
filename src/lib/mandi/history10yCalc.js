// Batch 15A — ten years of MONTHLY Modal prices (table mandi_monthly_history, migration 0069).
// PURE functions only (no network, no React): unit tested in tests/unit/mandi-history10y.test.mjs. The read is in history10y.js.
// Shared with Batch 15B (low-water crops). Past averages only: nothing here predicts a price.
//
// Row shape used everywhere: { month: 'YYYY-MM', price, n }  (n = districts that reported; null for scope mp),
// oldest first. A month that has no data is simply absent: it is never filled in or interpolated.

export const MIN_DIVISION_MONTHS = 60 // fewer months than this for the Sagar division -> fall back to Madhya Pradesh
export const MIN_YEARS = 3 // a month / a harvest average needs at least this many of the 5 years

const ym = (m) => ({ y: Number(m.slice(0, 4)), m: Number(m.slice(5, 7)) })
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length

// DB rows [{month:'2024-03-01', modal_price, districts_reporting}] -> [{month:'2024-03', price, n}] oldest first
export function normalizeRows(raw) {
  return (raw || [])
    .filter((r) => r && r.month && r.modal_price != null && Number(r.modal_price) > 0)
    .map((r) => ({ month: String(r.month).slice(0, 7), price: Number(r.modal_price), n: r.districts_reporting ?? null }))
    .sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0))
}

// Division series if it has enough months, otherwise the Madhya Pradesh one. -> { rows, scope: 'sagar_division'|'mp'|null }
export function pickScope(divisionRows, mpRows, min = MIN_DIVISION_MONTHS) {
  if (divisionRows && divisionRows.length >= min) return { rows: divisionRows, scope: 'sagar_division' }
  if (mpRows && mpRows.length) return { rows: mpRows, scope: 'mp' }
  return { rows: [], scope: null }
}

// The year the window ends in: the year of the newest month in the data (a partly filled year is allowed;
// a calendar month with data in fewer than MIN_YEARS of the window years is left out below).
export function latestYear(rows) {
  return rows && rows.length ? ym(rows[rows.length - 1].month).y : null
}
export const latestMonth = (rows) => (rows && rows.length ? rows[rows.length - 1].month : null)

const windowRows = (rows, years, endYear) => {
  const end = endYear ?? latestYear(rows)
  if (end == null) return { end: null, rows: [] }
  return { end, rows: rows.filter((r) => { const { y } = ym(r.month); return y > end - years && y <= end }) }
}

// 12 values (index 0 = January): average Modal price of that calendar month across the last `years` years that
// have data. null for a month with data in fewer than MIN_YEARS of those years (never invented).
export function monthOfYearAverages(rows, { years = 5, endYear } = {}) {
  const { rows: w } = windowRows(rows, years, endYear)
  const by = Array.from({ length: 12 }, () => [])
  for (const r of w) by[ym(r.month).m - 1].push(r.price)
  return by.map((a) => (a.length >= MIN_YEARS ? Math.round(mean(a)) : null))
}

// Per-year value over the given calendar months (1-12): the mean of the harvest months that have data that year.
// -> [{ year, price }] oldest first; a year with no data in those months is left out (a gap is not filled).
export function harvestByYear(rows, months, { years = 5, endYear } = {}) {
  const { end, rows: w } = windowRows(rows, years, endYear)
  if (end == null) return []
  const want = new Set(months)
  const by = {}
  for (const r of w) { const { y, m } = ym(r.month); if (want.has(m)) (by[y] ||= []).push(r.price) }
  return Object.keys(by).map(Number).sort((a, b) => a - b).map((year) => ({ year, price: Math.round(mean(by[year])) }))
}

// Average of the yearly harvest values -> { avg, years } or null when fewer than MIN_YEARS years have data.
export function harvestAverage(rows, months, opts = {}) {
  const by = harvestByYear(rows, months, opts)
  if (by.length < MIN_YEARS) return null
  return { avg: Math.round(mean(by.map((b) => b.price))), years: by.length }
}

// Whole-percent difference of today's price against an average (+ = today is higher). null if either is missing.
export function gapVsAverage(today, avg) {
  const t = Number(today), a = Number(avg)
  if (!Number.isFinite(t) || !Number.isFinite(a) || t <= 0 || a <= 0) return null
  return Math.round(((t - a) / a) * 100)
}
