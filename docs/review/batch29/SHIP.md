# Batch 29 - ship (KVK questions tab)
Order matters: database first, then the code.
1. Production SQL editor (project eltmcznjcqiahqhjvpjg): paste ALL of `supabase/migrations/0079_kvk_questions.sql`, run. Expect "Success. No rows returned".
2. Check: `select slug, status from public.kvk_questions order by sort_order;` expect 4 rows, all `open`.
3. In Git Bash: `bash scripts/ship-29.sh` (runs the tests, pushes to main; the site and the morning job pick it up from main).
4. Open the admin console, tab "KVK" - you should see 4 questions "Answer needed".
Roll back: `supabase/migrations/rollback/0079_kvk_questions_rollback.sql` (drops the table and functions). The morning job keeps working without them.
