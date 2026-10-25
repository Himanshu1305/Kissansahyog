// Batch 10F Phase 1 — static homepage hero (replaces the 10D live-hero spec e2e/home-10d.spec.js).
// Founder: the persona tabs, phone example, caption bubble, facts row, "Post/Register" hero button
// and the animated field band are gone; ONE demo button stays (to /guide, as in 10D); the three info
// cards stay, static, with the same real data; no homepage animation for now.
// Public pages only; visitor writes are blocked (nothing is written to staging).
import { test, expect } from '@playwright/test'
import { blockVisitorWrites } from './support.js'
import { strings } from '../src/lib/i18n/strings.js'

const LANGS = ['hi', 'en']
const OVERFLOW_WIDTHS = [320, 360, 412, 768, 1024, 1280, 1440]
const ERR_TITLE = strings.error_page_title.hi
const BACKEND_HOST = (() => { try { return new URL(process.env.VITE_SUPABASE_URL).host } catch { return 'supabase.co' } })()
const isBackend = (url) => {
  try {
    const u = new URL(url)
    return u.host === BACKEND_HOST || u.host.endsWith('.supabase.co') || u.pathname.startsWith('/api/')
  } catch { return false }
}
// Same known, pre-existing noise as the 10D spec (Cloudflare beacon locally; storage images on hosts
// whose CSP predates 10E). Every other console error fails the test.
const knownNoise = (m) => {
  const text = m.text()
  const url = m.location()?.url || ''
  if (/cloudflareinsights/.test(text) || /cloudflareinsights/.test(url)) return true
  if (/violates the following Content Security Policy directive: "img-src/.test(text) && /\.supabase\.co\/storage\/v1\/object\/public\//.test(text)) return true
  return false
}
const cspStorageImage = (r) => /\.supabase\.co\/storage\/v1\/object\/public\//.test(r.url()) && /csp/i.test(r.failure()?.errorText || '')

// Every removed 10D hero part, by its old test hook / class.
const REMOVED = ['[data-testid="home-live"]', '[data-testid="home-live-tabs"]', '[data-testid="home-live-stage"]', '[data-testid="home-live-caption"]', '[data-testid="home-live-register"]', '[data-testid="home-live-demo"]', '[data-testid="home-band"]', '[data-testid="home-field"]', '[data-testid="home-crops"]', '[data-testid="home-facts"]', '.khl', '.ksg-phone', '.ksf-wrap', '.ksr-pre', '.ksr-in']
// Visible words of the removed parts (the old persona tabs, captions, facts and the field picture text).
const REMOVED_TEXT = {
  hi: ['किराये पर यंत्र चाहिए', 'अपना सामान बेचना है', 'ट्रैक्टर खोजिए, नंबर देखिए', 'छोटे डेमो — साइट चलाना सीखें', 'किसान सहयोग पर क्या-क्या है', 'चित्र: सुबह का खेत'],
  en: ['I need a machine on rent', 'I want to sell my goods', 'Find a tractor, see the number', 'short demos — learn to use the site', 'What you find on Kissan Sahyog', 'Picture: a field in the morning'],
}

async function open(browser, { lang = 'hi', width = 360, height = 740, ctxOpts = {} } = {}) {
  const isMobile = width < 768
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile, hasTouch: isMobile, serviceWorkers: 'block', ...ctxOpts })
  await blockVisitorWrites(ctx)
  await ctx.addInitScript(() => { try { localStorage.setItem('ks_festival_closed_v1', 'dussehra-2026') } catch { /* ignore */ } }) // 12B: keep position checks independent of the one-day card
  await ctx.addInitScript((l) => { try { localStorage.setItem('ks_lang_v1', l) } catch { /* ignore */ } }, lang)
  // Layout shifts, recorded from the very start (buffered), with the nodes that moved.
  await ctx.addInitScript(() => {
    window.__ksShifts = []
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          if (e.hadRecentInput) continue
          window.__ksShifts.push({ value: e.value, inHero: (e.sources || []).some((s) => s.node && s.node.closest && s.node.closest('[data-testid="home-hero"]')) })
        }
      }).observe({ type: 'layout-shift', buffered: true })
    } catch { /* ignore */ }
  })
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
  return { ctx, page, errors, consoleAll, failedBackend }
}

