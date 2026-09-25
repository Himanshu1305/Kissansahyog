// Phase 4 (0026 build) — PERMANENT Playwright E2E for the out-of-service-area location
// behaviour (Phase 1) and the mandi comparison cap/auto-default (Phase 2).
import { test, expect } from '@playwright/test'

const HYDERABAD = { latitude: 17.385, longitude: 78.487 }
const KHURAI = { latitude: 24.05, longitude: 78.34 }

test.describe('Phase 1 — out-of-service-area distance sanity', () => {
  test('negative: a far location (Hyderabad) shows the honest out-of-area message, not a silent substitute', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ['geolocation'], geolocation: HYDERABAD })
    const page = await ctx.newPage()
    await page.goto('/mausam')
    // The distance check needs the seeded pincodes loaded first.
    await page.waitForResponse((r) => r.url().includes('/rest/v1/pincodes'), { timeout: 10000 }).catch(() => {})
    await page.getByRole('button', { name: 'हाँ' }).click()
    await expect(page.getByTestId('out-of-area')).toBeVisible({ timeout: 8000 })
    // It must NOT silently commit the far village — the notice is shown and manual stays reachable.
    await expect(page.getByTestId('out-of-area')).toContainText(/सेवा क्षेत्र से बाहर|service area/)
    await ctx.close()
  })

  test('positive: a genuinely local location (Khurai area) matches without the out-of-area message', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ['geolocation'], geolocation: KHURAI })
    const page = await ctx.newPage()
    await page.goto('/mausam')
    await page.waitForResponse((r) => r.url().includes('/rest/v1/pincodes'), { timeout: 10000 }).catch(() => {})
    await page.getByRole('button', { name: 'हाँ' }).click()
    await page.waitForTimeout(1500)
    await expect(page.getByTestId('out-of-area')).toHaveCount(0)
    await ctx.close()
  })
})

test.describe('Phase 2 — mandi comparison (≤3, auto-nearest default)', () => {
  test('edge: zero selected shows the auto-nearest table, not a blank state', async ({ page }) => {
    await page.goto('/msp/gehun')
    await page.getByTestId('view-compare').click()
    const compare = page.getByTestId('mandi-compare')
    await expect(compare).toBeVisible()
    // A table with at least one commodity row renders immediately (auto-nearest default).
    await expect(compare.locator('table')).toBeVisible({ timeout: 8000 })
    await expect(compare.locator('tbody tr').first()).toBeVisible()
  })

  test('positive+edge: 1, then 3 selections render; a 4th is blocked (never 4 at once)', async ({ page }) => {
    await page.goto('/msp/gehun')
    await page.getByTestId('view-compare').click()
    const chips = page.getByTestId('compare-chip')
    await expect(chips.first()).toBeVisible()
    const n = await chips.count()
    expect(n).toBeGreaterThanOrEqual(4) // need at least 4 to test the cap

    // 1 selection → valid table.
    await chips.nth(0).click()
    await expect(page.getByTestId('mandi-compare').locator('table')).toBeVisible()

    // up to 3 selections.
    await chips.nth(1).click()
    await chips.nth(2).click()
    // best-price highlight appears once 2+ columns exist.
    await expect(page.getByTestId('compare-best').first()).toBeVisible({ timeout: 8000 })

    // attempt a 4th → warning shown and selection stays at 3 (no 4 simultaneous).
    await chips.nth(3).click()
    await expect(page.getByTestId('compare-max-warn')).toBeVisible()
    const selectedCount = await page.locator('[data-testid="compare-chip"]:has-text("✓")').count()
    expect(selectedCount).toBe(3)
  })
})
