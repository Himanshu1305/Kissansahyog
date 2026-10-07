# Kisan Sahyog — Project Context

> **STANDING INSTRUCTION:** Update this file after **every** future change to the
> project (schema, RPCs, screens, auth, scripts, deployment). It is the single
> source of truth for how the system fits together. If you change behavior and
> don't update this file, the change is not done.

Kisan Sahyog (किसान सहयोग) is an information-sharing PWA for farmers, landowners,
equipment owners, and laborers. Users post **Offers** ("I have land/equipment/labor")
or **Requirements** ("I need …"), discover nearby matches within **30 km**, and
connect by a **direct phone call**. The platform is **not** part of any deal,
payment, or agreement — disclaimers say so at every touchpoint. Founder voice is
anonymous: **Team Kisan Sahyog**.

Pilot region: **Sagar, Madhya Pradesh**. Domain: kissansahyog.com.
Audience: wide range of digital literacy, low-end Android phones, patchy rural
network → dropdowns/icons/large tap targets over free text; small JS bundle.

---

## 1. Tech stack & repo layout

- **React 19 + Vite + Tailwind CSS v4** (hand-built components, no UI library).
- **Supabase (Postgres 17)** for data. **Custom trust-based auth** (NOT Supabase Auth).
- **PWA** via `vite-plugin-pwa` (auto-update SW, offline shell).
- **Cloudflare Pages** for hosting (deploy is a separate, later step — not automated here).

```
src/
  lib/
    supabaseClient.js        anon data client (RLS-scoped; no Supabase Auth session)
    auth/                    THE Phase-2 OTP swap point (see §5)
      authService.js         signup/login/logout/session — isolated auth logic
      AuthProvider.jsx       React context over authService
    i18n/                    bilingual system (see §7)
      strings.js             every UI string as { hi, en }
      disclaimers.js         exact spec disclaimer copy (Hindi + English, always both)
      LanguageProvider.jsx   t(key) + language state (Hindi default, localStorage)
    listings/
      catalog.js             all field enums + bilingual labels (one place)
      listingsApi.js         create/browse/detail/contact/my/close data access
      registry.jsx           category -> module map + ENABLED_CATEGORIES
      extras.js              loads lookup rows a category needs (crops/equip types)
      photos.js              Supabase Storage upload (land photos)
    distance.js              Haversine + bounding box + 30km policy
    errors.js                RPC error-code -> i18n key mapping
  components/
    ui.jsx                   Screen/BigButton/Field/inputs/Notice/Spinner
    categories/fields.jsx    reusable form controls (OptionSelect, DateField, …)
    categories/{land,equipment,labor}.jsx   per-category Fields/validate/summarize
    ListingForm.jsx          category-agnostic create form
    ListingCard.jsx          compact listing summary (browse + my listings)
    DisclaimerBanner.jsx     colored banner, always bilingual
    LanguageToggle.jsx       हिं / EN switch (persists to profile when logged in)
  screens/                   Welcome, Signup, Login, Home, Browse, Post,
                             ListingDetail, MyListings
supabase/
  migrations/*.sql           versioned schema (applied via scripts/db.mjs)
  seed/*.json                pincodes + crops/equipment seed data
scripts/
  db.mjs                     migration runner (Supabase Management API; no DB password)
  seed.mjs                   idempotent lookup-table seeding (service role)
  gen-icons.mjs              generates PWA icons from an inline wheat SVG
  test/phase{1..9}.mjs       backend/logic test checklists
e2e/                         Playwright E2E (phase{2..9}.spec.js) + support/teardown
```

---

## 2. Data model (see `supabase/migrations/`)

All tables have **Row Level Security** enabled.

**profiles** — application-level user. `id` uuid pk, `full_name`, `phone` (unique,
**nullable since Phase 3** — null for email users), `village_town`, `pincode`,
`latitude`, `longitude` (derived from `pincodes`), `preferred_language`
('hi'|'en', default 'hi'), `disclaimer_accepted_at` (nullable; must be set to post),
`created_at`. **Phase 3 columns:** `email` (unique, nullable), `auth_uid` (unique,
nullable — links an email user to `auth.users.id`), `auth_provider`
('phone'|'email', default 'phone'), `is_admin` (bool, default false).

**listings** — `id` uuid pk, `user_id` → profiles, `listing_type` ('offer'|'requirement'),
`category` ('equipment'|'labor'|'drone_didi'|'bhusa'|'agri_inputs'|'warehouse'|'land' —
7 categories, **Land last**), `status` ('active'|'closed'|'removed', default active —
'removed' = admin moderation; removed/closed rows excluded from public browse/homepage),
`latitude`/`longitude` (**the ASSET's location**, derived server-side from the listing's own
`pincode` — see §6), `pincode`, `details` jsonb (category-specific — see §3), `self_declared` bool,
`listing_source` ('farmer'|'vendor', default 'farmer' — **the vendor/business tag**, shows a
🏪 badge on cards/detail and drives the admin vendor report), `created_at`, `expires_at`.
CHECK `land_offer_requires_self_declared`: a land **offer** must have `self_declared = true`.
CHECK `listings_category_check`: category ∈ the 7 values above (widened per migration as categories were added).

**experts** (v1.1) — curated consultation directory. `id` uuid pk, `name` not null,
`name_hi`, `specialisation_en`, `specialisation_hi`, `bio_en`, `bio_hi`, `phone` not null,
`organisation`, `is_active` bool (default true), `created_at`. **Admin-curated only** — anon
may READ active rows; **no anon writes** (inserts via service role / migrations). No distance
filtering (experts help everyone). See §11.

**articles** (Phase 3) — blog/articles. `id` uuid pk, `slug` unique, `title_hi`,
`title_en`, `summary_hi`, `summary_en`, `content_hi`, `content_en`, `author_name`
(default 'Team Kisan Sahyog'), `cover_image_url`, `is_published` (bool), `published_at`,
`created_at`. **RLS:** public read of `is_published = true`; writes only via admin RPCs.
Two launch articles seeded (Parali burning; carbon credits).

**resources** — Useful Contacts directory (admin-managed reference data, NOT user
listings). `id` uuid pk, `resource_type` ('soil_lab'|'veterinary'|'govt_office'),
bilingual `name`/`description`/`address`/`timings`, `district`/`area`, `phone_primary`/
`phone_secondary`/`phone_tollfree`, `email`, `website`, `is_active`, `sort_order`,
`created_at`. **RLS:** public read of `is_active = true`; writes only via admin RPCs.
These are public govt contacts, so phone/email are in the row (no RPC gate). Seeded with
13 real Sagar/Khurai contacts (3 soil labs, 4 veterinary, 6 govt offices). See §15.

**crops** — `id` serial, `name_hi`, `name_en`, `region` (default 'sagar_mp'),
unique (name_en, region). *(v1.1: 11 rows — added मसूर/Masoor.)*
**equipment_types** — `id` serial, `name_hi`, `name_en` unique. *(v1.1: 11 rows — added
Drone, Seed Drill, Reaper, Blower, LCB.)*
**pincodes** — `pincode` pk, `village_town`, `district`, `state`, `latitude`, `longitude`.
**schema_migrations** — `version` pk (migration bookkeeping for scripts/db.mjs).

### Region-agnostic design (future multi-state / multi-country expansion)
`crops`, `equipment_types`, and `pincodes` are **data-driven lookup tables**, not
hardcoded lists. `crops` and `pincodes` carry `region`/`state`/`district` columns.
Expanding to a new region is a **data-only** change (add pincode rows with real
coordinates + region-scoped crops) — **no schema change, no code change**. The 30km
search and coordinate derivation read entirely from these tables, so any region with
seeded pincodes works immediately. Current seed = Sagar district only (see
`supabase/seed/` — flagged as a starter set to confirm/expand before wider launch).

---

## 3. `details` JSONB shapes (per category)

Written/validated by the category modules (`src/components/categories/*.jsx`) and the
`create_listing` RPC. **Keys are exact — no drift, no cross-category leakage**
(enforced by `scripts/test/phase9.mjs`).

- **land**: `{ size_range, arrangement[], water_source, crop_id|null, season, price_type, price_amount, photo_urls[] }`
  - size_range: `<1|1-2|2-5|5-10|10+`; arrangement (multi): `lease|sharecropping|contract_farming`;
    water_source: `borewell|canal|rainfed|none`; season: `kharif|rabi|zaid|year_round`;
    **price_type (v1.1, required): `fixed|sharecropping|negotiable`**; price_amount: text, only when `fixed`;
    photo_urls: up to 3 Supabase Storage URLs.
- **equipment**: `{ equipment_type_id, rental_basis, rate_amount, available_now, available_from|null, available_to|null }`
  - rental_basis: `per_hour|per_acre|per_day` (**v1.1: required**); **rate_amount (v1.1: required text)**;
    availability = `available_now` toggle OR a date range.
- **labor**: `{ worker_count, work_type, available_from|null, available_to|null, rate_basis|null, rate_amount }`
  - work_type: `sowing|harvesting|weeding|drone_operator|general|other` (**v1.1: added drone_operator /
    "Drone Didi"**); rate_basis: `per_day|per_task`; rate_amount: free-form optional text.
