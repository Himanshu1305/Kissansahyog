// Batch 20 - static checks of supabase/migrations/0075_kissan_mitra.sql and its rollback. The SQL was NOT run against a real
// database in this batch; these tests read the text. Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

const MIG = 'supabase/migrations/0075_kissan_mitra.sql'
const ROLL = 'supabase/migrations/rollback/0075_kissan_mitra_rollback.sql'
const sql = readFileSync(MIG, 'utf8')
const code = sql.replace(/--.*$/gm, '') // no comments
const migrations = readdirSync('supabase/migrations').filter((f) => f.endsWith('.sql'))

// name -> { args, body }
function functions(src) {
  const out = {}
  const parts = src.split(/create or replace function public\./i).slice(1)
  for (const p of parts) {
    const name = p.match(/^(\w+)\(/)[1]
    const end = p.indexOf('$$;') >= 0 ? p.indexOf('$$;') : p.length
    out[name] = { head: p.slice(0, 400), body: p.slice(0, end) }
  }
  return out
}
const fns = functions(code)

test('the migration is the next free number and is pure ASCII (with its rollback)', () => {
  assert.equal(migrations.filter((f) => f.startsWith('0075')).length, 1)
  assert.ok(migrations.includes('0074_morning_video.sql'))
  assert.ok(!migrations.some((f) => /^007[6-9]/.test(f)))
  for (const f of [MIG, ROLL]) assert.ok(!/[^\x00-\x7F]/.test(readFileSync(f, 'latin1')), `non-ASCII byte in ${f}`)
})

test('the registration and OTP functions are NOT re-created, altered or called by any new file', () => {
  for (const name of ['app_register_phone_otp', 'app_register_phone', 'app_signup', 'app_login', 'app_login_otp', 'update_profile']) {
    assert.ok(!new RegExp(name, 'i').test(code), `${name} appears in the Batch 20 SQL`)
  }
  assert.ok(!/otp_required|session_enforced/.test(code), 'the migration must not touch the OTP switches')
  assert.ok(!/site_settings/.test(code))
  // only the files that existed before Batch 20 define the registration functions
  const definers = migrations.filter((f) => /create or replace function public\.app_register_phone(_otp)?\(/i.test(readFileSync(`supabase/migrations/${f}`, 'utf8')))
  assert.ok(definers.every((f) => Number(f.slice(0, 4)) <= 74), definers.join(','))
})

test('nothing is dropped or deleted by the forward migration', () => {
  assert.ok(!/\bdrop\s+(table|function|column|index)/i.test(code))
  assert.ok(!/\bdelete\s+from\b/i.test(code))
  assert.ok(!/\btruncate\b/i.test(code))
  assert.ok(!/\bupdate\s+public\.profiles\s+set\s+(?!mitra_)/i.test(code.replace(/update public\.profiles set mitra_id = p_new_mitra_id[\s\S]*?where id = p_profile_id;/, '')), 'profiles is only updated in mitra_* columns')
})

test('the two tables and the three profile columns exist; RLS is on; no table privileges for anon / authenticated', () => {
  for (const t of ['kissan_mitras', 'kissan_mitra_payments']) {
    assert.match(code, new RegExp(`create table if not exists public\\.${t}`))
    assert.match(code, new RegExp(`alter table public\\.${t} enable row level security`))
    assert.match(code, new RegExp(`revoke all on table public\\.${t} from public, anon, authenticated`))
  }
  for (const c of ['mitra_id', 'mitra_set_at', 'mitra_paid_id']) assert.match(code, new RegExp(`add column if not exists ${c}`))
  assert.ok(!/grant\s+(select|insert|update|delete|all)[^;]*on\s+(table\s+)?public\.(kissan|profiles)/i.test(code))
  assert.match(code, /rate_farmer_rupees\s+integer check \(rate_farmer_rupees is null or/)
  assert.match(code, /rate_business_rupees\s+integer check \(rate_business_rupees is null or/)
  assert.match(code, /amount_rupees\s+integer not null check \(amount_rupees >= 0/)
})

test('functions: exactly the planned set, nothing else', () => {
  assert.deepEqual(Object.keys(fns).sort(), [
    'admin_list_mitra_payments', 'admin_list_mitra_registrations', 'admin_list_mitras', 'admin_mark_mitra_paid', 'admin_reassign_registration',
    'admin_upsert_mitra', 'ks_mitra_kind', 'list_active_mitras', 'set_my_mitra',
  ])
})

test('the grants: anon can run list_active_mitras (public), set_my_mitra and the admin_* functions (all guarded inside); nothing else', () => {
  const granted = [...code.matchAll(/grant execute on function public\.(\w+)\(([^)]*)\) to ([a-z_, ]+);/gi)]
  const toAnon = granted.filter((g) => /\banon\b/.test(g[3])).map((g) => g[1]).sort()
  assert.deepEqual(toAnon, ['admin_list_mitra_payments', 'admin_list_mitra_registrations', 'admin_list_mitras', 'admin_mark_mitra_paid', 'admin_reassign_registration', 'admin_upsert_mitra', 'list_active_mitras', 'set_my_mitra'])
  // every function is revoked from public first, by exact signature
  for (const name of Object.keys(fns)) assert.match(code, new RegExp(`revoke all on function public\\.${name}\\(`), `${name} not revoked from public`)
  assert.ok(!/grant[^;]*\bto\s+public\b/i.test(code))
})

test('every function callable by anon except list_active_mitras checks the caller FIRST (admin session or require_actor)', () => {
  const afterBegin = (body) => body.slice(body.search(/\bbegin\b/i) + 5).trimStart()
  for (const name of ['admin_list_mitras', 'admin_upsert_mitra', 'admin_list_mitra_registrations', 'admin_reassign_registration', 'admin_mark_mitra_paid', 'admin_list_mitra_payments']) {
    assert.match(afterBegin(fns[name].body), /^perform public\.require_admin_session\(p_actor, false\);/, `${name} must check the admin first`)
    assert.match(fns[name].head, /\(p_actor uuid/, `${name} keeps the 0067 parameter name`)
    assert.match(fns[name].body, /security definer/i)
  }
  assert.match(afterBegin(fns.set_my_mitra.body), /^perform public\.require_actor\(p_actor_id\);/)
  assert.match(fns.set_my_mitra.head, /\(p_actor_id uuid, p_mitra_id uuid\)/)
  // list_active_mitras: only id, display_name, area of ACTIVE rows - no phone, no rate, no counts
  const b = fns.list_active_mitras.body
  assert.match(b, /returns table \(id uuid, display_name text, area text\)/)
  assert.match(b, /where m\.is_active/)
  assert.ok(!/private_phone|rate_|count\(/i.test(b))
})

test('the require-actor allowlist is unchanged (it only lists actor functions that must answer; list_active_mitras has no actor parameter)', () => {
  const allow = JSON.parse(readFileSync('scripts/require-actor-allowlist.json', 'utf8')).allow
  assert.deepEqual(Object.keys(allow), ['app_session_valid'])
})

test('set_my_mitra: once, 15 minutes, active Mitra only, and it never raises for a normal no', () => {
  const b = fns.set_my_mitra.body
  assert.match(b, /interval '15 minutes'/)
  assert.match(b, /mitra_id is null/)
  assert.match(b, /is_active/)
  assert.ok(!/raise exception/.test(b.replace(/require_actor/g, '')), 'no raise exception in set_my_mitra')
  for (const s of ['none', 'no_profile', 'already_set', 'too_late', 'no_such_mitra', 'set']) assert.ok(b.includes(`'${s}'`), s)
})

test('profile-update functions never write mitra_* (no old migration mentions it; update_profile sets an explicit column list)', () => {
  for (const f of migrations.filter((x) => !x.startsWith('0075'))) {
    assert.ok(!/mitra_/.test(readFileSync(`supabase/migrations/${f}`, 'utf8')), `${f} mentions mitra_`)
  }
  const up = readFileSync('supabase/migrations/0011_p3_profile.sql', 'utf8')
  assert.match(up, /update public\.profiles set\s+full_name\s+= trim\(p_full_name\),[\s\S]*?preferred_language = v_lang\s+where id = p_actor_id/)
})

test('the money rules: mark-paid stamps only counted-and-unpaid rows of that Mitra, in one function, and refuses when nothing is unpaid', () => {
  const b = fns.admin_mark_mitra_paid.body
  assert.match(b, /where p\.mitra_id = p_mitra_id and p\.mitra_paid_id is null and not p\.is_blocked/)
  assert.match(b, /raise exception 'nothing_unpaid'/)
  assert.match(b, /insert into public\.kissan_mitra_payments/)
  assert.match(b, /for update/)
})

test('reassign: refuses a paid registration, accepts null (none), is logged', () => {
  const b = fns.admin_reassign_registration.body
  assert.match(b, /if v_paid is not null then raise exception 'already_paid'/)
  assert.match(b, /p_new_mitra_id is not null and not exists/)
  assert.match(b, /log_admin_action/)
})

test('registrations list: phone masked to the last 4 digits and the same-name-and-village flag', () => {
  const b = fns.admin_list_mitra_registrations.body
  assert.match(b, /'\*{6}' \|\| right\(p\.phone, 4\)/)
  assert.ok(!/p\.phone\s+as\s+phone|'phone'/.test(b))
  assert.match(b, /same_name_village/)
  assert.match(b, /lower\(btrim\(o\.full_name\)\) = lower\(btrim\(p\.full_name\)\)/)
  assert.match(b, /least\(greatest\(coalesce\(p_limit, 25\), 1\), 100\)/)
})

test('no status, review, approve or reject anywhere in the new SQL', () => {
  assert.ok(!/\b(approve|approved|reject|rejected|pending|review|waiting)\b/i.test(code))
  assert.ok(!/\bstatus\b\s+text/i.test(code.replace(/'status'/g, '')))
})

test('the rollback undoes every new function, column and table, and warns that it deletes Mitra data', () => {
  const r = readFileSync(ROLL, 'utf8')
  assert.match(r, /DELETES the recorded Kissan Mitra data/)
  for (const name of Object.keys(fns)) assert.match(r, new RegExp(`drop function if exists public\\.${name}\\(`), name)
  for (const c of ['mitra_paid_id', 'mitra_set_at', 'mitra_id']) assert.match(r, new RegExp(`drop column if exists ${c}`))
  assert.match(r, /drop table if exists public\.kissan_mitra_payments;[\s\S]*drop table if exists public\.kissan_mitras;/)
  assert.ok(r.indexOf('drop column if exists mitra_paid_id') < r.indexOf('drop table if exists public.kissan_mitra_payments'))
})
