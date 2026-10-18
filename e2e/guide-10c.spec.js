// Batch 10C Task F — the Guide (/guide hub + /guide/register|post|find|tour) and its entry points.
// Brief items F.1–F.8 and F.11, at 360 and 412 px, Hindi and English. Public pages only; nothing
// is written to staging (visitor writes are blocked; /post is reached with a FAKE local session
// and never leaves step 1). Demo waits are sped up with window.__KS_GUIDE_SPEED.
import { test, expect } from '@playwright/test'
import { blockVisitorWrites } from './support.js'
import { DEMOS } from '../src/features/guide/demos/index.js'
import { stateBefore, itemsOf, indexDemo } from '../src/features/guide/engine.js'
import { strings } from '../src/lib/i18n/strings.js'

const SPEED = 40
const LANGS = ['hi', 'en']
const WIDTHS = [360, 412]
const GUIDE_PAGES = ['/guide', '/guide/register', '/guide/post', '/guide/find', '/guide/tour']
const BACKEND_HOST = (() => { try { return new URL(process.env.VITE_SUPABASE_URL).host } catch { return 'supabase.co' } })()
const isBackend = (url) => {
  try {
    const u = new URL(url)
    return u.host === BACKEND_HOST || u.host.endsWith('.supabase.co') || u.pathname.startsWith('/api/')
  } catch { return false }
}
// Guide code lives in these chunks (vite build names).
const GUIDE_CHUNK = /\/assets\/(DemoPlayer|GuideDemoPage|GuideHub|GuideSheet|GuideHelpButton|useLoopActive|guide)-[\w-]+\.js/
const ERR_TITLE = strings.error_page_title.hi
const FAKE_SESSION = { id: '00000000-0000-4000-8000-0000000000aa', full_name: 'डेमो जाँच', phone: '9000000000', village_town: 'नमूना' }

async function open(browser, { lang = 'hi', width = 360, height = 740, speed = SPEED, init, ctxOpts = {} } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block', ...ctxOpts })
  await blockVisitorWrites(ctx)
  await ctx.addInitScript(([l, s]) => {
    try { localStorage.setItem('ks_lang_v1', l) } catch { /* ignore */ }
    if (s) window.__KS_GUIDE_SPEED = s
  }, [lang, speed])
  await ctx.addInitScript(installRecorder)
  if (init) await ctx.addInitScript(init)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })
  return { ctx, page, errors }
}

// Evidence line in the run output (list reporter prints stdout).
const note = (what, data) => console.log(`NOTE ${what}: ${JSON.stringify(data)}`)
const noErrorBoundary = async (page) => expect(page.getByText(ERR_TITLE, { exact: false })).toHaveCount(0)

// Records, from the first paint, every data-step / data-state value the demo player takes, and
// whether the finger or confetti ever showed (init script: nothing can be missed after load).
function installRecorder() {
  window.__ksSteps = []
  window.__ksFx = { finger: 0, confetti: 0 }
  const tick = () => {
    const p = document.querySelector('[data-testid="demo-player"]')
    if (p) {
      const s = p.getAttribute('data-step') + ':' + p.getAttribute('data-state')
      if (window.__ksSteps.at(-1) !== s) window.__ksSteps.push(s)
    }
    if (document.querySelector('.ksg-finger.ksg-on')) window.__ksFx.finger++
    if (document.querySelector('.ksg-confetti')) window.__ksFx.confetti++
  }
  const go = () => new MutationObserver(tick).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-step', 'data-state', 'class'] })
  if (document.documentElement) go()
  else document.addEventListener('DOMContentLoaded', go)
}
const playedSteps = (page) => page.evaluate(() => [...new Set(window.__ksSteps.filter((s) => !s.endsWith(':idle')).map((s) => Number(s.split(':')[0])))])

