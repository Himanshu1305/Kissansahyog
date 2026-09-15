#!/usr/bin/env node
// v1.1 Phase 7 — cross-category integration + asset-location consistency.
//   node --env-file=.env scripts/test/v11_phase7.mjs
import { anonClient, adminClient, testPhone, cleanupTestData } from '../../e2e/support.js'
import { boundingBox, haversineKm, RADIUS_KM } from '../../src/lib/distance.js'

const sb = anonClient()
const admin = adminClient()
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }
const set = (a) => [...a].sort().join(',')

// Replicates fetchNearby's server-box + Haversine pass (viewer -> listing coords).
async function nearby(category, center) {
  const box = boundingBox(center.latitude, center.longitude, RADIUS_KM)
  const { data } = await sb.from('listings').select('*')
    .eq('category', category).eq('status', 'active')
    .gte('latitude', box.minLat).lte('latitude', box.maxLat)
    .gte('longitude', box.minLon).lte('longitude', box.maxLon)
  return (data || [])
    .map((r) => ({ ...r, d: haversineKm(center.latitude, center.longitude, r.latitude, r.longitude) }))
    .filter((r) => r.d <= RADIUS_KM)
}

const DETAILS = {
  land: { size_range: '2-5', arrangement: ['lease'], water_source: 'borewell', crop_id: null, season: 'rabi', price_type: 'negotiable', price_amount: '', photo_urls: [] },
  equipment: null, // filled after equipment types load
  labor: { worker_count: 4, work_type: 'drone_operator', available_from: null, available_to: null, rate_basis: 'per_day', rate_amount: '₹500' },
  bhusa: { residue_type: 'parali', quantity: '10 quintal', pickup_arrangement: 'either', buyer_type_preference: 'commercial', asking_price: '₹180/quintal', available_from: null },
  agri_inputs: { subtype: 'farmer_surplus', input_type: 'seeds', item_name: 'HI-8498 Wheat', quantity: '2 quintal', asking_price: '₹4000', material_address: 'Ward 2, Sagar', condition: 'good' },
}
const SELF = { land: true, equipment: false, labor: false, bhusa: false, agri_inputs: false }

async function main() {
  await cleanupTestData()
  const sagar = (await admin.from('pincodes').select('*').eq('pincode', '470001').single()).data
  const rehli = (await admin.from('pincodes').select('*').eq('pincode', '470227').single()).data
  const eqTypes = (await sb.from('equipment_types').select('*')).data
  DETAILS.equipment = { equipment_type_id: eqTypes[0].id, rental_basis: 'per_day', rate_amount: '₹800', available_now: true, available_from: null, available_to: null }

  // Poster A lives in Rehli (~42 km from Sagar) but lists everything AT Sagar.
  const poster = (await sb.rpc('app_signup', { p_full_name: 'Poster A', p_phone: testPhone(), p_village_town: 'Rehli', p_pincode: '470227', p_language: 'hi', p_disclaimer_accepted: true })).data

  const posted = {}
  for (const cat of ['land', 'equipment', 'labor', 'bhusa', 'agri_inputs']) {
    const res = await sb.rpc('create_listing', {
      p_actor_id: poster.id, p_listing_type: 'offer', p_category: cat,
      p_details: DETAILS[cat], p_latitude: null, p_longitude: null, p_pincode: '470001', p_self_declared: SELF[cat],
    })
    check(`posted ${cat} listing`, !res.error && res.data?.id, res.error?.message)
    posted[cat] = res.data
  }

  // Asset-location consistency: every listing sits at Sagar (asset), not Rehli (home).
  const allAtSagar = Object.values(posted).every((l) => Number(l.latitude) === Number(sagar.latitude) && l.pincode === '470001')
  const noneAtHome = Object.values(posted).every((l) => Number(l.latitude) !== Number(rehli.latitude))
  check('all 5 categories use ASSET location (Sagar), not poster home', allAtSagar && noneAtHome)

  // Searcher B in Sagar sees all 5 categories within 30 km.
  const searcher = { latitude: sagar.latitude, longitude: sagar.longitude }
  for (const cat of ['land', 'equipment', 'labor', 'bhusa', 'agri_inputs']) {
    const rows = await nearby(cat, searcher)
    check(`Sagar searcher finds the ${cat} listing within 30km`, rows.some((r) => r.id === posted[cat].id))
  }

  // JSONB shape consistency for the two NEW categories (raw DB rows).
  const raw = (await admin.from('listings').select('id,category,details').in('id', [posted.bhusa.id, posted.agri_inputs.id])).data
  const byId = Object.fromEntries(raw.map((r) => [r.id, r.details]))
  check('bhusa JSONB keys consistent',
    set(Object.keys(byId[posted.bhusa.id])) === set(['residue_type', 'quantity', 'pickup_arrangement', 'buyer_type_preference', 'asking_price', 'available_from']))
  check('agri_inputs (farmer_surplus) JSONB keys consistent',
    set(Object.keys(byId[posted.agri_inputs.id])) === set(['subtype', 'input_type', 'item_name', 'quantity', 'asking_price', 'material_address', 'condition']))

  // Experts section functions independently of the listings system.
  const experts = (await sb.from('experts').select('*')).data || []
  check('Experts directory loads independently (>=3 active)', experts.length >= 3)

  await cleanupTestData()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e); process.exit(1) })
