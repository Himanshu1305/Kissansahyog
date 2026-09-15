#!/usr/bin/env node
// Phase 7 — cross-feature integration (email auth + listings + profile + admin + articles).
//   node --env-file=.env scripts/test/p3_phase7.mjs
import { createClient } from '@supabase/supabase-js'
import { anonClient, adminClient, testPhone, cleanupTestData } from '../../e2e/support.js'

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const sb = anonClient()
const admin = adminClient()
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }
const email = `p3int_${Date.now()}@example.com`
const fresh = () => createClient(url, anonKey, { auth: { persistSession: false } })

async function main() {
  await cleanupTestData()
  await admin.from('profiles').delete().eq('email', email)
  await admin.from('articles').delete().like('slug', 'p3int-%')

  // Admin (founder) — is_admin set manually in SQL, simulated here.
  const adminP = (await sb.rpc('app_signup', { p_full_name: 'Founder', p_phone: testPhone(), p_village_town: 'Sagar', p_pincode: '470001', p_language: 'hi', p_disclaimer_accepted: true })).data
  await admin.from('profiles').update({ is_admin: true }).eq('id', adminP.id)

  // Email user signs up, then posts a land listing.
  const c = fresh()
  await c.auth.signUp({ email, password: 'secret12345' })
  const emailP = (await c.rpc('app_signup_email', { p_full_name: 'Email Kisan', p_village_town: 'Sagar', p_pincode: '470001', p_language: 'en' })).data
  check('email user profile created', emailP?.auth_provider === 'email')

  const listing = (await sb.rpc('create_listing', {
    p_actor_id: emailP.id, p_listing_type: 'offer', p_category: 'land',
    p_details: { size_range: '2-5', arrangement: ['lease'], water_source: 'borewell', crop_id: null, season: 'rabi', price_type: 'fixed', price_amount: '₹25000', photo_urls: [] },
    p_latitude: null, p_longitude: null, p_pincode: '470001', p_self_declared: true,
  })).data
  check('email user posted a land listing', !!listing?.id)

  // Profile summary: getMyListings shows 1 active land.
  const mine = (await sb.rpc('get_my_listings', { p_actor_id: emailP.id })).data || []
  check('profile listings summary counts the listing', mine.filter((r) => r.status === 'active' && r.category === 'land').length === 1)

  // Admin sees it (with poster email), stats reflect data + seeded articles.
  const adminListings = (await sb.rpc('get_admin_listings', { p_actor_id: adminP.id, p_limit: 20, p_offset: 0 })).data || []
  check('admin listings show the email user as poster', adminListings.some((r) => r.id === listing.id && r.poster_email === email))
  const stats = await sb.rpc('get_admin_stats', { p_actor_id: adminP.id })
  check('admin stats: >=2 users, >=1 active, >=2 published articles',
    stats.data.users >= 2 && stats.data.active_total >= 1 && stats.data.articles_published >= 2)

  // Moderation removes it from the public feed.
  await sb.rpc('remove_listing', { p_actor_id: adminP.id, p_listing_id: listing.id })
  const publicRows = (await sb.from('listings').select('id').eq('status', 'active').eq('id', listing.id)).data || []
  check('removed listing gone from public feed', publicRows.length === 0)

  // Admin publishes a new article → visible on the public articles endpoint.
  const art = (await sb.rpc('admin_upsert_article', { p_actor_id: adminP.id, p_id: null, p_slug: 'p3int-draft', p_title_hi: 'ड्राफ्ट', p_title_en: 'Draft', p_summary_hi: null, p_summary_en: null, p_content_hi: 'क', p_content_en: 'c', p_author_name: 'Team Kisan Sahyog', p_cover_image_url: null, p_is_published: false })).data
  let pub = (await sb.from('articles').select('id').eq('is_published', true).eq('slug', 'p3int-draft')).data || []
  check('draft article NOT publicly visible', pub.length === 0)
  await sb.rpc('admin_upsert_article', { p_actor_id: adminP.id, p_id: art.id, p_slug: 'p3int-draft', p_title_hi: 'ड्राफ्ट', p_title_en: 'Draft', p_summary_hi: null, p_summary_en: null, p_content_hi: 'क', p_content_en: 'c', p_author_name: 'Team Kisan Sahyog', p_cover_image_url: null, p_is_published: true })
  pub = (await sb.from('articles').select('id,published_at').eq('is_published', true).eq('slug', 'p3int-draft')).data || []
  check('published article now publicly visible', pub.length === 1 && !!pub[0].published_at)

  // Cleanup.
  await admin.from('articles').delete().like('slug', 'p3int-%')
  if (emailP?.auth_uid) await admin.auth.admin.deleteUser(emailP.auth_uid).catch(() => {})
  await admin.from('profiles').delete().eq('email', email)
  await cleanupTestData()

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e); process.exit(1) })
