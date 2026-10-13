// Phase 4 (0028 build) — PERMANENT E2E for location naming: a device position becomes a real
// place name, and a naming failure never surfaces raw coordinates.
// Rewritten for Batch 7L-1: a position near a listed place is named from the places list
// (no outside call); only a far one goes to BigDataCloud. The Cloudflare IP-city guess, the
// ?debug=1 overlay and the pincode box were removed with the old control.
import { test, expect } from '@playwright/test'
import { blockVisitorWrites } from './support.js'

const HYDERABAD = { latitude: 17.4665837, longitude: 78.3116609 } // confirmed real-device fix
const KHURAI = { latitude: 24.05, longitude: 78.34 }
const RAW_COORDS = /\d{2}\.\d{3,},\s*\d{2}\.\d{3,}/

test.describe('Phase 1 — naming a device position', () => {
  test('4a: far coords resolve to a real place name (Hyderabad), never raw numbers', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ['geolocation'], geolocation: HYDERABAD })
    await blockVisitorWrites(ctx)
    const page = await ctx.newPage()
    await page.goto('/mausam')
    const banner = page.getByTestId('location-banner')
    await expect(banner).toContainText(/हैदराबाद|Hyderabad/, { timeout: 20000 })
    await expect(banner).not.toContainText(RAW_COORDS)
    await ctx.close()
  })

  test('4a-ii: a position near a listed place is named from the places list, with no outside call', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ['geolocation'], geolocation: KHURAI })
    await blockVisitorWrites(ctx)
    const page = await ctx.newPage()
    const outside = []
    page.on('request', (r) => { if (/api\.bigdatacloud\.net/.test(r.url())) outside.push(r.url()) })
    await page.goto('/mausam')
    await expect(page.getByTestId('location-banner')).toContainText(/खुरई|Khurai/, { timeout: 20000 })
    expect(outside).toHaveLength(0)
    await ctx.close()
  })

  test('4c: reverse-geocode failure falls back to a generic name, never raw coordinates', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ['geolocation'], geolocation: HYDERABAD })
    await blockVisitorWrites(ctx)
    // Block BigDataCloud → naming fails.
    await ctx.route(/api\.bigdatacloud\.net/, (route) => route.abort())
    const page = await ctx.newPage()
    await page.goto('/mausam')
    const banner = page.getByTestId('location-banner')
    // Falls back to a generic label ("आपकी जगह"), NOT raw lat/lng.
    await expect(banner).toContainText(/आपकी जगह|Your location/, { timeout: 20000 })
    await expect(banner).not.toContainText(RAW_COORDS)
    // Weather still renders.
    await expect(page.getByText(/\d+°/).first()).toBeVisible({ timeout: 15000 })
    await ctx.close()
  })
})

test.describe('Phase 2 — a fresh visit asks first, and guesses nothing', () => {
  test('4b: a fresh visit shows the card, with no IP-city guess and no /geo call', async ({ browser }) => {
    const ctx = await browser.newContext() // no geolocation permission granted
    await blockVisitorWrites(ctx)
    const page = await ctx.newPage()
    const geoCalls = []
    page.on('request', (r) => { if (new URL(r.url()).pathname === '/geo') geoCalls.push(r.url()) })
    await page.goto('/mausam')
    await expect(page.getByTestId('location-prompt')).toBeVisible({ timeout: 8000 })
    await page.waitForTimeout(1500)
    await expect(page.getByTestId('ip-suggest')).toHaveCount(0)
    await expect(page.getByTestId('location-banner')).toHaveCount(0) // no silent default place
    expect(geoCalls).toHaveLength(0)
    await ctx.close()
  })

  test('edge: "Not now" leads to the text box and the district → town picker, never a pincode', async ({ browser }) => {
    const ctx = await browser.newContext()
    await blockVisitorWrites(ctx)
    const page = await ctx.newPage()
    await page.goto('/mausam')
    await page.getByTestId('location-not-now').click()
    await expect(page.getByTestId('location-input')).toBeVisible()
    await expect(page.getByTestId('pincode-input')).toHaveCount(0)
    await page.getByTestId('location-open-picker').click()
    await page.getByTestId('location-district-Panna').click()
    await page.getByTestId('location-towns').getByRole('button').first().click()
    await expect(page.getByTestId('location-banner')).toHaveAttribute('data-source', 'picked')
    await ctx.close()
  })
})
