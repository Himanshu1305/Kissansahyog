#!/usr/bin/env node
// Kisan Sahyog — migration runner.
// Applies supabase/migrations/*.sql to the remote project via the Supabase
// Management API (POST /database/query). Uses SUPABASE_ACCESS_TOKEN — never the
// DB password. Tracks applied files in a schema_migrations table (idempotent).
//
// Usage (Node 20.6+ for --env-file):
//   node --env-file=.env scripts/db.mjs migrate        # apply pending migrations
//   node --env-file=.env scripts/db.mjs status         # list applied vs pending
//   node --env-file=.env scripts/db.mjs query "SQL"    # run ad-hoc SQL (tests)
//   node --env-file=.env scripts/db.mjs reset          # DROP public schema objects (DANGER, dev only)

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(HERE, '..', 'supabase', 'migrations')

const token = process.env.SUPABASE_ACCESS_TOKEN
const url = process.env.VITE_SUPABASE_URL
if (!token) throw new Error('SUPABASE_ACCESS_TOKEN missing in env (.env)')
if (!url) throw new Error('VITE_SUPABASE_URL missing in env (.env)')

const ref = new URL(url).host.split('.')[0]
const API = `https://api.supabase.com/v1/projects/${ref}/database/query`

export async function runSql(sql) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`SQL failed (HTTP ${res.status}): ${text}`)
  }
  return text ? JSON.parse(text) : null
}

function migrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
}

async function ensureTracker() {
  await runSql(
    `create table if not exists public.schema_migrations (
       version text primary key,
       applied_at timestamptz not null default now()
     );`,
  )
}

async function appliedVersions() {
  const rows = await runSql('select version from public.schema_migrations;')
  return new Set((rows || []).map((r) => r.version))
}

async function migrate() {
  await ensureTracker()
  const done = await appliedVersions()
  const files = migrationFiles()
  let applied = 0
  for (const file of files) {
    if (done.has(file)) {
      console.log(`= skip   ${file} (already applied)`)
      continue
    }
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    process.stdout.write(`> apply  ${file} ... `)
    await runSql(sql)
    await runSql(
      `insert into public.schema_migrations (version) values ('${file}')
       on conflict (version) do nothing;`,
    )
    console.log('ok')
    applied++
  }
  console.log(`\nDone. ${applied} migration(s) applied, ${files.length - applied} already present.`)
}

async function status() {
  await ensureTracker()
  const done = await appliedVersions()
  for (const file of migrationFiles()) {
    console.log(`${done.has(file) ? '[x]' : '[ ]'} ${file}`)
  }
}

async function reset() {
  // Dev-only: wipe the public schema so migrations can be re-applied to a fresh DB.
  console.log('DROPPING and recreating schema public (dev reset) ...')
  await runSql('drop schema if exists public cascade; create schema public;')
  await runSql('grant usage on schema public to anon, authenticated, service_role;')
  await runSql('grant all on schema public to postgres, service_role;')
  console.log('Schema reset. Run `migrate` next.')
}

const cmd = process.argv[2]
try {
  if (cmd === 'migrate') await migrate()
  else if (cmd === 'status') await status()
  else if (cmd === 'reset') await reset()
  else if (cmd === 'query') {
    const out = await runSql(process.argv[3])
    console.log(JSON.stringify(out, null, 2))
  } else {
    console.log('Usage: db.mjs <migrate|status|query "SQL"|reset>')
    process.exit(1)
  }
} catch (err) {
  console.error('\nERROR:', err.message)
  process.exit(1)
}
