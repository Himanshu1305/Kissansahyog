// PERMANENT backend regression suite for Kisan Mela (RLS gates + RPCs, against the live DB).
// Run: node --env-file=.env scripts/test/p_mela_backend.mjs
import { createClient } from '@supabase/supabase-js'
import { spawnSync } from 'node:child_process'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
let pass = 0, fail = 0
const ok = (n, c, e = '') => { c ? (pass++, console.log('PASS ' + n)) : (fail++, console.log('FAIL ' + n + (e ? ' — ' + e : ''))) }
const iso = (off) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + off); return d.toISOString().slice(0, 10) }

async function main() {
  const { data: admin } = await db.from('profiles').select('id').eq('is_admin', true).limit(1).maybeSingle()
  const { data: farmer } = await db.from('profiles').select('id').eq('phone', '9999000001').maybeSingle()
  if (!admin || !farmer) { console.log('FAIL  need an admin + test farmer 9999000001 (run scripts/seed_dummy.mjs)'); process.exit(1) }
  const cleanup = []
  const marker = 'BACKENDTEST ' + (Date.now() % 100000)

  // --- moderation gate: anon submission lands pending + invisible until approved ---
  let e = await anon.from('kisan_mela').insert({ name_hi: 'बैकएंड टेस्ट', venue: marker, state: 'Rajasthan', source_url: 'user-submission', submitted_by_user: true, moderation_status: 'pending', expected_period: 'Mar 2027' })
  ok('anon submission (pending) accepted', !e.error, e.error?.message)
  let vis = await anon.from('kisan_mela').select('id').eq('venue', marker)
  ok('pending submission is NOT publicly visible (moderation gate)', (vis.data || []).length === 0)
  // anon cannot self-approve on insert
  let bad = await anon.from('kisan_mela').insert({ name_hi: 'x', venue: marker + '-bad', state: 'MP', source_url: 'x', submitted_by_user: true, moderation_status: 'approved' })
  ok('anon cannot insert an approved row', !!bad.error)

  // admin sees it in the queue + approves → now visible
  let q = await anon.rpc('get_admin_melas', { p_actor_id: admin.id })
  const row = (q.data || []).find((r) => r.venue === marker)
  ok('admin queue shows the pending submission', !!row && row.moderation_status === 'pending')
  if (row) cleanup.push(row.id)
  await anon.rpc('admin_set_mela_status', { p_actor_id: admin.id, p_id: row.id, p_status: 'approved' })
  let vis2 = await anon.from('kisan_mela').select('id').eq('venue', marker)
  ok('after approve → publicly visible', (vis2.data || []).length === 1)
  // non-admin cannot moderate
  let na = await anon.rpc('admin_set_mela_status', { p_actor_id: farmer.id, p_id: row.id, p_status: 'rejected' })
  ok('non-admin cannot moderate', !!na.error && /not_admin/.test(na.error.message))

  // category CHECK rejects a bogus tag (admin_upsert)
  let badcat = await anon.rpc('admin_upsert_mela', { p_actor_id: admin.id, p_id: null, p_name_hi: 'x', p_name_en: null, p_organizer_name: null, p_venue: marker + '-cat', p_address: null, p_state: 'MP', p_district: null, p_latitude: null, p_longitude: null, p_event_date_start: null, p_event_date_end: null, p_is_date_confirmed: false, p_expected_period: 'Mar 2027', p_category_tags: ['bogus'], p_highlights_hi: null, p_highlights_en: null, p_contact_name: null, p_contact_number: null, p_source_url: 'https://x.gov', p_moderation_status: 'approved', p_is_active: true })
  ok('invalid category tag rejected by CHECK', !!badcat.error)

  // --- interest: owner-scoped add/remove + digest window ---
  const near = await db.from('kisan_mela').insert({ name_hi: 'पास मेला', venue: marker + '-near', state: 'MP', source_url: 'https://x.gov', is_date_confirmed: true, event_date_start: iso(2), event_date_end: iso(2), moderation_status: 'approved', is_active: true }).select('id').single()
  cleanup.push(near.data.id)
  const far = await db.from('kisan_mela').insert({ name_hi: 'दूर मेला', venue: marker + '-far', state: 'MP', source_url: 'https://x.gov', is_date_confirmed: true, event_date_start: iso(30), event_date_end: iso(30), moderation_status: 'approved', is_active: true }).select('id').single()
  cleanup.push(far.data.id)

  let i1 = await anon.rpc('set_mela_interest', { p_actor_id: farmer.id, p_mela_id: near.data.id, p_interested: true })
  ok('set_mela_interest add succeeds', !i1.error && i1.data === true, i1.error?.message)
  await anon.rpc('set_mela_interest', { p_actor_id: farmer.id, p_mela_id: far.data.id, p_interested: true })
  let mine = await anon.rpc('get_my_mela_interests', { p_actor_id: farmer.id })
  ok('get_my_mela_interests returns the flagged melas', (mine.data || []).includes(near.data.id))
  // interest requires a real actor
  let badInt = await anon.rpc('set_mela_interest', { p_actor_id: '00000000-0000-0000-0000-000000000000', p_mela_id: near.data.id, p_interested: true })
  ok('interest with an unknown actor is rejected', !!badInt.error)

  // digest RPC: near (within 3 days) in, far (30 days) out
  let dig = await db.rpc('get_mela_interest_digest', { p_as_of: iso(0) })
  ok('digest includes the within-3-days mela', (dig.data || []).some((d) => d.mela_id === near.data.id))
  ok('digest excludes the 30-days-out mela', !(dig.data || []).some((d) => d.mela_id === far.data.id))
  // digest RPC is NOT anon-exposed (it carries user_ids)
  let anonDig = await anon.rpc('get_mela_interest_digest', { p_as_of: iso(0) })
  ok('digest RPC is not callable by anon (privacy)', !!anonDig.error)

  // remove interest
  await anon.rpc('set_mela_interest', { p_actor_id: farmer.id, p_mela_id: near.data.id, p_interested: false })
  let mine2 = await anon.rpc('get_my_mela_interests', { p_actor_id: farmer.id })
  ok('interest removed', !(mine2.data || []).includes(near.data.id))
  await anon.rpc('set_mela_interest', { p_actor_id: farmer.id, p_mela_id: far.data.id, p_interested: false })

  // --- Re-architecture: source_urls backfill + candidates review + "publish anyway" (Phase 8) ---
  // Backfill is a one-time migration UPDATE (no trigger maintains the invariant), so test the exact
  // migration SQL against a controlled legacy-shaped row: source_url set, source_urls still '{}'.
  const backfillUrl = `https://legacy.example/${marker}`
  const legacy = await db.from('kisan_mela').insert({ name_hi: 'लेगेसी मेला', venue: marker + '-legacy', state: 'MP', source_url: backfillUrl, source_urls: [], is_date_confirmed: false, expected_period: 'Mar 2027', moderation_status: 'approved', is_active: true }).select('id').single()
  cleanup.push(legacy.data.id)
  const BACKFILL_SQL = "update public.kisan_mela set source_urls = array[source_url] where source_url is not null and source_url <> '' and source_urls = '{}';"
  const bf = spawnSync('npm', ['run', '--silent', 'db', 'query', BACKFILL_SQL], { env: process.env, encoding: 'utf8', timeout: 30000 })
  ok('backfill SQL runs without error', bf.status === 0, (bf.stderr || '').slice(0, 200))
  const { data: legacyRow } = await db.from('kisan_mela').select('source_urls').eq('id', legacy.data.id).maybeSingle()
  ok('backfill: a pre-existing row with a real source_url gets source_urls = [source_url]', Array.isArray(legacyRow?.source_urls) && legacyRow.source_urls.length === 1 && legacyRow.source_urls[0] === backfillUrl, JSON.stringify(legacyRow))

  // candidates table is default-deny to anon (RLS), readable only via the admin RPC.
  const candUrl = `https://verify-test.example/${marker}`
  const { data: candIns } = await db.from('kisan_mela_candidates').insert({ source_name: 'ai_broad_search', source_url: candUrl, raw_name: `REJECTED CANDIDATE ${marker}`, raw_venue: 'Test Ground', raw_state: 'Rajasthan', raw_date_text: 'Mar 2027', verification_status: 'rejected', verification_reason: 'test: primary source not found' }).select('id').single()
  const candId = candIns.id
  let anonCand = await anon.from('kisan_mela_candidates').select('id').eq('id', candId)
  ok('candidates table is NOT anon-readable (RLS default-deny)', (anonCand.data || []).length === 0)
  let adminCands = await anon.rpc('get_admin_mela_candidates', { p_actor_id: admin.id })
  ok('admin RPC lists the rejected candidate', (adminCands.data || []).some((c) => c.id === candId))
  let naCands = await anon.rpc('get_admin_mela_candidates', { p_actor_id: farmer.id })
  ok('non-admin cannot read candidates', !!naCands.error && /not_admin/.test(naCands.error.message))

  // "publish anyway" promotes the rejected candidate into the public kisan_mela table.
  let pub = await anon.rpc('admin_publish_candidate', { p_actor_id: admin.id, p_id: candId })
  ok('publish-anyway succeeds for an admin', !pub.error, pub.error?.message)
  const { data: candAfter } = await db.from('kisan_mela_candidates').select('promoted_to_kisan_mela,kisan_mela_id,verification_status,verification_reason').eq('id', candId).maybeSingle()
  ok('candidate marked promoted (verified) + override note after publish-anyway', candAfter?.promoted_to_kisan_mela === true && !!candAfter.kisan_mela_id && candAfter.verification_status === 'verified' && /override/i.test(candAfter.verification_reason || ''))
  if (candAfter?.kisan_mela_id) {
    const { data: promoted } = await db.from('kisan_mela').select('name_hi,moderation_status,is_active').eq('id', candAfter.kisan_mela_id).maybeSingle()
    ok('published row is live (approved + active) with the candidate name', promoted?.moderation_status === 'approved' && promoted.is_active === true && /REJECTED CANDIDATE/.test(promoted.name_hi || ''))
    await db.from('kisan_mela').delete().eq('id', candAfter.kisan_mela_id)
  }
  let naPub = await anon.rpc('admin_publish_candidate', { p_actor_id: farmer.id, p_id: candId })
  ok('non-admin cannot publish-anyway', !!naPub.error && /not_admin/.test(naPub.error.message))
  await db.from('kisan_mela_candidates').delete().eq('id', candId)

  for (const id of cleanup) await db.from('kisan_mela').delete().eq('id', id)
  await db.from('kisan_mela').delete().like('venue', `${marker}%`)
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e.message); process.exit(1) })
