# Batch 8B — Preflight (Step 0)

Recorded 2026-10-14.

## Baseline

| Item | Found |
|---|---|
| Branch | `android-app` @ `d165fbb` (end of Batch 8A, pushed) |
| Working tree | pre-existing, left uncommitted: modified `public/search-index.json` (rebuilt by every build), 16 modified `docs/review/batch7l1/*.png`, untracked `docs/review/ADMIN_ACCESS_DIAGNOSIS.md`, `docs/review/BATCH7J_REPORT.md`, `docs/review/batch7l2/*.png` |
| Node | v24.19.0 |
| JDK 21 | `~/.jdks/jdk-21.0.12.1+1` (from 8A) — found by `scripts/android/find-jdk.mjs` |
| AVD | `ks_test_api36` — `scripts/android/avd-setup.sh` → "ready, API 36" |
| Local-only excludes | `docs/review/batch8b/evidence/`, `docs/review/batch8b/logs/`, `.dev.vars` added to `.git/info/exclude`; `.dev.vars` was not in `.gitignore` — added there too (commit 2c95478) |

## Which env file is which (names only, values never printed)

| File | VITE_SUPABASE_URL contains | Variable NAMES |
|---|---|---|
| `.env` | **staging ref** (`wzxtqbq…`) | VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ACCESS_TOKEN |
| `.env.production` | **prod ref** (`eltmczn…`) | same four names |
| `.env.staging`, `.env.local` | absent | — |

So the staging flavour uses `.env` (as `npm run build` = `vite --mode staging` and `npm run db` already do).
Only `VITE_*` variables reach the client bundle; the build guards check the bundle.

## Files read

