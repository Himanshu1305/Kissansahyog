import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { testPhone, adminClient, anonClient } from './support.js'
import { runSql } from '../scripts/lib/mgmt-sql.mjs'

// Batch 11A Phase 3 — real mobile OTP and session tokens, end to end in the browser.
// Needs the Pages Functions: run against scripts/batch11a/local-otp-stack.mjs (wrangler pages dev + mock 2Factor
// + STAGING database), e.g.
//   KS_E2E_BASE=http://127.0.0.1:8788 KS_OTP_MOCK=http://127.0.0.1:8799 npx playwright test \
//     --config scripts/batch10f/playwright.base-url.config.mjs e2e/otp-11a.spec.js
// Skipped without KS_OTP_MOCK (plain `vite preview` has no functions). No real SMS: the "SMS" is read from the
// mock. The two flags are switched on staging for some tests and ALWAYS switched back off (afterEach).
// Test users: KSTEST names, reserved 90000xxxxx numbers (global teardown), kstest-e2e-…@example.com.

const MOCK = process.env.KS_OTP_MOCK
test.skip(!MOCK, 'needs the local OTP stack (KS_OTP_MOCK)')
test.describe.configure({ mode: 'serial' })

const SESSION_KEY = 'ks_session_v1'
const TOKEN_KEY = 'ks_session_token_v1'
const english = (page) => page.addInitScript(() => localStorage.setItem('ks_lang_v1', 'en'))
const session = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), SESSION_KEY)
const token = (page) => page.evaluate((k) => localStorage.getItem(k), TOKEN_KEY)
const sms = async (phone) => (await (await fetch(`${MOCK}/__mock/last?phone=${phone}`)).json())
const mockPost = (path) => fetch(`${MOCK}${path}`, { method: 'POST' })
const setFlagsDb = (otp, sess) => runSql(`update public.site_settings set value = '${otp}'::jsonb, updated_at = now() where key = 'otp_required';
  update public.site_settings set value = '${sess}'::jsonb, updated_at = now() where key = 'session_enforced';`)
// The config function caches the flags for 60 s (by design): after a flip, wait until the site reports it.
async function setFlags(otp, sess) {
  await setFlagsDb(otp, sess)
  const base = process.env.KS_E2E_BASE
  const until = Date.now() + 75_000
  for (;;) {
    const j = await (await fetch(`${base}/api/otp/config`)).json().catch(() => ({}))
    if (j.otp_required === otp && j.session_enforced === sess) return
    if (Date.now() > until) throw new Error('config did not follow the flags within 75 s')
    await new Promise((r) => setTimeout(r, 2000))
  }
}
const withToken = (tok) => createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false }, global: { headers: tok ? { 'x-ks-session': tok } : {} } })
const admin = adminClient()

async function mkProfile(name) {
  const phone = testPhone()
  const { data, error } = await admin.from('profiles').insert({ full_name: name, phone, village_town: 'Sagar', preferred_language: 'en', disclaimer_accepted_at: new Date().toISOString() }).select().single()
  if (error) throw new Error(error.message)
  return data
}
async function mkListing(userId, title) {
  const { data, error } = await admin.from('listings').insert({ user_id: userId, listing_type: 'offer', category: 'equipment', status: 'active', latitude: 23.8388, longitude: 78.7378, pincode: '470001', details: { title }, self_declared: true }).select().single()
  if (error) throw new Error(error.message)
  return data
}
// Sign in through the real screen with the code from the mock "SMS".
async function otpLogin(page, phone) {
  await page.goto('/login')
  await page.locator('#phone').fill(phone)
  await expect(page.getByTestId('login-phone-submit')).toHaveText('Send code')
  await page.getByTestId('login-phone-submit').click()
  await expect(page.getByTestId('login-otp-step')).toBeVisible()
  const { code } = await sms(phone)
  await page.getByTestId('login-otp-code').fill(code)
  await page.getByTestId('login-otp-submit').click()
  await expect(page).toHaveURL(/\/home$/)
}

