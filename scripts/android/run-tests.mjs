#!/usr/bin/env node
// Batch 8A — the Android app test runner (T1–T18). Drives the installed debug APK over the
// Chrome DevTools protocol (the WebView's debug socket) and adb, and writes one record per
// test to results.json. The report table is generated from that file by report.mjs.
//
//   node scripts/android/run-tests.mjs [--out <results.json>] [--only T4,T5] [--skip-build]
//                                      [--evidence <dir>]
//
// Statuses: RAN-PASSED | RAN-FAILED | NOT-RUN (with reason) | HUMAN-REVIEW.
// A test passes only when every one of its checks ran and passed. Exit code 1 when any test is
// RAN-FAILED or the app logged a FATAL EXCEPTION during the run.
//
// READ-ONLY against production: no signup, login, posting or feedback; searches use a query
// that is known to have results (a zero-result search would write a log_search_miss row).
// T19 / T20 (negative control, repeatability) run this runner several times — see meta-tests.mjs.
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'
import {
  ROOT, OUT_DIR, LOG_DIR, APK, WIN, SDK, JDK, ADB, sleep, rel, adb, sh, deviceState, appPid, forceStop, launchApp,
  resumedActivity, waitFor, uiDump, uiFind, tap, key, makeEvidence, Checks, AppSession,
} from './lib.mjs'
import {
  PKG, APP_LABEL, VERSION_NAME, VERSION_CODE, MIN_SDK, TARGET_SDK, APP_URL, PERMISSIONS, PROD_REF, STAGING_REF,
  STAGING_HOST, FORBIDDEN, ROUTES, INVALID_ROUTE, ERROR_BOUNDARY_TEXT, CONSOLE_ALLOWLIST,
  RELATIVE_FETCH_ALLOWLIST, TEST_PLACE, LOCATION_KEYS,
} from './expected.mjs'

// ---------- options ----------
const argv = process.argv.slice(2)
const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null }
const OUT = path.resolve(ROOT, arg('--out') || path.join('docs', 'review', 'batch8a', 'results.json'))
const ONLY = arg('--only') ? arg('--only').split(',').map((s) => s.trim().toUpperCase()) : null
const SKIP_BUILD = argv.includes('--skip-build')
const EVIDENCE_ROOT = path.resolve(ROOT, arg('--evidence') || path.join('docs', 'review', 'batch8a', 'evidence'))
const NEGATIVE = process.env.KS_NEGATIVE_CONTROL === '1'
fs.mkdirSync(LOG_DIR, { recursive: true })
fs.mkdirSync(EVIDENCE_ROOT, { recursive: true })
const ev = makeEvidence(EVIDENCE_ROOT)
const app = new AppSession()

const PASS = 'RAN-PASSED', FAIL = 'RAN-FAILED', NOTRUN = 'NOT-RUN', HUMAN = 'HUMAN-REVIEW'
const notRun = (reason) => ({ status: NOTRUN, notes: reason })
// Turn a Checks list into a result; the checks themselves are saved as evidence.
function fromChecks(id, c, { files = [], notes = '', passStatus = PASS } = {}) {
  files.push(ev.text(id, 'checks.json', c.items))
  return { status: c.passed ? passStatus : FAIL, evidenceFiles: files, notes: [c.passed ? '' : `FAILED: ${c.summary()}`, notes].filter(Boolean).join(' | ') }
}
const run = { startedAt: new Date().toISOString(), serial: process.env.ANDROID_SERIAL || null, negativeControl: NEGATIVE, device: null, apk: null, fatalExceptions: null }
const shared = { apkFiles: null, dpr: null }

// ---------- small page helpers ----------
const setLocation = (place = TEST_PLACE) => app.page.evaluate(([p, keys]) => {
  keys.forEach((k) => localStorage.removeItem(k))
  localStorage.setItem('ks_location_v1', JSON.stringify({ lat: p.lat, lng: p.lng, label: p.label, from: 'picked' }))
}, [place, LOCATION_KEYS])
const clearLocation = () => app.page.evaluate((keys) => keys.forEach((k) => localStorage.removeItem(k)), LOCATION_KEYS)
const allowed = (e) => CONSOLE_ALLOWLIST.some((a) => a.pattern.test(e.text) || a.pattern.test(e.url))
const dataHosts = (responses) => {
  const hosts = {}
  for (const r of responses) {
    if (!/supabase\.co$|open-meteo\.com$|onrender\.com$|bigdatacloud\.net$|kissansahyog\.com$/.test(r.host)) continue
    const k = `${r.host} ${r.status}`
    hosts[k] = (hosts[k] || 0) + 1
  }
  return hosts
}
async function dpr() {
  if (!shared.dpr) shared.dpr = await app.page.evaluate(() => window.devicePixelRatio)
  return shared.dpr
}
function fatalsIn(text) {
  const lines = text.split('\n')
  const hits = []
  lines.forEach((l, i) => { if (l.includes('FATAL EXCEPTION') && lines.slice(i, i + 4).join('\n').includes(PKG)) hits.push(lines.slice(i, i + 12).join('\n')) })
  return hits
}
// A real finger tap (adb input tap) on an element: CSS → screen pixels through the WebView's
// on-screen position. Used for links that leave the page — Playwright's own click would wait
// for a navigation that never happens (Capacitor hands it to another app).
async function webViewOrigin() {
  const xml = uiDump()
  const m = xml.match(/class="android\.webkit\.WebView"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)
  return m ? { x: Number(m[1]), y: Number(m[2]) } : { x: 0, y: 0 }
}
async function tapElement(selector) {
  await app.page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), selector)
  await sleep(600)
  const r = await app.page.evaluate((s) => { const q = document.querySelector(s).getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 } }, selector)
  const o = await webViewOrigin()
  const ratio = await dpr()
  tap(o.x + r.x * ratio, o.y + r.y * ratio)
  return { css: r, origin: o }
}

