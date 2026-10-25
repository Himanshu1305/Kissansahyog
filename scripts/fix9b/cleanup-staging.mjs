#!/usr/bin/env node
// Batch 9B — delete ONLY this batch's own test rows on STAGING: the listings recorded in
// evidence/fix9b/created-rows.json (all named "KSTEST 9B …"), their photo files, and the pending
// "KSTEST 9B …" village names those posts created. Never touches anything marked KSTEST-KEEP.
//   node --env-file=.env scripts/fix9b/cleanup-staging.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { stagingSql } from './stagingSql.mjs'

const FILE = 'docs/review/batch9/evidence/fix9b/created-rows.json'
const rows = JSON.parse(readFileSync(FILE, 'utf8'))
const ids = rows.map((r) => r.id).filter((x) => /^[0-9a-f-]{36}$/.test(x))
const list = ids.map((x) => `'${x}'`).join(',')
const found = await stagingSql(`select id, village_name, details->'photo_urls' urls from public.listings where id in (${list})`)
const bad = found.filter((r) => !String(r.village_name).startsWith('KSTEST 9B ') || /KEEP/i.test(r.village_name))
if (bad.length) { console.error('REFUSED: rows that are not KSTEST 9B test rows', bad.map((r) => r.id)); process.exit(1) }

// photo files: only paths referenced by these listings
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
const del = await stagingSql(`with d as (delete from public.listings where id in (${list}) and village_name like 'KSTEST 9B %' returning 1) select count(*)::int n from d`)
const vc = await stagingSql(`with d as (delete from public.village_coordinates where village_name like 'KSTEST 9B %' and status = 'pending' returning 1) select count(*)::int n from d`)
const left = await stagingSql(`select count(*)::int n from public.listings where village_name like 'KSTEST 9B %'`)
const out = { at: new Date().toISOString(), listings_recorded: ids.length, listings_deleted: del[0].n, photo_files_referenced: paths.length, photo_files_deleted: removed, test_village_names_deleted: vc[0].n, kstest_9b_listings_left: left[0].n }
console.log(JSON.stringify(out))
writeFileSync('docs/review/batch9/evidence/fix9b/cleanup.json', JSON.stringify(out, null, 1))
