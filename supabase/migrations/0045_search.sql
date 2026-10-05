-- V2 Phase 10 — Site-wide search.
--   1. pg_trgm for fuzzy matching.
--   2. search_listings RPC — live listing teasers (the high-churn, login-gated
--      content that a build-time static index can't keep fresh).
--   3. search_misses — zero-result queries (constrained anon insert, rate-limited)
--      + admin view.
-- Published content (hubs, articles, schemes, videos, Q&A, cold storage, mela,
-- resources, experts, crops) is served from a build-time static index
-- (public/search-index.json, see scripts/build-search-index.mjs).

create extension if not exists pg_trgm;

-- Live listing search (teasers). Returns active rows whose category / village /
-- details text matches the query; ranked by trigram similarity.
create or replace function public.search_listings(p_query text, p_limit int default 24)
returns table (
  id uuid, category text, listing_type text, village_name text,
  latitude numeric, longitude numeric, details jsonb, is_sponsored boolean, sim real
)
language sql stable security definer set search_path = public, pg_temp
as $$
  with q as (select lower(trim(coalesce(p_query, ''))) as s)
  select l.id, l.category, l.listing_type, l.village_name, l.latitude, l.longitude,
         l.details, l.is_sponsored,
         greatest(
           similarity(lower(l.category), (select s from q)),
           similarity(lower(coalesce(l.village_name, '')), (select s from q)),
           similarity(lower(l.details::text), (select s from q))
         ) as sim
  from public.listings l, q
  where l.status = 'active'
    and q.s <> ''
    and (
      l.category ilike '%' || q.s || '%'
      or l.village_name ilike '%' || q.s || '%'
      or l.details::text ilike '%' || q.s || '%'
    )
  order by sim desc, l.created_at desc
  limit greatest(p_limit, 1);
$$;
grant execute on function public.search_listings(text, int) to anon, authenticated;

-- Zero-result query log.
create table if not exists public.search_misses (
  id         bigserial primary key,
  query      text not null,
  device_id  text,
  created_at timestamptz not null default now()
);
create index if not exists search_misses_query_idx on public.search_misses (lower(query));
alter table public.search_misses enable row level security;  -- RPC-only

create or replace function public.log_search_miss(p_query text, p_device text)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_dev text := coalesce(nullif(trim(p_device), ''), 'unknown'); v_count int; v_q text := nullif(trim(p_query), '');
begin
  if v_q is null then return; end if;
  delete from public.search_misses where created_at < now() - interval '180 days';
  select count(*) into v_count from public.search_misses where device_id = v_dev and created_at > now() - interval '1 hour';
  if v_count >= 30 then return; end if;  -- rate limit, silent
  insert into public.search_misses (query, device_id) values (left(v_q, 120), v_dev);
end;
$$;
grant execute on function public.log_search_miss(text, text) to anon, authenticated;

-- Admin: top zero-result queries.
create or replace function public.get_search_misses(p_actor_id uuid, p_limit int default 100)
returns table (query text, misses bigint, last_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  return query
    select lower(s.query) as query, count(*)::bigint as misses, max(s.created_at) as last_at
    from public.search_misses s
    group by lower(s.query)
    order by misses desc, last_at desc
    limit greatest(p_limit, 1);
end;
$$;
grant execute on function public.get_search_misses(uuid, int) to anon, authenticated;
