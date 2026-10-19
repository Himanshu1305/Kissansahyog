# Production live check — Batch 11A (https://kissansahyog.com, read-only, 2026-10-20)

| Check | Status | What was seen |
|---|---|---|
| 1.1 Pages `/ /browse /signup /login /post /my /admin /msp /msp/wheat /mausam /guide /guide/post /kisan-mela /yojana` at 320/360/412 px, Hindi and English (88 loads, incl. 1280 px on 4 pages) | RAN-PASSED | all 200, no ErrorBoundary text, no horizontal scroll, no uncaught page errors, no failed or 5xx requests to our site or Supabase (`pages.json`) |
| 1.1 One public listing `8659a116…` | RAN-PASSED | 200 at 320/360/412, no errors |
| 1.2 Main chunk | RAN-PASSED | live HTML serves `/assets/index-kXKG8WUQ.js` = chunk in the ship log |
| 1.2 `GET /api/otp/config` | RAN-PASSED | `{"otp_required":true,"session_enforced":false}` (otp_required was turned ON by the founder after the ship) |
| 1.2 `POST /api/otp/send` `{"phone":"123"}` | RAN-PASSED | 400 `invalid_phone`, no SMS |
| 1.2 Markers `app_login_otp`, `delete_my_listing`, `ks-date-badge`, `app_register_phone`, `ksg-` | RAN-PASSED | found in live chunks (ship gates; `app_register_phone` in the main chunk re-fetched) |
| 1.2 No `localhost` / `127.0.0.1` in live HTML | RAN-PASSED | 0 hits on `/ /msp /guide /kisan-mela /sawaal /yojana /about /privacy /terms /cold-storage /mausam` |
| 1.3 Login screen | RAN-PASSED | mobile box above e-mail box at 320/360/412; button reads "कोड भेजें" (flag ON); not pressed; no horizontal scroll |
| 1.4 10G | RAN-PASSED | public listing shows only call / WhatsApp / share / report, no seller or admin buttons; random uuid shows "यह लिस्टिंग नहीं मिली।" |
| 1.4 10F | RAN-PASSED | homepage hero "मुझे कुछ चाहिए" / "मेरे पास कुछ है"; `/msp` renders (badge chunk marker in ship gates) |
| 1.4 10E | RAN-PASSED | sign-up form asks name, mobile, village only (not submitted) |
| 1.4 10C | RAN-PASSED | `/guide` hub renders (intro card and demo cards) |
| 1.5 Sitemap / robots | RAN-PASSED | `/sitemap.xml` index lists 4 child sitemaps, each 200; `/robots.txt` sha256 identical to `prod-before.json` |
| 1.6 Screenshots looked at (home 320 hi and 360 en, login 320, signup 320, msp 320, guide 360, listing 360) | RAN-PASSED with one note | no overlap, clipped Hindi or sideways scroll. **HUMAN-REVIEW:** the mandi ticker strip on the home page shows garbled glyphs mid-scroll in the 320 and 360 screenshots (headless capture of a moving strip; the ship gate read correct ticker text) |
| 1.7 OTP sign-in / sign-up / session enforcement on production | NOT-RUN (by rule) | staging evidence: `final-otp-e2e.txt`, `db-tests.md`, `functions-integration.md`. Any production OTP test the founder did is HUMAN-REVIEW |
| Mandi backfill seen live | NOT-VERIFIED | needs a database read; not allowed |
