// Batch 27: a sentence must never quote a deadline that has already passed.
// A "deadline" here is a date written inside a text and followed by a deadline word: "25 <month> <until>" or "25 <month> <before>"
// (the words live in strings.hi.js: S.deadlineWords). Ranges of past sowing dates ("sown between 1 and 6 November") are NOT deadlines.
// Three uses: (1) at run time an item whose text quotes a passed deadline is not used; (2) a test sweeps every data file and fails when an item
// can still be shown after the deadline in its own text; (3) a runway report says when a data file is about to run dry.
import { S } from '../strings.hi.js'
import { addDays, daysBetween } from './ist.js'

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const NUKTA = new RegExp(String.fromCharCode(0x93c), 'g') // the Devanagari nukta sign, written as a code so no Devanagari sits in this file
const norm = (s) => {
  let t = String(s).normalize('NFC').replace(NUKTA, '')
  for (const [from, to] of S.monthAliases) t = t.split(from.replace(NUKTA, '')).join(to.replace(NUKTA, ''))
  return t
}
const MONTHS = S.months.map((m) => norm(m))
const END = '(?![\\u0900-\\u097f])' // the deadline word must end there (not the start of a longer word)
const DEADLINE = new RegExp(`(\\d{1,2})\\s+(${MONTHS.map(esc).join('|')})\\s*(?:${S.deadlineWords.map((w) => esc(norm(w))).join('|')})${END}`, 'g')
const pad = (n) => String(n).padStart(2, '0')

// the year of a day+month written in a text, taken as the nearest one to refIso
function isoNear(day, month, refIso) {
  const y = Number(refIso.slice(0, 4)), m = Number(refIso.slice(5, 7))
  const year = month - m > 6 ? y - 1 : m - month > 6 ? y + 1 : y
  return `${year}-${pad(month)}-${pad(day)}`
}

// -> [{ raw, iso }] for every deadline date in `text`; refIso picks the year (use the day the text is shown, or its last day)
export function deadlineDates(text, refIso) {
  const out = []
  if (typeof text !== 'string') return out
  const t = norm(text)
  DEADLINE.lastIndex = 0
  let m
  while ((m = DEADLINE.exec(t))) out.push({ raw: m[0], iso: isoNear(Number(m[1]), MONTHS.indexOf(m[2]) + 1, refIso) })
  return out
}

// the deadlines in `text` that are already over on `todayIso`
export const staleDeadlines = (text, todayIso) => deadlineDates(text, todayIso).filter((d) => d.iso < todayIso)

// all the wording of one data item (text fields only: ids, sources, notes and approval stamps are not read)
const SKIP_KEYS = /^(id|_|basis|source|approved|reviewed|verified|kind|scope|from|to|date|show_|deadline|last_date|valid_|review_)/
export function itemText(it) {
  const parts = []
  const walk = (v, k) => {
    if (typeof v === 'string') { if (!SKIP_KEYS.test(k || '')) parts.push(v) }
    else if (Array.isArray(v)) v.forEach((x) => walk(x, k))
    else if (v && typeof v === 'object') for (const [kk, x] of Object.entries(v)) if (!SKIP_KEYS.test(kk)) walk(x, kk)
  }
  walk(it, '')
  return parts.join(' \n ')
}

// run-time check used by the pickers
export const hasStaleDeadline = (it, todayIso) => staleDeadlines(itemText(it), todayIso).length > 0
// approvals expire: an item with review_expires (YYYY-MM-DD) is not used after that day, however it was reviewed
export const approvalExpired = (it, todayIso) => !!(it && typeof it.review_expires === 'string' && it.review_expires < todayIso)

// The last day an item can be shown (calendar statics: to; schemes and money facts: show_until)
const lastShown = (it) => it.to || it.show_until || null

