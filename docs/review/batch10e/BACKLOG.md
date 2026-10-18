# Batch 10E — BACKLOG

Size: **S** = under half a day, **M** = 1–2 days, **L** = 3+ days or needs a founder/DB step. "Why" is the reason it matters for farmers or for safety; "Where" is the starting point in the code.

## Listings, dates and posting

- **Server-side enforcement of the mandatory dates** — **M** (production DB change). `create_listing*` should refuse equipment / land / labor / drone-didi posts without `details.available_from`, with a start in the past (IST) or an end before the start. *Why:* today the rule is client-side only (10E 3C, DECISIONS 44); an old cached app, the Android build or a direct RPC call can still post dateless listings. Needs a new additive function version + migration + rollback, staging first, founder applies production (like 0064). Keep old dateless rows valid.
- **Date filter / sort on Browse + "अवधि समाप्त" tag** — **M**. "Available this week", soonest first; listings whose `available_to` has passed get an "अवधि समाप्त" tag (or are hidden after N days). *Why:* with dates now mandatory, farmers will call about machines/land/labour that are no longer available. Client-side first (data is in `details`), server filter later. New Hindi wording → HUMAN-REVIEW.
- **Edit-listing flow** — **L**. None exists (no screen, no update RPC; DECISIONS 42). *Why:* a farmer who typed a wrong rate or date must close and re-post. When built it must keep `details.extra_info`, reuse `ExtraInfoField` + `DateBlock` + `checkListingDates`, and ask old dateless listings for a start date on re-submit. Needs a new owner-scoped RPC (DB change).
- **Review dates for transport, greenhouse, cold storage** — **S** (founder decision first; DECISIONS 51).
- **Phone-rule false positives** in extra info (e.g. "2023 2024 2025") — **S**, watch farmer feedback (DECISIONS 40).
- **Client-side photo resize/compress before upload — ALREADY EXISTS (checked).** `src/lib/listings/photos.js` `compressPhoto()` (since Batch 6B): accepts JPEG/PNG/WebP only (HEIC refused with `photo_unsupported`), scales the longest side to ≤ 1600 px on a canvas, re-encodes as JPEG at quality 0.8 and steps down to 0.5 until the file is ≤ 300 KB, then uploads one by one. So a 4–8 MB phone photo goes up as roughly 150–300 KB. Remaining gaps, if wanted — **S/M**: (a) HEIC photos from some phones are refused instead of converted; (b) no per-photo progress or retry on a dropped connection (one failed upload fails the post; the Post form keeps its data and the 9B request id re-uses already-uploaded files); (c) 1600 px could drop to ~1280 px for slower networks.
- **Search page shows no photos** — **S** (finding 10E 1A, DECISIONS 13). `src/screens/Search.jsx` renders no listing photo; Browse/My listings/detail/homepage do.
- **Drone Didi cards always show the stock photo** `/images/home/list-drone.jpg` — **S** (DECISIONS 13). Use the listing's own `details.photo_urls[0]` when present.
- **Homepage card hides a failed image silently** (`HomeListingCard` `onError` → `display:none`) — **S** (DECISIONS 13). Show the solid placeholder instead so a broken URL is visible in testing.

## Sign-up, login and profile

- **"Add e-mail later" on Profile** for phone-only users — **M**. *Why:* phone-only users (10E 3A) have no e-mail and no password, so no recovery path until OTP exists. Needs a safe owner-scoped update (DB) and a verification step; not built in 10E by rule.
- **Password reset / account recovery for phone-only users** — **L**; depends on the OTP item below.
- **Login page shows the e-mail box before the mobile box** — **S** (DECISIONS 34). Most new users have no e-mail now; consider mobile first (10E added the "📱 ईमेल नहीं है? मोबाइल नंबर से लॉगिन करें" link as a stop-gap). Admin e-mail login must stay untouched.
- **Profile "Save changes" demands a 6-digit pincode** — **S** (pre-existing since 0060; DECISIONS 35). Sign-ups since 7L-2 have no pincode, so editing the name first asks for one. Make pincode optional on Profile (client `updateProfile` → `isValidPincode`; check the RPC too).
- **Guide register SEO description still says "नाम, मोबाइल, ईमेल, पासवर्ड और गाँव…"** — **S** (found in 5.2 by `verify-batch7d.mjs`; `strings.js` `guide_register_seo_desc`). After 10E 3A sign-up has no e-mail/password, so this prerendered description of `/guide/register` is now wrong (it also carries a "मुफ़्त" claim the 7D rule flags). SEO text change → founder decision; Hindi → HUMAN-REVIEW.

## Mandi prices (/msp) and data

