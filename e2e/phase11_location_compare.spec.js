// Phase 4 — PERMANENT Playwright E2E for the mandi comparison cap/auto-default.
// (The out-of-service-area location behaviour moved to phase12_weather_split.spec.js when
// the weather/village split landed — weather-only pages no longer show that message.)
import { test, expect } from '@playwright/test'

test.describe('Phase 2 — mandi comparison (auto-nearest default, cap 5)', () => {
  test('edge: zero selected shows the auto-nearest table, not a blank state', async ({ page }) => {
    await page.goto('/msp/gehun')
    await page.getByTestId('view-compare').click()
    const compare = page.getByTestId('mandi-compare')
    await expect(compare).toBeVisible()
    // A table with at least one commodity row renders immediately (auto-nearest default).
    await expect(compare.locator('table')).toBeVisible({ timeout: 8000 })
    await expect(compare.locator('tbody tr').first()).toBeVisible()
  })

  test('positive+edge: up to 5 selections render; a 6th is blocked (never 6 at once)', async ({ page }) => {
    await page.goto('/msp/gehun')
    await page.getByTestId('view-compare').click()
    const chips = page.getByTestId('compare-chip')
    await expect(chips.first()).toBeVisible()
    const n = await chips.count()
    expect(n).toBeGreaterThanOrEqual(6) // need at least 6 to test the cap

    // 1 selection → valid table.
    await chips.nth(0).click()
    await expect(page.getByTestId('mandi-compare').locator('table')).toBeVisible()

    // up to 5 selections.
    for (let i = 1; i < 5; i++) await chips.nth(i).click()
    // best-price highlight appears once 2+ columns exist.
    await expect(page.getByTestId('compare-best').first()).toBeVisible({ timeout: 8000 })
    expect(await page.locator('[data-testid="compare-chip"]:has-text("✓")').count()).toBe(5)

    // attempt a 6th → warning shown and selection stays at 5 (no 6 simultaneous).
    await chips.nth(5).click()
    await expect(page.getByTestId('compare-max-warn')).toBeVisible()
    expect(await page.locator('[data-testid="compare-chip"]:has-text("✓")').count()).toBe(5)
  })
})
