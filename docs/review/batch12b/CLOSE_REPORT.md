# Batch 12B — close report: LIVE and healthy

| Item | Value |
|---|---|
| Status | LIVE, verified |
| New production deployment | `8c6a66f2-ad48-444c-8730-67a072c49e0c` |
| Commit / tags | e7432c8 (branch release-12b), `ship-12b`, `prod-12b` |
| URL | https://kissansahyog.com |
| Previous deployment (rollback target) | `e85e91a0-1674-4726-91e6-1051ebdb47a5` |
| Verified | 2026-10-20 ~09:30 IST |
| Switches at close | otp_required=true, session_enforced=false (unchanged; this ship never touches them) |

Contents: 12A WhatsApp channel card, 12C ticker (max 12 prices, steady speed), 12B Dussehra card (20 Oct 2026 India time only) and home desktop layout fix. Results: `evidence/prod-live/RESULT.md` (all RAN-PASSED except the HUMAN-REVIEW items below).

HUMAN-REVIEW: (1) Hindi greeting wording (HINDI_CAPTIONS.md). (2) Ticker crop names are garbled because production `mandi_prices.commodity_hi` holds mis-encoded text; existed before this ship; needs a database fix (not done here). Android: NOT-RUN.

Undo: `bash scripts/rollback-prod-12b.sh e85e91a0-1674-4726-91e6-1051ebdb47a5` (no database step).