async function ensureApp() {
  // Reconnect when there is no page, the app restarted (new pid) or it is not in front.
  if (!app.page || app.page.isClosed() || app.pid !== String(appPid()) || resumedActivity().pkg !== PKG) await app.connect()
  return app.page
}
function apkFileList() {
  if (shared.apkFiles) return shared.apkFiles
  if (!JDK) throw new Error('no JDK 21 found (needed to read the APK)')
  const res = spawnSync(path.join(JDK, 'bin', WIN ? 'jar.exe' : 'jar'), ['tf', APK], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (res.status !== 0) throw new Error(`jar tf failed: ${res.stderr}`)
  shared.apkFiles = res.stdout.split(/\r?\n/).filter(Boolean)
  return shared.apkFiles
}
function aapt2() {
  const dir = path.join(SDK, 'build-tools')
  const v = fs.readdirSync(dir).filter((d) => fs.existsSync(path.join(dir, d, WIN ? 'aapt2.exe' : 'aapt2'))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop()
  return path.join(dir, v, WIN ? 'aapt2.exe' : 'aapt2')
}

// =====================================================================================
// TESTS
// =====================================================================================
const TESTS = []
const test = (id, name, assertion, needsDevice, fn) => TESTS.push({ id, name, assertion, needsDevice, fn })

test('T1', 'Clean build', 'npm run android:debug from a clean tree exits 0 and produces the debug APK (size + sha256 recorded)', false, async (id) => {
  if (SKIP_BUILD) return notRun('--skip-build was given; the existing APK was used')
  fs.rmSync(path.join(ROOT, 'dist'), { recursive: true, force: true })
  fs.rmSync(path.join(ROOT, 'android', 'app', 'build'), { recursive: true, force: true })
  const logFile = path.join(LOG_DIR, 'T1-build.log')
  const fd = fs.openSync(logFile, 'w')
  const res = spawnSync('npm run android:debug', { cwd: ROOT, shell: true, stdio: ['ignore', fd, fd], timeout: 30 * 60 * 1000 })
  fs.closeSync(fd)
  const c = new Checks()
  c.check('npm run android:debug exit code is 0', res.status === 0, `exit ${res.status}`)
  const exists = fs.existsSync(APK)
  c.check('APK file exists', exists, rel(APK))
  let info = null
  if (exists) {
    const buf = fs.readFileSync(APK)
    info = { path: rel(APK), bytes: buf.length, megabytes: +(buf.length / 1048576).toFixed(2), sha256: crypto.createHash('sha256').update(buf).digest('hex'), builtAt: fs.statSync(APK).mtime.toISOString() }
    run.apk = info
  }
  const tail = fs.readFileSync(logFile, 'utf8').split(/\r?\n/).filter((l) => /\[build-android\]|PROD GUARD|BUILD SUCCESSFUL|BUILD FAILED|FAILED/.test(l)).join('\n')
  return fromChecks(id, c, { files: [ev.text(id, 'apk.json', info || {}), ev.text(id, 'build-summary.txt', tail)], notes: info ? `${info.megabytes} MB, sha256 ${info.sha256}` : '' })
})

test('T2', 'APK facts', `aapt2: package ${PKG}, label "${APP_LABEL}", minSdk ${MIN_SDK}, targetSdk ${TARGET_SDK}, versionName ${VERSION_NAME}, debuggable, permissions exactly the decided set`, false, async (id) => {
  if (!fs.existsSync(APK)) return notRun('no APK (build did not produce one)')
  const res = spawnSync(aapt2(), ['dump', 'badging', APK], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  const out = res.stdout || ''
  const get = (re) => (out.match(re) || [])[1] ?? null
  const perms = [...out.matchAll(/^uses-permission(?:-sdk-\d+)?: name='([^']+)'/gm)].map((m) => m[1]).sort()
  const expected = Object.keys(PERMISSIONS).sort()
  const facts = {
    package: get(/^package: name='([^']+)'/m), versionCode: get(/versionCode='([^']+)'/), versionName: get(/versionName='([^']+)'/),
    minSdk: get(/^(?:sdkVersion|minSdkVersion):'([^']+)'/m), targetSdk: get(/^targetSdkVersion:'([^']+)'/m),
    label: get(/^application-label:'([^']*)'/m), debuggable: /^application-debuggable/m.test(out), permissions: perms,
    extraPermissions: perms.filter((p) => !expected.includes(p)), missingPermissions: expected.filter((p) => !perms.includes(p)),
  }
  const c = new Checks()
  c.check('aapt2 dump badging ran', res.status === 0, `exit ${res.status}`)
  c.check(`package is ${PKG}`, facts.package === PKG, facts.package)
  c.check(`label is "${APP_LABEL}"`, facts.label === APP_LABEL, facts.label)
  c.check(`versionName is ${VERSION_NAME}`, facts.versionName === VERSION_NAME, facts.versionName)
  c.check(`versionCode is ${VERSION_CODE}`, facts.versionCode === VERSION_CODE, facts.versionCode)
  c.check(`minSdk is ${MIN_SDK}`, facts.minSdk === MIN_SDK, facts.minSdk)
  c.check(`targetSdk is ${TARGET_SDK}`, facts.targetSdk === TARGET_SDK, facts.targetSdk)
  c.check('debuggable is true', facts.debuggable)
  c.check('no permission beyond the decided set', facts.extraPermissions.length === 0, facts.extraPermissions)
  c.check('no decided permission is missing', facts.missingPermissions.length === 0, facts.missingPermissions)
  return fromChecks(id, c, { files: [ev.text(id, 'apk-facts.json', facts), ev.text(id, 'permission-reasons.json', PERMISSIONS)], notes: `permissions: ${perms.map((p) => p.replace('android.permission.', '')).join(', ')}` })
})

test('T3', 'Bundle safety', 'APK web assets: production ref present; staging ref/host, service_role, GEMINI_API_KEY, sb_secret all absent; packaged capacitor.config has no server.url (counts only)', false, async (id) => {
  if (!fs.existsSync(APK)) return notRun('no APK (build did not produce one)')
  if (!JDK) return notRun('no JDK 21 found (needed to unpack the APK)')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-apk-'))
  try {
    const x = spawnSync(path.join(JDK, 'bin', WIN ? 'jar.exe' : 'jar'), ['xf', APK, 'assets'], { cwd: tmp, encoding: 'utf8' })
    if (x.status !== 0) throw new Error(`could not unpack the APK: ${x.stderr}`)
    const pub = path.join(tmp, 'assets', 'public')
    const TEXT = new Set(['.js', '.mjs', '.html', '.css', '.json', '.xml', '.txt', '.webmanifest', '.map', ''])
    const files = []
    const walk = (d) => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); fs.statSync(p).isDirectory() ? walk(p) : files.push(p) } }
    walk(pub)
    const count = (text, needle) => text.split(needle).length - 1
    const counts = { filesTotal: files.length, textFilesScanned: 0, prodRef: 0, stagingRef: 0, stagingHost: 0 }
    for (const x of FORBIDDEN) counts[x.label] = 0
    counts.sbSecretLiteral = 0
    const sbContext = []
    for (const f of files) {
      if (!TEXT.has(path.extname(f))) continue
      counts.textFilesScanned++
      const text = fs.readFileSync(f, 'utf8')
      counts.prodRef += count(text, PROD_REF)
      counts.stagingRef += count(text, STAGING_REF)
      // Same exception as check-prod-env.mjs: the _headers rule that noindexes the staging host.
      const hostScan = path.basename(f) === '_headers' ? text.split(/\r?\n/).map((l) => (l.startsWith(`https://${STAGING_HOST}/`) ? l.slice(`https://${STAGING_HOST}/`.length) : l)).join('\n') : text
      counts.stagingHost += count(hostScan, STAGING_HOST)
      for (const x of FORBIDDEN) counts[x.label] += (text.match(x.re) || []).length
      counts.sbSecretLiteral += count(text, 'sb_secret')
      for (const m of text.matchAll(/.{0,40}sb_secret.{0,25}/g)) sbContext.push(`${path.basename(f)}: ${m[0].replace(/sb_secret_[A-Za-z0-9_-]{10,}/g, 'sb_secret_<REDACTED>')}`)
    }
    const cfgFile = path.join(tmp, 'assets', 'capacitor.config.json')
    const cfg = fs.existsSync(cfgFile) ? JSON.parse(fs.readFileSync(cfgFile, 'utf8')) : null
    const c = new Checks()
    c.check('web assets are packaged (index.html present)', fs.existsSync(path.join(pub, 'index.html')), `${files.length} files`)
    c.check('search-index.json is bundled', fs.existsSync(path.join(pub, 'search-index.json')))
    c.check('production project ref is present', counts.prodRef > 0, counts.prodRef)
    c.check('staging project ref is absent', counts.stagingRef === 0, counts.stagingRef)
    c.check('staging host is absent', counts.stagingHost === 0, counts.stagingHost)
    for (const x of FORBIDDEN) c.check(`${x.label} occurs 0 times`, counts[x.label] === 0, counts[x.label])
    c.check('packaged capacitor.config.json exists', !!cfg)
    c.check('packaged capacitor.config has no server.url', !!cfg && !(cfg.server && 'url' in cfg.server), cfg?.server ? Object.keys(cfg.server) : null)
    c.check('packaged appId / androidScheme are as decided', cfg?.appId === PKG && cfg?.server?.androidScheme === 'https', { appId: cfg?.appId, androidScheme: cfg?.server?.androidScheme })
    return fromChecks(id, c, { files: [ev.text(id, 'counts.json', { ...counts, sbSecretLiteralContext: sbContext })], notes: `${counts.textFilesScanned} text files scanned; prod ref ×${counts.prodRef}; bare "sb_secret" literal ×${counts.sbSecretLiteral} = supabase-js key-type check, not a key` })
  } finally { fs.rmSync(tmp, { recursive: true, force: true }) }
})

test('T4', 'Install + cold start', 'After install and am start -W: process alive at 10 s, no FATAL EXCEPTION, page is https://localhost/, text contains "किसान", screenshot is not blank', true, async (id) => {
  if (!fs.existsSync(APK)) return notRun('no APK to install')
  const c = new Checks()
  await app.close()
  const inst = adb(['install', '-r', APK], { timeout: 180000 })
  c.check('adb install -r succeeded', /Success/.test(inst.out), (inst.out + inst.err).trim().split('\n').pop())
  forceStop()
  adb(['logcat', '-c'])
  const start = launchApp()
  const waitTime = Number((start.out.match(/WaitTime: (\d+)/) || [])[1]) || null
  await sleep(10000)
  const pid = appPid()
  c.check('app process is alive after 10 s', !!pid, pid || 'no pid')
  const log = adb(['logcat', '-d'], { timeout: 60000 }).out
  const fatals = fatalsIn(log)
  c.check('no FATAL EXCEPTION for the app in logcat', fatals.length === 0, fatals.length)
  const page = await app.connect({ launch: false })
  await app.waitContent()
  const st = await app.state()
  c.check('page URL is https://localhost/', st.href === `${APP_URL}/`, st.href)
  const body = await page.evaluate(() => document.body.innerText)
  c.check('visible text contains Devanagari "किसान"', body.includes('किसान'))
  c.check('<html> has the native-app class', st.nativeClass)
  const shot = await ev.shot(id, 'cold-start')
  c.check('screenshot is not blank (pixel std-dev > 10)', shot.stdev > 10, +shot.stdev.toFixed(1))
  const ver = await page.evaluate(() => navigator.userAgent)
  run.device = { ...(run.device || {}), webview: (ver.match(/Chrome\/([\d.]+)/) || [])[1] || null }
  return fromChecks(id, c, { files: [shot.file, ev.text(id, 'start.json', { amStart: start.out.trim(), pid, state: st, userAgent: ver, fatalExceptions: fatals })], notes: `am start -W: ${(start.out.match(/Status: \w+/) || ['no status'])[0]}, WaitTime ${waitTime} ms (the emulator renders on a software GPU); title "${st.title}"` })
})

test('T5', 'Routes render', `${ROUTES.length} routes + 1 invalid path: main content renders, no ErrorBoundary, no uncaught page error, no console.error outside the documented allowlist`, true, async (id) => {
  await ensureApp()
  const c = new Checks()
  const files = []
  const perRoute = []
  for (const route of [...ROUTES, INVALID_ROUTE]) {
    const invalid = route === INVALID_ROUTE
    const t = app.mark()
    let st = null, err = null
    try { await app.goto(route, { settle: 2500 }); st = await app.state() } catch (e) { err = String(e.message || e).split('\n')[0] }
    const seen = app.since(t)
    const unexpected = seen.consoleErrors.filter((e) => !allowed(e))
    const name = invalid ? 'invalid-path' : (route === '/' ? 'home' : route.slice(1).replaceAll('/', '_'))
    let shot = null
    try { shot = await ev.shot(id, name); files.push(shot.file) } catch { /* recorded below */ }
    const boundary = !!st && st.text.includes(ERROR_BOUNDARY_TEXT)
    const ok = !err && !!st && st.textLength > 150 && st.hasMain && !boundary && seen.pageErrors.length === 0 && unexpected.length === 0 && (invalid ? st.notFound : !st.notFound) && !!shot
    perRoute.push({ route, ok, navigationError: err, textLength: st?.textLength, h1: st?.h1, notFoundScreen: st?.notFound, errorBoundary: boundary, pageErrors: seen.pageErrors.map((e) => e.text), consoleErrorsUnexpected: unexpected.map((e) => `${e.text} @ ${e.url}`), consoleErrorsAllowed: seen.consoleErrors.filter(allowed).length, screenshot: shot?.file })
    c.check(invalid ? `${route} shows the NotFound screen` : `${route} renders`, ok, ok ? '' : perRoute.at(-1))
  }
  files.push(ev.text(id, 'routes.json', perRoute), ev.text(id, 'console-allowlist.json', CONSOLE_ALLOWLIST.map((a) => ({ pattern: String(a.pattern), reason: a.reason }))))
  const allowedTotal = perRoute.reduce((n, r) => n + r.consoleErrorsAllowed, 0)
  return fromChecks(id, c, { files, notes: `${perRoute.filter((r) => r.ok).length}/${perRoute.length} routes ok; ${allowedTotal} allow-listed console errors (CORS to the live site, needs deploy)` })
})

