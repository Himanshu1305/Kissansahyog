// Batch 23 - what the new watchdog WOULD have said on each of the last 14 days, from real production rows (SELECT only, public anon key).
// Pretends it ran at 07:00 IST the morning after each data day. The "nothing written for 12 hours" check cannot be replayed (the old
// write times are gone), so it is left out here and listed as such.
//   node scripts/batch23/watchdog-replay.mjs [--days 14]
import { readFileSync } from 'node:fs'
import { watchdogCheck } from '../lib/mandi-watchdog.mjs'
import { istToday, addDays } from '../../src/lib/mandi/pickRule.js'

const i = process.argv.indexOf('--days'); const DAYS = i > -1 ? Number(process.argv[i + 1]) : 14
const env = Object.fromEntries(readFileSync('.env.production', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => { const k = l.indexOf('='); return [l.slice(0, k), l.slice(k + 1).trim()] }))
const url = env.VITE_SUPABASE_URL, key = env.VITE_SUPABASE_ANON_KEY
const todayNow = istToday(), from = addDays(todayNow, -(DAYS + 8))
const all = []
for (let off = 0; off < 30000; off += 1000) {
  const r = await fetch(`${url}/rest/v1/mandi_prices?select=commodity_en,market,modal_price,price_date&price_date=gte.${from}&order=price_date.desc,commodity_en.asc,market.asc`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${off}-${off + 999}` } })
  if (!r.ok) { console.error('read failed', r.status); process.exit(1) }
  const b = await r.json(); all.push(...b); if (b.length < 1000) break
}
console.log(`Watchdog replay on production rows (SELECT only): "run at 07:00 IST on the morning shown". Stall check (fetched_at) not replayable.\n`)
console.log('morning       | yesterday (rows/mandis/crops)      | result  | why')
for (let n = DAYS; n >= 0; n--) {
  const today = addDays(todayNow, -n)
  const known = all.filter((r) => r.price_date < today) // what was stored by 07:00 IST that morning (data for "today" not yet complete)
  const newest = known.length ? known.map((r) => r.price_date).sort().pop() : null
  const r = watchdogCheck({ rows: known, newestDate: newest, newestFetchedAt: null, today, nowMs: Date.parse(`${today}T01:30:00Z`), skipStallCheck: true })
  const y = r.table.find((t) => t.date === r.yesterday) || { rows: 0, mandis: 0, crops: 0 }
  const why = [...r.errors, ...r.warnings].join(' ') || '-'
  console.log(`${today} ${r.table[0].day} | ${r.yesterday} ${String(y.rows).padStart(3)}/${String(y.mandis).padStart(2)}/${String(y.crops).padStart(2)} ${' '.repeat(10)}| ${r.status.padEnd(7)} | ${why}`)
}
