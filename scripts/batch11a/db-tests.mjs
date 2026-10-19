#!/usr/bin/env node
// Batch 11A Phase 1 — STAGING tests of migration 0066 through the REAL RPCs.
//   node --env-file=.env scripts/check-staging-env.mjs && node --env-file=.env scripts/batch11a/db-tests.mjs [out.md]
// Anon key for everything a browser can call; the service role only for what the Pages Functions call
// (otp_* helpers), setup and cleanup; the Management API (postgres) only to flip the two flags, to move
// timestamps into the past (expiry / limits) and for read-back checks. KSTEST profiles use the 91111xxxxx
// range (not the e2e 90000 range, whose teardown may run at the same time). Both flags are set back to
// FALSE at the end, whatever happens, and everything created is deleted.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
import { runSql } from '../lib/mgmt-sql.mjs'

const url = process.env.VITE_SUPABASE_URL || ''
if (!/wzxtqbqlahyahsnoqqva/.test(url) || /eltmcznjcqiahqhjvpjg/.test(url)) { console.error('not staging — refusing'); process.exit(2) }
const ANON = process.env.VITE_SUPABASE_ANON_KEY
const svc = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const client = (token) => createClient(url, ANON, { auth: { persistSession: false }, global: { headers: token ? { 'x-ks-session': token } : {} } })
const anon = client(null)
const out = process.argv[2]

const lines = []
let pass = 0
let fail = 0
const log = (s) => { lines.push(s); console.log(s) }
const check = (name, ok, detail = '') => { ok ? pass++ : fail++; log(`- ${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`) }
const code = (e) => (e ? String(e.message || '').trim() : null)
const raised = (r, c) => !!r.error && code(r.error).includes(c)

const stamp = Date.now() % 100000
const ph = (i) => `91111${String((stamp + i) % 100000).padStart(5, '0')}`
const phones = { a: ph(0), b: ph(1), admin: ph(2), unknown: ph(3), reg: ph(4), reg2: ph(5), lim: ph(6), day: ph(7), ipa: ph(8), ipb: ph(9) }
const ip = `198.51.100.${stamp % 250}` // documentation range
const prof = {}
const authUsers = []

const setFlags = (otp, sess) => runSql(`update public.site_settings set value = '${otp}'::jsonb, updated_at = now() where key = 'otp_required';
  update public.site_settings set value = '${sess}'::jsonb, updated_at = now() where key = 'session_enforced';`)
const hashOf = async (v) => (await runSql(`select public.ks_peppered_hash('${v}') h`))[0].h

async function mkProfile(role, extra = {}) {
  const { data, error } = await svc.from('profiles').insert({
    full_name: `KSTEST 11A ${role}`, phone: phones[role], village_town: 'Sagar', pincode: '470001',
    latitude: 23.8388, longitude: 78.7378, preferred_language: 'hi', disclaimer_accepted_at: new Date().toISOString(), ...extra,
  }).select().single()
  if (error) throw new Error(`profile ${role}: ${error.message}`)
  prof[role] = data
  return data
}

// The Pages Function's path, without the provider: reserve → (provider) → record → verify → ticket.
async function otpTicket(phone, purpose, session = 'KSTEST-2f-session') {
  const r = await svc.rpc('otp_rate_check', { p_phone: phone, p_ip: ip, p_purpose: purpose })
  if (r.error || !r.data.ok) throw new Error(`rate_check ${phone}: ${code(r.error) || JSON.stringify(r.data)}`)
  await svc.rpc('otp_record_send', { p_request_id: r.data.request_id, p_twofactor_session: r.data.send ? session : null })
  const v = await svc.rpc('otp_record_verify', { p_request_id: r.data.request_id, p_phone: phone })
  const t = await svc.rpc('otp_issue_ticket', { p_request_id: r.data.request_id, p_phone: phone })
  return { request: r.data, verify: v.data, ticket: t.data?.ticket, issue: t.data }
}
const clearOtp = async (phone) => runSql(`delete from public.otp_requests where phone_hash = public.ks_peppered_hash('phone:${phone}'); delete from public.otp_tickets where phone = '${phone}';`)

