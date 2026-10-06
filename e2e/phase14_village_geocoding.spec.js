// Part A Phase 5 — PERMANENT E2E for the village-name listing form (the UI half of the
// pincode→village anchor change). The queue/geocode pipeline is covered by the mocked
// backend suite (p_0029); this asserts the form now asks for a village with autocomplete
// and no longer asks for a pincode. Auth-gated /post is reached via an injected session.
import { test, expect } from '@playwright/test'

// A minimal in-tab session so /post renders (field-presence only — no submit, no DB write).
const FAKE_SESSION = {
  id: '00000000-0000-0000-0000-0000000000aa', full_name: 'E2E Tester', phone: '9000012345',
  village_town: 'Khurai', pincode: '470117', preferred_language: 'hi',
  disclaimer_accepted_at: '2026-01-01T00:00:00Z', is_admin: false,
}

test('Land/Equipment form asks for a VILLAGE name with autocomplete, not a pincode', async ({ browser }) => {
  const ctx = await browser.newContext()
  await ctx.addInitScript((s) => { localStorage.setItem('ks_session_v1', JSON.stringify(s)); localStorage.setItem('ks_lang_v1', 'en') }, FAKE_SESSION)
  const page = await ctx.newPage()
  await page.goto('/post')
  // 3-step flow: step 1 → equipment Details → pick a type → step 3 (Location + confirm).
  await page.getByTestId('post-type-offer').click()
  await page.getByTestId('post-cat-equipment').click()
  await page.getByTestId('post-next').click()
  await page.locator('#f_equipment_type_id').waitFor({ timeout: 8000 })
  await page.locator('#f_equipment_type_id').selectOption({ index: 1 })
  await page.locator('#f_rate_amount').fill('500')
  await page.getByTestId('post-next').click()

  // Village-name input is present…
  await expect(page.locator('#f_asset_village')).toBeVisible({ timeout: 8000 })
  // …with an autocomplete datalist populated from resolved villages…
  await expect(page.locator('#known-villages option').first()).toHaveCount(1)
  const optionCount = await page.locator('#known-villages option').count()
  expect(optionCount).toBeGreaterThan(3) // the 20 seeded villages
  // …and the old numeric asset-pincode field is gone.
  await expect(page.locator('#f_asset_pincode')).toHaveCount(0)
  await ctx.close()
})

test('Land form (contract) also uses the village input, no pincode', async ({ browser }) => {
  const ctx = await browser.newContext()
  await ctx.addInitScript((s) => { localStorage.setItem('ks_session_v1', JSON.stringify(s)); localStorage.setItem('ks_lang_v1', 'en') }, FAKE_SESSION)
  const page = await ctx.newPage()
  await page.goto('/post')
  await page.getByTestId('post-type-offer').click()
  await page.getByTestId('post-cat-land').click()
  await page.getByTestId('post-next').click()
  await page.locator('#f_size_acres').waitFor({ timeout: 8000 })
  await page.locator('#f_size_acres').fill('2')
  await page.locator('#f_price_type').selectOption('negotiable')
  await page.getByTestId('post-next').click()
  await expect(page.locator('#f_asset_village')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('#f_asset_pincode')).toHaveCount(0)
  await ctx.close()
})
