// Batch 23 - the production price watchdog, as pure logic (no network, no clock, no environment). Tested in
// tests/unit/mandi-watchdog-23.test.mjs; used by scripts/refresh-data.mjs.
// It uses the SAME constants as the site (src/lib/mandi/pickRule.js): MIN_MANDIS, MIN_CROPS and the tracked-crop list.
//
// RED (run fails) when:
//   1. no price rows at all, or the newest price date (IST) is older than yesterday IST (more than 1 day old);
//   2. yesterday IST (the last completed day) has fewer than MIN_MANDIS mandis or fewer than MIN_CROPS tracked crops;
//      a Sunday or a listed public holiday is softer: only a warning while at least 1 mandi and 1 crop reported;
//   3. nothing was written to mandi_prices (fetched_at) in the last 12 hours - the Edge Function cron runs every 3 hours.
//      Skipped (with a plain note) when the table has no fetched_at value to read.
import { MIN_MANDIS, MIN_CROPS, PUBLIC_HOLIDAYS_IST, addDays, weekdayOf, coverageByDate } from '../../src/lib/mandi/pickRule.js'

export const STALL_HOURS = 12
const DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// rows: mandi_prices rows of at least the last 5 days up to today (commodity_en, market, modal_price, price_date);
// newestDate: the newest price_date in the whole table (or null); newestFetchedAt: ISO string or null; nowMs: Date.now().
export function watchdogCheck({ rows, newestDate, newestFetchedAt, today, nowMs, holidays = PUBLIC_HOLIDAYS_IST, skipStallCheck = false }) {
  const errors = [], warnings = [], notes = []
  const yesterday = addDays(today, -1)
  const cov = coverageByDate(rows)
  const table = []
  for (let i = 0; i < 5; i++) { const d = addDays(today, -i); const c = cov[d] || { rows: 0, mandis: 0, crops: 0 }; table.push({ date: d, day: DN[weekdayOf(d)], ...c }) }

  // 1. newest date
  const newest = newestDate || Object.keys(cov).sort().pop() || null
  if (!newest) errors.push('No price rows are stored at all.')
  else if (newest < yesterday) errors.push(`The newest stored price is dated ${newest}, older than yesterday (${yesterday} IST). The price refresh has stopped.`)

  // 2. yesterday's coverage
  const y = cov[yesterday] || { rows: 0, mandis: 0, crops: 0 }
  const thin = y.mandis < MIN_MANDIS || y.crops < MIN_CROPS
  if (thin) {
    const soft = weekdayOf(yesterday) === 0 || holidays.includes(yesterday)
    const why = `${yesterday} (${DN[weekdayOf(yesterday)]}) has ${y.mandis} mandis and ${y.crops} of the 10 crops (needs ${MIN_MANDIS} mandis and ${MIN_CROPS} crops)`
    if (soft && y.mandis >= 1 && y.crops >= 1) warnings.push(`Thin day: ${why}. It was a ${weekdayOf(yesterday) === 0 ? 'Sunday' : 'listed holiday'}, so this is only a warning.`)
    else errors.push(`Thin day: ${why}.`)
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
  lines.push('', `Rule: yesterday IST needs at least ${MIN_MANDIS} mandis and ${MIN_CROPS} of the 10 crops (Sunday/holiday: a warning only while at least 1 reports); newest price no older than yesterday; something written in the last ${STALL_HOURS} hours.`)
  for (const e of r.errors) lines.push(`- **FAIL:** ${e}`)
  for (const w of r.warnings) lines.push(`- **Warning:** ${w}`)
  for (const n of r.notes) lines.push(`- Note: ${n}`)
  return lines.join('\n')
}
