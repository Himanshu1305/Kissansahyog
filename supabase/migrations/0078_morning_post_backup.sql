-- 0078_morning_post_backup.sql - Batch 25: a backup starter for the "Morning post" GitHub workflow.
-- WHY: GitHub starts scheduled runs late or not at all (24 Nov 2026: none started by 09:00 IST). Like the mandi and weather refreshes
--   (0071, 0072) this moves the start off GitHub's scheduler: three tries a day, at 04:35, 05:35 and 06:35 IST, each asks THIS database whether
--   today's post (IST date) is complete (voice AND video stored, the same rule as scripts/morning/check-complete.mjs). If it is not, the database
--   starts the workflow through GitHub's API (workflow_dispatch, with check_first = true, so the workflow's own check can still skip it).
-- SECRET: the GitHub token lives ONLY in Supabase Vault under the name github_dispatch_token. No secret value is in this file.
--   Create it first (SHIP.md step 2). The token needs only: this one repository, permission "Actions: Read and write".
-- Idempotent: re-running replaces the function and the three jobs. Rollback: supabase/migrations/rollback/0078_morning_post_backup_rollback.sql
-- Nothing else is touched: no table, no other function, no OTP switch.

do $guard$
declare have_token boolean := false;
begin
  if to_regclass('vault.decrypted_secrets') is not null then
    execute 'select exists (select 1 from vault.decrypted_secrets where name = ''github_dispatch_token'' and coalesce(decrypted_secret, '''') <> '''')' into have_token;
  end if;
  if not have_token then
    raise exception 'Batch 25 stopped: the Vault secret github_dispatch_token is missing. Create it first (docs/review/batch25/SHIP.md step 2). Nothing was changed.';
  end if;
  if to_regclass('public.morning_posts') is null then
    raise exception 'Batch 25 stopped: public.morning_posts does not exist (migration 0070 to 0074 are missing). Nothing was changed.';
  end if;
end
$guard$;

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;

-- p_force = true starts the workflow even when today's post is complete (a harmless test: the workflow's own check then skips in seconds).
create or replace function public.morning_post_backup_kick(p_force boolean default false)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_date  date := (now() at time zone 'Asia/Kolkata')::date;
  v_token text;
  v_req   bigint;
begin
  if not p_force and exists (
    select 1 from public.morning_posts m
     where m.post_date = v_date and m.voice_script is not null and m.video_mp4_b64 is not null
  ) then
    return 'complete';
  end if;
  select d.decrypted_secret into v_token from vault.decrypted_secrets d where d.name = 'github_dispatch_token' limit 1;
  if v_token is null or v_token = '' then return 'no_token'; end if;
  select net.http_post(
    url := 'https://api.github.com/repos/Himanshu1305/Kissansahyog/actions/workflows/morning-post.yml/dispatches',
    headers := jsonb_build_object(
      'Accept', 'application/vnd.github+json',
      'Authorization', 'Bearer ' || v_token,
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'kisan-sahyog-morning-backup',
      'Content-Type', 'application/json'
    ),
    body := '{"ref":"main","inputs":{"check_first":"true"}}'::jsonb,
    timeout_milliseconds := 20000
  ) into v_req;
  return 'dispatched:' || v_req::text;
exception when others then
  return 'error:' || left(sqlerrm, 120);   -- never raise: a failed backup try must not break the cron job; the next try (or tomorrow) runs
end
$fn$;

revoke all on function public.morning_post_backup_kick(boolean) from public, anon, authenticated;

do $mig$
begin
  if exists (select 1 from cron.job where jobname = 'morning-post-backup-1') then perform cron.unschedule('morning-post-backup-1'); end if;
  if exists (select 1 from cron.job where jobname = 'morning-post-backup-2') then perform cron.unschedule('morning-post-backup-2'); end if;
  if exists (select 1 from cron.job where jobname = 'morning-post-backup-3') then perform cron.unschedule('morning-post-backup-3'); end if;
end
$mig$;

-- cron runs in UTC: 23:05 UTC = 04:35 IST, 00:05 UTC = 05:35 IST, 01:05 UTC = 06:35 IST.
select cron.schedule('morning-post-backup-1', '5 23 * * *', $job$ select public.morning_post_backup_kick(); $job$);
select cron.schedule('morning-post-backup-2', '5 0 * * *',  $job$ select public.morning_post_backup_kick(); $job$);
select cron.schedule('morning-post-backup-3', '5 1 * * *',  $job$ select public.morning_post_backup_kick(); $job$);
