#!/usr/bin/env node
// Kisan Sahyog — dummy data seed (Khurai area, Sagar district).
// Idempotent: clears prior test rows (is_test_data = true) then re-inserts.
//   node --env-file=.env scripts/seed_dummy.mjs
//
// Every row is marked is_test_data = true. Test users use phones 9999000001-7.
// Remove all test data with:
//   DELETE FROM listings WHERE is_test_data = true;
//   DELETE FROM profiles WHERE is_test_data = true;
import { adminClient } from '../e2e/support.js'

const admin = adminClient()
const now = new Date().toISOString()

// Crop / equipment IDs (verified against the live lookup tables).
const CROP = { wheat: 1, soybean: 2, gram: 3, paddy: 6, garlic: 10, masoor: 45 }
const EQ = { tractor: 1, trolley: 2, thresher: 3, harvester: 4, rotavator: 5, drone: 24, seed_drill: 25 }

// Test users → their home pincode (all real, already in the pincodes table).
const USERS = {
  ramlal:  { full_name: 'रामलाल पटेल',        phone: '9999000001', village_town: 'Khurai',    pincode: '470117' },
  suresh:  { full_name: 'सुरेश कुमार लोधी',    phone: '9999000002', village_town: 'Banda',     pincode: '470335' },
  mohan:   { full_name: 'मोहन सिंह ठाकुर',     phone: '9999000003', village_town: 'Rehli',     pincode: '470227' },
  gita:    { full_name: 'गीताबाई विश्वकर्मा',  phone: '9999000004', village_town: 'Deori',     pincode: '470226' },
  rajesh:  { full_name: 'राजेश कुमार यादव',    phone: '9999000005', village_town: 'Malthone',  pincode: '470441' },
  prakash: { full_name: 'प्रकाश सिंह परिहार',  phone: '9999000006', village_town: 'Bina',      pincode: '470113' },
  shanti:  { full_name: 'शांतिबाई कुशवाह',     phone: '9999000007', village_town: 'Rahatgarh', pincode: '470119' },
  radha:   { full_name: 'राधा महिला स्वयं सहायता समूह', phone: '9999000008', village_town: 'Khurai',    pincode: '470117' },
  gayatri: { full_name: 'गायत्री ड्रोन सेवाएं', phone: '9999000009', village_town: 'Rahatgarh', pincode: '470119' },
}

// details builders per category (exact JSONB shapes — see PROJECT_CONTEXT §3).
const land = (o) => ({ size_range: '', arrangement: [], water_source: '', crop_id: null, season: '', price_type: 'negotiable', price_amount: '', photo_urls: [], ...o })
const equip = (o) => ({ equipment_type_id: null, rental_basis: '', rate_amount: '', available_now: true, available_from: null, available_to: null, ...o })
const labor = (o) => ({ worker_count: null, work_type: '', available_from: null, available_to: null, rate_basis: null, rate_amount: '', ...o })
const bhusa = (o) => ({ residue_type: '', quantity: '', pickup_arrangement: '', buyer_type_preference: '', asking_price: '', available_from: null, ...o })
const surplus = (o) => ({ subtype: 'farmer_surplus', input_type: '', item_name: '', quantity: '', asking_price: '', material_address: '', condition: '', ...o })
const vendor = (o) => ({ subtype: 'vendor', business_name: '', input_types: [], items_description: '', price_range: '', shop_address: '', contact_phone: '', ...o })
const droneOffer = (o) => ({ operator_name: '', drone_type: 'multi_rotor', service_type: [], rate_per_acre: '', min_acres: '', available_from: null, available_to: null, coverage_area: '', government_scheme: true, crops_covered: '', asset_village: '', ...o })
const droneReq = (o) => ({ crop_type: '', acreage: '', service_needed: '', preferred_date: null, asset_village: '', ...o })