- **drone_didi**: women-operated drone spraying (Govt scheme). Shape by listing_type, pruned in finalizeDetails:
  - offer: `{ operator_name, drone_type, service_type[], rate_per_acre, min_acres, available_from|null, available_to|null, coverage_area, government_scheme, crops_covered, asset_village }`
    — drone_type: `multi_rotor|fixed_wing|other`; service_type (multi): `pesticide|fertilizer|water|seed_sowing`;
    `government_scheme` bool → shows a prominent "सरकारी ड्रोन दीदी योजना ✓" badge on the detail view (via the
    module's `detailBadges` export, rendered generically by ListingDetail). asset_pincode is the listing's row
    pincode (asset-location rule); asset_village is a details field.
  - requirement: `{ crop_type, acreage, service_needed, preferred_date|null, asset_village }`
- **warehouse**: storage listings. Shape by listing_type, pruned in finalizeDetails:
  - offer: `{ warehouse_type, capacity_quintals, rate, available_from|null, facilities[], address, contact_name }`
    — warehouse_type: `general|cold|silo|other`; facilities (multi): `electricity|water|security|loading|weighing`.
  - requirement: `{ crop_type, quantity_quintals, duration, preferred_type }`
- **bhusa** (v1.1): `{ residue_type, quantity, pickup_arrangement, buyer_type_preference, asking_price, available_from|null }`
  - residue_type: `bhusa|parali|sugarcane|cotton|other`; pickup_arrangement:
    `buyer_collects|farmer_delivers|either`; buyer_type_preference: `individual|commercial|either`;
    quantity/asking_price: free text. No self-declaration.
- **agri_inputs** (v1.1): two sub-types on one form, pruned to the chosen shape in `finalizeDetails`:
  - farmer_surplus: `{ subtype:'farmer_surplus', input_type, item_name, quantity, asking_price, material_address, condition }`
    — input_type: `seeds|fertilizer|pesticide|other`; condition: `good|original_packaging|opened` (required for seeds/fertilizer).
  - vendor: `{ subtype:'vendor', business_name, input_types[], items_description, price_range, shop_address, contact_phone }`
    — free to list (UI note "charges may apply later"; **no payment gate**).

Adding a category = add a module (`initialDetails/Fields/validate/summarize/needsSelfDeclaration`,
optional `finalizeDetails/locationLabelKey/locationPlaceholderKey/extraDisclaimerKey/detailBadges`),
import it in `registry.jsx`, add to `ENABLED_CATEGORIES`/`EXTRAS_NEEDED`, widen the `create_listing`
category CHECK + validation, and widen the `listings_category_check` constraint. Browse/detail/post
are category-agnostic. `Fields` receives `{ details, setDetails, extras, listingType, user }`;
`finalizeDetails` receives `{ actorId, user, listingType }`. `detailBadges(listing, lang)` (optional)
returns prominent pills for the detail view (e.g. Drone Didi's govt-scheme badge + service tags).

**Nav / category order** (nav tabs, browse tabs, homepage cards, post selector):
Land → Equipment → Labor → **Drone Didi** → Bhoosa/Parali → Seeds, Fertilizers & More → Experts.
The homepage shows **7 category cards** (6 listing categories + Experts). Migration `0015` added
`drone_didi` (category CHECK + create_listing validation).

---

## 4. Security model — RLS + SECURITY DEFINER RPCs

Because MVP auth is custom, **every app request reaches the DB as the shared `anon`
role** (no per-user JWT). RLS is therefore designed as:

- **Reads:** `anon` may SELECT only **active + unexpired** listings and the lookup
  tables. `profiles` is **fully locked** (no wholesale phone-number dump).
- **Writes + profile reads + phone reveal:** go through **SECURITY DEFINER RPCs**
  (`0003_functions.sql`) that run as owner and enforce rules in-body:
  - `app_signup`, `app_login`, `set_language`
  - `create_listing` (validates per category; land-offer self-declaration; ownership),
    `close_listing` (owner-only), `get_my_listings`, `get_listing_contact` (active only)
- Direct `anon` INSERT/UPDATE/DELETE on `listings`/`profiles` is **default-denied**
  (proven in `scripts/test/phase1.mjs`, `phase6.mjs`).

**Residual trust boundary (by design, MVP):** RPCs take the acting `profile_id` as an
argument, which a malicious client could forge — the same trust model as the
self-declaration checkbox and "no police verification". This becomes cryptographic in
Phase 2 (real auth → `auth.uid()`). See §5 and KNOWN_ISSUES.md.

---

## 5b. Dual auth — phone (trust) + email (Supabase Auth), Phase 3

Email+password was added **alongside** the phone flow; both live in `authService.js`
and both end with the same localStorage session (`ks_session_v1`) so every screen is
auth-method-agnostic.
- **Phone:** unchanged trust-based `app_signup`/`app_login` (still needs real OTP one day).
- **Email:** a SECOND Supabase client `supabaseAuth` (in `supabaseClient.js`,
  `persistSession:true`, distinct `storageKey`) does `signUp`/`signInWithPassword`.
  Email confirmation is **disabled** (`mailer_autoconfirm` on) so signup yields an
  immediate session. `app_signup_email`/`app_login_email` are SECURITY DEFINER RPCs that
  identify the user via `auth.uid()` and link the profile by `auth_uid`.
  **Why a second client:** the main `supabase` client stays anon-only (no JWT on data
  requests), so requests never switch to the `authenticated` role and **existing anon RLS
  is untouched**. `changePassword` re-verifies then `updateUser`; `logout` also
  `supabaseAuth.signOut()`. Profile edit/delete via `update_profile`/`delete_account` RPCs.

## 5. MVP auth & the Phase-2 OTP swap (IMPORTANT)

**Now (MVP, trust-based, no SMS):** signup collects name/phone/village/pincode/language,
sets `disclaimer_accepted_at`, stores the profile in `localStorage`. Login = phone match,
no verification. **All identity logic is isolated in `src/lib/auth/authService.js`**
(flagged at the top of the file as the swap point).

**Phase 2 (real Phone OTP) — change ONLY these, keeping function signatures stable:**
1. `authService.signup/login` → `supabase.auth.signInWithOtp({ phone })` + `verifyOtp()`.
2. Link `auth.users.id` to a `profiles` row (store `auth_uid`, or make it `profiles.id`).
3. Replace the RPC `p_actor_id` argument with `auth.uid()` **inside** the functions,
   and add `auth.uid()`-based RLS row policies so ownership is cryptographically enforced.
4. `getCurrentUser()` → `supabase.auth.getUser()`; re-enable session persistence in
   `supabaseClient.js`.
Screens call only the `authService` API, so no screen should need changes.
Requires an SMS provider (Twilio/MSG91/etc.) — out of scope for MVP.

---

## 6. Location & 30 km search (`src/lib/distance.js`)

**STANDING RULE (v1.1): distance matching always uses the LISTING's own location
fields, never the poster's profile location.** A listing's coordinates are the location
of the **asset** (the land / equipment / team / residue / goods) — a landowner in Hyderabad
listing land in Sagar is matched near Sagar, not near Hyderabad.

- The create form asks the **asset pincode explicitly** (required, prominently labelled, and
  **never** pre-filled from the profile — `ListingForm.jsx` + each module's `locationLabelKey`).
- `create_listing` **re-derives** lat/long from that pincode via the `pincodes` table
  **server-side** (authoritative — a forged client lat/long is ignored). Only when no listing
  pincode is supplied does it fall back to explicit coords, then the poster's home (legacy path).
- Browse measures viewer → each **row's** coordinates (`fetchNearby` in `listingsApi.js`). It does
  **not** join `profiles` for distance at any point.

Coordinates still come **only** from the `pincodes` table (single source of truth). Browse:
a **bounding-box** pre-filter (server-side `gte/lte` on lat/long) then an **exact Haversine**
pass; **inclusive of exactly 30.0 km** (`<= 30`). Sort nearest-first (default) or newest.

**Soft radius fallback (v1.1):** `fetchNearby` returns `{ primary, fallback }` — `primary` ≤ 30 km,
`fallback` the 30–50 km ring (`FALLBACK_RADIUS_KM = 50`). Browse renders the fallback under a
bilingual "30–50 किमी दूर / 30–50 km away" header **only when** `primary` has fewer than
`MIN_PRIMARY_RESULTS` (5), so a low-density pilot area is never a blank screen.

Verified against real Sagar-district distances (Sagar→Bina ~66km, →Khurai ~46km, →Rehli ~42km)
and boundary-tested at 30.0 km in `scripts/test/phase3.mjs`; asset-location across all 5
categories in `scripts/test/v11_phase1.mjs` and `v11_phase7.mjs`.

---

## 7. Bilingual (Hindi default)

Every UI string is `{ hi, en }` in `strings.js`, rendered via `t(key)`; disclaimer banners
always show both languages. DB dropdown labels (crops/equipment/work types) switch on
`name_hi`/`name_en`. Language persists to `localStorage` and (when logged in) to the profile
via `set_language`, so it survives logout/login. Field control ids are language-independent
(`name` prop) so `<label for>` never drifts when the language changes.
`scripts/test/phase7`-style audit: 91 `t()` keys, all defined in both languages, zero
hardcoded user-facing copy.

---

## 8. PWA & performance

`vite-plugin-pwa` with `registerType: 'autoUpdate'` + `skipWaiting` + `clientsClaim` +
`cleanupOutdatedCaches` → self-healing versioned SW, **no stale-cache lockout**. Offline
navigations fall back to the precached app shell (no blank screen). Icons generated by
`scripts/gen-icons.mjs` (192/512 + maskable). Route-level code splitting; initial JS ~129KB
gzip; listing images lazy-loaded.

---

## 9. Scripts & workflows

```
npm run dev                       # local dev
npm run build / preview           # production build / preview
npm run db migrate|status|query   # apply/inspect migrations (Supabase Management API)
npm run seed                      # idempotent lookup seeding (service role)
npm run icons                     # regenerate PWA icons
npm run test:e2e                  # Playwright E2E (builds + preview + chromium)
node --env-file=.env scripts/test/phaseN.mjs   # backend/logic checklists
```

Env (`.env`, gitignored; `.env.example` committed): `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY` (client), `SUPABASE_SERVICE_ROLE_KEY` (seed only),
`SUPABASE_ACCESS_TOKEN` (migrations via Management API — **never** the DB password).

**Applying schema to a NEW Supabase project:** set the four env vars, then
`npm run db migrate` (DDL via Management API) and `npm run seed`. Migrations are tracked
in `schema_migrations` and are idempotent to re-run.

---

## 10. Testing

Two layers, both against the real Supabase project, both mandatory per phase:
- **Backend/logic** (`scripts/test/phase{1..9}.mjs` for v1; `scripts/test/v11_phase{1..7}.mjs`
  for v1.1): RLS enforcement, RPC contracts, validation, DB constraints, Haversine/boundary,
  asset-location derivation, JSONB-shape consistency, bilingual coverage.
- **E2E** (`e2e/phase{2..9}.spec.js`, Playwright/chromium): real user journeys incl.
  disclaimer gating, language switching, offline shell, and the full cross-category
  Journey A/B. Test data uses the reserved phone prefix `90000…` and is auto-cleaned.
Phase 9 (v1) was re-verified on a **clean clone**: 72 backend + 26 E2E, all green.
**v1.1 backend suites** `v11_phase1..7` (82 checks) all green against the live project;
the v1 backend suites still pass (count assertions updated for the new seed rows). The v1
E2E specs predate the new required fields (asset pincode, land price type, equipment rate)
and need those fields filled before re-running — see KNOWN_ISSUES.md.

Out of scope for this MVP (do not implement without a scope change): Phone OTP, payments/
escrow, in-app chat/contact forms, document/police verification, ratings, algorithmic
matching, languages beyond Hindi/English, native app, automated deployment.
(Voice I/O is now IN scope and shipped — voice search exists via `lib/voice/voiceSearch.js`,
Web Speech hi-IN with a Gemini `/transcribe` fallback.)

---

## 11. Expert Consultation Directory (v1.1)

Curated, **admin-managed** directory (Model A — no booking, no payment). The `experts` table
(§2) is **public-read for active rows only**; there are **no anon write policies**, so records
are inserted by an admin via the **service role key** or a migration (v1.1 seeds 3 clearly-marked
PLACEHOLDER experts in `0009_v11_experts.sql`). UI: an "Experts" action on Home →
`/experts` (client-side specialisation filter) → `/experts/:id`. The phone is revealed behind
the **same disclaimer + `tel:` pattern** as listings. **No distance filtering** — an expert's
knowledge isn't geographically bound. Data access: `src/lib/experts/expertsApi.js`.

---

## 12. v1.1 build sequence (what changed from v1)

Seven phases, each its own commit + push (`docs/V1_1_BUILD_PROMPT.md` is the spec):
1. **Asset-location fix + soft fallback** — listings carry the asset's location (coords from the
   listing's own pincode, server-side); Browse 30–50 km fallback. Migration `0006`.
2. **Data/UI** — +5 equipment types, +Masoor crop (seed); land required price type; equipment
   required rate; `मज़दूर → कृषि सहयोगी` (Krishi Sahyogi) terminology; Drone Didi work type.
3. **Bhusa/Parali** residue category. Migration `0007` (widened category CHECK + validation).
4. **Agri-Inputs** category (farmer-surplus + vendor sub-types). Migration `0008`.
5. **Expert directory** (`experts` table + screens). Migration `0009`.
6. **Bilingual audit** of every v1.1 string (`v11_phase6.mjs`).
7. **Integration + docs** — cross-category asset-location + shape checks (`v11_phase7.mjs`),
   this file, and KNOWN_ISSUES.md.

Migrations `0006`–`0009` are additive and idempotent (`create or replace`, `add constraint if
… `, `on conflict do nothing`). The category CHECK constraint is re-declared (named
`listings_category_check`) each time a category is added.

---

## 13. Phase 3 — nav fix, dual auth, profile, admin, articles

Migrations `0010`–`0013`. Public homepage `/` is no longer gated (logged-in users can view
it; the NavBar logo links there for everyone). New screens/routes:
- `/welcome` (moved), `/profile` (auth), `/admin` (auth + is_admin), `/articles`,
  `/articles/:slug` (public). `/home` now renders the global NavBar.

**Dual auth:** see §5b. New profiles columns + nullable phone (0010); `update_profile` /
`delete_account` (0011).

**Admin dashboard (0012):** gated by `is_admin`. All admin data flows through
**is_admin-checked SECURITY DEFINER RPCs** — the anon key never returns bulk phones/emails:
`get_admin_stats`, `get_admin_listings`, `get_admin_users` (search), `remove_listing`
(→ status 'removed'), `admin_list_experts`, `admin_set_expert_active`, `admin_upsert_expert`,
`get_admin_articles`, `admin_upsert_article`, `admin_delete_article`. Helper `require_admin(id)`
raises `not_admin` for non-admins. Admin UI: stats bar, recent-listings + remove, expert CRUD,
article CRUD, users list + search — all bilingual.

**Becoming admin — the ONLY gate is the DB flag.** Run once in the Supabase SQL editor:
```sql
UPDATE profiles SET is_admin = true WHERE phone = 'YOUR_PHONE_NUMBER';
-- or, for an email-registered founder:
UPDATE profiles SET is_admin = true WHERE email = 'YOUR_EMAIL';
```

**Articles (0012 table, 0013 public-read + seed):** public read of published rows; admin CRUD
via RPCs. `articlesApi.js` (`fetchPublishedArticles`, `fetchArticleBySlug`). Nav + footer link
to `/articles`; the Bhusa/Parali browse tab cross-links the Parali article.

**Tests:** `scripts/test/p3_phase2..4,7.mjs` (dual auth, profile, admin, integration).
Note `phase3.mjs`'s browse assertion was made robust to real listings in the live DB
(checks its own tagged rows, not an exact total).

---

## 14. Test Data (dummy seed)

For demo/testing the DB is seeded with clearly-marked dummy data (migration `0014`
adds `is_test_data boolean default false` to `profiles` and `listings`, plus a
`seed_log` table; `scripts/seed_dummy.mjs` inserts the rows — idempotent, it clears
prior `is_test_data = true` rows first).

- **9 test users**, phones **9999000001–9999000009** (7 farmers + 2 Drone Didi
  operators: राधा महिला SHG @ Khurai, गायत्री ड्रोन सेवाएं @ Rahatgarh — all real,
  pre-existing pincodes; no new pincodes were needed).
- **50 listings** across all 7 categories (equipment 10, labor 7, drone_didi 8, bhusa 6,
  agri-inputs 7, warehouse 4 [3 offers incl 2 vendor, 1 requirement], land 8), all
  `is_test_data = true`. Vendor-tagged (`listing_source='vendor'`): the 2 agri shops + 2
  warehouse offers. `seed_log` rows: `dummy_data_khurai_v1` (38) + `dummy_data_drone_didi_v1`
  (8) + `dummy_data_warehouse_v1` (4). They appear in the public homepage feed
  and in Browse (distance-filtered — note Sagar district spans >30 km, so a given
  pincode sees a nearby subset in the primary band and the rest in the 30–50 km
  fallback). `seed_log` row: `dummy_data_khurai_v1`.
- **Re-seed:** `node --env-file=.env scripts/seed_dummy.mjs`.
- **Remove ALL test data before public launch** (real users are untouched):
  ```sql
  DELETE FROM listings WHERE is_test_data = true;
  DELETE FROM profiles WHERE is_test_data = true;
  ```
  Do NOT delete it before the platform has enough real listings to look lived-in.

---

## 15. Useful Resources directory (Section 6.3)

Static, admin-managed reference contacts for farmers — **not** a listing category.
Migration `0016` creates the `resources` table (§2), public-read RLS, admin RPCs
(`get_admin_resources`, `admin_set_resource_active`, `admin_upsert_resource` — all
is_admin-checked), and seeds 13 verified Sagar/Khurai contacts.

- **Public page `/resources`** (`src/screens/Resources.jsx`, `src/lib/resources/resourcesApi.js`):
  three tabs — मृदा परीक्षण / पशु चिकित्सा / कृषि कार्यालय — synced to the URL hash
  (`#soil` / `#veterinary` / `#offices`) so homepage cards deep-link. Each card shows
  name (bilingual), description, area tag, `tel:` phone buttons (toll-free numbers get a
  "निःशुल्क / Toll Free" badge), `mailto:` email, external website, timings, address.
  A page disclaimer + a collapsible "how to collect a soil sample" 6-step guide (soil tab).
- **Homepage highlight**: a distinct amber "ज़रूरी सरकारी संपर्क" section (between How-it-works
  and category cards) with 3 cards linking to `/resources#…`.
- **Nav/footer**: "उपयोगी संपर्क / Resources" added to the global nav and homepage footer.
- **Admin**: a Resources management panel (list, toggle active, add/edit form) in `/admin`.
- All strings bilingual via i18n; area tags map the stored English area value to a
  bilingual label. Tests: `scripts/test/p3_resources.mjs`.

---

## 16. Density + Vendor + Warehouse + Rojgar build

**Density (mobile-first):** tight global spacing (`Screen`/`Field`/`BigButton`), a single-row
horizontal-scroll **`CategoryStrip`** (replaces the old tab grid) on Browse + homepage, **2-column**
mobile listing cards (**1-column for Land**), a compact homepage (hero → strip → live listings →
mission strip → govt-contacts row → articles row → about → slim footer). The help `?` moved from the
category strip to the **listing form heading**.

**Nav / category order (Land LAST):** Equipment → Labor → Drone Didi → Bhoosa/Parali → Seeds,
Fertilizers & More → Warehouse → Experts → **Land**. Single source lists: `catalog.CATEGORIES`,
`registry.ENABLED_CATEGORIES`, `NavBar.NAV_CATS`, homepage `FILTERS`.

**Drone Didi icon:** rendered via `<CatIcon>` as a multi-rotor **quadcopter SVG** (never a
helicopter); other categories render their emoji. Used at every icon site.

**Vendor tagging (`listing_source`):** migration 0017 adds the column + threads it through
`create_listing` (`p_listing_source`, default 'farmer'). Post flow starts with a "who are you?"
(farmer default / vendor) step showing vendor + future-charges notes. Vendor listings show a 🏪 badge.
Admin **Vendor Listings Report** (new RPCs `get_admin_source_stats`, `get_admin_vendor_listings`):
farmer/vendor split, table, category + date filters, **client-side CSV export**. Existing RPCs
untouched except the create_listing signature/warehouse CHECK.

**Two mission objectives:** hero + mission strip + about section + `<title>`/meta all name **किसान की
आय बढ़ाना (income)** and **रोज़गार के अवसर (employment)** in both languages.

Migrations `0017` (listing_source) and `0018` (warehouse category CHECK + validation).

---

## 17. Live Mandi Price Ticker

A CSS-only horizontal-scrolling ticker on the homepage (immediately below the hero,
above the category strip) showing today's wholesale prices for 10 key crops from
Sagar-district mandis.

- **Table `mandi_prices`** (migration `0019`): public read (RLS), writes only via the
  service role. Unique on (commodity_en, market, price_date). Cached — the ticker works
  even when the source API is down.
- **Refresh** `scripts/refresh-mandi-prices.mjs` (`npm run refresh-prices`): dual-source —
  Agmarknet wrapper `mandi-api.onrender.com` first, then official `data.gov.in` (public
  demo key, no secret). Prefers Sagar district → Khurai market. Never wipes the DB on
  failure; exits 0 so the cron never red-fails.
- **Cron** `.github/workflows/refresh-mandi-prices.yml` — daily at 09:00 UTC (2:30 PM IST) +
  manual `workflow_dispatch`.
- **UI** `src/components/MandiTicker.jsx` + `src/lib/mandi/mandiApi.js`: 38px reserved height
  (no layout shift), shimmer while loading, tries today → yesterday (amber "कल के /
  Yesterday's" badge) → "coming soon". Fixed left label switches with language; commodity
  and market names always Hindi. Scroll pauses on hover/tap; honours reduced-motion.

> **MANUAL STEP REQUIRED (GitHub Actions secrets):** Add `VITE_SUPABASE_URL` and
> `SUPABASE_SERVICE_ROLE_KEY` as GitHub Actions secrets at
> https://github.com/Himanshu1305/Kissansahyog/settings/secrets/actions — this enables the
> daily price-refresh cron. Without them the cron fails silently; the ticker still shows the
> last cached prices (it won't break), but prices stop updating daily.

> **RESOLVED (2026-10):** migration 0019 is applied to the live DB; the `SUPABASE_ACCESS_TOKEN`
> in `.env` is current and `npm run db migrate` works. Mandi prices refresh via the daily cron.

---

## 18. Weather widget + MSP table + /info page

- **Tables (migration `0020`):** `msp_prices` (govt Minimum Support Prices, admin-managed,
  RLS public-read of active rows; seeded with 21 verified 2026-27 CACP rows) and
  `weather_cache` (5-day Khurai/Sagar Open-Meteo forecast, one row, RLS public-read).
- **Weather refresh:** `refreshWeather()` appended to `scripts/refresh-mandi-prices.mjs`
  (Open-Meteo, no key) — runs every cron pass, independent of the mandi result. The cron
  (`.github/workflows/refresh-mandi-prices.yml`) now runs **every 3 hours** (was daily) so
  weather stays current; mandi upserts are idempotent so 8×/day is fine.
- **Homepage:** compact weather card + MSP highlight (2-col, below the mandi ticker) and a
  conditional amber **rainfall alert** strip (only when a next-48h day has precip > 3mm),
  above the category strip.
- **`/info` page** (`src/screens/Info.jsx`, public): full 5-day weather, MSP with Kharif/Rabi
  pill toggle, and the **MSP-vs-mandi comparison** (green "Above MSP ✓" / amber "Below MSP ⚠️"),
  using `MANDI_TO_MSP` to normalise API commodity names → CACP crop names; a "—" is shown when
  a crop has no MSP mapping or no mandi price. Contacts section links to /resources. Nav gains
  "जानकारी / Info" between Articles and Resources.
- **Admin:** MSP management panel (list, toggle active, add/edit) via new is_admin-checked RPCs
  `get_admin_msp` / `admin_set_msp_active` / `admin_upsert_msp`.
- **Data access:** `src/lib/weather/weatherApi.js` (+ WMO code→i18n map), `src/lib/msp/mspApi.js`.
  Both degrade gracefully (weather → "temporarily unavailable"; MSP → empty/"—") if the tables
  are missing — the app never crashes.

> **RESOLVED (2026-10):** migrations `0019` (mandi) and `0020` (weather/MSP) are applied to the
> live DB; the `SUPABASE_ACCESS_TOKEN` is current. Weather, MSP tables and the mandi ticker are
> live and auto-refresh via the GitHub Actions cron.

---

## 19. Polish: rich rain alert, WhatsApp share, trust carousel, Drone Didi banner

- **Rich rain alert** (`src/lib/weather/rainAlert.js` + `RainAlert.jsx`): classifies the cached
  forecast by IMD 24-h precipitation colour codes (light/moderate → blue strip; heavy → Yellow/
  amber; very_heavy → Orange; extreme → Red), with duration (consecutive rainy days in the 48-h
  window), total mm, and **actionable farmer advice** per level. Only heavy+ (≥64.5 mm) is called
  an IMD "चेतावनी/alert"; light/moderate say "संभावना/expected". Replaces the old amber strip on
  homepage + /info. Unit-tested in `scripts/test/p_rain_alert.mjs`.
- **Edge-to-edge:** homepage/browse content uses `px-2` (≤8 px from the screen edge on mobile).
- **MSP caption** moved below the MSP box as a small italic grey caption.
- **WhatsApp share** (`WhatsAppShareButton.jsx` + `src/lib/share/shareMessages.js`, universal
  `wa.me/?text=`): green button with per-category pre-filled bilingual messages on listing detail;
  a platform message on the homepage hero; an article message on article detail.
- **Trust carousel** (`TrustCarousel.jsx`): dependency-free auto-scroll (6 s), swipe, dots, desktop
  arrows, pause on hover/touch, 200/280 px. Slide 1 typographic; slides 2–3 are captioned
  **placeholders** for official PM/CM photos (marked `TODO` — add with permission); slides 4–6 use
  gradient + caption (drop in PIB/Wikimedia/Unsplash images later). Sits below the hero, above the
  ticker.
- **Drone Didi banner** on the Browse drone_didi tab: drone SVG + scheme text + "सरकारी ड्रोन दीदी
  योजना ✓" badge + a "और जानें / Learn more" link (never a helicopter — `<CatIcon>` quadcopter).

---

## 20. Community features — Kisan Sawaal, Kisan Safalta, Sarkari Yojana

Three admin-managed CMS features sharing the `articles`/`resources` pattern (public
read via anon RLS; writes via is_admin-checked SECURITY DEFINER RPCs). **No new
listing/marketplace logic.** Migration `0021_community_features.sql`.

- **Tables (0021):**
  - `kisan_sawaal` (Q&A) — public read of `is_published`; **anon may INSERT** but RLS
    `with check (is_published = false)` forces submissions unpublished (anti-spam);
    admin answers + publishes via RPCs. Category ∈ land/equipment/crop/pest/weather/
    market/scheme/drone_didi/general.
  - `kisan_safalta` (success stories) — public read of `is_published`; constrained
    anon INSERT (`is_published=false and is_featured=false`) powers the "Share your
    story" form (deviation from the prompt's "admin-only writes", to support that form;
    it stays invisible until an admin reviews). `contact_phone` added for follow-up.
  - `sarkari_yojana` (schemes) — public read of `is_active`; **no anon writes**.
    Category CHECK includes a `market` value (for e-NAM) beyond the prompt's 8.
- **Seeds (idempotent, fixed UUIDs):** 8 verified 2026 schemes (PM Kisan, PMFBY,
  PM KUSUM, KCC, Drone Didi, Soil Health Card, e-NAM, PM-AASHA) in plain class-8 Hindi;
  3 answered example Q&As; 2 clearly-marked placeholder stories (unpublished).
- **Admin RPCs (all require_admin):** sawaal — `get_admin_sawaal`, `admin_answer_sawaal`,
  `admin_set_sawaal_featured/published`, `admin_delete_sawaal`; safalta —
  `get_admin_safalta`, `admin_upsert_safalta`, `admin_set_safalta_published/featured`,
  `admin_delete_safalta`; yojana — `get_admin_yojana`, `admin_upsert_yojana`,
  `admin_set_yojana_active/featured`.
- **Public pages** (`src/lib/community/communityApi.js` + screens, all no-login):
  `/sawaal` (accordion Q&A + category filter + ask-a-question form),
  `/safalta` (story cards with before/after income + "how helped" callout + share form +
  placeholder invite when empty), `/yojana` (scheme cards: green benefit box first,
  expandable eligibility/how-to-apply, `tel:` helpline, official website, deadline pill,
  + MSP-vs-mandi cross-link to `/info#msp`).
- **Nav:** a single **"समुदाय / Community" dropdown** (NavBar) groups all three (opens on
  hover/click on desktop; expands inline in the mobile hamburger) — keeps top-level nav clean.
- **Homepage:** a compact "आज का सवाल / Today's Question" strip (featured Q&As) + a
  "किसान सफलता" teaser (featured stories, or the invite when none), between the govt-contacts
  row and the articles row. **`/info`** gains a "सरकारी योजनाएं" section (3 featured scheme
  cards → `/yojana`).
- **Admin dashboard:** three new panels — Sawaal (Answer & Publish, feature/unpublish/delete),
  Safalta (Review & Publish full form, feature/unpublish/delete), Yojana (toggle active/featured,
  full edit form).
- All strings bilingual (audit 29/29). Tests: `scripts/test/p_community.mjs` (46 static checks —
  RLS/insert policies, every admin RPC gated by require_admin, seed counts, routes, nav, i18n).

> **RESOLVED (2026-10):** migration `0021` is applied to the live DB; the `SUPABASE_ACCESS_TOKEN`
> is current. Community pages, admin management and the homepage/info strips are live with the
> seeded schemes, Q&As and stories.

---

## 21. Homepage redesign v2 (`HOMEPAGE_V2_PROMPT.md`)

A faithful implementation of the approved design mock. Section order (top→bottom):
**mandi ticker → full-bleed hero → trust carousel → rain alert → weather/MSP strip →
category strip → listings → govt contacts → schemes → Q&A → articles → mission bar →
footer.**

- **Edge-to-edge:** full-width strips (ticker, hero, carousel, rain alert, weather/MSP,
  mission bar) span 100% with no side margin; content sections use `px-[14px] sm:px-6`
  (≤14 px from the screen edge on mobile). Verified at 375px.
- **Ticker first:** `MandiTicker` now renders immediately below the nav, before the hero.
- **Hero** (`Homepage.jsx`): full-bleed Pexels wheat photo (opacity 0.45 over `#0f3d1f`
  fallback + a 135° dark overlay), 240/300 px. Eyebrow badge, two-line H1 (income +
  employment), subline, **3 CTAs** (Browse `#3da85f`, New Listing outline, WhatsApp
  `#25D366` → `wa.me`), and a translucent **4-stat bar** pinned to the bottom
  (50+ listings · 9 categories · 30 km · Free).
- **Trust carousel v2** (`TrustCarousel.jsx`): 165/200 px, **5 slides** (welcome +
  PM/CM placeholders with TODOs + Drone Didi + vision), 8 s auto-scroll, swipe, arrows,
  spec-styled dots (active `#4caf70` 14×5, inactive 5×5). Images `onError`-hide to the
  `#0a2010` background. Source notes via i18n.
- **Rain alert v2** (`RainAlert.jsx`): dark-blue `#1c3a70` strip (was amber), blue dot,
  main line "🌧️ अगले X दिन बारिश की संभावना", per-day mm pills (कल/परसों/नरसों from
  `getRainAlert().perDay`), and IMD-classified farmer advice from the heaviest single day
  in the next 48h (`getRainAlert().max48`; only ≥64.5 mm is a "चेतावनी"). Hidden when no
  rain forecast. Shared with /info.
- **Weather/MSP strip** (`WeatherMspStrip` in Homepage): 2-column. Weather cell is
  **location-aware** (user's `village_town`/`pincode`, else "आपके नज़दीक" — no hardcoded
  city; `weather_near_you`), temp + condition + 5-day mini row (day abbrev + icon + mm).
  MSP cell: 4 crops (wheat/soybean/gram/lentil) with live MSP when present (else static
  2026-27 values) and green/amber **↑/↓ vs-mandi chips** via `MANDI_TO_MSP`. The MSP caption
  ("MSP = न्यूनतम समर्थन मूल्य…") sits **below** the prices (italic grey `#aaa`), per the
  explicit positioning requirement.
- **Listings:** each `PublicListingCard` gains a small circular WhatsApp button
  (`#25D366`, top-right 20×20) using `generateListingMessage`; vendor badge (`🏪 व्यापारी`)
  retained with `pr-6` clearance so it's never clipped.
- **Schemes strip** (Phase 10): featured `sarkari_yojana` cards (148 px) with graceful
  empty state when 0021 isn't applied. **Q&A strip** (Phase 11): featured `kisan_sawaal`
  (expand-on-tap answer) + full-width "अपना सवाल पूछें" button, graceful empty message.
- **Articles** images `onError`-hide to a `#2d6a3f` background (no broken-image icon).
- **Vision language:** weather location no longer hardcodes Khurai/Sagar; footer sub-line is
  "USD Vision AI LLP · मध्यप्रदेश, भारत" (not Sagar); copyright updated. Factual Sagar refs
  (mandi names, resource directory, listing districts) kept.
- All new strings bilingual (audit 29/29); rain classifier 10/10.

---

## 22. Colour redesign — Saffron & Forest Green + CSP fix (`COLOUR_REDESIGN_PROMPT.md`)

A palette + technical pass over the homepage and shared chrome.

- **Design tokens** (`src/index.css` `:root`): `--ks-primary` `#2d5a1b` (+dark/light/muted),
  `--ks-accent` `#f59e0b` saffron (+dark/light/muted), warm-cream page bg `--ks-bg` `#faf8f2`,
  card/section bgs, borders, text, semantic (offer/requirement/vendor), `--ks-whatsapp`. `body`
  background is now `var(--ks-bg)`. Components reference tokens via `var(--ks-*)` (Tailwind
  arbitrary values / inline styles).
- **CSP — `public/_headers`** (NEW, the critical fix): a `Content-Security-Policy` allowing
  `img-src` from pexels/unsplash/wikimedia/pib/mpinfo/googleusercontent (+ supabase/open-meteo/
  mandi/data.gov.in on `connect-src`). Vite copies `public/` → `dist/`, so Cloudflare Pages serves
  it. Every external `<img>` (hero, all carousel slides, article covers on home + `/articles`) now
  has `crossOrigin="anonymous"` + an `onError` fallback to a solid/gradient green (never a dark void).
- **Nav:** white bar, saffron `हिं/EN` toggle pill (`LanguageToggle` restyled; callers no longer
  pass `bg-green-700`), forest-green brand/avatar/active links.
- **Ticker:** `--ks-primary-dark` bg, `--ks-primary` label with cream text, white commodities,
  soft-green `#c8e6b0` prices, `--ks-primary-light` separators, 13px.
- **Hero:** image opacity 0.55, `crossOrigin`, `loading=eager`, green fallback; overlay
  `rgba(30,62,18,.82→.48)`; 260/320px; **saffron eyebrow** (accent bg, accent-dark text) and
  **saffron primary CTA**; H1 28/36 weight-900; stats bar `rgba(20,40,12,.80)` with saffron numbers.
- **Carousel:** 180/220px; slide-1 green gradient + saffron accent bar; image slides `crossOrigin`
  + onError→green gradient; saffron dot indicator; 15/12/10px text.
- **Rain alert:** stays blue `#1c3a70`, `10px 14px` padding, 11px pills; **advice strings rewritten**
  (friendlier tone; moderate = "मध्यम बारिश — आज कटाई-छिड़काव बंद रखें…").
- **Weather/MSP strip:** tokenised; 28px primary temp, location-aware, blue `#3b82f6` mm; MSP price
  in primary, above/below chips in primary-muted/accent-muted, caption below prices (`margin-top:6px`).
- **Category strip:** active chip forest-green + white + shadow; inactive card bg + border token; 12px.
- **Listing cards:** cream page / white card / token border; offer/requirement/vendor badges via
  semantic tokens; 13px title, primary price, primary "view" button; section heading gets a 3px
  saffron left border. **Govt contacts:** 3px saffron top/bottom borders. **Schemes/Q&A/Articles:**
  tokenised (Q&A on `--ks-primary-muted`; article covers 72px with green onError fallback).
- **Mission bar** `--ks-primary-dark` + saffron dots (13px); **footer** `#111` with a saffron logo.
- **Article cover images** set in the live DB via service role (parali → pexels 974314, carbon →
  pexels 1482476).
- **Edge-to-edge:** full-width strips span 100%; content sections `px-[14px] sm:px-6` (verified
  cards ≤14px at 375px). Font sizes raised to the Fix-14 minimums.
- Audit 29/29; rain 10/10; community 46/46. New tokens/strings verified; no hardcoded user copy added.

---

## 23. Homepage V3 — full-bleed layout + 2-column hero (`HOMEPAGE_V3_PROMPT.md`)

Full rewrite of `Homepage.jsx` to the approved V3 design.

- **Full bleed everywhere:** no `max-w`/`mx-auto` on any section. Every section spans 100%;
  content padding is `px-[14px] md:px-10` (14px mobile / 40px desktop) via the `PX` constant.
- **Section order:** nav → ticker → **hero** → rain alert → category strip → **listings** →
  weather/MSP → govt contacts → schemes → Q&A → articles → mission bar → footer. (The old
  standalone About/disclaimer block was dropped — not part of the V3 section list.)
- **Hero:** solid `var(--ks-primary)`, **2-column CSS grid on desktop** (`md:grid-cols-2`),
  stacked on mobile. Left = eyebrow + 40/28px H1 + subline + 3 CTAs. Right (desktop only,
  `hidden md:grid`) = a 2×2 grid of **live info cards** (`HeroCard`): weather temp, MSP-wheat vs
  mandi, rain summary (days + per-day mm, or "साफ मौसम"), and listings count. Full-width **5-column
  stats bar** below (adds "MP / पायलट क्षेत्र").
- **Listings:** `grid-cols-2 md:grid-cols-3`, gap 12px. Card = body (badges/title/price/location/
  time) + a footer (`border-top`) holding a full-width green "view" button **and a 34×34 inline-SVG
  WhatsApp button** (`whatsappListingUrl`). Offer badge uses primary-muted, requirement uses
  accent-muted, vendor `#fff7ed`.
- **Weather/MSP:** two bordered cards side by side (`md:grid-cols-2`); 32px green temp, MSP rows with
  per-row separators + vs-mandi chips, caption below.
- **Govt contacts:** `md:grid-cols-3`, cards show icon + title + phone + link, saffron top/bottom borders.
  **Schemes:** `grid-cols-2 md:grid-cols-4` with graceful empty state. **Q&A:** `md:grid-cols-2` featured
  cards + full-width ask button, empty message when none. **Articles:** 2-col, 90px cover (crossOrigin +
  onError → green + category emoji). **Footer:** full-bleed dark `#111`, flex row, saffron logo.
- **WhatsApp — global rule:** every homepage WA button is an **inline `<svg>` `WaIcon`** (hero + cards) —
  no `<img>`, no external/background-image. `WhatsAppShareButton` (listing/article detail) already used
  inline SVG. New `whatsappPlatformUrl()` (hero) + reused `whatsappListingUrl()` (cards) live in
  `shareMessages.js` so the Hindi share text stays out of `Homepage.jsx` (audit-safe).
- New i18n keys (all bilingual): `stat_pilot_*`, `rain_label`, `weather_clear`, `rain_none_5day`,
  `mandi_short`, `hero_listings_sub`, `articles_home_title`, `articles_all_link`. `TrustCarousel` stays
  deleted. Audit 29/29. Verified at 1280px (hero 2-col, listings 3-col, 40px padding) and 375px (right
  cards hidden, listings 2-col, 14px padding); WA buttons 34×34 inline SVG with correct wa.me URLs.

## Homepage v4 (Direction B · Balanced) — 2026-09-24

Full photograph-first rebuild of `src/screens/Homepage.jsx` on a new design system.
- **Tokens:** `src/styles/tokens.css` (imported by `index.css`); old `--ks-primary/--ks-accent`
  aliased to the new palette so other pages are untouched. Noto Sans Devanagari now loaded
  via Google Fonts (`index.html`) and set as the primary body font.
- **Shared kit:** `src/components/home/kit.jsx` — Section, SectionHeader, Button (primary/
  secondary/ghost + `giant`), PhotoTile, InfoTile, CountChip, HomeListingCard, inline
  WhatsApp/Phone SVG icons. Homepage sections built only from these.
- **Self-hosted photos:** `public/images/home/*` (17 Pexels photos + 3 YouTube thumbnails),
  produced by `scripts/fetch-images.mjs` (now `file`-checks every download and rejects
  non-JPEG/PNG). `manifest.json` drives the new `/credits` page (`src/screens/Credits.jsx`).
- **Data helpers:** `src/lib/today/forFarmer.js` (getTodayForFarmer → weather/rain/price/
  advice lines, all via i18n), `src/content/videos.js` (3 verified Hindi videos),
  `src/lib/listings/nearbyCounts.js` (nearby_counts RPC + pincode resolve/save, default
  470117 Khurai), `fetchHomeFeed()` in `listingsApi.js` (recent listings enriched with
  pincode coords → distance-then-recency order). `fetchMandiPrices()` now attaches a `delta`
  per row (trend arrows ↑/↓ in `MandiTicker`).
- **Photo Q&A:** Sawaal ask form takes an optional image (≤2MB jpg/png, best-effort upload
  to `listing-photos`), stored on `kisan_sawaal.photo_url` (migration 0022). Homepage button
  → `/sawaal?ask=1&photo=1` opens the form with the photo field focused.
- **NavBar:** container widened `max-w-6xl → max-w-7xl` (gap-2 px-3) to remove a 1280px
  horizontal overflow — affects all pages, purely more room.
- **Removed for good:** old weather/MSP strip, category chip strip, stats bar, mission bar,
  carousel, About block, standalone rain-alert strip (classifier kept; content now in the
  Today card).
- Screenshot self-review: `docs/review/HOMEPAGE_V4_REVIEW.md` + `home-desktop.png` /
  `home-mobile.png`. Trust-row official PIB/MP photos omitted (unverifiable — see review).

## Fixes + Schemes/Content/Features build — 2026-09-24

Migration **0023_schemes_content_features.sql** (one file) adds: `sarkari_yojana`
alters (slug UNIQUE, government_level, faqs jsonb, documents_required_hi/en,
source_url, last_verified_date, updated_at) + expanded category check (+machinery,
irrigation) + extended `admin_upsert_yojana`; `videos` table + admin RPCs;
`kisan_sawaal` alters (crop, symptom_tag, related_video_id) + `recent_crop_reports`
RPC; `farm_events` table + admin RPCs; `listing_unavailable_dates` + owner-gated
`set_listing_unavailable` RPC. Seeds: 4 MP state schemes, 8 central-scheme FAQ/doc
backfill, 16 videos, 16 Q&A (incl. a soybean/yellow_leaves pest group), 3 KVK events.

- **Scheme pages**: `src/screens/SchemeDetail.jsx` (`/yojana/:slug`, 7 sections +
  FAQPage/Article JSON-LD + WA share); `Yojana.jsx` reworked to `level` prop
  (`/yojana` grouped, `/yojana/central`, `/yojana/mp`). API: `fetchYojanaBySlug`,
  `fetchYojanaByLevel`, `yojanaDocs`, `faqQ/faqA` in communityApi. Routes registered
  static-before-dynamic in App.jsx.
- **Drone Didi**: `src/screens/DroneDidi.jsx` (`/drone-didi`), linked from बाज़ार nav.
- **Videos**: `src/lib/videos/videosApi.js`, `src/screens/Videos.jsx` (`/videos`),
  thumbnails in `public/images/videos/`. Homepage featured videos read the table;
  `src/content/videos.js` deleted. Cross-links via `kisan_sawaal.related_video_id`.
- **Pest banner**: `src/lib/pest/pestApi.js` + homepage banner below hero (framed as
  "recently asked", never an alert). Ask form gained optional crop/symptom_tag.
- **Calendar**: `src/components/AvailabilityCalendar.jsx` on equipment-offer detail
  (owner toggles busy/free via RPC; others see "बुक्ड").
- **Events**: `src/lib/events/eventsApi.js`; shown on `/info` and, within 7 days, in
  the homepage hero. **These KVK events need ongoing admin maintenance.**
- **Nav**: NavBar rebuilt to 7 items (बाज़ार▾ · मंडी भाव · मौसम · सरकारी योजनाएं▾ ·
  किसान सवाल · वीडियो · संपर्क), edge-to-edge (`w-full`, no max-w/mx-auto).
- **Hero photo** replaced + re-cropped (pexels 20445169); **list-thresher.jpg** added;
  carbon article cover self-hosted at `/images/articles/carbon.jpg`.
- **SEO**: `public/sitemap.xml` (all scheme slugs + new pages) + `public/robots.txt`.
- Admin `sarkari_yojana` form extended (slug/level/docs/source/verified + FAQ editor).

## Backlog (logged, not built)
- Rating/trust layer on listings & transactions (needs real usage volume first).
- Digital lease/sharecropping agreement PDF template generator.
- Weekly input price tracker (Urea, DAP, diesel at named local shops).
- WhatsApp Business API opt-in for personalised rain/weather threshold alerts (needs
  a paid, approved WhatsApp Business API account).
- Group/bulk input buying coordination.
- Produce transport/logistics as a 10th marketplace category.
- Migrant/seasonal labour coordination across districts.
- Voice search ("बोलकर खोजें") via Web Speech API.
- Crop Doctor / AI photo diagnosis (potential separate product).

## मौसम (/mausam) & MSP (/msp) build — 2026-09-25

Migration **0024_mausam_msp.sql**: `weather_cache_v2` (grid_key PK, current/hourly/
daily/season_rain jsonb) + `weather_grid_requests` (anon upsert) replacing the
single-row `weather_cache` (dropped); `mandi_prices.arrivals_tonnes`;
`alert_subscriptions` (anon writes via `subscribe_alert` RPC, upsert on phone+channel,
phone regex CHECK, no anon read; admin list/CSV/deactivate); `procurement_centres`
(+admin CRUD, seeded e-Uparjan wheat/soybean + e-NAM); `page_faqs` (admin CRUD, 8
mausam + 8 msp seeded); `site_settings` (public read/admin write, seed
`mausam_msp_content_reviewed=false`); Bhavantar scheme row in sarkari_yojana.

- **Weather refresh**: `scripts/refresh-data.mjs` (renamed from refresh-mandi-prices;
  `npm run refresh-prices` still points here; 3-hourly cron unchanged). Populates every
  pilot cell + cells requested in the last 30 days: Open-Meteo forecast (48h hourly,
  16-day daily incl. wind_max/et0/precip-prob/soil-moisture) + archive season rainfall
  (to-date vs 2015-based 10-yr normal). No browser Open-Meteo calls.
- **Mandi history backfill**: `scripts/backfill-mandi-history.mjs` +
  `.github/workflows/backfill-mandi-history.yml` (manual). **Needs `DATA_GOV_IN_API_KEY`
  repo secret — NOT yet added; backfill NOT yet run** (see docs/review/MAUSAM_MSP_REVIEW.md).
  Earliest date / rows-per-commodity to be recorded here after the owner runs it.
- **Pages**: `src/screens/Mausam.jsx` (13 sections), `src/screens/Msp.jsx` (+/msp/:crop,
  11 sections, default गेहूं Oct–Mar / सोयाबीन Apr–Sep). Shared kit in
  `src/components/pages/shared.jsx` (PageExplainer, LocationControl, FaqAccordion+schema,
  ShareWhatsApp, DailyUpdateSignup, TrendChart/TwoBar/MonthBars inline-SVG + sr-only
  tables, ReviewTag). Rules in `src/lib/weather/weatherRules.js`; crop map in
  `src/content/crops.js`. Data APIs: `weatherApiV2.js`, `pagesApi.js`, mandi per-crop
  functions in `mandiApi.js`.
- **Wiring**: nav मौसम→/mausam, मंडी भाव→/msp; homepage Today card reads
  weather_cache_v2, tiles link to /mausam & /msp, ticker items → /msp/:crop; /info
  drops weather+MSP, keeps events/schemes/contacts, client-redirects #weather→/mausam
  and #msp/#mandi→/msp. Sitemap has /mausam, /msp, 10 /msp/:crop (daily).
- **Two honesty rules** enforced in copy: never predict prices; never call our rain
  badge an IMD warning (links to IMD as authority).
- **Content review gate**: actionable sections (ActionWindows, per-crop advice, MSP
  procurement + below-MSP routes) show "समीक्षाधीन" until an admin flips
  `mausam_msp_content_reviewed`. Review doc: docs/content/MAUSAM_MSP_CONTENT_REVIEW.md.

## मौसम/MSP polish + /fasal-salah + /sawaal search — 2026-09-25

- **InfoTip** (`src/components/pages/shared.jsx`): click-to-open point-of-need tooltip (props label/label_en), used on /mausam (IMD badge, 48h rain-prob, ActionWindows).
- **/mausam:** IMD badge reframed to confident sourcing (still distinct from official IMD; links to mausam.imd.gov.in). Crops-season section **moved to new `/fasal-salah`** (`src/screens/FasalSalah.jsx`, route added, in बाज़ार dropdown + sitemap); /mausam shows a teaser card. Source citations on season-rainfall (2015–2025) and 16-day. 48h strip now shows rain probability %.
- **/msp:** all-crops snapshot table (`fetchMandiSnapshot` in mandiApi); today table shows all reporting mandis sorted desc + one-mandi note; trend chart has day-dot markers + green/amber above/below-MSP shaded band + takeaway above & below + "केवल N दिन का डेटा" note; calculator shows step-by-step arithmetic. Trend fix: 7/30/90 windows query correctly — identical series is due to only ≤3 distinct dates (daily-snapshot source), not a bug.
- **Nav:** बाज़ार + सरकारी योजनाएं dropdowns switched to click-to-open / click-outside-close (`useRef` + document mousedown listener); hover removed.
- **/sawaal:** category chips now show counts; debounced client-side search over question_hi/en; no-match empty state with ask button.
- **/drone-didi:** all 8 drone_didi listings are `is_test_data=true` → each card badged "उदाहरण लिस्टिंग" (`is_test_data` added to `fetchHomeFeed` select).
- **backfill-mandi-history.mjs:** filter casing fixed (lowercase `filters[state]` + MP-wide token match). Confirmed resource 9ef84268 is a daily snapshot — cannot backfill multi-year history; needs a different Agmarknet source (backlog).

## Backlog (added 2026-09-25)
- Real IMD data feed (api.imd.gov.in: district warnings, 7-day forecast, agromet advisory).
- Widen mandi collection to named MP mandis beyond Sagar (most commodities report from one mandi/day).
- Voice question asking on /sawaal; AI-generated Q&A answers with "AI-जनित, समीक्षा लंबित" labelling (Crop Doctor extension).

## Geofencing / Location / Mandi search / PWA / Inputs — 2026-09-25 (migration 0025)

Full write-up: `docs/review/PHASE0-8_FULL_REVIEW.md` + `PHASE0_GEOFENCING_FINDING.md` +
`E2E_TEST_REPORT.md`. Migration `0025_visibility_location_inputs.sql`.

- **Geofencing (single source of truth: `src/lib/distance.js`).** `partitionByRadius(rows,
  {getDistance,getCategory,getWide})` → `{primary, fallback}`: primary = ≤30 km **plus**
  wide-eligible+flagged rows to `WIDE_RADIUS_KM` (100); fallback = the 30–50 km ring,
  returned **only when zero within-30 results**. Used by `fetchNearby` (Browse) and
  `fetchHomeFeed` (homepage "आपके आसपास" feed + /drone-didi; when no viewer center is
  known, distance filtering is skipped and newest-first is kept). `nearby_counts` RPC stays
  strict ≤ `p_km` (local-density indicator). `RADIUS_KM=30`, `FALLBACK_RADIUS_KM=50`,
  `WIDE_RADIUS_KM=100`, `WIDE_ELIGIBLE_CATEGORIES=['bhusa','agri_inputs']`.
- **Wide-visibility opt-in (Phase 1).** `listings.wide_visibility` (default false).
  `create_listing` is now 10-arg (`p_wide_visibility`) and **rejects** the flag server-side
  for any category other than `bhusa`/`agri_inputs` (`wide_visibility_not_allowed`). The
  listing form shows the opt-in checkbox (default off) only for those two categories.
- **Unified LocationControl (Phase 2).** `src/components/pages/shared.jsx` `LocationControl`
  (props `{value:{pincode,latitude,longitude,label,source}, onChange}`) +
  `src/lib/location/locationStore.js` (fetchAllPincodes/nearestPincode/recent-locations/
  geo-prompt dismissal — the `pincodes` table is the single coordinate source). Replaces the
  three prior controls on homepage, /mausam, /msp. GPS grant → precise lat/lng for weather +
  nearest-pincode for pincode features; manual pincode always reachable; ≤5 recent chips.
- **MSP ranking + search (Phase 3).** `/msp/:crop` today table adds a **दूरी** column, sorted
  nearest-first via `src/content/mandiCoords.js` (approx town centres — informational only).
  Mandi search box sources names from `SELECT DISTINCT market` (`fetchMandiMarkets`); selecting
  shows that mandi's latest price + date, or an honest empty state (`fetchMandiForMarket`).
  **Deliberately NOT geofenced** — `lib/mandi/mandiApi.js` carries a 3c header comment and a
  static regression test asserts it never imports the cutoff logic.
- **PWA (Phase 5) — CHANGED from autoUpdate to `prompt`.** `vite.config.js` `registerType:
  'prompt'`, `injectRegister: null`; SW registered via `virtual:pwa-register/react` in
  `src/components/PwaPrompts.jsx`. Runtime caching: live data (supabase/open-meteo/mandi/
  data.gov) = NetworkFirst; static shell precached; fonts CacheFirst. `clientsClaim` on (for
  offline-first) but **no skipWaiting** — a new build waits for the user's explicit reload via
  the update banner. PwaPrompts also renders the offline banner + a returning-visitor install
  prompt (visit ≥ 2, 14-day dismissal). Manifest name "किसान सहयोग" / short_name "Kisan
  Sahyog", theme `#24733F`, bg `#FBFAF5`.
- **CSP (Phase 4).** `public/_headers`: `fonts.googleapis.com` in `style-src`,
  `fonts.gstatic.com` in `font-src` — the Google-Fonts console notice is gone (live-verified).
- **Input price tracker (Phase 6).** `input_prices` table (public read active; admin RPCs
  `get_admin_input_prices`/`admin_set_input_price_active`/`admin_upsert_input_price`);
  `src/lib/inputs/inputsApi.js`; shown on `/info` as "कृषि सामग्री के भाव"; admin panel in
  `/admin`. **CAVEAT:** the 3 Khurai shops × Urea/DAP/diesel are a **seeded starting point
  that needs ongoing admin maintenance** (same as KVK events) — they are not auto-refreshed.
- **Tests (Phase 7, permanent).** `scripts/test/p_0025_visibility.mjs` (backend/logic/static
  config) + `e2e/phase10_location_pwa.spec.js` + `e2e/phase10_downstream.spec.js`. These are
  part of the baseline for every future Phase 7a.
- **Deployed:** https://9a21f891.kissansahyog.pages.dev (live-verified: fonts/CSP clean,
  mandi ticker live, PWA installable).

## Location out-of-area fix + Mandi comparison — 2026-09-25 (0026, no migration)

Full write-up: `docs/review/LOCATION_MANDI_COMPARISON_REVIEW.md`. No schema change.

- **Out-of-service-area fix (root cause: nearest-village match had no distance sanity check).**
  `src/lib/location/locationStore.js` adds `SERVICE_AREA_KM = 100`. `LocationControl` (in
  `src/components/pages/shared.jsx`) now: forces a fresh GPS fix (`enableHighAccuracy:true,
  maximumAge:0`); if the nearest seeded pincode is > 100 km it does NOT commit — it shows the
  honest amber "…सेवा क्षेत्र से बाहर… निकटतम उपलब्ध जगह: <village> (~N किमी)" notice with the
  manual pincode override + an explicit "<village> का डेटा फिर भी देखें" opt-in button. Applies
  on `/mausam`, `/msp`, homepage (single shared component). A `?debug=1`-gated overlay prints
  raw lat/lng + per-village distances. Permission-denied fallback unchanged.
- **Mandi comparison (`/msp` + `/msp/:crop`).** View toggle फसल अनुसार / मंडी तुलना. Compare view
  = a `MandiCompare` component (bottom of `src/screens/Msp.jsx`): chip picker over DISTINCT
  market, **max 3** (4th blocked with a message), **auto-nearest 1–3 when none selected**
  (distance ranking + `mandiCoords`). Table rows = CROPS, columns = shown mandis + far-right
  MSP; best price per row highlighted green when ≥2 mandis. Mobile: table-only horizontal
  scroll, sticky commodity column, no whole-page overflow. Data: `fetchMandiForMarkets(markets)`
  + `fetchMandiMarketsWithDistrict()` in `mandiApi.js`.
- **Consistent price staleness (Phase 3).** `priceStaleness(date)` + `StaleTag` + `PriceCell`
  in `shared.jsx`, used by every mandi table (crop-first today, snapshot, search result,
  comparison): today/yesterday plain; older → amber "पुराना भाव (dd/mm)"; never recorded → "—"
  with a not-recorded `title` tooltip.
- **Tests (permanent).** `scripts/test/p_0026_location_compare.mjs` (19) +
  `e2e/phase11_location_compare.spec.js` (4). Part of every future Phase 7a baseline.
- **Deployed:** https://e1719ed0.kissansahyog.pages.dev (live-verified on mobile emulation with
  a Hyderabad location: out-of-area message shown; comparison table renders).

## Weather/Location split + missing mandi rates + 5-mandi compare — 2026-09-25 (migration 0026)

Full write-up: `docs/review/WEATHER_LOCATION_SPLIT_REVIEW.md`. Migration
`0026_weather_cache_write.sql` (the `cache_weather_cell` anon RPC).

- **LocationControl now emits a SPLIT location** (`src/components/pages/shared.jsx`):
  `{ rawCoords:{latitude,longitude}|null, matchedVillage:{pincode,village_town,distanceKm}|null,
  label, source }`. **rawCoords = weather (global, ungated); matchedVillage = village-anchored
  features (30km listings, आपके आसपास counts, MSP mandi distance-ranking), null when >100km.**
  `initialLocation`, recent-location chips (1g), and all consumers updated. Weather-only pages
  (`/mausam`, `/fasal-salah`) pass `showOutOfArea={false}` (no village-feature notice).
  **FasalSalah was still on the old pre-0025 `pincode`/`place` props (a latent crash) — migrated.**
- **Weather is global with a cache-miss live fetch (1b-i).** `weatherApiV2.fetchWeatherCell`:
  exact cached cell → **live Open-Meteo** (`fetchLiveWeatherCell`, any lat/lng) → nearby cached
  cell ONLY if within 30km (never a far MP cell). The live result is persisted via the
  `cache_weather_cell` SECURITY-DEFINER RPC (anon-callable; `weather_cache_v2` is otherwise
  service-role-write) + `requestGridCell` for the cron. `fetchNearbyCounts` returns honest zeros
  for a missing/invalid pincode (no silent Khurai fallback).
- **Missing mandi rates (Phase 2).** Diagnosis: data is fresh but sparse (2–5 mandis/commodity;
  उड़द has zero rows ever). `/msp` मंडी तुलना: an empty cell whose commodity is priced elsewhere
  shows a cross-mandi InfoTip hint ("यहाँ उपलब्ध नहीं — निकटतम भाव: <mandi> ₹<price> (dd/mm)",
  from `fetchMandiSnapshot`); commodities absent everywhere get an honest note (dynamic list).
  Cron confirmed healthy (writes today's date).
- **Mandi comparison cap 3 → 5** (Phase 3): `prev.length >= 5` blocks the 6th; auto-nearest picks
  up to 5; 7-col mobile keeps the sticky commodity column + table-only scroll (no page overflow).
- **Tests:** `scripts/test/p_0027_weather_split.mjs` (24) + `e2e/phase12_weather_split.spec.js`
  (7); `p_0026` cap/threshold assertions + `phase11` cap updated to the new reality. Backend
  28 pass / 1 fail (only `v11_phase6` = TD-1 i18n debt); E2E 22/22.
- **OPEN: Phase 1e real-device check is PENDING** the owner's phone test at `/mausam?debug=1`
  (the overlay shows raw lat/lng + accuracy + timestamp) — emulation once falsely passed, so it
  is not marked complete on emulation alone.

## Location naming: reverse geocoding + Cloudflare IP city — 2026-09-26 (no migration)

Full write-up: `docs/review/LOCATION_NAMING_REVIEW.md`. Builds on the `{rawCoords,
matchedVillage}` split. Turns GPS coordinates into real place names so a raw lat/lng is
NEVER shown in a user-facing view (only the `?debug=1` overlay may show coords).

- **Reverse geocoding (Phase 1).** `reverseGeocode(lat,lng)` in `locationStore.js` calls
  BigDataCloud's free/keyless `reverse-geocode-client?...&localityLanguage=hi` (Hindi names;
  session-cached). CSP `connect-src` now allows `https://api.bigdatacloud.net`. In
  `LocationControl.detect`, an OUT-OF-AREA GPS fix is reverse-geocoded and the name stored as
  `rawCoords.placeName` + used as the display `label`; an IN-AREA fix keeps `matchedVillage`'s
  own name (1a-ii consistency). Failure → nearest village "लगभग … के पास" (<50km) else "आपकी
  जगह" — never raw coords. `?debug=1` overlay now also shows the resolved place name.
- **Cloudflare IP city (Phase 2).** `functions/geo.js` — the project's FIRST Cloudflare Pages
  Function; a top-level `functions/` dir is auto-picked-up by `wrangler pages deploy dist` and
  routes at `/geo`, returning `request.cf` (city/region/country/lat/lng) as JSON.
  `fetchIpCity()` (session-cached) calls it on first load; `LocationControl` shows a soft
  "आप शायद [city] के आसपास हैं" suggestion (no permission prompt) with a one-tap confirm.
  GPS supersedes it; unavailable `cf.city` (local dev / `vite preview` / VPN) falls through
  cleanly to manual pincode (no error).
- **Ordered prompt (Phase 3).** First-visit `LocationControl` reads as: GPS (सटीक) → IP city
  suggestion → या पिनकोड डालें (inline). Manual pincode unchanged and always reachable; after a
  choice the prompt collapses to "📍 <place> · जगह बदलें".
- **Tests:** `scripts/test/p_0028_location_naming.mjs` (20) + `e2e/phase13_location_naming.spec.js`
  (4). Backend 29 pass / 1 fail (only `v11_phase6` = TD-1), E2E 26/26.
- **Deploy note:** the IP suggestion only works on Cloudflare's edge (production) — `vite
  preview` has no Pages Function, so it no-shows locally (expected). The `/geo` route was
  verified with `npx wrangler pages dev dist` before building the client.

## Village geocoding + Land acreage — 2026-09-26 (migrations 0027–0031)
Prior build (see docs/review/VILLAGE_GEOCODING_REVIEW.md + LAND_ACREAGE_REVIEW.md):
- **Village geocoding (0027):** `village_coordinates` cache/queue + `geocode_state` 1/sec slot +
  `/geocode` Cloudflare Pages Function (Nominatim proxy, UA header) + client drain worker; village name is
  now the primary distance anchor (pincode = fallback), coords denormalized onto each listing.
- **Land acreage (0028–0031):** `size_range` buckets → numeric `details.size_acres` (no cap); per-acre
  rate label for fixed/ठेका; optional per-listing contact stored in a private `listing_private_contact`
  table (Land-only, anon-locked) revealed via `get_listing_contact`.

## Legal / Agro-Forestry / Availability / Profile — 2026-09-26 (migration 0032)
Full write-up: docs/review/COMBINED_LEGAL_AGROFORESTRY_AVAILABILITY_PROFILE_REVIEW.md. One migration
`0032_legal_agroforestry_availability_profile.sql`; content seeded by `scripts/seed_agroforestry.mjs`.
- **Rules compliance (P1):** `create_listing` now requires `p_rules_agreed=true` (12-arg; old 11-arg dropped
  — no bypass). Seller checkbox on every listing form + a one-time buyer modal (`BuyerComplianceGate`,
  document capture-phase interceptor on any `tel:`/`wa.me` tap, `localStorage.ks_buyer_agreed_v1`). Both link
  to `/terms`.
- **Agro-Forestry (P2):** `sarkari_yojana` category += `horticulture`; 2 verified MP schemes
  (`fal-podharopan-yojana`, `aushadhi-sugandhit-fasal-vistar`) render via `/yojana/:slug`; `/agro-forestry`
  hub (`AgroForestry.jsx`, in बाज़ार nav) + a researched Hindi intercropping article
  (`/articles/intercropping-madhya-pradesh`, ए.के. दीक्षित credit). `ArticleDetail` now renders summary +
  `## ` H2s + Article/FAQPage JSON-LD. 2 CC BY-SA Commons images in `public/images/agroforestry/` (+ /credits).
- **Availability (P3):** `listings.is_available` + `contact_click_count`/`availability_changed_at`/
  `last_contact_at`; `set_listing_availability` (owner toggle, My Listings), `increment_contact_click` (anon),
  `get_availability_nudges` (owner). Reusable `AvailabilityNudge` (My Listings + homepage), WhatsApp-ready.
  `is_available=false` filtered from fetchNearby/fetchRecentListings/fetchHomeFeed/nearby_counts; `get_my_listings`
  returns availability (owner sees all).
- **Admin (P4/P6):** `get_admin_availability` + `get_admin_availability_listings` (AvailabilityPanel) and
  `get_admin_farmer_profiles` (FarmerProfilesPanel) in `/admin` (require_admin); admins also reach `/admin`
  via a profile-page card.
- **किसान profile (P5):** `profiles.land_acres/main_crops/interest_lease/interest_equipment` (optional at
  signup + editable on Profile via `update_kisan_profile` + shared `KisanFields`); no-sell disclaimer;
  anon-locked (owner+admin only).
- **PWA banner (P7):** `PwaInstallBanner` on the homepage (below nav) — Android native prompt / iOS
  instructions / hidden in standalone / session-only dismiss; complements the PwaPrompts returning-visitor prompt.
- **Tests:** `scripts/test/p_0032_legal_availability_profile.mjs` (29) + `e2e/phase16_legal_availability.spec.js`
  (4). Every listing-creating backend test now passes `p_rules_agreed:true`.

## Sawaal grid · PWA banner fix · BackButton · Ticker · Agro Forestry depth — 2026-09-26 (no migration)
Full write-up: docs/review/SAWAAL_PWA_BACKBUTTON_TICKER_AGROFORESTRY_REVIEW.md.
- **/sawaal**: Q&A cards now a `/yojana`-style responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`,
  `max-w-6xl`), line-clamped answer preview, `data-testid="sawaal-card"`. Chips/search unchanged.
- **PWA install banner (`PwaInstallBanner.jsx`)**: fixed — visibility no longer gated on
  `beforeinstallprompt` (that event rarely fires for real visitors). Shows for all non-standalone,
  non-dismissed visitors; button = native prompt when available, else manual install steps
  (`pwa_ios_help` / new `pwa_install_help`). Root cause + test blind-spot documented in the review.
- **Shared `BackButton.jsx`** (+ exported `goBack(navigate, location, fallback)`): "← वापस"
  (`nav_back`), `history.back()` when `location.key !== 'default'`, else fallback route. Applied to
  SchemeDetail (`/yojana`), AgroForestry (`/`), DroneDidi (`/`), Msp (`/msp`|`/`), ArticleDetail
  (`/articles`), FasalSalah (`/mausam`), ListingDetail (Screen back → `goBack`, `/browse`).
- **Mandi ticker**: items opt out of the global 44px tap-target `min-height` via `min-h-0` + inner
  `flex items-center` → text vertically centered in the 38px strip (was clipped).
- **/agro-forestry depth**: expanded FDA section (2 paras), embedded article summary + 2 key points
  (`content/agroforestry.js` `AGRO_KEYPOINTS`) with "पूरा लेख पढ़ें →"; hero verified rendering; no
  cross-links added (no real matching sawaal/video content). BackButton added.
- **Tests**: `e2e/phase17` (grid columns, PWA fresh/standalone, BackButton fallback vs history, ticker
  centered) + `e2e/phase16` PWA blind-spot fix. Backend 32/1 (v11_phase6 TD-1 only); maintained E2E 38/38.

## Legacy E2E cleanup · Transport category · Voice search · Mandi labeling · IMD research · i18n debt — 2026-09-30
Full write-up: docs/review/TRANSPORT_VOICE_MANDI_IMD_TECHDEBT_REVIEW.md. Migration `0033_transport_category.sql`.
- **Legacy E2E cleanup (Phase 1):** the 22 stale `e2e/phase2–9` specs were rewritten to current reality
  (homepage-as-landing → /welcome; post source step; numeric `#f_size_acres`; asset VILLAGE name not pincode;
  mandatory `rules-agree-checkbox`; CategoryStrip `chip-<cat>` with Land last; integer "N km away") and the
  redundant phase8 offline test was removed (covered by phase10_location_pwa). Result: `e2e/phase2–9` = 25 green.
- **Transport / logistics = 10th marketplace category (Phase 2):** anchored like every other category (the
  transporter lists at their own location; standard 30/50 km radius; NO route model, NO wide-visibility).
  `catalog.CATEGORIES`/`CATEGORY_META` (+`VEHICLE_TYPE`, `TRANSPORT_RATE_BASIS`), `registry` (ENABLED +
  EXTRAS), `components/categories/transport.jsx` (details `{ vehicle_type, capacity, rate_basis, rate_amount }`;
  vehicle_type + rate_basis required, capacity + rate optional). Migration `0033` widens `listings_category_check`
  to include `transport` and adds its `create_listing` validation (12-arg signature unchanged). Placement: NavBar
  बाज़ार dropdown, homepage `CATEGORY_TILES` tile + `LIST_IMG` fallback (reuses `list-tractor.jpg` — a
  tractor-trolley; a dedicated truck photo can be swapped in later), browse/detail/post are category-agnostic,
  `/?cat=transport` added to `public/sitemap.xml`. Seeded 4 dummy transport listings (`is_test_data`, 3 offers +
  1 requirement) via `scripts/seed_dummy.mjs` (now 54 rows total). **Category-count audit (2d):** no hardcoded
  "N categories" is rendered anywhere (`stat_categories_label` exists but is unused since Homepage v4 dropped the
  stats bar); the `nearby_counts` RPC deliberately covers a 6-category subset (already excludes agri_inputs), so
  transport is not shown there — consistent with that precedent. Land stays LAST in every ordered list.
- **Voice search (Phase 3):** `बोलकर खोजें` mic on the `/sawaal` search box (`VoiceSearchButton` +
  `lib/voice/voiceSearch.js`). **Primary = Web Speech API** (`SpeechRecognition`/`webkitSpeechRecognition`,
  `lang='hi-IN'`, interim results fill the field live) — free, client-side, no key; covers the pilot's
  Chrome-Android audience. **Fallback = Gemini `gemini-3.5-transcribe`** via the new `functions/transcribe.js`
  Pages Function (record with MediaRecorder → POST same-origin → function calls Gemini with the key
  server-side; key NEVER in the browser). Fallback is offered ONLY on browsers lacking SpeechRecognition AND
  only when the function's `GET /transcribe` probe reports `{configured:true}` AND MediaRecorder has a usable
  mime — otherwise no mic is shown (no broken icon). Failures (permission denied, no-speech, network) show a
  brief bilingual message and reset the button — never stuck listening. **Rate limit (3c-i):** DB-backed
  `check_transcribe_rate` RPC + `voice_transcribe_calls` table (migration `0034`), 20/IP/hour, fail-open if the
  function's Supabase env is unset. **No CSP change** — the browser only calls same-origin `/transcribe`
  (`connect-src 'self'`); Gemini is reached server-side. **`GEMINI_API_KEY` is now set in Cloudflare Pages**
  (environment variable), so the `/transcribe` fallback is live for Safari/Firefox users; the primary
  Web-Speech path handles Chrome/Android. (It is not in local `.env`; set it there only for local fallback testing.) Verified locally (wrangler): GET
  `{configured:false}`, POST `503 not_configured`; rate-limit RPC 20 allowed / 5 denied. Migrations this prompt:
  `0033` (transport) + `0034` (voice rate limit) — split because each phase is committed independently.
- **Mandi data — diagnosed, then honest labeling (Phase 4):** *Diagnosis (4a):* the 3-hourly cron
  (`refresh-mandi-prices.yml`, 8 runs/day) is healthy — over the last 2 weeks 29/39 runs succeeded, and
  **all 10 failures predate the 2026-09-25 Node-22 WebSocket fix**; every run since 09-26 is green (20/20).
  Data lands near-daily (only gap in the window was 09-24, inside the pre-fix failure window). MP-wide
  collection is **already the default** (`refresh-data.mjs` `getOfficialPool()` fetches an MP-wide pool and
  merely *prefers* Sagar rows within it; `is_sagar_district=false` when Sagar has none) — not an emergency
  fallback. Coverage: Wheat/Soyabean/Garlic/Maize/Mustard reliable daily; Gram/Paddy/Lentil/Moong sparse
  (data-availability reality, already documented). *So per 4b no refresh-script change was needed.*
  *Labeling (4c):* no "बासी/स्टेल" wording existed. The staleness rule (`priceStaleness`/`StaleTag`/`PriceCell`
  in `pages/shared.jsx`) now returns `today|yesterday|older` and the **exact date is always shown** next to a
  non-today price — neutral "कल का भाव (dd/mm)" (yesterday) / amber "पिछला भाव (dd/mm)" (older), never a
  tooltip; never-recorded commodities keep "—". The homepage `MandiTicker` no longer shows an undated "कल के"
  badge or "coming soon" when data is 2+ days old: `fetchMandiPrices` now falls back to the most-recent
  available date and returns `{day,date}`, and the ticker renders a dated "कल का भाव/पिछला भाव (dd/mm)" badge.
- **IMD feed research — NOT integrated (Phase 5, decision-gated):** researched the live IMD API surface
  (`api.imd.gov.in`). The modern API *does* expose a genuinely district-granular feed —
  `GET https://api.imd.gov.in/api/v1/districtwarning?id=<district_id>` returns 5-day color-coded warnings
  (Red/Orange/Yellow/Green) per district — which would meaningfully improve on our derived classification.
  **But real requests confirmed it is not usable right now:** `districtwarning` returns `401 {"error":"API key
  missing"}` and sends **no CORS header** (browser-blocked), and the legacy `city.imd.gov.in` forecast returns
  `401 "IP … needs to be whitelisted"` (server-IP allow-list). The key is **registration-gated** (create an
  account at api.imd.gov.in + accept terms; not a public/demo key), Sagar's district id can't be enumerated
  without access, and any use needs a server-side proxy for CORS. Per the 5b gate, **no integration was forced**
  — the existing `/mausam` behavior (derived classification + link to mausam.imd.gov.in) is unchanged. **Path for
  later** (when the owner registers + gets a key): add a `/imd-warning` Cloudflare Function proxy (key
  server-side, same pattern as `/transcribe`) calling `districtwarning?id=<Sagar id>` and render an official IMD
  badge on `/mausam` alongside the derived one. No code change this phase.
- **Tech debt TD-1 cleared (Phase 6):** the four hardcoded Hindi strings moved into `strings.js` —
  `DroneDidi.jsx` official paragraph → `dd_official_body`; `Homepage.jsx` `किमी` → `unit_km` and `अ.दी.` →
  `founder_initials`; `shared.jsx` InfoTip aria-labels → `infotip_more`/`infotip_close`; `Admin.jsx` `(हिं)` →
  `label_suffix_hi` (+ dropped the `unit:'बोरी'` form default, which the RPC coalesces). `transport.jsx` added
  to the `v11_phase6` label allowlist + parity list. **`v11_phase6` is now fully green (29/0)** — no longer the
  intentionally-red backend suite.
- **Tests (Phase 7, all permanent):** new `scripts/test/p_transport.mjs` (11) + `scripts/test/p_mandi_labeling.mjs`
  (9) + `e2e/phase18_transport.spec.js` (2) + `e2e/phase19_voice_mandi.spec.js` (5, voice fully mocked — never
  hits a live Gemini API). `priceStaleness` extracted to pure `lib/mandi/staleness.js` for unit-testing.
  **Full E2E = 70/70** (was 63 baseline; only increased), key backend suites green (p_transport 11, p_mandi_labeling
  9, v11_phase6 29, p_0032 29, p_0025 44). Full write-up:
  `docs/review/TRANSPORT_VOICE_MANDI_IMD_TECHDEBT_REVIEW.md`.
- **Screenshot-review fix (Phase 8):** the ticker now classifies staleness via the SAME local-time
  `priceStaleness()` as the MSP `PriceCell` (it previously compared against a UTC day-boundary, so at IST
  early-morning the ticker said "आज" while the MSP said "कल का भाव" for the same date). `mandi_title` neutralized
  to "मंडी भाव" so it never contradicts the dated badge. Screenshots (1280×800 + 375×812) of transport browse,
  the /sawaal mic (shown vs hidden), the ticker + MSP "कल का भाव (dd/mm)" labeling, and /mausam were all viewed.
- **Deployed & live-verified:** https://b67e6a91.kissansahyog.pages.dev — all routes 200 (incl. `/?cat=transport`);
  the live `/transcribe` edge function returns `{configured:false}` (graceful, no key yet) and `/geocode` is
  intact; the homepage mandi ticker shows **live prices** with the honest "कल का भाव (30/09)" badge; the transport
  browse renders 2 cards; the `/sawaal` voice mic is present. Sitemap carries the transport route.

## Kisan Mela calendar — nationwide, self-sourced, AI-assisted discovery — 2026-10-01 (migration 0035)
Full write-up: docs/review/KISAN_MELA_REVIEW.md. ONE migration `0035_kisan_mela.sql` for the whole feature.
- **Schema (Phase 1):** `kisan_mela` (name_hi/en, organizer, venue, address, state/district, lat/long,
  event_date_start/end, `is_date_confirmed` + `expected_period` for the honest "अपेक्षित" pattern,
  `category_tags text[]` CHECK-constrained to seeds/machinery/livestock/horticulture/scheme_scientist/general,
  highlights, contact, `source_url` NOT NULL, `last_checked_date`, `submitted_by_user`, `moderation_status`
  pending/approved/rejected, `is_active`) + `kisan_mela_interest` (mela_id, user_id → profiles, PK both).
  **RLS:** anon/auth read only `is_active AND moderation_status='approved'`; constrained anon INSERT (submissions
  can only land `pending` + `submitted_by_user=true`, invisible until approved — same pattern as kisan_sawaal);
  all admin writes via `require_admin` RPCs. **POLICY (flagged):** AI-discovered entries default to `approved`
  (no human review — the Phase 2 verification discipline IS the gate); user submissions default to `pending`.
  **RPCs:** `get_admin_melas`, `admin_upsert_mela` (insert/edit-and-approve), `admin_set_mela_status`,
  `admin_set_mela_active`, `admin_delete_mela`; `set_mela_interest` + `get_my_mela_interests` (owner-scoped by
  actor id, trust-based like create_listing); `get_mela_interest_digest(as_of)` (Phase 6 digest-readiness —
  confirmed-date Melas within today+3 days, service-role only, exposes user_ids so NOT granted to anon).
- **AI discovery pipeline (Phase 2):** `scripts/discover-melas.mjs` (runner) + `scripts/mela/pipeline.mjs`
  (PURE, unit-testable logic) + `scripts/mela/geocode.mjs` (reuses the Nominatim path). Uses `@anthropic-ai/sdk`
  Messages API with the `web_search_20250305` server tool, model `claude-opus-4-8` (override via `ANTHROPIC_MODEL`),
  hard search cap `MAX_SEARCHES=18` (`max_uses`). The `SYSTEM_PROMPT` enforces the sourcing discipline verbatim:
  never guess dates (unconfirmed → `is_date_confirmed=false` + "अपेक्षित"), cite a real source URL, India-only
  (discards non-India results — a real California "Kisan Mela" was the demonstrated risk), future events only,
  contact only from the event's own official page (2d-i), and an explicit **prompt-injection defense** (fetched
  web content is untrusted data, never instructions — 2a-i). Pipeline: `validateMela` (rejects no-URL / non-India
  / no-date-and-no-expected), `findDuplicate`/`sameEvent` (venue+state+date-window, not fuzzy name), `mergeMela`,
  `lifecycleDecision` (auto-drop once a confirmed date or expected window has passed). Daily GitHub Action
  `.github/workflows/discover-melas.yml` (01:30 UTC) **fails fast with a clear message if `ANTHROPIC_API_KEY` is
  absent** (2c); the page/form/admin all work with zero AI entries. Per-run cost logged (2f).

