// Batch 10E — the /msp trend windows (7 / 30 / 90 days) described by the REAL data they hold:
// first and last date that actually have a price, how many days, and a short date range
// ("11–18 अक्टू", "19 सित – 18 अक्टू"). Pure: no React, no network (tests/unit/msp-window.test.mjs).
// Month names come from content/months.js (the audit-sanctioned label file).
import { MONTHS_HI, MONTHS_SHORT_EN } from '../../content/months.js'

const DAY_MS = 86400000
const parse = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''))
  return m ? { y: Number(m[1]), mo: Number(m[2]) - 1, d: Number(m[3]) } : null
}
const isoOf = (date) => date.toISOString().slice(0, 10)

// First calendar day of an N-day window ending today (UTC, same as the history query's
// `price_date >= today − N days`).
export function windowStart(days, today = new Date()) {
  const t = today instanceof Date ? today : new Date(today)
  return isoOf(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) - days * DAY_MS))
}

// The part of an ascending [{date, price}] series that falls inside the N-day window.
export function sliceWindow(series, days, today = new Date()) {
  const from = windowStart(days, today)
  return (series || []).filter((d) => d.date >= from)
}

const monthName = (mo, lang) => (lang === 'en' ? MONTHS_SHORT_EN : MONTHS_HI)[mo]

// "11–18 अक्टू" (same month), "19 सित – 18 अक्टू" (two months), "18 अक्टू" (one day).
// The year is added only when the range crosses a year, or is not in the current year.
export function formatRange(firstIso, lastIso, lang = 'hi', today = new Date()) {
  const a = parse(firstIso), b = parse(lastIso || firstIso)
  if (!a || !b) return ''
  const thisYear = (today instanceof Date ? today : new Date(today)).getUTCFullYear()
  const crossYear = a.y !== b.y
  const showYear = crossYear || b.y !== thisYear
  const day = (p, withYear) => `${p.d} ${monthName(p.mo, lang)}${withYear ? ` ${p.y}` : ''}`
  if (firstIso === lastIso || !lastIso) return day(a, showYear)
  if (!crossYear && a.mo === b.mo) return `${a.d}–${b.d} ${monthName(b.mo, lang)}${showYear ? ` ${b.y}` : ''}`
  return `${day(a, crossYear)} – ${day(b, showYear)}`
}

// One day, short: "18 अक्टू" / "18 Oct" (year only when not the current year).
export function formatDay(iso, lang = 'hi', today = new Date()) {
  return formatRange(iso, iso, lang, today)
}

// Everything the tab, the sentence and the notes need for one window.
//   n          — days that have a price inside the window
//   first/last — first and last such date (null when n = 0)
//   range      — formatRange(first, last) ('' when n = 0)
//   thin       — fewer priced days than calendar days requested (show "N दिन का भाव")
//   startsLate — the first price is more than a week after the window start: older prices
//                do not exist, so the label must not suggest the full period
export function windowInfo(series, days, lang = 'hi', today = new Date()) {
  const s = sliceWindow(series, days, today)
  const n = s.length
  const first = n ? s[0].date : null
  const last = n ? s[n - 1].date : null
  const start = windowStart(days, today)
  const lateBy = first ? Math.round((Date.parse(first) - Date.parse(start)) / DAY_MS) : null
  return {
    days,
    n,
    first,
    last,
    series: s,
    range: n ? formatRange(first, last, lang, today) : '',
    thin: n < days,
    startsLate: n > 0 && lateBy > 7,
  }
}
