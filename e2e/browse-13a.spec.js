// Batch 13A — Browse: All / Offering / Looking for with live counts, two headed sections, collapse
// arrows, applied-filter chips, popular block (follows the choice, collapsed on phones), URL state,
// storage blocked, no horizontal overflow, and the footer wording. Listing data is MOCKED (both types);
// public pages only, visitor writes blocked.
//   npx playwright test --config playwright.13a.config.js e2e/browse-13a.spec.js
import { test, expect } from '@playwright/test'
import { blockVisitorWrites } from './support.js'
import { EQUIPMENT_TAGS } from '../src/lib/listings/catalog.js'

const DIR = 'docs/review/batch13a/evidence/screens'
const LOC = { lat: 24.045, lng: 78.33, label: 'Sagar', from: 'picked' }
const TAG = EQUIPMENT_TAGS[0]

const mk = (id, type, dLat, tags = [], extra = {}) => ({
  id, listing_type: type, category: 'equipment', status: 'active', is_available: true, user_id: 'u1', pincode: '470001',
  latitude: LOC.lat + dLat, longitude: LOC.lng, wide_visibility: false, created_at: '2026-10-10T10:00:00Z', view_count: 5,
  details: { equipment_tags: tags, title: `Item ${id}` }, listing_source: 'user', ...extra,
})
const ROWS = [
  mk('o1', 'offer', 0.01, [TAG.value]), mk('o2', 'offer', 0.02), mk('o3', 'offer', 0.03),
  mk('r1', 'requirement', 0.015, [TAG.value]), mk('r2', 'requirement', 0.025),
]

async function open(browser, { width = 360, height = 640, lang = 'hi', path = '/browse?cat=equipment', blockStorage = false, rows = ROWS } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: width < 768, hasTouch: width < 768, serviceWorkers: 'block' })
  await blockVisitorWrites(ctx)
  await ctx.route((url) => url.pathname.endsWith('/rest/v1/listings'), (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    const popular = route.request().url().includes('view_count')
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(popular ? rows : rows) })
  })
  await ctx.addInitScript(([l, loc, block]) => {
    try { localStorage.setItem('ks_lang_v1', l); localStorage.setItem('ks_location_v1', JSON.stringify(loc)) } catch { /* ignore */ }
    if (block) Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('blocked', 'SecurityError') } })
  }, [lang, LOC, blockStorage])
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(path)
  await expect(page.getByTestId('browse-sections')).toBeVisible()
  return { ctx, page, errors }
}
const cards = (page, type) => page.locator(`[data-testid="section-${type}"] [data-testid="listing-card"]`)
const typeParam = (page) => new URL(page.url()).searchParams.get('type')

test('Offering shows only offers, count matches, URL keeps it across a reload', async ({ browser }) => {
  const { ctx, page, errors } = await open(browser, { lang: 'en' })
  await expect(page.getByTestId('type-offer')).toContainText('Offering (3)')
  await expect(page.getByTestId('type-requirement')).toContainText('Looking for (2)')
  await expect(page.getByTestId('type-all')).toContainText('All (5)')
  await page.getByTestId('type-offer').click()
  await expect.poll(() => typeParam(page)).toBe('offer')
  await expect(page.getByTestId('section-requirement')).toHaveCount(0)
  await expect(cards(page, 'offer')).toHaveCount(3)
  await expect(page.getByTestId('applied-type')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('type-offer')).toHaveAttribute('aria-pressed', 'true')
  await expect(cards(page, 'offer')).toHaveCount(3)
  await page.getByTestId('applied-type').click() // chip clears it
  await expect.poll(() => typeParam(page)).toBe(null)
  expect(errors).toEqual([])
  await ctx.close()
})

test('Looking for shows only requirements; an unknown ?type= is ignored', async ({ browser }) => {
  const { ctx, page } = await open(browser, { lang: 'en' })
  await page.getByTestId('type-requirement').click()
  await expect(page.getByTestId('section-offer')).toHaveCount(0)
  await expect(cards(page, 'requirement')).toHaveCount(2)
  await page.goto('/browse?cat=equipment&type=bogus')
  await expect(page.getByTestId('type-all')).toHaveAttribute('aria-pressed', 'true')
  await ctx.close()
})

test('All shows two headed sections, offers first, each with its own arrow', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  const secs = page.locator('[data-testid="browse-sections"] > section')
  await expect(secs).toHaveCount(2)
  await expect(secs.nth(0)).toContainText('दे रहे हैं (3)')
  await expect(secs.nth(1)).toContainText('चाहिए (2)')
  const t = page.getByTestId('sec-offer-toggle')
  await expect(t).toHaveAttribute('aria-expanded', 'true')
  await t.click()
  await expect(t).toHaveAttribute('aria-expanded', 'false')
  await expect(cards(page, 'offer').first()).toBeHidden()
  await expect(cards(page, 'requirement').first()).toBeVisible()
  await t.click()
  await expect(cards(page, 'offer').first()).toBeVisible()
  await page.screenshot({ path: `${DIR}/browse-all-360-hi.png` })
  await ctx.close()
})

