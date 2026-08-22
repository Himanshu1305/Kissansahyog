import { test, expect } from '@playwright/test'
import { adminClient, testPhone } from './support.js'

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

test('equipment OFFER with availability toggle, no self-declaration', async ({ page }) => {
  const user = await makeUser()
  await loginAs(page, user)
  await page.goto('/post')
  await page.getByRole('button', { name: 'Offering' }).click()
  await page.getByRole('button', { name: 'Equipment' }).click()

  // No self-declaration checkbox for equipment.
  await expect(page.getByRole('checkbox')).toHaveCount(0)

  await page.getByLabel('Equipment type').selectOption({ label: 'Tractor' })
  await page.getByLabel('Rental basis').selectOption({ label: 'Per hour' })

  // Default is "Available now"; switching to specific dates reveals date inputs.
  await expect(page.getByLabel('From date')).toHaveCount(0)
  await page.getByRole('button', { name: 'Specific dates' }).click()
  await expect(page.getByLabel('From date')).toBeVisible()
  await expect(page.getByLabel('To date')).toBeVisible()
  // Switch back to "Available now" — date inputs disappear.
  await page.getByRole('button', { name: 'Available now' }).click()
  await expect(page.getByLabel('From date')).toHaveCount(0)

  await page.getByRole('button', { name: 'Submit' }).click()
  await page.getByRole('button', { name: 'View listing' }).click()
  await expect(page.getByText('Tractor')).toBeVisible()
  await expect(page.getByText('Available now')).toBeVisible()
})

test('equipment requires an equipment type', async ({ page }) => {
  const user = await makeUser()
  await loginAs(page, user)
  await page.goto('/post')
  await page.getByRole('button', { name: 'Looking for' }).click()
  await page.getByRole('button', { name: 'Equipment' }).click()
  // Submit without picking a type.
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
    details: { equipment_type_id: types[0].id, rental_basis: 'per_day', available_now: true },
    self_declared: false,
  })
  await loginAs(page, user)
  await page.goto('/browse')
  await page.getByTestId('tab-equipment').click()
  await expect(page.getByTestId('listing-card').first()).toBeVisible()
})
