// PERMANENT regression suite for V2 Phase 6 — cold storage directory + marketplace.
// Run: node --env-file=.env scripts/test/v2_phase6.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { WIDE_ELIGIBLE_CATEGORIES } from '../../src/lib/distance.js'
import { CS_FACILITY_TYPE, CS_RATE_UNIT, CATEGORY_META } from '../../src/lib/listings/catalog.js'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

async function main() {
  const { data: farmer } = await db.from('profiles').select('id,is_admin').eq('phone', '9999000001').maybeSingle()
  if (!farmer) { console.log('FAIL  test farmer missing'); process.exit(1) }

  // ---- Directory data ----
  const { count: total } = await db.from('cold_storage_directory').select('*', { count: 'exact', head: true })
  ok('directory has 243 rows', total === 243, `got ${total}`)
  const { count: old } = await db.from('cold_storage_directory').select('*', { count: 'exact', head: true }).eq('is_old_list', true)
  ok('44 OLD LIST rows flagged', old === 44, `got ${old}`)

  // §0.7: Kajal Cold Storage is in Niwari/Tikamgarh, NOT Sagar.
  const { data: kajal } = await db.from('cold_storage_directory').select('district').ilike('name', '%kajal%')
  ok('§0.7: Kajal Cold Storage NOT in Sagar (is Niwari)', kajal?.length && kajal.every((k) => k.district !== 'Sagar') && kajal.some((k) => k.district === 'Niwari'))
  const { data: sagar } = await db.from('cold_storage_directory').select('id').eq('district', 'Sagar')
  ok('Sagar has real entries (≥3)', (sagar?.length || 0) >= 3, `got ${sagar?.length}`)

  // ---- Public view: anon can read, notes excluded, only active ----
  const { data: pub, error: pubErr } = await anon.from('cold_storage_public').select('*').limit(1)
  ok('anon can read cold_storage_public', !pubErr && pub?.length === 1, pubErr?.message)
  ok('public view excludes private notes', pub && !('notes' in pub[0]))
  // anon cannot read the base table directly (no policy).
  const { data: baseRead } = await anon.from('cold_storage_directory').select('id').limit(1)
  ok('anon CANNOT read base directory table', !baseRead || baseRead.length === 0)

  // ---- Claim flow ----
  const { data: row } = await db.from('cold_storage_directory').select('id').eq('district', 'Sagar').limit(1).maybeSingle()
  const ip = `cs-test-${Date.now()}`
  let r = await anon.rpc('submit_cs_claim', { p_dir_id: row.id, p_name: 'Test Owner', p_phone: '9999000001', p_proof: 'signboard', p_ip: ip })
  ok('anon submit_cs_claim accepted', !r.error, r.error?.message)
  r = await anon.rpc('submit_cs_claim', { p_dir_id: row.id, p_name: '', p_phone: '', p_proof: null, p_ip: ip })
  ok('NEGATIVE: claim without name/phone → claim_fields_required', !!r.error && /claim_fields_required/.test(r.error.message), r.error?.message)

  // admin queue + approve
  const { data: prev } = await db.from('profiles').select('is_admin').eq('id', farmer.id).maybeSingle()
  await db.from('profiles').update({ is_admin: true }).eq('id', farmer.id)
  let claimId
  try {
    r = await db.rpc('get_cs_claims', { p_actor_id: farmer.id, p_status: 'pending' })
    ok('admin get_cs_claims returns the pending claim', !r.error && r.data?.some((c) => c.dir_id === row.id), r.error?.message)
    claimId = r.data?.find((c) => c.dir_id === row.id)?.id
    r = await db.rpc('resolve_cs_claim', { p_actor_id: farmer.id, p_claim_id: claimId, p_approve: true })
    ok('resolve_cs_claim(approve) ok', !r.error, r.error?.message)
    const { data: d2 } = await db.from('cold_storage_directory').select('claim_status,claim_phone').eq('id', row.id).maybeSingle()
    ok('approved → claim_status=approved + claim_phone set', d2.claim_status === 'approved' && d2.claim_phone === '9999000001')

    r = await db.rpc('admin_update_cs_directory', { p_actor_id: farmer.id, p_id: row.id, p_patch: { space_available: '1500 क्विंटल', space_updated: '2026-10-06' } })
    ok('admin_update_cs_directory sets space available', !r.error && r.data?.space_available === '1500 क्विंटल', r.error?.message)
  } finally {
    await db.from('profiles').update({ is_admin: prev?.is_admin ?? false }).eq('id', farmer.id)
    // reset claim/space for idempotency
    if (claimId) await db.from('cold_storage_claims').delete().eq('id', claimId)
    await db.from('cold_storage_directory').update({ claim_status: 'unclaimed', claim_phone: null, space_available: null, space_updated: null }).eq('id', row.id)
  }

  // ---- warehouse 100km wide visibility ----
  ok('warehouse is wide-eligible (100km)', WIDE_ELIGIBLE_CATEGORIES.includes('warehouse'))
  r = await db.rpc('create_listing', { p_actor_id: farmer.id, p_listing_type: 'offer', p_category: 'warehouse',
    p_details: { warehouse_type: 'cold', capacity_quintals: 1000, rate: '₹15', address: 'Sagar', provider_declared: true, cs_facility_type: 'bulk', space_available: '500' },
    p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false, p_listing_source: 'farmer', p_wide_visibility: true, p_village_name: 'Khurai', p_rules_agreed: true })
  ok('POSITIVE: warehouse cold offer with wide_visibility is created', !r.error && !!r.data?.id, r.error?.message)
  if (r.data?.id) { ok('cold-storage details persisted (facility + space)', r.data.details?.cs_facility_type === 'bulk' && r.data.details?.space_available === '500'); await db.from('listings').delete().eq('id', r.data.id) }
  r = await db.rpc('create_listing', { p_actor_id: farmer.id, p_listing_type: 'offer', p_category: 'labor',
    p_details: { worker_count: 2 }, p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false, p_listing_source: 'farmer', p_wide_visibility: true, p_village_name: 'Khurai', p_rules_agreed: true })
  ok('NEGATIVE: labor with wide_visibility still rejected', !!r.error && /wide_visibility_not_allowed/.test(r.error.message), r.error?.message)

  // ---- Static wiring ----
  ok('category label renamed to "गोदाम और कोल्ड स्टोरेज"', CATEGORY_META.warehouse.hi === 'गोदाम और कोल्ड स्टोरेज')
  ok('CS option lists bilingual', CS_FACILITY_TYPE.length >= 5 && CS_RATE_UNIT.length >= 3 && [...CS_FACILITY_TYPE, ...CS_RATE_UNIT].every((o) => o.value && o.hi && o.en))
  ok('warehouse.jsx has cold-storage fields', read('src/components/categories/warehouse.jsx').includes("warehouse_type === 'cold'") && read('src/components/categories/warehouse.jsx').includes('space_available'))
  ok('ColdStorage + district screens exist', read('src/screens/ColdStorage.jsx').length > 0 && read('src/screens/ColdStorageDistrict.jsx').length > 0)
  ok('App routes /cold-storage + :district', read('src/App.jsx').includes('/cold-storage') && read('src/App.jsx').includes('/cold-storage/:district'))
  ok('Homepage tile + NavBar menu for cold storage', read('src/screens/Homepage.jsx').includes("path: '/cold-storage'") && read('src/components/NavBar.jsx').includes("key: 'cold_storage'"))
  ok('Admin renders ColdStorageClaimsPanel', read('src/screens/Admin.jsx').includes('<ColdStorageClaimsPanel '))
  ok('prerender includes /cold-storage + district slugs', read('scripts/lib/prerender-routes.mjs').includes("'/cold-storage'") && read('scripts/lib/prerender-routes.mjs').includes('cold_storage_public'))

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e.message); process.exit(1) })
