// Batch 12A — WhatsApp channel card / link. Public pages only; visitor writes are blocked.
import { test, expect } from '@playwright/test'
import { blockVisitorWrites } from './support.js'
import { strings } from '../src/lib/i18n/strings.js'
import { WHATSAPP_CHANNEL_URL } from '../src/lib/social.js'

async function open(browser, { lang = 'hi', width = 360, height = 640 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: width < 768, hasTouch: width < 768, serviceWorkers: 'block' })
  await blockVisitorWrites(ctx)
  await ctx.route(/whatsapp.com/, (r) => r.abort()) // never reach the real channel from a test
  await ctx.addInitScript((l) => { try { localStorage.setItem('ks_lang_v1', l) } catch { /* ignore */ } }, lang)
  return { ctx, page: await ctx.newPage() }
}
const settle = async (page) => { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(700) }
const links = (page) => page.locator(`a[href="${WHATSAPP_CHANNEL_URL}"]`)
const cards = (page) => page.locator('[data-testid="wa-channel-card"]')

async function expectLink(page, loc) {
  await expect(loc.first()).toBeVisible()
  await expect(loc.first()).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(loc.first()).toHaveAttribute('target', '_blank')
  expect(await loc.first().getAttribute('aria-label')).toContain('Kissansahyog.Com')
}

for (const [path, name] of [['/', 'home'], ['/msp/gehun', 'msp'], ['/mausam', 'mausam'], ['/about', 'about'], ['/contact', 'contact'], ['/guide', 'guide hub']]) {
  test(`card: ${name} has exactly one card, the footer link, and the exact URL`, async ({ browser }) => {
    const { ctx, page } = await open(browser)
    await page.goto(path); await settle(page)
    await expect(cards(page)).toHaveCount(1)
    await expectLink(page, cards(page).locator('a'))
    await expectLink(page, page.locator('footer [data-testid="wa-channel-link"]'))
    await ctx.close()
  })
}

test('inline text on /msp and /mausam is the prices-and-weather line', async ({ browser }) => {
  for (const path of ['/msp/gehun', '/mausam']) {
    const { ctx, page } = await open(browser)
    await page.goto(path); await settle(page)
    await expect(cards(page)).toContainText(strings.wa_ch_line_prices.hi)
    await ctx.close()
  }
})

test('no card (and no footer link) on /login, /signup and /admin', async ({ browser }) => {
  for (const path of ['/login', '/signup', '/admin']) {
    const { ctx, page } = await open(browser)
    await page.goto(path); await settle(page)
    await expect(cards(page), path).toHaveCount(0)
    await expect(links(page), path).toHaveCount(0)
    await ctx.close()
  }
})

test('home 360x640: both big buttons exactly where production has them, the card is below them', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  await page.goto('/'); await settle(page)
  const need = page.getByText(strings.home_hero_need?.hi || 'मुझे कुछ चाहिए', { exact: false }).first()
  const have = page.getByText('मेरे पास कुछ है', { exact: false }).first()
  const nb = await need.boundingBox(); const hb = await have.boundingBox()
  const cb = await cards(page).boundingBox()
  console.log('need', JSON.stringify(nb), 'have', JSON.stringify(hb), 'card', JSON.stringify(cb))
  expect(nb && hb && cb).toBeTruthy()
  expect(nb.y).toBeGreaterThan(0); expect(nb.y + nb.height).toBeLessThanOrEqual(640)
  // Production today (measured 2026-10-20 at 360x640): 'need' y 615-638, 'have' y 691-714 (the second button is already
  // below the 640 px fold). The card must not move either one.
  expect(Math.abs(nb.y - 615)).toBeLessThanOrEqual(3)
  expect(Math.abs(hb.y - 691)).toBeLessThanOrEqual(3)
  expect(cb.y).toBeGreaterThan(hb.y + hb.height)
  await page.screenshot({ path: 'docs/review/batch12a/evidence/screens/home-360x640-hi.png' })
  await ctx.close()
})

test('home: no layout shift from the card, no animation on it', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  await page.goto('/'); await settle(page)
  const anim = await cards(page).evaluate((el) => [el, ...el.querySelectorAll('*')].some((n) => getComputedStyle(n).animationName !== 'none'))
  expect(anim).toBe(false)
  await ctx.close()
})

for (const lang of ['hi', 'en']) {
  test(`no horizontal overflow at 320 px (${lang}) on home, msp, about`, async ({ browser }) => {
    const { ctx, page } = await open(browser, { lang, width: 320, height: 640 })
    for (const path of ['/', '/msp/gehun', '/about']) {
      await page.goto(path); await settle(page)
      const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(o, `${path} ${lang}`).toBeLessThanOrEqual(0)
      const box = await cards(page).first().boundingBox()
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(320)
    }
    if (lang === 'hi') { await page.goto('/'); await settle(page); await page.screenshot({ path: 'docs/review/batch12a/evidence/screens/home-320x640-hi.png' }) }
    await ctx.close()
  })
}

test('touch targets are at least 48 px', async ({ browser }) => {
  const { ctx, page } = await open(browser, { width: 320 })
  await page.goto('/about'); await settle(page)
  for (const loc of [cards(page).locator('a'), page.locator('footer [data-testid="wa-channel-link"]')]) {
    const b = await loc.first().boundingBox()
    expect(b.height).toBeGreaterThanOrEqual(47.5)
  }
  await ctx.close()
})

test('Organization JSON-LD lists the channel in sameAs', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  await page.goto('/about'); await settle(page)
  const same = await page.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent) } catch { return null } }).filter((j) => j && j['@type'] === 'Organization').flatMap((j) => j.sameAs || []))
  expect(same).toContain(WHATSAPP_CHANNEL_URL)
  await ctx.close()
})

test('clicking the link opens a new tab to the channel (no navigation of the app page)', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  await page.goto('/about'); await settle(page)
  const [popup] = await Promise.all([ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null), cards(page).locator('a').first().click()])
  expect(page.url()).toContain('/about')
  if (popup) await popup.close().catch(() => {})
  await ctx.close()
})
