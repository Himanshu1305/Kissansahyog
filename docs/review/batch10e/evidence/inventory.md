# Batch 10E — Phase 0 inventory

Read on 2026-10-18 at `release-10e` = `e81a100`. Code facts carry `file:line` references (repo-relative). Database facts were read **read-only from STAGING** (`wzxtqbqlahyahsnoqqva`) through the Management API with SELECT statements only, after `scripts/check-staging-env.mjs` passed. Production was not touched. No personal data appears here: profile rows are given as counts only.

## Headlines
| | finding |
|---|---|
| (a) | Sign-up today **requires email + password** on both the client and the server: `app_register` takes the email from the Supabase Auth session and raises `invalid_email` / `not_authorized` without one. Mobile login (`app_login(p_phone)`) is already email-free. **`public.app_register_phone` exists on STAGING only** (verbatim definition below and in `evidence/app_register_phone.staging.sql`). It is not in `supabase/migrations/`, `src/`, `e2e/` or `tests/`. The next free migration number is **0064**. `profiles.email` is **nullable**; `phone` is **UNIQUE** (`profiles_phone_key`). On staging: 14 `phone` profiles have no email and no auth_uid, and 64 are `email` profiles. |
| (b) | Bucket `listing-photos` is public, with a 5 MB limit. URLs come from `getPublicUrl` and are stored in `listings.details.photo_urls`; there is no column. The host is **`https://wzxtqbqlahyahsnoqqva.supabase.co/storage/v1/object/public/listing-photos/…`**, which covers all 33 stored URLs on staging. A stored URL returns **200 image/jpeg** with an anonymous GET. The CSP `img-src` in `public/_headers:2` **does not list any supabase.co host**; `*.supabase.co` appears only in `connect-src`. ListingCard and ListingDetail have no `onError`, so they show a broken image. The homepage card hides it silently (`display:none`). |
| (c) | Date fields by category: **equipment** `available_now` / `available_from` / `available_to` plus the tanker's `available_months[]`; **labor** `available_from` / `available_to`; **drone_didi** offer `available_from` / `available_to`, requirement `preferred_date`; **bhusa** `available_from`; **warehouse** `available_from` plus cold-storage `season_from` / `season_to`. **land, transport, agri_inputs, building_materials, greenhouse, jugaad have no date field.** Water tanker is an equipment type, not a category. The RPCs **keep unknown `details` keys**: no whitelist, stored as-is. The only exceptions are that land's `contact_phone` is removed and agri_inputs' `contact_phone` is blanked for hidden owners. There is no CHECK and no trigger on `details`, and no update-listing RPC. |
| (d) | The "कृषि बाज़ार की श्रेणियाँ / Farm marketplace categories" tiles are `PhotoTile` (`src/components/home/kit.jsx:69-80`). PhotoTile is a **`<button>`, not a link**, with no hover/focus/cursor styles. It is used **only** at `src/screens/Homepage.jsx:303`. There is no global cursor rule in `src/index.css`. |
| (e) | **"शाबाश" occurs once**: `guide_well_done` (`src/lib/i18n/strings.js:2411`, hi `'शाबाश! अब असली ऐप पर आज़माइए या अगला डेमो देखिए।'`, en `'Well done! Try the real app, or watch the next demo.'`). It is shown on the demo finish card (`DemoPlayer.jsx:370`, `TourExplorer.jsx:194`). There is no "Shabash" or "Bravo" anywhere, and no test asserts the text. |
| (f) | `mandi_prices` **has no `source` column and no variety column**. Its unique key is `(commodity_en, market, price_date)`. Staging holds only **2026-09-22 → 2026-10-18** (26 distinct days, 159 rows). Wheat, soybean and garlic have 26 days each; maize and mustard 25; gram 3; paddy 3; lentil 2; moong 2; urad 1. So the 30-day and 90-day tabs currently show the same data. The tabs use nominal calendar windows. The chart is spaced by index, with no date labels. |
| B17 | `scripts/prerender.mjs:84` serializes the live DOM, which includes absolute `http://localhost:4178/assets/…` `modulepreload`/stylesheet links injected by Vite's preload helper. The SPA fallback at `:45` re-reads the already-prerendered `dist/index.html`, so the links spread to later routes. **All 268 prerendered HTML files contain `localhost:4178`** in this baseline build. |

## DB facts read from STAGING (read-only)

### (a) `public.app_register_phone` — current definition on STAGING
- Signature: `app_register_phone(p_full_name text, p_phone text, p_village_town text, p_latitude numeric, p_longitude numeric, p_language text, p_disclaimer_accepted boolean, p_show_details boolean) RETURNS profiles`, `LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'`. It has the same parameter list as `app_register`, so the client can call it with the same arguments.
- Behaviour:
  - Strips whitespace from the phone. Raises `name_required` (blank name), `invalid_phone` (not exactly 10 digits), `disclaimer_not_accepted`, and `phone_exists` (an existing row, or a unique_violation race).
  - Nulls lat/lng when either is missing or out of range. The language defaults to `hi`.
  - Inserts a profile with `email = null`, `auth_uid = null`, `auth_provider = 'phone'`, `pincode = null` and `disclaimer_accepted_at = now()`. It sets `consents.details_visibility = {choice: show|hidden, chosen_at, version '2026-10'}`, the same structure as `app_register`.
  - Returns the row. It **does not create an auth session**.
