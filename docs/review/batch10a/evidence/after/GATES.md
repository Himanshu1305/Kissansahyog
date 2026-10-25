# Batch 10A — G3 gates after A–F (vs BASELINE.md)

| Check | Baseline | After 10A | New failure? |
|---|---|---|---|
| lint | RAN-FAILED (eslint missing) | RAN-FAILED (same) | no |
| staging guard (before + `--dist`) | OK | OK / OK (389 files, no prod refs) | no |
| build:full | exit 0 | exit 0 (232 s) | no |
| static scripts | 26 exit-0 / 11 known fails | first run: 2 new fails (batch2_layout, verify-batch6d) — both the new Browse chip class `max-w-full` (page-width rule). Fixed (class removed); re-run: batch2_layout 1/0, verify-batch6d 18/0. verify-batch7d improved 75/3 → 76/2. All other rows identical | no (after fix) |
| e2e (direct Playwright CLI) | 61 passed / 27 failed | 65 passed / 23 failed | **no** — every failure was already failing at baseline; 4 fixed (phase2 signup tests) |

Logs: `after/` (`*.txt`, `static/summary.tsv`, `e2e-failed.txt`).
