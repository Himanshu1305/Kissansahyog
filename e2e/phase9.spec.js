import { test, expect } from '@playwright/test'
import { adminClient, testPhone } from './support.js'

// Phase 9: whole-system journeys, not isolated units.

async function loginAs(page, profile, lang = 'en') {
  await page.addInitScript(
    ([p, l]) => {
      localStorage.setItem('ks_session_v1', JSON.stringify(p))
      localStorage.setItem('ks_lang_v1', l)
    },
    [profile, lang],
  )
}

// Journey A — one user signs up and posts across ALL THREE categories, sees them
// in My Listings, closes one, and confirms it leaves public browse but stays
// (marked Found) in My Listings. User A lives at Deori (470226), which is >30km
// from all other test data, so browse counts are clean/isolated.
test('Journey A: signup → post all 3 categories → My Listings → close one', async ({ page }) => {
  const phone = testPhone()
  await page.goto('/')
  await page.getByRole('button', { name: 'English' }).click()
  await page.getByRole('button', { name: 'Create new account' }).click()
  await page.getByPlaceholder('e.g. Ramprasad Patel').fill('Journey A')
  await page.getByPlaceholder('10-digit number').fill(phone)
  await page.getByPlaceholder('6-digit pincode').fill('470226') // Deori
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Accept and continue' }).click()
  await expect(page).toHaveURL(/\/home$/)

  // Post Land Offer
  await page.goto('/post')
  await page.getByRole('button', { name: 'Offering' }).click()
  await page.getByRole('button', { name: 'Land' }).click()
  await page.getByLabel('Land size').selectOption({ label: '2–5 acres' })
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByRole('button', { name: 'View listing' })).toBeVisible()

  // Post Equipment Requirement
  await page.goto('/post')
  await page.getByRole('button', { name: 'Looking for' }).click()
  await page.getByRole('button', { name: 'Equipment' }).click()
  await page.getByLabel('Equipment type').selectOption({ label: 'Tractor' })
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByRole('button', { name: 'View listing' })).toBeVisible()

  // Post Labor Offer
  await page.goto('/post')
  await page.getByRole('button', { name: 'Offering' }).click()
  await page.getByRole('button', { name: 'Labor' }).click()
  await page.getByLabel('Number of workers').fill('5')
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByRole('button', { name: 'View listing' })).toBeVisible()

  // My Listings shows all three.
  await page.goto('/my')
  await expect(page.getByTestId('listing-card')).toHaveCount(3)

  // All three are visible in browse (one per tab, 0km away).
  await page.goto('/browse')
  for (const cat of ['land', 'equipment', 'labor']) {
    await page.getByTestId(`tab-${cat}`).click()
    await expect(page.getByTestId('listing-card')).toHaveCount(1)
  }

  // Close the Labor listing from My Listings.
  await page.goto('/my')
  page.on('dialog', (d) => d.accept())
  await page.locator('[data-testid="mark-found"][data-category="labor"]').click()
  await expect(page.getByText('Found ✓')).toBeVisible()

  // Labor is gone from browse; Land still present.
  await page.goto('/browse')
  await page.getByTestId('tab-labor').click()
  await expect(page.getByTestId('listing-card')).toHaveCount(0)
  await page.getByTestId('tab-land').click()
  await expect(page.getByTestId('listing-card')).toHaveCount(1)
})

// Journey B — distance filtering is consistent across ALL THREE categories
// (the shared logic wasn't forked during Phases 4-5). Viewer at Malthon (470441);
// for each category a near listing (0km) and a far listing (~55km at Sagar).
test('Journey B: 30km filter consistent across all categories', async ({ page }) => {
  const admin = adminClient()
  const NEAR = { lat: 24.205, lon: 78.364 } // Malthon
  const FAR = { lat: 23.8388, lon: 78.7378 } // Sagar (~55km from Malthon)

  const viewer = (
    await admin.from('profiles').insert({
      full_name: 'Journey B Viewer', phone: testPhone(), village_town: 'Malthon',
      pincode: '470441', latitude: NEAR.lat, longitude: NEAR.lon,
      preferred_language: 'en', disclaimer_accepted_at: new Date().toISOString(),
    }).select().single()
  ).data
  const owner = (
    await admin.from('profiles').insert({
      full_name: 'Journey B Owner', phone: testPhone(), village_town: 'Malthon',
      pincode: '470441', latitude: NEAR.lat, longitude: NEAR.lon,
      preferred_language: 'en', disclaimer_accepted_at: new Date().toISOString(),
    }).select().single()
  ).data

  const eqTypes = (await admin.from('equipment_types').select('*')).data
  const detailsFor = (cat) =>
    cat === 'land'
      ? { size_range: '1-2' }
      : cat === 'equipment'
        ? { equipment_type_id: eqTypes[0].id, rental_basis: 'per_day', available_now: true }
        : { worker_count: 3, work_type: 'general' }

  const rows = []
  for (const cat of ['land', 'equipment', 'labor']) {
    for (const [where, pos] of [['near', NEAR], ['far', FAR]]) {
      rows.push({
        user_id: owner.id, listing_type: 'offer', category: cat,
        latitude: pos.lat, longitude: pos.lon, pincode: '470441',
        details: detailsFor(cat), self_declared: cat === 'land',
      })
    }
  }
  await admin.from('listings').insert(rows)

  await loginAs(page, viewer, 'en')
  await page.goto('/browse')
  for (const cat of ['land', 'equipment', 'labor']) {
    await page.getByTestId(`tab-${cat}`).click()
    // Exactly the NEAR one shows; the FAR (~55km) one is filtered out — same for every category.
    await expect(page.getByTestId('listing-card')).toHaveCount(1)
    await expect(page.getByText('0.0 km away')).toBeVisible()
  }
})
