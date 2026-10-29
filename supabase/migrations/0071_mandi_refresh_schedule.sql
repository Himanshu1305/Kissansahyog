-- Batch 16E: schedule the mandi-refresh Edge Function (runs in Mumbai, ap-south-1) every 3 hours, in two batches of five crops.
-- No secret value is in this file. The Vault secrets project_url and mandi_cron_secret are created by the founder script
-- (scripts/ship-prod-16e.sh prints the SQL). Re-running this file is safe: the two jobs are replaced, not duplicated.

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;

do $mig$
begin
  if exists (select 1 from cron.job where jobname = 'mandi-refresh-a') then perform cron.unschedule('mandi-refresh-a'); end if;
  if exists (select 1 from cron.job where jobname = 'mandi-refresh-b') then perform cron.unschedule('mandi-refresh-b'); end if;
end
$mig$;

-- Batch a: crops 1-5, at minute 5 of every third hour.
select cron.schedule(
  'mandi-refresh-a',
  '5 */3 * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/mandi-refresh',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-region', 'ap-south-1',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'mandi_cron_secret')
    ),
    body := '{"crops":["Wheat","Soyabean","Gram","Lentil","Moong"],"days":7}'::jsonb,
    timeout_milliseconds := 120000
  );
  $job$
);

-- Batch b: crops 6-10, seven minutes later.
select cron.schedule(
  'mandi-refresh-b',
  '12 */3 * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/mandi-refresh',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-region', 'ap-south-1',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'mandi_cron_secret')
    ),
    body := '{"crops":["Urad","Paddy(Dhan)(Common)","Maize","Mustard","Garlic"],"days":7}'::jsonb,
    timeout_milliseconds := 120000
  );
  $job$
);