> **OWNER ACTION REQUIRED (Kisan Mela discovery):** add a production **`ANTHROPIC_API_KEY`** as a GitHub Actions
> repository secret for the daily discovery pipeline to run. Until then the calendar is simply sparse (seed +
> user submissions only), not broken.
- **Public page `/kisan-mela` (Phase 3):** `src/screens/KisanMela.jsx` + `src/lib/mela/melaApi.js`
  (fetch/submit/interest) + `src/lib/mela/melaFormat.js` (PURE, testable: `filterMelas`, `sortByDistance`,
  `melaMonth`, `melaDateLabel`, `statesIn` — month-name label data lives in the audit-sanctioned
  `content/months.js`). PageExplainer (self-sourced + "अपेक्षित not final, confirm before travelling"),
  state + month filters, distance sort from the viewer's real coords (nationwide — `rawCoords` → matched-village
  pincode → DEFAULT), cards showing name/venue/date (confirmed vs amber "अपेक्षित")/distance/tags/highlights/
  contact/source link/last-checked, a login-gated "दिलचस्पी है" toggle (`set_mela_interest`), a WhatsApp share
  with real event details (`generateMelaMessage` in the allowlisted shareMessages.js), and a prominent "मेले की
  जानकारी दें" CTA → `/kisan-mela/submit` (Phase 4). Graceful empty state. Route added in App.jsx.
  `scripts/seed_melas.mjs` seeds 4 real, source-cited sample Melas (mostly honest "अपेक्षित", one confirmed
  sample) for UI demo until the discovery pipeline runs.
