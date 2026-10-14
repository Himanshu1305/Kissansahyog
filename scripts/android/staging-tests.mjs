// Batch 8B — the STAGING flavour suite (S1–S10, O1–O8) for run-tests.mjs.
// Writes go ONLY to the staging project, only through the app's own UI, and every account /
// listing / message created here is recorded in docs/review/batch8b/staging-test-data.json.
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from 'sharp'
import { ROOT, OUT_DIR, LOG_DIR, APK, APK_DIR, WIN, JDK, sleep, rel, adb, sh, airplane, appPid, forceStop, launchApp, resumedActivity, waitFor, uiDump, uiFind, tap, key, Checks } from './lib.mjs'
import { PKG, PROD_PKG, STAGING_PKG, APP_URL, TEST_PLACE, LOCATION_KEYS, PROD_REF, STAGING_REF, FLAVOR } from './expected.mjs'
import { strings } from '../../src/lib/i18n/strings.js'
import { runO1, runO1b, runO8a } from './offline-unit.mjs'

const DATA_FILE = path.join(OUT_DIR, 'staging-test-data.json')
const STAMP = Date.now()
const S6 = String(STAMP).slice(-6)
// Fake but valid 10-digit mobiles (first digit 9 / 8, the rest from the run's timestamp).
const ACCT = {
  A: { name: `KSTEST Kisan A ${S6}`, email: `kstest-${STAMP}-a@example.com`, phone: `9${String(STAMP).slice(-9)}`, password: `Kstest-${STAMP}-a` },
  B: { name: `KSTEST Kisan B ${S6}`, email: `kstest-${STAMP}-b@example.com`, phone: `8${String(STAMP).slice(-9)}`, password: `Kstest-${STAMP}-b` },
}
const UNREGISTERED = `6${String(STAMP).slice(-9)}` // valid format, never registered
const MARKER = `KSTEST ${S6}`
const state = { listingId: null, photoUrl: null, shown: {} }
const PROD_APK = path.join(APK_DIR, 'ks-production.apk')
const STAGING_APK = path.join(APK_DIR, 'ks-staging.apk')
const LOCAL_APK = path.join(APK_DIR, 'ks-staging-local.apk')

function record(kind, data) {
  let file = { note: 'Everything Batch 8B tests created in the STAGING project, for later cleanup by someone with database access. Names / titles start with KSTEST; mobiles are fake. Passwords are not recorded.', created: [] }
  try { file = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) } catch { /* new file */ }
  file.created.push({ at: new Date().toISOString(), kind, ...data })
  fs.writeFileSync(DATA_FILE, JSON.stringify(file, null, 2) + '\n')
}
const sha256 = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')
const npmRun = (script, logName, env = {}) => {
  const logFile = path.join(LOG_DIR, logName)
  const fd = fs.openSync(logFile, 'w')
  const r = spawnSync(`npm run ${script}`, { cwd: ROOT, shell: true, stdio: ['ignore', fd, fd], timeout: 30 * 60 * 1000, env: { ...process.env, ...env } })
  fs.closeSync(fd)
  return { status: r.status, log: fs.readFileSync(logFile, 'utf8') }
}

