// Batch 10D Task E — homepage "Kisan Studio" live hero + "Morning Field" band.
// Brief items E.1–E.5 at 360 and 412 px, Hindi and English (overflow also at 320/768/1024/1280/1440),
// plus a smoke check that the CLS fix in src/main.jsx / src/App.jsx leaves other routes as they were.
// Public pages only; visitor writes are blocked (nothing is written to staging).
// Hero test hooks (HomeLiveHero.jsx): [data-testid="home-live"] data-persona / data-tick / data-auto /
// data-motion (paused | on | ended | static) / data-rot / data-live (0 | 1). Band (HomeField.jsx):
// home-field / home-crops data-motion (on | paused | static), home-facts data-count, home-fact-<id> data-value.
import fs from 'node:fs'
import { test, expect } from '@playwright/test'
import { blockVisitorWrites } from './support.js'
import { strings } from '../src/lib/i18n/strings.js'
import { CROPS } from '../src/content/crops.js'
import { GUIDE_ORDER } from '../src/features/guide/config.js'

const LANGS = ['hi', 'en']
const WIDTHS = [360, 412]
const OVERFLOW_WIDTHS = [320, 360, 412, 768, 1024, 1280, 1440]
const PERSONA_IDS = ['rent', 'sell', 'mandi', 'weather', 'schemes']
const SPEED = 40
const PHOTO = '/images/home/hero-farmer.jpg'
const ERR_TITLE = strings.error_page_title.hi
const BACKEND_HOST = (() => { try { return new URL(process.env.VITE_SUPABASE_URL).host } catch { return 'supabase.co' } })()
const isBackend = (url) => {
  try {
    const u = new URL(url)
    return u.host === BACKEND_HOST || u.host.endsWith('.supabase.co') || u.pathname.startsWith('/api/')
  } catch { return false }
}

// Console lines that are NOT failures of this batch:
//  - BACKLOG B17 (pre-existing, deliberately not fixed in 10D): the prerendered `build:full` pages carry
//    <link rel="modulepreload"> tags with the prerender origin http://localhost:4178; on this local build
//    they fail with "Failed to load resource: net::ERR_CONNECTION_REFUSED" (production blocks them by CSP).
//    On a deployed host (staging) the same links are refused by the CSP instead ("violates the following
//    Content Security Policy directive" naming http://localhost:4178/...).
//  - The Cloudflare Web Analytics beacon (static.cloudflareinsights.com), if injected, cannot load locally.
//  - Pre-existing CSP gap (not 10D; also on production): `img-src` in public/_headers does not list the
//    Supabase storage host, so listing photos (…supabase.co/storage/v1/object/public/…) are refused on
//    deployed hosts. Seen only when the homepage listings carry uploaded photos (staging data).
// Only exactly these are filtered; every other console error fails the test.
const knownNoise = (m) => {
  const text = m.text()
  const url = m.location()?.url || ''
  if (/ERR_CONNECTION_REFUSED/.test(text) && /^http:\/\/localhost:4178\//.test(url)) return true
  if (/violates the following Content Security Policy/.test(text) && /'http:\/\/localhost:4178\//.test(text)) return true
  if (/cloudflareinsights/.test(text) || /cloudflareinsights/.test(url)) return true
  if (/violates the following Content Security Policy directive: "img-src/.test(text) && /\.supabase\.co\/storage\/v1\/object\/public\//.test(text)) return true
  return false
}
// The same pre-existing CSP gap shows as a failed request ("csp") for those storage images.
const cspStorageImage = (r) => /\.supabase\.co\/storage\/v1\/object\/public\//.test(r.url()) && /csp/i.test(r.failure()?.errorText || '')

// ── facts: the expected numbers, computed here from the same repo data files ─────────────────
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8')
const EXPECTED_FACTS = (() => {
  const reg = read('../src/lib/listings/registry.jsx').match(/export const ENABLED_CATEGORIES = \[([^\]]*)\]/)
  const cats = reg[1].match(/'[^']+'/g).length
  const dd = read('../src/lib/location/places.js').match(/export const DIVISION_DISTRICTS = \[([\s\S]*?)\n\]/)
  const districts = new Set([...dd[1].matchAll(/en: '([^']+)'/g)].map((m) => m[1])).size
  return { cats, crops: CROPS.length, districts, demos: GUIDE_ORDER.length }
})()

async function open(browser, { lang = 'hi', width = 360, height = 740, speed = SPEED, init, ctxOpts = {}, mobile } = {}) {
  const isMobile = mobile ?? width < 768
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile, hasTouch: isMobile, serviceWorkers: 'block', ...ctxOpts })
  const blocked = await blockVisitorWrites(ctx)
  await ctx.addInitScript(([l, s]) => {
    try { localStorage.setItem('ks_lang_v1', l) } catch { /* ignore */ }
    if (s) window.__KS_GUIDE_SPEED = s
  }, [lang, speed])
  await ctx.addInitScript(installHeroRecorder)
  if (init) await ctx.addInitScript(init)
  const page = await ctx.newPage()
  const errors = []
  const consoleAll = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    consoleAll.push(`${m.type()}: ${m.text()}`)
    if (m.type() === 'error' && !knownNoise(m)) errors.push(`console: ${m.text()} @ ${m.location()?.url || ''}`)
  })
  const failedBackend = []
  page.on('requestfailed', (r) => { if (isBackend(r.url()) && !cspStorageImage(r)) failedBackend.push(`${r.method()} ${r.url()} ${r.failure()?.errorText}`) })
  page.on('response', (r) => { if (isBackend(r.url()) && r.status() >= 400) failedBackend.push(`${r.status()} ${r.request().method()} ${r.url()}`) })
  return { ctx, page, errors, consoleAll, failedBackend, blocked }
}