- Grants (`pg_proc.proacl`): `{postgres=X, anon=X, authenticated=X, service_role=X}`. EXECUTE has been revoked from PUBLIC, unlike `app_login` / `app_signup`, which still have `=X`. It has no COMMENT.
- Verbatim definition: `evidence/app_register_phone.staging.sql`.
- Related functions on staging: `app_register(...)` has the same signature, needs an `auth.uid()` and email and sets `auth_provider = 'email'`. `app_login(p_phone)` checks the phone, `login_is_locked`, and returns null for missing or **admin** profiles (`login_record_attempt`). `app_login_email_guard(text, boolean)`, `app_signup(...)` and `app_signup_email(...)` also exist.

### (a) `public.profiles` on STAGING
- `email text NULL` (nullable). `phone text NULL`. `auth_uid uuid NULL`. `auth_provider text NOT NULL default 'phone'`, with CHECK `auth_provider in ('phone','email')`. `full_name NOT NULL`, `preferred_language NOT NULL default 'hi'`, `consents jsonb NOT NULL default '{}'`.
- UNIQUE: `profiles_phone_key (phone)`, `profiles_email_key (email)` and `profiles_auth_uid_key (auth_uid)`. Several NULLs are allowed in a unique btree.
- Counts: `auth_provider='phone'`, email null, auth_uid null: **14**; `auth_provider='email'`, with email and auth_uid: **64**.

### (b) storage on STAGING
- `storage.buckets`: one bucket, `listing-photos`, `public = true`, `file_size_limit = 5242880`, `allowed_mime_types = null`.
- Stored photo URLs: `listings.details.photo_urls` appears in 42 listings, with 33 URL values. Every one uses host `wzxtqbqlahyahsnoqqva.supabase.co` and path `/storage/v1/object/public/listing-photos/…`.
- An anonymous GET of the newest stored URL returned `200 image/jpeg` (86,503 B).

### (c) listing RPCs on STAGING (`pg_get_functiondef`)
- `create_listing_with_location(uuid,text,text,jsonb,numeric,numeric,text,boolean,text,boolean,text,boolean,uuid,boolean)` is the version from 0063:
  - It enforces the equipment spec rules only when `details.spec_version = '1'`, and requires transport `from_location` / `to_location`.
  - For agri_inputs it blanks `contact_phone` for hidden owners.
  - It then calls `create_listing(...)`.
- `create_listing(...)` is the version from 0053:
  - It whitelists the **category**, not the details keys.
  - It checks required keys and value ranges per category.
  - The **only date validation is for labor**: `available_from <= available_to` → `invalid_date_range`. Equipment, drone and others' dates are not checked on the server.
  - It inserts `v_details` as given. The only change is `- 'contact_phone'` for land.
  - **Unknown keys survive**, so a new optional key such as `additional_info` needs no DB change.
- `listings` CHECKs: `listings_category_check` (the 11 categories), `listing_type`, `status`, `listing_source`, and `land_offer_requires_self_declared`. There are **no triggers** on `public.listings`.
- Functions that read `details` include `search_listings`, `get_my_listings`, `get_admin_vendor_listings` and `get_listing_contact`. No function updates `details`.

### (f) `public.mandi_prices` on STAGING
- Columns: `id uuid pk`, `commodity_en text NN`, `commodity_hi text NN`, `market text NN`, `district text NN`, `state text NN default 'Madhya Pradesh'`, `min_price numeric`, `max_price numeric`, `modal_price numeric NN`, `price_date date NN`, `is_sagar_district bool NN default false`, `fetched_at timestamptz default now()`, `arrivals_tonnes numeric`, `in_sagar_division bool NN default false`.
- **No `source` column. No `variety` column.**
- Constraints: `mandi_prices_pkey (id)` and **UNIQUE `mandi_prices_commodity_en_market_price_date_key (commodity_en, market, price_date)`**.
- Indexes: the two above, plus `mandi_prices_date_idx (price_date desc)` and `mandi_prices_division_date_idx (in_sagar_division, price_date desc)`.
- Coverage (`evidence/mandi-coverage.staging.json`). The table holds 159 rows and 26 distinct days in total, from 2026-09-22 to 2026-10-18.

| crop (slug) | commodity_en | rows | distinct days | min | max | markets | days in 90 / 30 / 7 |
|---|---|---|---|---|---|---|---|
| gehun | Wheat | 28 | 26 | 2026-09-22 | 2026-10-18 | 4 | 26 / 26 / 7 |
| soyabean | Soyabean | 29 | 26 | 2026-09-22 | 2026-10-18 | 5 | 26 / 26 / 7 |
| lahsun | Garlic | 29 | 26 | 2026-09-22 | 2026-10-18 | 6 | 26 / 26 / 7 |
| makka | Maize | 31 | 25 | 2026-09-23 | 2026-10-18 | 7 | 25 / 25 / 7 |
| sarson | Mustard | 30 | 25 | 2026-09-23 | 2026-10-18 | 5 | 25 / 25 / 7 |
| chana | Gram | 4 | 3 | 2026-09-22 | 2026-10-16 | 4 | 3 / 3 / 1 |
| dhan | Paddy(Dhan)(Common) | 3 | 3 | 2026-09-22 | 2026-10-16 | 3 | 3 / 3 / 1 |
| masoor | Lentil | 2 | 2 | 2026-09-22 | 2026-10-16 | 2 | 2 / 2 / 1 |
| moong | Moong | 2 | 2 | 2026-09-22 | 2026-10-16 | 2 | 2 / 2 / 1 |
| urad | Urad | 1 | 1 | 2026-10-16 | 2026-10-16 | 1 | 1 / 1 / 1 |

