# Batch 11A Phase 2 — OTP Pages Functions tests

## 1. Unit (mocked 2Factor + mocked database, no network) — RAN-PASSED 18/18
`node --test tests/unit/otp-functions.test.mjs`

    ✔ send: success → 200 {ok, challenge, resendAfter:30}; session id stored, never returned (31.443ms)
    ✔ send: a number that may not sign in gets the SAME answer and no SMS (1.2388ms)
    ✔ send: provider down → 503 otp_service_busy, exactly ONE provider call (no credit-burning retry), marked failed (4.0522ms)
    ✔ send: rate limits → 429 with retryAfter; phone_exists → 409; no provider call (1.8546ms)
    ✔ send: malformed input → 400, nothing called (2.4002ms)
    ✔ send: oversized body → 413; wrong content type → 415 (0.7072ms)
    ✔ send: origin refusal (other site, no origin) → 403; our domains and the app origins accepted (2.1617ms)
    ✔ send: not configured (no key / no service key) → 503 otp_unavailable, nothing sent (1.4165ms)
    ✔ send: database down → 503 otp_unavailable, no SMS (0.5589ms)
    ✔ verify: code matched → 200 {ok, ticket}; attempt counted before the provider call (1.18ms)
    ✔ verify: wrong code → 400 otp_wrong with attemptsLeft, no ticket (0.6631ms)
    ✔ verify: decoy (no SMS was sent) → otp_wrong, provider never asked (0.491ms)
    ✔ verify: expired (provider, or our request) → 400 otp_expired (0.9117ms)
    ✔ verify: attempt limit → 429 otp_too_many, provider never asked (0.3753ms)
    ✔ verify: provider down → 503 otp_service_busy, one call, no ticket (0.5034ms)
    ✔ verify: malformed input → 400, nothing called (1.2822ms)
    ✔ config: flags from get_auth_flags, cached 60 s (0.9114ms)
    ✔ TWOFACTOR_BASE_URL is used ONLY when ENVIRONMENT === "test" (0.8439ms)

Every test that can log asserts that no console line contains the API key, the service key, any URL or any
10-digit number (provider failures log e.g. `{"fn":"otp/send","event":"provider_failed","status":500,"cls":"provider_refused","phone2":"**10"}`).

## 2. Over real HTTP — RAN-PASSED 29/29 (`functions-integration.md`)
`wrangler pages dev dist` (functions as on Cloudflare) + `scripts/batch11a/mock-2factor.mjs` + the STAGING database,
started by `scripts/batch11a/local-otp-stack.mjs` (writes the git-ignored `.dev.vars` from `.env` without printing
it, ENVIRONMENT=test, removes it on stop). First run: 14/29 — harness mistake (override base URL lacked `/API/V1`, the
provider answered 404 and the function correctly answered `otp_service_busy`); fixed the harness, second run 29/29.

Server log scan after the run: lines matching `2factor.in|KSTEST-MOCK|eyJ|[0-9]{10}` → **0**.

## 3. Test-only provider override
`TWOFACTOR_BASE_URL` is honoured only when `ENVIRONMENT === 'test'` — unit test "TWOFACTOR_BASE_URL is used ONLY
when ENVIRONMENT === test" (unset / production / preview → the real `https://2factor.in/API/V1` is called).
The real Pages projects do not set ENVIRONMENT=test (only the local `.dev.vars` does).

## 4. scripts/set-otp-secrets.sh
Syntax OK; no argument → usage, exit 2. Hidden `read -s` prompts, value piped to `wrangler pages secret put` (never an
argument). Refuses a JWT service key of the other project or a non-service-role key (checked with fake tokens:
accepted / refused other project / refused anon). Not run against any project — the founder runs it.
