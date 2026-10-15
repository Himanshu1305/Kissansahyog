#!/usr/bin/env node
// Batch 9C — delete ONLY this batch's own test rows on STAGING: the listings recorded in
// evidence/fix9c/created-rows.json (all with a village name "KSTEST 9C …"), any photo files they reference,
// and the pending "KSTEST 9C …" village names those posts created. Never touches anything marked KSTEST-KEEP.
//   node --env-file=.env scripts/fix9c/cleanup-staging.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { stagingSql } from '../fix9b/stagingSql.mjs'

const FILE = 'docs/review/batch9/evidence/fix9c/created-rows.json'
const rows = JSON.parse(readFileSync(FILE, 'utf8'))
const ids = [...new Set(rows.map((r) => r.id).filter((x) => /^[0-9a-f-]{36}$/.test(x)))]
const list = ids.map((x) => `'${x}'`).join(',') || "'00000000-0000-0000-0000-000000000000'"
const found = await stagingSql(`select id, village_name, details->'photo_urls' urls from public.listings where id in (${list})`)
const bad = found.filter((r) => !String(r.village_name).startsWith('KSTEST 9C ') || /KEEP/i.test(r.village_name))
if (bad.length) { console.error('REFUSED: rows that are not KSTEST 9C test rows', bad.map((r) => r.id)); process.exit(1) }

const paths = found.flatMap((r) => (r.urls || []).map((u) => String(u).split('/object/public/listing-photos/')[1]).filter(Boolean))
let removed = 0
if (paths.length) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/storage/v1/object/listing-photos`, {
    method: 'DELETE', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: paths }),
  })
  removed = res.ok ? (await res.json()).length : 0
  if (!res.ok) console.error('photo delete failed', res.status)
}
const keepBefore = await stagingSql(`select count(*)::int n from public.listings where village_name like 'KSTEST-KEEP%' or details::text like '%KSTEST-KEEP%'`)
const del = await stagingSql(`with d as (delete from public.listings where id in (${list}) and village_name like 'KSTEST 9C %' returning 1) select count(*)::int n from d`)
const vc = await stagingSql(`with d as (delete from public.village_coordinates where village_name like 'KSTEST 9C %' and status = 'pending' returning 1) select count(*)::int n from d`)
const left = await stagingSql(`select count(*)::int n from public.listings where village_name like 'KSTEST 9C %'`)
const keepAfter = await stagingSql(`select count(*)::int n from public.listings where village_name like 'KSTEST-KEEP%' or details::text like '%KSTEST-KEEP%'`)
const out = { at: new Date().toISOString(), listings_recorded: ids.length, listings_deleted: del[0].n, photo_files_referenced: paths.length, photo_files_deleted: removed, test_village_names_deleted: vc[0].n, kstest_9c_listings_left: left[0].n, kstest_keep_before: keepBefore[0].n, kstest_keep_after: keepAfter[0].n }
console.log(JSON.stringify(out))
writeFileSync('docs/review/batch9/evidence/fix9c/cleanup.json', JSON.stringify(out, null, 1))
