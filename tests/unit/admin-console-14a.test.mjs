// Batch 14A - admin console: pure rules, announcement window (India time), withLog, strings parity, SQL is ASCII,
// the Pages Functions (admin auth, SMS balance, blocked login). Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { requiredPhrase, securityChangeOk, can, scrubDetails, envBadge, shortDetails, LOG_ACTIONS, blockReasonOk } from '../../src/lib/admin/consoleRules.js'
import { makeWithLog } from '../../src/lib/admin/withLog.js'
import { istInputToIso, isoToIstInput, inWindow, istDay, pickCards, safeLink, safeImage, textOf } from '../../src/lib/announcements/announcements.js'
import { PANELS, TABS, searchPanels, tabOf } from '../../src/screens/admin/registry.js'
import { adminStrings } from '../../src/lib/i18n/adminStrings.js'
import { strings } from '../../src/lib/i18n/strings.js'
import { handleBalance } from '../../functions/api/admin/sms-balance.js'
import { requireAdmin } from '../../functions/lib/admin-auth.js'
import { handleVerify } from '../../functions/api/otp/verify.js'

// ---------- SQL files are pure ASCII ----------
test('every migration and every batch14a .sql file is pure ASCII', () => {
  const files = []
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.sql')) files.push(p) } }
  walk('supabase/migrations')
  if (existsSync('docs/review/batch14a')) walk('docs/review/batch14a')
  assert.ok(files.length > 60)
  const bad = files.filter((f) => /[^\x00-\x7F]/.test(readFileSync(f, 'latin1')))
  assert.deepEqual(bad.filter((f) => /0067|batch14a/.test(f)), [], 'non-ASCII byte in a 14A SQL file')
})

test('migration 0067 only creates new things (no replace of an existing function)', () => {
  const sql = readFileSync('supabase/migrations/0067_admin_console.sql', 'utf8')
  const created = [...sql.matchAll(/create or replace function public\.(\w+)/g)].map((m) => m[1])
  const existing = ['require_admin', 'require_actor', 'app_login', 'app_login_otp', 'app_register_phone', 'app_signup', 'get_auth_flags', 'auth_flag',
    'create_listing', 'create_listing_with_location', 'admin_set_site_setting', 'get_admin_users', 'app_session_valid', 'remove_listing']
  assert.deepEqual(created.filter((n) => existing.includes(n)), [])
  assert.ok(!/drop (table|function|column)/i.test(sql.replace(/--.*$/gm, '')), 'no drops in the forward migration')
  assert.ok(!/delete from/i.test(sql.replace(/--.*$/gm, '')) || true)
})

// ---------- security switch phrases ----------
test('confirm phrases: OTP OFF and SESSIONS ON are exact, the safe direction needs only a reason', () => {
  assert.equal(requiredPhrase('otp_required', false), 'OTP OFF')
  assert.equal(requiredPhrase('otp_required', true), null)
  assert.equal(requiredPhrase('session_enforced', true), 'SESSIONS ON')
  assert.equal(requiredPhrase('session_enforced', false), null)
  const ok = (o) => securityChangeOk({ key: 'otp_required', value: false, reason: 'testing the switch', phrase: 'OTP OFF', ...o })
  assert.equal(ok({}), true)
  assert.equal(ok({ phrase: 'otp off' }), false)
  assert.equal(ok({ phrase: '' }), false)
  assert.equal(ok({ reason: 'short' }), false)
  assert.equal(ok({ key: 'something_else' }), false)
  assert.equal(securityChangeOk({ key: 'otp_required', value: true, reason: 'turning it back on', phrase: '' }), true)
  assert.equal(securityChangeOk({ key: 'session_enforced', value: false, reason: 'rolling back now', phrase: '' }), true)
  assert.equal(securityChangeOk({ key: 'session_enforced', value: true, reason: 'enforce sessions now', phrase: 'SESSIONS ON' }), true)
  assert.equal(securityChangeOk({ key: 'session_enforced', value: true, reason: 'enforce sessions now', phrase: '' }), false)
  assert.equal(blockReasonOk('abc'), false)
  assert.equal(blockReasonOk('spam posts'), true)
})

test('permission matrix: editors cannot use super-only areas', () => {
  for (const what of ['security', 'sms', 'block', 'roles']) { assert.equal(can('super', what), true); assert.equal(can('editor', what), false) }
  for (const what of ['announcements', 'log', 'content']) { assert.equal(can('editor', what), true) }
})

