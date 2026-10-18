# Batch 10E — progress

## Precondition — DONE
- `release-10d` exists at e81a100; docs/review/batch10d/SHIP.md and scripts/ship-prod-10d.sh exist.
- `prod-10d` tag on origin: **absent** → 10D is not in production; production = 10C deployment 7f5dc56a-9d1c-4bd2-8bde-a4512a96be20.
- Tracked changes: only the allowed generated files (VERIFY_OUTPUT.txt ×5, fix9c COVERAGE_MATRIX.md, public/search-index.json).
- Branch `release-10e` created from release-10d head e81a100. Safety tag `pre-10e-ship` → e81a100, pushed.
- Node v24.19.0, npm 11.17.0.

## Phase 0 — baseline + inventory (no code changes)
- Branch `release-10e`, head `e81a100`. Node v24.19.0, npm 11.17.0.
- `git status --short --untracked-files=no` at the start of Phase 0 shows only the 7 allowed generated files: 5 × `docs/review/batch7*/VERIFY_OUTPUT.txt`, `docs/review/batch9/evidence/fix9c/COVERAGE_MATRIX.md` and `public/search-index.json`.
- **Build: RAN-PASSED.** Command: `check-staging-env && npm run build:full && check-staging-env --dist`. Log: `evidence/build-baseline.txt`.
  - "Prerendered 268/268 (1 via fallback). Failed: 0". The fallback is the known `/ (fallback, no marker)`. Staging guard OK (406 dist files).
  - Main chunk `assets/index-DfikRbEu.js`: **81,931 B raw / 27,758 B gzip -9**. This is the same hash and size as the 10D final staging build. Main CSS `index-1G45bePi.css`: 77,384 B raw / 15,575 B gzip -9.
  - Frozen copy of dist: `C:/Users/usdvi/AppData/Local/Temp/claude/C--Users-usdvi-projects-Kissansahyog/96adcb5e-cc7a-42fe-b6ff-2a5d315c4140/scratchpad/p0/baseline-dist`.
  - B17: all 268 prerendered HTML files contain `localhost:4178`.
- **Text snapshot: RAN-PASSED.** Output: `evidence/baseline-text/`, 268 pages, 36,862 body lines, every page has an h1. Written by the new `scripts/batch10e/prerender-text.mjs`.
  - Diff tool: `scripts/batch10e/prerender-text-diff.mjs`, with the allow-list `scripts/batch10e/prerender-text-allow.json`.
  - Self-diff: "IDENTICAL (static text) … words −0 +0; lines −0 +0; head lines changed 0", exit 0 (`evidence/baseline-text-selfdiff.txt`).
  - Probe against a second build of the same commit (`evidence/baseline-text-probe-vs-10d-build.md`): the prerender is **not deterministic** on about 10 data pages, which can be captured in a loading state. See inventory mismatch 5.
- **Unit tests: RAN-PASSED.** `node --test "tests/unit/*.test.mjs"`: 9/9 (`evidence/baseline-unit.txt`).
- **Full Playwright: NOT-RUN (incomplete).** It ran against `build:full` dist served by the existing preview on 4173.
  - Claude Code killed the run because the system was low on memory, after 21 of 155 tests. The last test (guide-10c F1 hi 412) had been hanging for 15.7 min.
  - Of the 21 tests, 7 passed and 14 failed. All 14 failures are in the 10D failing set (`docs/review/batch10d/evidence/e2e-failed.txt`) or in its baseline. The two that are not in the 10D *after* list are guide-10c F3 hi 360 (B17 console-noise flake: it failed in the 10D baseline and passed after) and F1 hi 412 (the hung test).
  - **No new failures among the tests that ran.**
  - The global teardown did not run with the killed process, so it was run on its own afterwards (staging guard OK): "test data cleaned".
  - `evidence/baseline-failing.txt` holds the 14 observed titles. **The reference failing set for later phases remains the 10D list: 46 titles, 155 tests, 109 passed / 46 failed.**
  - `e2e/home-10d.spec.js`: NOT-RUN, because of the memory pressure. 10D recorded 32/32.
- **Perf: RAN, with HUMAN-REVIEW on the environment.** Method: `scripts/batch10d/perf.mjs`, 5 runs against the frozen baseline-dist on port 4195 (`evidence/perf-baseline.json` / `.txt`).
  - Medians: **LCP 9,620 ms (H1), CLS 0, TBT 0 ms, FCP 9,620 ms**. Max long task 1,413 ms, load 13.9 s, 110 requests, first-visit JS gzip 303,796 B.
  - A 3-run recheck gave LCP and FCP of 8,364 ms (`evidence/perf-baseline-recheck.json`).
  - Auto-play, 3 runs: max long task 87 ms (worst 120), 0 tasks over 300 ms (`evidence/perf-baseline-autoplay.json`).
  - **These numbers are much slower than 10D's (LCP 3,024 ms), even though the build is byte-identical.** The machine is the cause: the 10D baseline dist re-measured now gives LCP 9,512 ms and FCP 8,600 ms, against 7,092 / 2,748 ms in 10D (`evidence/perf-envcheck-10d-baseline-dist.json`). Memory pressure was confirmed later, when processes were killed.
  - **For the budget, compare later builds interleaved with this frozen baseline-dist in the same session, not against absolute numbers.**
- **Inventory: RAN-PASSED.** `evidence/inventory.md`, items (a)–(f) plus B17.
  - STAGING read-only: `evidence/app_register_phone.staging.sql` (verbatim `pg_get_functiondef` plus grants) and `evidence/mandi-coverage.staging.json`.
- [x] Phase 0 (subagent, checked): build 268/268, main 27,758 B gz (= 10D final), unit 9/9, full e2e NOT-RUN (killed for low memory after 21 tests; no new failures among them), perf baseline LCP 9,620 ms / CLS 0 (machine much slower now; see decision 4), text snapshot of 268 pages, inventory written. Phase 2A research done early (decision 6).
