// Batch 22 - static checks of supabase/migrations/0076_mitra_at_offer.sql and its rollback. The SQL was NOT run against a real
// database in this batch; these tests read the text. Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

const MIG = 'supabase/migrations/0076_mitra_at_offer.sql'
const ROLL = 'supabase/migrations/rollback/0076_mitra_at_offer_rollback.sql'
const sql = readFileSync(MIG, 'utf8')
const code = sql.replace(/--.*$/gm, '')
const migrations = readdirSync('supabase/migrations').filter((f) => f.endsWith('.sql'))

function functions(src) {
  const out = {}
  for (const p of src.split(/create or replace function public\./i).slice(1)) {
    const name = p.match(/^(\w+)\(/)[1]
    const end = p.indexOf('$$;') >= 0 ? p.indexOf('$$;') : p.length
    out[name] = { head: p.slice(0, 400), body: p.slice(0, end) }
  }
  return out
}
const fns = functions(code)
const afterBegin = (body) => body.slice(body.search(/\bbegin\b/i) + 5).trimStart()

test('0076 is the next free number, pure ASCII (with its rollback), and only needs 0075', () => {
  assert.equal(migrations.filter((f) => f.startsWith('0076')).length, 1)
  assert.ok(migrations.includes('0075_kissan_mitra.sql'))
  for (const f of [MIG, ROLL]) assert.ok(!/[^\x00-\x7F]/.test(readFileSync(f, 'latin1')), `non-ASCII byte in ${f}`)
  assert.match(sql, /Needs 0075 applied first/)
})

test('the header says what it does, what it does not do, and the error codes', () => {
  const head = sql.split('\n').filter((l) => l.startsWith('--')).join('\n')
  assert.match(head, /What this file does\b/)
  assert.match(head, /What this file does NOT do/)
  assert.match(head, /Error codes/)
  assert.match(head, /rate_business_rupees means "rupees per ad"/, 'the ads-as-businesses rule is stated plainly')
})

test('strictly additive: nothing dropped, deleted, truncated; no existing function is re-created except the four allowed', () => {
  assert.ok(!/\bdrop\s+(table|function|column|index)/i.test(code))
  assert.ok(!/\bdelete\s+from\b/i.test(code))
  assert.ok(!/\btruncate\b/i.test(code))
  assert.ok(!/\balter\s+table[^;]*\b(drop|alter\s+column|rename)\b/i.test(code))
  assert.deepEqual(Object.keys(fns).sort(), [
    'admin_get_announcement_mitras', 'admin_list_mitra_ads', 'admin_list_mitra_registrations', 'admin_list_mitras', 'admin_mark_mitra_paid',
    'admin_reassign_registration', 'admin_set_announcement_mitra', 'ks_mitra_first_offer_at', 'ks_mitra_offered', 'my_mitra_choice_open', 'set_my_mitra_on_offer',
  ])
  for (const never of ['create_listing_with_location', 'app_register_phone', 'app_register_phone_otp', 'app_signup', 'set_my_mitra\\(', 'admin_upsert_announcement', 'admin_list_announcements', 'admin_duplicate_announcement', 'admin_delete_announcement', 'get_active_announcements', 'otp_required', 'session_enforced', 'site_settings']) {
    assert.ok(!new RegExp(never, 'i').test(code), `${never} must not appear in 0076`)
  }
})

test('idempotent: columns and indexes are "if not exists", every function is create or replace', () => {
  for (const c of ['mitra_id', 'mitra_paid_id']) assert.match(code, new RegExp(`alter table public\\.announcements add column if not exists ${c} uuid references`))
  assert.match(code, /create index if not exists announcements_mitra_idx/)
  assert.ok(!/create function/i.test(code))
  assert.ok(!/create table(?! if not exists)/i.test(code))
})

test('"offered" is defined in ONE place: ks_mitra_offered, built on the first-offer helper, with the exact rule', () => {
  assert.match(fns.ks_mitra_first_offer_at.body, /l\.listing_type = 'offer' and l\.status <> 'removed' and l\.admin_disabled_at is null/)
  assert.match(fns.ks_mitra_offered.body, /ks_mitra_first_offer_at\(p\) is not null/)
  // the counting functions use the helper and never repeat the rule for counting
  for (const n of ['admin_list_mitras', 'admin_mark_mitra_paid']) {
    assert.match(fns[n].body, /ks_mitra_offered\(/, `${n} uses ks_mitra_offered`)
    assert.ok(!/listing_type = 'offer'/.test(fns[n].body), `${n} must not re-define "offered"`)
  }
  assert.match(fns.admin_list_mitras.body, /unattributed_total'?,\s*\(select count\(\*\) from public\.profiles p where p\.mitra_id is null and public\.ks_mitra_offered\(p\)\)/)
})

test('my_mitra_choice_open: guarded by require_actor, true only with no Mitra and no offer in ANY status', () => {
  const b = fns.my_mitra_choice_open.body
  assert.match(afterBegin(b), /^perform public\.require_actor\(p_actor_id\);/)
  assert.match(fns.my_mitra_choice_open.head, /\(p_actor_id uuid\)\s*returns boolean/)
  assert.match(b, /v_mitra is not null then return false/)
  assert.match(b, /l\.user_id = p_actor_id and l\.listing_type = 'offer'\)/)
  assert.ok(!/status/.test(b), 'no status filter: removed and closed offers count too')
})

test('set_my_mitra_on_offer: guarded, once, 30 minutes, first offer only, active Mitra, never raises for a normal no', () => {
  const b = fns.set_my_mitra_on_offer.body
  assert.match(afterBegin(b), /^perform public\.require_actor\(p_actor_id\);/)
  assert.match(fns.set_my_mitra_on_offer.head, /\(p_actor_id uuid, p_mitra_id uuid, p_listing_id uuid\)\s*returns jsonb/)
  assert.match(b, /interval '30 minutes'/)
  assert.match(b, /mitra_id is null\s*\n?\s*where id = p_actor_id and mitra_id is null|where id = p_actor_id and mitra_id is null/)
  assert.match(b, /is_active/)
  assert.match(b, /o\.listing_type = 'offer' and o\.id <> p_listing_id/)
  assert.ok(!/o\.status/.test(b), 'an earlier offer of ANY status makes this one "not first"')
  assert.match(b, /o\.created_at < v_created/)
  assert.ok(!/raise exception/.test(b.replace(/require_actor/g, '')), 'no raise exception')
  for (const s of ['none', 'no_profile', 'already_set', 'not_your_offer', 'too_late', 'not_first_offer', 'no_such_mitra', 'set']) assert.ok(b.includes(`'${s}'`), s)
})

test('ads: columns, three admin functions guarded inside, logged, the right errors', () => {
  for (const n of ['admin_set_announcement_mitra', 'admin_get_announcement_mitras', 'admin_list_mitra_ads']) {
    assert.match(afterBegin(fns[n].body), /^perform public\.require_admin_session\(p_actor, false\);/, n)
    assert.match(fns[n].head, /\(p_actor uuid/, n)
    assert.match(fns[n].body, /security definer/i)
  }
  const b = fns.admin_set_announcement_mitra.body
  assert.match(b, /raise exception 'already_paid'/)
  assert.match(b, /raise exception 'not_found'/)
  assert.match(b, /p_mitra_id is not null and not exists/)
  assert.match(b, /log_admin_action\(p_actor, 'announcement_mitra'/)
  assert.match(fns.admin_list_mitra_ads.body, /title_hi/)
  assert.match(fns.admin_list_mitra_ads.body, /created_at/)
  assert.match(fns.admin_list_mitra_ads.body, /as paid/)
})

test('admin_list_mitras: keeps EVERY 0075 result key; ads count in the business columns; farmers need an offer', () => {
  const old = readFileSync('supabase/migrations/0075_kissan_mitra.sql', 'utf8').replace(/--.*$/gm, '')
  const oldBody = old.slice(old.indexOf('function public.admin_list_mitras('), old.indexOf('function public.admin_upsert_mitra('))
  const keys = [...oldBody.matchAll(/\bas (\w+),?\s*$/gm)].map((m) => m[1])
  assert.ok(keys.length >= 7, 'found the old keys')
  for (const k of [...keys, 'mitras', 'unattributed_total']) assert.ok(fns.admin_list_mitras.body.includes(k), `key ${k} kept`)
  const b = fns.admin_list_mitras.body
  assert.match(b, /from public\.announcements a\s+where a\.mitra_id is not null/)
  assert.match(b, /pp\.mitra_id is not null and not pp\.is_blocked and public\.ks_mitra_offered\(pp\)/)
})

test('admin_list_mitra_registrations: old keys kept, masked phone, new keys first_offer_at, offers_count, not_counted_yet', () => {
  const b = fns.admin_list_mitra_registrations.body
  for (const k of ['id', 'full_name', 'village_town', 'kind', 'masked_phone', 'registered_at', 'paid', 'blocked', 'same_name_village', 'first_offer_at', 'offers_count', 'not_counted_yet', 'total', 'rows']) assert.ok(b.includes(k), k)
  assert.match(b, /'\*{6}' \|\| right\(p\.phone, 4\)/)
  assert.ok(!/p\.phone\s+as\s+phone|'phone'/.test(b))
  assert.match(b, /\(not public\.ks_mitra_offered\(p\)\) as not_counted_yet/)
  assert.match(b, /least\(greatest\(coalesce\(p_limit, 25\), 1\), 100\)/)
})

test('admin_mark_mitra_paid: stamps farmers and ads in one function, fills both counts, still refuses with nothing_unpaid', () => {
  const b = fns.admin_mark_mitra_paid.body
  assert.match(b, /update public\.profiles p set mitra_paid_id = v_pay/)
  assert.match(b, /not p\.is_blocked and public\.ks_mitra_offered\(p\)/)
  assert.match(b, /update public\.announcements a set mitra_paid_id = v_pay\s+where a\.mitra_id = p_mitra_id and a\.mitra_paid_id is null/)
  assert.match(b, /v_b := coalesce\(v_b, 0\) \+ coalesce\(v_ads, 0\)/)
  assert.match(b, /raise exception 'nothing_unpaid'/)
  assert.match(b, /set farmer_count = v_f, business_count = v_b/)
  assert.match(b, /for update/)
})

test('admin_reassign_registration: same behaviour as 0075', () => {
  const old = readFileSync('supabase/migrations/0075_kissan_mitra.sql', 'utf8').replace(/--.*$/gm, '')
  const grab = (s) => s.slice(s.indexOf('function public.admin_reassign_registration('), s.indexOf('$$;', s.indexOf('function public.admin_reassign_registration(')))
  assert.equal(grab(code).replace(/\s+/g, ' '), grab(old).replace(/\s+/g, ' '))
})

test('grants: every function revoked from public by exact signature; person-facing ones to anon+authenticated, helpers to nobody', () => {
  const granted = [...code.matchAll(/grant execute on function public\.(\w+)\(([^)]*)\) to ([a-z_, ]+);/gi)]
  const toAnon = granted.filter((g) => /\banon\b/.test(g[3])).map((g) => g[1]).sort()
  assert.deepEqual(toAnon, ['admin_get_announcement_mitras', 'admin_list_mitra_ads', 'admin_list_mitra_registrations', 'admin_list_mitras', 'admin_mark_mitra_paid', 'admin_reassign_registration', 'admin_set_announcement_mitra', 'my_mitra_choice_open', 'set_my_mitra_on_offer'])
  for (const g of granted) assert.match(g[3], /anon, authenticated/)
  for (const name of Object.keys(fns)) assert.match(code, new RegExp(`revoke all on function public\\.${name}\\(`), `${name} not revoked from public`)
  assert.match(code, /revoke all on function public\.ks_mitra_offered\(public\.profiles\) from public, anon, authenticated/)
  assert.match(code, /revoke all on function public\.ks_mitra_first_offer_at\(public\.profiles\) from public, anon, authenticated/)
  assert.ok(!/grant[^;]*\bto\s+public\b/i.test(code))
})

test('require_actor / require_admin_session first in every function callable by anon', () => {
  for (const n of ['admin_list_mitras', 'admin_list_mitra_registrations', 'admin_reassign_registration', 'admin_mark_mitra_paid']) {
    assert.match(afterBegin(fns[n].body), /^perform public\.require_admin_session\(p_actor, false\);/, n)
  }
  assert.deepEqual(Object.keys(JSON.parse(readFileSync('scripts/require-actor-allowlist.json', 'utf8')).allow), ['app_session_valid'])
})

test('the rollback re-creates the four 0075 functions, drops everything new, and warns about the ad data', () => {
  const r = readFileSync(ROLL, 'utf8')
  assert.match(r, /DELETES the "which Mitra brought this ad" data/)
  for (const n of ['admin_list_mitra_ads', 'admin_get_announcement_mitras', 'admin_set_announcement_mitra', 'set_my_mitra_on_offer', 'my_mitra_choice_open']) assert.match(r, new RegExp(`drop function if exists public\\.${n}\\(`), n)
  assert.match(r, /drop function if exists public\.ks_mitra_offered\(public\.profiles\)/)
  assert.match(r, /drop function if exists public\.ks_mitra_first_offer_at\(public\.profiles\)/)
  for (const c of ['mitra_paid_id', 'mitra_id']) assert.match(r, new RegExp(`alter table public\\.announcements drop column if exists ${c}`))
  assert.equal((r.match(/create or replace function public\./g) || []).length, 4)
  assert.ok(!/ks_mitra_offered\(/.test(r.slice(0, r.indexOf('drop function if exists public.ks_mitra_offered'))), 'the restored 0075 functions do not use the 0076 helpers')
  assert.ok(r.indexOf('create or replace function public.admin_list_mitras') < r.indexOf('drop function if exists public.ks_mitra_offered'))
})
