-- ROLLBACK of 0064_app_register_phone.sql (Batch 10E Phase 3A). Removes the phone-only sign-up function.
-- Profiles it already created stay (they are ordinary phone profiles; mobile login keeps working for them).
-- Deploy an app build whose sign-up form no longer calls app_register_phone BEFORE running this.

drop function if exists public.app_register_phone(text, text, text, numeric, numeric, text, boolean, boolean);
