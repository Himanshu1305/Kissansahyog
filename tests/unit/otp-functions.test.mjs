// Batch 11A Phase 2 — the OTP Pages Functions with a mocked 2Factor and a mocked database (no network).
// Run: node --test "tests/unit/*.test.mjs"
import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { handleSend } from '../../functions/api/otp/send.js'
import { handleVerify } from '../../functions/api/otp/verify.js'
import { handleConfig, _resetCache } from '../../functions/api/otp/config.js'
import { providerBase, PROVIDER_BASE } from '../../functions/lib/otp-core.js'

const KEY = 'TESTKEY-not-a-real-key-0123456789abcdef'
const SVC = 'svc-role-key-for-tests-only'
const ENV = { TWOFACTOR_API_KEY: KEY, SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: SVC }
const CH = '11111111-2222-4333-8444-555555555555'
const noSleep = async () => {}

// Mock world: db rpc answers by name, provider answers by path kind. Records every call.
function world({ rate, record = {}, verify, ticket, flags, send, check } = {}) {
  const calls = { rpc: [], provider: [] }
  const fetch = async (url, init = {}) => {
    const u = String(url)
    if (u.startsWith('https://db.test/rest/v1/rpc/')) {
      const name = u.split('/rpc/')[1]
      const args = JSON.parse(init.body || '{}')
      calls.rpc.push({ name, args, auth: init.headers?.authorization })
      const answer = { otp_rate_check: rate, otp_record_send: record, otp_record_verify: verify, otp_issue_ticket: ticket, get_auth_flags: flags }[name]
      if (answer instanceof Error) throw answer
      if (answer && answer.__status) return new Response(JSON.stringify(answer.body || {}), { status: answer.__status })
      return new Response(JSON.stringify(answer ?? null), { status: 200 })
    }
    calls.provider.push(u)
    const kind = u.includes('/SMS/VERIFY/') ? check : send
    if (kind instanceof Error) throw kind
    return new Response(JSON.stringify(kind?.body ?? {}), { status: kind?.status ?? 200 })
  }
  return { fetch, calls }
}

