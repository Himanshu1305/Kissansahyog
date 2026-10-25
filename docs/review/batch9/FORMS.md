# Batch 9 Phase 5B.5 — every data-writing form (staging WEBSITE only)

Found by grepping `src/` for writes (`.rpc(` / `.insert(` / `/api/feedback`). Each user-facing form got one
invalid and one valid KSTEST submission on https://staging.kissansahyog.com (phone viewport), where safe.
App side: **NOT-RUN** (no emulator this session, low memory). Script `scripts/phase5b/forms.mjs`; evidence
`evidence/phase5b/forms/`; rows created are in `staging-test-data.json` (phase "Phase 5B", keep:false).

| Form (route / component) | Writes | Invalid case | Valid case | Evidence |
|---|---|---|---|---|
| Feedback & grievance (`/grievance`, `Grievance.jsx`) — Pages Function on the live staging site | `POST /api/feedback` → `submit_feedback` (may e-mail the TEAM via Resend if the key is set) | RAN-PASSED: empty → "कृपया अपना ईमेल या मोबाइल नंबर भरें।", nothing sent | RAN-PASSED: KSTEST message → thank-you state, `/api/feedback 200` | `F1-*` |
| Kisan Sawaal — ask a question (`/sawaal`) | `kisan_sawaal` insert | RAN-PASSED: "कृपया अपना सवाल लिखें।" | RAN-PASSED: 201, "आपका सवाल मिल गया…" | `F2-*` |
| Safalta — share a story (`/safalta`) | `kisan_safalta` insert | RAN-PASSED: "कृपया अपना पूरा नाम भरें।" | RAN-PASSED: 201, "आपकी कहानी मिल गई…" (no contact phone given). Note: the first scripted attempt checked too early; a second run confirmed — there may be 2 KSTEST story rows | `F3-*` |
| Kisan Mela submit (`/kisan-mela/submit`) | `kisan_mela` insert (for review) | RAN-PASSED but weak: empty form → only the generic "कुछ गड़बड़ हुई। कृपया दोबारा कोशिश करें।" (the `mela_name_required` code has no message) — finding | RAN-PASSED: 201, "धन्यवाद! आपकी जानकारी…" | `F4-*` |
| Carbon credit suggestion (`/carbon-credit`, `CarbonSuggestions.jsx`) | `submit_carbon_suggestion` | RAN-PASSED: "कृपया अपना सुझाव लिखें।" (server 400) | RAN-PASSED: 204 | `F5-*` |
| Carbon poll vote (`CarbonPoll.jsx`) | `vote_carbon_poll` | — (one tap, no invalid input) | NOT-RUN: one vote per device that shows in the PUBLIC results; left alone | — |
| Daily update signup (`/mausam`, `/msp`: `DailyUpdateSignup`) | `subscribe_alert` | RAN-PASSED: `0000055690` refused ("सही 10-अंकों का मोबाइल नंबर डालें") | NOT-RUN on purpose: this form only accepts numbers starting 6–9 (could be a real person's). Note the inconsistency: registration accepts any 10 digits | `F6-*` |
| Change password (`/profile`, e-mail accounts) — throw-away N1 | Supabase Auth `updateUser` | RAN-PASSED: new ≠ confirm → "दोनों पासवर्ड एक जैसे नहीं हैं।" | RAN-PASSED: changed, signed in with the new one, changed back (N1 verified on the shared password afterwards) | `F7-*` |
| Kisan Mela "interested" (`/kisan-mela`, logged in) | `set_mela_interest` | — | RAN-PASSED: 200 | `F8-*` |
| Report / complaint (`ReportButton`, listing page) | `submit_listing_report` | RAN-PASSED: "Please choose a reason." | RAN-PASSED: "your complaint was received" (5B.4 V3c) | `visibility/V3-*` |
| Registration, sign-in, Profile किसान fields, Post | see ACCOUNT_MATRIX / LISTING_MATRIX | 5B.2 N01–N09, E1–E8 | 5B.1, 5B.3 | — |
| Profile → basic info Save | `update_profile` | — | RAN-FAILED (known B8): needs a pincode, one-form accounts have none | `P1/10-profile-basic-save-B8.jpg` |
| Equipment availability calendar (`AvailabilityCalendar`) | `set_listing_unavailable` | — | NOT-RUN: only the owner of an equipment offer can write it; the only one is KEEP listing L01, left untouched | — |
| Language toggle | `set_language` | — | RAN-PASSED in 5B.1 (persists after the next login, all 9 personas) | `P*/07-*` |
| Profile → Delete account | `delete_account` | — | NOT-RUN: never delete data | — |
| WhatsApp join / search-miss / view & contact counters / weather cache | background logging (`log_join_click`, `log_search_miss`, `increment_*`, `weather_grid_requests`) | — | counters RAN-PASSED in 5B.4 V3a/V3b; the rest are not forms | — |
