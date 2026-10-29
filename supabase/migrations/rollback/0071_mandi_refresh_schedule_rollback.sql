-- Rollback for 0071: stop both mandi refresh jobs. Stored prices stay. The extensions and Vault secrets are left alone.
do $rb$
begin
  if exists (select 1 from cron.job where jobname = 'mandi-refresh-a') then perform cron.unschedule('mandi-refresh-a'); end if;
  if exists (select 1 from cron.job where jobname = 'mandi-refresh-b') then perform cron.unschedule('mandi-refresh-b'); end if;
end
$rb$;
