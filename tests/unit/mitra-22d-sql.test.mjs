// Batch 22D - static checks of supabase/migrations/0077_mitra_statement.sql and its rollback. The SQL was NOT run against a real
// database in this batch; these tests read the text. Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

const MIG = 'supabase/migrations/0077_mitra_statement.sql'
const ROLL = 'supabase/migrations/rollback/0077_mitra_statement_rollback.sql'
const sql = readFileSync(MIG, 'utf8')
const code = sql.replace(/--.*$/gm, '')
const migrations = readdirSync('supabase/migrations').filter((f) => f.endsWith('.sql'))

test('0077 is the next free number and pure ASCII (with its rollback); it needs 0075 and 0076', () => {
  assert.equal(migrations.filter((f) => f.startsWith('0077')).length, 1)
  for (const f of [MIG, ROLL]) assert.ok(!/[^\x00-\x7F]/.test(readFileSync(f, 'latin1')), `non-ASCII byte in ${f}`)
  assert.match(sql, /Needs 0075 and 0076 applied first/)
})

test('the header says what it does, what it does not do, the error codes, and the current-rate caveat', () => {
  const head = sql.split('\n').filter((l) => l.startsWith('--')).join('\n')
  assert.match(head, /What this file does\b/)
  assert.match(head, /What this file does NOT do/)
  assert.match(head, /Error codes/)
  assert.match(head, /CURRENT rate/)
  assert.match(head, /ONE lump sum/)
})

test('strictly additive and idempotent: one new function, create or replace, nothing dropped, deleted, truncated or altered', () => {
  assert.ok(!/\bdrop\s+/i.test(code))
  assert.ok(!/\bdelete\s+from\b/i.test(code))
  assert.ok(!/\btruncate\b/i.test(code))
  assert.ok(!/\balter\s+table\b/i.test(code))
  assert.ok(!/\bcreate\s+table\b/i.test(code))
  assert.ok(!/\b(insert\s+into|update\s+public\.)/i.test(code), 'read only: no insert, no update')
  const created = [...code.matchAll(/create\s+(or\s+replace\s+)?function\s+public\.(\w+)/gi)]
  assert.deepEqual(created.map((m) => m[2]), ['admin_mitra_statement'])
  assert.ok(created.every((m) => /or\s+replace/i.test(m[0])), 'every function is create or replace')
  for (const never of ['admin_list_mitras', 'admin_list_mitra_registrations', 'admin_mark_mitra_paid', 'admin_reassign_registration', 'create_listing_with_location', 'app_register_phone', 'otp_required', 'session_enforced']) {
    assert.ok(!new RegExp(never, 'i').test(code), `${never} must not appear in 0077`)
  }
})

test('the function is guarded inside by require_admin_session, raises not_found, and clamps the page size to 1..500', () => {
  const body = code.slice(code.indexOf('as $$'))
  assert.ok(body.indexOf('require_admin_session(p_actor, false)') > 0)
  assert.ok(body.indexOf('require_admin_session') < body.indexOf('from public.kissan_mitras'), 'the guard runs before any data is read')
  assert.match(body, /raise exception 'not_found'/)
  assert.match(code, /p_limit integer default 200, p_offset integer default 0/)
  assert.match(code, /least\(greatest\(coalesce\(p_limit, 200\), 1\), 500\)/)
  assert.match(code, /greatest\(coalesce\(p_offset, 0\), 0\)/)
  assert.match(code, /security definer/)
  assert.match(code, /set search_path = public, pg_temp/)
})

test('exact-signature revoke from public and grant to anon, authenticated', () => {
  assert.match(code, /revoke all on function public\.admin_mitra_statement\(uuid, uuid, integer, integer\) from public;/)
  assert.match(code, /grant execute on function public\.admin_mitra_statement\(uuid, uuid, integer, integer\) to anon, authenticated;/)
})

test('the rule is the 0076 rule through the 0076 helpers, not written a second time', () => {
  assert.match(code, /not pp\.is_blocked and public\.ks_mitra_offered\(pp\)/)
  assert.match(code, /public\.ks_mitra_first_offer_at\(pp\) as on_date/)
  assert.ok(!/status\s*<>\s*'removed'/.test(code), 'the "live offer" rule stays in ks_mitra_first_offer_at only')
  assert.ok(!/admin_disabled_at/.test(code))
  assert.match(code, /a\.mitra_id = p_mitra_id/)
  assert.match(code, /public\.kissan_mitra_payments pay on pay\.id = e\.payment_id/, 'paid_on comes from the covering payment')
})

test('no private phone, no full phone, no listing details or photos', () => {
  assert.ok(!/private_phone/.test(code))
  const uses = code.match(/\bpp\.phone\b/g) || []
  assert.equal(uses.length, 2, 'the phone is read only inside the masking expression')
  assert.match(code, /case when pp\.phone is null then null else '\*{6}' \|\| right\(pp\.phone, 4\) end as masked_phone/)
  assert.ok(!/to_jsonb\((pp|p|l)\b/.test(code) && !/\bselect\s+\*\s+from\s+public\.(profiles|listings)/i.test(code))
  for (const banned of ['details', 'photo', 'description', 'title_en', 'price', 'latitude', 'longitude', 'whatsapp', 'email']) {
    assert.ok(!new RegExp(`\\b${banned}\\b`, 'i').test(code), `${banned} must not appear`)
  }
  assert.match(code, /select l\.category from public\.listings l/, 'only the category of the first offer is read from listings')
})

test('the answer has the documented keys', () => {
  for (const k of ["'mitra'", "'totals'", "'rows'", "'farmers'", "'ads'", "'waiting_first_offer'", "'earned_rupees'", "'paid_rupees'", "'due_rupees'", "'rate_missing'", "'display_name'", "'rate_farmer_rupees'", "'rate_business_rupees'"]) {
    assert.ok(code.includes(k), k)
  }
  for (const c of ['kind', 'ref_id', 'name', 'village', 'masked_phone', 'category', 'on_date', 'amount_rupees', 'paid', 'paid_on', 'payment_id', 'blocked']) {
    assert.match(code, new RegExp(`\\b${c}\\b`), c)
  }
  assert.match(code, /false as blocked/)
  assert.match(code, /order by r\.on_date desc, r\.ref_id/)
})

test('the rollback drops only the new function, safe to run twice', () => {
  const r = readFileSync(ROLL, 'utf8').replace(/--.*$/gm, '').trim()
  assert.equal(r, 'drop function if exists public.admin_mitra_statement(uuid, uuid, integer, integer);')
})
