-- 0035_kisan_mela.sql
-- Kisan Mela calendar — nationwide, self-sourced, honest. ONE migration for the whole
-- Kisan Mela prompt: tables + RLS + admin moderation RPCs (Phase 1/4) + user-interest
-- RPCs (Phase 3) + the digest-readiness RPC (Phase 6). Fully idempotent.

-- ===========================================================================
-- Tables
-- ===========================================================================
create table if not exists public.kisan_mela (
  id uuid primary key default gen_random_uuid(),
  name_hi text not null,
  name_en text,
  organizer_name text,
  venue text not null,
  address text,
  state text not null,
  district text,
  latitude numeric,
  longitude numeric,
  event_date_start date,
  event_date_end date,
  is_date_confirmed boolean not null default false,
  expected_period text, -- e.g. "Feb 2027" when exact dates aren't confirmed
  category_tags text[] not null default '{}',
  -- allowed values: seeds, machinery, livestock, horticulture, scheme_scientist, general
  highlights_hi text,
  highlights_en text,
  contact_name text,
  contact_number text,
  source_url text not null,
  last_checked_date date not null default current_date,
  submitted_by_user boolean not null default false,
  -- POLICY DECISION (see docs/review/KISAN_MELA_REVIEW.md, flagged explicitly): AI-discovered
  -- entries default to 'approved' and go live with NO human review step — the Phase 2
  -- verification discipline (cite a source, never guess dates, cross-check before including)
  -- IS the quality gate. User-submitted entries are inserted as 'pending' (Phase 4) and DO
  -- require admin review. If the owner wants human review for AI-discovered content too, change
  -- the discovery script to insert 'pending' instead (one line) — the schema already supports it.
  moderation_status text not null default 'approved' check (moderation_status in ('pending', 'approved', 'rejected')),
  is_active boolean not null default true,
  created_at timestamptz default now(),
  -- Only the enumerated category tags are allowed (empty array is fine).
  constraint kisan_mela_category_tags_check
    check (category_tags <@ array['seeds','machinery','livestock','horticulture','scheme_scientist','general']::text[])
);

create index if not exists kisan_mela_live_idx on public.kisan_mela (is_active, moderation_status, event_date_start);

