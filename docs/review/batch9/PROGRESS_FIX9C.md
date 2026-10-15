# Batch 9C — progress (resume from here)

Branch `release-9`, start HEAD `46e2d14`. Decisions: `DECISIONS_FIX9C.md`. Heartbeat: `HEARTBEAT_FIX9C.log`.

| Phase | Status | Notes |
|---|---|---|
| 0 Preflight | DONE | 9B finished (FIX9B_REPORT.md, 46e2d14 on origin/release-9). Dirty files = earlier build outputs (same as 9B found), never staged. No details-key whitelist and no triggers on `listings`; `create_listing` only checks `equipment_type_id` and tanker capacity. |
| 1 Design | DONE | DECISIONS_FIX9C.md #5-18 |
| 2 Implement | DONE | catalog table, generic form, card line, detail rows + note, server rule 0063 (staging, rollback round-trip identical), ship/rollback lists |
| 2.5 Static gate | DONE | check-equipment-specs.mjs 837/837; build ok; `npm run lint` broken before this batch (no eslint installed) — substitute check clean |
| 3 Tests | DONE | local build (127.0.0.1:4174) + staging DB: 229/229 RAN-PASSED (C1 68, C2 14, C3 14, C3b 14, C4 1, C5 4, C6 4, C7 2, C8 1, C9 7, C10 10, C11 89, C11UI 1); matrix 68/68 |
| 4 Staging deploy | DONE | deployment b88c7c5a (live chunk matches); deployed tests 136/136; advisors nothing new; cleanup 181 rows; emulator skipped (low memory 1.3 GB) |
| 5 Report + push | DONE | FIX9C_REPORT.md; dry runs: see log |

Log:
- Ship dry run attempt 1 STOPPED by its clean-tree gate (scripts/fix9c/tests.mjs uncommitted); re-run after the commit.
