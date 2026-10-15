#!/usr/bin/env node
// Batch 9B — apply ONE SQL file to STAGING (never production; the helper refuses other projects).
//   node --env-file=.env scripts/fix9b/apply-staging.mjs supabase/migrations/0061_....sql
//   node --env-file=.env scripts/fix9b/apply-staging.mjs supabase/migrations/rollback/0061_..._rollback.sql
// A migration is recorded in public.schema_migrations (the db.mjs tracker); a rollback removes that
// record. `db.mjs migrate` is NOT used: it would re-run 0056-0060 (applied by hand, untracked).
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { stagingSql } from './stagingSql.mjs'

const file = process.argv[2]
if (!file || !file.endsWith('.sql')) { console.error('usage: apply-staging.mjs <file.sql>'); process.exit(2) }
const name = basename(file)
const isRollback = name.endsWith('_rollback.sql')
await stagingSql(readFileSync(file, 'utf8'))
await stagingSql("notify pgrst, 'reload schema';")
if (isRollback) {
  const version = name.replace('_rollback.sql', '.sql')
  await stagingSql(`delete from public.schema_migrations where version = '${version.replace(/'/g, "''")}';`)
} else {
  await stagingSql(`insert into public.schema_migrations (version) values ('${name.replace(/'/g, "''")}') on conflict (version) do nothing;`)
}
console.log(`staging: applied ${name}${isRollback ? ' (rollback)' : ''}`)
