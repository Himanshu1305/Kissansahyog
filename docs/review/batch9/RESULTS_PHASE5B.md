**Verdict:** 123 tests — 92 RAN-PASSED / 5 RAN-FAILED / 25 NOT-RUN / 1 HUMAN-REVIEW

Source: `docs/review/batch9/results-phase5b.json` · run ? → ? · device — (API —, WebView —)

| ID | Test | Status | Assertion | Evidence |
|---|---|---|---|---|
| 5B.1-P1 | P1 Farmer-Seller, details SHOWN, full kisan profile (SHOWN) — sign up → logout → e-mail login → logout → mobile login → reload → language persists → Profile data → edit persists | **RAN-PASSED** | all 7 steps passed on the staging website | docs/review/batch9/evidence/phase5b/P1/ (10 files) |
| 5B.1-P1-app | P1 same flow in the staging APP (kill/reopen, native WebView) | **NOT-RUN** | — | — |
| 5B.1-P2 | P2 Farmer-Buyer, details SHOWN, kisan profile (different) (SHOWN) — sign up → logout → e-mail login → logout → mobile login → reload → language persists → Profile data → edit persists | **RAN-PASSED** | all 7 steps passed on the staging website | docs/review/batch9/evidence/phase5b/P2/ (9 files) |
| 5B.1-P2-app | P2 same flow in the staging APP (kill/reopen, native WebView) | **NOT-RUN** | — | — |
| 5B.1-P3 | P3 Farmer-Seller, details HIDDEN, minimal profile (HIDDEN) — sign up → logout → e-mail login → logout → mobile login → reload → language persists → Profile data → edit persists | **RAN-PASSED** | all 7 steps passed on the staging website | docs/review/batch9/evidence/phase5b/P3/ (9 files) |
| 5B.1-P3-app | P3 same flow in the staging APP (kill/reopen, native WebView) | **NOT-RUN** | — | — |
| 5B.1-P4 | P4 Farmer-Buyer, details HIDDEN, English, Damoh (HIDDEN) — sign up → logout → e-mail login → logout → mobile login → reload → language persists → Profile data → edit persists | **RAN-PASSED** | all 7 steps passed on the staging website | docs/review/batch9/evidence/phase5b/P4/ (9 files) |
| 5B.1-P4-app | P4 same flow in the staging APP (kill/reopen, native WebView) | **NOT-RUN** | — | — |
| 5B.1-P5 | P5 Vendor/trader-Seller (source vendor), English, details SHOWN, partial profile (SHOWN) — sign up → logout → e-mail login → logout → mobile login → reload → language persists → Profile data → edit persists | **RAN-PASSED** | all 7 steps passed on the staging website | docs/review/batch9/evidence/phase5b/P5/ (9 files) |
| 5B.1-P5-app | P5 same flow in the staging APP (kill/reopen, native WebView) | **NOT-RUN** | — | — |
| 5B.1-P6 | P6 Vendor/trader-Buyer (source vendor), Hindi, details HIDDEN (HIDDEN) — sign up → logout → e-mail login → logout → mobile login → reload → language persists → Profile data → edit persists | **RAN-PASSED** | all 7 steps passed on the staging website | docs/review/batch9/evidence/phase5b/P6/ (9 files) |
| 5B.1-P6-app | P6 same flow in the staging APP (kill/reopen, native WebView) | **NOT-RUN** | — | — |
| 5B.1-P7 | P7 Provider (equipment/warehouse/greenhouse/jugaad offers), Hindi, details SHOWN (SHOWN) — sign up → logout → e-mail login → logout → mobile login → reload → language persists → Profile data → edit persists | **RAN-PASSED** | all 7 steps passed on the staging website | docs/review/batch9/evidence/phase5b/P7/ (9 files) |
| 5B.1-P7-app | P7 same flow in the staging APP (kill/reopen, native WebView) | **NOT-RUN** | — | — |
| 5B.1-P8 | P8 Far-away user (Orchha, Niwari, >100 km), English, details SHOWN (SHOWN) — sign up → logout → e-mail login → logout → mobile login → reload → language persists → Profile data → edit persists | **RAN-PASSED** | all 7 steps passed on the staging website | docs/review/batch9/evidence/phase5b/P8/ (9 files) |
| 5B.1-P8-app | P8 same flow in the staging APP (kill/reopen, native WebView) | **NOT-RUN** | — | — |
| 5B.1-P9 | P9 E-mail edge: mixed-case e-mail, spaces around inputs, long Devanagari+English name, hi/en switch at signup (SHOWN) — sign up → logout → e-mail login → logout → mobile login → reload → language persists → Profile data → edit persists | **RAN-PASSED** | all 7 steps passed on the staging website | docs/review/batch9/evidence/phase5b/P9/ (8 files) |
| 5B.1-P9-app | P9 same flow in the staging APP (kill/reopen, native WebView) | **NOT-RUN** | — | — |
| 5B.3-L01 | equipment × offer × farmer by P7 (+photo via setInputFiles) | **RAN-PASSED** | listing 3cd24b09-0eac-4840-8776-abb353d3e316 | docs/review/batch9/evidence/phase5b/listings/L01-equipment-offer/ (3 files) |
| 5B.3-L02 | equipment × requirement × farmer by P2 | **RAN-PASSED** | listing 424248fa-f587-4239-814d-ba2b9ccb8f48 | docs/review/batch9/evidence/phase5b/listings/L02-equipment-requirement/ (3 files) |
| 5B.3-L03 | labor × offer × farmer by P1 | **RAN-PASSED** | listing 76e13f41-f2eb-4565-998a-5244640329b7 | docs/review/batch9/evidence/phase5b/listings/L03-labor-offer/ (3 files) |
| 5B.3-L04 | labor × requirement × farmer by P2 | **RAN-PASSED** | listing 915e5178-331e-4acf-ad1e-9d06888b56c8 | docs/review/batch9/evidence/phase5b/listings/L04-labor-requirement/ (3 files) |
| 5B.3-L05 | drone_didi × offer × farmer by P1 | **RAN-PASSED** | listing 8f5c1fb1-fdc8-4df9-a3e8-da909ac59263 | docs/review/batch9/evidence/phase5b/listings/L05-drone_didi-offer/ (4 files) |
| 5B.3-L06 | drone_didi × requirement × farmer by P2 | **RAN-PASSED** | listing 0ee85a0d-b623-457f-913a-cbedc7aa7bde | docs/review/batch9/evidence/phase5b/listings/L06-drone_didi-requirement/ (3 files) |
| 5B.3-L07 | bhusa × offer × farmer by P1 (wide) (+photo via setInputFiles) | **RAN-PASSED** | listing 364cf291-9d74-48dd-97e9-c7c18953921b | docs/review/batch9/evidence/phase5b/listings/L07-bhusa-offer/ (3 files) |
| 5B.3-L08 | bhusa × requirement × vendor by P6 | **RAN-PASSED** | listing 087638e1-c335-458f-a820-516a06f454be | docs/review/batch9/evidence/phase5b/listings/L08-bhusa-requirement/ (3 files) |
| 5B.3-L09 | agri_inputs × offer × vendor by P5 (wide) | **RAN-PASSED** | listing 3b8071b1-e3a4-412b-8ac3-3fe8530197ad | docs/review/batch9/evidence/phase5b/listings/L09-agri_inputs-offer/ (3 files) |
| 5B.3-L10 | agri_inputs × requirement × farmer by P4 | **RAN-PASSED** | listing 203a0859-a432-4a2a-ab64-8d954baa13c9 | docs/review/batch9/evidence/phase5b/listings/L10-agri_inputs-requirement/ (3 files) |
| 5B.3-L11 | building_materials × offer × vendor by P5 (+photo via setInputFiles) | **RAN-PASSED** | listing 3338eb8b-2e71-47e9-a6cd-a30367a205f0 | docs/review/batch9/evidence/phase5b/listings/L11-building_materials-offer/ (3 files) |
| 5B.3-L12 | building_materials × requirement × vendor by P6 | **RAN-PASSED** | listing f4ffa4dc-8b72-45c2-96a6-b9fc95ca41f9 | docs/review/batch9/evidence/phase5b/listings/L12-building_materials-requirement/ (3 files) |
| 5B.3-L13 | warehouse × offer × farmer by P7 (+photo via setInputFiles) | **RAN-PASSED** | listing d14c4ac6-a1cc-48e3-9656-4dc9a240864c | docs/review/batch9/evidence/phase5b/listings/L13-warehouse-offer/ (3 files) |
| 5B.3-L14 | warehouse × requirement × farmer by P4 | **RAN-PASSED** | listing 6d551014-1d1a-4736-be14-7be86ef40659 | docs/review/batch9/evidence/phase5b/listings/L14-warehouse-requirement/ (3 files) |
| 5B.3-L15 | greenhouse × offer × vendor by P7 (wide) | **RAN-PASSED** | listing bb28aff9-08b3-4813-a420-772c44649157 | docs/review/batch9/evidence/phase5b/listings/L15-greenhouse-offer/ (3 files) |
| 5B.3-L16 | greenhouse × requirement × farmer by P2 | **RAN-PASSED** | listing 44442f60-abf9-4519-b8ff-26d297d1c072 | docs/review/batch9/evidence/phase5b/listings/L16-greenhouse-requirement/ (3 files) |
| 5B.3-L17 | jugaad × offer × farmer by P7 (+photo via setInputFiles) | **RAN-PASSED** | listing f453ce46-82c3-4c35-9ac7-030c046a30df | docs/review/batch9/evidence/phase5b/listings/L17-jugaad-offer/ (3 files) |
| 5B.3-L18 | jugaad × requirement × farmer by P3 | **RAN-PASSED** | listing d1bc23b1-992b-4617-a7d0-ea06d2a9de6d | docs/review/batch9/evidence/phase5b/listings/L18-jugaad-requirement/ (3 files) |
| 5B.3-L19 | transport × offer × farmer by P3 | **RAN-PASSED** | listing 97af326f-2838-4e87-9fed-497b723eef28 | docs/review/batch9/evidence/phase5b/listings/L19-transport-offer/ (3 files) |
| 5B.3-L20 | transport × requirement × farmer by P8 | **RAN-PASSED** | listing 6dd92f00-be98-435b-8709-906e89af9592 | docs/review/batch9/evidence/phase5b/listings/L20-transport-requirement/ (3 files) |
| 5B.3-L21 | land × offer × farmer by P3 (+photo via setInputFiles) | **RAN-PASSED** | listing 125b9723-e476-4b38-bd85-f82cbf66b958 | docs/review/batch9/evidence/phase5b/listings/L21-land-offer/ (3 files) |
| 5B.3-L22 | land × requirement × farmer by P8 | **RAN-PASSED** | listing 3ac1830c-ad5e-4fac-a333-e6fd63e50096 | docs/review/batch9/evidence/phase5b/listings/L22-land-requirement/ (3 files) |
| 5B.3-L23 | agri_inputs × offer × vendor by P6 — HIDDEN poster + vendor sub-type (contact_phone leak check) | **RAN-PASSED** | listing 2286327f-63b1-4101-b666-293f07c17476 | docs/review/batch9/evidence/phase5b/listings/L23-agri_inputs-offer/ (3 files) |
| 5B.3-L24 | labor × offer × farmer by P8 — SHOWN far-away poster | **RAN-PASSED** | listing 64a21928-58ef-4723-b389-2a547f506b88 | docs/review/batch9/evidence/phase5b/listings/L24-labor-offer/ (3 files) |
| 5B.3-L25 | labor × offer × farmer by P1 — KSTEST noise: used for My Listings close/availability tests | **RAN-PASSED** | listing 8886a32b-562c-4ca5-b4d7-d94c5e61cc52 | docs/review/batch9/evidence/phase5b/listings/L25-labor-offer/ (3 files) |
| 5B.3-edge-E1 | every category×type shows a required-field error on an empty step 2 | **RAN-PASSED** | {"checked":22,"failing":[],"sample":[{"cell":"equipment/offer","error":"कृपया मशीन का प्रकार चुनें।","stayedOnStep2":true},{"cell":"equipment/requirement","error":"कृपया मशीन का प्रकार चुनें।","stayedOnStep2":true},{"cell":"labor/offer","error":"कृषि सहयोगियों की संख्या 1 या उससे अधिक होनी चाहिए।"," | — |
| 5B.3-edge-E7 | photo limit: 4 photos into bhusa (limit 3) | **RAN-PASSED** | {"counter":"3/3 · ज़्यादा से ज़्यादा 3 फोटो (वैकल्पिक)","message":"×"} | — |
| 5B.3-edge-E2 | 3-step form: Back keeps entered data | **RAN-PASSED** | {"step2KeptAfterBack":true,"step1KeepsCategory":true,"step2KeptAfterForward":true,"photosKept":true,"step3VillageKeptAfterBackForward":true} | — |
| 5B.3-edge-E3a | maps link invalid → clear message, nothing posted | **RAN-PASSED** | {"onBlur":"सिर्फ़ Google Maps का सही लिंक डालें।","onSubmit":"सिर्फ़ Google Maps का सही लिंक डालें।","createCalls":0} | — |
| 5B.3-edge-E3b | valid Google Maps short link accepted and stored | **RAN-PASSED** | {"listing":"926651a4-8eb1-4095-b63d-7a20a546c0b4","map_url_stored":"https://maps.app.goo.gl/KSTESTabc123"} | — |
| 5B.3-edge-E5 | double tap on Submit → exactly one listing | **RAN-PASSED** | {"createCalls":1} | — |
| 5B.3-edge-E4 | transport: missing "to" and missing "from" each blocked with a message | **RAN-PASSED** | {"missingTo":"कहाँ तक जाना है, लिखें।","missingFrom":"कहाँ से जाना है, लिखें।","createCalls":0} | — |
| 5B.3-edge-E6 | posting while offline → clear message, no listing created | **RAN-PASSED** | {"message":"कुछ गड़बड़ हुई। कृपया दोबारा कोशिश करें।","stillOnForm":true,"myListingsBefore":1,"myListingsAfter":1,"createAttempts":0,"note":"the message is the generic something-went-wrong text; it does not say there is no internet"} | — |
| 5B.3-edge-E8 | wide-visibility box shown for bhusa, hidden for labor | **RAN-PASSED** | {"bhusa":1,"labor":0} | — |
| 5B.4-V1 | Browse: UI card counts equal the 30/50/100-km rule recomputed from the fetched rows; spot checks | **RAN-PASSED** | {"views":25,"mismatches":[],"spot":{"P2 sees L03 (P1 labor, ~8 km)":"primary","P4 Damoh does NOT see L03 (~73 km, not wide)":"not fetched","P4 Damoh sees L07 (P1 bhusa wide, ~73 km)":"primary-wide","P8 Orchha does NOT see L07 (wide but >100 km)":"not fetched","P8 sees own-area L24? (P8 labor, 0 km)" | — |
| 5B.4-V2 | contact reveal: SHOWN/HIDDEN × logged-in/out/own + leak scan (DOM, network, share text) | **RAN-FAILED** | {"failing":[{"case":"hidden-vendor-agri","expected":"hidden","seen":"hidden","leak":true,"net":["/rest/v1/listings"]}],"rows":[{"case":"shown-loggedin","expected":"number","seen":"number","leak":false},{"case":"hidden-loggedin","expected":"hidden","seen":"hidden","leak":false},{"case":"hidden-vendor | — |
| 5B.4-V3a | view counter call on opening a listing | **RAN-PASSED** | {"view":"increment_listing_view:204"} | — |
| 5B.4-V3b | contact-click counter on first Call/WhatsApp tap | **RAN-PASSED** | {"click":"increment_contact_click:204"} | — |
| 5B.4-V3c | Report: reason required, then success | **RAN-PASSED** | {"noReasonMessage":"Please choose a reason.","sent":true} | — |
| 5B.4-V4a | My Listings shows only the user's own listings | **RAN-PASSED** | {"returned":4,"cards":4,"othersPresent":[],"allP1ListingsPresent":true} | — |
| 5B.4-V4b | availability switch off → listing gone from Browse for others | **RAN-PASSED** | {"inBrowseAfterSwitchOff":false} | — |
| 5B.4-V4c | "Found" closes the listing; others get "not found" on its page | **RAN-PASSED** | {"notFoundShownToP2":true} | — |
| 5B.4-V5 | account switch P1 → P3 leaves nothing of P1 (profile, My Listings, storage) | **RAN-PASSED** | {"p1ProfileIdInStorage":false,"p1EmailInStorage":false,"p1MobileInStorage":false,"p1NameInStorage":false,"p1ListingsInMy":0,"profileName":"P3","localStorageKeys":["ks_last_online_at","ks_visit_count","ks_lang_v1","ks_location_v1","ks_session_v1"]} | — |
| 5B.2-N01 | empty name / invalid e-mail / 7-char password / 9-digit mobile / no village → one message per field, no network call | **RAN-PASSED** | {"messages":["कृपया अपना पूरा नाम भरें।","कृपया सही ईमेल पता भरें।","पासवर्ड कम से कम 8 अक्षर का होना चाहिए।","कृपया सही 10 अंकों का मोबाइल नंबर भरें।","कृपया अपना गाँव या पास का कस्बा चुनें।"],"networkCalls":0} | — |
| 5B.2-N02a | 11-digit mobile: box keeps at most 10 digits (maxLength) | **RAN-PASSED** | {"valueLength":10} | — |
| 5B.2-N02b | non-numeric mobile "98765abcde" refused | **RAN-PASSED** | {"message":"कृपया सही 10 अंकों का मोबाइल नंबर भरें।"} | — |
| 5B.2-N02c | mobile starting with 0 or 1 (not an Indian mobile) — refused? | **RAN-FAILED** | {"startsWith0Refused":false,"startsWith1Refused":false,"note":"isValidPhone accepts any 10 digits (authService.js:30); the screen asks for a \"10-digit mobile number\""} | — |
| 5B.2-N03 | password Show/Hide toggle (signup + login) | **RAN-PASSED** | {"signup":["password","text","password"],"login":["password","text"]} | — |
| 5B.2-N04a | language switch mid-form keeps every field | **RAN-PASSED** | {"kept":true,"placeKept":true} | — |
| 5B.2-N04b | disclaimer not ticked → "Accept and continue" disabled | **RAN-PASSED** | {"disabled":true} | — |
| 5B.2-N04c | Back from step 2 keeps every field | **RAN-PASSED** | {"nameKept":true,"emailKept":true,"mobileKept":true,"passwordKept":true,"placeKept":true,"visibility":"show"} | — |
| 5B.2-N05 | double tap on "Accept and continue" → one sign-up call, one profile | **RAN-PASSED** | {"signupCalls":1,"registerCalls":1,"loggedIn":true} | — |
| 5B.2-N06a | duplicate e-mail → "account with this email already exists", no session | **RAN-PASSED** | {"message":"इस ईमेल से पहले से खाता है। कृपया लॉग इन करें।","session":false} | — |
| 5B.2-N06b | duplicate mobile → "account with this number already exists" next to the mobile box, back on step 1 | **RAN-PASSED** | {"message":"इस नंबर से पहले से खाता है। कृपया लॉग इन करें।","underMobileBox":"इस नंबर से पहले से खाता है। कृपया लॉग इन करें।","session":false} | — |
| 5B.2-N06c | e-mail login of the half-finished registration → "account was not finished" message | **RAN-PASSED** | {"message":"आपका खाता पूरा नहीं बना था। कृपया \"नया खाता बनाएं\" से उसी ईमेल और पासवर्ड के साथ दोबारा भरें।"} | — |
| 5B.2-N06d | same e-mail + password + a new mobile finishes the half-finished registration | **RAN-PASSED** | {"profileCreated":true} | — |
| 5B.2-N07a | correct e-mail + wrong password → "Wrong email or password" | **RAN-PASSED** | {"message":"गलत ईमेल या पासवर्ड।"} | — |
| 5B.2-N07b | unregistered mobile → "No account found for this number" | **RAN-PASSED** | {"message":"इस नंबर से कोई खाता नहीं मिला। कृपया नया खाता बनाएं।"} | — |
| 5B.2-N07c | mobile typed with spaces (" 00000 556NN ") on the sign-in screen | **RAN-FAILED** | not signed in: the box has maxLength=10, which counts spaces, so a number typed or pasted as "98765 43210" is cut to 9 digits and refused ("enter a valid 10-digit mobile"). normalizePhone would strip the spaces, but the box never lets the 10th digit in. src/screens/Login.jsx:90, Signup.jsx:115 | — |
| 5B.2-N07d | upper-case e-mail with spaces signs in | **RAN-PASSED** | {"ok":true,"error":null} | — |
| 5B.2-N08 | offline sign-up → message, no account (neither e-mail nor mobile can sign in afterwards) | **RAN-PASSED** | {"message":"कुछ गड़बड़ हुई। कृपया दोबारा कोशिश करें।","emailLoginAfter":"गलत ईमेल या पासवर्ड।","mobileLoginAfter":"इस नंबर से कोई खाता नहीं मिला। कृपया नया खाता बनाएं।","note":"message is the generic \"something went wrong\", it does not say \"no internet\""} | — |
| 5B.2-N09a | e-mail lockout: 5 wrong passwords, then the RIGHT password is refused for 15 min | **RAN-PASSED** | {"wrongPasswordMessages":["गलत ईमेल या पासवर्ड।","गलत ईमेल या पासवर्ड।","गलत ईमेल या पासवर्ड।","गलत ईमेल या पासवर्ड।","गलत ईमेल या पासवर्ड।"],"sixthWithCorrectPassword":"बहुत बार कोशिश हो चुकी है। कृपया 15 मिनट बाद दोबारा कोशिश करें।","lockedAt":"2026-10-15T06:15:26.648Z"} | — |
| 5B.2-N09b | mobile: 6 tries of an unregistered number → the 6th says "too many attempts" | **RAN-PASSED** | {"messages":["इस नंबर से कोई खाता नहीं मिला। कृपया नया खाता बनाएं।","इस नंबर से कोई खाता नहीं मिला। कृपया नया खाता बनाएं।","इस नंबर से कोई खाता नहीं मिला। कृपया नया खाता बनाएं।","इस नंबर से कोई खाता नहीं मिला। कृपया नया खाता बनाएं।","इस नंबर से कोई खाता नहीं मिला। कृपया नया खाता बनाएं।","बहुत बार को | — |
| 5B.2-N09c | while N5's e-mail is locked, N5 can still sign in with its mobile (lock is per identifier) | **HUMAN-REVIEW** | {"mobileLoginWorks":true} | — |
| 5B.5-F1a | Feedback: empty form refused with a message, nothing sent | **RAN-PASSED** | {"messages":["कृपया अपना ईमेल या मोबाइल नंबर भरें।"],"writes":[]} | — |
| 5B.5-F1b | Feedback: valid KSTEST message → thank-you state, POST /api/feedback 200 | **RAN-PASSED** | {"done":true,"writes":["/api/feedback 200"]} | — |
| 5B.5-F2a | Sawaal: empty question refused with a message, nothing stored | **RAN-PASSED** | {"messages":["कृपया अपना सवाल लिखें।"],"writes":[]} | — |
| 5B.5-F2b | Sawaal: valid KSTEST question → "question received" | **RAN-PASSED** | {"ok":true,"writes":["/rest/v1/kisan_sawaal 201"]} | — |
| 5B.5-F4a | Kisan Mela submit: empty form refused with a message | **RAN-PASSED** | {"messages":["कुछ गड़बड़ हुई। कृपया दोबारा कोशिश करें।","*","*"],"writes":[]} | — |
| 5B.5-F4b | Kisan Mela submit: valid KSTEST event → "sent for review" | **RAN-PASSED** | {"ok":true,"writes":["/rest/v1/kisan_mela 201"],"errors":null} | — |
| 5B.5-F5a | Carbon suggestion: empty text refused | **RAN-PASSED** | {"messages":["कृपया अपना सुझाव लिखें।"],"writes":["/rest/v1/rpc/submit_carbon_suggestion 400"]} | — |
| 5B.5-F5b | Carbon suggestion: valid KSTEST text stored | **RAN-PASSED** | {"writes":["/rest/v1/rpc/submit_carbon_suggestion 204"]} | — |
| 5B.5-F5c | Carbon poll vote | **NOT-RUN** | not run: a vote is one per device and counts in the PUBLIC poll results shown on the page; skipped to keep the staging poll clean (no invalid input exists — a vote is one tap) | — |
| 5B.5-F6a | Daily-update signup: number not starting 6-9 refused ("valid 10-digit mobile") | **RAN-PASSED** | {"refused":true,"writes":[]} | — |
| 5B.5-F6b | Daily-update signup: valid submission | **NOT-RUN** | not run on purpose: this form only accepts numbers starting 6-9, i.e. numbers that can belong to a real person; storing one as a test subscription is unsafe. Note: the registration form accepts 0-leading numbers but this one does not (inconsistent rules). | — |
| 5B.5-F3a | Safalta: empty story refused with a message, nothing stored | **RAN-PASSED** | {"messages":["कृपया अपना पूरा नाम भरें।"],"writes":[]} | — |
| 5B.5-F3b | Safalta: valid KSTEST story (no phone) → "story received" | **RAN-PASSED** | {"ok":true,"writes":["/rest/v1/kisan_safalta 201"]} | — |
| 5B.5-F7a | Change password: new ≠ confirm refused | **RAN-PASSED** | {"messages":["*","*","दोनों पासवर्ड एक जैसे नहीं हैं।"]} | — |
| 5B.5-F7b | Change password works (log in with the new one), then restored | **RAN-PASSED** | {"changed":true,"loginWithNew":true,"restored":true} | — |
| 5B.5-F8 | Kisan Mela "interested" button (logged in) | **RAN-PASSED** | {"writes":["/rest/v1/rpc/set_mela_interest 200"]} | — |
| 5B.7-GATE-P1 | P1 web login: e-mail+password and mobile only | **RAN-PASSED** | {"email":true,"mobile":true,"emailError":null,"mobileError":null} | — |
| 5B.7-APPGATE-P1 | P1 in-app login gate | **NOT-RUN** | no emulator this session (low memory) | — |
| 5B.7-GATE-P2 | P2 web login: e-mail+password and mobile only | **RAN-PASSED** | {"email":true,"mobile":true,"emailError":null,"mobileError":null} | — |
| 5B.7-APPGATE-P2 | P2 in-app login gate | **NOT-RUN** | no emulator this session (low memory) | — |
| 5B.7-GATE-P3 | P3 web login: e-mail+password and mobile only | **RAN-PASSED** | {"email":true,"mobile":true,"emailError":null,"mobileError":null} | — |
| 5B.7-APPGATE-P3 | P3 in-app login gate | **NOT-RUN** | no emulator this session (low memory) | — |
| 5B.7-GATE-P4 | P4 web login: e-mail+password and mobile only | **RAN-PASSED** | {"email":true,"mobile":true,"emailError":null,"mobileError":null} | — |
| 5B.7-APPGATE-P4 | P4 in-app login gate | **NOT-RUN** | no emulator this session (low memory) | — |
| 5B.7-GATE-P5 | P5 web login: e-mail+password and mobile only | **RAN-PASSED** | {"email":true,"mobile":true,"emailError":null,"mobileError":null} | — |
| 5B.7-APPGATE-P5 | P5 in-app login gate | **NOT-RUN** | no emulator this session (low memory) | — |
| 5B.7-GATE-P6 | P6 web login: e-mail+password and mobile only | **RAN-PASSED** | {"email":true,"mobile":true,"emailError":null,"mobileError":null} | — |
| 5B.7-APPGATE-P6 | P6 in-app login gate | **NOT-RUN** | no emulator this session (low memory) | — |
| 5B.7-GATE-P7 | P7 web login: e-mail+password and mobile only | **RAN-PASSED** | {"email":true,"mobile":true,"emailError":null,"mobileError":null} | — |
| 5B.7-APPGATE-P7 | P7 in-app login gate | **NOT-RUN** | no emulator this session (low memory) | — |
| 5B.7-GATE-P8 | P8 web login: e-mail+password and mobile only | **RAN-PASSED** | {"email":true,"mobile":true,"emailError":null,"mobileError":null} | — |
| 5B.7-APPGATE-P8 | P8 in-app login gate | **NOT-RUN** | no emulator this session (low memory) | — |
| 5B.7-GATE-P9 | P9 web login: e-mail+password and mobile only | **RAN-PASSED** | {"email":true,"mobile":true,"emailError":null,"mobileError":null} | — |
| 5B.7-APPGATE-P9 | P9 in-app login gate | **NOT-RUN** | no emulator this session (low memory) | — |
| 5B.3-F-village | Asset village typed on Post step 3 is shown on the listing card / detail page | **RAN-FAILED** | not shown: create_listing stores it in listings.village_name, ListingCard/ListingDetail render village_town \|\| pincode (both empty for new listings) | docs/review/batch9/evidence/phase5b/visibility/ (1 file) |
| 5B.3-F-photohelp | Photo help text matches the per-category limit (warehouse/land/greenhouse = 5) | **RAN-FAILED** | counter says "1/5" but the help says "ज़्यादा से ज़्यादा 3 फोटो" — duplicate key photos_help in strings.js (863 and 894, the later one wins) | docs/review/batch9/evidence/phase5b/listings/L13-warehouse-offer/ (1 file) |
| 5B.3-camera | Real camera / gallery photo picker | **NOT-RUN** | — | — |
| 5B.4-O7 | HIDDEN poster number absent from the APP offline cache (O7 scan) | **NOT-RUN** | — | — |
| 5B.2-K1 | Sign-up with the keyboard open on the lowest field (K1 rules) | **NOT-RUN** | — | — |
| 5B.5-availability-calendar | Equipment availability calendar (set_listing_unavailable) | **NOT-RUN** | — | — |
| 5B.5-delete-account | Profile → Delete account | **NOT-RUN** | — | — |

**Not a plain pass — read these:**

- **5B.1-P1-app NOT-RUN** — no emulator this session (low memory)
- **5B.1-P2-app NOT-RUN** — no emulator this session (low memory)
- **5B.1-P3-app NOT-RUN** — no emulator this session (low memory)
- **5B.1-P4-app NOT-RUN** — no emulator this session (low memory)
- **5B.1-P5-app NOT-RUN** — no emulator this session (low memory)
- **5B.1-P6-app NOT-RUN** — no emulator this session (low memory)
- **5B.1-P7-app NOT-RUN** — no emulator this session (low memory)
- **5B.1-P8-app NOT-RUN** — no emulator this session (low memory)
- **5B.1-P9-app NOT-RUN** — no emulator this session (low memory)
- **5B.4-V2 RAN-FAILED** — {"failing":[{"case":"hidden-vendor-agri","expected":"hidden","seen":"hidden","leak":true,"net":["/rest/v1/listings"]}],"rows":[{"case":"shown-loggedin","expected":"number","seen":"number","leak":false},{"case":"hidden-loggedin","expected":"hidden","seen":"hidden","leak":false},{"case":"hidden-vendor-agri","expected":"hidden","seen":"hidden","leak":true},{"case":"shown-vendor","expected":"number","seen":"number","leak":false},{"case":"hidden-own","expected":"own","seen":"own","leak":false},{"case":"shown-own","expected":"own","seen":"own","leak":false},{"case":"loggedout","expected":"login then same listing","seen":"returned to listing"}]}
- **5B.2-N02c RAN-FAILED** — {"startsWith0Refused":false,"startsWith1Refused":false,"note":"isValidPhone accepts any 10 digits (authService.js:30); the screen asks for a \"10-digit mobile number\""}
- **5B.2-N07c RAN-FAILED** — not signed in: the box has maxLength=10, which counts spaces, so a number typed or pasted as "98765 43210" is cut to 9 digits and refused ("enter a valid 10-digit mobile"). normalizePhone would strip the spaces, but the box never lets the 10th digit in. src/screens/Login.jsx:90, Signup.jsx:115
- **5B.2-N09c HUMAN-REVIEW** — {"mobileLoginWorks":true}
- **5B.5-F5c NOT-RUN** — not run: a vote is one per device and counts in the PUBLIC poll results shown on the page; skipped to keep the staging poll clean (no invalid input exists — a vote is one tap)
- **5B.5-F6b NOT-RUN** — not run on purpose: this form only accepts numbers starting 6-9, i.e. numbers that can belong to a real person; storing one as a test subscription is unsafe. Note: the registration form accepts 0-leading numbers but this one does not (inconsistent rules).
- **5B.7-APPGATE-P1 NOT-RUN** — no emulator this session (low memory)
- **5B.7-APPGATE-P2 NOT-RUN** — no emulator this session (low memory)
- **5B.7-APPGATE-P3 NOT-RUN** — no emulator this session (low memory)
- **5B.7-APPGATE-P4 NOT-RUN** — no emulator this session (low memory)
- **5B.7-APPGATE-P5 NOT-RUN** — no emulator this session (low memory)
- **5B.7-APPGATE-P6 NOT-RUN** — no emulator this session (low memory)
- **5B.7-APPGATE-P7 NOT-RUN** — no emulator this session (low memory)
- **5B.7-APPGATE-P8 NOT-RUN** — no emulator this session (low memory)
- **5B.7-APPGATE-P9 NOT-RUN** — no emulator this session (low memory)
- **5B.3-F-village RAN-FAILED** — src/components/ListingCard.jsx:68, src/screens/ListingDetail.jsx:148, supabase/migrations/0053_building_materials_category.sql:199
- **5B.3-F-photohelp RAN-FAILED** — src/lib/i18n/strings.js:869 vs :894
- **5B.3-camera NOT-RUN** — web used Playwright setInputFiles with a generated JPEG; the real picker needs the phone/emulator
- **5B.4-O7 NOT-RUN** — no emulator this session (low memory); on the web the DOM/network/share scan ran (V2)
- **5B.2-K1 NOT-RUN** — needs the soft keyboard of the app/emulator
- **5B.5-availability-calendar NOT-RUN** — only owners of equipment offers can write it; the only one (L01) is a KEEP listing — left untouched; time
- **5B.5-delete-account NOT-RUN** — never delete data (hard rule)
