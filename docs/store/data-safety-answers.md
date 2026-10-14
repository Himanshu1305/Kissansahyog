# Play Console — Data safety form answers (DRAFT)

App: Kisan Sahyog, production package `com.kissansahyog.app`, versionName 0.1.0, versionCode 1
(`android/app/build.gradle:18-23`). The staging package `com.kissansahyog.app.staging` is for
testing only and is NOT published.

Status: DRAFT, written from the code on branch `android-app` (HEAD `05afb36`) on 2026-10-15.
**Needs founder + lawyer review before it is pasted into Play Console** (backlog L1/L2:
`docs/review/batch9/BACKLOG.md:26-27`). Google requires the privacy policy to match these answers,
and the live `/privacy` page does not yet (see §6 and `privacy-policy-additions.md`).

How to read the tables: "Collected" means the data leaves the phone (to our servers or to a
third party called by the app). "Shared" uses Play's meaning: given to a third party, NOT counting
(a) service providers processing it for us, (b) things the user deliberately makes public or
sends to another user. Where it is a judgement call, the **conservative answer** is given and the
alternative is noted — a human decides.

---------------------------------------------------------------------

## 1. Top-level questions

| Question | Answer | Evidence |
|---|---|---|
| Does your app collect or share any of the required user data types? | **Yes** | §2 |
| Is all of the user data collected by your app encrypted in transit? | **Yes** — every server address is `https://`; the production build sets `usesCleartextTraffic=false` (only the local test build turns it on) | `android/app/build.gradle:12,19`, `android/app/src/main/AndroidManifest.xml:7`, `src/lib/apiBase.js:9-12`, `capacitor.config.json` (`androidScheme: https`) |
| Do you provide a way for users to request that their data is deleted? | **Yes** — in-app (Profile → "अकाउंट डिलीट करें / Delete Account") and by e-mail. **But see the gaps in §5 — fix or disclose before submission.** | `src/screens/Profile.jsx:102-110,233-241`, `src/lib/auth/authService.js:334-339`, `supabase/migrations/0011_p3_profile.sql:52-68` |
| Account creation method | Username/e-mail + password (Supabase Auth) and mobile number. Accounts are optional — browsing needs no account. | `src/lib/auth/authService.js:246-287` (register: e-mail, password, mobile, place), `src/App.jsx:157-177` |
| Delete-account URL (required by Play when accounts exist) | **Not ready.** Suggested: `https://kissansahyog.com/grievance` (form) or a new page explaining the steps — HUMAN decision. | `src/App.jsx:118` |
| Independent security review | No | — |
| Ads | **No ads** — no ads SDK | §4 |
| Families / children | Not designed for children; target audience 18+ (see `content-rating-answers.md`) | — |

---------------------------------------------------------------------

## 2. Data types — collected / shared, one row per Play data type

Legend — Req = required or optional for the user. Purposes use Play's list: App functionality,
Account management, Fraud prevention/security, Developer communications, Analytics (never used
here), Advertising (never used here), Personalization.

### 2.1 Location

| Data type | Collected? | Shared? | Ephemeral? | Req | Purpose | User can delete? | Evidence |
|---|---|---|---|---|---|---|---|
| **Approximate location** | **Yes** | No | No | Optional | App functionality (nearby listings, mandi, weather, distance) | Yes — account delete removes profile + listings; "Clear my location" removes the on-phone place | Profile stores the chosen town's coordinates `src/lib/auth/authService.js:276-280` (`p_latitude/p_longitude` of `place`); weather sends only a rounded 0.1° cell centre (`docs/review/BATCH7L2_REPORT.md:121-134`); listings typed-village coordinates via `/geocode` (`functions/geocode.js:14-33`); nearby search sends an area box, not stored (`BATCH7L2_REPORT.md:147`) |
| **Precise location** | **Yes** | **Yes (conservative)** — the exact position is sent from the phone to BigDataCloud to name the place. Alternative answer "No" only if a lawyer accepts BigDataCloud as a service provider. | No | Optional | App functionality | Partly — listing coordinates go with the listing (delete the listing/account); BigDataCloud is outside our control | Device position asked with `enableHighAccuracy: true` for "share my location" `src/lib/location/userLocation.js:92-100`, kept on the phone (`userLocation.js:36-42`); reverse geocode `src/lib/location/locationStore.js:22-27`; Post form "use my current location" saves the device position on the **public** listing (low-accuracy fix, but not rounded) `src/lib/location/postPosition.js:1-40`, `BATCH7L2_REPORT.md:144` (backlog B9) |

