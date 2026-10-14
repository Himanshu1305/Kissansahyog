# Batch 9 — Push notifications: plan only (Phase 7.1)

Written 2026-10-15 during the overnight run. **Nothing in this file has been built.** No code, no
migration, no dependency, no Firebase project, no Supabase change. It is the plan for a later batch,
plus the list of things only you can create.

---------------------------------------------------------------------

## 1. Where the app stands today (read from the repo, not guessed)

| Item | Value | Where |
|---|---|---|
| Capacitor | **major 8** (`@capacitor/core` / `android` / `cli` `^8.5.3`, `@capacitor/app` 8.1.2, `@capacitor/network` 8.0.1, `@capacitor/splash-screen` 8.0.2) | `package.json` lines 47–61 |
| Push plugin | **not installed** → would be `@capacitor/push-notifications` **8.x** (the plugin's major must match Capacitor's) | — |
| App ids | production `com.kissansahyog.app` ("Kisan Sahyog"), staging `com.kissansahyog.app.staging` ("Kisan Sahyog (Staging)"), chosen with `-PksFlavor=staging` (a Gradle property, **not** Android productFlavors) | `android/app/build.gradle` lines 1–21 |
| SDK levels | minSdk 24, compileSdk 36, **targetSdk 36** → the Android 13 notification permission applies | `android/variables.gradle` |
| Google-services Gradle plugin | already on the classpath (`com.google.gms:google-services:4.4.4`) | `android/build.gradle` line 11 |
| Where `google-services.json` is read | **`android/app/google-services.json`** — Capacitor's template applies the plugin only if that file exists, otherwise logs "Push Notifications won't work" | `android/app/build.gradle` last 8 lines |
| Is that file ignored by git? | **No.** The line `# google-services.json` in `android/.gitignore` (line 67) is commented out | `android/.gitignore` |
| Permissions today | INTERNET, ACCESS_NETWORK_STATE, ACCESS_COARSE/FINE_LOCATION, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS — **no POST_NOTIFICATIONS** | `android/app/src/main/AndroidManifest.xml` lines 41–50 |
| Server code we already run | Cloudflare Pages Functions (`functions/api/feedback.js`, `functions/transcribe.js`, `geo.js`, `geocode.js`); a GitHub Actions cron every 3 h (`.github/workflows/refresh-mandi-prices.yml`, uses `SUPABASE_SERVICE_ROLE_KEY` from GitHub secrets). **No Supabase Edge Functions exist** (`supabase/functions/` is absent) | `functions/`, `.github/workflows/` |
| Existing "alerts" data | `alert_subscriptions` table + `subscribe_alert` RPC: **capture only**, channel `whatsapp`, keyed by phone, `alert_types` default `{weather,price}`, `crops[]`, consent text stored. Written by `DailyUpdateSignup` ("capture only … sends nothing") | `supabase/migrations/0024_mausam_msp.sql` §1c, `src/components/pages/shared.jsx:149` |
| Content we could alert on | mandi prices (refreshed by the 3-hourly cron), rain classification (`src/lib/weather/rainAlert.js`, IMD heavy/very heavy/extreme), schemes with a free-text deadline (`yojanas.deadline_note_hi/en`, **text, not a date**) | `supabase/migrations/0021_community_features.sql:114` |

---------------------------------------------------------------------

## 2. What we would send (first version: three kinds, all opt-in, all off by default)

| Kind | Who gets it | When | Source of truth | Example (Hindi first) |
|---|---|---|---|---|
| **Daily mandi price** for the crops the farmer chose, at the mandi they chose | Users who ticked "मंडी भाव" and picked ≥ 1 crop | Once a day, ~2:30–3:30 PM IST, after the price refresh has run; **only if a new price date arrived** (no message on days without new data) | `mandi_prices` (latest date per crop × mandi) | "आज सागर मंडी: गेहूँ ₹2,450/क्विंटल (कल से +₹30)। सभी भाव देखें →" |
| **Rain alert** for the farmer's area | Users who ticked "बारिश की चेतावनी" and have a saved area (rounded ~10 km cell, never the exact position) | When the forecast for the next 48 h reaches IMD **heavy (yellow) or worse**; at most **one per area per day** | `weather_cache_v2` + the existing `getRainAlert()` rules | "⚠️ अगले 48 घंटे में आपके इलाके में भारी बारिश (पीली चेतावनी) की संभावना। कटी फसल ढककर रखें। →" |
| **Scheme deadline** | Users who ticked "योजना की आख़िरी तारीख़" | 7 days and 1 day before the last date | Needs a **real date column** on `yojanas` (today only free text) — a later migration, not tonight | "PM-KISAN e-KYC की आख़िरी तारीख़ 7 दिन बाद है। कैसे करें →" |

