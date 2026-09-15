#!/usr/bin/env node
// v1.1 Phase 4 — Agri-Inputs category (farmer surplus + vendor sub-types).
//   node --env-file=.env scripts/test/v11_phase4.mjs
import { anonClient, adminClient, testPhone, cleanupTestData } from '../../e2e/support.js'

const sb = anonClient()
const admin = adminClient()
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }
const set = (a) => [...a].sort().join(',')

const surplus = (o = {}) => ({
  subtype: 'farmer_surplus', input_type: 'fertilizer', item_name: 'DAP', quantity: '2 bags',
  asking_price: '₹1300', material_address: 'Ward 4, Sagar', condition: 'original_packaging', ...o,
})
const vendor = (o = {}) => ({
  subtype: 'vendor', business_name: 'Krishi Seeds', input_types: ['seeds', 'fertilizer'],
  items_description: 'Certified wheat/gram seed, DAP, urea', price_range: '₹500–₹1500',
  shop_address: 'Main Market, Khurai', contact_phone: '9000012345', ...o,
})

async function main() {
  await cleanupTestData()
  const actor = (await sb.rpc('app_signup', {
    p_full_name: 'Inputs User', p_phone: testPhone(), p_village_town: 'Sagar',
    p_pincode: '470001', p_language: 'hi', p_disclaimer_accepted: true,
  })).data

  // POSITIVE: farmer surplus (DAP, Sagar).
  const a = await sb.rpc('create_listing', {
    p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'agri_inputs',
    p_details: surplus(), p_latitude: null, p_longitude: null, p_pincode: '470001', p_self_declared: false,
  })
  check('farmer surplus created', !a.error && a.data?.category === 'agri_inputs', a.error?.message)

  // POSITIVE: vendor listing (seed shop, Khurai).
  const b = await sb.rpc('create_listing', {
    p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'agri_inputs',
    p_details: vendor(), p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false,
  })
  check('vendor listing created', !b.error && b.data?.pincode === '470117', b.error?.message)

  // POSITIVE: agri-input Requirement (looking for wheat seeds).
  const c = await sb.rpc('create_listing', {
    p_actor_id: actor.id, p_listing_type: 'requirement', p_category: 'agri_inputs',
    p_details: surplus({ input_type: 'seeds', item_name: 'HI-8498 Wheat Seed', condition: 'good' }),
    p_latitude: null, p_longitude: null, p_pincode: '470001', p_self_declared: false,
  })
  check('agri-input requirement created', !c.error && c.data?.listing_type === 'requirement', c.error?.message)

  // NEGATIVE: farmer surplus without material_address rejected.
  const noAddr = await sb.rpc('create_listing', {
    p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'agri_inputs',
    p_details: surplus({ material_address: '' }), p_latitude: null, p_longitude: null, p_pincode: '470001', p_self_declared: false,
  })
  check('surplus without material_address rejected', !!noAddr.error && /material_address_required/.test(noAddr.error.message || ''))

  // NEGATIVE: vendor without shop pincode rejected (unknown pincode).
  const noPin = await sb.rpc('create_listing', {
    p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'agri_inputs',
    p_details: vendor(), p_latitude: null, p_longitude: null, p_pincode: '111111', p_self_declared: false,
  })
  check('vendor with unknown shop pincode rejected', !!noPin.error && /pincode_not_found/.test(noPin.error.message || ''))

  // NEGATIVE: vendor with no input_types rejected.
  const noInputs = await sb.rpc('create_listing', {
    p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'agri_inputs',
    p_details: vendor({ input_types: [] }), p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false,
  })
  check('vendor with empty input_types rejected', !!noInputs.error && /input_types_required/.test(noInputs.error.message || ''))

  // Shapes: each sub-type's raw row has exactly its documented key set.
  const rows = (await admin.from('listings').select('id,details').in('id', [a.data.id, b.data.id])).data
  const byId = Object.fromEntries(rows.map((r) => [r.id, r.details]))
  check('farmer_surplus details keys exact',
    set(Object.keys(byId[a.data.id])) === set(['subtype', 'input_type', 'item_name', 'quantity', 'asking_price', 'material_address', 'condition']),
    set(Object.keys(byId[a.data.id])))
  check('vendor details keys exact',
    set(Object.keys(byId[b.data.id])) === set(['subtype', 'business_name', 'input_types', 'items_description', 'price_range', 'shop_address', 'contact_phone']),
    set(Object.keys(byId[b.data.id])))
  check('no cross-subtype leakage', !('business_name' in byId[a.data.id]) && !('material_address' in byId[b.data.id]))

  // Both farmer-surplus and vendor appear in the same browse feed.
  const feed = (await sb.from('listings').select('id').eq('category', 'agri_inputs').eq('status', 'active').eq('listing_type', 'offer')).data || []
  check('surplus + vendor share the browse feed', feed.some((r) => r.id === a.data.id) && feed.some((r) => r.id === b.data.id))

  await cleanupTestData()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e); process.exit(1) })
