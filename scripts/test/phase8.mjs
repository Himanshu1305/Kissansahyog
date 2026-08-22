#!/usr/bin/env node
// Phase 8 checklist (static side) — PWA artifacts, manifest installability,
// self-healing SW config, and bundle budget. Assumes `npm run build` has run.
//   node scripts/test/phase8.mjs
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist')
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }

// Artifacts present
check('sw.js generated', existsSync(join(DIST, 'sw.js')))
check('manifest.webmanifest generated', existsSync(join(DIST, 'manifest.webmanifest')))
check('registerSW.js generated', existsSync(join(DIST, 'registerSW.js')))
for (const icon of ['icon-192.png', 'icon-512.png', 'maskable-512.png']) {
  check(`icon ${icon} present`, existsSync(join(DIST, 'icons', icon)))
}

// Manifest installability
const mf = JSON.parse(readFileSync(join(DIST, 'manifest.webmanifest'), 'utf8'))
check('manifest has name + short_name', !!mf.name && !!mf.short_name)
check('manifest display=standalone', mf.display === 'standalone')
check('manifest start_url set', !!mf.start_url)
const sizes = (mf.icons || []).map((i) => i.sizes)
check('manifest has 192 + 512 icons', sizes.includes('192x192') && sizes.includes('512x512'))
check('manifest has a maskable icon', (mf.icons || []).some((i) => (i.purpose || '').includes('maskable')))

// Self-healing / non-stale SW config
const sw = readFileSync(join(DIST, 'sw.js'), 'utf8')
check('SW skipWaiting enabled', /skipWaiting/.test(sw))
check('SW clientsClaim enabled', /clientsClaim/.test(sw))
check('SW cleanupOutdatedCaches enabled', /cleanupOutdatedCaches/.test(sw))
check('SW precaches the app shell (index.html)', /index\.html/.test(sw))

// Bundle budget — initial-load JS gzip should stay modest for low-end devices.
const assets = readdirSync(join(DIST, 'assets')).filter((f) => f.endsWith('.js'))
const gz = (f) => gzipSync(readFileSync(join(DIST, 'assets', f))).length
let initial = 0
for (const f of assets) {
  if (/react-vendor|supabase|^index-/.test(f)) initial += gz(f)
}
const initialKb = Math.round(initial / 1024)
check('initial JS gzip < 200 KB', initialKb < 200, `${initialKb} KB`)
// No single route chunk should be bloated (code-splitting working).
const routeChunks = assets.filter((f) => !/react-vendor|supabase|^index-/.test(f))
const biggest = Math.max(0, ...routeChunks.map((f) => gz(f)))
check('largest route chunk gzip < 20 KB (split correctly)', biggest < 20 * 1024, `${Math.round(biggest / 1024)} KB`)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
