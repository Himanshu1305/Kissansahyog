#!/usr/bin/env node
// Phase 8 checklist (static side) — PWA artifacts, manifest installability,
// self-healing SW config, and bundle budget. Assumes `npm run build` has run.
//   node scripts/test/phase8.mjs
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DIST = join(ROOT, 'dist')
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }

// Artifacts present
check('sw.js generated', existsSync(join(DIST, 'sw.js')))
check('manifest.webmanifest generated', existsSync(join(DIST, 'manifest.webmanifest')))
// NOTE (0025 PWA redesign): the SW registration is NO LONGER a generated registerSW.js.
// We moved to registerType:'prompt' + injectRegister:null and register through the
// virtual:pwa-register/react hook in PwaPrompts.jsx, so the update flow is explicit
// (a visible "reload" banner) instead of a silent auto-swap. Assert THAT architecture
// rather than the old registerSW.js artifact.
const viteCfg = readFileSync(join(ROOT, 'vite.config.js'), 'utf8')
const pwaPrompts = existsSync(join(ROOT, 'src/components/PwaPrompts.jsx')) ? readFileSync(join(ROOT, 'src/components/PwaPrompts.jsx'), 'utf8') : ''
check("registerType is 'prompt' (explicit update flow, no silent auto-swap)", /registerType:\s*'prompt'/.test(viteCfg))
check('SW registered via virtual:pwa-register/react (PwaPrompts)', /virtual:pwa-register\/react/.test(pwaPrompts))
check('update-available prompt wired (onNeedRefresh → updateServiceWorker)', /needRefresh/.test(pwaPrompts) && /updateServiceWorker/.test(pwaPrompts))
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

// SW config — offline-first shell, explicit (prompt) update, live data never stale.
const sw = readFileSync(join(DIST, 'sw.js'), 'utf8')
check('SW supports message-triggered update (skipWaiting handler present)', /skipWaiting/.test(sw))
check('SW clientsClaim enabled (offline-first from first session)', /clientsClaim/.test(sw))
check('SW cleanupOutdatedCaches enabled', /cleanupOutdatedCaches/.test(sw))
check('SW precaches the app shell (index.html)', /index\.html/.test(sw))
// Live data must be NetworkFirst (never served stale-as-fresh); static shell is precached.
check('runtime caching present for live data', /runtimeCaching|NetworkFirst/.test(sw))
check('live data is NOT CacheFirst (no stale prices/weather)', !/supabase[\s\S]{0,120}CacheFirst/.test(sw))

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
// V2: content hubs (greenhouse/carbon ~3000 words each) ship as their own lazy
// route chunks, so the per-route ceiling is higher — still split, not a monolith.
check('largest route chunk gzip < 70 KB (split correctly)', biggest < 70 * 1024, `${Math.round(biggest / 1024)} KB`)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
