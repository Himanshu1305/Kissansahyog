#!/usr/bin/env node
// Batch 9 Phase 1 — unit checks without a browser or database.
//   node scripts/test/batch9_phase1.mjs
// 1D: the Post page's location steps (cached ≤ 10 min → fresh low-accuracy ≤ 20 s → fallback),
//     driven by a fake navigator.geolocation that records the options it was called with.
// 1B: the "offline banner is showing" flag the Home stamp listens to.
// Strings: the two new Post-page strings exist in hi + en, only in src/lib/i18n/strings.js.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPostPosition, CACHED_MAX_AGE_MS, FRESH_TIMEOUT_MS } from '../../src/lib/location/postPosition.js'
import { setOfflineBannerShown, isOfflineBannerShown, subscribe } from '../../src/lib/offline/status.js'
import { strings } from '../../src/lib/i18n/strings.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }

// A fake geolocation: `answers` is a list of functions (options) → { pos } | { err }.
function fakeGeo(answers) {
  const calls = []
  return {
    calls,
    getCurrentPosition(ok, bad, options) {
      calls.push(options)
      const a = answers[calls.length - 1]
      const r = a ? a(options) : { err: { code: 3 } }
      setTimeout(() => (r.pos ? ok(r.pos) : bad(r.err)), 0)
    },
  }
}
const POS = { coords: { latitude: 23.8388, longitude: 78.7378, accuracy: 1200 } }

// 1. a cached position exists → used at once, no second request
{
  const g = fakeGeo([() => ({ pos: POS })])
  const r = await getPostPosition(g)
  check('1D cached position (≤ 10 min) is used at once', r.step === 'cached' && r.latitude === 23.8388 && g.calls.length === 1, JSON.stringify(r))
  check('1D first request: low accuracy, timeout 0, maximumAge 10 min', g.calls[0].enableHighAccuracy === false && g.calls[0].timeout === 0 && g.calls[0].maximumAge === CACHED_MAX_AGE_MS && CACHED_MAX_AGE_MS === 600000, JSON.stringify(g.calls[0]))
}
// 2. no cached position (timeout) → fresh low-accuracy fix with 20 s
{
  const g = fakeGeo([() => ({ err: { code: 3 } }), () => ({ pos: POS })])
  const r = await getPostPosition(g)
  check('1D no cached position → a fresh fix is taken', r.step === 'fresh' && g.calls.length === 2, JSON.stringify(r))
  check('1D second request: low accuracy, timeout 20 s, maximumAge 0', g.calls[1].enableHighAccuracy === false && g.calls[1].timeout === FRESH_TIMEOUT_MS && FRESH_TIMEOUT_MS === 20000 && g.calls[1].maximumAge === 0, JSON.stringify(g.calls[1]))
}
// 3. GPS off: both fail (unavailable) → rejected 'unavailable' (page shows the fallback)
{
  const g = fakeGeo([() => ({ err: { code: 3 } }), () => ({ err: { code: 2 } })])
  let msg = null
  try { await getPostPosition(g) } catch (e) { msg = e.message }
  check('1D no cached + no fresh fix → rejected "unavailable"', msg === 'unavailable' && g.calls.length === 2, msg)
}
// 4. permission refused → rejected 'denied' at once (no 20 s wait)
{
  const g = fakeGeo([() => ({ err: { code: 1 } })])
  let msg = null
  try { await getPostPosition(g) } catch (e) { msg = e.message }
  check('1D permission refused → "denied" without a second request', msg === 'denied' && g.calls.length === 1, `${msg}, ${g.calls.length} call(s)`)
}
// 5. no geolocation at all
{
  let msg = null
  try { await getPostPosition(null) } catch (e) { msg = e.message }
  check('1D no geolocation API → "unavailable"', msg === 'unavailable', msg)
}
// 6. never high accuracy (privacy rule: no more exact location than before)
{
  const src = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'location', 'postPosition.js'), 'utf8')
  check('1D postPosition.js never asks for high accuracy', !/enableHighAccuracy:\s*true/.test(src))
  const post = fs.readFileSync(path.join(ROOT, 'src', 'screens', 'Post.jsx'), 'utf8')
  check('1D Post.jsx no longer calls getCurrentPosition itself (one code path)', !post.includes('getCurrentPosition') && post.includes('getPostPosition'))
}

// 1B: the banner flag
{
  let n = 0
  const off = subscribe(() => { n++ })
  check('1B flag starts false', isOfflineBannerShown() === false)
  setOfflineBannerShown(true)
  check('1B flag true after the banner shows, listeners told', isOfflineBannerShown() === true && n === 1)
  setOfflineBannerShown(true)
  check('1B setting the same value again does not notify', n === 1)
  setOfflineBannerShown(false)
  check('1B flag false after the banner goes', isOfflineBannerShown() === false && n === 2)
  off()
  const home = fs.readFileSync(path.join(ROOT, 'src', 'screens', 'Homepage.jsx'), 'utf8')
  check('1B Home stamp uses hideUnderBanner', /<OfflineStamp[^>]*hideUnderBanner/.test(home))
  const others = ['Browse.jsx', 'ListingDetail.jsx', 'Mausam.jsx', 'Msp.jsx'].filter((f) => /hideUnderBanner/.test(fs.readFileSync(path.join(ROOT, 'src', 'screens', f), 'utf8')))
  check('1B other pages keep their stamp (unchanged)', others.length === 0, others.join(','))
}

// strings
for (const k of ['post_location_finding', 'post_location_fallback']) {
  check(`string ${k} has hi + en`, !!strings[k]?.hi && !!strings[k]?.en && /[ऀ-ॿ]/.test(strings[k].hi))
}
{
  const dev = /[ऀ-ॿ]/
  const files = ['src/lib/location/postPosition.js', 'src/lib/offline/status.js', 'src/lib/offline/useOffline.js']
  const bad = files.filter((f) => dev.test(fs.readFileSync(path.join(ROOT, f), 'utf8')))
  check('no Devanagari in the changed src/lib files', bad.length === 0, bad.join(','))
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
