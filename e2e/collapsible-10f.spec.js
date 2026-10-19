// Batch 10F Phase 2 — collapsible sections (src/components/CollapsibleSection.jsx) on /msp, /mausam
// and the homepage below the hero. Public pages only; visitor writes are blocked.
import { test, expect } from '@playwright/test'
import { blockVisitorWrites } from './support.js'
import { strings } from '../src/lib/i18n/strings.js'

// The exact defaults on phones (< 768 px) after hydration, when the section starts below the fold.
// Mirrors docs/review/batch10f/evidence/collapsible-defaults.md.
const PHONE_DEFAULTS = {
  '/msp/gehun': { explainer: true, snapshot: true, today: true, trend: false, calc: false, procurement: false, below: false, pastyears: false, faq: false },
  '/': { search: true, near: true, listings: true, videos: false, qa: false, mela: false, govt: false, trust: false, articles: false },
}

async function open(browser, { lang = 'hi', width = 360, height = 740, touch, reducedMotion, storage = true } = {}) {
  const isMobile = width < 768
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile, hasTouch: touch ?? isMobile, serviceWorkers: 'block', ...(reducedMotion ? { reducedMotion: 'reduce' } : {}) })
  await blockVisitorWrites(ctx)
  await ctx.addInitScript(([l, s]) => {
    try { localStorage.setItem('ks_lang_v1', l) } catch { /* ignore */ }
    if (!s) {
      // storage unavailable: every access throws
      Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('blocked') } })
    }
    window.__ksShifts = []
    try {
      new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__ksShifts.push(e.value) }).observe({ type: 'layout-shift', buffered: true })
    } catch { /* ignore */ }
  }, [lang, storage])
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error' && !/cloudflareinsights|img-src/.test(m.text())) errors.push(m.text()) })
  return { ctx, page, errors }
}
const reactOwns = (page) => page.waitForFunction(() => Object.keys(document.getElementById('root')?.firstElementChild || {}).some((k) => k.startsWith('__react')), null, { timeout: 30_000 })
const state = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('details.ks-cs')].map((d) => [d.dataset.section, d.open])))
const settle = async (page) => { await reactOwns(page); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(800) }

test('C1 prerendered HTML: every section open and its text present (msp, mausam, home)', async ({ request }) => {
  // Trailing slash = the prerendered file itself (the local preview answers '/msp/gehun' with the homepage html).
  for (const path of ['/msp/gehun/', '/mausam/', '/']) {
    const html = await (await request.get(path)).text()
    const details = html.match(/<details[^>]*class="ks-cs[^"]*"[^>]*>/g) || []
    expect(details.length, path).toBeGreaterThan(0)
    for (const d of details) expect(d, `${path}: ${d}`).toMatch(/\sopen(=""|\s|>)/)
  }
  const msp = await (await request.get('/msp/gehun/')).text()
  // collapsed-by-default sections are in the HTML with their content
  expect(msp).toContain(strings.msp_procurement_h.hi)
  expect(msp).toContain(strings.msp_calc_h.hi)
  expect(msp).toContain(strings.msp_euparjan_steps.hi.slice(0, 20))
})

for (const [path, want] of Object.entries(PHONE_DEFAULTS)) {
  test(`C2 ${path} phone 360: defaults after hydration; nothing visible moved (CLS)`, async ({ browser }) => {
    const { ctx, page, errors } = await open(browser, { width: 360, height: 640 })
    await page.goto(path)
    await settle(page)
    const got = await state(page)
    for (const [id, open] of Object.entries(want)) if (id in got) expect(got[id], `${path} ${id}`).toBe(open)
    console.log(`NOTE C2 ${path}: ${JSON.stringify(got)}`)
    const cls = await page.evaluate(() => window.__ksShifts.reduce((a, b) => a + b, 0))
    expect(cls).toBeLessThan(0.05)
    expect(errors).toEqual([])
    await ctx.close()
  })
  test(`C3 ${path} at 768 and 1280: everything starts open`, async ({ browser }) => {
    for (const w of [768, 1280]) {
      const { ctx, page } = await open(browser, { width: w, height: 800 })
      await page.goto(path)
      await settle(page)
      const got = await state(page)
      expect(Object.values(got).every(Boolean), `${w}: ${JSON.stringify(got)}`).toBe(true)
      await ctx.close()
    }
  })
}

