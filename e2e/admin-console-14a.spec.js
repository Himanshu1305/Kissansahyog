// Batch 14A - admin console end to end (STAGING database, built app, every external provider mocked: the 2Factor
// balance and the OTP functions are answered by page.route; the real 2Factor is NEVER called). KSTEST users use the
// reserved 90000xxxxx phones (global teardown). The two auth switches are never flipped (only a dialog is exercised).
//   node --env-file=.env node_modules/.bin/playwright test e2e/admin-console-14a.spec.js
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { adminClient, anonClient, testPhone } from './support.js'
import { strings } from '../src/lib/i18n/strings.js'

test.setTimeout(120_000)
test.describe.configure({ mode: 'serial' })
const S = (key, lang = 'hi') => strings[key][lang]
const SHOTS = 'docs/review/batch14a/evidence/screens'
const svc = adminClient()
const made = []

async function mkUser(label, role = null) {
  const { data, error } = await anonClient().rpc('app_register_phone', { p_full_name: `KSTEST 14A ${label}`, p_phone: testPhone(), p_village_town: 'Sagar', p_latitude: 23.8388, p_longitude: 78.7378, p_language: 'hi', p_disclaimer_accepted: true, p_show_details: true })
  if (error) throw new Error(error.message)
  const p = Array.isArray(data) ? data[0] : data
  made.push(p.id)
  if (role) { await svc.from('profiles').update({ is_admin: true, admin_role: role }).eq('id', p.id); p.is_admin = true; p.admin_role = role }
  const tok = await svc.rpc('ks_create_session', { p_user_id: p.id })
  if (tok.error) throw new Error(tok.error.message)
  return { profile: p, token: tok.data }
}
async function open(browser, u, { lang = 'hi', width = 1280, height = 900, withToken = true, time = null } = {}) {
  const isMobile = width < 768
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile, hasTouch: isMobile, serviceWorkers: 'block' })
  await ctx.addInitScript(([p, tok, l]) => {
    if (p) localStorage.setItem('ks_session_v1', JSON.stringify(p))
    if (tok) localStorage.setItem('ks_session_token_v1', tok)
    localStorage.setItem('ks_lang_v1', l)
  }, [u?.profile || null, withToken ? u?.token || null : null, lang])
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  const rpcs = []
  page.on('request', (r) => { const m = r.url().match(/\/rest\/v1\/rpc\/([a-z_]+)/); if (m) rpcs.push(m[1]) })
  await page.route('**/api/admin/sms-balance', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ balance: 250, checked_at: new Date().toISOString() }) }))
  if (time) await page.clock.setFixedTime(new Date(time))
  return { ctx, page, errors, rpcs }
}
const tab = (page, id) => page.getByTestId(`admin-tab-${id}`)
const logRows = async (actorId) => (await svc.from('admin_actions').select('action').eq('actor_id', actorId)).data || []

let SUPER, EDITOR, VICTIM, ANN_ID
test.beforeAll(async () => {
  SUPER = await mkUser('super', 'super')
  EDITOR = await mkUser('editor', 'editor')
  VICTIM = await mkUser('victim')
})
test.afterAll(async () => {
  await svc.from('announcements').delete().like('title_hi', 'KSTEST 14A%')
  if (made.length) { await svc.from('admin_actions').delete().in('actor_id', made); await svc.from('listings').delete().in('user_id', made) }
})

test('1 tabs: six tabs, ARIA tablist, ?tab= in the URL, remembered tab, environment badge, no secrets', async ({ browser }) => {
  const { ctx, page, errors } = await open(browser, SUPER)
  await page.goto('/admin')
  await expect(page.getByRole('tablist')).toBeVisible()
  await expect(page.getByRole('tab')).toHaveCount(6)
  await expect(tab(page, 'overview')).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('env-badge')).toHaveAttribute('data-env', 'STAGING')
  await expect(page.getByTestId('role-badge')).toHaveText('super')
  const h = await tab(page, 'content').boundingBox()
  expect(h.height).toBeGreaterThanOrEqual(47)
  await tab(page, 'content').click()
  await expect(page).toHaveURL(/tab=content/)
  await expect(page.getByTestId('admin-tabpanel')).toHaveAttribute('data-tab', 'content')
  await page.reload()
  await expect(tab(page, 'content')).toHaveAttribute('aria-selected', 'true')
  await page.goto('/admin?tab=nonsense')
  await expect(tab(page, 'content')).toHaveAttribute('aria-selected', 'true') // falls back to the remembered tab
  await tab(page, 'content').focus(); await page.keyboard.press('ArrowRight')
  await expect(tab(page, 'mandi')).toHaveAttribute('aria-selected', 'true')
  const html = await page.content()
  expect(html).not.toContain(process.env.SUPABASE_SERVICE_ROLE_KEY || 'no-such-key')
  expect(errors).toEqual([])
  await ctx.close()
})