export function registerStaging(ctx) {
  const { test, app, ev, notRun, fromChecks, PASS, FAIL, NOTRUN, ensureApp, tapElement, setLocation, clearLocation, fatalsIn, aapt2, TESTS, shared, SKIP_BUILD } = ctx
  const page = () => app.page
  const session = () => page().evaluate(() => { try { return JSON.parse(localStorage.getItem('ks_session_v1') || 'null') } catch { return null } })
  const clickText = async (text, scope = 'button') => { const l = page().locator(scope, { hasText: text }).first(); await l.scrollIntoViewIfNeeded().catch(() => {}); await l.click() }

  async function logoutViaUi() {
    await app.goto('/', { settle: 1500 })
    if (!(await session())) return true
    const t = (await session())?.full_name
    const avatar = t ? page().locator(`header button[title="${t}"]`).first() : null
    // The avatar menu first; if its item does not appear, the logout button on /home (both are the
    // app's own logout).
    let done = false
    if (avatar && await avatar.count()) {
      await avatar.click()
      const item = page().locator('[role="menu"] button', { hasText: strings.logout.hi }).first()
      if (await item.waitFor({ timeout: 5000 }).then(() => true, () => false)) { await item.click(); done = true }
    }
    if (!done) {
      await app.goto('/home', { settle: 1500 })
      await clickText(strings.logout.hi)
    }
    return waitFor(async () => (await session()) === null, { timeout: 10000 })
  }

  // Browse in "newest first" order (the page's own sort button): earlier KSTEST listings sit at
  // the same point, so in "nearest first" the new one may be anywhere in the list.
  async function browseNewest() {
    await clickText(strings.sort_newest.hi)
    await sleep(1500)
    await settle()
  }

  async function signupViaUi(who) {
    const a = ACCT[who]
    await app.goto('/signup', { settle: 1500 })
    await page().fill('#full_name', a.name)
    await page().fill('#email', a.email)
    await page().fill('#password', a.password)
    await page().fill('#phone', a.phone)
    await page().fill('[data-testid="place-input"]', 'Sagar')
    await page().click('[data-testid="place-find"]')
    // An exact name is taken at once; otherwise pick the first suggestion.
    const picked = await waitFor(() => page().evaluate(() => document.querySelector('[data-testid="place-chosen"]') ? 'chosen' : document.querySelector('[data-testid="place-suggestions"] button, [data-testid="place-did-you-mean"] button') ? 'suggest' : null), { timeout: 15000 })
    if (picked === 'suggest') await page().locator('[data-testid="place-suggestions"] button, [data-testid="place-did-you-mean"] button').first().click()
    await page().waitForSelector('[data-testid="place-chosen"]', { timeout: 10000 })
    await page().click('form[data-testid="signup-form"] button[type="submit"]')
    await page().waitForSelector('[data-testid="disclaimer-accept"]', { timeout: 10000 })
    await page().check('[data-testid="disclaimer-accept"]')
    await clickText(strings.accept_and_continue.hi)
    const s = await waitFor(async () => { const v = await session(); return v && v.id ? v : null }, { timeout: 30000, interval: 800 })
    const err = s ? null : await page().evaluate(() => document.querySelector('[data-testid="signup-error"]')?.innerText || null)
    if (s) record('profile (signup through the app)', { who, full_name: a.name, email: a.email, phone: a.phone, profile_id: s.id })
    return { session: s, error: err }
  }

  async function loginPhoneViaUi(phone, next = null) {
    await app.goto(next ? `/login?next=${encodeURIComponent(next)}` : '/login', { settle: 1500 })
    await page().fill('form[data-testid="login-phone-form"] #phone', phone)
    await page().click('[data-testid="login-phone-submit"]')
  }

  async function idbEntries() {
    return page().evaluate(() => new Promise((resolve) => {
      const r = indexedDB.open('ks-offline')
      r.onerror = () => resolve([])
      r.onsuccess = () => {
        const d = r.result
        if (!d.objectStoreNames.contains('responses')) { resolve([]); return }
        const g = d.transaction('responses', 'readonly').objectStore('responses').getAll()
        g.onsuccess = () => resolve(g.result || [])
        g.onerror = () => resolve([])
      }
    }))
  }
  const idbMutate = (fnSrc) => page().evaluate((src) => new Promise((resolve) => {
    const fn = new Function('e', src)
    const r = indexedDB.open('ks-offline')
    r.onsuccess = () => {
      const st = r.result.transaction('responses', 'readwrite').objectStore('responses')
      const g = st.getAll()
      g.onsuccess = () => { let n = 0; for (const e of g.result || []) { const out = fn(e); if (out === 'delete') { st.delete(e.key); n++ } else if (out) { st.put(out); n++ } } resolve(n) }
    }
    r.onerror = () => resolve(-1)
  }), fnSrc)

  const pageData = (route) => page().evaluate(([r, mandiCol]) => {
    const txt = (s) => (document.querySelector(s)?.innerText || '')
    const stamp = document.querySelector('[data-testid="offline-stamp"]')
    const header = document.querySelector('header.ks-safe-sticky'), banner = document.querySelector('[data-testid="offline-banner"]')
    return {
      route: r,
      prices: (txt('.ticker-content').match(/₹[\d,]+/g) || []).slice(0, 8),
      mspPrices: (txt('main table') .match(/₹\s?[\d,]{3,}/g) || []).slice(0, 8),
      // the mandi price table only (header has the "mandi" column) — not the MSP table
      mandiTablePrices: (([...document.querySelectorAll('main table')].find((tb) => (tb.querySelector('thead')?.innerText || '').includes(mandiCol))?.innerText || '').match(/₹\s?[\d,]{3,}/g) || []).slice(0, 8),
      temps: (txt('main').match(/-?\d+°/g) || []).slice(0, 6),
      text: (document.querySelector('#root')?.innerText || ''),
      stamp: stamp ? { text: stamp.innerText.trim(), cachedAt: Number(stamp.getAttribute('data-cached-at')) } : null,
      notice: document.querySelector('[data-testid="offline-notice"]') ? { tooOld: document.querySelector('[data-testid="offline-notice"]').getAttribute('data-too-old') === 'true', text: document.querySelector('[data-testid="offline-notice"]').innerText.trim() } : null,
      tickerOffline: !!document.querySelector('[data-testid="ticker-offline"]'),
      bannerText: banner ? banner.innerText.trim() : null,
      spinners: document.querySelectorAll('.animate-spin').length,
      errorBoundary: (document.body.innerText || '').includes('This page could not open'),
      overlap: banner && header ? { bannerBottom: banner.getBoundingClientRect().bottom, headerTop: header.getBoundingClientRect().top } : null,
    }
  }, [route, strings.col_mandi.hi])

  // A page's data areas are settled when no spinner / ticker shimmer is left (max 25 s).
  const settle = (ms = 25000) => waitFor(() => page().evaluate(() => document.querySelectorAll('.animate-spin, .ticker-shimmer').length === 0), { timeout: ms, interval: 500 })
  // On / the ticker fills a moment after the page: wait for prices or a final ticker state.
  const settleTicker = () => waitFor(() => page().evaluate(() => /₹/.test(document.querySelector('.ticker-content')?.innerText || '') || !!document.querySelector('[data-testid="ticker-offline"]') || (!document.querySelector('.ticker-shimmer') && !!document.querySelector('[role="marquee"]'))), { timeout: 25000, interval: 500 })

  // ------------------------------------------------------------------------- S1
  test('S1', 'Staging build', 'Clean build of the staging APK (npm run android:debug:staging) exits 0; APK exists; size + sha256 recorded', false, async (id) => {
    if (SKIP_BUILD) return notRun('--skip-build was given; the existing staging APK was used')
    fs.rmSync(path.join(ROOT, 'dist'), { recursive: true, force: true })
    fs.rmSync(path.join(ROOT, 'android', 'app', 'build'), { recursive: true, force: true })
    fs.rmSync(STAGING_APK, { force: true })
    const r = npmRun('android:debug:staging', 'S1-build-staging.log')
    const c = new Checks()
    c.check('npm run android:debug:staging exit code is 0', r.status === 0, `exit ${r.status}`)
    c.check('staging APK exists', fs.existsSync(STAGING_APK), rel(STAGING_APK))
    const info = fs.existsSync(STAGING_APK) ? { path: rel(STAGING_APK), bytes: fs.statSync(STAGING_APK).size, sha256: sha256(STAGING_APK) } : {}
    shared.apks = { ...(shared.apks || {}), staging: info }
    const guard = r.log.split(/\r?\n/).filter((l) => /GUARD|\[build-android\]|BUILD (SUCCESSFUL|FAILED)/.test(l)).join('\n')
    return fromChecks(id, c, { files: [ev.text(id, 'apk.json', info), ev.text(id, 'build-summary.txt', guard)], notes: info.bytes ? `${(info.bytes / 1048576).toFixed(2)} MB, sha256 ${info.sha256}` : '' })
  })

  // ------------------------------------------------------------------------- S2
  test('S2', 'Identity + guards', 'aapt2: staging id/label; staging assets have the staging ref and no prod ref; prod APK the reverse; no default APK allows cleartext; a staging build with a prod VITE_SUPABASE_URL is refused', false, async (id) => {
    const c = new Checks()
    const files = []
    if (!fs.existsSync(PROD_APK)) {
      const r = npmRun('android:debug', 'S2-build-prod.log')
      c.check('prod APK built for the comparison (npm run android:debug)', r.status === 0 && fs.existsSync(PROD_APK), `exit ${r.status}`)
    }
    const badging = (apk) => spawnSync(aapt2(), ['dump', 'badging', apk], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).stdout || ''
    const manifest = (apk) => spawnSync(aapt2(), ['dump', 'xmltree', '--file', 'AndroidManifest.xml', apk], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).stdout || ''
    const cleartext = (apk) => { const m = manifest(apk).match(/usesCleartextTraffic[^\n]*=\s*(?:\(type 0x12\))?(0x[0-9a-f]+|true|false)/i); return m ? !/^(0x0+|false)$/i.test(m[1]) : false }
    const scan = (apk) => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-apk-'))
      try {
        spawnSync(path.join(JDK, 'bin', WIN ? 'jar.exe' : 'jar'), ['xf', apk, 'assets'], { cwd: tmp })
        let prod = 0, staging = 0, files = 0
        const walk = (d) => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.(js|html|json|css|txt)$|^_/.test(n)) { files++; const t = fs.readFileSync(p, 'utf8'); prod += t.split(PROD_REF).length - 1; staging += t.split(STAGING_REF).length - 1 } } }
        walk(path.join(tmp, 'assets'))
        return { files, prodRef: prod, stagingRef: staging }
      } finally { fs.rmSync(tmp, { recursive: true, force: true }) }
    }
    const bs = badging(STAGING_APK), bp = badging(PROD_APK)
    const facts = {
      staging: { package: (bs.match(/package: name='([^']+)'/) || [])[1], label: (bs.match(/application-label:'([^']*)'/) || [])[1], cleartext: cleartext(STAGING_APK), assets: scan(STAGING_APK) },
      prod: { package: (bp.match(/package: name='([^']+)'/) || [])[1], label: (bp.match(/application-label:'([^']*)'/) || [])[1], cleartext: cleartext(PROD_APK), assets: scan(PROD_APK) },
    }
    c.check('staging applicationId is com.kissansahyog.app.staging', facts.staging.package === STAGING_PKG, facts.staging.package)
    c.check('staging label is "Kisan Sahyog (Staging)"', facts.staging.label === 'Kisan Sahyog (Staging)', facts.staging.label)
    c.check('staging assets: staging ref present, prod ref absent', facts.staging.assets.stagingRef > 0 && facts.staging.assets.prodRef === 0, facts.staging.assets)
    c.check('prod applicationId / label unchanged', facts.prod.package === PROD_PKG && facts.prod.label === 'Kisan Sahyog', facts.prod)
    c.check('prod assets: prod ref present, staging ref absent', facts.prod.assets.prodRef > 0 && facts.prod.assets.stagingRef === 0, facts.prod.assets)
    c.check('neither default APK allows cleartext traffic', facts.staging.cleartext === false && facts.prod.cleartext === false, { staging: facts.staging.cleartext, prod: facts.prod.cleartext })
    // The guard: a staging build started with the production project's URL in the process.
    const g = spawnSync(process.execPath, ['scripts/build-android.mjs', '--target', 'staging'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, VITE_SUPABASE_URL: `https://${PROD_REF}.supabase.co` }, timeout: 120000 })
    const refusal = ((g.stdout || '') + (g.stderr || '')).split(/\r?\n/).filter((l) => /GUARD|FAILED/.test(l)).join('\n')
    c.check('staging build with a prod VITE_SUPABASE_URL is REFUSED (non-zero exit, guard message)', g.status !== 0 && /STAGING GUARD: REFUSED/.test(refusal), refusal)
    files.push(ev.text(id, 'identity.json', facts), ev.text(id, 'guard-refusal.txt', refusal))
    if (fs.existsSync(LOCAL_APK)) facts.stagingLocal = { cleartext: cleartext(LOCAL_APK), package: (badging(LOCAL_APK).match(/package: name='([^']+)'/) || [])[1] }
    return fromChecks(id, c, { files, notes: `refusal: ${refusal.split('\n').find((l) => /REFUSED/.test(l)) || '—'}` })
  })

  // ------------------------------------------------------------------------- S3
  test('S3', 'Coexistence', 'Both APKs installed side by side; each app has its own storage (a marker set in one is absent in the other)', true, async (id) => {
    const c = new Checks()
    for (const [name, apk] of [['prod', PROD_APK], ['staging', STAGING_APK]]) { const r = adb(['install', '-r', apk], { timeout: 180000 }); c.check(`${name} APK installed`, /Success/.test(r.out), (r.out + r.err).trim().split('\n').pop()) }
    const pkgs = sh('pm list packages com.kissansahyog').out
    c.check('both packages are installed at the same time', pkgs.includes(`package:${PROD_PKG}\n`) || pkgs.includes(`package:${PROD_PKG}`) ? pkgs.includes(`package:${STAGING_PKG}`) : false, pkgs.trim())
    const marker = `marker-${STAMP}`
    await app.close()
    await ensureApp()
    await app.goto('/about', { settle: 500 })
    await page().evaluate((m) => localStorage.setItem('ks_test_coexist', m), marker)
    const inStaging = await page().evaluate(() => localStorage.getItem('ks_test_coexist'))
    await app.close()
    // The prod app, through its own WebView.
    sh(`am start -W -n ${PROD_PKG}/com.kissansahyog.app.MainActivity`, { timeout: 60000 })
    await sleep(4000)
    const { _android } = await import('playwright-core')
    const devs = await _android.devices({ omitDriverInstall: true })
    const dev = devs.find((d) => d.serial() === (process.env.ANDROID_SERIAL || d.serial()))
    let inProd = 'not read'
    try {
      const pid = sh(`pidof ${PROD_PKG}`).out.trim()
      const wv = await waitFor(() => dev.webViews().find((w) => String(w.pid()) === pid) || null, { timeout: 30000 })
      const p = await wv.page()
      inProd = await p.evaluate(() => localStorage.getItem('ks_test_coexist'))
      files0.push((await ev.shot(id, 'prod-app')).file)
    } finally { for (const d of devs) await d.close().catch(() => {}) }
    c.check('marker set in the staging app is readable there', inStaging === marker)
    c.check('the prod app does not see it (separate data)', inProd === null, inProd)
    sh(`am force-stop ${PROD_PKG}`)
    await ensureApp()
    await page().evaluate(() => localStorage.removeItem('ks_test_coexist'))
    return fromChecks(id, c, { files: [...files0.splice(0), ev.text(id, 'coexistence.json', { packages: pkgs.trim().split('\n'), inStaging, inProd })] })
  })
  const files0 = []

  // ------------------------------------------------------------------------- S10
  test('S10', 'Staging regression subset', 'In the staging app: cold start (T4), the 15 routes + 404 (T5), no service worker (T8), safe areas incl. the D1 banner/header geometry (T9), back button (T11)', true, async () => {
    const parts = []
    const files = []
    for (const tid of ['T4', 'T5', 'T8', 'T9', 'T11']) {
      const t = TESTS.find((x) => x.id === tid)
      let r
      try { r = await t.fn(`S10-${tid}`) } catch (e) { r = { status: FAIL, notes: `threw: ${String(e.message || e).split('\n')[0]}`, evidenceFiles: [ev.text(`S10-${tid}`, 'error.txt', String(e.stack || e))] } }
      parts.push({ part: tid, status: r.status, notes: r.notes })
      files.push(...(r.evidenceFiles || []))
    }
    files.push(ev.text('S10', 'parts.json', parts))
    const status = parts.some((p) => p.status === FAIL) ? FAIL : parts.every((p) => p.status === PASS) ? PASS : NOTRUN
    return { status, evidenceFiles: files, notes: parts.map((p) => `${p.part} ${p.status}${p.status === PASS ? '' : ` (${String(p.notes).slice(0, 200)})`}`).join(' | ') }
  })

  // ------------------------------------------------------------------------- S4
  test('S4', 'Signup', 'A brand-new KSTEST user signs up through the real signup UI of the staging app; lands logged in; the session survives force-stop + relaunch', true, async (id) => {
    await ensureApp()
    await app.goto('/about', { settle: 500 })
    await page().evaluate(() => { localStorage.removeItem('ks_session_v1'); Object.keys(localStorage).filter((k) => k.startsWith('ks_sb_auth')).forEach((k) => localStorage.removeItem(k)) })
    const c = new Checks()
    const tSign = app.mark()
    const { session: s, error } = await signupViaUi('A')
    // Status codes of the auth / registration requests (no bodies) — explains a failure.
    const authCalls = app.since(tSign).responses.filter((r) => /\/auth\/v1\/|\/rpc\/app_/.test(r.path)).map((r) => `${r.path} → ${r.status || r.failure}`)
    c.check('signup finished: a session with a profile id is stored', !!s?.id, { error: error || 'no session', authCalls })
    if (!s) return fromChecks(id, c, { files: [(await ev.shot(id, 'signup-failed')).file, ev.text(id, 'auth-calls.json', authCalls)] })
    c.check('the session is the new KSTEST user', s.phone === ACCT.A.phone && s.full_name === ACCT.A.name, { phone: s.phone, name: s.full_name })
    await sleep(1500)
    const files = [(await ev.shot(id, 'after-signup')).file]
    const tabs = await page().evaluate(() => document.querySelectorAll('[data-ks-tabbar] li').length)
    c.check('logged-in tab bar (5 tabs incl. Profile)', tabs === 5, tabs)
    await app.close(); forceStop(); await sleep(1500); launchApp(); await sleep(3000)
    await app.connect({ launch: false }); await app.waitContent()
    const s2 = await session()
    c.check('session survives force-stop + relaunch', s2?.id === s.id, s2?.id)
    files.push((await ev.shot(id, 'after-relaunch')).file)
    return fromChecks(id, c, { files: [...files, ev.text(id, 'signup.json', { who: 'A', email: ACCT.A.email, phone: ACCT.A.phone, profileId: s.id, routeAfter: await page().evaluate(() => location.pathname) })] })
  })

  // ------------------------------------------------------------------------- S5
  test('S5', 'Logout / login', 'Log out, log in again with the same mobile number (phone login); an unregistered and a malformed number are refused with the in-app message', true, async (id) => {
    await ensureApp()
    const c = new Checks()
    const obs = {}
    c.check('logged out through the UI (session removed)', !!(await logoutViaUi()))
    // wrong numbers
    await loginPhoneViaUi(UNREGISTERED)
    obs.unregistered = await waitFor(() => page().evaluate(() => document.querySelector('[data-testid="login-phone-error"]')?.innerText.trim() || null), { timeout: 15000 })
    c.check(`unregistered number ${UNREGISTERED} is refused with an in-app message`, !!obs.unregistered && !(await session()), obs.unregistered)
    const files = [(await ev.shot(id, 'unregistered-number'))].map((x) => x.file)
    await loginPhoneViaUi('12345')
    // A malformed number is caught before any request: the message sits under the field.
    obs.malformed = await waitFor(() => page().evaluate((msg) => { const f = document.querySelector('form[data-testid="login-phone-form"]'); return f && f.innerText.includes(msg) ? msg : (document.querySelector('[data-testid="login-phone-error"]')?.innerText.trim() || null) }, strings.err_invalid_phone.hi), { timeout: 8000 })
    c.check('malformed number 12345 is refused with an in-app message', !!obs.malformed && !(await session()), obs.malformed)
    // correct number
    await loginPhoneViaUi(ACCT.A.phone)
    const s = await waitFor(async () => { const v = await session(); return v?.id ? v : null }, { timeout: 20000 })
    obs.loggedInAs = s ? { phone: s.phone, auth: s.auth_provider || null } : null
    obs.routeAfter = await page().evaluate(() => location.pathname)
    c.check('login with the same number restores the same user', s?.phone === ACCT.A.phone, obs.loggedInAs)
    files.push((await ev.shot(id, 'logged-in-again')).file)
    return fromChecks(id, c, { files: [...files, ev.text(id, 'login.json', obs)], notes: `unregistered → "${obs.unregistered}"; malformed → "${obs.malformed}"; phone login is trust-based (no OTP), lands on ${obs.routeAfter}` })
  })

  // ------------------------------------------------------------------------- S6
  test('S6', 'Post with photo', 'As the KSTEST user, post a listing (marker KSTEST…) with a photo; it appears in My Listings and Browse; the detail page shows the photo (naturalWidth > 0) and the photo URL returns 200 from staging storage', true, async (id) => {
    await ensureApp()
    const c = new Checks()
    const files = []
    const how = {}
    c.check('logged in as user A', (await session())?.phone === ACCT.A.phone)
    sh(`pm grant ${PKG} android.permission.ACCESS_FINE_LOCATION`); sh(`pm grant ${PKG} android.permission.ACCESS_COARSE_LOCATION`)
    sh('cmd location set-location-enabled true') // off after a fresh emulator boot
    adb(['emu', 'geo', 'fix', String(TEST_PLACE.lng), String(TEST_PLACE.lat)])
    await ensureApp() // pm grant can restart the app
    await app.goto('/post', { settle: 1500 })
    await page().click('[data-testid="post-cat-bhusa"]')
    await page().click('[data-testid="post-type-offer"]')
    await page().click('[data-testid="post-next"]')
    await page().waitForSelector('#f_residue_type', { timeout: 20000 })
    for (const sel of ['#f_residue_type', '#f_pickup_arrangement', '#f_buyer_type_preference']) await page().selectOption(sel, { index: 1 })
    await page().fill('#f_quantity', `${MARKER} — 10 quintal`)
    await page().fill('#f_asking_price', '500')
    // The photo: a real JPEG through the form's file input.
    const jpg = await sharp({ create: { width: 640, height: 480, channels: 3, background: '#2E7D32' } }).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect x="40" y="40" width="560" height="400" fill="#F9A825"/><text x="320" y="260" font-size="48" text-anchor="middle" font-family="sans-serif">KSTEST ${S6}</text></svg>`) }]).jpeg({ quality: 80 }).toBuffer()
    const photoCount = () => page().evaluate(() => document.querySelectorAll('section[aria-label] img').length)
    try { await page().setInputFiles('input[type="file"]', { name: `kstest-${S6}.jpg`, mimeType: 'image/jpeg', buffer: jpg }); how.method = 'Playwright setInputFiles (buffer)' } catch (e) { how.setInputFilesError = String(e.message || e).split('\n')[0] }
    if (!(await waitFor(photoCount, { timeout: 4000 }))) {
      // CDP DOM.setFileInputFiles with a file inside the app's own storage (readable by the app).
      const local = path.join(os.tmpdir(), `kstest-${S6}.jpg`); fs.writeFileSync(local, jpg)
      adb(['push', local, `/data/local/tmp/kstest-${S6}.jpg`])
      sh(`run-as ${PKG} mkdir -p files`); sh(`run-as ${PKG} cp /data/local/tmp/kstest-${S6}.jpg files/kstest-${S6}.jpg`)
      const devPath = `/data/user/0/${PKG}/files/kstest-${S6}.jpg`
      try {
        const cdp = await app._page.context().newCDPSession(app._page)
        const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true })
        const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[type="file"]' })
        await cdp.send('DOM.setFileInputFiles', { nodeId, files: [devPath] })
        how.method = `CDP DOM.setFileInputFiles (${devPath})`
      } catch (e) { how.cdpError = String(e.message || e).split('\n')[0] }
    }
    const photos = await waitFor(photoCount, { timeout: 8000 })
    c.check('a photo is selected in the form', photos > 0, how)
    files.push((await ev.shot(id, 'step2-with-photo')).file)
    await page().click('[data-testid="post-next"]')
    await page().waitForSelector('#f_asset_village', { timeout: 15000 })
    await page().fill('#f_asset_village', `${MARKER} Sagar`)
    // Location of the listing (needed for the distance-based Browse view): the page's own "use my
    // current location" button. It asks for a LOW-accuracy fix (10 s, maximumAge 5 min), which on
    // the emulator comes from Google Play services and exists only after some app had a real fix.
    // So first one high-accuracy GPS reading is taken in the page (≈ a phone that recently knew where
    // it was); the button then gets that position. Recorded in post.json.
    const geo = setInterval(() => adb(['emu', 'geo', 'fix', String(TEST_PLACE.lng), String(TEST_PLACE.lat)]), 1500)
    let coords = null
    try {
      how.gpsPrime = await page().evaluate(() => new Promise((res) => navigator.geolocation.getCurrentPosition((p) => res({ ok: true, lat: p.coords.latitude, lng: p.coords.longitude }), (e) => res({ ok: false, code: e.code }), { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 })))
      for (let i = 0; i < 2 && !coords; i++) {
        await clickText(strings.location_current.hi)
        coords = await waitFor(() => page().evaluate(() => { const p = [...document.querySelectorAll('p')].find((x) => /✓\s*\d+\.\d+, \d+\.\d+/.test(x.innerText)); return p ? p.innerText.trim() : null }), { timeout: 15000, interval: 1000 })
      }
    } finally { clearInterval(geo) }
    how.coordinates = coords
    c.check(`the listing gets the device position near Sagar (${TEST_PLACE.lat}, ${TEST_PLACE.lng}) from the page's button`, !!coords && (() => { const m = coords.match(/(\d+\.\d+), (\d+\.\d+)/); return m && Math.abs(Number(m[1]) - TEST_PLACE.lat) < 0.05 && Math.abs(Number(m[2]) - TEST_PLACE.lng) < 0.05 })(), { coords, gpsPrime: how.gpsPrime })
    await page().evaluate(() => { for (const cb of document.querySelectorAll('input[type="checkbox"]')) if (!cb.checked && cb.getAttribute('data-testid') !== 'wide-visibility-checkbox') cb.click() })
    await page().click('[data-testid="post-submit"]')
    const done = await waitFor(() => page().evaluate((txt) => [...document.querySelectorAll('button')].some((b) => b.innerText.includes(txt)), strings.view_listing.hi), { timeout: 60000, interval: 1000 })
    const postErr = done ? null : await page().evaluate(() => document.querySelector('[role="alert"]')?.innerText || null)
    c.check('the listing is created (success screen)', !!done, postErr)
    files.push((await ev.shot(id, 'posted')).file)
    if (!done) return fromChecks(id, c, { files: [...files, ev.text(id, 'post.json', how)] })
    await clickText(strings.view_listing.hi)
    await waitFor(() => page().evaluate(() => /^\/listing\//.test(location.pathname)), { timeout: 15000 })
    state.listingId = await page().evaluate(() => location.pathname.split('/').pop())
    await app.waitContent(); await sleep(2500)
    const img = await waitFor(() => page().evaluate(() => { const i = [...document.querySelectorAll('img')].find((x) => /listing-photos/.test(x.src)); return i && i.complete ? { src: i.src, w: i.naturalWidth } : null }), { timeout: 20000 })
    state.photoUrl = img?.src || null
    record('listing (posted through the app)', { by: ACCT.A.phone, listing_id: state.listingId, marker: MARKER, category: 'bhusa', village: `${MARKER} Sagar`, coordinates: how.coordinates, photo_url: state.photoUrl })
    c.check('detail page shows the photo (naturalWidth > 0)', img?.w > 0, img)
    files.push((await ev.shot(id, 'detail')).file)
    if (img?.src) { const r = await fetch(img.src).catch((e) => ({ status: String(e) })); c.check('photo URL returns 200 from the staging storage', r.status === 200 && img.src.includes(STAGING_REF), { status: r.status, host: new URL(img.src).host }) }
    await app.goto('/my', { settle: 3000 })
    const inMy = await page().evaluate((m) => document.body.innerText.includes(m) || !!document.querySelector(`[href*="${m}"]`), MARKER)
    const myText = await page().evaluate(() => document.querySelector('main')?.innerText.slice(0, 400) || '')
    c.check('the listing appears in My Listings', inMy || myText.length > 0 && await page().evaluate((lid) => document.body.innerHTML.includes(lid), state.listingId), myText.slice(0, 120))
    files.push((await ev.shot(id, 'my-listings')).file)
    await setLocation()
    await app.goto('/browse?cat=bhusa', { settle: 3000 }); await settle(); await browseNewest()
    const inBrowse = await page().evaluate((m) => document.body.innerText.includes(m), MARKER)
    c.check('the listing appears in Browse (Sagar, bhusa)', inBrowse)
    files.push((await ev.shot(id, 'browse')).file)
    return fromChecks(id, c, { files: [...files, ev.text(id, 'post.json', { ...how, listingId: state.listingId, photo: img })], notes: `photo via ${how.method || 'none'}; listing ${state.listingId}` })
  })

  // ------------------------------------------------------------------------- S7
  test('S7', 'Contact reveal', 'A second KSTEST user reveals the number on user A\'s listing; logged out, the reveal goes to login with the return path and comes back after login', true, async (id) => {
    await ensureApp()
    const c = new Checks()
    const files = []
    if (!state.listingId) return notRun('no listing from S6 to reveal')
    await logoutViaUi()
    const { session: sB, error } = await signupViaUi('B')
    c.check('second KSTEST user B signed up', !!sB?.id, error)
    if (!sB) return fromChecks(id, c)
    await app.goto(`/listing/${state.listingId}`, { settle: 2500 })
    await page().click('[data-testid="contact-call"]')
    const revealed = await waitFor(() => page().evaluate(() => { const s = document.querySelector('[data-testid="contact-sheet"]'); const a = s && s.querySelector('a[href^="tel:"]'); return a ? a.getAttribute('href').replace('tel:', '') : null }), { timeout: 20000 })
    c.check('B sees A\'s number after the reveal', !!revealed && revealed.replace(/\D/g, '').endsWith(ACCT.A.phone), revealed)
    shared.revealed = revealed
    files.push((await ev.shot(id, 'revealed')).file)
    record('contact reveal', { viewer: ACCT.B.phone, listing_id: state.listingId })
    await page().keyboard.press('Escape').catch(() => {})
    await logoutViaUi()
    await app.goto(`/listing/${state.listingId}`, { settle: 2500 })
    await page().click('[data-testid="contact-call"]')
    const onLogin = await waitFor(() => page().evaluate(() => location.pathname + location.search), { timeout: 10000 })
    c.check('logged out: the reveal sends you to /login with the listing as return path', /^\/login\?next=%2Flisting%2F|^\/login\?next=\/listing\//.test(onLogin) && onLogin.includes(state.listingId), onLogin)
    await page().fill('form[data-testid="login-phone-form"] #phone', ACCT.B.phone)
    await page().click('[data-testid="login-phone-submit"]')
    const back = await waitFor(() => page().evaluate((lid) => location.pathname === `/listing/${lid}` ? location.pathname : null, state.listingId), { timeout: 20000 })
    c.check('after login you are back on the listing', !!back, await page().evaluate(() => location.pathname))
    files.push((await ev.shot(id, 'back-after-login')).file)
    return fromChecks(id, c, { files: [...files, ev.text(id, 'reveal.json', { listingId: state.listingId, revealedLast4: revealed ? revealed.slice(-4) : null, returnPath: onLogin, cameBackTo: back })] })
  })

  // ------------------------------------------------------------------------- S8
  test('S8', 'Profile and My Listings', 'Both render for the logged-in user; an edited profile field persists after relaunch (pincode behaviour recorded)', true, async (id) => {
    await ensureApp()
    const c = new Checks()
    const files = []
    const obs = {}
    c.check('logged in (user B)', (await session())?.phone === ACCT.B.phone)
    await app.goto('/my', { settle: 2500 })
    c.check('My Listings renders', await page().evaluate(() => (document.querySelector('#root')?.innerText || '').length > 100 && !document.body.innerText.includes('This page could not open')))
    files.push((await ev.shot(id, 'my-listings')).file)
    await app.goto('/profile', { settle: 2500 })
    // Profile shows the e-mail for e-mail accounts (pf_email) and the number for phone accounts (pf_phone).
    obs.identifierShown = await page().evaluate(() => (document.querySelector('#pf_email') ? 'email' : document.querySelector('#pf_phone') ? 'phone' : null))
    c.check('Profile renders with the user\'s data (name + the account\'s e-mail)', await page().evaluate(([em]) => !!document.querySelector('#pf_name')?.value && document.querySelector('#pf_email')?.value === em, [ACCT.B.email]), obs.identifierShown)
    const newName = `${ACCT.B.name} edited`
    await page().fill('#pf_name', newName)
    obs.pincodeBefore = await page().evaluate(() => document.querySelector('#pf_pincode')?.value || '')
    await clickText(strings.save_changes.hi)
    await sleep(3000)
    obs.firstSave = await page().evaluate(() => [...document.querySelectorAll('[role="alert"]')].map((e) => e.innerText.trim()).join(' | ') || 'no message')
    let saved = (await session())?.full_name === newName
    obs.savedWithoutPincode = saved
    if (!saved) {
      await page().fill('#pf_pincode', '470001')
      await clickText(strings.save_changes.hi)
      saved = !!(await waitFor(async () => (await session())?.full_name === newName, { timeout: 15000 }))
      obs.savedWithPincode = saved
      obs.secondSave = await page().evaluate(() => [...document.querySelectorAll('[role="alert"]')].map((e) => e.innerText.trim()).join(' | ') || 'no message')
    }
    files.push((await ev.shot(id, 'profile-saved')).file)
    c.check('the edit is saved', saved, obs)
    await app.close(); forceStop(); await sleep(1500); launchApp(); await sleep(3000)
    await app.connect({ launch: false }); await app.goto('/profile', { settle: 2500 })
    const after = await page().evaluate(() => document.querySelector('#pf_name')?.value)
    c.check('the edited name persists after relaunch', after === newName, after)
    if (saved) record('profile edit', { who: ACCT.B.phone, full_name: newName, pincode: obs.savedWithPincode ? '470001' : null })
    return fromChecks(id, c, { files: [...files, ev.text(id, 'profile.json', obs)], notes: obs.savedWithoutPincode ? 'name saved without a pincode' : `KNOWN ISSUE confirmed: saving needs a pincode (first save: "${obs.firstSave}"); saved after entering 470001` })
  })

  // ------------------------------------------------------------------------- O2
  // /browse is opened on the bhusa category, where S6's KSTEST listing is (the unfiltered list is
  // long and need not show it on the first screen).
  const OFFLINE_PAGES = () => ['/', '/mausam', '/msp', '/browse?cat=bhusa', ...(state.listingId ? [`/listing/${state.listingId}`] : [])]
  const RES_FOR = { '/': ['mandi_prices'], '/mausam': ['weather_cache_v2', 'api.open-meteo.com'], '/msp': ['mandi_prices', 'msp_prices'], '/browse?cat=bhusa': ['listings'] }
  const resFor = (r) => RES_FOR[r] || ['listings']
  test('O2', 'Cache fills online', 'Visiting /, /mausam (Sagar), /msp, /browse and a listing detail online stores an IndexedDB entry for each, with a recent cachedAt', true, async (id) => {
    await ensureApp()
    const c = new Checks()
    const files = []
    await app.goto('/about', { settle: 500 })
    await setLocation()
    const t0 = Date.now() - 60000
    for (const r of OFFLINE_PAGES()) {
      await app.goto(r, { settle: 3000 }); if (r.startsWith('/browse')) { await settle(); await browseNewest() }
      await settle(); if (r === '/') await settleTicker()
      await sleep(1000)
      state.shown[r] = await pageData(r)
      files.push((await ev.shot(id, r === '/' ? 'home' : r.slice(1).replace(/[^a-z0-9-]+/gi, '_'))).file)
    }
    const entries = await idbEntries()
    const summary = {}
    for (const r of OFFLINE_PAGES()) {
      const mine = entries.filter((e) => resFor(r).includes(e.resource) && (r.startsWith('/listing/') ? e.url.includes(state.listingId) : true))
      summary[r] = mine.map((e) => ({ resource: e.resource, cachedAt: e.cachedAt, dataTime: e.dataTime }))
      c.check(`${r}: IndexedDB has an entry (${resFor(r).join(' / ')}) stored during this visit`, mine.length > 0 && mine.some((e) => e.cachedAt >= t0), summary[r].slice(0, 3))
    }
    c.check('data on screen before going offline: ticker ₹, temperatures, msp ₹, the KSTEST listing', state.shown['/'].prices.length > 0 && state.shown['/mausam'].temps.length > 0 && state.shown['/msp'].mspPrices.length > 0 && (!state.listingId || state.shown['/browse?cat=bhusa'].text.includes(MARKER)), { ticker: state.shown['/'].prices.length, temps: state.shown['/mausam'].temps.length, msp: state.shown['/msp'].mspPrices.length })
    const sizes = entries.reduce((n, e) => n + (e.bytes || 0), 0)
    return fromChecks(id, c, { files: [...files, ev.text(id, 'idb-entries.json', { count: entries.length, approxBytes: sizes, byPage: summary, resources: [...new Set(entries.map((e) => e.resource))] })], notes: `${entries.length} entries, ~${Math.round(sizes / 1024)} KB` })
  })

  // ------------------------------------------------------------------------- O3
  test('O3', 'Offline with cache', 'Airplane mode, force-stop, cold launch: /, /mausam, /msp, /browse and the listing detail show the SAME data as online, with the stamp = stored time; no ErrorBoundary; banner does not cover the header', true, async (id) => {
    if (!state.shown['/']) return notRun('O2 did not run (no online snapshot to compare with)')
    const c = new Checks()
    const files = []
    const out = {}
    await app.close()
    c.check('airplane mode is really on', await airplane(true)); await sleep(2000)
    forceStop(); launchApp(); await sleep(4000)
    await app.connect({ launch: false }); await app.waitContent()
    const entries = await idbEntries()
    for (const r of OFFLINE_PAGES()) {
      await app.goto(r, { settle: 2000 }); if (r.startsWith('/browse')) { await settle(); await browseNewest() }
      await settle(); if (r === '/') await settleTicker()
      await sleep(800)
      const d = await pageData(r)
      out[r] = { stamp: d.stamp, prices: d.prices, mspPrices: d.mspPrices, temps: d.temps, notice: d.notice, errorBoundary: d.errorBoundary, overlap: d.overlap }
      files.push((await ev.shot(id, r === '/' ? 'home' : r.slice(1).replace(/[^a-z0-9-]+/gi, '_'))).file)
      const before = state.shown[r]
      const same = r === '/' ? JSON.stringify(d.prices) === JSON.stringify(before.prices) && d.prices.length > 0
        : r === '/mausam' ? JSON.stringify(d.temps) === JSON.stringify(before.temps) && d.temps.length > 0
          : r === '/msp' ? JSON.stringify(d.mspPrices) === JSON.stringify(before.mspPrices) && d.mspPrices.length > 0
            : d.text.includes(MARKER)
      c.check(`${r}: same data as online`, same, { online: r === '/' ? before.prices : r === '/mausam' ? before.temps : r === '/msp' ? before.mspPrices : MARKER, offline: r === '/' ? d.prices : r === '/mausam' ? d.temps : r === '/msp' ? d.mspPrices : d.text.includes(MARKER) })
      const stored = entries.filter((e) => resFor(r).includes(e.resource)).map((e) => e.cachedAt)
      // Batch 9 (1B): on Home the offline banner carries the time; the stamp under the ticker is no
      // longer repeated while the banner shows (assertion change, docs/review/batch9/evidence/phase1/assertion-changes.json).
      if (r === '/') c.check('/: exactly one timestamp — the offline banner shows a time, the stamp under the ticker is hidden while it shows', !!d.bannerText && /\d{1,2}:\d{2}/.test(d.bannerText) && !d.stamp, { banner: d.bannerText, stamp: d.stamp })
      else c.check(`${r}: stamp shown, its time is a stored cachedAt`, !!d.stamp && stored.includes(d.stamp.cachedAt), { stamp: d.stamp, storedCount: stored.length })
      c.check(`${r}: no ErrorBoundary`, !d.errorBoundary)
      c.check(`${r}: offline banner does not cover the header`, !d.overlap || d.overlap.headerTop >= d.overlap.bannerBottom - 0.5, d.overlap)
    }
    files.push(ev.text(id, 'offline-pages.json', out))
    state.offlineOnMausam = true
    await app.goto('/mausam', { settle: 2000 }) // O5 starts from here, still offline
    return fromChecks(id, c, { files })
  })

  // ------------------------------------------------------------------------- O5
  test('O5', 'Back online', 'Airplane mode off: within 20 s fresh data replaces the cached data and the stamp disappears (app time and the emulator\'s own reconnect time recorded)', true, async (id) => {
    if (!state.offlineOnMausam) return notRun('O3 did not leave the app offline on /mausam with cached data')
    await ensureApp()
    const c = new Checks()
    const before = await pageData('/mausam')
    c.check('starting point: /mausam offline with the stamp', !!before.stamp, before.stamp)
    const t = app.mark()
    await airplane(false)
    const t0 = Date.now()
    let netUpMs = null, freshMs = null
    while (Date.now() - t0 < 40000 && freshMs === null) {
      if (netUpMs === null && /Active default network: \d+/.test(sh('dumpsys connectivity').out.slice(0, 4000))) netUpMs = Date.now() - t0
      const d = await pageData('/mausam').catch(() => null)
      const fresh200 = app.since(t).responses.some((r) => /supabase\.co$/.test(r.host) && /weather_cache_v2/.test(r.path) && r.status === 200)
      if (d && !d.stamp && d.temps.length > 0 && fresh200) freshMs = Date.now() - t0
      else await sleep(500)
    }
    c.check('fresh data replaced the cached data and the stamp went, within 20 s', freshMs !== null && freshMs <= 20000, { appMs: freshMs, androidNetworkUpMs: netUpMs, appLagMs: freshMs !== null && netUpMs !== null ? freshMs - netUpMs : null })
    const files = [(await ev.shot(id, 'online-again'))].map((x) => x.file)
    return fromChecks(id, c, { files: [...files, ev.text(id, 'reconnect.json', { appMs: freshMs, androidNetworkUpMs: netUpMs })], notes: `stamp gone + fresh weather after ${freshMs ?? '>40000'} ms; Android had a network after ${netUpMs ?? '?'} ms` })
  })

  // ------------------------------------------------------------------------- O6
  test('O6', 'Freshness policy', 'With the stored weather data time set to 30 h ago and mandi data time to 8 days ago, offline: weather numbers hidden with the "too old" message; mandi (policy: 7 days) not shown, the "too old" state instead', true, async (id) => {
    await ensureApp()
    const c = new Checks()
    const files = []
    await airplane(false)
    await waitFor(() => /bytes from|1 received/.test(sh('ping -c 1 -W 2 8.8.8.8').out), { timeout: 30000, interval: 2000 })
    await app.goto('/about', { settle: 500 }); await setLocation()
    for (const r of ['/', '/mausam', '/msp']) { await app.goto(r, { settle: 2000 }); await settle(); if (r === '/') await settleTicker() }
    const now = Date.now()
    const changed = await idbMutate(`if (e.resource === 'weather_cache_v2' || e.resource === 'api.open-meteo.com') return { ...e, dataTime: ${now} - 30 * 3600000 }; if (e.resource === 'mandi_prices' || e.resource === 'msp_prices') return { ...e, dataTime: ${now} - 8 * 86400000 }; return null`)
    c.check('stored data times changed through CDP', changed > 0, changed)
    c.check('airplane mode is really on', await airplane(true)); await sleep(2000)
    const res = {}
    for (const r of ['/mausam', '/', '/msp']) {
      await app.goto(r, { settle: 2000 })
      await settle(); if (r === '/') await settleTicker()
      await sleep(800)
      res[r] = await pageData(r)
      files.push((await ev.shot(id, r === '/' ? 'home' : r.slice(1))).file)
    }
    c.check('/mausam: no temperatures shown', res['/mausam'].temps.length === 0, res['/mausam'].temps)
    c.check('/mausam: the "too old" message with its age', !!res['/mausam'].notice?.tooOld, res['/mausam'].notice)
    c.check('/ ticker: no 8-day-old prices (policy 7 days), the offline state instead', res['/'].prices.length === 0 && res['/'].tickerOffline, { prices: res['/'].prices, tickerOffline: res['/'].tickerOffline })
    // The mandi price table only: the MSP table (official support prices, not daily) follows the general 14-day rule.
    c.check('/msp: no 8-day-old mandi prices (no mandi table), the "too old" message instead', res['/msp'].mandiTablePrices.length === 0 && !!res['/msp'].notice?.tooOld, { mandiTablePrices: res['/msp'].mandiTablePrices, notice: res['/msp'].notice })
    c.check('no spinner left on these pages', Object.values(res).every((d) => d.spinners === 0), Object.fromEntries(Object.entries(res).map(([k, d]) => [k, d.spinners])))
    await airplane(false)
    return fromChecks(id, c, { files: [...files, ev.text(id, 'freshness.json', Object.fromEntries(Object.entries(res).map(([k, d]) => [k, { notice: d.notice, temps: d.temps, prices: d.prices, mspPrices: d.mspPrices, tickerOffline: d.tickerOffline }])))], notes: 'policy implemented: weather ≤ 24 h (fetched_at), mandi ≤ 7 days (price_date), listings ≤ 3 days (stored time); older → not shown, "too old" message with the age' })
  })

  // ------------------------------------------------------------------------- O4
  test('O4', 'Offline without cache', 'Cache cleared, offline, a freshly chosen place: /mausam and /msp show a clear offline message with a working "try again" within 10–12 s; no spinner remains', true, async (id) => {
    await ensureApp()
    const c = new Checks()
    const files = []
    await app.goto('/about', { settle: 500 })
    await idbMutate("return 'delete'")
    await page().evaluate((keys) => { keys.forEach((k) => localStorage.removeItem(k)); localStorage.removeItem('ks_mandi_latest_date'); localStorage.setItem('ks_location_v1', JSON.stringify({ lat: 23.8315, lng: 79.4422, label: 'Damoh', from: 'picked' })) }, LOCATION_KEYS)
    c.check('cache empty', (await idbEntries()).length === 0)
    await app.close()
    c.check('airplane mode is really on', await airplane(true)); await sleep(2000)
    forceStop(); launchApp(); await sleep(3000)
    await app.connect({ launch: false })
    const timing = {}
    for (const r of ['/mausam', '/msp']) {
      const t0 = Date.now()
      await page().goto(APP_URL + r, { waitUntil: 'load', timeout: 45000 })
      const got = await waitFor(() => page().evaluate(() => !!document.querySelector('[data-testid="offline-notice"] [data-testid="offline-retry"]')), { timeout: 12000, interval: 300 })
      timing[r] = got ? Date.now() - t0 : null
      await sleep(1500)
      const d = await pageData(r)
      files.push((await ev.shot(id, r.slice(1))).file)
      c.check(`${r}: offline message + "try again" within 12 s`, !!got && timing[r] <= 12000, { ms: timing[r], notice: d.notice })
      c.check(`${r}: no spinner remains`, d.spinners === 0, d.spinners)
      await page().click('[data-testid="offline-retry"]')
      const again = await waitFor(() => page().evaluate(() => !!document.querySelector('[data-testid="offline-notice"]') && document.querySelectorAll('.animate-spin').length === 0), { timeout: 12000, interval: 300 })
      c.check(`${r}: "try again" works (page fetches again, ends in the same clear state, no spinner)`, !!again)
    }
    await airplane(false)
    return fromChecks(id, c, { files: [...files, ev.text(id, 'timing.json', timing)], notes: `notice after ${JSON.stringify(timing)} ms` })
  })

  // ------------------------------------------------------------------------- O7
  test('O7', 'Privacy', 'Every IndexedDB entry and localStorage value written by the cache layer contains none of: the revealed number, either user\'s number / e-mail / name, auth tokens', true, async (id) => {
    await ensureApp()
    const c = new Checks()
    await app.goto('/about', { settle: 500 })
    await airplane(false)
    // Phone login keeps no Supabase Auth session; log in by e-mail (user B) so real auth tokens
    // exist in storage and can be searched for in the cache.
    await logoutViaUi()
    await app.goto('/login', { settle: 1500 })
    await page().fill('form[data-testid="login-email-form"] #email', ACCT.B.email)
    await page().fill('form[data-testid="login-email-form"] #password', ACCT.B.password)
    await page().click('[data-testid="login-email-submit"]')
    await waitFor(async () => (await session())?.email === ACCT.B.email, { timeout: 20000 })
    // Visit the private pages once more so the cache had every chance to see them.
    for (const r of ['/my', '/profile', ...(state.listingId ? [`/listing/${state.listingId}`] : [])]) await app.goto(r, { settle: 3000 })
    const tokens = await page().evaluate(() => { const out = []; for (const k of Object.keys(localStorage)) if (k.startsWith('ks_sb_auth')) { try { const v = JSON.parse(localStorage.getItem(k)); for (const f of ['access_token', 'refresh_token']) if (v?.[f]) out.push(v[f]) } catch { /* not json */ } } return out })
    const entries = await idbEntries()
    const cacheLs = await page().evaluate(() => ({ ks_mandi_latest_date: localStorage.getItem('ks_mandi_latest_date') }))
    const hay = JSON.stringify(entries) + JSON.stringify(cacheLs)
    const needles = { phoneA: ACCT.A.phone, phoneB: ACCT.B.phone, emailA: ACCT.A.email, emailB: ACCT.B.email, nameA: ACCT.A.name, nameB: ACCT.B.name, revealed: (shared.revealed || '').replace(/\D/g, '').slice(-10) || null }
    tokens.forEach((t, i) => { needles[`token${i}`] = t })
    const hits = {}
    for (const [k, v] of Object.entries(needles)) if (v) hits[k] = hay.split(v).length - 1
    c.check(`${entries.length} cache entries + the cache layer's localStorage scanned: 0 occurrences of every private value`, Object.values(hits).every((n) => n === 0), hits)
    c.check('at least one auth token existed to look for (a logged-in session was scanned)', tokens.length > 0, tokens.length)
    c.check('no private resource was stored', !entries.some((e) => /rpc\/(get_listing_contact|get_my_listings|app_)|\/profiles|\/auth\/v1/.test(e.url)), [...new Set(entries.map((e) => e.resource))])
    return fromChecks(id, c, { files: [ev.text(id, 'privacy-scan.json', { entries: entries.length, resources: [...new Set(entries.map((e) => e.resource))], occurrences: hits, cacheLocalStorage: Object.keys(cacheLs) })] })
  })

  // ------------------------------------------------------------------------- O1 / O1b
  for (const [tid, name, assertion, fn] of [
    ['O1', 'Cache unit tests', 'Node: put/get, expiry by policy, eviction at the cap, quota error swallowed, private URLs never stored, non-200 never stored, key includes Accept/Prefer/Range, key stable', runO1],
    ['O1b', 'Day-change fallback', 'Node, fake clock + network: cache filled "yesterday" through the real fetchMandiPrices()/fetchWeatherCell(); a day later offline, mandi returns the cached rows labelled yesterday/older and weather the cell or the policy state', runO1b],
  ]) {
    test(tid, name, assertion, false, async (id) => { const c = await fn(); return fromChecks(id, c) })
  }

  // ------------------------------------------------------------------------- O8
  test('O8', 'Web unchanged', 'Cache layer inert without window.Capacitor; npm run build OK; vite preview: page loads, SW registers, no console errors; main-chunk size before (end of 8A) vs after; no new Devanagari outside sanctioned files', false, async (id) => {
    const c = await runO8a()
    shared.sizeBase = 'd165fbb'
    const t18 = await TESTS.find((x) => x.id === 'T18').fn('O8-web')
    shared.sizeBase = null
    c.check(`web build / preview / size (T18 machinery against d165fbb): ${t18.status}`, t18.status === PASS, t18.notes)
    // The repository's Devanagari-location check (scripts/test/v11_phase6.mjs).
    const v = spawnSync(process.execPath, ['scripts/test/v11_phase6.mjs'], { cwd: ROOT, encoding: 'utf8' })
    const line = (v.stdout || '').split(/\r?\n/).find((l) => /no hardcoded Devanagari/.test(l)) || ''
    const offenders = (line.split('—')[1] || '').split(',').map((s) => s.trim().replace(/\\/g, '/')).filter(Boolean)
    const ALLOWED = ['src/lib/i18n/strings.js', 'src/lib/i18n/disclaimers.js', 'src/lib/i18n/legal.js', 'src/lib/share/shareMessages.js', 'src/lib/listings/catalog.js', 'src/components/LanguageToggle.jsx', 'src/screens/Welcome.jsx', 'src/components/admin/WhatsAppAdminPanel.jsx']
    const genuine = offenders.filter((f) => !ALLOWED.includes(f) && !f.startsWith('src/content/') && !f.startsWith('src/components/categories/'))
    const BASELINE = ['src/components/PromoBento.jsx', 'src/lib/i18n/termsContent.js', 'src/lib/location/places.js', 'src/lib/mela/melaFormat.js']
    const added = genuine.filter((f) => !BASELINE.includes(f))
    c.check('Devanagari check: no NEW offender (allowlist applied with / paths; 4 offenders pre-date 8B)', added.length === 0, { added, genuine })
    c.check('none of the 8B files contains Devanagari outside strings.js', !genuine.some((f) => /offline|OfflineStamp|OfflineNotice/.test(f)))
    return fromChecks(id, c, { files: [...(t18.evidenceFiles || []), ev.text(id, 'devanagari-check.txt', `script exit ${v.status}\n${line}\n\nnormalised genuine offenders: ${genuine.join(', ')}\nnew in 8B: ${added.join(', ') || 'none'}`)], notes: `${t18.notes}; v11_phase6.mjs itself exits ${v.status} on Windows (pre-existing: it compares backslash paths to its forward-slash allowlist)` })
  })

  // ------------------------------------------------------------------------- S9
  test('S9', 'Feedback + CORS (staging-local)', 'wrangler pages dev on :8788 (+ adb reverse) and the staging-local APK: /grievance POST carries Origin https://localhost, preflight 204 with that Allow-Origin, the form shows success or its documented failure state; other origins get no CORS headers; mic hidden when /transcribe is not configured', true, async (id) => {
    const c = new Checks()
    const files = []
    const obs = {}
    // Build the local-API APK.
    if (!SKIP_BUILD || !fs.existsSync(LOCAL_APK)) {
      const b = npmRun('android:debug:staging-local', 'S9-build-staging-local.log')
      c.check('staging-local APK built', b.status === 0 && fs.existsSync(LOCAL_APK), `exit ${b.status}`)
      if (b.status !== 0) return fromChecks(id, c)
    }
    // .dev.vars: the staging URL only — no service-role key (rule: none), no e-mail key, no Gemini key.
    const envText = fs.readFileSync(path.join(ROOT, '.env'), 'utf8')
    const sbUrl = (envText.match(/^\s*VITE_SUPABASE_URL\s*=\s*["']?([^"'\r\n]+)/m) || [])[1]
    const devVars = path.join(ROOT, '.dev.vars')
    fs.writeFileSync(devVars, `# local wrangler only — gitignored; staging URL only, no keys\nSUPABASE_URL=${sbUrl}\n`)
    obs.devVarsNames = ['SUPABASE_URL']
    // Only OUR local server: processes whose command line is `wrangler … pages dev dist --port 8788`
    // and the workerd binaries npx installed for it. Used before starting (a leftover from an
    // earlier run would hold the port) and after the test.
    const stopLocalWrangler = () => {
      if (!WIN) { spawnSync('pkill', ['-f', 'pages dev dist --port 8788']); return }
      spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', "Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and $_.Name -ne 'powershell.exe' } | Where-Object { $_.CommandLine -match 'pages dev dist --port 8788' -or ($_.Name -eq 'workerd.exe' -and $_.CommandLine -match 'npm-cache\\\\_npx') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"], { timeout: 60000 })
    }
    stopLocalWrangler()
    const wlog = path.join(LOG_DIR, 'S9-wrangler.log')
    const fd = fs.openSync(wlog, 'w')
    const wr = spawn(WIN ? 'npx.cmd' : 'npx', ['--yes', '--prefer-offline', 'wrangler@4', 'pages', 'dev', 'dist', '--port', '8788', '--ip', '127.0.0.1', '--compatibility-date', '2025-01-01'], { cwd: ROOT, stdio: ['ignore', fd, fd], shell: WIN, env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1' } })
    try {
      const up = await waitFor(async () => { try { return (await fetch('http://127.0.0.1:8788/')).status > 0 } catch { return false } }, { timeout: 300000, interval: 2000 })
      if (!up) { const tail = fs.readFileSync(wlog, 'utf8').slice(-800); return { status: NOTRUN, notes: `wrangler pages dev did not start: ${tail.replace(/\s+/g, ' ').slice(-300)}`, evidenceFiles: [ev.text(id, 'wrangler-tail.txt', tail)] } }
      // Direct CORS checks against the local functions.
      const pre = await fetch('http://127.0.0.1:8788/api/feedback', { method: 'OPTIONS', headers: { Origin: 'https://localhost', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } })
      obs.preflight = { status: pre.status, allowOrigin: pre.headers.get('access-control-allow-origin'), allowHeaders: pre.headers.get('access-control-allow-headers') }
      c.check('preflight from https://localhost: 204 with Access-Control-Allow-Origin https://localhost', pre.status === 204 && obs.preflight.allowOrigin === 'https://localhost', obs.preflight)
      const evil = await fetch('http://127.0.0.1:8788/api/feedback', { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' } })
      obs.evil = { status: evil.status, allowOrigin: evil.headers.get('access-control-allow-origin') }
      c.check('a different origin gets no CORS headers', obs.evil.allowOrigin === null, obs.evil)
      const tr = await fetch('http://127.0.0.1:8788/transcribe', { headers: { Origin: 'https://localhost' } })
      obs.transcribe = { status: tr.status, body: await tr.text().catch(() => ''), allowOrigin: tr.headers.get('access-control-allow-origin') }
      // The app.
      adb(['reverse', 'tcp:8788', 'tcp:8788'])
      await app.close()
      const inst = adb(['install', '-r', LOCAL_APK], { timeout: 180000 })
      c.check('staging-local APK installed', /Success/.test(inst.out), inst.out.trim().split('\n').pop())
      forceStop(); launchApp(); await sleep(4000)
      await app.connect({ launch: false })
      const reqs = []
      page().on('request', async (r) => { if (/:8788\/api\/feedback/.test(r.url())) reqs.push({ method: r.method(), headers: await r.allHeaders().catch(() => r.headers()) }) })
      const resps = []
      page().on('response', async (r) => { if (/:8788\/api\/feedback/.test(r.url())) resps.push({ status: r.status(), headers: await r.allHeaders().catch(() => r.headers()) }) })
      await app.goto('/grievance', { settle: 2000 })
      await page().fill('#fb-contact', ACCT.A.email)
      await page().fill('#fb-message', `${MARKER} feedback test from the staging-local app (please ignore)`)
      await page().click('form[data-testid="feedback-form"] button[type="submit"]')
      const outcome = await waitFor(() => page().evaluate(() => document.querySelector('[data-testid="feedback-done"]') ? 'success' : document.querySelector('[data-testid="feedback-mailto"]') ? 'failure-with-email-fallback' : document.querySelector('form[data-testid="feedback-form"] [role="alert"]') ? 'failure' : null), { timeout: 30000 })
      obs.formOutcome = outcome
      obs.formMessage = await page().evaluate(() => document.querySelector('form[data-testid="feedback-form"] [role="alert"]')?.innerText.trim() || document.querySelector('[data-testid="feedback-done"]')?.innerText.trim() || null)
      files.push((await ev.shot(id, 'grievance-after-submit')).file)
      const post = reqs.find((r) => r.method === 'POST')
      obs.request = post ? { origin: post.headers.origin || post.headers.Origin || null } : null
      obs.response = resps[0] ? { status: resps[0].status, allowOrigin: resps[0].headers['access-control-allow-origin'] || null } : null
      c.check('the app\'s POST carries Origin https://localhost', obs.request?.origin === 'https://localhost', obs.request)
      c.check('the response reaches the app with Access-Control-Allow-Origin https://localhost', obs.response?.allowOrigin === 'https://localhost', obs.response)
      const wl = fs.readFileSync(wlog, 'utf8')
      obs.wranglerSawPreflight = /OPTIONS \/api\/feedback/.test(wl)
      // Mic: /transcribe reports not configured → no mic button.
      await app.goto('/search', { settle: 4000 })
      obs.micButtons = await page().evaluate(() => document.querySelectorAll('[data-testid="voice-search-btn"]').length)
      c.check(`mic hidden when /transcribe says not configured (${obs.transcribe.body})`, /"configured":false/.test(obs.transcribe.body) && obs.micButtons === 0, { transcribe: obs.transcribe, micButtons: obs.micButtons })
      record('feedback attempt (local wrangler, staging)', { contact: ACCT.A.email, marker: MARKER, outcome, stored: outcome === 'success' })
    } finally {
      // Stop wrangler and its workerd children (kill the tree first, then anything still on :8788).
      // A slow start can bring the server (workerd) up after the first kill, so keep clearing the
      // port for up to 15 s.
      const listening = () => [...((WIN ? spawnSync('netstat', ['-ano'], { encoding: 'utf8' }).stdout : '') || '').matchAll(/127\.0\.0\.1:8788\s+\S+\s+LISTENING\s+(\d+)/g)].map((m) => m[1])
      try {
        if (WIN) spawnSync('taskkill', ['/pid', String(wr.pid), '/T', '/F']); else wr.kill()
      } catch { /* already gone */ }
      for (let i = 0; i < 10; i++) {
        stopLocalWrangler()
        const pids = listening()
        for (const pid of pids) spawnSync('taskkill', ['/pid', pid, '/T', '/F'])
        await sleep(1500)
        if (!pids.length && !listening().length && i >= 2) break
      }
      obs.port8788FreeAfter = listening().length === 0
      obs.wranglerProcessesLeft = WIN ? Number((spawnSync('powershell.exe', ['-NoProfile', '-Command', "(Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and $_.Name -ne 'powershell.exe' } | Where-Object { $_.CommandLine -match 'pages dev dist --port 8788' -or ($_.Name -eq 'workerd.exe' -and $_.CommandLine -match 'npm-cache\\\\_npx') } | Measure-Object).Count"], { encoding: 'utf8' }).stdout || '').trim()) : null
      fs.closeSync(fd)
      adb(['reverse', '--remove', 'tcp:8788'])
      fs.rmSync(devVars, { force: true })
      // Leave the normal staging app installed again.
      if (fs.existsSync(STAGING_APK)) adb(['install', '-r', STAGING_APK], { timeout: 180000 })
    }
    c.check('wrangler / workerd stopped afterwards (port 8788 free, no wrangler process left)', obs.port8788FreeAfter !== false && !obs.wranglerProcessesLeft, { portFree: obs.port8788FreeAfter, processesLeft: obs.wranglerProcessesLeft })
    files.push(ev.text(id, 'feedback-cors.json', obs))
    const r = fromChecks(id, c, { files, notes: `form outcome: ${obs.formOutcome} ("${obs.formMessage}"). functions/api/feedback.js stores only with SUPABASE_SERVICE_ROLE_KEY, which this batch may not use, so it answers 503 "unavailable" and the form shows its e-mail fallback.` })
    // The success state cannot be reached without a service-role key → that part is NOT-RUN.
    if (r.status === PASS && obs.formOutcome !== 'success') r.status = NOTRUN
    return r
  })

  // ------------------------------------------------------------------------- negative control
  if (process.env.KS_NEGATIVE_CONTROL === '1') {
    test('NEG-S', 'Negative control (staging) — deliberately false assertion', 'The staging home page contains "ZZZ_NOT_PRESENT" (it does not: MUST be RAN-FAILED)', true, async (id) => {
      await ensureApp(); await app.goto('/', { settle: 1500 })
      const c = new Checks()
      c.check('home page text contains "ZZZ_NOT_PRESENT"', (await page().evaluate(() => document.body.innerText)).includes('ZZZ_NOT_PRESENT'))
      return fromChecks(id, c, { files: [(await ev.shot(id, 'home')).file] })
    })
  }
}

export const STAGING_ORDER = ['S1', 'S2', 'S3', 'S10', 'S4', 'S5', 'S6', 'S7', 'S8', 'L1', 'K1', 'O2', 'O3', 'O5', 'O6', 'O4', 'H1', 'C1', 'O7', 'O1', 'O1b', 'O8', 'S9', 'NEG-S']
export { FLAVOR }
