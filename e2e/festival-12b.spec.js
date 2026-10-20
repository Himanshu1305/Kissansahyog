// Batch 12B — Dussehra greeting card (one day, India date) + home page desktop layout.
// Public pages only; visitor writes are blocked. Uses Playwright's fake clock for the date.
import { test, expect } from '@playwright/test'
import { blockVisitorWrites } from './support.js'

const DIR = 'docs/review/batch12b/evidence/screens'
const DAY = '2026-10-20T10:00:00+05:30'

async function open(browser, { width = 360, height = 640, time = DAY, path = '/', lang = 'hi', blockStorage = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: width < 768, hasTouch: width < 768, serviceWorkers: 'block' })
  await blockVisitorWrites(ctx)
  await ctx.addInitScript((l) => { try { localStorage.setItem('ks_lang_v1', l) } catch { /* ignore */ } }, lang)
  if (blockStorage) {
    await ctx.addInitScript(() => {
      const boom = () => { throw new DOMException('blocked', 'SecurityError') }
      Object.defineProperty(window, 'localStorage', { get: boom })
    })
  }
  const page = await ctx.newPage()
  await page.clock.setFixedTime(new Date(time))
  await page.goto(path)
  return { ctx, page }
}
const card = (page) => page.locator('[data-testid="festival-card"]')

test('card shows on 20 Oct 2026 (India time) on the home page, with text, picture and a region label', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  await expect(card(page)).toBeVisible()
  await expect(card(page)).toHaveAttribute('role', 'region')
  await expect(card(page)).toHaveAttribute('aria-label', 'त्योहार की शुभकामना')
  await expect(card(page)).toContainText('विजयादशमी (दशहरा) की हार्दिक शुभकामनाएं')
  await expect(card(page)).toContainText('आज के दिन नीलकंठ पक्षी के दर्शन को शुभ माना जाता है।')
  const img = card(page).locator('img')
  await expect(img).toHaveAttribute('alt', 'नीलकंठ पक्षी (इंडियन रोलर)')
  await expect.poll(() => img.evaluate((i) => i.complete && i.naturalWidth)).toBeGreaterThan(0)
  const r = await page.request.get('/festival/neelkanth.webp')
  expect(r.status()).toBe(200)
  expect(r.headers()['content-type']).toMatch(/^image\//)
  await ctx.close()
})

test('English text', async ({ browser }) => {
  const { ctx, page } = await open(browser, { lang: 'en' })
  await expect(card(page)).toContainText('Warm wishes on Vijayadashami (Dussehra)')
  await expect(card(page).locator('img')).toHaveAttribute('alt', 'Neelkanth bird (Indian Roller)')
  await ctx.close()
})

test('card is absent on other pages', async ({ browser }) => {
  for (const path of ['/msp', '/guide', '/browse']) {
    const { ctx, page } = await open(browser, { path })
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(card(page)).toHaveCount(0)
    await ctx.close()
  }
})

test('card is absent the day before and the day after (India time)', async ({ browser }) => {
  for (const time of ['2026-10-19T23:59:00+05:30', '2026-10-21T00:00:00+05:30']) {
    const { ctx, page } = await open(browser, { time })
    await page.locator('[data-testid="home-hero"]').waitFor()
    await page.waitForTimeout(500)
    await expect(card(page)).toHaveCount(0)
    await ctx.close()
  }
})

test('card is present from 00:00 IST and until 23:59 IST', async ({ browser }) => {
  for (const time of ['2026-10-20T00:00:00+05:30', '2026-10-20T23:59:00+05:30']) {
    const { ctx, page } = await open(browser, { time })
    await expect(card(page)).toBeVisible()
    await ctx.close()
  }
})

test('close hides it and it stays hidden after a reload the same day', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  const close = card(page).locator('[data-testid="festival-close"]')
  await expect(close).toBeVisible()
  const bb = await close.boundingBox()
  expect(bb.width).toBeGreaterThanOrEqual(48)
  expect(bb.height).toBeGreaterThanOrEqual(48)
  await expect(close).toHaveAttribute('aria-label', 'शुभकामना संदेश बंद करें')
  await close.click()
  await expect(card(page)).toHaveCount(0)
  await page.reload()
  await page.locator('[data-testid="home-hero"]').waitFor()
  await page.waitForTimeout(500)
  await expect(card(page)).toHaveCount(0)
  await ctx.close()
})

