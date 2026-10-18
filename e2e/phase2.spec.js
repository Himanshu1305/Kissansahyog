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

// Batch 10A Task E: signup is ONE page — name, mobile, village/town (places list, no pincode), one
// "show my details" checkbox, the acknowledgment checkbox and Register (label "Accept and continue").
// No language dropdown (the active app language is used), no farmer block.
// Batch 10E Phase 3A: NO e-mail and NO password on the sign-up form any more (founder decision);
// registration goes through app_register_phone. More in e2e/signup-phone-10e.spec.js.
async function fillSignup(page, { name, phone }) {
  await expect(page.locator('#email')).toHaveCount(0)
  await expect(page.locator('#password')).toHaveCount(0)
  await page.getByPlaceholder('e.g. Ramprasad Patel').fill(name)
  await page.getByPlaceholder('10-digit number').fill(phone)
  await page.getByTestId('place-input').fill('Khur')
  await page.getByTestId('place-suggestions').getByRole('button').first().click()
  await expect(page.getByTestId('place-chosen')).toBeVisible()
}
const registerBtn = (page) => page.getByRole('button', { name: 'Accept and continue' })
async function acceptAndRegister(page) {
  await page.getByTestId('disclaimer-accept').check()
  await registerBtn(page).click()
}

test('signup happy path reaches home', async ({ page }) => {
  const phone = testPhone()
  await openSignupInEnglish(page)
  await expect(page.locator('#language')).toHaveCount(0)
  await fillSignup(page, { name: 'Playwright Kisan', phone })

  // Register is refused with the existing message until the acknowledgment is ticked.
  await registerBtn(page).click()
  await expect(page.getByTestId('signup-error')).toContainText('You must accept the notice to continue.')
  await expect(page).toHaveURL(/\/signup/)
  await acceptAndRegister(page)

  await expect(page).toHaveURL(/\/home$/)
  // The name shows in the nav (hidden on mobile) and the greeting — assert the greeting.
  await expect(page.locator('main').getByText('Playwright Kisan')).toBeVisible()
})

test('client-side rejects malformed phone before registering', async ({ page }) => {
  await openSignupInEnglish(page)
  await fillSignup(page, { name: 'Bad Phone', phone: '123' })
  await acceptAndRegister(page)

  // Stays on the form, shows a field error.
  await expect(page.getByTestId('signup-form')).toBeVisible()
  await expect(page.getByText('valid 10-digit mobile number')).toBeVisible()
  await expect(page).not.toHaveURL(/\/home$/)
})

// Batch 10A Task E: replaces "unknown pincode" (signup has no pincode since Batch 7L-2).
test('Register without the acknowledgment ticked is refused; visibility untick warns', async ({ page }) => {
  await openSignupInEnglish(page)
  await fillSignup(page, { name: 'No Accept', phone: testPhone() })
  // "Keep hidden" = untick the one visibility checkbox (old visibility-hidden button).
  await page.getByTestId('visibility-show').uncheck()
  await expect(page.getByTestId('visibility-choice')).toHaveAttribute('data-choice', 'hidden')
  await expect(page.getByTestId('visibility-warning')).toBeVisible()
  await registerBtn(page).click()
  await expect(page.getByTestId('signup-error')).toContainText('You must accept the notice to continue.')
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
  await fillSignup(page, { name: 'Duplicate', phone })
  await acceptAndRegister(page)

  await expect(page.getByText('already exists').first()).toBeVisible()
})

test('login with unknown phone shows not-found path', async ({ page }) => {
  await page.goto('/welcome')
  await page.getByRole('button', { name: 'English' }).click()
  await page.getByRole('button', { name: 'I already have an account — Log in' }).click()
  await page.getByPlaceholder('10-digit number').fill('9000099998')
  await page.getByTestId('login-phone-submit').click() // 10E 3A: two "Log in" buttons (e-mail + mobile) since 7L-2
  await expect(page.getByText('No account found')).toBeVisible()
  await expect(page).not.toHaveURL(/\/home$/)
})

test('language persists across logout/login', async ({ page }) => {
  const phone = testPhone()
  // Sign up with English UI selected.
  await openSignupInEnglish(page)
  await fillSignup(page, { name: 'Lang Persist', phone })
  await acceptAndRegister(page)
  await expect(page).toHaveURL(/\/home$/)

  // Log out (returns to the public homepage), then log back in — UI returns in
  // English (persisted to the profile via set_language).
  await page.getByRole('button', { name: 'Log out' }).click()
  await page.goto('/login')
  await page.getByPlaceholder('10-digit number').fill(phone)
  await page.getByTestId('login-phone-submit').click() // 10E 3A: two "Log in" buttons (e-mail + mobile) since 7L-2
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible()
})
