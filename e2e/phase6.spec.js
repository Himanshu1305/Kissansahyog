import { test, expect } from '@playwright/test'
import { adminClient, testPhone } from './support.js'

// REWRITTEN (legacy-cleanup). Browse defaults to the equipment chip (Land is last), so
// the seeded land/labor listings need their chip selected before counting; tab testids
// are now CategoryStrip chips (chip-<cat>). The mark-Found lifecycle itself is unchanged.

async function loginAs(page, profile) {
  await page.addInitScript(
    ([p]) => {
      localStorage.setItem('ks_session_v1', JSON.stringify(p))
      localStorage.setItem('ks_lang_v1', 'en')
    },
    [profile],
  )
}
// Remote coords so this user's browse shows ONLY their own listings (no other
// test data is within 30 km of here).
async function makeUser(lat = 19.99, lon = 74.99) {
  const admin = adminClient()
  const { data, error } = await admin
    .from('profiles')
    .insert({
      full_name: 'Lifecycle Tester', phone: testPhone(), village_town: 'Remote',
      pincode: '470001', latitude: lat, longitude: lon,
      preferred_language: 'en', disclaimer_accepted_at: new Date().toISOString(),
    })
    .select().single()
  if (error) throw new Error(error.message)
  return data
}

test('mark Found closes listing: disappears from browse, stays (Found) in My Listings', async ({ page }) => {
  const user = await makeUser()
  const admin = adminClient()
  await admin.from('listings').insert({
    user_id: user.id, listing_type: 'offer', category: 'land',
    latitude: user.latitude, longitude: user.longitude, pincode: user.pincode,
    village_name: 'Remote', details: { size_acres: 3, price_type: 'negotiable' }, self_declared: true,
  })
  await loginAs(page, user)

  // Present in browse first (select the Land chip — browse defaults to equipment).
  await page.goto('/browse')
  await page.getByTestId('chip-land').click()
  await expect(page.getByTestId('listing-card')).toHaveCount(1)

  // My Listings: mark Found (accept the confirm dialog).
  await page.goto('/my')
  await expect(page.getByTestId('listing-card')).toHaveCount(1)
  page.on('dialog', (d) => d.accept())
  await page.getByTestId('mark-found').click()

  // Now shows Found badge, no Found action button.
  await expect(page.getByText('Found ✓')).toBeVisible()
  await expect(page.getByTestId('mark-found')).toHaveCount(0)

  // Gone from browse.
  await page.goto('/browse')
  await page.getByTestId('chip-land').click()
  await expect(page.getByTestId('listing-card')).toHaveCount(0)
})

test('expired listing shows Expired in My Listings and is absent from browse', async ({ page }) => {
  const user = await makeUser(19.5, 74.5)
  const admin = adminClient()
  await admin.from('listings').insert({
    user_id: user.id, listing_type: 'requirement', category: 'labor',
    latitude: user.latitude, longitude: user.longitude, pincode: user.pincode,
    village_name: 'Remote', details: { worker_count: 4, work_type: 'general' }, self_declared: false,
    expires_at: '2020-01-01T00:00:00Z',
  })
  await loginAs(page, user)

  await page.goto('/my')
  await expect(page.getByText('Expired')).toBeVisible()
  await expect(page.getByTestId('mark-found')).toHaveCount(0)

  await page.goto('/browse')
  await page.getByTestId('chip-labor').click()
  await expect(page.getByTestId('listing-card')).toHaveCount(0)
})