scripts/build-android.mjs, scripts/android/*, scripts/check-prod-env.mjs, capacitor.config.json,
android/app/build.gradle, AndroidManifest.xml, src/lib/native.js, apiBase.js, NativeShell.jsx,
PwaPrompts.jsx, src/lib/supabaseClient.js, src/lib/auth/authService.js, src/lib/mandi/mandiApi.js,
src/lib/weather/weatherApiV2.js, src/lib/listings/listingsApi.js + photos.js, screens Homepage,
Browse, Mausam, Msp, Post, ListingDetail, MyListings, Profile, Login, Signup, Grievance,
components ui.jsx, MandiTicker, PhotoPicker, PlaceField, NavBar, categories/bhusa + fields,
src/lib/i18n/strings.js, functions/api/feedback.js, functions/transcribe.js,
functions/_middleware.js, .env.example (names), package.json scripts,
scripts/test/v11_phase6.mjs (Devanagari check), scripts/verify-batch7l2-stageb.mjs (how earlier
staging tests made accounts: `…@example.com` + 90000001xx mobiles).

## Auth facts used by the tests

- Registration (`register()`) = Supabase Auth email + password, then the `app_register` RPC with
  full name, 10-digit mobile, a town from the places list. Earlier staging tests used
  `@example.com` addresses successfully.
- Phone login (`startPhoneLogin`) is trust-based: any registered 10-digit number logs in, no OTP.
- Session = `ks_session_v1` in localStorage (+ `ks_sb_auth` Supabase Auth session for email users).
- Profile edit (`updateProfile`) requires a 6-digit pincode (the known issue).

## Data sources of the public pages — cache classification

Everything not marked PUBLIC-CACHEABLE is never stored by the app's offline layer.
The table is mirrored in `src/lib/offline/policy.js`.

### Supabase tables (GET)

| Table | Used by | Class |
|---|---|---|
| mandi_prices | home ticker, /msp, mandi pages | PUBLIC-CACHEABLE (freshness 7 days on price_date) |
| msp_prices | /msp, home | PUBLIC-CACHEABLE |
| weather_cache_v2 | /mausam, home weather | PUBLIC-CACHEABLE (freshness 24 h on fetched_at) |
| listings | /browse, home feed, listing detail, top viewed, counts | PUBLIC-CACHEABLE (freshness 3 days on stored time). Rows carry no name or phone (those are in `profiles`); they do carry the poster's `user_id` (a UUID, already public on the website) |
| listing_unavailable_dates | listing detail | PUBLIC-CACHEABLE |
| crops, equipment_types, pincodes, places, village_coordinates | reference data | PUBLIC-CACHEABLE |
| articles, cold_storage_public, farm_events, input_prices, kisan_mela, kisan_safalta, kisan_sawaal, kisan_sawaal_slug_redirects, page_faqs, procurement_centres, resources, sarkari_yojana, site_settings, videos | content pages | PUBLIC-CACHEABLE (14 days) |
| experts | /experts (logged-in only) | **PRIVATE** — rows contain phone numbers |
| weather_grid_requests | upsert (write) | **PRIVATE / write** |
| profiles | (not read by anon) | **PRIVATE** |

### RPCs (POST)

| RPC | Class |
|---|---|
| search_listings, get_public_feedback, recent_crop_reports, resolve_active_mela, get_carbon_poll_results, get_carbon_suggestions_public | PUBLIC-CACHEABLE (read-only, public output; arguments are part of the key) |
| get_listing_contact (revealed numbers), get_my_listings, get_my_mela_interests, get_availability_nudges | **PRIVATE** (user-specific) |
| app_login, app_login_email, app_login_email_guard, app_register, app_signup, app_signup_email, update_profile, update_kisan_profile, delete_account, accept_listing_consents | **PRIVATE** (auth / profile) |
| create_listing_with_location, close_listing, set_listing_availability, set_listing_unavailable, increment_contact_click, increment_listing_view, cache_weather_cell, claim_geocode_slot, next_pending_village, resolve_village, fail_village, log_search_miss, log_join_click, set_language, set_mela_interest, submit_carbon_suggestion, vote_carbon_poll, submit_listing_report, subscribe_alert | **WRITE** — never cached; offline they fail quietly as before |

### Other endpoints

| Endpoint | Class |
|---|---|
| Supabase Auth `/auth/v1/*` (separate `supabaseAuth` client, never wrapped) | **PRIVATE** |
| Supabase Storage `/storage/v1/*` (photo upload / public photo URLs) | not cached (uploads are writes; photo images are loaded by `<img>`, not fetch) |
| `api.open-meteo.com` forecast (weatherApiV2 live fallback) | PUBLIC-CACHEABLE (24 h) |
| `api.bigdatacloud.net` reverse geocode (the visitor's own position) | **PRIVATE** — not cached |
| site functions `/geocode`, `/transcribe`, `/api/feedback`, `/geo` | not cached (plain `fetch`, not through the data client) |
| `mandi-api.onrender.com`, `api.data.gov.in` | **not called by the client at all** (server-side ingestion only) |
| `/search-index.json`, `/images/*` | bundled in the APK — always available offline |

## Other findings that shaped the plan

- `functions/api/feedback.js` stores a message only with `SUPABASE_URL` **and**
  `SUPABASE_SERVICE_ROLE_KEY`; without the key it answers 503 `unavailable` and the form offers its
  e-mail fallback. This batch may not use a service-role key, so S9 cannot reach the success state.
- `fetchMandiPrices()` only asks "latest date" when today has no rows. After a visit on a day WITH
  rows, the next day offline would have nothing to fall back to. Fix (app only, no extra request):
  the app remembers the last price date it showed (`ks_mandi_latest_date`) and uses it when both
  network questions fail; those rows are then served from the cache.
- `scripts/test/v11_phase6.mjs` (the Devanagari-location check) already FAILS on this Windows
  machine before any 8B change: it compares `src\…` paths with its `src/…` allowlist, so every
  allowed file is reported. With paths normalised, the pre-existing genuine offenders are
  PromoBento.jsx, lib/i18n/termsContent.js, lib/location/places.js, lib/mela/melaFormat.js.
  8B checks for NEW offenders (O8).
- wrangler is not installed globally; `npx --yes wrangler@4 pages dev` (local only, not a deploy)
  is used for S9.
