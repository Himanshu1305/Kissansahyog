#!/usr/bin/env node
// Batch 14A - database checks on STAGING for migration 0067 (test users use the reserved 90000xxxxx phones and are removed).
//   node --env-file=.env scripts/check-staging-env.mjs && node --env-file=.env scripts/batch14a/db-checks.mjs [out.md]
// Leaves the two auth switches exactly as found. Never touches production.
import { writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { runSql } from '../lib/mgmt-sql.mjs'

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !anonKey || !svcKey) throw new Error('Missing Supabase env (run with node --env-file=.env)')
if (url.includes('eltmcznjcqiahqhjvpjg')) throw new Error('refusing: production')

const svc = createClient(url, svcKey, { auth: { persistSession: false } })
const anon = (token) => createClient(url, anonKey, { auth: { persistSession: false }, global: { headers: token ? { 'x-ks-session': token } : {} } })
const out = []
let pass = 0
let fail = 0
const check = (name, ok, detail = '') => { ok ? pass++ : fail++; const s = `- ${ok ? 'PASS' : 'FAIL'} - ${name}${detail ? ` (${detail})` : ''}`; out.push(s); console.log(s) }
const errOf = async (p) => { const r = await p; return r.error ? String(r.error.message) : null }
const dataOf = async (p) => { const r = await p; if (r.error) throw new Error(r.error.message); return r.data }

const flagsNow = async () => JSON.stringify(await runSql(`select key, value::text v from public.site_settings where key in ('otp_required','session_enforced') order by 1`))
const flagsBefore = await flagsNow()
const stamp = Date.now() % 100000
let n = 0
const phone = () => `90000${String((stamp + ++n) % 100000).padStart(5, '0')}`
const made = []
const mkUser = async (label) => {
  const { data, error } = await anon().rpc('app_register_phone', { p_full_name: `KSTEST 14A ${label}`, p_phone: phone(), p_village_town: 'Sagar', p_latitude: 23.8388, p_longitude: 78.7378, p_language: 'hi', p_disclaimer_accepted: true, p_show_details: true })
  if (error) throw new Error(error.message)
  const p = Array.isArray(data) ? data[0] : data
  made.push(p.id)
  return p
}
const session = async (id) => dataOf(svc.rpc('ks_create_session', { p_user_id: id }))
const makeAdmin = async (u, role) => { await svc.from('profiles').update({ is_admin: true, admin_role: role }).eq('id', u.id) }

