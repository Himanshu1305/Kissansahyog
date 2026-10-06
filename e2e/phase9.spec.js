import { test, expect } from '@playwright/test'
import { adminClient, testPhone, postStep1 } from './support.js'

// Phase 9: whole-system journeys, not isolated units. REWRITTEN (legacy-cleanup):
// registration moved to /welcome→/signup; the post flow gained a source step; the Land
// form is numeric (#f_size_acres) + required #f_price_type; every form has the mandatory
// rules checkbox; the asset location is a VILLAGE name (#f_asset_village) — Journey A uses
// "Deori" (a seeded Sagar village that resolves to the viewer's own Deori coordinates, so
// the posts land 0 km away); browse tabs are chips (chip-<cat>) and the distance label is
// integer km ("0 km away").

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
  await page.goto('/welcome')
  await page.getByRole('button', { name: 'English' }).click()
  await page.getByRole('button', { name: 'Create new account' }).click()
  await page.getByPlaceholder('e.g. Ramprasad Patel').fill('Journey A')
  await page.getByPlaceholder('10-digit number').fill(phone)
  await page.getByPlaceholder('6-digit pincode').fill('470226') // Deori
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Accept and continue' }).click()
  await expect(page).toHaveURL(/\/home$/)

  // Post Land Offer (3-step flow)
  await postStep1(page, 'offer', 'land')
  await page.locator('#f_size_acres').waitFor({ timeout: 8000 })
  await page.locator('#f_size_acres').fill('3')
  await page.locator('#f_price_type').selectOption('negotiable')
  await page.getByTestId('post-next').click()
  await page.locator('#f_asset_village').fill('Deori')
  await page.getByTestId('rules-agree-checkbox').check() // single confirm = rules + ownership
  await page.getByTestId('post-submit').click()
  await expect(page.getByRole('button', { name: 'View listing' })).toBeVisible()

  // Post Equipment Requirement (3-step flow)
  await postStep1(page, 'requirement', 'equipment')
  await page.locator('#f_equipment_type_id').waitFor({ timeout: 8000 })
  await page.getByLabel('Equipment type').selectOption({ label: 'Tractor' })
  await page.getByTestId('post-next').click()
  await page.locator('#f_asset_village').fill('Deori')
  await page.getByTestId('rules-agree-checkbox').check()
  await page.getByTestId('post-submit').click()
  await expect(page.getByRole('button', { name: 'View listing' })).toBeVisible()

  // Post Labor Offer (3-step flow)
  await postStep1(page, 'offer', 'labor')
  await page.getByLabel('Number of workers').waitFor({ timeout: 8000 })
  await page.getByLabel('Number of workers').fill('5')
  await page.getByTestId('post-next').click()
  await page.locator('#f_asset_village').fill('Deori')
  await page.getByTestId('rules-agree-checkbox').check()
  await page.getByTestId('post-submit').click()
  await expect(page.getByRole('button', { name: 'View listing' })).toBeVisible()

  // My Listings shows all three.
  await page.goto('/my')
  await expect(page.getByTestId('listing-card')).toHaveCount(3)

  // All three appear in browse. Deori's 30 km radius also contains some permanent dummy
  // seed listings (added in migration 0014, after this test was first written), so assert
  // the posted ones are PRESENT and track per-category counts rather than an absolute 1.
  // Deep-link each category (?cat=) for a clean single load — avoids the chip-transition
  // render race that a rapid click-through would hit.
  const before = {}
  for (const cat of ['land', 'equipment', 'labor']) {
    await page.goto(`/browse?cat=${cat}`)
    await expect(page.getByTestId('listing-card').first()).toBeVisible()
    before[cat] = await page.getByTestId('listing-card').count()
  }

  // Close the Labor listing from My Listings.
  await page.goto('/my')
  page.on('dialog', (d) => d.accept())
  await page.locator('[data-testid="mark-found"][data-category="labor"]').click()
  await expect(page.getByText('Found ✓')).toBeVisible()

  // Labor drops by exactly one in browse (the closed one leaves); Land is unchanged.
  await page.goto('/browse?cat=labor')
  await expect(page.getByTestId('listing-card')).toHaveCount(before.labor - 1)
  await page.goto('/browse?cat=land')
  await expect(page.getByTestId('listing-card')).toHaveCount(before.land)
})

// Journey B — distance filtering is consistent across ALL THREE categories
// (the shared logic wasn't forked during Phases 4-5). The viewer sits at an ISOLATED
// remote coordinate (no Sagar seed data within 30 km, so the counts stay clean); for
// each category a near listing (0km) and a far listing (~55km) are seeded.
test('Journey B: 30km filter consistent across all categories', async ({ page }) => {
  const admin = adminClient()
  const NEAR = { lat: 18.9, lon: 73.5 } // isolated — no other test/seed data within 30 km
  const FAR = { lat: 19.4, lon: 73.5 } // ~55 km north of NEAR (beyond the 50 km fallback ring)

  const viewer = (
    await admin.from('profiles').insert({
      full_name: 'Journey B Viewer', phone: testPhone(), village_town: 'Remote B',
      pincode: '470441', latitude: NEAR.lat, longitude: NEAR.lon,
      preferred_language: 'en', disclaimer_accepted_at: new Date().toISOString(),
    }).select().single()
  ).data
  const owner = (
    await admin.from('profiles').insert({
      full_name: 'Journey B Owner', phone: testPhone(), village_town: 'Remote B',
      pincode: '470441', latitude: NEAR.lat, longitude: NEAR.lon,
      preferred_language: 'en', disclaimer_accepted_at: new Date().toISOString(),
    }).select().single()
  ).data

  const eqTypes = (await admin.from('equipment_types').select('*')).data
  const detailsFor = (cat) =>
    cat === 'land'
      ? { size_acres: 2, price_type: 'negotiable' }
      : cat === 'equipment'
        ? { equipment_type_id: eqTypes[0].id, rental_basis: 'per_day', rate_amount: '400', available_now: true }
        : { worker_count: 3, work_type: 'general' }

  const rows = []
  for (const cat of ['land', 'equipment', 'labor']) {
    for (const [where, pos] of [['near', NEAR], ['far', FAR]]) {
      rows.push({
        user_id: owner.id, listing_type: 'offer', category: cat,
        latitude: pos.lat, longitude: pos.lon, pincode: '470441', village_name: 'Malthon',
        details: detailsFor(cat), self_declared: cat === 'land',
      })
    }
  }
  await admin.from('listings').insert(rows)

  await loginAs(page, viewer, 'en')
  for (const cat of ['land', 'equipment', 'labor']) {
    // Deep-link each category for a clean single load (avoids the chip-transition race).
    await page.goto(`/browse?cat=${cat}`)
    // Among the distance-ranked RESULTS, exactly the NEAR one shows (0 km) and the FAR
    // (~55 km) one is filtered out — same for every category. (The "Most viewed" box is
    // global-within-category and carries no distance label, so count by that label.)
    await expect(page.getByTestId('listing-card').first()).toBeVisible()
    await expect(page.getByText(/0 km away/)).toHaveCount(1)
  }
})