- **Submission + moderation (Phase 4):** `src/screens/KisanMelaSubmit.jsx` (`/kisan-mela/submit`, Sawaal-style
  form — name/organizer/venue/address/state/district, dates OR "तारीख़ पक्की नहीं"→expected_period, tag
  checkboxes, contact, source link, submitter relationship [informational]) → `submitMela` lands `pending` +
  `submitted_by_user=true`, invisible until approved. `MelaPanel` + `MelaEditForm` in `/admin` (require_admin
  RPCs `getAdminMelas`/`admin_set_mela_status`/`admin_set_mela_active`/`admin_upsert_mela`/`admin_delete_mela`):
  a pending-first queue with edit-and-approve / reject / activate / delete. Verified end-to-end: anon submit →
  invisible publicly → shows in admin queue → approve → publicly visible.
- **Nav + homepage + sitemap (Phase 5):** the top-level संपर्क nav item became an **उपयोगी संपर्क dropdown**
  (`RESOURCES_MENU`) on both desktop and mobile, containing "संपर्क सूची" (/resources) + "किसान मेला"
  (/kisan-mela). Homepage gained a **Kisan Mela teaser** (`fetchUpcomingMelas(3)`, soonest-first) with a
  "सभी मेले देखें →" link and a graceful empty state inviting submission. `/kisan-mela` added to
  `public/sitemap.xml`.
