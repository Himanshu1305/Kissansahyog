// Phase 4 (0027 build) — PERMANENT E2E for the weather/village split: weather works for
// ANY coordinate on Earth (rawCoords, ungated), while village-anchored features stay gated
// to the service area. Plus the Phase 1g recent-chip-repopulates-both regression.
import { test, expect } from '@playwright/test'

const HYDERABAD = { latitude: 17.385, longitude: 78.487 } // far from Sagar, still India
const LONDON = { latitude: 51.5074, longitude: -0.1278 }   // clearly outside India
const waitPins = (p) => p.waitForResponse((r) => r.url().includes('/rest/v1/pincodes'), { timeout: 10000 }).catch(() => {})

async function detect(page) {
  await waitPins(page)
  await page.getByRole('button', { name: 'हाँ' }).click().catch(() => {})
}

test.describe('Phase 1 — weather is global, ungated', () => {
  test('/mausam renders weather for a far Indian location (Hyderabad), NO out-of-service message', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ['geolocation'], geolocation: HYDERABAD })
    const page = await ctx.newPage()
    await page.goto('/mausam')
    await detect(page)
    // Weather renders (a temperature is shown), and no out-of-service message on this weather-only page.
    await expect(page.getByText(/\d+°/).first()).toBeVisible({ timeout: 12000 })
    await expect(page.getByTestId('out-of-area')).toHaveCount(0)
    await ctx.close()
  })

  test('/mausam renders weather for a location clearly outside India (London) via live fetch', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ['geolocation'], geolocation: LONDON })
    const page = await ctx.newPage()
    const errors = []
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
    await page.goto('/mausam')
    await detect(page)
    // London is not a cron-seeded cell → this exercises the live Open-Meteo fetch path.
    await expect(page.getByText(/\d+°/).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('out-of-area')).toHaveCount(0)
    expect(errors.join('\n')).not.toMatch(/Uncaught|is not a function|Cannot read/)
    await ctx.close()
  })
})

test.describe('Phase 1 — village-anchored features still gate on the service area', () => {
  const KHURAI = { latitude: 24.05, longitude: 78.34 }
  test('/msp shows the out-of-service message for a far location (Hyderabad)', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ['geolocation'], geolocation: HYDERABAD })
    const page = await ctx.newPage()
    await page.goto('/msp/gehun')
    await detect(page)
    await expect(page.getByTestId('out-of-area')).toBeVisible({ timeout: 8000 })
    await expect(page.getByTestId('out-of-area')).toContainText(/सेवा क्षेत्र|service area/)
    await ctx.close()
  })

  test('/msp does NOT show the message for a genuinely local location (Khurai area)', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ['geolocation'], geolocation: KHURAI })
    const page = await ctx.newPage()
    await page.goto('/msp/gehun')
    await detect(page)
    await page.waitForTimeout(1500)
    await expect(page.getByTestId('out-of-area')).toHaveCount(0)
    await ctx.close()
  })
})

test.describe('Phase 1g — recent-location chip repopulates both outputs', () => {
  test('selecting a recent chip restores its location (weather rawCoords + village pincode)', async ({ page }) => {
    await page.goto('/mausam')
    await waitPins(page)
    // Build history: apply Bandri (470442), then Khurai (470117).
    await page.getByRole('button', { name: 'जगह बदलें' }).first().click()
    await page.getByTestId('pincode-input').fill('470442')
    await page.getByRole('button', { name: 'लागू करें' }).click()
    await expect(page.getByTestId('location-control')).toContainText('470442')
    await page.getByRole('button', { name: 'जगह बदलें' }).first().click()
    await page.getByTestId('pincode-input').fill('470117')
    await page.getByRole('button', { name: 'लागू करें' }).click()
    await expect(page.getByTestId('location-control')).toContainText('470117')
    // Re-open manual controls and pick the Bandri recent chip → location restored to 470442.
    await page.getByRole('button', { name: 'जगह बदलें' }).first().click()
    await page.getByRole('button', { name: /470442|Bandri/ }).first().click()
    await expect(page.getByTestId('location-control')).toContainText('470442')
    // Weather still renders after the chip re-selection (rawCoords repopulated).
    await expect(page.getByText(/\d+°/).first()).toBeVisible({ timeout: 12000 })
  })
})