The crop list is `CROPS` in `src/content/crops.js:5-14`, where `mandi_en` = `mandi_prices.commodity_en`.

## Mismatches with the prompt (for DECISIONS.md)
1. The prompt's "Bravo/Shabash" is really one Hindi string. The English text is **"Well done!"**, so the English replacement target is that string.
2. "Water tanker" is an equipment type (`equipment_types.name_en = 'Water tanker'`), not its own form or category.
3. Photos are stored in `details.photo_urls`, not in a `photo_urls` column.
4. `app_register_phone` returns `profiles` and creates no session. Phone-only users therefore get the same client session model as mobile login (`app_login`).
5. The prerender text is **not deterministic** on several data pages. In two staging builds of the same commit, `/articles /kisan-mela /safalta /sawaal /videos /yojana/central /yojana/mp /info /agro-forestry /mausam` were captured in a loading state ("थोड़ा रुकें…") in one build and complete in the other. Details are in `evidence/baseline-text-probe-vs-10d-build.md`. Any later "removed" lines on these routes must be checked by rebuilding before they are called an SEO loss. In this Phase 0 baseline all of them were captured complete. Two routes, `/yojana` and `/resources`, are captured in the loading state in **both** builds: their prerendered body is only the header, "थोड़ा रुकें…" and the footer. This is a pre-existing SEO weakness and is noted for HUMAN-REVIEW, not fixed here.

---

# Code inventory (file:line)


## (a) Sign-up / login

**Screens**: `src/screens/Signup.jsx`, `src/screens/Login.jsx` (there is no `src/pages/`). All auth logic lives in `src/lib/auth/authService.js`, and `src/lib/auth/AuthProvider.jsx` wraps it (`register` :27, `startPhoneLogin` :34, `loginEmail` :45).

### Signup (`src/screens/Signup.jsx`)
| Field | Where | Client validation |
|---|---|---|
| full_name | :95-97 | non-empty (:44) |
| phone (tel, maxLength 10) | :99-101 | `isValidPhone`: 10 digits after stripping non-digits (:45; authService.js:27-32) |
| email | `src/components/auth/EmailPasswordFields.jsx:14-16` (rendered at Signup.jsx:103) | `isValidEmail` regex (:46; authService.js:36-38) |
| password (+ show/hide toggle) | EmailPasswordFields.jsx:18-25 | length ≥ `MIN_PASSWORD` = 8 (:47; authService.js:39) |
| village/town (`PlaceField`, a town picked from the places list → `{label,lat,lng}`) | :105 | required (:48) |
| "show my details" checkbox (default ticked) | :108-117 | — |
| disclaimer checkbox | :123-126 | must be ticked (:58) |

- `EmailPasswordFields` already takes `required` (default `true`, EmailPasswordFields.jsx:10). Its comment says a later batch can make it optional or drop it (:4-6).
- Submit calls `register()` (Signup.jsx:66-69), which is `authService.register` (authService.js:246-287):
  1. `supabaseAuth.auth.signUp({email,password})` (:255)
  2. if there is no session, or the email already exists: `signInWithPassword` (:266), then `rpc('app_login_email')` (:268)
  3. `rpc('app_register', {p_full_name, p_phone, p_village_town, p_latitude, p_longitude, p_language, p_disclaimer_accepted, p_show_details})` (:275-284)
  4. `applyKisan`, which calls `update_kisan_profile` (:76-93)
- Server-side error keys are mapped back to fields at Signup.jsx:74.
- **Email is mandatory on the server too.** `app_register` raises `invalid_email` when there is no session email and `not_authorized` when there is no `auth.uid()` (`supabase/migrations/0060_one_registration.sql:61-63,80-82`). It also raises `phone_exists` when the phone is taken (:89-91). The insert sets `auth_provider = 'email'` (:94-99).
- Legacy functions still exist but have no UI: `signup()` uses `app_signup` and needs a pincode (authService.js:96-112); `signupEmail()` uses `auth.signUp` + `app_signup_email` (:211-241).

