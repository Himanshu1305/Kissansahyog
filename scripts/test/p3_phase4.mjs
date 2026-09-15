#!/usr/bin/env node
// Phase 4 — admin dashboard RPCs (stats, moderation, expert/article mgmt, users).
//   node --env-file=.env scripts/test/p3_phase4.mjs
import { anonClient, adminClient, testPhone, cleanupTestData } from '../../e2e/support.js'

const sb = anonClient()
const admin = adminClient()
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }

async function main() {
  await cleanupTestData()
  // Clean any leftover test article/expert.
  await admin.from('articles').delete().like('slug', 'p3test-%')

  const adminP = (await sb.rpc('app_signup', { p_full_name: 'Admin User', p_phone: testPhone(), p_village_town: 'Sagar', p_pincode: '470001', p_language: 'hi', p_disclaimer_accepted: true })).data
  const normalP = (await sb.rpc('app_signup', { p_full_name: 'Normal User', p_phone: testPhone(), p_village_town: 'Khurai', p_pincode: '470117', p_language: 'hi', p_disclaimer_accepted: true })).data
  // Grant admin (the manual step a founder does in SQL).
  await admin.from('profiles').update({ is_admin: true }).eq('id', adminP.id)

  // Stats (admin ok).
  const stats = await sb.rpc('get_admin_stats', { p_actor_id: adminP.id })
  check('admin get_admin_stats returns counts', !stats.error && typeof stats.data?.users === 'number', stats.error?.message)

  // NEGATIVE: non-admin cannot call admin RPCs.
  const denied = await sb.rpc('get_admin_stats', { p_actor_id: normalP.id })
  check('non-admin get_admin_stats denied', !!denied.error && /not_admin/.test(denied.error.message || ''))

  // Moderation: remove a listing → gone from public browse.
  const listing = (await sb.rpc('create_listing', { p_actor_id: normalP.id, p_listing_type: 'offer', p_category: 'labor', p_details: { worker_count: 2, work_type: 'sowing', available_from: null, available_to: null, rate_basis: 'per_day', rate_amount: '₹300' }, p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false })).data
  const rem = await sb.rpc('remove_listing', { p_actor_id: adminP.id, p_listing_id: listing.id })
  check('admin remove_listing sets removed', !rem.error && rem.data?.status === 'removed', rem.error?.message)
  const publicVisible = (await sb.from('listings').select('id').eq('id', listing.id).eq('status', 'active')).data || []
  check('removed listing hidden from public (status=active) view', publicVisible.length === 0)
  const adminListings = await sb.rpc('get_admin_listings', { p_actor_id: adminP.id, p_limit: 20, p_offset: 0 })
  check('admin listings include poster phone + the removed row',
    !adminListings.error && adminListings.data.some((r) => r.id === listing.id && r.poster_phone === normalP.phone))
  check('non-admin remove_listing denied', !!(await sb.rpc('remove_listing', { p_actor_id: normalP.id, p_listing_id: listing.id })).error)

  // Expert management: add → appears in public directory; deactivate → disappears.
  const exp = await sb.rpc('admin_upsert_expert', { p_actor_id: adminP.id, p_id: null, p_name: 'P3 Test Expert', p_name_hi: 'पी3 विशेषज्ञ', p_specialisation_en: 'Testing', p_specialisation_hi: 'परीक्षण', p_bio_en: 'bio', p_bio_hi: 'परिचय', p_phone: '9111100777', p_organisation: 'QA', p_is_active: true })
  check('admin adds an expert', !exp.error && !!exp.data?.id, exp.error?.message)
  const pubExperts = (await sb.from('experts').select('id').eq('is_active', true)).data || []
  check('new expert appears in public directory', pubExperts.some((e) => e.id === exp.data.id))
  await sb.rpc('admin_set_expert_active', { p_actor_id: adminP.id, p_expert_id: exp.data.id, p_active: false })
  const pubExperts2 = (await sb.from('experts').select('id').eq('is_active', true)).data || []
  check('deactivated expert disappears from public directory', !pubExperts2.some((e) => e.id === exp.data.id))
  await admin.from('experts').delete().eq('id', exp.data.id)

  // Article management: create published → get_admin_articles sees it.
  const art = await sb.rpc('admin_upsert_article', { p_actor_id: adminP.id, p_id: null, p_slug: 'p3test-hello', p_title_hi: 'नमस्ते', p_title_en: 'Hello', p_summary_hi: 's', p_summary_en: 's', p_content_hi: 'सामग्री', p_content_en: 'content', p_author_name: 'Team Kisan Sahyog', p_cover_image_url: null, p_is_published: true })
  check('admin creates published article (published_at set)', !art.error && !!art.data?.published_at, art.error?.message)
  const adminArticles = await sb.rpc('get_admin_articles', { p_actor_id: adminP.id })
  check('get_admin_articles includes it', !adminArticles.error && adminArticles.data.some((a) => a.id === art.data.id))
  await sb.rpc('admin_delete_article', { p_actor_id: adminP.id, p_id: art.data.id })
  await admin.from('articles').delete().like('slug', 'p3test-%')

  // Users list.
  const users = await sb.rpc('get_admin_users', { p_actor_id: adminP.id, p_limit: 25, p_offset: 0, p_search: 'Normal' })
  check('admin users search finds Normal User with listing_count',
    !users.error && users.data.some((u) => u.full_name === 'Normal User' && typeof u.listing_count !== 'undefined'))

  await cleanupTestData()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e); process.exit(1) })
