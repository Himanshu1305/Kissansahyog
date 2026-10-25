// Phase 4 (0027 build) — PERMANENT E2E: weather works for ANY coordinate on Earth.
// Rewritten for Batch 7L-1: there is one shared location now (no pincode, no "recent places",
// no service-area gate), so the old "village features gate on the service area" and
// "recent chip" cases became: no out-of-area message anywhere, and a chosen place is
// remembered on the device and can be changed.
import { test, expect } from '@playwright/test'
import { blockVisitorWrites } from './support.js'

const HYDERABAD = { latitude: 17.385, longitude: 78.487 } // far from Sagar, still India
const LONDON = { latitude: 51.5074, longitude: -0.1278 }   // clearly outside India
const KHURAI = { latitude: 24.05, longitude: 78.34 }

// A context whose browser has ALREADY granted geolocation: the app reads the device position
// on load without showing its card or a browser prompt.
async function deviceAt(browser, geolocation) {
  const ctx = await browser.newContext({ permissions: ['geolocation'], geolocation })
  await blockVisitorWrites(ctx)
  return ctx
}

test.describe('Phase 1 — weather is global, ungated', () => {
  test('/mausam renders weather for a far Indian location (Hyderabad), NO out-of-service message', async ({ browser }) => {
    const ctx = await deviceAt(browser, HYDERABAD)
    const page = await ctx.newPage()
    await page.goto('/mausam')
    await expect(page.getByTestId('location-banner')).toHaveAttribute('data-source', 'device', { timeout: 20000 })
    // Weather renders (a temperature is shown), and no out-of-service message on this weather-only page.
    await expect(page.getByText(/\d+°/).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('out-of-area')).toHaveCount(0)
    await ctx.close()
  })

  test('/mausam renders weather for a location clearly outside India (London) via live fetch', async ({ browser }) => {
    const ctx = await deviceAt(browser, LONDON)
    const page = await ctx.newPage()
    const errors = []
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
    await page.goto('/mausam')
    await expect(page.getByTestId('location-banner')).toHaveAttribute('data-source', 'device', { timeout: 20000 })
    // London is not a cron-seeded cell → this exercises the live Open-Meteo fetch path.
    await expect(page.getByText(/\d+°/).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('out-of-area')).toHaveCount(0)
    expect(errors.join('\n')).not.toMatch(/Uncaught|is not a function|Cannot read/)
    await ctx.close()
  })
})

test.describe('Phase 1 — mandi page: no service-area gate any more (Batch 7L-1)', () => {
  test('/msp takes a far location (Hyderabad) without an out-of-service message', async ({ browser }) => {
    const ctx = await deviceAt(browser, HYDERABAD)
    const page = await ctx.newPage()
    await page.goto('/msp/gehun')
    await expect(page.getByTestId('location-banner')).toHaveAttribute('data-source', 'device', { timeout: 20000 })
    await expect(page.getByTestId('out-of-area')).toHaveCount(0)
    await expect(page.locator('h1')).toBeVisible()
    await ctx.close()
  })

  test('/msp names a genuinely local location (Khurai area) from the places list', async ({ browser }) => {
    const ctx = await deviceAt(browser, KHURAI)
    const page = await ctx.newPage()
    await page.goto('/msp/gehun')
    const banner = page.getByTestId('location-banner')
    await expect(banner).toHaveAttribute('data-source', 'device', { timeout: 20000 })
    await expect(banner).toContainText(/खुरई|Khurai/)
    await expect(page.getByTestId('out-of-area')).toHaveCount(0)
    await ctx.close()
  })
})

test.describe('Phase 1g — a chosen place is remembered on the device and can be changed', () => {
  test('typed place → changed from the picker → restored after a reload, weather still renders', async ({ page }) => {
    await blockVisitorWrites(page.context())
    await page.goto('/mausam')
    await page.getByTestId('location-not-now').click()
    // Type a town that is in the places list.
    await page.getByTestId('location-input').fill('Khurai')
    await page.getByTestId('location-find').click()
    const banner = page.getByTestId('location-banner')
    await expect(banner).toContainText(/खुरई|Khurai/)
    // Change → picker: district, then town.
    await page.getByTestId('location-change').click()
    await page.getByTestId('location-open-picker').click()
    await page.getByTestId('location-district-Damoh').click()
    await page.getByTestId('location-towns').getByRole('button').first().click()
    await expect(banner).toHaveAttribute('data-source', 'picked')
    await expect(banner).toContainText(/दमोह|Damoh/)
    // The place is saved on this device: a reload restores it without asking again.
    await page.reload()
    await expect(banner).toHaveAttribute('data-source', 'saved')
    await expect(banner).toContainText(/दमोह|Damoh/)
    await expect(page.getByTestId('location-prompt')).toHaveCount(0)
    // Weather still renders for the restored place.
    await expect(page.getByText(/\d+°/).first()).toBeVisible({ timeout: 15000 })
  })
})
