// Batch 12C — home-page mandi ticker: few items, Hindi names, slow steady speed, fixed height.
// Mocked mandi data (220 rows across 20 markets). Public page only; visitor writes are blocked.
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { blockVisitorWrites } from './support.js'

const MARKETS = JSON.parse(readFileSync(new URL('../tests/unit/fixtures/staging-markets-12c.json', import.meta.url), 'utf8')).slice(0, 20)
const CROPS = [['Wheat', 'गेहूं'], ['Soyabean', 'सोयाबीन'], ['Gram', 'चना'], ['Mustard', 'सरसों'], ['Lentil', 'मसूर'], ['Moong', 'मूंग'], ['Urad', 'उड़द'], ['Maize', 'मक्का'], ['Paddy(Dhan)(Common)', 'धान'], ['Garlic', 'लहसुन'], ['Zeera', 'जीरा']]
const ROWS = MARKETS.flatMap((m, mi) => CROPS.map(([en, hi], ci) => ({ commodity_hi: hi, commodity_en: en, market: m.market, district: m.district, modal_price: 1800 + ci * 150 + mi * 7, price_date: '2026-10-20', is_local: mi < 8 })))
const SHOT = process.env.SHOT_PREFIX || 'after'
const SHOT_DIR = 'docs/review/batch12c/evidence/screens'

async function open(browser, { width = 360, height = 640, rows = ROWS, reduced = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: width < 768, hasTouch: width < 768, serviceWorkers: 'block', reducedMotion: reduced ? 'reduce' : 'no-preference' })
  await blockVisitorWrites(ctx)
  await ctx.addInitScript(() => { try { localStorage.setItem('ks_lang_v1', 'hi') } catch { /* ignore */ } })
  await ctx.route(/\/rest\/v1\/mandi_prices/, (r) => {
    const u = r.request().url()
    const body = /price_date=eq\./.test(u) && /commodity_hi/.test(u) ? rows : []
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
  const page = await ctx.newPage()
  await page.goto('/')
  await page.locator('[role="marquee"] .ticker-content').waitFor({ timeout: 20_000 })
  await page.waitForTimeout(600)
  return { ctx, page }
}
const strip = (page) => page.locator('[role="marquee"]')
const firstSetItems = (page) => page.locator('[role="marquee"] .ticker-content > div:first-child > *')

for (const width of [360, 1366]) {
  test.describe(`ticker ${width}px`, () => {
    test('at most 12 distinct items, every one in Hindi (no Latin letters), height 38', async ({ browser }) => {
      const { ctx, page } = await open(browser, { width, height: width > 700 ? 768 : 640 })
      const items = await firstSetItems(page).allInnerTexts()
      expect(items.length).toBeGreaterThan(0)
      expect(items.length).toBeLessThanOrEqual(12)
      expect(new Set(items).size).toBe(items.length)
      for (const t of items) expect(t, `item "${t}"`).not.toMatch(/[A-Za-z]/)
      expect((await strip(page).boundingBox()).height).toBe(38)
      await ctx.close()
    })

    test('steady slow speed: duration >= 40 s and at most 40 px/s', async ({ browser }) => {
      const { ctx, page } = await open(browser, { width, height: width > 700 ? 768 : 640 })
      const m = await page.evaluate(() => {
        const c = document.querySelector('.ticker-content'); const cs = getComputedStyle(c)
        const half = c.firstElementChild.getBoundingClientRect().width
        return { name: cs.animationName, seconds: parseFloat(cs.animationDuration), half, dup: !!c.querySelector('.ticker-dup') }
      })
      expect(m.name).toBe('ticker-scroll')
      expect(m.dup).toBe(true)
      expect(m.seconds).toBeGreaterThanOrEqual(40)
      expect(m.half / m.seconds).toBeLessThanOrEqual(40)
      console.log(`NOTE speed ${width}px:`, JSON.stringify({ ...m, pxPerSec: +(m.half / m.seconds).toFixed(1) }))
      await ctx.close()
    })

    test('screenshot of the strip on the home page', async ({ browser }) => {
      const { ctx, page } = await open(browser, { width, height: width > 700 ? 768 : 640 })
      await page.screenshot({ path: `${SHOT_DIR}/${SHOT}-home-${width}.png` })
      await strip(page).screenshot({ path: `${SHOT_DIR}/${SHOT}-strip-${width}.png` })
      await ctx.close()
    })
  })
}

test('no horizontal page overflow at 320 px', async ({ browser }) => {
  const { ctx, page } = await open(browser, { width: 320, height: 640 })
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
  expect(o.sw).toBeLessThanOrEqual(o.iw)
  await ctx.close()
})

test('a short list does not scroll: no repeat copy, no animation', async ({ browser }) => {
  const { ctx, page } = await open(browser, { width: 1366, height: 768, rows: ROWS.filter((r) => r.commodity_en === 'Wheat').slice(0, 1) })
  const m = await page.evaluate(() => { const c = document.querySelector('.ticker-content'); return { name: getComputedStyle(c).animationName, dup: !!c.querySelector('.ticker-dup') } })
  expect(m).toEqual({ name: 'none', dup: false })
  expect((await strip(page).boundingBox()).height).toBe(38)
  await ctx.close()
})

test('reduced motion: no animation, strip can be swiped, repeat copy hidden', async ({ browser }) => {
  const { ctx, page } = await open(browser, { width: 360, reduced: true })
  const m = await page.evaluate(() => {
    const c = document.querySelector('.ticker-content'); const v = document.querySelector('.ticker-view')
    const d = c.querySelector('.ticker-dup')
    return { name: getComputedStyle(c).animationName, ox: getComputedStyle(v).overflowX, dupShown: d ? getComputedStyle(d).display !== 'none' : false, reachable: v.scrollWidth > v.clientWidth }
  })
  expect(m).toEqual({ name: 'none', ox: 'auto', dupShown: false, reachable: true })
  await ctx.close()
})
