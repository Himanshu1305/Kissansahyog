// Part B Phase 4c — PERMANENT regression suite for Land numeric acreage + rate/contact.
//   node --env-file=.env scripts/test/p_0031_land_acreage.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { haversineKm, partitionByRadius, RADIUS_KM } from '../../src/lib/distance.js'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

async function main() {
  const land = read('src/components/categories/land.jsx')
  const catalog = read('src/lib/listings/catalog.js')

  // ---------- Static: buckets gone, numeric acreage in ----------
  ok('Land form no longer uses the size_range bucket selector', !/name="size_range"/.test(land) && !/d\.size_range/.test(land) && !/details\.size_range/.test(land))
  ok('Land form uses a numeric size_acres field (min 0.1)', /size_acres/.test(land) && /MIN_ACRES\s*=\s*0\.1/.test(land) && /inputMode="decimal"/.test(land))
  ok('SIZE_RANGE bucket catalog export removed', !/export const SIZE_RANGE/.test(catalog))
  ok('per-acre rate label wired for fixed/ठेका', /field_rate_per_acre/.test(land))
  ok('optional per-listing contact field wired', /contact_phone/.test(land) && /field_contact_phone/.test(land))

  // ---------- Migration regression: seed buckets → numeric, no data loss ----------
  const { data: lands } = await db.from('listings').select('id,details,latitude,longitude').eq('category', 'land')
  ok('no Land listing still carries a size_range bucket', lands.every((r) => !('size_range' in (r.details || {}))))
  ok('every Land listing has a numeric size_acres', lands.every((r) => Number.isFinite(Number(r.details?.size_acres))))
  ok('no Land listing stores contact_phone in public details (privacy)', lands.every((r) => !('contact_phone' in (r.details || {}))))

  // ---------- Setup a poster at Khurai ----------
  const { data: prof } = await db.from('profiles').select('id,phone').eq('phone', '9999000001').maybeSingle()
  const KH = { latitude: 24.045, longitude: 78.33 }

  // ---------- A 50-acre listing (far exceeds the old 10+ cap) stores + displays exactly ----------
  const { data: big, error: bigErr } = await db.rpc('create_listing', { p_rules_agreed: true, p_actor_id: prof.id, p_listing_type: 'offer', p_category: 'land', p_details: { size_acres: 50, arrangement: ['contract_farming'], price_type: 'fixed', price_amount: '5000' }, p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: true, p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: 'Khurai' })
  ok('50-acre Land listing is created (no bucket cap)', !bigErr && big?.category === 'land', bigErr?.message)
  ok('50-acre value stored exactly (no rounding into a bucket)', Number(big?.details?.size_acres) === 50)
  // anon (public) read shows the exact acreage + a village name, never contact/exact plot
  const { data: pub } = await anon.from('listings').select('village_name,details').eq('id', big.id).single()
  ok('public read shows exact "50" acres', Number(pub.details.size_acres) === 50)
  ok('public read shows a village name (village-only location)', !!pub.village_name)
  ok('public read exposes NO contact_phone and NO exact address', !('contact_phone' in pub.details) && !('address' in pub.details) && !('material_address' in pub.details))

  // ---------- 30km geofence unchanged for a 50-acre listing ----------
  const accessors = { getDistance: (r) => r.distanceKm, getCategory: () => 'land', getWide: () => false }
  const withDist = [{ ...big, distanceKm: haversineKm(KH.latitude, KH.longitude, big.latitude, big.longitude) }]
  const part = partitionByRadius(withDist, accessors)
  ok('a 50-acre listing at the viewer village is within the 30km primary radius', part.primary.length === 1 && withDist[0].distanceKm <= RADIUS_KM)
  // and a far one falls out exactly like any other listing (land is not a wide-visibility category)
  const far = [{ id: 'x', distanceKm: haversineKm(KH.latitude, KH.longitude, 26.9, 75.8) }] // Jaipur ~ far
  ok('a distant 50-acre listing is excluded by the same 30km rule', partitionByRadius(far, accessors).primary.length === 0)

  // ---------- Contact override privacy (permanent) ----------
  const { data: big2 } = await db.rpc('create_listing', { p_rules_agreed: true, p_actor_id: prof.id, p_listing_type: 'offer', p_category: 'land', p_details: { size_acres: 12, arrangement: ['lease'], price_type: 'fixed', price_amount: '3000', contact_phone: '9123400009' }, p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: true, p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: 'Khurai' })
  const { data: pub2 } = await anon.from('listings').select('details').eq('id', big2.id).single()
  ok('override NOT leaked into public details', !('contact_phone' in pub2.details))
  const { error: privErr } = await anon.from('listing_private_contact').select('*').eq('listing_id', big2.id)
  ok('anon cannot read the private contact table', !!privErr)
  const rev = await anon.rpc('get_listing_contact', { p_listing_id: big2.id })
  ok('reveal RPC returns the override number', rev.data?.[0]?.phone === '9123400009')
  const { data: big3 } = await db.rpc('create_listing', { p_rules_agreed: true, p_actor_id: prof.id, p_listing_type: 'offer', p_category: 'land', p_details: { size_acres: 5, arrangement: ['lease'], price_type: 'negotiable' }, p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: true, p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: 'Khurai' })
  const rev3 = await anon.rpc('get_listing_contact', { p_listing_id: big3.id })
  ok('blank override falls back to the poster profile phone', rev3.data?.[0]?.phone === prof.phone)

  // cleanup
  await db.from('listings').delete().in('id', [big.id, big2.id, big3.id])

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
