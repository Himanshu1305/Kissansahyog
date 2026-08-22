import { test, expect } from '@playwright/test'
import { adminClient, testPhone } from './support.js'

// Inject a logged-in session (English UI) before the app boots — faster and
// more reliable than repeating the signup flow in every test.
async function loginAs(page, profile) {
  await page.addInitScript(
    ([p]) => {
      localStorage.setItem('ks_session_v1', JSON.stringify(p))
      localStorage.setItem('ks_lang_v1', 'en')
    },
    [profile],
  )
}

async function makeUser(pincode = '470001', lat = 23.8388, lon = 78.7378) {
  const admin = adminClient()
  const { data, error } = await admin
    .from('profiles')
    .insert({
      full_name: 'Land Tester',
      phone: testPhone(),
      village_town: 'Sagar',
      pincode,
      latitude: lat,
      longitude: lon,
      preferred_language: 'en',
      disclaimer_accepted_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

test('land OFFER: self-declaration gates submit, end-to-end to phone reveal', async ({ page }) => {
  const user = await makeUser()
  await loginAs(page, user)

  await page.goto('/post')
  await page.getByRole('button', { name: 'Offering' }).click()
  await page.getByRole('button', { name: 'Land' }).click()

  // Fill the required size field.
  await page.getByLabel('Land size').selectOption({ label: '2–5 acres' })
  await page.getByLabel('Water source').selectOption({ label: 'Borewell' })

  // Submit disabled until self-declaration is ticked.
  const submit = page.getByRole('button', { name: 'Submit' })
  await expect(submit).toBeDisabled()
  await page.getByRole('checkbox').check()
  await expect(submit).toBeEnabled()
  await submit.click()

  await page.getByRole('button', { name: 'View listing' }).click()

  // Detail view renders fields, no broken images (this listing has no photos).
  await expect(page.getByText('Land', { exact: true })).toBeVisible()
  await expect(page.locator('main img')).toHaveCount(0)

  // Phone reveal: caution banner + reveal → tel: link.
  await page.getByRole('button', { name: /Show number/ }).click()
  const callLink = page.locator('a[href^="tel:"]')
  await expect(callLink).toBeVisible()
  await expect(callLink).toHaveAttribute('href', new RegExp(`tel:${user.phone}`))
})

test('land REQUIREMENT: no self-declaration checkbox, submits directly', async ({ page }) => {
  const user = await makeUser()
  await loginAs(page, user)

  await page.goto('/post')
  await page.getByRole('button', { name: 'Looking for' }).click()
  await page.getByRole('button', { name: 'Land' }).click()

  await page.getByLabel('Land size').selectOption({ label: '1–2 acres' })
  // No self-declaration checkbox for requirements.
  await expect(page.getByRole('checkbox')).toHaveCount(0)

  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByRole('button', { name: 'View listing' })).toBeVisible()
})

test('browse shows a nearby land listing and opens its detail', async ({ page }) => {
  const user = await makeUser()
  // Seed a land offer at the user's location so it is 0 km away.
  const admin = adminClient()
  await admin.from('listings').insert({
    user_id: user.id,
    listing_type: 'offer',
    category: 'land',
    latitude: user.latitude,
    longitude: user.longitude,
    pincode: user.pincode,
    details: { size_range: '5-10', arrangement: ['lease'], water_source: 'canal', season: 'rabi', photo_urls: [] },
    self_declared: true,
  })
  await loginAs(page, user)

  await page.goto('/browse')
  const card = page.getByTestId('listing-card').first()
  await expect(card).toBeVisible()
  await expect(page.getByText('0.0 km away').first()).toBeVisible()
  await card.click()
  await expect(page).toHaveURL(/\/listing\//)
})