test.beforeAll(async () => {
  test.setTimeout(120_000)
  await setFlags(false, false)
  await mockPost('/__mock/reset')
  // The per-IP limit (20 / hour) is shared by every local run: start each run from zero.
  await runSql(`delete from public.otp_requests where ip_hash in (public.ks_peppered_hash('ip:127.0.0.1'), public.ks_peppered_hash('ip:::1'), public.ks_peppered_hash('ip:unknown'))`)
})
test.afterEach(async () => { await setFlagsDb(false, false) })
test.afterAll(async () => {
  await setFlagsDb(false, false)
  await runSql(`delete from public.otp_requests where ip_hash in (public.ks_peppered_hash('ip:127.0.0.1'), public.ks_peppered_hash('ip:::1'), public.ks_peppered_hash('ip:unknown')); delete from public.otp_tickets where phone like '90000%';`)
})

test.describe('11A: flags OFF = today', () => {
  test.beforeEach(async () => { test.setTimeout(150_000); await setFlags(false, false) })
  test('login page: mobile box first; the number alone signs in (no code, no SMS)', async ({ page }) => {
    await english(page)
    const p = await mkProfile('KSTEST 11A off')
    const before = (await (await fetch(`${MOCK}/__mock/stats`)).json()).sends
    await page.goto('/login')
    const phoneY = (await page.getByTestId('login-phone-card').boundingBox()).y
    const emailY = (await page.getByTestId('login-email-form').boundingBox()).y
    expect(phoneY).toBeLessThan(emailY)
    await expect(page.getByTestId('login-otp-note')).toBeVisible()
    await expect(page.getByTestId('login-phone-submit')).toHaveText('Log in with mobile number')
    await page.locator('#phone').fill(p.phone)
    await page.getByTestId('login-phone-submit').click()
    await expect(page).toHaveURL(/\/home$/)
    expect((await session(page)).id).toBe(p.id)
    expect(await token(page)).toBeNull()
    expect((await (await fetch(`${MOCK}/__mock/stats`)).json()).sends).toBe(before)
  })

  test('the old direct RPC works while OTP is off', async () => {
    const p = await mkProfile('KSTEST 11A off rpc')
    const r = await anonClient().rpc('app_login', { p_phone: p.phone })
    expect(r.error).toBeNull()
    expect(r.data.id).toBe(p.id)
  })
})

