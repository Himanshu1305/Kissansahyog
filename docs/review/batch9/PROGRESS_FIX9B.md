# Batch 9B — progress (resume from here)

Branch `release-9`, start HEAD `1cd9dc8`. Decisions: `DECISIONS_FIX9B.md`. Heartbeat: `HEARTBEAT_FIX9B.log`.

| Phase | Status | Notes |
|---|---|---|
| 0 Preflight | DONE | dirty files are earlier build outputs (not staged); free RAM 1.08 GB → emulator will be skipped |
| 1 Audit + design | DONE | 2A on staging via API (126 listings): hidden enforced server-side; F1 = agri_inputs Shop/Vendor public `contact_phone` |
| 2 Fix B (duplicate post) | DONE | 0061 on staging; local tests 5/5 |
| 3 Fix A (consent) | DONE | 0062 on staging; local tests 6/6 |
| 4 Tests | DONE | + R11 11/11 (2nd run) |
| 5 Staging deploy + live check | DONE | deployment b0b16f72; B2/A1/A2 passed, B1 passed on 2nd try; advisors: nothing new; emulator skipped (low memory) |
| 6 Report + push | DONE | FIX9B_REPORT.md; see log for commit + dry runs |

Log:
- 15:xx Phase 2+3 code + migrations 0061/0062 applied on STAGING (rollback round-trip verified first). Commit 6e5906a.
- Local tests (new build on localhost:4173, staging DB): B1-B5 5/5 RAN-PASSED, A1-A6 6/6 RAN-PASSED, R11 11/11 RAN-PASSED on the second run (first run RAN-FAILED: the test checked the listing page before it had loaded; fixed the wait).
- B4UI on the OLD deployed staging site (before the new deploy): RAN-PASSED.
- ship-prod-9.sh / rollback-prod-9.sh: step 0b (migrations by hand + read-only column check in a real run) added; PROD_AFFECTED_LISTINGS.sql written, not run.
- Phase 5: build:full 263/263, staging guard OK, deployed to Pages project kissansahyog (b0b16f72), live main chunk confirmed.
- Deployed tests: B2, A1, A2 RAN-PASSED; B1 attempt 1 RAN-FAILED (form click timeout, nothing posted), attempt 2 RAN-PASSED.
- Advisors on staging: no new warning from 0061/0062. Clean-up: 42 KSTEST 9B listings + 5 photos + 42 village names deleted; 24 KEEP rows intact.
- Emulator: skipped, low memory (1.77 GB free < 4 GB).
