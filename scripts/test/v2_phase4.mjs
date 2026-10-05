// PERMANENT regression suite for V2 Phase 4 — legal/trust/compliance:
// provider declarations (server-enforced), listing_reports (submit + rate limit
// + admin queue), sponsored toggle. Run: node --env-file=.env scripts/test/v2_phase4.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const db = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

const equipOffer = (extra) => ({
  p_actor_id: null, p_listing_type: 'offer', p_category: 'equipment',
  p_details: { equipment_type_id: 'tractor' },
  p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false,
  p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: 'Khurai', p_rules_agreed: true, ...extra,
})
const whOffer = (extra) => ({
  p_actor_id: null, p_listing_type: 'offer', p_category: 'warehouse',
  p_details: { warehouse_type: 'godown', capacity_quintals: 500, rate: '₹15/qtl/माह', address: 'Khurai Road' },
  p_latitude: null, p_longitude: null, p_pincode: '470117', p_self_declared: false,
  p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: 'Khurai', p_rules_agreed: true, ...extra,
})

async function main() {
  const { data: farmer } = await db.from('profiles').select('id').eq('phone', '9999000001').maybeSingle()
  if (!farmer) { console.log('FAIL  test farmer 9999000001 missing (run scripts/seed_dummy.mjs)'); process.exit(1) }
  const cleanup = []

  // ---- 1. Provider declaration enforced in create_listing ----
  let r = await db.rpc('create_listing', equipOffer({ p_actor_id: farmer.id }))
  ok('NEGATIVE: equipment offer without provider_declared → provider_declaration_required',
    !!r.error && /provider_declaration_required/.test(r.error.message), r.error?.message)

  r = await db.rpc('create_listing', equipOffer({ p_actor_id: farmer.id, p_details: { equipment_type_id: 'tractor', provider_declared: true } }))
  ok('POSITIVE: equipment offer WITH provider_declared=true is created', !r.error && !!r.data?.id, r.error?.message)
  const equipId = r.data?.id
  if (equipId) cleanup.push(equipId)
  ok('declaration persisted in details', r.data?.details?.provider_declared === true)

  r = await db.rpc('create_listing', whOffer({ p_actor_id: farmer.id }))
  ok('NEGATIVE: warehouse offer without provider_declared → provider_declaration_required',
    !!r.error && /provider_declaration_required/.test(r.error.message), r.error?.message)

  r = await db.rpc('create_listing', whOffer({ p_actor_id: farmer.id, p_details: { warehouse_type: 'godown', capacity_quintals: 500, rate: '₹15', address: 'X', provider_declared: true } }))
  ok('POSITIVE: warehouse offer WITH declaration is created', !r.error && !!r.data?.id, r.error?.message)
  if (r.data?.id) cleanup.push(r.data.id)

  r = await db.rpc('create_listing', { ...whOffer({ p_actor_id: farmer.id }), p_listing_type: 'requirement', p_details: { crop_type: 'गेहूं', quantity_quintals: 50, duration: '3 माह' } })
  ok('POSITIVE: warehouse REQUIREMENT needs no declaration', !r.error && !!r.data?.id, r.error?.message)
  if (r.data?.id) cleanup.push(r.data.id)

  // ---- 2. submit_listing_report ----
  const ip1 = `test-ip-${Date.now()}`
  r = await db.rpc('submit_listing_report', { p_target_type: 'listing', p_target_id: equipId, p_listing_id: equipId, p_reason: 'fraud', p_note: 'test', p_phone: '9999000001', p_ip: ip1 })
  ok('POSITIVE: a valid report is accepted', !r.error, r.error?.message)
  const { data: repRows } = await db.from('listing_reports').select('id,status,reason').eq('reporter_ip', ip1)
  ok('report row stored (status open)', repRows?.length === 1 && repRows[0].status === 'open' && repRows[0].reason === 'fraud')

  r = await db.rpc('submit_listing_report', { p_target_type: 'listing', p_target_id: equipId, p_listing_id: equipId, p_reason: 'bogus', p_note: null, p_phone: null, p_ip: ip1 })
  ok('NEGATIVE: invalid reason → invalid_report_reason', !!r.error && /invalid_report_reason/.test(r.error.message), r.error?.message)

  // Rate limit: fill to 10 within the window (1 already inserted), 11th should fail.
  const ip2 = `test-rl-${Date.now()}`
  for (let i = 0; i < 10; i++) await db.rpc('submit_listing_report', { p_target_type: 'listing', p_target_id: equipId, p_listing_id: equipId, p_reason: 'other', p_note: null, p_phone: null, p_ip: ip2 })
  r = await db.rpc('submit_listing_report', { p_target_type: 'listing', p_target_id: equipId, p_listing_id: equipId, p_reason: 'other', p_note: null, p_phone: null, p_ip: ip2 })
  ok('NEGATIVE: 11th report in an hour → rate_limited', !!r.error && /rate_limited/.test(r.error.message), r.error?.message)

  // ---- 3. Admin queue + resolve + sponsored (promote farmer to admin temporarily) ----
  const { data: prevAdmin } = await db.from('profiles').select('is_admin').eq('id', farmer.id).maybeSingle()
  await db.from('profiles').update({ is_admin: true }).eq('id', farmer.id)
  try {
    r = await db.rpc('get_listing_reports', { p_actor_id: farmer.id, p_status: 'open', p_limit: 100 })
    ok('admin get_listing_reports returns open complaints', !r.error && Array.isArray(r.data) && r.data.length >= 1, r.error?.message)

    r = await db.rpc('admin_set_listing_sponsored', { p_actor_id: farmer.id, p_listing_id: equipId, p_sponsored: true })
    ok('admin_set_listing_sponsored sets the flag', !r.error && r.data?.is_sponsored === true, r.error?.message)

    const repId = repRows?.[0]?.id
    r = await db.rpc('resolve_listing_report', { p_actor_id: farmer.id, p_report_id: repId, p_action: 'removed', p_resolution_note: 'test resolve' })
    ok('resolve_listing_report(removed) closes the complaint', !r.error && r.data?.status === 'removed', r.error?.message)
    const { data: l } = await db.from('listings').select('status').eq('id', equipId).maybeSingle()
    ok('resolving with removed also removes the listing', l?.status === 'removed')
  } finally {
    await db.from('profiles').update({ is_admin: prevAdmin?.is_admin ?? false }).eq('id', farmer.id)
  }

  // Non-admin is rejected.
  r = await db.rpc('get_listing_reports', { p_actor_id: farmer.id, p_status: 'open', p_limit: 10 })
  ok('NEGATIVE: non-admin get_listing_reports → not_admin', !!r.error && /not_admin/.test(r.error.message), r.error?.message)

  // ---- 4. Static wiring ----
  ok('errors.js maps provider_declaration_required', read('src/lib/errors.js').includes('provider_declaration_required'))
  ok('ReportButton + SponsoredBadge components exist', read('src/components/ReportButton.jsx').length > 0 && read('src/components/SponsoredBadge.jsx').length > 0)
  ok('Admin renders ReportsPanel', read('src/screens/Admin.jsx').includes('<ReportsPanel '))
  ok('ListingForm renders provider declaration + ListingDetail renders ReportButton',
    read('src/components/ListingForm.jsx').includes('provider-decl-checkbox') && read('src/screens/ListingDetail.jsx').includes('<ReportButton'))
  ok('Footer + App wire /grievance', read('src/components/layout/Footer.jsx').includes("to=\"/grievance\"") && read('src/App.jsx').includes('/grievance'))

  // cleanup
  await db.from('listing_reports').delete().in('reporter_ip', [ip1, ip2])
  for (const id of cleanup) await db.from('listings').delete().eq('id', id)

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e.message); process.exit(1) })