### Login (`src/screens/Login.jsx`)
- **There is no auto-detection of mobile vs email.** The page shows two separate forms side by side (comment at :10-15):
  - **A) Email form** (:70-86): email (:74-76) and password with toggle (:77-84). It checks `isValidEmail` (:45), then `loginEmail()` (authService.js:296-317):
    1. `rpc('app_login_email_guard', {p_email, p_failed:false})` (:292, :299)
    2. `supabaseAuth.auth.signInWithPassword` (:300)
    3. after a wrong password, the guard is called again with `p_failed:true` (:306)
    4. `rpc('app_login_email')` (:309); no profile gives `registration_incomplete` (:314)
  - **B) Mobile form** (:89-103): phone (:93-95) plus an OTP box shown only when `phoneStep === 'otp'` (:96-100). It checks `isValidPhone` (:53), then `startPhoneLogin` calls `rpc('app_login', {p_phone})` (authService.js:141-149). A null profile gives `not_found` (:147).
- `PHONE_OTP_ENABLED = false` (authService.js:139). `verifyPhoneOtp` always throws (:151-154).
- The "Create account" link goes to `/signup` (Login.jsx:106-108).
- Mobile login is already email-free and works for any `profiles.phone` row. It refuses admins and is throttled (`0059_login_rules.sql:109-139`).
- Offline policy lists the auth RPCs at `src/lib/offline/policy.js:30`. It does **not** include `app_register_phone`.

### `app_register_phone`
- **Not referenced anywhere in `src/`, `e2e/`, `tests/` or `supabase/migrations/`.** It appears only in `BATCH10E_FIXES_AND_BACKFILL_PROMPT.md:9,34`, which says it is live on staging only and its migration file still has to be added.

### Auth migrations
| File | Purpose |
|---|---|
| `supabase/migrations/0003_functions.sql:11` `app_signup`, `:64` `app_login` | original phone signup/login, trust-based |
| `supabase/migrations/0010_p3_email_auth.sql:26` `app_signup_email`, `:82` `app_login_email` | email auth via Supabase Auth session |
| `supabase/migrations/0059_login_rules.sql:109` `app_login`, `:146` `app_login_email`, `:182` `app_login_email_guard(text, boolean)` | adds `login_attempts`, admins cannot use mobile login, 5 fails in 15 min locks; failed mobile login returns null |
| `supabase/migrations/0060_one_registration.sql:37` `app_register(...)` | the one registration (email session + phone + town + visibility); drops NOT NULL on `profiles.pincode` (:34) |

- **Highest migration is `0063_equipment_specs.sql`, so the next free number is `0064`.**
- Rollback files live in `supabase/migrations/rollback/`; the latest is `0063_equipment_specs_rollback.sql`.

## (b) Listing photos

- **Upload**: `src/lib/listings/photos.js`
  - `BUCKET = 'listing-photos'` (:3); `MAX_PHOTOS = 3` (:4). Per-category limits are `PHOTO_LIMITS = { default: 3, warehouse: 5, land: 5, greenhouse: 5 }` (`src/lib/listings/catalog.js:14`).
  - Compression: JPEG/PNG/WebP only, max 1600px, ≤300 KB target (:8-20).
  - Path: `listings/<requestId>/<index>-<fingerprint>.jpg` with a request id, or `listings/<uuid>/<index>.jpg` without (:33-35).
  - Upload uses `upsert:false`; "already exists" counts as success (:36-41, :56-58).
  - **The URL comes from `supabase.storage.from(BUCKET).getPublicUrl(path)`** (:42-43). It is not hard-coded, so it is `<VITE_SUPABASE_URL host>/storage/v1/object/public/listing-photos/...`, which is on `*.supabase.co`.
  - Bucket created as public in `supabase/migrations/0005_storage.sql:6-7`; 5 MB size limit in `0054_consents.sql:102`.
- **Storage**: there is no column. URLs live in the jsonb **`listings.details.photo_urls`** (array). `Post.jsx` uploads before calling the RPC (:179) and merges `photo_urls` into the details (:180). The picker is `src/components/PhotoPicker.jsx`, rendered at Post.jsx:360; its preview uses `URL.createObjectURL`, i.e. `blob:` (PhotoPicker.jsx:10).
- **Where listing photos render**:

| Place | file:line | Source | loading | object-fit | onError |
|---|---|---|---|---|---|
| Listing detail, main photo | `src/screens/ListingDetail.jsx:139` (`photos` from :76) | `details.photo_urls[photoIndex]` | lazy | object-cover | **none** (broken-image icon) |
| Listing detail, thumbnails | `src/screens/ListingDetail.jsx:140` | each url | lazy | object-cover | **none** |
| `ListingCard` cover (Browse :218/:238/:253, MyListings :89, Greenhouse :103, Jugaad :76) | `src/components/ListingCard.jsx:27,36` | `details.photo_urls[0]`; no `<img>` if missing | lazy | object-cover | **none** |
| Homepage listing cards (`HomeListingCard`) | `src/screens/Homepage.jsx:319-321`; img at `src/components/home/kit.jsx:115` | `listingPhoto()` (Homepage.jsx:80-90): `photo_urls\|photos\|images\|image_urls[0]`, else `photo_url`, else a category stock photo `/images/home/...` (LIST_IMG :72-78) | lazy | object-cover | **hides silently** (`display='none'`), leaving a dark-green 130px box (kit.jsx:114) |
| Drone Didi page cards | `src/screens/DroneDidi.jsx:80` | always the stock `/images/home/list-drone.jpg`, never the listing's photo | — | — | — |

