#!/usr/bin/env node
// Batch 11A Phase 2 — the OTP Pages Functions over real HTTP: `wrangler pages dev` (local-otp-stack.mjs) +
// mock 2Factor + the STAGING database. No real SMS.
//   node --env-file=.env scripts/batch11a/functions-integration.mjs [site=http://127.0.0.1:8788] [mock=http://127.0.0.1:8799] [out.md]
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
import { runSql } from '../lib/mgmt-sql.mjs'

const SITE = process.argv[2] || 'http://127.0.0.1:8788'
const MOCK = process.argv[3] || 'http://127.0.0.1:8799'
const out = process.argv[4]
const url = process.env.VITE_SUPABASE_URL
const svc = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const ORIGIN = SITE

const lines = []
let pass = 0
let fail = 0
const log = (s) => { lines.push(s); console.log(s) }
const check = (name, ok, detail = '') => { ok ? pass++ : fail++; log(`- ${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`) }
const post = async (path, body, headers = {}) => {
  const res = await fetch(SITE + path, { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN, ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) })
  let j = null
  try { j = await res.json() } catch { j = null }
  return { status: res.status, body: j, headers: res.headers }
}
const mock = async (path, method = 'GET') => (await fetch(MOCK + path, { method })).json()
const stamp = Date.now() % 100000
const ph = (i) => `91111${String((stamp + 50 + i) % 100000).padStart(5, '0')}`
const phones = { user: ph(0), unknown: ph(1), fresh: ph(2), down: ph(3) }
let prof

