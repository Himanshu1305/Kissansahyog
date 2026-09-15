#!/usr/bin/env node
// Drone Didi category — create validation, asset-location, shape.
//   node --env-file=.env scripts/test/p3_drone_didi.mjs
import { anonClient, adminClient, testPhone, cleanupTestData } from '../../e2e/support.js'

const sb = anonClient()
const admin = adminClient()
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }
const set = (a) => [...a].sort().join(',')

const offer = (o = {}) => ({
  operator_name: 'राधा महिला SHG', drone_type: 'multi_rotor', service_type: ['pesticide', 'fertilizer'],
  rate_per_acre: '₹250 प्रति एकड़', min_acres: '2', available_from: null, available_to: null,
  coverage_area: 'Khurai 25km', government_scheme: true, crops_covered: 'गेहूं', asset_village: 'खुरई', ...o,
})
const req = (o = {}) => ({ crop_type: 'गेहूं', acreage: '8 एकड़', service_needed: 'pesticide', preferred_date: null, asset_village: 'खुरई', ...o })

async function main() {
  await cleanupTestData()
  const khurai = (await admin.from('pincodes').select('*').eq('pincode', '470117').single()).data
  const actor = (await sb.rpc('app_signup', { p_full_name: 'Drone Tester', p_phone: testPhone(), p_village_town: 'Rehli', p_pincode: '470227', p_language: 'hi', p_disclaimer_accepted: true })).data

  // POSITIVE: offer located at operator pincode (Khurai), not poster home (Rehli).
  const o = await sb.rpc('create_listing', { p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'drone_didi', p_details: offer(), p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false })
  check('drone offer created', !o.error && o.data?.category === 'drone_didi', o.error?.message)
  check('drone offer at operator pincode (Khurai), not poster home', Number(o.data?.latitude) === Number(khurai.latitude) && o.data?.pincode === '470117')

  // POSITIVE: requirement.
  const r = await sb.rpc('create_listing', { p_actor_id: actor.id, p_listing_type: 'requirement', p_category: 'drone_didi', p_details: req(), p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false })
  check('drone requirement created', !r.error && r.data?.listing_type === 'requirement', r.error?.message)

  // NEGATIVE: offer without rate_per_acre.
  const noRate = await sb.rpc('create_listing', { p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'drone_didi', p_details: offer({ rate_per_acre: '' }), p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false })
  check('offer without rate_per_acre rejected', !!noRate.error && /rate_per_acre_required/.test(noRate.error.message || ''))

  // NEGATIVE: offer without services.
  const noSvc = await sb.rpc('create_listing', { p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'drone_didi', p_details: offer({ service_type: [] }), p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false })
  check('offer without services rejected', !!noSvc.error && /service_type_required/.test(noSvc.error.message || ''))

  // NEGATIVE: missing asset pincode (unknown) rejected.
  const noPin = await sb.rpc('create_listing', { p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'drone_didi', p_details: offer(), p_latitude: null, p_longitude: null, p_pincode: '000000', p_self_declared: false })
  check('unknown asset pincode rejected', !!noPin.error && /pincode_not_found/.test(noPin.error.message || ''))

  // Shape consistency (raw rows).
  const rows = (await admin.from('listings').select('id,details').in('id', [o.data.id, r.data.id])).data
  const byId = Object.fromEntries(rows.map((x) => [x.id, x.details]))
  check('drone offer JSONB keys exact',
    set(Object.keys(byId[o.data.id])) === set(['operator_name', 'drone_type', 'service_type', 'rate_per_acre', 'min_acres', 'available_from', 'available_to', 'coverage_area', 'government_scheme', 'crops_covered', 'asset_village']),
    set(Object.keys(byId[o.data.id])))
  check('drone requirement JSONB keys exact',
    set(Object.keys(byId[r.data.id])) === set(['crop_type', 'acreage', 'service_needed', 'preferred_date', 'asset_village']))
  check('offer keeps government_scheme flag', byId[o.data.id].government_scheme === true)

  // Public (anon) can read the active drone offer.
  const vis = (await sb.from('listings').select('id').eq('category', 'drone_didi').eq('status', 'active')).data || []
  check('active drone listing visible to anon', vis.some((x) => x.id === o.data.id))

  await cleanupTestData()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e); process.exit(1) })