test('2 lazy loading: inactive tabs make no requests; opening a tab fetches its panels', async ({ browser }) => {
  const { ctx, page, rpcs } = await open(browser, SUPER)
  await page.goto('/admin?tab=overview')
  await expect(page.getByTestId('admin-tabpanel')).toHaveAttribute('data-tab', 'overview')
  await page.waitForLoadState('networkidle')
  for (const n of ['admin_list_announcements', 'admin_list_user_status', 'admin_get_security_status', 'admin_list_actions', 'get_listing_reports', 'get_admin_msp']) {
    expect(rpcs, `${n} must not be requested from the overview tab`).not.toContain(n)
  }
  expect(rpcs).toContain('get_admin_stats')
  await tab(page, 'security').click()
  await expect(page.getByTestId('sec-otp_required')).toBeVisible()
  expect(rpcs).toContain('admin_get_security_status')
  expect(rpcs).not.toContain('admin_list_announcements')
  await ctx.close()
})

test('3 panel search finds panels (Hindi and English), opens the tab and the panel', async ({ browser }) => {
  const { ctx, page } = await open(browser, SUPER)
  await page.goto('/admin')
  await page.getByTestId('panel-search').fill('announcement')
  await expect(page.getByTestId('panel-search-hit').first()).toHaveAttribute('data-panel', 'announcements')
  await page.getByTestId('panel-search-hit').first().click()
  await expect(page.getByTestId('admin-tabpanel')).toHaveAttribute('data-tab', 'content')
  await expect(page.getByTestId('ann-new')).toBeVisible()
  await page.getByTestId('panel-search').fill('ब्लॉक')
  await expect(page.getByTestId('panel-search-results')).toContainText(S('adm_search_none'))
  await page.getByTestId('panel-search').fill('रोकें')
  await page.getByTestId('panel-search-hit').first().click()
  await expect(page.getByTestId('admin-tabpanel')).toHaveAttribute('data-tab', 'people')
  await expect(page.getByTestId('us-table')).toBeVisible()
  await page.getByTestId('panel-search').fill('zzzzzz')
  await expect(page.getByTestId('panel-search-results')).toContainText(S('adm_search_none'))
  await ctx.close()
})

