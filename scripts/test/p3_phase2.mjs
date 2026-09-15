#!/usr/bin/env node
// Phase 3 / Phase 2 — email+password auth alongside phone.
//   node --env-file=.env scripts/test/p3_phase2.mjs
import { createClient } from '@supabase/supabase-js'
import { adminClient, anonClient, testPhone, cleanupTestData } from '../../e2e/support.js'

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const admin = adminClient()
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }
const email = `kisantest_${Date.now()}@example.com`
const password = 'secret12345'

const fresh = () => createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })

async function main() {
  await cleanupTestData()
  await admin.from('profiles').delete().eq('email', email)

  // --- Email signup ---
  const c1 = fresh()
  const su = await c1.auth.signUp({ email, password })
  check('supabase email signUp returns a session (autoconfirm on)', !su.error && !!su.data.session, su.error?.message)
  const prof = (await c1.rpc('app_signup_email', { p_full_name: 'Email User', p_village_town: 'Sagar', p_pincode: '470001', p_language: 'hi' })).data
  check('profile created with auth_provider=email, email set, phone null',
    prof && prof.auth_provider === 'email' && prof.email === email && prof.phone === null, JSON.stringify({ ap: prof?.auth_provider, ph: prof?.phone }))
  check('email profile derived coords from pincode', Number(prof.latitude) === 23.8388)

  // --- Email login (fresh client) ---
  const c2 = fresh()
  const li = await c2.auth.signInWithPassword({ email, password })
  check('email login succeeds', !li.error, li.error?.message)
  const prof2 = (await c2.rpc('app_login_email')).data
  check('login returns the same profile', prof2 && prof2.id === prof.id)

  // --- Negatives ---
  const c3 = fresh()
  const dup = await c3.auth.signUp({ email, password })
  // With autoconfirm + existing user, Supabase returns an error OR an obfuscated user.
  check('same email cannot register twice', !!dup.error || !dup.data?.session, dup.error?.message || 'no-session')

  const c4 = fresh()
  const wrong = await c4.auth.signInWithPassword({ email, password: 'wrongpass999' })
  check('wrong password rejected', !!wrong.error, wrong.error?.message)

  // --- Coexistence: a phone user and the email user have distinct profiles ---
  const sb = anonClient()
  const phoneProf = (await sb.rpc('app_signup', { p_full_name: 'Phone User', p_phone: testPhone(), p_village_town: 'Rehli', p_pincode: '470227', p_language: 'hi', p_disclaimer_accepted: true })).data
  check('phone signup still works', phoneProf && phoneProf.auth_provider === 'phone' && !!phoneProf.phone && phoneProf.email === null)
  check('phone + email profiles do not collide', phoneProf.id !== prof.id)

  // --- Cleanup ---
  if (prof?.auth_uid) await admin.auth.admin.deleteUser(prof.auth_uid).catch(() => {})
  await admin.from('profiles').delete().eq('email', email)
  await cleanupTestData()

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e); process.exit(1) })
