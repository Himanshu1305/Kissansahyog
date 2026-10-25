# Batch 14A — production live verification (read-only), 2026-10-23
Site https://kissansahyog.com, deployment 3c5b9bbf-ec87-4766-9c65-9136affcbd79, main chunk index-Da6OQhZC.js (matches ship log).
Script: live-check.mjs; raw: live-check.json, api-checks.txt.

| Check | Status |
|---|---|
| 12 pages x 320/360/412 px x hi/en (72 loads): HTTP 200, not blank, no ErrorBoundary, no horizontal scroll | RAN-PASSED |
| Console errors | Only one, on `/` and `/browse`: Cloudflare analytics beacon blocked by our own CSP (already in KNOWN_ISSUES, harmless) |
| `/admin` signed out | Redirects to `/login` (no admin screen, nothing leaked). The "Access denied" screen was not seen; this is existing routing, not a break. HUMAN-REVIEW |
| `get_active_announcements` RPC | RAN-PASSED: HTTP 200, `[]` |
| Prerendered `/`: announcement-card / festival-card / localhost | RAN-PASSED: 0 / 0 / 0 |
| Home: both big buttons, ticker with prices (23 ₹ signs, duplicated loop), WhatsApp channel link, footer `· भारत` | RAN-PASSED |
| `/browse` two sections (help-browse, browse-cats, browse-type present) | RAN-PASSED |
| `GET /api/admin/sms-balance` no session / fake 40-char session | RAN-PASSED: 401 `session_required` both |
| `/api/otp/config` | RAN-PASSED: otp_required=true, session_enforced=false |
| `POST /api/otp/send {"phone":"123"}` | RAN-PASSED: 400 `invalid_phone` (a request without the site Origin header gets 403 forbidden_origin, as designed) |
| Hindi wording of the new admin and card text | HUMAN-REVIEW (HINDI_CAPTIONS.md) |

No rollback needed. No database writes, logins, OTP sends or switch changes were made.
