#!/usr/bin/env node
// Production build guard. Prints OK or an error — never a key or any env value.
//   node --env-file=.env.production scripts/check-prod-env.mjs          # before building / migrating
//   node --env-file=.env.production scripts/check-prod-env.mjs --dist   # after building: scan dist/
// Refuses (exit 1) unless VITE_SUPABASE_URL — both in the .env.production file and in the
// environment this process was started with — points at the production project and not staging.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname, relative } from 'node:path'

const PROD_REF = 'eltmcznjcqiahqhjvpjg'
const STAGING_REF = 'wzxtqbqlahyahsnoqqva'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const fail = (msg) => { console.error(`PROD GUARD: REFUSED — ${msg}`); process.exit(1) }

function check(url, where) {
  if (!url) fail(`VITE_SUPABASE_URL is missing in ${where}`)
  if (url.includes(STAGING_REF)) fail(`VITE_SUPABASE_URL in ${where} points at the STAGING project`)
  if (!url.includes(PROD_REF)) fail(`VITE_SUPABASE_URL in ${where} does not contain the production project ref`)
}

const envFile = join(ROOT, '.env.production')
if (!existsSync(envFile)) fail('.env.production not found')
const line = readFileSync(envFile, 'utf8').split(/\r?\n/).map((l) => l.match(/^\s*(?:export\s+)?VITE_SUPABASE_URL\s*=\s*(.*?)\s*$/)).find(Boolean)
check(line?.[1].replace(/^(["'])(.*)\1$/, '$2'), '.env.production')
// Catches a prod script started with the wrong --env-file (or a shell that exports staging values).
check(process.env.VITE_SUPABASE_URL, 'the process environment (start with --env-file=.env.production)')

// Batch 10E (photos): dist/_headers lists BOTH Supabase storage hosts in the CSP img-src (staging
// and production share that file), so listing photos can display. Those two exact host tokens on
// the Content-Security-Policy line are the only project mentions allowed there; they are removed
// before the scan. Any other mention of either ref, in any file, still refuses.
const CSP_PROJECT_HOSTS = /https:\/\/(?:eltmcznjcqiahqhjvpjg|wzxtqbqlahyahsnoqqva)\.supabase\.co(?=[\s;]|$)/g
const stripCspProjectHosts = (text) => text.split(/(\r?\n)/).map((l) => /^\s*Content-Security-Policy:/i.test(l) ? l.replace(CSP_PROJECT_HOSTS, '') : l).join('')

if (process.argv.includes('--dist')) {
  const DIST = join(ROOT, 'dist')
  if (!existsSync(join(DIST, 'index.html'))) fail('dist/index.html not found — build first')
  const TEXT = new Set(['.js', '.mjs', '.html', '.css', '.json', '.xml', '.txt', '.webmanifest', '.map', ''])
  const files = []
  const walk = (dir) => { for (const n of readdirSync(dir)) { const p = join(dir, n); statSync(p).isDirectory() ? walk(p) : TEXT.has(extname(n)) && files.push(p) } }
  walk(DIST)
  let prodSeen = false
  const bad = []
  const STAGING_HOST = 'staging.kissansahyog.com'
  const HEADERS_FILE = join(DIST, '_headers')
  for (const f of files) {
    const raw = readFileSync(f, 'utf8')
    const text = f === join(DIST, '_headers') ? stripCspProjectHosts(raw) : raw
    if (text.includes(PROD_REF)) prodSeen = true
    // The one allowed mention of the staging host: the start of a host rule in dist/_headers
    // (the rule that noindexes staging). Anywhere else — and the staging ref everywhere — refuses.
    const hostScan = f === HEADERS_FILE ? text.split(/\r?\n/).map((l) => l.startsWith(`https://${STAGING_HOST}/`) ? l.slice(`https://${STAGING_HOST}/`.length) : l).join('\n') : text
    if (text.includes(STAGING_REF) || hostScan.includes(STAGING_HOST)) bad.push(relative(DIST, f))
  }
  if (bad.length) fail(`dist contains staging references in: ${bad.slice(0, 10).join(', ')}${bad.length > 10 ? ` (+${bad.length - 10} more)` : ''}`)
  if (!prodSeen) fail('dist does not reference the production project anywhere — the client bundle was not built with .env.production')
  const robots = existsSync(join(DIST, 'robots.txt')) ? readFileSync(join(DIST, 'robots.txt'), 'utf8') : ''
  if (/^\s*Disallow:\s*\/\s*$/m.test(robots)) fail('dist/robots.txt blocks the whole site (Disallow: /)')
  const headers = existsSync(join(DIST, '_headers')) ? readFileSync(join(DIST, '_headers'), 'utf8') : ''
  // _headers may noindex staging and *.pages.dev hosts, but never a path rule (applies to every host)
  // or a rule naming the production domain.
  let rule = null
  for (const l of headers.split(/\r?\n/)) {
    if (!l.trim() || l.trim().startsWith('#')) continue
    if (!/^\s/.test(l)) { rule = l.trim(); continue }
    if (!/x-robots-tag:.*noindex/i.test(l)) continue
    const host = rule?.match(/^https:\/\/([^/]+)/)?.[1]
    if (!host || /^(www\.)?kissansahyog\.com$/i.test(host) || /^[:*]/.test(host) && !host.endsWith('.pages.dev')) fail(`dist/_headers would noindex production (rule: ${rule})`)
  }
  console.log(`PROD GUARD: OK — dist (${files.length} files) points at production, no staging references, indexable`)
} else {
  console.log('PROD GUARD: OK — .env.production and the process environment point at production')
}
