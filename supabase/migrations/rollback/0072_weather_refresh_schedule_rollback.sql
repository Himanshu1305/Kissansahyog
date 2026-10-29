-- Rollback for 0072: stop both weather refresh jobs. Stored weather stays. The extensions and Vault secrets are left alone.
do $rb$
begin
  if exists (select 1 from cron.job where jobname = 'weather-refresh-forecast') then perform cron.unschedule('weather-refresh-forecast'); end if;
  if exists (select 1 from cron.job where jobname = 'weather-refresh-season') then perform cron.unschedule('weather-refresh-season'); end if;
end
$rb$;
