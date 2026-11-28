-- Kisan Sahyog - 0080 (Batch 30) register with e-mail; admins sign in with e-mail only; an admin can make another e-mail user an admin.
--
-- WHAT THIS DOES
--   * app_register_email (new): registration with e-mail + password and NO mobile number (profile: phone null, auth_provider 'email').
--   * app_sessions.via (new column): 'email' for a session issued after an e-mail + password sign-in. A mobile (OTP) session keeps NULL.
--   * app_issue_session() (same name, same grants): marks the session it creates as via = 'email'.
--   * require_admin_session(), require_admin() (the older check) and ks_session_admin(): an admin must present a LIVE session
--     with via = 'email'. A mobile login of an admin is just an ordinary farmer session.
--   * a trigger: a profile can be an admin only if it has an e-mail login (auth_uid is set).
--   * admin_grant_admin (new): any admin can make an e-mail user an 'editor'; only a super admin can make a 'super'.
--   * admin_list_user_status now also returns email (for admins only) so the People list can show who can be made admin.
--
-- SAFE TO APPLY: the first block stops the migration (nothing is changed) if an existing admin has no e-mail login, because
-- that admin would be locked out. After applying, every admin signs in once with e-mail + password.
--
-- ROLLBACK: supabase/migrations/rollback/0080_admin_by_email_rollback.sql

-- 0. refuse to lock anybody out ------------------------------------------------------------------------------
do $$
declare v_names text;
begin
  select string_agg(coalesce(full_name, id::text), ', ') into v_names
    from public.profiles where is_admin and auth_uid is null;
  if v_names is not null then
    raise exception 'STOP: these admins have no e-mail login and would be locked out: %. Nothing was changed.', v_names;
  end if;
end $$;

-- 1. sessions know how they were opened ---------------------------------------------------------------------
alter table public.app_sessions add column if not exists via text null;

create or replace function public.app_issue_session()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_id    uuid;
  v_token text;
begin
  if v_uid is null then
    raise exception 'not_authorized';
  end if;
  select id into v_id from public.profiles where auth_uid = v_uid;
  if not found then
    raise exception 'not_found';
  end if;
  v_token := public.ks_create_session(v_id);
  update public.app_sessions set via = 'email' where token_hash = public.ks_token_hash(v_token);
  return jsonb_build_object('session_token', v_token);
end;
$$;
revoke all on function public.app_issue_session() from public, anon;
grant execute on function public.app_issue_session() to authenticated;

-- 2. the admin guards ----------------------------------------------------------------------------------------
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
  v_auth  uuid;
  v_hash  text;
  v_via   text;
  v_found boolean;
begin
  select is_admin, admin_role, auth_uid into v_admin, v_role, v_auth from public.profiles where id = p_actor;
  if not coalesce(v_admin, false) then raise exception 'not_admin'; end if;
  v_hash := public.ks_presented_session_hash();
  select true, s.via into v_found, v_via from public.app_sessions s
   where v_hash is not null and s.token_hash = v_hash and s.user_id = p_actor and s.revoked_at is null and s.expires_at > now();
  if not coalesce(v_found, false) then raise exception 'session_required'; end if;
  -- admins sign in with e-mail only: a session opened with a mobile number is not enough
  if v_auth is null or v_via is distinct from 'email' then raise exception 'admin_email_required'; end if;
  if coalesce(p_need_super, false) and v_role is distinct from 'super' then raise exception 'super_required'; end if;
end;
$$;
revoke all on function public.require_admin_session(uuid, boolean) from public, anon, authenticated;

-- the older check: same rule (it only looked at the is_admin flag before)
create or replace function public.require_admin(p_actor_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_admin_session(p_actor_id, false);
end;
$$;

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
       and s.via = 'email' and p.auth_uid is not null
       and p.is_admin and not p.is_blocked
     limit 1), jsonb_build_object('user_id', null))
$$;
revoke all on function public.ks_session_admin(text) from public, anon, authenticated;
grant execute on function public.ks_session_admin(text) to service_role;

-- 3. an admin must have an e-mail login ----------------------------------------------------------------------
create or replace function public.ks_admin_needs_email()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.is_admin and new.auth_uid is null then
    raise exception 'admin_needs_email';
  end if;
  return new;
end;
$$;
drop trigger if exists ks_admin_needs_email on public.profiles;
create trigger ks_admin_needs_email
  before insert or update of is_admin, auth_uid on public.profiles
  for each row execute function public.ks_admin_needs_email();

-- 4. registration with e-mail, no mobile number ------------------------------------------------------------------
create or replace function public.app_register_email(
  p_full_name           text,
  p_village_town        text,
  p_latitude            numeric,
  p_longitude           numeric,
  p_language            text,
  p_disclaimer_accepted boolean,
  p_show_details        boolean
) returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_email   text := lower(trim(coalesce(auth.email(), (current_setting('request.jwt.claims', true)::json ->> 'email'), '')));
  v_lang    text := case when p_language in ('hi', 'en') then p_language else 'hi' end;
  v_lat     numeric := p_latitude;
  v_lng     numeric := p_longitude;
  v_profile public.profiles%rowtype;
