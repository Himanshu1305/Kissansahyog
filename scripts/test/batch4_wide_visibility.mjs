// Batch 4 item F — agri_inputs wide-visibility opt-in (keep 30 km default).
//   node --env-file=.env scripts/test/batch4_wide_visibility.mjs
// Posts a real agri_inputs listing through the create_listing RPC with the wide
// flag ON and OFF, then applies the exact fetchNearby visibility policy
// (partitionByRadius) at ~60 km:
//   - wide ON  -> the listing is visible at 60 km (in `primary`)
//   - wide OFF -> the listing is NOT visible at 60 km (30 km default holds)
// Every listing this test creates carries the recognisable title prefix
// [B4-TEST] in details.item_name and is deleted in teardown BY ITS EXACT ID.
import { createClient } from '@supabase/supabase-js'
import { partitionByRadius } from '../../src/lib/distance.js'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let pass = 0, fail = 0
const ok = (n, c, e = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${e}`) } }

const PREFIX = '[B4-TEST]'
const atDistance = (rows, km) => partitionByRadius(
  rows.map((r) => ({ ...r, distanceKm: km })),
  { getDistance: (r) => r.distanceKm, getCategory: (r) => r.category, getWide: (r) => r.wide_visibility },
)
const created = []

async function postAgriInputs(actorId, wide) {
  const details = {
    subtype: 'farmer_surplus', input_type: 'seed',
    item_name: `${PREFIX} wheat seed (${wide ? 'wide' : 'local'})`,
    quantity: '2 क्विंटल', condition: 'unopened', asking_price: '₹100', material_address: 'Khurai',
  }
  const { data, error } = await db.rpc('create_listing', {
    p_rules_agreed: true, p_actor_id: actorId, p_listing_type: 'offer',
    p_category: 'agri_inputs', p_details: details, p_latitude: null, p_longitude: null,
    p_pincode: '470117', p_self_declared: false, p_listing_source: 'farmer',
    p_wide_visibility: wide,
  })
  if (data?.id) created.push(data.id)
  return { data, error }
}

async function main() {
  // find-or-create a disclaimer-accepted test profile (is_test_data, never deleted here)
  const phone = '9000000252'
  let actorId = null
  const { data: existing } = await db.from('profiles').select('id').eq('phone', phone).maybeSingle()
  if (existing) actorId = existing.id
  else {
    const { data: ins } = await db.from('profiles').insert({
      full_name: 'B4 Wide Test', phone, village_town: 'Khurai', pincode: '470117',
      latitude: 24.045, longitude: 78.33, disclaimer_accepted_at: new Date().toISOString(), is_test_data: true,
    }).select('id').single()
    actorId = ins?.id
  }
  ok('setup: test actor profile available', !!actorId)
  if (!actorId) { console.log(`\n${pass} passed, ${fail} failed`); process.exit(1) }

  try {
    // wide ON
    const { data: on, error: eOn } = await postAgriInputs(actorId, true)
    ok('agri_inputs wide=ON accepted by create_listing RPC', !eOn && !!on?.id, eOn?.message || '')
    ok('agri_inputs wide=ON stored wide_visibility=true', on?.wide_visibility === true)
    if (on) {
      const res = atDistance([on], 60)
      ok('agri_inputs wide=ON is VISIBLE at ~60 km (primary)', res.primary.some((r) => r.id === on.id))
    }

    // wide OFF (default)
    const { data: off, error: eOff } = await postAgriInputs(actorId, false)
    ok('agri_inputs wide=OFF accepted by create_listing RPC', !eOff && !!off?.id, eOff?.message || '')
    ok('agri_inputs wide=OFF defaults wide_visibility=false', off?.wide_visibility === false)
    if (off) {
      const res = atDistance([off], 60)
      const visible = res.primary.some((r) => r.id === off.id) || res.fallback.some((r) => r.id === off.id)
      ok('agri_inputs wide=OFF is NOT visible at ~60 km (30 km default holds)', !visible)
    }
  } finally {
    // teardown: delete ONLY the exact ids this test created
    for (const id of created) await db.from('listings').delete().eq('id', id)
    const { data: leftover } = await db.from('listings').select('id').in('id', created.length ? created : ['00000000-0000-0000-0000-000000000000'])
    ok('teardown: all B4-TEST listings removed by id', !leftover || leftover.length === 0, `${leftover?.length || 0} left`)
  }

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
