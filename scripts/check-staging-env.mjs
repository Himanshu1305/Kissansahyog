#!/usr/bin/env node
// Staging build guard (Batch 8B) — the mirror of check-prod-env.mjs. Prints OK or an error,
// never a key or any env value.
//   node --env-file=.env scripts/check-staging-env.mjs          # before building
//   node --env-file=.env scripts/check-staging-env.mjs --dist   # after building: scan dist/
// Refuses (exit 1) unless VITE_SUPABASE_URL — both in the .env file and in the environment this
// process was started with — points at the STAGING project and not production; with --dist,
// refuses if the built files mention the production project anywhere.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname, relative } from 'node:path'

const PROD_REF = 'eltmcznjcqiahqhjvpjg'
const STAGING_REF = 'wzxtqbqlahyahsnoqqva'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const fail = (msg) => { console.error(`STAGING GUARD: REFUSED — ${msg}`); process.exit(1) }

function check(url, where) {
  if (!url) fail(`VITE_SUPABASE_URL is missing in ${where}`)
  if (url.includes(PROD_REF)) fail(`VITE_SUPABASE_URL in ${where} points at the PRODUCTION project`)
  if (!url.includes(STAGING_REF)) fail(`VITE_SUPABASE_URL in ${where} does not contain the staging project ref`)
}

const envFile = join(ROOT, '.env')
if (!existsSync(envFile)) fail('.env not found')
const line = readFileSync(envFile, 'utf8').split(/\r?\n/).map((l) => l.match(/^\s*(?:export\s+)?VITE_SUPABASE_URL\s*=\s*(.*?)\s*$/)).find(Boolean)
check(line?.[1].replace(/^(["'])(.*)\1$/, '$2'), '.env')
// Catches a staging build started with the wrong --env-file, or a shell exporting prod values.
check(process.env.VITE_SUPABASE_URL, 'the process environment (start with --env-file=.env)')

if (process.argv.includes('--dist')) {
  const DIST = join(ROOT, 'dist')
  if (!existsSync(join(DIST, 'index.html'))) fail('dist/index.html not found — build first')
  const TEXT = new Set(['.js', '.mjs', '.html', '.css', '.json', '.xml', '.txt', '.webmanifest', '.map', ''])
  const files = []
  const walk = (dir) => { for (const n of readdirSync(dir)) { const p = join(dir, n); statSync(p).isDirectory() ? walk(p) : TEXT.has(extname(n)) && files.push(p) } }
  walk(DIST)
  let stagingSeen = false
  const bad = []
  for (const f of files) {
    const text = readFileSync(f, 'utf8')
    if (text.includes(STAGING_REF)) stagingSeen = true
    if (text.includes(PROD_REF)) bad.push(relative(DIST, f))
  }
  if (bad.length) fail(`dist contains production references in: ${bad.slice(0, 10).join(', ')}${bad.length > 10 ? ` (+${bad.length - 10} more)` : ''}`)
  if (!stagingSeen) fail('dist does not reference the staging project anywhere — the client bundle was not built with .env')
  console.log(`STAGING GUARD: OK — dist (${files.length} files) points at staging, no production references`)
} else {
  console.log('STAGING GUARD: OK — .env and the process environment point at staging')
}
