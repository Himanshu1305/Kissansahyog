// Batch 5A E2E — run only after the owner applies migration 0053 and deploys.
// Do not run this in a shared database before that point.
import { test, expect } from '@playwright/test'
import { adminClient, testPhone, postStep1 } from './support.js'

async function loginAs(page, profile) {
  await page.addInitScript(([p]) => {
    localStorage.setItem('ks_session_v1', JSON.stringify(p))
    localStorage.setItem('ks_lang_v1', 'en')
  }, [profile])
}

async function makeUser() {
  const { data, error } = await adminClient().from('profiles').insert({
    full_name: 'Batch5A Tester', phone: testPhone(), village_town: 'Khurai',
    pincode: '470117', latitude: 24.045, longitude: 78.33,
    preferred_language: 'en', disclaimer_accepted_at: new Date().toISOString(),
  }).select().single()
  if (error) throw new Error(error.message)
  return data
}

test('posts building materials and displays the seller responsibility note', async ({ page }) => {
  const user = await makeUser()
  await loginAs(page, user)
  await postStep1(page, 'offer', 'building_materials')
  await page.getByLabel('Material type').selectOption('cement')
  await page.getByLabel('Quantity').fill('20')
  await page.getByLabel('Unit').selectOption('bag')
  await page.getByLabel('Your rate').fill('500')
  await page.getByLabel('Delivery available?').selectOption('yes')
  await page.getByLabel('Pickup location').fill('Khurai')
  await expect(page.getByText('Seller is responsible for selling with the required permissions.')).toBeVisible()
  await page.getByTestId('post-next').click()
  await page.locator('#f_asset_village').fill('Khurai')
  await page.getByTestId('rules-agree-checkbox').check()
  await page.getByTestId('post-submit').click()
  await page.getByRole('button', { name: 'View listing' }).click()
  await expect(page.getByText('Seller is responsible for selling with the required permissions.')).toBeVisible()
})

for (const tag of ['Vegetable farming equipment', 'Rare or emergency equipment']) {
  test(`posts and filters equipment tagged ${tag}`, async ({ page }) => {
    const user = await makeUser()
    await loginAs(page, user)
    await postStep1(page, 'offer', 'equipment')
    await page.getByLabel('Equipment type').selectOption({ index: 1 })
    await page.getByLabel('Rental amount').fill('500')
    await page.getByRole('button', { name: tag }).click()
    await page.getByTestId('post-next').click()
    await page.locator('#f_asset_village').fill('Khurai')
    await page.getByTestId('rules-agree-checkbox').check()
    await page.getByTestId('post-submit').click()
    await page.getByRole('button', { name: 'View listing' }).click()
    await expect(page.getByText(tag)).toBeVisible()
    await page.goto('/browse?cat=equipment')
    await page.getByRole('button', { name: tag }).last().click()
    await expect(page.getByTestId('equipment-tag-filters')).toBeVisible()
  })
}

test('opens both Batch 5A Bazaar landing pages', async ({ page }) => {
  for (const path of ['/bazaar/building-materials', '/bazaar/vegetable-equipment']) {
    await page.goto(path)
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByTestId('bazaar-btn-search')).toBeVisible()
  }
})
