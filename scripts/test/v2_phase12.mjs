// PERMANENT regression suite for V2 Phase 12 — Kisan Sawaal knowledge base.
// Run: node --env-file=.env scripts/test/v2_phase12.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { sources } from '../../src/content/sources.js'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

async function main() {
  // 1. Schema columns present.
  const { data: cols } = await db.rpc('pg_catalog_unavailable', {}).then(() => ({ data: null })).catch(() => ({ data: null }))
  // Verify columns by selecting them on a row.
  let r = await db.from('kisan_sawaal').select('slug,season,answer_blocks,sources,published_at,updated_at').limit(1)
  ok('kisan_sawaal has KB columns (slug/season/answer_blocks/sources/published_at/updated_at)', !r.error, r.error?.message)

  // 2. Every QA data file record has sources + blocks + slug + valid cite ids.
  const qaDir = new URL('../../src/content/qa/', import.meta.url)
  const files = readdirSync(qaDir).filter((f) => f.endsWith('.js'))
  ok('qa data files exist', files.length >= 3)
  let total = 0, badCite = [], noSrc = [], noBlocks = []
  for (const f of files) {
    const mod = await import(new URL(f, qaDir))
    const recs = mod.default || []
    for (const q of recs) {
      total++
      if (!q.sources || !q.sources.length) noSrc.push(q.slug)
      if (!q.blocks || !q.blocks.length) noBlocks.push(q.slug)
      const walk = (b) => {
        for (const id of b.cites || []) if (!sources[id]) badCite.push(`${q.slug}:${id}`)
        for (const it of b.items || []) for (const id of it.cites || []) if (!sources[id]) badCite.push(`${q.slug}:${id}`)
      }
      for (const b of q.blocks || []) walk(b)
    }
  }
  ok(`qa records authored (${total})`, total >= 40)
  ok('every qa record has sources', noSrc.length === 0, noSrc.join(','))
  ok('every qa record has blocks', noBlocks.length === 0, noBlocks.join(','))
  ok('every qa cite id exists in sources.js', badCite.length === 0, badCite.slice(0, 6).join(','))

  // 3. Chemical lines carry the label reminder.
  let missingLabel = []
  for (const f of files) {
    const mod = await import(new URL(f, qaDir))
    for (const q of mod.default || []) {
      const flat = JSON.stringify(q.blocks)
      // Flag only when a pesticide FORMULATION+dose is actually recommended
      // (e.g. "25 EC", "18.5 SC", "75 WP") — then the label reminder is required.
      if (/\d[\d.]*\s*(EC|SC|WP|SG|WG|SL|SP)\b/.test(flat) && !/लेबल पर लिखी मात्रा/.test(flat)) missingLabel.push(q.slug)
    }
  }
  ok('chemical Q&As include the "label dose only" reminder', missingLabel.length === 0, missingLabel.join(','))

  // 4. DB: published KB rows exist with slug + answer_blocks, byline Team Kissan Sahyog.
  r = await anon.from('kisan_sawaal').select('slug,answered_by,answer_blocks').eq('is_published', true).not('slug', 'is', null).not('answer_blocks', 'is', null).limit(50)
  ok('anon reads published KB Q&As (slug + answer_blocks)', !r.error && (r.data || []).length >= 40, r.error?.message || `n=${r.data?.length}`)
  ok('KB answers bylined Team Kissan Sahyog', (r.data || []).every((x) => x.answered_by === 'Team Kissan Sahyog'))

  // 5. A specific slug fetch works (as the detail page does).
  r = await anon.from('kisan_sawaal').select('*').eq('slug', 'pmfby-premium-kitna').eq('is_published', true).maybeSingle()
  ok('fetch Q&A by slug (pmfby-premium-kitna)', !r.error && r.data && Array.isArray(r.data.answer_blocks), r.error?.message)

  // 6. Legacy rows got slugs.
  r = await db.from('kisan_sawaal').select('id').eq('is_published', true).is('slug', null)
  ok('no published row left without a slug', !r.error && (r.data || []).length === 0, `n=${r.data?.length}`)

  // 7. Routing + screens wired.
  ok('App routes /sawaal/:slug + /fasal/:crop/samasya + /sawaal/vishay/:category', (() => {
    const app = read('src/App.jsx')
    return app.includes('/sawaal/:slug') && app.includes('/fasal/:crop/samasya') && app.includes('/sawaal/vishay/:category')
  })())
  ok('SawaalDetail emits QAPage schema', read('src/screens/SawaalDetail.jsx').includes('QAPage'))
  ok('SawaalHub emits ItemList schema', read('src/screens/SawaalHub.jsx').includes('ItemList'))
  ok('SawaalDetail mounts RelatedBoxes + SourcesList', read('src/screens/SawaalDetail.jsx').includes('RelatedBoxes') && read('src/screens/SawaalDetail.jsx').includes('SourcesList'))

  // 8. prerender route builder enumerates crop/category hubs.
  ok('prerender-routes builds /fasal + /sawaal/vishay', (() => {
    const pr = read('scripts/lib/prerender-routes.mjs')
    return pr.includes('/fasal/') && pr.includes('/sawaal/vishay/')
  })())

  // 9. QA_DEMAND.md documents KCC skip + backlog.
  ok('QA_DEMAND.md documents method + backlog', (() => {
    const d = read('docs/research/QA_DEMAND.md')
    return /KCC/.test(d) && /Backlog/i.test(d) && /DATA_GOV_IN_API_KEY/.test(d)
  })())

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error(e); process.exit(1) })
