// Batch 9 Phase 5C.1 — route sweep on the STAGING WEBSITE (web stand-in, not the app), phone viewport.
//   node scripts/phase5c/routes.mjs --part public1|public2|auth|guards
// Every route pattern of src/App.jsx is visited with a real id (taken from the live parent page), checked for
// real content / no ErrorBoundary / not 404 / no new console error, then an in-app link is followed and the
// browser Back button must return to the same route with content. Resumable (results-routes.json).
import * as C from './lib5c.mjs'

// [pattern, how to get a concrete path, auth?]  auth: 'out' = logged out, 'in' = logged in (KEEP persona P2, read-only)
export const PATTERNS = [
  ['/', '/', 'out'], ['/welcome', '/welcome', 'out'], ['/signup', '/signup', 'out'], ['/login', '/login', 'out'],
  ['/privacy', '/privacy', 'out'], ['/terms', '/terms', 'out'], ['/grievance', '/grievance', 'out'], ['/contact', '/contact', 'out'],
  ['/founder', '/founder', 'out'], ['/about', '/about', 'out'], ['/how-to-use', '/how-to-use', 'out'],
  ['/cold-storage', '/cold-storage', 'out'], ['/cold-storage/:district', { from: '/cold-storage', sel: 'a[href^="/cold-storage/"]' }, 'out'],
  ['/greenhouse/subsidy', '/greenhouse/subsidy', 'out'], ['/greenhouse', '/greenhouse', 'out'],
  ['/carbon-credit/niti-sujhav', '/carbon-credit/niti-sujhav', 'out'], ['/carbon-credit', '/carbon-credit', 'out'],
  ['/jugaad/jankari', '/jugaad/jankari', 'out'], ['/jugaad', '/jugaad', 'out'], ['/join', '/join?src=ks5c-route-sweep', 'out'],
  ['/bazaar', '/bazaar', 'out'], ['/bazaar/:slug', { from: '/bazaar', sel: 'a[href^="/bazaar/"]' }, 'out'],
  ['/search', '/search?q=gehu', 'out'], ['/articles', '/articles', 'out'], ['/articles/:slug', '/articles/parali-pollution-kisaan-ki-majboori', 'out'],
  ['/resources', '/resources', 'out'], ['/info', '/info', 'out'],
  ['/sawaal', '/sawaal', 'out'], ['/sawaal/vishay/:category', '/sawaal/vishay/disease', 'out'],
  ['/fasal/:crop/samasya', { hub: 'a[href^="/fasal/"][href$="/samasya"]' }, 'out'],
  ['/sawaal/:slug', { from: '/sawaal', sel: 'a[href^="/sawaal/"]:not([href^="/sawaal/vishay"])' }, 'out'],
  ['/safalta', '/safalta', 'out'],
  ['/yojana', '/yojana', 'out'], ['/yojana/central', '/yojana/central', 'out'], ['/yojana/mp', '/yojana/mp', 'out'],
  ['/yojana/:slug', '/yojana/e-krishi-yantra', 'out'],
  ['/videos', '/videos', 'out'], ['/drone-didi', '/drone-didi', 'out'], ['/mausam', '/mausam', 'out'], ['/fasal-salah', '/fasal-salah', 'out'],
  ['/agro-forestry', '/agro-forestry', 'out'], ['/msp', '/msp', 'out'], ['/msp/:crop', '/msp/gehun', 'out'],
  ['/credits', '/credits', 'out'], ['/kisan-mela/submit', '/kisan-mela/submit', 'out'], ['/kisan-mela', '/kisan-mela', 'out'],
  ['/browse', '/browse', 'out'], ['/listing/:id', '/listing/76e13f41-f2eb-4565-998a-5244640329b7', 'out'],
  ['*', '/ks-route-does-not-exist-5c', 'out'],
  // logged in (Protected / AdminOnly)
  ['/home', '/home', 'in'], ['/post', '/post', 'in'], ['/my', '/my', 'in'], ['/experts', '/experts', 'in'],
  ['/experts/:id', { from: '/experts', click: '[data-testid="expert-card"]' }, 'in'], ['/profile', '/profile', 'in'], ['/admin', '/admin', 'in'],
]
// Extra guard checks (not new patterns): Protected routes logged out → '/' (as coded), /admin → /login; PublicOnly routes logged in → away.
export const GUARDS = [
  ['/home', 'out', 'redirect-home'], ['/post', 'out', 'redirect-home'], ['/my', 'out', 'redirect-home'], ['/experts', 'out', 'redirect-home'],
  ['/profile', 'out', 'redirect-home'], ['/admin', 'out', 'redirect-login'],
  ['/login', 'in', 'redirect-away'], ['/signup', 'in', 'redirect-away'], ['/welcome', 'in', 'redirect-away'],
  ['/listing/76e13f41-f2eb-4565-998a-5244640329b7', 'in', 'content'], ['/browse', 'in', 'content'],
]

