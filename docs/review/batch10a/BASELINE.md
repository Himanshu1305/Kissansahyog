# Batch 10A — baseline (clean `release-10a` = `ee3ecfd`, before any 10A change)

Evidence: `docs/review/batch10a/evidence/baseline/`. Later gates mean **no NEW failure versus this table**.

## Build and tooling

| Check | Status | Detail |
|---|---|---|
| `npm run lint` | RAN-FAILED (pre-existing) | `'eslint' is not recognized` — ESLint not installed, no config (same as batch9) |
| staging guard `check-staging-env.mjs` | RAN-PASSED | OK with `.env`; with a prod `VITE_SUPABASE_URL` in the environment → `REFUSED`, exit 1 (`guard.txt`) |
| `npm run build:full` (staging) | RAN-PASSED | exit 0 in 240 s, 263 routes prerendered (`build-full.txt`) |
| `npm run test:e2e` | RAN-FAILED (pre-existing, tooling) | the npm script runs `node node_modules/.bin/playwright`, which on Windows is a shell shim → `SyntaxError` before any test. Equivalent direct call used instead: `node --env-file=.env node_modules/@playwright/test/cli.js test` (see E2E below) |

## Static check scripts (`scripts/run-static-checks-10a.sh`, `static/summary.tsv`, logs in `static/logs/`)

Exit 0 (RAN-PASSED, 26): batch2_fasal, batch2_layout, batch4_bazaar, batch4_qa_facts, p_0028_location_naming,
p_community, p_mandi_labeling, p_mela_dedup, p_mela_digest, p_mela_format, p_mela_pipeline, p_mela_rearch,
p_rain_alert, phase8, v11_phase2, v2_phase14, v2_seo_audit, verify-batch5a, 6a, 6b, 6c, 6d, 6g, 7c,
check-equipment-specs.

Exit 1 (RAN-FAILED, pre-existing, 11): batch3_style (1 fail), batch4_ui_style (2), batch4_voice (crash,
module resolution), v11_phase6 (3), v2_brand (1), v2_citation_audit (crash, Windows ESM path),
verify-batch7a (2), verify-batch7b (2), verify-batch7d (3), verify-batch7l1 (1), verify-batch7l2 (1).

Note: several verify scripts rewrite `docs/review/batch7*/VERIFY_OUTPUT.txt`; those leftovers are never staged.

## E2E (Playwright, against staging, from an untouched worktree at `pre-10a-start`)

**61 passed, 27 failed** in 10.1 min (`e2e.txt`; failed list `e2e-failed.txt`). All 27 failures are on untouched
`ee3ecfd` code — the specs are out of date (7L-2 report note 9: the one-page signup, 3-step post, header changes).
Failing: batch1 (5: browse chip viewport ×2, logged-out equipment call, land offer, labor requirement), batch5a (3),
phase11 (1), phase14 (1), phase16 (1), phase18 (1), phase19 (1), phase2 (6, signup/login), phase3 (2), phase4 (1),
phase5 (1), phase6 (2), phase7 (1), phase9 (1). Gate for later runs: no test that passed here may fail.

## Specs that touch Signup / Post / Browse

Grep for `disclaimer-accept`, `visibility-show`, `post-source-`, `equipment-tag-filters`, `/signup`, `/post`:
- e2e: `support.js` (shared signup helper), batch1, batch5a, phase2, phase3, phase7, phase9, phase10_downstream,
  phase14_village_geocoding, phase15_land_acreage, phase16_legal_availability.
- harness scripts: `scripts/fix9b/tests.mjs`, `scripts/fix9c/tests.mjs`, `scripts/phase5b/{lib,listings,listing-edges,negatives,personas}.mjs`,
  `scripts/phase5c/{display,network}.mjs`, `scripts/verify-batch5a.mjs`, `scripts/verify-batch7l2.mjs`,
  `scripts/verify-batch7l2-stageb.mjs`, `scripts/shots-batch7l2.mjs`, `scripts/test/batch4_wide_visibility.mjs`,
  `scripts/test/p_0025_visibility.mjs`, `scripts/android/staging-tests.mjs`.