const note = (what, data) => console.log(`NOTE ${what}: ${JSON.stringify(data)}`)
const noErrorBoundary = async (page) => expect(page.getByText(ERR_TITLE, { exact: false })).toHaveCount(0)
const hero = (page) => page.getByTestId('home-live')
const attr = (page, name) => hero(page).getAttribute(name)

// Runs before any page script. Records every state the hero takes (persona / tick / live / motion /
// auto), and the hero markup of the FIRST client render: the first [data-testid="home-live"] node that
// React inserts (the prerendered node is the parser's; React's createRoot replaces it with a new node,
// recognised by React's own __reactFiber key, which React sets before inserting the node).
function installHeroRecorder() {
  window.__ksHero = { states: [], nodes: 0, firstClient: null, personas: [] }
  let last = null
  let lastSig = ''
  const isReact = (el) => Object.keys(el).some((k) => k.startsWith('__reactFiber'))
  const markup = (el) => {
    const c = el.cloneNode(true)
    // the existing tiles under the hero carry live data (weather, price): not part of the poster
    c.querySelectorAll('.khl-more').forEach((m) => { m.innerHTML = '' })
    return c.outerHTML
  }
  const tick = () => {
    const h = document.querySelector('[data-testid="home-live"]')
    if (!h) return
    if (h !== last) {
      window.__ksHero.nodes++
      last = h
    }
    const react = isReact(h)
    if (react && !window.__ksHero.firstClient) window.__ksHero.firstClient = markup(h)
    const d = h.dataset
    const sig = `${react}|${d.persona}|${d.tick}|${d.live}|${d.motion}|${d.auto}`
    if (sig !== lastSig) {
      lastSig = sig
      window.__ksHero.states.push({ by: react ? 'react' : 'html', persona: d.persona, tick: Number(d.tick), live: d.live, motion: d.motion, auto: d.auto })
      if (window.__ksHero.states.length > 5000) window.__ksHero.states.splice(1, 1000)
      if (window.__ksHero.personas.at(-1) !== d.persona) window.__ksHero.personas.push(d.persona)
    }
  }
  // observe the document itself: documentElement may not exist yet when this runs
  new MutationObserver(tick).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-persona', 'data-tick', 'data-live', 'data-motion', 'data-auto'] })
}

// The hero rendered by React (not the prerendered parser node) — the app has started.
const waitForApp = (page) => page.waitForFunction(() => !!(window.__ksHero && window.__ksHero.firstClient), null, { timeout: 25_000 })
const scrollStageIntoView = (page) => page.evaluate(() => document.querySelector('[data-testid="home-live-stage"]').scrollIntoView({ block: 'center' }))
const setHidden = (page, h) => page.evaluate((hide) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hide ? 'hidden' : 'visible') })
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hide })
  document.dispatchEvent(new Event('visibilitychange'))
}, h)
// Running CSS animations inside an element (khl- hero loops, ksg-/ksf- field loops).
const runningAnims = (page, sel) => page.evaluate((s) => {
  const root = document.querySelector(s)
  return document.getAnimations().filter((a) => {
    const t = a.effect?.target
    return t && root && root.contains(t) && a.playState === 'running' && /^(khl|ksg|ksf)-/.test(a.animationName || '')
  }).map((a) => a.animationName)
}, sel)