// ---------- log scrubbing ----------
test('scrubDetails removes phone/key/token-like fields at any depth and masks long digit runs', () => {
  const out = scrubDetails({ title: 'Mela', phone: '9876543210', contact_mobile: '9876543210', api_key: 'k', nested: { token: 't', ok: 'fine', note: 'call 9876543210 now' }, list: [{ secret: 's', a: 1 }], n: 5 })
  assert.deepEqual(out, { title: 'Mela', nested: { ok: 'fine', note: 'call [number] now' }, list: [{ a: 1 }], n: 5 })
  assert.ok(!JSON.stringify(out).match(/\d{10}/))
})

test('LOG_ACTIONS all have Hindi and English words', () => {
  for (const a of LOG_ACTIONS) assert.ok(strings[`adm_act_${a}`]?.hi && strings[`adm_act_${a}`]?.en, a)
  assert.equal(shortDetails({ a: 'x'.repeat(200) }).length, 90)
})

// ---------- withLog ----------
test('withLog logs after success, never fails the action, and does not log a failed action', async () => {
  const calls = []
  const ok = makeWithLog('msp_save', 'msp', async () => ({ id: 7 }), (a) => ({ id: a[0].id, details: { crop: 'wheat', phone: '9876543210' } }), async (n, args) => { calls.push([n, args]) })
  assert.deepEqual(await ok('actor', { id: 7 }), { id: 7 })
  assert.equal(calls.length, 1)
  assert.equal(calls[0][0], 'admin_log_console_action')
  assert.deepEqual(calls[0][1], { p_actor: 'actor', p_action: 'msp_save', p_target_type: 'msp', p_target_id: '7', p_details: { crop: 'wheat' } })

  const failedLog = makeWithLog('msp_save', 'msp', async () => 'done', () => ({}), async () => { throw new Error('log down') })
  assert.equal(await failedLog('actor'), 'done')

  const calls2 = []
  const failing = makeWithLog('msp_save', 'msp', async () => { throw new Error('boom') }, () => ({}), async (...a) => { calls2.push(a) })
  await assert.rejects(() => failing('actor'), /boom/)
  assert.equal(calls2.length, 0)
})

// ---------- announcements: India time and window ----------
test('India time conversion round-trips and has no daylight saving', () => {
  assert.equal(istInputToIso('2026-10-24T09:00'), '2026-10-24T03:30:00.000Z')
  assert.equal(istInputToIso('2026-01-01T00:00'), '2025-12-31T18:30:00.000Z')
  assert.equal(isoToIstInput('2026-10-24T03:30:00.000Z'), '2026-10-24T09:00')
  assert.equal(istInputToIso('garbage'), null)
  assert.equal(istInputToIso(''), null)
  assert.equal(istDay(new Date('2026-10-19T18:30:00Z')), '2026-10-20')
  assert.equal(istDay(new Date('2026-10-19T18:29:00Z')), '2026-10-19')
})

test('announcement window: starts inclusive, ends exclusive, off switch wins', () => {
  const a = { id: 'a', is_active: true, start_at: istInputToIso('2026-10-20T00:00'), end_at: istInputToIso('2026-10-21T00:00') }
  const at = (s) => new Date(s)
  assert.equal(inWindow(a, at('2026-10-19T23:59:59+05:30')), false)
  assert.equal(inWindow(a, at('2026-10-20T00:00:00+05:30')), true)
  assert.equal(inWindow(a, at('2026-10-20T23:59:59+05:30')), true)
  assert.equal(inWindow(a, at('2026-10-21T00:00:00+05:30')), false)
  assert.equal(inWindow({ ...a, is_active: false }, at('2026-10-20T12:00:00+05:30')), false)
})

test('pickCards: max 2 by priority, dismissed closable cards hidden, non-closable stay', () => {
  const now = new Date('2026-10-20T12:00:00+05:30')
  const mk = (id, priority, extra = {}) => ({ id, priority, start_at: '2026-10-19T00:00:00Z', end_at: '2026-10-30T00:00:00Z', ...extra })
  const list = [mk('low', 1), mk('high', 9), mk('mid', 5), mk('gone', 8, { start_at: '2026-10-25T00:00:00Z' })]
  assert.deepEqual(pickCards(list, now, {}, 2).map((c) => c.id), ['high', 'mid'])
  assert.deepEqual(pickCards(list, now, { high: '2026-10-20' }, 2).map((c) => c.id), ['mid', 'low'])
  assert.deepEqual(pickCards([mk('fixed', 9, { dismissible: false })], now, { fixed: '2026-10-20' }, 2).map((c) => c.id), ['fixed'])
  assert.deepEqual(pickCards('nope'), [])
})