test.describe('11A: OTP ON', () => {
  test.beforeEach(async () => { test.setTimeout(150_000); await setFlags(true, false) })

  test('login by OTP: send → wrong code → right code → signed in with a session token', async ({ page }) => {
    await english(page)
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    const p = await mkProfile('KSTEST 11A otp login')
    await page.goto('/login')
    await page.locator('#phone').fill(p.phone)
    await page.getByTestId('login-phone-submit').click()
    await expect(page.getByTestId('login-otp-step')).toBeVisible()
    await expect(page.getByTestId('login-otp-sent')).toContainText(`+91 ${p.phone.slice(0, 5)} ${p.phone.slice(5)}`)
    await expect(page.getByTestId('login-otp-note')).toHaveCount(0)
    const input = page.getByTestId('login-otp-code')
    await expect(input).toHaveAttribute('inputmode', 'numeric')
    await expect(input).toHaveAttribute('autocomplete', 'one-time-code')
    await expect(input).toBeFocused()
    await expect(page.getByTestId('login-otp-resend')).toBeDisabled()
    await expect(page.getByTestId('login-otp-resend')).toContainText('You can ask again in')
    const { code } = await sms(p.phone)
    await input.fill(code === '000000' ? '111111' : '000000')
    await page.getByTestId('login-otp-submit').click()
    await expect(page.getByTestId('login-otp-error')).toHaveText('That code is not right. Check the SMS and type it again.')
    await expect(input).toHaveValue('')
    await input.fill(code)
    await input.press('Enter') // keyboard submit
    await expect(page).toHaveURL(/\/home$/)
    expect((await session(page)).id).toBe(p.id)
    expect(await token(page)).toMatch(/^kss1_[0-9a-f]{64}$/)
    expect(errors).toEqual([])
  })

  test('resend after the 30-second countdown sends a new code; the new code works', async ({ page }) => {
    test.setTimeout(180_000)
    await english(page)
    const p = await mkProfile('KSTEST 11A resend')
    await page.goto('/login')
    await page.locator('#phone').fill(p.phone)
    await page.getByTestId('login-phone-submit').click()
    await expect(page.getByTestId('login-otp-step')).toBeVisible()
    const first = await sms(p.phone)
    await expect(page.getByTestId('login-otp-resend')).toBeEnabled({ timeout: 35_000 })
    await expect(page.getByTestId('login-otp-resend')).toHaveText('Send the code again')
    await page.getByTestId('login-otp-resend').click()
    await expect(page.getByTestId('login-otp-info')).toHaveText('A new code has been sent.')
    const second = await sms(p.phone)
    expect(second.sends).toBe(2)
    await expect(page.getByTestId('login-otp-resend')).toBeDisabled()
    await page.getByTestId('login-otp-code').fill(second.code)
    await page.getByTestId('login-otp-submit').click()
    await expect(page).toHaveURL(/\/home$/)
    expect(first.session).not.toBe(second.session)
  })

  test('expired code → clear message; "change number" goes back to the number', async ({ page }) => {
    await english(page)
    const p = await mkProfile('KSTEST 11A expired')
    await page.goto('/login')
    await page.locator('#phone').fill(p.phone)
    await page.getByTestId('login-phone-submit').click()
    await expect(page.getByTestId('login-otp-step')).toBeVisible()
    await mockPost(`/__mock/expire?phone=${p.phone}`)
    await page.getByTestId('login-otp-code').fill((await sms(p.phone)).code)
    await page.getByTestId('login-otp-submit').click()
    await expect(page.getByTestId('login-otp-error')).toHaveText('This code no longer works. Tap "Send the code again".')
    await page.getByTestId('login-otp-change').click()
    await expect(page.locator('#phone')).toHaveValue(p.phone)
    await expect(page.getByTestId('login-phone-submit')).toBeVisible()
    expect(await session(page)).toBeNull()
  })

  test('number not registered → same code screen, and the code can never sign in (no SMS sent)', async ({ page }) => {
    await english(page)
    const phone = testPhone()
    await page.goto('/login')
    await page.locator('#phone').fill(phone)
    await page.getByTestId('login-phone-submit').click()
    await expect(page.getByTestId('login-otp-step')).toBeVisible()
    expect((await sms(phone)).code).toBeUndefined()
    await page.getByTestId('login-otp-code').fill('123456')
    await page.getByTestId('login-otp-submit').click()
    await expect(page.getByTestId('login-otp-error')).toHaveText('That code is not right. Check the SMS and type it again.')
  })

  test('the old direct RPCs are blocked (otp_required)', async () => {
    const p = await mkProfile('KSTEST 11A blocked')
    let r = await anonClient().rpc('app_login', { p_phone: p.phone })
    expect(r.error?.message).toContain('otp_required')
    r = await anonClient().rpc('app_register_phone', { p_full_name: 'KSTEST x', p_phone: testPhone(), p_village_town: 'Sagar', p_latitude: null, p_longitude: null, p_language: 'en', p_disclaimer_accepted: true, p_show_details: true })
    expect(r.error?.message).toContain('otp_required')
  })

  test('sign-up by OTP: form → code → account created and signed in with a token', async ({ page }) => {
    await english(page)
    const phone = testPhone()
    await page.goto('/signup')
    await page.locator('#full_name').fill('KSTEST 11A otp signup')
    await page.locator('#phone').fill(phone)
    await page.getByTestId('place-input').fill('Khur')
    await page.getByTestId('place-suggestions').getByRole('button').first().click()
    await page.getByTestId('disclaimer-accept').check()
    await page.getByRole('button', { name: 'Accept and continue' }).click()
    await expect(page.getByTestId('signup-otp-step')).toBeVisible()
    await expect(page.getByTestId('signup-form')).toBeHidden()
    const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('phone', phone)
    expect(count).toBe(0) // nothing created before the code
    await page.getByTestId('signup-otp-code').fill((await sms(phone)).code)
    await page.getByTestId('signup-otp-submit').click()
    await expect(page).toHaveURL(/\/home$/)
    const s = await session(page)
    expect(s.phone).toBe(phone)
    expect(s.auth_provider).toBe('phone')
    expect(await token(page)).toMatch(/^kss1_/)
  })

  test('sign-up by OTP for a registered number → "already registered", no SMS', async ({ page }) => {
    await english(page)
    const p = await mkProfile('KSTEST 11A dup')
    await page.goto('/signup')
    await page.locator('#full_name').fill('KSTEST 11A dup 2')
    await page.locator('#phone').fill(p.phone)
    await page.getByTestId('place-input').fill('Khur')
    await page.getByTestId('place-suggestions').getByRole('button').first().click()
    await page.getByTestId('disclaimer-accept').check()
    await page.getByRole('button', { name: 'Accept and continue' }).click()
    await expect(page.getByTestId('signup-error')).toHaveText('An account with this number already exists. Please log in.')
    expect((await sms(p.phone)).code).toBeUndefined()
  })
})

