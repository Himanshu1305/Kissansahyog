# Kisan Sahyog — MVP Master Build Prompt

DO NOT ask for approval at any step. Auto-accept all actions. Work through every phase below in order without stopping for confirmation between phases.

**Repo:** https://github.com/Himanshu1305/Kissansahyog (already created, empty)
**Push to GitHub after completing each phase** — but only AFTER that phase's test checklist passes (see "Testing discipline" below). Use the provided PAT for authentication.

## Testing discipline (applies to every phase — non-negotiable)

Each phase below ends with a **Test checklist**. Before committing and pushing a phase:

1. **Run every item in that phase's test checklist.** Each checklist includes positive cases (expected valid input), negative cases (invalid/rejected input), and edge cases (boundary conditions).
2. **If anything fails, fix it and re-run the full checklist for that phase** before moving on — not just the item that failed, since a fix can break something adjacent.
3. **Run a regression check**: re-verify the test checklists from ALL previous phases still pass, not just the current phase's. This matters most whenever a phase touches shared code (the `details` JSONB shape, the distance-filtering logic, the auth service module, any shared UI component reused across Land/Equipment/Labor) — a change made for Equipment can silently break Land if they share a component.
4. **Only commit and push once the current phase's checklist AND all prior regression checks pass.**
5. If a failure cannot be resolved after reasonable effort, do not silently skip it — commit what works, and clearly flag the unresolved issue in the commit message and in a running `KNOWN_ISSUES.md` file at repo root, with enough detail (steps to reproduce, suspected cause) that it can be picked up later.

This means the build will take longer per phase than just writing the code — that is intentional. A phase is not "done" until its checklist passes, not when the code compiles.

---

## Context

You are building the MVP of **Kisan Sahyog** (किसान सहयोग), a listings-and-matching web platform for farmers, landowners, equipment owners, and laborers. Pilot region: Sagar, Madhya Pradesh, India — architected to expand to other regions/states/countries later without a rebuild. Domain: kissansahyog.com.

**Core model:** Users post Offers ("I have land/equipment/labor available") or Requirements ("I need land/equipment/labor"). The platform shows nearby matches (within 30km) and lets users connect by direct phone call. The platform is NOT involved in any transaction, payment, or agreement between users — it is purely an information-sharing and discovery layer. Disclaimers appear at every relevant touchpoint, not buried in a ToS page.

Founder identity is anonymous — use "Team Kisan Sahyog" voice throughout in any user-facing copy, consistent with the founder's other products.

**Audience note (drives every UI decision):** Users span a wide range of digital literacy, many using low-end Android phones over patchy rural network. Every screen must be understandable to someone who has never used an app before. Prefer dropdowns, icons, and large tap targets over free text and dense forms.

---

## Credentials & environment

The following will be provided as environment variables — read them from `.env` (create `.env.example` with the same keys, blank, committed to the repo; the real `.env` must be gitignored):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Do not request or use the Supabase DB password directly — all database work goes through the Supabase client library (anon key for app-level reads/writes under RLS, service role key only for seed scripts run outside the client app, e.g. seeding crops/equipment_types/pincode data).

GitHub PAT will be available in the environment for push access — confirm you can authenticate and push before starting Phase 1; if push fails, stop and report the exact error rather than continuing with local-only commits.

---

## MVP auth approach (important — read carefully)

**Phone OTP is explicitly OUT of scope for this MVP build** — it requires an SMS provider account (Twilio/MSG91/etc.) that has not yet been set up, and is planned as a Phase 2 addition after MVP validation.

**For this MVP, use phone-number-only login with no OTP verification:**
- Signup: user enters full name, phone number, village/town, pincode, preferred language. No password, no OTP, no email anywhere.
- Login: returning user enters their phone number; if it matches an existing profile, they're logged in directly (no verification step). Use a simple session mechanism (e.g., store user id in local storage / a lightweight custom session) rather than Supabase's phone-auth OTP flow, since that flow assumes SMS delivery is configured.
- **Design the data model and auth service layer so that swapping in real Supabase Phone OTP auth later is a contained change** — isolate the "how do we identify/verify this user" logic behind a single auth service module, not scattered across components. Add a code comment at the top of that module flagging it as the Phase 2 swap point.
- This is a trust-based MVP shortcut, consistent with the rest of the platform's low-friction, non-verified design (see self-declaration checkbox for land, no police verification, etc.) — do not add extra friction here that isn't in the spec.

