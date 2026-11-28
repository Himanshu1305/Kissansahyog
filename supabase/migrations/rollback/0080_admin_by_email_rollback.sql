-- Rollback of 0080_admin_by_email.sql: puts the old admin checks back (any session, mobile or e-mail, of an admin) and removes
-- the new functions. Admin roles already given stay as they are.
drop function if exists public.admin_grant_admin(uuid, uuid, text);
drop function if exists public.app_register_email(text, text, numeric, numeric, text, boolean, boolean);
drop function if exists public.admin_list_user_status(uuid, text, text, int, int);
create function public.admin_list_user_status(p_actor uuid, p_search text default null, p_status text default 'all', p_limit int default 25, p_offset int default 0)
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
revoke all on function public.admin_list_user_status(uuid, text, text, int, int) from public;
grant execute on function public.admin_list_user_status(uuid, text, text, int, int) to anon, authenticated;
drop trigger if exists ks_admin_needs_email on public.profiles;
drop function if exists public.ks_admin_needs_email();

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

create or replace function public.require_admin(p_actor_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.profiles where id = p_actor_id and is_admin = true) then
    raise exception 'not_admin';
  end if;
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
       and p.is_admin and not p.is_blocked
     limit 1), jsonb_build_object('user_id', null))
$$;
revoke all on function public.ks_session_admin(text) from public, anon, authenticated;
grant execute on function public.ks_session_admin(text) to service_role;

create or replace function public.app_issue_session()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_id  uuid;
begin
  if v_uid is null then
    raise exception 'not_authorized';
  end if;
  select id into v_id from public.profiles where auth_uid = v_uid;
  if not found then
    raise exception 'not_found';
  end if;
  return jsonb_build_object('session_token', public.ks_create_session(v_id));
end;
$$;
revoke all on function public.app_issue_session() from public, anon;
grant execute on function public.app_issue_session() to authenticated;

alter table public.app_sessions drop column if exists via;
