// PERMANENT regression suite for V2 Phase 11 — interlinking boxes + view counter.
// Run: node --env-file=.env scripts/test/v2_phase11.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { BOXES, pickBoxes } from '../../src/content/boxRegistry.js'
import { strings } from '../../src/lib/i18n/strings.js'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

async function main() {
  // 1. Registry shape: every box is bilingual + has a link + ≥1 page.
  ok('boxRegistry has boxes', BOXES.length >= 10)
  const badBox = BOXES.filter((b) => !(b.id && b.link && b.title?.hi && b.title?.en && Array.isArray(b.pages) && b.pages.length))
  ok('every box bilingual + link + pages', badBox.length === 0, badBox.map((b) => b.id).join(','))

  // 2. Required interlinking rules present (per §Phase 11.2).
  const hasBoxOnPage = (page, id) => BOXES.some((b) => b.id === id && b.pages.includes(page))
  ok('mausam → tanker (summer)', hasBoxOnPage('mausam', 'tanker'))
  ok('mausam → cold storage', hasBoxOnPage('mausam', 'cold_storage'))
  ok('msp → cold storage', hasBoxOnPage('msp', 'cold_storage'))
  ok('msp → harvester/thresher', hasBoxOnPage('msp', 'harvester'))
  ok('greenhouse → drip', hasBoxOnPage('greenhouse', 'drip'))
  ok('greenhouse → cold storage', hasBoxOnPage('greenhouse', 'cold_storage'))
  ok('carbon → agro forestry', hasBoxOnPage('carbon', 'agro_forestry'))
  ok('carbon → jugaad', hasBoxOnPage('carbon', 'jugaad'))
  ok('listing → nearby categories', BOXES.some((b) => b.pages.includes('listing')))
  ok('sawaal → experts', hasBoxOnPage('sawaal', 'experts'))
  ok('sawaal → drone didi', hasBoxOnPage('sawaal', 'drone_qa'))
  ok('sawaal → KVK contacts', hasBoxOnPage('sawaal', 'kvk'))

  // 3. Seasonal gating: tanker shows in May (5) but not December (12).
  ok('tanker shows Mar–Jun', pickBoxes('mausam', 5).some((b) => b.id === 'tanker'))
  ok('tanker hidden in December', !pickBoxes('mausam', 12).some((b) => b.id === 'tanker'))
  ok('harvester shows at harvest (Oct)', pickBoxes('msp', 10).some((b) => b.id === 'harvester'))
  // pickBoxes returns at most max and sorts by priority
  ok('pickBoxes caps at max', pickBoxes('mausam', 6, 3).length <= 3)
  ok('pickBoxes sorted by priority', (() => { const p = pickBoxes('carbon', 6).map((b) => b.priority); return p.every((v, i) => i === 0 || p[i - 1] >= v) })())

  // 4. Strings present + bilingual.
  for (const k of ['related_heading', 'new_near_you_heading', 'most_viewed_heading']) {
    ok(`string ${k} bilingual`, strings[k]?.hi && strings[k]?.en)
  }

  // 5. RelatedBoxes mounted on the required screens.
  const mounted = (file, page) => read(`src/screens/${file}`).includes(`page="${page}"`)
  ok('Mausam mounts RelatedBoxes', mounted('Mausam.jsx', 'mausam'))
  ok('Msp mounts RelatedBoxes', mounted('Msp.jsx', 'msp'))
  ok('Greenhouse mounts RelatedBoxes', mounted('Greenhouse.jsx', 'greenhouse'))
  ok('CarbonCredit mounts RelatedBoxes', mounted('CarbonCredit.jsx', 'carbon'))
  ok('ListingDetail mounts RelatedBoxes', mounted('ListingDetail.jsx', 'listing'))
  ok('Sawaal mounts RelatedBoxes', mounted('Sawaal.jsx', 'sawaal'))

  // 6. Discovery boxes on Homepage + Browse (most viewed).
  ok('Homepage shows most-viewed box', read('src/screens/Homepage.jsx').includes('most_viewed_heading') && read('src/screens/Homepage.jsx').includes('fetchTopViewed'))
  ok('Browse shows most-viewed box', read('src/screens/Browse.jsx').includes('most_viewed_heading') && read('src/screens/Browse.jsx').includes('fetchTopViewed'))

  // 7. View counter RPC: idempotent per device in 24h; increments view_count.
  const { data: sample } = await db.from('listings').select('id,view_count').eq('status', 'active').limit(1).maybeSingle()
  if (sample) {
    const before = sample.view_count || 0
    const dev = `view-test-${Date.now()}`
    let r = await anon.rpc('increment_listing_view', { p_listing_id: sample.id, p_device: dev })
    ok('anon increment_listing_view accepted', !r.error, r.error?.message)
    r = await anon.rpc('increment_listing_view', { p_listing_id: sample.id, p_device: dev })
    ok('increment_listing_view idempotent (same device 24h)', !r.error, r.error?.message)
    const { data: after } = await db.from('listings').select('view_count').eq('id', sample.id).maybeSingle()
    ok('view_count incremented exactly once', (after?.view_count || 0) === before + 1, `before=${before} after=${after?.view_count}`)
    // cleanup
    await db.from('listing_view_log').delete().eq('device_id', dev)
    await db.from('listings').update({ view_count: before }).eq('id', sample.id)
  } else {
    ok('view counter (skipped — no active listing)', true)
  }

  // 8. listing_view_log not anon-readable.
  const { data: rawLog } = await anon.from('listing_view_log').select('id').limit(1)
  ok('anon CANNOT read listing_view_log', !rawLog || rawLog.length === 0)

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