test('4 announcement: create (India time) -> home shows it -> dismiss remembered -> outside window hidden -> not in prerendered HTML', async ({ browser }) => {
  const { ctx, page, errors } = await open(browser, SUPER, { width: 390, height: 844 })
  await page.goto('/admin?tab=content')
  await page.getByTestId('ann-new').click()
  await page.getByTestId('ann-save').click()
  await expect(page.getByTestId('ann-msg')).toHaveText(S('adm_ann_err_title')) // Hindi title is required
  await page.getByTestId('ann-title-hi').fill('KSTEST 14A शुभकामना')
  await page.getByTestId('ann-title-en').fill('KSTEST 14A wishes')
  await page.getByTestId('ann-body-hi').fill('यह जाँच का कार्ड है।')
  await page.getByTestId('ann-link').fill('javascript:alert(1)')
  await page.getByTestId('ann-save').click()
  await expect(page.getByTestId('ann-msg')).toHaveText(S('adm_ann_err_link'))
  await page.getByTestId('ann-link').fill('/msp')
  await page.getByTestId('ann-style').selectOption('festival')
  await expect(page.getByTestId('ann-preview-phone')).toContainText('KSTEST 14A शुभकामना')
  await page.screenshot({ path: `${SHOTS}/announcement-form-390.png`, fullPage: false })
  await page.getByTestId('ann-save').click()
  const row = page.getByTestId('ann-row').filter({ hasText: 'KSTEST 14A शुभकामना' })
  await expect(row).toBeVisible()
  await expect(row).toHaveAttribute('data-live', '1')
  const { data } = await svc.from('announcements').select('id,start_at,end_at,created_by').like('title_hi', 'KSTEST 14A%')
  expect(data).toHaveLength(1)
  ANN_ID = data[0].id
  expect(data[0].created_by).toBe(SUPER.profile.id)
  expect(Date.parse(data[0].end_at) - Date.parse(data[0].start_at)).toBeGreaterThan(23 * 3600e3) // typed in IST, stored as an instant: a 24 h window
  expect((await logRows(SUPER.profile.id)).map((r) => r.action)).toContain('announcement_create')

  // home: shows within the window
  const home = await open(browser, null, { width: 390, height: 844 })
  await home.page.goto('/')
  const card = home.page.getByTestId('announcement-card').first()
  await expect(card).toBeVisible()
  await expect(card).toContainText('KSTEST 14A शुभकामना')
  await expect(home.page.getByTestId('announcements')).toHaveAttribute('role', 'region')
  await expect(home.page.getByTestId('announcements')).toHaveAttribute('aria-label', S('adm_card_region'))
  const close = home.page.getByTestId('announcement-close').first()
  expect((await close.boundingBox()).width).toBeGreaterThanOrEqual(47)
  await home.page.screenshot({ path: `${SHOTS}/home-card-390.png` })
  await close.click()
  await expect(card).toHaveCount(0)
  await home.page.reload()
  await home.page.getByTestId('home-hero').waitFor()
  await home.page.waitForTimeout(800)
  await expect(home.page.getByTestId('announcement-card')).toHaveCount(0) // closed for the day
  await home.ctx.close()

  // outside the window (2 days later) it is not shown
  const later = await open(browser, null, { width: 390, height: 844, time: new Date(Date.now() + 48 * 3600e3).toISOString() })
  await later.page.goto('/')
  await later.page.getByTestId('home-hero').waitFor()
  await later.page.waitForTimeout(800)
  await expect(later.page.getByTestId('announcement-card')).toHaveCount(0)
  await later.ctx.close()

  // never in the prerendered HTML, and a failing fetch shows nothing
  const dist = readFileSync('dist/index.html', 'utf8')
  expect(dist).not.toContain('announcement-card')
  expect(dist).not.toContain('KSTEST 14A')
  const broken = await open(browser, null, { width: 390, height: 844 })
  await broken.page.route('**/rest/v1/rpc/get_active_announcements', (route) => route.fulfill({ status: 500, body: 'boom' }))
  await broken.page.goto('/')
  await broken.page.getByTestId('home-hero').waitFor()
  await broken.page.waitForTimeout(800)
  await expect(broken.page.getByTestId('announcement-card')).toHaveCount(0)
  await expect(broken.page.getByRole('alert')).toHaveCount(0)
  await broken.ctx.close()

  // switch off / duplicate / delete
  await row.getByTestId('ann-toggle').click()
  await expect(row).toHaveAttribute('data-live', '0')
  await row.getByTestId('ann-dup').click()
  await expect(page.getByTestId('ann-row')).toHaveCount(2)
  page.on('dialog', (d) => d.accept())
  for (let i = 0; i < 2; i += 1) { await page.getByTestId('ann-delete').first().click(); await page.waitForTimeout(400) }
  await expect(page.getByTestId('ann-row')).toHaveCount(0)
  expect(errors).toEqual([])
  await ctx.close()
})