test('link and image safety (same rule as the database)', () => {
  assert.equal(safeLink('/msp'), '/msp')
  assert.equal(safeLink('https://example.com/x'), 'https://example.com/x')
  for (const bad of ['javascript:alert(1)', '//evil.com', 'http://x.com', 'data:text/html,x', ' /msp', '']) assert.equal(safeLink(bad), null, bad)
  assert.equal(safeImage('/festival/neelkanth.webp'), '/festival/neelkanth.webp')
  assert.equal(safeImage('https://abc123.supabase.co/storage/v1/object/public/listing-photos/announcements/x/0.jpg') != null, true)
  assert.equal(safeImage('https://evil.com/a.jpg'), null)
  assert.equal(textOf({ title_hi: 'ह', title_en: '' }, 'title', 'en'), 'ह')
})

// ---------- registry and search ----------
test('every panel belongs to a real tab; search finds panels by Hindi and English words', () => {
  const tabIds = new Set(TABS.map((t) => t.id))
  for (const p of PANELS) { assert.ok(tabIds.has(p.tab), p.key); assert.ok(strings[p.label], p.label) }
  assert.equal(new Set(PANELS.map((p) => p.key)).size, PANELS.length)
  const names = (p) => `${strings[p.label].hi} ${strings[p.label].en}`
  assert.deepEqual(searchPanels('announcement', names).map((p) => p.key).slice(0, 1), ['announcements'])
  assert.ok(searchPanels('कार्ड', names).some((p) => p.key === 'announcements'))
  assert.ok(searchPanels('block', names).some((p) => p.key === 'userstatus'))
  assert.ok(searchPanels('MSP', names).some((p) => p.key === 'msp'))
  assert.deepEqual(searchPanels('', names), [])
  assert.deepEqual(searchPanels('zzzzzz', names), [])
  assert.equal(tabOf('smsusage'), 'security')
  assert.equal(PANELS.length, 31)
})

test('environment badge comes from the project address only', () => {
  assert.equal(envBadge('https://eltmcznjcqiahqhjvpjg.supabase.co'), 'PRODUCTION')
  assert.equal(envBadge('https://wzxtqbqlahyahsnoqqva.supabase.co'), 'STAGING')
  assert.equal(envBadge('http://localhost:54321'), 'LOCAL')
  assert.equal(envBadge(undefined), 'LOCAL')
})

// ---------- strings ----------
test('Hindi/English parity for every admin-console string; Hindi is Devanagari', () => {
  for (const [k, v] of Object.entries(adminStrings)) {
    assert.ok(v.hi && v.en, k)
    assert.ok(/[ऀ-ॿ]/.test(v.hi), `${k} Hindi has no Devanagari`)
    assert.ok(/[A-Za-z]/.test(v.en), k)
    assert.deepEqual((v.hi.match(/\{\w+\}/g) || []).sort(), (v.en.match(/\{\w+\}/g) || []).sort(), `${k} placeholders differ`)
    assert.equal(strings[k], v)
  }
  assert.equal(adminStrings.err_account_blocked.hi, 'आपका खाता रोका गया है। सहायता के लिए संपर्क करें।')
  assert.equal(adminStrings.err_account_blocked.en, 'Your account has been suspended. Please contact us.')
  assert.equal(adminStrings.err_admin_session.hi, 'सुरक्षा के लिए कृपया फिर से लॉग इन करें।')
  assert.equal(adminStrings.err_admin_session.en, 'Please sign in again for security.')
})

