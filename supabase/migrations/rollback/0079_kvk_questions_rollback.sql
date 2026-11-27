-- Rollback of 0079_kvk_questions.sql (Batch 29). Removes the KVK questions table and its functions. The morning post then uses only the repo data.
-- WARNING: this deletes every KVK answer entered in the admin tab. Copy them out first if you want to keep them.
drop function if exists public.morning_kvk_answers();
drop function if exists public.admin_kvk_reopen(uuid, uuid);
drop function if exists public.admin_kvk_answer(uuid, uuid, jsonb, text, date, date);
drop function if exists public.admin_kvk_list(uuid);
drop function if exists public.ks_kvk_clean(text, jsonb, text, date, date);
drop table if exists public.kvk_questions;
