# Batch 11A — report (OTP + session security; STAGING ONLY, both flags OFF)

Branch `release-11a` from `release-10g` `d14264f` (safety tag `pre-11a-ship`). Ship tag `ship-11a` = final head.
The first run was interrupted during Phase 4; it was resumed on 2026-10-19 (see "Interruption" below).

## Requirement walk-through

| Requirement | Status | Evidence / notes |
|---|---|---|
| Precondition (release-10g head, SHIP.md + ship-prod-10g.sh, tag `pre-11a-ship`) | RAN-PASSED | PROGRESS.md |
| Phase 0 baseline: build 268/268, unit 81/81, Playwright 202/203 (known `phase19` env failure) | RAN-PASSED | `evidence/build-baseline.txt`, `baseline-unit.txt`, `baseline-e2e/` |
| Inventory (100 actor functions, sessions, clients, Android base URL, guide OTP) | RAN-PASSED | `evidence/inventory.md` |
| Header spike (`x-ks-session` through CORS to SQL) | RAN-PASSED | `evidence/spike/` → header design, Part B delivered |
| Migration 0066 on staging (tables, flags OFF, functions, rate limits) | RAN-PASSED | `evidence/apply-0066-staging.txt`; re-apply is a no-op |
| Part B guard: 100 functions guarded (96 plpgsql + 4 SQL), 3 gated, 1 allow-listed; byte-for-byte 103/103 | RAN-PASSED | `evidence/byte-for-byte-check.md`, `require-actor-generated.sql` |
| Catalog test (fails on an unguarded actor function) | RAN-PASSED | 9/9 (`catalog-test.md`, re-run at resume `catalog-test-resume.md`); negative proof `catalog-test-negative.txt` |
| DB tests on staging (tickets, rate/attempt limits, flags, enforcement, admin refusal, flags back OFF) | RAN-PASSED | 97/97 `evidence/db-tests.md` |
| Rollback file restores previous bodies, drops new objects | RAN-PASSED (written; not executed on staging) | `supabase/migrations/rollback/0066_otp_and_sessions_rollback.sql`, originals in `ks_fn_backup_0066` + `evidence/fn-originals-staging.sql` |
| Prod-ready copies of 0066 and its rollback | RAN-PASSED | `PROD_MIGRATION_0066.sql`, `PROD_ROLLBACK_0066.sql` (identical to the migration files) |
| Pages Functions send / verify / config (mocked 2Factor) | RAN-PASSED | unit 18/18 `functions-tests.md`; over HTTP 29/29 `functions-integration.md` |
| Test-only provider override ignored unless `ENVIRONMENT=test` | RAN-PASSED | unit test in `tests/unit/otp-functions.test.mjs` |
| No key / URL / full number in logs | RAN-PASSED | log scans in Phase 2 evidence; secret scan below |
| `scripts/set-otp-secrets.sh` (founder runs it) | RAN-PASSED (written; not run) | hidden prompts, names-only output |
| Client: runtime flags, OTP login + sign-up, token header on every data call, logout revoke, e-mail session, forced local sign-out | RAN-PASSED | OTP e2e **15/15 in one clean run on the final build** (`evidence/final-otp-e2e.txt`) |
| Login screen mobile box first; 320/412/768/1280 hi+en no horizontal scroll | RAN-PASSED | `evidence/widths-final.txt`, `evidence/screens/phase4-*.png` (looked at 320 hi) |
| A cloned user id without a token cannot act (`close_listing`, `delete_my_listing`) | RAN-PASSED | OTP e2e (enforcement block) + DB tests |
| Flags OFF = today's behaviour | RAN-PASSED | OTP e2e "flags OFF" tests, DB tests, full Playwright 202/203 unchanged |
| Guide demo `GUIDE_OTP_LIVE` | HUMAN-REVIEW | build-time constant, left `false`; SHIP.md 9c says when to flip |
| Android / Capacitor | HUMAN-REVIEW | absolute `apiUrl()` used; new APK needed before `session_enforced` (DECISIONS 27) |
| Unit tests (final) | RAN-PASSED | 99/99 (`evidence/unit-resume.txt`) |
| Full Playwright vs Phase 0 | RAN-PASSED | 202/203 both; identical failure set (only `phase19`); `otp-11a` skipped without the functions stack (run separately, 15/15) |
| Budgets: main chunk ≤ +2 KB | RAN-PASSED | 27,800 → **27,843 B gzip (+43 B)** |
| Budgets: LCP ≤ +0.2 s, CLS ≤ +0.02 | RAN-PASSED | homepage, 10D slow-phone method, interleaved 2×4 runs: LCP 2,716 → **2,692 ms (−24)**, CLS 0.01059 → 0.01059 (±0) (`evidence/perf/summary.txt`) |
| SEO: prerendered text unchanged except intended | RAN-PASSED | 5 pages differ by a pre-existing loading-state race that the baseline build shows too; intended changes: none (`evidence/text-diff.md`) |
| `check-no-localhost-dist` | RAN-PASSED | in `build:full` (`evidence/build-resume.txt`) |
| Staging upload (tried once) | RAN-PASSED | deployment **`2c67eb33`** → staging.kissansahyog.com; `/api/otp/config` 200 both false, `/api/otp/send` invalid number → 400 (`evidence/staging-deploy.txt`, `staging-smoke.txt`) |
| `ship-prod-11a.sh` / `rollback-prod-11a.sh` (all 10G gates + 0066 probes + OTP gates; 10C–10G accepted as previous) | RAN-PASSED (dry run) | `DRY RUN OK` on the pushed head (`evidence/ship-dryrun-final.txt`); DB probes skipped in the dry run (`KS_SKIP_DB_PROBE=1`, as 10G) — the builder never touches production |
| SHIP.md, BATCH11A_CLOSE_PROMPT.md, BACKLOG.md | RAN-PASSED | written |
| Secret scan (whole diff vs release-10g + new files + evidence) | RAN-PASSED | 712 files, real key values compared and JWT / 2Factor-URL / Supabase-secret patterns: 0 hits (`evidence/secret-scan.txt`) |
| Scope check (`git diff --stat release-10g..`) | RAN-PASSED | only OTP / session files, auth screens, i18n, tests, scripts, migration 0066, batch11a docs; CSP unchanged |
| Hindi wording | HUMAN-REVIEW | `HINDI_CAPTIONS.md` |
| Live 2Factor SMS | NOT-RUN | no key (by rule); founder's step (SHIP.md 2–3) |
| Both flags FALSE on staging at hand-over | RAN-PASSED | `evidence/final-flags.txt` |

`TWOFACTOR_API_KEY` is **not** among the staging Pages secret names (seen: ANTHROPIC_API_KEY, GEMINI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL).

## Interruption (resume)
- Phases 0–3 were committed and pushed by the first run; nothing from Phase 3 was uncommitted (only the allowed generated files were modified).
- The first run had already done part of Phase 4 (final build, chunk sizes, text diff, full Playwright 202/203); those were reused, not repeated.
- It was stopped during the final OTP e2e (3 of 15 tests), which left `otp_required` TRUE on staging (the founder reset it), a running `wrangler pages dev`, the git-ignored `.dev.vars` and 8 test rows. At resume: flags read through the real `get_auth_flags()` → both FALSE; the stale wrangler was stopped, `.dev.vars` deleted; exactly the 8 rows of this batch removed (4 `KSTEST 11A` profiles with 90000 numbers, 1 session, 1 ticket, 2 mock OTP requests). **Earlier batches' KSTEST profiles: 58, untouched.**
- Re-run at resume: `build:full` 268/268, unit 99/99, catalog 9/9, OTP e2e 15/15 (one clean run).