test('5 security panel: both flags and last-changed; a flip needs a reason and the typed phrase (dialog only, nothing is flipped)', async ({ browser }) => {
  const { ctx, page } = await open(browser, SUPER, { width: 390, height: 844 })
  const before = JSON.stringify((await svc.from('site_settings').select('key,value').in('key', ['otp_required', 'session_enforced']).order('key')).data)
  await page.goto('/admin?tab=security')
  await expect(page.getByTestId('sec-otp_required')).toBeVisible()
  await expect(page.getByTestId('sec-session_enforced')).toBeVisible()
  await page.getByTestId('sec-session_enforced-flip').click() // staging: off -> turning ON needs the phrase
  await expect(page.getByTestId('sec-dialog')).toContainText(S('adm_warn_sessions_on'))
  await expect(page.getByTestId('sec-confirm')).toBeDisabled()
  await page.getByTestId('sec-reason').fill('testing the dialog only')
  await expect(page.getByTestId('sec-confirm')).toBeDisabled()
  await page.getByTestId('sec-phrase').fill('sessions on')
  await expect(page.getByTestId('sec-confirm')).toBeDisabled()
  await page.getByTestId('sec-phrase').fill('SESSIONS ON')
  await expect(page.getByTestId('sec-confirm')).toBeEnabled()
  await page.screenshot({ path: `${SHOTS}/security-dialog-390.png` })
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('sec-dialog')).toHaveCount(0)
  // SMS usage: balance (mocked), amber below 300, no phone numbers
  await expect(page.getByTestId('sms-balance-value')).toHaveText('250')
  await expect(page.getByTestId('sms-low')).toBeVisible()
  await expect(page.getByTestId('sms-today')).toBeVisible()
  expect(await page.getByTestId('sms-balance').innerText()).not.toMatch(/\d{10}/)
  const body = await page.locator('main, body').first().innerText()
  expect(body).not.toMatch(/\b[6-9]\d{9}\b/)
  expect(JSON.stringify((await svc.from('site_settings').select('key,value').in('key', ['otp_required', 'session_enforced']).order('key')).data)).toBe(before)
  await ctx.close()
})

test('6 editor vs super: the editor sees notes instead of super controls', async ({ browser }) => {
  const ed = await open(browser, EDITOR)
  await ed.page.goto('/admin?tab=security')
  await expect(ed.page.getByTestId('role-badge')).toHaveText('editor')
  await expect(ed.page.getByTestId('super-only-note').first()).toBeVisible()
  await expect(ed.page.getByTestId('sec-otp_required-flip')).toHaveCount(0)
  expect(ed.rpcs).not.toContain('admin_get_security_status')
  await expect(ed.page.getByTestId('log-table')).toBeVisible() // everyone can read the log
  await ed.page.goto('/admin?tab=people')
  await expect(ed.page.getByTestId('us-table')).toBeVisible()
  await expect(ed.page.getByTestId('us-block')).toHaveCount(0)
  await expect(ed.page.getByTestId('us-unblock')).toHaveCount(0)
  await ed.ctx.close()
  const su = await open(browser, SUPER)
  await su.page.goto('/admin?tab=people')
  await su.page.getByTestId('us-search').fill('KSTEST 14A victim')
  await su.page.getByRole('button', { name: S('browse') }).first().click()
  await expect(su.page.getByTestId('us-block').first()).toBeVisible()
  await su.ctx.close()
})