async function main() {
  log(`# Batch 11A — DB tests of migration 0066 (staging, ${new Date().toISOString()})\n`)
  await setFlags(false, false)
  await mkProfile('a'); await mkProfile('b'); await mkProfile('admin', { is_admin: true })

  log('\n## Flags and privileges')
  let r = await anon.rpc('get_auth_flags')
  check('get_auth_flags (anon) → both false', !r.error && r.data.otp_required === false && r.data.session_enforced === false, JSON.stringify(r.data))
  r = await anon.rpc('otp_rate_check', { p_phone: phones.a, p_ip: ip, p_purpose: 'login' })
  check('anon cannot call otp_rate_check', !!r.error)
  r = await anon.rpc('otp_issue_ticket', { p_request_id: '00000000-0000-0000-0000-000000000000', p_phone: phones.a })
  check('anon cannot call otp_issue_ticket', !!r.error)
  r = await anon.rpc('require_actor', { p_actor_id: prof.a.id })
  check('anon cannot call require_actor', !!r.error)
  for (const t of ['otp_requests', 'otp_tickets', 'app_sessions', 'auth_private']) {
    const s = await anon.from(t).select('*').limit(1)
    check(`anon cannot read ${t}`, !!s.error || (s.data || []).length === 0, code(s.error) || `${(s.data || []).length} rows`)
  }
  r = await anon.rpc('app_issue_session')
  check('anon cannot call app_issue_session', !!r.error)

  log('\n## Rate limits (otp_rate_check)')
  r = await svc.rpc('otp_rate_check', { p_phone: phones.lim, p_ip: ip, p_purpose: 'register' })
  check('first send allowed (register, new number)', r.data?.ok === true && r.data.send === true)
  r = await svc.rpc('otp_rate_check', { p_phone: phones.lim, p_ip: ip, p_purpose: 'register' })
  check('immediate resend → cooldown, retry_after 1–30 s', r.data?.ok === false && r.data.reason === 'cooldown' && r.data.retry_after >= 1 && r.data.retry_after <= 30, JSON.stringify(r.data))
  const limH = await hashOf(`phone:${phones.lim}`)
  await runSql(`update public.otp_requests set created_at = created_at - interval '31 seconds' where phone_hash = '${limH}'`)
  r = await svc.rpc('otp_rate_check', { p_phone: phones.lim, p_ip: ip, p_purpose: 'register' })
  check('after 31 s: second send allowed', r.data?.ok === true)
  await runSql(`update public.otp_requests set created_at = created_at - interval '31 seconds' where phone_hash = '${limH}'`)
  r = await svc.rpc('otp_rate_check', { p_phone: phones.lim, p_ip: ip, p_purpose: 'register' })
  check('third send in 10 min allowed', r.data?.ok === true)
  await runSql(`update public.otp_requests set created_at = created_at - interval '31 seconds' where phone_hash = '${limH}'`)
  r = await svc.rpc('otp_rate_check', { p_phone: phones.lim, p_ip: ip, p_purpose: 'register' })
  check('fourth send in 10 min → too_many', r.data?.ok === false && r.data.reason === 'too_many', JSON.stringify(r.data))
  // a failed provider call does not count against cooldown / 10-minute limit
  await clearOtp(phones.lim)
  r = await svc.rpc('otp_rate_check', { p_phone: phones.lim, p_ip: ip, p_purpose: 'register' })
  await svc.rpc('otp_record_send', { p_request_id: r.data.request_id, p_twofactor_session: null })
  r = await svc.rpc('otp_rate_check', { p_phone: phones.lim, p_ip: ip, p_purpose: 'register' })
  check('after a provider failure the person can retry at once (no cooldown)', r.data?.ok === true, JSON.stringify(r.data))
  // per day: 10 in 24 h
  const dayH = await hashOf(`phone:${phones.day}`)
  await runSql(`insert into public.otp_requests (phone_hash, ip_hash, purpose, send_state, created_at)
                select '${dayH}', 'kstest', 'register', 'sent', now() - (g || ' hours')::interval from generate_series(1, 10) g`)
  r = await svc.rpc('otp_rate_check', { p_phone: phones.day, p_ip: ip, p_purpose: 'register' })
  check('11th send in 24 h → too_many', r.data?.ok === false && r.data.reason === 'too_many', JSON.stringify(r.data))
  // per IP: 20 per hour
  const ipX = `203.0.113.${stamp % 250}`
  const ipH = await hashOf(`ip:${ipX}`)
  await runSql(`insert into public.otp_requests (phone_hash, ip_hash, purpose, send_state, created_at)
                select 'kstest-ip-' || g, '${ipH}', 'register', 'sent', now() - (g || ' minutes')::interval from generate_series(1, 20) g`)
  r = await svc.rpc('otp_rate_check', { p_phone: phones.ipa, p_ip: ipX, p_purpose: 'register' })
  check('21st send from one IP in 1 h (new number) → too_many', r.data?.ok === false && r.data.reason === 'too_many', JSON.stringify(r.data))
  r = await svc.rpc('otp_rate_check', { p_phone: phones.ipb, p_ip: ip, p_purpose: 'register' })
  check('another IP is not affected', r.data?.ok === true)
  r = await svc.rpc('otp_rate_check', { p_phone: phones.a, p_ip: ip, p_purpose: 'register' })
  check('register for a registered number → phone_exists (no row)', r.data?.ok === false && r.data.reason === 'phone_exists')
  r = await svc.rpc('otp_rate_check', { p_phone: '12345', p_ip: ip, p_purpose: 'login' })
  check('malformed number → invalid_phone', raised(r, 'invalid_phone'))
  r = await svc.rpc('otp_rate_check', { p_phone: phones.a, p_ip: ip, p_purpose: 'reset' })
  check('unknown purpose → invalid_purpose', raised(r, 'invalid_purpose'))

  log('\n## Login eligibility (same answer, decoy for numbers that may not sign in)')
  r = await svc.rpc('otp_rate_check', { p_phone: phones.a, p_ip: ip, p_purpose: 'login' })
  check('login, registered farmer → ok, send true', r.data?.ok === true && r.data.send === true)
  r = await svc.rpc('otp_rate_check', { p_phone: phones.unknown, p_ip: ip, p_purpose: 'login' })
  const decoy = r.data
  check('login, unknown number → ok (same shape), send false', r.data?.ok === true && r.data.send === false && !!r.data.request_id)
  r = await svc.rpc('otp_rate_check', { p_phone: phones.admin, p_ip: ip, p_purpose: 'login' })
  check('login, admin number → ok (same shape), send false', r.data?.ok === true && r.data.send === false)
  await svc.rpc('otp_record_send', { p_request_id: decoy.request_id, p_twofactor_session: null })
  r = await svc.rpc('otp_record_verify', { p_request_id: decoy.request_id, p_phone: phones.unknown })
  check('a decoy can never be verified (no provider session)', r.data?.ok === true && r.data.session == null, JSON.stringify(r.data))
  r = await svc.rpc('otp_issue_ticket', { p_request_id: decoy.request_id, p_phone: phones.unknown })
  check('a decoy never gets a ticket', r.data?.ok === false)
  await clearOtp(phones.a); await clearOtp(phones.unknown); await clearOtp(phones.admin)

  log('\n## Verify attempts, expiry, ticket')
  r = await svc.rpc('otp_rate_check', { p_phone: phones.a, p_ip: ip, p_purpose: 'login' })
  const req = r.data.request_id
  let v = await svc.rpc('otp_record_verify', { p_request_id: req, p_phone: phones.a })
  check('verify before the SMS was recorded → expired', v.data?.ok === false && v.data.reason === 'expired')
  await svc.rpc('otp_record_send', { p_request_id: req, p_twofactor_session: 'KSTEST-2f-session' })
  v = await svc.rpc('otp_record_verify', { p_request_id: req, p_phone: phones.b })
  check('verify with the wrong phone → invalid', v.data?.ok === false && v.data.reason === 'invalid')
  v = await svc.rpc('otp_record_verify', { p_request_id: '00000000-0000-0000-0000-000000000000', p_phone: phones.a })
  check('verify of an unknown challenge → invalid', v.data?.ok === false && v.data.reason === 'invalid')
  const seen = []
  for (let i = 0; i < 5; i++) { v = await svc.rpc('otp_record_verify', { p_request_id: req, p_phone: phones.a }); seen.push(v.data?.attempts_left) }
  check('5 attempts allowed, provider session handed back', seen.join(',') === '4,3,2,1,0' && v.data.session === 'KSTEST-2f-session', seen.join(','))
  v = await svc.rpc('otp_record_verify', { p_request_id: req, p_phone: phones.a })
  check('6th attempt → too_many', v.data?.ok === false && v.data.reason === 'too_many')
  await clearOtp(phones.a)
  r = await svc.rpc('otp_rate_check', { p_phone: phones.a, p_ip: ip, p_purpose: 'login' })
  await svc.rpc('otp_record_send', { p_request_id: r.data.request_id, p_twofactor_session: 'KSTEST-2f-session' })
  await runSql(`update public.otp_requests set expires_at = now() - interval '1 second' where id = '${r.data.request_id}'`)
  v = await svc.rpc('otp_record_verify', { p_request_id: r.data.request_id, p_phone: phones.a })
  check('expired OTP request → expired', v.data?.ok === false && v.data.reason === 'expired')
  const t1 = await svc.rpc('otp_issue_ticket', { p_request_id: r.data.request_id, p_phone: phones.a })
  check('expired OTP request gets no ticket', t1.data?.ok === false)
  await clearOtp(phones.a)

  let tk = await otpTicket(phones.a, 'login')
  check('verified OTP → ticket issued', typeof tk.ticket === 'string' && tk.ticket.length >= 64)
  const again = await svc.rpc('otp_issue_ticket', { p_request_id: tk.request.request_id, p_phone: phones.a })
  check('second ticket for the same OTP → refused', again.data?.ok === false)
  const stored = await runSql(`select count(*) n from public.otp_tickets where token_hash = public.ks_token_hash('${tk.ticket}') and phone = '${phones.a}'`)
  const raw = await runSql(`select count(*) n from public.otp_tickets where token_hash = '${tk.ticket}'`)
  check('only the ticket hash is stored', Number(stored[0].n) === 1 && Number(raw[0].n) === 0)

  log('\n## app_login_otp')
  r = await anon.rpc('app_login_otp', { p_phone: phones.b, p_ticket: tk.ticket })
  check('ticket for another phone → otp_invalid', raised(r, 'otp_invalid'))
  r = await anon.rpc('app_login_otp', { p_phone: phones.a, p_ticket: 'kst1_' + 'f'.repeat(64) })
  check('random ticket → otp_invalid', raised(r, 'otp_invalid'))
  r = await anon.rpc('app_login_otp', { p_phone: phones.a, p_ticket: tk.ticket })
  const tokA = r.data?.session_token
  check('valid ticket → profile + session token', !r.error && r.data?.profile?.id === prof.a.id && /^kss1_[0-9a-f]{64}$/.test(tokA || ''))
  const sessStored = await runSql(`select count(*) n, bool_and(token_hash <> '${tokA}') hashed from public.app_sessions where user_id = '${prof.a.id}'`)
  check('session stored as a hash only', Number(sessStored[0].n) === 1 && sessStored[0].hashed === true)
  r = await anon.rpc('app_login_otp', { p_phone: phones.a, p_ticket: tk.ticket })
  check('ticket is single-use (second use → otp_invalid)', raised(r, 'otp_invalid'))
  await clearOtp(phones.a)
  tk = await otpTicket(phones.a, 'login')
  await runSql(`update public.otp_tickets set expires_at = now() - interval '1 second' where token_hash = public.ks_token_hash('${tk.ticket}')`)
  r = await anon.rpc('app_login_otp', { p_phone: phones.a, p_ticket: tk.ticket })
  check('expired ticket → otp_invalid', raised(r, 'otp_invalid'))
  await clearOtp(phones.reg)
  const regTk = await otpTicket(phones.reg, 'register')
  r = await anon.rpc('app_login_otp', { p_phone: phones.reg, p_ticket: regTk.ticket })
  check('register ticket cannot sign in', raised(r, 'otp_invalid'))
  // a login ticket for a number that is not (or no longer) a farmer account → null, like app_login
  await runSql(`insert into public.otp_tickets (phone, purpose, token_hash) values ('${phones.unknown}', 'login', public.ks_token_hash('kst1_kstest_unknown_${stamp}_0123456789abcdef0123456789abcdef'))`)
  r = await anon.rpc('app_login_otp', { p_phone: phones.unknown, p_ticket: `kst1_kstest_unknown_${stamp}_0123456789abcdef0123456789abcdef` })
  check('valid ticket, unknown number → null (like app_login)', !r.error && r.data == null)
  await runSql(`insert into public.otp_tickets (phone, purpose, token_hash) values ('${phones.admin}', 'login', public.ks_token_hash('kst1_kstest_admin_${stamp}_0123456789abcdef0123456789abcdef'))`)
  r = await anon.rpc('app_login_otp', { p_phone: phones.admin, p_ticket: `kst1_kstest_admin_${stamp}_0123456789abcdef0123456789abcdef` })
  check('valid ticket, admin number → null (admins cannot sign in by phone)', !r.error && r.data == null)
  r = await anon.rpc('app_login_otp', { p_phone: '123', p_ticket: 'x' })
  check('malformed number → invalid_phone', raised(r, 'invalid_phone'))

  log('\n## app_register_phone_otp')
  const regArgs = (phone, ticket) => ({ p_full_name: 'KSTEST 11A registered', p_phone: phone, p_village_town: 'Sagar', p_latitude: 23.8388, p_longitude: 78.7378, p_language: 'hi', p_disclaimer_accepted: true, p_show_details: true, p_ticket: ticket })
  r = await anon.rpc('app_register_phone_otp', regArgs(phones.reg, 'kst1_' + '0'.repeat(64)))
  check('bad ticket → otp_invalid, no profile', raised(r, 'otp_invalid') && Number((await runSql(`select count(*) n from public.profiles where phone = '${phones.reg}'`))[0].n) === 0)
  r = await anon.rpc('app_register_phone_otp', regArgs(phones.reg2, regTk.ticket))
  check('ticket for another phone → otp_invalid', raised(r, 'otp_invalid'))
  r = await anon.rpc('app_register_phone_otp', { ...regArgs(phones.reg, regTk.ticket), p_disclaimer_accepted: false })
  check('validation runs before the ticket is used (disclaimer) ', raised(r, 'disclaimer_not_accepted'))
  r = await anon.rpc('app_register_phone_otp', regArgs(phones.reg, regTk.ticket))
  const tokReg = r.data?.session_token
  check('valid register ticket → profile (auth_provider phone, no email) + session token', !r.error && r.data?.profile?.phone === phones.reg && r.data.profile.auth_provider === 'phone' && r.data.profile.email == null && /^kss1_/.test(tokReg || ''))
  if (r.data?.profile) prof.reg = r.data.profile
  r = await anon.rpc('app_register_phone_otp', regArgs(phones.reg, regTk.ticket))
  check('same number again → phone_exists', raised(r, 'phone_exists'))
  await clearOtp(phones.a)
  const loginTk = await otpTicket(phones.reg2, 'register').catch(() => null)
  await runSql(`update public.otp_tickets set purpose = 'login' where token_hash = public.ks_token_hash('${loginTk?.ticket}')`)
  r = await anon.rpc('app_register_phone_otp', regArgs(phones.reg2, loginTk?.ticket))
  check('login ticket cannot register', raised(r, 'otp_invalid'))

  log('\n## otp_required gate on the old phone-only paths')
  r = await anon.rpc('app_login', { p_phone: phones.a })
  check('otp_required OFF: app_login works as before (profile)', !r.error && r.data?.id === prof.a.id)
  r = await anon.rpc('app_register_phone', { ...regArgs(phones.reg2), p_ticket: undefined })
  check('otp_required OFF: app_register_phone works as before', !r.error && r.data?.phone === phones.reg2)
  if (r.data?.id) prof.reg2 = r.data
  await setFlags(true, false)
  r = await anon.rpc('get_auth_flags')
  check('flags read back: otp_required true', r.data?.otp_required === true && r.data.session_enforced === false)
  r = await anon.rpc('app_login', { p_phone: phones.a })
  check('otp_required ON: app_login → otp_required', raised(r, 'otp_required'))
  r = await anon.rpc('app_register_phone', { ...regArgs(ph(10)), p_ticket: undefined })
  check('otp_required ON: app_register_phone → otp_required', raised(r, 'otp_required'))
  r = await anon.rpc('app_signup', { p_full_name: 'KSTEST 11A', p_phone: ph(11), p_village_town: 'Sagar', p_pincode: '470001', p_language: 'hi', p_disclaimer_accepted: true })
  check('otp_required ON: app_signup (old) → otp_required', raised(r, 'otp_required'))
  await clearOtp(phones.a)
  tk = await otpTicket(phones.a, 'login')
  r = await anon.rpc('app_login_otp', { p_phone: phones.a, p_ticket: tk.ticket })
  check('otp_required ON: app_login_otp works', !r.error && r.data?.profile?.id === prof.a.id)

  log('\n## Session enforcement')
  await clearOtp(phones.b)
  tk = await otpTicket(phones.b, 'login')
  const tokB = (await anon.rpc('app_login_otp', { p_phone: phones.b, p_ticket: tk.ticket })).data?.session_token
  const tokAdmin = (await runSql(`select public.ks_create_session('${prof.admin.id}') t`))[0].t
  const setLang = (c, id) => c.rpc('set_language', { p_actor_id: id, p_language: 'en' })
  // enforcement needs BOTH flags
  await setFlags(false, true)
  r = await setLang(anon, prof.a.id)
  check('session_enforced ON but otp_required OFF → not enforced (no token works)', !r.error, code(r.error))
  await setFlags(true, true)
  r = await setLang(anon, prof.a.id)
  check('enforced: no token → not_authenticated', raised(r, 'not_authenticated'))
  r = await setLang(client('kss1_' + 'a'.repeat(64)), prof.a.id)
  check('enforced: wrong token → not_authenticated', raised(r, 'not_authenticated'))
  r = await setLang(client(tokB), prof.a.id)
  check("enforced: another user's token → not_authenticated", raised(r, 'not_authenticated'))
  r = await setLang(client(tokA), prof.a.id)
  check('enforced: the right token → works', !r.error, code(r.error))
  r = await client(tokB).rpc('update_profile', { p_actor_id: prof.a.id, p_full_name: 'KSTEST hijack', p_village_town: null, p_pincode: '470001', p_language: null })
  check("enforced: update_profile with a cloned user id + own token → not_authenticated", raised(r, 'not_authenticated'))
  // a listing of A; B (knowing A's id from public data) tries to close / delete it
  const { data: lst } = await svc.from('listings').insert({ user_id: prof.a.id, listing_type: 'offer', category: 'equipment', status: 'active', latitude: 23.8388, longitude: 78.7378, pincode: '470001', details: { title: 'KSTEST 11A listing' }, self_declared: true }).select().single()
  r = await client(tokB).rpc('close_listing', { p_actor_id: prof.a.id, p_listing_id: lst.id })
  check("enforced: close_listing as A with B's token → not_authenticated", raised(r, 'not_authenticated'))
  r = await anon.rpc('delete_my_listing', { p_actor_id: prof.a.id, p_listing_id: lst.id })
  check('enforced: delete_my_listing as A with no token → not_authenticated', raised(r, 'not_authenticated'))
  const still = await svc.from('listings').select('id,status').eq('id', lst.id).single()
  check('the listing is untouched', still.data?.status === 'active')
  r = await client(tokA).rpc('get_my_listings', { p_actor_id: prof.a.id })
  check('enforced: SQL-language get_my_listings with the right token → works', !r.error && Array.isArray(r.data) && r.data.some((x) => x.id === lst.id))
  r = await anon.rpc('get_my_listings', { p_actor_id: prof.a.id })
  check('enforced: get_my_listings without a token → not_authenticated', raised(r, 'not_authenticated'))
  await runSql(`update public.app_sessions set last_seen_at = now() - interval '5 minutes' where user_id = '${prof.a.id}'`)
  r = await client(tokA).rpc('get_availability_nudges', { p_actor_id: prof.a.id }, { get: true })
  check('enforced: STABLE function over GET (read-only transaction) with the right token → works', !r.error, code(r.error))
  r = await client(tokA).rpc('get_availability_nudges', { p_actor_id: prof.a.id })
  check('enforced: STABLE function over POST (PostgREST runs it read-only too) → works', !r.error, code(r.error))
  let seenRow = await runSql(`select last_seen_at > now() - interval '1 minute' fresh from public.app_sessions where token_hash = public.ks_token_hash('${tokA}')`)
  check('read-only calls leave last_seen_at alone (best effort, no error)', seenRow[0]?.fresh === false)
  r = await setLang(client(tokA), prof.a.id)
  seenRow = await runSql(`select last_seen_at > now() - interval '1 minute' fresh from public.app_sessions where token_hash = public.ks_token_hash('${tokA}')`)
  check('a normal (read-write) call refreshes last_seen_at', !r.error && seenRow[0]?.fresh === true)
  r = await client(tokA).rpc('close_listing', { p_actor_id: prof.a.id, p_listing_id: lst.id })
  check('enforced: close_listing by the owner with the right token → works', !r.error, code(r.error))
  r = await client(tokB).rpc('get_admin_stats', { p_actor_id: prof.b.id })
  check("enforced: admin function with a non-admin's own token → not_admin", raised(r, 'not_admin'))
  r = await client(tokB).rpc('get_admin_stats', { p_actor_id: prof.admin.id })
  check("enforced: admin function with the admin's id but a non-admin token → not_authenticated", raised(r, 'not_authenticated'))
  r = await client(tokAdmin).rpc('get_admin_stats', { p_actor_id: prof.admin.id })
  check("enforced: admin function with the admin's token → works", !r.error, code(r.error))
  r = await client(tokA).rpc('app_session_valid', { p_actor_id: prof.a.id })
  check('app_session_valid: right token → true', r.data === true)
  r = await client(tokB).rpc('app_session_valid', { p_actor_id: prof.a.id })
  check("app_session_valid: another user's token → false (no error)", !r.error && r.data === false)
  r = await anon.rpc('app_session_valid', { p_actor_id: prof.a.id })
  check('app_session_valid: no token → false (no error)', !r.error && r.data === false)
  r = await client(tokA).rpc('app_logout_session')
  check('app_logout_session → true', r.data === true)
  r = await setLang(client(tokA), prof.a.id)
  check('after logout the token is refused → not_authenticated', raised(r, 'not_authenticated'))
  r = await client(tokA).rpc('app_session_valid', { p_actor_id: prof.a.id })
  check('after logout app_session_valid → false', r.data === false)
  await runSql(`update public.app_sessions set expires_at = now() - interval '1 second' where user_id = '${prof.b.id}'`)
  r = await setLang(client(tokB), prof.b.id)
  check('expired session → not_authenticated', raised(r, 'not_authenticated'))
  r = await client(tokReg).rpc('set_language', { p_actor_id: prof.reg.id, p_language: 'en' })
  check('token from app_register_phone_otp works', !r.error, code(r.error))

  log('\n## E-mail user: app_issue_session')
  const email = `kstest-e2e-11a-${stamp}@example.com`
  const pw = `Kstest-${stamp}-pw!`
  const cu = await svc.auth.admin.createUser({ email, password: pw, email_confirm: true })
  if (cu.error) throw new Error(`auth user: ${cu.error.message}`)
  authUsers.push(cu.data.user.id)
  phones.mail = ph(12)
  await mkProfile('mail', { auth_uid: cu.data.user.id, email, auth_provider: 'email' })
  const authed = createClient(url, ANON, { auth: { persistSession: false } })
  const si = await authed.auth.signInWithPassword({ email, password: pw })
  check('e-mail user signs in (Supabase Auth)', !si.error)
  r = await authed.rpc('app_issue_session')
  const tokMail = r.data?.session_token
  check('app_issue_session → session token for the e-mail user', !r.error && /^kss1_/.test(tokMail || ''), code(r.error))
  r = await setLang(client(tokMail), prof.mail.id)
  check('enforced: e-mail user acts with the issued token', !r.error, code(r.error))
  r = await setLang(client(tokMail), prof.a.id)
  check("e-mail user's token cannot act as someone else", raised(r, 'not_authenticated'))

  log('\n## Both flags OFF again — everything old works')
  await setFlags(false, false)
  r = await anon.rpc('get_auth_flags')
  check('flags read back: both false', r.data?.otp_required === false && r.data.session_enforced === false)
  r = await anon.rpc('app_login', { p_phone: phones.a })
  check('app_login (no OTP) works again', !r.error && r.data?.id === prof.a.id)
  r = await setLang(anon, prof.a.id)
  check('set_language without a token works again', !r.error)
  r = await anon.rpc('update_profile', { p_actor_id: prof.b.id, p_full_name: 'KSTEST 11A b', p_village_town: 'Sagar', p_pincode: '470001', p_language: 'hi' })
  check('update_profile without a token works again', !r.error, code(r.error))
  r = await anon.rpc('get_my_listings', { p_actor_id: prof.a.id })
  check('get_my_listings without a token works again', !r.error)
  r = await anon.rpc('app_register_phone', { ...regArgs(ph(13)), p_ticket: undefined })
  check('app_register_phone (no OTP) works again', !r.error && !!r.data?.id)
  if (r.data?.id) prof.reg3 = r.data
}