- **Interest digest-readiness (Phase 6, WhatsApp-ready, NOT wired):** `src/lib/mela/melaDigest.js` — pure,
  unit-testable `selectDigestMelas(melas, asOf)` / `daysUntil` / `groupDigestByUser` (confirmed-date Melas
  happening today..today+3, grouped by user). Mirrors the server-side `get_mela_interest_digest(p_as_of)` RPC
  (migration 0035). **Integration point documented in-file:** no separate reminder scheduler — when the planned
  daily WhatsApp digest (weather + mandi) is built, it calls the RPC once and folds each farmer's interested
  Melas into that single message. Nothing sends anything yet.
- **Tests + review (Phase 7):** new permanent suites `scripts/test/p_mela_pipeline.mjs` (25),
  `p_mela_digest.mjs` (12), `p_mela_format.mjs` (14), `p_mela_backend.mjs` (14) + `e2e/phase20_mela.spec.js`
  (4) — all mocked, never hitting the live Anthropic API or aggregators. Full E2E **74/74** (70→74),
  `v11_phase6` 29/0. Phase 7 caught + fixed two bugs: the `get_mela_interest_digest` RPC was anon-callable
  (now revoked, live + migration) and three hardcoded "अपेक्षित" render literals (→ `mela_expected_prefix`).
  Full write-up: `docs/review/KISAN_MELA_REVIEW.md`.