test('T6', 'Deep link + reload', 'Direct navigation to /yojana/central and a real /sawaal/<slug>, then reload: the same page renders (SPA fallback)', true, async (id) => {
  await ensureApp()
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'search-index.json'), 'utf8'))
  const sawaal = index.find((i) => i.type === 'sawaal' && /^\/sawaal\/[^/]+$/.test(i.url || ''))
  const c = new Checks()
  c.check('a real /sawaal/<slug> exists in public/search-index.json', !!sawaal, sawaal?.url)
  const out = []
  for (const route of ['/yojana/central', sawaal?.url].filter(Boolean)) {
    await app.goto(route, { settle: 2500 })
    const before = await app.state()
    await app.page.reload({ waitUntil: 'load', timeout: 45000 })
    await app.waitContent(); await sleep(2500)
    const after = await app.state()
    out.push({ route, before, after })
    c.check(`${route} renders on direct navigation`, before.path === route && before.textLength > 150 && !before.notFound && !before.text.includes(ERROR_BOUNDARY_TEXT), { path: before.path, textLength: before.textLength, notFound: before.notFound })
    c.check(`${route} renders the same page after reload`, after.path === route && after.h1 === before.h1 && after.h1.length > 0 && !after.notFound, { path: after.path, h1Before: before.h1, h1After: after.h1 })
  }
  const shot = await ev.shot(id, 'after-reload')
  return fromChecks(id, c, { files: [shot.file, ev.text(id, 'deep-links.json', out)] })
})

test('T7', 'Live data (read-only)', '/mausam, /msp, the mandi ticker on / and the listings on /browse load real data: HTTP 200 from the data host AND non-empty values in the DOM', true, async (id) => {
  await ensureApp()
  const c = new Checks()
  const files = []
  const pages = {}
  await app.goto('/about', { settle: 500 })
  await setLocation()
  const probe = async (route, grab) => {
    const t = app.mark()
    await app.goto(route, { settle: 6000 })
    const dom = await app.page.evaluate(grab)
    const seen = app.since(t)
    const ok200 = (re, p) => seen.responses.filter((r) => re.test(r.host) && r.status === 200 && (!p || p.test(r.path))).length
    const shot = await ev.shot(id, route === '/' ? 'home' : route.slice(1)); files.push(shot.file)
    pages[route] = { dom, hosts: dataHosts(seen.responses), failed: seen.responses.filter((r) => /supabase\.co$|open-meteo\.com$/.test(r.host) && (r.status === 0 || r.status >= 400)).map((r) => `${r.host}${r.path} → ${r.status || r.failure}`) }
    return { dom, ok200 }
  }
  {
    const { dom, ok200 } = await probe('/mausam', () => { const t = document.querySelector('main')?.innerText || ''; return { temperatures: (t.match(/-?\d+°/g) || []).slice(0, 6) } })
    c.check('/mausam: 200 from supabase.co (weather cache) or api.open-meteo.com', ok200(/supabase\.co$/, /weather/) + ok200(/open-meteo\.com$/) > 0, pages['/mausam'].hosts)
    c.check('/mausam: DOM shows temperatures', dom.temperatures.length > 0, dom.temperatures)
  }
  {
    const { dom, ok200 } = await probe('/msp', () => { const t = document.querySelector('main')?.innerText || ''; return { prices: (t.match(/₹\s?[\d,]{3,}/g) || []).slice(0, 6) } })
    c.check('/msp: 200 from supabase.co', ok200(/supabase\.co$/) > 0, pages['/msp'].hosts)
    c.check('/msp: DOM shows ₹ prices', dom.prices.length > 0, dom.prices)
  }
  {
    const { dom, ok200 } = await probe('/', () => { const el = document.querySelector('.ticker-content'); const t = el?.innerText || ''; return { tickerPresent: !!el, tickerPrices: (t.match(/₹[\d,]+/g) || []).slice(0, 6), marquee: (document.querySelector('[role="marquee"]')?.innerText || '').replace(/\s+/g, ' ').slice(0, 160) } })
    c.check('/: 200 from supabase.co', ok200(/supabase\.co$/) > 0, pages['/'].hosts)
    c.check('/: mandi ticker shows ₹ prices', dom.tickerPresent && dom.tickerPrices.length > 0, dom)
  }
  {
    const { dom, ok200 } = await probe('/browse', () => ({ listingLinks: document.querySelectorAll('a[href^="/listing/"]').length, cards: document.querySelectorAll('[data-testid="contact-actions"]').length, text: (document.querySelector('#root')?.innerText || '').replace(/\s+/g, ' ').slice(0, 200) }))
    c.check('/browse: 200 from supabase.co', ok200(/supabase\.co$/) > 0, pages['/browse'].hosts)
    c.check('/browse: DOM shows listings', dom.listingLinks + dom.cards > 0, dom)
  }
  await clearLocation()
  files.push(ev.text(id, 'live-data.json', pages))
  return fromChecks(id, c, { files, notes: 'No mandi-api.onrender.com call exists in the client (prices come from Supabase); /browse has no ticker, so its listings are checked instead. /mausam needs a place: Sagar was set as the saved location (the page then upserts its weather-grid request, as it does for any visitor).' })
})

test('T8', 'No service worker', 'navigator.serviceWorker.getRegistrations() is empty, no update/install banner in the DOM, sw.js is absent from the APK', true, async (id) => {
  await ensureApp()
  await app.goto('/', { settle: 3000 })
  const dom = await app.page.evaluate(async () => ({
    supported: 'serviceWorker' in navigator,
    registrations: 'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0,
    controller: !!navigator.serviceWorker?.controller,
    updateBanner: !!document.querySelector('[data-testid="pwa-update-banner"]'),
    installBanner: !!document.querySelector('[data-testid="pwa-install-banner"]'),
    installStrip: !!document.querySelector('[data-testid="pwa-install-strip"]'),
    manifestLink: !!document.querySelector('link[rel="manifest"]'),
  }))
  const files = apkFileList()
  const sw = files.filter((f) => /^assets\/public\/(sw\.js|registerSW\.js|workbox-[^/]+\.js|manifest\.webmanifest)$/.test(f))
  const c = new Checks()
  c.check('0 service worker registrations', dom.registrations === 0, dom.registrations)
  c.check('page is not controlled by a service worker', !dom.controller)
  c.check('no update banner', !dom.updateBanner)
  c.check('no install banner / install strip', !dom.installBanner && !dom.installStrip, { installBanner: dom.installBanner, installStrip: dom.installStrip })
  c.check('sw.js / workbox / web manifest absent from the APK (VitePWA disable:true)', sw.length === 0, sw)
  return fromChecks(id, c, { files: [ev.text(id, 'service-worker.json', { dom, apkServiceWorkerFiles: sw })] })
})