create table if not exists public.kisan_mela_interest (
  mela_id uuid not null references public.kisan_mela(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (mela_id, user_id)
);

-- ===========================================================================
-- RLS
-- ===========================================================================
alter table public.kisan_mela enable row level security;
grant select on public.kisan_mela to anon, authenticated;
grant insert on public.kisan_mela to anon, authenticated;

-- Public read: only live, approved entries.
drop policy if exists kisan_mela_public_read on public.kisan_mela;
create policy kisan_mela_public_read on public.kisan_mela
  for select to anon, authenticated
  using (is_active = true and moderation_status = 'approved');

-- Constrained anon INSERT for the public submission form (Phase 4): a submission can only
-- land as a pending, user-flagged row — never auto-approved. (Same constrained-insert pattern
-- as kisan_sawaal.) No anon UPDATE/DELETE => moderation only via the admin RPCs below.
drop policy if exists kisan_mela_public_insert on public.kisan_mela;
create policy kisan_mela_public_insert on public.kisan_mela
  for insert to anon, authenticated
  with check (moderation_status = 'pending' and submitted_by_user = true);

-- Interest table: all access via the owner-scoped RPCs below (no direct anon policies).
alter table public.kisan_mela_interest enable row level security;

-- ===========================================================================
-- Admin RPCs (require_admin from 0012 enforces is_admin server-side)
-- ===========================================================================

-- Full list (any status) for the moderation queue + management.
create or replace function public.get_admin_melas(p_actor_id uuid)
returns setof public.kisan_mela
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.kisan_mela order by (moderation_status = 'pending') desc, created_at desc;
end;
$$;

-- Insert or edit a Mela. p_id null = insert (admin-created rows are approved by default);
-- non-null = edit an existing row (e.g. edit-and-approve a user submission).
create or replace function public.admin_upsert_mela(
  p_actor_id uuid, p_id uuid,
  p_name_hi text, p_name_en text, p_organizer_name text,
  p_venue text, p_address text, p_state text, p_district text,
  p_latitude numeric, p_longitude numeric,
  p_event_date_start date, p_event_date_end date,
  p_is_date_confirmed boolean, p_expected_period text,
  p_category_tags text[], p_highlights_hi text, p_highlights_en text,
  p_contact_name text, p_contact_number text, p_source_url text,
  p_moderation_status text, p_is_active boolean
) returns public.kisan_mela
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.kisan_mela%rowtype;
  v_status text := coalesce(nullif(trim(p_moderation_status), ''), 'approved');
begin
  perform public.require_admin(p_actor_id);
  if v_status not in ('pending', 'approved', 'rejected') then raise exception 'invalid_status'; end if;
  if p_id is null then
    insert into public.kisan_mela (
      name_hi, name_en, organizer_name, venue, address, state, district, latitude, longitude,
      event_date_start, event_date_end, is_date_confirmed, expected_period, category_tags,
      highlights_hi, highlights_en, contact_name, contact_number, source_url,
      last_checked_date, submitted_by_user, moderation_status, is_active
    ) values (
      p_name_hi, p_name_en, p_organizer_name, p_venue, p_address, p_state, p_district, p_latitude, p_longitude,
      p_event_date_start, p_event_date_end, coalesce(p_is_date_confirmed, false), p_expected_period, coalesce(p_category_tags, '{}'),
      p_highlights_hi, p_highlights_en, p_contact_name, p_contact_number, p_source_url,
      current_date, false, v_status, coalesce(p_is_active, true)
    ) returning * into v;
  else
    update public.kisan_mela set
      name_hi = p_name_hi, name_en = p_name_en, organizer_name = p_organizer_name,
      venue = p_venue, address = p_address, state = p_state, district = p_district,
      latitude = p_latitude, longitude = p_longitude,
      event_date_start = p_event_date_start, event_date_end = p_event_date_end,
      is_date_confirmed = coalesce(p_is_date_confirmed, false), expected_period = p_expected_period,
      category_tags = coalesce(p_category_tags, '{}'),
      highlights_hi = p_highlights_hi, highlights_en = p_highlights_en,
      contact_name = p_contact_name, contact_number = p_contact_number, source_url = p_source_url,
      last_checked_date = current_date, moderation_status = v_status, is_active = coalesce(p_is_active, true)
    where id = p_id returning * into v;
    if not found then raise exception 'not_found'; end if;
  end if;
  return v;
end;
$$;

-- Approve / reject a (usually user-submitted) Mela.
create or replace function public.admin_set_mela_status(p_actor_id uuid, p_id uuid, p_status text)
returns public.kisan_mela
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.kisan_mela%rowtype;
begin
  perform public.require_admin(p_actor_id);
  if p_status not in ('pending', 'approved', 'rejected') then raise exception 'invalid_status'; end if;
  update public.kisan_mela set moderation_status = p_status where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$$;

create or replace function public.admin_set_mela_active(p_actor_id uuid, p_id uuid, p_active boolean)
returns public.kisan_mela
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.kisan_mela%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.kisan_mela set is_active = p_active where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$$;

create or replace function public.admin_delete_mela(p_actor_id uuid, p_id uuid)
returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  delete from public.kisan_mela where id = p_id;
  return true;
end;
$$;

-- ===========================================================================
-- User interest RPCs (owner-scoped by the passed actor id — trust-based auth, same
-- model as create_listing/increment_contact_click). A user only ever writes their own row.
-- ===========================================================================
create or replace function public.set_mela_interest(p_actor_id uuid, p_mela_id uuid, p_interested boolean)
returns boolean
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.profiles where id = p_actor_id) then raise exception 'not_authorized'; end if;
  if coalesce(p_interested, true) then
    insert into public.kisan_mela_interest (mela_id, user_id) values (p_mela_id, p_actor_id)
      on conflict (mela_id, user_id) do nothing;
  else
    delete from public.kisan_mela_interest where mela_id = p_mela_id and user_id = p_actor_id;
  end if;
  return true;
end;
$$;
grant execute on function public.set_mela_interest(uuid, uuid, boolean) to anon, authenticated;

-- The mela ids a given user has flagged (so the page can show the toggled state).
create or replace function public.get_my_mela_interests(p_actor_id uuid)
returns setof uuid
language sql security definer set search_path = public, pg_temp
as $$
  select mela_id from public.kisan_mela_interest where user_id = p_actor_id;
$$;
grant execute on function public.get_my_mela_interests(uuid) to anon, authenticated;

-- ===========================================================================
-- Phase 6 — digest-readiness: interest rows for Melas happening today or within the next
-- 3 days (confirmed dates only). The future daily WhatsApp digest (weather + mandi, not yet
-- built) calls this with the service role to fold interested-Mela reminders into one message.
-- NOT granted to anon (it exposes user_ids) — the digest job runs with the service role.
-- ===========================================================================
create or replace function public.get_mela_interest_digest(p_as_of date default current_date)
returns table (
  user_id uuid, mela_id uuid, name_hi text, name_en text, venue text, state text, district text,
  event_date_start date, event_date_end date, days_until integer, source_url text
)
language sql security definer set search_path = public, pg_temp
as $$
  select i.user_id, m.id, m.name_hi, m.name_en, m.venue, m.state, m.district,
         m.event_date_start, m.event_date_end,
         (m.event_date_start - p_as_of) as days_until, m.source_url
  from public.kisan_mela_interest i
  join public.kisan_mela m on m.id = i.mela_id
  where m.is_active = true
    and m.moderation_status = 'approved'
    and m.is_date_confirmed = true
    and m.event_date_start is not null
    and m.event_date_start <= p_as_of + 3
    and coalesce(m.event_date_end, m.event_date_start) >= p_as_of
  order by i.user_id, m.event_date_start;
$$;