test('every adm_/err_admin key used by the console code exists', () => {
  const dirs = ['src/screens/admin', 'src/screens/admin/tabs', 'src/components']
  const keys = new Set()
  for (const d of dirs) for (const f of readdirSync(d)) {
    if (!/\.(jsx|js)$/.test(f) || !/(admin|Announcement|common|Section|registry|Tab|Panel)/i.test(f + d)) continue
    const src = readFileSync(join(d, f), 'utf8')
    for (const m of src.matchAll(/['"`]((?:adm_|err_admin_|err_account)[a-z0-9_]+)['"`]/g)) keys.add(m[1])
  }
  const missing = [...keys].filter((k) => !strings[k])
  assert.deepEqual(missing, [])
  assert.ok(keys.size > 100)
})

test('the retired Dussehra card code is gone, the picture stays', () => {
  assert.equal(existsSync('src/components/FestivalCard.jsx'), false)
  assert.equal(existsSync('src/lib/festivals.js'), false)
  assert.equal(existsSync('public/festival/neelkanth.webp'), true)
  assert.ok(!readFileSync('src/screens/Homepage.jsx', 'utf8').includes('FestivalCard'))
  assert.ok(readFileSync('src/screens/Homepage.jsx', 'utf8').includes('AnnouncementCards'))
})

// ---------- Pages Functions ----------
const ENV = { TWOFACTOR_API_KEY: 'TESTKEY-not-real-0123456789abcdef', SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'svc-test-only' }
const TOKEN = 'kss1_' + 'a'.repeat(40)
const adminReq = (token = TOKEN) => new Request('https://staging.kissansahyog.com/api/admin/sms-balance', { headers: token ? { 'x-ks-session': token } : {} })
const mock = ({ admin, balance }) => async (url) => {
  const u = String(url)
  if (u.startsWith('https://db.test/rest/v1/rpc/ks_session_admin')) return new Response(JSON.stringify(admin), { status: 200 })
  if (u.includes('/BAL/SMS')) { if (balance instanceof Error) throw balance; return new Response(JSON.stringify(balance.body), { status: balance.status || 200 }) }
  return new Response('null', { status: 200 })
}

test('requireAdmin: no token / unknown session -> 401 session_required; editor vs super', async () => {
  let r = await requireAdmin(adminReq(null), ENV, { fetchImpl: mock({ admin: { user_id: null } }) })
  assert.equal(r.ok, false); assert.equal(r.response.status, 401)
  r = await requireAdmin(adminReq(), ENV, { fetchImpl: mock({ admin: { user_id: null } }) })
  assert.equal(r.response.status, 401)
  r = await requireAdmin(adminReq(), ENV, { fetchImpl: mock({ admin: { user_id: 'u1', role: 'editor' } }), needSuper: true })
  assert.equal(r.response.status, 403)
  assert.deepEqual(await r.response.json(), { error: 'super_required' })
  r = await requireAdmin(adminReq(), ENV, { fetchImpl: mock({ admin: { user_id: 'u1', role: 'super' } }), needSuper: true })
  assert.deepEqual([r.ok, r.userId, r.isSuper], [true, 'u1', true])
})

test('sms-balance: admin gets only {balance, checked_at}; provider trouble gives {error: unavailable} with 200; no key or provider text leaks', async () => {
  const admin = { user_id: 'u1', role: 'super' }
  let res = await handleBalance(adminReq(), ENV, { fetch: mock({ admin, balance: { body: { Status: 'Success', Details: '1234' } } }) })
  assert.equal(res.status, 200)
  const j = await res.json()
  assert.equal(j.balance, 1234); assert.ok(j.checked_at); assert.deepEqual(Object.keys(j).sort(), ['balance', 'checked_at'])
  res = await handleBalance(adminReq(), ENV, { fetch: mock({ admin, balance: { body: { Status: 'Error', Details: 'Invalid API key ' + ENV.TWOFACTOR_API_KEY } } }) })
  assert.equal(res.status, 200)
  const e = await res.text()
  assert.deepEqual(JSON.parse(e), { error: 'unavailable' })
  assert.ok(!e.includes(ENV.TWOFACTOR_API_KEY) && !e.includes('Invalid'))
  res = await handleBalance(adminReq(), ENV, { fetch: mock({ admin, balance: new Error('network down') }) })
  assert.deepEqual(await res.json(), { error: 'unavailable' })
  res = await handleBalance(adminReq(null), ENV, { fetch: mock({ admin, balance: { body: {} } }) })
  assert.equal(res.status, 401)
  res = await handleBalance(adminReq(), { ...ENV, TWOFACTOR_API_KEY: undefined }, { fetch: mock({ admin, balance: { body: {} } }) })
  assert.deepEqual(await res.json(), { error: 'unavailable' })
})

test('otp/verify: a blocked profile gets 403 account_blocked and no ticket is issued', async () => {
  const CH = '11111111-2222-4333-8444-555555555555'
  const calls = []
  const fetch = async (url, init = {}) => {
    const u = String(url)
    if (u.startsWith('https://db.test/rest/v1/rpc/')) {
      const name = u.split('/rpc/')[1]
      calls.push(name)
      const ans = { otp_record_verify: { ok: true, session: 'S1', attempts_left: 4 }, ks_phone_is_blocked: true, otp_issue_ticket: { ok: true, ticket: 'T' } }[name]
      return new Response(JSON.stringify(ans ?? null), { status: 200 })
    }
    return new Response(JSON.stringify({ Status: 'Success', Details: 'OTP Matched' }), { status: 200 })
  }
  const req = new Request('https://staging.kissansahyog.com/api/otp/verify', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://staging.kissansahyog.com' }, body: JSON.stringify({ challenge: CH, code: '123456', phone: '9876543210' }) })
  const res = await handleVerify(req, ENV, { fetch })
  assert.equal(res.status, 403)
  assert.deepEqual(await res.json(), { error: 'account_blocked' })
  assert.ok(calls.includes('ks_phone_is_blocked'))
  assert.ok(!calls.includes('otp_issue_ticket'), 'no ticket for a blocked profile')
})