- The Search page does not render listing photos (`src/screens/Search.jsx`, no `<img>`).
- Other `onError` handlers that also hide silently: AgroForestry.jsx:52, Articles.jsx:48, Credits.jsx:37, DroneDidi.jsx:45, Homepage.jsx:349, Homepage.jsx:468, Videos.jsx:45, kit.jsx:72.
- **CSP** is in `public/_headers:2` (one line, header for `/*` at :1):
  - `img-src 'self' data: blob: https://images.pexels.com https://images.unsplash.com https://upload.wikimedia.org https://pib.gov.in https://mpinfo.org https://lh3.googleusercontent.com;`
  - `connect-src 'self' https://*.supabase.co https://api.open-meteo.com https://mandi-api.onrender.com https://api.data.gov.in https://api.bigdatacloud.net https://nominatim.openstreetmap.org;`
- **The Supabase storage host is NOT in `img-src`.** `*.supabase.co` appears only in `connect-src`. As a result, every user-uploaded listing photo is blocked by CSP wherever `_headers` applies:
  - ListingCard and ListingDetail show a broken image;
  - the Homepage card hides the photo silently.
- Uploads still work, because the upload goes through `connect-src`.

## (c) Category forms and listing RPCs

- `ENABLED_CATEGORIES = ['equipment','labor','drone_didi','bhusa','agri_inputs','building_materials','warehouse','greenhouse','jugaad','transport','land']` (`src/lib/listings/registry.jsx:22`). The modules are imported at :5-15 from `src/components/categories/<cat>.jsx`.
- **Water tanker is not a category.** It is the equipment type `name_en = 'Water tanker'` (`is_tanker`), with its home tile at `Homepage.jsx:46` (`etype: 'water_tanker'`).
- Shared controls are in `src/components/categories/fields.jsx`. `DateField` (:151-166) is a native `<input type="date">` that stores `YYYY-MM-DD` or null.
- Transport's route fields (`from_location`/`to_location`) are rendered by `Post.jsx:379-382` and validated at `Post.jsx:146-148`.

| Category | details keys (file:line) | Date fields | Client-side pruning |
|---|---|---|---|
| equipment | `equipment.jsx:20-31`: `equipment_type_id, is_tanker, rental_basis, rate_amount, available_now(true), available_from, available_to, equipment_tags[]`. Tanker adds `capacity_litres, tanker_vehicle, water_use, water_source, rate_per_trip, rate_per_1000l, service_radius_km, available_months[]` (:3-5, :224). Batch 9C specs: `spec_version, brand, brand_other, model, year, power_hp, spec_*, output_per_hour, output_unit(_other)`; requirement `min_hp` (:6-9) | **`available_now`** toggle (SegmentedChoice :248-256); **`available_from` / `available_to`** shown only when not "now" (:257-262); from ≤ to checked client-side only (:65-67); tanker `available_months[]` (month chips) | `finalizeDetails` (:110) → `cleanSpecDetails` (:84-108) strips only spec keys and the tags flag. **It does not clear `available_from/to` when `available_now` is true**, so stale dates can be saved |
| labor | `labor.jsx:8-17`: `worker_count, work_type, available_from, available_to, rate_basis, rate_amount` | `available_from` / `available_to` (:56-57); range checked on client (:29) **and server** (0053:131-132) | none; details sent as-is |
| drone_didi | offer `operator_name, drone_type, service_type[], rate_per_acre, min_acres, available_from, available_to, coverage_area, government_scheme, crops_covered, asset_village`; requirement `crop_type, acreage, service_needed, preferred_date, asset_village` (`drone_didi.jsx:5-8,13-22`) | `available_from/to` (:70-71), `preferred_date` (:57) | `finalizeDetails` (:84) prunes to the listing type's keys |
| bhusa | `bhusa.jsx:13-22`: `residue_type, quantity, pickup_arrangement, buyer_type_preference, asking_price, available_from` | `available_from` (:90-94) | none |
| agri_inputs | `agri_inputs.jsx:7-8,16-24`: farmer_surplus `{subtype,input_type,item_name,quantity,asking_price,material_address,condition}`; vendor `{subtype,business_name,input_types[],items_description,price_range,shop_address,contact_phone}` | none | `finalizeDetails` (:99) prunes by subtype |
| building_materials | `building_materials.jsx:8-18`: `material_type, brand_or_grade, quantity, unit, rate_amount, delivery_available, pickup_location` | none | none |
| warehouse | offer `warehouse_type, capacity_quintals, rate, available_from, facilities[], address, contact_name` plus cold-storage `CS_KEYS` (:92); requirement `crop_type, quantity_quintals, duration, preferred_type` (`warehouse.jsx:4-5,94-111`) | `available_from` (:60); cold storage `space_updated`, `season_from`, `season_to` (:73,:76-77) | `finalizeDetails` (:94) prunes |
| greenhouse | offer `vendor_subtype, structure_types[], pipe_gauge, film_micron, warranty_years, price_range_per_sqm, districts_served, mp_agro_year, provider_declared`; requirement `area_sqm, structure_type, crop, budget, village` (`greenhouse.jsx:2-4,9-17`) | none | `finalizeDetails` (:65) prunes |
| jugaad | offer `offer_type, innovation_name, what_does, crop_activity, demo_video, price, tested, village, not_road_vehicle('true'), photo_urls[]`; requirement `innovation_name, problem, village` (`jugaad.jsx:3-5,118-136`) | none | `finalizeDetails` prunes (drops `__photoFiles`) |
| transport | `transport.jsx:11-20`: `from_location, to_location, vehicle_type, capacity, rate_basis, rate_amount` | none | none |
| land | `land.jsx:13-25`: `size_acres, arrangement[], water_source, crop_id, season, price_type, price_amount, contact_phone?, photo_urls[]` | none | `finalizeDetails` (:137-144) drops an empty `contact_phone` |

