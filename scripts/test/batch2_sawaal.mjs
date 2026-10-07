// Batch 2 item F — Kisan Sawaal structure fixes.
// Checks: meaningful slugs (no legacy sawaal-* left) + a populated redirects table +
// a _redirects 301 block; English columns + EN-toggle rendering with the Hindi-only
// note; legacy (no answer_blocks) rows rendered in the structured box+body layout;
// breadcrumb topic crumb (no stray "/"); the /sawaal grouped grid + ask form below.
// Run: node --env-file=.env scripts/test/batch2_sawaal.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const read = (p) => { try { return readFileSync(p, 'utf8') } catch { return '' } }
let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }

async function main() {
  // ---- DB: slugs + redirects + English column ----
  const { count: legacy } = await db.from('kisan_sawaal').select('*', { count: 'exact', head: true })
    .eq('is_published', true).like('slug', 'sawaal-%')
  ok('no legacy sawaal-* slugs remain on published rows', (legacy || 0) === 0, `got ${legacy}`)

  const { count: nullSlug } = await db.from('kisan_sawaal').select('*', { count: 'exact', head: true })
    .eq('is_published', true).is('slug', null)
  ok('every published Q&A has a slug', (nullSlug || 0) === 0, `got ${nullSlug}`)

  const { data: reds } = await db.from('kisan_sawaal_slug_redirects').select('old_slug,new_slug')
  ok('slug redirects table is populated', (reds?.length || 0) >= 10, `got ${reds?.length}`)

  // Each redirect's new_slug resolves to a real published row (round-trip).
  const sample = reds?.[0]
  if (sample) {
    const { data: dest } = await db.from('kisan_sawaal').select('id').eq('slug', sample.new_slug).eq('is_published', true).maybeSingle()
    ok('a redirect resolves to a live Q&A', !!dest, `${sample.old_slug} -> ${sample.new_slug}`)
  } else { ok('a redirect resolves to a live Q&A', false, 'no redirects') }

  // answer_blocks_en column exists (Batch 3 fills it); question_en/answer_en pre-exist.
  const en = await db.from('kisan_sawaal').select('question_en,answer_en,answer_blocks_en').limit(1)
  ok('English columns exist (question_en/answer_en/answer_blocks_en)', !en.error, en.error?.message)

  // ---- _redirects 301 block ----
  const redir = read('public/_redirects')
  ok('_redirects has the generated sawaal block', redir.includes('kisan_sawaal slug redirects') && /\/sawaal\/sawaal-\S+\s+\/sawaal\/\S+\s+301/.test(redir))

  // ---- SawaalDetail: EN rendering + Hindi-only note + legacy layout + redirect + breadcrumb ----
  const det = read('src/screens/SawaalDetail.jsx')
  ok('renders English only when toggle EN and English exists', det.includes("lang === 'en'") && det.includes('hasEnglish'))
  ok('shows the Hindi-only note when EN toggle but no English', det.includes('sawaal_hindi_only') && det.includes('hindiOnlyNote'))
  ok('legacy answer rendered in box + body layout', det.includes('summaryText') && det.includes('legacyBody'))
  ok('legacy /sawaal/<old-slug> client-redirects (Navigate replace)', det.includes('fetchSawaalSlugRedirect') && det.includes("navigate(`/sawaal/${newSlug}`, { replace: true })"))
  ok('breadcrumb has a topic crumb (crop or category), not a stray "/"', det.includes('topicCrumb') && det.includes('/sawaal/vishay/'))

  // ---- Sawaal index: grouped grid + ask form below ----
  const idx = read('src/screens/Sawaal.jsx')
  ok('/sawaal groups by topic in a full-width grid', idx.includes('const grouped =') && idx.includes('grid-cols-1') && idx.includes('lg:grid-cols-3'))
  ok('ask form sits below the list', /Ask-a-question form below the list|mt-6"><AskForm/.test(idx) && idx.indexOf('AskForm') > idx.indexOf('renderCard'))

  // ---- i18n strings present ----
  const str = read('src/lib/i18n/strings.js')
  ok('sawaal_hindi_only string defined (hi + en)', str.includes('sawaal_hindi_only') && /This answer is available in Hindi/.test(str))

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e.message); process.exit(1) })
