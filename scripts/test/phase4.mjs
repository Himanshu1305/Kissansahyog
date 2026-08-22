#!/usr/bin/env node
// Phase 4 backend checklist — Equipment category.
//   node --env-file=.env scripts/test/phase4.mjs
import { anonClient, testPhone, cleanupTestData } from '../../e2e/support.js'

const sb = anonClient()
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }

async function main() {
  await cleanupTestData()
  const { data: types } = await sb.from('equipment_types').select('*').order('id')
  const tractor = types.find((t) => t.name_en === 'Tractor')
  const thresher = types.find((t) => t.name_en === 'Thresher')

  const { data: actor } = await sb.rpc('app_signup', {
    p_full_name: 'Equip Poster', p_phone: testPhone(), p_village_town: 'Sagar',
    p_pincode: '470001', p_language: 'hi', p_disclaimer_accepted: true,
  })

  // Offer, per_hour, available now
  const offer = await sb.rpc('create_listing', {
    p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'equipment',
    p_details: { equipment_type_id: tractor.id, rental_basis: 'per_hour', available_now: true, available_from: null, available_to: null },
    p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: false,
  })
  check('equipment offer (tractor, per_hour, now) created', !offer.error && offer.data?.category === 'equipment', offer.error?.message)

  // Requirement, per_acre, date range
  const req = await sb.rpc('create_listing', {
    p_actor_id: actor.id, p_listing_type: 'requirement', p_category: 'equipment',
    p_details: { equipment_type_id: thresher.id, rental_basis: 'per_acre', available_now: false, available_from: '2026-09-01', available_to: '2026-09-30' },
    p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: false,
  })
  check('equipment requirement (thresher, per_acre, dates) created', !req.error && req.data?.listing_type === 'requirement', req.error?.message)

  // Negative: no equipment type -> equipment_type_required
  const noType = await sb.rpc('create_listing', {
    p_actor_id: actor.id, p_listing_type: 'offer', p_category: 'equipment',
    p_details: { rental_basis: 'per_day', available_now: true },
    p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: false,
  })
  check('equipment without type rejected', !!noType.error && /equipment_type_required/.test(noType.error.message), noType.error?.message)

  // Equipment never requires self-declaration even as an offer.
  check('equipment offer self_declared stays false', offer.data?.self_declared === false)

  await cleanupTestData()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e); process.exit(1) })
