#!/usr/bin/env node
// Phase 2 backend checklist — auth RPC layer (app_signup / app_login /
// set_language). Uses the ANON key (browser path). Run:
//   node --env-file=.env scripts/test/phase2.mjs

import { createClient } from '@supabase/supabase-js'
import { anonClient, adminClient, testPhone, cleanupTestData } from '../../e2e/support.js'

const sb = anonClient()
const admin = adminClient()

let pass = 0, fail = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
  ok ? pass++ : fail++
}
const rpc = (fn, args) => sb.rpc(fn, args)

async function main() {
  await cleanupTestData()
  const phone = testPhone()

  // Positive: signup with valid data succeeds and stores derived lat/long.
  const signup = await rpc('app_signup', {
    p_full_name: 'Test Kisan',
    p_phone: phone,
    p_village_town: 'Makronia',
    p_pincode: '470001',
    p_language: 'hi',
    p_disclaimer_accepted: true,
  })
  check(
    'signup valid succeeds + derives coords from pincode',
    !signup.error && signup.data?.latitude === 23.8388 && signup.data?.disclaimer_accepted_at != null,
    signup.error?.message || `lat=${signup.data?.latitude}`,
  )
  const userId = signup.data?.id

  // Positive: login with same phone returns the same profile.
  const login = await rpc('app_login', { p_phone: phone })
  check('login returns same profile', !login.error && login.data?.id === userId, login.error?.message)

  // Negative: duplicate phone rejected (not silent, not a second row).
  const dup = await rpc('app_signup', {
    p_full_name: 'Someone Else',
    p_phone: phone,
    p_village_town: '',
    p_pincode: '470001',
    p_language: 'hi',
    p_disclaimer_accepted: true,
  })
  const dupCount = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('phone', phone)
  check(
    'duplicate phone rejected (phone_exists), no 2nd row',
    !!dup.error && /phone_exists/.test(dup.error.message) && dupCount.count === 1,
    dup.error?.message,
  )

  // Negative: disclaimer not accepted rejected.
  const noDisc = await rpc('app_signup', {
    p_full_name: 'No Disclaimer',
    p_phone: testPhone(),
    p_village_town: '',
    p_pincode: '470001',
    p_language: 'hi',
    p_disclaimer_accepted: false,
  })
  check('signup without disclaimer rejected', !!noDisc.error && /disclaimer_not_accepted/.test(noDisc.error.message), noDisc.error?.message)

  // Negative: unknown pincode handled gracefully (clear error, NOT 0,0 default).
  const badPin = await rpc('app_signup', {
    p_full_name: 'Bad Pin',
    p_phone: testPhone(),
    p_village_town: '',
    p_pincode: '999999',
    p_language: 'hi',
    p_disclaimer_accepted: true,
  })
  check('unknown pincode rejected (pincode_not_found)', !!badPin.error && /pincode_not_found/.test(badPin.error.message), badPin.error?.message)

  // Negative: malformed phone rejected server-side too (defense-in-depth).
  const badPhone = await rpc('app_signup', {
    p_full_name: 'Bad Phone',
    p_phone: '12ab',
    p_village_town: '',
    p_pincode: '470001',
    p_language: 'hi',
    p_disclaimer_accepted: true,
  })
  check('malformed phone rejected (invalid_phone)', !!badPhone.error && /invalid_phone/.test(badPhone.error.message), badPhone.error?.message)

  // Edge: login with never-signed-up phone -> not_found.
  const noUser = await rpc('app_login', { p_phone: '9000099999' })
  check('login unknown phone -> not_found', !!noUser.error && /not_found/.test(noUser.error.message), noUser.error?.message)

  // Edge: language persists across "logout/login" (server-side).
  const setLang = await rpc('set_language', { p_actor_id: userId, p_language: 'en' })
  const reLogin = await rpc('app_login', { p_phone: phone })
  check(
    'language change persists across re-login',
    !setLang.error && reLogin.data?.preferred_language === 'en',
    reLogin.data?.preferred_language,
  )

  await cleanupTestData()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => {
  console.error('ERROR', e)
  process.exit(1)
})
