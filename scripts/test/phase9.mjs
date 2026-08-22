#!/usr/bin/env node
// Phase 9 cross-cutting checklist — JSONB shape consistency across categories +
// pincodes as the single source of truth for coordinates.
//   node --env-file=.env scripts/test/phase9.mjs
import { anonClient, adminClient, testPhone, cleanupTestData } from '../../e2e/support.js'

const sb = anonClient()
const admin = adminClient()
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }
const sameSet = (a, b) => a.length === b.length && [...a].sort().join(',') === [...b].sort().join(',')

async function main() {
  await cleanupTestData()

  // --- pincodes = single source of truth: signup coords come from the table ---
  const rehliPin = (await admin.from('pincodes').select('*').eq('pincode', '470227').single()).data
  const actor = (await sb.rpc('app_signup', { p_full_name: 'Integ', p_phone: testPhone(), p_village_town: 'Rehli', p_pincode: '470227', p_language: 'hi', p_disclaimer_accepted: true })).data
  check('signup lat/long derived from pincodes table', actor.latitude === rehliPin.latitude && actor.longitude === rehliPin.longitude, `${actor.latitude},${actor.longitude}`)

  const eqTypes = (await sb.from('equipment_types').select('*')).data

  // --- create one listing per category (no per-listing location override) ---
  const land = (await sb.rpc('create_listing', { p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'land', p_details: { size_range: '2-5', arrangement: ['lease'], water_source: 'borewell', crop_id: null, season: 'rabi', photo_urls: [] }, p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: true })).data
  const equip = (await sb.rpc('create_listing', { p_actor_id: actor.id, p_listing_type: 'requirement', p_category: 'equipment', p_details: { equipment_type_id: eqTypes[0].id, rental_basis: 'per_day', available_now: true, available_from: null, available_to: null }, p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: false })).data
  const labor = (await sb.rpc('create_listing', { p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'labor', p_details: { worker_count: 6, work_type: 'harvesting', available_from: '2026-10-01', available_to: '2026-10-10', rate_basis: 'per_day', rate_amount: '₹400' }, p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: false })).data

  // Listings with no override inherit the poster's (pincode-derived) coordinates.
  check('listing inherits poster coords when not overridden', land.latitude === actor.latitude && land.longitude === actor.longitude)

  // --- per-listing location OVERRIDE works (land not at home village) ---
  const binaPin = (await admin.from('pincodes').select('*').eq('pincode', '470113').single()).data
  const override = (await sb.rpc('create_listing', { p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'land', p_details: { size_range: '1-2' }, p_latitude: binaPin.latitude, p_longitude: binaPin.longitude, p_pincode: '470113', p_self_declared: true })).data
  check('per-listing location override applied', override.latitude === binaPin.latitude && override.pincode === '470113')

  // --- JSONB shape consistency: raw rows have exactly the expected keys ---
  const rows = (await admin.from('listings').select('id,category,details').in('id', [land.id, equip.id, labor.id])).data
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]))
  check('land details keys exact (no drift)', sameSet(Object.keys(byId[land.id].details), ['size_range', 'arrangement', 'water_source', 'crop_id', 'season', 'photo_urls']), Object.keys(byId[land.id].details).join(','))
  check('equipment details keys exact (no drift)', sameSet(Object.keys(byId[equip.id].details), ['equipment_type_id', 'rental_basis', 'available_now', 'available_from', 'available_to']), Object.keys(byId[equip.id].details).join(','))
  check('labor details keys exact (no drift)', sameSet(Object.keys(byId[labor.id].details), ['worker_count', 'work_type', 'available_from', 'available_to', 'rate_basis', 'rate_amount']), Object.keys(byId[labor.id].details).join(','))
  // No category leaked another category's fields.
  check('no cross-category field leakage', !('worker_count' in byId[land.id].details) && !('size_range' in byId[equip.id].details) && !('equipment_type_id' in byId[labor.id].details))

  await cleanupTestData()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e); process.exit(1) })
