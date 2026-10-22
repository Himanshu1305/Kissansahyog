# Batch 14A — close report
Status: SHIPPED, LIVE, VERIFIED (2026-10-23)

| Item | Value |
|---|---|
| New production deployment | `3c5b9bbf-ec87-4766-9c65-9136affcbd79` |
| Commit | 6702137 (branch release-14a) |
| Tag | `prod-14a` (= `ship-14a`; `pre-14a-ship` untouched) |
| PREV (rollback target) | `871f224c-af45-4ed9-a2e4-219aec7f71cc` (Batch 13A, ee03dd9) |
| URL | https://kissansahyog.com |
| Ship gates | SHIP OK, all read-only gates passed (ship-real.log) |
| Live checks | see evidence/prod-live/RESULT.md: all passed; HUMAN-REVIEW: Hindi wording, `/admin` signed-out redirects to /login |
| Switches at close | otp_required=true, session_enforced=false (unchanged) |

Undo: `bash scripts/rollback-prod-14a.sh 871f224c-af45-4ed9-a2e4-219aec7f71cc`. No database step needed (migration 0067 is additive). `PROD_ROLLBACK_0067.sql` is optional and destroys blocked flags, roles, announcements and the action log.
