#!/usr/bin/env node
// Batch 15A - apply migration 0069 and the history load parts to STAGING (twice, to prove both are idempotent),
// run verify.sql, compare with expected-counts.json, prove the anon key can read but not write, and prove nothing else
// changed (the two auth switches, mandi_prices row count, every other public table).
//   node --env-file=.env scripts/check-staging-env.mjs && node --env-file=.env scripts/batch15a/apply-staging.mjs [out.txt]
// Never touches production (scripts/lib/mgmt-sql.mjs refuses any project but staging).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { runSql } from '../lib/mgmt-sql.mjs'

const out = process.argv[2]
const lines = []
const say = (s) => { lines.push(s); console.log(s) }
let bad = 0
const check = (name, ok, detail = '') => { if (!ok) bad++; say(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` (${detail})` : ''}`) }

const url = process.env.VITE_SUPABASE_URL
const anon = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !anon) throw new Error('run with node --env-file=.env')
const dir = new URL('../../docs/review/batch15a/history-prod/', import.meta.url)
const mig = readFileSync(new URL('../../supabase/migrations/0069_mandi_monthly_history.sql', import.meta.url), 'utf8')
const parts = readdirSync(dir).filter((f) => /^part-\d+\.sql$/.test(f)).sort()
const expected = JSON.parse(readFileSync(new URL('expected-counts.json', dir), 'utf8'))
const verify = readFileSync(new URL('verify.sql', dir), 'utf8').split(';').map((s) => s.trim()).filter(Boolean)

const flags = async () => (await runSql(`select key, value::text v from public.site_settings where key in ('otp_required','session_enforced') order by 1`)).map((r) => `${r.key}=${r.v}`)
const tables = async () => (await runSql(`select table_name t from information_schema.tables where table_schema='public' and table_name <> 'mandi_monthly_history' order by 1`)).map((r) => r.t)
const funcs = async () => (await runSql(`select p.oid::regprocedure::text sig, md5(pg_get_functiondef(p.oid)) h from pg_proc p where p.pronamespace='public'::regnamespace and p.prokind='f' order by 1`))
const mandiCount = async () => Number((await runSql('select count(*)::int c from public.mandi_prices'))[0].c)

const flagsBefore = await flags(), tablesBefore = await tables(), funcsBefore = await funcs(), mandiBefore = await mandiCount()
say(`flags before: ${flagsBefore.join(', ')} ; public tables (other than the new one): ${tablesBefore.length} ; functions: ${funcsBefore.length} ; mandi_prices rows: ${mandiBefore}`)

for (const round of [1, 2]) {
  let t = Date.now()
  await runSql(mig)
  say(`round ${round}: migration 0069 applied in ${Date.now() - t} ms`)
  t = Date.now()
  for (const f of parts) await runSql(readFileSync(new URL(f, dir), 'utf8'))
  say(`round ${round}: ${parts.length} parts applied in ${Date.now() - t} ms`)
  const total = Number((await runSql('select count(*)::int c from public.mandi_monthly_history'))[0].c)
  check(`round ${round}: total rows = ${expected.total}`, total === expected.total, `got ${total}`)
}

const grouped = await runSql(verify[0])
const total = await runSql(verify[1])
check('verify.sql total_rows matches', Number(total[0].total_rows) === expected.total, String(total[0].total_rows))
let mism = 0
for (const g of grouped) {
  const e = expected.perCommodityScope[`${g.commodity_en}|${g.scope}`]
  const ok = e && Number(g.months) === e.n && String(g.first_month).slice(0, 7) === e.min && String(g.last_month).slice(0, 7) === e.max
  if (!ok) { mism++; say(`  MISMATCH ${g.commodity_en} ${g.scope}: db ${g.months} ${g.first_month}..${g.last_month} vs expected ${e ? `${e.n} ${e.min}..${e.max}` : 'none'}`) }
}
check(`verify.sql groups (${grouped.length}) match expected counts and month ranges`, mism === 0 && grouped.length === Object.keys(expected.perCommodityScope).length)
say('per commodity and scope (months): ' + grouped.map((g) => `${g.commodity_en}/${g.scope}=${g.months}`).join(', '))

// the anon key (what the browser has) can read, and cannot write
const h = { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' }
const r1 = await fetch(`${url}/rest/v1/mandi_monthly_history?select=commodity_en,scope,month,modal_price&commodity_en=eq.Gram&scope=eq.sagar_division&order=month.desc&limit=1`, { headers: h })
const j1 = await r1.json()
check('anon select works', r1.ok && Array.isArray(j1) && j1.length === 1, `HTTP ${r1.status} ${JSON.stringify(j1).slice(0, 80)}`)
const w = await fetch(`${url}/rest/v1/mandi_monthly_history`, { method: 'POST', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify({ commodity_en: 'Test', scope: 'mp', month: '2000-01-01', modal_price: 1 }) })
check('anon insert is refused', w.status === 401 || w.status === 403, `HTTP ${w.status}`)
const d = await fetch(`${url}/rest/v1/mandi_monthly_history?commodity_en=eq.Gram`, { method: 'DELETE', headers: h })
check('anon delete is refused', d.status === 401 || d.status === 403, `HTTP ${d.status}`)
const u = await fetch(`${url}/rest/v1/mandi_monthly_history?commodity_en=eq.Gram`, { method: 'PATCH', headers: h, body: JSON.stringify({ modal_price: 1 }) })
check('anon update is refused', u.status === 401 || u.status === 403, `HTTP ${u.status}`)
check('row check constraint: modal_price > 0', await runSql("insert into public.mandi_monthly_history values ('Test','mp','2000-01-01',0,null)").then(() => false, () => true))
const stillThere = Number((await runSql("select count(*)::int c from public.mandi_monthly_history where commodity_en = 'Test'"))[0].c)
check('no test row was left behind', stillThere === 0)

// nothing else changed
const flagsAfter = await flags(), tablesAfter = await tables(), funcsAfter = await funcs(), mandiAfter = await mandiCount()
check('auth switches unchanged', JSON.stringify(flagsBefore) === JSON.stringify(flagsAfter), flagsAfter.join(', '))
say(`note: these are STAGING's own values, found like this and left alone (production runs otp_required=true, session_enforced=false; this script never sets a switch)`)
check('every other public table still there (none added, none dropped)', JSON.stringify(tablesBefore) === JSON.stringify(tablesAfter))
check('every function identical (none created, altered or dropped)', JSON.stringify(funcsBefore) === JSON.stringify(funcsAfter))
check('mandi_prices untouched (same row count)', mandiBefore === mandiAfter, `${mandiBefore} -> ${mandiAfter}`)
say(bad ? `RESULT: ${bad} FAILED` : 'RESULT: all passed')
if (out) writeFileSync(out, lines.join('\n') + '\n')
if (bad) process.exit(1)