- **Screenshot review + deploy (Phase 8):** all required views screenshotted at 1280×800 + 375×812 and viewed
  (page with confirmed-vs-अपेक्षित, filters, WhatsApp share text, submission form, admin moderation queue with a
  pending submission, homepage teaser, Resources nav dropdown); fixed one raw-i18n-key label (`action_add`).
  **Deployed & live-verified:** https://873c3617.kissansahyog.pages.dev — `/kisan-mela` + `/kisan-mela/submit`
  200, sitemap carries `/kisan-mela`, the live page renders 4 seeded melas (1 confirmed + 3 अपेक्षित), no console
  errors. Full E2E 74/74; mela backend/pure suites green; `v11_phase6` 29/0.

### Kisan Mela follow-ups (1 Oct 2026)
- **Candidates re-architecture (migration `0036_kisan_mela_candidates.sql`):** the discovery pipeline now lands
  raw aggregator hits in a `kisan_mela_candidates` staging table (admin-reviewed) instead of writing directly to
  `kisan_mela`, separating noisy discovery from published events. Tests: `scripts/test/p_mela_rearch.mjs`. Review:
  `docs/review/KISAN_MELA_REARCHITECTURE_REVIEW.md`.
- **State normalization + location-based dedup (migration `0037_kisan_mela_dedup_state.sql`):** canonical state
  normalization for all states/UTs (Hindi + abbreviation aliases) applied at every entry point and backfilled;
  location-based dedup (coordinates + date-overlap, expected-month aware, keeps separate editions apart) with
  merge rules that preserve sources and farmers' interest marks; a one-time cleanup with an audit trail. Tests:
  `scripts/test/p_mela_dedup.mjs`. Review: `docs/review/KISAN_MELA_DEDUP_STATE_REVIEW.md`.

