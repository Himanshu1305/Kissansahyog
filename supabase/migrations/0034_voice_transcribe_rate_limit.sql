-- 0034_voice_transcribe_rate_limit.sql
-- Persistent, DB-backed rate limit for the public /transcribe Pages Function (Phase 3c-i).
-- A serverless in-memory counter resets every invocation and guards nothing, so the state
-- lives here — same principle as the Nominatim serialized-queue's DB slot. Fully idempotent.

create table if not exists public.voice_transcribe_calls (
  id         bigserial primary key,
  requester  text not null,          -- caller IP (from cf-connecting-ip); coarse, non-identifying
  created_at timestamptz not null default now()
);
create index if not exists voice_transcribe_calls_req_time_idx
  on public.voice_transcribe_calls (requester, created_at);

-- No RLS policies → anon cannot read/write the table directly; all access is via the
-- SECURITY DEFINER RPC below.
alter table public.voice_transcribe_calls enable row level security;

-- Atomically: prune old rows, count this requester's calls in the window, and either reject
-- (>= max) or record a new call and allow. Returns true = allowed, false = rate-limited.
create or replace function public.check_transcribe_rate(
  p_requester      text,
  p_max            int default 20,
  p_window_seconds int default 3600
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
  v_req   text := coalesce(nullif(trim(p_requester), ''), 'unknown');
begin
  -- Housekeeping: drop rows older than a day so the table stays small.
  delete from public.voice_transcribe_calls where created_at < now() - interval '1 day';

  select count(*) into v_count
  from public.voice_transcribe_calls
  where requester = v_req
    and created_at > now() - make_interval(secs => greatest(p_window_seconds, 1));

  if v_count >= greatest(p_max, 1) then
    return false;
  end if;

  insert into public.voice_transcribe_calls (requester) values (v_req);
  return true;
end;
$$;

grant execute on function public.check_transcribe_rate(text, int, int) to anon, authenticated;
