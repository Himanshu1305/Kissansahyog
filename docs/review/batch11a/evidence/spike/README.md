# Phase 0 spike — `x-ks-session` header from the browser to Supabase REST

Question: can the website on `https://staging.kissansahyog.com` send a custom request header to the staging
Supabase REST endpoint without a CORS failure, and can SQL read it with `current_setting('request.headers', true)`?

Method (2026-10-19, staging only, guard passed):
1. Throw-away function `public.kstest_spike_header()` (SECURITY DEFINER, SQL, granted to `anon` only) returning
   `current_setting('request.headers', true)::json->>'x-ks-session'`.
2. Playwright (Pixel 5 profile) opened `https://staging.kissansahyog.com/` and ran `fetch()` in the page to
   `POST /rest/v1/rpc/kstest_spike_header` with headers `apikey`, `authorization`, `content-type` and
   `x-ks-session: KSTEST-spike-token-123` (test file kept as `header-spike-11a.spec.js.txt`).
3. Preflight check with curl for the app origins `https://localhost` and `capacitor://localhost` and the
   staging origin, requesting `x-ks-session` in `Access-Control-Request-Headers`.

Result:
- Browser: `SPIKE RESULT {"status":200,"body":"\"KSTEST-spike-token-123\""}` — 1 passed. **RAN-PASSED.**
- Preflight (all three origins): `HTTP/1.1 200 OK`, `Access-Control-Allow-Origin: *`,
  `access-control-allow-headers: apikey,authorization,content-type,x-ks-session,x-client-info` (the gateway
  echoes the requested headers).
- PostgREST lower-cases header names in `request.headers`, so SQL reads the key `x-ks-session`.
4. The throw-away function was dropped afterwards (`select count(*) from pg_proc where proname like 'kstest_spike%'` → 0).

Decision: Part B uses the header design (one `fetch` wrapper on the client, `require_actor()` reads the header).