Rules for every message: Hindi first, English if the user chose English; no phone numbers or names of
other people in a notification; tapping opens the matching page in the app (the home page price section or `/msp`,
`/mausam`, `/yojana/…`; exact routes chosen in the implementation batch); quiet hours 9 PM–7 AM IST (rain alerts excepted when IMD orange/red);
hard cap 2 notifications per user per day.

Not in the first version (listed so nobody adds them by accident): marketing, "new listing near you",
chat messages, anything to people who did not opt in.

---------------------------------------------------------------------

## 3. Token table — design in words (staging first; SQL is NOT written tonight)

A new table, created **only on the staging project first** (`wzxtqbqlahyahsnoqqva`), and on
production only after a staging test week. Proposed name `push_devices`. One row per app install:

| Column | Meaning |
|---|---|
| `id` | row id |
| `fcm_token` | the device token from Firebase (unique). Treat as personal data |
| `platform` | `android` (iOS later) |
| `app_id` | `com.kissansahyog.app` or `.staging` — a staging row must never reach production |
| `profile_id` | **optional**. Empty for a visitor who never logged in |
| `language` | `hi` / `en` |
| `topics` | which kinds the user switched on: `price`, `rain`, `scheme` |
| `crops`, `mandi` | for the price alert |
| `grid_key` | the rounded ~10 km weather cell for the rain alert (same rounding as 7L-2) — never latitude/longitude |
| `consent_text`, `consented_at` | the exact Hindi/English sentence the user agreed to, and when (same pattern as `alert_subscriptions`) |
| `created_at`, `last_seen_at` | `last_seen_at` refreshed each app start |
| `is_active` | false after unsubscribe, uninstall (FCM answers "UNREGISTERED") or 60 days without `last_seen_at` |

Access rules (proposal):

- Nobody can **read** the table from the browser/app (no anon/authenticated select), like `login_attempts`.
- The app writes **only through one function**, e.g. `register_push_device(token, app_id, language,
  topics, crops, mandi, grid_key, consent_text)`, which upserts by token and validates every field.
  An `unregister_push_device(token)` sets `is_active = false`. Knowing the token is the proof of
  ownership; no `p_actor_id` is trusted (see BACKLOG B1 — the `admin_*` functions show why).
- Only the sender (service role) reads the table.
- Keep it separate from `alert_subscriptions` (that one is keyed by phone for a future WhatsApp
  channel). Later, the settings screen can show both.
- Delete inactive rows after 90 days.

---------------------------------------------------------------------

## 4. Opt-in screen — wording (Hindi first; for human review)

Shown **only** when the user taps "सूचनाएँ चालू करें" on the Home/Mausam/Mandi page or in Profile — never
on first launch, never before the user has seen the app work. Android's own permission dialog appears
**only after** the user presses the green button on our screen.

> **सूचनाएँ पाएँ? / Get notifications?**
>
> हम आपको सिर्फ़ वही भेजेंगे जो आप चुनेंगे:
> - ☐ **मंडी भाव** — आपकी चुनी फ़सल का आज का भाव, दिन में एक बार
> - ☐ **बारिश की चेतावनी** — आपके इलाके में भारी बारिश की संभावना हो तब
> - ☐ **योजना की आख़िरी तारीख़** — सरकारी योजना की तारीख़ नज़दीक हो तब
>
> रात 9 बजे से सुबह 7 बजे तक कोई सूचना नहीं (तेज़ बारिश की चेतावनी छोड़कर)। दिन में 2 से ज़्यादा नहीं।
> आप कभी भी प्रोफ़ाइल → सूचनाएँ में जाकर इन्हें बंद कर सकते हैं।
>
> इसके लिए आपके फ़ोन की एक पहचान (टोकन), आपकी चुनी फ़सलें/मंडी और आपके इलाके का अंदाज़न
> 10 किमी का क्षेत्र हमारे सर्वर पर रखा जाएगा। आपका सही स्थान नहीं रखा जाएगा। ज़्यादा जानकारी: गोपनीयता नीति।
>
> **[ हाँ, सूचनाएँ चालू करें ]**   [ अभी नहीं ]

English (same screen when the app is in English):

> We will only send what you choose: today's mandi price for your crops (once a day); a rain warning
> when heavy rain is likely in your area; a reminder when a government scheme's last date is near.
> Nothing between 9 PM and 7 AM (except severe rain warnings), never more than 2 a day. Turn them off
> any time in Profile → Notifications. To do this we keep a device code (token), your chosen
> crops/mandi and your area to about 10 km on our server — never your exact location.
> **[Yes, turn on notifications]** [Not now]

All boxes start **unticked** (cf. the 7L-2 lawyer question about pre-selected consent). New strings
go only into `src/lib/i18n/strings.js` (Hard rule 9). A Hindi speaker must read this before release.

