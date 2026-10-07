// PERMANENT regression suite for V2 Phase 7 — greenhouse/polyhouse hub + marketplace.
// Run: node --env-file=.env scripts/test/v2_phase7.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { CATEGORIES, GH_VENDOR_SUBTYPE, GH_STRUCTURE, CATEGORY_META } from '../../src/lib/listings/catalog.js'
import { WIDE_ELIGIBLE_CATEGORIES } from '../../src/lib/distance.js'
import { greenhousePage } from '../../src/content/pages/greenhouse.js'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

async function main() {
  const { data: farmer } = await db.from('profiles').select('id').eq('phone', '9999000001').maybeSingle()
  if (!farmer) { console.log('FAIL  test farmer missing'); process.exit(1) }
  const cleanup = []
  const base = (lt, details) => ({ p_actor_id: farmer.id, p_listing_type: lt, p_category: 'greenhouse', p_details: details,
    p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false, p_listing_source: lt === 'offer' ? 'vendor' : 'farmer', p_wide_visibility: false, p_village_name: 'Khurai', p_rules_agreed: true })

  // category wired (registry is .jsx — read as text, Node can't import jsx)
  const regSrc = read('src/lib/listings/registry.jsx')
  ok('greenhouse in CATEGORIES + registry ENABLED', CATEGORIES.includes('greenhouse') && /ENABLED_CATEGORIES = \[[^\]]*'greenhouse'/.test(regSrc))
  ok('greenhouse is wide-eligible (100km)', WIDE_ELIGIBLE_CATEGORIES.includes('greenhouse'))
  ok('CATEGORY_META greenhouse label', CATEGORY_META.greenhouse.hi === 'ग्रीनहाउस / पॉलीहाउस')
  ok('Land still LAST', CATEGORIES[CATEGORIES.length - 1] === 'land' && /'transport', 'land'\]/.test(regSrc))
  ok('GH option lists bilingual', GH_VENDOR_SUBTYPE.length === 6 && GH_STRUCTURE.length === 4 && [...GH_VENDOR_SUBTYPE, ...GH_STRUCTURE].every((o) => o.value && o.hi && o.en))

  // create_listing validation
  let r = await db.rpc('create_listing', base('offer', { structure_types: ['polyhouse'], provider_declared: true }))
  ok('NEGATIVE: greenhouse offer without vendor_subtype → vendor_subtype_required', !!r.error && /vendor_subtype_required/.test(r.error.message), r.error?.message)
  r = await db.rpc('create_listing', base('offer', { vendor_subtype: 'construction', structure_types: ['polyhouse'], provider_declared: false }))
  ok('NEGATIVE: greenhouse offer with provider_declared=false → provider_declaration_required', !!r.error && /provider_declaration_required/.test(r.error.message), r.error?.message)
  r = await db.rpc('create_listing', base('offer', { vendor_subtype: 'construction', structure_types: ['polyhouse'], provider_declared: true }))
  ok('POSITIVE: greenhouse vendor offer created', !r.error && !!r.data?.id, r.error?.message)
  if (r.data?.id) cleanup.push(r.data.id)

  r = await db.rpc('create_listing', base('requirement', { area_sqm: '', structure_type: '' }))
  ok('NEGATIVE: greenhouse requirement without structure → gh_structure_required', !!r.error && /gh_structure_required/.test(r.error.message), r.error?.message)
  r = await db.rpc('create_listing', base('requirement', { structure_type: 'polyhouse', area_sqm: '2000', crop: 'capsicum' }))
  ok('POSITIVE: greenhouse farmer requirement created', !r.error && !!r.data?.id, r.error?.message)
  if (r.data?.id) cleanup.push(r.data.id)

  // samples
  const { count: gh } = await db.from('listings').select('*', { count: 'exact', head: true }).eq('category', 'greenhouse').eq('is_test_data', true)
  ok('greenhouse sample listings seeded (≥4)', (gh || 0) >= 4, `got ${gh}`)

  // content page
  const faqBlock = greenhousePage.blocks.find((b) => b.type === 'faq')
  // Batch 3 trimmed the guide to "up to 10 FAQs" and 1,000–1,500 Hindi words (owner
  // wanted shorter, more actionable pages) — assert the new spec, not the old ≥20/≥2500.
  ok('content page has 6–10 FAQs (Batch 3 spec)', (faqBlock?.faqs?.length || 0) >= 6 && (faqBlock?.faqs?.length || 0) <= 10, `got ${faqBlock?.faqs?.length}`)
  ok('content page has a HowTo list', greenhousePage.blocks.some((b) => b.type === 'list' && b.howto))
  ok('content page has the cost-norm table', greenhousePage.blocks.some((b) => b.type === 'table'))
  ok('content page summary present', greenhousePage.blocks[0].type === 'summary')
  const wordCount = JSON.stringify(greenhousePage.blocks).split(/\s+/).length
  ok('content is substantial but trimmed (≥1500 tokens, Batch 3)', wordCount >= 1500, `~${wordCount}`)

  // static wiring
  ok('GreenhouseCalculators + screen exist', read('src/components/GreenhouseCalculators.jsx').length > 0 && read('src/screens/Greenhouse.jsx').length > 0)
  ok('App route /greenhouse', read('src/App.jsx').includes("path=\"/greenhouse\""))
  ok('prerender includes /greenhouse', read('scripts/lib/prerender-routes.mjs').includes("'/greenhouse'"))
  ok('NavBar + homepage tile + AgroForestry link to greenhouse', read('src/components/NavBar.jsx').includes("key: 'greenhouse'") && read('src/screens/Homepage.jsx').includes("path: '/greenhouse'") && read('src/screens/AgroForestry.jsx').includes("navigate('/greenhouse')"))

  for (const id of cleanup) await db.from('listings').delete().eq('id', id)
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e.message); process.exit(1) })
