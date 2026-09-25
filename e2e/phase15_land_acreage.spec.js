// Part B Phase 4 — PERMANENT E2E for the Land form's numeric acreage + per-acre rate +
// optional contact. Field-presence only (auth-gated /post reached via an injected session).
import { test, expect } from '@playwright/test'

const FAKE_SESSION = {
  id: '00000000-0000-0000-0000-0000000000ab', full_name: 'E2E Land', phone: '9000012346',
  village_town: 'Khurai', pincode: '470117', preferred_language: 'hi',
  disclaimer_accepted_at: '2026-01-01T00:00:00Z', is_admin: false,
}

async function openLandForm(browser) {
  const ctx = await browser.newContext()
  await ctx.addInitScript((s) => localStorage.setItem('ks_session_v1', JSON.stringify(s)), FAKE_SESSION)
  const page = await ctx.newPage()
  await page.goto('/post')
  await page.getByRole('button', { name: /आगे बढ़ें/ }).click()
  await page.getByRole('button', { name: /दे रहे हैं/ }).click()
  await page.getByRole('button', { name: /ज़मीन|Land/ }).first().click()
  await page.locator('#f_size_acres').waitFor({ timeout: 8000 })
  return { ctx, page }
}

test('Land form uses a plain numeric acreage input — no bucket dropdown, no cap', async ({ browser }) => {
  const { ctx, page } = await openLandForm(browser)
  const acres = page.locator('#f_size_acres')
  await expect(acres).toBeVisible()
  // It is a free numeric input, not a <select> of buckets.
  await expect(acres).toHaveAttribute('inputmode', 'decimal')
  expect(await acres.evaluate((el) => el.tagName.toLowerCase())).toBe('input')
  // A value far beyond the old "10+" cap is accepted by the control.
  await acres.fill('50')
  await expect(acres).toHaveValue('50')
  // The old bucket select id must not exist.
  await expect(page.locator('#f_size_range')).toHaveCount(0)
  await ctx.close()
})

test('Land form: fixed/ठेका shows a per-acre rate; optional contact field present', async ({ browser }) => {
  const { ctx, page } = await openLandForm(browser)
  // Optional per-listing contact field is always present.
  await expect(page.locator('#f_contact_phone')).toBeVisible()
  // Choosing the fixed price type reveals the per-acre rate field + label.
  await page.locator('#f_price_type').selectOption('fixed')
  await expect(page.locator('#f_price_amount')).toBeVisible()
  await expect(page.getByText(/प्रति एकड़ दर/)).toBeVisible()
  await ctx.close()
})
