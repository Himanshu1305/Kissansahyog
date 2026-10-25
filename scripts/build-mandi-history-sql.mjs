#!/usr/bin/env node
// Batch 15A - turns data/mandi-history/ceda-monthly-2016-2025.json into paste-ready, idempotent, pure-ASCII SQL:
//   docs/review/batch15a/history-prod/part-NN.sql   (begin; insert ... on conflict do nothing; commit;  <= 500 rows each)
//   docs/review/batch15a/history-prod/verify.sql    (read-only: counts and month range per commodity and scope)
//   docs/review/batch15a/PROD_MIGRATION_0069.sql    (copy of the migration, to paste first)
//   docs/review/batch15a/history-prod/expected-counts.json  (what verify.sql must show; used by DATA_CHECK.md and staging)
// The same files are applied to STAGING by scripts/batch15a/apply-staging.mjs. Production: the owner pastes them.
//   node scripts/build-mandi-history-sql.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, copyFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const doc = JSON.parse(readFileSync(new URL('data/mandi-history/ceda-monthly-2016-2025.json', root), 'utf8'))
const outDir = new URL('docs/review/batch15a/history-prod/', root)
mkdirSync(outDir, { recursive: true })
for (const f of readdirSync(outDir)) if (/^part-\d+\.sql$/.test(f)) unlinkSync(new URL(f, outDir))

const ascii = (s) => { if (!/^[\x00-\x7F]*$/.test(s)) throw new Error('non-ASCII: ' + s); return s }
const q = (s) => "'" + ascii(s).replace(/'/g, "''") + "'"

const rows = []
for (const [en, c] of Object.entries(doc.commodities)) {
  for (const [t, v] of Object.entries(c.sagar_division)) rows.push([en, 'sagar_division', t, v.price, v.districts_reporting])
  for (const [t, p] of Object.entries(c.mp)) rows.push([en, 'mp', t, p, null])
}
rows.sort((a, b) => (a[0] + a[1] + a[2] < b[0] + b[1] + b[2] ? -1 : 1))

const PER = 500
const parts = Math.ceil(rows.length / PER)
const counts = {}
for (const r of rows) { const k = `${r[0]}|${r[1]}`; (counts[k] ||= { n: 0, min: r[2], max: r[2] }); counts[k].n++; if (r[2] < counts[k].min) counts[k].min = r[2]; if (r[2] > counts[k].max) counts[k].max = r[2] }

for (let p = 0; p < parts; p++) {
  const chunk = rows.slice(p * PER, (p + 1) * PER)
  const values = chunk.map(([en, sc, t, price, n]) => `(${q(en)}, ${q(sc)}, '${t}-01', ${price}, ${n == null ? 'null' : n})`).join(',\n')
  const sql = `-- Batch 15A - monthly mandi price history, part ${p + 1} of ${parts} (${chunk.length} rows).
-- Source: Agmarknet / DMI data via the CEDA portal (Ashoka University), fetched ${doc.fetched_on}. Safe to run twice
-- (rows that already exist are skipped). Apply 0069 first (PROD_MIGRATION_0069.sql). Pure ASCII.
begin;
insert into public.mandi_monthly_history (commodity_en, scope, month, modal_price, districts_reporting)
values
${values}
on conflict (commodity_en, scope, month) do nothing;
commit;
`
  writeFileSync(new URL(`part-${String(p + 1).padStart(2, '0')}.sql`, outDir), ascii(sql))
}

writeFileSync(new URL('verify.sql', outDir), ascii(`-- Batch 15A - read-only check of the monthly history load. Compare with DATA_CHECK.md / expected-counts.json.
select commodity_en, scope, count(*) as months, min(month) as first_month, max(month) as last_month
from public.mandi_monthly_history
group by commodity_en, scope
order by commodity_en, scope;

select count(*) as total_rows from public.mandi_monthly_history;
`))
writeFileSync(new URL('expected-counts.json', outDir), JSON.stringify({ total: rows.length, parts, perCommodityScope: counts }, null, 1) + '\n')
copyFileSync(new URL('supabase/migrations/0069_mandi_monthly_history.sql', root), new URL('docs/review/batch15a/PROD_MIGRATION_0069.sql', root))
console.log(`rows ${rows.length}, parts ${parts}, groups ${Object.keys(counts).length}`)