test.describe('11A: session enforcement ON (both flags)', () => {
  test.beforeEach(async () => { test.setTimeout(150_000); await setFlags(true, true) })

  test('signed in by OTP: own listings load (token attached); logout revokes the token', async ({ page }) => {
    await english(page)
    const p = await mkProfile('KSTEST 11A enforced')
    const l = await mkListing(p.id, 'KSTEST 11A enforced listing')
    await otpLogin(page, p.phone)
    const tok = await token(page)
    await page.goto('/my')
    await expect(page.getByRole('group', { name: 'Actions for this listing' })).toHaveCount(1)
    let r = await withToken(tok).rpc('app_session_valid', { p_actor_id: p.id })
    expect(r.data).toBe(true)
    await page.goto('/home')
    await page.getByRole('button', { name: 'Log out' }).first().click()
    await expect.poll(() => session(page)).toBeNull()
    expect(await token(page)).toBeNull()
    await expect.poll(async () => (await withToken(tok).rpc('app_session_valid', { p_actor_id: p.id })).data).toBe(false)
    r = await withToken(tok).rpc('close_listing', { p_actor_id: p.id, p_listing_id: l.id })
    expect(r.error?.message).toContain('not_authenticated')
  })

  test('a cloned user id cannot act: close_listing / delete_my_listing as someone else are refused', async ({ page }) => {
    await english(page)
    const victim = await mkProfile('KSTEST 11A victim')
    const attacker = await mkProfile('KSTEST 11A attacker')
    const l = await mkListing(victim.id, 'KSTEST 11A victim listing')
    // The victim's user id is public (listings.user_id). The attacker signs in normally and has a token.
    const { data: pub } = await anonClient().from('listings').select('user_id').eq('id', l.id).single()
    expect(pub.user_id).toBe(victim.id)
    await otpLogin(page, attacker.phone)
    const attackerToken = await token(page)
    for (const c of [anonClient(), withToken(attackerToken)]) {
      let r = await c.rpc('close_listing', { p_actor_id: victim.id, p_listing_id: l.id })
      expect(r.error?.message).toContain('not_authenticated')
      r = await c.rpc('delete_my_listing', { p_actor_id: victim.id, p_listing_id: l.id })
      expect(r.error?.message).toContain('not_authenticated')
      r = await c.rpc('update_profile', { p_actor_id: victim.id, p_full_name: 'KSTEST hijacked', p_village_town: null, p_pincode: '470001', p_language: null })
      expect(r.error?.message).toContain('not_authenticated')
    }
    const { data: still } = await admin.from('listings').select('status').eq('id', l.id).single()
    expect(still.status).toBe('active')
    const { data: vp } = await admin.from('profiles').select('full_name').eq('id', victim.id).single()
    expect(vp.full_name).toBe('KSTEST 11A victim')
  })

  test('a revoked session on this device → signed out at start-up with a clear message', async ({ page }) => {
    await english(page)
    const p = await mkProfile('KSTEST 11A revoked')
    await otpLogin(page, p.phone)
    await runSql(`update public.app_sessions set revoked_at = now() where user_id = '${p.id}'`)
    await page.goto('/my')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByTestId('login-session-ended')).toHaveText('You have been logged out. Please log in again.')
    expect(await session(page)).toBeNull()
  })

  test('an action refused by the server (not_authenticated) signs out locally and shows the login screen', async ({ page }) => {
    await english(page)
    const p = await mkProfile('KSTEST 11A refused')
    await mkListing(p.id, 'KSTEST 11A refused listing')
    await otpLogin(page, p.phone)
    // Session dies while the app is open (e.g. signed out on another device), then the user opens My listings.
    await runSql(`update public.app_sessions set revoked_at = now() where user_id = '${p.id}'`)
    await page.getByRole('button', { name: /My listings/ }).first().click() // in-app navigation (Home), no reload
    await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 })
    await expect(page.getByTestId('login-session-ended')).toBeVisible()
  })

  test('e-mail sign-in still works and gets a session token (actions work under enforcement)', async ({ page }) => {
    await english(page)
    const email = `kstest-e2e-11a-${Date.now()}@example.com`
    const password = `Kstest-${Date.now()}-pw!`
    const cu = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    expect(cu.error).toBeNull()
    const phone = testPhone()
    const { data: prof } = await admin.from('profiles').insert({ full_name: 'KSTEST 11A email', phone, email, auth_uid: cu.data.user.id, auth_provider: 'email', village_town: 'Sagar', preferred_language: 'en', disclaimer_accepted_at: new Date().toISOString() }).select().single()
    await mkListing(prof.id, 'KSTEST 11A email listing')
    await page.goto('/login')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.getByTestId('login-email-submit').click()
    await expect(page).toHaveURL(/\/home$/)
    expect(await token(page)).toMatch(/^kss1_/)
    await page.goto('/my')
    await expect(page.getByRole('group', { name: 'Actions for this listing' })).toHaveCount(1)
    await admin.auth.admin.deleteUser(cu.data.user.id)
  })

  test('320 px phone: code step fits, no horizontal scroll, touch targets >= 44 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    const p = await mkProfile('KSTEST 11A 320')
    await page.goto('/login') // Hindi (default language)
    await expect(page.getByTestId('login-phone-submit')).toHaveText('कोड भेजें')
    await page.locator('#phone').fill(p.phone)
    await page.getByTestId('login-phone-submit').click()
    await expect(page.getByTestId('login-otp-step')).toBeVisible()
    await expect(page.getByTestId('login-otp-sent')).toContainText('पर 6 अंकों का कोड SMS से भेजा गया है।')
    const sw = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(sw).toBeLessThanOrEqual(320)
    for (const id of ['login-otp-code', 'login-otp-submit', 'login-otp-resend', 'login-otp-change']) {
      const b = await page.getByTestId(id).boundingBox()
      expect(b.height, id).toBeGreaterThanOrEqual(44)
      expect(b.x + b.width, id).toBeLessThanOrEqual(320)
    }
    await expect(page.getByRole('textbox', { name: '6 अंकों का कोड' })).toBeVisible() // labelled for screen readers
    await page.screenshot({ path: 'docs/review/batch11a/evidence/screens/phase3-otp-login-320-hi.png', fullPage: true })
  })
})
