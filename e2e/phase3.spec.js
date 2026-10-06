import { test, expect } from '@playwright/test'
import { adminClient, testPhone, postStep1 } from './support.js'

// REWRITTEN (legacy-cleanup). Current post flow: /post → source step (farmer/vendor
// + Continue) → Offering/Looking-for → category → form. The Land form now uses a
// numeric #f_size_acres (not a bucket <select>), a required #f_price_type, an asset
// VILLAGE name (#f_asset_village, the primary distance anchor — pincode is no longer
// asked in the form), and every form has a mandatory rules-compliance checkbox
// (data-testid="rules-agree-checkbox") in addition to the land-offer self-declaration.
// Browse category tabs are CategoryStrip chips (data-testid="chip-<cat>") with Land
// LAST, and the card distance label is integer km ("0 km away").

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

// Batch1 3-step flow (item 5): step 1 What? (type + category) → step 2 Details →
// step 3 Location + the SINGLE combined confirm checkbox (rules + land ownership).
test('land OFFER: 3-step flow, confirm checkbox gates submit, Call reveals number', async ({ page }) => {
  const user = await makeUser()
  await loginAs(page, user)

  await postStep1(page, 'offer', 'land')
  await page.locator('#f_size_acres').waitFor({ timeout: 8000 })
  await page.locator('#f_size_acres').fill('3')
  await page.locator('#f_price_type').selectOption('negotiable')
  await page.getByTestId('post-next').click() // → step 3

  await page.locator('#f_asset_village').fill('Khurai')
  const submit = page.getByTestId('post-submit')
  const confirm = page.getByTestId('rules-agree-checkbox') // one checkbox covers rules + ownership
  await expect(submit).toBeDisabled()
  await confirm.check()
  await expect(submit).toBeEnabled()
  await submit.click()

  await page.getByRole('button', { name: 'View listing' }).click()
  await expect(page).toHaveURL(/\/listing\//)
  await expect(page.getByRole('heading', { name: 'Land', exact: true })).toBeVisible()

  // Item 4: contact buttons are HIDDEN on your OWN listing (the reveal flow for a
  // different viewer is covered end-to-end in batch1.spec.js).
  await expect(page.getByTestId('contact-call')).toHaveCount(0)
})

test('land REQUIREMENT: 3-step flow, single confirm checkbox', async ({ page }) => {
  const user = await makeUser()
  await loginAs(page, user)

  await postStep1(page, 'requirement', 'land')
  await page.locator('#f_size_acres').waitFor({ timeout: 8000 })
  await page.locator('#f_size_acres').fill('2')
  await page.getByTestId('post-next').click() // price_type optional for requirements → straight on

  await page.locator('#f_asset_village').fill('Khurai')
  // Only ONE checkbox on the confirm step now (rules + ownership combined).
  await expect(page.getByRole('checkbox')).toHaveCount(1)
  await page.getByTestId('rules-agree-checkbox').check()
  await page.getByTestId('post-submit').click()
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
    village_name: 'Sagar',
    details: { size_acres: 5, arrangement: ['lease'], water_source: 'canal', season: 'rabi', price_type: 'negotiable', photo_urls: [] },
    self_declared: true,
  })
  await loginAs(page, user)

  await page.goto('/browse')
  // Browse defaults to the equipment chip (Land is last) — select Land first.
  await page.getByTestId('chip-land').click()
  const card = page.getByTestId('listing-card').first()
  await expect(card).toBeVisible()
  await expect(page.getByText('0 km away').first()).toBeVisible()
  await card.click()
  await expect(page).toHaveURL(/\/listing\//)
})