for (const lang of LANGS) {
  for (const width of WIDTHS) {
    test.describe(`Guide ${lang} ${width}px`, () => {
      // F.1
      test(`F1 hub: four cards, no ErrorBoundary, no console errors, no failed backend requests`, async ({ browser }) => {
        const { ctx, page, errors } = await open(browser, { lang, width })
        const cdp = await ctx.newCDPSession(page)
        await cdp.send('Network.enable')
        await cdp.send('Debugger.enable')
        await cdp.send('Debugger.setAsyncCallStackDepth', { maxDepth: 32 })
        const backend = []
        let phase = 'control'
        const frames = (st) => { const out = []; for (let s = st; s; s = s.parent) for (const f of s.callFrames || []) out.push(f.url); return out }
        cdp.on('Network.requestWillBeSent', (e) => {
          if (!isBackend(e.request.url)) return
          const urls = frames(e.initiator?.stack)
          backend.push({ phase, id: e.requestId, url: e.request.url.split('?')[0], method: e.request.method, fromGuide: urls.some((u) => GUIDE_CHUNK.test(u)), initiator: [...new Set(urls.filter((u) => /\/assets\//.test(u)).map((u) => u.split('/assets/')[1].replace(/-[\w-]+\.js$/, '')))].join('<') || e.initiator?.type })
        })
        const failed = []
        page.on('requestfailed', (r) => { if (isBackend(r.url())) failed.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`) })
        page.on('response', (r) => { if (isBackend(r.url()) && r.status() >= 400) failed.push(`${r.status()} ${r.request().method()} ${r.url()}`) })

        // control: a plain non-guide page — what the app shell itself asks the backend for
        await page.goto('/about')
        await page.waitForLoadState('networkidle').catch(() => {})
        phase = 'guide'
        for (const path of GUIDE_PAGES) {
          await page.goto(path)
          if (path === '/guide') {
            await expect(page.getByTestId('guide-hub')).toBeVisible()
            await expect(page.locator('[data-testid^="guide-card-"]')).toHaveCount(4)
            for (const id of ['register', 'post', 'find', 'tour']) await expect(page.getByTestId(`guide-card-${id}`)).toHaveAttribute('href', `/guide/${id}`)
            await expect(page.getByTestId('guide-progress')).toHaveAttribute('data-done', '0')
          } else {
            await expect(page.getByTestId('demo-finish')).toBeVisible({ timeout: 20_000 })
          }
          await noErrorBoundary(page)
          await page.waitForTimeout(300)
        }
        await page.waitForLoadState('networkidle').catch(() => {})
        const ep = (ph) => [...new Set(backend.filter((r) => r.phase === ph).map(({ method, url }) => `${method} ${url.replace(/^https:\/\/[^/]+/, '')}`))].sort()
        note(`F1 ${lang} ${width} backend endpoints on /about (control)`, ep('control'))
        note(`F1 ${lang} ${width} backend endpoints on the 5 guide pages`, ep('guide'))
        note(`F1 ${lang} ${width} initiators`, [...new Set(backend.map((r) => r.initiator))])
        expect(ep('guide').filter((x) => !ep('control').includes(x)), 'guide pages ask the backend for nothing the app shell does not').toEqual([])
        expect(backend.filter((r) => r.fromGuide), 'requests started by guide code').toEqual([])
        expect(failed, 'failed backend requests').toEqual([])
        expect(errors, 'console / page errors').toEqual([])
        await ctx.close()
      })

      // F.2
      test(`F2 every demo plays to the finish, marks done; hub shows 4 / 4 and the badge`, async ({ browser }) => {
        test.setTimeout(90_000)
        const { ctx, page, errors } = await open(browser, { lang, width })
        for (const id of ['register', 'post', 'find']) {
          await page.goto(`/guide/${id}`)
          const player = page.getByTestId('demo-player')
          await expect(player).toHaveAttribute('data-demo', id)
          await expect(player).toHaveAttribute('data-state', 'finished', { timeout: 30_000 })
          await expect(page.getByTestId('demo-finish')).toBeVisible()
          // Batch 10E 1B: the finish line greets with सीताराम 🙏 (never शाबाश, never "सीताराम जी").
          await expect(page.getByTestId('demo-finish')).toContainText(strings.guide_well_done[lang])
          await expect(page.getByTestId('demo-finish')).toContainText(lang === 'hi' ? 'सीताराम 🙏' : 'Sitaram 🙏')
          await expect(page.getByTestId('demo-finish')).not.toContainText('शाबाश')
          const n = DEMOS[id].steps.length
          expect(await playedSteps(page), `${id}: every step played in order`).toEqual(Array.from({ length: n }, (_, i) => i))
          const done = await page.evaluate(() => JSON.parse(localStorage.getItem('ks_guide_done_v1') || '{}'))
          expect(done[id], `${id} marked done`).toBeTruthy()
          // next-demo button goes on in GUIDE_ORDER
          await expect(page.getByTestId('demo-next')).toHaveAttribute('href', { register: '/guide/post', post: '/guide/find', find: '/guide/tour' }[id])
        }
        await page.goto('/guide/tour')
        await expect(page.getByTestId('tour-explorer')).toHaveAttribute('data-auto', 'on')
        await expect(page.getByTestId('demo-finish')).toBeVisible({ timeout: 20_000 })
        await page.goto('/guide')
        await expect(page.getByTestId('guide-progress')).toHaveAttribute('data-done', '4')
        await expect(page.getByTestId('guide-progress')).toContainText('4')
        for (const id of ['register', 'post', 'find', 'tour']) await expect(page.getByTestId(`guide-card-${id}`)).toHaveAttribute('data-done', '1')
        await expect(page.getByTestId('guide-badge')).toHaveAttribute('data-unlocked', '1')
        await page.getByTestId('guide-badge-name').fill('राम')
        await expect(page.getByTestId('guide-badge-share')).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=/)
        expect(await page.getByTestId('guide-badge-share').getAttribute('href'), 'badge name never leaves the phone').not.toContain(encodeURIComponent('राम'))
        expect(errors).toEqual([])
        await ctx.close()
      })

      // F.3
      test(`F3 try-it: tapping the highlighted target advances, tapping elsewhere does not`, async ({ browser }) => {
        const { ctx, page, errors } = await open(browser, { lang, width })
        await page.goto('/guide/register')
        const player = page.getByTestId('demo-player')
        await page.getByTestId('demo-mode-try').click()
        await expect(player).toHaveAttribute('data-mode', 'try')
        await expect(player).toHaveAttribute('data-step', '0')
        const target = page.getByTestId('demo-target')
        await expect(target).toHaveAttribute('data-node', 'name')
        // elsewhere: another field, the screen background, the caption
        await page.locator('[data-testid="demo-screen"] [data-node="email"]').click()
        await page.locator('[data-testid="demo-screen"] [data-node="mobile"]').click()
        await page.locator('.ksg-say').click()
        await page.waitForTimeout(400)
        await expect(player).toHaveAttribute('data-step', '0')
        await expect(target).toHaveAttribute('data-node', 'name')
        // the target
        await target.click()
        await expect(player).toHaveAttribute('data-step', '1')
        await expect(page.getByTestId('demo-target')).toHaveAttribute('data-node', 'mobile')
        await expect(page.locator('[data-node="name"]')).toContainText(strings.guide_s_name[lang])
        // keyboard: Enter on the target works too
        await page.getByTestId('demo-target').focus()
        await page.keyboard.press('Enter')
        await expect(player).toHaveAttribute('data-step', '2')
        await expect(page.locator('[data-node="mobile"]')).toContainText('9876543210')
        expect(errors).toEqual([])
        await ctx.close()
      })

      // F.4 + F.5
      test(`F4 jumping to a later step shows that step's state; F5 no OTP step with the shipped flag`, async ({ browser }) => {
        const { ctx, page, errors } = await open(browser, { lang, width })
        for (const id of ['register', 'post', 'find']) {
          const demo = DEMOS[id]
          const index = indexDemo(demo)
          await page.goto(`/guide/${id}`)
          const player = page.getByTestId('demo-player')
          await expect(page.locator('[data-testid^="demo-step-"]')).toHaveCount(demo.steps.length)
          // Try mode waits for a tap, so the state after a jump stays still for the check.
          await page.getByTestId('demo-mode-try').click()
          // the last step that is not a "look" (look steps run by themselves in try mode)
          const jumps = demo.steps.map((s, i) => i).filter((i) => itemsOf(demo.steps[i])[0] && demo.steps[i].do !== 'look' && (itemsOf(demo.steps[i])[0].do || demo.steps[i].do) !== 'look')
          for (const i of [jumps.at(-1), jumps[Math.floor(jumps.length / 2)]]) {
            const want = stateBefore(demo, i, index)
            await page.getByTestId(`demo-step-${i}`).click()
            await expect(player).toHaveAttribute('data-step', String(i))
            await expect(page.getByTestId('demo-screen')).toHaveAttribute('data-screen', want.screen)
            await expect(page.getByTestId('demo-target')).toHaveAttribute('data-node', itemsOf(demo.steps[i])[0].target)
            // earlier steps show as done, later ones not
            for (let k = 0; k < demo.steps.length; k++) {
              const li = page.getByTestId(`demo-step-${k}`).locator('xpath=..')
              await expect(li).toHaveClass(k < i ? /ksg-dn/ : k === i ? /ksg-cur/ : /^(?!.*ksg-dn).*$/)
            }
            // nodes hidden before step i are not in the screen, revealed ones are
            for (const [nid, hid] of Object.entries(want.hidden)) {
              if (index[nid]?.screen !== want.screen) continue
              await expect(page.locator(`[data-testid="demo-screen"] [data-node="${nid}"]`)).toHaveCount(hid ? 0 : 1)
            }
          }
          if (id === 'register') {
            // jump state: name + mobile already typed
            await expect(page.locator('[data-node="mobile"]')).toContainText('9876543210')
            await expect(page.locator('[data-node="name"]')).toContainText(strings.guide_s_name[lang])
            // F.5: GUIDE_OTP_LIVE=false → no OTP step or node anywhere
            await expect(page.locator('[data-otp="1"]')).toHaveCount(0)
            await page.getByTestId('demo-mode-watch').click()
            await expect(player).toHaveAttribute('data-state', 'finished', { timeout: 30_000 })
            await expect(page.locator('[data-otp="1"]')).toHaveCount(0)
          }
        }
        expect(errors).toEqual([])
        await ctx.close()
      })

      // F.6
      test(`F6 GuideSheet on /signup keeps typed name + mobile; Back closes it and stays on /signup`, async ({ browser }) => {
        const { ctx, page, errors } = await open(browser, { lang, width })
        await page.goto('/about')
        await page.goto('/signup')
        await page.locator('#full_name').fill('रामू परीक्षण')
        await page.locator('#phone').fill('9000012345')
        const vals = async () => [await page.locator('#full_name').inputValue(), await page.locator('#phone').inputValue()]
        const sheet = page.getByTestId('guide-sheet')
        // open → close with the ✕ button
        await page.getByTestId('help-signup').click()
        await expect(sheet).toBeVisible()
        await expect(sheet.getByTestId('demo-player')).toHaveAttribute('data-demo', 'register')
        await expect(sheet.locator('[data-otp="1"]')).toHaveCount(0)
        await page.getByTestId('guide-sheet-close').click()
        await expect(sheet).toHaveCount(0)
        expect(await vals()).toEqual(['रामू परीक्षण', '9000012345'])
        expect(new URL(page.url()).pathname).toBe('/signup')
        // open, let it finish, close from the finish card
        await page.getByTestId('help-signup').click()
        await expect(sheet.getByTestId('demo-finish')).toBeVisible({ timeout: 30_000 })
        await sheet.getByTestId('demo-close').click()
        await expect(sheet).toHaveCount(0)
        expect(await vals()).toEqual(['रामू परीक्षण', '9000012345'])
        // open → browser Back
        await page.getByTestId('help-signup').click()
        await expect(sheet).toBeVisible()
        await page.goBack()
        await expect(sheet).toHaveCount(0)
        await page.waitForTimeout(300)
        expect(new URL(page.url()).pathname).toBe('/signup')
        expect(await vals()).toEqual(['रामू परीक्षण', '9000012345'])
        // the sheet's history entry is used up: one more Back leaves /signup
        await page.goBack()
        await expect(page).toHaveURL(/\/about$/)
        expect(errors).toEqual([])
        await ctx.close()
      })

      // F.7
      test(`F7 every entry point exists and opens the right demo`, async ({ browser }) => {
        test.setTimeout(90_000)
        const { ctx, page, errors } = await open(browser, { lang, width })
        const go = async (path, testid, wantPath, wantDemo) => {
          await page.goto(path)
          const el = page.getByTestId(testid)
          await expect(el, `${testid} on ${path}`).toBeVisible()
          await el.click()
          await expect(page).toHaveURL(new RegExp(`${wantPath.replace(/\//g, '\\/')}$`))
          if (wantDemo) await expect(page.getByTestId('demo-player')).toHaveAttribute('data-demo', wantDemo)
          else await expect(page.getByTestId('guide-hub')).toBeVisible()
        }
        await go('/welcome', 'entry-welcome-guide', '/guide/register', 'register')
        await go('/', 'entry-home-guide', '/guide', null)
        await go('/', 'nav-guide', '/guide', null)
        await go('/browse', 'nav-guide', '/guide', null)
        await go('/how-to-use', 'entry-howto-guide', '/guide', null)
        // footer (at the end of a long page)
        await page.goto('/about')
        await page.getByTestId('footer-guide').scrollIntoViewIfNeeded()
        await page.getByTestId('footer-guide').click()
        await expect(page).toHaveURL(/\/guide$/)
        await expect(page.getByTestId('guide-hub')).toBeVisible()
        // help pills open the sheet with the right demo, page stays
        const sheetFrom = async (path, testid, demo) => {
          await page.goto(path)
          await page.getByTestId(testid).click()
          const sheet = page.getByTestId('guide-sheet')
          await expect(sheet.getByTestId('demo-player')).toHaveAttribute('data-demo', demo)
          await page.getByTestId('guide-sheet-close').click()
          await expect(sheet).toHaveCount(0)
          // closing pops the sheet's own history entry (async): let it land before navigating on
          await expect.poll(() => page.evaluate(() => !history.state?.ksGuideSheet)).toBe(true)
          await page.waitForTimeout(300)
          expect(new URL(page.url()).pathname).toBe(path.split('?')[0])
        }
        await sheetFrom('/signup', 'help-signup', 'register')
        await sheetFrom('/login', 'help-login', 'register')
        await sheetFrom('/browse', 'help-browse', 'find')
        // /post is login-only: a FAKE local session (nothing sent, never past step 1)
        await page.evaluate((s) => localStorage.setItem('ks_session_v1', JSON.stringify(s)), FAKE_SESSION)
        await sheetFrom('/post', 'help-post', 'post')
        await page.evaluate(() => localStorage.removeItem('ks_session_v1'))
        // the demo pages' own "real app" links
        await page.goto('/guide/register')
        await expect(page.getByTestId('demo-real-app')).toHaveAttribute('href', '/signup', { timeout: 30_000 })
        await page.goto('/guide/post')
        await expect(page.getByTestId('demo-real-app')).toHaveAttribute('href', '/login?next=%2Fpost', { timeout: 30_000 })
        await page.goto('/guide/find')
        await expect(page.getByTestId('demo-real-app')).toHaveAttribute('href', '/browse', { timeout: 30_000 })
        expect(errors.filter((e) => !/Failed to load resource/.test(e))).toEqual([])
        await ctx.close()
      })
    })
  }

  // F.8 — one test per language, all widths and all five pages.
  test(`F8 ${lang}: no horizontal overflow at 320/360/412/1024 on every guide page; no clipped text`, async ({ browser }) => {
    test.setTimeout(240_000)
    const { ctx, page, errors } = await open(browser, { lang, width: 320 })
    const problems = []
    for (const w of [320, 360, 412, 1024]) {
      await page.setViewportSize({ width: w, height: 800 })
      for (const path of GUIDE_PAGES) {
        await page.goto(path)
        if (path === '/guide') await expect(page.getByTestId('guide-hub')).toBeVisible()
        else await expect(page.getByTestId('demo-finish')).toBeVisible({ timeout: 30_000 })
        await page.waitForTimeout(250) // confetti gone
        const r = await page.evaluate(measureOverflow)
        if (r.docScroll > r.vw) problems.push(`${w} ${path}: page scrolls sideways ${r.docScroll} > ${r.vw}`)
        for (const o of r.offenders) problems.push(`${w} ${path}: off-screen ${o}`)
        for (const c of r.clipped) problems.push(`${w} ${path}: clipped ${c}`)
      }
      // the hub's "next tip" + an open FAQ answer in the tour (longest texts)
      await page.goto('/guide/tour')
      await page.getByTestId('tour-tab-questions').click()
      for (const i of [0, 1, 2]) await page.getByTestId(`tour-faq-${i}`).click()
      const r = await page.evaluate(measureOverflow)
      if (r.docScroll > r.vw) problems.push(`${w} tour-faq: page scrolls sideways`)
      for (const o of [...r.offenders, ...r.clipped]) problems.push(`${w} tour-faq: ${o}`)
    }
    note(`F8 ${lang} overflow`, problems)
    expect(problems).toEqual([])
    expect(errors).toEqual([])
    await ctx.close()
  })
}

// Runs in the page. Sideways overflow of the document; any element of the guide that sticks out
// of the viewport (outside a sideways-scrolling row); any element that clips its own text
// (overflow hidden / clip / ellipsis with scrollWidth > clientWidth, or line-clamped height).
function measureOverflow() {
  const vw = document.documentElement.clientWidth
  const root = document.querySelector('[data-testid="guide-hub"], [data-testid="guide-demo-page"]')
  const out = { vw, docScroll: document.documentElement.scrollWidth, offenders: [], clipped: [] }
  if (!root) { out.offenders.push('no guide root'); return out }
  const name = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}${el.dataset.testid ? `[${el.dataset.testid}]` : ''}${el.dataset.node ? `[node=${el.dataset.node}]` : ''}`
  const inScroller = (el) => {
    for (let p = el.parentElement; p && p !== root; p = p.parentElement) {
      const cs = getComputedStyle(p)
      if (/(auto|scroll)/.test(cs.overflowX) && p.scrollWidth > p.clientWidth) return true
    }
    return false
  }
  const decorative = (el) => el.closest('svg, .ksg-finger, .ksg-confetti, [aria-hidden="true"]')
  for (const el of root.querySelectorAll('*')) {
    if (decorative(el)) continue
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) continue
    if ((r.right > vw + 1 || r.left < -1) && !inScroller(el)) out.offenders.push(`${name(el)} x=${Math.round(r.left)}..${Math.round(r.right)}`)
    const cs = getComputedStyle(el)
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    if (!hasText) continue
    if ((/(hidden|clip)/.test(cs.overflowX) || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 1) out.clipped.push(`${name(el)} w ${el.scrollWidth}>${el.clientWidth} "${el.textContent.trim().slice(0, 30)}"`)
    if (/(hidden|clip)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2 && !/(auto|scroll)/.test(cs.overflowY)) out.clipped.push(`${name(el)} h ${el.scrollHeight}>${el.clientHeight} "${el.textContent.trim().slice(0, 30)}"`)
    if (cs.webkitLineClamp && cs.webkitLineClamp !== 'none' && el.scrollHeight > el.clientHeight + 2) out.clipped.push(`${name(el)} line-clamp "${el.textContent.trim().slice(0, 30)}"`)
  }
  // the mock phone screen may scroll up/down, never sideways
  for (const s of root.querySelectorAll('.ksg-screen')) if (s.scrollWidth > s.clientWidth + 1) out.clipped.push(`mock screen scrolls sideways ${s.scrollWidth}>${s.clientWidth}`)
  return out
}

// F.11 — battery and data care (looping motion pauses when hidden / off screen; transform +
// opacity only; data saver and reduced motion → no looping motion, demos still finish).
test.describe('F11 battery and data care', () => {
  test('hub scene pauses when scrolled away and when the page is hidden; tour rotation too', async ({ browser }) => {
    const { ctx, page, errors } = await open(browser, { lang: 'hi', width: 360, height: 640, speed: 1 })
    await page.goto('/guide')
    const scene = page.getByTestId('guide-scene')
    await expect(scene).toHaveAttribute('data-motion', 'on')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect(scene).toHaveAttribute('data-motion', 'paused')
    expect(await page.evaluate(() => document.getAnimations().filter((a) => a.effect?.target?.closest?.('[data-testid="guide-scene"]')).every((a) => a.playState === 'paused'))).toBe(true)
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(scene).toHaveAttribute('data-motion', 'on')
    const setHidden = (h) => page.evaluate((hide) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hide ? 'hidden' : 'visible') })
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => hide })
      document.dispatchEvent(new Event('visibilitychange'))
    }, h)
    await setHidden(true)
    await expect(scene).toHaveAttribute('data-motion', 'paused')
    await setHidden(false)
    await expect(scene).toHaveAttribute('data-motion', 'on')

    await page.goto('/guide/tour')
    const tour = page.getByTestId('tour-explorer')
    await expect(tour).toHaveAttribute('data-auto', 'on')
    await setHidden(true)
    await expect(tour).toHaveAttribute('data-auto', 'off')
    const tab = await tour.getAttribute('data-tab')
    await page.waitForTimeout(7000) // longer than one 6 s rotation
    await expect(tour).toHaveAttribute('data-tab', tab)
    await setHidden(false)
    await expect(tour).toHaveAttribute('data-auto', 'on')
    // push the tour below the fold (spacer above it) → IntersectionObserver pauses the rotation
    await page.evaluate(() => {
      const sp = document.createElement('div')
      sp.id = 'ks-test-spacer'
      sp.style.height = '3000px'
      document.querySelector('[data-testid="guide-demo-page"]').prepend(sp)
      window.scrollTo(0, 0)
    })
    expect(await page.evaluate(() => document.querySelector('[data-testid="tour-explorer"]').getBoundingClientRect().top > innerHeight)).toBe(true)
    await expect(tour).toHaveAttribute('data-auto', 'off')
    const tab2 = await tour.getAttribute('data-tab')
    await page.waitForTimeout(7000)
    await expect(tour).toHaveAttribute('data-tab', tab2)
    await page.evaluate(() => document.getElementById('ks-test-spacer').remove())
    await expect(tour).toHaveAttribute('data-auto', 'on')
    expect(errors).toEqual([])
    await ctx.close()
  })

  test('looping / running animations use only transform and opacity (hub, tour, demo mid-play)', async ({ browser }) => {
    const { ctx, page, errors } = await open(browser, { lang: 'hi', width: 360, height: 640, speed: 1 })
    // union of every animation seen while sampling for `ms` (transitions and short animations come and go)
    const props = async (ms = 2500) => page.evaluate(async (dur) => {
      const out = {}
      const end = performance.now() + dur
      const seenAnims = new Set()
      while (performance.now() < end) {
        for (const a of document.getAnimations()) seenAnims.add(a)
        await new Promise((r) => setTimeout(r, 50))
      }
      for (const a of seenAnims) {
        const name = a.animationName || a.transitionProperty || a.constructor.name
        for (const kf of a.effect?.getKeyframes?.() || []) {
          for (const k of Object.keys(kf)) {
            if (['offset', 'computedOffset', 'easing', 'composite'].includes(k)) continue
            ;(out[k] ||= new Set()).add(name)
          }
        }
      }
      return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v]]))
    }, ms)
    const seen = {}
    await page.goto('/guide')
    await page.getByTestId('guide-hub').waitFor()
    seen.hub = await props()
    await page.goto('/guide/tour')
    await page.getByTestId('tour-explorer').waitFor()
    seen.tour = await props()
    await page.goto('/guide/register')
    await page.getByTestId('demo-player').waitFor()
    seen.registerMidPlay = await props(6000)
    note('F11 animated properties', seen)
    for (const [where, p] of Object.entries(seen)) {
      expect(Object.keys(p).length, `${where} has animations`).toBeGreaterThan(0)
      // the guide's own looping motion: transform / opacity only
      const bad = Object.entries(p).filter(([k, names]) => !['transform', 'opacity'].includes(k) && names.some((n) => /^ksg-/.test(n)))
      expect(bad, `${where}: ksg- animations on other properties`).toEqual([])
    }
    expect(errors).toEqual([])
    await ctx.close()
  })

  test('data saver: hero static, tour does not rotate, demos still finish', async ({ browser }) => {
    const { ctx, page, errors } = await open(browser, {
      lang: 'hi', width: 360,
      init: () => {
        const conn = { saveData: true, effectiveType: '3g', addEventListener() {}, removeEventListener() {} }
        Object.defineProperty(Navigator.prototype, 'connection', { configurable: true, get: () => conn })
      },
    })
    await page.goto('/guide')
    expect(await page.evaluate(() => navigator.connection.saveData)).toBe(true)
    await expect(page.getByTestId('guide-scene')).toHaveAttribute('data-motion', 'static')
    expect(await page.evaluate(() => document.getAnimations().filter((a) => /ksg-(spin|sway|drive)/.test(a.animationName)).length)).toBe(0)
    await page.goto('/guide/tour')
    const tour = page.getByTestId('tour-explorer')
    await expect(tour).toHaveAttribute('data-auto', 'off')
    await page.waitForTimeout(600) // 4 rotations at speed 40
    await expect(tour).toHaveAttribute('data-tab', 'mandi')
    for (const k of ['weather', 'schemes', 'questions', 'market']) await page.getByTestId(`tour-tab-${k}`).click()
    await expect(page.getByTestId('demo-finish')).toBeVisible()
    for (const id of ['register', 'post', 'find']) {
      await page.goto(`/guide/${id}`)
      await expect(page.getByTestId('demo-player')).toHaveAttribute('data-state', 'finished', { timeout: 30_000 })
      expect(await playedSteps(page)).toEqual(Array.from({ length: DEMOS[id].steps.length }, (_, i) => i))
    }
    expect(errors).toEqual([])
    await ctx.close()
  })

  test('reduced motion: no finger, no confetti, hero static, no tour rotation; steps still reach the end', async ({ browser }) => {
    const { ctx, page, errors } = await open(browser, { lang: 'en', width: 412, ctxOpts: { reducedMotion: 'reduce' } })
    await page.goto('/guide')
    await expect(page.getByTestId('guide-scene')).toHaveAttribute('data-motion', 'static')
    await page.goto('/guide/tour')
    await expect(page.getByTestId('tour-explorer')).toHaveAttribute('data-auto', 'off')
    for (const id of ['register', 'post', 'find']) {
      await page.goto(`/guide/${id}`)
      await expect(page.getByTestId('demo-player')).toHaveAttribute('data-state', 'finished', { timeout: 30_000 })
      expect(await playedSteps(page)).toEqual(Array.from({ length: DEMOS[id].steps.length }, (_, i) => i))
      expect(await page.evaluate(() => window.__ksFx)).toEqual({ finger: 0, confetti: 0 })
    }
    expect(errors).toEqual([])
    await ctx.close()
  })
})
