# Batch 12B — live verification on https://kissansahyog.com (2026-10-20 ~09:30 IST, read-only)
Deployment `8c6a66f2-ad48-444c-8730-67a072c49e0c` (commit e7432c8). Raw output: run.log, results.json, api-and-markers.txt.

| Check | Status | Note |
|---|---|---|
| 1.1 13 pages x 320/360/412 x Hindi/English: HTTP 200, render, no ErrorBoundary, no 5xx | RAN-PASSED | 78/78 loads. Each also logs one CSP block of the Cloudflare analytics beacon (pre-existing, no header change in this ship) |
| 1.2 /festival/neelkanth.webp and neelkanth-112.webp | RAN-PASSED | 200 image/webp |
| 1.3 Card at 2026-10-20 10:00 IST: Hindi title, 48 px close, height 89.5 px at 360, no h-scroll at 320 | RAN-PASSED | |
| 1.3 Absent on /msp; absent 19 Oct 23:59 and 21 Oct 00:00 IST; close stays hidden after reload | RAN-PASSED | |
| 1.3 Prerendered HTML of / has no festival-card | RAN-PASSED | |
| 1.3 Screenshots 360, 1366, 1920 looked at | RAN-PASSED | card-360.png, card-1366.png, card-1920.png |
| 1.4 Desktop 1366/1920: banner and WhatsApp card start at the hero heading's left edge, inside the hero column | RAN-PASSED | 115 / 392 px |
| 1.4 Mobile 360x640 buttons | RAN-PASSED | y 614.8 / 690.8 (same on previous deployment) |
| 1.5 Ticker height 38, no Latin letters; channel link exact URL with rel="noopener noreferrer" on /, /about, /msp | RAN-PASSED | |
| 1.5 Ticker crop names readable | HUMAN-REVIEW | database column commodity_hi is mis-encoded; same before this ship (see CLOSE_DECISIONS 2) |
| 1.6 /api/otp/config | RAN-PASSED | otp_required=true, session_enforced=false |
| 1.6 /api/otp/send {"phone":"123"} | RAN-PASSED | 400 invalid_phone |
| 1.7 app_login_otp, delete_my_listing, ks-date-badge, app_register_phone, ksg- | RAN-PASSED | all present |
| 1.7 no "localhost" in 10 prerendered pages | RAN-PASSED | |
| Hindi wording of the greeting | HUMAN-REVIEW | HINDI_CAPTIONS.md |
| Android | NOT-RUN | |
