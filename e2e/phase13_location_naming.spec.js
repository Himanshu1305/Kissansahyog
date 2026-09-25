// Phase 4 (0028 build) — PERMANENT E2E for location naming: reverse geocoding turns GPS
// coords into a real place name; the Cloudflare IP city appears as a pre-permission
// suggestion; geocode failure never surfaces raw coordinates.
import { test, expect } from '@playwright/test'

const HYDERABAD = { latitude: 17.4665837, longitude: 78.3116609 } // confirmed real-device fix
const waitPins = (p) => p.waitForResponse((r) => r.url().includes('/rest/v1/pincodes'), { timeout: 10000 }).catch(() => {})

test.describe('Phase 1 — reverse geocoding', () => {
  test('4a: GPS coords resolve to a real place name (Hyderabad), never raw numbers', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ['geolocation'], geolocation: HYDERABAD })
    const page = await ctx.newPage()
    await page.goto('/mausam?debug=1')
    await waitPins(page)
    await page.getByTestId('gps-detect').click()
    // Debug overlay shows BOTH the raw coords AND the resolved place name.
    const dbg = page.getByTestId('geo-debug')
    await expect(dbg).toContainText('17.46', { timeout: 12000 })
    await expect(dbg).toContainText(/हैदराबाद|Hyderabad/)
    // The visible location LABEL shows the city name, not coordinates (the debug overlay,
    // which legitimately shows raw coords, is a separate element).
    await expect(page.getByTestId('location-label')).toContainText(/हैदराबाद|Hyderabad/, { timeout: 12000 })
    await expect(page.getByTestId('location-label')).not.toContainText(/17\.\d+,\s*78\.\d+/)
    await ctx.close()
  })

  test('4c: reverse-geocode failure falls back to a name, never raw coordinates', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ['geolocation'], geolocation: HYDERABAD })
    // Block BigDataCloud → geocode fails.
    await ctx.route(/api\.bigdatacloud\.net/, (route) => route.abort())
    const page = await ctx.newPage()
    await page.goto('/mausam')
    await waitPins(page)
    await page.getByTestId('gps-detect').click()
    // Falls back to a generic label ("आपकी जगह"), NOT raw lat/lng.
    await expect(page.getByTestId('location-label')).toContainText(/आपकी जगह|Your location/, { timeout: 12000 })
    await expect(page.getByTestId('location-label')).not.toContainText(/17\.\d+,\s*78\.\d+/)
    // Weather still renders.
    await expect(page.getByText(/\d+°/).first()).toBeVisible({ timeout: 12000 })
    await ctx.close()
  })
})

test.describe('Phase 2 — Cloudflare IP city suggestion', () => {
  test('4b: a fresh visit shows the IP-city suggestion with no permission prompt', async ({ browser }) => {
    const ctx = await browser.newContext() // no geolocation permission granted
    // Mock the /geo Pages Function (absent under `vite preview`).
    await ctx.route('**/geo', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ city: 'Indore', region: 'MP', country: 'IN', latitude: 22.72, longitude: 75.86 }) }))
    const page = await ctx.newPage()
    await page.goto('/mausam')
    // The soft suggestion appears purely from the IP lookup — no GPS click, no permission.
    await expect(page.getByTestId('ip-suggest')).toBeVisible({ timeout: 8000 })
    await expect(page.getByTestId('ip-suggest')).toContainText('Indore')
    await ctx.close()
  })

  test('edge: /geo unavailable falls through cleanly to the manual pincode', async ({ browser }) => {
    const ctx = await browser.newContext()
    await ctx.route('**/geo', (route) => route.fulfill({ status: 404, body: 'not found' }))
    const page = await ctx.newPage()
    await page.goto('/mausam')
    await page.waitForTimeout(1500)
    await expect(page.getByTestId('ip-suggest')).toHaveCount(0)
    // Manual pincode is still reachable in the prompt.
    await expect(page.getByTestId('pincode-input')).toBeVisible()
    await ctx.close()
  })
})
