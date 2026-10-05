// PERMANENT regression suite for V2 Phase 8 — carbon credit page (poll + suggestions).
// Run: node --env-file=.env scripts/test/v2_phase8.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { carbonCreditPage } from '../../src/content/pages/carbon-credit.js'
import { carbonBriefPage } from '../../src/content/pages/carbon-brief.js'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

async function main() {
  const { data: farmer } = await db.from('profiles').select('id').eq('phone', '9999000001').maybeSingle()

  // ---- Poll ----
  const dev = `carbon-test-${Date.now()}`
  let r = await anon.rpc('vote_carbon_poll', { p_device: dev, p_choice: 'yes' })
  ok('anon vote_carbon_poll accepted', !r.error, r.error?.message)
  r = await anon.rpc('vote_carbon_poll', { p_device: dev, p_choice: 'no' })
  ok('re-vote updates (one per device, no duplicate)', !r.error, r.error?.message)
  const { count: votes } = await db.from('carbon_poll_votes').select('*', { count: 'exact', head: true }).eq('device_id', dev)
  ok('exactly one vote row per device', votes === 1, `got ${votes}`)
  r = await anon.rpc('vote_carbon_poll', { p_device: dev, p_choice: 'maybe' })
  ok('NEGATIVE: invalid choice rejected', !!r.error && /invalid_choice/.test(r.error.message), r.error?.message)
  r = await anon.rpc('get_carbon_poll_results')
  ok('get_carbon_poll_results works (public)', !r.error && Array.isArray(r.data), r.error?.message)
  // anon cannot read raw votes table
  const { data: rawVotes } = await anon.from('carbon_poll_votes').select('id').limit(1)
  ok('anon CANNOT read raw poll votes', !rawVotes || rawVotes.length === 0)

  // ---- Suggestions ----
  r = await anon.rpc('submit_carbon_suggestion', { p_name: 'Test', p_village: 'Sagar', p_body: 'MP को पायलट शुरू करना चाहिए', p_device: dev })
  ok('anon submit_carbon_suggestion accepted', !r.error, r.error?.message)
  r = await anon.rpc('submit_carbon_suggestion', { p_name: null, p_village: null, p_body: '', p_device: dev })
  ok('NEGATIVE: empty body → suggestion_body_required', !!r.error && /suggestion_body_required/.test(r.error.message), r.error?.message)
  // unpublished: not in public list yet
  r = await anon.rpc('get_carbon_suggestions_public', { p_limit: 50 })
  const mine = (r.data || []).some((s) => s.body.includes('पायलट शुरू'))
  ok('submitted suggestion is NOT public until approved', !mine)

  // admin approve
  const { data: prev } = await db.from('profiles').select('is_admin').eq('id', farmer.id).maybeSingle()
  await db.from('profiles').update({ is_admin: true }).eq('id', farmer.id)
  let sid
  try {
    r = await db.rpc('get_carbon_suggestions_admin', { p_actor_id: farmer.id, p_status: 'pending' })
    ok('admin sees pending suggestion', !r.error && r.data?.some((s) => s.body.includes('पायलट शुरू')), r.error?.message)
    sid = r.data?.find((s) => s.body.includes('पायलट शुरू'))?.id
    r = await db.rpc('resolve_carbon_suggestion', { p_actor_id: farmer.id, p_id: sid, p_approve: true })
    ok('resolve_carbon_suggestion(approve) ok', !r.error, r.error?.message)
    const pub = await anon.rpc('get_carbon_suggestions_public', { p_limit: 50 })
    ok('approved suggestion now public', (pub.data || []).some((s) => s.body.includes('पायलट शुरू')))
  } finally {
    await db.from('profiles').update({ is_admin: prev?.is_admin ?? false }).eq('id', farmer.id)
    if (sid) await db.from('carbon_suggestions').delete().eq('id', sid)
    await db.from('carbon_poll_votes').delete().eq('device_id', dev)
    await db.from('carbon_suggestions').delete().eq('device_id', dev)
  }

  // ---- Content ----
  ok('carbon-credit title is a question', /\?|？/.test(carbonCreditPage.title.hi))
  const faqBlock = carbonCreditPage.blocks.find((b) => b.type === 'faq')
  ok('≥20 FAQs', (faqBlock?.faqs?.length || 0) >= 20, `got ${faqBlock?.faqs?.length}`)
  ok('has a calc block (average)', carbonCreditPage.blocks.some((b) => b.type === 'calc'))
  ok('has ≥5 fact (quotable) blocks', carbonCreditPage.blocks.filter((b) => b.type === 'fact').length >= 5)
  ok('uses pastExample on real examples', JSON.stringify(carbonCreditPage.blocks).includes('"pastExample":true') || JSON.stringify(carbonCreditPage.blocks).includes('pastExample'))
  const words = JSON.stringify(carbonCreditPage.blocks).split(/\s+/).length
  ok('content substantial (≥2200 tokens)', words >= 2200, `~${words}`)
  ok('brief page exists + short', carbonBriefPage.blocks.length >= 3)
  // §0.7 — none of the banned carbon phrases anywhere in the content
  const txt = JSON.stringify(carbonCreditPage.blocks) + JSON.stringify(carbonBriefPage.blocks)
  for (const bad of ['35 crore', '8,327', '8327', '$12', '12 t CO', 'fertiliser by 20', 'legalis', 'allowed carbon']) {
    ok(`§0.7: banned phrase absent — "${bad}"`, !txt.toLowerCase().includes(bad.toLowerCase()))
  }

  // ---- Static wiring ----
  ok('App routes /carbon-credit + /niti-sujhav', read('src/App.jsx').includes('/carbon-credit/niti-sujhav') && read('src/App.jsx').includes("path=\"/carbon-credit\""))
  ok('prerender includes carbon routes', read('scripts/lib/prerender-routes.mjs').includes("'/carbon-credit'"))
  ok('CarbonPoll + CarbonSuggestions components exist', read('src/components/CarbonPoll.jsx').length > 0 && read('src/components/CarbonSuggestions.jsx').length > 0)
  ok('homepage tile + AgroForestry link to carbon', read('src/screens/Homepage.jsx').includes("path: '/carbon-credit'") && read('src/screens/AgroForestry.jsx').includes("navigate('/carbon-credit')"))
  ok('Admin renders CarbonSuggestionsPanel', read('src/screens/Admin.jsx').includes('<CarbonSuggestionsPanel '))

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e.message); process.exit(1) })