- **15 Aug one-day spike** — **S**. On some days only a few mandis report (holiday), so the per-day median jumps (wheat 90-day chart). Idea: a "minimum mandis per day" rule (skip or grey a day with fewer than N reporting markets) in `medianByDate` (`src/lib/mandi/history.js`). Real source data, so show it honestly or mark it; needs a founder choice of N.
- **The /msp trend sentence appears twice, and a "डेटा उपलब्ध: 2026-07-20" line shows an ISO date** — **S**, pre-existing, cosmetic. Show the sentence once; format the date (`src/screens/Msp.jsx:381`, `{t('data_from')} {history[0].date}`) with the existing `formatDay` helper (`src/lib/mandi/mspWindow.js`).
- **Arhar-as-Gram rows may exist in production history** — **S** (founder read-only check; DECISIONS 20). The refresh used to match Arhar as Gram (fixed in 10E 2C). Staging: 0 affected, 1 unverifiable row. The founder can run, read-only on production: `select market, price_date, modal_price from mandi_prices where commodity_en='Gram' and (price_date < '2026-06-20' or not in_sagar_division);` and decide what to do with suspicious rows (never delete without a backup).
- **GODL attribution wording on /msp** — **S**, HUMAN-REVIEW (legal). The backfilled history comes from data.gov.in resource 35985678 (DMI/Agmarknet) under the Government Open Data License – India, which requires attribution. Confirm the exact attribution line on /msp (and the dataset JSON-LD) with the founder/lawyer.
- **Market names not unified** (`Sagar APMC` vs older `Sagar`; `Gadakota APMC` vs `Garhakota APMC`) — **S**, founder choice (DECISIONS 18).

## Build, tooling and app

- **Prerender is not deterministic on data pages** — **M**. About 10 data pages (e.g. /kisan-mela, /yojana/*, /cold-storage/khandwa, /drone-didi) are sometimes captured in a loading state (DECISIONS 5, 14, 30), so SEO text diffs need a manual re-check every batch. Fix: a per-route "data ready" marker the prerender waits for (with a timeout and a hard fail), and/or retry a route whose capture has no marker.
- **ESLint is not installed** — **S**, founder decides. `package.json` has `"lint": "eslint ."` but `eslint` is not a dependency and there is no config file, so `npm run lint` cannot run. Adding it is a new dev dependency (not allowed in 10E). Worth it: it would catch unused imports/strings early.
- **Photo CSP inside the Android app (branch `android-app`, not touched; read-only check):** `capacitor.config.json` has `webDir: "dist"` and `server.androidScheme: "https"` with no `server.url`, so the app ships the built files inside the APK and serves them from the WebView's own `https://localhost`. `public/_headers` is a Cloudflare Pages file: Cloudflare applies it to the website only; the WebView never sees it. The app's `index.html` has no CSP `<meta>` and `scripts/build-android.mjs` adds none. So the 10E 1A `img-src` problem **does not apply inside the app** (no CSP there at all), and the 10E fix neither helps nor harms it. Action — **S**: none needed for photos; when `android-app` is next rebuilt from `release-10e`, re-check that photos show (the app reads the same Supabase public URLs). Separately, the app having no CSP at all is a hardening item for later (**M**).
- **Unused string `mela_home_empty`** — **S**. 10E 5.1 hides the homepage Mela section when nothing qualifies, so the empty-state text and its "submit a Mela" button are no longer shown on the homepage (the submit link stays on /kisan-mela). The string is kept for now.

## Old verify scripts still failing (historical; not caused by 10E)

Run in 5.2. Checks pinned to an older batch's state, outdated by later batches, left as they are (they only report):
- `verify-batch7d.mjs`: guide register SEO "free"/e-mail text and the guide demo's use of `free_registration` (10C); "consent not weakened" (9B made it stricter: also needs `contactConsentOk`); "no migration after 0060" (Batch 9 added 0061–0063, 10E 0064).
- `verify-batch7l1.mjs`: "CSP and Pages Functions unchanged since 7L-1" (`functions/_middleware.js` changed in a later batch; 10E 1A also changed `_headers` on purpose).
- `verify-batch7l2.mjs`: "migration numbering ends at 0060" (0061–0064 since).
Size **S** if the founder wants them refreshed or retired.

## Founder items still open

- **Jio DLT OTP template, then flip `GUIDE_OTP_LIVE`** (`src/features/guide/config.js`, now `false`) — founder registers the template; then **S** to flip and re-test the register demo's OTP steps. Also unlocks real phone verification (phone-only sign-up/login is trust-based until then).
- **3 placeholder expert records** — founder supplies real names/contacts (or they are hidden). **S** once data arrives.
- **Hindi caption review** — all rows in `docs/review/batch10e/HINDI_CAPTIONS.md` (and the 10C/10D sheets).
- **Android hardware Back test** on a real phone (guide sheets, demos, post form) — founder, **S**.
- **Lawyer review of terms / privacy** (and the GODL attribution line above).