Post also adds `provider_declared`, `photo_urls` and `map_url` to the details (`src/screens/Post.jsx:180`).

### RPCs
- **Client** calls only `create_listing_with_location` (`src/lib/listings/listingsApi.js:79-94`, 14 parameters).
- **Latest `create_listing_with_location` is `supabase/migrations/0063_equipment_specs.sql:20-158`.** Earlier versions: 0054:56, 0061:23, 0062:25.
  - Its own checks:
    - same-request-id retry returns the existing listing (:58-62);
    - equipment-offer spec rules only when `spec_version = '1'` (:65-106);
    - transport `from_location` / `to_location` required (:108-111);
    - agri_inputs blanks the contact phone for hidden owners via `jsonb_set` (:114-123).
  - It then calls `public.create_listing(...)` (:126-130).
- **Latest `create_listing` is `supabase/migrations/0053_building_materials_category.sql:25-215`.** It is defined in 22 files from 0003 onwards; none after 0053.
  - Checks:
    - category whitelist (:68-70);
    - land-only `contact_phone` strip (:59-60);
    - presence/range checks for required keys per category (:105-196). Example for labor: `if (p_details->>'available_from') is not null and (p_details->>'available_to') is not null and (p_details->>'available_from')::date > (p_details->>'available_to')::date then raise exception 'invalid_date_range'` (:131-132).
  - It inserts `v_details` unchanged: `details, ... ) values ( ..., v_details, ...` (:198-206).
- **How `details` is validated**: required keys and some values are checked per category. **There is no key whitelist and unknown keys are not stripped**; the jsonb is stored as-is, apart from the land `contact_phone` removal (0053:60) and the agri_inputs phone blanking (0063:119). **Equipment `available_*` dates are not checked on the server.**
- **Update-listing RPC: none.** No function updates `listings.details` after creation. The state-only RPCs are:
  - `set_listing_availability` (`0032_legal_agroforestry_availability_profile.sql:199`): `is_available`
  - `set_listing_unavailable` (`0023_schemes_content_features.sql:249`)
  - `close_listing` (client call at `listingsApi.js:298`)
  - The only other writes to `details` are one-off data migrations: `0028_land_acreage.sql:8`, `0030_private_listing_contact.sql:25`, `0031_scope_private_contact_to_land.sql:11,17`.
- **Constraints and triggers**: `details jsonb not null` (`0001_schema.sql:70`). The only CHECKs are on `listing_type`, `category` (`listings_category_check`, last widened in `0053:15-19`), `status`, and `land_offer_requires_self_declared` (0001:74-75). **There is no CHECK and no trigger on `listings.details`**; a grep for triggers on listings finds none.

## (d) Homepage "Farm marketplace categories" tiles

- **Section**: `src/screens/Homepage.jsx:296-306`. The heading is `<SectionHeader title={t('cats_title')} />` (:298), with `cats_title: { hi: 'कृषि बाज़ार की श्रेणियाँ', en: 'Farm marketplace categories' }` (`src/lib/i18n/strings.js:1380`).
- **Grid**: `data-testid="home-cat-grid"` (:300) renders the 15 tiles of `CATEGORY_TILES` (:44-60). Each tile is `PhotoTile` with `onClick={() => (c.path ? navigate(c.path) : tileClick(c.to, c.etype))}` (:303). `tileClick` is at :170 (experts go to signup when logged out).
- **`PhotoTile`** (`src/components/home/kit.jsx:69-80`):
  - It is a **`<button type="button">`**, not an `<a>` or `Link`, so there is no href, no middle-click or open-in-new-tab, and no crawlable link.
  - Classes: `relative w-full overflow-hidden text-left`, plus inline height/radius/background (:71).
  - **No hover, focus or focus-visible styles and no `cursor` class.** The only overlay is a static `rgba(23,51,35,.38)` (:73).
  - The image is lazy, `object-cover`, and hidden silently on error (:72).
- **Other uses of PhotoTile**: none. The only import is `Homepage.jsx:11` and the only render is :303; nothing in `e2e/` or `tests/`.
- **Global cursor**: `src/index.css` has no `cursor` rule; its base layer sets only `min-height:44px` on button, a, select, input and textarea (:29-35).
  - Tailwind is **v4** (`package.json:65,68`; `@import 'tailwindcss'` at index.css:1). v4's preflight gives `<button>` the default cursor, so the tiles show an arrow, not a hand.
  - The only `cursor:pointer` rules are scoped elsewhere: `src/features/guide/guide.css:10,80` and `src/features/home-live/homeLive.css:28`.

