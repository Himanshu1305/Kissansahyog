import { test, expect } from '@playwright/test'
import { adminClient, testPhone } from './support.js'

// Batch 1 — the new marketplace basics:
//  • item 3  : all 10 Browse category chips fit the viewport (no hidden h-scroll) at
//              375×812 and 1280×800.
//  • item 3A : public browsing (no login to look); the phone stays behind login and a
//              Call tap round-trips through /login?next= back to the SAME listing.
//  • item 5  : the 3-step post flow (What? → Details → Location+confirm) posts an offer
//              and a requirement.
// Test data uses the reserved 90000… phone range and is cleaned up in global-teardown.

const NEAR = { latitude: 24.045, longitude: 78.33 } // Sagar/Khurai default centre

async function loginSession(page, profile) {
  await page.addInitScript(
    ([p]) => {
      localStorage.setItem('ks_session_v1', JSON.stringify(p))
      localStorage.setItem('ks_lang_v1', 'en')
      localStorage.setItem('ks_buyer_agreed_v1', '1') // skip the one-time buyer gate in UI tests
    },
    [profile],
  )
}

async function makeUser(extra = {}) {
  const admin = adminClient()
  const { data, error } = await admin
    .from('profiles')
    .insert({
      full_name: extra.full_name || 'Batch1 Tester',
      phone: extra.phone || testPhone(),
      village_town: 'Khurai', pincode: '470117',
      latitude: NEAR.latitude, longitude: NEAR.longitude,
      preferred_language: 'en', disclaimer_accepted_at: new Date().toISOString(),
    })
    .select().single()
  if (error) throw new Error(error.message)
  return data
}

// ---- item 3: category chips fit the viewport, both sizes ----
for (const vp of [{ w: 375, h: 812 }, { w: 1280, h: 800 }]) {
  test(`browse: all 10 category chips inside the ${vp.w}×${vp.h} viewport, no h-scroll`, async ({ page }) => {
    await page.setViewportSize({ width: vp.w, height: vp.h })
    await page.goto('/browse') // public — no login
    const chips = page.locator('[data-testid^="chip-"]')
    await expect(chips).toHaveCount(10)
    // The chips wrap — their container must not scroll horizontally.
    const cont = page.getByTestId('browse-cats')
    const contScroll = await cont.evaluate((el) => el.scrollWidth - el.clientWidth)
    expect(contScroll).toBeLessThanOrEqual(1)
    // Every one of the 10 chips is inside the viewport (visible, not off-screen).
    for (let i = 0; i < 10; i++) {
      await expect(chips.nth(i)).toBeInViewport()
      const box = await chips.nth(i).boundingBox()
      expect(box.x + box.width).toBeLessThanOrEqual(vp.w + 1)
    }
    // No horizontal page scroll either.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
}

// ---- item 3A: public browse → Call → login → back on the same listing → reveal ----
test('logged out: browse equipment, Call asks for login and returns to the same listing', async ({ page }) => {
  const owner = await makeUser({ full_name: 'Owner Seller' })
  const admin = adminClient()
  const { data: types } = await admin.from('equipment_types').select('id').neq('name_en', 'Water tanker').limit(1)
  const { data: listing } = await admin.from('listings').insert({
    user_id: owner.id, listing_type: 'offer', category: 'equipment',
    latitude: NEAR.latitude, longitude: NEAR.longitude, pincode: '470117', village_name: 'Khurai',
    details: { equipment_type_id: types[0].id, rental_basis: 'per_day', rate_amount: '500', available_now: true },
    self_declared: false,
  }).select().single()

  // A viewer who will log in (different from the owner, so contact buttons show).
  const viewer = await makeUser({ full_name: 'Buyer Viewer' })

  // Keep the UI in English for stable label lookups (no session yet).
  await page.addInitScript(() => localStorage.setItem('ks_lang_v1', 'en'))

  // Logged OUT: open the listing directly and tap Call → routed to login with return path.
  await page.goto(`/listing/${listing.id}`)
  await page.getByTestId('contact-call').first().click()
  await page.waitForURL(/\/login/)
  expect(page.url()).toContain('next=')
  expect(decodeURIComponent(page.url())).toContain(`/listing/${listing.id}`)

  // Log in by phone (trust-based MVP). Returns to the SAME listing.
  await page.getByLabel('Mobile number').fill(viewer.phone)
  await page.getByRole('button', { name: 'Log in' }).click()
  await page.waitForURL(new RegExp(`/listing/${listing.id}`))

  // Now Call reveals the owner's number in the contact sheet.
  await page.getByTestId('contact-call').first().click()
  await expect(page.getByTestId('contact-sheet')).toBeVisible()
  await expect(page.getByText(owner.phone)).toBeVisible()
})

// ---- item 5: the 3-step post flow ----
async function postStep1(page, { type, category }) {
  await page.goto('/post')
  await page.getByTestId(`post-type-${type}`).click()
  await page.getByTestId(`post-cat-${category}`).click()
  await page.getByTestId('post-next').click() // → step 2 (Details)
}

test('post flow (3 steps): land OFFER end to end', async ({ page }) => {
  const user = await makeUser()
  await loginSession(page, user)

  await postStep1(page, { type: 'offer', category: 'land' })
  await page.locator('#f_size_acres').waitFor({ timeout: 8000 })
  await page.locator('#f_size_acres').fill('3')
  await page.locator('#f_price_type').selectOption('negotiable')
  await page.getByTestId('post-next').click() // → step 3 (Location + confirm)

  await page.locator('#f_asset_village').fill('Khurai')
  const submit = page.getByTestId('post-submit')
  await expect(submit).toBeDisabled() // the single confirm checkbox gates submit
  await page.getByTestId('rules-agree-checkbox').check()
  await expect(submit).toBeEnabled()
  await submit.click()

  await page.getByRole('button', { name: 'View listing' }).click()
  await expect(page).toHaveURL(/\/listing\//)
})

test('post flow (3 steps): labor REQUIREMENT end to end', async ({ page }) => {
  const user = await makeUser()
  await loginSession(page, user)

  await postStep1(page, { type: 'requirement', category: 'labor' })
  await page.locator('#f_worker_count').waitFor({ timeout: 8000 })
  await page.locator('#f_worker_count').fill('3')
  await page.getByTestId('post-next').click()

  await page.locator('#f_asset_village').fill('Khurai')
  await page.getByTestId('rules-agree-checkbox').check()
  await page.getByTestId('post-submit').click()
  await expect(page.getByRole('button', { name: 'View listing' })).toBeVisible()
})
