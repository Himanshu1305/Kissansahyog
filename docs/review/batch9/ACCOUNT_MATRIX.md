# Batch 9 Phase 5B — ACCOUNT MATRIX (expected behaviour, written from the code BEFORE testing)

Written 2026-10-15 (resume session, no emulator). Part A is the EXPECTED behaviour, read from the code
listed below, written before any test ran. Part B (at the end) is filled in after the web runs: observed
results, web-vs-app differences and findings.

**Where this ran:** the deployed STAGING WEBSITE https://staging.kissansahyog.com (deployment `ce06082e`,
source `534581b`, main chunk `index-B9eiHYmW.js`) in headless Chromium with a phone viewport (412×915,
isMobile, hasTouch). It runs the same `src/screens/Signup.jsx`, `Login.jsx`, `Post.jsx` … code as the
staging app, against the same STAGING Supabase project. Guard: the served JS was downloaded and contains
only `wzxtqbqlahyahsnoqqva.supabase.co` (9×) and the prod ref `eltmcznjcqiahqhjvpjg` 0× —
`evidence/phase5b/staging-ref-guard.txt`. **No emulator this session (low memory)** — every in-app item is
NOT-RUN with that reason (see `DECISIONS.md`, "Orchestrator (resume session) — low memory").

Code read: `src/screens/Signup.jsx`, `Login.jsx`, `Post.jsx`, `Profile.jsx`, `MyListings.jsx`,
`ListingDetail.jsx`, `Browse.jsx`, `src/components/ContactActions.jsx`, `ListingCard.jsx`,
`ReportButton.jsx`, `LanguageToggle.jsx`, `location/PlaceField.jsx`, `categories/*.jsx`,
`src/lib/auth/authService.js`, `AuthProvider.jsx`, `src/lib/listings/{registry.jsx,catalog.js,listingsApi.js}`,
`src/lib/distance.js`, `src/lib/location/LocationProvider.jsx`, and the SQL they call:
`supabase/migrations/0059_login_rules.sql` (app_login, app_login_email, app_login_email_guard, lockout),
`0060_one_registration.sql` (app_register, accept_listing_consents, get_listing_contact),
`0054_consents.sql` (create_listing_with_location), `0053_building_materials_category.sql` (latest
create_listing), `0031_scope_private_contact_to_land.sql`, `0011_p3_profile.sql` (update_profile,
delete_account), `0046_view_counter.sql`, `0032_…` (increment_contact_click).

## A1. Can any SMS or e-mail go out? — No (from code)

- There is no OTP: `PHONE_OTP_ENABLED = false` (`authService.js:139`); `startPhoneLogin` calls the
  `app_login` RPC only. Nothing in `src/`, `functions/` or `supabase/` calls `signInWithOtp`, `verifyOtp`,
  `resetPasswordForEmail`, `auth.resend` or any SMS provider (grep: only a comment in `authService.js:12`).
  There is no "forgot password" (backlog B7). → **No SMS can be sent.**
- E-mail sign-up uses `supabaseAuth.auth.signUp`. The code comment says e-mail confirmation is OFF
  (autoconfirm) on the projects; if it were ON, Supabase would send a confirmation mail. Behavioural check
  in the runs: the `/auth/v1/signup` response must carry a session (autoconfirm ⇒ no mail). All persona
  addresses are `@example.com` (reserved by RFC 2606, undeliverable) as a second safety net.
- The only server mail is `functions/api/feedback.js` → Resend, to the TEAM inbox (never to the user),
  and only when `RESEND_API_KEY` is set on the Pages project. One KSTEST feedback at most is sent in 5B.5.

## A2. Registration (Signup.jsx → authService.register → Supabase Auth signUp + app_register RPC)

One form, step 1 + step 2 (disclaimer). No seller/buyer account type.

