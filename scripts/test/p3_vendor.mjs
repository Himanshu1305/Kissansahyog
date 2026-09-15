#!/usr/bin/env node
// Vendor/business tagging (listing_source) + admin vendor report.
//   node --env-file=.env scripts/test/p3_vendor.mjs
import { anonClient, adminClient, testPhone, cleanupTestData } from '../../e2e/support.js'

const sb = anonClient()
const admin = adminClient()
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }

const eqDetails = (o = {}) => ({ equipment_type_id: 1, rental_basis: 'per_day', rate_amount: '₹500', available_now: true, available_from: null, available_to: null, ...o })

async function main() {
  await cleanupTestData()
  const actor = (await sb.rpc('app_signup', { p_full_name: 'Vendor Tester', p_phone: testPhone(), p_village_town: 'Khurai', p_pincode: '470117', p_language: 'hi', p_disclaimer_accepted: true })).data

  // Farmer (default) vs vendor.
  const farmerL = (await sb.rpc('create_listing', { p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'equipment', p_details: eqDetails(), p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false })).data
  check('default listing_source = farmer', farmerL.listing_source === 'farmer', farmerL.listing_source)

  const vendorL = (await sb.rpc('create_listing', { p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'equipment', p_details: eqDetails(), p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false, p_listing_source: 'vendor' })).data
  check('vendor listing_source = vendor', vendorL.listing_source === 'vendor', vendorL.listing_source)

  // Invalid source coerced to farmer (defensive).
  const weird = (await sb.rpc('create_listing', { p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'equipment', p_details: eqDetails(), p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false, p_listing_source: 'nonsense' })).data
  check('invalid source coerced to farmer', weird.listing_source === 'farmer')

  // Admin gate.
  const adminP = (await sb.rpc('app_signup', { p_full_name: 'Vendor Admin', p_phone: testPhone(), p_village_town: 'Sagar', p_pincode: '470001', p_language: 'hi', p_disclaimer_accepted: true })).data
  await admin.from('profiles').update({ is_admin: true }).eq('id', adminP.id)

  const stats = await sb.rpc('get_admin_source_stats', { p_actor_id: adminP.id })
  check('source stats returns farmer/vendor totals', !stats.error && typeof stats.data.farmer_total === 'number' && typeof stats.data.vendor_total === 'number', stats.error?.message)
  check('vendor total >= 1 (this run) + dummy', stats.data.vendor_total >= 1)

  const vendorRows = await sb.rpc('get_admin_vendor_listings', { p_actor_id: adminP.id })
  check('vendor report lists the vendor listing with poster phone', !vendorRows.error && vendorRows.data.some((r) => r.id === vendorL.id && r.poster_phone === actor.phone))
  check('vendor report excludes farmer listings', !vendorRows.data.some((r) => r.id === farmerL.id))

  // Non-admin denied.
  check('non-admin source stats denied', !!(await sb.rpc('get_admin_source_stats', { p_actor_id: actor.id })).error)
  check('non-admin vendor listings denied', !!(await sb.rpc('get_admin_vendor_listings', { p_actor_id: actor.id })).error)

  // Existing dummy vendors are tagged.
  const dummyVendors = (await admin.from('listings').select('id').eq('is_test_data', true).eq('listing_source', 'vendor')).data || []
  check('dummy agri vendors tagged (>=2)', dummyVendors.length >= 2, `count=${dummyVendors.length}`)

  await cleanupTestData()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e); process.exit(1) })
