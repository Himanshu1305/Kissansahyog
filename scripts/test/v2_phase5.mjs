// PERMANENT regression suite for V2 Phase 5 — Water tanker (equipment sub-type).
// Run: node --env-file=.env scripts/test/v2_phase5.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { TANKER_VEHICLE, TANKER_WATER_USE, TANKER_WATER_SOURCE, MONTH_OPTIONS } from '../../src/lib/listings/catalog.js'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

async function main() {
  const { data: farmer } = await db.from('profiles').select('id').eq('phone', '9999000001').maybeSingle()
  if (!farmer) { console.log('FAIL  test farmer 9999000001 missing'); process.exit(1) }
  const { data: tanker } = await db.from('equipment_types').select('id,name_hi').eq('name_en', 'Water tanker').maybeSingle()
  ok('Water tanker equipment type exists (हिंदी: पानी का टैंकर)', !!tanker && tanker.name_hi === 'पानी का टैंकर')
  const cleanup = []

  const base = (extra) => ({
    p_actor_id: farmer.id, p_listing_type: 'offer', p_category: 'equipment',
    p_details: { equipment_type_id: tanker.id, is_tanker: true, capacity_litres: 5000, provider_declared: true, tanker_vehicle: 'truck', water_use: 'both', water_source: 'own_borewell' },
    p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false,
    p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: 'Khurai', p_rules_agreed: true, ...extra,
  })

  // Capacity required (offer).
  let r = await db.rpc('create_listing', base({ p_details: { equipment_type_id: tanker.id, is_tanker: true, provider_declared: true } }))
  ok('NEGATIVE: tanker offer without capacity_litres → tanker_capacity_required', !!r.error && /tanker_capacity_required/.test(r.error.message), r.error?.message)

  r = await db.rpc('create_listing', base())
  ok('POSITIVE: tanker offer with capacity + declaration is created', !r.error && !!r.data?.id, r.error?.message)
  if (r.data?.id) cleanup.push(r.data.id)
  ok('tanker details persisted (capacity + source)', r.data?.details?.capacity_litres === 5000 && r.data?.details?.water_source === 'own_borewell')

  // Requirement also needs capacity, but no provider declaration.
  r = await db.rpc('create_listing', base({ p_listing_type: 'requirement', p_details: { equipment_type_id: tanker.id, is_tanker: true } }))
  ok('NEGATIVE: tanker requirement without capacity → tanker_capacity_required', !!r.error && /tanker_capacity_required/.test(r.error.message), r.error?.message)

  r = await db.rpc('create_listing', base({ p_listing_type: 'requirement', p_details: { equipment_type_id: tanker.id, is_tanker: true, capacity_litres: 3000 } }))
  ok('POSITIVE: tanker requirement with capacity (no declaration needed) is created', !r.error && !!r.data?.id, r.error?.message)
  if (r.data?.id) cleanup.push(r.data.id)

  // Sample listings seeded.
  const { data: samples } = await db.from('listings').select('id').eq('is_test_data', true).eq('category', 'equipment').filter('details->>is_tanker', 'eq', 'true')
  ok('sample tanker listings seeded (≥3)', (samples?.length || 0) >= 3, `found ${samples?.length}`)

  // Catalog option lists.
  ok('TANKER_VEHICLE/USE/SOURCE + MONTH_OPTIONS all bilingual', [TANKER_VEHICLE, TANKER_WATER_USE, TANKER_WATER_SOURCE, MONTH_OPTIONS].every((l) => l.length >= 3 && l.every((o) => o.value && o.hi && o.en)))

  // Static wiring.
  ok('equipment.jsx handles is_tanker + capacity', read('src/components/categories/equipment.jsx').includes('is_tanker') && read('src/components/categories/equipment.jsx').includes('capacity_litres'))
  ok('NavBar bazaar menu has water_tanker', read('src/components/NavBar.jsx').includes("key: 'water_tanker'"))
  ok('Homepage has a tanker tile + seasonal box', read('src/screens/Homepage.jsx').includes("etype: 'water_tanker'") && read('src/screens/Homepage.jsx').includes('tanker_season_title'))
  ok('Browse supports etype=water_tanker filter', read('src/screens/Browse.jsx').includes('water_tanker'))
  ok('errors.js maps tanker_capacity_required', read('src/lib/errors.js').includes('tanker_capacity_required'))

  for (const id of cleanup) await db.from('listings').delete().eq('id', id)
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e.message); process.exit(1) })