---

## V2 release (Phases 0–15) — major feature build

Built autonomously per `docs/review/MASTER_BUILD_V2_PROMPT.md`. Progress ticked in
`docs/review/V2_PROGRESS.md`; decisions in `docs/review/V2_DECISIONS.md`; full report
in `docs/review/V2_FINAL_REPORT.md`. Migrations **0038–0049**.

- **Phase 1 — Citation framework:** `docs/research/SOURCES.md` (213 sources) → `src/content/sources.js`
  (generated by `scripts/gen-sources.mjs`). Structured content model `src/content/pages/<slug>.js` +
  block renderer (`src/components/content/`). Audits: `v2_citation_audit`, `v2_link_check`.
- **Phase 2 — Layout + SEO/prerender:** `PageShell`/`Section`/`ContentColumn`/`Grid`/`Breadcrumbs`;
  `<Seo/>` (React 19 doc metadata) + sitewide Organization/WebSite JSON-LD; real 404 (`NotFound`, noindex);
  `scripts/prerender.mjs` + `build:full`; `v2_seo_audit`.
- **Phase 3 — Brand & greeting:** English brand "Kissan Sahyog"; greeting "सीताराम 🙏, {name}"; removed
  all "समीक्षाधीन" / under-review gating (migration 0038).
- **Phase 4 — Legal/trust (0039):** server-enforced provider declarations; `/grievance` + footer; report
  button + `listing_reports` + admin queue; Terms/Privacy (DPDP); `<SponsoredBadge/>` + `is_sponsored`.
