// Batch 1 item 0 — provider-declaration hotfix (migration 0050).
// The guard now fires ONLY when details carry a provider_declared key that is not
// 'true'. Two required cases:
//   1. an offer with NO provider_declared key succeeds;
//   2. an offer with provider_declared:false fails with provider_declaration_required.
// Run: node --env-file=.env scripts/test/batch1_item0.mjs
import { createClient } from '@supabase/supabase-js'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }

async function main() {
  const { data: farmer } = await db.from('profiles').select('id').eq('phone', '9999000001').maybeSingle()
  if (!farmer) { console.log('FAIL  test farmer 9999000001 missing (run scripts/seed_dummy.mjs)'); process.exit(1) }
  const { data: et } = await db.from('equipment_types').select('id').neq('name_en', 'Water tanker').limit(1).maybeSingle()
  const EQUIP_TYPE_ID = et?.id ?? null
  const cleanup = []
  const equipOffer = (details) => ({
    p_actor_id: farmer.id, p_listing_type: 'offer', p_category: 'equipment', p_details: details,
    p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false,
    p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: 'Khurai', p_rules_agreed: true,
  })

  // Case 1: no provider_declared key → succeeds (the live hotfix)
  let r = await db.rpc('create_listing', equipOffer({ equipment_type_id: EQUIP_TYPE_ID }))
  ok('offer with NO provider_declared key succeeds', !r.error && !!r.data?.id, r.error?.message)
  if (r.data?.id) cleanup.push(r.data.id)

  // Case 2: provider_declared:false → provider_declaration_required
  r = await db.rpc('create_listing', equipOffer({ equipment_type_id: EQUIP_TYPE_ID, provider_declared: false }))
  ok('offer with provider_declared:false fails provider_declaration_required',
    !!r.error && /provider_declaration_required/.test(r.error.message), r.error?.message)
  if (r.data?.id) cleanup.push(r.data.id)

  // Control: provider_declared:true still succeeds
  r = await db.rpc('create_listing', equipOffer({ equipment_type_id: EQUIP_TYPE_ID, provider_declared: true }))
  ok('offer with provider_declared:true succeeds', !r.error && !!r.data?.id, r.error?.message)
  if (r.data?.id) cleanup.push(r.data.id)

  for (const id of cleanup) await db.from('listings').delete().eq('id', id)
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e.message); process.exit(1) })