// Listing spec: { u, type, cat, details, sd?, pin? } (pin overrides the poster's home pincode).
const LISTINGS = [
  // --- Land (8) ---
  { u: 'ramlal',  type: 'offer',       cat: 'land', sd: true, d: land({ size_range: '2-5', arrangement: ['sharecropping'], water_source: 'borewell', crop_id: CROP.wheat, season: 'rabi', price_type: 'sharecropping', price_amount: '50% बटाई / 50% crop share' }) },
  { u: 'suresh',  type: 'offer',       cat: 'land', sd: true, d: land({ size_range: '1-2', arrangement: ['lease'], water_source: 'canal', crop_id: CROP.soybean, season: 'kharif', price_type: 'fixed', price_amount: '₹8,000 प्रति एकड़ / ₹8,000 per acre' }) },
  { u: 'mohan',   type: 'offer',       cat: 'land', sd: true, d: land({ size_range: '5-10', arrangement: ['contract_farming'], water_source: 'rainfed', crop_id: CROP.gram, season: 'rabi', price_type: 'negotiable', price_amount: 'बातचीत से / Negotiable' }) },
  { u: 'prakash', type: 'offer',       cat: 'land', sd: true, d: land({ size_range: '2-5', arrangement: ['sharecropping'], water_source: 'borewell', crop_id: CROP.masoor, season: 'rabi', price_type: 'sharecropping', price_amount: '40% बटाई' }) },
  { u: 'rajesh',  type: 'requirement', cat: 'land', d: land({ size_range: '2-5', water_source: '', crop_id: CROP.soybean, season: 'kharif' }) },
  { u: 'gita',    type: 'requirement', cat: 'land', d: land({ size_range: '1-2', water_source: 'borewell', crop_id: CROP.wheat, season: 'rabi' }) },
  { u: 'shanti',  type: 'offer',       cat: 'land', sd: true, d: land({ size_range: '1-2', arrangement: ['lease'], water_source: 'canal', crop_id: CROP.garlic, season: 'rabi', price_type: 'fixed', price_amount: '₹12,000 प्रति एकड़' }) },
  { u: 'ramlal',  type: 'requirement', cat: 'land', d: land({ size_range: '5-10', water_source: 'canal', crop_id: CROP.paddy, season: 'year_round' }) },

  // --- Equipment (10) ---
  { u: 'suresh',  type: 'offer',       cat: 'equipment', d: equip({ equipment_type_id: EQ.tractor, rental_basis: 'per_acre', rate_amount: '₹800 प्रति एकड़' }) },
  { u: 'mohan',   type: 'offer',       cat: 'equipment', d: equip({ equipment_type_id: EQ.thresher, rental_basis: 'per_day', rate_amount: '₹1,500 प्रति दिन' }) },
  { u: 'prakash', type: 'offer',       cat: 'equipment', d: equip({ equipment_type_id: EQ.harvester, rental_basis: 'per_acre', rate_amount: '₹1,200 प्रति एकड़', available_now: false, available_from: '2026-11-01', available_to: '2026-12-31' }) },
  { u: 'rajesh',  type: 'offer',       cat: 'equipment', d: equip({ equipment_type_id: EQ.rotavator, rental_basis: 'per_acre', rate_amount: '₹600 प्रति एकड़' }) },
  { u: 'ramlal',  type: 'offer',       cat: 'equipment', d: equip({ equipment_type_id: EQ.trolley, rental_basis: 'per_day', rate_amount: '₹500 प्रति दिन' }) },
  { u: 'shanti',  type: 'offer',       cat: 'equipment', d: equip({ equipment_type_id: EQ.seed_drill, rental_basis: 'per_acre', rate_amount: '₹400 प्रति एकड़', available_now: false, available_from: '2026-10-01', available_to: '2026-11-30' }) },
  { u: 'gita',    type: 'offer',       cat: 'equipment', d: equip({ equipment_type_id: EQ.drone, rental_basis: 'per_acre', rate_amount: '₹250 प्रति एकड़ (Drone Didi)' }) },
  { u: 'ramlal',  type: 'requirement', cat: 'equipment', d: equip({ equipment_type_id: EQ.harvester, rental_basis: 'per_acre' }) },
  { u: 'rajesh',  type: 'requirement', cat: 'equipment', d: equip({ equipment_type_id: EQ.tractor, rental_basis: 'per_day' }) },
  { u: 'mohan',   type: 'requirement', cat: 'equipment', d: equip({ equipment_type_id: EQ.thresher, rental_basis: 'per_day' }) },

  // --- Labor (7) ---
  { u: 'gita',    type: 'offer',       cat: 'labor', d: labor({ worker_count: 8, work_type: 'harvesting', available_from: '2026-10-15', available_to: '2026-11-30', rate_basis: 'per_day', rate_amount: '₹450 प्रति दिन प्रति व्यक्ति' }) },
  { u: 'shanti',  type: 'offer',       cat: 'labor', d: labor({ worker_count: 5, work_type: 'sowing', rate_basis: 'per_day', rate_amount: '₹350 प्रति दिन' }) },
  { u: 'prakash', type: 'offer',       cat: 'labor', d: labor({ worker_count: 12, work_type: 'general', rate_amount: 'बातचीत से (पल्लेदार)' }) },
  { u: 'suresh',  type: 'offer',       cat: 'labor', d: labor({ worker_count: 3, work_type: 'weeding', rate_basis: 'per_day', rate_amount: '₹300 प्रति दिन' }) },
  { u: 'gita',    type: 'offer',       cat: 'labor', d: labor({ worker_count: 2, work_type: 'drone_operator', rate_amount: '₹250 प्रति एकड़ (Drone Didi)' }) },
  { u: 'ramlal',  type: 'requirement', cat: 'labor', d: labor({ worker_count: 10, work_type: 'harvesting', available_from: '2026-10-01', available_to: '2026-11-30' }) },
  { u: 'mohan',   type: 'requirement', cat: 'labor', d: labor({ worker_count: 5, work_type: 'sowing' }) },

  // --- Bhusa/Parali (6) ---
  { u: 'suresh',  type: 'offer',       cat: 'bhusa', d: bhusa({ residue_type: 'parali', quantity: '50 क्विंटल', pickup_arrangement: 'buyer_collects', buyer_type_preference: 'individual', asking_price: '₹150 प्रति क्विंटल' }) },
  { u: 'mohan',   type: 'offer',       cat: 'bhusa', d: bhusa({ residue_type: 'bhusa', quantity: '30 क्विंटल', pickup_arrangement: 'either', buyer_type_preference: 'commercial', asking_price: '₹120 प्रति क्विंटल' }) },
  { u: 'rajesh',  type: 'offer',       cat: 'bhusa', d: bhusa({ residue_type: 'bhusa', quantity: '2 ट्रॉली', pickup_arrangement: 'farmer_delivers', buyer_type_preference: 'either', asking_price: 'बातचीत से' }) },
  { u: 'prakash', type: 'offer',       cat: 'bhusa', d: bhusa({ residue_type: 'sugarcane', quantity: '20 क्विंटल', pickup_arrangement: 'buyer_collects', buyer_type_preference: 'commercial', asking_price: '₹80 प्रति क्विंटल' }) },
  { u: 'ramlal',  type: 'requirement', cat: 'bhusa', d: bhusa({ residue_type: 'bhusa', quantity: '10 क्विंटल', pickup_arrangement: 'buyer_collects', buyer_type_preference: 'individual' }) },
  { u: 'shanti',  type: 'requirement', cat: 'bhusa', d: bhusa({ residue_type: 'parali', quantity: '25 क्विंटल', pickup_arrangement: 'farmer_delivers', buyer_type_preference: 'commercial' }) },

  // --- Agri-Inputs (7) ---
  { u: 'ramlal',  type: 'offer',       cat: 'agri_inputs', d: surplus({ input_type: 'seeds', item_name: 'HI-8498 गेहूं बीज', quantity: '5 क्विंटल', asking_price: '₹3,200 प्रति क्विंटल', material_address: 'Khurai mandi area', condition: 'original_packaging' }) },
  { u: 'gita',    type: 'offer',       cat: 'agri_inputs', d: surplus({ input_type: 'fertilizer', item_name: 'DAP', quantity: '10 बैग', asking_price: '₹1,350 प्रति बैग', material_address: 'Deori village', condition: 'good' }) },
  { u: 'shanti',  type: 'offer',       cat: 'agri_inputs', d: surplus({ input_type: 'pesticide', item_name: 'Chlorpyrifos 20% EC', quantity: '8 लीटर', asking_price: '₹420 प्रति लीटर', material_address: 'Rahatgarh', condition: 'original_packaging' }) },
  { u: 'prakash', type: 'offer',       cat: 'agri_inputs', pin: '470117', source: 'vendor', d: vendor({ business_name: 'पटेल कृषि केंद्र, खुरई', input_types: ['seeds', 'fertilizer', 'pesticide'], items_description: 'सभी प्रकार के बीज, खाद और कीटनाशक उपलब्ध। उचित दाम, घर पहुंच सेवा।', shop_address: 'Near Bus Stand, Khurai', contact_phone: USERS.prakash.phone }) },
  { u: 'suresh',  type: 'offer',       cat: 'agri_inputs', source: 'vendor', d: vendor({ business_name: 'लोधी एग्रो सेंटर, बांदा', input_types: ['fertilizer', 'seeds'], items_description: 'यूरिया, DAP, NPK सभी खाद उपलब्ध। बांदा और आसपास डिलीवरी।', shop_address: 'Main Road, Banda', contact_phone: USERS.suresh.phone }) },
  { u: 'mohan',   type: 'requirement', cat: 'agri_inputs', d: surplus({ input_type: 'seeds', item_name: 'Soybean seeds (JS-9560 variety)', quantity: '2 क्विंटल' }) },
  { u: 'rajesh',  type: 'requirement', cat: 'agri_inputs', d: surplus({ input_type: 'fertilizer', item_name: 'Urea fertilizer', quantity: '20 बैग' }) },

  // --- Drone Didi (8) — 5 offers, 3 requirements ---
  { u: 'radha',   type: 'offer',       cat: 'drone_didi', d: droneOffer({ operator_name: 'राधा महिला स्वयं सहायता समूह, खुरई', service_type: ['pesticide', 'fertilizer'], rate_per_acre: '₹250 प्रति एकड़', min_acres: '2', available_from: '2026-10-01', available_to: '2027-03-31', coverage_area: 'खुरई और 25 किमी आसपास', government_scheme: true, crops_covered: 'गेहूं, सोयाबीन, चना', asset_village: 'खुरई' }) },
  { u: 'gayatri', type: 'offer',       cat: 'drone_didi', d: droneOffer({ operator_name: 'गायत्री ड्रोन सेवाएं, राहतगढ़', service_type: ['pesticide', 'water'], rate_per_acre: '₹220 प्रति एकड़', min_acres: '3', coverage_area: 'राहतगढ़ और आसपास', government_scheme: true, crops_covered: 'धान, मक्का', asset_village: 'राहतगढ़' }) },
  { u: 'gita',    type: 'offer',       cat: 'drone_didi', d: droneOffer({ operator_name: 'गीताबाई विश्वकर्मा, देवरी', service_type: ['pesticide'], rate_per_acre: '₹280 प्रति एकड़', coverage_area: 'देवरी और 15 किमी', government_scheme: false, crops_covered: 'सोयाबीन, उड़द', asset_village: 'देवरी' }) },
  { u: 'shanti',  type: 'offer',       cat: 'drone_didi', d: droneOffer({ operator_name: 'शांतिबाई ड्रोन सेवा, राहतगढ़', service_type: ['fertilizer', 'seed_sowing'], rate_per_acre: '₹300 प्रति एकड़', available_from: '2026-11-01', available_to: '2027-02-28', coverage_area: 'राहतगढ़, बांदा और आसपास', government_scheme: true, crops_covered: 'गेहूं, सरसों', asset_village: 'राहतगढ़' }) },
  { u: 'radha',   type: 'offer',       cat: 'drone_didi', d: droneOffer({ operator_name: 'राधा महिला स्वयं सहायता समूह', service_type: ['pesticide', 'fertilizer', 'water'], rate_per_acre: '₹240 प्रति एकड़ (10+ एकड़ पर छूट)', min_acres: '5', coverage_area: 'खुरई, बीना, मालथोन', government_scheme: true, crops_covered: 'सभी फसलें / All crops', asset_village: 'खुरई' }) },
  { u: 'ramlal',  type: 'requirement', cat: 'drone_didi', d: droneReq({ crop_type: 'गेहूं', acreage: '8 एकड़', service_needed: 'pesticide', preferred_date: '2026-11-15', asset_village: 'खुरई' }) },
  { u: 'mohan',   type: 'requirement', cat: 'drone_didi', d: droneReq({ crop_type: 'सोयाबीन', acreage: '5 एकड़', service_needed: 'fertilizer', preferred_date: null, asset_village: 'रेहली' }) },
  { u: 'rajesh',  type: 'requirement', cat: 'drone_didi', d: droneReq({ crop_type: 'मक्का', acreage: '3 एकड़', service_needed: 'pesticide', preferred_date: '2026-10-20', asset_village: 'मालथोन' }) },
]

