-- V2 Phase 12 — Kisan Sawaal knowledge base.
-- Extend kisan_sawaal with the structured-content fields so each answered question
-- becomes a prerendered /sawaal/<slug> page. Published rows stay anon-readable
-- (existing sawaal_public_read policy: is_published = true).
alter table public.kisan_sawaal add column if not exists slug          text;
alter table public.kisan_sawaal add column if not exists season        text;        -- kharif | rabi | zaid | all
alter table public.kisan_sawaal add column if not exists answer_blocks jsonb;        -- structured block[] (same schema as content pages)
alter table public.kisan_sawaal add column if not exists sources       jsonb;        -- ['S-...'] ids from sources.js
alter table public.kisan_sawaal add column if not exists published_at  timestamptz;
alter table public.kisan_sawaal add column if not exists updated_at     timestamptz;

create unique index if not exists kisan_sawaal_slug_uidx on public.kisan_sawaal (slug) where slug is not null;
create index if not exists kisan_sawaal_crop_idx     on public.kisan_sawaal (crop)     where is_published;
create index if not exists kisan_sawaal_category_idx on public.kisan_sawaal (category) where is_published;

-- Admin edit of EVERYTHING (§12.3). Extends the existing answer RPC with the new
-- structured fields; all new params are optional so the current admin UI keeps working.
-- Drop the old 6-arg signature first so the extended one doesn't become an ambiguous overload.
drop function if exists public.admin_answer_sawaal(uuid, uuid, text, text, text, boolean);
create or replace function public.admin_answer_sawaal(
  p_actor_id uuid, p_id uuid,
  p_answer_hi text default null, p_answer_en text default null,
  p_answered_by text default null, p_published boolean default null,
  p_slug text default null, p_crop text default null, p_category text default null,
  p_season text default null, p_answer_blocks jsonb default null, p_sources jsonb default null
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin(p_actor_id) then raise exception 'not authorized'; end if;
  update public.kisan_sawaal set
    answer_hi     = coalesce(p_answer_hi, answer_hi),
    answer_en     = coalesce(p_answer_en, answer_en),
    answered_by   = coalesce(p_answered_by, answered_by),
    is_published  = coalesce(p_published, is_published),
    slug          = coalesce(p_slug, slug),
    crop          = coalesce(p_crop, crop),
    category      = coalesce(p_category, category),
    season        = coalesce(p_season, season),
    answer_blocks = coalesce(p_answer_blocks, answer_blocks),
    sources       = coalesce(p_sources, sources),
    answered_at   = coalesce(answered_at, now()),
    published_at  = case when coalesce(p_published, is_published) and published_at is null then now() else published_at end,
    updated_at    = now()
  where id = p_id;
end;
$$;
grant execute on function public.admin_answer_sawaal(uuid, uuid, text, text, text, boolean, text, text, text, text, jsonb, jsonb) to authenticated;