If the user refuses Android's dialog: show once "ठीक है। बाद में प्रोफ़ाइल → सूचनाएँ से चालू कर सकते हैं।"
and never ask again automatically.

---------------------------------------------------------------------

## 5. Android 13+ notification permission

- Since targetSdk is 36, Android 13+ (API 33+) requires the **runtime permission
  `POST_NOTIFICATIONS`**. The implementation batch adds
  `<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />` to
  `android/app/src/main/AndroidManifest.xml` and asks through the plugin's
  `requestPermissions()` — only after the opt-in screen above.
- Android 12 and older (minSdk 24 → Android 7 phones exist among farmers): no runtime dialog;
  notifications are allowed by default, so **our own opt-in screen is the only consent** — the
  token is not sent to the server until the user ticks something and presses "हाँ".
- Android gives an app about **two chances** to show the dialog; after two refusals it never shows
  again. So: never ask on launch, and offer a "open Android settings" link afterwards.
- Create an Android **notification channel** per kind ("मंडी भाव", "बारिश चेतावनी", "योजना") so the user
  can switch one off in Android settings too. Rain = high importance; the others = default.
- The test expectations file (`expected.mjs`, T2 permission set from 8A) must be updated in the
  same batch, or T2 will fail — this is intentional.
- A small monochrome notification icon (`ic_stat_*`, white on transparent) is needed; the launcher
  icon cannot be used as-is.

---------------------------------------------------------------------

## 6. How a message would be sent

FCM's old "server key" API was switched off by Google in 2024. Sending now uses the **FCM HTTP v1 API**
(`https://fcm.googleapis.com/v1/projects/<firebase-project-id>/messages:send`) with a short-lived
OAuth token made from a **Firebase service-account JSON**. That JSON is a secret.

Three places it could run — recommendation first:

1. **Supabase Edge Function `send-push`** (recommended for the scheduled alerts). Runs next to the
   data, reads `push_devices` with the service role, loops in batches of ~500, sends, marks tokens
   that come back `UNREGISTERED` as inactive. Secret stored as a Supabase function secret
   (`FCM_SERVICE_ACCOUNT_JSON`). Triggered by Supabase's scheduler (pg_cron) — **which is a
   migration**, so it is a later, reviewed step; or by the existing GitHub cron calling the
   function URL with a shared secret header (no migration).
2. **GitHub Actions step** after `node scripts/refresh-data.mjs` in
   `.github/workflows/refresh-mandi-prices.yml`: a script that runs only once a day (the 2:30 PM IST
   run), compares the newest price date with yesterday's and sends. Secret as a GitHub repo secret.
   Simplest, already has the service-role key; but GitHub cron can be late by 10–30 min.
3. **Cloudflare Pages Function** (`functions/api/…`, like `feedback.js`): good for an **admin-triggered**
   send ("send this scheme reminder now") from the Admin page. Not good for schedules (Pages has no
   cron; a separate Cloudflare Worker would be needed). Secret as a Pages environment secret. Must
   check a real admin session — and today's admin check is weak (BACKLOG B1), so this option waits
   until B1 is fixed.

Staging and production send from **separate** credentials (see §8): the staging sender can only reach
staging-app installs, so a test run can never message real farmers.

---------------------------------------------------------------------

## 7. Privacy implications

- **New personal data:** FCM token (a device identifier), chosen crops/mandi, a ~10 km area cell,
  consent record, last-seen time. If linked to `profile_id`, it ties a device to a named person —
  keep that link optional.
- **New processor:** Google Firebase Cloud Messaging receives the token and the message text. The
  Privacy page (`/privacy`) must name it, say what is sent, why, how long it is kept (proposal: until
  turned off + 90 days), and how to turn it off. Lawyer review (BACKLOG L1) should cover it; DPDP
  Rules 2025 consent must be specific and unbundled — hence separate unticked boxes.
- **Play Console Data-safety form** (Phase 6 pack) changes: "Device or other IDs — collected,
  purpose: app functionality, optional"; "Approximate location" for weather should already be declared by the Phase 6 Data-safety answers (check there).
- **Message content** never contains another person's name/phone or a listing's contact.
- **No exact location** in the table — reuse the 7L-2 rounding to the cell centre.
- Uninstall/unsubscribe → token marked inactive at the next send, deleted after 90 days.
- Firebase Analytics / Crashlytics are **not** to be added with it (the Firebase setup wizard
  suggests them; say no). Only the Messaging part is needed.

---------------------------------------------------------------------

## 8. What YOU must create by hand (each step a few minutes)

Decision taken tonight (DECISIONS.md, Phase 7): **two Firebase projects**, one for staging and one
for production, mirroring the two Supabase projects — so staging can never send to real farmers.