### 2.2 Personal info

| Data type | Collected? | Shared? | Req | Purpose | User can delete? | Evidence |
|---|---|---|---|---|---|---|
| **Name** | Yes | No (shown to another user only when that user taps "show number" on the listing — user-initiated) | Required for an account | Account management, App functionality | Yes (account delete) | `src/lib/auth/authService.js:276`; reveal `supabase/migrations/0030_private_listing_contact.sql:186-196`, `src/lib/listings/listingsApi.js:257-262` |
| **Email address** | Yes | No | Required for an account; optional in the feedback form | Account management, Developer communications (reply to feedback) | Profile row: yes. **Supabase Auth login (e-mail + password hash) is NOT deleted by "delete account"** — §5 | `src/lib/auth/authService.js:255` (`supabaseAuth.auth.signUp`), `supabase/migrations/0060_one_registration.sql:53`; feedback `supabase/migrations/0055_feedback.sql:21-28`, `functions/api/feedback.js:3,66-70` |
| **User IDs** | Yes (profile id, Supabase Auth user id) | No | Required for an account | Account management | Profile id: yes | `src/lib/auth/authService.js:41-58` (session holds the profile incl. `id`) |
| **Address** | No (no postal address is asked). Village/town name is declared under Approximate location. | — | — | — | — | `src/lib/auth/authService.js:276-280` |
| **Phone number** | Yes | No (revealed to another user only on their tap, user-initiated) | Required for an account; optional in feedback, daily-update sign-up, success-story and Kisan Mela forms | Account management, App functionality, Developer communications | Profile: yes. Feedback/daily-update/story/mela rows: **only by e-mail request** (not linked to the account) | `src/lib/auth/authService.js:277`; `src/lib/pages/pagesApi.js:14-19` (daily update, WhatsApp channel); `src/lib/community/communityApi.js:131-141` (story `contact_phone`); `src/lib/mela/melaApi.js:65-66`; `supabase/migrations/0055_feedback.sql:24` |
| **Race, religion, sexual orientation, political or other beliefs** | No | — | — | — | — | — |
| **Other info** | Yes — optional farm profile: land acres, main crops, preferred mandi, interests, WhatsApp opt-in | No | Optional | App functionality, Personalization | Yes (account delete) | `src/lib/auth/authService.js:115-124` |

### 2.3 Financial info, Health and fitness, Messages (SMS/e-mail), Contacts, Calendar, Web browsing, Files and docs

| Data type | Collected? | Evidence |
|---|---|---|
| Financial info (payment info, purchase history, credit info, other) | **No** — no payments, no billing library. Listing prices are offers, not the user's financial data. | `src/lib/i18n/legal.js:23`; `package.json:46-69` |
| Health and fitness | No | — |
| E-mails / SMS | No (the app reads no e-mail or SMS) | `AndroidManifest.xml:41-54` (no SMS/contacts permissions) |
| Contacts, Calendar | No | `AndroidManifest.xml:41-54` |
| Web browsing history | No | — |
| Files and docs | No | — |

### 2.4 Photos and videos

