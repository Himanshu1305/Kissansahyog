// Phase 8 — PERMANENT regression suite for the Combined Legal / Agro-Forestry /
// Availability / Profile build. Run: node --env-file=.env scripts/test/p_0032_legal_availability_profile.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')
const base = (extra) => ({ p_listing_type: 'offer', p_category: 'equipment', p_details: { equipment_type_id: '1', rental_basis: 'per_day', rate_amount: '500', available_now: true }, p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false, p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: 'Khurai', ...extra })

async function main() {
  const { data: farmer } = await db.from('profiles').select('id,phone').eq('phone', '9999000001').maybeSingle()
  const { data: other } = await db.from('profiles').select('id').eq('phone', '9999000002').maybeSingle()
  const { data: admin } = await db.from('profiles').select('id').eq('is_admin', true).limit(1).maybeSingle()
  const cleanup = []

  // ---------- Phase 1: rules-compliance enforced server-side ----------
  let r = await db.rpc('create_listing', base({ p_actor_id: farmer.id })) // no p_rules_agreed
  ok('P1 rules: create_listing WITHOUT the flag is rejected', !!r.error && /rules_not_agreed/.test(r.error.message))
  r = await db.rpc('create_listing', base({ p_actor_id: farmer.id, p_rules_agreed: false }))
  ok('P1 rules: flag=false is rejected', !!r.error)
  r = await db.rpc('create_listing', base({ p_actor_id: farmer.id, p_rules_agreed: true }))
  ok('P1 rules: flag=true creates the listing', !r.error && !!r.data?.id)
  const listingId = r.data?.id
  if (listingId) cleanup.push(listingId)
  ok('P1 buyer modal mounted globally', /BuyerComplianceGate/.test(read('src/App.jsx')))
  ok('P1 buyer gate intercepts tel:/wa.me + persists a localStorage flag', /ks_buyer_agreed_v1/.test(read('src/components/BuyerComplianceGate.jsx')) && /wa\.me|whatsapp/.test(read('src/components/BuyerComplianceGate.jsx')))

  // ---------- Phase 2: schemes + article ----------
  const { data: s1 } = await anon.from('sarkari_yojana').select('slug,category,is_active').eq('slug', 'fal-podharopan-yojana').maybeSingle()
  const { data: s2 } = await anon.from('sarkari_yojana').select('slug,category').eq('slug', 'aushadhi-sugandhit-fasal-vistar').maybeSingle()
  ok('P2 scheme 1 seeded, horticulture, active', s1?.category === 'horticulture' && s1?.is_active === true)
  ok('P2 scheme 2 seeded, horticulture', s2?.category === 'horticulture')
  const { data: art } = await anon.from('articles').select('slug,is_published,author_name,content_hi').eq('slug', 'intercropping-madhya-pradesh').maybeSingle()
  ok('P2 intercropping article published', art?.is_published === true)
  ok('P2 article carries the A.K. Dixit author credit', /ए\.के\. दीक्षित/.test(art?.content_hi || ''))
  ok('P2 article has question-shaped H2s (FAQ/AEO)', (art?.content_hi || '').includes('## ') && (art?.content_hi || '').includes('?'))
  ok('P2 agro-forestry route + nav wired', /agro-forestry/.test(read('src/App.jsx')) && /nav_agroforestry/.test(read('src/components/NavBar.jsx')))

  // ---------- Phase 3: availability hides from every consumer; My Listings keeps it ----------
  // Make it available first (fresh listing defaults true).
  const browseVisible = async () => {
    const { data } = await anon.from('listings').select('id').eq('id', listingId).eq('status', 'active').eq('is_available', true)
    return (data?.length ?? 0) === 1
  }
  ok('P3 available listing is visible to browse consumers', await browseVisible())
  // nearby_counts includes it (Khurai pincode)
  let nc = await anon.rpc('nearby_counts', { p_pincode: '470117', p_km: 30 })
  const eqCountAvail = (nc.data || []).find((x) => x.category === 'equipment')?.count ?? 0
  await db.rpc('set_listing_availability', { p_actor_id: farmer.id, p_listing_id: listingId, p_is_available: false })
  ok('P3 toggle → hidden from browse consumers', !(await browseVisible()))
  nc = await anon.rpc('nearby_counts', { p_pincode: '470117', p_km: 30 })
  const eqCountHidden = (nc.data || []).find((x) => x.category === 'equipment')?.count ?? 0
  ok('P3 toggle → nearby_counts drops it', Number(eqCountHidden) === Number(eqCountAvail) - 1)
  const { data: mine } = await db.rpc('get_my_listings', { p_actor_id: farmer.id })
  const mineRow = mine.find((x) => x.id === listingId)
  ok('P3 unavailable listing still in My Listings (not deleted)', !!mineRow && mineRow.is_available === false)
  ok('P3 static: is_available filter in fetchNearby/fetchRecentListings/fetchHomeFeed', (read('src/lib/listings/listingsApi.js').match(/is_available', true/g) || []).length >= 3)

  // ---------- Phase 3d: engagement nudge threshold ----------
  await db.rpc('set_listing_availability', { p_actor_id: farmer.id, p_listing_id: listingId, p_is_available: true }) // resets counter
  let n = await db.rpc('get_availability_nudges', { p_actor_id: farmer.id })
  ok('P3d 0 clicks → no nudge', !(n.data || []).some((x) => x.id === listingId))
  await anon.rpc('increment_contact_click', { p_listing_id: listingId })
  await anon.rpc('increment_contact_click', { p_listing_id: listingId })
  n = await db.rpc('get_availability_nudges', { p_actor_id: farmer.id })
  ok('P3d 2 clicks → still below threshold', !(n.data || []).some((x) => x.id === listingId))
  await anon.rpc('increment_contact_click', { p_listing_id: listingId })
  n = await db.rpc('get_availability_nudges', { p_actor_id: farmer.id })
  ok('P3d 3 clicks → nudge fires', (n.data || []).some((x) => x.id === listingId))

  // ---------- Phase 4 + 6: admin-only access ----------
  for (const fn of ['get_admin_availability', 'get_admin_farmer_profiles']) {
    const good = await anon.rpc(fn, { p_actor_id: admin.id })
    const bad = await anon.rpc(fn, { p_actor_id: other.id })
    ok(`P4/6 ${fn}: admin allowed`, !good.error)
    ok(`P4/6 ${fn}: non-admin rejected (not_admin)`, !!bad.error && /not_admin/.test(bad.error.message))
  }
  const badList = await anon.rpc('get_admin_availability_listings', { p_actor_id: other.id, p_category: null })
  ok('P4 get_admin_availability_listings: non-admin rejected', !!badList.error)

  // ---------- Phase 5: profile privacy + update ----------
  const up = await anon.rpc('update_kisan_profile', { p_actor_id: farmer.id, p_land_acres: 9.5, p_main_crops: 'सोयाबीन', p_interest_lease: true, p_interest_equipment: false })
  ok('P5 owner can set किसान profile', !up.error && Number(up.data?.land_acres) === 9.5)
  const leak = await anon.from('profiles').select('land_acres,main_crops,interest_lease').limit(5)
  ok('P5 profile data NOT exposed to anon (5d)', (leak.data?.length ?? 0) === 0)
  const { data: fp } = await anon.rpc('get_admin_farmer_profiles', { p_actor_id: admin.id })
  ok('P5 admin can see farmer profile fields', (fp || []).some((x) => x.id === farmer.id && x.land_acres != null))
  // reset the test farmer's profile
  await db.from('profiles').update({ land_acres: null, main_crops: null, interest_lease: false, interest_equipment: false }).eq('id', farmer.id)

  // ---------- Phase 7: PWA banner standalone guard ----------
  const banner = read('src/components/PwaInstallBanner.jsx')
  ok('P7 banner skips rendering in standalone display-mode', /display-mode: standalone/.test(banner) && /isStandalone\(\)\s*\|\|\s*dismissed\)\s*return null/.test(banner))
  ok('P7 banner mounted on homepage', /PwaInstallBanner/.test(read('src/screens/Homepage.jsx')))

  // cleanup
  for (const id of cleanup) await db.from('listings').delete().eq('id', id)
  await db.from('listings').delete().eq('user_id', farmer.id).eq('is_test_data', false).gte('created_at', new Date(Date.now() - 3600e3).toISOString())

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