// ---------------------------------------------------------------------------------------------------------------------------------
// Data audit. -> { stale: [{ file, id, text, iso }], windowProblems: [...], runway: [{ file, lastDay, daysLeft }] }
// stale = items whose own text quotes a deadline that is over on `date` (the pickers already hold these back).
// windowProblems = items that can still be shown on a day after the deadline in their own text (a data bug to fix: shorten the window or fix the text).
export function auditData(data, date) {
  const groups = [
    ['crop-calendar.json', [...((data.cropCalendar && data.cropCalendar.static) || []), ...(data.cropCalendar && data.cropCalendar.rain_hold ? [data.cropCalendar.rain_hold] : [])]],
    ['scheme-calendar.json', data.schemes || []],
    ['events.json', data.events || []],
    ['money-facts.json', data.moneyFacts || []],
    ['gyaan.json', data.gyaan || []],
    ['tips.json', data.tips || []],
  ]
  const stale = [], windowProblems = []
  for (const [file, items] of groups) {
    for (const it of items) {
      const text = itemText(it)
      const start = it.from || it.show_from || null, end = lastShown(it)
      const showable = (!start || start <= date) && (!end || date <= end) // an item outside its own window cannot go out today, so there is nothing to warn about
      if (showable) for (const d of staleDeadlines(text, date)) stale.push({ file, id: it.id, text: d.raw, iso: d.iso })
      if (end) for (const d of deadlineDates(text, end)) if (d.iso < end) windowProblems.push({ file, id: it.id, text: d.raw, iso: d.iso, shownUntil: end })
    }
  }
  return { stale, windowProblems, runway: runway(data, date) }
}

// How many days of content each time-bound file still has. daysLeft counts from `date` to the last day it can show something.
export function runway(data, date) {
  const out = []
  const reviewed = (it) => it.reviewed === true || it.verified === true
  const cal = data.cropCalendar
  if (cal && cal.sowing_dates && Array.isArray(cal.stages) && cal.stages.length) {
    const maxDas = Math.max(...cal.stages.map((s) => s.das_to))
    const last = addDays(cal.sowing_dates.to, maxDas) // the last irrigation line is due this long after the last sowing date
    out.push({ file: 'crop-calendar.json (irrigation lines)', lastDay: last, daysLeft: daysBetween(date, last) })
  }
  const maxOf = (items, f) => items.filter(reviewed).map(f).filter(Boolean).sort().pop() || null
  const ev = maxOf(data.events || [], (e) => (e.scope === 'far' ? null : e.date_to || e.date))
  if (ev) out.push({ file: 'events.json', lastDay: ev, daysLeft: daysBetween(date, ev) })
  const sch = maxOf(data.schemes || [], (s) => s.deadline || s.show_until || null)
  if (sch) out.push({ file: 'scheme-calendar.json', lastDay: sch, daysLeft: daysBetween(date, sch) })
  const mf = maxOf(data.moneyFacts || [], (m) => m.show_until || null)
  if (mf) out.push({ file: 'money-facts.json', lastDay: mf, daysLeft: daysBetween(date, mf) })
  return out
}

export const RUNWAY_WARN_DAYS = 30
// -> plain English lines for the report and the GitHub summary (empty when everything is fine)
export function auditWarnings(audit) {
  const w = []
  for (const s of audit.stale) w.push(`WARNING freshness: ${s.file} item ${s.id} quotes "${s.text}" (${s.iso}), which is over; it is NOT used today. Fix or remove it.`)
  for (const p of audit.windowProblems) w.push(`WARNING data: ${p.file} item ${p.id} can still be shown after "${p.text}" (${p.iso}); its window ends ${p.shownUntil}. Shorten the window or fix the text.`)
  for (const r of audit.runway) if (r.daysLeft < RUNWAY_WARN_DAYS) w.push(`WARNING runway: ${r.file} has ${Math.max(r.daysLeft, 0)} day(s) left (last day ${r.lastDay}). Refill it.`)
  return w
}