test('T9', 'Edge-to-edge / safe areas', 'API 36 portrait: NavBar below the status bar, tab bar buttons above the navigation bar and not covered, offline banner below the status bar, last footer link fully visible above the tab bar', true, async (id) => {
  await ensureApp()
  const c = new Checks()
  const files = []
  const win = sh('dumpsys window').out
  const insetFrame = (type) => {
    const m = [...win.matchAll(new RegExp(`type=${type}[^\\n]*?frame=\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\][^\\n]*`, 'g'))].map((x) => ({ frame: x.slice(1, 5).map(Number), visible: !/visible=false/.test(x[0]) })).filter((x) => x.frame[3] > x.frame[1])
    return (m.find((x) => x.visible) || m[0])?.frame || null
  }
  const size = (sh('wm size').out.match(/(\d+)x(\d+)\s*$/m) || []).slice(1).map(Number)
  const status = insetFrame('statusBars'), nav = insetFrame('navigationBars')
  const xml = uiDump()
  const web = (xml.match(/class="android\.webkit\.WebView"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/) || []).slice(1).map(Number)
  const ratio = await dpr()
  const sys = { screen: size, statusBarFrame: status, navigationBarFrame: nav, webViewBounds: web, devicePixelRatio: ratio, sdk: sh('getprop ro.build.version.sdk').out.trim(), rotation: (sh('dumpsys window displays').out.match(/mCurrentRotation=(\w+)|rotation=(\d)/) || [])[0] || null }
  c.check('status bar and navigation bar frames were read from dumpsys window', !!status && !!nav && size.length === 2, { status, nav, size })
  if (!status || !nav || size.length !== 2) return fromChecks(id, c, { files: [ev.text(id, 'geometry.json', sys)] })
  const statusBottom = status[3], navTop = nav[1]
  c.check('device is in portrait', size[1] > size[0], size)
  c.check('the WebView bounds were read from uiautomator (app in front)', web.length === 4, web)
  // Capacitor 8: on WebView >= 140 the page is drawn edge to edge and the bar sizes reach the CSS
  // (--safe-area-inset-*); on older WebViews Capacitor pads the window instead and the CSS insets
  // are 0. Both are measured in screen pixels below; which one this device uses is recorded.
  sys.insetMode = web.length === 4 && web[1] === 0 ? 'edge-to-edge (CSS insets)' : 'window padded by Capacitor (CSS insets 0)'
  const originY = web.length === 4 ? web[1] : 0
  // CSS → screen pixels. The WebView rounds its CSS viewport (e.g. 2201 px / 2.625 = 838.48 CSS px
  // is reported as 839.24), so a CSS-derived position can be off by up to one CSS pixel.
  const tol = Math.ceil(ratio)
  if (web.length === 4) c.check(`the WebView ends (${web[3]}px) at or above the navigation bar top (${nav[1]}px)`, web[3] <= nav[1], web)
  const px = (cssY) => Math.round(cssY * ratio + originY)
  const geometry = { system: sys, statusBarBottomPx: statusBottom, navigationBarTopPx: navTop, pages: {} }
  for (const route of ['/', '/browse', '/login']) {
    await app.goto(route, { settle: 2000 })
    await app.page.evaluate(() => window.scrollTo(0, 0)); await sleep(300)
    const top = await app.page.evaluate(() => {
      const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, height: b.height } }
      const header = document.querySelector('header.ks-safe-sticky')
      const first = [...document.querySelectorAll('#root *')].find((el) => { const b = el.getBoundingClientRect(); return b.height > 0 && b.width > 0 && getComputedStyle(el).position !== 'fixed' })
      const bar = document.querySelector('[data-ks-tabbar]')
      const buttons = bar ? [...bar.querySelectorAll('button')].map((b) => { const q = b.getBoundingClientRect(); const hit = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return { top: q.top, bottom: q.bottom, covered: !(hit && bar.contains(hit)) } }) : []
      return { header: r(header), firstContent: r(first), tabBar: r(bar), tabButtons: buttons, safeTop: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top').trim(), safeBottom: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom').trim(), innerHeight: window.innerHeight }
    })
    const name = route === '/' ? 'home' : route.slice(1)
    files.push((await ev.shot(id, `${name}-top`)).file)
    // Offline banner, forced visible without touching the network.
    await app.page.evaluate(() => window.dispatchEvent(new Event('offline')))
    const banner = await waitFor(() => app.page.evaluate(() => { const b = document.querySelector('[data-testid="offline-banner"]'); if (!b) return null; const q = b.getBoundingClientRect(); return { top: q.top, bottom: q.bottom } }), { timeout: 4000 })
    if (route === '/') files.push((await ev.shot(id, 'home-offline-banner-forced')).file)
    await app.page.evaluate(() => window.dispatchEvent(new Event('online')))
    await waitFor(() => app.page.evaluate(() => !document.querySelector('[data-testid="offline-banner"]')), { timeout: 4000 })
    // Bottom of the page: the footer's last link must clear the tab bar.
    await app.page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await sleep(700)
    const bottom = await app.page.evaluate(() => {
      const links = [...document.querySelectorAll('footer a')]
      const last = links.at(-1)
      const bar = document.querySelector('[data-ks-tabbar]')
      const header = document.querySelector('header.ks-safe-sticky')
      if (!last) return null
      const q = last.getBoundingClientRect()
      const hit = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2)
      return { text: last.textContent.trim(), top: q.top, bottom: q.bottom, tabBarTop: bar ? bar.getBoundingClientRect().top : null, headerBottom: header ? header.getBoundingClientRect().bottom : 0, reachable: !!hit && (hit === last || last.contains(hit)) }
    })
    files.push((await ev.shot(id, `${name}-bottom`)).file)
    geometry.pages[route] = { top, offlineBanner: banner, footerLastLink: bottom, px: { headerTop: top.header ? px(top.header.top) : null, firstContentTop: top.firstContent ? px(top.firstContent.top) : null, tabButtonsBottom: top.tabButtons.length ? px(Math.max(...top.tabButtons.map((b) => b.bottom))) : null, tabBarBottom: top.tabBar ? px(top.tabBar.bottom) : null, offlineBannerTop: banner ? px(banner.top) : null } }
    const g = geometry.pages[route].px
    if (top.header) c.check(`${route}: NavBar top (${g.headerTop}px) is at or below the status bar bottom (${statusBottom}px)`, g.headerTop >= statusBottom - tol)
    else c.check(`${route}: first content (${g.firstContentTop}px) starts at or below the status bar bottom (${statusBottom}px) — this page has no NavBar`, g.firstContentTop != null && g.firstContentTop >= statusBottom - tol)
    c.check(`${route}: tab bar is present`, !!top.tabBar && top.tabButtons.length > 0)
    c.check(`${route}: tab bar buttons end (${g.tabButtonsBottom}px) at or above the navigation bar top (${navTop}px), within ${tol}px (1 CSS px) rounding`, g.tabButtonsBottom != null && g.tabButtonsBottom <= navTop + tol)
    c.check(`${route}: no tab bar button is covered by another element`, top.tabButtons.length > 0 && top.tabButtons.every((b) => !b.covered))
    c.check(`${route}: forced offline banner top (${g.offlineBannerTop}px) is at or below the status bar bottom (${statusBottom}px)`, g.offlineBannerTop != null && g.offlineBannerTop >= statusBottom - tol)
    c.check(`${route}: last footer link is fully visible above the tab bar`, !!bottom && bottom.tabBarTop != null && bottom.bottom <= bottom.tabBarTop + 0.5 && bottom.top >= bottom.headerBottom - 0.5 && bottom.reachable, bottom)
  }
  // The CSS path (WebView >= 140, edge to edge) cannot occur on a device whose WebView is older,
  // so it is also exercised by giving the page the insets Capacitor would publish there.
  const sim = { top: Math.round(statusBottom / ratio), bottom: Math.round((size[1] - navTop) / ratio) }
  await app.goto('/', { settle: 1500 })
  const simulated = await app.page.evaluate(async (sim) => {
    const root = document.documentElement
    root.style.setProperty('--safe-area-inset-top', `${sim.top}px`)
    root.style.setProperty('--safe-area-inset-bottom', `${sim.bottom}px`)
    window.scrollTo(0, 0)
    window.dispatchEvent(new Event('offline'))
    await new Promise((r) => setTimeout(r, 600))
    const rect = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom } }
    const bar = document.querySelector('[data-ks-tabbar]')
    const btnBottom = bar ? Math.max(...[...bar.querySelectorAll('button')].map((b) => b.getBoundingClientRect().bottom)) : null
    const out = { header: rect('header.ks-safe-sticky'), banner: rect('[data-testid="offline-banner"]'), statusStrip: parseFloat(getComputedStyle(document.body, '::before').height), tabButtonsBottom: btnBottom, innerHeight: window.innerHeight }
    window.dispatchEvent(new Event('online'))
    window.scrollTo(0, document.documentElement.scrollHeight)
    await new Promise((r) => setTimeout(r, 600))
    const links = [...document.querySelectorAll('footer a')]; const last = links.at(-1).getBoundingClientRect()
    out.footerLastBottom = last.bottom; out.tabBarTop = bar.getBoundingClientRect().top
    root.style.removeProperty('--safe-area-inset-top'); root.style.removeProperty('--safe-area-inset-bottom')
    return out
  }, sim)
  geometry.simulatedEdgeToEdge = { insetsCss: sim, ...simulated }
  c.check(`simulated edge-to-edge: NavBar top = status-bar inset (${sim.top}px)`, !!simulated.header && Math.abs(simulated.header.top - sim.top) <= 1, simulated.header)
  c.check('simulated edge-to-edge: an opaque strip covers the status bar', Math.abs(simulated.statusStrip - sim.top) <= 1, simulated.statusStrip)
  c.check('simulated edge-to-edge: offline banner below the status bar', !!simulated.banner && simulated.banner.top >= sim.top - 1, simulated.banner)
  c.check(`simulated edge-to-edge: tab bar buttons end above the navigation bar (${sim.bottom}px)`, simulated.tabButtonsBottom != null && simulated.tabButtonsBottom <= simulated.innerHeight - sim.bottom + 1, { tabButtonsBottom: simulated.tabButtonsBottom, limit: simulated.innerHeight - sim.bottom })
  c.check('simulated edge-to-edge: last footer link above the tab bar', simulated.footerLastBottom <= simulated.tabBarTop + 0.5, { footerLastBottom: simulated.footerLastBottom, tabBarTop: simulated.tabBarTop })
  files.push(ev.text(id, 'geometry.json', geometry))
  return fromChecks(id, c, { files, notes: `${sys.insetMode}; status bar bottom ${statusBottom}px, navigation bar top ${navTop}px, dpr ${ratio}; the edge-to-edge CSS path was also checked with simulated insets` })
})

test('T10', 'Offline', 'Airplane mode + cold launch: app shell renders (not a browser error page), offline banner visible, no crash; /, /browse, /mausam, /msp, /about show content or an in-app failure state; back online the banner goes within 15 s and /mausam loads data', true, async (id) => {
  await ensureApp()
  const c = new Checks()
  const files = []
  const notes = []
  await app.goto('/about', { settle: 500 })
  await setLocation()
  await app.close()
  let method = 'cmd connectivity airplane-mode enable'
  let on = sh('cmd connectivity airplane-mode enable')
  if (!on.ok || /error|exception/i.test(on.out + on.err)) { method = 'svc wifi disable + svc data disable (airplane-mode command failed)'; sh('svc wifi disable'); sh('svc data disable') }
  try {
    await sleep(3000)
    const airplane = sh('settings get global airplane_mode_on').out.trim()
    c.check('device is offline (airplane mode on)', method.startsWith('svc') || airplane === '1', `${method}; airplane_mode_on=${airplane}`)
    forceStop()
    adb(['logcat', '-c'])
    launchApp()
    await sleep(4000)
    const page = await app.connect({ launch: false })
    await app.waitContent()
    const st = await app.state()
    c.check('app shell renders offline at https://localhost/ (not a browser error page)', st.href === `${APP_URL}/` && st.textLength > 150 && st.text.includes('किसान'), { href: st.href, textLength: st.textLength })
    const online = await page.evaluate(() => navigator.onLine)
    const banner = await waitFor(() => page.evaluate(() => (document.querySelector('[data-testid="offline-banner"]')?.innerText || '').trim() || null), { timeout: 10000 })
    c.check('offline banner is visible', !!banner, { banner, navigatorOnLine: online })
    files.push((await ev.shot(id, 'offline-home')).file)
    const offline = {}
    for (const route of ['/', '/browse', '/mausam', '/msp', '/about']) {
      const t = app.mark()
      let s = null, err = null
      try { await app.goto(route, { settle: 9000 }); s = await app.state() } catch (e) { err = String(e.message || e).split('\n')[0] }
      const seen = app.since(t)
      const extra = s ? await page.evaluate(() => ({ banner: !!document.querySelector('[data-testid="offline-banner"]'), main: (document.querySelector('main')?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 500), temperatures: ((document.querySelector('main')?.innerText || '').match(/-?\d+°/g) || []).length, prices: ((document.querySelector('#root')?.innerText || '').match(/₹\s?[\d,]{3,}/g) || []).length, listings: document.querySelectorAll('a[href^="/listing/"]').length, shimmer: !!document.querySelector('.ticker-shimmer'), spinners: document.querySelectorAll('[role="status"]:not([data-testid="offline-banner"]), .animate-spin').length })) : null
      const name = route === '/' ? 'home' : route.slice(1)
      files.push((await ev.shot(id, `offline-${name}`)).file)
      const boundary = !!s && s.text.includes(ERROR_BOUNDARY_TEXT)
      const blank = !s || s.textLength < 60
      offline[route] = { navigationError: err, href: s?.href, textLength: s?.textLength, h1: s?.h1, errorBoundary: boundary, blank, pageErrors: seen.pageErrors.map((e) => e.text), ...extra }
      c.check(`${route} offline: content or an in-app state — not the ErrorBoundary, not blank`, !err && !boundary && !blank && s.href === APP_URL + route, { err, boundary, blank, href: s?.href, textLength: s?.textLength })
      notes.push(`${route}: ${extra ? `${s.textLength} chars; temperatures ${extra.temperatures}, ₹ values ${extra.prices}, listings ${extra.listings}, ticker still loading ${extra.shimmer}, spinners ${extra.spinners}` : 'did not load'}`)
    }
    files.push(ev.text(id, 'offline-pages.json', offline))
    const pid = appPid()
    const fatals = fatalsIn(adb(['logcat', '-d'], { timeout: 60000 }).out)
    c.check('no crash while offline', !!pid && fatals.length === 0, { pid, fatals: fatals.length })
    // Back online.
    await app.goto('/mausam', { settle: 1000 })
    if (method.startsWith('svc')) { sh('svc wifi enable'); sh('svc data enable') } else sh('cmd connectivity airplane-mode disable')
    const t0 = Date.now()
    // Watch two clocks: when Android itself has a working default network again, and when the
    // banner goes. The assertion is on the banner (≤ 15 s after airplane mode is switched off);
    // the network time says how much of that is the device and how much is the app.
    let netUpMs = null, goneMs = null
    while (Date.now() - t0 < 40000 && goneMs === null) {
      if (netUpMs === null && /Active default network: \d+/.test(sh('dumpsys connectivity').out.slice(0, 4000))) netUpMs = Date.now() - t0
      if (await page.evaluate(() => !document.querySelector('[data-testid="offline-banner"]'))) goneMs = Date.now() - t0
      else await sleep(400)
    }
    c.check('offline banner disappears within 15 s of going back online', goneMs !== null && goneMs <= 15000, { bannerGoneMs: goneMs, androidNetworkUpMs: netUpMs, appLagMs: goneMs !== null && netUpMs !== null ? goneMs - netUpMs : null })
    const took = goneMs
    // Let the network settle, then load the weather page again.
    await waitFor(() => /bytes from|1 received|1 packets received/.test(sh('ping -c 1 -W 2 8.8.8.8').out), { timeout: 30000, interval: 2000 })
    const t = app.mark()
    await app.goto('/mausam', { settle: 7000 })
    const temps = await page.evaluate(() => ((document.querySelector('main')?.innerText || '').match(/-?\d+°/g) || []).slice(0, 6))
    const seen = app.since(t)
    c.check('/mausam loads data again after reconnecting', temps.length > 0 && seen.responses.some((r) => /supabase\.co$|open-meteo\.com$/.test(r.host) && r.status === 200), { temps, hosts: dataHosts(seen.responses) })
    files.push((await ev.shot(id, 'online-again-mausam')).file)
    files.push(ev.text(id, 'reconnect.json', { method, bannerGoneAfterMs: took, androidNetworkUpMs: netUpMs, temperatures: temps, hosts: dataHosts(seen.responses) }))
    await clearLocation()
  } finally {
    sh('cmd connectivity airplane-mode disable'); sh('svc wifi enable'); sh('svc data enable')
  }
  return fromChecks(id, c, { files, notes: `offline via ${method}. What each page shows offline (input for batch 8B) — ${notes.join(' || ')}` })
})

