-- Rollback for 0070 (optional, never run by a script): removes the morning post functions and tables, and with them every saved
-- post. The website hides /admin/morning data by itself (the page shows an error state) and the scheduled job just fails.
drop function if exists public.morning_post_set_poll_result(uuid, date, int);
drop function if exists public.morning_post_mark_posted(uuid, date, boolean);
drop function if exists public.morning_post_history(uuid, int);
drop function if exists public.morning_post_get(uuid, date);
drop function if exists public.morning_post_context(text, date);
drop function if exists public.morning_post_upsert(text, date, text, text, text, text, text);
drop function if exists public.morning_post_secret_ok(text);
drop table if exists public.morning_post_secret;
drop table if exists public.morning_posts;
