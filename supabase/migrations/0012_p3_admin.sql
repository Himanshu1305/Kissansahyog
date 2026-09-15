-- Kisan Sahyog — 0012 (Phase 3) admin dashboard: moderation, stats, management
--
-- Adds a 'removed' listing status (moderation), creates the `articles` table
-- (managed here by admins; public reads + seeds land in the Phase 5 migration),
-- and a suite of SECURITY DEFINER admin RPCs. Every admin RPC verifies the acting
-- profile has is_admin = true IN-BODY, so a non-admin caller gets an error, not
-- data. is_admin is set manually in SQL (see PROJECT_CONTEXT.md).

-- Moderation status. 'removed' rows are excluded from public browse/homepage
-- automatically (those queries filter status = 'active').
alter table public.listings drop constraint if exists listings_status_check;
alter table public.listings
  add constraint listings_status_check
  check (status in ('active', 'closed', 'removed'));

-- Articles table (public reads + seed data are added in the Phase 5 migration).
create table if not exists public.articles (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title_hi      text not null,
  title_en      text not null,
  summary_hi    text,
  summary_en    text,
  content_hi    text not null,
  content_en    text not null,
  author_name   text not null default 'Team Kisan Sahyog',
  cover_image_url text,
  is_published  boolean not null default false,
  published_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Admin gate helper (SECURITY DEFINER; raises if the actor is not an admin).
-- ---------------------------------------------------------------------------
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

-- 4a — overview stats.
create or replace function public.get_admin_stats(p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v jsonb;
begin
  perform public.require_admin(p_actor_id);
  select jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'active_total', (select count(*) from public.listings where status = 'active'),
    'active_by_category', coalesce((select jsonb_object_agg(category, c)
        from (select category, count(*) c from public.listings where status = 'active' group by category) s), '{}'::jsonb),
    'closed', (select count(*) from public.listings where status = 'closed'),
    'removed', (select count(*) from public.listings where status = 'removed'),
    'experts', (select count(*) from public.experts),
    'articles_published', (select count(*) from public.articles where is_published = true)
  ) into v;
  return v;
end;
$$;

-- 4b — recent listings with poster contact (admin-only).
create or replace function public.get_admin_listings(p_actor_id uuid, p_limit int default 20, p_offset int default 0)
returns table (
  id uuid, category text, listing_type text, status text,
  pincode text, village_town text, poster_phone text, poster_email text,
  created_at timestamptz
)
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

-- 4e — users list (admin-only), optional search by name/phone/email.
create or replace function public.get_admin_users(p_actor_id uuid, p_limit int default 25, p_offset int default 0, p_search text default null)
returns table (
  id uuid, full_name text, phone text, email text, village_town text,
  pincode text, created_at timestamptz, listing_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare q text := '%' || coalesce(trim(p_search), '') || '%';
begin
  perform public.require_admin(p_actor_id);
  return query
  select p.id, p.full_name, p.phone, p.email, p.village_town, p.pincode, p.created_at,
         (select count(*) from public.listings l where l.user_id = p.id) as listing_count
  from public.profiles p
  where (coalesce(trim(p_search), '') = ''
         or p.full_name ilike q or coalesce(p.phone,'') ilike q or coalesce(p.email,'') ilike q)
  order by p.created_at desc
  limit greatest(1, p_limit) offset greatest(0, p_offset);
end;
$$;

-- Moderation: soft-remove a listing.
create or replace function public.remove_listing(p_actor_id uuid, p_listing_id uuid)
returns public.listings
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v public.listings%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.listings set status = 'removed' where id = p_listing_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$$;

-- Expert management (admin-only).
create or replace function public.admin_list_experts(p_actor_id uuid)
returns setof public.experts
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.experts order by created_at desc;
end;
$$;

create or replace function public.admin_set_expert_active(p_actor_id uuid, p_expert_id uuid, p_active boolean)
returns public.experts
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v public.experts%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.experts set is_active = p_active where id = p_expert_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$$;

create or replace function public.admin_upsert_expert(
  p_actor_id uuid, p_id uuid, p_name text, p_name_hi text,
  p_specialisation_en text, p_specialisation_hi text, p_bio_en text, p_bio_hi text,
  p_phone text, p_organisation text, p_is_active boolean
) returns public.experts
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v public.experts%rowtype;
begin
  perform public.require_admin(p_actor_id);
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = '' then
    raise exception 'name_required';
  end if;
  if p_id is null then
    insert into public.experts (name, name_hi, specialisation_en, specialisation_hi, bio_en, bio_hi, phone, organisation, is_active)
    values (trim(p_name), p_name_hi, p_specialisation_en, p_specialisation_hi, p_bio_en, p_bio_hi, trim(p_phone), p_organisation, coalesce(p_is_active, true))
    returning * into v;
  else
    update public.experts set
      name = trim(p_name), name_hi = p_name_hi, specialisation_en = p_specialisation_en,
      specialisation_hi = p_specialisation_hi, bio_en = p_bio_en, bio_hi = p_bio_hi,
      phone = trim(p_phone), organisation = p_organisation, is_active = coalesce(p_is_active, true)
    where id = p_id returning * into v;
    if not found then raise exception 'not_found'; end if;
  end if;
  return v;
end;
$$;

-- Article management (admin-only).
create or replace function public.get_admin_articles(p_actor_id uuid)
returns setof public.articles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.articles order by created_at desc;
end;
$$;

create or replace function public.admin_upsert_article(
  p_actor_id uuid, p_id uuid, p_slug text, p_title_hi text, p_title_en text,
  p_summary_hi text, p_summary_en text, p_content_hi text, p_content_en text,
  p_author_name text, p_cover_image_url text, p_is_published boolean
) returns public.articles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v public.articles%rowtype; v_pub boolean := coalesce(p_is_published, false);
begin
  perform public.require_admin(p_actor_id);
  if coalesce(trim(p_slug),'')='' or coalesce(trim(p_title_hi),'')='' or coalesce(trim(p_title_en),'')=''
     or coalesce(trim(p_content_hi),'')='' or coalesce(trim(p_content_en),'')='' then
    raise exception 'article_fields_required';
  end if;
  if p_id is null then
    insert into public.articles (slug, title_hi, title_en, summary_hi, summary_en, content_hi, content_en, author_name, cover_image_url, is_published, published_at)
    values (trim(p_slug), p_title_hi, p_title_en, p_summary_hi, p_summary_en, p_content_hi, p_content_en,
            coalesce(nullif(trim(p_author_name),''), 'Team Kisan Sahyog'), p_cover_image_url, v_pub,
            case when v_pub then now() else null end)
    returning * into v;
  else
    update public.articles set
      slug = trim(p_slug), title_hi = p_title_hi, title_en = p_title_en,
      summary_hi = p_summary_hi, summary_en = p_summary_en, content_hi = p_content_hi, content_en = p_content_en,
      author_name = coalesce(nullif(trim(p_author_name),''), 'Team Kisan Sahyog'), cover_image_url = p_cover_image_url,
      is_published = v_pub,
      published_at = case when v_pub and published_at is null then now()
                         when not v_pub then null else published_at end
    where id = p_id returning * into v;
    if not found then raise exception 'not_found'; end if;
  end if;
  return v;
end;
$$;

create or replace function public.admin_delete_article(p_actor_id uuid, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  delete from public.articles where id = p_id;
  return true;
end;
$$;

-- Grants (each function enforces is_admin internally).
grant execute on function public.require_admin(uuid) to anon, authenticated;
grant execute on function public.get_admin_stats(uuid) to anon, authenticated;
grant execute on function public.get_admin_listings(uuid, int, int) to anon, authenticated;
grant execute on function public.get_admin_users(uuid, int, int, text) to anon, authenticated;
grant execute on function public.remove_listing(uuid, uuid) to anon, authenticated;
grant execute on function public.admin_list_experts(uuid) to anon, authenticated;
grant execute on function public.admin_set_expert_active(uuid, uuid, boolean) to anon, authenticated;
grant execute on function public.admin_upsert_expert(uuid, uuid, text, text, text, text, text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.get_admin_articles(uuid) to anon, authenticated;
grant execute on function public.admin_upsert_article(uuid, uuid, text, text, text, text, text, text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.admin_delete_article(uuid, uuid) to anon, authenticated;