test('T11', 'Back button', '/ → /browse → /bazaar, back, back lands on /; back on / leaves the app (launcher resumed) — adb keyevent 4 + dumpsys activity', true, async (id) => {
  await ensureApp()
  const c = new Checks()
  const trail = []
  await app.goto('/', { settle: 2500 })
  const pathNow = () => app.page.evaluate(() => location.pathname)
  const step = async (label) => { const p = await pathNow().catch(() => null); const r = resumedActivity(); trail.push({ label, path: p, resumed: `${r.pkg}/${r.activity}` }); return { p, r } }
  await step('start')
  // In-app (router) navigation, exactly as a person would: the tab bar, then a footer link.
  await app.page.click('[data-ks-tabbar] li:nth-child(2) button')
  await waitFor(async () => (await pathNow()) === '/browse', { timeout: 8000 })
  c.check('tab bar opens /browse', (await step('tapped Browse tab')).p === '/browse')
  await sleep(1500)
  await app.page.evaluate(() => document.querySelector('footer a[href="/bazaar"]').scrollIntoView({ block: 'center' }))
  await sleep(400)
  await app.page.click('footer a[href="/bazaar"]')
  await waitFor(async () => (await pathNow()) === '/bazaar', { timeout: 8000 })
  c.check('footer link opens /bazaar', (await step('tapped footer Bazaar link')).p === '/bazaar')
  await sleep(1200)
  key(4)
  await waitFor(async () => (await pathNow()) === '/browse', { timeout: 8000 })
  c.check('back #1 → /browse', (await step('back #1')).p === '/browse')
  key(4)
  await waitFor(async () => (await pathNow()) === '/', { timeout: 8000 })
  const s2 = await step('back #2')
  c.check('back #2 → /', s2.p === '/')
  c.check('app is still in front on /', s2.r.pkg === PKG, `${s2.r.pkg}/${s2.r.activity}`)
  const shot1 = await ev.shot(id, 'back-on-home')
  key(4)
  const left = await waitFor(() => { const r = resumedActivity(); return r.pkg && r.pkg !== PKG ? r : null }, { timeout: 10000 })
  trail.push({ label: 'back #3 (on /)', resumed: left ? `${left.pkg}/${left.activity}` : `${resumedActivity().pkg}` })
  c.check('back on / leaves the app (another activity is resumed)', !!left, left?.line || resumedActivity().line)
  c.check('the resumed activity is the launcher', !!left && /launcher|quickstep/i.test(`${left.pkg}${left.activity}`), left ? `${left.pkg}/${left.activity}` : '')
  const shot2 = await ev.shot(id, 'after-exit-launcher')
  await app.close()
  return fromChecks(id, c, { files: [shot1.file, shot2.file, ev.text(id, 'back-trail.json', trail)] })
})

test('T12', 'External intents', 'A real external https link leaves the WebView and returning shows the same in-app page; a mailto: and a tel: link dispatch their intents', true, async (id) => {
  await ensureApp()
  const c = new Checks()
  const files = []
  const sub = {}
  const comeBack = async () => {
    for (let i = 0; i < 4 && resumedActivity().pkg !== PKG; i++) { key(4); await sleep(1500) }
    let how = 'back key'
    if (resumedActivity().pkg !== PKG) { launchApp(); how = 'am start (back key did not return to the app)'; await sleep(2000) }
    return how
  }
  const handlers = (uri) => sh(`cmd package query-activities --brief -a android.intent.action.VIEW -d "${uri}"`).out.split('\n').map((l) => l.trim()).filter((l) => /^[\w.]+\/[\w.$]+$/.test(l))
  const leave = async (selector, shotName) => {
    adb(['logcat', '-c'])
    await tapElement(selector)
    // First contact tap on this device shows the platform rules sheet; accept it like a person would.
    const gate = await waitFor(() => app.page.evaluate(() => !!document.querySelector('[data-testid="buyer-compliance-accept"]')).catch(() => false), { timeout: 2500 })
    if (gate) await tapElement('[data-testid="buyer-compliance-accept"]')
    const r = await waitFor(() => { const a = resumedActivity(); return a.pkg && a.pkg !== PKG ? a : null }, { timeout: 10000 })
    await sleep(1500)
    files.push((await ev.shot(id, shotName)).file)
    const log = adb(['logcat', '-d'], { timeout: 60000 }).out.split('\n').filter((l) => /ActivityTaskManager.*START u0/.test(l)).map((l) => l.replace(/^.*START u0/, 'START u0').slice(0, 260))
    return { resumed: r ? `${r.pkg}/${r.activity}` : null, gateShown: !!gate, startLines: log.slice(0, 4) }
  }

  // (a) external https link — the footer's Open-Meteo credit is on every page.
  await app.goto('/about', { settle: 2000 })
  const httpsSel = 'footer a[href="https://open-meteo.com"]'
  const httpsHandlers = handlers('https://open-meteo.com')
  if (!(await app.page.$(httpsSel))) sub.https = { status: NOTRUN, reason: 'no external https link found on /about' }
  else if (!httpsHandlers.length) sub.https = { status: NOTRUN, reason: 'no browser on this device image can open https links' }
  else {
    const before = await app.state()
    const res = await leave(httpsSel, 'https-left-app')
    const how = await comeBack()
    await sleep(1500)
    const after = await app.state().catch(() => null)
    const ok = !!res.resumed && !!after && after.path === before.path && after.href.startsWith(APP_URL)
    sub.https = { status: ok ? PASS : FAIL, link: 'https://open-meteo.com', handlers: httpsHandlers.slice(0, 3), ...res, returnedBy: how, pathBefore: before.path, pathAfter: after?.path, hrefAfter: after?.href }
    c.check('https link: leaves the WebView (another activity is resumed)', !!res.resumed, res.resumed || resumedActivity().line)
    c.check('https link: returning shows the same in-app page', !!after && after.path === before.path && after.href.startsWith(APP_URL), { before: before.path, after: after?.href, how })
    files.push((await ev.shot(id, 'https-back-in-app')).file)
  }

  // (b) mailto:
  await app.goto('/contact', { settle: 2000 })
  const mailSel = 'main a[href^="mailto:"]'
  const mailHandlers = handlers('mailto:hello@kissansahyog.com')
  if (!(await app.page.$(mailSel))) sub.mailto = { status: NOTRUN, reason: 'no mailto: link on /contact' }
  else if (!mailHandlers.length) sub.mailto = { status: NOTRUN, reason: 'this device image has no mail app, so a mailto: intent has nothing to resolve to (Capacitor swallows ActivityNotFoundException)' }
  else {
    const res = await leave(mailSel, 'mailto-left-app')
    sub.mailto = { status: res.resumed ? PASS : FAIL, handlers: mailHandlers.slice(0, 3), ...res }
    c.check('mailto: link dispatches (a mail activity or chooser is resumed)', !!res.resumed, res.resumed || resumedActivity().line)
    sub.mailto.returnedBy = await comeBack()
  }

  // (c) tel:
  let telRoute = null
  for (const route of ['/resources', '/yojana/central', '/kisan-mela']) {
    await ensureApp(); await app.goto(route, { settle: 3500 })
    if (await app.page.$('a[href^="tel:"]')) { telRoute = route; break }
  }
  const telHandlers = handlers('tel:1551')
  if (!telRoute) sub.tel = { status: NOTRUN, reason: 'no tel: link found on /resources, /yojana/central or /kisan-mela' }
  else if (!telHandlers.length) sub.tel = { status: NOTRUN, reason: 'this device image has no dialer' }
  else {
    const res = await leave('a[href^="tel:"]', 'tel-left-app')
    sub.tel = { status: res.resumed ? PASS : FAIL, page: telRoute, handlers: telHandlers.slice(0, 3), ...res }
    c.check('tel: link dispatches (the dialer is resumed)', !!res.resumed && /dialer|phone|telecom|contacts/i.test(res.resumed), res.resumed || resumedActivity().line)
    sub.tel.returnedBy = await comeBack()
  }
  files.push(ev.text(id, 'intents.json', sub))
  const skipped = Object.entries(sub).filter(([, v]) => v.status === NOTRUN)
  const result = fromChecks(id, c, { files, notes: Object.entries(sub).map(([k, v]) => `${k}: ${v.status}${v.reason ? ` (${v.reason})` : v.resumed ? ` → ${v.resumed}` : ''}`).join(' | ') })
  // A sub-check that could not run keeps the whole test from being called a pass.
  if (result.status === PASS && skipped.length) result.status = NOTRUN
  if (c.items.length === 0) { result.status = NOTRUN }
  return result
})

