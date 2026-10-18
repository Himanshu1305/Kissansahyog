// Batch 10E Phase 3B/3C — STAGING proof that create_listing_with_location keeps unknown
// details keys (extra_info, available_from/available_to on land, equipment, labor, drone_didi).
// Run: node --env-file=.env scripts/check-staging-env.mjs && node --env-file=.env scripts/proof-10e-details-keys.mjs
// Creates one KSTEST profile in the reserved 90000xxxxx range, posts one listing per category,
// reads each back, prints only the relevant keys, then deletes the profile (listings cascade).
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
if (!/wzxtqbqlahyahsnoqqva/.test(url || '')) { console.error('not staging — refusing'); process.exit(2) }
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })

const phone = '90000' + String(Date.now() % 100000).padStart(5, '0')
const extra = 'KSTEST पहली पंक्ति\nदूसरी पंक्ति <b>not bold</b> https://example.com'
const { data: prof, error: pErr } = await admin.from('profiles').insert({
  full_name: 'KSTEST Proof 10E', phone, village_town: 'Sagar', pincode: '470001',
  latitude: 23.8388, longitude: 78.7378, preferred_language: 'hi', disclaimer_accepted_at: new Date().toISOString(),
}).select().single()
if (pErr) { console.error('profile insert failed:', pErr.message); process.exit(1) }

const { data: types } = await admin.from('equipment_types').select('id,name_en').eq('name_en', 'Trolley')
const cases = [
  ['land', 'offer', true, { size_acres: '2', price_type: 'negotiable', available_from: '2026-10-20', available_to: '2027-03-31', extra_info: extra }],
  ['equipment', 'requirement', false, { equipment_type_id: types?.[0]?.id, available_now: false, available_from: '2026-10-19', available_to: null, extra_info: extra }],
  ['labor', 'requirement', false, { worker_count: 3, available_from: '2026-10-20', available_to: '2026-10-22', extra_info: extra }],
  ['drone_didi', 'requirement', false, { crop_type: 'KSTEST गेहूं', acreage: '2', service_needed: 'spraying', asset_village: 'Sagar', available_from: '2026-10-21', available_to: null, extra_info: extra }],
]
let ok = true
try {
  for (const [category, type, selfDecl, details] of cases) {
    const { data, error } = await anon.rpc('create_listing_with_location', {
      p_actor_id: prof.id, p_listing_type: type, p_category: category, p_details: details,
      p_latitude: 23.8388, p_longitude: 78.7378, p_pincode: null, p_self_declared: selfDecl,
      p_listing_source: 'farmer', p_wide_visibility: false, p_village_name: 'Sagar', p_rules_agreed: true,
      p_client_request_id: crypto.randomUUID(), p_contact_consent: false,
    })
    if (error) { ok = false; console.log(`${category}/${type}: RPC ERROR ${error.message}`); continue }
    const { data: row } = await admin.from('listings').select('details').eq('id', data.id).single()
    const d = row.details || {}
    const kept = ['extra_info', 'available_from', 'available_to'].map((k) => `${k}=${k in d ? JSON.stringify(d[k]) : '(MISSING)'}`)
    const same = d.extra_info === extra && d.available_from === details.available_from && (d.available_to ?? null) === (details.available_to ?? null)
    if (!same) ok = false
    console.log(`${category}/${type}: ${same ? 'KEPT' : 'CHANGED'} · ${kept.join(' · ')}`)
  }
} finally {
  const { error } = await admin.from('profiles').delete().eq('phone', phone)
  console.log(error ? `cleanup FAILED: ${error.message}` : 'cleanup: KSTEST profile + its listings deleted')
}
console.log(ok ? 'RESULT: details keys are kept (no migration needed)' : 'RESULT: some keys NOT kept')
process.exit(ok ? 0 : 1)
