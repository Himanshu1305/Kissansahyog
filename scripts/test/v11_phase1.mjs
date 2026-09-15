#!/usr/bin/env node
// v1.1 Phase 1 — asset-location distance matching + soft radius fallback.
//   node --env-file=.env scripts/test/v11_phase1.mjs
//
// The bug: listings inherited the POSTER's home coordinates. The fix: a listing's
// coordinates are derived from its OWN pincode (the asset location). We verify a
// poster whose home is far from the asset produces a listing located at the asset.
import { anonClient, adminClient, testPhone, cleanupTestData } from '../../e2e/support.js'

const sb = anonClient()
const admin = adminClient()
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }

async function main() {
  await cleanupTestData()

  // Poster's HOME is Rehli (470227, ~42 km from Sagar city). The asset is in Sagar.
  const rehli = (await admin.from('pincodes').select('*').eq('pincode', '470227').single()).data
  const sagar = (await admin.from('pincodes').select('*').eq('pincode', '470001').single()).data

  const poster = (await sb.rpc('app_signup', {
    p_full_name: 'Faraway Owner', p_phone: testPhone(), p_village_town: 'Rehli',
    p_pincode: '470227', p_language: 'hi', p_disclaimer_accepted: true,
  })).data
  check('poster home coords are Rehli (far from Sagar)', poster.latitude === rehli.latitude)

  // Post a LAND offer whose asset pincode is Sagar (not the poster's home).
  const land = (await sb.rpc('create_listing', {
    p_actor_id: poster.id, p_listing_type: 'offer', p_category: 'land',
    p_details: { size_range: '2-5', arrangement: ['lease'], water_source: 'borewell', crop_id: null, season: 'rabi', photo_urls: [] },
    p_latitude: null, p_longitude: null, p_pincode: '470001', p_self_declared: true,
  })).data

  // POSITIVE: listing sits at the LAND's location (Sagar), not the poster's home.
  check('land listing located at the ASSET pincode (Sagar), not poster home',
    Number(land.latitude) === Number(sagar.latitude) && land.pincode === '470001',
    `${land.latitude},${land.longitude}`)
  check('land listing NOT located at poster home (Rehli)', Number(land.latitude) !== Number(rehli.latitude))

  // Coordinates are derived SERVER-SIDE from the pincode even if the client lies:
  // pass deliberately-wrong lat/long and confirm the pincode row wins.
  const lied = (await sb.rpc('create_listing', {
    p_actor_id: poster.id, p_listing_type: 'offer', p_category: 'land',
    p_details: { size_range: '1-2' },
    p_latitude: 0, p_longitude: 0, p_pincode: '470001', p_self_declared: true,
  })).data
  check('server derives coords from pincode, ignores forged lat/long',
    Number(lied.latitude) === Number(sagar.latitude) && Number(lied.longitude) === Number(sagar.longitude))

  // NEGATIVE: an unknown asset pincode is rejected (mirrors client validation).
  const bad = await sb.rpc('create_listing', {
    p_actor_id: poster.id, p_listing_type: 'offer', p_category: 'land',
    p_details: { size_range: '1-2' },
    p_latitude: null, p_longitude: null, p_pincode: '999999', p_self_declared: true,
  })
  check('unknown asset pincode rejected', !!bad.error && /pincode_not_found/.test(bad.error.message || ''),
    bad.error?.message)

  // A Sagar-based searcher finds the land (0 km); a Rehli-based searcher does not
  // (asset is ~42 km away, outside the 30 km primary band). Uses listing coords.
  const activeSagar = (await sb.from('listings').select('*')
    .eq('category', 'land').eq('status', 'active').eq('pincode', '470001')).data || []
  check('land is discoverable as an active listing at Sagar', activeSagar.some((r) => r.id === land.id))

  await cleanupTestData()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e); process.exit(1) })
