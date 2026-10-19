-- ROLLBACK of 0065_listing_delete_disable.sql (Batch 10G).
-- Run ONLY after the website was rolled back to a version that does not call the 10G functions.
-- Effects: listings the seller or an admin DISABLED become 'active' again (visible to the public if not
-- expired) and their admin-disable marks are cleared. Listings that were DELETED stay deleted (nothing to
-- restore; that was the founder's "permanent" rule). The admin action log is dropped.

-- 1. disabled rows back to active, then the old status set ---------------------------------------------
update public.listings set status = 'active' where status = 'disabled';
alter table public.listings drop constraint if exists listings_status_check;
alter table public.listings add constraint listings_status_check
  check (status = any (array['active'::text, 'closed'::text, 'removed'::text]));

-- 1b. storage delete policy and queue (Phase 2 of 0065) ------------------------------------------------------
drop policy if exists listing_photos_queued_delete on storage.objects;
drop table if exists public.listing_photo_deletions;

-- 2. functions added by 0065 -----------------------------------------------------------------------------
drop function if exists public.set_my_listing_disabled(uuid, uuid, boolean);
drop function if exists public.delete_my_listing(uuid, uuid);
drop function if exists public.admin_set_listing_disabled(uuid, uuid, boolean, text);
drop function if exists public.admin_delete_listing(uuid, uuid, text);
drop function if exists public.listing_photo_deletable(text);
drop function if exists public.get_my_pending_photo_deletions(uuid);
drop function if exists public.forget_photo_deletions(uuid, text[]);

-- 3. the two readers, exactly as before 0065 ----------------------------------------------------------------
drop function if exists public.get_my_listings(uuid);
create function public.get_my_listings(p_actor_id uuid)
returns table(id uuid, listing_type text, category text, status text, latitude numeric, longitude numeric,
              pincode text, details jsonb, self_declared boolean, created_at timestamptz, expires_at timestamptz,
              is_expired boolean, is_available boolean, contact_click_count integer)
language sql
security definer
set search_path = public, pg_temp
as $$
  select l.id, l.listing_type, l.category, l.status, l.latitude, l.longitude,
         l.pincode, l.details, l.self_declared, l.created_at, l.expires_at,
         (l.expires_at <= now()) as is_expired,
         l.is_available, l.contact_click_count
  from public.listings l
  where l.user_id = p_actor_id
  order by l.created_at desc;
$$;
grant execute on function public.get_my_listings(uuid) to anon, authenticated, service_role;

drop function if exists public.get_admin_listings(uuid, integer, integer);
create function public.get_admin_listings(p_actor_id uuid, p_limit integer default 20, p_offset integer default 0)
returns table(id uuid, category text, listing_type text, status text, pincode text, village_town text,
              poster_phone text, poster_email text, created_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  return query
  select l.id, l.category, l.listing_type, l.status,
         l.pincode, pc.village_town, p.phone, p.email, l.created_at
  from public.listings l
  join public.profiles p on p.id = l.user_id
  left join public.pincodes pc on pc.pincode = l.pincode
  order by l.created_at desc
  limit greatest(1, p_limit) offset greatest(0, p_offset);
end;
$$;
grant execute on function public.get_admin_listings(uuid, integer, integer) to anon, authenticated, service_role;

drop function if exists public.listing_photo_paths(jsonb);

-- 5. columns and the admin log -------------------------------------------------------------------------------
alter table public.listings drop column if exists admin_disabled_reason;
alter table public.listings drop column if exists admin_disabled_at;
drop table if exists public.listing_admin_actions;
