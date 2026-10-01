// Phase 7b — PERMANENT E2E for the Kisan Mela public page, moderation gate, nav + homepage.
// Relies on the seeded sample melas (scripts/seed_melas.mjs): confirmed UAS Bengaluru + three
// "अपेक्षित" university melas. Never calls the live Anthropic API or any aggregator.
import { test, expect } from '@playwright/test'
import { adminClient } from './support.js'

test('public page: confirmed vs अपेक्षित clearly distinguished, filters + empty state work', async ({ page }) => {
  await page.goto('/kisan-mela')
  await expect(page.getByTestId('mela-card').first()).toBeVisible({ timeout: 15000 })
  // Both a confirmed and an "अपेक्षित" entry are present and visually distinct.
  await expect(page.getByTestId('mela-date-confirmed').first()).toBeVisible()
  await expect(page.getByTestId('mela-date-expected').first()).toBeVisible()

  // State filter: Punjab (seeded PAU) → the PAU card remains, others drop.
  const before = await page.getByTestId('mela-card').count()
  await page.getByTestId('mela-state-filter').selectOption('Punjab')
  await expect(page.getByTestId('mela-card')).toHaveCount(1)
  expect(before).toBeGreaterThan(1)

  // Month filter with no matches → graceful empty state (reset state first).
  await page.getByTestId('mela-state-filter').selectOption('')
  await page.getByTestId('mela-month-filter').selectOption('1') // January — no seeded mela
  await expect(page.getByTestId('mela-empty')).toBeVisible()
})

test('"दिलचस्पी है" requires login (anon → redirected to /login)', async ({ page }) => {
  await page.goto('/kisan-mela')
  await page.getByTestId('mela-interest-btn').first().waitFor({ timeout: 15000 })
  await page.getByTestId('mela-interest-btn').first().click()
  await expect(page).toHaveURL(/\/login$/)
})

test('a user submission lands pending and is NOT visible on the public page until approved', async ({ page }) => {
  const venue = 'E2E-PENDING-' + Date.now()
  await page.goto('/kisan-mela/submit')
  await page.locator('#m_name').fill('E2E टेस्ट मेला')
  await page.locator('#m_venue').fill(venue)
  await page.locator('#m_state').fill('Rajasthan')
  await page.getByTestId('m-date-unknown').check()
  await page.locator('#m_exp').fill('Mar 2027')
  await page.getByRole('button', { name: /जानकारी भेजें|Submit/ }).click()
  await expect(page.getByText(/धन्यवाद|Thank you/)).toBeVisible({ timeout: 10000 })

  // Not on the public list (moderation gate).
  await page.goto('/kisan-mela')
  await page.getByTestId('mela-card').first().waitFor({ timeout: 15000 })
  await expect(page.getByText(venue)).toHaveCount(0)

  // Cleanup the pending row.
  await adminClient().from('kisan_mela').delete().eq('venue', venue)
})

test('Resources nav dropdown contains किसान मेला; homepage teaser renders', async ({ page }) => {
  await page.goto('/')
  // Homepage teaser (seeded melas exist → cards; otherwise the empty state).
  const teaserCards = page.getByTestId('home-mela-card')
  const teaserEmpty = page.getByTestId('home-mela-empty')
  await expect(teaserCards.first().or(teaserEmpty)).toBeVisible({ timeout: 15000 })

  // Desktop Resources dropdown → किसान मेला present.
  await page.setViewportSize({ width: 1280, height: 800 })
  const resBtn = page.getByRole('button', { name: /उपयोगी संपर्क|Resources/ }).first()
  await resBtn.click()
  await expect(page.getByRole('menuitem', { name: /किसान मेला|Kisan Mela/ })).toBeVisible()
})
