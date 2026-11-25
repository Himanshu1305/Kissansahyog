-- Rollback of 0078 (optional, never run by a script). Stops the three backup tries and removes the function. Loses no data.
do $rb$
begin
  if exists (select 1 from cron.job where jobname = 'morning-post-backup-1') then perform cron.unschedule('morning-post-backup-1'); end if;
  if exists (select 1 from cron.job where jobname = 'morning-post-backup-2') then perform cron.unschedule('morning-post-backup-2'); end if;
  if exists (select 1 from cron.job where jobname = 'morning-post-backup-3') then perform cron.unschedule('morning-post-backup-3'); end if;
end
$rb$;
drop function if exists public.morning_post_backup_kick(boolean);
-- The token stays in Vault; delete it by hand if the backup is retired:  delete from vault.secrets where name = 'github_dispatch_token';
-- And revoke the token on GitHub (Settings > Developer settings > Personal access tokens).
