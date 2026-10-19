-- 0065_listing_delete_disable.sql — Batch 10G: sellers delete / disable / enable their own listings;
-- admins disable / enable / delete any listing. ADDITIVE.
--
-- Founder decisions: DELETE = permanent (the listing row, its child rows and its photos are removed;
-- nothing is soft-deleted). DISABLE = reversible (hidden from everyone else, still shown to its seller).
--
-- What this adds / changes
--   * listings.status may now also be 'disabled' (check constraint widened; old values unchanged).
--     The public read policy (status = 'active' and not expired) and search_listings (status = 'active')
--     already hide it — nothing to change there.
--   * listings.admin_disabled_at, listings.admin_disabled_reason (both null unless an admin disabled it).
--   * public.listing_admin_actions — minimal audit of admin disable / enable / delete: admin id, listing id,
--     action, category, reason, time. NO listing content, NO personal data. RLS on, NO policies: only the
--     SECURITY DEFINER functions below write it; nobody reads it through the API.
--   * Functions (SECURITY DEFINER, search_path pinned, p_actor_id trust model like every listing RPC):
--       set_my_listing_disabled(p_actor_id, p_listing_id, p_disabled)          owner
--       delete_my_listing(p_actor_id, p_listing_id) -> text[] photo paths       owner, permanent
--       admin_set_listing_disabled(p_actor_id, p_listing_id, p_disabled, p_reason)   admin
--       admin_delete_listing(p_actor_id, p_listing_id, p_reason) -> text[]      admin, permanent
--     Errors (application codes the app maps to plain words): not_found, not_owner, not_admin,
--     invalid_state, disabled_by_admin, reason_required, reason_too_long.
--   * get_my_listings: two columns appended (admin_disabled, admin_disabled_reason), existing ones kept
--     in order. get_admin_listings: admin_disabled_at, admin_disabled_reason, photo_count appended.
--     Both are dropped and recreated (a return type cannot be changed in place); default grants kept.
--   * close_listing ("मिल गया / बंद करें") is unchanged.
--
-- Photos: the delete functions return the storage paths (bucket listing-photos) taken from
-- details.photo_urls; Batch 10G Phase 2 (below, section 6) removes the files.
--
-- Rollback: supabase/migrations/rollback/0065_listing_delete_disable_rollback.sql
-- (disabled rows go back to 'active' first; deleted listings stay deleted).

-- 1. status 'disabled' -----------------------------------------------------------------------------
alter table public.listings drop constraint if exists listings_status_check;
alter table public.listings add constraint listings_status_check
  check (status = any (array['active'::text, 'closed'::text, 'removed'::text, 'disabled'::text]));

-- 2. admin-disable columns ------------------------------------------------------------------------------
alter table public.listings add column if not exists admin_disabled_at timestamptz null;
alter table public.listings add column if not exists admin_disabled_reason text null;

-- 3. admin action log ---------------------------------------------------------------------------------
create table if not exists public.listing_admin_actions (
  id bigint generated always as identity primary key,
  admin_id uuid not null,
  listing_id uuid not null,
  action text not null check (action in ('disable', 'enable', 'delete')),
  category text,
  reason text,
  created_at timestamptz not null default now()
);
alter table public.listing_admin_actions enable row level security;
revoke all on table public.listing_admin_actions from anon, authenticated;

-- helper: the storage paths (inside bucket listing-photos) of a listing's photos -------------------------
create or replace function public.listing_photo_paths(p_details jsonb)
returns text[]
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(substring(u from '/storage/v1/object/public/listing-photos/(.+)$')), '{}'::text[])
  from jsonb_array_elements_text(
         case when jsonb_typeof(p_details -> 'photo_urls') = 'array' then p_details -> 'photo_urls' else '[]'::jsonb end
       ) as u
  where u ~ '/storage/v1/object/public/listing-photos/.+$';
$$;
revoke all on function public.listing_photo_paths(jsonb) from public;

-- 4a. seller: disable / enable ----------------------------------------------------------------------
create or replace function public.set_my_listing_disabled(p_actor_id uuid, p_listing_id uuid, p_disabled boolean)
returns public.listings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v public.listings%rowtype;
begin
  select * into v from public.listings where id = p_listing_id for update;
  if not found then raise exception 'not_found'; end if;
  if v.user_id is distinct from p_actor_id then raise exception 'not_owner'; end if;

  if coalesce(p_disabled, false) then
    if v.status = 'disabled' then return v; end if;                 -- already disabled: no-op
    if v.status <> 'active' then raise exception 'invalid_state'; end if;
    update public.listings set status = 'disabled' where id = p_listing_id returning * into v;
  else
    if v.status = 'active' then return v; end if;                   -- already enabled: no-op
    if v.status <> 'disabled' then raise exception 'invalid_state'; end if;
    if v.admin_disabled_at is not null then raise exception 'disabled_by_admin'; end if;
    -- expires_at is NOT touched: an expired listing stays expired (hidden) after enabling.
    update public.listings set status = 'active' where id = p_listing_id returning * into v;
  end if;
  return v;
end;
$$;
revoke all on function public.set_my_listing_disabled(uuid, uuid, boolean) from public;
grant execute on function public.set_my_listing_disabled(uuid, uuid, boolean) to anon, authenticated, service_role;

