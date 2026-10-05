// Phase 7b — PERMANENT E2E for the Transport / logistics category.
// Positive: a transport listing ≤30km appears. Negative: one ~55km away is filtered
// (no wrong fallback). Edge: the rendered category strip matches the real enabled total
// (Land still LAST) so the 10th category didn't leave a stale count anywhere.
import { test, expect } from '@playwright/test'
import { adminClient, testPhone } from './support.js'

async function loginAs(page, profile) {
  await page.addInitScript(([p]) => {
    localStorage.setItem('ks_session_v1', JSON.stringify(p))
    localStorage.setItem('ks_lang_v1', 'en')
  }, [profile])
}
async function makeUser(lat, lon) {
  const admin = adminClient()
  const { data, error } = await admin.from('profiles').insert({
    full_name: 'Transport Tester', phone: testPhone(), village_town: 'Remote T',
    pincode: '470117', latitude: lat, longitude: lon,
    preferred_language: 'en', disclaimer_accepted_at: new Date().toISOString(),
  }).select().single()
  if (error) throw new Error(error.message)
  return data
}

test('Transport is a full browse category — chip present, Land still last, no stale count', async ({ page }) => {
  const user = await makeUser(18.9, 73.5)
  await loginAs(page, user)
  await page.goto('/browse')
  await expect(page.getByTestId('chip-transport')).toBeVisible()
  // The strip renders exactly the enabled categories, in order, Land LAST.
  const chips = page.locator('[data-testid^="chip-"]')
  await expect(chips).toHaveCount(10) // +greenhouse (P7) +jugaad (P9): equipment,labor,drone_didi,bhusa,agri_inputs,warehouse,greenhouse,jugaad,transport,land
  await expect(chips.last()).toHaveAttribute('data-testid', 'chip-land')
  await expect(chips.nth(8)).toHaveAttribute('data-testid', 'chip-transport')
})

test('Transport listing appears within 30km and is filtered beyond 50km', async ({ page }) => {
  const admin = adminClient()
  const NEAR = { lat: 18.9, lon: 73.5 } // isolated — no other data within 30km
  const FAR = { lat: 19.4, lon: 73.5 } // ~55km north
  const viewer = await makeUser(NEAR.lat, NEAR.lon)
  const owner = await makeUser(NEAR.lat, NEAR.lon)
  const row = (pos) => ({
    user_id: owner.id, listing_type: 'offer', category: 'transport',
    latitude: pos.lat, longitude: pos.lon, pincode: '470117', village_name: 'Remote T',
    details: { vehicle_type: 'truck', capacity: '10 टन', rate_basis: 'per_km', rate_amount: '₹35/किमी' },
    self_declared: false,
  })
  await admin.from('listings').insert([row(NEAR), row(FAR)])

  await loginAs(page, viewer)
  await page.goto('/browse?cat=transport')
  // Exactly the near (0 km) one shows; the ~55km one is filtered out (no wrong fallback).
  await expect(page.getByTestId('listing-card')).toHaveCount(1)
  await expect(page.getByText('0 km away')).toBeVisible()
  // The card renders transport detail (truck), proving the category module is wired.
  await expect(page.getByTestId('listing-card').first()).toContainText(/Truck|ट्रक/)
})