test('T13', 'Location', 'With location permission granted and the emulator position set, "Share my location" shows that place; with permission refused the app shows its fallback state without crashing', true, async (id) => {
  await ensureApp()
  const c = new Checks()
  const files = []
  const detail = {}
  sh(`pm grant ${PKG} android.permission.ACCESS_FINE_LOCATION`); sh(`pm grant ${PKG} android.permission.ACCESS_COARSE_LOCATION`)
  sh('cmd location set-location-enabled true')
  const fix = () => adb(['emu', 'geo', 'fix', String(TEST_PLACE.lng), String(TEST_PLACE.lat)]) // longitude first
  const emu = fix()
  detail.geoFix = (emu.out + emu.err).trim()
  await app.goto('/about', { settle: 500 })
  await clearLocation()
  await app.goto('/mausam', { settle: 2500 })
  const keepFixing = setInterval(fix, 2500)
  try {
    // Permission is already granted, so the page may take the fix by itself; otherwise press the button.
    const share = await app.page.$('[data-testid="location-share"]')
    detail.pressedShare = !!share
    if (share) await app.page.click('[data-testid="location-share"]').catch(() => {})
    const got = await waitFor(() => app.page.evaluate(() => { const b = document.querySelector('[data-testid="location-banner"]'); return b && b.getAttribute('data-source') === 'device' ? { text: b.innerText.replace(/\s+/g, ' ').trim(), saved: JSON.parse(localStorage.getItem('ks_location_v1') || 'null') } : null }), { timeout: 30000, interval: 700 })
    detail.granted = got || { notice: await app.page.evaluate(() => document.querySelector('[data-testid="location-notice"]')?.innerText || null), saved: await app.page.evaluate(() => localStorage.getItem('ks_location_v1')) }
    c.check('app shows a location taken from the device', !!got, detail.granted)
    c.check(`saved position matches the emulator fix (${TEST_PLACE.lat}, ${TEST_PLACE.lng})`, !!got?.saved && Math.abs(got.saved.lat - TEST_PLACE.lat) < 0.02 && Math.abs(got.saved.lng - TEST_PLACE.lng) < 0.02, got?.saved)
    c.check('the place shown is Sagar (सागर)', !!got && /सागर|Sagar/i.test(`${got.text} ${got.saved?.label}`), got?.text)
    files.push((await ev.shot(id, 'location-granted')).file)
  } finally { clearInterval(keepFixing) }

  // Refused: revoking a runtime permission stops the app, so relaunch and ask again.
  await app.close()
  sh(`pm revoke ${PKG} android.permission.ACCESS_FINE_LOCATION`); sh(`pm revoke ${PKG} android.permission.ACCESS_COARSE_LOCATION`)
  await sleep(1500)
  forceStop(); adb(['logcat', '-c']); launchApp(); await sleep(3000)
  await app.connect({ launch: false })
  await app.goto('/about', { settle: 500 })
  await clearLocation()
  await app.goto('/mausam', { settle: 2500 })
  const btn = (await app.page.$('[data-testid="location-share"]')) ? '[data-testid="location-share"]' : null
  c.check('the "Share my location" card is offered again', !!btn)
  if (btn) {
    await app.page.click(btn)
    // Android's own permission dialog: answer "Don't allow".
    const dialog = await waitFor(() => { const xml = uiDump(); return uiFind(xml, /^Don.?t allow$/i) || uiFind(xml, /^Deny$/i) }, { timeout: 12000, interval: 1000 })
    detail.systemDialog = dialog ? dialog.text : 'no system dialog appeared'
    if (dialog) { files.push((await ev.shot(id, 'permission-dialog')).file); tap(dialog.x, dialog.y) }
    const state = await waitFor(() => app.page.evaluate(() => { const n = document.querySelector('[data-testid="location-notice"]'); const f = document.querySelector('[data-testid="location-type"], [data-testid="location-picker"]'); return n || f ? { notice: n?.innerText.trim() || null, typeForm: !!document.querySelector('[data-testid="location-type"]'), banner: !!document.querySelector('[data-testid="location-banner"]') } : null }), { timeout: 25000, interval: 700 })
    detail.refused = state
    c.check('refused: the app shows its denied / fallback state (a notice and the type-your-village form)', !!state && !!state.notice && !state.banner, state)
  }
  const st = await app.state()
  const fatals = fatalsIn(adb(['logcat', '-d'], { timeout: 60000 }).out)
  c.check('no crash and no ErrorBoundary after refusing', !!appPid() && fatals.length === 0 && !st.text.includes(ERROR_BOUNDARY_TEXT), { pid: appPid(), fatals: fatals.length })
  files.push((await ev.shot(id, 'location-refused')).file)
  await clearLocation()
  files.push(ev.text(id, 'location.json', detail))
  return fromChecks(id, c, { files, notes: `refusal given through ${detail.systemDialog === 'no system dialog appeared' ? 'no dialog (WebView answered directly)' : `Android's permission dialog ("${detail.systemDialog}")`}` })
})

test('T14', 'Keyboard + search', 'On /search a tap opens the keyboard, the input stays inside the visual viewport, and a query known to have results renders results', true, async (id) => {
  await ensureApp()
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'search-index.json'), 'utf8'))
  const hay = (i) => `${i.title_hi || ''} ${i.title_en || ''} ${i.subtitle_hi || ''} ${i.subtitle_en || ''} ${i.keywords || ''}`.toLowerCase()
  const query = ['wheat', 'soybean', 'tractor'].find((q) => index.some((i) => hay(i).includes(q)))
  const c = new Checks()
  c.check('a query with known results exists in public/search-index.json', !!query, query ? `${query}: ${index.filter((i) => hay(i).includes(query)).length} items` : 'none')
  if (!query) return fromChecks(id, c)
  await app.goto('/search', { settle: 2000 })
  const sel = 'main input[type="search"]'
  await tapElement(sel)
  const shown = await waitFor(() => /mInputShown=true|isInputViewShown=true|mIsInputViewShown=true/.test(sh('dumpsys input_method').out), { timeout: 12000, interval: 800 })
  const ime = (sh('dumpsys input_method').out.match(/mInputShown=\w+|isInputViewShown=\w+|mIsInputViewShown=\w+/g) || []).join(' ')
  c.check('keyboard opens (dumpsys input_method)', !!shown, ime)
  await sleep(1500)
  const vp = await app.page.evaluate((s) => { const q = document.querySelector(s).getBoundingClientRect(); const v = window.visualViewport; return { focused: document.activeElement === document.querySelector(s), inputTop: q.top, inputBottom: q.bottom, viewportTop: v.offsetTop, viewportHeight: v.height, innerHeight: window.innerHeight, screenHeight: screen.height } }, sel)
  c.check('the input has focus', vp.focused)
  c.check('the input is inside the visual viewport (not hidden by the keyboard)', vp.inputTop >= vp.viewportTop - 0.5 && vp.inputBottom <= vp.viewportTop + vp.viewportHeight + 0.5, vp)
  c.check('the viewport shrank for the keyboard', vp.viewportHeight < vp.screenHeight * 0.8, { viewportHeight: vp.viewportHeight, screenHeight: vp.screenHeight })
  const files = [(await ev.shot(id, 'keyboard-open')).file]
  sh(`input text ${query}`)
  await sleep(1200)
  const typed = await app.page.evaluate((s) => document.querySelector(s).value, sel)
  c.check('typed text reaches the input', String(typed).toLowerCase() === query, typed)
  key(66) // Enter submits the form
  const results = await waitFor(() => app.page.evaluate(() => { const n = document.querySelectorAll('main section ul li').length; return n > 0 ? { items: n, groups: document.querySelectorAll('main section').length, url: location.pathname + location.search } : null }), { timeout: 20000, interval: 700 })
  c.check('results render', !!results && results.items > 0, results || await app.page.evaluate(() => location.href))
  // The on-screen keyboard may capitalise the first letter (Wheat); search is case-insensitive.
  c.check('URL carries the query', !!results && results.url.toLowerCase().includes(`q=${query}`), results?.url)
  await sleep(800)
  files.push((await ev.shot(id, 'results')).file)
  key(111) // hide the keyboard
  files.push(ev.text(id, 'keyboard.json', { query, ime, viewport: vp, results }))
  return fromChecks(id, c, { files, notes: `query "${query}" → ${results?.items ?? 0} results` })
})

test('T15', 'Persistence', 'A localStorage value set over CDP survives force-stop + relaunch (then it is deleted)', true, async (id) => {
  await ensureApp()
  const KEY = 'ks_test_probe_8a'
  const value = `probe-${Date.now()}`
  await app.goto('/about', { settle: 500 })
  await app.page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, value])
  await sleep(2500) // let the WebView flush storage to disk
  await app.close()
  forceStop()
  await sleep(1500)
  const stopped = !appPid()
  launchApp(); await sleep(3000)
  await app.connect({ launch: false })
  await app.waitContent()
  const read = await app.page.evaluate((k) => localStorage.getItem(k), KEY)
  await app.page.evaluate((k) => localStorage.removeItem(k), KEY)
  const after = await app.page.evaluate((k) => localStorage.getItem(k), KEY)
  const c = new Checks()
  c.check('app process was really stopped', stopped)
  c.check('value survived force-stop + relaunch', read === value, { wrote: value, read })
  c.check('probe key deleted afterwards', after === null)
  return fromChecks(id, c, { files: [ev.text(id, 'persistence.json', { key: KEY, wrote: value, read, afterDelete: after })] })
})

