import { test, expect } from '@playwright/test'
import { adminClient, testPhone } from './support.js'

// REWRITTEN (legacy-cleanup). Adds the source step before Offering/Looking-for, fills
// the now-required equipment rate, expects the mandatory rules checkbox (so the old
// "0 checkboxes" assertion becomes "1"), fills the asset village, and uses the
// CategoryStrip chip testid (chip-equipment) instead of the old tab-equipment.

async function loginAs(page, profile) {
  await page.addInitScript(
    ([p]) => {
      localStorage.setItem('ks_session_v1', JSON.stringify(p))
      localStorage.setItem('ks_lang_v1', 'en')
    },
    [profile],
  )
}
async function makeUser() {
  const admin = adminClient()
  const { data, error } = await admin
    .from('profiles')
    .insert({
      full_name: 'Equip Tester', phone: testPhone(), village_town: 'Sagar',
      pincode: '470001', latitude: 23.8388, longitude: 78.7378,
      preferred_language: 'en', disclaimer_accepted_at: new Date().toISOString(),
    })
    .select().single()
  if (error) throw new Error(error.message)
  return data
}

async function startPost(page, type, category) {
  await page.goto('/post')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: type }).click()
  await page.getByRole('button', { name: category }).first().click()
}

test('equipment OFFER with availability toggle, no self-declaration', async ({ page }) => {
  const user = await makeUser()
  await loginAs(page, user)
  await startPost(page, 'Offering', 'Equipment')
  await page.locator('#f_equipment_type_id').waitFor({ timeout: 8000 })

  // Equipment needs no self-declaration; the mandatory rules checkbox is the only one.
  await expect(page.getByRole('checkbox')).toHaveCount(1)

  await page.getByLabel('Equipment type').selectOption({ label: 'Tractor' })
  await page.getByLabel('Rental basis').selectOption({ label: 'Per hour' })
  await page.locator('#f_rate_amount').fill('500') // rate is required (v1.1)

  // Default is "Available now"; switching to specific dates reveals date inputs.
  await expect(page.getByLabel('From date')).toHaveCount(0)
  await page.getByRole('button', { name: 'Specific dates' }).click()
  await expect(page.getByLabel('From date')).toBeVisible()
  await expect(page.getByLabel('To date')).toBeVisible()
  // Switch back to "Available now" — date inputs disappear.
  await page.getByRole('button', { name: 'Available now' }).click()
  await expect(page.getByLabel('From date')).toHaveCount(0)

  await page.locator('#f_asset_village').fill('Khurai')
  await page.getByTestId('rules-agree-checkbox').check()
  await page.getByRole('button', { name: 'Submit' }).click()
  await page.getByRole('button', { name: 'View listing' }).click()
  await expect(page.getByText('Tractor')).toBeVisible()
  await expect(page.getByText('Available now')).toBeVisible()
})

test('equipment requires an equipment type', async ({ page }) => {
  const user = await makeUser()
  await loginAs(page, user)
  await startPost(page, 'Looking for', 'Equipment')
  await page.getByTestId('rules-agree-checkbox').waitFor({ timeout: 8000 })
  // Submit without picking a type (rules ticked so the button is enabled).
  await page.getByTestId('rules-agree-checkbox').check()
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText('select the equipment type')).toBeVisible()
})

test('equipment appears in its own browse tab', async ({ page }) => {
  const user = await makeUser()
  const admin = adminClient()
  const { data: types } = await admin.from('equipment_types').select('*')
  await admin.from('listings').insert({
    user_id: user.id, listing_type: 'offer', category: 'equipment',
    latitude: user.latitude, longitude: user.longitude, pincode: user.pincode,
    village_name: 'Sagar',
    details: { equipment_type_id: types[0].id, rental_basis: 'per_day', rate_amount: '500', available_now: true },
    self_declared: false,
  })
  await loginAs(page, user)
  await page.goto('/browse')
  await page.getByTestId('chip-equipment').click()
  await expect(page.getByTestId('listing-card').first()).toBeVisible()
})
