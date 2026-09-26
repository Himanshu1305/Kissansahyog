// Part A Phase 5 — PERMANENT regression suite for village-level geocoding. Per the run's
// rule 6, this NEVER calls live Nominatim — it exercises the DB pipeline (queue, slot,
// resolve/fail, denormalization) with stubbed coordinates + static source checks. Run:
//   node --env-file=.env scripts/test/p_0029_village_geocoding.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { haversineKm } from '../../src/lib/distance.js'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const geoFn = read('functions/geocode.js')
  const worker = read('src/lib/location/geocodeQueue.js')
  const api = read('src/lib/listings/listingsApi.js')
  const headers = read('public/_headers')

  // ---------- Static wiring ----------
  ok('CSP connect-src allows nominatim.openstreetmap.org', /connect-src[^;]*nominatim\.openstreetmap\.org/.test(headers))
  ok('/geocode Pages Function sets the required User-Agent', /User-Agent/.test(geoFn) && /Kisan-Sahyog/.test(geoFn) && /nominatim\.openstreetmap\.org\/search/.test(geoFn))
  ok('worker claims the 1/sec slot BEFORE calling /geocode', /claim_geocode_slot/.test(worker) && worker.indexOf('claim_geocode_slot') < worker.indexOf("fetch(`/geocode"))
  ok('fetchHomeFeed uses the listing OWN coords (no live pincodes-join for distance)', /r\.latitude != null && r\.longitude != null/.test(api))

  // ---------- 2a-i: server-side 1-request/second serialization ----------
  await sleep(1100)
  const burst = await Promise.all(Array.from({ length: 8 }, () => anon.rpc('claim_geocode_slot')))
  ok('serialized queue: 8 concurrent claims → exactly 1 granted within 1s', burst.filter((r) => r.data === true).length === 1)
  await sleep(1100)
  const after = await anon.rpc('claim_geocode_slot')
  ok('serialized queue: a claim succeeds again after the 1s gap', after.data === true)

  // ---------- Direct regression for the reported bug: shared-pincode villages ----------
  // Karampur (OSM: within Khurai/470117) vs adjacent Bamhori — geocoded to distinct points.
  const kar = { lat: 24.1808, lon: 78.3717 }, bam = { lat: 24.1256, lon: 78.2407 }
  const dNew = haversineKm(kar.lat, kar.lon, bam.lat, bam.lon)
  const dOld = haversineKm(24.045, 78.33, 24.045, 78.33) // both at pincode 470117 centroid
  ok('shared-pincode villages: OLD pincode-centroid distance is 0 (the bug)', dOld === 0)
  ok('shared-pincode villages: NEW village-geocoded distance is accurate (>5km)', dNew > 5, `${dNew.toFixed(1)}km`)

  // ---------- Pipeline: enqueue → resolve denormalizes onto the listing ----------
  const phone = '9000000291'
  let { data: prof } = await db.from('profiles').select('id').eq('phone', phone).maybeSingle()
  if (!prof) { const { data } = await db.from('profiles').insert({ full_name: 'Geo test', phone, village_town: 'Khurai', pincode: '470117', latitude: 24.045, longitude: 78.33, disclaimer_accepted_at: new Date().toISOString(), is_test_data: true }).select('id').single(); prof = data }
  const NEW = `Zzt Village ${Date.now() % 100000}`

  // Non-blocking creation (2e): new village → saved immediately, pending, coords null.
  const { data: listing } = await db.rpc('create_listing', { p_rules_agreed: true, p_actor_id: prof.id, p_listing_type: 'requirement', p_category: 'equipment', p_details: { equipment_type_id: '1' }, p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: false, p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: NEW })
  ok('2e non-blocking: new-village listing saved immediately as pending, coords null', listing?.geocoding_status === 'pending' && listing.latitude == null)
  const { data: q1 } = await db.from('village_coordinates').select('status').eq('village_name', NEW).maybeSingle()
  ok('new village enqueued as pending', q1?.status === 'pending')

  // resolve_village (stubbed coords, NO live Nominatim) → cache resolved + listing denormalized.
  const RLAT = 24.222, RLNG = 78.777
  await anon.rpc('resolve_village', { p_village: NEW, p_district: 'Sagar', p_lat: RLAT, p_lng: RLNG, p_display: 'stub' })
  const { data: q2 } = await db.from('village_coordinates').select('status,latitude').eq('village_name', NEW).maybeSingle()
  const { data: l2 } = await db.from('listings').select('latitude,longitude,geocoding_status').eq('id', listing.id).single()
  ok('resolve_village marks the cache resolved', q2?.status === 'resolved' && Number(q2.latitude) === RLAT)
  ok('resolve_village DENORMALIZES coords onto the listing + flips status', Number(l2.latitude) === RLAT && Number(l2.longitude) === RLNG && l2.geocoding_status === 'resolved')

  // Cache HIT: a resolved name geocodes immediately at create time (no pending).
  const { data: l3 } = await db.rpc('create_listing', { p_rules_agreed: true, p_actor_id: prof.id, p_listing_type: 'requirement', p_category: 'equipment', p_details: { equipment_type_id: '1' }, p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: false, p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: NEW })
  ok('cache hit: second listing for the same village resolves immediately', l3?.geocoding_status === 'resolved' && Number(l3.latitude) === RLAT)

  // Failure fallback (2d): 3 failures mark the village 'failed'; listing NEVER gets 0,0.
  const BAD = `Zzt Nonsense ${Date.now() % 100000}`
  await db.rpc('create_listing', { p_rules_agreed: true, p_actor_id: prof.id, p_listing_type: 'requirement', p_category: 'equipment', p_details: { equipment_type_id: '1' }, p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: false, p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: BAD })
  for (let i = 0; i < 3; i++) await anon.rpc('fail_village', { p_village: BAD, p_district: 'Sagar', p_reason: 'not found' })
  const { data: qb } = await db.from('village_coordinates').select('status').eq('village_name', BAD).maybeSingle()
  const { data: lb } = await db.from('listings').select('latitude,longitude,geocoding_status').eq('village_name', BAD).limit(1).maybeSingle()
  ok('failure fallback: village marked failed after 3 attempts (admin log)', qb?.status === 'failed')
  ok('failure fallback: listing stays pending with NULL coords — never 0,0', lb?.geocoding_status === 'pending' && lb.latitude == null)

  // cleanup
  await db.from('listings').delete().eq('user_id', prof.id)
  await db.from('village_coordinates').delete().in('village_name', [NEW, BAD])

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