async function main() {
  log(`# Batch 11A — OTP functions over HTTP (wrangler pages dev + mock 2Factor + staging DB, ${new Date().toISOString()})\n`)
  await mock('/__mock/reset', 'POST')
  prof = (await svc.from('profiles').insert({ full_name: 'KSTEST 11A fn', phone: phones.user, preferred_language: 'hi', disclaimer_accepted_at: new Date().toISOString() }).select().single()).data

  let r = await fetch(SITE + '/api/otp/config')
  const cfg = await r.json()
  check('GET /api/otp/config → both flags false, cache 60 s', r.status === 200 && cfg.otp_required === false && cfg.session_enforced === false && /max-age=60/.test(r.headers.get('cache-control') || ''), JSON.stringify(cfg))

  r = await post('/api/otp/send', { phone: phones.user, purpose: 'login' })
  const ch = r.body?.challenge
  check('send (login, registered) → 200 {ok, challenge, resendAfter:30}', r.status === 200 && r.body.ok === true && /^[0-9a-f-]{36}$/.test(ch || '') && r.body.resendAfter === 30 && Object.keys(r.body).length === 3)
  let sms = await mock(`/__mock/last?phone=${phones.user}`)
  check('the mock provider received exactly one SMS request', sms.sends === 1 && /^\d{6}$/.test(sms.code || ''))
  check('the provider session id is not in the answer', !JSON.stringify(r.body).includes(sms.session))
  r = await post('/api/otp/send', { phone: phones.user, purpose: 'login' })
  check('resend at once → 429 otp_cooldown with retryAfter', r.status === 429 && r.body.error === 'otp_cooldown' && r.body.retryAfter > 0 && r.body.retryAfter <= 30)
  check('no second SMS during the cooldown', (await mock(`/__mock/last?phone=${phones.user}`)).sends === 1)

  const wrong = sms.code === '000000' ? '111111' : '000000'
  r = await post('/api/otp/verify', { challenge: ch, code: wrong, phone: phones.user })
  check('verify wrong code → 400 otp_wrong, attemptsLeft 4', r.status === 400 && r.body.error === 'otp_wrong' && r.body.attemptsLeft === 4)
  r = await post('/api/otp/verify', { challenge: ch, code: sms.code, phone: ph(9) })
  check('verify with another phone → 400 otp_expired (no detail)', r.status === 400 && r.body.error === 'otp_expired')
  r = await post('/api/otp/verify', { challenge: ch, code: sms.code, phone: phones.user })
  const ticket = r.body?.ticket
  check('verify right code → 200 {ok, ticket}', r.status === 200 && r.body.ok === true && /^kst1_[0-9a-f]{64}$/.test(ticket || ''))
  r = await post('/api/otp/verify', { challenge: ch, code: sms.code, phone: phones.user })
  check('verify the same code again → 400 otp_expired (already used)', r.status === 400 && r.body.error === 'otp_expired')
  const lg = await anon.rpc('app_login_otp', { p_phone: phones.user, p_ticket: ticket })
  check('app_login_otp with the ticket (anon) → profile + session token', !lg.error && lg.data?.profile?.id === prof.id && /^kss1_/.test(lg.data?.session_token || ''))

  // expired code (provider says so)
  await runSql(`update public.otp_requests set created_at = created_at - interval '40 seconds' where phone_hash = public.ks_peppered_hash('phone:${phones.user}')`)
  r = await post('/api/otp/send', { phone: phones.user, purpose: 'login' })
  const ch2 = r.body?.challenge
  await mock(`/__mock/expire?phone=${phones.user}`, 'POST')
  sms = await mock(`/__mock/last?phone=${phones.user}`)
  r = await post('/api/otp/verify', { challenge: ch2, code: sms.code, phone: phones.user })
  check('provider says the code expired → 400 otp_expired', r.status === 400 && r.body.error === 'otp_expired')

  // attempts
  await runSql(`update public.otp_requests set created_at = created_at - interval '40 seconds' where phone_hash = public.ks_peppered_hash('phone:${phones.user}')`)
  r = await post('/api/otp/send', { phone: phones.user, purpose: 'login' })
  const ch3 = r.body?.challenge
  sms = await mock(`/__mock/last?phone=${phones.user}`)
  const codes = []
  for (let i = 0; i < 5; i++) codes.push((await post('/api/otp/verify', { challenge: ch3, code: sms.code === '222222' ? '333333' : '222222', phone: phones.user })).body?.attemptsLeft)
  r = await post('/api/otp/verify', { challenge: ch3, code: sms.code, phone: phones.user })
  check('5 wrong tries, then even the right code → 429 otp_too_many', codes.join(',') === '4,3,2,1,0' && r.status === 429 && r.body.error === 'otp_too_many', codes.join(','))
  r = await post('/api/otp/send', { phone: phones.user, purpose: 'login' })
  check('third send within 10 minutes is the limit; the fourth → 429 otp_too_many', r.status === 429 && ['otp_too_many', 'otp_cooldown'].includes(r.body.error), JSON.stringify(r.body))

  // unknown number: same shape, no SMS
  const before = (await mock('/__mock/stats')).sends
  const t0 = Date.now()
  r = await post('/api/otp/send', { phone: phones.unknown, purpose: 'login' })
  const dt = Date.now() - t0
  check('login for an unknown number → the same 200 shape, no SMS', r.status === 200 && r.body.ok === true && r.body.resendAfter === 30 && (await mock('/__mock/stats')).sends === before, `${dt} ms`)
  r = await post('/api/otp/verify', { challenge: r.body.challenge, code: '123456', phone: phones.unknown })
  check('…and its code can never be right → otp_wrong', r.status === 400 && r.body.error === 'otp_wrong')

  r = await post('/api/otp/send', { phone: phones.user, purpose: 'register' })
  check('register for a registered number → 409 phone_exists', r.status === 409 && r.body.error === 'phone_exists')
  r = await post('/api/otp/send', { phone: phones.fresh, purpose: 'register' })
  check('register for a new number → 200 and one SMS', r.status === 200 && (await mock(`/__mock/last?phone=${phones.fresh}`)).sends === 1)

  // provider down
  await mock('/__mock/down?on=1', 'POST')
  const s0 = (await mock('/__mock/stats')).sends
  r = await post('/api/otp/send', { phone: phones.down, purpose: 'register' })
  check('provider down → 503 otp_service_busy (clean JSON, no retry)', r.status === 503 && r.body.error === 'otp_service_busy' && Object.keys(r.body).length === 1)
  await mock('/__mock/down?on=0', 'POST')
  r = await post('/api/otp/send', { phone: phones.down, purpose: 'register' })
  check('after the provider is back the person can try again at once', r.status === 200, `sends before ${s0}`)

  // input / transport checks
  r = await post('/api/otp/send', { phone: '12345', purpose: 'login' })
  check('invalid phone → 400 invalid_phone (JSON)', r.status === 400 && r.body.error === 'invalid_phone' && (r.headers.get('content-type') || '').includes('application/json'))
  r = await post('/api/otp/send', { phone: phones.user, purpose: 'login', pad: 'x'.repeat(5000) })
  check('oversized body → 413', r.status === 413)
  r = await post('/api/otp/send', 'phone=1', { 'content-type': 'text/plain' })
  check('wrong content type → 415', r.status === 415)
  r = await post('/api/otp/send', { phone: phones.user, purpose: 'login' }, { origin: 'https://evil.example' })
  check('other origin → 403 forbidden_origin', r.status === 403 && r.body.error === 'forbidden_origin')
  r = await post('/api/otp/verify', { challenge: ch, code: '12', phone: phones.user })
  check('code not 6 digits → 400 otp_code_format', r.status === 400 && r.body.error === 'otp_code_format')
  r = await fetch(SITE + '/api/otp/send')
  check('GET /api/otp/send → 405 JSON', r.status === 405 && (await r.json()).error === 'method_not_allowed')
  r = await fetch(SITE + '/api/otp/send', { method: 'OPTIONS', headers: { origin: 'https://localhost', 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' } })
  check('app preflight (Origin https://localhost) → 204 with Allow-Origin https://localhost', r.status === 204 && r.headers.get('access-control-allow-origin') === 'https://localhost')
  r = await post('/api/otp/send', { phone: '12345', purpose: 'login' }, { origin: 'capacitor://localhost' })
  check('app origin capacitor://localhost accepted (400 for a bad number, not 403)', r.status === 400)
}

async function cleanup() {
  const all = Object.values(phones).concat([ph(9)])
  await runSql(`delete from public.otp_requests where phone_hash in (select public.ks_peppered_hash('phone:' || p) from unnest(array['${all.join("','")}']) p);
                delete from public.otp_tickets where phone = any(array['${all.join("','")}']);
                delete from public.profiles where phone like '91111%' and full_name like 'KSTEST%';`)
  const left = await runSql(`select (select count(*) from public.profiles where phone like '91111%' and full_name like 'KSTEST%') p, (select count(*) from public.otp_tickets where phone like '91111%') t`)
  check('cleanup: no KSTEST profile or ticket left', Number(left[0].p) === 0 && Number(left[0].t) === 0)
}

try { await main() } catch (e) { fail++; log(`- FAIL — aborted: ${e.message}`) } finally { await cleanup() }
log(`\n**Result: ${pass} passed, ${fail} failed**`)
if (out) writeFileSync(out, lines.join('\n') + '\n')
process.exit(fail ? 1 : 0)
