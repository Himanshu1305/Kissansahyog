// Batch 10G Phase 2 — STAGING proof that deleting a listing really removes its photos.
//   node --env-file=.env scripts/check-staging-env.mjs && node --env-file=.env scripts/batch10g/photo-proof.mjs [out.md] [siteBase]
// Uploads real KSTEST photos (anon, like the Post form), creates listings, then:
//   option 1: deletes the storage row in SQL (Management API, as the database owner) — expected to be
//             refused by Supabase's guard; the public URL must still answer;
//   option 2: delete_my_listing / admin_delete_listing (anon RPC) + Storage API remove (anon) — the
//             public URL must answer 404/400, the storage row must be gone;
//   negatives: anon cannot delete an unrelated photo, nor a queued path another listing still uses.
// Everything KSTEST is removed at the end (rows and files, service role).
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'

const url = process.env.VITE_SUPABASE_URL || ''
if (!/wzxtqbqlahyahsnoqqva/.test(url) || /eltmcznjcqiahqhjvpjg/.test(url)) { console.error('not staging — refusing'); process.exit(2) }
const ref = new URL(url).host.split('.')[0]
const svc = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const [out, siteBase] = process.argv.slice(2)
const BUCKET = 'listing-photos'

// smallest valid JPEG (1×1)
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64')

const lines = []
let pass = 0
let fail = 0
const log = (s) => { lines.push(s); console.log(s) }
const check = (name, ok, detail = '') => { ok ? pass++ : fail++; log(`- ${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` (${detail})` : ''}`) }
async function sql(q) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) })
  const text = await res.text()
  return { ok: res.ok, status: res.status, text }
}
// Public URL status: plain, and with a cache-busting query (the CDN may keep a copy for a while).
async function status(u) {
  const a = await fetch(u, { method: 'GET', cache: 'no-store' })
  const b = await fetch(`${u}?kstest=${Date.now()}`, { method: 'GET', cache: 'no-store' })
  return { plain: a.status, busted: b.status, cache: a.headers.get('cf-cache-status') || a.headers.get('x-cache') || '' }
}
const rowExists = async (name) => ((await svc.schema('storage').from('objects').select('name').eq('bucket_id', BUCKET).eq('name', name)).data || []).length > 0
const objectRow = async (name) => { const r = await sql(`select count(*)::int n from storage.objects where bucket_id='${BUCKET}' and name='${name.replace(/'/g, "''")}'`); try { return JSON.parse(r.text)[0].n } catch { return -1 } }

const stamp = Date.now()
const folder = `listings/kstest-10g-${stamp}`
const paths = { a: `${folder}/a.jpg`, b: `${folder}/b.jpg`, c: `${folder}/c.jpg`, d: `${folder}/d.jpg`, e: `${folder}/e.jpg` }
const pub = (p) => anon.storage.from(BUCKET).getPublicUrl(p).data.publicUrl
const prof = {}