test('C4 toggle with mouse, touch and keyboard (Enter, Space); aria-expanded follows; chevron right after the heading text', async ({ browser }) => {
  // mouse (desktop)
  {
    const { ctx, page } = await open(browser, { width: 1280, height: 800 })
    await page.goto('/msp/gehun')
    await settle(page)
    const sec = page.locator('details[data-section="procurement"]')
    const sum = sec.locator('summary')
    await expect(sum).toHaveAttribute('aria-expanded', 'true')
    await sum.click()
    await expect(sec).not.toHaveAttribute('open', '')
    await expect(sum).toHaveAttribute('aria-expanded', 'false')
    await expect(sum.getByText(strings.section_expand.hi, { exact: true })).toHaveCount(1)
    await sum.click()
    await expect(sec).toHaveAttribute('open', '')
    // hand cursor, ≥ 44 px tall, chevron inside the h2 right after the text
    const m = await sum.evaluate((s) => {
      const h = s.querySelector('h2'); const c = h.querySelector('.ks-cs-chev')
      const text = [...h.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim()
      return { cursor: getComputedStyle(s).cursor, h: s.getBoundingClientRect().height, chevLast: h.lastElementChild === c, text }
    })
    expect(m.cursor).toBe('pointer')
    expect(m.h).toBeGreaterThanOrEqual(44)
    expect(m.chevLast).toBe(true)
    expect(m.text).toBe(strings.msp_procurement_h.hi)
    await ctx.close()
  }
  // touch (phone)
  {
    const { ctx, page } = await open(browser, { width: 360, height: 640 })
    await page.goto('/msp/gehun')
    await settle(page)
    const sec = page.locator('details[data-section="calc"]')
    await expect(sec).not.toHaveAttribute('open', '')
    await sec.locator('summary').tap()
    await expect(sec).toHaveAttribute('open', '')
    await expect(sec.locator('summary')).toHaveAttribute('aria-expanded', 'true')
    await ctx.close()
  }
  // keyboard
  {
    const { ctx, page } = await open(browser, { width: 1280, height: 800 })
    await page.goto('/msp/gehun')
    await settle(page)
    const sec = page.locator('details[data-section="below"]')
    const sum = sec.locator('summary')
    await sum.focus()
    const ring = await sum.evaluate((s) => getComputedStyle(s).outlineStyle)
    expect(ring).not.toBe('none')
    await page.keyboard.press('Enter')
    await expect(sec).not.toHaveAttribute('open', '')
    await expect(sum).toHaveAttribute('aria-expanded', 'false')
    await page.keyboard.press('Space')
    await expect(sec).toHaveAttribute('open', '')
    await expect(sum).toHaveAttribute('aria-expanded', 'true')
    await ctx.close()
  }
})

test('C5 the choice is remembered per page and section; the page still works with storage unavailable', async ({ browser }) => {
  const { ctx, page } = await open(browser, { width: 360, height: 640 })
  await page.goto('/msp/gehun')
  await settle(page)
  const calc = page.locator('details[data-section="calc"]')
  await expect(calc).not.toHaveAttribute('open', '')
  await calc.locator('summary').tap()
  await expect(calc).toHaveAttribute('open', '')
  await page.reload()
  await settle(page)
  await expect(page.locator('details[data-section="calc"]')).toHaveAttribute('open', '')
  // another section on the same page keeps its default
  await expect(page.locator('details[data-section="procurement"]')).not.toHaveAttribute('open', '')
  await ctx.close()

  const s2 = await open(browser, { width: 360, height: 640, storage: false })
  await s2.page.goto('/msp/gehun')
  await settle(s2.page)
  const c2 = s2.page.locator('details[data-section="calc"]')
  await c2.locator('summary').tap()
  await expect(c2).toHaveAttribute('open', '')
  expect(s2.errors.filter((e) => /pageerror/.test(e))).toEqual([])
  await s2.ctx.close()
})

test('C6 a #hash pointing into a collapsed section opens it and scrolls to it', async ({ browser }) => {
  const { ctx, page } = await open(browser, { width: 360, height: 640 })
  await page.goto('/msp/gehun#procurement')
  await settle(page)
  const sec = page.locator('details[data-section="procurement"]')
  await expect(sec).toHaveAttribute('open', '')
  const top = await sec.evaluate((d) => d.getBoundingClientRect().top)
  expect(Math.abs(top)).toBeLessThan(200)
  await ctx.close()
})

test('C7 reduced motion: no height animation, no chevron transition', async ({ browser }) => {
  const { ctx, page } = await open(browser, { width: 360, height: 640, reducedMotion: true })
  await page.goto('/msp/gehun')
  await settle(page)
  const sum = page.locator('details[data-section="calc"] summary')
  const m = await sum.evaluate((s) => ({ sum: getComputedStyle(s).transitionDuration, chev: getComputedStyle(s.querySelector('.ks-cs-chev')).transitionDuration, body: getComputedStyle(s.parentElement.querySelector('.ks-cs-body')).transitionDuration }))
  expect(m).toEqual({ sum: '0s', chev: '0s', body: '0s' })
  await sum.tap()
  const anims = await page.evaluate(() => document.getAnimations().filter((a) => a.effect?.target?.closest?.('details.ks-cs')).length)
  expect(anims).toBe(0)
  await ctx.close()
})

test('C8 /mausam and the homepage: toggles work, nothing scrolls sideways at 320', async ({ browser }) => {
  for (const path of ['/mausam', '/']) {
    const { ctx, page, errors } = await open(browser, { width: 320, height: 640 })
    await page.goto(path)
    await settle(page)
    const any = page.locator('details.ks-cs').last()
    const was = await any.evaluate((d) => d.open)
    await any.locator('summary').tap()
    await expect.poll(() => any.evaluate((d) => d.open)).toBe(!was)
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(over, path).toBeLessThanOrEqual(0)
    expect(errors, path).toEqual([])
    await ctx.close()
  }
})
