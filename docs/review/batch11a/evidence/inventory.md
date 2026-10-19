# Batch 11A — Phase 0 inventory (staging `wzxtqbqlahyahsnoqqva`, 2026-10-19)

## 1. Public functions whose first parameter is `p_actor_id uuid`

Catalog query: `pg_proc` in schema `public`, `proargnames[1] = 'p_actor_id'` and `proargtypes[0] = uuid`.
No overloads exist for any of them. No other function takes `p_actor_id` in a later position.
The only other function with an actor-like parameter name was `get_mela_interest_digest(p_as_of date)` (not an actor).

**SECURITY DEFINER, plpgsql — 96**

accept_listing_consents, admin_answer_sawaal, admin_delete_article, admin_delete_event, admin_delete_listing,
admin_delete_mela, admin_delete_page_faq, admin_delete_procurement, admin_delete_safalta, admin_delete_sawaal,
admin_delete_video, admin_list_experts, admin_publish_candidate, admin_set_expert_active,
admin_set_input_price_active, admin_set_listing_disabled, admin_set_listing_sponsored, admin_set_mela_active,
admin_set_mela_status, admin_set_msp_active, admin_set_resource_active, admin_set_safalta_featured,
admin_set_safalta_published, admin_set_sawaal_featured, admin_set_sawaal_published, admin_set_site_setting,
admin_set_subscription_active, admin_set_video_active, admin_set_yojana_active, admin_set_yojana_featured,
admin_split_mela, admin_update_cs_directory, admin_upsert_article, admin_upsert_event, admin_upsert_expert,
admin_upsert_input_price, admin_upsert_mela, admin_upsert_msp, admin_upsert_page_faq, admin_upsert_procurement,
admin_upsert_resource, admin_upsert_safalta, admin_upsert_video, admin_upsert_yojana, close_listing,
create_listing, create_listing_with_location, delete_account, delete_my_listing, get_admin_articles,
get_admin_availability, get_admin_availability_listings, get_admin_data_health, get_admin_events,
get_admin_farmer_profiles, get_admin_input_prices, get_admin_listings, get_admin_mela_candidates,
get_admin_melas, get_admin_msp, get_admin_page_faqs, get_admin_procurement, get_admin_resources,
get_admin_safalta, get_admin_sawaal, get_admin_source_stats, get_admin_stats, get_admin_subscriptions,
get_admin_unresolved_villages, get_admin_users, get_admin_vendor_listings, get_admin_videos, get_admin_yojana,
get_carbon_suggestions_admin, get_cs_claims, get_cs_directory_admin, get_feedback_messages,
get_listing_reports, get_recent_mela_merges, get_search_misses, get_whatsapp_optins, moderate_feedback,
queue_listing_photo_deletions, remove_listing, require_admin, resolve_carbon_suggestion, resolve_cs_claim,
resolve_listing_report, set_feedback_status, set_language, set_listing_availability,
set_listing_unavailable, set_mela_interest, set_my_listing_disabled, update_kisan_profile, update_profile

(includes the Batch 10G functions `delete_my_listing`, `set_my_listing_disabled`, `admin_delete_listing`,
`admin_set_listing_disabled`, `queue_listing_photo_deletions`.)

**SECURITY DEFINER, SQL language — 4**

get_availability_nudges, get_my_listings, get_my_mela_interests, get_my_pending_photo_deletions

**Not SECURITY DEFINER — 0**

## 2. Login / registration functions (not actor-based)

| function | args | proof of identity today |
|---|---|---|
| `app_login(p_phone)` | phone | **none** — returns the whole profile (incl. `id`) for any registered non-admin number |
| `app_register_phone(...)` (0064) | name, phone, place, language, disclaimer, show_details | **none** — anyone can register any number |
| `app_signup(...)` (old pincode sign-up) | name, phone, village, pincode, language, disclaimer | **none** — older phone-only registration, still granted |
| `app_login_email()` | — | Supabase Auth (`auth.uid()`) |
| `app_register(...)`, `app_signup_email(...)` | — | Supabase Auth (`auth.uid()`) |
| `app_login_email_guard(p_email, p_failed)` | — | throttle only |
| `login_is_locked`, `login_record_attempt` | identifier | helpers (not SECURITY DEFINER) |

## 3. Site settings

`public.site_settings(key text pk, value jsonb, updated_at)`; RLS policy `ss_read` (select) for anon and
authenticated; written by `admin_set_site_setting(p_actor_id, p_key, p_value)` (requires admin). Existing keys:
`mausam_msp_content_reviewed`, `mela_last_broad_search_at`. Fits the two flags (boolean jsonb values).
Extensions: `pgcrypto` (Supabase `extensions` schema), `uuid-ossp`, `supabase_vault`.

## 4. Client session

- `src/lib/auth/authService.js`: `SESSION_KEY = 'ks_session_v1'` (localStorage, the profile JSON).
  `storeSession(profile)` writes it; `getCurrentUser()` reads it; `logout()` removes it and signs out of Supabase Auth.
- `src/lib/supabaseClient.js`:
  - `supabase` — anon data client, `persistSession: false`. In the Android app its `global.fetch` is
    `offline/cachedFetch.js` (public reads cached on the phone). **Every actor RPC goes through this client** with
    `p_actor_id = profile.id` (`listingsApi.js`, `adminApi.js`, `inputsApi.js`, `melaApi.js`, `LanguageToggle.jsx`,
    `authService.js`).
  - `supabaseAuth` — Supabase Auth client (`storageKey: 'ks_sb_auth'`), used only for e-mail sign-in/sign-up and
    the `auth.uid()` RPCs (`app_login_email`, `app_register`, `app_signup_email`). It never calls an actor RPC.
- E-mail users: after `signInWithPassword`, `app_login_email` returns the profile which is stored like a phone
  user's; afterwards they call actor RPCs exactly like phone users (anon client + `p_actor_id`). So `auth.uid()`
  is **not** available in the actor RPCs, which is why a separate session token is needed for both kinds of user.
- Admins sign in by e-mail only (`app_login` refuses admins).

## 5. Android / Capacitor

- Bundled pages run on `https://localhost` (Android) / `capacitor://localhost` (iOS).
- `src/lib/apiBase.js` `apiUrl(path)`: on the website the path is relative; in the app it is
  `VITE_API_ORIGIN + path`, fixed at build time by `scripts/build-android.mjs` (production `https://kissansahyog.com`,
  staging `https://staging.kissansahyog.com`, `--local-api` `http://localhost:8788`).
- `functions/_middleware.js` answers CORS for exactly those two app origins (preflight 204, allow-headers
  `content-type`, methods GET/POST/OPTIONS). `public/_routes.json` includes `/api/*` so new `/api/otp/*`
  functions are covered without a change there.
- Supabase REST is called directly from the app (absolute URL), not through a Pages Function.

## 6. Guide / demo OTP

- `src/features/guide/config.js`: `export const GUIDE_OTP_LIVE = false` — a **build-time constant**.
- `src/features/guide/demos/register.js` builds the register demo at module load:
  `buildRegisterDemo({ otpLive: GUIDE_OTP_LIVE })`; with `otpLive` true it adds "Send OTP", a code box with the
  example code `482159` and "number verified".
- Tests pin it: `tests/unit/guide-otp.test.mjs` (asserts false), `e2e/guide-10c.spec.js` (F.5: no OTP step).
- Not driven by the runtime flag → left `false` in this batch (see DECISIONS, SHIP.md says what to flip).

## 7. Spike — custom header to Supabase REST (decides Part B)

See `spike/README.md`. **RAN-PASSED**: header design used.