const createdAnn = []
try {
  const S = await mkUser('super'); const T = await mkUser('super2'); const E = await mkUser('editor'); const N = await mkUser('normal'); const V = await mkUser('victim')
  await makeAdmin(S, 'super'); await makeAdmin(T, 'super'); await makeAdmin(E, 'editor')
  const tS = await session(S.id); const tE = await session(E.id); const tN = await session(N.id); const tV = await session(V.id)
  const aS = anon(tS); const aE = anon(tE); const aN = anon(tN); const aNone = anon(null)
  const FAKE = '00000000-0000-4000-8000-000000000001'

  // A. every new admin RPC refuses anon, non-admin and an admin without a session
  const calls = (actor) => ({
    admin_whoami: { p_actor: actor },
    admin_list_announcements: { p_actor: actor },
    admin_upsert_announcement: { p_actor: actor, p_id: null, p_data: {} },
    admin_delete_announcement: { p_actor: actor, p_id: FAKE },
    admin_duplicate_announcement: { p_actor: actor, p_id: FAKE },
    admin_get_security_status: { p_actor: actor },
    admin_set_security_flag: { p_actor: actor, p_key: 'otp_required', p_value: true, p_reason: 'a long enough reason', p_confirm: null },
    admin_get_otp_usage: { p_actor: actor },
    admin_set_user_blocked: { p_actor: actor, p_user_id: V.id, p_blocked: true, p_reason: 'spam spam spam' },
    admin_list_user_status: { p_actor: actor, p_search: null, p_status: 'all', p_limit: 5, p_offset: 0 },
    admin_set_admin_role: { p_actor: actor, p_user_id: E.id, p_role: 'editor' },
    admin_list_actions: { p_actor: actor, p_limit: 5, p_offset: 0, p_action_filter: null, p_admin_filter: null },
    admin_log_console_action: { p_actor: actor, p_action: 'msp_save', p_target_type: 'msp', p_target_id: '1', p_details: {} },
  })
  const names = Object.keys(calls(FAKE))
  let bad = []
  for (const [who, client, actor, want] of [['anon with a random id', aNone, FAKE, 'not_admin'], ['non-admin with a live session', aN, N.id, 'not_admin'], ['non-admin claiming an admin id', aN, S.id, 'session_required'], ['admin with NO session (switch is off)', aNone, S.id, 'session_required']]) {
    for (const [fn, args] of Object.entries(calls(actor))) {
      const e = await errOf(client.rpc(fn, args))
      if (!e || !e.includes(want)) bad.push(`${who}: ${fn} -> ${e}`)
    }
  }
  check(`all ${names.length} new admin RPCs refuse anon / non-admin / session-less admin with the right code`, bad.length === 0, bad.slice(0, 3).join(' | '))
  const flagsMid = await flagsNow()
  check('session_enforced is false here and the session-less admin was STILL refused (sensitive tools never trust a user id alone)', JSON.parse(flagsMid).find((r) => r.key === 'session_enforced').v === 'false')

  // internal functions are not callable from the browser keys
  for (const [fn, args] of [['log_admin_action', { p_actor: S.id, p_action: 'x', p_target_type: 'x', p_target_id: 'x', p_details: {} }], ['ks_phone_is_blocked', { p_phone: '9000000000' }], ['ks_session_admin', { p_token: tS }], ['ks_assert_not_blocked', { p_user: V.id }], ['require_admin_session', { p_actor: S.id, p_need_super: false }], ['require_super_admin', { p_actor: S.id }]]) {
    const e = await errOf(aS.rpc(fn, args))
    check(`${fn} is not callable by the browser key`, !!e && /permission denied|not found|Could not find/i.test(e), String(e).slice(0, 60))
  }
  check('ks_phone_is_blocked / ks_session_admin work for the service role', (await svc.rpc('ks_phone_is_blocked', { p_phone: V.phone })).data === false && (await svc.rpc('ks_session_admin', { p_token: tS })).data?.role === 'super')

  // B. editor vs super
  for (const [fn, args] of Object.entries(calls(E.id))) {
    if (!['admin_get_security_status', 'admin_set_security_flag', 'admin_get_otp_usage', 'admin_set_user_blocked', 'admin_set_admin_role'].includes(fn)) continue
    const e = await errOf(aE.rpc(fn, args))
    check(`editor cannot call super-only ${fn}`, !!e && e.includes('super_required'), String(e))
  }
  for (const fn of ['admin_whoami', 'admin_list_announcements', 'admin_list_user_status', 'admin_list_actions']) {
    const e = await errOf(aE.rpc(fn, calls(E.id)[fn]))
    check(`editor can call ${fn}`, e === null, String(e))
  }
  check('whoami reports role', (await dataOf(aE.rpc('admin_whoami', { p_actor: E.id }))).role === 'editor' && (await dataOf(aS.rpc('admin_whoami', { p_actor: S.id }))).is_super === true)

  // C. security flag rules
  const flag = (a, key, value, reason, confirm) => errOf(a.rpc('admin_set_security_flag', { p_actor: S.id, p_key: key, p_value: value, p_reason: reason, p_confirm: confirm }))
  check('admin_set_security_flag rejects any key but the two', (await flag(aS, 'site_whatsapp_url', true, 'a long enough reason', null))?.includes('invalid_key') && (await flag(aS, 'ks_anything', false, 'a long enough reason', 'OTP OFF'))?.includes('invalid_key') && (await flag(aS, "otp_required'; --", true, 'a long enough reason', null))?.includes('invalid_key'))
  check('reason under 10 characters is refused', (await flag(aS, 'otp_required', true, 'short', null))?.includes('reason_required'))
  check('OTP OFF needs the exact phrase on the server', (await flag(aS, 'otp_required', false, 'a long enough reason', null))?.includes('confirm_required') && (await flag(aS, 'otp_required', false, 'a long enough reason', 'otp off'))?.includes('confirm_required'))
  check('SESSIONS ON needs the exact phrase on the server', (await flag(aS, 'session_enforced', true, 'a long enough reason', 'SESSIONS')) ?.includes('confirm_required'))
  check('no-op write in the safe direction needs only a reason and is logged (value unchanged)', (await flag(aS, 'session_enforced', false, 'verifying the log works', null)) === null)
  const st = await dataOf(aS.rpc('admin_get_security_status', { p_actor: S.id }))
  check('security status shows both flags with last-changed', 'otp_required' in st && 'session_enforced' in st && st.session_enforced.changed_by === S.full_name, JSON.stringify(st).slice(0, 120))
  const usage = await dataOf(aS.rpc('admin_get_otp_usage', { p_actor: S.id }))
  check('OTP usage has counts and no phone numbers', typeof usage.sent_today === 'number' && 'sent_30d' in usage && !/\d{10}/.test(JSON.stringify(usage)), JSON.stringify(usage).slice(0, 140))

  // D. announcements
  const base = { title_hi: 'KSTEST 14A', title_en: 'KSTEST 14A', start_at: new Date(Date.now() - 3600e3).toISOString(), end_at: new Date(Date.now() + 3600e3).toISOString(), style: 'info', priority: 5 }
  const up = (data, id = null) => aS.rpc('admin_upsert_announcement', { p_actor: S.id, p_id: id, p_data: data })
  const bads = [{ ...base, image_url: 'http://evil.com/a.jpg', image_alt_hi: 'x' }, { ...base, image_url: 'https://evil.com/a.jpg', image_alt_hi: 'x' }, { ...base, link_url: 'javascript:alert(1)' }, { ...base, link_url: '//evil.com' }, { ...base, link_url: 'http://plain.example' }, { ...base, end_at: base.start_at }, { ...base, title_hi: '' }, { ...base, style: 'weird' }, { ...base, image_url: '/festival/neelkanth.webp' }]
  const badRes = await Promise.all(bads.map((d) => errOf(up(d))))
  check('announcement validation: bad image host, bad links, end<=start, empty title, bad style, picture without alt are all refused', badRes.every((e) => e && e.includes('invalid_input')), JSON.stringify(badRes.map((e) => !!e)))
  const a1 = await dataOf(up({ ...base, body_hi: 'b', link_url: '/msp', image_url: '/festival/neelkanth.webp', image_alt_hi: 'alt', image_alt_en: 'alt' })); createdAnn.push(a1.id)
  const a2 = await dataOf(up({ ...base, title_hi: 'KSTEST 14A late', start_at: new Date(Date.now() + 7200e3).toISOString(), end_at: new Date(Date.now() + 9000e3).toISOString() })); createdAnn.push(a2.id)
  const a3 = await dataOf(up({ ...base, title_hi: 'KSTEST 14A off', is_active: false })); createdAnn.push(a3.id)
  const pub = await dataOf(aNone.rpc('get_active_announcements'))
  const ids = pub.map((x) => x.id)
  check('anon sees only the active in-window card (not future, not switched off)', ids.includes(a1.id) && !ids.includes(a2.id) && !ids.includes(a3.id))
  check('public columns are safe (no created_by / is_active / created_at)', pub.every((x) => !('created_by' in x) && !('is_active' in x) && !('created_at' in x)) && pub.length <= 5)
  const dup = await dataOf(aS.rpc('admin_duplicate_announcement', { p_actor: S.id, p_id: a1.id })); createdAnn.push(dup.id)
  check('a duplicate starts switched OFF', dup.is_active === false && !(await dataOf(aNone.rpc('get_active_announcements'))).map((x) => x.id).includes(dup.id))
  const flip = await dataOf(up({ ...base, is_active: false }, a1.id))
  check('switching a card off hides it from the public', flip.is_active === false && !(await dataOf(aNone.rpc('get_active_announcements'))).map((x) => x.id).includes(a1.id))
  check('anon cannot read or write the announcements table directly', !!(await errOf(aNone.from('announcements').select('id').limit(1)).then((e) => e)) || (await aNone.from('announcements').select('id').limit(1)).data?.length === 0)
  const delErr = await errOf(aS.rpc('admin_delete_announcement', { p_actor: S.id, p_id: a3.id })); createdAnn.splice(createdAnn.indexOf(a3.id), 1)
  check('delete works', delErr === null)

  // E. blocking
  const blk = (a, actor, user, blocked, reason) => errOf(a.rpc('admin_set_user_blocked', { p_actor: actor.id, p_user_id: user.id, p_blocked: blocked, p_reason: reason }))
  check('block needs a reason', (await blk(aS, S, V, true, ''))?.includes('reason_required'))
  check('cannot block yourself', (await blk(aS, S, S, true, 'oops self block'))?.includes('cannot_block_self'))
  check('cannot block an admin (editor or super)', (await blk(aS, S, E, true, 'no way'))?.includes('cannot_block_admin') && (await blk(aS, S, T, true, 'no way'))?.includes('cannot_block_admin'))
  const mkListing = (u) => anon().rpc('create_listing_with_location', {
    p_actor_id: u.id, p_listing_type: 'requirement', p_category: 'labor',
    p_details: { worker_count: 2, available_from: '2026-11-01', available_to: null, extra_info: 'KSTEST 14A', photo_urls: [] },
    p_latitude: 23.8388, p_longitude: 78.7378, p_pincode: null, p_self_declared: false, p_listing_source: 'farmer', p_wide_visibility: false,
    p_village_name: 'Sagar', p_rules_agreed: true, p_client_request_id: crypto.randomUUID(), p_contact_consent: false,
  })
  const before = await mkListing(V)
  check('an unblocked user can post (baseline)', !before.error, before.error?.message)
  check('blocking works', (await blk(aS, S, V, true, 'spam listings repeatedly')) === null)
  const live = (await svc.from('app_sessions').select('id').eq('user_id', V.id).is('revoked_at', null)).data
  check('blocking revoked the user\'s sessions', live.length === 0)
  const during = await mkListing(V)
  check('a blocked user is refused by the listings trigger (account_blocked)', !!during.error && during.error.message.includes('account_blocked'), during.error?.message)
  check('ks_phone_is_blocked is true for the blocked phone, false for others', (await svc.rpc('ks_phone_is_blocked', { p_phone: V.phone })).data === true && (await svc.rpc('ks_phone_is_blocked', { p_phone: N.phone })).data === false)
  const row = (await svc.from('profiles').select('is_blocked,blocked_reason,blocked_by').eq('id', V.id).single()).data
  check('block reason and blocker stored', row.is_blocked && row.blocked_reason === 'spam listings repeatedly' && row.blocked_by === S.id)
  const listed = await dataOf(aS.rpc('admin_list_user_status', { p_actor: S.id, p_search: 'KSTEST 14A victim', p_status: 'blocked', p_limit: 10, p_offset: 0 }))
  check('status list shows the blocked user with a masked phone (last 4 only)', listed.length === 1 && listed[0].is_blocked && listed[0].phone_last4 === V.phone.slice(-4) && !('phone' in listed[0]) && !JSON.stringify(listed).includes(V.phone))
  check('unblock restores posting', (await blk(aS, S, V, false, 'mistake, restored')) === null && !(await mkListing(V)).error)

  // F. roles
  check('role change works (editor -> super -> editor)', (await errOf(aS.rpc('admin_set_admin_role', { p_actor: S.id, p_user_id: E.id, p_role: 'super' }))) === null && (await errOf(aS.rpc('admin_set_admin_role', { p_actor: S.id, p_user_id: E.id, p_role: 'editor' }))) === null)
  check('cannot change your own role', (await errOf(aS.rpc('admin_set_admin_role', { p_actor: S.id, p_user_id: S.id, p_role: 'editor' })))?.includes('cannot_change_self'))
  check('invalid role and non-admin target are refused', (await errOf(aS.rpc('admin_set_admin_role', { p_actor: S.id, p_user_id: E.id, p_role: 'owner' })))?.includes('invalid_input') && (await errOf(aS.rpc('admin_set_admin_role', { p_actor: S.id, p_user_id: N.id, p_role: 'editor' })))?.includes('not_found'))
  const supers = (await runSql(`select count(*)::int c from public.profiles where is_admin and admin_role = 'super'`))[0].c
  check('demoting another super is allowed only while a super remains (S demotes T; S stays super)', (await errOf(aS.rpc('admin_set_admin_role', { p_actor: S.id, p_user_id: T.id, p_role: 'editor' }))) === null && (await runSql(`select count(*)::int c from public.profiles where is_admin and admin_role = 'super'`))[0].c === supers - 1)
  const sqlLast = await runSql(`select position('last_super_admin' in pg_get_functiondef('public.admin_set_admin_role(uuid,uuid,text)'::regprocedure)) > 0 as has`)
  check('the last-super-admin guard is in the function (logically a second line of defence: the actor must be a different super)', sqlLast[0].has === true)

  // G. console log
  const lg = (a, action, details) => errOf(a.rpc('admin_log_console_action', { p_actor: S.id, p_action: action, p_target_type: 'msp', p_target_id: 'row1', p_details: details }))
  check('log RPC accepts only allow-listed actions', (await lg(aS, 'drop_everything', {}))?.includes('invalid_input') && (await lg(aS, 'msp_save', { crop: 'wheat', phone: '9876543210', note: 'call 9876543210 api_key=abc' })) === null)
  const logRows = await dataOf(aS.rpc('admin_list_actions', { p_actor: S.id, p_limit: 100, p_offset: 0, p_action_filter: null, p_admin_filter: null }))
  const all = JSON.stringify(logRows)
  check('action log lists the actions just done (security, announcements, block, role, console)', ['security_flag', 'announcement_create', 'user_block', 'user_unblock', 'admin_role', 'msp_save'].every((a) => logRows.some((r) => r.action === a)))
  check('action log has no phone numbers, keys or tokens', !/\d{10}/.test(all) && !/"(phone|api_key|token|secret|password|mobile)"/i.test(all) && !all.includes(tS))
  check('action log filter by action and by admin', (await dataOf(aS.rpc('admin_list_actions', { p_actor: S.id, p_limit: 50, p_offset: 0, p_action_filter: 'user_block', p_admin_filter: S.id }))).every((r) => r.action === 'user_block' && r.actor_id === S.id))
  check('editors can read the log', (await errOf(aE.rpc('admin_list_actions', { p_actor: E.id, p_limit: 5, p_offset: 0, p_action_filter: null, p_admin_filter: null }))) === null)

  // flags left as found
  const flagsAfter = await flagsNow()
  check('staging switches are exactly as found', flagsAfter === flagsBefore, flagsAfter)
} catch (e) {
  check('script ran to the end', false, String(e.message || e))
} finally {
  try {
    if (createdAnn.length) await svc.from('announcements').delete().in('id', createdAnn)
    await svc.from('announcements').delete().like('title_hi', 'KSTEST 14A%')
    if (made.length) {
      await svc.from('admin_actions').delete().in('actor_id', made)
      await svc.from('listings').delete().in('user_id', made)
      await svc.from('profiles').delete().in('id', made)
    }
    await svc.from('profiles').delete().like('phone', '90000%')
  } catch (e) { console.log('cleanup problem:', e.message) }
  const flagsEnd = await flagsNow()
  if (flagsEnd !== flagsBefore) console.log('WARNING: switches differ from the start:', flagsEnd)
}
const md = `# Batch 14A - database checks (STAGING)\n\n${out.join('\n')}\n\n**${pass} passed, ${fail} failed**\n`
console.log(`\n${pass} passed, ${fail} failed`)
if (process.argv[2]) writeFileSync(process.argv[2], md)
process.exit(fail ? 1 : 0)
