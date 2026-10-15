# Batch 9 — Report (in progress; Phase 8 completes this file)

## Phase 5 — honest totals

Phase 5 is **DONE-WITH-FAILURES (mostly NOT-RUN)**. During staging full run 1 the PC ran critically
low on memory (about 0.9 GB free of 14.8 GB; Firefox and ChatGPT were using about 2.9 GB) and Claude Code stopped the
test job, with the instruction not to restart it unless the founder asks. The orchestrator
followed that instruction: no emulator suite was restarted this session (see DECISIONS.md, Phase 5).

| Run | RAN-PASSED | RAN-FAILED | NOT-RUN | HUMAN-REVIEW |
|---|---|---|---|---|
| Staging dev run (new S11 only) | 1 | 0 | 0 | 0 |
| Staging run 1 (25 tests) | 3 (S1, S2, S3) | 0 | 22 | 0 |
| Staging run 2 | 0 | 0 | all | 0 |
| Prod run 1 | 0 | 0 | all | 0 |
| Prod run 2 | 0 | 0 | all | 0 |
| Meta-tests (repeatability, negative controls) | 0 | 0 | 4 | 0 |

Every non-pass, one line each:
- Staging run 1, S10 onwards (S10, S4–S8, L1, S11, K1, O1–O8, H1, C1, S9): NOT-RUN — job stopped by Claude Code for low system memory while S10 ran.
- Staging run 2, prod run 1, prod run 2: NOT-RUN — same cause, never started.
- Meta-tests: NOT-RUN — they need the full runs.
- Prod flavour feedback / village lookup / mic: waits for the prod ship (expected). A read-only GET/OPTIONS check showed prod's `/transcribe`, `/geocode`, `/geo` and the `/api/feedback` preflight send no app CORS header yet.

No RAN-FAILED, no HUMAN-REVIEW, no assertion changed. No app code changed (harness only:
new S11 in `scripts/android/staging-tests.mjs`; `scripts/android/meta-tests.mjs` now writes to
`KS_REVIEW_DIR` instead of always batch8b, plus `--skip-full`).

## APKs (debug, rebuilt from release-9; not committed, in `android/ks-apks/`)

| APK | Size (bytes) | sha256 |
|---|---|---|
| ks-production.apk | 11,921,269 | 01e35e5e5112db385de51a97756b43960a39f2d27391ea5922e4bd0b8bb24101 |
| ks-staging.apk | 11,921,793 | 70bef5e8d29266e8b7a488c8af1011bbf92d03c277552c1f6546aeef362d14e5 |
| ks-staging-local.apk | 11,952,283 | d70feb84cf4edc657b4ed61908369f7d2c60cbdcc062b8f6984fa9041758d49c |

The staging guard passed before each build and on `dist/`. The S1 rebuild inside staging run 1
produced a byte-identical staging APK.

## Live staging tests from the staging app (S11; RAN-PASSED once — the second run is NOT-RUN)

- Feedback: the KSTEST feedback form showed the success state; the request carried
  `Origin: https://localhost` and got 200 with `Access-Control-Allow-Origin: https://localhost`.
  Row: `KSTEST 596413` (in `staging-test-data.json`).
- Village: the Post step-3 village box offered 24 known staging villages ("Band" matched Banda, Bandri);
  the typed-village lookup through live `/geocode` returned "Surkhi" with correct CORS — but placed it in
  **Damoh** district instead of the one near Sagar. Finding: a farmer can be given the wrong village of
  the same name (backlog).
- Mic: `/transcribe` answers `configured: true`; the mic button is visible on /search.

Logcat: no FATAL EXCEPTION, ANR, StrictMode or WebView crash. One "has died" line, for
`android.process.acore`, a system process the emulator closed — not our app.

## How to finish Phase 5 (about 2 hours; close Firefox and ChatGPT first)

1. `bash docs/review/batch9/evidence/phase5/suite.sh staging staging-run1 3600`
2. `bash docs/review/batch9/evidence/phase5/suite.sh staging staging-run2 3600`
3. `bash docs/review/batch9/evidence/phase5/suite.sh prod prod-run1 3600`
4. `bash docs/review/batch9/evidence/phase5/suite.sh prod prod-run2 3600`
5. `KS_REVIEW_DIR=batch9/evidence/phase5 node scripts/android/meta-tests.mjs --flavor staging --skip-full --exit1 <rc of step 1> --exit2 <rc of step 2>`
6. The same with `--flavor prod` and the exit codes of steps 3 and 4.
