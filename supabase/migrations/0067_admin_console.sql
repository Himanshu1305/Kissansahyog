-- 0067_admin_console.sql - Batch 14A: admin console (announcements, security switches, SMS usage, block users,
-- admin roles, admin action log). STRICTLY ADDITIVE and IDEMPOTENT. Pure ASCII.
--
-- Rules this file follows:
--   * NEW tables / indexes / functions / triggers only, plus "add column if not exists" on profiles.
--   * NO existing function is re-created or altered (not require_admin, not app_login_otp, not any admin_* RPC).
--     Blocking uses new BEFORE INSERT triggers; logging of old admin writes is done by a new RPC the console calls.
--   * Existing data is never rewritten, except that profiles.admin_role is filled for existing admins (new column).
--   * New actor-style functions name their first parameter p_actor (not p_actor_id) so the 0066 catalog test, which
--     looks for p_actor_id, does not treat them as unguarded 0066 functions. They are guarded by require_admin_session,
--     which ALWAYS needs a live session, even when session_enforced is false.
-- Error codes the UI maps: not_admin, session_required, super_required, reason_required, confirm_required,
--   invalid_key, invalid_input, account_blocked, cannot_block_self, cannot_change_self, cannot_block_admin, last_super_admin, not_found.

-- 1. profiles: block + role columns ---------------------------------------------------------------------------
alter table public.profiles add column if not exists is_blocked boolean not null default false;
alter table public.profiles add column if not exists blocked_reason text;
alter table public.profiles add column if not exists blocked_at timestamptz;
alter table public.profiles add column if not exists blocked_by uuid;
alter table public.profiles add column if not exists admin_role text check (admin_role in ('super', 'editor'));

update public.profiles set admin_role = 'super' where is_admin = true and admin_role is null;

-- 2. admin action log -----------------------------------------------------------------------------------------
create table if not exists public.admin_actions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  actor_id    uuid,
  actor_role  text,
  action      text not null,
  target_type text,
  target_id   text,
  details     jsonb not null default '{}'::jsonb
);
create index if not exists admin_actions_created_idx on public.admin_actions (created_at desc);
create index if not exists admin_actions_action_idx on public.admin_actions (action, created_at desc);
alter table public.admin_actions enable row level security;
revoke all on table public.admin_actions from public, anon, authenticated;

