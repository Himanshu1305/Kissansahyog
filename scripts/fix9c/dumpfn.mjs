// Batch 9C — read-only: print current function definitions from STAGING.
import { stagingSql } from '../fix9b/stagingSql.mjs'
const names = process.argv.slice(2)
for (const n of names) {
  const rows = await stagingSql(`select p.oid::regprocedure::text sig, pg_get_functiondef(p.oid) def from pg_proc p join pg_namespace s on s.oid=p.pronamespace where s.nspname='public' and p.proname='${n}'`)
  for (const r of rows) console.log(`-- ===== ${r.sig}\n${r.def}\n`)
}
