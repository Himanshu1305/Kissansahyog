// Batch1 item 5 — every category must still post successfully (offer + requirement).
// RPC-level proof that the server accepts a minimal-essentials listing for each of the
// 10 categories in both directions (the 3-step UI builds exactly these payloads).
// Run: node --env-file=.env scripts/test/batch1_categories.mjs
import { createClient } from '@supabase/supabase-js'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }

async function main() {
  const { data: farmer } = await db.from('profiles').select('id').eq('phone', '9999000001').maybeSingle()
  if (!farmer) { console.log('FAIL  test farmer 9999000001 missing (run scripts/seed_dummy.mjs)'); process.exit(1) }
  const { data: et } = await db.from('equipment_types').select('id').neq('name_en', 'Water tanker').limit(1).maybeSingle()
  const EQ = et?.id
  const cleanup = []

  // [category, offerDetails, requirementDetails, selfDeclaredForOffer]
  const CASES = [
    ['land', { size_acres: 3, price_type: 'negotiable' }, { size_acres: 2 }, true],
    ['equipment', { equipment_type_id: EQ, rental_basis: 'per_day', rate_amount: '₹500/दिन', provider_declared: true }, { equipment_type_id: EQ }, false],
    ['labor', { worker_count: 3, work_type: 'general' }, { worker_count: 2, work_type: 'harvesting' }, false],
    ['drone_didi',
      { operator_name: 'राधा SHG', drone_type: 'multi_rotor', service_type: ['pesticide'], rate_per_acre: '300', asset_village: 'Khurai' },
      { crop_type: 'गेहूं', acreage: '5', service_needed: 'pesticide', asset_village: 'Khurai' }, false],
    ['bhusa',
      { residue_type: 'parali', quantity: '10 क्विंटल', pickup_arrangement: 'either', buyer_type_preference: 'either', asking_price: '₹500' },
      { residue_type: 'bhusa', quantity: '5 क्विंटल', pickup_arrangement: 'either', buyer_type_preference: 'either', asking_price: '₹300' }, false],
    ['agri_inputs',
      { subtype: 'farmer_surplus', input_type: 'seeds', item_name: 'गेहूं बीज', quantity: '50 किलो', asking_price: '₹2000', material_address: 'Khurai' },
      { subtype: 'farmer_surplus', input_type: 'fertilizer', item_name: 'यूरिया', quantity: '5 बोरी', asking_price: '₹1500', material_address: 'Khurai' }, false],
    ['warehouse',
      { warehouse_type: 'general', capacity_quintals: 500, rate: '₹15/क्विंटल', address: 'Khurai Road', provider_declared: true },
      { crop_type: 'गेहूं', quantity_quintals: 50, duration: '3 माह' }, false],
    ['transport', { vehicle_type: 'ट्रैक्टर ट्रॉली', rate_basis: 'per_trip' }, { vehicle_type: 'पिकअप', rate_basis: 'per_km' }, false],
    ['greenhouse',
      { vendor_subtype: 'construction', provider_declared: true },
      { structure_type: 'polyhouse', area_sqm: '2000' }, false],
    ['jugaad',
      { offer_type: 'sell', innovation_name: 'सीड ड्रिल', not_road_vehicle: 'true', provider_declared: true },
      { innovation_name: 'सस्ता थ्रेशर चाहिए' }, false],
  ]

  const call = (category, listing_type, details, self_declared) => db.rpc('create_listing', {
    p_actor_id: farmer.id, p_listing_type: listing_type, p_category: category, p_details: details,
    p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: !!self_declared,
    p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: 'Khurai', p_rules_agreed: true,
  })

  for (const [cat, offer, req, selfDecl] of CASES) {
    let r = await call(cat, 'offer', offer, selfDecl)
    ok(`${cat} OFFER posts`, !r.error && !!r.data?.id, r.error?.message)
    if (r.data?.id) cleanup.push(r.data.id)
    r = await call(cat, 'requirement', req, false)
    ok(`${cat} REQUIREMENT posts`, !r.error && !!r.data?.id, r.error?.message)
    if (r.data?.id) cleanup.push(r.data.id)
  }

  for (const id of cleanup) await db.from('listings').delete().eq('id', id)
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e.message); process.exit(1) })
