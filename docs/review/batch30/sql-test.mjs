import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
const db = new PGlite()
const mig = readFileSync('/tmp/w/b29/supabase/migrations/0080_admin_by_email.sql', 'utf8')
const roll = readFileSync('/tmp/w/b29/supabase/migrations/rollback/0080_admin_by_email_rollback.sql', 'utf8')
const base = `
 create role anon; create role authenticated; create role service_role;
 create schema auth;
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
 create function auth.email() returns text language sql stable as $$ select nullif(current_setting('test.email', true), '') $$;
 create table public.profiles (id uuid primary key default gen_random_uuid(), full_name text not null, phone text unique, email text unique,
   auth_uid uuid unique, auth_provider text not null default 'phone', village_town text, pincode text, latitude numeric, longitude numeric,
   preferred_language text not null default 'hi', disclaimer_accepted_at timestamptz, consents jsonb, is_admin boolean not null default false,
   admin_role text check (admin_role in ('super','editor')), is_blocked boolean not null default false, blocked_reason text, blocked_at timestamptz,
   created_at timestamptz not null default now());
 create table public.app_sessions (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
   token_hash text not null unique, created_at timestamptz default now(), expires_at timestamptz default now() + interval '30 days', last_seen_at timestamptz default now(), revoked_at timestamptz, device text);
 create table public.admin_log (actor uuid, action text, target text, details jsonb);
 create function public.ks_token_hash(p text) returns text language sql immutable as $$ select encode(sha256(convert_to(coalesce(p,''),'UTF8')),'hex') $$;
 create function public.ks_presented_session_hash() returns text language sql stable as $$ select nullif(current_setting('test.hash', true), '') $$;
 create function public.ks_create_session(p_user_id uuid) returns text language plpgsql as $$ declare t text := 'kss1_' || gen_random_uuid()::text;
   begin insert into public.app_sessions (user_id, token_hash) values (p_user_id, public.ks_token_hash(t)); return t; end $$;
 create function public.log_admin_action(p_actor uuid, p_action text, p_target_type text, p_target_id text, p_details jsonb) returns void language sql as $$ insert into public.admin_log values (p_actor, p_action, p_target_id, p_details) $$;
 -- the pre-0080 definitions
 create function public.require_admin_session(p_actor uuid, p_need_super boolean default false) returns void language plpgsql as $$
 declare v_admin boolean; v_role text; v_hash text; begin
  select is_admin, admin_role into v_admin, v_role from public.profiles where id = p_actor;
  if not coalesce(v_admin,false) then raise exception 'not_admin'; end if;
  v_hash := public.ks_presented_session_hash();
  if v_hash is null or not exists (select 1 from public.app_sessions s where s.token_hash = v_hash and s.user_id = p_actor and s.revoked_at is null and s.expires_at > now()) then raise exception 'session_required'; end if;
  if coalesce(p_need_super,false) and v_role is distinct from 'super' then raise exception 'super_required'; end if; end $$;
 create function public.require_admin(p_actor_id uuid) returns void language plpgsql as $$ begin
  if not exists (select 1 from public.profiles where id = p_actor_id and is_admin = true) then raise exception 'not_admin'; end if; end $$;
 create function public.ks_session_admin(p_token text) returns jsonb language sql stable as $$ select coalesce((select jsonb_build_object('user_id', p.id, 'role', coalesce(p.admin_role,'editor')) from public.app_sessions s join public.profiles p on p.id = s.user_id where s.token_hash = public.ks_token_hash(p_token) and s.revoked_at is null and s.expires_at > now() and p.is_admin and not p.is_blocked limit 1), jsonb_build_object('user_id', null)) $$;
 create function public.app_issue_session() returns jsonb language plpgsql as $$ declare v_uid uuid := auth.uid(); v_id uuid; begin
  select id into v_id from public.profiles where auth_uid = v_uid; if not found then raise exception 'not_found'; end if;
  return jsonb_build_object('session_token', public.ks_create_session(v_id)); end $$;
 create function public.admin_list_user_status(p_actor uuid, p_search text default null, p_status text default 'all', p_limit int default 25, p_offset int default 0)
  returns table (id uuid, full_name text, village_town text, pincode text, phone_last4 text, admin_role text, is_blocked boolean, blocked_reason text, blocked_at timestamptz, created_at timestamptz)
  language sql as $$ select p.id, p.full_name, p.village_town, p.pincode, null::text, null::text, p.is_blocked, p.blocked_reason, p.blocked_at, p.created_at from public.profiles p $$;
`
await db.exec(base)
const F = 'f0000000-0000-0000-0000-00000000000', U = (n) => `${F}${n}`
// founder: email super admin (auth uid a1); editor e: email editor; farmer: phone only; emailer: email non-admin; abhi: phone profile
await db.exec(`insert into public.profiles (id, full_name, phone, email, auth_uid, auth_provider, is_admin, admin_role) values
 ('${U(1)}', 'Founder', '9000000001', 'f@x.com', 'a0000000-0000-0000-0000-000000000001', 'email', true, 'super'),
 ('${U(2)}', 'Editor', null, 'e@x.com', 'a0000000-0000-0000-0000-000000000002', 'email', true, 'editor');
 insert into public.profiles (id, full_name, phone) values ('${U(3)}', 'Farmer', '9000000003');
 insert into public.profiles (id, full_name, email, auth_uid, auth_provider) values ('${U(4)}', 'Emailer', 'm@x.com', 'a0000000-0000-0000-0000-000000000004', 'email');`)