const part = C.arg('part', 'public1')
const R = C.loadResults('routes')
const done = new Set(R.results.filter((x) => x.status === 'RAN-PASSED').map((x) => x.id))

const isJoinPath = (p) => p.startsWith('/join')

async function resolvePath(page, how) {
  if (typeof how === 'string') return how
  if (how.hub) {
    // hub links live on Q&A detail pages: open up to 15 real /sawaal/<slug> pages until one links to the hub
    await C.goto(page, '/sawaal', 1500)
    const details = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="/sawaal/"]')].map((a) => a.getAttribute('href')).filter((h) => !h.startsWith('/sawaal/vishay')))].slice(0, 15))
    for (const d of details) {
      await C.goto(page, d, 600)
      const h = await page.locator(how.hub).first().getAttribute('href').catch(() => null)
      if (h) return h
    }
    return null
  }
  await C.goto(page, how.from, 1500)
  if (how.click) {
    const card = page.locator(how.click).first()
    if (!(await card.count())) return null
    await card.click(); await page.waitForTimeout(1500)
    return new URL(page.url()).pathname
  }
  const href = await page.locator(how.sel).first().getAttribute('href').catch(() => null)
  return href ? href.split('#')[0] : null
}

async function visit(page, diag, pattern, how, auth) {
  const id = `${auth}:${pattern}`
  if (done.has(id)) return
  const path = await resolvePath(page, how)
  if (!path) { C.record(R, { id, pattern, auth, title: `visit ${pattern}`, status: 'NOT-RUN', detail: { reason: 'no real id found on the live parent page', how } }); return }
  diag.console.length = 0; diag.pageErrors.length = 0; diag.failed.length = 0
  await C.goto(page, path, 2500)
  // allow slow data pages to finish their first load (10 s rule)
  for (let i = 0; i < 8; i++) { const s = await C.pageState(page); if (!s.spinners) break; await page.waitForTimeout(1000) }
  const st = await C.pageState(page)
  // follow an in-app link (SPA navigation), then Back
  const linkHref = await page.evaluate((cur) => {
    const as = [...document.querySelectorAll('main a[href^="/"]'), ...document.querySelectorAll('footer a[href^="/"]')].filter((a) => { const h = a.getAttribute('href'); const r = a.getBoundingClientRect(); return h && h !== cur && !h.startsWith('/listing') && h.split('?')[0] !== cur.split('?')[0] && !h.includes('#') && r.width > 0 && r.height > 0 })
    if (!as.length) return null
    as[0].setAttribute('data-ks5c-link', '1'); return as[0].getAttribute('href')
  }, st.path)
  let back = { tried: false }
  if (linkHref && !isJoinPath(path)) {
    back.tried = true; back.via = linkHref
    await page.locator('[data-ks5c-link="1"]').first().click({ timeout: 8000 }).catch((e) => { back.clickError = String(e.message).split('\n')[0] })
    await page.waitForTimeout(1500)
    back.after = new URL(page.url()).pathname
    await page.goBack({ timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(2000)
    const b = await C.pageState(page)
    back.backPath = b.path; back.backTextLength = b.textLength; back.backErrorBoundary = b.errorBoundary
    back.ok = b.path.split('?')[0] === st.path.split('?')[0] && b.textLength > 100 && !b.errorBoundary
  }
  const expect404 = pattern === '*'
  // /join logs the click (join_clicks) then leaves for the WhatsApp channel, or '/' when none is set (by design, Join.jsx)
  const isJoin = pattern === '/join'
  const adminDenied = pattern === '/admin'
  const checks = {
    content: st.textLength > 150,
    noErrorBoundary: !st.errorBoundary,
    notFoundAsExpected: expect404 ? st.notFound : !st.notFound,
    // trailing-slash redirect (e.g. /resources → /resources/) is reported as a note, not a failure
    stayedOnRoute: isJoin ? (st.path === '/' || /whatsapp\.com/.test(page.url())) : st.path.split('?')[0].replace(/\/$/, '') === path.split('?')[0].replace(/\/$/, ''),
    noSpinnerLeft: st.spinners === 0,
    noNewConsoleError: diag.console.length === 0 && diag.pageErrors.length === 0,
    backWorks: isJoin ? null : back.tried ? !!back.ok : null,
  }
  const failedChecks = Object.entries(checks).filter(([, v]) => v === false).map(([k]) => k)
  let evidence = null
  if (failedChecks.length) evidence = await C.shot(page, 'routes', id.replace(/[^a-z0-9]+/gi, '_'))
  C.record(R, {
    id, pattern, auth, path, title: `visit ${pattern} (${auth === 'in' ? 'logged in as KEEP P2' : 'logged out'})`,
    status: failedChecks.length ? 'RAN-FAILED' : 'RAN-PASSED',
    detail: { checks, failedChecks, h1: st.h1, textLength: st.textLength, spinners: st.spinners, console: diag.console.slice(0, 5), pageErrors: diag.pageErrors.slice(0, 5), failedRequests: diag.failed.slice(0, 5), back, landedPath: st.path, note: st.path.endsWith('/') && st.path !== '/' ? 'server redirected to a trailing-slash URL' : adminDenied ? 'admin screen for a non-admin: expected a "no access" message, not a crash' : null },
    evidence,
  })
  C.saveResults(R)
}

async function guard(page, path, auth, expect) {
  const id = `guard:${auth}:${path}`
  if (done.has(id)) return
  await C.goto(page, path, 2500)
  const st = await C.pageState(page)
  const p = st.path.split('?')[0]
  // Protected → '/' (App.jsx Protected: <Navigate to="/">), AdminOnly → '/login'
  const ok = expect === 'redirect-home' ? p === '/' : expect === 'redirect-login' ? p === '/login' : expect === 'redirect-away' ? p !== path : (st.textLength > 150 && !st.errorBoundary && !st.notFound)
  C.record(R, { id, pattern: path, auth, title: `${path} ${auth === 'in' ? 'logged in' : 'logged out'} → ${expect}`, status: ok ? 'RAN-PASSED' : 'RAN-FAILED', detail: { landed: st.path, h1: st.h1, textLength: st.textLength } })
  C.saveResults(R)
}

C.memoryGuard()
C.heartbeat(`5C.1 route sweep part ${part}`)
try {
  const outPatterns = PATTERNS.filter((p) => p[2] === 'out')
  const half = Math.ceil(outPatterns.length / 2)
  if (part === 'public1' || part === 'public2') {
    const list = part === 'public1' ? outPatterns.slice(0, half) : outPatterns.slice(half)
    const { ctx, page, diag } = await C.newPhone({ geo: { lat: 23.8388, lng: 78.7378 } })
    for (const [pattern, how, auth] of list) await visit(page, diag, pattern, how, auth).catch((e) => { C.record(R, { id: `${auth}:${pattern}`, pattern, auth, title: `visit ${pattern}`, status: 'RAN-FAILED', detail: { error: String(e.message).split('\n')[0] } }); C.saveResults(R) })
    await ctx.close()
  } else if (part === 'auth') {
    const ss = await C.keepSession('P2')
    const { ctx, page, diag } = await C.newPhone({ storageState: ss, geo: { lat: 23.8388, lng: 78.7378 } })
    for (const [pattern, how, auth] of PATTERNS.filter((p) => p[2] === 'in')) await visit(page, diag, pattern, how, auth).catch((e) => { C.record(R, { id: `${auth}:${pattern}`, pattern, auth, title: `visit ${pattern}`, status: 'RAN-FAILED', detail: { error: String(e.message).split('\n')[0] } }); C.saveResults(R) })
    await ctx.close()
  } else if (part === 'guards') {
    const ss = await C.keepSession('P2')
    { const { ctx, page } = await C.newPhone(); for (const g of GUARDS.filter((g) => g[1] === 'out')) await guard(page, ...g); await ctx.close() }
    { const { ctx, page } = await C.newPhone({ storageState: ss }); for (const g of GUARDS.filter((g) => g[1] === 'in')) await guard(page, ...g); await ctx.close() }
  }
} finally {
  C.saveResults(R)
  await C.closeBrowser()
}