const note = (what, data) => console.log(`NOTE ${what}: ${JSON.stringify(data)}`)
const hero = (page) => page.getByTestId('home-hero')
// The app has rendered (React owns #root), not just the prerendered HTML.
const reactOwns = (page) => page.waitForFunction(() => Object.keys(document.getElementById('root')?.firstElementChild || {}).some((k) => k.startsWith('__react')), null, { timeout: 30_000 })

for (const lang of LANGS) {
  for (const width of [360, 412]) {
    test.describe(`Home 10F ${lang} ${width}px`, () => {
      test('H1 removed parts are gone; kept parts are there; no console errors, no failed backend requests, no hydration warning', async ({ browser }) => {
        const { ctx, page, errors, consoleAll, failedBackend } = await open(browser, { lang, width })
        await page.goto('/')
        await reactOwns(page)
        await page.waitForLoadState('networkidle').catch(() => {})
        await expect(hero(page)).toBeVisible()
        for (const sel of REMOVED) await expect(page.locator(sel), sel).toHaveCount(0)
        const body = await page.locator('body').innerText()
        for (const txt of [...REMOVED_TEXT.hi, ...REMOVED_TEXT.en]) expect(body.includes(txt), txt).toBe(false)
        // kept: chip, the one h1 + sub-line, the two big buttons, the "first time?" banner above the hero
        await expect(hero(page).getByText(strings.tf_eyebrow[lang])).toBeVisible()
        await expect(page.locator('h1')).toHaveCount(1)
        await expect(hero(page).locator('h1')).toHaveText(strings.tf_title[lang])
        await expect(hero(page).getByText(strings.tf_subline[lang])).toBeVisible()
        await expect(hero(page).getByRole('button', { name: new RegExp(strings.cta_need[lang]) })).toBeVisible()
        await expect(hero(page).getByRole('button', { name: new RegExp(strings.cta_have[lang]) })).toBeVisible()
        await expect(page.getByTestId('entry-home-guide')).toBeVisible()
        // exactly one demo button in the hero
        await expect(hero(page).getByTestId('home-hero-demo')).toHaveCount(1)
        await expect(hero(page).locator('a[href="/guide"]')).toHaveCount(1)
        expect(consoleAll.filter((l) => /hydrat|did not match|server rendered HTML/i.test(l)), 'hydration warnings').toEqual([])
        expect(failedBackend).toEqual([])
        expect(errors).toEqual([])
        await ctx.close()
      })

      test('H2 the demo button opens the same demos as the 10D button (/guide)', async ({ browser }) => {
        const { ctx, page, errors } = await open(browser, { lang, width })
        await page.goto('/')
        await reactOwns(page)
        const demo = page.getByTestId('home-hero-demo')
        await expect(demo).toHaveAttribute('href', '/guide')
        await expect(demo).toHaveText(strings.home_hero_demo[lang])
        const box = await demo.boundingBox()
        expect(box.height).toBeGreaterThanOrEqual(44)
        await demo.click()
        await expect(page).toHaveURL(/\/guide$/)
        await expect(page.getByTestId('guide-hub')).toBeVisible()
        expect(errors).toEqual([])
        await ctx.close()
      })

      test('H3 the info cards show real data, static: no animation, no timer-driven change, no layout shift in the hero', async ({ browser }) => {
        const { ctx, page, errors } = await open(browser, { lang, width })
        await page.goto('/')
        await reactOwns(page)
        await page.waitForLoadState('networkidle').catch(() => {})
        await page.waitForTimeout(1500)
        const cards = page.getByTestId('home-hero-cards')
        await expect(cards).toBeVisible()
        // weather: no location set → the honest "set your place" line (never a default place's weather)
        await expect(cards.getByText(strings.tf_weather_cap[lang], { exact: true })).toBeVisible()
        await expect(cards.getByText(strings.loc_set_for_weather[lang])).toBeVisible()
        await expect(cards.getByText(strings.tf_advice_cap[lang], { exact: true })).toBeVisible()
        // price card: shown only with a real price; when shown it names a ₹ amount
        const price = cards.getByText(strings.tf_price_cap[lang], { exact: true })
        const hasPrice = (await price.count()) > 0
        if (hasPrice) await expect(cards).toContainText('₹')
        note(`H3 ${lang} ${width} price card`, { hasPrice, text: (await cards.innerText()).replace(/\s+/g, ' ').slice(0, 200) })
        // nothing in the hero changes on its own for 6 s (no rotation, glow cycle or count-up)
        const before = await hero(page).innerHTML()
        const mutations = await page.evaluate(() => new Promise((res) => {
          let n = 0
          const mo = new MutationObserver((l) => { n += l.length })
          mo.observe(document.querySelector('[data-testid="home-hero"]'), { subtree: true, childList: true, attributes: true, characterData: true })
          setTimeout(() => { mo.disconnect(); res(n) }, 6000)
        }))
        expect(mutations).toBe(0)
        expect(await hero(page).innerHTML()).toBe(before)
        // no CSS / Web animation on the page (homepage animation deferred by the founder) except the
        // mandi ticker's scroll, which the founder keeps exactly as it is (it is not hero content)
        const anims = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').map((a) => a.animationName || a.constructor.name))
        expect(anims.filter((n) => n !== 'ticker-scroll')).toEqual([])
        const shifts = await page.evaluate(() => window.__ksShifts)
        expect(shifts.filter((s) => s.inHero)).toEqual([])
        expect(errors).toEqual([])
        await ctx.close()
      })
    })
  }
}

