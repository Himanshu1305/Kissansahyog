-- Batch 16H: schedule the weather-refresh Edge Function (runs in Mumbai, ap-south-1) so the forecast no longer depends on GitHub's scheduler.
--   weather-refresh-forecast : every 2 hours at minute 20 (UTC), up to 60 cells, oldest first, pilot cells always.
--   weather-refresh-season   : every 6 hours at minute 40 (UTC), up to 6 cells whose season rainfall is not yet computed today.
-- No secret value is in this file. It uses the EXISTING Vault secrets project_url and mandi_cron_secret (created for Batch 16E).
-- Re-running this file is safe: the two jobs are replaced, not duplicated.

-- Guard: stop with a clear message if the two Vault secrets are missing.
do $guard$
declare have_project_url boolean := false; have_cron_secret boolean := false;
begin
  if to_regclass('vault.decrypted_secrets') is not null then
    execute 'select exists (select 1 from vault.decrypted_secrets where name = ''project_url'')' into have_project_url;
    execute 'select exists (select 1 from vault.decrypted_secrets where name = ''mandi_cron_secret'')' into have_cron_secret;
  end if;
  if not (have_project_url and have_cron_secret) then
    raise exception 'Batch 16H stopped: the Vault secrets project_url and mandi_cron_secret are missing. They are created by the Batch 16E setup (scripts/ship-prod-16e.sh). Nothing was changed.';
  end if;
end
$guard$;

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $mig$
begin
  if exists (select 1 from cron.job where jobname = 'weather-refresh-forecast') then perform cron.unschedule('weather-refresh-forecast'); end if;
  if exists (select 1 from cron.job where jobname = 'weather-refresh-season') then perform cron.unschedule('weather-refresh-season'); end if;
end
$mig$;

select cron.schedule(
  'weather-refresh-forecast',
  '20 */2 * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/weather-refresh',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-region', 'ap-south-1',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'mandi_cron_secret')
    ),
    body := '{"mode":"forecast","limit":60}'::jsonb,
    timeout_milliseconds := 120000
  );
  $job$
);

select cron.schedule(
  'weather-refresh-season',
  '40 */6 * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/weather-refresh',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-region', 'ap-south-1',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'mandi_cron_secret')
    ),
    body := '{"mode":"season","limit":6}'::jsonb,
    timeout_milliseconds := 120000
  );
  $job$
);