test('7 block / unblock with a required reason; blocked user signed out with the humane message; login refused', async ({ browser }) => {
  const { ctx, page } = await open(browser, SUPER)
  await page.goto('/admin?tab=people')
  await page.getByTestId('us-search').fill('KSTEST 14A victim')
  await page.getByRole('button', { name: S('browse') }).first().click()
  const row = page.getByTestId('us-row').filter({ hasText: 'KSTEST 14A victim' })
  await expect(row).toBeVisible()
  await expect(row.getByTestId('us-chip')).toHaveText(S('adm_us_active_chip'))
  await expect(row).not.toContainText(VICTIM.profile.phone) // phone is masked to the last 4
  await row.getByTestId('us-block').click()
  await expect(page.getByTestId('us-confirm')).toBeDisabled()
  await page.getByTestId('us-reason-input').fill('spam posts, tested')
  await page.getByTestId('us-confirm').click()
  await expect(row.getByTestId('us-chip')).toHaveText(S('adm_us_blocked_chip'))
  await expect(row.getByTestId('us-reason')).toContainText('spam posts, tested')
  expect((await svc.from('profiles').select('is_blocked').eq('id', VICTIM.profile.id).single()).data.is_blocked).toBe(true)
  await page.screenshot({ path: `${SHOTS}/users-panel-1280.png` })

  // the blocked person: any "account_blocked" answer signs them out and the login screen says so
  const v = await open(browser, VICTIM)
  await v.page.goto('/home')
  await v.page.evaluate(() => window.dispatchEvent(new Event('ks:account-blocked')))
  await expect(v.page).toHaveURL(/\/login/)
  await expect(v.page.getByTestId('login-account-blocked')).toContainText(S('err_account_blocked'))
  expect(await v.page.evaluate(() => localStorage.getItem('ks_session_v1'))).toBeNull()
  await v.ctx.close()

  // login through the (mocked) OTP functions: the server answers 403 account_blocked and the screen shows the message
  const l = await open(browser, null, { lang: 'en' })
  await l.page.route('**/api/otp/config', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ otp_required: true, session_enforced: false }) }))
  await l.page.route('**/api/otp/send', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, challenge: '11111111-2222-4333-8444-555555555555', resendAfter: 30 }) }))
  await l.page.route('**/api/otp/verify', (r) => r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'account_blocked' }) }))
  await l.page.goto('/login')
  await l.page.locator('#phone').fill(VICTIM.profile.phone)
  await l.page.getByTestId('login-phone-submit').click()
  await expect(l.page.getByTestId('login-otp-step')).toBeVisible()
  await l.page.getByTestId('login-otp-code').fill('123456')
  await l.page.getByTestId('login-otp-submit').click()
  await expect(l.page.getByText(S('err_account_blocked', 'en'))).toBeVisible()
  await expect(l.page).toHaveURL(/\/login/)
  await l.ctx.close()

  // unblock
  await row.getByTestId('us-unblock').click()
  await page.getByTestId('us-reason-input').fill('restored after check')
  await page.getByTestId('us-confirm').click()
  await expect(row.getByTestId('us-chip')).toHaveText(S('adm_us_active_chip'))
  await ctx.close()
})

test('8 action log lists what was just done (India time, plain words, no phone numbers or secrets)', async ({ browser }) => {
  const { ctx, page } = await open(browser, SUPER, { width: 390, height: 844 })
  await page.goto('/admin?tab=security')
  await expect(page.getByTestId('log-table')).toBeVisible()
  const rows = page.getByTestId('log-row')
  await expect(rows.first()).toBeVisible()
  const actions = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-action')))
  for (const a of ['announcement_create', 'user_block', 'user_unblock']) expect(actions, a).toContain(a)
  await expect(page.getByTestId('log-table')).toContainText(S('adm_act_user_block'))
  await expect(page.getByTestId('log-table')).toContainText('KSTEST 14A super')
  const text = await page.getByTestId('log-table').innerText()
  expect(text).not.toMatch(/\d{10}/)
  await page.getByTestId('log-filter-action').selectOption('user_block')
  await expect(page.getByTestId('log-row')).toHaveCount(1)
  await page.screenshot({ path: `${SHOTS}/security-log-390.png`, fullPage: true })
  await ctx.close()
})

test('9 session_required: an admin without a session token is told to sign in again, with a button', async ({ browser }) => {
  const { ctx, page } = await open(browser, SUPER, { withToken: false })
  await page.goto('/admin?tab=security')
  const err = page.getByTestId('admin-error').first()
  await expect(err).toBeVisible()
  await expect(err).toContainText(S('err_admin_session'))
  await expect(page.getByTestId('admin-relogin').first()).toBeVisible()
  await page.getByTestId('admin-relogin').first().click()
  await expect(page).toHaveURL(/\/login/)
  await ctx.close()
})

test('10 admin looks right: tabs at 360x640 and 1366x768 in Hindi, no sideways scroll', async ({ browser }) => {
  for (const [w, h, name] of [[360, 640, '360'], [1366, 768, '1366']]) {
    const { ctx, page } = await open(browser, SUPER, { width: w, height: h })
    await page.goto('/admin?tab=content')
    await expect(page.getByTestId('ann-new')).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)
    await page.screenshot({ path: `${SHOTS}/admin-tabs-${name}.png` })
    await ctx.close()
  }
})
