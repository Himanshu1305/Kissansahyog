// Batch 9 Phase 5C.4 — bad networks, WEB STAND-IN (staging website, headless Chromium), not the app.
//   node scripts/phase5c/network.mjs --part slow|signup|login|post|reveal
// slow   : CDP Network.emulateNetworkConditions (2G-like, cache disabled) on / and /browse — content or a
//          progress indicator must show, no spinner left after 10 s once content is there.
// others : the connection is cut IN THE MIDDLE of an action, two ways:
//          (a) "drop before the server": the request is aborted (internetdisconnected) and the context goes offline;
//          (b) "answer lost": the request reaches the server (route.fetch) but the answer is thrown away and the
//              context goes offline — the server did the work, the phone does not know.
//          Then the connection comes back and the user retries. Throw-away KSTEST accounts only (never KEEP for writes).
import * as C from './lib5c.mjs'
import { fillStep2, testJpeg, waitStep2 } from '../phase5b/listings.mjs'

const part = C.arg('part', 'slow')
const R = C.loadResults('network')
const DATA = C.loadResults('network-created') // ids of what this phase created on staging (no secrets)
const LISTING = '76e13f41-f2eb-4565-998a-5244640329b7' // KEEP P1 labour offer, details SHOWN (read-only target)
const pw = C.password()
const topErr = (page) => page.locator('[data-testid="signup-error"], [data-testid="login-phone-error"], [data-testid="login-email-error"], [role="alert"], .bg-red-50').first().innerText({ timeout: 3000 }).then((t) => t.replace(/\s+/g, ' ').trim()).catch(() => null)
const session = (page) => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('ks_session_v1') || 'null') } catch { return null } })
function created(rec) { DATA.results.push({ at: new Date().toISOString(), phase: 'Phase 5C', keep: false, site: 'https://staging.kissansahyog.com (website, Playwright phone viewport)', ...rec }); C.saveResults(DATA) }

// Cut the connection on the first request matching `re`. mode 'before' | 'after'.
async function cutOn(ctx, page, re, mode) {
  const hit = { n: 0, serverStatus: null }
  const handler = async (route) => {
    if (!re.test(route.request().url()) || route.request().method() === 'OPTIONS' || hit.n) return route.fallback()
    hit.n++
    if (mode === 'after') {
      try { const resp = await route.fetch(); hit.serverStatus = resp.status(); try { const j = await resp.json(); hit.id = j?.id || null } catch { /* */ } } catch (e) { hit.serverStatus = 'fetch-error' }
    }
    await ctx.setOffline(true)
    return route.abort('internetdisconnected')
  }
  await page.route('**/*', handler)
  return { hit, off: async () => { await page.unroute('**/*', handler); await ctx.setOffline(false) } }
}

async function signupThrowaway(page, tag) {
  const n = C.L5.newNoise(tag)
  await C.goto(page, '/signup')
  await C.L5.fillSignupForm(page, n, pw)
  // Batch 10A Task E: the acknowledgment is on the same page (no step 2) — tick it; acceptBtn = Register.
  await page.check('[data-testid="disclaimer-accept"]')
  return n
}
const acceptBtn = (page) => page.locator('[data-testid="signup-form"] button[type="submit"]')

async function myCount(page) {
  await C.goto(page, '/my', 2500)
  return page.locator('[data-testid="listing-card"]').count()
}

