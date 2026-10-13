// Phase 7 (0025 build) — PERMANENT Playwright E2E for the client flows that the
// backend suite can't cover: unified LocationControl auto-detect + manual fallback
// (Phase 2), free mandi search (Phase 3), and PWA offline/install behaviour (Phase 5).
// These run on the public pages (no auth) against the production preview build.
import { test, expect } from '@playwright/test'
import { blockVisitorWrites } from './support.js'

// Sagar-district coordinate (near Khurai) and a far-outside-MP one (Hyderabad).
const SAGAR = { latitude: 24.045, longitude: 78.33 }
const HYDERABAD = { latitude: 17.385, longitude: 78.4867 }

test.describe('Phase 2 — LocationControl', () => {
  // Batch 7L-1: the pincode control is gone. One shared location: device position, else the
  // place saved on this device, else type a village/town, else the district → town picker.
  test('positive: geolocation already granted sets the location from the device', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ['geolocation'], geolocation: SAGAR })
    await blockVisitorWrites(ctx)
    const page = await ctx.newPage()
    const errors = []
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
    await page.goto('/mausam')
    await expect(page.getByTestId('location-control')).toBeVisible()
    // Permission is already granted, so no card and no prompt: the banner names the place.
    const banner = page.getByTestId('location-banner')
    await expect(banner).toBeVisible({ timeout: 20000 })
    await expect(banner).toHaveAttribute('data-source', 'device')
    await expect(banner).toContainText('📍')
    expect(errors.join('\n')).not.toMatch(/Uncaught|is not a function|undefined is not/)
    await ctx.close()
  })

  test('negative: geolocation refused falls back to the village/town box, no pincode, no crash', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: [], geolocation: SAGAR }) // no geolocation permission
    await blockVisitorWrites(ctx)
    const page = await ctx.newPage()
    const errors = []
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
    await page.goto('/mausam')
    // The browser has already refused geolocation, so the "Share my location" card is not
    // offered (asking could not work). Typing a place must ALWAYS be reachable instead.
    await expect(page.getByTestId('location-input')).toBeVisible({ timeout: 20000 })
    await expect(page.getByTestId('location-prompt')).toHaveCount(0)
    await expect(page.getByTestId('pincode-input')).toHaveCount(0)
    expect(errors.join('\n')).not.toMatch(/Uncaught|is not a function/)
    await ctx.close()
  })

  test('edge: coordinates far outside MP do not crash the page', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ['geolocation'], geolocation: HYDERABAD })
    await blockVisitorWrites(ctx)
    const page = await ctx.newPage()
    await page.goto('/mausam')
    await expect(page.getByTestId('location-banner')).toBeVisible({ timeout: 20000 })
    // Page still renders its heading (no white-screen / thrown error).
    await expect(page.locator('h1')).toBeVisible()
    await ctx.close()
  })

  test('typing a village/town applies a location', async ({ page }) => {
    await blockVisitorWrites(page.context())
    await page.goto('/mausam')
    await page.getByTestId('location-not-now').click()
    await page.getByTestId('location-input').fill('Khurai')
    await page.getByTestId('location-find').click()
    const banner = page.getByTestId('location-banner')
    await expect(banner).toContainText(/खुरई|Khurai/)
    await expect(banner).toHaveAttribute('data-source', 'typed')
  })
})

test.describe('Phase 3 — mandi search (distance-unrestricted)', () => {
  test('search surfaces a mandi result with its date, or an honest empty state', async ({ page }) => {
    await page.goto('/msp/gehun')
    const search = page.getByTestId('mandi-search')
    await expect(search).toBeVisible()
    await search.fill('a') // broad partial → surfaces candidate chips
    const chip = page.locator('button', { hasText: /APMC|Khurai|Sagar|Bina|Indore|Rehli/ }).first()
    await chip.click({ timeout: 8000 }).catch(() => {})
    const result = page.getByTestId('mandi-search-result')
    await expect(result).toBeVisible({ timeout: 8000 })
    // Honesty rule: a shown price is ALWAYS accompanied by a date; otherwise the
    // explicit empty state — never a price with no date, never a crash.
    const text = await result.innerText()
    const hasDatedPrice = /₹[\d,]+/.test(text) && /\d{4}-\d{2}-\d{2}/.test(text)
    const hasEmptyState = /उपलब्ध नहीं|No recent price/.test(text)
    expect(hasDatedPrice || hasEmptyState).toBeTruthy()
  })
})

test.describe('Phase 5 — PWA install + offline', () => {
  test('install prompt: not on first visit, shows on a returning visit', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    // First visit — dispatch beforeinstallprompt; banner must NOT appear.
    await page.goto('/')
    await page.evaluate(() => window.dispatchEvent(new Event('beforeinstallprompt')))
    await page.waitForTimeout(300)
    await expect(page.getByTestId('pwa-install-banner')).toHaveCount(0)
    // Returning visit — reload bumps the visit counter to >=2.
    await page.reload()
    await page.evaluate(() => window.dispatchEvent(new Event('beforeinstallprompt')))
    await expect(page.getByTestId('pwa-install-banner')).toBeVisible({ timeout: 5000 })
    await ctx.close()
  })

  test('offline: banner shows and the shell stays (no blank screen)', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto('/')
    // Wait for the service worker to install AND take control of the page (clientsClaim),
    // so the precached shell can be served offline.
    await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 15000 }).catch(() => {})
    // Going offline fires the 'offline' event → the banner appears so cached data is
    // never presented silently as current.
    await ctx.setOffline(true)
    await expect(page.getByTestId('offline-banner')).toBeVisible({ timeout: 8000 })
    // A full offline reload still serves the precached shell + lazy route chunk from
    // cache (real content renders, not a blank screen / hard failure).
    await page.reload().catch(() => {})
    await expect(page.getByText('किसान', { exact: false }).first()).toBeVisible({ timeout: 12000 })
    await ctx.setOffline(false)
    await ctx.close()
  })
})
