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
matching, voice I/O, languages beyond Hindi/English, native app, automated deployment.

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
