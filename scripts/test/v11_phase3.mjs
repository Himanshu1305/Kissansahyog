#!/usr/bin/env node
// v1.1 Phase 3 — Bhusa/Parali residue category.
//   node --env-file=.env scripts/test/v11_phase3.mjs
import { anonClient, adminClient, testPhone, cleanupTestData } from '../../e2e/support.js'

const sb = anonClient()
const admin = adminClient()
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }

const fullBhusa = (over = {}) => ({
  residue_type: 'bhusa', quantity: '5 quintal', pickup_arrangement: 'buyer_collects',
  buyer_type_preference: 'individual', asking_price: '₹200 per quintal', available_from: null, ...over,
})

async function main() {
  await cleanupTestData()
  const actor = (await sb.rpc('app_signup', {
    p_full_name: 'Residue Seller', p_phone: testPhone(), p_village_town: 'Sagar',
    p_pincode: '470001', p_language: 'hi', p_disclaimer_accepted: true,
  })).data

  // POSITIVE: a Bhusa offer with the residue's own pincode (Khurai 470117).
  const khurai = (await admin.from('pincodes').select('*').eq('pincode', '470117').single()).data
  const offer = await sb.rpc('create_listing', {
    p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'bhusa',
    p_details: fullBhusa(), p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false,
  })
  check('bhusa offer created', !offer.error && offer.data?.category === 'bhusa', offer.error?.message)
  check('bhusa located at residue pincode (Khurai), not poster home',
    Number(offer.data?.latitude) === Number(khurai.latitude) && offer.data?.pincode === '470117')

  // POSITIVE: a commercial Parali requirement.
  const req = await sb.rpc('create_listing', {
    p_actor_id: actor.id, p_listing_type: 'requirement', p_category: 'bhusa',
    p_details: fullBhusa({ residue_type: 'parali', buyer_type_preference: 'commercial' }),
    p_latitude: null, p_longitude: null, p_pincode: '470001', p_self_declared: false,
  })
  check('parali commercial requirement created', !req.error && req.data?.listing_type === 'requirement', req.error?.message)

  // NEGATIVE: missing residue location pincode is rejected (asset-location rule).
  const noPin = await sb.rpc('create_listing', {
    p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'bhusa',
    p_details: fullBhusa(), p_latitude: null, p_longitude: null, p_pincode: '000000', p_self_declared: false,
  })
  check('unknown residue pincode rejected', !!noPin.error && /pincode_not_found/.test(noPin.error.message || ''))

  // NEGATIVE: missing buyer_type_preference rejected server-side.
  const noBuyer = await sb.rpc('create_listing', {
    p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'bhusa',
    p_details: fullBhusa({ buyer_type_preference: '' }),
    p_latitude: null, p_longitude: null, p_pincode: '470001', p_self_declared: false,
  })
  check('missing buyer_type_preference rejected', !!noBuyer.error && /buyer_type_required/.test(noBuyer.error.message || ''))

  // NEGATIVE: missing quantity rejected.
  const noQty = await sb.rpc('create_listing', {
    p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'bhusa',
    p_details: fullBhusa({ quantity: '' }),
    p_latitude: null, p_longitude: null, p_pincode: '470001', p_self_declared: false,
  })
  check('missing quantity rejected', !!noQty.error && /quantity_required/.test(noQty.error.message || ''))

  // Shape: raw row carries exactly the documented bhusa keys.
  const raw = (await admin.from('listings').select('details').eq('id', offer.data.id).single()).data
  const keys = Object.keys(raw.details).sort().join(',')
  check('bhusa details keys exact', keys === 'asking_price,available_from,buyer_type_preference,pickup_arrangement,quantity,residue_type', keys)

  // Anon can read the active bhusa offer (RLS unchanged, category-agnostic).
  const visible = (await sb.from('listings').select('id').eq('category', 'bhusa').eq('status', 'active')).data || []
  check('active bhusa listing visible to anon', visible.some((r) => r.id === offer.data.id))

  await cleanupTestData()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e); process.exit(1) })
