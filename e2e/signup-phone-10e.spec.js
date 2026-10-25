import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { testPhone, adminClient, anonClient } from './support.js'

// Batch 10E Phase 3A — sign-up WITHOUT e-mail (founder decision: the e-mail + password fields are
// not on the sign-up form; registration goes through public.app_register_phone, migration 0064).
// Runs against STAGING. Test users: names start with "KSTEST", phones in the reserved 90000xxxxx
// range (removed by the global teardown, e-mail test users too — see cleanupTestData).

const SESSION_KEY = 'ks_session_v1'
const english = async (page) => page.addInitScript(() => localStorage.setItem('ks_lang_v1', 'en'))
const session = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), SESSION_KEY)

async function fillPhoneSignup(page, { name, phone, place = 'Khur' }) {
  await page.locator('#full_name').fill(name)
  await page.locator('#phone').fill(phone)
  await page.getByTestId('place-input').fill(place)
  await page.getByTestId('place-suggestions').getByRole('button').first().click()
  await expect(page.getByTestId('place-chosen')).toBeVisible()
  await page.getByTestId('disclaimer-accept').check()
}

test.describe('10E 3A: sign-up and sign-in with no e-mail', () => {
  test('sign-up form has name + mobile + town and NO e-mail / password (Hindi, default language)', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByTestId('signup-form')).toBeVisible()
    await expect(page.locator('#full_name')).toBeVisible()
    await expect(page.locator('#phone')).toBeVisible()
    await expect(page.getByTestId('place-input')).toBeVisible()
    await expect(page.getByTestId('visibility-show')).toBeChecked()
    await expect(page.getByTestId('disclaimer-accept')).toBeVisible()
    await expect(page.locator('#email')).toHaveCount(0)
    await expect(page.locator('#password')).toHaveCount(0)
    await expect(page.locator('input[type="email"], input[type="password"]')).toHaveCount(0)
    await expect(page.getByTestId('signup-form')).not.toContainText('ईमेल')
    await expect(page.getByTestId('signup-form')).not.toContainText('पासवर्ड')
  })

  test('phone-only sign-up → logged in → profile → log out → mobile login works', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    const rpcCalls = []
    page.on('request', (r) => { const m = r.url().match(/\/rest\/v1\/rpc\/([a-z_]+)/); if (m) rpcCalls.push(m[1]) })
    await english(page)
    const phone = testPhone()
    await page.goto('/signup')
    await fillPhoneSignup(page, { name: 'KSTEST Phone Only', phone })
    await page.getByRole('button', { name: 'Accept and continue' }).click()
    await expect(page).toHaveURL(/\/home$/)
    await expect(page.locator('main').getByText('KSTEST Phone Only')).toBeVisible()
    expect(rpcCalls).toContain('app_register_phone')
    expect(rpcCalls).not.toContain('app_register')

    // Same local session a mobile login creates (the profile row), with no e-mail.
    const s = await session(page)
    expect(s?.id).toBeTruthy()
    expect(s.phone).toBe(phone)
    expect(s.email).toBeNull()
    expect(s.auth_provider).toBe('phone')

    // Server side: a phone-only profile, visibility "show", acknowledgment time set, never admin.
    const { data: row } = await adminClient().from('profiles').select('email, auth_uid, auth_provider, is_admin, village_town, latitude, consents, disclaimer_accepted_at, preferred_language').eq('phone', phone).single()
    expect(row.email).toBeNull()
    expect(row.auth_uid).toBeNull()
    expect(row.auth_provider).toBe('phone')
    expect(row.is_admin).toBe(false)
    expect(row.village_town).toBeTruthy()
    expect(row.latitude).not.toBeNull()
    expect(row.disclaimer_accepted_at).toBeTruthy()
    expect(row.consents?.details_visibility?.choice).toBe('show')
    expect(row.preferred_language).toBe('en')

    // Profile: shows the mobile number, no e-mail row, no password section, no crash.
    await page.goto('/profile')
    await expect(page.locator('#pf_phone')).toHaveValue(phone)
    await expect(page.locator('#pf_email')).toHaveCount(0)
    await expect(page.locator('input[type="password"]')).toHaveCount(0)
    await expect(page.locator('#pf_name')).toHaveValue('KSTEST Phone Only')

    // Log out, then sign in with the mobile number alone.
    await page.goto('/home')
    await page.getByRole('button', { name: 'Log out' }).click()
    await expect.poll(() => session(page)).toBeNull()
    await page.goto('/login')
    await expect(page.getByTestId('login-no-email')).toHaveText(/No email\? Log in with your mobile number/)
    await page.getByTestId('login-no-email').click()
    await expect(page.locator('#phone')).toBeFocused()
    await page.locator('#phone').fill(phone)
    await page.getByTestId('login-phone-submit').click()
    await expect(page).toHaveURL(/\/home$/)
    expect((await session(page))?.phone).toBe(phone)
    expect(errors).toEqual([])
  })

  test('duplicate mobile is refused with the existing "already registered" message', async ({ page }) => {
    await english(page)
    const phone = testPhone()
    const { error } = await anonClient().rpc('app_register_phone', {
      p_full_name: 'KSTEST Existing', p_phone: phone, p_village_town: 'Khurai', p_latitude: null, p_longitude: null,
      p_language: 'en', p_disclaimer_accepted: true, p_show_details: true,
    })
    expect(error).toBeNull()
    await page.goto('/signup')
    await fillPhoneSignup(page, { name: 'KSTEST Duplicate', phone })
    await page.getByRole('button', { name: 'Accept and continue' }).click()
    await expect(page.getByTestId('signup-error')).toContainText('An account with this number already exists. Please log in.')
    await expect(page.getByTestId('signup-form')).toContainText('An account with this number already exists')
    await expect(page).toHaveURL(/\/signup/)
    expect(await session(page)).toBeNull()
  })

  test('garbage input is refused in the form (nothing is sent) and by the server', async ({ page }) => {
    await english(page)
    const sent = []
    page.on('request', (r) => { if (/rpc\/app_register/.test(r.url())) sent.push(r.url()) })
    await page.goto('/signup')
    await page.locator('#full_name').fill('   ')
    await page.locator('#phone').fill('12ab')
    await page.getByRole('button', { name: 'Accept and continue' }).click()
    await expect(page.getByTestId('signup-error')).toContainText('You must accept the notice to continue.')
    await expect(page.getByTestId('signup-form')).toContainText('valid 10-digit mobile number')
    await expect(page).toHaveURL(/\/signup/)
    expect(sent).toEqual([])

    // The server refuses the same garbage on its own (someone calling the API directly).
    const call = (over) => anonClient().rpc('app_register_phone', {
      p_full_name: 'KSTEST Garbage', p_phone: testPhone(), p_village_town: 'Khurai', p_latitude: 23.8, p_longitude: 78.7,
      p_language: 'en', p_disclaimer_accepted: true, p_show_details: true, ...over,
    })
    expect((await call({ p_phone: '12345abcde' })).error?.message).toMatch(/invalid_phone/)
    expect((await call({ p_phone: '98765' })).error?.message).toMatch(/invalid_phone/)
    expect((await call({ p_full_name: '  ' })).error?.message).toMatch(/name_required/)
    expect((await call({ p_disclaimer_accepted: false })).error?.message).toMatch(/disclaimer_not_accepted/)
  })

  test.describe('existing e-mail accounts', () => {
    const phone = testPhone()
    const email = `kstest-e2e-${phone}@example.com`
    const password = 'Kstest-e2e-2026'
    let userId = null

    test.beforeAll(async () => {
      // An e-mail account made the way the old sign-up made it: Supabase Auth user + app_register.
      const admin = adminClient()
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
      if (error) throw new Error(`createUser: ${error.message}`)
      userId = data.user.id
      const c = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
      const { error: siErr } = await c.auth.signInWithPassword({ email, password })
      if (siErr) throw new Error(`signIn: ${siErr.message}`)
      const { error: regErr } = await c.rpc('app_register', {
        p_full_name: 'KSTEST Email User', p_phone: phone, p_village_town: 'Khurai', p_latitude: 24.04, p_longitude: 78.33,
        p_language: 'en', p_disclaimer_accepted: true, p_show_details: true,
      })
      if (regErr) throw new Error(`app_register: ${regErr.message}`)
      await c.auth.signOut()
    })
    test.afterAll(async () => {
      const admin = adminClient()
      await admin.from('profiles').delete().eq('phone', phone)
      if (userId) await admin.auth.admin.deleteUser(userId)
    })

    test('the e-mail + password box on the login page still signs them in', async ({ page }) => {
      await english(page)
      await page.goto('/login')
      await expect(page.getByTestId('login-email-form')).toBeVisible()
      await expect(page.getByTestId('login-phone-form')).toBeVisible()
      await page.locator('#email').fill(email)
      await page.locator('#password').fill(password)
      await page.getByTestId('login-email-submit').click()
      await expect(page).toHaveURL(/\/home$/)
      const s = await session(page)
      expect(s.email).toBe(email)
      expect(s.auth_provider).toBe('email')
      await page.goto('/profile')
      await expect(page.locator('#pf_email')).toHaveValue(email)
    })
  })

  test('login page (Hindi): the friendly line sits under the title; both boxes still there', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByTestId('login-no-email')).toHaveText('📱 ईमेल नहीं है? मोबाइल नंबर से लॉगिन करें')
    await expect(page.getByTestId('login-email-form')).toBeVisible()
    await expect(page.getByTestId('login-phone-form')).toBeVisible()
    // It comes before both forms (directly under the page title).
    const lineY = (await page.getByTestId('login-no-email').boundingBox()).y
    const formY = (await page.getByTestId('login-email-form').boundingBox()).y
    expect(lineY).toBeLessThan(formY)
  })
})
