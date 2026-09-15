#!/usr/bin/env node
// v1.1 Phase 5 — Expert Consultation Directory (admin-curated, Model A).
//   node --env-file=.env scripts/test/v11_phase5.mjs
import { anonClient, adminClient } from '../../e2e/support.js'

const sb = anonClient()
const admin = adminClient()
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }

const TEST_INACTIVE_ID = '00000000-0000-4000-a000-0000000e9999'

async function main() {
  // Clean any leftover test row.
  await admin.from('experts').delete().eq('id', TEST_INACTIVE_ID)

  // POSITIVE: anon reads active placeholder experts.
  const active = (await sb.from('experts').select('*')).data || []
  check('anon reads active experts (>=3 placeholders)', active.length >= 3, `count=${active.length}`)
  check('active experts are all is_active=true', active.every((e) => e.is_active === true))
  check('placeholder experts are clearly marked', active.some((e) => /PLACEHOLDER/i.test(e.name)))
  check('experts carry bilingual specialisation + phone',
    active.every((e) => e.phone && (e.specialisation_en || e.specialisation_hi)))

  // NEGATIVE: anon cannot INSERT an expert (RLS default-deny, admin only).
  const ins = await sb.from('experts').insert({ name: 'Rogue', phone: '9000000000' })
  check('anon INSERT denied by RLS', !!ins.error, ins.error?.message)

  // EDGE: an inactive expert (admin-inserted) does NOT appear in the public list.
  const seed = await admin.from('experts').insert({
    id: TEST_INACTIVE_ID, name: 'PLACEHOLDER — Inactive Test', phone: '9111199999', is_active: false,
  })
  check('admin (service role) can insert', !seed.error, seed.error?.message)
  const afterAnon = (await sb.from('experts').select('id')).data || []
  check('inactive expert hidden from anon list', !afterAnon.some((e) => e.id === TEST_INACTIVE_ID))
  // Admin sees it (bypasses RLS).
  const adminSees = (await admin.from('experts').select('id').eq('id', TEST_INACTIVE_ID)).data || []
  check('inactive expert exists (admin view)', adminSees.length === 1)

  // Cleanup the test row.
  await admin.from('experts').delete().eq('id', TEST_INACTIVE_ID)

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e); process.exit(1) })
