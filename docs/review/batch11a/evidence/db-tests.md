# Batch 11A — DB tests of migration 0066 (staging, 2026-10-19T11:24:27.505Z)


## Flags and privileges
- PASS — get_auth_flags (anon) → both false ({"otp_required":false,"session_enforced":false})
- PASS — anon cannot call otp_rate_check
- PASS — anon cannot call otp_issue_ticket
- PASS — anon cannot call require_actor
- PASS — anon cannot read otp_requests (permission denied for table otp_requests)
- PASS — anon cannot read otp_tickets (permission denied for table otp_tickets)
- PASS — anon cannot read app_sessions (permission denied for table app_sessions)
- PASS — anon cannot read auth_private (permission denied for table auth_private)
- PASS — anon cannot call app_issue_session

## Rate limits (otp_rate_check)
- PASS — first send allowed (register, new number)
- PASS — immediate resend → cooldown, retry_after 1–30 s ({"ok":false,"reason":"cooldown","retry_after":30})
- PASS — after 31 s: second send allowed
- PASS — third send in 10 min allowed
- PASS — fourth send in 10 min → too_many ({"ok":false,"reason":"too_many","retry_after":505})
- PASS — after a provider failure the person can retry at once (no cooldown) ({"ok":true,"send":true,"request_id":"5569a315-59b0-46b0-aac4-5b36d9982b59"})
- PASS — 11th send in 24 h → too_many ({"ok":false,"reason":"too_many","retry_after":50400})
- PASS — 21st send from one IP in 1 h (new number) → too_many ({"ok":false,"reason":"too_many","retry_after":2400})
- PASS — another IP is not affected
- PASS — register for a registered number → phone_exists (no row)
- PASS — malformed number → invalid_phone
- PASS — unknown purpose → invalid_purpose

## Login eligibility (same answer, decoy for numbers that may not sign in)
- PASS — login, registered farmer → ok, send true
- PASS — login, unknown number → ok (same shape), send false
- PASS — login, admin number → ok (same shape), send false
- PASS — a decoy can never be verified (no provider session) ({"ok":true,"session":null,"attempts_left":4})
- PASS — a decoy never gets a ticket

## Verify attempts, expiry, ticket
- PASS — verify before the SMS was recorded → expired
- PASS — verify with the wrong phone → invalid
- PASS — verify of an unknown challenge → invalid
- PASS — 5 attempts allowed, provider session handed back (4,3,2,1,0)
- PASS — 6th attempt → too_many
- PASS — expired OTP request → expired
- PASS — expired OTP request gets no ticket
- PASS — verified OTP → ticket issued
- PASS — second ticket for the same OTP → refused
- PASS — only the ticket hash is stored

## app_login_otp
- PASS — ticket for another phone → otp_invalid
- PASS — random ticket → otp_invalid
- PASS — valid ticket → profile + session token
- PASS — session stored as a hash only
- PASS — ticket is single-use (second use → otp_invalid)
- PASS — expired ticket → otp_invalid
- PASS — register ticket cannot sign in
- PASS — valid ticket, unknown number → null (like app_login)
- PASS — valid ticket, admin number → null (admins cannot sign in by phone)
- PASS — malformed number → invalid_phone

## app_register_phone_otp
- PASS — bad ticket → otp_invalid, no profile
- PASS — ticket for another phone → otp_invalid
- PASS — validation runs before the ticket is used (disclaimer) 
- PASS — valid register ticket → profile (auth_provider phone, no email) + session token
- PASS — same number again → phone_exists
- PASS — login ticket cannot register

## otp_required gate on the old phone-only paths
- PASS — otp_required OFF: app_login works as before (profile)
- PASS — otp_required OFF: app_register_phone works as before
- PASS — flags read back: otp_required true
- PASS — otp_required ON: app_login → otp_required
- PASS — otp_required ON: app_register_phone → otp_required
- PASS — otp_required ON: app_signup (old) → otp_required
- PASS — otp_required ON: app_login_otp works

## Session enforcement
- PASS — session_enforced ON but otp_required OFF → not enforced (no token works)
- PASS — enforced: no token → not_authenticated
- PASS — enforced: wrong token → not_authenticated
- PASS — enforced: another user's token → not_authenticated
- PASS — enforced: the right token → works
- PASS — enforced: update_profile with a cloned user id + own token → not_authenticated
- PASS — enforced: close_listing as A with B's token → not_authenticated
- PASS — enforced: delete_my_listing as A with no token → not_authenticated
- PASS — the listing is untouched
- PASS — enforced: SQL-language get_my_listings with the right token → works
- PASS — enforced: get_my_listings without a token → not_authenticated
- PASS — enforced: STABLE function over GET (read-only transaction) with the right token → works
- PASS — enforced: STABLE function over POST (PostgREST runs it read-only too) → works
- PASS — read-only calls leave last_seen_at alone (best effort, no error)
- PASS — a normal (read-write) call refreshes last_seen_at
- PASS — enforced: close_listing by the owner with the right token → works
- PASS — enforced: admin function with a non-admin's own token → not_admin
- PASS — enforced: admin function with the admin's id but a non-admin token → not_authenticated
- PASS — enforced: admin function with the admin's token → works
- PASS — app_session_valid: right token → true
- PASS — app_session_valid: another user's token → false (no error)
- PASS — app_session_valid: no token → false (no error)
- PASS — app_logout_session → true
- PASS — after logout the token is refused → not_authenticated
- PASS — after logout app_session_valid → false
- PASS — expired session → not_authenticated
- PASS — token from app_register_phone_otp works

## E-mail user: app_issue_session
- PASS — e-mail user signs in (Supabase Auth)
- PASS — app_issue_session → session token for the e-mail user
- PASS — enforced: e-mail user acts with the issued token
- PASS — e-mail user's token cannot act as someone else

## Both flags OFF again — everything old works
- PASS — flags read back: both false
- PASS — app_login (no OTP) works again
- PASS — set_language without a token works again
- PASS — update_profile without a token works again
- PASS — get_my_listings without a token works again
- PASS — app_register_phone (no OTP) works again

Cleanup: {"profiles":0,"sessions":0,"tickets":0,"listings":0,"flags":["otp_required=false","session_enforced=false"]}
- PASS — cleanup: no KSTEST profile, session, ticket or listing left; both flags false

**Result: 97 passed, 0 failed**