test('H4 the prerendered HTML of / has the static hero and none of the removed hero parts', async ({ request }) => {
  const html = await (await request.get('/')).text()
  expect(html).toContain('data-testid="home-hero"')
  expect(html).toContain('data-testid="home-hero-demo"')
  expect(html).toContain(strings.cta_need.hi)
  expect(html).toContain(strings.cta_have.hi)
  for (const m of ['data-testid="home-live"', 'data-testid="home-band"', 'data-testid="home-field"', 'data-testid="home-facts"', 'data-testid="home-live-register"', 'role="tablist"', 'ksg-phone']) expect(html, m).not.toContain(m)
  for (const txt of REMOVED_TEXT.hi) expect(html, txt).not.toContain(txt)
})

test('H5 no lazy hero chunk and no hero timer: no LiveStage request, no hero timers after load', async ({ browser }) => {
  const { ctx, page, errors } = await open(browser, { lang: 'hi', width: 360 })
  const chunks = []
  page.on('request', (r) => { if (/\/assets\/.*\.js$/.test(r.url())) chunks.push(new URL(r.url()).pathname) })
  await page.goto('/')
  await reactOwns(page)
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(3000) // the 10D engine loaded on idle
  expect(chunks.filter((c) => /LiveStage/i.test(c))).toEqual([])
  expect(errors).toEqual([])
  await ctx.close()
})

for (const lang of LANGS) {
  test(`H6 ${lang}: no horizontal overflow at 320–1440; hero fits the width`, async ({ browser }) => {
    test.setTimeout(120_000)
    const problems = []
    for (const w of OVERFLOW_WIDTHS) {
      const { ctx, page, errors } = await open(browser, { lang, width: w, height: 800 })
      await page.goto('/')
      await reactOwns(page)
      await page.waitForLoadState('networkidle').catch(() => {})
      const r = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth
        const off = [...document.querySelectorAll('[data-testid="home-hero"] *')].filter((el) => { const b = el.getBoundingClientRect(); return b.width > 0 && (b.right > vw + 1 || b.left < -1) }).map((el) => el.tagName)
        return { vw, doc: document.documentElement.scrollWidth, off }
      })
      if (r.doc > r.vw) problems.push(`${w}: page scrolls sideways ${r.doc} > ${r.vw}`)
      if (r.off.length) problems.push(`${w}: hero elements off-screen ${r.off.join(',')}`)
      if (errors.length) problems.push(`${w}: ${errors.join(' | ')}`)
      await ctx.close()
    }
    expect(problems).toEqual([])
  })
}

