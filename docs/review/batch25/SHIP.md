# Batch 25 - ship (backup starter for the Morning post). Production Supabase only; nothing deploys.
1. On GitHub create a token: Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate. Name `morning-post-backup`, expiry 1 year, Repository access: only `Himanshu1305/Kissansahyog`, Repository permissions: Actions = Read and write. Copy it (shown once).
2. Production SQL editor, paste with YOUR token in place of PASTE_TOKEN, run: `select vault.create_secret('PASTE_TOKEN', 'github_dispatch_token', 'GitHub token for the morning post backup');`
3. Paste all of `supabase/migrations/0078_morning_post_backup.sql`, run. Expect "Success. No rows returned" (or three job ids).
4. Test: `select public.morning_post_backup_kick(true);` expect `dispatched:<number>`; a "Morning post" run appears on GitHub within a minute and ends green with "Skipped: today's post is already complete".
5. Roll back if needed: `supabase/migrations/rollback/0078_morning_post_backup_rollback.sql`, then revoke the token on GitHub.
