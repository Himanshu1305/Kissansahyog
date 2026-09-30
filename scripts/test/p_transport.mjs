// PERMANENT regression suite for the Transport / logistics category (Phase 2 / Phase 7b).
// Run: node --env-file=.env scripts/test/p_transport.mjs
import { createClient } from '@supabase/supabase-js'
import { partitionByRadius, haversineKm, RADIUS_KM, FALLBACK_RADIUS_KM } from '../../src/lib/distance.js'
import { CATEGORIES, VEHICLE_TYPE, TRANSPORT_RATE_BASIS } from '../../src/lib/listings/catalog.js'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }

const base = (extra) => ({
  p_listing_type: 'offer', p_category: 'transport',
  p_details: { vehicle_type: 'tractor_trolley', capacity: '5 टन', rate_basis: 'per_trip', rate_amount: '₹1200/ट्रिप' },
  p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false,
  p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: 'Khurai', p_rules_agreed: true, ...extra,
})

async function main() {
  const { data: farmer } = await db.from('profiles').select('id').eq('phone', '9999000001').maybeSingle()
  if (!farmer) { console.log('FAIL  test farmer 9999000001 missing (run scripts/seed_dummy.mjs)'); process.exit(1) }
  const cleanup = []

  // ---- catalog / config (positive) ----
  ok('transport is a category, and Land is still LAST', CATEGORIES.includes('transport') && CATEGORIES[CATEGORIES.length - 1] === 'land')
  ok('VEHICLE_TYPE options all bilingual + valued', VEHICLE_TYPE.length >= 4 && VEHICLE_TYPE.every((o) => o.value && o.hi && o.en))
  ok('TRANSPORT_RATE_BASIS options all bilingual + valued', TRANSPORT_RATE_BASIS.length === 3 && TRANSPORT_RATE_BASIS.every((o) => o.value && o.hi && o.en))

  // ---- create_listing validation (positive + negative) ----
  let r = await db.rpc('create_listing', base({ p_actor_id: farmer.id }))
  ok('POSITIVE: a valid transport offer is created (category CHECK admits transport)', !r.error && !!r.data?.id, r.error?.message)
  if (r.data?.id) cleanup.push(r.data.id)

  r = await db.rpc('create_listing', base({ p_actor_id: farmer.id, p_details: { rate_basis: 'per_trip' } })) // no vehicle_type
  ok('NEGATIVE: missing vehicle_type → vehicle_type_required', !!r.error && /vehicle_type_required/.test(r.error.message), r.error?.message)

  r = await db.rpc('create_listing', base({ p_actor_id: farmer.id, p_details: { vehicle_type: 'truck' } })) // no rate_basis
  ok('NEGATIVE: missing rate_basis → transport_rate_basis_required', !!r.error && /transport_rate_basis_required/.test(r.error.message), r.error?.message)

  // A requirement is allowed with the same required fields (same offer/requirement structure).
  r = await db.rpc('create_listing', base({ p_actor_id: farmer.id, p_listing_type: 'requirement', p_details: { vehicle_type: 'tempo', rate_basis: 'negotiable' } }))
  ok('POSITIVE: a transport requirement is created', !r.error && !!r.data?.id, r.error?.message)
  if (r.data?.id) cleanup.push(r.data.id)

  // ---- geofencing: near appears (≤30km), far is filtered (>50km), no wrong fallback (positive/negative) ----
  const NEAR = { lat: 18.9, lon: 73.5 }
  const FAR = { lat: 19.4, lon: 73.5 } // ~55 km north
  const rows = [
    { distanceKm: haversineKm(NEAR.lat, NEAR.lon, NEAR.lat, NEAR.lon), category: 'transport', wide_visibility: false },
    { distanceKm: haversineKm(NEAR.lat, NEAR.lon, FAR.lat, FAR.lon), category: 'transport', wide_visibility: false },
  ]
  const farKm = rows[1].distanceKm
  ok(`EDGE: seeded far point is beyond the ${FALLBACK_RADIUS_KM}km ring (${farKm.toFixed(1)}km)`, farKm > FALLBACK_RADIUS_KM)
  const { primary, fallback } = partitionByRadius(rows, { getDistance: (x) => x.distanceKm, getCategory: (x) => x.category, getWide: (x) => x.wide_visibility })
  ok('POSITIVE: the ≤30km transport listing is in primary', primary.length === 1 && primary[0].distanceKm <= RADIUS_KM)
  ok('NEGATIVE: the ~55km transport listing is NOT shown (not primary, not fallback)', fallback.length === 0 && !primary.some((x) => x.distanceKm === farKm))
  ok('EDGE: transport is NOT wide-visibility eligible (30/50 only, like every other non-bhusa/agri category)',
    (() => { const wideRows = [{ distanceKm: 80, category: 'transport', wide_visibility: true }]; const p = partitionByRadius(wideRows, { getDistance: (x) => x.distanceKm, getCategory: (x) => x.category, getWide: (x) => x.wide_visibility }); return p.primary.length === 0 && p.fallback.length === 0 })())

  // cleanup
  for (const id of cleanup) await db.from('listings').delete().eq('id', id)

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e.message); process.exit(1) })