const req = (path, body, headers = {}) => new Request(`https://staging.kissansahyog.com${path}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: 'https://staging.kissansahyog.com', 'cf-connecting-ip': '198.51.100.7', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
})
const read = async (res) => ({ status: res.status, body: await res.json() })

// Every console line produced during a test (to prove nothing secret is logged).
let logged = []
const orig = { warn: console.warn, log: console.log, error: console.error }
beforeEach(() => { logged = []; for (const k of Object.keys(orig)) console[k] = (...a) => logged.push(a.join(' ')) })
afterEach(() => { Object.assign(console, orig) })
const assertCleanLogs = () => {
  for (const l of logged) {
    assert.ok(!l.includes(KEY), 'API key in a log line')
    assert.ok(!l.includes(SVC), 'service key in a log line')
    assert.ok(!/https?:\/\//.test(l), `URL in a log line: ${l}`)
    assert.ok(!/\d{10}/.test(l), `full phone number in a log line: ${l}`)
  }
}

// ---------------- send ----------------
test('send: success → 200 {ok, challenge, resendAfter:30}; session id stored, never returned', async () => {
  const w = world({ rate: { ok: true, request_id: CH, send: true }, send: { body: { Status: 'Success', Details: 'PROVIDER-SESSION-1' } } })
  const r = await read(await handleSend(req('/api/otp/send', { phone: '9876543210', purpose: 'login' }), ENV, { fetch: w.fetch, sleep: noSleep }))
  assert.deepEqual(r, { status: 200, body: { ok: true, challenge: CH, resendAfter: 30 } })
  assert.equal(w.calls.provider.length, 1)
  assert.ok(w.calls.provider[0].startsWith(`${PROVIDER_BASE}/`) && w.calls.provider[0].endsWith('/SMS/9876543210/AUTOGEN/Kisan_Sahyog_OTP_v3'))
  const rec = w.calls.rpc.find((c) => c.name === 'otp_record_send')
  assert.deepEqual(rec.args, { p_request_id: CH, p_twofactor_session: 'PROVIDER-SESSION-1' })
  assert.deepEqual(w.calls.rpc[0].args, { p_phone: '9876543210', p_ip: '198.51.100.7', p_purpose: 'login' })
  assert.ok(!JSON.stringify(r.body).includes('PROVIDER-SESSION-1'))
  assertCleanLogs()
})

// Batch 11B: the login decoy is replaced by an honest 409 phone_not_registered.
test('send: unknown number on login → 409 phone_not_registered, zero provider calls, no wait, logs last 2 digits only', async () => {
  const w = world({ rate: { ok: true, request_id: CH, send: false } })
  let waited = 0
  const t0 = Date.now()
  const r = await read(await handleSend(req('/api/otp/send', { phone: '98765' + '43210', purpose: 'login' }), ENV, { fetch: w.fetch, sleep: async (ms) => { waited += ms } }))
  assert.deepEqual(r, { status: 409, body: { error: 'phone_not_registered' } })
  assert.equal(w.calls.provider.length, 0, 'no SMS')
  assert.equal(waited, 0, 'no artificial wait')
  assert.ok(Date.now() - t0 < 300, 'answered at once')
  assert.deepEqual(w.calls.rpc.map((c) => c.name), ['otp_rate_check'], 'rate check still runs (its row counts); nothing recorded as sent')
  assert.ok(!JSON.stringify(r.body).includes(CH), 'no challenge handed out')
  assertCleanLogs()
  assert.ok(logged.some((l) => l.includes('login_unknown_phone') && l.includes('**10')))
})

test('send: an admin number on login gets the SAME 409 phone_not_registered (does not reveal an admin), no SMS', async () => {
  // otp_rate_check answers send:false for an admin's number exactly as for an unknown one.
  const w = world({ rate: { ok: true, request_id: CH, send: false } })
  const r = await read(await handleSend(req('/api/otp/send', { phone: '91234' + '56780', purpose: 'login' }), ENV, { fetch: w.fetch, sleep: noSleep }))
  assert.deepEqual(r, { status: 409, body: { error: 'phone_not_registered' } })
  assert.equal(w.calls.provider.length, 0)
  assertCleanLogs()
})

test('send: 3 quick tries on one unknown number → 409, then the cooldown / too-many answer (rate rows still count)', async () => {
  // Small model of otp_rate_check's per-phone rules: every reserved row (decoy rows included) counts.
  const rows = []
  const fetch = async (url, init = {}) => {
    const u = String(url)
    if (!u.includes('/rpc/otp_rate_check')) throw new Error(`unexpected call ${u.split('/rpc/')[1] || 'provider'}`)
    const n = rows.length
    if (n >= 3) return new Response(JSON.stringify({ ok: false, reason: 'too_many', retry_after: 600 }))
    if (n >= 1) return new Response(JSON.stringify({ ok: false, reason: 'cooldown', retry_after: 30 }))
    rows.push(JSON.parse(init.body).p_phone)
    return new Response(JSON.stringify({ ok: true, request_id: CH, send: false }))
  }
  const answers = []
  for (let i = 0; i < 3; i++) answers.push(await read(await handleSend(req('/api/otp/send', { phone: '98765' + '43210', purpose: 'login' }), ENV, { fetch, sleep: noSleep })))
  assert.deepEqual(answers[0], { status: 409, body: { error: 'phone_not_registered' } })
  assert.deepEqual(answers[1], { status: 429, body: { error: 'otp_cooldown', retryAfter: 30 } })
  assert.deepEqual(answers[2], { status: 429, body: { error: 'otp_cooldown', retryAfter: 30 } })
  assert.equal(rows.length, 1)
})

test('send: provider down → 503 otp_service_busy, exactly ONE provider call (no credit-burning retry), marked failed', async () => {
  for (const send of [new TypeError('network'), { status: 500, body: { Status: 'Error', Details: 'Internal' } }, { status: 200, body: { Status: 'Error', Details: 'Invalid API Key' } }]) {
    const w = world({ rate: { ok: true, request_id: CH, send: true }, send })
    const r = await read(await handleSend(req('/api/otp/send', { phone: '9876543210', purpose: 'register' }), ENV, { fetch: w.fetch, sleep: noSleep }))
    assert.deepEqual(r, { status: 503, body: { error: 'otp_service_busy' } })
    assert.equal(w.calls.provider.length, 1)
    assert.deepEqual(w.calls.rpc.find((c) => c.name === 'otp_record_send').args, { p_request_id: CH, p_twofactor_session: null })
  }
  assertCleanLogs()
  assert.ok(logged.some((l) => l.includes('provider_failed') && l.includes('**10')), 'logs only the last 2 digits')
})

test('send: rate limits → 429 with retryAfter; phone_exists → 409; no provider call', async () => {
  for (const [rate, expect] of [
    [{ ok: false, reason: 'cooldown', retry_after: 17 }, { status: 429, body: { error: 'otp_cooldown', retryAfter: 17 } }],
    [{ ok: false, reason: 'too_many', retry_after: 420 }, { status: 429, body: { error: 'otp_too_many', retryAfter: 420 } }],
    [{ ok: false, reason: 'phone_exists' }, { status: 409, body: { error: 'phone_exists' } }],
  ]) {
    const w = world({ rate })
    const res = await handleSend(req('/api/otp/send', { phone: '9876543210', purpose: 'register' }), ENV, { fetch: w.fetch, sleep: noSleep })
    assert.deepEqual(await read(res), expect)
    if (expect.status === 429) assert.equal(res.headers.get('retry-after'), String(expect.body.retryAfter))
    assert.equal(w.calls.provider.length, 0)
  }
})

test('send: malformed input → 400, nothing called', async () => {
  const bad = [
    [{ phone: '98765', purpose: 'login' }, 'invalid_phone'], [{ phone: '1234567890', purpose: 'login' }, 'invalid_phone'],
    [{ phone: '+919876543210', purpose: 'login' }, 'invalid_phone'], [{ phone: 9876543210, purpose: 'login' }, 'invalid_phone'],
    [{ phone: '9876543210', purpose: 'reset' }, 'bad_request'], [{ phone: '9876543210' }, 'bad_request'],
    ['not json', 'bad_request'], ['[1,2]', 'bad_request'],
  ]
  for (const [body, error] of bad) {
    const w = world({})
    const r = await read(await handleSend(req('/api/otp/send', body), ENV, { fetch: w.fetch }))
    assert.deepEqual(r, { status: 400, body: { error } }, JSON.stringify(body))
    assert.equal(w.calls.rpc.length + w.calls.provider.length, 0)
  }
})

test('send: oversized body → 413; wrong content type → 415', async () => {
  const w = world({})
  let r = await handleSend(req('/api/otp/send', { phone: '9876543210', purpose: 'login', pad: 'x'.repeat(2000) }), ENV, { fetch: w.fetch })
  assert.equal(r.status, 413)
  r = await handleSend(req('/api/otp/send', 'phone=9876543210', { 'content-type': 'application/x-www-form-urlencoded' }), ENV, { fetch: w.fetch })
  assert.equal(r.status, 415)
  assert.equal(w.calls.rpc.length, 0)
})

test('send: origin refusal (other site, no origin) → 403; our domains and the app origins accepted', async () => {
  for (const origin of ['https://evil.example', 'https://kissansahyog.com.evil.example', 'null']) {
    const w = world({})
    const r = await handleSend(req('/api/otp/send', { phone: '9876543210', purpose: 'login' }, { origin }), ENV, { fetch: w.fetch })
    assert.equal(r.status, 403, origin)
  }
  const noOrigin = new Request('https://staging.kissansahyog.com/api/otp/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"phone":"9876543210","purpose":"login"}' })
  assert.equal((await handleSend(noOrigin, ENV, { fetch: world({}).fetch })).status, 403)
  for (const origin of ['https://kissansahyog.com', 'https://www.kissansahyog.com', 'https://staging.kissansahyog.com', 'https://localhost', 'capacitor://localhost', 'http://localhost:8788']) {
    const w = world({ rate: { ok: false, reason: 'cooldown', retry_after: 5 } })
    const r = await handleSend(req('/api/otp/send', { phone: '9876543210', purpose: 'login' }, { origin }), ENV, { fetch: w.fetch })
    assert.equal(r.status, 429, origin)
  }
})

test('send: not configured (no key / no service key) → 503 otp_unavailable, nothing sent', async () => {
  for (const env of [{ ...ENV, TWOFACTOR_API_KEY: undefined }, { ...ENV, SUPABASE_SERVICE_ROLE_KEY: undefined }]) {
    const w = world({ rate: { ok: true, request_id: CH, send: true } })
    const r = await read(await handleSend(req('/api/otp/send', { phone: '9876543210', purpose: 'login' }), env, { fetch: w.fetch }))
    assert.deepEqual(r, { status: 503, body: { error: 'otp_unavailable' } })
    assert.equal(w.calls.provider.length + w.calls.rpc.length, 0)
  }
  assertCleanLogs()
})

test('send: database down → 503 otp_unavailable, no SMS', async () => {
  const w = world({ rate: new TypeError('db down') })
  const r = await read(await handleSend(req('/api/otp/send', { phone: '9876543210', purpose: 'login' }), ENV, { fetch: w.fetch }))
  assert.deepEqual(r, { status: 503, body: { error: 'otp_unavailable' } })
  assert.equal(w.calls.provider.length, 0)
})

// ---------------- verify ----------------
const vbody = (code = '123456') => ({ challenge: CH, code, phone: '9876543210' })

test('verify: code matched → 200 {ok, ticket}; attempt counted before the provider call', async () => {
  const w = world({ verify: { ok: true, session: 'PROVIDER-SESSION-1', attempts_left: 4 }, check: { body: { Status: 'Success', Details: 'OTP Matched' } }, ticket: { ok: true, ticket: 'kst1_abc' } })
  const r = await read(await handleVerify(req('/api/otp/verify', vbody()), ENV, { fetch: w.fetch }))
  assert.deepEqual(r, { status: 200, body: { ok: true, ticket: 'kst1_abc' } })
  assert.deepEqual(w.calls.rpc.map((c) => c.name), ['otp_record_verify', 'otp_issue_ticket'])
  assert.ok(w.calls.provider[0].endsWith('/SMS/VERIFY/PROVIDER-SESSION-1/123456'))
  assertCleanLogs()
})

test('verify: wrong code → 400 otp_wrong with attemptsLeft, no ticket', async () => {
  const w = world({ verify: { ok: true, session: 'S', attempts_left: 2 }, check: { status: 400, body: { Status: 'Error', Details: 'OTP Mismatch' } } })
  const r = await read(await handleVerify(req('/api/otp/verify', vbody('000000')), ENV, { fetch: w.fetch }))
  assert.deepEqual(r, { status: 400, body: { error: 'otp_wrong', attemptsLeft: 2 } })
  assert.equal(w.calls.rpc.filter((c) => c.name === 'otp_issue_ticket').length, 0)
})

test('verify: decoy (no SMS was sent) → otp_wrong, provider never asked', async () => {
  const w = world({ verify: { ok: true, session: null, attempts_left: 4 } })
  const r = await read(await handleVerify(req('/api/otp/verify', vbody()), ENV, { fetch: w.fetch }))
  assert.deepEqual(r, { status: 400, body: { error: 'otp_wrong', attemptsLeft: 4 } })
  assert.equal(w.calls.provider.length, 0)
})

test('verify: expired (provider, or our request) → 400 otp_expired', async () => {
  let w = world({ verify: { ok: true, session: 'S', attempts_left: 3 }, check: { status: 400, body: { Status: 'Error', Details: 'OTP Expired' } } })
  assert.deepEqual(await read(await handleVerify(req('/api/otp/verify', vbody()), ENV, { fetch: w.fetch })), { status: 400, body: { error: 'otp_expired' } })
  w = world({ verify: { ok: false, reason: 'expired' } })
  assert.deepEqual(await read(await handleVerify(req('/api/otp/verify', vbody()), ENV, { fetch: w.fetch })), { status: 400, body: { error: 'otp_expired' } })
  assert.equal(w.calls.provider.length, 0)
  w = world({ verify: { ok: false, reason: 'invalid' } })
  assert.deepEqual(await read(await handleVerify(req('/api/otp/verify', vbody()), ENV, { fetch: w.fetch })), { status: 400, body: { error: 'otp_expired' } })
})

test('verify: attempt limit → 429 otp_too_many, provider never asked', async () => {
  const w = world({ verify: { ok: false, reason: 'too_many' } })
  assert.deepEqual(await read(await handleVerify(req('/api/otp/verify', vbody()), ENV, { fetch: w.fetch })), { status: 429, body: { error: 'otp_too_many' } })
  assert.equal(w.calls.provider.length, 0)
})

test('verify: provider down → 503 otp_service_busy, one call, no ticket', async () => {
  const w = world({ verify: { ok: true, session: 'S', attempts_left: 3 }, check: new TypeError('network') })
  assert.deepEqual(await read(await handleVerify(req('/api/otp/verify', vbody()), ENV, { fetch: w.fetch })), { status: 503, body: { error: 'otp_service_busy' } })
  assert.equal(w.calls.provider.length, 1)
  assertCleanLogs()
})

test('verify: malformed input → 400, nothing called', async () => {
  for (const [body, error] of [
    [{ ...vbody(), code: '12345' }, 'otp_code_format'], [{ ...vbody(), code: '12345a' }, 'otp_code_format'], [{ ...vbody(), code: 123456 }, 'otp_code_format'],
    [{ ...vbody(), challenge: 'x' }, 'bad_request'], [{ ...vbody(), phone: '12' }, 'invalid_phone'],
  ]) {
    const w = world({})
    assert.deepEqual(await read(await handleVerify(req('/api/otp/verify', body), ENV, { fetch: w.fetch })), { status: 400, body: { error } })
    assert.equal(w.calls.rpc.length + w.calls.provider.length, 0)
  }
  const w = world({})
  assert.equal((await handleVerify(req('/api/otp/verify', { ...vbody(), pad: 'y'.repeat(3000) }), ENV, { fetch: w.fetch })).status, 413)
  assert.equal((await handleVerify(req('/api/otp/verify', vbody(), { origin: 'https://evil.example' }), ENV, { fetch: w.fetch })).status, 403)
})

// ---------------- config + test override ----------------
test('config: flags from get_auth_flags, cached 60 s', async () => {
  _resetCache()
  let t = 1_000_000
  const w = world({ flags: { otp_required: false, session_enforced: false } })
  const r1 = await handleConfig(ENV, { fetch: w.fetch, now: () => t })
  assert.deepEqual(await r1.json(), { otp_required: false, session_enforced: false })
  assert.equal(r1.headers.get('cache-control'), 'public, max-age=60')
  t += 59_000
  await handleConfig(ENV, { fetch: w.fetch, now: () => t })
  assert.equal(w.calls.rpc.length, 1, 'served from cache within 60 s')
  t += 2_000
  await handleConfig(ENV, { fetch: w.fetch, now: () => t })
  assert.equal(w.calls.rpc.length, 2, 'asked again after 60 s')
  _resetCache()
  const down = world({ flags: { __status: 500 } })
  assert.equal((await handleConfig(ENV, { fetch: down.fetch, now: () => t })).status, 503)
  _resetCache()
})

test('TWOFACTOR_BASE_URL is used ONLY when ENVIRONMENT === "test"', async () => {
  assert.equal(providerBase({ TWOFACTOR_BASE_URL: 'http://127.0.0.1:9' }), PROVIDER_BASE)
  assert.equal(providerBase({ ENVIRONMENT: 'production', TWOFACTOR_BASE_URL: 'http://127.0.0.1:9' }), PROVIDER_BASE)
  assert.equal(providerBase({ ENVIRONMENT: 'preview', TWOFACTOR_BASE_URL: 'http://127.0.0.1:9' }), PROVIDER_BASE)
  assert.equal(providerBase({ ENVIRONMENT: 'test', TWOFACTOR_BASE_URL: 'http://127.0.0.1:9/' }), 'http://127.0.0.1:9')
  // end to end: without ENVIRONMENT=test the real provider address is called even if the override is set
  const w = world({ rate: { ok: true, request_id: CH, send: true }, send: { body: { Status: 'Success', Details: 'S' } } })
  await handleSend(req('/api/otp/send', { phone: '9876543210', purpose: 'login' }), { ...ENV, TWOFACTOR_BASE_URL: 'http://127.0.0.1:9' }, { fetch: w.fetch })
  assert.ok(w.calls.provider[0].startsWith('https://2factor.in/API/V1/'))
  const w2 = world({ rate: { ok: true, request_id: CH, send: true }, send: { body: { Status: 'Success', Details: 'S' } } })
  await handleSend(req('/api/otp/send', { phone: '9876543210', purpose: 'login' }), { ...ENV, ENVIRONMENT: 'test', TWOFACTOR_BASE_URL: 'http://127.0.0.1:9' }, { fetch: w2.fetch })
  assert.ok(w2.calls.provider[0].startsWith('http://127.0.0.1:9/'))
})