---

## Tech stack

- React + Vite + Tailwind CSS
- Supabase (Postgres) for data — using the already-created Supabase project (credentials above)
- Cloudflare Pages for eventual hosting (do not attempt deployment in this prompt — local dev + GitHub push only; deployment is a separate follow-up step once the founder connects Cloudflare Pages to the repo)
- PWA from day one (installable, manifest.json, service worker for basic offline shell). Use a self-destructing/versioned service worker pattern that can be safely updated without causing stale-cache lockouts for users — do not use a naive cache-first strategy that could trap users on an old version.
- Performance budget: minimize JS bundle size, code-split routes, lazy-load images, no heavy UI component libraries — build simple Tailwind components directly rather than importing a large design system. This app must run acceptably on low-end Android devices over patchy rural network.

---

## Data model

Write full SQL migration files in `supabase/migrations/` (versioned, do not hand-execute ad hoc SQL). Enable Row Level Security on all tables with policies appropriate for: any authenticated (per the MVP auth approach above) user can read active listings and crops/equipment_types; a user can only insert/update/delete their own profile and their own listings.

**profiles** (application-level user table; not using Supabase Auth's built-in user system since MVP auth is custom — see auth approach above)
- id (uuid, primary key, generated)
- full_name (text, not null)
- phone (text, not null, unique)
- village_town (text)
- pincode (text, not null)
- latitude, longitude (numeric — derive from pincode at signup via a pincode-to-lat/long lookup table; seed only Sagar district + surrounding MP pincodes for MVP, structured so more regions can be added later without schema changes)
- preferred_language (text, check constraint 'hi' or 'en', default 'hi')
- disclaimer_accepted_at (timestamptz, nullable — set when the signup disclaimer is accepted; block profile creation/listing posting if null)
- created_at (timestamptz, default now())

**listings**
- id (uuid, primary key, generated)
- user_id (FK to profiles)
- listing_type (text, check constraint 'offer' or 'requirement')
- category (text, check constraint 'land', 'equipment', or 'labor')
- status (text, check constraint 'active' or 'closed', default 'active')
- latitude, longitude (numeric — from user's profile at time of posting, but overridable per-listing, relevant for land not at the poster's home village)
- pincode (text)
- details (jsonb, not null — category-specific fields, see below)
- self_declared (boolean, default false — must be true for category='land' AND listing_type='offer'; enforce with a check constraint)
- created_at (timestamptz, default now())
- expires_at (timestamptz, default now() + interval '30 days')

**crops** (lookup table, region-scoped for future expansion)
- id (uuid or serial, primary key)
- name_hi (text), name_en (text)
- region (text, default 'sagar_mp')

**equipment_types** (lookup table)
- id (uuid or serial, primary key)
- name_hi (text), name_en (text)

**pincodes** (lookup table for lat/long derivation)
- pincode (text, primary key)
- village_town (text)
- district (text)
- state (text)
- latitude (numeric), longitude (numeric)

### Seed data

**crops** — seed with these Sagar/MP staples (mark this seed file clearly with a comment: "Starter list for Sagar, MP pilot — confirm/expand with founder before wider regional launch"):
गेहूं/Wheat, सोयाबीन/Soybean, चना/Gram, उड़द/Urad, मूंग/Moong, धान/Paddy, अरहर/Arhar (Tur), मक्का/Maize, सरसों/Mustard, लहसुन/Garlic

**equipment_types** — seed with:
ट्रैक्टर/Tractor, ट्रॉली/Trolley, थ्रेशर/Thresher, हार्वेस्टर/Harvester, रोटावेटर/Rotavator, अन्य/Other

**pincodes** — seed with a reasonable set of real Sagar district, MP pincodes and their approximate lat/long (research and use real, accurate pincode-to-coordinate data for Sagar district — do not fabricate placeholder coordinates; if you cannot verify real data, use publicly known approximate coordinates for Sagar city and clearly comment that this seed set needs expansion before wider launch).

---

## Listing fields by category (stored in `details` JSONB)

**Land — Offer** (requires `self_declared = true`)
- size_range: enum '<1' | '1-2' | '2-5' | '5-10' | '10+' (acres)
- arrangement: array, values from 'lease' | 'sharecropping' | 'contract_farming' (multi-select)
- water_source: enum 'borewell' | 'canal' | 'rainfed' | 'none'
- crop_id: nullable FK reference to crops.id
- season: enum 'kharif' | 'rabi' | 'zaid' | 'year_round'
- photo_urls: array of strings, max 3, uploaded to Supabase Storage
- Self-declaration checkbox required and must be checked to submit: "मैं पुष्टि करता/करती हूं कि यह ज़मीन मेरी है या मुझे इसे लिस्ट करने का अधिकार है।" / "I confirm this land belongs to me or I am authorized to list it."

**Land — Requirement** — same fields, framed as "looking for," no self-declaration required.

**Equipment — Offer / Requirement**
- equipment_type_id: FK to equipment_types.id
- rental_basis: enum 'per_hour' | 'per_acre' | 'per_day'
- available_now: boolean, OR available_from/available_to: date (pick one approach and apply consistently — recommend a simple toggle "available now" vs. specific date range)

**Labor — Offer / Requirement** (posted by a contractor/group leader representing a team, not individual laborers)
- worker_count: integer
- work_type: enum 'sowing' | 'harvesting' | 'weeding' | 'general' | 'other'
- available_from, available_to: date
- rate_basis: enum 'per_day' | 'per_task', nullable
- rate_amount: text, free-form and optional (e.g. "₹400" or "बातचीत से" / negotiable)

---

## Screens & flows

1. **Language selector** — shown on first launch (before/alongside signup). Hindi default. Persists to profile once created; local storage before that.
2. **Signup** — full name, phone number, village/town, pincode → lat/long lookup against `pincodes` table, preferred language. No email, no password, no OTP (see auth approach above).
3. **Signup disclaimer** — one-time acknowledgment screen, shown as part of signup flow before profile is finalized. Must be actively accepted (checkbox + continue button); `disclaimer_accepted_at` is set only on acceptance. Copy below.
4. **Login** — returning users enter phone number, matched against existing profile, logged in directly (MVP trust-based approach).
5. **Home / Browse** — three category tabs (Land / Equipment / Labor). Each shows active listings within 30km of the user's location (Haversine formula against lat/long — implement as a Postgres function or client-side calculation on a pre-filtered bounding box, whichever is more efficient), sorted nearest-first by default, toggle to newest-first. Filter by Offer vs Requirement within each tab.
6. **Listing detail** — full listing details in a large, clear layout. Disclaimer banner directly above the "Call" button (copy below). Tapping "Call" opens a `tel:` link with the lister's phone number pre-filled. No in-app chat, no contact form, no "interested" intermediate step — call is the entire interaction.
7. **Post a listing** — first question: "Offering or Looking For?" then category selection (Land/Equipment/Labor), then the category-specific form using dropdowns/selects per the field lists above (minimize free text throughout). Footer disclaimer on every listing form (copy below).
8. **My Listings** — the logged-in user's own listings, with a "मिल गया / Found" button to manually mark a listing Closed.

---

## Disclaimer copy (use exactly as written — Hindi primary, English secondary, styled as a visible, colored banner — never small print)

**Signup (one-time acknowledgment):**
> हिंदी: "किसान सहयोग एक जानकारी साझा करने वाला मंच है। हम किसी भी सौदे, भुगतान या समझौते में शामिल नहीं हैं। कृपया किसी भी लेन-देन से पहले दूसरे व्यक्ति की पहचान और जानकारी स्वयं जांच लें।"
> English: "Kisan Sahyog is an information-sharing platform only. We are not involved in any deal, payment, or agreement between users. Please verify the other person's identity and details yourself before proceeding."

**Before phone number reveal (short):**
> "सावधान: लेन-देन से पहले जानकारी जांचें। हम ज़िम्मेदार नहीं हैं।"
> "Caution: Verify details before dealing. We are not responsible for the transaction."

**On every listing creation form (footer note):**
> "गलत जानकारी देने पर आपकी लिस्टिंग हटाई जा सकती है।"
> "Providing false information may result in your listing being removed."

---

## Explicitly OUT of scope — do not implement any of the following

- Phone OTP verification (Phase 2 — see auth approach above)
- Any payment, escrow, or commission logic
- In-app messaging/chat, "interested" buttons, or contact forms
- Police verification or document upload/verification flows
- Expert/advisor/legal-aid features
- Vendor/seed-supplier features
- Contract generation or e-signing
- Ratings/reviews
- Algorithmic "smart matching" or recommendation scoring — plain filtered/sorted list only
- Voice input (speech-to-text) or voice output (text-to-speech)
- Any language beyond Hindi and English
- Native mobile app (PWA only for this build)
- Actual Cloudflare Pages deployment (build for it, but do not deploy)

---

## Build phases (complete, TEST per checklist, fix failures, regression-check, THEN commit and push — before moving to the next phase)

**Phase 1 — Project scaffold & data layer**
- Initialize Vite + React + Tailwind project
- Set up Supabase client, `.env.example`, gitignore real `.env`
- Write and document all SQL migrations (profiles, listings, crops, equipment_types, pincodes) with RLS policies
- Write and run seed scripts for crops, equipment_types, and pincodes (using service role key)

*Test checklist:*
- Positive: app builds and runs locally with no console errors; migrations apply cleanly to a fresh Supabase schema; seed scripts insert the expected row counts for crops, equipment_types, pincodes.
- Negative: confirm RLS actually blocks an unauthenticated/anon-key request from reading or writing another user's row where policy should prevent it (write a throwaway test script to attempt this, don't just read the policy and assume).
- Edge: re-running seed scripts twice does not create duplicate rows (idempotent seeding, or clearly documented as one-time-only with a guard).