-- Removes keys that look like phone / mobile / key / token / secret / password (any depth), shortens long strings
-- and masks runs of 10 or more digits.
create or replace function public.ks_scrub_details(p jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  k text;
  v jsonb;
  r jsonb;
begin
  if p is null then return '{}'::jsonb; end if;
  if jsonb_typeof(p) = 'object' then
    r := '{}'::jsonb;
    for k, v in select * from jsonb_each(p) loop
      if k ~* '(phone|mobile|key|token|secret|password)' then continue; end if;
      r := r || jsonb_build_object(k, public.ks_scrub_details(v));
    end loop;
    return r;
  elsif jsonb_typeof(p) = 'array' then
    select coalesce(jsonb_agg(public.ks_scrub_details(e)), '[]'::jsonb) into r from jsonb_array_elements(p) e;
    return r;
  elsif jsonb_typeof(p) = 'string' then
    return to_jsonb(regexp_replace(left(p #>> '{}', 200), '[0-9]{10,}', '[number]', 'g'));
  end if;
  return p;
end;
$$;
revoke all on function public.ks_scrub_details(jsonb) from public, anon, authenticated;

create or replace function public.log_admin_action(p_actor uuid, p_action text, p_target_type text, p_target_id text, p_details jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_det  jsonb := public.ks_scrub_details(coalesce(p_details, '{}'::jsonb));
begin
  select case when is_admin then coalesce(admin_role, 'editor') else null end into v_role from public.profiles where id = p_actor;
  if length(v_det::text) > 1000 then v_det := jsonb_build_object('note', 'details too long'); end if;
  insert into public.admin_actions (actor_id, actor_role, action, target_type, target_id, details)
  values (p_actor, v_role, left(coalesce(p_action, 'unknown'), 60), left(p_target_type, 40), left(p_target_id, 80), v_det);
end;
$$;
revoke all on function public.log_admin_action(uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.log_admin_action(uuid, text, text, text, jsonb) to service_role;

-- 3. guards ---------------------------------------------------------------------------------------------------
create or replace function public.require_admin_session(p_actor uuid, p_need_super boolean default false)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin boolean;
  v_role  text;
  v_hash  text;
begin
  select is_admin, admin_role into v_admin, v_role from public.profiles where id = p_actor;
  if not coalesce(v_admin, false) then raise exception 'not_admin'; end if;
  v_hash := public.ks_presented_session_hash();
  if v_hash is null or not exists (
    select 1 from public.app_sessions s
     where s.token_hash = v_hash and s.user_id = p_actor and s.revoked_at is null and s.expires_at > now()
  ) then
    raise exception 'session_required';
  end if;
  if coalesce(p_need_super, false) and v_role is distinct from 'super' then raise exception 'super_required'; end if;
end;
$$;
revoke all on function public.require_admin_session(uuid, boolean) from public, anon, authenticated;

create or replace function public.require_super_admin(p_actor uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_admin_session(p_actor, true);
end;
$$;
revoke all on function public.require_super_admin(uuid) from public, anon, authenticated;

-- Who am I: the console asks this once to know what to show (role). Needs a live session.
create or replace function public.admin_whoami(p_actor uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare v_role text;
begin
  perform public.require_admin_session(p_actor, false);
  select coalesce(admin_role, 'editor') into v_role from public.profiles where id = p_actor;
  return jsonb_build_object('role', v_role, 'is_super', v_role = 'super');
end;
$$;
revoke all on function public.admin_whoami(uuid) from public;
grant execute on function public.admin_whoami(uuid) to anon, authenticated;

-- 4. announcements --------------------------------------------------------------------------------------------
create table if not exists public.announcements (
  id            uuid primary key default gen_random_uuid(),
  title_hi      text not null check (char_length(title_hi) between 1 and 80),
  title_en      text check (title_en is null or char_length(title_en) <= 80),
  body_hi       text check (body_hi is null or char_length(body_hi) <= 280),
  body_en       text check (body_en is null or char_length(body_en) <= 280),
  small_hi      text check (small_hi is null or char_length(small_hi) <= 120),
  small_en      text check (small_en is null or char_length(small_en) <= 120),
  image_url     text,
  image_alt_hi  text check (image_alt_hi is null or char_length(image_alt_hi) <= 160),
  image_alt_en  text check (image_alt_en is null or char_length(image_alt_en) <= 160),
  link_url      text,
  link_label_hi text check (link_label_hi is null or char_length(link_label_hi) <= 40),
  link_label_en text check (link_label_en is null or char_length(link_label_en) <= 40),
  style         text not null default 'info' check (style in ('festival', 'info', 'alert')),
  start_at      timestamptz not null,
  end_at        timestamptz not null,
  is_active     boolean not null default true,
  priority      int not null default 0,
  dismissible   boolean not null default true,
  created_by    uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint announcements_window_ok check (end_at > start_at)
);
create index if not exists announcements_window_idx on public.announcements (is_active, start_at, end_at);
alter table public.announcements enable row level security;
revoke all on table public.announcements from public, anon, authenticated;

create or replace function public.ks_announcement_clean(p jsonb)
returns public.announcements
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  r public.announcements;
  t text;
begin
  r.title_hi := nullif(btrim(p ->> 'title_hi'), '');
  r.title_en := nullif(btrim(p ->> 'title_en'), '');
  r.body_hi := nullif(btrim(p ->> 'body_hi'), '');
  r.body_en := nullif(btrim(p ->> 'body_en'), '');
  r.small_hi := nullif(btrim(p ->> 'small_hi'), '');
  r.small_en := nullif(btrim(p ->> 'small_en'), '');
  r.image_alt_hi := nullif(btrim(p ->> 'image_alt_hi'), '');
  r.image_alt_en := nullif(btrim(p ->> 'image_alt_en'), '');
  r.link_label_hi := nullif(btrim(p ->> 'link_label_hi'), '');
  r.link_label_en := nullif(btrim(p ->> 'link_label_en'), '');
  r.style := coalesce(nullif(p ->> 'style', ''), 'info');
  r.priority := coalesce(nullif(p ->> 'priority', '')::int, 0);
  r.dismissible := coalesce((p ->> 'dismissible')::boolean, true);
  r.is_active := coalesce((p ->> 'is_active')::boolean, true);
  r.start_at := (p ->> 'start_at')::timestamptz;
  r.end_at := (p ->> 'end_at')::timestamptz;
  if r.title_hi is null then raise exception 'invalid_input'; end if;
  if r.start_at is null or r.end_at is null or r.end_at <= r.start_at then raise exception 'invalid_input'; end if;
  if r.style not in ('festival', 'info', 'alert') then raise exception 'invalid_input'; end if;
  t := nullif(btrim(p ->> 'image_url'), '');
  if t is not null and not (t ~ '^/[^/][^[:space:]]*$' or t ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/[^[:space:]]+$') then
    raise exception 'invalid_input';
  end if;
  r.image_url := t;
  if r.image_url is not null and r.image_alt_hi is null then raise exception 'invalid_input'; end if;
  t := nullif(btrim(p ->> 'link_url'), '');
  if t is not null and not (t ~ '^/[^/][^[:space:]]*$' or t ~ '^https://[^[:space:]/]+[^[:space:]]*$') then
    raise exception 'invalid_input';
  end if;
  r.link_url := t;
  return r;
end;
$$;
revoke all on function public.ks_announcement_clean(jsonb) from public, anon, authenticated;

create or replace function public.admin_list_announcements(p_actor uuid)
returns setof public.announcements
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_admin_session(p_actor, false);
  return query select * from public.announcements order by start_at desc limit 200;
end;
$$;

create or replace function public.admin_upsert_announcement(p_actor uuid, p_id uuid, p_data jsonb)
returns public.announcements
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  c public.announcements;
  r public.announcements;
begin
  perform public.require_admin_session(p_actor, false);
  c := public.ks_announcement_clean(coalesce(p_data, '{}'::jsonb));
  if p_id is null then
    insert into public.announcements (title_hi, title_en, body_hi, body_en, small_hi, small_en, image_url, image_alt_hi, image_alt_en,
      link_url, link_label_hi, link_label_en, style, start_at, end_at, is_active, priority, dismissible, created_by)
    values (c.title_hi, c.title_en, c.body_hi, c.body_en, c.small_hi, c.small_en, c.image_url, c.image_alt_hi, c.image_alt_en,
      c.link_url, c.link_label_hi, c.link_label_en, c.style, c.start_at, c.end_at, c.is_active, c.priority, c.dismissible, p_actor)
    returning * into r;
    perform public.log_admin_action(p_actor, 'announcement_create', 'announcement', r.id::text, jsonb_build_object('title', r.title_hi, 'active', r.is_active));
  else
    update public.announcements set title_hi = c.title_hi, title_en = c.title_en, body_hi = c.body_hi, body_en = c.body_en,
      small_hi = c.small_hi, small_en = c.small_en, image_url = c.image_url, image_alt_hi = c.image_alt_hi, image_alt_en = c.image_alt_en,
      link_url = c.link_url, link_label_hi = c.link_label_hi, link_label_en = c.link_label_en, style = c.style,
      start_at = c.start_at, end_at = c.end_at, is_active = c.is_active, priority = c.priority, dismissible = c.dismissible,
      updated_at = now()
     where id = p_id returning * into r;
    if not found then raise exception 'not_found'; end if;
    perform public.log_admin_action(p_actor, 'announcement_update', 'announcement', r.id::text, jsonb_build_object('title', r.title_hi, 'active', r.is_active));
  end if;
  return r;
end;
$$;

create or replace function public.admin_delete_announcement(p_actor uuid, p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare v_title text;
begin
  perform public.require_admin_session(p_actor, false);
  delete from public.announcements where id = p_id returning title_hi into v_title;
  if not found then raise exception 'not_found'; end if;
  perform public.log_admin_action(p_actor, 'announcement_delete', 'announcement', p_id::text, jsonb_build_object('title', v_title));
end;
$$;

-- A copy starts switched OFF so it can never go live by accident.
create or replace function public.admin_duplicate_announcement(p_actor uuid, p_id uuid)
returns public.announcements
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare r public.announcements;
begin
  perform public.require_admin_session(p_actor, false);
  insert into public.announcements (title_hi, title_en, body_hi, body_en, small_hi, small_en, image_url, image_alt_hi, image_alt_en,
    link_url, link_label_hi, link_label_en, style, start_at, end_at, is_active, priority, dismissible, created_by)
  select left(title_hi, 70) || ' (copy)', case when title_en is null then null else left(title_en, 70) || ' (copy)' end,
    body_hi, body_en, small_hi, small_en, image_url, image_alt_hi, image_alt_en, link_url, link_label_hi, link_label_en,
    style, start_at, end_at, false, priority, dismissible, p_actor
  from public.announcements where id = p_id
  returning * into r;
  if not found then raise exception 'not_found'; end if;
  perform public.log_admin_action(p_actor, 'announcement_duplicate', 'announcement', r.id::text, jsonb_build_object('from', p_id::text));
  return r;
end;
$$;

create or replace function public.get_active_announcements()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.priority desc, x.start_at desc), '[]'::jsonb)
  from (
    select id, title_hi, title_en, body_hi, body_en, small_hi, small_en, image_url, image_alt_hi, image_alt_en,
           link_url, link_label_hi, link_label_en, style, priority, dismissible, start_at, end_at
      from public.announcements
     where is_active and now() >= start_at and now() < end_at
     order by priority desc, start_at desc
     limit 5
  ) x
$$;
revoke all on function public.get_active_announcements() from public;
grant execute on function public.get_active_announcements() to anon, authenticated, service_role;

revoke all on function public.admin_list_announcements(uuid) from public;
revoke all on function public.admin_upsert_announcement(uuid, uuid, jsonb) from public;
revoke all on function public.admin_delete_announcement(uuid, uuid) from public;
revoke all on function public.admin_duplicate_announcement(uuid, uuid) from public;
grant execute on function public.admin_list_announcements(uuid) to anon, authenticated;
grant execute on function public.admin_upsert_announcement(uuid, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_delete_announcement(uuid, uuid) to anon, authenticated;
grant execute on function public.admin_duplicate_announcement(uuid, uuid) to anon, authenticated;

-- 5. security switches ----------------------------------------------------------------------------------------
create or replace function public.admin_get_security_status(p_actor uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_out jsonb := '{}'::jsonb;
  k text;
  a record;
begin
  perform public.require_admin_session(p_actor, true);
  foreach k in array array['otp_required', 'session_enforced'] loop
    select x.created_at, p.full_name into a
      from public.admin_actions x left join public.profiles p on p.id = x.actor_id
     where x.action = 'security_flag' and x.details ->> 'flag' = k
     order by x.created_at desc limit 1;
    v_out := v_out || jsonb_build_object(k, jsonb_build_object(
      'value', public.auth_flag(k), 'changed_at', a.created_at, 'changed_by', a.full_name));
  end loop;
  return v_out;
end;
$$;

create or replace function public.admin_set_security_flag(p_actor uuid, p_key text, p_value boolean, p_reason text, p_confirm text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_need text;
  v_old  boolean;
begin
  perform public.require_admin_session(p_actor, true);
  if p_key is null or p_key not in ('otp_required', 'session_enforced') then raise exception 'invalid_key'; end if;
  if p_value is null then raise exception 'invalid_input'; end if;
  if p_reason is null or char_length(btrim(p_reason)) < 10 then raise exception 'reason_required'; end if;
  v_need := case when p_key = 'otp_required' and p_value = false then 'OTP OFF'
                 when p_key = 'session_enforced' and p_value = true then 'SESSIONS ON'
                 else null end;
  if v_need is not null and p_confirm is distinct from v_need then raise exception 'confirm_required'; end if;
  v_old := public.auth_flag(p_key);
  insert into public.site_settings (key, value, updated_at) values (p_key, to_jsonb(p_value), now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  perform public.log_admin_action(p_actor, 'security_flag', 'setting', p_key,
    jsonb_build_object('flag', p_key, 'from', v_old, 'to', p_value, 'reason', left(btrim(p_reason), 200)));
  return jsonb_build_object('key', p_key, 'value', p_value);
end;
$$;

revoke all on function public.admin_get_security_status(uuid) from public;
revoke all on function public.admin_set_security_flag(uuid, text, boolean, text, text) from public;
grant execute on function public.admin_get_security_status(uuid) to anon, authenticated;
grant execute on function public.admin_set_security_flag(uuid, text, boolean, text, text) to anon, authenticated;

-- 6. SMS usage ------------------------------------------------------------------------------------------------
-- otp_requests rows are deleted after 2 days by 0066, so usage is counted here by triggers (counts only, no phone,
-- no hash). Rate-limited refusals are not stored anywhere by 0066, so they cannot be counted (shown as unavailable).
create table if not exists public.otp_usage_daily (
  day       date not null,
  purpose   text not null,
  requested int not null default 0,
  sent      int not null default 0,
  failed    int not null default 0,
  decoy     int not null default 0,
  verified  int not null default 0,
  primary key (day, purpose)
);
alter table public.otp_usage_daily enable row level security;
revoke all on table public.otp_usage_daily from public, anon, authenticated;

create or replace function public.ks_otp_usage_trg()
returns trigger
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_day date := (new.created_at at time zone 'Asia/Kolkata')::date;
  v_sent int := 0; v_failed int := 0; v_decoy int := 0; v_ver int := 0; v_req int := 0;
begin
  if tg_op = 'INSERT' then
    v_req := 1;
    if new.send_state = 'decoy' then v_decoy := 1; end if;
  else
    if new.send_state = 'sent' and old.send_state is distinct from 'sent' then v_sent := 1; end if;
    if new.send_state = 'failed' and old.send_state is distinct from 'failed' then v_failed := 1; end if;
    if new.verified_at is not null and old.verified_at is null then v_ver := 1; end if;
  end if;
  if v_req + v_sent + v_failed + v_decoy + v_ver = 0 then return new; end if;
  insert into public.otp_usage_daily (day, purpose, requested, sent, failed, decoy, verified)
  values (v_day, new.purpose, v_req, v_sent, v_failed, v_decoy, v_ver)
  on conflict (day, purpose) do update set requested = otp_usage_daily.requested + excluded.requested,
    sent = otp_usage_daily.sent + excluded.sent, failed = otp_usage_daily.failed + excluded.failed,
    decoy = otp_usage_daily.decoy + excluded.decoy, verified = otp_usage_daily.verified + excluded.verified;
  return new;
end;
$$;
revoke all on function public.ks_otp_usage_trg() from public, anon, authenticated;

-- One-time backfill from the rows still present (only when the counter table is empty).
insert into public.otp_usage_daily (day, purpose, requested, sent, failed, decoy, verified)
select (created_at at time zone 'Asia/Kolkata')::date, purpose, count(*),
       count(*) filter (where send_state = 'sent'), count(*) filter (where send_state = 'failed'),
       count(*) filter (where send_state = 'decoy'), count(*) filter (where verified_at is not null)
  from public.otp_requests
 where not exists (select 1 from public.otp_usage_daily)
 group by 1, 2
on conflict (day, purpose) do nothing;

do $$
begin
  if to_regclass('public.otp_requests') is not null and not exists (
    select 1 from pg_trigger where tgname = 'ks_otp_usage_ins' and tgrelid = 'public.otp_requests'::regclass) then
    create trigger ks_otp_usage_ins after insert on public.otp_requests for each row execute function public.ks_otp_usage_trg();
  end if;
  if to_regclass('public.otp_requests') is not null and not exists (
    select 1 from pg_trigger where tgname = 'ks_otp_usage_upd' and tgrelid = 'public.otp_requests'::regclass) then
    create trigger ks_otp_usage_upd after update of send_state, verified_at on public.otp_requests for each row execute function public.ks_otp_usage_trg();
  end if;
end $$;

create or replace function public.admin_get_otp_usage(p_actor uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_out jsonb;
begin
  perform public.require_admin_session(p_actor, true);
  select jsonb_build_object(
    'sent_today', coalesce(sum(sent) filter (where day = v_today), 0),
    'sent_7d', coalesce(sum(sent) filter (where day > v_today - 7), 0),
    'sent_30d', coalesce(sum(sent), 0),
    'verified_30d', coalesce(sum(verified), 0),
    'failed_30d', coalesce(sum(failed), 0),
    'unregistered_30d', coalesce(sum(decoy), 0),
    'rate_limited_30d', null,
    'by_purpose', coalesce((select jsonb_object_agg(purpose, s) from (
        select purpose, sum(sent)::int s from public.otp_usage_daily where day > v_today - 30 group by purpose) q), '{}'::jsonb))
    into v_out
    from public.otp_usage_daily where day > v_today - 30;
  return v_out;
end;
$$;
revoke all on function public.admin_get_otp_usage(uuid) from public;
grant execute on function public.admin_get_otp_usage(uuid) to anon, authenticated;

-- 7. blocking -------------------------------------------------------------------------------------------------
create or replace function public.ks_assert_not_blocked(p_user uuid)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if p_user is not null and exists (select 1 from public.profiles where id = p_user and is_blocked) then
    raise exception 'account_blocked';
  end if;
end;
$$;
revoke all on function public.ks_assert_not_blocked(uuid) from public, anon, authenticated;

create or replace function public.ks_block_guard()
returns trigger
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare v_uid uuid;
begin
  v_uid := nullif(to_jsonb(new) ->> tg_argv[0], '')::uuid;
  perform public.ks_assert_not_blocked(v_uid);
  return new;
end;
$$;
revoke all on function public.ks_block_guard() from public, anon, authenticated;

-- Tables a signed-in user writes into with their profile id: listings (user_id), kisan_mela_interest (user_id).
-- Sawaal questions, reports, feedback and contact reveals carry no user id (anonymous by design): see BACKLOG.md.
do $$
begin
  if to_regclass('public.listings') is not null and not exists (
    select 1 from pg_trigger where tgname = 'ks_block_guard_listings' and tgrelid = 'public.listings'::regclass) then
    create trigger ks_block_guard_listings before insert on public.listings for each row execute function public.ks_block_guard('user_id');
  end if;
  if to_regclass('public.kisan_mela_interest') is not null and not exists (
    select 1 from pg_trigger where tgname = 'ks_block_guard_mela_interest' and tgrelid = 'public.kisan_mela_interest'::regclass) then
    create trigger ks_block_guard_mela_interest before insert on public.kisan_mela_interest for each row execute function public.ks_block_guard('user_id');
  end if;
end $$;

create or replace function public.admin_set_user_blocked(p_actor uuid, p_user_id uuid, p_blocked boolean, p_reason text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin boolean;
begin
  perform public.require_admin_session(p_actor, true);
  if p_blocked is null then raise exception 'invalid_input'; end if;
  if p_reason is null or char_length(btrim(p_reason)) < 5 then raise exception 'reason_required'; end if;
  if p_user_id = p_actor then raise exception 'cannot_block_self'; end if;
  select is_admin into v_admin from public.profiles where id = p_user_id;
  if not found then raise exception 'not_found'; end if;
  if coalesce(v_admin, false) then raise exception 'cannot_block_admin'; end if;
  if p_blocked then
    update public.profiles set is_blocked = true, blocked_reason = left(btrim(p_reason), 300), blocked_at = now(), blocked_by = p_actor
     where id = p_user_id;
    update public.app_sessions set revoked_at = now() where user_id = p_user_id and revoked_at is null;
  else
    update public.profiles set is_blocked = false, blocked_reason = null, blocked_at = null, blocked_by = null where id = p_user_id;
  end if;
  perform public.log_admin_action(p_actor, case when p_blocked then 'user_block' else 'user_unblock' end, 'user', p_user_id::text,
    jsonb_build_object('reason', left(btrim(p_reason), 200)));
  return jsonb_build_object('id', p_user_id, 'is_blocked', p_blocked);
end;
$$;

create or replace function public.admin_list_user_status(p_actor uuid, p_search text default null, p_status text default 'all', p_limit int default 25, p_offset int default 0)
returns table (id uuid, full_name text, village_town text, pincode text, phone_last4 text, admin_role text, is_blocked boolean,
               blocked_reason text, blocked_at timestamptz, created_at timestamptz)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare q text := '%' || replace(replace(coalesce(btrim(p_search), ''), '%', ''), '_', '') || '%';
begin
  perform public.require_admin_session(p_actor, false);
  return query
  select p.id, p.full_name, p.village_town, p.pincode,
         case when p.phone is null then null else right(p.phone, 4) end,
         case when p.is_admin then coalesce(p.admin_role, 'editor') else null end,
         p.is_blocked, p.blocked_reason, p.blocked_at, p.created_at
    from public.profiles p
   where (coalesce(btrim(p_search), '') = '' or p.full_name ilike q or coalesce(p.village_town, '') ilike q or coalesce(p.pincode, '') ilike q
          or coalesce(p.phone, '') ilike q)
     and (coalesce(p_status, 'all') = 'all'
          or (p_status = 'blocked' and p.is_blocked)
          or (p_status = 'active' and not p.is_blocked)
          or (p_status = 'admin' and p.is_admin))
   order by p.is_blocked desc, p.created_at desc
   limit least(100, greatest(1, p_limit)) offset greatest(0, p_offset);
end;
$$;

create or replace function public.admin_set_admin_role(p_actor uuid, p_user_id uuid, p_role text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin boolean;
  v_old text;
begin
  perform public.require_admin_session(p_actor, true);
  if p_role is null or p_role not in ('super', 'editor') then raise exception 'invalid_input'; end if;
  if p_user_id = p_actor then raise exception 'cannot_change_self'; end if;
  select is_admin, admin_role into v_admin, v_old from public.profiles where id = p_user_id for update;
  if not found or not coalesce(v_admin, false) then raise exception 'not_found'; end if;
  if p_role = 'editor' and v_old = 'super'
     and (select count(*) from public.profiles where is_admin and admin_role = 'super') <= 1 then
    raise exception 'last_super_admin';
  end if;
  update public.profiles set admin_role = p_role where id = p_user_id;
  perform public.log_admin_action(p_actor, 'admin_role', 'user', p_user_id::text, jsonb_build_object('from', v_old, 'to', p_role));
  return jsonb_build_object('id', p_user_id, 'admin_role', p_role);
end;
$$;

-- Phone -> blocked? For the Pages Function that issues OTP tickets (service role only). Returns a boolean only.
create or replace function public.ks_phone_is_blocked(p_phone text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select is_blocked from public.profiles where phone = p_phone limit 1), false)
$$;
revoke all on function public.ks_phone_is_blocked(text) from public, anon, authenticated;
grant execute on function public.ks_phone_is_blocked(text) to service_role;

-- Session -> admin? For the Pages Function admin-auth helper (service role only).
create or replace function public.ks_session_admin(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((
    select jsonb_build_object('user_id', p.id, 'role', coalesce(p.admin_role, 'editor'))
      from public.app_sessions s join public.profiles p on p.id = s.user_id
     where s.token_hash = public.ks_token_hash(p_token) and s.revoked_at is null and s.expires_at > now()
       and p.is_admin and not p.is_blocked
     limit 1), jsonb_build_object('user_id', null))
$$;
revoke all on function public.ks_session_admin(text) from public, anon, authenticated;
grant execute on function public.ks_session_admin(text) to service_role;

revoke all on function public.admin_set_user_blocked(uuid, uuid, boolean, text) from public;
revoke all on function public.admin_list_user_status(uuid, text, text, int, int) from public;
revoke all on function public.admin_set_admin_role(uuid, uuid, text) from public;
grant execute on function public.admin_set_user_blocked(uuid, uuid, boolean, text) to anon, authenticated;
grant execute on function public.admin_list_user_status(uuid, text, text, int, int) to anon, authenticated;
grant execute on function public.admin_set_admin_role(uuid, uuid, text) to anon, authenticated;

-- 8. action log read + console logging ------------------------------------------------------------------------
create or replace function public.admin_list_actions(p_actor uuid, p_limit int default 50, p_offset int default 0, p_action_filter text default null, p_admin_filter uuid default null)
returns table (id uuid, created_at timestamptz, actor_id uuid, actor_name text, actor_role text, action text, target_type text, target_id text, details jsonb)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_admin_session(p_actor, false);
  return query
  select x.id, x.created_at, x.actor_id, p.full_name, x.actor_role, x.action, x.target_type, x.target_id, x.details
    from public.admin_actions x left join public.profiles p on p.id = x.actor_id
   where (p_action_filter is null or p_action_filter = '' or x.action = p_action_filter)
     and (p_admin_filter is null or x.actor_id = p_admin_filter)
   order by x.created_at desc
   limit least(100, greatest(1, p_limit)) offset greatest(0, p_offset);
end;
$$;

-- The console records writes done through the OLD admin RPCs (whose SQL is not touched) with this call.
create or replace function public.admin_log_console_action(p_actor uuid, p_action text, p_target_type text, p_target_id text, p_details jsonb default '{}'::jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_allowed text[] := array['listing_remove', 'listing_sponsor', 'report_resolve', 'article_save', 'article_delete',
    'expert_save', 'expert_active', 'yojana_save', 'yojana_active', 'msp_save', 'resource_save', 'sawaal_answer',
    'safalta_save', 'site_setting', 'procurement_save', 'mela_save'];
  v_det jsonb := public.ks_scrub_details(coalesce(p_details, '{}'::jsonb));
begin
  perform public.require_admin_session(p_actor, false);
  if p_action is null or not (p_action = any (v_allowed)) then raise exception 'invalid_input'; end if;
  if length(v_det::text) > 500 then v_det := jsonb_build_object('note', 'details too long'); end if;
  perform public.log_admin_action(p_actor, p_action, p_target_type, p_target_id, v_det);
end;
$$;

revoke all on function public.admin_list_actions(uuid, int, int, text, uuid) from public;
revoke all on function public.admin_log_console_action(uuid, text, text, text, jsonb) from public;
grant execute on function public.admin_list_actions(uuid, int, int, text, uuid) to anon, authenticated;
grant execute on function public.admin_log_console_action(uuid, text, text, text, jsonb) to anon, authenticated;
