#!/usr/bin/env node
// Phase 6 backend checklist — My Listings & lifecycle (ownership + expiry).
//   node --env-file=.env scripts/test/phase6.mjs
import { anonClient, adminClient, testPhone, cleanupTestData } from '../../e2e/support.js'

const sb = anonClient()
const admin = adminClient()
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }

async function main() {
  await cleanupTestData()
  const owner = (await sb.rpc('app_signup', { p_full_name: 'Owner', p_phone: testPhone(), p_village_town: 'Sagar', p_pincode: '470001', p_language: 'hi', p_disclaimer_accepted: true })).data
  const other = (await sb.rpc('app_signup', { p_full_name: 'Other', p_phone: testPhone(), p_village_town: 'Sagar', p_pincode: '470001', p_language: 'hi', p_disclaimer_accepted: true })).data

  // Owner creates one listing per category.
  const land = (await sb.rpc('create_listing', { p_actor_id: owner.id, p_listing_type: 'offer', p_category: 'land', p_details: { size_range: '1-2' }, p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: true })).data
  const eqTypes = (await sb.from('equipment_types').select('*')).data
  await sb.rpc('create_listing', { p_actor_id: owner.id, p_listing_type: 'offer', p_category: 'equipment', p_details: { equipment_type_id: eqTypes[0].id, rental_basis: 'per_day', available_now: true }, p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: false })
  await sb.rpc('create_listing', { p_actor_id: owner.id, p_listing_type: 'requirement', p_category: 'labor', p_details: { worker_count: 3, work_type: 'general' }, p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: false })

  // get_my_listings returns all three, across categories.
  const mine = (await sb.rpc('get_my_listings', { p_actor_id: owner.id })).data
  check('get_my_listings returns all 3 categories', mine.length === 3 && new Set(mine.map((r) => r.category)).size === 3, `${mine.length} rows`)

  // Negative: OTHER user cannot close OWNER's listing (API/RLS-level).
  const badClose = await sb.rpc('close_listing', { p_actor_id: other.id, p_listing_id: land.id })
  const stillActive = (await admin.from('listings').select('status').eq('id', land.id).single()).data
  check('non-owner cannot close listing (not_owner)', !!badClose.error && /not_owner/.test(badClose.error.message) && stillActive.status === 'active', badClose.error?.message)

  // Owner closes it -> status closed, and it disappears from anon browse.
  const okClose = await sb.rpc('close_listing', { p_actor_id: owner.id, p_listing_id: land.id })
  const anonSees = (await sb.from('listings').select('id').eq('id', land.id)).data
  check('owner closes listing -> closed + gone from anon browse', !okClose.error && okClose.data.status === 'closed' && anonSees.length === 0, `anon rows=${anonSees.length}`)

  // Closed listing still visible to owner in My Listings, marked distinctly.
  const afterClose = (await sb.rpc('get_my_listings', { p_actor_id: owner.id })).data
  const closedRow = afterClose.find((r) => r.id === land.id)
  check('closed listing still in My Listings (status=closed)', closedRow?.status === 'closed' && closedRow?.is_expired === false)

  // Edge: expired (past expires_at) listing — NOT in anon browse, but IS in My
  // Listings flagged is_expired. Distinct from a manual close (status stays active).
  const exp = (await admin.from('listings').insert({ user_id: owner.id, listing_type: 'offer', category: 'land', latitude: 23.8388, longitude: 78.7378, pincode: '470001', details: { size_range: '5-10' }, self_declared: true, expires_at: '2020-01-01T00:00:00Z' }).select().single()).data
  const anonExpired = (await sb.from('listings').select('id').eq('id', exp.id)).data
  const myExpired = (await sb.rpc('get_my_listings', { p_actor_id: owner.id })).data.find((r) => r.id === exp.id)
  check('expired listing hidden from anon browse', anonExpired.length === 0)
  check('expired listing shown to owner with is_expired=true, status active', myExpired?.is_expired === true && myExpired?.status === 'active')

  await cleanupTestData()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e); process.exit(1) })