| # | What | Where to click | What you get | Where it goes |
|---|---|---|---|---|
| 1 | Firebase project **`kisan-sahyog-staging`** | https://console.firebase.google.com → Add project. **Turn Google Analytics OFF** | a Firebase project | — |
| 2 | In it, add an **Android app** with package name **`com.kissansahyog.app.staging`** (nickname "Kisan Sahyog Staging"); skip the SHA-1 step | Project settings → General → Add app → Android | `google-services.json` (staging) | Save as `C:\Users\usdvi\ks-firebase\staging\google-services.json` (outside the repo). The build script will copy it to `android/app/google-services.json` when building the staging APK |
| 3 | Firebase project **`kisan-sahyog`** (production), Analytics OFF | same | a Firebase project | — |
| 4 | In it, add an Android app with package **`com.kissansahyog.app`** | same | `google-services.json` (production) | `C:\Users\usdvi\ks-firebase\prod\google-services.json` (copied to `android/app/google-services.json` for the production build) |
| 5 | **FCM server credential (staging)**: Project settings → Service accounts → "Generate new private key" | staging project | a `.json` key file — **SECRET** | `C:\Users\usdvi\ks-firebase\staging\fcm-service-account.json`. Later pasted into the **staging** Supabase project → Edge Functions → Secrets as `FCM_SERVICE_ACCOUNT_JSON` (or GitHub secret `FCM_SERVICE_ACCOUNT_JSON_STAGING`). Never in git, chat or a report |
| 6 | Same for production | production project | `.json` key — **SECRET** | `C:\Users\usdvi\ks-firebase\prod\fcm-service-account.json`; production secret store only, **after** the staging test week |
| 7 | Check that **Cloud Messaging API (V1)** shows "Enabled" | Project settings → Cloud Messaging (both projects) | — | — |
| 8 | Back up the `ks-firebase` folder with the keystore backup (same place as `C:\Users\usdvi\ks-release-keys\`) | — | — | — |

Notes:
- `google-services.json` is a client config (it ends up inside every APK anyway), but it is
  per-environment, so the implementation batch will **add `android/app/google-services.json` to
  `android/.gitignore`** and copy the right one at build time. The service-account JSON is a real
  secret and must never be inside the repo folder at all.
- Nothing has to be paid: FCM is free; Supabase Edge Functions are within the free quota at this size.
- If you would rather have one Firebase project for both apps (one combined `google-services.json`,
  no copy step), that also works technically — but then the staging credential can send to
  production phones. Not recommended.

---------------------------------------------------------------------

## 9. Implementation steps for the later batch (for Claude Code, after you finish §8)

1. `npm install @capacitor/push-notifications@^8` → `npx cap sync android`.
2. `scripts/build-android.mjs`: copy the right `google-services.json` from `C:\Users\usdvi\ks-firebase\<target>\`
   before Gradle; refuse to build if the file's `package_name` does not match the target app id; add
   the file to `android/.gitignore`.
3. Manifest: `POST_NOTIFICATIONS`; notification icon; three channels.
4. App code (native only, `isNative()`): opt-in screen, Profile → Notifications settings, register
   token → `register_push_device`, refresh `last_seen_at` on start, handle tap → route.
5. Migration (staging first, applied by you): `push_devices` + the two functions; later a `yojanas`
   real date column.
6. Sender (Edge Function or GitHub step), with quiet hours, daily cap, dedupe, `UNREGISTERED` cleanup,
   and a **dry-run mode** that logs who would get what without sending.
7. Tests: emulator with Google Play image (the current `ks_test_api36` image must have Google APIs
   for FCM; check), permission granted/denied/never-asked, tap opens the right page, staging send
   to a KSTEST device only, no token in logs.
8. Privacy page + Data-safety update; Hindi review of all strings.

## 10. Effort estimate

| Part | Claude Code time | Your time |
|---|---|---|
| §8 Firebase set-up | — | 30–45 min |
| Plugin, build-script copy, manifest, channels, icon | 0.5 day | — |
| Opt-in screen + settings + token registration (hi/en) | 1 day | 15 min Hindi review |
| Migration (`push_devices`, functions) + staging apply | 0.5 day | 10 min to apply |
| Sender (price + rain), dry-run, cleanup | 1–1.5 days | — |
| Scheme deadlines (needs date column + data entry) | 0.5 day | 1–2 h entering dates |
| Tests on emulator + real phone | 0.5–1 day | 30 min on your phone |
| Privacy text + Data safety + lawyer | — | lawyer time |
| **Total** | **≈ 4–5 working days** | **≈ 3 h + lawyer** |

Recommended order: price alert first (data is already reliable and refreshed by the cron), rain alert
second, scheme deadlines last (needs data that does not exist yet).
