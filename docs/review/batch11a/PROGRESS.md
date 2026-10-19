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
