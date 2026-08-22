import { test, expect } from '@playwright/test'
import { testPhone, adminClient } from './support.js'

// Helper: land on Welcome and switch UI to English for stable selectors.
async function openInEnglish(page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'English' }).click()
}

test('welcome defaults to Hindi and toggles to English', async ({ page }) => {
  await page.goto('/')
  // Hindi default: the signup CTA reads in Hindi.
  await expect(page.getByRole('button', { name: 'नया खाता बनाएं' })).toBeVisible()
  await page.getByRole('button', { name: 'English' }).click()
  await expect(page.getByRole('button', { name: 'Create new account' })).toBeVisible()
})

test('signup happy path reaches home', async ({ page }) => {
  const phone = testPhone()
  await openInEnglish(page)
  await page.getByRole('button', { name: 'Create new account' }).click()

  await page.getByPlaceholder('e.g. Ramprasad Patel').fill('Playwright Kisan')
  await page.getByPlaceholder('10-digit number').fill(phone)
  await page.getByPlaceholder('6-digit pincode').fill('470001')
  await page.getByRole('button', { name: 'Continue' }).click()

  // Disclaimer step: accept button disabled until checkbox ticked.
  const accept = page.getByRole('button', { name: 'Accept and continue' })
  await expect(accept).toBeDisabled()
  await page.getByRole('checkbox').check()
  await expect(accept).toBeEnabled()
  await accept.click()

  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByText('Playwright Kisan')).toBeVisible()
})

test('client-side rejects malformed phone before disclaimer', async ({ page }) => {
  await openInEnglish(page)
  await page.getByRole('button', { name: 'Create new account' }).click()
  await page.getByPlaceholder('e.g. Ramprasad Patel').fill('Bad Phone')
  await page.getByPlaceholder('10-digit number').fill('123')
  await page.getByPlaceholder('6-digit pincode').fill('470001')
  await page.getByRole('button', { name: 'Continue' }).click()

  // Stays on the form (no disclaimer), shows a field error.
  await expect(page.getByRole('button', { name: 'Accept and continue' })).toHaveCount(0)
  await expect(page.getByText('valid 10-digit mobile number')).toBeVisible()
})

test('unknown pincode is handled gracefully', async ({ page }) => {
  const phone = testPhone()
  await openInEnglish(page)
  await page.getByRole('button', { name: 'Create new account' }).click()
  await page.getByPlaceholder('e.g. Ramprasad Patel').fill('Bad Pin')
  await page.getByPlaceholder('10-digit number').fill(phone)
  await page.getByPlaceholder('6-digit pincode').fill('999999')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Accept and continue' }).click()

  await expect(page.getByText('was not recognised')).toBeVisible()
  await expect(page).not.toHaveURL(/\/home$/)
})

test('duplicate phone is rejected with a clear message', async ({ page }) => {
  const phone = testPhone()
  // Pre-create the account directly.
  const admin = adminClient()
  await admin.from('profiles').insert({
    full_name: 'Existing User',
    phone,
    pincode: '470001',
    latitude: 23.8388,
    longitude: 78.7378,
    disclaimer_accepted_at: new Date().toISOString(),
  })

  await openInEnglish(page)
  await page.getByRole('button', { name: 'Create new account' }).click()
  await page.getByPlaceholder('e.g. Ramprasad Patel').fill('Duplicate')
  await page.getByPlaceholder('10-digit number').fill(phone)
  await page.getByPlaceholder('6-digit pincode').fill('470001')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Accept and continue' }).click()

  await expect(page.getByText('already exists')).toBeVisible()
})

test('login with unknown phone shows not-found path', async ({ page }) => {
  await openInEnglish(page)
  await page.getByRole('button', { name: 'I already have an account — Log in' }).click()
  await page.getByPlaceholder('10-digit number').fill('9000099998')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByText('No account found')).toBeVisible()
  await expect(page).not.toHaveURL(/\/home$/)
})

test('language persists across logout/login', async ({ page }) => {
  const phone = testPhone()
  // Sign up with English UI selected.
  await openInEnglish(page)
  await page.getByRole('button', { name: 'Create new account' }).click()
  await page.getByPlaceholder('e.g. Ramprasad Patel').fill('Lang Persist')
  await page.getByPlaceholder('10-digit number').fill(phone)
  await page.getByPlaceholder('6-digit pincode').fill('470001')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Accept and continue' }).click()
  await expect(page).toHaveURL(/\/home$/)

  // Log out, then log back in — UI should return in English (from profile).
  await page.getByRole('button', { name: 'Log out' }).click()
  await page.getByRole('button', { name: 'I already have an account — Log in' }).click()
  await page.getByPlaceholder('10-digit number').fill(phone)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible()
})