- **Phase 5 — Water tanker (0040):** equipment sub-type + conditional fields + seasonal box.
- **Phase 6 — Cold storage (0041):** `/cold-storage` hub + district pages; `cold_storage_directory`
  (243 rows); claim/removal; warehouse 100 km wide-visibility.
- **Phase 7 — Greenhouse (0042):** `/greenhouse` hub (cited MP subsidy norms, calculators) + marketplace.
- **Phase 8 — Carbon credit (0043):** `/carbon-credit` (+ `/niti-sujhav` printable brief) + poll + suggestions.
- **Phase 9 — Jugaad (0044):** category + `/jugaad` info page (legal/safety); road-vehicle rejection.
- **Phase 10 — Search (0045):** NavBar search (typing + voice); `search_listings` pg_trgm RPC +
  build-time `public/search-index.json`; `/search` (noindex) + `search_misses`.
- **Phase 11 — Interlinking (0046):** `src/content/boxRegistry.js` + `<RelatedBoxes/>` (seasonal);
  rate-limited `increment_listing_view` + "सबसे ज़्यादा देखा गया" on Home/Browse.
- **Phase 12 — Kisan Sawaal KB (0047–0048):** `kisan_sawaal` extended (slug/season/answer_blocks/sources);
  `/sawaal/<slug>` (QAPage), `/fasal/<crop>/samasya`, `/sawaal/vishay/<category>`; 40 fetch-and-quoted Q&As
  (official PIB/ICAR/TNAU/FAO) + 19 legacy slugged = 59 pages. Content in `src/content/qa/*.js` → seeded by
  `scripts/seed-sawaal.mjs`. Demand/backlog in `docs/research/QA_DEMAND.md`.
- **Phase 13 — WhatsApp groundwork (0049, no sending):** admin "आज की पोस्ट" canvas builder + channel-URL
  setter + opt-in CSV + poster QR (in-app `qrcode`, no third-party service); gated join surfaces (hidden
  until `site_settings.whatsapp_channel_url` set); `/join?src=` → `join_clicks`; signup/profile consent.
- **Phase 14 — SEO/AEO/GEO:** OG images (`scripts/gen-og.mjs`, /og/*); split sitemaps + index
  (`scripts/gen-sitemaps.mjs` in build:full); robots.txt; llms.txt; `docs/seo/KEYWORDS.md` + `SEO_CHECKLIST.md`.
- **Phase 15 — Verify/deploy:** full suite 959/0; preview at https://v2-preview.kissansahyog.pages.dev.
  Production deploy: `npm run build:full && npx wrangler pages deploy dist --project-name kissansahyog`.

## Batch 1 — marketplace basics (preview only) — 2026-10-06 (migration 0050)

Owner rejected the V2 marketplace experience; Batch 1 fixes **only** the basics (content/Hindi/
cold-storage/greenhouse/jugaad/Q&A/fasal-salah untouched). Spec: `docs/review/BATCH1_PROMPT.md`;
report: `docs/review/BATCH1_REPORT.md`.

- **0050 provider-declaration hotfix:** `create_listing` = 0044 except the provider-declaration
  guard fires only when `provider_declared` is *present* and ≠ `'true'` (missing key now succeeds).
  The only DB change in this batch. Tests: `batch1_item0.mjs`, `batch1_categories.mjs`.
- **NavBar everywhere + mobile bottom tab bar:** `Screen` (`components/ui.jsx`) now renders inside
  `PageShell` (NavBar + slim title row), so the 10 legacy Screen routes get the global NavBar.
  `components/BottomTabBar.jsx` (fixed, below `md`, rendered once in App): logged-in
  होम/खोजें/पोस्ट करें/मेरी लिस्टिंग/प्रोफ़ाइल; logged-out होम/खोजें/पोस्ट करें→login/लॉगिन. Body gets
  mobile bottom padding + safe area. NavBar Login/Signup hidden below `md`; redundant per-screen
  language toggle removed.
- **Public browsing (item 3A):** `/browse` + `/listing/:id` are no longer `Protected`. Browse uses the
  shared `LocationControl` for logged-out visitors (logged-in keep exact profile coords via rawCoords).
  The phone stays behind login — `ContactActions` routes logged-out users to `/login?next=/listing/:id`
  and back; Login/Signup + `PublicOnly` honour `?next=`/`state.from` (`src/lib/returnPath.js`). Both routes
  are `noindex` and excluded from prerender/sitemaps.
- **Browse (item 3):** 10 category chips wrap (`flex-wrap`, no hidden h-scroll; `chip-<cat>` testids kept);
  `fetchTopViewed({category})` filters "Most viewed" to the tab (hidden when empty); grids 2/3/4, Land 1-col.
- **Call + WhatsApp (item 4):** `components/ContactActions.jsx` on every `ListingCard` + top of
  `ListingDetail`; reuses `getListingContact`, `BuyerComplianceGate`, the `phoneReveal` disclaimer and
  `incrementContactClick`; WhatsApp → `wa.me/91<10-digit>?text=<title+link>`; hidden on own listings.
- **Posting in 3 steps (item 5):** `Post.jsx` = What? (category+offer/requirement) → Details (fields +
  किसान/व्यापारी) → Location+confirm (asset village + phone check + ONE combined rules/provider/ownership
  checkbox). Client-side essentials-only relaxations (DB unchanged): equipment rate offer-only + rental
  basis optional; land price_type offer-only; agri condition optional. `components/ListingForm.jsx` now
  **unused** (dead code, left in place).
- **Layout (item 1, PARTIAL):** `PageShell` default → `wide`; Browse edge-to-edge. The per-page
  `max-w-*`/`maxWidth` cleanup on information/homepage screens + the `batch1_layout.mjs` static guard are
  **deferred** (prompt permits). See KNOWN_ISSUES.
- **Tests:** full e2e 82/0 (new `e2e/batch1.spec.js` + 8 legacy post specs updated to the 3-step flow via
  `postStep1()`); all backend suites green; `v11_phase6` 31/0; `v2_seo_audit` 2/0; `build:full` OK.

## Batch 2 — finish the structure (preview only) — 2026-10-07 (migrations 0051–0052)

Spec: `docs/review/BATCH2_PROMPT.md`; report: `docs/review/BATCH2_REPORT.md`; progress:
`docs/review/BATCH2_PROGRESS.md`. Items A–F done; G (public `/bazaar/*`) deferred (optional).
Preview: **https://v2-preview.kissansahyog.pages.dev**.

- **A — one layout everywhere:** finished the Batch 1 deferral. All 21 page-level `max-w-*`/`maxWidth`
  removed from `src/screens/`; prose → `PageShell width="content"` (~70ch), the rest → `width="wide"`;
  inner readable clamps marked `ks-allow-width`. Static guard `scripts/test/batch2_layout.mjs`. Dead
  `components/ListingForm.jsx` **deleted** (v2_phase4/9 assertions repointed at `Post.jsx`).
- **B — cold storage rebuilt** (`/cold-storage`, `/cold-storage/:district`): claim/correct UI + Admin
  claim queue removed (RPCs/tables kept, hidden) → one **"गलत जानकारी? बताएँ"** `ReportButton`
  (`cold_storage`). `ColdStorageFinder` (text + "मेरी लोकेशन" GPS + district/crop/type filters,
  distance-sorted "~X किमी", post CTA → `/post?cat=warehouse&type=offer`). Cards: full address, products,
  capacity, type, 📞 कॉल करें (tel:), WhatsApp (valid 10-digit mobile only), दिशा देखें (maps search, no
  key). **Migration 0051** adds `latitude`/`longitude`/`geo_precision` + refreshes `cold_storage_public`;
  `scripts/geocode-cold-storage.mjs` (Nominatim ≤1 req/s) → **239/243 = 98.4%**. V2-only, additive, safe.
- **C — greenhouse split:** `/greenhouse` = marketplace (two preselect CTAs, listings grid w/ vendor
  sub-type/type/district filters, link box → guide); **`/greenhouse/subsidy`** = moved guide (prerendered,
  sitemap, SEO, FAQPage JSON-LD). `/post?cat=&type=` preselect added. **MP subsidy table VERIFIED** against
  the MPFSTS state guideline PDF (p.2) → new primary source **S-GH-56**; Haryana MIDH kept secondary.
- **D — jugaad split:** `/jugaad` = marketplace ("अपना जुगाड़ डालें" → `/post?cat=jugaad&type=offer`, chips
  बेचना/किराया/सेवा/ऑर्डर पर बनाना/विकास में); **`/jugaad/jankari`** = moved info/legal guide (prerendered).
  Simpler `categories/jugaad.jsx` (photo req, name, what-it-does, 5 types, own price; units-made +
  testing-body removed from form, legacy values still shown; road-vehicle line inside the Post declaration,
  `finalizeDetails` sets `not_road_vehicle:'true'`). Client + RPC agree.
- **E — fasal-salah actionable:** crop cards are **buttons** → in-page crop **panel** (not a route):
  आज की सलाह (`actionWindows` + weather), इस मौसम का काम (`cropadv_<slug>` only), आम समस्याएँ (crop Q&A,
  hidden when none), पास में मदद (Browse + Drone Didi + equipment + KVK Sagar). Location control at top, public.
- **F — kisan sawaal structure:** **Migration 0052** adds `answer_blocks_en` (jsonb) + a
  `kisan_sawaal_slug_redirects` table (RLS public-read). `scripts/sawaal-reslug.mjs` gives every Q&A a
  meaningful transliterated slug (0 legacy `sawaal-*` left, 16 redirects) and regenerates
  `public/_redirects` 301s; `/sawaal/<old>` also client-redirects (`Navigate replace`). `SawaalDetail`:
  EN only when toggle=EN **and** English exists, else Hindi + "available in Hindi only" note; legacy
  (no `answer_blocks`) rows render in the box+body layout; breadcrumb होम › किसान सवाल › `<crop/topic>` ›
  question. `/sawaal` index grouped by topic (full-width grid), ask form below. V2-only, additive, safe.
- **Verification fixes:** `ContentBlocks` `break-words` (long URLs wrap on mobile); NavBar/SearchBar
  compacted so the English top bar fits at 1280.
- **Tests:** full backend suite green (0 failed); new `batch2_*` 50/0 total (`layout` 1, `coldstorage` 13,
  `jugaad` 14, `fasal` 8, `sawaal` 14); `v11_phase6` 31/0, `v2_seo_audit` 2/0, `v2_citation_audit` 6/0;
  `build:full` 178/178. E2E **80/82** — `phase17` sawaal-grid updated for the grouped layout (passes); the
  2 failures (`phase18_transport`, `phase20_mela`) are pre-existing data/time dependencies (the mela seed
  event ended 2026-10-06) in features untouched by Batch 2. Screenshots in `docs/review/shots-batch2/`.
