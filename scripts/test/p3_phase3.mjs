#!/usr/bin/env node
// Phase 3 — profile edit + account deletion.
//   node --env-file=.env scripts/test/p3_phase3.mjs
import { anonClient, adminClient, testPhone, cleanupTestData } from '../../e2e/support.js'

const sb = anonClient()
const admin = adminClient()
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }

async function main() {
  await cleanupTestData()
  const sagar = (await admin.from('pincodes').select('*').eq('pincode', '470001').single()).data
  const rehli = (await admin.from('pincodes').select('*').eq('pincode', '470227').single()).data

  const actor = (await sb.rpc('app_signup', { p_full_name: 'Before Name', p_phone: testPhone(), p_village_town: 'Sagar', p_pincode: '470001', p_language: 'hi', p_disclaimer_accepted: true })).data
  check('signup coords are Sagar', Number(actor.latitude) === Number(sagar.latitude))

  // Edit name + village + pincode (→ coords re-derived) + language.
  const upd = (await sb.rpc('update_profile', { p_actor_id: actor.id, p_full_name: 'After Name', p_village_town: 'Rehli Town', p_pincode: '470227', p_language: 'en' })).data
  check('name updated', upd.full_name === 'After Name')
  check('village updated', upd.village_town === 'Rehli Town')
  check('pincode change re-derives coords to Rehli', Number(upd.latitude) === Number(rehli.latitude) && upd.pincode === '470227')
  check('language updated', upd.preferred_language === 'en')

  // Persisted (fresh read).
  const reread = (await admin.from('profiles').select('*').eq('id', actor.id).single()).data
  check('edits persist in DB', reread.full_name === 'After Name' && reread.pincode === '470227')

  // Unknown pincode rejected.
  const bad = await sb.rpc('update_profile', { p_actor_id: actor.id, p_full_name: 'X', p_village_town: 'Y', p_pincode: '000000', p_language: 'hi' })
  check('update with unknown pincode rejected', !!bad.error && /pincode_not_found/.test(bad.error.message || ''))

  // Delete account cascades listings.
  const listing = (await sb.rpc('create_listing', { p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'labor', p_details: { worker_count: 3, work_type: 'sowing', available_from: null, available_to: null, rate_basis: 'per_day', rate_amount: '₹400' }, p_latitude: null, p_longitude: null, p_pincode: '470227', p_self_declared: false })).data
  check('listing created before deletion', !!listing?.id)

  const del = await sb.rpc('delete_account', { p_actor_id: actor.id })
  check('delete_account succeeds', !del.error && del.data === true, del.error?.message)
  const goneProfile = (await admin.from('profiles').select('id').eq('id', actor.id)).data || []
  const goneListings = (await admin.from('listings').select('id').eq('id', listing.id)).data || []
  check('profile removed', goneProfile.length === 0)
  check('listings cascade-removed', goneListings.length === 0)

  await cleanupTestData()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e); process.exit(1) })
