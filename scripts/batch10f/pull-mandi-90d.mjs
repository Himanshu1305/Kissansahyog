// Batch 10F 3C — READ-ONLY snapshot of the last ~95 days of Sagar-division mandi rows on STAGING
// (public Agmarknet prices; no personal data). Refuses unless .env points at staging.
//   node --env-file=.env scripts/batch10f/pull-mandi-90d.mjs <out.json>
import { writeFileSync } from 'node:fs'

const url = process.env.VITE_SUPABASE_URL || ''
if (!url.includes('wzxtqbqlahyahsnoqqva') || url.includes('eltmcznjcqiahqhjvpjg')) {
  console.error('REFUSED: not staging')
  process.exit(1)
}
const ref = new URL(url).host.split('.')[0]

async function runSql(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) throw new Error(`SQL failed (HTTP ${res.status})`)
  return res.json()
}

const out = process.argv[2]
if (!out) { console.error('usage: pull-mandi-90d.mjs <out.json>'); process.exit(1) }
// SELECT only.
const rows = await runSql(`select commodity_en c, market m, price_date::text d, modal_price::numeric p
  from mandi_prices where in_sagar_division and price_date >= current_date - 95 and modal_price is not null
  order by commodity_en, price_date, market`)
writeFileSync(out, JSON.stringify({ pulledAt: new Date().toISOString(), project: 'staging', rows: rows.map((r) => [r.c, r.m, r.d, Number(r.p)]) }))
console.log(`rows ${rows.length}`)
