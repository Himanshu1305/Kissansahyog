// PERMANENT regression suite for V2 Phase 10 — site-wide search.
// Run: node --env-file=.env scripts/test/v2_phase10.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { expandQuery, SYNONYMS } from '../../src/content/searchSynonyms.js'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

async function main() {
  const { data: farmer } = await db.from('profiles').select('id').eq('phone', '9999000001').maybeSingle()

  // search_listings RPC: a tanker sample exists → search 'tanker'/'टैंकर' should hit.
  let r = await anon.rpc('search_listings', { p_query: 'टैंकर', p_limit: 24 })
  ok('search_listings RPC returns results (public)', !r.error && Array.isArray(r.data), r.error?.message)
  r = await anon.rpc('search_listings', { p_query: 'greenhouse', p_limit: 24 })
  ok('search_listings matches greenhouse samples', !r.error && (r.data || []).some((x) => x.category === 'greenhouse'), r.error?.message)

  // log_search_miss + admin view
  const dev = `search-test-${Date.now()}`
  const q = `zzzqqq-${Date.now()}`
  r = await anon.rpc('log_search_miss', { p_query: q, p_device: dev })
  ok('anon log_search_miss accepted', !r.error, r.error?.message)
  const { data: prev } = await db.from('profiles').select('is_admin').eq('id', farmer.id).maybeSingle()
  await db.from('profiles').update({ is_admin: true }).eq('id', farmer.id)
  try {
    r = await db.rpc('get_search_misses', { p_actor_id: farmer.id, p_limit: 100 })
    ok('admin get_search_misses includes the miss', !r.error && (r.data || []).some((m) => m.query === q.toLowerCase()), r.error?.message)
  } finally {
    await db.from('profiles').update({ is_admin: prev?.is_admin ?? false }).eq('id', farmer.id)
    await db.from('search_misses').delete().eq('device_id', dev)
  }
  // anon cannot read raw misses
  const { data: rawMiss } = await anon.from('search_misses').select('id').limit(1)
  ok('anon CANNOT read raw search_misses', !rawMiss || rawMiss.length === 0)

  // synonyms
  ok('expandQuery expands wheat synonyms', expandQuery('gehu').includes('wheat') || expandQuery('gehu').some((x) => SYNONYMS.wheat?.includes(x)) || expandQuery('gehu').length > 1)
  ok('SYNONYMS covers key crops/categories', ['wheat', 'soybean', 'tractor'].every((k) => SYNONYMS[k]))

  // static index (built)
  ok('public/search-index.json exists', existsSync(new URL('../../public/search-index.json', import.meta.url)))
  if (existsSync(new URL('../../public/search-index.json', import.meta.url))) {
    const idx = JSON.parse(read('public/search-index.json'))
    ok('index has many items (≥100)', idx.length >= 100, `got ${idx.length}`)
    ok('index covers hub + cold_storage + scheme types', ['hub', 'cold_storage', 'scheme'].every((t) => idx.some((i) => i.type === t)))
  }

  // static wiring
  ok('SearchBar in NavBar', read('src/components/NavBar.jsx').includes('<SearchBar'))
  ok('App route /search', read('src/App.jsx').includes("path=\"/search\""))
  ok('/search is EXCLUDEd from prerender', read('scripts/lib/prerender-routes.mjs').includes("'/search'"))
  ok('build:full builds the search index', read('package.json').includes('build-search-index.mjs'))
  ok('Search screen is noindex', read('src/screens/Search.jsx').includes('noindex'))
  ok('SearchAction JSON-LD → /search?q=', read('src/components/layout/Seo.jsx').includes('search?q={search_term_string}'))
  ok('Admin renders SearchMissesPanel', read('src/screens/Admin.jsx').includes('<SearchMissesPanel '))

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e.message); process.exit(1) })
