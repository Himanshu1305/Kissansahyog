// Batch 23 - run the price watchdog on fixture data and print what the job log / summary would say.
//   node scripts/batch23/watchdog-fixtures.mjs
import { watchdogCheck, annotations, summaryMarkdown } from '../lib/mandi-watchdog.mjs'
import { TRACKED_CROPS } from '../../src/lib/mandi/pickRule.js'

const M = ['Banda APMC', 'Bina APMC', 'Damoh APMC', 'Khurai APMC', 'Sagar APMC']
const full = (d) => TRACKED_CROPS.flatMap((c) => M.map((m) => ({ commodity_en: c, market: m, modal_price: 3000, price_date: d })))
const thin = (d) => ['Wheat', 'Maize'].map((c) => ({ commodity_en: c, market: 'Sagar APMC', modal_price: 2500, price_date: d }))
const NOW = Date.parse('2026-11-24T10:00:00Z') // Tuesday 24 Nov 2026, 15:30 IST (after the 14:00 IST grace)
const EARLY = Date.parse('2026-11-24T01:30:00Z') // 07:00 IST (inside the grace)
const hoursAgo = (h) => new Date(NOW - h * 3600000).toISOString()
const cases = [
  ['PASS: yesterday (Mon 23 Nov) full, written 2 hours ago', { rows: [...full('2026-11-23'), ...full('2026-11-22')], newestDate: '2026-11-23', newestFetchedAt: hoursAgo(2), today: '2026-11-24' }],
  ['FAIL: newest date too old (newest 22 Nov, yesterday is 23 Nov)', { rows: [...full('2026-11-21'), ...full('2026-11-22')], newestDate: '2026-11-22', newestFetchedAt: hoursAgo(2), today: '2026-11-24' }],
  ['FAIL: thin yesterday (Mon 23 Nov: 2 crops, 1 mandi)', { rows: [...thin('2026-11-23'), ...full('2026-11-21')], newestDate: '2026-11-23', newestFetchedAt: hoursAgo(2), today: '2026-11-24' }],
  ['WARNING: thin yesterday that was a Sunday (22 Nov), seen on Monday 23 Nov', { rows: [...thin('2026-11-22'), ...full('2026-11-21')], newestDate: '2026-11-22', newestFetchedAt: hoursAgo(2), today: '2026-11-23' }],
  ['FAIL: refresh job stalled (nothing written for 20 hours)', { rows: [...full('2026-11-23')], newestDate: '2026-11-23', newestFetchedAt: hoursAgo(20), today: '2026-11-24' }],
  ['WARNING (grace): newest date too old, but it is 07:00 IST (before 14:00 IST)', { rows: [...full('2026-11-21'), ...full('2026-11-22')], newestDate: '2026-11-22', newestFetchedAt: hoursAgo(2), today: '2026-11-24', early: true }],
  ['WARNING (grace): thin yesterday at 07:00 IST', { rows: [...thin('2026-11-23'), ...full('2026-11-21')], newestDate: '2026-11-23', newestFetchedAt: hoursAgo(2), today: '2026-11-24', early: true }],
  ['PASS with note: no fetched_at to read', { rows: [...full('2026-11-23')], newestDate: '2026-11-23', newestFetchedAt: null, today: '2026-11-24' }],
]
for (const [name, c] of cases) {
  const { early, ...rest } = c
  const r = watchdogCheck({ ...rest, nowMs: early ? EARLY : NOW })
  console.log(`\n##### ${name}\n${r.text}`)
  for (const a of annotations(r)) console.log(a)
  console.log(`exit code would be ${r.red ? 1 : 0}`)
  if (name.startsWith('FAIL: thin')) console.log('--- job summary ---\n' + summaryMarkdown(r))
}
