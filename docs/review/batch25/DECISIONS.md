# Batch 25 - backup starter for the Morning post (plain words)

Problem (24 Nov 2026): GitHub started yesterday's scheduled tries 3-7 hours late and none of today's by 09:00 IST. Nothing in our code was wrong.

Fix: the database starts the workflow itself, like the mandi and weather refreshes already do (migrations 0071, 0072). Migration `0078_morning_post_backup.sql` adds one function and three jobs (04:35, 05:35, 06:35 IST). Each try asks the database whether today's post is complete (voice AND video, the same rule as the workflow's own check). If not, it asks GitHub to start "Morning post" (check_first on, so the workflow can still skip by itself). If complete, it does nothing.

Choices:
- **The token never passes through Claude.** The founder creates it on GitHub (one repository, "Actions: Read and write" only) and stores it in Supabase Vault as `github_dispatch_token`. The migration refuses to run without it.
- **Three tries, one hour apart**, after the four GitHub tries (01:07-04:07 IST). Worst case a post can be late by about two hours instead of never.
- **Never raises:** any error is returned as text ("error: ...", "no_token"), so a bad try cannot break the cron job.
- **Harmless test:** `select public.morning_post_backup_kick(true);` starts the workflow even when the post is complete; the workflow then skips in seconds.
- The token expires (GitHub's maximum is one year): put a reminder in your calendar.

Proof: all behaviours (guard, idempotent re-run, no post, voice only, complete, force, other day's post, no token, public cannot call it, rollback) were run on a real Postgres 16 with stand-ins for cron, net and Vault. Static checks are in `tests/unit/morning-backup-25.test.mjs`. It has NOT been run on staging (staging is restricted) or production.