async function cleanup() {
  try { await setFlags(false, false) } catch (e) { log(`- WARN flags reset failed: ${e.message}`) }
  const ids = Object.values(prof).map((p) => p.id).filter(Boolean)
  try {
    const all = Object.values(phones).concat([ph(10), ph(11), ph(13)])
    await runSql(`delete from public.otp_requests where ip_hash = 'kstest' or phone_hash like 'kstest-ip-%' or phone_hash in (select public.ks_peppered_hash('phone:' || p) from unnest(array['${all.join("','")}']) p);
                  delete from public.otp_tickets where phone = any(array['${all.join("','")}']);
                  delete from public.profiles where phone like '91111%' and full_name like 'KSTEST%';`)
    for (const id of authUsers) await svc.auth.admin.deleteUser(id)
    const left = await runSql(`select (select count(*) from public.profiles where phone like '91111%' and full_name like 'KSTEST%') profiles,
      (select count(*) from public.app_sessions where user_id = any(array['${ids.join("','")}']::uuid[])) sessions,
      (select count(*) from public.otp_tickets where phone like '91111%') tickets,
      (select count(*) from public.listings where details->>'title' like 'KSTEST 11A%') listings,
      (select json_agg(key || '=' || value) from public.site_settings where key in ('otp_required','session_enforced')) flags`)
    log(`\nCleanup: ${JSON.stringify(left[0])}`)
    check('cleanup: no KSTEST profile, session, ticket or listing left; both flags false',
      Number(left[0].profiles) === 0 && Number(left[0].sessions) === 0 && Number(left[0].tickets) === 0 && Number(left[0].listings) === 0 && JSON.stringify(left[0].flags).includes('otp_required=false') && JSON.stringify(left[0].flags).includes('session_enforced=false'))
  } catch (e) { log(`- FAIL cleanup: ${e.message}`); fail++ }
}

try { await main() } catch (e) { fail++; log(`- FAIL — aborted: ${e.message}`) } finally { await cleanup() }
log(`\n**Result: ${pass} passed, ${fail} failed**`)
if (out) writeFileSync(out, lines.join('\n') + '\n')
process.exit(fail ? 1 : 0)