| Field | Required | Client rule | Server rule (app_register) |
|---|---|---|---|
| Full name | yes | `trim()` non-empty → `err_name_required` | `name_required`; stored trimmed |
| E-mail | yes | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` on the trimmed value → `err_invalid_email`; sent trimmed (case kept) to Supabase Auth | profile e-mail = `lower(trim(auth.email()))` |
| Password | yes | length ≥ **8** (`MIN_PASSWORD`) → `err_password_short`. Not trimmed. Show/Hide toggle (`password-toggle`) | Supabase Auth's own minimum |
| Mobile | yes | **any 10 digits after removing non-digits** (`isValidPhone`) → `err_invalid_phone`. No rule on the first digit (0/1/2… accepted). `maxLength=10` on the box | `^[0-9]{10}$` after removing whitespace; `phone_exists` if already used |
| Village/town | yes | must be PICKED from the places list (PlaceField) → `err_place_required` | stored as `village_town` + the town's lat/lng |
| Language | – | hi/en select, switches the UI immediately, saved as `preferred_language` | hi/en, else hi |
| Show my details / Keep hidden | – | "Show" pre-selected; "Keep hidden" shows a warning line | `consents.details_visibility.choice` = show/hidden |
| किसान profile | optional | land acres, main crops, lease interest, equipment interest, WhatsApp opt-in, preferred mandi | written AFTER the account by `update_kisan_profile`; failure never blocks signup |
| Disclaimer (step 2) | yes | button disabled until ticked; `err_disclaimer_not_accepted` | `disclaimer_not_accepted` |

Expected outcomes:
- Success → session stored in `localStorage.ks_session_v1`, navigate to `next` (default `/home`).
- Duplicate e-mail → `err_email_exists` (if the password also matches an unfinished registration, the
  registration is completed instead — "half-way" recovery).
- Duplicate mobile → `phone_exists` → "An account with this number already exists" under the mobile box,
  back to step 1. **The Supabase Auth user for the e-mail stays created** (half-finished registration;
  the same e-mail + password can finish it later with another number).
- Double tap on "Accept and continue": the button is replaced by a spinner while busy → one account.
- Back (top-left) on step 2 → step 1 with every field kept (same component state).
- Offline submit → network error → generic `err_unknown`/network text, step 1, nothing created (or at most
  the Auth user if the network dies between the two calls).

## A3. Sign-in (Login.jsx)

- **E-mail + password**: `app_login_email_guard(email,false)` (lock check) → Supabase Auth password check →
  `app_login_email` (profile; records success). Wrong password → `err_wrong_password` ("Wrong email or
  password") and one failure counted. E-mail is trimmed; Supabase Auth treats e-mail case-insensitively.
- **Mobile only** (no OTP): `app_login(phone)` → profile, or NO profile for an unknown number/admin →
  `err_not_found`. Any user who registered with the one form (e-mail + mobile) can ALSO sign in with the
  mobile alone (the profile has a phone).
- **Lockout (0059)**: per identifier (normalised number or lower-cased e-mail): 5 failures since the last
  success, all within 15 min, the newest < 15 min old → `too_many_attempts` → "Too many attempts. Please try
  again after 15 minutes." The 6th attempt is refused even with the right password/number. Anyone can lock
  anyone (backlog B6). Tested ONLY on a throw-away account.
- After login the UI language becomes the profile's `preferred_language`.
- Session = localStorage → survives reload; "Log out" (on /home) removes it and signs out of Supabase Auth.

## A4. Language persistence
Header toggle (हिं/EN) → localStorage + `set_language` RPC for a logged-in user → after log-out/log-in the
profile language is applied (`Login.finish`).

## A5. Profile (Profile.jsx)
- Shows name, e-mail (read-only; for e-mail accounts the MOBILE IS NOT SHOWN), village/town, **pincode
  (required)**, language; listing counts; किसान profile (editable, saved by `update_kisan_profile`); change
  password; delete account.
- **Expected defect (known, backlog B8):** "Save changes" needs a valid 6-digit pincode that exists in
  `pincodes`; accounts from the one-form registration have none → saving a name change fails until a
  pincode is typed, and `update_profile` then REPLACES the registered town coordinates with the pincode's.
  So "edit one field persists" is tested on the किसान profile (main crops), which has no such rule.
- There is **no way to change "Show my details / Keep hidden" after registration** (no control in Profile).

## A6. Listings (Post.jsx, 3 steps; registry: 11 enabled categories)

`ENABLED_CATEGORIES` = equipment, labor, drone_didi, bhusa, agri_inputs, building_materials, warehouse,
greenhouse, jugaad, transport, land. **Every category offers both types** (step 1 shows "offer" and
"requirement" for all; no category restricts the type). Source toggle farmer/vendor on step 2 (default
farmer). 11 × 2 = 22 category×type cells.

| Category | Offer required (client `validate`) | Requirement required | Photos (limit) | Extra declaration | Wide-visibility checkbox |
|---|---|---|---|---|---|
| equipment | equipment type; rate (non-tanker); tanker: capacity litres | equipment type | 3 | **provider** (offer) | no |
| labor | worker count > 0; from ≤ to | same | 3 | – | no |
| drone_didi | operator, drone type, ≥1 service, rate/acre, village | crop, acreage, service, village | 3 | – | no |
| bhusa | residue, quantity, pickup, buyer type, price | same | 3 | – (+ bhusa disclaimer) | **yes** |
| agri_inputs | farmer: input type, item, qty, price, address; vendor: business, ≥1 type, items, shop address | same | 3 | – | **yes** |
| building_materials | type, qty, unit, **rate (offer)**, delivery, pickup location | same minus rate | 3 | – (+ disclaimer) | **yes** |
| warehouse | type, capacity, rate, address | crop, qty quintals, duration | 5 | **provider** (offer) | **yes** |
| greenhouse | vendor subtype | structure, area | 5 | **provider** (offer) | **yes** |
| jugaad | offer type, name, what it does, price (unless WIP), **≥1 photo** | name | 3 | **provider** + "not a road vehicle" (offer) | no |
| transport | vehicle type, rate basis; step 3 **from + to** (replace the village box) | same | 3 | – | no |
| land | acres ≥ 0.1, price type (offer); optional contact mobile 10 digits | acres | 5 | **ownership** self-declaration (offer) | no |

Step 3 (all): asset village (≥ 2 chars) or transport from/to; "use current location" (device fix → the
listing's coordinates); optional Google-Maps link (must be https maps.app.goo.gl / goo.gl/maps /
google.com/maps / maps.google.com, else `maps_link_invalid` on blur and on submit); the poster's mobile is
shown ("buyers call this number"); 4-item consent checklist; submit disabled until checklist (+ declaration)
ticked. Back keeps data (state lives in Post; re-picking the SAME category does not reset details).
Double tap on submit: button replaced by spinner while busy → one listing. Offline submit → error notice,
nothing created. Server re-checks every required field, the provider declaration (`provider_declared`),
wide only for the 5 eligible categories, rules agreed.

## A7. Who sees what (Browse = `fetchNearby` + `partitionByRadius`, `distance.js`)

- Centre = the viewer's location object: device fix if the browser has permission, else the saved/typed
  place, else (logged-in) the profile's town coordinates. Distance is from the centre to the LISTING's
  own coordinates.
- ≤ 30 km → shown. 30–50 km → shown in a labelled "fallback" section ONLY when nothing is within 30 km.
  Wide (eligible category + flag) → shown out to 100 km with a "📍 wide" badge. Beyond that → not in Browse.
- The listing detail page `/listing/<id>` opens for ANYONE with the link regardless of distance (no radius
  check; RLS only requires the listing to be active).
- **The radius is applied in the browser.** `fetchNearby` reads `listings` with `select *` inside a 50/100 km
  box; the table is readable by anon, so the rule is a display rule, not a privacy boundary. Listing rows
  carry `user_id` (owner profile id), coordinates and `details` — never the profile name/number, EXCEPT:
  - **agri_inputs vendor sub-type keeps `details.contact_phone` PUBLIC** (pre-filled from the poster's
    profile mobile, `agri_inputs.jsx:59/108`, by design since 0031). Expected consequence: a poster who
    chose **Keep hidden** and posts an agri_inputs vendor listing has their mobile in the public row
    (network response) even though the contact reveal refuses — **to be verified (5B.4)**.

## A8. Contact reveal (ContactActions + get_listing_contact)

| Poster choice | Viewer | Expected |
|---|---|---|
| SHOWN | logged in, not owner | Call/WhatsApp buttons → sheet with disclaimer → "Name · number", tel: and wa.me links; contact-click counter +1 |
| HIDDEN | logged in, not owner | buttons still shown → sheet → error "This person has chosen to keep their details hidden…" (`contact_hidden`); no number anywhere; counter still +1 |
| any | logged out | buttons → `/login?next=/listing/<id>`; after login back on the same listing |
| any | owner | no Call/WhatsApp buttons on own listing |
| SHOWN/HIDDEN | anyone | Share button text = `generateListingMessage` (no phone) |

Land offers may carry a private per-listing contact mobile (`listing_private_contact`); for a HIDDEN owner
the reveal refuses anyway.

## A9. My Listings / counters / report
- `/my` lists only the user's own listings (`get_my_listings(p_actor_id)`), active/expired/closed badges.
  Actions: offer listings → availability switch (unavailable = hidden from Browse); every active listing →
  "Found ✓" (close, with a confirm dialog) → status closed → gone from Browse and the detail page.
- View counter: `increment_listing_view` once per device per listing per 24 h when the detail page opens.
- Contact click: `increment_contact_click` on the first Call/WhatsApp tap and on Share (not by the owner).
- Report: "शिकायत करें" → reason required (`err_report_reason_required`) → success text.

## A10. Trust model note (from code, not exploited)
`create_listing`, `close_listing`, `update_profile`, `update_kisan_profile`, `set_language`,
`delete_account` and the admin functions trust the `p_actor_id` the browser sends (granted to anon), and
every listing row exposes its owner's `user_id`. Backlog B1 covers the admin functions; the same pattern
applies to the user functions (e.g. `delete_account(p_actor_id)` deletes a profile and its listings).
Not exercised tonight (no direct RPC writes, never delete data); recorded as a finding.

## A11. Test data rules used

- Names `KSTEST-KEEP P<n> …` (KEEP personas), `KSTEST …` (throw-away noise). E-mails `@example.com`.
- **Mobile pattern:** KEEP personas `00000555NN` (NN = 01…09), throw-away accounts `00000556NN`.
  Why: `isValidPhone` and `app_register` accept ANY 10 digits, so a leading `0` passes. An Indian mobile
  number never starts with 0 (it is the trunk prefix, and `00` is the international prefix), so
  `00000555NN` cannot be a real subscriber, and it cannot collide with the existing KSTEST numbers, which
  all start with 8 or 9 (`batch8b/staging-test-data.json`, `batch9/staging-test-data.json`). The values are
  kept only in `C:\Users\usdvi\ks-test-accounts\TEST_ACCOUNTS.md` (outside the repo).
- One shared test password (≥ 8 chars, generated once, stored only in that outside folder; scripts read it
  from the file, never print it; screenshots mask password, e-mail and mobile boxes).
- Listing marker: the asset village text `KSTEST-KEEP L<nn> <town>` (shown on every card and detail).

---
## Part B — observed (filled in after the runs)

Run 2026-10-15 ~10:35–12:30 IST, staging website only. Full table: `RESULTS_PHASE5B.md` (generated by
`scripts/android/report.mjs` from `results-phase5b.json`): **123 tests — 92 RAN-PASSED / 5 RAN-FAILED /
25 NOT-RUN / 1 HUMAN-REVIEW.** Evidence: `evidence/phase5b/` (state.json holds ids only).

### B1. Personas (5B.1) — 9/9 created through the website sign-up form, every step RAN-PASSED
P1–P9 as specified (roles, towns, languages, SHOWN/HIDDEN, किसान profile mixes) — index in
`TEST_ACCOUNTS_INDEX.md`; logins only in `C:\Users\usdvi\ks-test-accounts\TEST_ACCOUNTS.md`.
For each: sign up → /home → log out → e-mail+password → log out → mobile only → reload keeps the session →
language switched on the header toggle is the language after the next mobile login (then restored) →
Profile shows name, lower-cased e-mail, town, language and every किसान field as entered → main crops edited,
saved, still there after reload and after log-out/log-in. **No SMS / e-mail:** every `/auth/v1/signup`
answered 200 WITH a session (autoconfirm ⇒ Supabase sent no confirmation mail); no OTP code exists.
P9 edge: name/e-mail with spaces, mixed-case e-mail, language hi→en during the form — stored trimmed,
e-mail lower-cased; login with the e-mail UPPER-CASED + spaces works.
Observed vs expected: as predicted, except — the Profile page never shows the MOBILE for these (e-mail)
accounts (predicted in A5; a farmer cannot see which number buyers will call) and the basic-info Save needs
a pincode (B8, confirmed on P1). P9's town is stored in Hindi ("रहली") because it was picked while the form
was in Hindi — the stored label follows the UI language at pick time.

### B2. Final login gate (5B.7, run last, after all negative/lockout tests)
Web: **9/9 personas RAN-PASSED both ways** (e-mail+password and mobile only, same profile id).
App: **NOT-RUN** (no emulator). The lockout tests (throw-away N5 and an unregistered number) did not
touch any persona.

### B3. Visibility (5B.4 V1) — matches A7 exactly
25 Browse views (P2 Sagar, P4 Damoh, P6 Garhakota, P8 Orchha, logged-out at Sagar × labor, bhusa,
agri_inputs, land, transport): in every view the number of cards in the main grid and in the fallback
section equals the 30 / 30–50 (only when nothing ≤ 30) / wide ≤ 100 km rule recomputed independently from
the rows the page fetched. Spot checks: P2 sees P1's labor (8 km); P4 in Damoh does not (73 km) but sees P1's
WIDE bhusa (73 km, badge) and P5's wide agri (71 km); P8 in Orchha sees none of the Sagar listings (wide or
not) but sees its own area; the 30–50 km ring appeared for P4 (bhusa L08 at 31 km, labelled section) only
because nothing was within 30 km. Logged-out visitor = same as logged-in at the same place.
Not a privacy boundary (A7): any row in the box is in the network answer.

### B4. Contact reveal (5B.4 V2)
| Poster | Viewer | Expected | Seen |
|---|---|---|---|
| P1 SHOWN (L03) | P2 logged in | number | name · number, tel: + wa.me links |
| P5 SHOWN vendor (L09) | P4 logged in | number | number |
| P3 HIDDEN (L21 land) | P2 logged in | hidden | "इस व्यक्ति ने अपनी जानकारी छिपाकर रखी है…"; number not in DOM, network or share text |
| **P6 HIDDEN vendor agri-inputs (L23)** | P2 logged in | hidden, no number anywhere | sheet says hidden, BUT the owner's mobile is in the `/rest/v1/listings` answer (`details.contact_phone`, pre-filled from the profile) → **RAN-FAILED (leak)**. The same row is readable logged-out (anon) and by every Browse within 100 km (agri is wide-eligible). |
| P3 / P1 (own) | owner | no buttons | no buttons |
| any | logged out | login, then back | `/login?next=/listing/<id>` → back on the same listing. First attempt: the mobile sign-in spinner was still turning after 20 s; two re-runs passed in ~5 s (flake noted) |
My Listings (V4): only own listings (P1: 4/4); availability switch off → gone from Browse for P2; "Found" → closed, P2 gets "not found" on its page. Account switch on one browser (V5): P1 → P3 leaves no P1 id/name/e-mail/mobile in storage, P3's Profile and My Listings only. (Note: `ks_location_v1`, the last device place, stays on the device across accounts.) Counters (V3): view +1 (204), contact click +1 (204); Report needs a reason, then "complaint received".

### B5. Negative cases (5B.2) — throw-away accounts only
Passed: all-field errors at once without any network call; 11 digits cut to 10; non-numeric refused;
Show/Hide toggle; language switch and Back keep every field; disclaimer unticked = button disabled;
double tap → 1 sign-up + 1 profile; duplicate e-mail → "already exists"; duplicate mobile → message under the
mobile box, Auth user left half-finished (B7) → e-mail login says "account was not finished" → same
e-mail+password+new mobile finishes it; wrong password; unregistered mobile; upper-case e-mail + spaces;
offline sign-up → message and nothing created (generic "something went wrong" text).
**Lockout observed (dedicated N5):** 5 wrong passwords each say "गलत ईमेल या पासवर्ड।"; the 6th try WITH
THE RIGHT PASSWORD → "बहुत बार कोशिश हो चुकी है। कृपया 15 मिनट बाद दोबारा कोशिश करें।". Mobile: 6 tries of an
unregistered number → the 6th says the same. While N5's e-mail was locked, N5 could still sign in with its
mobile (lock is per identifier) — HUMAN-REVIEW (by design per 0059, but it means the e-mail lock does not
lock the account).
Failed: **mobile starting with 0 or 1 accepted** (`isValidPhone` = any 10 digits; the screen asks for a
mobile number) and **a mobile typed with a space cannot be entered** (maxLength 10 counts the space).

### B6. Web vs app differences
Everything above ran on the website. Not verified in the app tonight: kill-and-reopen, the native photo
picker/camera, the app's offline cache (O7 scan for the HIDDEN number), the soft keyboard on the lowest
field (K1), back-button behaviour. Same code and database, so the logic results (rules, leaks, messages)
carry over; the device-only behaviours do not.

### B7. Findings, ranked by harm to a real farmer
1. **HIDDEN number leaks for agri-inputs "Shop / Vendor" listings** (RAN-FAILED, V2): a person who chose
   "Keep hidden" and posts an agri-inputs vendor listing has their mobile pre-filled into the public
   `details.contact_phone` and readable by anyone (logged out too), up to 100 km away. The screen promised
   "they will NOT see them". `src/components/categories/agri_inputs.jsx:59,108`, `0031_…sql`.
   Evidence `evidence/phase5b/visibility/V2-hidden-vendor-agri.jpg` + `state.json` v2.
2. **User RPCs trust the caller's `p_actor_id`** (from code, not exploited): `delete_account`,
   `update_profile`, `close_listing`, `create_listing` accept any profile id from anyone; listing rows expose
   `user_id`. Extends backlog B1 beyond admin functions. (A10.)
3. **Asset village never shown** to buyers on the card or detail page (only km distance) — RAN-FAILED.
4. **Profile never shows the farmer's own mobile** and basic-info Save needs a pincode (B8); no way to
   change "Show / Keep hidden" after registration.
5. **Mobile with a space cannot be typed**; **0/1-leading numbers accepted** at registration (while the
   daily-update form requires 6–9).
6. Generic "कुछ गड़बड़ हुई" when offline (sign-up and post) and for an empty Kisan Mela form — the farmer is
   not told what to fix.
7. Photo help says "max 3" where the limit is 5 (duplicate `photos_help` key).
8. One mobile sign-in spinner hung > 20 s once (two re-runs fine).
