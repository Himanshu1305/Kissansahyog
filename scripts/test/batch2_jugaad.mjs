// Batch 2 item D — jugaad split (marketplace + guide) + simpler form.
// Checks: the simpler offer form (photo required, what-it-does, no units/testing-body
// fields, no separate road-vehicle checkbox); routes; and that the client form and the
// RPC agree (a well-formed offer posts; the RPC still enforces its minimum).
// Run: node --env-file=.env scripts/test/batch2_jugaad.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const read = (p) => { try { return readFileSync(p, 'utf8') } catch { return '' } }
let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }

async function main() {
  // ---- Static: simpler form ----
  const mod = read('src/components/categories/jugaad.jsx')
  ok('offer form requires a photo (>=1)', mod.includes("err_jugaad_photo_required") && mod.includes('jugaad-photos'))
  ok('offer form has "what it does"', mod.includes('field_jugaad_what') && mod.includes('what_does'))
  ok('units-made + testing-body inputs removed from the form', !mod.includes("field_jugaad_units") && !mod.includes("field_jugaad_testing_body"))
  ok('legacy values still surfaced in summarize', mod.includes('d.units_made') && mod.includes('d.testing_body'))
  ok('no separate road-vehicle checkbox in the category fields', !mod.includes('jugaad-not-road-vehicle'))
  ok('finalizeDetails still sets not_road_vehicle=true (RPC needs it)', mod.includes("not_road_vehicle: 'true'"))
  // Post declaration carries the road-vehicle line for jugaad offers
  ok('Post declaration shows the road-vehicle line for jugaad offers', read('src/screens/Post.jsx').includes("category === 'jugaad'") && read('src/screens/Post.jsx').includes('jugaad_not_road_vehicle'))

  // ---- Static: routes / split ----
  ok('App routes /jugaad + /jugaad/jankari', read('src/App.jsx').includes('path="/jugaad"') && read('src/App.jsx').includes('path="/jugaad/jankari"'))
  ok('Jugaad screen is the marketplace (add CTA + chips)', read('src/screens/Jugaad.jsx').includes('jugaad_add_btn') && read('src/screens/Jugaad.jsx').includes('JUGAAD_OFFER_TYPE'))
  ok('JugaadJankari screen holds the moved guide', read('src/screens/JugaadJankari.jsx').includes('jugaadPage') && read('src/screens/JugaadJankari.jsx').includes('ContentPage'))
  ok('prerender + search index include /jugaad/jankari', read('scripts/lib/prerender-routes.mjs').includes("'/jugaad/jankari'") && read('scripts/build-search-index.mjs').includes("url: '/jugaad/jankari'"))

  // ---- Client/RPC agreement (the RPC still enforces its minimum) ----
  const { data: farmer } = await db.from('profiles').select('id').eq('phone', '9999000001').maybeSingle()
  if (!farmer) { console.log('FAIL  test farmer 9999000001 missing'); process.exit(1) }
  const base = (details) => ({ p_actor_id: farmer.id, p_listing_type: 'offer', p_category: 'jugaad', p_details: details,
    p_latitude: null, p_longitude: null, p_pincode: '470001', p_self_declared: false, p_listing_source: 'farmer',
    p_wide_visibility: false, p_village_name: 'Sagar', p_rules_agreed: true })
  const cleanup = []

  // A well-formed offer (as the simpler form would submit) posts.
  let r = await db.rpc('create_listing', base({ offer_type: 'sell', innovation_name: 'टेस्ट जुगाड़', what_does: 'बुवाई', price: '₹5000', photo_urls: [], not_road_vehicle: 'true', provider_declared: true }))
  ok('well-formed jugaad offer posts (client fields -> RPC accepts)', !r.error && !!r.data?.id, r.error?.message)
  if (r.data?.id) cleanup.push(r.data.id)

  // The RPC still rejects a missing road-vehicle confirmation (client always sets it true).
  r = await db.rpc('create_listing', base({ offer_type: 'sell', innovation_name: 'x', what_does: 'y', price: '1', provider_declared: true }))
  ok('RPC still enforces not_road_vehicle', !!r.error && /road_vehicle_not_allowed/.test(r.error.message), r.error?.message)
  if (r.data?.id) cleanup.push(r.data.id)

  // Existing jugaad sample listings still present + displayable.
  const { count: samples } = await db.from('listings').select('*', { count: 'exact', head: true }).eq('category', 'jugaad').eq('is_test_data', true)
  ok('existing jugaad sample listings still present', (samples || 0) >= 1, `got ${samples}`)

  for (const id of cleanup) await db.from('listings').delete().eq('id', id)
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e.message); process.exit(1) })