test('a type with none shows its own message, not a vanished section', async ({ browser }) => {
  const { ctx, page } = await open(browser, { rows: ROWS.filter((r) => r.listing_type === 'offer') })
  await expect(page.getByTestId('section-empty-requirement')).toContainText('इस श्रेणी में अभी कोई नहीं')
  await ctx.close()
})

test('popular block starts collapsed at 360 px, follows the chosen type, and opens with its arrow', async ({ browser }) => {
  const { ctx, page } = await open(browser, { lang: 'en' })
  const tog = page.getByTestId('popular-toggle')
  await expect(tog).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('#blk-popular')).toBeHidden()
  await page.getByTestId('type-requirement').click()
  await tog.click()
  await expect(tog).toHaveAttribute('aria-expanded', 'true')
  const pc = page.locator('#blk-popular [data-testid="listing-card"]')
  await expect(pc).toHaveCount(2) // only the requirements
  await ctx.close()
})

test('popular block is open on desktop', async ({ browser }) => {
  const { ctx, page } = await open(browser, { width: 1366, height: 768, lang: 'en' })
  await expect(page.getByTestId('popular-toggle')).toHaveAttribute('aria-expanded', 'true')
  await page.screenshot({ path: `${DIR}/browse-desktop-1366-en.png` })
  await ctx.close()
})

test('equipment tag block: collapsed on phone, arrow opens it, summary shows when collapsed', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  const tog = page.getByTestId('etag-block-toggle')
  await expect(tog).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByTestId(`etag-chip-${TAG.value}`)).toBeHidden()
  await page.screenshot({ path: `${DIR}/browse-equipment-collapsed-360-hi.png` })
  await tog.click()
  await expect(tog).toHaveAttribute('aria-expanded', 'true')
  await page.screenshot({ path: `${DIR}/browse-equipment-open-360-hi.png` })
  await page.getByTestId(`etag-chip-${TAG.value}`).click()
  await tog.click() // collapse again with a tag chosen
  await expect(page.getByTestId('etag-summary')).toContainText(TAG.hi)
  await expect(page.getByTestId('applied-tag')).toBeVisible()
  await page.screenshot({ path: `${DIR}/browse-equipment-tag-summary-360-hi.png` })
  await page.getByTestId('etag-summary').click() // removes the tag
  await expect(page.getByTestId('etag-summary')).toHaveCount(0)
  await ctx.close()
})

test('a deep-linked tag opens the tag block on a phone and filters both sections', async ({ browser }) => {
  const { ctx, page } = await open(browser, { lang: 'en', path: `/browse?cat=equipment&etag=${TAG.value}` })
  await expect(page.getByTestId('etag-block-toggle')).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByTestId('type-offer')).toContainText('Offering (1)')
  await expect(page.getByTestId('type-requirement')).toContainText('Looking for (1)')
  await ctx.close()
})

test('works with sessionStorage blocked', async ({ browser }) => {
  const { ctx, page, errors } = await open(browser, { blockStorage: true })
  await page.getByTestId('sec-offer-toggle').click()
  await expect(page.getByTestId('sec-offer-toggle')).toHaveAttribute('aria-expanded', 'false')
  await page.getByTestId('type-offer').click()
  await expect(cards(page, 'offer')).toHaveCount(3)
  expect(errors).toEqual([])
  await ctx.close()
})

for (const lang of ['hi', 'en']) {
  test(`no horizontal overflow at 320 px (${lang})`, async ({ browser }) => {
    const { ctx, page } = await open(browser, { width: 320, lang })
    for (const key of ['type-all', 'type-offer', 'type-requirement']) {
      await page.getByTestId(key).click()
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(over).toBeLessThanOrEqual(0)
    }
    await page.getByTestId('type-offer').click()
    await page.screenshot({ path: `${DIR}/browse-offering-320-${lang}.png` })
    await ctx.close()
  })
}

test('type buttons are 48 px high; Offering / Looking for screenshots', async ({ browser }) => {
  const { ctx, page } = await open(browser)
  const box = await page.getByTestId('type-offer').boundingBox()
  expect(box.height).toBeGreaterThanOrEqual(47.5)
  await page.getByTestId('type-offer').click()
  await page.screenshot({ path: `${DIR}/browse-offering-360-hi.png` })
  await page.getByTestId('type-requirement').click()
  await page.screenshot({ path: `${DIR}/browse-looking-360-hi.png` })
  await ctx.close()
})

test('footer says India / भारत, not Madhya Pradesh', async ({ browser }) => {
  for (const [lang, want] of [['en', 'USD Vision AI LLP · India'], ['hi', 'USD Vision AI LLP · भारत']]) {
    const { ctx, page } = await open(browser, { lang, path: '/browse?cat=equipment' })
    const f = page.getByTestId('footer-company')
    await f.scrollIntoViewIfNeeded()
    await expect(f).toContainText(want)
    await expect(f).not.toContainText(/Madhya Pradesh|मध्यप्रदेश/)
    if (lang === 'hi') await f.screenshot({ path: `${DIR}/footer-hi.png` })
    await ctx.close()
  }
})
