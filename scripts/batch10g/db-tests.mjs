// Batch 10G Phase 1 — STAGING tests of migration 0065 through the REAL RPCs (anon key, p_actor_id model).
//   node --env-file=.env scripts/check-staging-env.mjs && node --env-file=.env scripts/batch10g/db-tests.mjs [out.md]
// Creates three KSTEST profiles in the reserved 90000xxxxx range (owner, other, admin), listings and one row
// in every child table; checks every rule; deletes everything it created at the end (profiles cascade to
// any listing left). The service-role key is used only for setup, read-back checks and cleanup.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'

const url = process.env.VITE_SUPABASE_URL || ''
if (!/wzxtqbqlahyahsnoqqva/.test(url) || /eltmcznjcqiahqhjvpjg/.test(url)) { console.error('not staging — refusing'); process.exit(2) }
const svc = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const out = process.argv[2]

const lines = []
let pass = 0
let fail = 0
const log = (s) => { lines.push(s); console.log(s) }
const check = (name, ok, detail = '') => { ok ? pass++ : fail++; log(`- ${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`) }
const errCode = (e) => (e ? String(e.message || '').trim() : null)

const stamp = Date.now() % 100000
const phones = { owner: `90000${String(stamp).padStart(5, '0')}`, other: `90000${String((stamp + 1) % 100000).padStart(5, '0')}`, admin: `90000${String((stamp + 2) % 100000).padStart(5, '0')}` }
const prof = {}

async function mkProfile(role) {
  const { data, error } = await svc.from('profiles').insert({
    full_name: `KSTEST 10G ${role}`, phone: phones[role], village_town: 'Sagar', pincode: '470001',
    latitude: 23.8388, longitude: 78.7378, preferred_language: 'hi', disclaimer_accepted_at: new Date().toISOString(),
    ...(role === 'admin' ? { is_admin: true } : {}),
  }).select('id').single()
  if (error) throw new Error(`profile ${role}: ${error.message}`)
  prof[role] = data.id
}
async function mkListing(actor, details = {}) {
  const { data, error } = await anon.rpc('create_listing_with_location', {
    p_actor_id: actor, p_listing_type: 'requirement', p_category: 'labor',
    p_details: { worker_count: 2, available_from: '2026-10-25', available_to: null, extra_info: 'KSTEST 10G', ...details },
    p_latitude: 23.8388, p_longitude: 78.7378, p_pincode: null, p_self_declared: false,
    p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: 'Sagar', p_rules_agreed: true,
    p_client_request_id: crypto.randomUUID(), p_contact_consent: false,
  })
  if (error) throw new Error(`create listing: ${error.message}`)
  return data.id
}
const row = async (id) => (await svc.from('listings').select('id,status,admin_disabled_at,admin_disabled_reason,expires_at').eq('id', id).maybeSingle()).data
const publicSees = async (id) => ((await anon.from('listings').select('id').eq('id', id)).data || []).length > 0
const searchSees = async (id) => ((await anon.rpc('search_listings', { p_query: 'KSTEST', p_limit: 200 })).data || []).some((r) => r.id === id)
const rpc = (name, args) => anon.rpc(name, args)

