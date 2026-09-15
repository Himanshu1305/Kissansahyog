#!/usr/bin/env node
// Warehouse & Storage category — create validation, asset-location, shape, vendor.
//   node --env-file=.env scripts/test/p3_warehouse.mjs
import { anonClient, adminClient, testPhone, cleanupTestData } from '../../e2e/support.js'

const sb = anonClient()
const admin = adminClient()
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }
const set = (a) => [...a].sort().join(',')

const offer = (o = {}) => ({ warehouse_type: 'general', capacity_quintals: 200, rate: '₹12/qtl/month', available_from: null, facilities: ['electricity'], address: 'Main Road, Khurai', contact_name: '', ...o })
const req = (o = {}) => ({ crop_type: 'गेहूं', quantity_quintals: 50, duration: '3 महीने', preferred_type: 'general', ...o })

async function main() {
  await cleanupTestData()
  const bina = (await admin.from('pincodes').select('*').eq('pincode', '470113').single()).data
  const actor = (await sb.rpc('app_signup', { p_full_name: 'WH Tester', p_phone: testPhone(), p_village_town: 'Khurai', p_pincode: '470117', p_language: 'hi', p_disclaimer_accepted: true })).data

  // Offer (vendor) at Bina pincode.
  const o = await sb.rpc('create_listing', { p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'warehouse', p_details: offer(), p_latitude: null, p_longitude: null, p_pincode: '470113', p_self_declared: false, p_listing_source: 'vendor' })
  check('warehouse offer created (vendor)', !o.error && o.data?.category === 'warehouse' && o.data?.listing_source === 'vendor', o.error?.message)
  check('warehouse located at asset pincode (Bina)', Number(o.data?.latitude) === Number(bina.latitude) && o.data?.pincode === '470113')

  // Requirement.
  const r = await sb.rpc('create_listing', { p_actor_id: actor.id, p_listing_type: 'requirement', p_category: 'warehouse', p_details: req(), p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false })
  check('warehouse requirement created', !r.error && r.data?.listing_type === 'requirement', r.error?.message)

  // Negatives (offer).
  const noType = await sb.rpc('create_listing', { p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'warehouse', p_details: offer({ warehouse_type: '' }), p_latitude: null, p_longitude: null, p_pincode: '470113', p_self_declared: false })
  check('offer without warehouse_type rejected', !!noType.error && /warehouse_type_required/.test(noType.error.message || ''))
  const noCap = await sb.rpc('create_listing', { p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'warehouse', p_details: offer({ capacity_quintals: 0 }), p_latitude: null, p_longitude: null, p_pincode: '470113', p_self_declared: false })
  check('offer without capacity rejected', !!noCap.error && /capacity_required/.test(noCap.error.message || ''))
  const noRate = await sb.rpc('create_listing', { p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'warehouse', p_details: offer({ rate: '' }), p_latitude: null, p_longitude: null, p_pincode: '470113', p_self_declared: false })
  check('offer without rate rejected', !!noRate.error && /warehouse_rate_required/.test(noRate.error.message || ''))
  const noAddr = await sb.rpc('create_listing', { p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'warehouse', p_details: offer({ address: '' }), p_latitude: null, p_longitude: null, p_pincode: '470113', p_self_declared: false })
  check('offer without address rejected', !!noAddr.error && /warehouse_address_required/.test(noAddr.error.message || ''))
  // Negatives (requirement).
  const noDur = await sb.rpc('create_listing', { p_actor_id: actor.id, p_listing_type: 'requirement', p_category: 'warehouse', p_details: req({ duration: '' }), p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false })
  check('requirement without duration rejected', !!noDur.error && /duration_required/.test(noDur.error.message || ''))

  // Shapes.
  const rows = (await admin.from('listings').select('id,details').in('id', [o.data.id, r.data.id])).data
  const byId = Object.fromEntries(rows.map((x) => [x.id, x.details]))
  check('warehouse offer JSONB keys exact',
    set(Object.keys(byId[o.data.id])) === set(['warehouse_type', 'capacity_quintals', 'rate', 'available_from', 'facilities', 'address', 'contact_name']))
  check('warehouse requirement JSONB keys exact',
    set(Object.keys(byId[r.data.id])) === set(['crop_type', 'quantity_quintals', 'duration', 'preferred_type']))

  // Dummy warehouse present.
  const dummy = (await admin.from('listings').select('id').eq('is_test_data', true).eq('category', 'warehouse')).data || []
  check('4 dummy warehouse listings present', dummy.length === 4, `count=${dummy.length}`)

  await cleanupTestData()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e); process.exit(1) })