C.memoryGuard()
C.heartbeat(`5C.4 network part ${part}`)
try {
  if (part === 'slow') {
    // "real content" = the page's own live data has rendered (not just the prerendered HTML shell):
    // '/' → the mandi ticker prices; '/browse' → listing cards or the category chips of the hydrated app.
    var REAL = { '/': 'a[href^="/msp/"]', '/browse': '[data-testid="listing-card"]' }
    for (const [path, prof] of [['/', '2g'], ['/browse', '2g'], ['/', 'edge']]) {
      const id = `slow:${prof}:${path}`
      const { ctx, page, diag } = await C.newPhone({ geo: { lat: 23.8388, lng: 78.7378 } })
      const cdp = await ctx.newCDPSession(page)
      await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
      // 2G (GPRS-like): 250 kbit/s down, 50 kbit/s up, 800 ms RTT.  EDGE-like: 240/200 kbit/s, 400 ms (Android emulator "edge").
      const cond = prof === '2g' ? { latency: 800, downloadThroughput: 250 * 1024 / 8, uploadThroughput: 50 * 1024 / 8 } : { latency: 400, downloadThroughput: 240 * 1024 / 8, uploadThroughput: 200 * 1024 / 8 }
      await cdp.send('Network.emulateNetworkConditions', { offline: false, ...cond })
      const t0 = Date.now()
      page.goto(C.BASE + path, { waitUntil: 'commit', timeout: 120000 }).catch(() => {})
      const samples = []
      let firstPaint = null, firstContent = null, lastSpinner = null
      while (Date.now() - t0 < 120000) {
        await page.waitForTimeout(500)
        const s = await page.evaluate((sel) => { const root = document.querySelector('#root'); const t = (root?.innerText || '').replace(/\s+/g, ' ').trim(); const body = (document.body?.innerText || '').trim(); const real = sel ? !!document.querySelector(sel) : false; return { h1: document.querySelector('h1')?.innerText?.slice(0, 40) || null, real, root: t.length, body: body.length, spin: document.querySelectorAll('.animate-spin, [role="progressbar"], [aria-busy="true"]').length, skel: document.querySelectorAll('.animate-pulse').length } }, REAL[path]).catch(() => null)
        if (!s) continue
        const t = Date.now() - t0
        samples.push({ t, ...s })
        if (firstPaint == null && (s.body > 0 || s.spin || s.skel)) firstPaint = t
        if (firstContent == null && s.real) firstContent = t
        if (s.spin || s.skel) lastSpinner = t
        if (firstContent != null && t - firstContent > 6000) break
      }
      const spinnerAfterContent = lastSpinner != null && firstContent != null ? lastSpinner - firstContent : null
      // the SPA fallback serves the prerendered HOMEPAGE html for every non-prerendered URL; while the JS is still
      // downloading the visitor of /browse sees the homepage. More than 10 s of that counts as a failure.
      const homeH1 = 'आज किसान के लिए'
      const wrongPage = path !== '/' ? samples.filter((x) => x.h1 === homeH1) : []
      const wrongPageMs = wrongPage.length ? wrongPage[wrongPage.length - 1].t : 0
      const ok = firstPaint != null && firstPaint <= 10000 && firstContent != null && (spinnerAfterContent == null || spinnerAfterContent <= 10000) && wrongPageMs <= 10000
      // proof the throttling was really applied: effective speed of the biggest script download
      const net = await page.evaluate(() => { const rs = performance.getEntriesByType('resource').filter((r) => r.transferSize > 0); const big = rs.sort((a, b) => b.transferSize - a.transferSize)[0]; return { requests: rs.length, totalKB: Math.round(rs.reduce((a, r) => a + r.transferSize, 0) / 1024), biggest: big ? { name: big.name.split('/').pop().slice(0, 40), kB: Math.round(big.transferSize / 1024), ms: Math.round(big.duration), kbitPerS: Math.round(big.transferSize * 8 / big.duration) } : null } })
      const ev = await C.shot(page, 'network', `slow-${prof}-${path === '/' ? 'home' : 'browse'}`)
      C.record(R, { id, title: `${path} on ${prof === '2g' ? '2G-like (250 kbit/s, 800 ms)' : 'EDGE-like (240 kbit/s, 400 ms)'}, cold cache`, status: ok ? 'RAN-PASSED' : 'RAN-FAILED', detail: { wrongPageShownUntilMs: wrongPageMs || null, net, realContentSelector: REAL[path], firstSomethingVisibleMs: firstPaint, firstRealContentMs: firstContent, spinnerStillShownMsAfterContent: spinnerAfterContent, timeline: samples.filter((x, i) => i % 10 === 0 || i === samples.length - 1).map((x) => ({ t: x.t, h1: x.h1, real: x.real, spin: x.spin, skel: x.skel, path: null })), lastSample: samples[samples.length - 1], console: diag.console.slice(0, 3), rule: 'something visible (content or progress) within 10 s; no spinner/skeleton > 10 s after content; not more than 10 s of another page content under this URL' }, evidence: ev })
      C.saveResults(R)
      await ctx.close()
    }
  }

  if (part === 'signup') {
    // S1: drop BEFORE the server on the second step (auth user created, profile call lost) → message → retry finishes it
    {
      const { ctx, page } = await C.newPhone({ geo: { lat: 23.8388, lng: 78.7378 } })
      const n = await signupThrowaway(page, '5C-S1')
      const cut = await cutOn(ctx, page, /\/rpc\/app_register/, 'before')
      await acceptBtn(page).click(); await page.waitForTimeout(6000)
      const msg = await topErr(page); const s1 = await session(page)
      const ev1 = await C.shot(page, 'network', 'signup-S1-dropped')
      await cut.off(); await page.waitForTimeout(1500)
      const stillOnForm = await acceptBtn(page).count()
      let retry = null
      if (stillOnForm) {
        const rr = page.waitForResponse((r) => r.url().includes('/rpc/app_register'), { timeout: 40000 }).catch(() => null)
        await acceptBtn(page).click(); const r = await rr; await page.waitForTimeout(3000)
        retry = { registerStatus: r ? r.status() : null, loggedIn: !!(await session(page))?.id, url: new URL(page.url()).pathname, error: await topErr(page) }
      }
      const ev2 = await C.shot(page, 'network', 'signup-S1-after-retry')
      const sess = await session(page)
      if (sess?.id) created({ kind: 'profile + Supabase Auth user (throw-away, signup with connection cut)', tag: '5C-S1', profile_id: sess.id, marker: 'KSTEST', full_name: n.name })
      // nothing duplicated: log out, both logins land on the SAME profile id
      await C.L5.logout(page)
      const le = await C.L5.loginEmail(page, n.email, pw); await C.L5.logout(page)
      const lp = await C.L5.loginPhone(page, n.mobile)
      await ctx.close()
      const ok = !!msg && !s1?.id && !!retry?.loggedIn && le.ok && lp.ok && le.id === lp.id && le.id === sess?.id
      C.record(R, { id: 'drop:signup:before', title: 'sign-up: connection lost while the profile is being created (app_register never reached) → message, retry after reconnect completes ONE account', status: ok ? 'RAN-PASSED' : 'RAN-FAILED', detail: { messageShown: msg, sessionWhileOffline: !!s1?.id, requestCut: cut.hit.n, retry, emailLoginId: le.id, phoneLoginId: lp.id, sameAccount: le.id === lp.id }, evidence: [ev1, ev2] })
      C.saveResults(R)
    }
    // S2: answer LOST after the server created the profile → what does the user see, and does retry duplicate?
    {
      const { ctx, page } = await C.newPhone({ geo: { lat: 23.8388, lng: 78.7378 } })
      const n = await signupThrowaway(page, '5C-S2')
      const cut = await cutOn(ctx, page, /\/rpc\/app_register/, 'after')
      await acceptBtn(page).click(); await page.waitForTimeout(6000)
      const msg = await topErr(page)
      const ev1 = await C.shot(page, 'network', 'signup-S2-answer-lost')
      await cut.off(); await page.waitForTimeout(1500)
      let retry = null
      if (await acceptBtn(page).count()) {
        await acceptBtn(page).click(); await page.waitForTimeout(6000)
        retry = { loggedIn: !!(await session(page))?.id, url: new URL(page.url()).pathname, error: await topErr(page) }
      }
      const ev2 = await C.shot(page, 'network', 'signup-S2-after-retry')
      await C.L5.logout(page).catch(() => {})
      const le = await C.L5.loginEmail(page, n.email, pw); await C.L5.logout(page)
      const lp = await C.L5.loginPhone(page, n.mobile)
      if (le.id) created({ kind: 'profile + Supabase Auth user (throw-away, signup answer lost)', tag: '5C-S2', profile_id: le.id, marker: 'KSTEST', full_name: n.name })
      await ctx.close()
      // pass = a message while offline, no second account (both logins → same id), and the user can get in (retry or login)
      const ok = !!msg && le.ok && lp.ok && le.id === lp.id && cut.hit.serverStatus === 200
      C.record(R, { id: 'drop:signup:after', title: 'sign-up: server created the account but the answer was lost → message; after reconnect: no duplicate account, user can get in', status: ok ? 'RAN-PASSED' : 'RAN-FAILED', detail: { serverStatusOfLostAnswer: cut.hit.serverStatus, messageShown: msg, retry, emailLoginOk: le.ok, phoneLoginOk: lp.ok, sameAccount: le.id === lp.id, note: retry && /already|पहले से/i.test(retry.error || '') ? 'retry tells the user the e-mail is already registered (the account exists; logging in works) — confusing but safe' : null }, evidence: [ev1, ev2] })
      C.saveResults(R)
    }
  }

  if (part === 'signup1retry') {
    // S1 follow-up: after the drop the form came back (data kept, generic message, offline banner) and the
    // disclaimer step was gone, so the user's natural retry is: tap "create account" again → disclaimer → accept.
    const { ctx, page } = await C.newPhone({ geo: { lat: 23.8388, lng: 78.7378 } })
    const n = await signupThrowaway(page, '5C-S1') // same identity as the dropped attempt
    const rr = page.waitForResponse((r) => r.url().includes('/rpc/app_register'), { timeout: 40000 }).catch(() => null)
    await acceptBtn(page).click(); const r = await rr; await page.waitForTimeout(3000)
    const sess = await session(page)
    const retry = { registerStatus: r ? r.status() : null, loggedIn: !!sess?.id, url: new URL(page.url()).pathname, error: await topErr(page) }
    const ev = await C.shot(page, 'network', 'signup-S1-after-retry')
    if (sess?.id) created({ kind: 'profile + Supabase Auth user (throw-away, signup with connection cut, finished by retry)', tag: '5C-S1', profile_id: sess.id, marker: 'KSTEST', full_name: n.name })
    await C.L5.logout(page)
    const le = await C.L5.loginEmail(page, n.email, pw); await C.L5.logout(page)
    const lp = await C.L5.loginPhone(page, n.mobile)
    await ctx.close()
    const prev = R.results.find((x) => x.id === 'drop:signup:before')
    const ok = !!prev?.detail?.messageShown && !prev?.detail?.sessionWhileOffline && retry.loggedIn && le.ok && lp.ok && le.id === lp.id && le.id === sess?.id
    C.record(R, { id: 'drop:signup:before', title: 'sign-up: connection lost while the profile is being created (app_register never reached) → message, retry after reconnect completes ONE account', status: ok ? 'RAN-PASSED' : 'RAN-FAILED', detail: { ...(prev?.detail || {}), afterDrop: 'form shown again with all data kept + generic message + offline banner; e-mail and mobile could NOT log in yet (auth user without profile)', retry, emailLoginId: le.id, phoneLoginId: lp.id, sameAccount: le.id === lp.id }, evidence: [...(prev?.evidence || []).slice(0, 1), ev] })
    C.saveResults(R)
  }

  if (part === 'login') {
    const n = C.L5.noiseList().find((x) => x.tag === '5C-S1')
    if (!n) throw new Error('run --part signup first')
    for (const [kind, re] of [['phone', /\/rpc\/app_login(\?|$)/], ['email', /\/auth\/v1\/token/]]) {
      const { ctx, page } = await C.newPhone()
      await C.goto(page, '/login', 800)
      if (kind === 'phone') await page.fill('[data-testid="login-phone-form"] #phone', n.mobile)
      else { await page.fill('[data-testid="login-email-form"] #email', n.email); await page.fill('[data-testid="login-email-form"] #password', pw) }
      const cut = await cutOn(ctx, page, re, 'before')
      await page.click(kind === 'phone' ? '[data-testid="login-phone-submit"]' : '[data-testid="login-email-submit"]')
      await page.waitForTimeout(6000)
      const msg = await topErr(page); const s1 = await session(page)
      const ev1 = await C.shot(page, 'network', `login-${kind}-dropped`)
      await cut.off(); await page.waitForTimeout(1000)
      await page.click(kind === 'phone' ? '[data-testid="login-phone-submit"]' : '[data-testid="login-email-submit"]')
      await page.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 25000 }).catch(() => {})
      await page.waitForTimeout(1000)
      const s2 = await session(page)
      await ctx.close()
      const ok = !!msg && !s1?.id && !!s2?.id
      C.record(R, { id: `drop:login:${kind}`, title: `login by ${kind === 'phone' ? 'mobile' : 'e-mail + password'}: connection lost mid-request → message; retry after reconnect logs in`, status: ok ? 'RAN-PASSED' : 'RAN-FAILED', detail: { requestCut: cut.hit.n, messageShown: msg, loggedInWhileOffline: !!s1?.id, loggedInAfterRetry: !!s2?.id }, evidence: ev1 })
      C.saveResults(R)
    }
  }

  if (part === 'post') {
    const n = C.L5.noiseList().find((x) => x.tag === '5C-S1')
    if (!n) throw new Error('run --part signup first')
    const { ctx, page } = await C.newPhone({ geo: { lat: 23.8388 + 0.004, lng: 78.7378 + 0.004 } })
    const lr = await C.L5.loginPhone(page, n.mobile)
    if (!lr.ok) throw new Error('throw-away login failed')
    const fillTo3 = async (marker, photo = false) => {
      await C.goto(page, '/post', 1200)
      await page.click('[data-testid="post-cat-bhusa"]'); await page.click('[data-testid="post-type-offer"]'); await page.click('[data-testid="post-next"]')
      await waitStep2(page) // Batch 10A: source is on step 1 (default farmer)
      await fillStep2(page, marker)
      if (photo) { await page.setInputFiles('input[type="file"]', { name: 'kstest-5c.jpg', mimeType: 'image/jpeg', buffer: await testJpeg('KSTEST 5C') }); await page.waitForTimeout(800) }
      await page.click('[data-testid="post-next"]'); await page.waitForSelector('[data-testid="post-submit"]', { timeout: 20000 })
      await page.fill('#f_asset_village', `${marker} Sagar`)
      for (const cb of await page.locator('input[type="checkbox"]:visible').all()) { if ((await cb.getAttribute('data-testid')) === 'wide-visibility-checkbox') continue; if (!(await cb.isChecked())) await cb.check() }
    }
    const success = () => page.getByText(/आपकी लिस्टिंग जुड़ गई|Your listing has been posted/).count()
    for (const [mode, re, photo] of [['before', /\/rpc\/create_listing_with_location/, false], ['after', /\/rpc\/create_listing_with_location/, false], ['photo', /\/storage\/v1\/object\/listing-photos/, true]]) {
      const id = `drop:post:${mode}`
      const marker = `KSTEST 5C-${mode} ${Date.now() % 100000}`
      const before = await myCount(page)
      await fillTo3(marker, photo)
      const creates = []
      const onResp = async (r) => { if (r.url().includes('/rpc/create_listing_with_location')) { let lid = null; try { lid = (await r.json())?.id || null } catch { /* */ } creates.push({ status: r.status(), id: lid }) } }
      page.on('response', onResp)
      const cut = await cutOn(ctx, page, re, mode === 'after' ? 'after' : 'before')
      await page.click('[data-testid="post-submit"]'); await page.waitForTimeout(7000)
      const msg = await topErr(page); const stillOnForm = await page.locator('[data-testid="post-submit"]').count(); const okWhileOff = await success()
      const ev1 = await C.shot(page, 'network', `post-${mode}-dropped`)
      await cut.off(); await page.waitForTimeout(1500)
      let retried = false
      if (stillOnForm && !okWhileOff) { await page.click('[data-testid="post-submit"]').catch(() => {}); retried = true; await page.waitForTimeout(8000) }
      const okAfter = await success()
      const ev2 = await C.shot(page, 'network', `post-${mode}-after-retry`)
      page.off('response', onResp)
      const after = await myCount(page)
      const delta = after - before
      const ids = [cut.hit.id, ...creates.map((c) => c.id)].filter(Boolean)
      for (const lid of [...new Set(ids)]) created({ kind: 'listing (throw-away, posted with connection cut)', tag: id, listing_id: lid, category: 'bhusa', listing_type: 'offer', marker: 'KSTEST' })
      created({ kind: 'listing count check', tag: id, marker, my_listings_before: before, my_listings_after: after })
      const ok = !!msg && !okWhileOff && !!okAfter && delta === 1
      C.record(R, { id, title: mode === 'before' ? 'post submit: connection lost before the server → message, retry after reconnect posts ONE listing' : mode === 'after' ? 'post submit: server created the listing but the answer was lost → message; retry must not create a second listing' : 'post with photo: connection lost during the photo upload → message, retry posts ONE listing with the photo', status: ok ? 'RAN-PASSED' : 'RAN-FAILED', detail: { requestCut: cut.hit.n, serverStatusOfLostAnswer: cut.hit.serverStatus, messageShown: msg, stillOnFormWhileOffline: stillOnForm > 0, retried, successAfterRetry: okAfter > 0, myListingsBefore: before, myListingsAfter: after, delta, createCallsSeenByPage: creates, listingIdsWithMarker: [...new Set(ids)] }, evidence: [ev1, ev2] })
      C.saveResults(R)
    }
    await ctx.close()
  }

  if (part === 'reveal') {
    const n = C.L5.noiseList().find((x) => x.tag === '5C-S1')
    if (!n) throw new Error('run --part signup first')
    const { ctx, page } = await C.newPhone()
    const lr = await C.L5.loginPhone(page, n.mobile)
    if (!lr.ok) throw new Error('throw-away login failed')
    await C.goto(page, `/listing/${LISTING}`, 2500)
    const cut = await cutOn(ctx, page, /\/rpc\/get_listing_contact/, 'before')
    await page.locator('[data-testid="contact-call"]').first().click(); await page.waitForTimeout(5000)
    const sheet = page.locator('[data-testid="contact-sheet"]')
    const msg = await sheet.locator('[role="alert"], .bg-red-50, [class*="red"]').first().innerText().catch(() => null)
    const telWhileOff = await sheet.locator('a[href^="tel:"]').count()
    const spin = await sheet.locator('.animate-spin').count()
    const ev1 = await C.shot(page, 'network', 'reveal-dropped')
    await cut.off(); await page.waitForTimeout(1000)
    // close the sheet and tap again (ContactActions retries only when no contact is loaded)
    await page.mouse.click(10, 10); await page.waitForTimeout(500)
    await page.locator('[data-testid="contact-call"]').first().click(); await page.waitForTimeout(5000)
    const telAfter = await page.locator('[data-testid="contact-sheet"] a[href^="tel:"]').count()
    const ev2 = await C.shot(page, 'network', 'reveal-after-retry')
    await ctx.close()
    const ok = !!msg && !telWhileOff && !spin && telAfter > 0
    C.record(R, { id: 'drop:reveal', title: 'contact reveal: connection lost mid-request → message (no endless spinner); reveal works after reconnect', status: ok ? 'RAN-PASSED' : 'RAN-FAILED', detail: { requestCut: cut.hit.n, messageShown: msg ? msg.replace(/\d{6,}/g, '«n»') : null, numberShownWhileOffline: telWhileOff > 0, spinnerLeft: spin > 0, numberShownAfterRetry: telAfter > 0, note: 'viewer = throw-away KSTEST account; target = KEEP P1 listing (details SHOWN) — the contact-click counter on that listing went up by up to 2' }, evidence: [ev1, ev2] })
    C.saveResults(R)
  }
} finally {
  C.saveResults(R)
  await C.closeBrowser()
}
