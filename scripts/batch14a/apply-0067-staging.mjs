#!/usr/bin/env node
// Batch 14A - apply migration 0067 to STAGING (twice, to prove it is idempotent) and prove no pre-existing function changed.
//   node --env-file=.env scripts/check-staging-env.mjs && node --env-file=.env scripts/batch14a/apply-0067-staging.mjs [out.txt]
import { readFileSync, writeFileSync } from 'node:fs'
import { runSql } from '../lib/mgmt-sql.mjs'

const out = process.argv[2]
const lines = []
const say = (s) => { lines.push(s); console.log(s) }
const sql = readFileSync(new URL('../../supabase/migrations/0067_admin_console.sql', import.meta.url), 'utf8')
const catalog = async () => runSql(`select p.oid::regprocedure::text sig, md5(pg_get_functiondef(p.oid)) h from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' order by 1`)
const flags = async () => (await runSql(`select key, value::text v from public.site_settings where key in ('otp_required','session_enforced') order by 1`)).map((r) => `${r.key}=${r.v}`)

const own = new Set([...sql.matchAll(/create or replace function public\.(\w+)/g)].map((m) => m[1]))
const mine = (sig) => own.has(sig.replace(/\(.*$/, '').replace(/^public\./, ''))
// Only functions that 0067 does NOT define are compared (on a re-run 0067's own functions are legitimately re-created).
const before = (await catalog()).filter((r) => !mine(r.sig))
const flagsBefore = await flags()
say(`flags before: ${flagsBefore.join(', ')} ; public functions before: ${before.length}`)
let t = Date.now()
await runSql(sql)
say(`applied 0067 in ${Date.now() - t} ms`)
t = Date.now()
await runSql(sql)
say(`re-applied (idempotent) in ${Date.now() - t} ms`)
const after = (await catalog()).filter((r) => !mine(r.sig))
const afterMap = new Map(after.map((r) => [r.sig, r.h]))
const changed = before.filter((r) => afterMap.get(r.sig) !== r.h)
say(`pre-existing functions: ${before.length}; missing or changed after: ${changed.length}${changed.length ? ' -> ' + changed.map((r) => r.sig).join(', ') : ''}`)
say(`functions defined by 0067: ${[...own].length}: ${[...own].join(', ')}`)
const flagsAfter = await flags()
say(`flags after: ${flagsAfter.join(', ')} ; unchanged = ${JSON.stringify(flagsBefore) === JSON.stringify(flagsAfter)}`)
if (out) writeFileSync(out, lines.join('\n') + '\n')
if (changed.length || JSON.stringify(flagsBefore) !== JSON.stringify(flagsAfter)) process.exit(1)
