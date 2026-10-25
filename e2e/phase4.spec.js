import { test, expect } from '@playwright/test'
import { adminClient, testPhone, postStep1, tickAllConsents, selectSpecFreeEquipmentType } from './support.js'
import { todayIst, datesRow } from '../src/lib/listings/listingDates.js'

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

// 10E 5.2: the "Available now / Specific dates" toggle was replaced in 10E 3C by the mandatory
// start date ("Today" = available now; DECISIONS 46), and "Tractor" needs the 9C spec fields. Same
// intent: an equipment offer posts through the 3-step flow and the detail says when it is available.
test('equipment OFFER with availability (start date, 3-step flow)', async ({ page }) => {
  const user = await makeUser()
  await loginAs(page, user)
  await postStep1(page, 'offer', 'equipment')
  await selectSpecFreeEquipmentType(page) // Trolley
  await page.locator('#f_rate_amount').fill('500') // rate is required for an offer (rental basis is optional)

  // The old toggle is gone; a start date is required and "Today" fills it.
  await expect(page.getByRole('button', { name: 'Specific dates' })).toHaveCount(0)
  await page.getByTestId('post-next').click()
  await expect(page.locator('#f_asset_village')).toHaveCount(0) // blocked on step 2 without a date
  await page.getByTestId('date-quick-0').click()
  await expect(page.locator('#f_available_from')).toHaveValue(todayIst())

  await page.getByTestId('post-next').click() // → step 3 (Location + confirm)

  await page.locator('#f_asset_village').fill('Khurai')
  await tickAllConsents(page)
  await page.getByTestId('post-submit').click()
  await page.getByRole('button', { name: 'View listing' }).click()
  await expect(page.getByText('Trolley').first()).toBeVisible()
  const row = datesRow({ category: 'equipment', listing_type: 'offer', details: { available_from: todayIst(), available_to: null, available_now: false } }, 'en')
  await expect(page.locator('dl')).toContainText(row.value)
})

test('equipment requires an equipment type', async ({ page }) => {
  const user = await makeUser()
  await loginAs(page, user)
  await postStep1(page, 'requirement', 'equipment')
  // Advancing from Details without picking a type is blocked by validation.
  await page.getByTestId('post-next').click()
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
