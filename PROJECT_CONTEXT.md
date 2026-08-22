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

**profiles** — application-level user (not Supabase Auth). `id` uuid pk,
`full_name`, `phone` (unique), `village_town`, `pincode`, `latitude`, `longitude`
(derived from `pincodes` at signup), `preferred_language` ('hi'|'en', default 'hi'),
`disclaimer_accepted_at` (nullable; must be set to post), `created_at`.

**listings** — `id` uuid pk, `user_id` → profiles, `listing_type` ('offer'|'requirement'),
`category` ('land'|'equipment'|'labor'), `status` ('active'|'closed', default active),
`latitude`/`longitude` (from poster's profile, overridable per-listing), `pincode`,
`details` jsonb (category-specific — see §3), `self_declared` bool, `created_at`,
`expires_at` (default now()+30 days).
CHECK `land_offer_requires_self_declared`: a land **offer** must have `self_declared = true`.

**crops** — `id` serial, `name_hi`, `name_en`, `region` (default 'sagar_mp'),
unique (name_en, region).
**equipment_types** — `id` serial, `name_hi`, `name_en` unique.
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

- **land**: `{ size_range, arrangement[], water_source, crop_id|null, season, photo_urls[] }`
  - size_range: `<1|1-2|2-5|5-10|10+`; arrangement (multi): `lease|sharecropping|contract_farming`;
    water_source: `borewell|canal|rainfed|none`; season: `kharif|rabi|zaid|year_round`;
    photo_urls: up to 3 Supabase Storage URLs.
- **equipment**: `{ equipment_type_id, rental_basis, available_now, available_from|null, available_to|null }`
  - rental_basis: `per_hour|per_acre|per_day`; availability = `available_now` toggle OR a date range.
- **labor**: `{ worker_count, work_type, available_from|null, available_to|null, rate_basis|null, rate_amount }`
  - work_type: `sowing|harvesting|weeding|general|other`; rate_basis: `per_day|per_task`;
    rate_amount: free-form optional text (e.g. "₹400" or "बातचीत से").

Adding a category = add a module (`initialDetails/Fields/validate/summarize/needsSelfDeclaration`),
import it in `registry.jsx`, add to `ENABLED_CATEGORIES`. Browse/detail/post are category-agnostic.

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

Coordinates come **only** from the `pincodes` table (single source of truth): derived at
signup, inherited by listings, overridable per-listing (`create_listing` p_latitude/p_longitude).
Browse: a **bounding-box** pre-filter (server-side `gte/lte` on lat/long) then an **exact
Haversine** pass; **inclusive of exactly 30.0 km** (`<= 30`). Sort nearest-first (default)
or newest. Verified against real Sagar-district distances (Sagar→Bina ~66km, →Khurai ~46km,
→Rehli ~40km) and boundary-tested at 30.0 km in `scripts/test/phase3.mjs`.

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
- **Backend/logic** (`scripts/test/phase{1..9}.mjs`): RLS enforcement, RPC contracts,
  validation, DB constraints, Haversine/boundary, JSONB-shape consistency.
- **E2E** (`e2e/phase{2..9}.spec.js`, Playwright/chromium): real user journeys incl.
  disclaimer gating, language switching, offline shell, and the full cross-category
  Journey A/B. Test data uses the reserved phone prefix `90000…` and is auto-cleaned.
Phase 9 was re-verified on a **clean clone** (fresh `.env`, re-run migrations/seeds):
72 backend + 26 E2E, all green.

Out of scope for this MVP (do not implement without a scope change): Phone OTP, payments/
escrow, in-app chat/contact forms, document/police verification, ratings, algorithmic
matching, voice I/O, languages beyond Hindi/English, native app, automated deployment.
