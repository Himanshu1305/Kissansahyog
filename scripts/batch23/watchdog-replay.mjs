// Batch 23 - what the watchdog WOULD have said on each of the last 14 days, from real production rows (SELECT only, public anon key).
// Two runs per morning: 07:00 IST (inside the grace: checks 1 and 2 only warn) and 15:47 IST (after 14:00 IST: they fail). The data used is
// what is stored now, so it is "final" data: it cannot show a day that was still missing at 07:00. The "nothing written for 12 hours" check
// cannot be replayed (old write times are gone) and is left out.
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
console.log('Watchdog replay on production rows (SELECT only). Floor: yesterday needs 3 mandis + 5 crops. Stall check not replayable.\n')
console.log('morning        | yesterday (rows/mandis/crops) | 07:00 IST | 15:47 IST | why')
for (let n = DAYS; n >= 0; n--) {
  const today = addDays(todayNow, -n)
  const known = all.filter((r) => r.price_date < today)
  const newest = known.length ? known.map((r) => r.price_date).sort().pop() : null
  const at = (hhmmIst) => { const [h, m] = hhmmIst.split(':').map(Number); return Date.parse(`${today}T00:00:00Z`) + ((h * 60 + m) - 330) * 60000 }
  const run = (t) => watchdogCheck({ rows: known, newestDate: newest, newestFetchedAt: null, today, nowMs: at(t), skipStallCheck: true })
  const early = run('07:00'), late = run('15:47')
  const y = late.table.find((t) => t.date === late.yesterday) || { rows: 0, mandis: 0, crops: 0 }
  const why = [...late.errors, ...late.warnings].join(' ').replace(/ \(Warning only because[^)]*\)/g, '') || '-'
  console.log(`${today} ${late.table[0].day} | ${late.yesterday} ${String(y.rows).padStart(3)}/${String(y.mandis).padStart(2)}/${String(y.crops).padStart(2)}          | ${early.status.padEnd(9)} | ${late.status.padEnd(9)} | ${why}`)
}