for (const lang of LANGS) {
  for (const width of WIDTHS) {
    test.describe(`Home 10D ${lang} ${width}px`, () => {
      // ── E.1 ─────────────────────────────────────────────────────────────────────────────
      test('E1 first frame = persona 1 tick 0 poster (server HTML and first client render equal); no hydration warning, console errors or failed backend requests', async ({ browser }) => {
        const { ctx, page, errors, consoleAll, failedBackend } = await open(browser, { lang, width, speed: 1 })
        // Hold the lazy live engine until the first client render has been checked.
        let release
        const gate = new Promise((r) => { release = r })
        let liveRequests = 0
        await page.route('**/assets/LiveStage-*.js', async (route) => { liveRequests++; await gate; await route.continue() })

        // server HTML (what a phone gets before any script)
        const server = await (await page.request.get('/')).text()
        const tag = server.match(/<section[^>]*data-testid="home-live"[^>]*>/)?.[0] || ''
        for (const [k, v] of [['data-persona', 'rent'], ['data-tick', '0'], ['data-live', '0'], ['data-auto', 'on'], ['data-motion', 'paused'], ['data-rot', '0']]) expect(tag, `server HTML ${k}`).toContain(`${k}="${v}"`)
        expect(server, 'prerendered HTML has no stylesheet from the prerender origin on "/"').not.toMatch(/<link[^>]*rel="stylesheet"[^>]*localhost:4178/)

        await page.goto('/')
        await waitForApp(page)
        await expect(hero(page)).toHaveAttribute('data-live', '0')
        const rec = await page.evaluate(() => window.__ksHero)
        note(`E1 ${lang} ${width} hero nodes ${rec.nodes}; states before the live engine`, rec.states.slice(0, 6))
        // every state before the engine: persona 1, tick 0, not live
        for (const s of rec.states) expect(s, 'state before the live engine').toMatchObject({ persona: 'rent', tick: 0, live: '0' })
        // first client render markup = prerendered markup (same document parsed by the browser)
        const serverHero = await page.evaluate((html) => {
          const doc = new DOMParser().parseFromString(html, 'text/html')
          const h = doc.querySelector('[data-testid="home-live"]')
          h.querySelectorAll('.khl-more').forEach((m) => { m.innerHTML = '' })
          return h.outerHTML
        }, server)
        expect(rec.firstClient, 'first client render recorded').toBeTruthy()
        if (lang === 'hi') {
          // the prerender is Hindi: the first client render must be byte-identical
          expect(rec.firstClient).toBe(serverHero)
        } else {
          // English visitors: the prerender is Hindi, so the text differs; the structure must not
          const shape = (h) => h.replace(/>[^<]*</g, '><').replace(/ aria-label="[^"]*"/g, '')
          expect(shape(rec.firstClient)).toBe(shape(serverHero))
        }
        // the poster is fully styled at first paint (styles in the main stylesheet)
        expect(await page.evaluate(() => getComputedStyle(document.querySelector('.ksg-phone')).borderRadius)).not.toBe('0px')

        release()
        await scrollStageIntoView(page)
        await expect(hero(page)).toHaveAttribute('data-live', '1', { timeout: 15_000 })
        await expect(hero(page)).toHaveAttribute('data-motion', 'on')
        expect(liveRequests, 'live engine is a separate lazy chunk, requested once').toBe(1)
        await page.waitForLoadState('networkidle').catch(() => {})
        await noErrorBoundary(page)
        expect(consoleAll.filter((l) => /hydrat|did not match|server rendered HTML/i.test(l)), 'hydration warnings').toEqual([])
        expect(failedBackend, 'failed backend requests').toEqual([])
        expect(errors, 'console / page errors').toEqual([])
        await ctx.close()
      })

      // ── E.2 ─────────────────────────────────────────────────────────────────────────────
      test('E2 auto-rotation goes through all five personas; tapping a tab stops it; arrows / Home / End; ARIA', async ({ browser }) => {
        test.setTimeout(90_000)
        const { ctx, page, errors } = await open(browser, { lang, width })
        await page.goto('/')
        await waitForApp(page)
        await scrollStageIntoView(page)
        await expect(hero(page)).toHaveAttribute('data-motion', 'on', { timeout: 15_000 })
        await expect(hero(page)).toHaveAttribute('data-persona', 'schemes', { timeout: 45_000 })
        await expect(hero(page)).toHaveAttribute('data-persona', 'rent', { timeout: 20_000 }) // wraps round
        const seen = await page.evaluate(() => window.__ksHero.personas)
        note(`E2 ${lang} ${width} personas`, seen)
        expect(seen.slice(0, 6)).toEqual([...PERSONA_IDS, 'rent'])
        expect(await attr(page, 'data-auto')).toBe('on')

        // ARIA
        const tablist = page.getByRole('tablist')
        await expect(tablist).toHaveCount(1)
        await expect(tablist).toHaveAttribute('aria-label', strings.home_live_tabs_label[lang])
        const tabs = page.getByRole('tab')
        await expect(tabs).toHaveCount(5)
        for (let i = 0; i < 5; i++) await expect(tabs.nth(i)).toHaveText(strings[`home_live_tab_${PERSONA_IDS[i]}`][lang])
        const aria = async () => page.evaluate(() => {
          const t = [...document.querySelectorAll('[role="tab"]')]
          const panel = document.querySelector('[role="tabpanel"]')
          return {
            selected: t.filter((x) => x.getAttribute('aria-selected') === 'true').map((x) => x.id),
            tabindex: t.map((x) => x.getAttribute('tabindex')),
            controls: [...new Set(t.map((x) => x.getAttribute('aria-controls')))],
            panelId: panel?.id, labelledby: panel?.getAttribute('aria-labelledby'),
            focused: document.activeElement?.id || null, persona: document.querySelector('[data-testid="home-live"]').dataset.persona,
          }
        })
        const expectSel = async (id, { focused = true } = {}) => {
          const i = PERSONA_IDS.indexOf(id)
          const a = await aria()
          expect(a.persona).toBe(id)
          expect(a.selected).toEqual([`khl-tab-${id}`])
          expect(a.tabindex).toEqual(PERSONA_IDS.map((_, j) => (j === i ? '0' : '-1')))
          expect(a.controls).toEqual([a.panelId])
          expect(a.labelledby).toBe(`khl-tab-${id}`)
          if (focused) expect(a.focused).toBe(`khl-tab-${id}`)
        }

        // tap a tab → that persona, auto-rotation off, it stays
        await page.getByTestId('home-live-tab-mandi').click()
        await expectSel('mandi')
        await expect(hero(page)).toHaveAttribute('data-auto', 'off')
        // the click may scroll the tab row into view and the phone panel out of it (then it pauses, by design)
        await scrollStageIntoView(page)
        await expect(hero(page)).toHaveAttribute('data-motion', 'ended', { timeout: 15_000 }) // persona finished, timer stopped
        await expect(hero(page)).toHaveAttribute('data-tick', '240')
        await page.waitForTimeout(1500)
        await expectSel('mandi')
        await expect(page.getByTestId('home-live-caption').locator('.khl-cap.on')).toHaveText(strings.home_live_cap_mandi[lang])

        // keyboard
        for (const [key, id] of [['ArrowRight', 'weather'], ['ArrowLeft', 'mandi'], ['ArrowDown', 'weather'], ['ArrowUp', 'mandi'], ['End', 'schemes'], ['Home', 'rent'], ['ArrowLeft', 'schemes'], ['ArrowRight', 'rent']]) {
          await page.keyboard.press(key)
          await expectSel(id)
        }
        await expect(hero(page)).toHaveAttribute('data-auto', 'off')
        // the active tab is kept in view inside the sideways-scrolling row (phones)
        for (const id of ['schemes', 'rent']) {
          await page.keyboard.press(id === 'schemes' ? 'End' : 'Home')
          await page.waitForTimeout(600) // smooth row scroll
          const inRow = await page.evaluate((tid) => {
            const b = document.getElementById(tid).getBoundingClientRect()
            const r = document.querySelector('[role="tablist"]').getBoundingClientRect()
            return b.left >= r.left - 1 && b.right <= r.right + 1
          }, `khl-tab-${id}`)
          expect(inRow, `${id} tab in view`).toBe(true)
        }
        // tap targets ≥ 44 px
        const heights = await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].map((t) => t.getBoundingClientRect().height))
        for (const h of heights) expect(h).toBeGreaterThanOrEqual(44)
        // every screen carries the "Example" tag
        await expect(page.getByTestId('home-live-stage').locator('.khl-tag').first()).toHaveText(strings.home_live_example[lang])
        await noErrorBoundary(page)
        expect(errors).toEqual([])
        await ctx.close()
      })

      // ── E.3 ─────────────────────────────────────────────────────────────────────────────
      test('E3 off-screen and hidden tab: hero timer stops (tick frozen), field band animations pause', async ({ browser }) => {
        test.setTimeout(90_000)
        const { ctx, page, errors } = await open(browser, { lang, width, height: 740, speed: 1 })
        await page.goto('/')
        await waitForApp(page)
        await scrollStageIntoView(page)
        await expect(hero(page)).toHaveAttribute('data-motion', 'on', { timeout: 15_000 })
        const t1 = Number(await attr(page, 'data-tick'))
        await page.waitForTimeout(600)
        expect(Number(await attr(page, 'data-tick')), 'timer runs while in view').toBeGreaterThan(t1)

        // hero off-screen (bottom of the page)
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
        await expect(hero(page)).toHaveAttribute('data-motion', 'paused')
        await expect(hero(page)).toHaveClass(/khl-paused/)
        const f1 = await attr(page, 'data-tick')
        await page.waitForTimeout(1500)
        expect(await attr(page, 'data-tick'), 'tick frozen off-screen').toBe(f1)
        expect(await runningAnims(page, '[data-testid="home-live"]'), 'hero loops paused').toEqual([])
        // the band is off-screen too at the bottom of the page
        await expect(page.getByTestId('home-field')).toHaveAttribute('data-motion', 'paused')
        await expect(page.getByTestId('home-crops')).toHaveAttribute('data-motion', 'paused')
        expect(await runningAnims(page, '[data-testid="home-band"]'), 'band loops paused').toEqual([])

        // band in view → its loops run
        await page.getByTestId('home-field').scrollIntoViewIfNeeded()
        await expect(page.getByTestId('home-field')).toHaveAttribute('data-motion', 'on')
        await expect(page.getByTestId('home-crops')).toHaveAttribute('data-motion', 'on')
        expect((await runningAnims(page, '[data-testid="home-band"]')).length, 'band loops run in view').toBeGreaterThan(0)
        // hidden tab → band paused
        await setHidden(page, true)
        await expect(page.getByTestId('home-field')).toHaveAttribute('data-motion', 'paused')
        await expect(page.getByTestId('home-crops')).toHaveAttribute('data-motion', 'paused')
        expect(await runningAnims(page, '[data-testid="home-band"]')).toEqual([])
        await setHidden(page, false)
        await expect(page.getByTestId('home-field')).toHaveAttribute('data-motion', 'on')

        // hero back in view → runs; hidden tab → stops, tick frozen
        await scrollStageIntoView(page)
        await expect(hero(page)).toHaveAttribute('data-motion', 'on')
        await setHidden(page, true)
        await expect(hero(page)).toHaveAttribute('data-motion', 'paused')
        const f2 = await attr(page, 'data-tick')
        await page.waitForTimeout(1500)
        expect(await attr(page, 'data-tick'), 'tick frozen while hidden').toBe(f2)
        expect(await runningAnims(page, '[data-testid="home-live"]')).toEqual([])
        await setHidden(page, false)
        await expect(hero(page)).toHaveAttribute('data-motion', 'on')
        expect(errors).toEqual([])
        await ctx.close()
      })

      for (const mode of ['reduced-motion', 'save-data']) {
        test(`E3 ${mode}: static hero (persona 1 fully drawn, no timer), static band; tabs still switch`, async ({ browser }) => {
          const opts = mode === 'reduced-motion'
            ? { ctxOpts: { reducedMotion: 'reduce' } }
            : { init: () => {
              const conn = { saveData: true, effectiveType: '3g', addEventListener() {}, removeEventListener() {} }
              Object.defineProperty(Navigator.prototype, 'connection', { configurable: true, get: () => conn })
            } }
          const { ctx, page, errors } = await open(browser, { lang, width, speed: 1, ...opts })
          await page.goto('/')
          await waitForApp(page)
          await scrollStageIntoView(page)
          await expect(hero(page)).toHaveAttribute('data-motion', 'static')
          await expect(hero(page)).toHaveClass(/khl-static/)
          await expect(hero(page)).toHaveAttribute('data-persona', 'rent')
          await expect(hero(page)).toHaveAttribute('data-tick', '240')
          await expect(hero(page)).toHaveAttribute('data-auto', 'off')
          await page.waitForTimeout(1200)
          await expect(hero(page)).toHaveAttribute('data-persona', 'rent')
          await expect(hero(page)).toHaveAttribute('data-tick', '240')
          expect(await runningAnims(page, '[data-testid="home-live"]')).toEqual([])
          await page.getByTestId('home-field').scrollIntoViewIfNeeded()
          await expect(page.getByTestId('home-field')).toHaveAttribute('data-motion', 'static')
          await expect(page.getByTestId('home-crops')).toHaveAttribute('data-motion', 'static')
          expect(await runningAnims(page, '[data-testid="home-band"]')).toEqual([])
          // tabs still switch content instantly, fully drawn
          await scrollStageIntoView(page)
          await page.getByTestId('home-live-tab-sell').click()
          await expect(hero(page)).toHaveAttribute('data-persona', 'sell')
          await expect(hero(page)).toHaveAttribute('data-tick', '240')
          // facts: final numbers, never counted (row below the fold, scrolled in)
          await page.getByTestId('home-facts').scrollIntoViewIfNeeded()
          await expect(page.getByTestId('home-facts')).toHaveAttribute('data-count', 'final')
          // reveal: nothing hidden
          expect(await page.locator('.ksr-pre').count()).toBe(0)
          expect(errors).toEqual([])
          await ctx.close()
        })
      }

      // ── E.4 ─────────────────────────────────────────────────────────────────────────────
      test('E4 every fact equals its repo source; count-up ends at the final numbers', async ({ browser }) => {
        const { ctx, page, errors } = await open(browser, { lang, width, speed: 1 })
        note('E4 expected facts (computed in the spec from registry.jsx, crops.js, places.js, guide/config.js)', EXPECTED_FACTS)
        // server HTML / no-JS: final numbers
        const server = await (await page.request.get('/')).text()
        expect(server).toMatch(/data-testid="home-facts"[^>]*data-count="final"|data-count="final"[^>]*data-testid="home-facts"/)
        for (const [id, n] of Object.entries(EXPECTED_FACTS)) expect(server).toMatch(new RegExp(`data-testid="home-fact-${id}" data-value="${n}"`))
        await page.goto('/')
        await waitForApp(page)
        const facts = page.getByTestId('home-facts')
        await expect(facts).toHaveAttribute('data-count', 'armed') // below the first screen: armed at 0
        await expect(page.locator('[data-testid="home-fact-cats"] [data-testid="home-fact-num"]')).toHaveText('0')
        await facts.scrollIntoViewIfNeeded()
        await expect(facts).toHaveAttribute('data-count', 'done', { timeout: 10_000 })
        for (const [id, n] of Object.entries(EXPECTED_FACTS)) {
          const li = page.getByTestId(`home-fact-${id}`)
          await expect(li).toHaveAttribute('data-value', String(n))
          await expect(li.getByTestId('home-fact-num')).toHaveText(String(n))
          await expect(li).toContainText(strings[`home_facts_${id}`][lang])
        }
        await expect(page.locator('[data-testid^="home-fact-"][data-value]')).toHaveCount(4)
        expect(errors).toEqual([])
        await ctx.close()
      })
    })
  }
}

