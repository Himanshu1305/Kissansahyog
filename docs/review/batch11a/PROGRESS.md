# Batch 11A — progress

## Precondition — DONE
- `git fetch`; `release-10g` at `d14264f` with `docs/review/batch10g/SHIP.md` and `scripts/ship-prod-10g.sh`.
- `release-11a` created from `d14264f` (no pull). Tracked changes: only the 7 allowed generated files.
- Tag `pre-11a-ship` → `d14264f`, pushed.

## Phase 0 — baseline + spike — DONE
- Build `build:full` (staging): **RAN-PASSED** 268/268 (1 via fallback, the known `/`), localhost gate OK (`evidence/build-baseline.txt`).
- Main chunk `index-B9grCoYa.js` 82,147 B raw / **27,800 B gzip -9** (`evidence/chunk-sizes-baseline.txt`).
- Text snapshot: 268 pages → `evidence/baseline-text/`. Frozen copy of `dist` served on :4211.
- Unit: **RAN-PASSED** 81/81. Full Playwright (one file at a time, frozen copy): **202/203** — only the known
  `phase19` environment failure (`evidence/baseline-e2e/`, `evidence/baseline-failing.txt`).
- Inventory: `evidence/inventory.md` (100 actor functions: 96 plpgsql + 4 SQL, all SECURITY DEFINER).
- **Spike: RAN-PASSED** — header reaches SQL from the staging origin; preflight OK for the app origins too
  (`evidence/spike/`). Throw-away function dropped. → header design.
- `TWOFACTOR_API_KEY` is NOT among the staging secret names (names seen: ANTHROPIC_API_KEY, GEMINI_API_KEY,
  SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL).

## Phase 1 — database (migration 0066, staging) — DONE
- `supabase/migrations/0066_otp_and_sessions.sql` + `rollback/0066_otp_and_sessions_rollback.sql`; applied on
  staging in one query (guard passed), recorded in `schema_migrations`; re-applying is a no-op (catalog hash
  unchanged) (`evidence/apply-0066-staging.txt`).
- Section 7 (catalog-driven): **3 gated** (app_login, app_register_phone, app_signup), **100 guarded** (96 plpgsql + 4
  SQL), allow-listed 1 (app_session_valid). Byte-for-byte check against the independent generator: **103/103
  identical** (`evidence/byte-for-byte-check.md`).
- Catalog test: **RAN-PASSED 9/9** (`evidence/catalog-test.md`); negative proof: fails (exit 1) with a throw-away
  unguarded actor function, passes after dropping it (`evidence/catalog-test-negative.txt`).
- **DB tests through the real RPCs: RAN-PASSED 97/97** (`scripts/batch11a/db-tests.mjs`, `evidence/db-tests.md`).
  Two fix attempts were used on test-side mistakes only (STABLE functions run read-only in PostgREST; the check
  read the wrong session row). Both flags FALSE at the end; 0 KSTEST rows left.
- Advisors: only expected findings (`evidence/advisors-security-11a.txt`).

## Phase 2 — Pages Functions — DONE
- `functions/api/otp/send.js`, `verify.js`, `config.js` + shared `functions/lib/otp-core.js` (no route, no dependency).
- **Unit (mocked provider + DB): RAN-PASSED 18/18** — success, decoy same shape + no SMS, provider down (one call,
  no retry, marked failed), cooldown / too-many / phone_exists, malformed input, 413, 415, origin refusal, not
  configured, DB down, verify matched / wrong / decoy / expired / attempt limit / provider down, config cache,
  test-only override ignored unless ENVIRONMENT=test, no secret / URL / full number in any log line.
- **Over HTTP (`wrangler pages dev` + mock 2Factor + staging DB): RAN-PASSED 29/29** (one harness fix). Server log
  scan: 0 secret-like strings. Evidence: `evidence/functions-tests.md`, `evidence/functions-integration.md`.
- `scripts/set-otp-secrets.sh <staging|prod>` (founder runs it): hidden prompts, names-only output, refuses a key of
  the other project. Full unit suite: 99/99.

## Phase 3 — client — DONE
- `authService.js` (runtime flags, OTP send/verify, tickets, `startPhoneRegister`, `resendOtp`, token storage,
  logout revoke, e-mail `app_issue_session`, start-up `checkSession`), `sessionToken.js` (fetch wrapper),
  `supabaseClient.js`, `AuthProvider.jsx` (+ `sessionEnded`), `App.jsx` (`SessionWatch`), `components/auth/OtpStep.jsx`,
  `Login.jsx` (mobile first), `Signup.jsx` (code step), `errors.js`, 18 strings hi+en (`HINDI_CAPTIONS.md`).
- **E2E `otp-11a` (local stack: wrangler + mock 2Factor + staging DB): RAN-PASSED 15/15** over three runs (test-side
  fixes only: listing card has no title text; 60 s config cache; in-app link; exact label) — evidence
  `phase3-otp-e2e-run1..3.txt`. A clean single full run is repeated in Phase 4 on the final build.
- Main chunk 27,800 → 27,843 B gz (+43). Unit 99/99. Android offline unit O1/O1b/O8a all pass.
- Screens: `evidence/screens/phase3-otp-login-320-hi.png` (looked at: fits 320 px, labelled code box).

## Resumed after interruption — 2026-10-19
- On `release-11a` at `45977f1` (= origin), no stash. Phase 3 was already committed and pushed; only the 7 allowed
  generated files modified (plus the phase3 screenshot, rewritten by the e2e). Phase 0–3 evidence files: all present.
- Staging flags via `get_auth_flags()` (`scripts/batch11a/flags.mjs`): both FALSE at resume (founder had reset `otp_required`).
- Leftovers of the interrupted OTP e2e: stale `wrangler pages dev` stopped, `.dev.vars` deleted, 8 rows of this batch
  removed (`evidence/test-data-after-resume-cleanup.txt`); 58 earlier KSTEST profiles untouched.
- Quick re-checks: `build:full` 268/268 (`build-resume.txt`), unit **99/99**, catalog **9/9**, main chunk 27,843 B gz (unchanged
  hash), OTP e2e **15/15 in one clean run on the final build** (`final-otp-e2e.txt`).

## Phase 4 — verify, staging, ship machinery — DONE
- Reused from the first run (final build, same main chunk): full Playwright 202/203 = baseline (`final-e2e/`), text diff
  (`text-diff.md`: no intended changes; 5 pages hit the pre-existing loading-state race on both builds).
- LCP/CLS (homepage, interleaved frozen baseline :4211 vs final :4212, 2×4 runs): LCP −24 ms, CLS ±0 (`perf/summary.txt`).
- Widths 320/412/768/1280 hi+en for /login and /signup: no horizontal scroll, mobile box first (`widths-final.txt`, `screens/phase4-*`).
- Staging upload (once): deployment `2c67eb33`; live smoke on staging OK (`staging-smoke.txt`). `TWOFACTOR_API_KEY` still not set on staging.
- `scripts/ship-prod-11a.sh`, `scripts/rollback-prod-11a.sh`, `scripts/batch11a/prod-probes.mjs` (live mode tested on staging: 2/2 PASS).
- `PROD_MIGRATION_0066.sql` / `PROD_ROLLBACK_0066.sql`, `SHIP.md`, `REPORT.md`, `BACKLOG.md`, `BATCH11A_CLOSE_PROMPT.md`.
- Secret scan 0 hits (712 files); scope check clean.
