#!/usr/bin/env node
// Phase 5 backend checklist — Labor category.
//   node --env-file=.env scripts/test/phase5.mjs
import { anonClient, testPhone, cleanupTestData } from '../../e2e/support.js'

const sb = anonClient()
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }

async function main() {
  await cleanupTestData()
  const { data: actor } = await sb.rpc('app_signup', {
    p_full_name: 'Labor Leader', p_phone: testPhone(), p_village_town: 'Sagar',
    p_pincode: '470001', p_language: 'hi', p_disclaimer_accepted: true,
  })
  const mk = (type, details) => sb.rpc('create_listing', {
    p_actor_id: actor.id, p_listing_type: type, p_category: 'labor',
    p_details: details, p_latitude: null, p_longitude: null, p_pincode: null, p_self_declared: false,
  })

  // Offer, per_day, with rate amount
  const offer = await mk('offer', { worker_count: 5, work_type: 'harvesting', available_from: '2026-10-01', available_to: '2026-10-15', rate_basis: 'per_day', rate_amount: '₹400' })
  check('labor offer (5 workers, per_day, rate) created', !offer.error && offer.data?.details.worker_count === 5, offer.error?.message)

  // Requirement, per_task, rate_amount BLANK (optional)
  const req = await mk('requirement', { worker_count: 12, work_type: 'sowing', available_from: null, available_to: null, rate_basis: 'per_task', rate_amount: '' })
  check('labor requirement (rate_amount blank) created', !req.error && req.data?.details.rate_amount === '', req.error?.message)

  // Negative: worker_count 0
  const zero = await mk('offer', { worker_count: 0, work_type: 'weeding' })
  check('worker_count 0 rejected', !!zero.error && /invalid_worker_count/.test(zero.error.message), zero.error?.message)

  // Negative: worker_count negative
  const neg = await mk('offer', { worker_count: -3, work_type: 'general' })
  check('worker_count negative rejected', !!neg.error && /invalid_worker_count/.test(neg.error.message), neg.error?.message)

  // Negative: from date after to date
  const badDates = await mk('requirement', { worker_count: 4, work_type: 'general', available_from: '2026-10-20', available_to: '2026-10-01' })
  check('available_from after available_to rejected', !!badDates.error && /invalid_date_range/.test(badDates.error.message), badDates.error?.message)

  await cleanupTestData()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e); process.exit(1) })