test('works with localStorage blocked: shows, closes, page is fine', async ({ browser }) => {
  const { ctx, page } = await open(browser, { blockStorage: true })
  await expect(card(page)).toBeVisible()
  await card(page).locator('[data-testid="festival-close"]').click()
  await expect(card(page)).toHaveCount(0)
  await expect(page.locator('[data-testid="home-hero"]')).toBeVisible()
  await ctx.close()
})

for (const [width, height] of [[360, 640], [320, 640]]) {
  test(`mobile ${width}: compact card, no horizontal overflow, no overlap`, async ({ browser }) => {
    const { ctx, page } = await open(browser, { width, height })
    await expect(card(page)).toBeVisible()
    await expect(card(page).locator('img')).toBeVisible()
    await page.waitForTimeout(500)
    const m = await page.evaluate(() => {
      const c = document.querySelector('[data-testid="festival-card"] > div').getBoundingClientRect()
      const ticker = document.querySelector('[role="marquee"]').getBoundingClientRect()
      return { h: c.height, top: c.top, tickerBottom: ticker.bottom, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, right: c.right }
    })
    expect(m.sw).toBeLessThanOrEqual(m.cw)
    expect(m.top).toBeGreaterThanOrEqual(m.tickerBottom)
    expect(m.right).toBeLessThanOrEqual(width)
    expect(m.h).toBeLessThanOrEqual(width === 360 ? 100 : 120)
    console.log(`mobile ${width} card height`, Math.round(m.h))
    await page.screenshot({ path: `${DIR}/card-${width}x${height}.png` })
    await ctx.close()
  })
}

for (const [width, height] of [[1366, 768], [1920, 1080]]) {
  test(`desktop ${width}: card centered in the column; guide and WhatsApp cards inside the hero bounds`, async ({ browser }) => {
    const { ctx, page } = await open(browser, { width, height })
    await expect(card(page)).toBeVisible()
    await expect(page.locator('[data-testid="wa-channel-card"]')).toBeVisible()
    await page.waitForTimeout(500)
    const m = await page.evaluate(() => {
      const bb = (sel) => document.querySelector(sel).getBoundingClientRect()
      const hero = bb('[data-testid="home-hero"] .ks-section-inner')
      const g = bb('[data-testid="entry-home-guide"]')
      const wa = bb('[data-testid="wa-channel-card"] > div')
      const f = bb('[data-testid="festival-card"] > div')
      const h1 = bb('[data-testid="home-hero"] h1')
      return { hero: { l: hero.left, r: hero.right }, g: { l: g.left, r: g.right }, wa: { l: wa.left, r: wa.right }, f: { l: f.left, r: f.right, w: f.width }, h1l: h1.left, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }
    })
    for (const k of ['g', 'wa', 'f']) {
      expect(m[k].l, k).toBeGreaterThanOrEqual(m.hero.l)
      expect(m[k].r, k).toBeLessThanOrEqual(m.hero.r)
    }
    expect(Math.abs(m.g.l - m.h1l)).toBeLessThanOrEqual(1)
    expect(Math.abs(m.wa.l - m.h1l)).toBeLessThanOrEqual(1)
    expect(Math.abs((m.f.l + m.f.r) / 2 - width / 2)).toBeLessThanOrEqual(2)
    expect(m.f.w).toBeLessThanOrEqual(720)
    expect(m.sw).toBeLessThanOrEqual(m.cw)
    await page.screenshot({ path: `${DIR}/card-${width}x${height}.png` })
    const wa = await page.locator('[data-testid="wa-channel-card"]').boundingBox()
    await page.screenshot({ path: `${DIR}/after-${width}x${height}-full.png`, fullPage: true, clip: { x: 0, y: 0, width, height: Math.min(wa.y + wa.height + 60, 2400) } })
    await ctx.close()
  })
}