| Data type | Collected? | Shared? | Req | Purpose | User can delete? | Evidence |
|---|---|---|---|---|---|---|
| **Photos** | Yes — listing photos (max 3) and one optional photo with a Q&A question. Re-encoded to JPEG through a canvas before upload (this drops EXIF, incl. any GPS tag). Stored in a **public** bucket. | No (made public by the user's own action) | Optional | App functionality | **Gap:** deleting the account/listing removes the database row but code does not delete the image file from storage — §5 | `src/lib/listings/photos.js:3-44`, `src/screens/Post.jsx:125`, `src/screens/Sawaal.jsx:200`, `supabase/migrations/0005_storage.sql:1-20` |
| Videos | No (video page only links to YouTube) | — | — | — | — | `src/lib/videos/videosApi.js:28` |

### 2.5 Audio files

| Data type | Collected? | Shared? | Ephemeral? | Req | Purpose | Evidence |
|---|---|---|---|---|---|---|
| **Voice or sound recordings** | **Yes** — when the user taps the mic, the recording is sent to our `/transcribe` server function, which forwards it to **Google's Gemini API** to turn it into text and returns only the text. Our code does not store the audio. | **No** if Google acts as our service provider (paid Gemini API terms). **HUMAN-REVIEW:** if the key is on Gemini's *free* tier, Google may use inputs to improve its products — then answer **Yes** or move to a paid key. | **Yes — processed ephemerally** (no storage in our code) | Optional | App functionality (voice search) | `src/lib/voice/voiceSearch.js:26-35` (in the app the phone's speech service is not used), `src/lib/apiBase.js:12-15`, `functions/transcribe.js:97-147`, caller `src/components/VoiceSearchButton.jsx:122-123,140` (15 s max) |
| Music files, Other audio files | No | — | — | — | — | — |

Side note for the lawyer: for rate limiting `/transcribe` saves the caller's **IP address** and time
(no audio) and deletes rows older than a day on the next call
(`functions/transcribe.js:94-95`, `supabase/migrations/0034_voice_transcribe_rate_limit.sql:6-10,34`).
IP address is not a Play data type, but the privacy text should mention it.

### 2.6 App activity

| Data type | Collected? | Shared? | Req | Purpose | Evidence |
|---|---|---|---|---|---|
| **App interactions** | Yes — listing view counts (one per device per listing, with the random device id), "show number" click counts, WhatsApp-group join clicks, carbon-poll votes, Kisan Mela "interested" flag | No | Automatic (counts) / optional (votes, interest) | App functionality, Fraud prevention (one vote/view per device) | `src/lib/listings/listingsApi.js:295,304`, `supabase/migrations/0046_view_counter.sql:5-12`, `src/lib/whatsapp/whatsappApi.js:36`, `src/lib/carbon/carbonApi.js:14-26`, `supabase/migrations/0035_kisan_mela.sql:49-53` |
| **In-app search history** | Yes — only searches that found **nothing** are logged (query text + random device id) to improve content | No | Automatic | App functionality | `src/lib/search/searchApi.js:104`, `supabase/migrations/0045_search.sql:44-51` |
| Installed apps | No | — | — | — | — |
| **Other user-generated content** | Yes — listings, Q&A questions (name/village optional), success stories, Kisan Mela submissions, carbon suggestions, listing reports, feedback/grievance messages | No (published content is public by the user's choice) | Optional | App functionality, Developer communications (feedback replies) | `src/lib/community/communityApi.js:88-141`, `src/lib/mela/melaApi.js:55-72`, `src/lib/carbon/carbonApi.js:26`, `src/lib/reports/reportsApi.js:9`, `functions/api/feedback.js:3,210` |
| Other actions | No other | — | — | — | — |

### 2.7 App info and performance

| Data type | Collected? | Evidence |
|---|---|---|
| Crash logs | **No** — no crash-reporting SDK (no Crashlytics/Sentry/Bugsnag) | §4 |
| Diagnostics | **No** — the app's error screen only uses `sessionStorage` on the phone | `src/components/ErrorBoundary.jsx:12` |
| Other app performance data | No | — |

### 2.8 Device or other IDs

| Data type | Collected? | Shared? | Req | Purpose | Evidence |
|---|---|---|---|---|---|
| **Device or other IDs** | **Yes** — a random id made by the app on first use (`ks_device_id`, not the Android ID / advertising ID), sent with view counts, search misses, votes, reports, feedback | No | Automatic | Fraud prevention / security (one-per-device limits), App functionality | `src/lib/device.js:1-17`, `supabase/migrations/0055_feedback.sql:28` |

Also a security record, not a separate Play type: failed/successful login attempts are stored with
the mobile number or e-mail typed (`supabase/migrations/0059_login_rules.sql:45-50`) — purpose
Fraud prevention/security. Declare under Phone number / Email address purposes as "Fraud
prevention, security and compliance".

---------------------------------------------------------------------

## 3. What is kept ON THE PHONE (not "collected" in Play's sense, but goes in the privacy text)

| What | Where | Evidence |
|---|---|---|
| Offline copy of PUBLIC data only (mandi, MSP, weather, listings, schemes, Q&A, cold storage, melas …), max 5 MB, oldest dropped first | IndexedDB `ks-offline` | allow-list `src/lib/offline/policy.js:13-24`; cap `:9`; store `src/lib/offline/store.js:7-8,64-83` |
| Never cached: profiles, revealed contacts (`get_listing_contact`), logins, every write | — | `src/lib/offline/policy.js:26-38`, `src/lib/offline/cachedFetch.js:95-106` |
| Login session (your own profile incl. your mobile number; e-mail users also a Supabase token) | `localStorage` `ks_session_v1`, `ks_sb_auth` | `src/lib/auth/authService.js:23,41-58`, `src/lib/supabaseClient.js:41-47` |
| Chosen place (lat/lng + name), language, random device id | `localStorage` | `src/lib/location/userLocation.js:36-42`, `src/lib/i18n/LanguageProvider.jsx:25`, `src/lib/device.js:4-14` |
| Android backup of app data | Off (`allowBackup=false`) | `android/app/src/main/AndroidManifest.xml:5` |

Caveat found while checking (HUMAN-REVIEW): the offline cache stores public rows exactly as the
server sends them. Two public tables carry phone numbers that anyone can already read:
`kisan_safalta.contact_phone` on **published** success stories (the app selects `*`:
`src/lib/community/communityApi.js:108-128`; column and public read policy
`supabase/migrations/0021_community_features.sql:69,77,80-83`) and `kisan_mela.contact_number`
(organiser contact, shown on purpose: `src/lib/mela/melaApi.js:15`). So the honest wording is
"the cache never stores **private** data or revealed seller contacts", not "never any phone
number". Recommended fix (code, not tonight): stop exposing `kisan_safalta.contact_phone` publicly
(select explicit columns + revoke the column) — it is the submitter's private number.

---------------------------------------------------------------------

## 4. NOT collected — dependency scan (verified)

| Check | Result | Evidence |
|---|---|---|
| Analytics SDK (Firebase Analytics, GA/gtag, Mixpanel, Amplitude, PostHog, Segment, Clarity, Plausible…) | **None** | `package.json:46-69` (runtime deps: Capacitor android/app/core/network/splash-screen, supabase-js, qrcode, react, react-dom, react-router-dom); grep of `src/`, `functions/`, `index.html` for these names: no hits; `index.html:17` loads only `/src/main.jsx` |
| Ads SDK (AdMob, Facebook Audience…) | **None** | same; `android/app/build.gradle:45-55`, `android/app/capacitor.build.gradle:12-14` (only capacitor-app, -network, -splash-screen) |
| Crash reporting (Crashlytics, Sentry, Bugsnag) | **None** | same |
| Firebase / Google services | Not used. The `google-services` Gradle plugin is on the classpath (`android/build.gradle:11`) and applied only if `android/app/google-services.json` exists (`android/app/build.gradle:59-66`) — **that file does not exist**. Push is not implemented (`docs/review/batch9/PUSH_PLAN.md`). | — |
| `workbox-google-analytics` | Present in `package-lock.json:10359` only as a transitive dev dependency of the PWA build tool; **not enabled** (`vite.config.js` has no `offlineGoogleAnalytics`) and the PWA service worker is the website's | `package-lock.json:10303,10359` |

Third parties the app talks to (not SDKs, just HTTPS calls), for the privacy text:
Supabase (database, login, photo storage — our backend), Cloudflare Pages Functions
(`/transcribe`, `/geocode`, `/api/feedback`), Google Gemini API (voice → text,
`functions/transcribe.js:120-139`), BigDataCloud (place name from position,
`src/lib/location/locationStore.js:26`), Open-Meteo (weather for the rounded cell,
`src/lib/weather/weatherApiV2.js:48`), OpenStreetMap Nominatim (typed village → map point,
server-side, `functions/geocode.js:23`), Resend (e-mails feedback to the team,
`functions/api/feedback.js:30,158`). Links opened outside the app: YouTube, WhatsApp, Google Maps
(`src/lib/videos/videosApi.js:28`, `src/lib/share/shareMessages.js:73`,
`src/lib/coldStorage/coldStorageApi.js:66`).

---------------------------------------------------------------------

## 5. Deletion — what really happens (fix or disclose before submission)

In-app: Profile → "अकाउंट डिलीट करें" → confirm → RPC `delete_account` deletes the `profiles` row;
listings cascade (`supabase/migrations/0011_p3_profile.sql:5-6,52-68`); Kisan Mela interests
cascade (`0035_kisan_mela.sql:51`); the phone's session is cleared (`authService.js:337`).

Gaps found (HUMAN-REVIEW, needs a code/DB change — not done tonight, no migrations allowed):
1. **Supabase Auth user is not deleted** — e-mail + password hash stay in Supabase Auth
   (`delete_account` touches only `public.profiles`, `0011_p3_profile.sql:65`). Play's account
   deletion policy expects the account itself to be deleted.
2. **Listing / Q&A photos stay in the public storage bucket** — nothing removes the files
   (`src/lib/listings/photos.js:24-44` uploads; no delete call exists).
3. Rows not linked to the account (feedback, daily-update sign-up, success stories, Q&A questions,
   search misses, view logs by device id) are deleted only on e-mail request.
4. Security note (backlog B1/B3 pattern): `delete_account(p_actor_id)` is granted to `anon` and
   trusts the id it is sent (`0011_p3_profile.sql:52-71`). Covered by backlog B1/B3, flagged here
   because Play reviewers test the deletion flow.
5. Play requires a **web** link where users can ask for deletion without the app. None exists yet
   (the privacy page names `hello@kissansahyog.com`: `src/lib/i18n/legal.js:46,50`).

---------------------------------------------------------------------

## 6. Mismatches with the live privacy page (feed into backlog L2)

| Live text | Reality in the app | Evidence |
|---|---|---|
| Voice: "your phone or browser's own service (Google or Apple) may process it" | In the app the audio goes to our `/transcribe` function and then Google Gemini | `src/lib/i18n/legal.js:27` vs `src/lib/voice/voiceSearch.js:31-35`, `functions/transcribe.js:120-139` |
| "What we collect: mobile number, pincode, village/town, listing details" | Also e-mail, password (Supabase Auth), name, optional farm profile, photos, device id, IP for voice rate limit, login attempts | `src/lib/i18n/legal.js:15`; §2 |
| Contact `hello@kissansahyog.com` | Brief for this pack says `usdvisionai@gmail.com` | `src/lib/i18n/legal.js:46,50` |
| Location "saved in your browser on this device" | True for the banner place; but the Post form's device position is saved on the public listing | `src/lib/i18n/legal.js:34`, `BATCH7L2_REPORT.md:144` |