## (e) "शाबाश" / Shabash / Bravo

- **Only one occurrence** in `src/`, `e2e/`, `tests/` and `public/`:
  - `src/lib/i18n/strings.js:2411`: `guide_well_done: { hi: 'शाबाश! अब असली ऐप पर आज़माइए या अगला डेमो देखिए।', en: 'Well done! Try the real app, or watch the next demo.' }`
- No "Shabash", "shabash", "Bravo" or "bravo" anywhere. `public/search-index.json` has 0 matches.
- **Where it is shown**: the guide's finish card, `data-testid="demo-finish"`:
  - `src/features/guide/DemoPlayer.jsx:370`, below the heading `guide_${demoId}_fin` (:369);
  - `src/features/guide/TourExplorer.jsx:194`, below `guide_tour_fin` (:193).
- **Tests**: no test checks the text. `e2e/guide-10c.spec.js` checks only that `demo-finish` is visible (:101, :127, :137, :246, :332, :501).
- A related string uses "Well done!" in English: `guide_badge_title` (strings.js:2393).

## (f) /msp trend

- **Route**: `/msp` and `/msp/:crop` both use `<Msp />` (`src/App.jsx:178-179`); the component is `src/screens/Msp.jsx`.
- **Fetch**: `trendDays` state defaults to 30 (:61). An effect calls `fetchMandiHistory(crop.mandi_en, trendDays)` (:88-92).
- **`fetchMandiHistory(commodityEn, days = 90)`** (`src/lib/mandi/mandiApi.js:135-149`):
  - Query: `from('mandi_prices').select('modal_price,price_date').eq('commodity_en', commodityEn).gte('price_date', isoDay(-days)).order('price_date', {ascending:true}).limit(5000)`.
  - `isoDay` is a UTC-date helper (:42-46).
  - Rows are grouped by `price_date` and each day becomes the **median `modal_price` across all markets** (:145-148). It returns `[{date, price}]`, sorted ascending.
  - **There is no market/district filter**, so MP-wide and Sagar-division markets are mixed.
  - `fetchMandiMonthly` reuses it with `days = 365*3+5` (:152-155). With ascending order and the PostgREST row cap, the newest rows are the ones cut off first if the server cap is below 5000. The cap value is not in the repo (no `supabase/config.toml` `max_rows`).
- **Tabs**: `[7, 30, 90].map(...)` buttons labelled `{d}{t('days_short')}` (Msp.jsx:353). These are **nominal calendar days**: the query window is `today − d` (UTC), not "the last d data points". If fewer data days come back than `trendDays`, `msp_only_ndays` is shown with `{n} = history.length` (:361-363).
- **Trend sentence** (:165-170): `diff = last.price − first.price`. The key is `msp_trend_up` if `diff >= 0`, else `msp_trend_down`; `{n}` is `rs(|diff|)` and `{d}` is `trendDays`, the nominal value rather than the actual date span. It is rendered twice, above the chart (:356) and below it (:360). The text "data from `history[0].date`" is shown raw as ISO `YYYY-MM-DD` (:364).
- **Strings** (`src/lib/i18n/strings.js`):

| Key | Line | Hindi | English |
|---|---|---|---|
| `days_short` | :1556 | `'दिन'` | `'d'` |
| `data_from` | :1567 | — | — |
| `msp_trend_h` | :1657 | `'रुझान'` | `'Trend'` |
| `msp_trend_up` | :1658 | `'{d} दिन में {n} चढ़ा'` | `'Up {n} in {d} days'` |
| `msp_trend_down` | :1659 | `'{d} दिन में {n} गिरा'` | `'Down {n} in {d} days'` |
| `msp_only_ndays` | :1735 | `'इस अवधि में केवल {n} दिन का डेटा उपलब्ध'` | `'Only {n} days of data available in this window'` |

- **`TrendChart`** (`src/components/pages/shared.jsx:209-260`):
  - Inline SVG, 640×200.
  - **The X axis is spaced by index, not by date** (`x(i)` :216), so missing days are squeezed together.
  - There are **no date labels on the X axis**; only min/max ₹ labels (:239-240) and an MSP dashed line (:241-244).
  - Per-point `<title>` shows the raw ISO date (:247-249), and there is an sr-only table (:251-255).
- **Existing date and month helpers**:
  - `src/content/months.js:4` `MONTHS_HI` (short; already imported by Msp.jsx:11 for `MonthBars`);
  - `src/content/months.js:7-8` `MONTHS_FULL_HI` / `MONTHS_FULL_EN`, used by `src/lib/mela/melaFormat.js:5` (`melaDateLabel` :71) and KisanMela.jsx:14;
  - `src/lib/listings/catalog.js:138-139` `MONTH_OPTIONS` (hi/en short);
  - `src/lib/events/eventsApi.js:5-12` `indiaDateString()` (IST `YYYY-MM-DD`);
  - inline `toLocaleDateString` in ArticleDetail.jsx:59, AvailabilityCalendar.jsx:44 and OfflineStamp.jsx:7.
  - There is **no shared `formatDate` helper in `src/lib`**.