test('T16', 'Icon + splash', 'Launcher icons at all densities + adaptive-icon XML exist and are packaged; launcher and splash screenshots captured for a person to judge', true, async (id) => {
  const c = new Checks()
  const res = path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
  const want = []
  for (const d of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) for (const f of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) want.push(`mipmap-${d}/${f}`)
  want.push('mipmap-anydpi-v26/ic_launcher.xml', 'mipmap-anydpi-v26/ic_launcher_round.xml', 'values/ic_launcher_background.xml', 'drawable/splash.png', 'drawable/splash_logo.png')
  const missing = want.filter((f) => !fs.existsSync(path.join(res, f)))
  c.check(`${want.length} icon / splash source files exist`, missing.length === 0, missing)
  const xml = fs.existsSync(path.join(res, 'mipmap-anydpi-v26', 'ic_launcher.xml')) ? fs.readFileSync(path.join(res, 'mipmap-anydpi-v26', 'ic_launcher.xml'), 'utf8') : ''
  c.check('adaptive-icon XML has a background and a foreground', /<adaptive-icon/.test(xml) && /<background/.test(xml) && /<foreground/.test(xml))
  const badging = spawnSync(aapt2(), ['dump', 'badging', APK], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).stdout || ''
  const icons = [...badging.matchAll(/^application-icon-(\d+):'([^']+)'/gm)].map((m) => `${m[1]}: ${m[2]}`)
  c.check('the APK declares launcher icons for the density buckets', icons.length >= 5, icons)
  const files = []
  // Splash: capture frames right after a cold start.
  await app.close(); forceStop(); await sleep(800)
  sh(`am start -n ${PKG}/.MainActivity`)
  for (const n of [1, 2, 3]) { try { files.push((await ev.shot(id, `splash-frame-${n}`)).file) } catch { /* frame missed */ } }
  await sleep(3000)
  files.push((await ev.shot(id, 'after-splash')).file)
  // Launcher: home → open the app list → look for the app's label.
  key(3); await sleep(1200)
  sh('input swipe 540 1900 540 500 250'); await sleep(1800)
  let label = uiFind(uiDump(), new RegExp(`^${APP_LABEL}$`))
  if (!label) { sh('input swipe 540 1700 540 700 250'); await sleep(1200); label = uiFind(uiDump(), new RegExp(`^${APP_LABEL}$`)) }
  files.push((await ev.shot(id, 'launcher-app-list')).file)
  c.check(`the launcher lists an app labelled "${APP_LABEL}"`, !!label, label ? `at ${label.x},${label.y}` : 'label not found in the app list')
  key(3)
  files.push(ev.text(id, 'icons.json', { sourceFiles: want, missing, apkIcons: icons, launcherLabel: label }))
  return fromChecks(id, c, { files, passStatus: HUMAN, notes: 'File checks passed; whether the icon and splash LOOK right needs a person (see launcher-app-list.jpg and splash-frame-*.jpg).' })
})