// ── E.5 layout ─────────────────────────────────────────────────────────────────────────────

// Runs in the page. Sideways overflow of the document; elements of the hero / band sticking out of the
// viewport (outside a sideways-scrolling row); text clipped by its own box. The decorative phone, field
// scene and crop strip (aria-hidden) are checked separately (phone: no clipped text, no sideways scroll).
function measureOverflow() {
  const vw = document.documentElement.clientWidth
  const out = { vw, docScroll: document.documentElement.scrollWidth, offenders: [], clipped: [] }
  const roots = [...document.querySelectorAll('[data-testid="home-live"], [data-testid="home-band"]')]
  if (roots.length < 2) { out.offenders.push('hero or band missing'); return out }
  const name = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}${el.dataset.testid ? `[${el.dataset.testid}]` : ''}`
  const inScroller = (el, root) => {
    for (let p = el.parentElement; p && p !== root.parentElement; p = p.parentElement) {
      const cs = getComputedStyle(p)
      if (/(auto|scroll)/.test(cs.overflowX) && p.scrollWidth > p.clientWidth) return true
    }
    return false
  }
  const clippedText = (el) => {
    const cs = getComputedStyle(el)
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    if (!hasText) return null
    if ((/(hidden|clip)/.test(cs.overflowX) || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 1) return `w ${el.scrollWidth}>${el.clientWidth}`
    if (/(hidden|clip)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2) return `h ${el.scrollHeight}>${el.clientHeight}`
    if (cs.webkitLineClamp && cs.webkitLineClamp !== 'none' && el.scrollHeight > el.clientHeight + 2) return 'line-clamp'
    return null
  }
  for (const root of roots) {
    for (const el of [root, ...root.querySelectorAll('*')]) {
      const deco = el.closest('svg, [aria-hidden="true"]')
      const r = el.getBoundingClientRect()
      if (r.width < 1 || r.height < 1) continue
      if (!deco && (r.right > vw + 1 || r.left < -1) && !inScroller(el, root)) out.offenders.push(`${name(el)} x=${Math.round(r.left)}..${Math.round(r.right)}`)
      if (el.closest('.ksf-crops')) continue // the marquee row is meant to run past the edges
      if (el.closest('.sr-only')) continue // screen-reader-only text is clipped to 1 px on purpose
      if (el.closest('.khl-cap:not(.on)')) continue // hidden captions (visibility: hidden)
      const c = clippedText(el)
      if (c) out.clipped.push(`${name(el)} ${c} "${el.textContent.trim().slice(0, 30)}"`)
    }
  }
  for (const s of document.querySelectorAll('[data-testid="home-live"] .ksg-screen')) if (s.scrollWidth > s.clientWidth + 1) out.clipped.push(`phone screen scrolls sideways ${s.scrollWidth}>${s.clientWidth}`)
  return out
}

for (const lang of LANGS) {
  test(`E5 ${lang}: no horizontal overflow at 320/360/412/768/1024/1280/1440; hero, band and phone text not clipped (every persona)`, async ({ browser }) => {
    test.setTimeout(240_000)
    // reduced motion: every persona is fully drawn at once (longest texts on screen), nothing mid-animation
    const problems = []
    for (const w of OVERFLOW_WIDTHS) {
      const { ctx, page, errors } = await open(browser, { lang, width: w, height: 800, speed: 1, ctxOpts: { reducedMotion: 'reduce' } })
      await page.goto('/')
      await waitForApp(page)
      await expect(hero(page)).toHaveAttribute('data-motion', 'static')
      await page.waitForLoadState('networkidle').catch(() => {})
      for (const id of PERSONA_IDS) {
        await page.getByTestId(`home-live-tab-${id}`).click()
        await expect(hero(page)).toHaveAttribute('data-persona', id)
        await expect(hero(page)).toHaveAttribute('data-live', '1', { timeout: 15_000 })
        const r = await page.evaluate(measureOverflow)
        if (r.docScroll > r.vw) problems.push(`${w} ${id}: page scrolls sideways ${r.docScroll} > ${r.vw}`)
        for (const o of r.offenders) problems.push(`${w} ${id}: off-screen ${o}`)
        for (const c of r.clipped) problems.push(`${w} ${id}: clipped ${c}`)
      }
      if (errors.length) problems.push(`${w}: errors ${errors.join(' | ')}`)
      await ctx.close()
    }
    note(`E5 ${lang} overflow / clipping`, problems)
    expect(problems).toEqual([])
  })
}

test('E5 first existing action ("I need") on 360x640 within the baseline allowance (DECISIONS 4: top ≤ 1504 px, Hindi)', async ({ browser }) => {
  const tops = {}
  for (const lang of LANGS) {
    const { ctx, page } = await open(browser, { lang, width: 360, height: 640, speed: 1 })
    await page.goto('/')
    await waitForApp(page)
    await page.waitForTimeout(2000)
    tops[lang] = await page.evaluate((label) => {
      window.scrollTo(0, 0)
      const b = [...document.querySelectorAll('button, a')].find((e) => (e.textContent || '').includes(label) && e.getBoundingClientRect().height > 0)
      return b ? Math.round(b.getBoundingClientRect().top + scrollY) : null
    }, strings.cta_need[lang])
    await ctx.close()
  }
  note('E5 I-need top at 360x640 (baseline hi 1184 / en 1304; allowance hi ≤ 1504)', tops)
  expect(tops.hi).not.toBeNull()
  expect(tops.hi).toBeLessThanOrEqual(1504)
  expect(tops.en).not.toBeNull()
})

test('E5 1280x720: the H1, all five tabs and both new buttons are visible without scrolling (hi and en)', async ({ browser }) => {
  for (const lang of LANGS) {
    const { ctx, page, errors } = await open(browser, { lang, width: 1280, height: 720, speed: 1 })
    await page.goto('/')
    await waitForApp(page)
    await page.waitForTimeout(1500)
    const boxes = await page.evaluate(() => {
      window.scrollTo(0, 0)
      const b = (el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), vis: getComputedStyle(el).visibility } }
      return {
        h1: b(document.querySelector('[data-testid="home-live"] h1')),
        tabs: [...document.querySelectorAll('[role="tab"]')].map(b),
        register: b(document.querySelector('[data-testid="home-live-register"]')),
        demo: b(document.querySelector('[data-testid="home-live-demo"]')),
      }
    })
    note(`E5 1280x720 ${lang}`, boxes)
    for (const x of [boxes.h1, ...boxes.tabs, boxes.register, boxes.demo]) {
      expect(x.top).toBeGreaterThanOrEqual(0)
      expect(x.bottom).toBeLessThanOrEqual(720)
      expect(x.right).toBeLessThanOrEqual(1280)
      expect(x.vis).toBe('visible')
    }
    await expect(page.getByTestId('home-live-register')).toHaveAttribute('href', '/signup')
    await expect(page.getByTestId('home-live-demo')).toHaveAttribute('href', '/guide')
    expect(errors).toEqual([])
    await ctx.close()
  }
})

test('E5 layouts switch exactly at the breakpoints: tablet at 768 (not 767), desktop two columns at 1024 (not 1023)', async ({ browser }) => {
  const seen = {}
  for (const w of [767, 768, 1023, 1024]) {
    const { ctx, page } = await open(browser, { lang: 'hi', width: w, height: 900, speed: 1 })
    await page.goto('/')
    await waitForApp(page)
    seen[w] = await page.evaluate(() => {
      const cs = (s) => getComputedStyle(document.querySelector(s))
      const inn = cs('.khl-in')
      return {
        columns: inn.gridTemplateColumns.split(' ').filter(Boolean).length,
        gridCols: inn.gridTemplateColumns,
        stageDir: cs('.khl-stage').flexDirection,
        tabsWrap: cs('.khl-tabs').flexWrap, tabsDir: cs('.khl-tabs').flexDirection, tabsOverflowX: cs('.khl-tabs').overflowX,
        ctaCols: cs('.khl-ctas').gridTemplateColumns.split(' ').filter(Boolean).length,
        stageBg: cs('.khl-stage').backgroundImage.includes('hero-farmer.jpg'),
      }
    })
    await ctx.close()
  }
  note('E5 breakpoints', seen)
  // phone 767: one column, tabs scroll sideways in one row, phone above the bubble, buttons stacked
  expect(seen[767]).toMatchObject({ columns: 1, stageDir: 'column', tabsWrap: 'nowrap', tabsOverflowX: 'auto', ctaCols: 1, stageBg: false })
  // tablet 768 / 1023: one column, tabs wrap (no sideways scroll), phone and bubble side by side, buttons side by side
  for (const w of [768, 1023]) expect(seen[w], `${w}`).toMatchObject({ columns: 1, stageDir: 'row', tabsWrap: 'wrap', tabsOverflowX: 'visible', ctaCols: 2, stageBg: false })
  // desktop 1024: two columns, tabs = vertical list, photo backdrop behind the phone
  expect(seen[1024]).toMatchObject({ columns: 2, tabsDir: 'column', ctaCols: 2, stageBg: true })
})

test('E5 farmer photo: requested once at 1024 px and wider, never below 1024 px (baseline: phone 1 → 0, desktop 1 → 1)', async ({ browser }) => {
  test.setTimeout(180_000)
  const counts = {}
  for (const w of [320, 360, 412, 768, 1023, 1024, 1280, 1440]) {
    const { ctx, page } = await open(browser, { lang: 'hi', width: w, height: 800, speed: 1 })
    let n = 0
    page.on('request', (r) => { if (new URL(r.url()).pathname === PHOTO) n++ })
    await page.goto('/')
    await waitForApp(page)
    await page.waitForTimeout(1500)
    await page.evaluate(async () => {
      const h = document.documentElement.scrollHeight
      for (let y = 0; y < h; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)) }
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(1000)
    counts[w] = n
    await ctx.close()
  }
  note('E5 farmer photo requests per width', counts)
  for (const w of [320, 360, 412, 768, 1023]) expect(counts[w], `${w}`).toBe(0)
  for (const w of [1024, 1280, 1440]) expect(counts[w], `${w}`).toBe(1)
})

test('E1 the rotation stops by itself after 13 rotations (battery)', async ({ browser }) => {
  test.setTimeout(120_000)
  const { ctx, page, errors } = await open(browser, { lang: 'hi', width: 412, speed: SPEED })
  await page.goto('/')
  await waitForApp(page)
  await scrollStageIntoView(page)
  await expect(hero(page)).toHaveAttribute('data-rot', '13', { timeout: 100_000 })
  await expect(hero(page)).toHaveAttribute('data-motion', 'ended', { timeout: 15_000 })
  await expect(hero(page)).toHaveAttribute('data-auto', 'off')
  // 13 rotations from rent: 13 % 5 = 3 → weather, fully drawn
  await expect(hero(page)).toHaveAttribute('data-persona', 'weather')
  await expect(hero(page)).toHaveAttribute('data-tick', '240')
  expect(errors).toEqual([])
  await ctx.close()
})

// ── CLS fix (src/main.jsx + src/App.jsx): other routes start as before ──────────────────────────
test('E6 CLS fix: /, /browse, /guide, /signup, /mausam load directly; in-app navigation to and from / works', async ({ browser }) => {
  test.setTimeout(120_000)
  const { ctx, page, errors, failedBackend } = await open(browser, { lang: 'hi', width: 360, speed: 1 })
  const checks = {
    '/': async () => { await expect(hero(page)).toBeVisible(); await waitForApp(page) },
    '/browse': async () => { await expect(page.locator('main, #root').first()).toBeVisible(); await expect(page.locator('h1').first()).toBeVisible() },
    '/guide': async () => { await expect(page.getByTestId('guide-hub')).toBeVisible() },
    '/signup': async () => { await expect(page.getByTestId('signup-form')).toBeVisible() },
    '/mausam': async () => { await expect(page.locator('h1').first()).toBeVisible() },
  }
  for (const [path, check] of Object.entries(checks)) {
    await page.goto(path)
    await check()
    await page.waitForTimeout(500)
    await noErrorBoundary(page)
    // the app has rendered (React owns #root), not just the prerendered HTML
    await page.waitForFunction(() => Object.keys(document.getElementById('root').firstElementChild || {}).some((k) => k.startsWith('__react')), null, { timeout: 30_000 })
  }
  // client-side: /browse → / (logo link) → /guide (new demo button) → back to /
  await page.goto('/browse')
  await page.waitForFunction(() => Object.keys(document.getElementById('root').firstElementChild || {}).some((k) => k.startsWith('__react')), null, { timeout: 30_000 })
  await page.locator('a[href="/"]').first().click()
  await expect(hero(page)).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
  await page.getByTestId('home-live-demo').click()
  await expect(page.getByTestId('guide-hub')).toBeVisible()
  await page.goBack()
  await expect(hero(page)).toBeVisible()
  await noErrorBoundary(page)
  expect(failedBackend).toEqual([])
  expect(errors).toEqual([])
  await ctx.close()
})
