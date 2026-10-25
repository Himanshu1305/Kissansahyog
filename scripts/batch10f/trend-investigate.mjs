// Batch 10F 3C — offline analysis of the staging snapshot (no network).
//   node scripts/batch10f/trend-investigate.mjs <snapshot.json> <today YYYY-MM-DD> [crop] [days]
import { readFileSync } from 'node:fs'
import { medianByDate } from '../../src/lib/mandi/history.js'
import { basketSeries } from '../../src/lib/mandi/basket.js'
import { windowStart } from '../../src/lib/mandi/mspWindow.js'

const [file, todayIso, cropArg, daysArg] = process.argv.slice(2)
const snap = JSON.parse(readFileSync(file, 'utf8'))
const today = new Date(`${todayIso}T06:00:00Z`)
const crops = cropArg ? [cropArg] : [...new Set(snap.rows.map((r) => r[0]))]
const days = daysArg ? [Number(daysArg)] : [7, 30, 90]

for (const crop of crops) {
  const rows = snap.rows.filter((r) => r[0] === crop).map(([, market, price_date, modal_price]) => ({ market, price_date, modal_price }))
  for (const d of days) {
    const from = windowStart(d, today)
    const w = rows.filter((r) => r.price_date >= from)
    const old = medianByDate(w)
    const res = basketSeries(w)
    const nByDay = {}
    for (const r of w) (nByDay[r.price_date] ||= new Set()).add(r.market)
    const fmt = (s) => (s.length ? `${s[0].date} ₹${s[0].price} → ${s[s.length - 1].date} ₹${s[s.length - 1].price} (Δ ${s[s.length - 1].price - s[0].price}, ${s.length} pts)` : 'none')
    console.log(`\n== ${crop} ${d}d  markets ${new Set(w.map((r) => r.market)).size}, basket ${res.basket.length}${res.few ? ' (FEW → plain median)' : ''}, priced days ${old.length}, skipped ${res.skipped.length}`)
    console.log(`  OLD   ${fmt(old)}`)
    console.log(`  NEW   ${fmt(res.series)}`)
    if (process.env.DETAIL) {
      const nb = Object.fromEntries(res.series.map((p) => [p.date, p]))
      for (const p of old) console.log(`   ${p.date} n=${String(nByDay[p.date].size).padStart(2)} old ₹${p.price}  new ${nb[p.date] ? `₹${nb[p.date].price} (basket ${nb[p.date].n})` : 'SKIPPED'}`)
    }
  }
}
