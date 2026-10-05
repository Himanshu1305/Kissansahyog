// PERMANENT regression suite for V2 Phase 9 — jugaad marketplace + info page.
// Run: node --env-file=.env scripts/test/v2_phase9.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { CATEGORIES, JUGAAD_OFFER_TYPE, JUGAAD_TESTED, CATEGORY_META } from '../../src/lib/listings/catalog.js'
import { jugaadPage } from '../../src/content/pages/jugaad.js'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

async function main() {
  const { data: farmer } = await db.from('profiles').select('id').eq('phone', '9999000001').maybeSingle()
  const cleanup = []
  const base = (details) => ({ p_actor_id: farmer.id, p_listing_type: 'offer', p_category: 'jugaad', p_details: details,
    p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false, p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: 'Khurai', p_rules_agreed: true })

  ok('jugaad in CATEGORIES', CATEGORIES.includes('jugaad'))
  ok('CATEGORY_META jugaad label', CATEGORY_META.jugaad.hi.includes('जुगाड़'))
  ok('offer types incl "विकास में" + bilingual', JUGAAD_OFFER_TYPE.length === 5 && JUGAAD_OFFER_TYPE.some((o) => o.value === 'wip_help') && JUGAAD_OFFER_TYPE.every((o) => o.value && o.hi && o.en))
  ok('tested/untested bilingual', JUGAAD_TESTED.length === 2 && JUGAAD_TESTED.every((o) => o.value && o.hi && o.en))

  // create_listing validation
  let r = await db.rpc('create_listing', base({ innovation_name: 'X', not_road_vehicle: 'true', provider_declared: true }))
  ok('NEGATIVE: jugaad offer without offer_type → jugaad_offer_type_required', !!r.error && /jugaad_offer_type_required/.test(r.error.message), r.error?.message)
  r = await db.rpc('create_listing', base({ offer_type: 'sell', not_road_vehicle: 'true', provider_declared: true }))
  ok('NEGATIVE: jugaad offer without name → jugaad_name_required', !!r.error && /jugaad_name_required/.test(r.error.message), r.error?.message)
  r = await db.rpc('create_listing', base({ offer_type: 'sell', innovation_name: 'सीड यंत्र', provider_declared: true }))
  ok('NEGATIVE: road-vehicle not confirmed → road_vehicle_not_allowed', !!r.error && /road_vehicle_not_allowed/.test(r.error.message), r.error?.message)
  r = await db.rpc('create_listing', base({ offer_type: 'sell', innovation_name: 'सीड यंत्र', not_road_vehicle: 'true' }))
  ok('NEGATIVE: jugaad offer without provider declaration → provider_declaration_required', !!r.error && /provider_declaration_required/.test(r.error.message), r.error?.message)
  r = await db.rpc('create_listing', base({ offer_type: 'service', innovation_name: 'मरम्मत सेवा', not_road_vehicle: 'true', provider_declared: true }))
  ok('POSITIVE: valid jugaad offer created', !r.error && !!r.data?.id, r.error?.message)
  if (r.data?.id) cleanup.push(r.data.id)

  const { count: gh } = await db.from('listings').select('*', { count: 'exact', head: true }).eq('category', 'jugaad').eq('is_test_data', true)
  ok('jugaad sample listings seeded (≥3)', (gh || 0) >= 3, `got ${gh}`)

  // content
  const faqBlock = jugaadPage.blocks.find((b) => b.type === 'faq')
  ok('info page has ≥15 FAQs', (faqBlock?.faqs?.length || 0) >= 15, `got ${faqBlock?.faqs?.length}`)
  ok('info page summary present', jugaadPage.blocks[0].type === 'summary')
  const words = JSON.stringify(jugaadPage.blocks).split(/\s+/).length
  ok('content substantial (≥2500 tokens)', words >= 2500, `~${words}`)
  const txt = JSON.stringify(jugaadPage.blocks)
  ok('soft-help text present, no named institutions commitment', txt.includes('प्रस्तुत/प्रस्तावित') && txt.includes('hello@kissansahyog.com'))
  ok('§9.3: no patent/award solicitation ("पेटेंट/पुरस्कार चाहिए")', !txt.includes('पुरस्कार चाहिए') && !txt.includes('पेटेंट चाहिए'))

  // static wiring
  ok('jugaad category module exists', read('src/components/categories/jugaad.jsx').includes('not_road_vehicle'))
  ok('registry enables jugaad (land last)', /ENABLED_CATEGORIES = \[[^\]]*'jugaad'[^\]]*'land'\]/.test(read('src/lib/listings/registry.jsx')))
  ok('ListingForm maps jugaad provider declaration', read('src/components/ListingForm.jsx').includes("jugaad: 'provider_decl_jugaad'"))
  ok('App route /jugaad', read('src/App.jsx').includes("path=\"/jugaad\""))
  ok('prerender + NavBar + homepage tile for jugaad', read('scripts/lib/prerender-routes.mjs').includes("'/jugaad'") && read('src/components/NavBar.jsx').includes("key: 'jugaad'") && read('src/screens/Homepage.jsx').includes("path: '/jugaad'"))

  for (const id of cleanup) await db.from('listings').delete().eq('id', id)
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e.message); process.exit(1) })
