-- 0036_kisan_mela_candidates.sql
-- Kisan Mela re-architecture: a candidate-staging + audit table shared by the free aggregator
-- scraper (Phase 2), the scoped AI search (Phase 3), and the narrow per-candidate verification
-- (Phase 4). This table IS the pipeline's structured observability log — every lead ever
-- considered stays permanently queryable with its outcome + reason. Fully idempotent.

create table if not exists public.kisan_mela_candidates (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,              -- 'taazabhav' | 'kisaanhelpline' | 'ai_broad_search'
  source_url text not null,               -- the aggregator detail-page link, or the lead behind the search
  raw_name text, raw_venue text, raw_state text, raw_district text,
  raw_date_text text, raw_highlights text,
  scraped_at timestamptz default now(),
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected', 'unverifiable')),
  verification_reason text,               -- why rejected/unverifiable, or what the official source confirmed
  verified_primary_source_url text,
  last_verification_attempt_at timestamptz, -- Phase 4f: bounds re-verification cadence
  promoted_to_kisan_mela boolean not null default false,
  kisan_mela_id uuid references public.kisan_mela(id),
  created_at timestamptz default now()
);
create index if not exists kisan_mela_candidates_status_idx on public.kisan_mela_candidates (verification_status, scraped_at);
create index if not exists kisan_mela_candidates_dedupe_idx on public.kisan_mela_candidates (lower(raw_venue), lower(raw_state));

-- Internal pipeline state — NOT public-facing. RLS on, no anon/authenticated policies (default
-- deny); the pipeline writes with the service role (bypasses RLS), admins read/act via the
-- require_admin RPCs below.
alter table public.kisan_mela_candidates enable row level security;

-- Phase 4c: track every independent source that corroborated an event.
alter table public.kisan_mela add column if not exists source_urls text[] not null default '{}';

-- Backfill existing (original-build) rows so they show a source under Phase 6's new display.
update public.kisan_mela set source_urls = array[source_url]
  where source_url is not null and source_url <> '' and source_urls = '{}';

-- ===========================================================================
-- Admin RPCs (Phase 7) — require_admin (0012) enforces is_admin server-side.
-- ===========================================================================

-- All candidates, newest first, pending/unverifiable/rejected grouped sensibly for the queue.
create or replace function public.get_admin_mela_candidates(p_actor_id uuid)
returns setof public.kisan_mela_candidates
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.kisan_mela_candidates
    order by (verification_status = 'pending') desc,
             (verification_status in ('rejected', 'unverifiable')) desc,
             scraped_at desc;
end;
$$;
grant execute on function public.get_admin_mela_candidates(uuid) to anon, authenticated;

-- "फिर भी प्रकाशित करें" (publish anyway): promote a rejected/unverifiable candidate to the
-- public kisan_mela table from its raw lead data (admin independently vouches for it). The admin
-- can then refine fields via the existing Mela moderation edit form. Idempotent per candidate.
create or replace function public.admin_publish_candidate(p_actor_id uuid, p_id uuid)
returns public.kisan_mela
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  c public.kisan_mela_candidates%rowtype;
  v public.kisan_mela%rowtype;
begin
  perform public.require_admin(p_actor_id);
  select * into c from public.kisan_mela_candidates where id = p_id;
  if not found then raise exception 'not_found'; end if;
  if c.promoted_to_kisan_mela and c.kisan_mela_id is not null then
    select * into v from public.kisan_mela where id = c.kisan_mela_id;
    if found then return v; end if;
  end if;
  insert into public.kisan_mela (
    name_hi, name_en, organizer_name, venue, address, state, district,
    is_date_confirmed, expected_period, category_tags, highlights_hi,
    source_url, source_urls, last_checked_date, submitted_by_user, moderation_status, is_active
  ) values (
    coalesce(nullif(trim(c.raw_name), ''), 'Kisan Mela'), null, null,
    coalesce(nullif(trim(c.raw_venue), ''), coalesce(c.raw_state, 'India')), null,
    coalesce(nullif(trim(c.raw_state), ''), 'India'), nullif(trim(c.raw_district), ''),
    false, nullif(trim(c.raw_date_text), ''), '{}', nullif(trim(c.raw_highlights), ''),
    coalesce(c.verified_primary_source_url, c.source_url),
    array(select distinct u from unnest(array[c.verified_primary_source_url, c.source_url]) u where u is not null and u <> ''),
    current_date, false, 'approved', true
  ) returning * into v;
  update public.kisan_mela_candidates
    set promoted_to_kisan_mela = true, kisan_mela_id = v.id,
        verification_status = 'verified',
        verification_reason = coalesce(verification_reason, '') || ' [admin override: published manually]'
    where id = p_id;
  return v;
end;
$$;
grant execute on function public.admin_publish_candidate(uuid, uuid) to anon, authenticated;