test('T17', 'Server calls + CORS', '(a) no raw relative fetch() to a server function is left in src/; (b) functions/_middleware.js answers OPTIONS/GET with the exact origin for the two app origins and adds nothing for other origins', false, async (id) => {
  const c = new Checks()
  // (a)
  const hits = []
  const walk = (d) => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(jsx?|mjs)$/.test(n)) fs.readFileSync(p, 'utf8').split(/\r?\n/).forEach((line, i) => { for (const m of line.matchAll(/fetch\(\s*(['"`])(\/[^'"`$?]*)/g)) hits.push({ file: rel(p), line: i + 1, path: m[2] }) }) } }
  walk(path.join(ROOT, 'src'))
  const bad = hits.filter((h) => !RELATIVE_FETCH_ALLOWLIST.some((a) => h.path.startsWith(a)))
  c.check('no raw relative fetch() to a server function in src/', bad.length === 0, bad)
  const viaApi = []
  const walk2 = (d) => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk2(p); else if (/\.(jsx?|mjs)$/.test(n)) fs.readFileSync(p, 'utf8').split(/\r?\n/).forEach((line, i) => { if (/fetch\(apiUrl\(/.test(line)) viaApi.push(`${rel(p)}:${i + 1}`) }) } }
  walk2(path.join(ROOT, 'src'))
  c.check('server-function calls go through apiUrl()', viaApi.length >= 5, viaApi)
  // (b)
  const mw = await import(pathToFileURL(path.join(ROOT, 'functions', '_middleware.js')).href)
  const call = async (method, origin) => {
    const headers = new Headers(); if (origin) headers.set('origin', origin)
    if (method === 'OPTIONS') { headers.set('access-control-request-method', 'POST'); headers.set('access-control-request-headers', 'content-type') }
    let nextCalled = false
    const res = await mw.onRequest({ request: new Request('https://kissansahyog.com/api/feedback', { method, headers }), next: async () => { nextCalled = true; return new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } }) } })
    return { method, origin: origin || null, status: res.status, nextCalled, allowOrigin: res.headers.get('access-control-allow-origin'), allowMethods: res.headers.get('access-control-allow-methods'), allowHeaders: res.headers.get('access-control-allow-headers'), vary: res.headers.get('vary') }
  }
  const cases = []
  for (const origin of ['https://localhost', 'capacitor://localhost']) {
    const o = await call('OPTIONS', origin); cases.push(o)
    c.check(`OPTIONS from ${origin}: 204, Allow-Origin is that exact origin, upstream not called`, o.status === 204 && o.allowOrigin === origin && !o.nextCalled && /POST/.test(o.allowMethods || '') && /content-type/i.test(o.allowHeaders || '') && /Origin/i.test(o.vary || ''), o)
    const g = await call('GET', origin); cases.push(g)
    c.check(`GET from ${origin}: upstream answer + Allow-Origin is that exact origin`, g.status === 200 && g.allowOrigin === origin && g.nextCalled && /Origin/i.test(g.vary || ''), g)
    const p = await call('POST', origin); cases.push(p)
    c.check(`POST from ${origin}: Allow-Origin is that exact origin`, p.allowOrigin === origin && p.nextCalled, p)
  }
  for (const origin of ['https://evil.example', 'https://localhost.evil.example', 'http://localhost', 'https://localhost:8080', null]) {
    for (const method of ['OPTIONS', 'GET']) {
      const r = await call(method, origin); cases.push(r)
      c.check(`${method} from ${origin || 'no Origin'}: no Access-Control headers, passed straight through`, r.allowOrigin === null && r.allowMethods === null && r.allowHeaders === null && r.nextCalled, r)
    }
  }
  c.check('the middleware never answers with "*"', cases.every((x) => x.allowOrigin !== '*'))
  return fromChecks(id, c, { files: [ev.text(id, 'fetch-scan.json', { relativeFetches: hits, allowlist: RELATIVE_FETCH_ALLOWLIST, viaApiUrl: viaApi }), ev.text(id, 'cors-cases.json', cases)], notes: 'Live end-to-end CORS against production is NOT-RUN: functions/_middleware.js only takes effect after a deploy, which this batch does not do.' })
})

test('T18', 'Web regression', '(a) apiUrl()/isNative() are inert without Capacitor; (b) the web build succeeds; (c) main-chunk size before vs after is reported; (d) vite preview in desktop Chromium loads, registers a service worker, no console errors', false, async (id) => {
  const c = new Checks()
  const files = []
  const vite = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
  // (a)
  const api = await import(pathToFileURL(path.join(ROOT, 'src', 'lib', 'apiBase.js')).href)
  const nat = await import(pathToFileURL(path.join(ROOT, 'src', 'lib', 'native.js')).href)
  const a = { noWindow: { isNative: nat.isNative(), apiUrl: api.apiUrl('/api/feedback') } }
  globalThis.window = { location: { origin: 'https://example.test', href: 'https://example.test/x' } }
  a.windowWithoutCapacitor = { isNative: nat.isNative(), apiUrl: api.apiUrl('/api/feedback'), publicOrigin: nat.publicOrigin() }
  globalThis.window.Capacitor = { isNativePlatform: () => true }
  a.windowWithCapacitor = { isNative: nat.isNative(), apiUrl: api.apiUrl('/api/feedback') }
  delete globalThis.window
  c.check("(a) without window.Capacitor: isNative() === false and apiUrl('/api/feedback') === '/api/feedback'", a.windowWithoutCapacitor.isNative === false && a.windowWithoutCapacitor.apiUrl === '/api/feedback' && a.noWindow.isNative === false && a.noWindow.apiUrl === '/api/feedback', a)
  c.check('(a) on the web, share links keep the page\'s own origin', a.windowWithoutCapacitor.publicOrigin === 'https://example.test')
  c.check('(a) control: with Capacitor present the same call targets the live site', a.windowWithCapacitor.isNative === true && a.windowWithCapacitor.apiUrl === 'https://kissansahyog.com/api/feedback', a.windowWithCapacitor)
  files.push(ev.text(id, 'a-native-helpers.json', a))

  // (b) the normal web build (staging mode, as `npm run build`), into a scratch folder so the
  // native dist/ is left alone.
  const webOut = path.join(ROOT, 'node_modules', '.ks-web-check')
  fs.rmSync(webOut, { recursive: true, force: true })
  const bLog = path.join(LOG_DIR, 'T18-web-build.log')
  const fd = fs.openSync(bLog, 'w')
  const b = spawnSync(`npm run build -- --outDir "${webOut}" --emptyOutDir`, { cwd: ROOT, shell: true, stdio: ['ignore', fd, fd], timeout: 10 * 60 * 1000, env: { ...process.env, KS_NATIVE: '' } })
  fs.closeSync(fd)
  const webFiles = fs.existsSync(webOut) ? fs.readdirSync(webOut) : []
  c.check('(b) npm run build (web) exits 0', b.status === 0, `exit ${b.status}`)
  c.check('(b) the web build still emits a service worker and a web manifest', webFiles.includes('sw.js') && webFiles.includes('manifest.webmanifest'), webFiles.filter((f) => /sw|manifest|workbox/.test(f)))

  // (c) main chunk before/after, built side by side in a temporary git worktree of the
  // staging commit: once as committed there ("before"), once with this working tree's
  // src/, index.html and vite.config.js copied in ("after"). Same folder, same placeholder env.
  const wt = path.join(ROOT, '.ks-baseline')
  const git = (args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' })
  const base = (git(['rev-parse', '--verify', '--quiet', 'staging']).stdout || git(['merge-base', 'HEAD', 'origin/staging']).stdout || '').trim()
  const sizes = { baseCommit: base.slice(0, 7) }
  const env = { ...process.env, KS_NATIVE: '', VITE_SUPABASE_URL: 'https://placeholder.supabase.co', VITE_SUPABASE_ANON_KEY: 'placeholder-anon-key' }
  const measure = (out) => {
    const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8')
    const main = (html.match(/<script[^>]+type="module"[^>]+src="\/(assets\/index-[^"]+\.js)"/) || [])[1]
    const buf = fs.readFileSync(path.join(out, main))
    const js = fs.readdirSync(path.join(out, 'assets')).filter((f) => f.endsWith('.js'))
    return { mainChunk: main, bytes: buf.length, gzipBytes: zlib.gzipSync(buf).length, jsFiles: js.length, jsTotalBytes: js.reduce((n, f) => n + fs.statSync(path.join(out, 'assets', f)).size, 0) }
  }
  try {
    git(['worktree', 'remove', '--force', wt]); fs.rmSync(wt, { recursive: true, force: true }); git(['worktree', 'prune'])
    const add = git(['worktree', 'add', '--detach', wt, base])
    if (add.status !== 0) throw new Error(`git worktree add failed: ${add.stderr.trim()}`)
    const build = (label) => {
      const out = path.join(wt, `dist-${label}`)
      const r = spawnSync(process.execPath, [vite, 'build', wt, '--mode', 'staging', '--outDir', out, '--emptyOutDir'], { cwd: ROOT, encoding: 'utf8', env, timeout: 10 * 60 * 1000 })
      fs.writeFileSync(path.join(LOG_DIR, `T18-size-${label}.log`), (r.stdout || '') + (r.stderr || ''))
      if (r.status !== 0) throw new Error(`${label} build failed (exit ${r.status})`)
      return measure(out)
    }
    sizes.before = build('before')
    fs.rmSync(path.join(wt, 'src'), { recursive: true, force: true })
    fs.cpSync(path.join(ROOT, 'src'), path.join(wt, 'src'), { recursive: true })
    for (const f of ['index.html', 'vite.config.js']) fs.copyFileSync(path.join(ROOT, f), path.join(wt, f))
    sizes.after = build('after')
    sizes.delta = { bytes: sizes.after.bytes - sizes.before.bytes, gzipBytes: sizes.after.gzipBytes - sizes.before.gzipBytes, jsTotalBytes: sizes.after.jsTotalBytes - sizes.before.jsTotalBytes, jsFiles: sizes.after.jsFiles - sizes.before.jsFiles }
  } catch (e) { sizes.error = String(e.message || e) } finally {
    git(['worktree', 'remove', '--force', wt]); fs.rmSync(wt, { recursive: true, force: true }); git(['worktree', 'prune'])
  }
  c.check('(c) main-chunk size measured before and after', !!sizes.before && !!sizes.after, sizes.error || `${sizes.before?.bytes} → ${sizes.after?.bytes} bytes`)
  files.push(ev.text(id, 'c-bundle-size.json', sizes))

  // (d) the web build in desktop Chromium.
  const d = { consoleErrors: [], pageErrors: [] }
  if (b.status === 0) {
    const port = 4179
    const preview = spawn(process.execPath, [vite, 'preview', '--outDir', webOut, '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' })
    let browser
    try {
      await waitFor(async () => { try { return (await fetch(`http://127.0.0.1:${port}/`)).ok } catch { return false } }, { timeout: 30000, interval: 500 })
      browser = await chromium.launch()
      const page = await browser.newPage()
      page.on('console', (m) => { if (m.type() === 'error') d.consoleErrors.push(`${m.text()} @ ${m.location()?.url || ''}`) })
      page.on('pageerror', (e) => d.pageErrors.push(String(e.message || e)))
      const resp = await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load', timeout: 45000 })
      d.status = resp?.status()
      d.serviceWorker = await page.evaluate(() => Promise.race([navigator.serviceWorker.ready.then((r) => r.active?.scriptURL || r.installing?.scriptURL || 'registered'), new Promise((r) => setTimeout(() => r(null), 25000))]))
      await page.waitForTimeout(3000)
      d.text = await page.evaluate(() => (document.querySelector('#root')?.innerText || '').trim().length)
      d.nativeClass = await page.evaluate(() => document.documentElement.classList.contains('native-app'))
      d.bodyPaddingTop = await page.evaluate(() => getComputedStyle(document.body).paddingTop)
      await page.screenshot({ path: path.join(ev.dir(id), 'd-web-preview.jpg'), type: 'jpeg', quality: 60 }); files.push(rel(path.join(ev.dir(id), 'd-web-preview.jpg')))
    } catch (e) { d.error = String(e.message || e).split('\n')[0] } finally { await browser?.close().catch(() => {}); preview.kill() }
  } else d.error = 'web build failed'
  c.check('(d) page loads (HTTP 200, content rendered)', d.status === 200 && d.text > 150, { status: d.status, text: d.text, error: d.error })
  c.check('(d) a service worker registers', !!d.serviceWorker, d.serviceWorker)
  c.check('(d) no console errors and no page errors', !d.error && d.consoleErrors.length === 0 && d.pageErrors.length === 0, { consoleErrors: d.consoleErrors, pageErrors: d.pageErrors })
  c.check('(d) the website does not get the native-app class or its padding', d.nativeClass === false && d.bodyPaddingTop === '0px', { nativeClass: d.nativeClass, bodyPaddingTop: d.bodyPaddingTop })
  files.push(ev.text(id, 'd-web-preview.json', d))
  fs.rmSync(webOut, { recursive: true, force: true })
  const kb = (n) => `${(n / 1024).toFixed(1)} KB`
  return fromChecks(id, c, { files, notes: sizes.before && sizes.after ? `main chunk ${kb(sizes.before.bytes)} → ${kb(sizes.after.bytes)} (${sizes.delta.bytes >= 0 ? '+' : ''}${sizes.delta.bytes} B; gzip ${sizes.delta.gzipBytes >= 0 ? '+' : ''}${sizes.delta.gzipBytes} B), measured in a temporary worktree of staging ${sizes.baseCommit}` : `bundle size not measured: ${sizes.error}` })
})

// Negative control (T19): a deliberately false assertion, run through the same machinery.
if (NEGATIVE) {
  test('NEG', 'Negative control — deliberately false assertion', 'The home page contains the text "ZZZ_NOT_PRESENT" (it does not: this test MUST be reported RAN-FAILED)', true, async (id) => {
    await ensureApp()
    await app.goto('/', { settle: 1500 })
    const body = await app.page.evaluate(() => document.body.innerText)
    const c = new Checks()
    c.check('home page text contains "ZZZ_NOT_PRESENT"', body.includes('ZZZ_NOT_PRESENT'), `text length ${body.length}`)
    return fromChecks(id, c, { files: [(await ev.shot(id, 'home')).file] })
  })
}

// =====================================================================================
// RUN
// =====================================================================================
const selected = TESTS.filter((t) => !ONLY || ONLY.includes(t.id))
// test-android.sh sets KS_NO_DEVICE_REASON when the emulator could not be started.
const device = process.env.KS_NO_DEVICE_REASON ? { ok: false, reason: process.env.KS_NO_DEVICE_REASON } : deviceState()
if (device.ok) {
  run.device = { serial: process.env.ANDROID_SERIAL || adb(['get-serialno']).out.trim(), sdk: sh('getprop ro.build.version.sdk').out.trim(), model: sh('getprop ro.product.model').out.trim(), abi: sh('getprop ro.product.cpu.abi').out.trim(), size: (sh('wm size').out.match(/\d+x\d+/) || [])[0] || null }
} else run.device = { serial: process.env.ANDROID_SERIAL || null, unreachable: device.reason }

// Logcat for the whole run (requirement: fail on any FATAL EXCEPTION of the app).
const logcatFile = path.join(LOG_DIR, `logcat-${path.basename(OUT, '.json')}.txt`)
let logcat = null
if (device.ok) {
  adb(['logcat', '-c'])
  const fd = fs.openSync(logcatFile, 'w')
  logcat = spawn(ADB, ['logcat', '-v', 'threadtime'], { stdio: ['ignore', fd, 'ignore'] })
}

const results = []
const save = () => fs.writeFileSync(OUT, JSON.stringify({ run, tests: results }, null, 2) + '\n')
for (const t of selected) {
  const started = Date.now()
  process.stdout.write(`${t.id} ${t.name} … `)
  let r
  if (t.needsDevice && !device.ok) r = notRun(`no device: ${device.reason}`)
  else {
    try { r = await t.fn(t.id) } catch (e) {
      r = { status: FAIL, notes: `test threw: ${String(e?.message || e).split('\n')[0]}`, evidenceFiles: [ev.text(t.id, 'error.txt', String(e?.stack || e))] }
    }
  }
  const rec = { id: t.id, name: t.name, status: r.status, assertion: t.assertion, evidenceFiles: r.evidenceFiles || [], durationMs: Date.now() - started, notes: r.notes || '' }
  // A pass needs proof on disk.
  if (rec.status === PASS && (rec.evidenceFiles.length === 0 || rec.evidenceFiles.some((f) => !fs.existsSync(path.join(ROOT, f))))) { rec.status = FAIL; rec.notes = `evidence file missing | ${rec.notes}` }
  results.push(rec)
  save()
  console.log(`${rec.status} (${(rec.durationMs / 1000).toFixed(1)}s)${rec.status === PASS ? '' : ` — ${rec.notes.slice(0, 300)}`}`)
}

await app.close()
if (device.ok) { sh('cmd connectivity airplane-mode disable'); key(3) }
if (logcat) {
  await sleep(1500)
  logcat.kill()
  await sleep(500)
  const fatals = fatalsIn(fs.readFileSync(logcatFile, 'utf8'))
  run.fatalExceptions = fatals.length
  if (fatals.length) fs.writeFileSync(path.join(LOG_DIR, `fatal-${path.basename(OUT, '.json')}.txt`), fatals.join('\n\n----\n\n'))
}
run.finishedAt = new Date().toISOString()
// How often the WebView connection had to be re-attached (see AppSession in lib.mjs).
run.cdpReconnects = app.reconnects
save()

const n = (s) => results.filter((r) => r.status === s).length
console.log(`\n${results.length} tests — ${n(PASS)} RAN-PASSED, ${n(FAIL)} RAN-FAILED, ${n(NOTRUN)} NOT-RUN, ${n(HUMAN)} HUMAN-REVIEW`)
if (run.fatalExceptions) console.log(`FATAL EXCEPTION in logcat for ${PKG}: ${run.fatalExceptions} — the run fails`)
console.log(`results: ${rel(OUT)}`)
process.exit(n(FAIL) > 0 || run.fatalExceptions ? 1 : 0)
