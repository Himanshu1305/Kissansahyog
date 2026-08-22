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
      full_name: 'Labor Tester', phone: testPhone(), village_town: 'Sagar',
      pincode: '470001', latitude: 23.8388, longitude: 78.7378,
      preferred_language: 'en', disclaimer_accepted_at: new Date().toISOString(),
    })
    .select().single()
  if (error) throw new Error(error.message)
  return data
}

test('labor OFFER with blank rate renders cleanly (no undefined)', async ({ page }) => {
  const user = await makeUser()
  await loginAs(page, user)
  await page.goto('/post')
  await page.getByRole('button', { name: 'Offering' }).click()
  await page.getByRole('button', { name: 'Labor' }).click()

  await page.getByLabel('Number of workers').fill('8')
  await page.getByLabel('Type of work').selectOption({ label: 'Harvesting' })
  // Leave rate basis + rate amount blank (optional).

  await page.getByRole('button', { name: 'Submit' }).click()
  await page.getByRole('button', { name: 'View listing' }).click()

  await expect(page.getByText('8 workers')).toBeVisible()
  // No literal "undefined" anywhere on the detail page.
  await expect(page.locator('body')).not.toContainText('undefined')
})

test('labor rejects zero workers', async ({ page }) => {
  const user = await makeUser()
  await loginAs(page, user)
  await page.goto('/post')
  await page.getByRole('button', { name: 'Looking for' }).click()
  await page.getByRole('button', { name: 'Labor' }).click()
  await page.getByLabel('Number of workers').fill('0')
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText(/must be 1 or more/)).toBeVisible()
})

test('labor rejects from-date after to-date', async ({ page }) => {
  const user = await makeUser()
  await loginAs(page, user)
  await page.goto('/post')
  await page.getByRole('button', { name: 'Offering' }).click()
  await page.getByRole('button', { name: 'Labor' }).click()
  await page.getByLabel('Number of workers').fill('3')
  await page.getByLabel('From date').fill('2026-10-20')
  await page.getByLabel('To date').fill('2026-10-01')
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText(/cannot be after/)).toBeVisible()
})