log(`# Batch 10G — database tests of 0065 on STAGING (${new Date().toISOString()})`)
log('')
try {
  await mkProfile('owner'); await mkProfile('other'); await mkProfile('admin')
  const fakePhoto = 'https://wzxtqbqlahyahsnoqqva.supabase.co/storage/v1/object/public/listing-photos/listings/kstest-10g-dbtest/0.jpg'

  log('## Seller disable / enable')
  const L1 = await mkListing(prof.owner)
  check('a new listing is active and publicly readable', (await row(L1)).status === 'active' && await publicSees(L1))
  check('search_listings finds the active KSTEST listing', await searchSees(L1))
  let r = await rpc('set_my_listing_disabled', { p_actor_id: prof.other, p_listing_id: L1, p_disabled: true })
  check('non-owner cannot disable → not_owner', errCode(r.error) === 'not_owner', errCode(r.error))
  r = await rpc('set_my_listing_disabled', { p_actor_id: prof.owner, p_listing_id: crypto.randomUUID(), p_disabled: true })
  check('unknown listing → not_found', errCode(r.error) === 'not_found', errCode(r.error))
  r = await rpc('set_my_listing_disabled', { p_actor_id: prof.owner, p_listing_id: L1, p_disabled: true })
  check('owner disables → status disabled', !r.error && (await row(L1)).status === 'disabled', errCode(r.error))
  check('disabled listing hidden from public reads (RLS)', !(await publicSees(L1)))
  check('disabled listing hidden from search_listings', !(await searchSees(L1)))
  const mine = (await rpc('get_my_listings', { p_actor_id: prof.owner })).data || []
  const m1 = mine.find((x) => x.id === L1)
  check('get_my_listings still shows it to the owner, admin_disabled = false, old columns kept', !!m1 && m1.status === 'disabled' && m1.admin_disabled === false && 'contact_click_count' in m1 && 'is_expired' in m1)
  r = await rpc('set_my_listing_disabled', { p_actor_id: prof.owner, p_listing_id: L1, p_disabled: false })
  check('owner enables → active and public again', !r.error && (await row(L1)).status === 'active' && await publicSees(L1), errCode(r.error))

  log('')
  log('## Enable does not bypass expiry; closed cannot be toggled')
  const L2 = await mkListing(prof.owner)
  await rpc('set_my_listing_disabled', { p_actor_id: prof.owner, p_listing_id: L2, p_disabled: true })
  const past = new Date(Date.now() - 86400000).toISOString()
  await svc.from('listings').update({ expires_at: past }).eq('id', L2)
  r = await rpc('set_my_listing_disabled', { p_actor_id: prof.owner, p_listing_id: L2, p_disabled: false })
  const r2 = await row(L2)
  check('enabling an expired listing keeps expires_at (still expired, not public)', !r.error && r2.status === 'active' && new Date(r2.expires_at) <= new Date() && !(await publicSees(L2)), errCode(r.error))
  const L3 = await mkListing(prof.owner)
  await rpc('close_listing', { p_actor_id: prof.owner, p_listing_id: L3 })
  r = await rpc('set_my_listing_disabled', { p_actor_id: prof.owner, p_listing_id: L3, p_disabled: true })
  check('closed listing cannot be disabled → invalid_state', errCode(r.error) === 'invalid_state', errCode(r.error))

  log('')
  log('## Admin disable / enable')
  r = await rpc('admin_set_listing_disabled', { p_actor_id: prof.owner, p_listing_id: L1, p_disabled: true, p_reason: 'x' })
  check('non-admin cannot call admin_set_listing_disabled → not_admin', errCode(r.error) === 'not_admin', errCode(r.error))
  r = await rpc('admin_set_listing_disabled', { p_actor_id: prof.admin, p_listing_id: L1, p_disabled: true, p_reason: '   ' })
  check('admin disable needs a reason → reason_required', errCode(r.error) === 'reason_required', errCode(r.error))
  r = await rpc('admin_set_listing_disabled', { p_actor_id: prof.admin, p_listing_id: L1, p_disabled: true, p_reason: 'x'.repeat(301) })
  check('reason over 300 characters → reason_too_long', errCode(r.error) === 'reason_too_long', errCode(r.error))
  r = await rpc('admin_set_listing_disabled', { p_actor_id: prof.admin, p_listing_id: L1, p_disabled: true, p_reason: '  KSTEST गलत जानकारी  ' })
  const a1 = await row(L1)
  check('admin disables → disabled, admin_disabled_at set, reason trimmed', !r.error && a1.status === 'disabled' && !!a1.admin_disabled_at && a1.admin_disabled_reason === 'KSTEST गलत जानकारी', errCode(r.error))
  const m2 = ((await rpc('get_my_listings', { p_actor_id: prof.owner })).data || []).find((x) => x.id === L1)
  check('owner sees admin_disabled = true and the reason', m2?.admin_disabled === true && m2?.admin_disabled_reason === 'KSTEST गलत जानकारी')
  r = await rpc('set_my_listing_disabled', { p_actor_id: prof.owner, p_listing_id: L1, p_disabled: false })
  check('seller cannot enable an admin-disabled listing → disabled_by_admin', errCode(r.error) === 'disabled_by_admin', errCode(r.error))
  const al = (await rpc('get_admin_listings', { p_actor_id: prof.admin, p_limit: 200, p_offset: 0 })).data || []
  const a1row = al.find((x) => x.id === L1)
  check('get_admin_listings returns admin_disabled_at, reason and photo_count (old columns kept)', !!a1row && !!a1row.admin_disabled_at && a1row.admin_disabled_reason === 'KSTEST गलत जानकारी' && a1row.photo_count === 0 && 'poster_phone' in a1row)
  r = await rpc('get_admin_listings', { p_actor_id: prof.owner, p_limit: 5, p_offset: 0 })
  check('non-admin cannot read get_admin_listings → not_admin', errCode(r.error) === 'not_admin', errCode(r.error))
  r = await rpc('admin_set_listing_disabled', { p_actor_id: prof.admin, p_listing_id: L1, p_disabled: false, p_reason: null })
  const a2 = await row(L1)
  check('admin enables → active, marks cleared, public again', !r.error && a2.status === 'active' && !a2.admin_disabled_at && !a2.admin_disabled_reason && await publicSees(L1), errCode(r.error))

  log('')
  log('## Seller permanent delete (child rows, report link, photo paths)')
  const L4 = await mkListing(prof.owner, { photo_urls: [fakePhoto, 'https://example.com/not-ours.jpg'] })
  await svc.from('listing_unavailable_dates').insert({ listing_id: L4, unavailable_date: '2026-11-01' })
  await svc.from('listing_private_contact').insert({ listing_id: L4, contact_phone: phones.owner })
  await svc.from('listing_view_log').insert({ listing_id: L4, device_id: 'kstest-10g' })
  const { data: rep } = await svc.from('listing_reports').insert({ target_type: 'listing', target_id: L4, listing_id: L4, reason: 'other', note: 'KSTEST 10G', status: 'open' }).select('id').single()
  r = await rpc('delete_my_listing', { p_actor_id: prof.other, p_listing_id: L4 })
  check('non-owner cannot delete → not_owner (row still there)', errCode(r.error) === 'not_owner' && !!(await row(L4)), errCode(r.error))
  r = await rpc('delete_my_listing', { p_actor_id: prof.admin, p_listing_id: L4 })
  check('even an admin cannot use the SELLER delete on another\'s listing → not_owner', errCode(r.error) === 'not_owner', errCode(r.error))
  r = await rpc('delete_my_listing', { p_actor_id: prof.owner, p_listing_id: L4 })
  check('owner delete returns only our bucket\'s photo path', !r.error && JSON.stringify(r.data) === JSON.stringify(['listings/kstest-10g-dbtest/0.jpg']), JSON.stringify(r.data) + ' ' + (errCode(r.error) || ''))
  check('the listing row is gone', !(await row(L4)))
  const cnt = async (t) => (await svc.from(t).select('*', { count: 'exact', head: true }).eq('listing_id', L4)).count
  check('child rows gone: unavailable_dates / private_contact / view_log', (await cnt('listing_unavailable_dates')) === 0 && (await cnt('listing_private_contact')) === 0 && (await cnt('listing_view_log')) === 0)
  const repAfter = (await svc.from('listing_reports').select('listing_id,status').eq('id', rep.id).single()).data
  check('the report stays but loses its listing link (set null)', repAfter && repAfter.listing_id === null)
  await svc.from('listing_reports').delete().eq('id', rep.id)
  r = await rpc('delete_my_listing', { p_actor_id: prof.owner, p_listing_id: L4 })
  check('deleting again → not_found', errCode(r.error) === 'not_found', errCode(r.error))

  log('')
  log('## Admin permanent delete (audit row, report resolved)')
  const L5 = await mkListing(prof.other, { photo_urls: [fakePhoto] })
  const { data: rep5 } = await svc.from('listing_reports').insert({ target_type: 'listing', target_id: L5, listing_id: L5, reason: 'fraud', note: 'KSTEST 10G', status: 'open' }).select('id').single()
  r = await rpc('admin_delete_listing', { p_actor_id: prof.owner, p_listing_id: L5, p_reason: 'x' })
  check('non-admin cannot call admin_delete_listing → not_admin', errCode(r.error) === 'not_admin', errCode(r.error))
  r = await rpc('admin_delete_listing', { p_actor_id: prof.admin, p_listing_id: L5, p_reason: '' })
  check('admin delete needs a reason → reason_required', errCode(r.error) === 'reason_required', errCode(r.error))
  const before = (await svc.from('listing_admin_actions').select('*', { count: 'exact', head: true }).eq('listing_id', L5)).count
  r = await rpc('admin_delete_listing', { p_actor_id: prof.admin, p_listing_id: L5, p_reason: 'KSTEST धोखा' })
  check('admin delete returns the photo path and removes the row', !r.error && JSON.stringify(r.data) === JSON.stringify(['listings/kstest-10g-dbtest/0.jpg']) && !(await row(L5)), errCode(r.error))
  const acts = (await svc.from('listing_admin_actions').select('*').eq('listing_id', L5)).data || []
  const del = acts.filter((a) => a.action === 'delete')
  check('exactly one audit row for the delete (before: 0)', before === 0 && del.length === 1)
  check('the audit row holds only admin, listing id, action, category, reason, time', del.length === 1 && JSON.stringify(Object.keys(del[0]).sort()) === JSON.stringify(['action', 'admin_id', 'category', 'created_at', 'id', 'listing_id', 'reason']) && del[0].admin_id === prof.admin && del[0].category === 'labor' && del[0].reason === 'KSTEST धोखा')
  const rep5After = (await svc.from('listing_reports').select('listing_id,status,resolution_note,resolved_by').eq('id', rep5.id).single()).data
  check('the open report was resolved as removed with the reason, link nulled', rep5After.status === 'removed' && rep5After.resolution_note === 'KSTEST धोखा' && rep5After.resolved_by === prof.admin && rep5After.listing_id === null)
  await svc.from('listing_reports').delete().eq('id', rep5.id)
  const auditL1 = (await svc.from('listing_admin_actions').select('action').eq('listing_id', L1)).data || []
  check('admin disable + enable on L1 wrote two audit rows', auditL1.map((a) => a.action).sort().join(',') === 'disable,enable')

  log('')
  log('## The audit table is not readable or writable through the API')
  const ra = await anon.from('listing_admin_actions').select('*').limit(1)
  check('anon select on listing_admin_actions is refused or empty', !!ra.error || (ra.data || []).length === 0, ra.error ? errCode(ra.error) : `${(ra.data || []).length} rows`)
  const wa = await anon.from('listing_admin_actions').insert({ admin_id: prof.admin, listing_id: L1, action: 'delete' })
  check('anon insert on listing_admin_actions is refused', !!wa.error, errCode(wa.error))
  const ws = await anon.from('listings').update({ status: 'active' }).eq('id', L1).select('id')
  check('anon cannot update listings directly (status stays via RPC only)', !!ws.error || (ws.data || []).length === 0)

  // cleanup of audit rows for these KSTEST listings (ids only; no content)
  await svc.from('listing_admin_actions').delete().in('listing_id', [L1, L2, L3, L4, L5])
} catch (e) {
  fail++
  log(`- FAIL — exception: ${e.message}`)
} finally {
  const ids = Object.values(prof)
  if (ids.length) {
    const { error } = await svc.from('profiles').delete().in('id', ids)
    log('')
    log(error ? `cleanup FAILED: ${error.message}` : `cleanup: ${ids.length} KSTEST profiles deleted (their listings cascade)`)
    const left = (await svc.from('listings').select('id', { count: 'exact', head: true }).in('user_id', ids)).count
    log(`listings left for these profiles: ${left}`)
  }
}
log('')
log(`**${pass} passed, ${fail} failed**`)
if (out) writeFileSync(out, lines.join('\n') + '\n')
process.exit(fail ? 1 : 0)