Commit + push: "Phase 1: project scaffold, data model, seed data"

**Phase 2 — Auth & profile (MVP trust-based approach)**
- Language selector screen
- Signup flow (name, phone, village/town, pincode → lat/long lookup, language)
- Signup disclaimer screen with required acceptance
- Login flow (phone number match, no OTP)
- Auth service module isolated for later OTP swap-in (per auth approach section above)

*Test checklist:*
- Positive: complete signup with valid name/phone/pincode succeeds; disclaimer must be checked before continuing; subsequent login with the same phone number logs the same user back in and loads their profile correctly.
- Negative: signup with a duplicate phone number is rejected with a clear message, not a silent failure or a duplicate profile; signup with an invalid/malformed phone number (wrong length, letters) is rejected client-side before hitting the database; signup with a pincode not in the seeded `pincodes` table is handled gracefully (clear message, not a crash) — decide and implement a sensible fallback (e.g., "pincode not recognized, please check and re-enter" rather than silently defaulting to 0,0 coordinates).
- Edge: login attempt with a phone number that has never signed up is handled with a clear "not found, please sign up" path, not a crash or blank screen; language toggle persists correctly across a logout/login cycle.

Commit + push: "Phase 2: auth and profile (MVP trust-based, OTP-ready architecture)"

**Phase 3 — Land category, end-to-end**
- Listing creation form for Land (Offer + Requirement), including self-declaration checkbox logic
- Browse/search for Land with 30km radius filtering, Offer/Requirement filter, nearest/newest sort
- Listing detail screen with phone-reveal disclaimer and `tel:` call button

