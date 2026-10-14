# Batch 9 — decisions taken without the founder

Each entry: what was decided, why, and what the alternative was.

## Phase 0

1. **`pre-9-start` tag at `2bf9aef`** (HEAD at the start of Phase 0, before any Batch 9 commit).
   Why: the rollback point must be the state you accepted after 8B. Alternative: tag after the
   leftover-artefacts commit — rejected, because that commit is Batch 9's own work.

2. **`BATCH9_OVERNIGHT_PROMPT.md` is NOT in the leftover commit; it is committed with the Phase 0
   outputs instead.** Why: it is the instruction file for tonight, not a review artefact; earlier
   prompt files (`BATCH5*_PROMPT.md`, `BATCH6*_PROMPT.md`) are tracked at the repo root, so keeping
   it in git matches that and makes the run resumable from git. It was scanned for secrets first
   (none: no keys, tokens or passwords; only project refs, which are already in the repo).
   Alternative: leave it untracked — rejected, a lost working tree would lose the instructions.

3. **`public/search-index.json` was left out of the leftover commit.** Why: it is build output that
   every `npm run build:full` rewrites (it is "not text/screenshot evidence"). Alternative: commit
   it — rejected, it would mix build output into a "no code" commit. It stays modified in the tree
   as it was before (8B left it the same way).

4. **Baseline tests that write to the staging database were NOT run (NOT-RUN).** These are every
   script that imports `e2e/support.js` (service-role `adminClient`, sign-ups, inserts/deletes),
   `scripts/verify-batch7l2-stageb.mjs` (creates and deletes staging accounts) and the Playwright
   `e2e/` suite (writes temporary records; needs a dev server). Why: the 7L-2 report (note 9) says
   these form-driven tests are out of date and write to staging; running them at night could leave
   half-created rows and their result would not be a meaningful baseline. Phase 5B creates its own
   test accounts through the app instead. Alternative: run them against staging — rejected as
   not the safest option.

5. **`scripts/verify-batch7l1-db.mjs` was NOT run.** Why: it can query the production database
   (it takes `staging` or `prod` as an argument); Hard rule 1 forbids any SQL against prod and the
   staging variant was already proven in 7L-1. Alternative: run only `staging` — not needed for a
   website-code baseline.

6. **Tracked `VERIFY_OUTPUT.txt` files rewritten by the verifiers were copied to
   `docs/review/batch9/evidence/baseline/` and then restored to their committed versions** so the
   working tree stays clean. Alternative: commit them — rejected, they belong to earlier batches.

7. **ESLint is not installed and has no config** (`npm run lint` → "'eslint' is not recognized").
   Recorded as a pre-existing baseline failure; ESLint was not installed tonight (no dependency
   changes outside a phase that asks for them).

8. **Raw emulator logcat files from the Phase 0 smoke are not committed** (`evidence/p0-smoke*/logs/`,
   about 1 MB each). Why: large, full of system/device noise and possibly device identifiers; the
   scan result (0 FATAL EXCEPTION / ANR in for the app) is recorded in PREFLIGHT.md. Alternative:
   commit them — rejected (repo bloat, no extra value).

9. **Emulator was rebooted once in Phase 0** (Hard rule 11): it had been running 2.5 h and its DNS
   was dead ("no working internet"), while the PC itself was online. One cold boot fixed it.