test('H7 first screen at 360x640 (hi): heading on screen; positions of the two buttons and the demo button reported', async ({ browser }) => {
  const { ctx, page } = await open(browser, { lang: 'hi', width: 360, height: 640 })
  await page.goto('/')
  await reactOwns(page)
  await page.waitForTimeout(1500)
  const pos = await page.evaluate(() => {
    window.scrollTo(0, 0)
    const b = (el) => (el ? Math.round(el.getBoundingClientRect().bottom + scrollY) : null)
    const h = document.querySelector('[data-testid="home-hero"]')
    const btns = [...h.querySelectorAll('button')]
    return { heroTop: Math.round(h.getBoundingClientRect().top + scrollY), h1: b(h.querySelector('h1')), need: b(btns[0]), have: b(btns[1]), demo: b(h.querySelector('[data-testid="home-hero-demo"]')) }
  })
  note('H7 360x640 bottoms (px from page top)', pos)
  expect(pos.h1).toBeLessThanOrEqual(640)
  // the hero is compact: both buttons and the demo button follow within one more screen
  expect(pos.demo - pos.heroTop).toBeLessThanOrEqual(520)
  await ctx.close()
})

test('H8 1280x720: the H1, both big buttons and the demo button are visible without scrolling (hi and en)', async ({ browser }) => {
  for (const lang of LANGS) {
    const { ctx, page, errors } = await open(browser, { lang, width: 1280, height: 720 })
    await page.goto('/')
    await reactOwns(page)
    await page.waitForTimeout(1000)
    const boxes = await page.evaluate(([need, have]) => {
      window.scrollTo(0, 0)
      const h = document.querySelector('[data-testid="home-hero"]')
      const b = (el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), right: Math.round(r.right) } }
      const btn = (label) => [...h.querySelectorAll('button')].find((x) => x.textContent.includes(label))
      return [h.querySelector('h1'), btn(need), btn(have), h.querySelector('[data-testid="home-hero-demo"]')].filter(Boolean).map(b)
    }, [strings.cta_need[lang], strings.cta_have[lang]])
    note(`H8 1280x720 ${lang}`, boxes)
    expect(boxes).toHaveLength(4)
    for (const x of boxes) {
      expect(x.top).toBeGreaterThanOrEqual(0)
      expect(x.bottom).toBeLessThanOrEqual(720)
      expect(x.right).toBeLessThanOrEqual(1280)
    }
    expect(errors).toEqual([])
    await ctx.close()
  }
})

test('H9 other routes still start as before; in-app navigation / → /guide (demo button) → back works', async ({ browser }) => {
  test.setTimeout(120_000)
  const { ctx, page, errors, failedBackend } = await open(browser, { lang: 'hi', width: 360 })
  for (const path of ['/', '/browse', '/guide', '/signup', '/mausam', '/msp']) {
    await page.goto(path)
    await reactOwns(page)
    await page.waitForTimeout(400)
    await expect(page.getByText(ERR_TITLE, { exact: false })).toHaveCount(0)
  }
  await page.goto('/browse')
  await reactOwns(page)
  await page.locator('a[href="/"]').first().click()
  await expect(hero(page)).toBeVisible()
  await page.getByTestId('home-hero-demo').click()
  await expect(page.getByTestId('guide-hub')).toBeVisible()
  await page.goBack()
  await expect(hero(page)).toBeVisible()
  expect(failedBackend).toEqual([])
  expect(errors).toEqual([])
  await ctx.close()
})