*Test checklist:*
- Positive: create a Land Offer with the self-declaration checkbox checked — succeeds; create a Land Requirement (no checkbox needed) — succeeds; both appear correctly in browse, and open correctly in detail view with correct data.
- Negative: attempt to submit a Land Offer with the self-declaration checkbox unchecked — must be rejected both in the UI (button disabled/validation message) AND at the database level (confirm the check constraint actually rejects it if the UI check is bypassed, e.g. via a direct insert test).
- Edge: a listing exactly at the 30km boundary — confirm your distance comparison is consistent (inclusive or exclusive of exactly 30.0km, document which, and test a listing just inside and just outside that boundary to confirm both are filtered correctly); a listing with no photos (photos are optional) renders the detail screen correctly without broken image placeholders; test with a real pair of Sagar-district pincodes at a known approximate distance to sanity-check the Haversine math against reality, not just against itself.

Commit + push: "Phase 3: Land category complete end-to-end"

**Phase 4 — Equipment category**
- Extend listing creation and browse/search to Equipment
- Reuse the Land detail/browse components where structurally possible rather than duplicating

*Test checklist:*
- Positive: create Equipment Offer and Requirement listings across a few different equipment types and rental bases — all succeed and display correctly.
- Negative: attempt to create an Equipment listing with no equipment type selected — rejected with a clear message.
- Edge: an equipment listing set to "available now" vs. a specific date range both render correctly in detail view without layout breakage.
- **Regression:** re-run the full Phase 3 (Land) checklist — confirm shared components touched in this phase (detail view, browse list, distance filtering) did not break Land's behavior.

