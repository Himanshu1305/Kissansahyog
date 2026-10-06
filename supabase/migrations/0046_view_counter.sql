-- V2 Phase 11 — lightweight, rate-limited listing view counter (for the
-- "सबसे ज़्यादा देखा गया" box). One count per device per listing per 24h.
alter table public.listings add column if not exists view_count integer not null default 0;

create table if not exists public.listing_view_log (
  id         bigserial primary key,
  listing_id uuid not null references public.listings(id) on delete cascade,
  device_id  text not null,
  created_at timestamptz not null default now()
);
create index if not exists listing_view_log_idx on public.listing_view_log (listing_id, device_id, created_at);
alter table public.listing_view_log enable row level security;  -- RPC-only

create or replace function public.increment_listing_view(p_listing_id uuid, p_device text)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_dev text := coalesce(nullif(trim(p_device), ''), 'unknown');
begin
  -- Housekeeping: drop view-log rows older than 2 days (the dedup window is 24h).
  delete from public.listing_view_log where created_at < now() - interval '2 days';
  if exists (
    select 1 from public.listing_view_log
    where listing_id = p_listing_id and device_id = v_dev and created_at > now() - interval '24 hours'
  ) then
    return; -- already counted this device in the last day
  end if;
  if not exists (select 1 from public.listings where id = p_listing_id and status = 'active') then return; end if;
  insert into public.listing_view_log (listing_id, device_id) values (p_listing_id, v_dev);
  update public.listings set view_count = view_count + 1 where id = p_listing_id;
end;
$$;
grant execute on function public.increment_listing_view(uuid, text) to anon, authenticated;
