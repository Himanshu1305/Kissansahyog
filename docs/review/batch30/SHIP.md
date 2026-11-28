# Batch 30 - ship steps

1. Production SQL editor: paste supabase/migrations/0080_admin_by_email.sql and run. "Success" = done. If it says STOP and names an admin, that admin has no e-mail login; nothing was changed - tell Claude.
2. Code to main:  bash scripts/ship-30.sh
3. Dry run:       bash scripts/ship-prod-30.sh --dry-run --expect-live b437caab-a478-4ff8-895f-4bef2f79bac6
4. Website live:  bash scripts/ship-prod-30.sh --expect-live b437caab-a478-4ff8-895f-4bef2f79bac6
5. Sign in on kissansahyog.com/login with your e-mail and password, open /admin, tab "People".

Undo: website  bash scripts/rollback-prod-30.sh b437caab-a478-4ff8-895f-4bef2f79bac6 ; database  supabase/migrations/rollback/0080_admin_by_email_rollback.sql

Tests: docs/review/batch30/sql-test.mjs ran the migration and its rollback on a scratch database (all checks passed); the unit suite passed (1081 of 1083; the two failures only happen in the builder's copy); the ship scripts were rehearsed against stubs (107 of 107).
