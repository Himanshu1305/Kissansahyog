// Batch 23 - the production price watchdog, as pure logic (no network, no clock, no environment). Tested in
// tests/unit/mandi-watchdog-23.test.mjs; used by scripts/refresh-data.mjs.
// It uses the WATCHDOG floor from src/lib/mandi/pickRule.js (3 mandis, 5 crops: it only has to catch breakage), not the stricter DISPLAY
// bar (7 crops) the site uses to choose which day to show.
//
// GRACE: checks 1 and 2 only give a ::warning:: while the run starts before 14:00 IST (the government feed may publish yesterday late);
// from 14:00 IST on they FAIL. Check 3 fails at any hour. The hour is computed in IST from nowMs, never from the runner's zone.
// RED (run fails) when:
//   1. no price rows at all, or the newest price date (IST) is older than yesterday IST (more than 1 day old);
//   2. yesterday IST (the last completed day) has fewer than MIN_MANDIS mandis or fewer than MIN_CROPS tracked crops;
//      a Sunday or a listed public holiday is softer: only a warning while at least 1 mandi and 1 crop reported;
//   3. nothing was written to mandi_prices (fetched_at) in the last 12 hours - the Edge Function cron runs every 3 hours.
//      Skipped (with a plain note) when the table has no fetched_at value to read.
import { WATCHDOG_MIN_MANDIS as MIN_MANDIS, WATCHDOG_MIN_CROPS as MIN_CROPS, PUBLIC_HOLIDAYS_IST, addDays, weekdayOf, coverageByDate } from '../../src/lib/mandi/pickRule.js'

export const STALL_HOURS = 12
export const GRACE_UNTIL_IST_HOUR = 14
export const istHour = (nowMs) => new Date(nowMs + 330 * 60000).getUTCHours()
const DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// rows: mandi_prices rows of at least the last 5 days up to today (commodity_en, market, modal_price, price_date);
// newestDate: the newest price_date in the whole table (or null); newestFetchedAt: ISO string or null; nowMs: Date.now().
export function watchdogCheck({ rows, newestDate, newestFetchedAt, today, nowMs, holidays = PUBLIC_HOLIDAYS_IST, skipStallCheck = false }) {
  const errors = [], warnings = [], notes = []
  const grace = istHour(nowMs) < GRACE_UNTIL_IST_HOUR // before 14:00 IST: checks 1 and 2 warn instead of failing
  const lateNote = grace ? ' (Warning only because it is before 14:00 IST; from 14:00 IST this fails.)' : ''
  const bad = (msg) => (grace ? warnings.push(msg + lateNote) : errors.push(msg))
  const yesterday = addDays(today, -1)
  const cov = coverageByDate(rows)
  const table = []
  for (let i = 0; i < 5; i++) { const d = addDays(today, -i); const c = cov[d] || { rows: 0, mandis: 0, crops: 0 }; table.push({ date: d, day: DN[weekdayOf(d)], ...c }) }

  // 1. newest date
  const newest = newestDate || Object.keys(cov).sort().pop() || null
  if (!newest) bad('No price rows are stored at all.')
  else if (newest < yesterday) bad(`The newest stored price is dated ${newest}, older than yesterday (${yesterday} IST). The price refresh has stopped.`)

  // 2. yesterday's coverage
  const y = cov[yesterday] || { rows: 0, mandis: 0, crops: 0 }
  const thin = y.mandis < MIN_MANDIS || y.crops < MIN_CROPS
  if (thin) {
    const soft = weekdayOf(yesterday) === 0 || holidays.includes(yesterday)
    const why = `${yesterday} (${DN[weekdayOf(yesterday)]}) has ${y.mandis} mandis and ${y.crops} of the 10 crops (needs ${MIN_MANDIS} mandis and ${MIN_CROPS} crops)`
    if (soft && y.mandis >= 1 && y.crops >= 1) warnings.push(`Thin day: ${why}. It was a ${weekdayOf(yesterday) === 0 ? 'Sunday' : 'listed holiday'}, so this is only a warning.`)
    else bad(`Thin day: ${why}.`)
  }

  // 3. is the refresh job itself alive?
  if (skipStallCheck || !newestFetchedAt) notes.push('Stall check skipped: no fetched_at value could be read.')
  else {
    const t = Date.parse(newestFetchedAt)
    if (Number.isNaN(t)) notes.push('Stall check skipped: fetched_at could not be read as a time.')
    else {
      const hours = (nowMs - t) / 3600000
      if (hours > STALL_HOURS) errors.push(`Nothing was written to the price table for ${hours.toFixed(1)} hours (limit ${STALL_HOURS}; the refresh runs every 3 hours). The Edge Function or its schedule may be stuck.`)
    }
  }

  const red = errors.length > 0
  const status = red ? 'FAIL' : warnings.length ? 'WARNING' : 'PASS'
  const text = `price watchdog: ${status}${newest ? ` (newest price ${newest}, yesterday ${yesterday}: ${y.rows} rows, ${y.mandis} mandis, ${y.crops} crops)` : ''}`
  return { red, status, errors, warnings, notes, table, text, yesterday, newest }
}

// GitHub annotation lines (the failure e-mail quotes ::error:: lines) and the markdown table for the job summary.
export function annotations(r) {
  return [...r.errors.map((e) => `::error::${e}`), ...r.warnings.map((w) => `::warning::${w}`), ...r.notes.map((n) => `::notice::${n}`)]
}
export function summaryMarkdown(r) {
  const lines = [`### Price watchdog: ${r.status}`, '', '| Date | Day | Rows | Mandis | Crops |', '|---|---|---|---|---|']
  for (const t of r.table) lines.push(`| ${t.date} | ${t.day} | ${t.rows} | ${t.mandis} | ${t.crops} |`)
  lines.push('', `Rule (a warning before 14:00 IST, a failure from 14:00 IST): yesterday IST needs at least ${MIN_MANDIS} mandis and ${MIN_CROPS} of the 10 crops (Sunday/holiday: a warning only while at least 1 reports); newest price no older than yesterday; something written in the last ${STALL_HOURS} hours.`)
  for (const e of r.errors) lines.push(`- **FAIL:** ${e}`)
  for (const w of r.warnings) lines.push(`- **Warning:** ${w}`)
  for (const n of r.notes) lines.push(`- Note: ${n}`)
  return lines.join('\n')
}
