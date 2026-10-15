#!/usr/bin/env node
// Batch 9B (2A) — who can get whose mobile number, checked on STAGING through the real API.
// Read-only. For every active listing it asks, with the public (anon) key exactly like the app does
// for logged-out AND logged-in users (this app sends every data request with the anon key):
//   1. GET /rest/v1/listings?id=eq.<id>  — does the raw listing JSON contain the owner's number
//      (or the listing's private contact number)?
//   2. RPC get_listing_contact            — does the contact lookup hand out a number?
// The owners' numbers are read through the Management API only to compare; no number is ever
// printed or written. Output: counts per category x source x owner setting (+ consent).
//   node --env-file=.env scripts/fix9b/audit-contact.mjs [--out file.json]
import { writeFileSync } from 'node:fs'
import { stagingSql as runSql } from './stagingSql.mjs'

const STAGING_REF = 'wzxtqbqlahyahsnoqqva'
const URL_ = process.env.VITE_SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY
if (!URL_?.includes(STAGING_REF)) { console.error('REFUSED: not the staging project'); process.exit(1) }
const outIdx = process.argv.indexOf('--out')
const out = outIdx > 0 ? process.argv[outIdx + 1] : null

const hasConsentCol = (await runSql(
  "select count(*)::int n from information_schema.columns where table_schema='public' and table_name='listings' and column_name='contact_consent_at'",
))[0].n > 0

const rows = await runSql(`
  select l.id, l.category, l.listing_source src,
         coalesce(p.consents #>> '{details_visibility,choice}', 'show(default)') vis,
         ${hasConsentCol ? 'l.contact_consent_at is not null' : 'false'} consent,
         right(regexp_replace(coalesce(p.phone,''), '\\D', '', 'g'), 10) owner_phone,
         right(regexp_replace(coalesce(c.contact_phone,''), '\\D', '', 'g'), 10) private_phone
  from public.listings l
  join public.profiles p on p.id = l.user_id
  left join public.listing_private_contact c on c.listing_id = l.id
  where l.status = 'active' and l.expires_at > now()
  order by l.created_at desc
  limit 400`)

const H = { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' }
const groups = {}
for (const r of rows) {
  const phones = [r.owner_phone, r.private_phone].filter((p) => p && p.length === 10)
  const raw = await (await fetch(`${URL_}/rest/v1/listings?id=eq.${r.id}&select=*`, { headers: H })).text()
  const rawLeak = phones.some((p) => raw.includes(p))
  const rpc = await fetch(`${URL_}/rest/v1/rpc/get_listing_contact`, { method: 'POST', headers: H, body: JSON.stringify({ p_listing_id: r.id }) })
  const body = await rpc.text()
  const rpcGives = rpc.ok && phones.some((p) => body.includes(p))
  const rpcHidden = !rpc.ok && body.includes('contact_hidden')
  const key = `${r.category}|${r.src}|${r.vis}|consent=${r.consent}`
  const g = (groups[key] ||= { listings: 0, raw_json_has_number: 0, lookup_gives_number: 0, lookup_says_hidden: 0, lookup_other: 0 })
  g.listings++
  if (rawLeak) g.raw_json_has_number++
  if (rpcGives) g.lookup_gives_number++
  else if (rpcHidden) g.lookup_says_hidden++
  else g.lookup_other++
}

const table = Object.entries(groups).sort().map(([k, v]) => {
  const [category, source, owner_setting, consent] = k.split('|')
  return { category, source, owner_setting, consent: consent.split('=')[1] === 'true', ...v }
})
const leaks = table.filter((t) => t.owner_setting === 'hidden' && t.consent === false && (t.raw_json_has_number || t.lookup_gives_number))
const res = { checked_at: new Date().toISOString(), project: 'staging', listings_checked: rows.length, consent_column: hasConsentCol, table, hidden_owner_leaks: leaks }
console.log(JSON.stringify(res, null, 2))
if (out) writeFileSync(out, JSON.stringify(res, null, 2))
process.exit(0)
