# Batch 11A — catalog test (staging)

catalog test: 9 passed, 0 failed

- PASS — every actor-based function is guarded or allow-listed (102 actor functions)
- PASS — allow-listed functions are not guarded (they must answer, not raise)
- PASS — guarded count (100 guarded: 96 plpgsql + 4 sql)
- PASS — allow-list file == ks_require_actor_allow table
- PASS — otp_required gate is the first statement of app_login, app_register_phone, app_signup
- PASS — new tables exist (app_sessions, auth_private, ks_fn_backup_0066, ks_require_actor_allow, otp_requests, otp_tickets)
- PASS — new tables: RLS on, no policies, no anon/authenticated privileges
- PASS — execute grants of the new functions (anon / authenticated / service_role)
- PASS — every new SECURITY DEFINER function pins search_path = public, pg_temp
