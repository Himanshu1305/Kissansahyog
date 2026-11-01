# Plan 2 (NOT built): Supabase catch-up

Only if Plan 1 (four early GitHub tries) still misses 05:00 IST.

**Idea:** a Supabase `pg_cron` job runs at 03:30 IST and again at 04:15 IST. It looks in `morning_posts` for today's IST date. Only if the post is missing, it calls GitHub's `workflow_dispatch` API for the "Morning post" workflow, using `pg_net`.

**Secrets needed (exact):**
- A GitHub fine-grained token: this one repository only, permission "Actions: Read and write", 1-year expiry. Stored by the founder in Supabase Vault. Never in chat, never in the repo.
- The repository name and the workflow file name (`morning-post.yml`) - not secret.

**Risks:**
- Token expiry: after one year the catch-up silently stops. Put a reminder in the calendar 11 months ahead.
- Token scope: too wide is dangerous, too narrow gets a 403. Use exactly the scope above.
- A dispatch can still be started late by GitHub, so this reduces but does not remove the delay.
- Extra runs: the workflow's concurrency group stops two running together, and the check step (`check_first`) should be set to true on the dispatch so a finished post is skipped.

No SQL or code is written for this plan.
