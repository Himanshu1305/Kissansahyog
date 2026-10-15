# Batch 9C — progress (resume from here)

Branch `release-9`, start HEAD `46e2d14`. Decisions: `DECISIONS_FIX9C.md`. Heartbeat: `HEARTBEAT_FIX9C.log`.

| Phase | Status | Notes |
|---|---|---|
| 0 Preflight | DONE | 9B finished (FIX9B_REPORT.md, 46e2d14 on origin/release-9). Dirty files = earlier build outputs (same as 9B found), never staged. No details-key whitelist and no triggers on `listings`; `create_listing` only checks `equipment_type_id` and tanker capacity. |
| 1 Design | DONE | DECISIONS_FIX9C.md #5-18 |
| 2 Implement | DONE | catalog table, generic form, card line, detail rows + note, server rule 0063 (staging, rollback round-trip identical), ship/rollback lists |
| 2.5 Static gate | DONE | check-equipment-specs.mjs 837/837; build ok; `npm run lint` broken before this batch (no eslint installed) — substitute check clean |
| 3 Tests | TODO | |
| 4 Staging deploy | TODO | |
| 5 Report + push | TODO | |

Log:
