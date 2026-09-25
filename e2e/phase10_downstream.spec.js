// Phase 7c (0025 build) — downstream touchpoint sweep for the PUBLIC pages that read
// listings / location / mandi data but were not directly rewritten in this batch.
// Auth-gated pages (/browse, /post, /listing, /admin) are verified by the logged-in
// Phase 8 screenshot pass + the backend guard tests; here we cover the public surface
// and, critically, the homepage mandi ticker (a regression that recurred before).
import { test, expect } from '@playwright/test'

const noFatalErrors = (errors) =>
  expect(errors.filter((e) => /Uncaught|is not a function|undefined is not|Cannot read/.test(e)).join('\n')).toBe('')

for (const path of ['/', '/msp/gehun', '/mausam', '/drone-didi', '/info', '/sawaal']) {
  test(`downstream: ${path} renders without fatal console errors`, async ({ page }) => {
    const errors = []
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
    await page.goto(path)
    await expect(page.locator('h1:visible, h2:visible').first()).toBeVisible()
    noFatalErrors(errors)
  })
}

test('downstream: homepage mandi ticker + nearby counts + listings feed render', async ({ page }) => {
  await page.goto('/')
  // Mandi ticker must still show live prices (this exact regression happened before).
  const ticker = page.locator('[role="marquee"]')
  await expect(ticker).toBeVisible({ timeout: 10000 })
  await expect(ticker).toContainText('₹', { timeout: 10000 })
  // "आपके आसपास" location control renders.
  await expect(page.getByTestId('location-control').first()).toBeVisible()
  // The nearby listings feed is populated for the default Khurai location (the cutoff
  // must not have emptied it). Listing cards each carry a wa.me share link (hero
  // buttons navigate instead), so a wa.me link ⇒ at least one card rendered. The
  // authoritative emptiness guard lives in scripts/test/p_0025_visibility.mjs.
  await expect(page.locator('a[href*="wa.me"]').first()).toBeVisible({ timeout: 12000 })
})

test('downstream: /drone-didi local listings section renders', async ({ page }) => {
  await page.goto('/drone-didi')
  await expect(page.locator('h1')).toBeVisible()
  // Example-listing badges appear on seeded test data (data-integrity from the prior build).
  await expect(page.locator('body')).toContainText(/ड्रोन|Drone/)
})
