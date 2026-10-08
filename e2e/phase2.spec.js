import { test, expect } from '@playwright/test'
import { testPhone, adminClient } from './support.js'

// REWRITTEN (legacy-cleanup): the registration/login flow moved off `/` (now the
// public Homepage) to `/welcome` → `/signup` / `/login`. The Welcome screen keeps
// the "नया खाता बनाएं / Create new account" CTA + a हिंदी/English language choice;
// the हिं/EN pill in the app chrome is the LanguageToggle. Field placeholders and
// the error copy are unchanged, so only the entry points/selectors are updated here.

// Land on Welcome and switch the UI to English, then open the signup form.
async function openSignupInEnglish(page) {
  await page.goto('/welcome')
  await page.getByRole('button', { name: 'English' }).click()
  await page.getByRole('button', { name: 'Create new account' }).click()
}

test('welcome defaults to Hindi and toggles to English', async ({ page }) => {
  await page.goto('/welcome')
  // Hindi default: the signup CTA reads in Hindi.
  await expect(page.getByRole('button', { name: 'नया खाता बनाएं' })).toBeVisible()
  await page.getByRole('button', { name: 'English' }).click()
  await expect(page.getByRole('button', { name: 'Create new account' })).toBeVisible()
})

test('signup happy path reaches home', async ({ page }) => {
  const phone = testPhone()
  await openSignupInEnglish(page)

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
  // The name shows in the nav (hidden on mobile) and the greeting — assert the greeting.
  await expect(page.locator('main').getByText('Playwright Kisan')).toBeVisible()
})

test('client-side rejects malformed phone before disclaimer', async ({ page }) => {
  await openSignupInEnglish(page)
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
  await openSignupInEnglish(page)
  await page.getByPlaceholder('e.g. Ramprasad Patel').fill('Bad Pin')
  await page.getByPlaceholder('10-digit number').fill(phone)
  await page.getByPlaceholder('6-digit pincode').fill('999999')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Accept and continue' }).click()

  // Batch 4 item B reworded err_pincode_not_found EN → "We couldn't find this pincode…".
  await expect(page.getByText(/couldn.t find this pincode/i)).toBeVisible()
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

  await openSignupInEnglish(page)
  await page.getByPlaceholder('e.g. Ramprasad Patel').fill('Duplicate')
  await page.getByPlaceholder('10-digit number').fill(phone)
  await page.getByPlaceholder('6-digit pincode').fill('470001')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Accept and continue' }).click()

  await expect(page.getByText('already exists')).toBeVisible()
})

test('login with unknown phone shows not-found path', async ({ page }) => {
  await page.goto('/welcome')
  await page.getByRole('button', { name: 'English' }).click()
  await page.getByRole('button', { name: 'I already have an account — Log in' }).click()
  await page.getByPlaceholder('10-digit number').fill('9000099998')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByText('No account found')).toBeVisible()
  await expect(page).not.toHaveURL(/\/home$/)
})

test('language persists across logout/login', async ({ page }) => {
  const phone = testPhone()
  // Sign up with English UI selected.
  await openSignupInEnglish(page)
  await page.getByPlaceholder('e.g. Ramprasad Patel').fill('Lang Persist')
  await page.getByPlaceholder('10-digit number').fill(phone)
  await page.getByPlaceholder('6-digit pincode').fill('470001')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Accept and continue' }).click()
  await expect(page).toHaveURL(/\/home$/)

  // Log out (returns to the public homepage), then log back in — UI returns in
  // English (persisted to the profile via set_language).
  await page.getByRole('button', { name: 'Log out' }).click()
  await page.goto('/login')
  await page.getByPlaceholder('10-digit number').fill(phone)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible()
})