Commit + push: "Phase 4: Equipment category complete"

**Phase 5 — Labor category**
- Extend listing creation and browse/search to Labor

*Test checklist:*
- Positive: create Labor Offer and Requirement listings with varying worker counts, work types, and both rate basis options (including rate_amount left blank, since it's optional) — all succeed and display correctly.
- Negative: attempt to submit with worker_count as zero or negative — rejected; attempt with available_from date after available_to date — rejected or handled sensibly.
- Edge: a Labor listing with rate_amount left blank displays cleanly in detail view (no "undefined" or empty broken field showing).
- **Regression:** re-run Phase 3 and Phase 4 checklists in full.

Commit + push: "Phase 5: Labor category complete"

**Phase 6 — My Listings & lifecycle**
- My Listings screen, manual "Found/Closed" toggle
- 30-day auto-expiry logic (a scheduled Supabase function, or filtered out of active queries by `expires_at`, whichever is simpler to implement correctly for MVP — document the choice)

*Test checklist:*
- Positive: a user's own listings across all three categories appear correctly in My Listings; tapping "Found/Closed" updates status and the listing disappears from public browse immediately.
- Negative: confirm a user cannot close another user's listing (test directly against the API/RLS, not just via the UI which would simply not show the button).
- Edge: manually set a test listing's `expires_at` to a past timestamp and confirm it does NOT appear in public browse results, but DOES still appear (clearly marked as expired) in the owner's My Listings; confirm a listing closed manually vs. one that auto-expired are distinguishable if that distinction matters to your implementation (decide and document).
- **Regression:** re-run Phase 3, 4, 5 checklists in full.

Commit + push: "Phase 6: My Listings and lifecycle management"

**Phase 7 — Full bilingual pass**
- Audit every screen and string for Hindi/English toggle coverage — no hardcoded English-only or Hindi-only text anywhere

*Test checklist:*
- Positive: toggle language on every single screen built so far (signup, disclaimer, login, browse × 3 categories, listing detail × 3 categories, post listing × 3 categories, My Listings) and confirm every visible string switches correctly.
- Negative: search the codebase for hardcoded user-facing strings not routed through the translation/i18n mechanism — flag and fix any found.
- Edge: dropdown option labels (crop names, equipment types, work types) switch language correctly, not just static UI chrome — these come from the database (crops/equipment_types tables) and must respect the `name_hi`/`name_en` columns correctly based on selected language.
- **Regression:** spot-check Phase 3–6 functionality still works correctly in both languages (not just that the language switches, but that submitting forms/filtering still functions in English mode too).

Commit + push: "Phase 7: full Hindi/English coverage"

**Phase 8 — PWA & performance polish**
- PWA manifest, icons, installability on Android Chrome
- Versioned service worker (safe update pattern, no stale-cache lockouts)
- Performance pass: verify bundle size, confirm code-splitting and lazy image loading are working, spot-check for low-end device usability

*Test checklist:*
- Positive: app is installable via Chrome's "Add to Home Screen" prompt on Android (or via desktop Chrome's install icon if physical Android testing isn't available); installed app opens correctly and functions identically to the browser version.
- Negative: simulate an app update (change a version marker, rebuild) and confirm the service worker update does NOT trap the user on stale cached content — they should get the new version within a reasonable reload/relaunch, not be stuck indefinitely.
- Edge: test app behavior with network throttled to a slow 3G profile (Chrome DevTools network throttling) — confirm it's still usable, not just "loads eventually with no feedback"; confirm a fully offline load shows a sensible fallback rather than a blank white screen.
- **Regression:** confirm core flows (signup, browse, post listing, call button) still work correctly after PWA/service-worker changes — service workers are a common source of "works in dev, breaks in production caching" bugs.

Commit + push: "Phase 8: PWA and performance polish"

**Phase 9 — Full cross-category integration pass**
This phase exists specifically to test the *whole system together*, not each category in isolation — this is the "touch points and downstream systems" pass.

*Test checklist (walk these as real end-to-end user journeys, not unit tests):*
- Full journey A: new user signs up → accepts disclaimer → posts a Land Offer → posts an Equipment Requirement → posts a Labor Offer → confirms all three appear correctly in My Listings and in public browse (from a second test account) → closes one → confirms it disappears from browse but stays visible (marked closed) in My Listings.
- Full journey B: second test user (different pincode, one inside 30km of user A, one outside) confirms distance filtering works correctly across all three categories consistently, not just Land — this specifically checks that the shared distance-filtering logic wasn't accidentally forked or diverged during Phases 4–5.
- Cross-cutting check: confirm the `details` JSONB shape is being read/written consistently — deliberately inspect a few raw rows in the database across all three categories and confirm the schema matches what was specified (no silent drift, no leftover fields from copy-pasting one category's form logic into another's).
- Downstream/shared-dependency check: confirm the `pincodes` lookup table is the single source of truth for every lat/long derivation across signup, per-listing location override, and distance filtering — no category should have its own separate/duplicated location logic.
- Full regression: re-run every test checklist from Phases 1–8 one final time, end to end, in a single sitting, on a clean local environment if possible (fresh clone + fresh `.env` + re-run migrations/seeds) to catch anything that only breaks in a clean setup versus an incrementally-built one.

Commit + push: "Phase 9: full integration test pass and regression verification"

**Phase 10 — Documentation**
- Create `PROJECT_CONTEXT.md` at repo root documenting: full architecture, table schemas, the region-agnostic design of crops/equipment_types/pincodes (for future multi-state/multi-country expansion), the MVP auth approach and exactly what needs to change to swap in real Phone OTP (Phase 2 of the product, not to be confused with these build phases), and a standing instruction that PROJECT_CONTEXT.md must be updated after every future change to this project.
- Create/finalize `KNOWN_ISSUES.md` at repo root — this should already have entries if any test checklist item was ever flagged and deferred rather than fixed; if empty, state explicitly "no known open issues as of this build."

Commit + push: "Phase 10: PROJECT_CONTEXT.md, known issues log, and final documentation"

---

## Definition of done

- All three categories (Land, Equipment, Labor) fully functional for both Offer and Requirement
- Every phase's test checklist passed — positive, negative, and edge cases — before that phase was committed
- Regression checks confirm earlier phases still work after later phases touched shared code
- Phase 9's full cross-category integration pass completed on a clean environment
- Full Hindi/English toggle with no missed strings, Hindi default, verified functionally (not just visually) in both languages
- Phone-number-only login working end-to-end (no OTP, per MVP scope), with auth logic isolated for a clean future OTP swap
- 30km radius search working correctly, verified against real Sagar-district pincode data and boundary-tested at exactly 30km
- Disclaimers present and correctly worded at all three specified touchpoints, styled as visible banners
- Self-declaration checkbox enforced at both UI and database level for land offers
- PWA installable on Android Chrome, verified not to trap users on stale cached versions after an update
- PROJECT_CONTEXT.md and KNOWN_ISSUES.md committed at repo root, complete and accurate
- Every phase committed and pushed to https://github.com/Himanshu1305/Kissansahyog individually, not as one giant final commit
- App runs locally without errors on a clean environment; any unresolved issues are documented in KNOWN_ISSUES.md, not silently left for the founder to discover