async function main() {
  // Coordinates for every pincode we reference.
  const pins = [...new Set([...Object.values(USERS).map((u) => u.pincode), ...LISTINGS.map((l) => l.pin).filter(Boolean)])]
  const { data: pinRows, error: pinErr } = await admin.from('pincodes').select('pincode,latitude,longitude').in('pincode', pins)
  if (pinErr) throw new Error('pincode lookup: ' + pinErr.message)
  const coord = Object.fromEntries(pinRows.map((p) => [p.pincode, p]))
  for (const p of pins) if (!coord[p]) throw new Error(`missing pincode in DB: ${p}`)

  // Idempotent reset: remove any prior test rows.
  await admin.from('listings').delete().eq('is_test_data', true)
  await admin.from('profiles').delete().eq('is_test_data', true)

  // Insert users.
  const userRows = Object.values(USERS).map((u) => ({
    full_name: u.full_name, phone: u.phone, village_town: u.village_town, pincode: u.pincode,
    latitude: coord[u.pincode].latitude, longitude: coord[u.pincode].longitude,
    preferred_language: 'hi', disclaimer_accepted_at: now, auth_provider: 'phone', is_test_data: true,
  }))
  const { data: insertedUsers, error: uErr } = await admin.from('profiles').insert(userRows).select('id,phone')
  if (uErr) throw new Error('profiles insert: ' + uErr.message)
  const idByPhone = Object.fromEntries(insertedUsers.map((u) => [u.phone, u.id]))
  const userId = (key) => idByPhone[USERS[key].phone]
  console.log(`profiles: inserted ${insertedUsers.length}`)

  // Insert listings.
  const listingRows = LISTINGS.map((l) => {
    const pin = l.pin || USERS[l.u].pincode
    return {
      user_id: userId(l.u), listing_type: l.type, category: l.cat,
      latitude: coord[pin].latitude, longitude: coord[pin].longitude, pincode: pin,
      details: l.d, self_declared: !!l.sd, is_test_data: true, listing_source: l.source || 'farmer',
    }
  })
  const { data: insertedListings, error: lErr } = await admin.from('listings').insert(listingRows).select('id,category')
  if (lErr) throw new Error('listings insert: ' + lErr.message)
  console.log(`listings: inserted ${insertedListings.length}`)
  const byCat = insertedListings.reduce((a, r) => ((a[r.category] = (a[r.category] || 0) + 1), a), {})
  console.log('  by category:', JSON.stringify(byCat))

  // seed_log (idempotent: clear prior dummy_data_* rows, then re-log both seeds).
  const droneCount = insertedListings.filter((r) => r.category === 'drone_didi').length
  await admin.from('seed_log').delete().like('seed_name', 'dummy_data_%')
  await admin.from('seed_log').insert([
    {
      seed_name: 'dummy_data_khurai_v1', record_count: insertedListings.length - droneCount,
      notes: 'Test data for Khurai area. 7 fake users (9999000001-7), 38 listings across 5 categories. Delete with: DELETE FROM listings WHERE is_test_data = true; DELETE FROM profiles WHERE is_test_data = true;',
    },
    {
      seed_name: 'dummy_data_drone_didi_v1', record_count: droneCount,
      notes: "Drone Didi category test data. 2 new test users (9999000008-9), 8 listings (5 offers, 3 requirements). Remove with: DELETE FROM listings WHERE category = 'drone_didi' AND is_test_data = true;",
    },
  ])

  // Verify.
  const [{ count: dummyUsers }, { count: dummyListings }, { count: droneListings }] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('is_test_data', true),
    admin.from('listings').select('*', { count: 'exact', head: true }).eq('is_test_data', true),
    admin.from('listings').select('*', { count: 'exact', head: true }).eq('is_test_data', true).eq('category', 'drone_didi'),
  ])
  console.log(`\nVERIFY → dummy_users=${dummyUsers} (expect 9), dummy_listings=${dummyListings} (expect 46), drone_didi=${droneListings} (expect 8)`)
  if (dummyUsers !== 9 || dummyListings !== 46 || droneListings !== 8) { console.error('COUNT MISMATCH'); process.exit(1) }
  console.log('Seed complete.')
}
main().catch((e) => { console.error('SEED ERROR:', e.message); process.exit(1) })