begin
  if v_uid is null then raise exception 'not_authorized'; end if;
  -- idempotent: a second call for the same signed-in user returns the profile already made
  select * into v_profile from public.profiles where auth_uid = v_uid;
  if found then return v_profile; end if;
  if coalesce(trim(p_full_name), '') = '' then raise exception 'name_required'; end if;
  if p_disclaimer_accepted is not true then raise exception 'disclaimer_not_accepted'; end if;
  if v_email = '' then raise exception 'invalid_email'; end if;
  if v_lat is null or v_lng is null or abs(v_lat) > 90 or abs(v_lng) > 180 then v_lat := null; v_lng := null; end if;
  if exists (select 1 from public.profiles where lower(email) = v_email) then raise exception 'email_exists'; end if;
  begin
    insert into public.profiles (
      full_name, phone, email, auth_uid, auth_provider,
      village_town, pincode, latitude, longitude, preferred_language,
      disclaimer_accepted_at, consents
    ) values (
      trim(p_full_name), null, v_email, v_uid, 'email',
      nullif(trim(coalesce(p_village_town, '')), ''), null, v_lat, v_lng, v_lang,
      now(),
      jsonb_build_object('details_visibility', jsonb_build_object(
        'choice', case when p_show_details is false then 'hidden' else 'show' end,
        'chosen_at', now()::text,
        'version', '2026-10'
      ))
    )
    returning * into v_profile;
  exception when unique_violation then
    raise exception 'email_exists';
  end;
  return v_profile;
end;
$$;
revoke all on function public.app_register_email(text, text, numeric, numeric, text, boolean, boolean) from public;
grant execute on function public.app_register_email(text, text, numeric, numeric, text, boolean, boolean) to anon, authenticated;

-- 5. an admin makes another e-mail user an admin --------------------------------------------------------------
create or replace function public.admin_grant_admin(p_actor uuid, p_user_id uuid, p_role text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_p public.profiles%rowtype;
begin
  if p_role is null or p_role not in ('super', 'editor') then raise exception 'invalid_input'; end if;
  perform public.require_admin_session(p_actor, p_role = 'super');
  if p_user_id = p_actor then raise exception 'cannot_change_self'; end if;
  select * into v_p from public.profiles where id = p_user_id for update;
  if not found then raise exception 'not_found'; end if;
  if v_p.is_admin then raise exception 'already_admin'; end if;
  if v_p.is_blocked then raise exception 'grant_blocked'; end if;
  if v_p.auth_uid is null then raise exception 'admin_needs_email'; end if;
  update public.profiles set is_admin = true, admin_role = p_role where id = p_user_id;
  perform public.log_admin_action(p_actor, 'admin_grant', 'user', p_user_id::text, jsonb_build_object('role', p_role));
  return jsonb_build_object('id', p_user_id, 'admin_role', p_role);
end;
$$;
revoke all on function public.admin_grant_admin(uuid, uuid, text) from public;
grant execute on function public.admin_grant_admin(uuid, uuid, text) to anon, authenticated;

-- 6. the People list also says which e-mail a person signs in with (admins only) -------------------------------
drop function if exists public.admin_list_user_status(uuid, text, text, int, int);
create function public.admin_list_user_status(p_actor uuid, p_search text default null, p_status text default 'all', p_limit int default 25, p_offset int default 0)
returns table (id uuid, full_name text, village_town text, pincode text, phone_last4 text, admin_role text, is_blocked boolean,
               blocked_reason text, blocked_at timestamptz, created_at timestamptz, email text)
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
         p.is_blocked, p.blocked_reason, p.blocked_at, p.created_at,
         case when p.auth_uid is null then null else p.email end
    from public.profiles p
   where (coalesce(btrim(p_search), '') = '' or p.full_name ilike q or coalesce(p.village_town, '') ilike q or coalesce(p.pincode, '') ilike q
          or coalesce(p.phone, '') ilike q or coalesce(p.email, '') ilike q)
     and (coalesce(p_status, 'all') = 'all'
          or (p_status = 'blocked' and p.is_blocked)
          or (p_status = 'active' and not p.is_blocked)
          or (p_status = 'admin' and p.is_admin))
   order by p.is_blocked desc, p.created_at desc
   limit least(100, greatest(1, p_limit)) offset greatest(0, p_offset);
end;
$$;
revoke all on function public.admin_list_user_status(uuid, text, text, int, int) from public;
grant execute on function public.admin_list_user_status(uuid, text, text, int, int) to anon, authenticated;
