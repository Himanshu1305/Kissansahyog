# Batch 11A — backlog (not in this batch)

1. **Sign out everywhere + device list.** `app_sessions` already stores `device` (user agent, 120 chars) and `last_seen_at`; a "my devices" screen and a revoke-all RPC are missing.
2. **Session expiry tuning.** Today: 30 days fixed, at most 20 live sessions per user, no sliding renewal. Decide on sliding expiry once real usage is known.
3. **Account recovery for phone-only users who lose their number** (no e-mail on file). Needs a manual admin flow with identity checks.
4. **Add an e-mail to a phone-only account** (and a phone to an e-mail account), each proved by its own code.
5. **OTP by voice call** as a resend option (2Factor supports VOICE); useful for feature phones and poor SMS delivery.
6. **2Factor balance / low-credit alert** (daily check, mail to the founder) so OTP never fails silently.
7. **WhatsApp OTP** as an alternative channel.
8. **CAPTCHA / Turnstile on `/api/otp/send`** if abuse appears (today: per-phone, per-IP and cooldown limits plus decoys).
9. **Admin sign-in hardening** (admins cannot sign in by phone; e-mail admins could get a second factor).
10. **Actor-based functions not converted:** none. All 100 (96 plpgsql + 4 SQL) are guarded; only `app_session_valid` is allow-listed (reason in DECISIONS.md 8). The catalog test fails if a new unguarded one appears.
11. **Prerender "ready" marker race:** 5 pages (agro-forestry, articles, info, safalta, videos) are sometimes captured in their loading state, on the Phase 0 build as well (`evidence/text-diff.md`). Pre-existing; fix the marker in the prerender.
12. **`GUIDE_OTP_LIVE`** is a build-time constant; making the guide demo follow the runtime switch needs the demo built lazily (SHIP.md 9c).
13. **New Android APK** with 11A (OTP screens + session token) must be built and published before `session_enforced` is turned ON in production.
14. **Old verifier `scripts/verify-batch7l2.mjs`** pins pre-OTP source text (4 FAILs by design, DECISIONS.md 28); retire or update it.