-- 4b. seller: permanent delete ---------------------------------------------------------------------
create or replace function public.delete_my_listing(p_actor_id uuid, p_listing_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v public.listings%rowtype; v_paths text[];
begin
  select * into v from public.listings where id = p_listing_id for update;
  if not found then raise exception 'not_found'; end if;
  if v.user_id is distinct from p_actor_id then raise exception 'not_owner'; end if;
  v_paths := public.listing_photo_paths(v.details);
  -- Child rows: listing_unavailable_dates, listing_private_contact, listing_view_log are removed by
  -- ON DELETE CASCADE; listing_reports keep the complaint but lose the link (ON DELETE SET NULL).
  delete from public.listings where id = p_listing_id;
  return v_paths;
end;
$$;
revoke all on function public.delete_my_listing(uuid, uuid) from public;
grant execute on function public.delete_my_listing(uuid, uuid) to anon, authenticated, service_role;

-- 4c. admin: disable / enable -------------------------------------------------------------------------
create or replace function public.admin_set_listing_disabled(p_actor_id uuid, p_listing_id uuid, p_disabled boolean, p_reason text)
returns public.listings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v public.listings%rowtype; v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  perform public.require_admin(p_actor_id);
  select * into v from public.listings where id = p_listing_id for update;
  if not found then raise exception 'not_found'; end if;

  if coalesce(p_disabled, false) then
    if v_reason is null then raise exception 'reason_required'; end if;
    if char_length(v_reason) > 300 then raise exception 'reason_too_long'; end if;
    if v.status not in ('active', 'disabled') then raise exception 'invalid_state'; end if;
    update public.listings
       set status = 'disabled', admin_disabled_at = now(), admin_disabled_reason = v_reason
     where id = p_listing_id returning * into v;
    insert into public.listing_admin_actions (admin_id, listing_id, action, category, reason)
    values (p_actor_id, p_listing_id, 'disable', v.category, v_reason);
  else
    if v_reason is not null and char_length(v_reason) > 300 then raise exception 'reason_too_long'; end if;
    if v.status <> 'disabled' then raise exception 'invalid_state'; end if;
    update public.listings
       set status = 'active', admin_disabled_at = null, admin_disabled_reason = null
     where id = p_listing_id returning * into v;
    insert into public.listing_admin_actions (admin_id, listing_id, action, category, reason)
    values (p_actor_id, p_listing_id, 'enable', v.category, v_reason);
  end if;
  return v;
end;
$$;
revoke all on function public.admin_set_listing_disabled(uuid, uuid, boolean, text) from public;
grant execute on function public.admin_set_listing_disabled(uuid, uuid, boolean, text) to anon, authenticated, service_role;

-- 4d. admin: permanent delete -----------------------------------------------------------------------
create or replace function public.admin_delete_listing(p_actor_id uuid, p_listing_id uuid, p_reason text)
returns text[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v public.listings%rowtype; v_paths text[]; v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  perform public.require_admin(p_actor_id);
  if v_reason is null then raise exception 'reason_required'; end if;
  if char_length(v_reason) > 300 then raise exception 'reason_too_long'; end if;
  select * into v from public.listings where id = p_listing_id for update;
  if not found then raise exception 'not_found'; end if;
  v_paths := public.listing_photo_paths(v.details);

  insert into public.listing_admin_actions (admin_id, listing_id, action, category, reason)
  values (p_actor_id, p_listing_id, 'delete', v.category, v_reason);
  -- Keep the complaint queue tidy: open reports about this listing are resolved as 'removed'.
  update public.listing_reports
     set status = 'removed', resolution_note = v_reason, resolved_at = now(), resolved_by = p_actor_id
   where listing_id = p_listing_id and status = 'open';
  delete from public.listings where id = p_listing_id;
  return v_paths;
end;
$$;
revoke all on function public.admin_delete_listing(uuid, uuid, text) from public;
grant execute on function public.admin_delete_listing(uuid, uuid, text) to anon, authenticated, service_role;

-- 5. readers: extra columns ---------------------------------------------------------------------------
drop function if exists public.get_my_listings(uuid);
create function public.get_my_listings(p_actor_id uuid)
returns table(id uuid, listing_type text, category text, status text, latitude numeric, longitude numeric,
              pincode text, details jsonb, self_declared boolean, created_at timestamptz, expires_at timestamptz,
              is_expired boolean, is_available boolean, contact_click_count integer,
              admin_disabled boolean, admin_disabled_reason text)
language sql
security definer
set search_path = public, pg_temp
as $$
  select l.id, l.listing_type, l.category, l.status, l.latitude, l.longitude,
         l.pincode, l.details, l.self_declared, l.created_at, l.expires_at,
         (l.expires_at <= now()) as is_expired,
         l.is_available, l.contact_click_count,
         (l.admin_disabled_at is not null) as admin_disabled,
         l.admin_disabled_reason
  from public.listings l
  where l.user_id = p_actor_id
  order by l.created_at desc;
$$;
grant execute on function public.get_my_listings(uuid) to anon, authenticated, service_role;

drop function if exists public.get_admin_listings(uuid, integer, integer);
create function public.get_admin_listings(p_actor_id uuid, p_limit integer default 20, p_offset integer default 0)
returns table(id uuid, category text, listing_type text, status text, pincode text, village_town text,
              poster_phone text, poster_email text, created_at timestamptz,
              admin_disabled_at timestamptz, admin_disabled_reason text, photo_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  return query
  select l.id, l.category, l.listing_type, l.status,
         l.pincode, pc.village_town, p.phone, p.email, l.created_at,
         l.admin_disabled_at, l.admin_disabled_reason,
         coalesce(cardinality(public.listing_photo_paths(l.details)), 0)::integer
  from public.listings l
  join public.profiles p on p.id = l.user_id
  left join public.pincodes pc on pc.pincode = l.pincode
  order by l.created_at desc
  limit greatest(1, p_limit) offset greatest(0, p_offset);
end;
$$;
grant execute on function public.get_admin_listings(uuid, integer, integer) to anon, authenticated, service_role;
