#!/usr/bin/env node
// Phase 3 backend/logic checklist — Land end-to-end at the data layer.
//   node --env-file=.env scripts/test/phase3.mjs
import { anonClient, adminClient, testPhone, cleanupTestData } from '../../e2e/support.js'
import { haversineKm, boundingBox, isWithinRadius, RADIUS_KM } from '../../src/lib/distance.js'

const sb = anonClient()
const admin = adminClient()
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }

// Real Sagar-district coordinates for sanity-checking Haversine against reality.
const SAGAR = [23.8388, 78.7378]
const BINA = [24.1817, 78.1975] // ~66 km
const KHURAI = [24.045, 78.33] // ~46 km
const REHLI = [23.6372, 79.0628] // ~39 km
const SURKHI = [23.63, 78.83] // ~25 km

async function main() {
  await cleanupTestData()

  // --- Haversine sanity vs known real distances (±8% tolerance) ---
  const near = (a, b, tol) => Math.abs(a - b) <= tol
  check('haversine Sagar→Bina ≈ 66 km', near(haversineKm(...SAGAR, ...BINA), 66, 6), `${haversineKm(...SAGAR, ...BINA).toFixed(1)} km`)
  check('haversine Sagar→Khurai ≈ 46 km', near(haversineKm(...SAGAR, ...KHURAI), 46, 5), `${haversineKm(...SAGAR, ...KHURAI).toFixed(1)} km`)
  check('haversine Sagar→Rehli ≈ 39 km', near(haversineKm(...SAGAR, ...REHLI), 39, 5), `${haversineKm(...SAGAR, ...REHLI).toFixed(1)} km`)

  // --- 30 km boundary (inclusive of exactly 30.0) ---
  // Construct a due-north point using the SAME km/deg the Haversine implies
  // (R=6371 -> 111.195 km/deg) so the reported distance is exact.
  const KM_PER_DEG = (6371 * Math.PI) / 180
  const at = (km) => haversineKm(SAGAR[0], SAGAR[1], SAGAR[0] + km / KM_PER_DEG, SAGAR[1])
  check('point just inside (29.9 km) is inside', isWithinRadius(at(29.9)), `${at(29.9).toFixed(4)} km`)
  check('point at exactly 30.0 km is inside (inclusive)', isWithinRadius(at(30.0)), `${at(30.0).toFixed(4)} km`)
  check('point just outside (30.1 km) is outside', !isWithinRadius(at(30.1)), `${at(30.1).toFixed(4)} km`)
  // Direct boundary semantics of the comparator itself.
  check('isWithinRadius(30.0) === true (inclusive)', isWithinRadius(30.0) === true)
  check('isWithinRadius(30.0001) === false', isWithinRadius(30.0001) === false)

  // --- create a land poster (via anon signup RPC) ---
  const phone = testPhone()
  const { data: actor, error: suErr } = await sb.rpc('app_signup', {
    p_full_name: 'Land Poster', p_phone: phone, p_village_town: 'Sagar',
    p_pincode: '470001', p_language: 'hi', p_disclaimer_accepted: true,
  })
  if (suErr) { check('setup signup', false, suErr.message); return done() }
  const actorId = actor.id

  // --- create_listing: land offer (self_declared true) succeeds ---
  const offer = await sb.rpc('create_listing', {
    p_actor_id: actorId, p_listing_type: 'offer', p_category: 'land',
    p_details: { size_range: '2-5', arrangement: ['lease'], water_source: 'borewell', crop_id: null, season: 'rabi', photo_urls: [] },
    p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: true,
  })
  check('land offer (self-declared) created', !offer.error && offer.data?.self_declared === true && offer.data?.latitude === 23.8388, offer.error?.message)

  // --- create_listing: land requirement (no self-declaration) succeeds ---
  const req = await sb.rpc('create_listing', {
    p_actor_id: actorId, p_listing_type: 'requirement', p_category: 'land',
    p_details: { size_range: '1-2', arrangement: [], water_source: 'canal', crop_id: null, season: 'kharif', photo_urls: [] },
    p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: false,
  })
  check('land requirement created (no self-decl needed)', !req.error && req.data?.self_declared === false, req.error?.message)

  // --- RPC rejects land offer without self-declaration (friendly) ---
  const badOffer = await sb.rpc('create_listing', {
    p_actor_id: actorId, p_listing_type: 'offer', p_category: 'land',
    p_details: { size_range: '2-5' }, p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: false,
  })
  check('land offer w/o self-decl rejected by RPC', !!badOffer.error && /self_declaration_required/.test(badOffer.error.message), badOffer.error?.message)

  // --- DB CHECK constraint rejects a bypassed direct insert (service role) ---
  const direct = await admin.from('listings').insert({
    user_id: actorId, listing_type: 'offer', category: 'land',
    details: { size_range: '2-5' }, self_declared: false,
  }).select()
  check('DB CHECK constraint blocks land offer self_declared=false', !!direct.error && /land_offer_requires_self_declared|violates check/i.test(direct.error.message), direct.error?.message || 'NO ERROR (bad!)')

  // --- phone reveal: active listing returns contact; closed → not_available ---
  const contact = await sb.rpc('get_listing_contact', { p_listing_id: offer.data.id })
  const c = Array.isArray(contact.data) ? contact.data[0] : contact.data
  check('get_listing_contact returns phone for active listing', !contact.error && c?.phone === phone, contact.error?.message || c?.phone)

  await admin.from('listings').update({ status: 'closed' }).eq('id', offer.data.id)
  const closedContact = await sb.rpc('get_listing_contact', { p_listing_id: offer.data.id })
  check('get_listing_contact not_available once closed', !!closedContact.error && /not_available/.test(closedContact.error.message), closedContact.error?.message)
  await admin.from('listings').update({ status: 'active' }).eq('id', offer.data.id)

  // --- browse filter: bbox + haversine returns only within-30km listings ---
  // Insert 4 land offers at known coords owned by actor (self_declared to satisfy constraint).
  const mk = (lat, lon, tag) => ({ user_id: actorId, listing_type: 'offer', category: 'land', latitude: lat, longitude: lon, pincode: '470001', details: { size_range: '1-2', tag }, self_declared: true })
  await admin.from('listings').delete().eq('user_id', actorId) // clear the earlier two + offer
  const ins = await admin.from('listings').insert([
    mk(...SAGAR, 'A_sagar_0km'), mk(...SURKHI, 'B_surkhi_25km'),
    mk(...REHLI, 'C_rehli_39km'), mk(...BINA, 'D_bina_66km'),
  ]).select()
  const box = boundingBox(SAGAR[0], SAGAR[1], RADIUS_KM)
  const { data: rows } = await sb.from('listings').select('*')
    .eq('category', 'land').eq('status', 'active')
    .gte('latitude', box.minLat).lte('latitude', box.maxLat)
    .gte('longitude', box.minLon).lte('longitude', box.maxLon)
  const nearby = (rows || [])
    .map((r) => ({ tag: r.details.tag, d: haversineKm(SAGAR[0], SAGAR[1], r.latitude, r.longitude) }))
    .filter((r) => isWithinRadius(r.d))
    .sort((a, b) => a.d - b.d)
  // Robust against a live DB that may hold real listings near Sagar: assert this
  // test's OWN tagged rows are correctly included/excluded, not the total count.
  const tags = nearby.map((r) => r.tag)
  const ai = tags.indexOf('A_sagar_0km'), bi = tags.indexOf('B_surkhi_25km')
  check('browse includes within-30km (Sagar+Surkhi), excludes Rehli+Bina',
    ai > -1 && bi > -1 && !tags.includes('C_rehli_39km') && !tags.includes('D_bina_66km'),
    `got [${tags.join(', ')}]`)
  check('nearest-first sort correct (A_sagar before B_surkhi)', ai > -1 && bi > -1 && ai < bi,
    `${nearby.map((r) => `${r.tag || '?'}:${r.d.toFixed(1)}`).join(', ')}`)

  await cleanupTestData()
  done()
}
function done() { console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0) }
main().catch((e) => { console.error('ERROR', e); process.exit(1) })
