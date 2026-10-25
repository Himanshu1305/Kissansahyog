# Batch 11A — OTP functions over HTTP (wrangler pages dev + mock 2Factor + staging DB, 2026-10-19T11:30:33.979Z)

- PASS — GET /api/otp/config → both flags false, cache 60 s ({"otp_required":false,"session_enforced":false})
- PASS — send (login, registered) → 200 {ok, challenge, resendAfter:30}
- PASS — the mock provider received exactly one SMS request
- PASS — the provider session id is not in the answer
- PASS — resend at once → 429 otp_cooldown with retryAfter
- PASS — no second SMS during the cooldown
- PASS — verify wrong code → 400 otp_wrong, attemptsLeft 4
- PASS — verify with another phone → 400 otp_expired (no detail)
- PASS — verify right code → 200 {ok, ticket}
- PASS — verify the same code again → 400 otp_expired (already used)
- PASS — app_login_otp with the ticket (anon) → profile + session token
- PASS — provider says the code expired → 400 otp_expired
- PASS — 5 wrong tries, then even the right code → 429 otp_too_many (4,3,2,1,0)
- PASS — third send within 10 minutes is the limit; the fourth → 429 otp_too_many ({"error":"otp_cooldown","retryAfter":30})
- PASS — login for an unknown number → the same 200 shape, no SMS (655 ms)
- PASS — …and its code can never be right → otp_wrong
- PASS — register for a registered number → 409 phone_exists
- PASS — register for a new number → 200 and one SMS
- PASS — provider down → 503 otp_service_busy (clean JSON, no retry)
- PASS — after the provider is back the person can try again at once (sends before 4)
- PASS — invalid phone → 400 invalid_phone (JSON)
- PASS — oversized body → 413
- PASS — wrong content type → 415
- PASS — other origin → 403 forbidden_origin
- PASS — code not 6 digits → 400 otp_code_format
- PASS — GET /api/otp/send → 405 JSON
- PASS — app preflight (Origin https://localhost) → 204 with Allow-Origin https://localhost
- PASS — app origin capacitor://localhost accepted (400 for a bad number, not 403)
- PASS — cleanup: no KSTEST profile or ticket left

**Result: 29 passed, 0 failed**
