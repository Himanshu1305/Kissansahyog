// Batch 23 - replay the shared date + mandi rule on REAL production rows. SELECT only, public anon key.
//   node scripts/batch23/replay-pick.mjs [--days 14] [--env .env.production]
// For each of the last N days D it pretends "now" is 07:00 IST the NEXT morning (D+1) and prints the date and label the rule
// chooses and, per crop, the mandi and price from BOTH code paths:
//   homepage = tickerRows() over every row of the chosen day   |   /msp = resolvePrices() (the all-crops table)
// Any difference prints MISMATCH (there must be none).
import { readFileSync } from 'node:fs'
import { istToday, addDays, resolvePrices, weekdayOf, TRACKED_CROPS, coverageByDate, isDecent } from '../../src/lib/mandi/pickRule.js'
import { tickerRows } from '../../src/lib/mandi/tickerRows.js'

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d }
const DAYS = Number(arg('--days', 14))
const envFile = arg('--env', '.env.production')
const TH = arg('--min-crops') ? { minCrops: Number(arg('--min-crops')) } : {} // what-if only; the site uses MIN_CROPS from pickRule.js
const env = Object.fromEntries(readFileSync(envFile, 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim()] }))
const url = env.VITE_SUPABASE_URL, key = env.VITE_SUPABASE_ANON_KEY
if (!url || !key) { console.error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing in', envFile); process.exit(1) }

const todayNow = istToday()
const from = addDays(todayNow, -(DAYS + 9))
const all = []
for (let off = 0; off < 30000; off += 1000) {
  const r = await fetch(`${url}/rest/v1/mandi_prices?select=commodity_en,commodity_hi,market,district,modal_price,price_date,in_sagar_division&price_date=gte.${from}&order=price_date.desc,commodity_en.asc,market.asc`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${off}-${off + 999}` } })
  if (!r.ok) { console.error('read failed', r.status, await r.text()); process.exit(1) }
  const b = await r.json(); all.push(...b); if (b.length < 1000) break
}
const rows = all.map((r) => ({ ...r, is_local: r.in_sagar_division === true }))
const DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
console.log(`Replay of the shared rule on production rows (SELECT only). ${rows.length} rows from ${from} to ${todayNow}. Target ${url.replace(/^https:\/\//, '').split('.')[0]}.`)
if (TH.minCrops) console.log(`WHAT-IF run: MIN_CROPS = ${TH.minCrops} (the site uses the value in pickRule.js)`)
console.log('Rule: date = newest day (IST) in the last 7 with >= 3 mandis AND >= 5 of the 10 crops; mandi = Sagar division first, then larger arrivals, then lowest name.\n')
let mismatches = 0
for (let n = DAYS; n >= 1; n--) {
  const D = addDays(todayNow, -n)            // the data day
  const now = addDays(D, 1)                  // "07:00 IST the next morning"
  const known = rows.filter((r) => r.price_date <= D) // what was stored by then
  const res = resolvePrices(known, now, TH)
  const cov = coverageByDate(known)[D] || { rows: 0, mandis: 0, crops: 0 }
  const label = res.date ? (res.kind === 'today' ? 'आज का भाव' : res.kind === 'yesterday' ? `कल का भाव (${res.date.slice(8)}/${res.date.slice(5, 7)})` : `पिछला भाव (${res.date.slice(8)}/${res.date.slice(5, 7)})`) : 'none'
  console.log(`=== morning of ${now} (${DN[weekdayOf(now)]}); newest data day ${D} (${DN[weekdayOf(D)]}): ${cov.rows} rows, ${cov.mandis} mandis, ${cov.crops} crops, ${isDecent(cov, TH) ? 'decent' : 'THIN'}`)
  console.log(`    chosen date ${res.date} (${res.date ? DN[weekdayOf(res.date)] : '-'}) | label: ${label}${res.stale ? ' | STALE (no decent day in 7)' : ''}`)
  const dayRows = known.filter((r) => r.price_date === res.date)
  const strip = new Map(tickerRows(dayRows, 50).map((r) => [r.commodity_en, r]))
  for (const crop of TRACKED_CROPS) {
    const m = res.items.find((i) => i.crop === crop)
    const s = strip.get(crop)
    const msp = m ? `${m.row.market}=${m.row.modal_price}${m.fallback ? ` (own date ${m.date})` : ''}` : '-'
    const home = s && m && !m.fallback ? `${s.market}=${s.modal_price}` : (m && m.fallback ? msp : '-')
    const bad = home !== msp
    if (bad) mismatches++
    console.log(`    ${crop.padEnd(20)} homepage: ${home.padEnd(34)} /msp: ${msp}${bad ? '   MISMATCH' : ''}`)
  }
}
console.log(`\nMISMATCH count: ${mismatches}`)
process.exitCode = mismatches ? 1 : 0