- **Schema**:
  - `mandi_prices` is created in `supabase/migrations/0019_mandi_prices.sql:7-21`. Columns: `id uuid pk, commodity_en, commodity_hi, market, district, state default 'Madhya Pradesh', min_price, max_price, modal_price not null, price_date date not null, is_sagar_district bool, fetched_at`. **Unique constraint: `(commodity_en, market, price_date)`** (:20). Index `mandi_prices_date_idx (price_date desc)` (:24). Read access is open to anon through RLS (:26-32).
  - Later changes:
    - `0024_mausam_msp.sql:40` adds `arrivals_tonnes numeric`;
    - `0058_mandi_in_sagar_division.sql:23-24` adds `in_sagar_division bool not null default false`, backfills it (:26-29), and adds index `mandi_prices_division_date_idx (in_sagar_division, price_date desc)` (:31-32).
  - **There is no `source` column.**
- **`scripts/refresh-data.mjs`** writes with `upsertPrices` (:145-154): `upsert(rows, { onConflict: 'commodity_en,market,price_date' })` (:147). If the 0058 column is missing it retries without it (:148-152).
  - Rows use **`price_date: today`**, the run's UTC date, not the record's arrival date (:161, :175).
  - It fetches from the mandi-api wrapper, falling back to data.gov.in. It keeps every Sagar-division market, otherwise one MP market by `MARKET_PRIORITY` (:126-140, :41).
  - It covers 10 commodities (:35-40).
- **`scripts/backfill-mandi-history.mjs`** (114 lines) is **not a real history backfill**. It pages through the data.gov.in "Current Daily Price" resource `9ef84268-…` for `filters[state]=Madhya Pradesh` (:29, :56-72). That resource is only today's snapshot, as the file's own note says (:6-12). It keeps true-MP rows and matches the same 10 commodities by token (:31-48). Each record becomes a row whose `price_date` is parsed from `arrival_date` (dd/mm/yyyy, falling back to today), with `is_sagar_district` / `in_sagar_division` flags (:83-95). It upserts in chunks of 500 on `commodity_en,market,price_date`, with the same missing-column retry (:98-107). It requires `DATA_GOV_IN_API_KEY` (:18-25). The result is a wider MP-wide snapshot for the current day only; it cannot rebuild past days.

## (g) B17: prerender leaks `http://localhost:4178`

**Where it happens in `scripts/prerender.mjs`:**
- Server origin: `const PORT = 4178` (:19); `server.listen(PORT)` (:63); each route is opened at `http://localhost:${PORT}${route}` (:72, :74).
- Serialization: `const html = '<!doctype html>\n' + (await page.content()).replace(/^<!doctype html>/i, '').trim()` (:84), then `writeFile(join(outDir,'index.html'), html)` (:87).
- **There is no post-processing or URL rewriting.** The only `.replace` strips the doctype (:84).
- The SPA fallback re-reads `dist/index.html` from disk on every request (:45).
- `'/'` is the first route (`scripts/lib/prerender-routes.mjs:10`).
- Vite is 8.2.2 (`package.json:69`); `vite.config.js` sets no `base` (default `/`) and has no `renderBuiltUrl`.

**Mechanism.** Vite 8's `__vitePreload` helper runs `dep = assetsURL(dep)` and then `dep = importMetaResolve(dep)`, where `importMetaResolve` is `import.meta.resolve(...)` or `new URL(dep, import.meta.url).href`. It then does `link.href = dep` and appends `<link rel="modulepreload" as="script" crossorigin>`, or `rel="stylesheet"` for CSS, to `<head>` (`node_modules/vite/dist/node/chunks/node.js:28892-28908`). Because the page is running at `http://localhost:4178`, the resolved value is an **absolute** `http://localhost:4178/assets/<chunk>.js`, and that absolute string is written into the `href` attribute. `page.content()` then serializes the live DOM, including these runtime-injected tags, into the file.

On the deployed site those links point at the visitor's own localhost. CSP blocks them: one console error per link, and the route's chunks are not preloaded. Evidence: `docs/review/batch10c/evidence/prod-live/RESULT.md:23` (23 links on `/`, 5 on `/guide/`) and `run1.txt:7,52-55`. The live check hides the noise: `scripts/verify-batch9-live.mjs:67-68` has `CONSOLE_ALLOW = [/localhost:\d+/i, ...]`.

**It gets worse after the first route.** Once `/` is written to `dist/index.html` (:85-87), every later route falls back to that file (:45). So later routes start from the prerendered homepage HTML, which already carries its leaked links.

**Cleanest fix, all in `scripts/prerender.mjs`:**
1. Between :84 and :87, rewrite the origin back to root-relative: `html = html.replaceAll(\`http://localhost:${PORT}/\`, '/')`. This keeps the preload and stylesheet hints valid (same-origin, so CSP allows them). To be stricter, also catch `127.0.0.1` and any port with a regex.
2. Read the pristine `dist/index.html` into memory once, before the server starts, and serve that buffer for the SPA fallback at :45. Then prerendered pages never seed later routes.
3. Optionally, a post-build guard that fails if any `dist/**/index.html` contains `localhost:`. After the fix, the `/localhost:\d+/` allowance in verify-batch9-live.mjs:68 can be removed.
