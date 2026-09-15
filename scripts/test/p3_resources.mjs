#!/usr/bin/env node
// Resources directory — public read, admin RPCs, active/inactive visibility.
//   node --env-file=.env scripts/test/p3_resources.mjs
import { anonClient, adminClient, testPhone, cleanupTestData } from '../../e2e/support.js'

const sb = anonClient()
const admin = adminClient()
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }
const TEST_NAME_EN = 'P3 Test Resource Zzz'

async function main() {
  await cleanupTestData()
  await admin.from('resources').delete().eq('name_en', TEST_NAME_EN)

  // Public read of seeded active resources.
  const pub = (await sb.from('resources').select('*')).data || []
  const byType = pub.reduce((a, r) => ((a[r.resource_type] = (a[r.resource_type] || 0) + 1), a), {})
  check('anon reads active resources', pub.length >= 13, `count=${pub.length}`)
  check('seeded: 3 soil, 4 vet, 6 govt', byType.soil_lab >= 3 && byType.veterinary >= 4 && byType.govt_office >= 6, JSON.stringify(byType))
  check('all public rows are active', pub.every((r) => r.is_active === true))
  check('toll-free numbers present (1962 + 1800-180-1551)',
    pub.some((r) => r.phone_tollfree === '1962') && pub.some((r) => r.phone_tollfree === '1800-180-1551'))

  // Provision an admin.
  const adminP = (await sb.rpc('app_signup', { p_full_name: 'Res Admin', p_phone: testPhone(), p_village_town: 'Sagar', p_pincode: '470001', p_language: 'hi', p_disclaimer_accepted: true })).data
  await admin.from('profiles').update({ is_admin: true }).eq('id', adminP.id)
  const normalP = (await sb.rpc('app_signup', { p_full_name: 'Res Normal', p_phone: testPhone(), p_village_town: 'Khurai', p_pincode: '470117', p_language: 'hi', p_disclaimer_accepted: true })).data

  // NEGATIVE: non-admin cannot read admin resources or write.
  check('non-admin get_admin_resources denied', !!(await sb.rpc('get_admin_resources', { p_actor_id: normalP.id })).error)
  check('anon cannot INSERT resources directly', !!(await sb.from('resources').insert({ resource_type: 'soil_lab', name_hi: 'x', name_en: 'x' }).select()).error)

  // Admin add → appears publicly; admin sees all.
  const created = await sb.rpc('admin_upsert_resource', {
    p_actor_id: adminP.id, p_id: null, p_resource_type: 'veterinary', p_name_hi: 'पी3 परीक्षण', p_name_en: TEST_NAME_EN,
    p_description_hi: null, p_description_en: null, p_address_hi: null, p_address_en: null, p_district: 'Sagar', p_area: 'Khurai',
    p_phone_primary: '9999999999', p_phone_secondary: null, p_phone_tollfree: null, p_email: null, p_website: null,
    p_timings_hi: null, p_timings_en: null, p_is_active: true, p_sort_order: 99,
  })
  check('admin adds a resource', !created.error && !!created.data?.id, created.error?.message)
  const pub2 = (await sb.from('resources').select('id').eq('name_en', TEST_NAME_EN)).data || []
  check('new active resource visible to anon', pub2.length === 1)

  // Toggle inactive → disappears from public, still in admin list.
  await sb.rpc('admin_set_resource_active', { p_actor_id: adminP.id, p_id: created.data.id, p_active: false })
  const pub3 = (await sb.from('resources').select('id').eq('name_en', TEST_NAME_EN)).data || []
  check('inactive resource hidden from anon', pub3.length === 0)
  const adminRes = (await sb.rpc('get_admin_resources', { p_actor_id: adminP.id })).data || []
  check('admin still sees inactive resource', adminRes.some((r) => r.id === created.data.id))

  // Cleanup.
  await admin.from('resources').delete().eq('name_en', TEST_NAME_EN)
  await cleanupTestData()
  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e); process.exit(1) })
