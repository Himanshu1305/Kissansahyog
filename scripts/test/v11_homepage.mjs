#!/usr/bin/env node
// Homepage redesign — public feed anonymisation + location enrichment.
//   node --env-file=.env scripts/test/v11_homepage.mjs
import { anonClient, testPhone, cleanupTestData } from '../../e2e/support.js'

const sb = anonClient()
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }

async function main() {
  await cleanupTestData()
  const actor = (await sb.rpc('app_signup', {
    p_full_name: 'Homepage Tester', p_phone: testPhone(), p_village_town: 'Khurai',
    p_pincode: '470117', p_language: 'hi', p_disclaimer_accepted: true,
  })).data
  const listing = (await sb.rpc('create_listing', {
    p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'land',
    p_details: { size_range: '2-5', arrangement: ['lease'], water_source: 'borewell', crop_id: null, season: 'rabi', price_type: 'negotiable', price_amount: '', photo_urls: [] },
    p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: true,
  })).data

  // Replicates fetchRecentListings' anon query (safe column projection).
  const feed = (await sb.from('listings')
    .select('id,listing_type,category,pincode,details,created_at')
    .eq('status', 'active').order('created_at', { ascending: false }).limit(12)).data || []
  const mine = feed.find((r) => r.id === listing.id)
  check('new listing appears in public feed', !!mine)

  // NEGATIVE: the public feed carries no poster identity.
  const keys = Object.keys(mine || {})
  check('public feed row has NO phone/name column', !keys.includes('phone') && !keys.includes('full_name') && !keys.includes('user_id'), keys.join(','))

  // Even a wildcard select can't surface a phone (listings has no such column,
  // and profiles is RLS-locked to anon).
  const star = (await sb.from('listings').select('*').eq('id', listing.id).single()).data
  check('wildcard listing select exposes no phone', !('phone' in star) && !('full_name' in star))
  const prof = await sb.from('profiles').select('phone,full_name')
  check('anon cannot read profiles (phone source locked)', (prof.data?.length ?? 0) === 0)

  // Location enrichment resolves village/town + district from the public pincodes table.
  const pin = (await sb.from('pincodes').select('village_town,district').eq('pincode', '470117').single()).data
  check('pincode resolves to village/town + district', !!pin?.village_town && !!pin?.district, `${pin?.village_town}, ${pin?.district}`)

  await cleanupTestData()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e); process.exit(1) })
