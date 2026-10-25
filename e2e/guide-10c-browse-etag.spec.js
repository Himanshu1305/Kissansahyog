// Batch 10C — Browse equipment tag chips live in the web address (?etag=), same param and values as the
// Bazaar "search" link (/browse?cat=equipment&etag=<value>). Tapping a chip sets it, tapping it again or
// "All" removes it, a deep link / refresh selects it, an unknown value is ignored, and chip taps REPLACE the
// history entry (Back leaves Browse in one step). Public pages only; visitor writes are blocked.
import { test, expect } from '@playwright/test'
import { blockVisitorWrites } from './support.js'
import { EQUIPMENT_TAGS } from '../src/lib/listings/catalog.js'

const [TAG_A, TAG_B] = EQUIPMENT_TAGS.map((t) => t.value)
const TAG_A_EN = EQUIPMENT_TAGS[0].en
// Sagar district — a saved location so Browse shows results instead of the location prompt.
const SAVED_LOC = { lat: 24.045, lng: 78.33, label: 'Sagar', from: 'picked' }

async function openPage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } })
  await blockVisitorWrites(ctx)
  await ctx.addInitScript(([loc]) => {
    localStorage.setItem('ks_lang_v1', 'en')
    localStorage.setItem('ks_location_v1', JSON.stringify(loc))
  }, [SAVED_LOC])
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  return { ctx, page, errors }
}

const etagOf = (page) => new URL(page.url()).searchParams.get('etag')
const chip = (page, value) => page.getByTestId(`etag-chip-${value}`)

test.describe('Batch 10C — Browse etag in the URL', () => {
  test('etag: tap sets URL', async ({ browser }) => {
    const { ctx, page, errors } = await openPage(browser)
    await gotoEquip(page, '/browse?cat=equipment')
    await expect(page.getByTestId('equipment-tag-filters')).toBeVisible()
    // Result cards only (the "Popular listings" teaser section above the results is not tag-filtered).
    const cards = page.locator(`xpath=//*[@data-testid="listing-card"][not(ancestor::*[@data-testid="popular-section"])]`)
    await expect(page.locator('.animate-spin')).toHaveCount(0)
    const before = await cards.count()
    await chip(page, TAG_A).click()
    await expect(chip(page, TAG_A)).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => etagOf(page)).toBe(TAG_A)
    expect(new URL(page.url()).searchParams.get('cat')).toBe('equipment') // other params kept
    // The list is filtered: never more cards than before, and every card shown carries the chosen tag.
    const n = await cards.count()
    expect(n).toBeLessThanOrEqual(before)
    for (let i = 0; i < n; i++) await expect(cards.nth(i).getByTestId('equipment-tag-card')).toContainText(TAG_A_EN)
    expect(errors).toEqual([])
    await ctx.close()
  })

  test('etag: tap again clears', async ({ browser }) => {
    const { ctx, page, errors } = await openPage(browser)
    await gotoEquip(page, '/browse?cat=equipment')
    await chip(page, TAG_A).click()
    await expect.poll(() => etagOf(page)).toBe(TAG_A)
    await chip(page, TAG_A).click() // same chip again
    await expect.poll(() => etagOf(page)).toBe(null)
    await expect(chip(page, 'all')).toHaveAttribute('aria-pressed', 'true')
    await chip(page, TAG_B).click()
    await expect.poll(() => etagOf(page)).toBe(TAG_B)
    await chip(page, 'all').click() // "All"
    await expect.poll(() => etagOf(page)).toBe(null)
    await expect(chip(page, 'all')).toHaveAttribute('aria-pressed', 'true')
    expect(new URL(page.url()).searchParams.get('cat')).toBe('equipment')
    expect(errors).toEqual([])
    await ctx.close()
  })

  test('etag: deep link selects', async ({ browser }) => {
    const { ctx, page, errors } = await openPage(browser)
    await gotoEquip(page, `/browse?cat=equipment&etag=${TAG_B}`)
    await expect(chip(page, TAG_B)).toHaveAttribute('aria-pressed', 'true')
    await expect(chip(page, 'all')).toHaveAttribute('aria-pressed', 'false')
    // Chip taps replace the history entry: from another page, three taps, one Back leaves Browse.
    await page.goto('/about')
    await gotoEquip(page, '/browse?cat=equipment')
    await chip(page, TAG_A).click(); await expect.poll(() => etagOf(page)).toBe(TAG_A)
    await chip(page, TAG_B).click(); await expect.poll(() => etagOf(page)).toBe(TAG_B)
    await chip(page, 'all').click(); await expect.poll(() => etagOf(page)).toBe(null)
    await page.goBack()
    await expect.poll(() => new URL(page.url()).pathname).toBe('/about')
    expect(errors).toEqual([])
    await ctx.close()
  })

  test('etag: refresh keeps', async ({ browser }) => {
    const { ctx, page, errors } = await openPage(browser)
    await gotoEquip(page, '/browse?cat=equipment')
    await chip(page, TAG_A).click()
    await expect.poll(() => etagOf(page)).toBe(TAG_A)
    await page.reload()
    await expect(chip(page, TAG_A)).toHaveAttribute('aria-pressed', 'true')
    expect(etagOf(page)).toBe(TAG_A)
    expect(errors).toEqual([])
    await ctx.close()
  })

  test('etag: unknown ignored', async ({ browser }) => {
    const { ctx, page, errors } = await openPage(browser)
    await gotoEquip(page, '/browse?cat=equipment&etag=bogus')
    await expect(page.getByTestId('equipment-tag-filters')).toBeVisible()
    await expect(chip(page, 'all')).toHaveAttribute('aria-pressed', 'true')
    for (const t of EQUIPMENT_TAGS) await expect(chip(page, t.value)).toHaveAttribute('aria-pressed', 'false')
    expect(errors).toEqual([])
    await ctx.close()
  })
})

// Batch 13A: on a phone the tag block starts collapsed when no tag is chosen — open it with its arrow.
async function gotoEquip(page, url) {
  await page.goto(url)
  const tog = page.getByTestId('etag-block-toggle')
  if ((await tog.getAttribute('aria-expanded')) === 'false') await tog.click()
}