let fails = 0
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FAIL', m); if (!c) fails++ }
const q = async (sql) => (await db.query(sql)).rows
const throws = async (sql, code) => { try { await db.query(sql); return false } catch (e) { return String(e.message).includes(code) } }
const as = async (uid, email, hash) => { await db.exec(`select set_config('test.uid','${uid||''}',false), set_config('test.email','${email||''}',false), set_config('test.hash','${hash||''}',false)`) }

// pre-state: phone session of founder works for old rule
await db.exec(`insert into public.app_sessions (user_id, token_hash) values ('${U(1)}', public.ks_token_hash('phone-tok'))`)
await db.exec(mig); await db.exec(mig) // twice: idempotent
ok(true, 'migration applies twice')
// existing session (via null) is not an admin session anymore
const th = async (t) => (await q(`select public.ks_token_hash('${t}') h`))[0].h
await as('', '', await th('phone-tok'))
ok(await throws(`select public.require_admin_session('${U(1)}')`, 'admin_email_required'), 'admin with a mobile/old session is refused (admin_email_required)')
ok(await throws(`select public.require_admin('${U(1)}')`, 'admin_email_required'), 'old require_admin also refuses it')
ok((await q(`select public.ks_session_admin('phone-tok') j`))[0].j.user_id === null, 'ks_session_admin: mobile session is not admin')
await as('', '', await th('nope'))
ok(await throws(`select public.require_admin_session('${U(1)}')`, 'session_required'), 'unknown session -> session_required')
await as('', '', '')
ok(await throws(`select public.require_admin_session('${U(1)}')`, 'session_required'), 'no session header -> session_required')
ok(await throws(`select public.require_admin_session('${U(3)}')`, 'not_admin'), 'non-admin -> not_admin')
// email sign-in issues an email session
await as('a0000000-0000-0000-0000-000000000001', 'f@x.com', '')
const tok1 = (await q(`select public.app_issue_session() j`))[0].j.session_token
ok((await q(`select via from public.app_sessions where token_hash = public.ks_token_hash('${tok1}')`))[0].via === 'email', 'app_issue_session marks via = email')
await as('', '', await th(tok1))
await db.query(`select public.require_admin_session('${U(1)}', true)`); ok(true, 'email session of the super admin passes (super)')
await db.query(`select public.require_admin('${U(1)}')`); ok(true, 'require_admin passes with an email session')
ok((await q(`select public.ks_session_admin('${tok1}') j`))[0].j.user_id === U(1), 'ks_session_admin accepts the email session')
// editor session
await as('a0000000-0000-0000-0000-000000000002', 'e@x.com', '')
const tok2 = (await q(`select public.app_issue_session() j`))[0].j.session_token
// grant
await as('', '', await th(tok2))
const grant = (actor, who, role) => `select public.admin_grant_admin('${actor}', '${who}', '${role}') j`
ok(await throws(grant(U(2), U(3), 'editor'), 'admin_needs_email'), 'a phone-only person cannot be made admin')
ok(await throws(grant(U(2), U(4), 'super'), 'super_required'), 'an editor cannot make a super admin')
ok(await throws(grant(U(2), U(2), 'editor'), 'cannot_change_self'), 'cannot grant yourself')
ok(await throws(grant(U(2), U(1), 'editor'), 'already_admin'), 'already an admin')
ok(await throws(grant(U(2), U(4), 'owner'), 'invalid_input'), 'bad role refused')
ok(await throws(grant(U(2), U(9), 'editor'), 'not_found'), 'unknown person')
const g = (await q(grant(U(2), U(4), 'editor')))[0].j
ok(g.admin_role === 'editor', 'an editor can make an email user an editor')
ok((await q(`select is_admin, admin_role from public.profiles where id='${U(4)}'`))[0].admin_role === 'editor', 'profile is now an editor admin')
ok((await q(`select count(*)::int n from public.admin_log where action='admin_grant'`))[0].n === 1, 'the grant is logged')
await as('', '', await th(tok1))
await db.query(`update public.profiles set is_admin = false, admin_role = null where id = '${U(4)}'`)
const g2 = (await q(grant(U(1), U(4), 'super')))[0].j
ok(g2.admin_role === 'super', 'a super admin can make a super admin')
await db.query(`update public.profiles set is_blocked = true, is_admin = false, admin_role = null where id = '${U(4)}'`)
ok(await throws(grant(U(1), U(4), 'editor'), 'grant_blocked'), 'a blocked person cannot be made admin')
// not logged in as admin: the farmer
await as('', '', await th('phone-tok'))
ok(await throws(grant(U(1), U(4), 'editor'), 'admin_email_required'), 'grant with a mobile session is refused')
// trigger
ok(await throws(`update public.profiles set is_admin = true, admin_role = 'editor' where id = '${U(3)}'`, 'admin_needs_email'), 'trigger: SQL cannot make a phone-only profile admin')
ok(await throws(`update public.profiles set auth_uid = null where id = '${U(1)}'`, 'admin_needs_email'), 'trigger: an admin cannot lose the e-mail login')
// list shows email only for email profiles
await as('', '', await th(tok1))
const list = await q(`select * from public.admin_list_user_status('${U(1)}')`)
ok(list.length === 4 && list.find((r) => r.full_name === 'Farmer').email === null && list.find((r) => r.full_name === 'Founder').email === 'f@x.com', 'list: email for email accounts, none for phone-only')
ok((await q(`select count(*)::int n from public.admin_list_user_status('${U(1)}', 'm@x.com')`))[0].n === 1, 'list: search by e-mail works')
// register with email
await as('a0000000-0000-0000-0000-000000000009', 'New@Example.com', '')
const reg = `select * from public.app_register_email('Abhinandan Dixit', 'Sagar', 23.8, 78.7, 'hi', true, true)`
const p = (await q(reg))[0]
ok(p.email === 'new@example.com' && p.phone === null && p.auth_provider === 'email' && p.is_admin === false, 'email registration: no phone, lower-case e-mail, not admin')
ok((await q(reg))[0].id === p.id, 'idempotent for the same signed-in user')
await as('a0000000-0000-0000-0000-00000000000a', 'new@example.com', '')
ok(await throws(reg, 'email_exists'), 'the same e-mail cannot register twice')
await as('a0000000-0000-0000-0000-00000000000b', 'x@example.com', '')
ok(await throws(`select * from public.app_register_email(' ', 'Sagar', 1, 1, 'hi', true, true)`, 'name_required'), 'name required')
ok(await throws(`select * from public.app_register_email('A', 'Sagar', 1, 1, 'hi', false, true)`, 'disclaimer_not_accepted'), 'disclaimer required')
await as('', '', '')
ok(await throws(reg, 'not_authorized'), 'signed-out call refused')
// abort block
await db.exec(`alter table public.profiles disable trigger ks_admin_needs_email; update public.profiles set auth_uid = null where id = '${U(2)}'; alter table public.profiles enable trigger ks_admin_needs_email;`)
let stopped = false, stopMsg = ''; try { await db.exec(mig) } catch (e) { stopped = true; stopMsg = String(e.message) }
ok(stopped && stopMsg.includes('STOP: these admins have no e-mail login') && stopMsg.includes('Editor'), 'migration stops and names the admin without an e-mail login')
await db.exec(`alter table public.profiles disable trigger ks_admin_needs_email; update public.profiles set auth_uid = 'a0000000-0000-0000-0000-000000000002' where id = '${U(2)}'; alter table public.profiles enable trigger ks_admin_needs_email;`)
// rollback
await db.exec(roll)
ok((await q(`select count(*)::int n from pg_proc where proname in ('admin_grant_admin','app_register_email')`))[0].n === 0, 'rollback removes the new functions')
await as('', '', await th('phone-tok'))
await db.query(`select public.require_admin_session('${U(1)}')`); ok(true, 'rollback: the old rule is back (any live session)')
ok((await q(`select count(*)::int n from information_schema.columns where table_name='app_sessions' and column_name='via'`))[0].n === 0, 'rollback drops the via column')
console.log(fails ? `${fails} FAILED` : 'ALL OK'); process.exit(fails ? 1 : 0)