log(`# Batch 10G — photo removal proof on STAGING (${new Date().toISOString()})`)
log('')
try {
  for (const p of Object.values(paths)) {
    const { error } = await anon.storage.from(BUCKET).upload(p, JPEG, { contentType: 'image/jpeg', upsert: false })
    if (error) throw new Error(`upload ${p}: ${error.message}`)
  }
  for (const role of ['owner', 'admin']) {
    const phone = `90000${String((stamp + (role === 'admin' ? 7 : 3)) % 100000).padStart(5, '0')}`
    const { data, error } = await svc.from('profiles').insert({ full_name: `KSTEST 10G photo ${role}`, phone, village_town: 'Sagar', pincode: '470001', latitude: 23.8388, longitude: 78.7378, preferred_language: 'hi', disclaimer_accepted_at: new Date().toISOString(), ...(role === 'admin' ? { is_admin: true } : {}) }).select('id').single()
    if (error) throw new Error(`profile: ${error.message}`)
    prof[role] = data.id
  }
  const mk = async (photoPaths) => {
    const { data, error } = await anon.rpc('create_listing_with_location', {
      p_actor_id: prof.owner, p_listing_type: 'requirement', p_category: 'labor',
      p_details: { worker_count: 1, available_from: '2026-10-25', available_to: null, photo_urls: photoPaths.map(pub) },
      p_latitude: 23.8388, p_longitude: 78.7378, p_pincode: null, p_self_declared: false, p_listing_source: 'farmer',
      p_wide_visibility: false, p_village_name: 'Sagar', p_rules_agreed: true, p_client_request_id: crypto.randomUUID(), p_contact_consent: false,
    })
    if (error) throw new Error(`listing: ${error.message}`)
    return data.id
  }

  log('## Option 1 — delete the storage row inside the database')
  const s0 = await status(pub(paths.a))
  check('before: the photo URL answers 200', s0.plain === 200, JSON.stringify(s0))
  const o1 = await sql(`delete from storage.objects where bucket_id='${BUCKET}' and name='${paths.a}'`)
  check('a plain SQL delete of the storage row is REFUSED (Supabase guard storage.protect_delete)', !o1.ok && /Direct deletion from storage tables is not allowed/.test(o1.text), `HTTP ${o1.status}: ${o1.text.replace(/\s+/g, ' ').slice(0, 160)}`)
  const s1 = await status(pub(paths.a))
  check('after the refused SQL delete the photo still answers 200 and its row is there → option 1 does NOT count', s1.plain === 200 && (await objectRow(paths.a)) === 1, JSON.stringify(s1))
  log('- note — the guard can be switched off for one transaction (`storage.allow_delete_query`), but that removes only the database row: Supabase keeps the file bytes as an orphan. Not "removed from the system" → not used.')

  log('')
  log('## Option 2 — seller delete + Storage API remove (anon, queue-gated policy)')
  const L1 = await mk([paths.a, paths.b])
  const un = await anon.storage.from(BUCKET).remove([paths.a])
  check('BEFORE any delete RPC, anon cannot remove a photo of an existing listing (policy refuses; file stays)', (await objectRow(paths.a)) === 1 && (await status(pub(paths.a))).plain === 200, `api: ${JSON.stringify(un.data)} ${un.error?.message || ''}`)
  const r1 = await anon.rpc('delete_my_listing', { p_actor_id: prof.owner, p_listing_id: L1 })
  check('delete_my_listing returns both paths', !r1.error && JSON.stringify([...(r1.data || [])].sort()) === JSON.stringify([paths.a, paths.b].sort()), JSON.stringify(r1.data) + (r1.error?.message || ''))
  const pend = await anon.rpc('get_my_pending_photo_deletions', { p_actor_id: prof.owner })
  check('get_my_pending_photo_deletions lists them for the owner', !pend.error && [paths.a, paths.b].every((p) => (pend.data || []).includes(p)), JSON.stringify(pend.data))
  const rm = await anon.storage.from(BUCKET).remove(r1.data)
  check('anon Storage API remove of the returned paths succeeds', !rm.error && (rm.data || []).length === 2, `${(rm.data || []).length} removed ${rm.error?.message || ''}`)
  check('storage rows of both photos are gone', (await objectRow(paths.a)) === 0 && (await objectRow(paths.b)) === 0)
  const sa = await status(pub(paths.a))
  const sb = await status(pub(paths.b))
  check('the files are gone at the storage origin: every uncached request answers 404/400', [400, 404].includes(sa.busted) && [400, 404].includes(sb.busted), `${JSON.stringify(sa)} ${JSON.stringify(sb)}`)
  check('a photo nobody viewed before also answers 404/400 at its plain URL', [400, 404].includes(sb.plain), JSON.stringify(sb))
  log(`- note — CDN: photo a had been viewed in option 1 (cached); its plain URL answered ${sa.plain} (${sa.cache}). Photos are uploaded with cache-control 3600, so a copy viewed shortly before the delete can stay at the CDN edge for up to 1 hour (HUMAN-REVIEW; re-check of this URL later: evidence/photo-cdn-recheck.txt). URL: ${pub(paths.a)}`)
  const pend2 = await anon.rpc('get_my_pending_photo_deletions', { p_actor_id: prof.owner })
  check('nothing left pending for the owner', !pend2.error && (pend2.data || []).length === 0, JSON.stringify(pend2.data))

  log('')
  log('## Option 2 — admin delete')
  const L2 = await mk([paths.c])
  const r2 = await anon.rpc('admin_delete_listing', { p_actor_id: prof.admin, p_listing_id: L2, p_reason: 'KSTEST photo proof' })
  const rm2 = await anon.storage.from(BUCKET).remove(r2.data || [])
  const sc = await status(pub(paths.c))
  check('admin delete + remove: row and file gone, URL 404/400', !r2.error && !rm2.error && (await objectRow(paths.c)) === 0 && [400, 404].includes(sc.plain), JSON.stringify(sc))

  log('')
  log('## Negatives — nothing else can be deleted through the API')
  const rmd = await anon.storage.from(BUCKET).remove([paths.d])
  check('anon cannot delete an unrelated (never queued) photo', (await objectRow(paths.d)) === 1 && (await status(pub(paths.d))).plain === 200, `api: ${JSON.stringify(rmd.data)} ${rmd.error?.message || ''}`)
  // a queued path that another existing listing still uses: queue it through a delete of a twin listing
  const keep = await mk([paths.e])
  const twin = await mk([paths.e])
  const r3 = await anon.rpc('delete_my_listing', { p_actor_id: prof.owner, p_listing_id: twin })
  await anon.storage.from(BUCKET).remove(r3.data || [])
  check('a queued photo still used by another listing is NOT deleted', (await objectRow(paths.e)) === 1 && (await status(pub(paths.e))).plain === 200)
  const auth = createClient(url, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const ls = await auth.from('listing_photo_deletions').select('*').limit(1)
  check('the queue table is not readable through the API', !!ls.error || (ls.data || []).length === 0, ls.error?.message || `${(ls.data || []).length} rows`)
  await anon.rpc('delete_my_listing', { p_actor_id: prof.owner, p_listing_id: keep })

  if (siteBase) {
    log('')
    log(`## A deleted listing on the site (${siteBase})`)
    const res = await fetch(`${siteBase}/listing/${L1}`)
    check(`GET /listing/<deleted id> answers (the app then shows "not found")`, res.status === 200, `HTTP ${res.status}`)
  }
} catch (e) {
  fail++
  log(`- FAIL — exception: ${e.message}`)
} finally {
  const left = Object.values(paths)
  await svc.storage.from(BUCKET).remove(left)
  const ids = Object.values(prof)
  if (ids.length) await svc.from('profiles').delete().in('id', ids)
  await sql(`delete from public.listing_photo_deletions where object_name like '${folder}/%'`)
  await sql(`delete from public.listing_admin_actions where reason = 'KSTEST photo proof'`)
  let n = 0
  for (const p of left) n += Math.max(0, await objectRow(p))
  log('')
  log(`cleanup: KSTEST profiles deleted (${ids.length}), test files left in storage: ${n}`)
}
log('')
log(`**${pass} passed, ${fail} failed**`)
if (out) writeFileSync(out, lines.join('\n') + '\n')
process.exit(fail ? 1 : 0)
