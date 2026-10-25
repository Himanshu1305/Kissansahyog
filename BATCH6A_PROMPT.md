# BATCH 6A — Stability, shared layout/theme, homepage and Kisan Mela fixes

You are the builder. The architect/reviewer (Claude) will review your work afterwards.
Work ONLY inside this repo (`C:\Users\usdvi\projects\Kissansahyog`).

## 0. Rules for this batch (read first)

- Start from branch `integration/batch5-test`. Create branch `codex/batch6a-fixes` from it.
- Do NOT run `git commit` (the sandbox cannot write `.git`; the owner commits).
- Do NOT deploy, do NOT run migrations, do NOT write to the database. This batch needs no migration.
- Never read, print, edit or commit `.env` or any secret.
- Hindi first, English second. All user-visible text goes through the strings system
  (`src/lib/i18n/strings.js`) with both `hi` and `en`. No hard-coded Devanagari in components
  (test `v11_phase6` scans for that).
- Keep the style rules already in the repo (plain farmer-friendly Hindi; no "under review" or
  "coming soon" labels; no emojis added outside the existing CatIcon mechanism).
- Do not touch the Land, Labor, carbon, Grievance modules except where a task below says so.
- Windows + Node 24: dynamic `import()` of an absolute path must use `pathToFileURL(...).href`.
- Known pre-existing failures you must NOT try to fix: `v11_phase6`, `v2_citation_audit`,
  `batch4_ui_style` (git subprocess EPERM). Do not delete, skip or loosen any test.
- Progress: keep `docs/review/BATCH6A_PROGRESS.md` updated as you go (one line per task, done/blocked).
- At the end write `docs/review/BATCH6A_REPORT.md`: what was done, what was NOT done and why,
  every file changed, anything you were unsure about, and a "pages to look at after deploy" list.
- Add a verifier `scripts/verify-batch6a.mjs` (same style as `scripts/verify-batch5a.mjs`) that
  checks each numbered task below with PASS/FAIL lines. Run it and save output to
  `docs/review/BATCH6A_VERIFY_OUTPUT.txt` (UTF-8, not UTF-16).
- Run, and save raw output of: `npm run build` (if Tailwind native module / `spawn EPERM` still
  blocks it in your sandbox, say so in the report — the owner will run the build on his own
  terminal) and the existing test scripts in `scripts/test/`.

## 1. Task A1 — Fix the blank page (stale cached build crash)

Cause (confirmed from the owner's console): an older cached build throws
`Unknown or not-yet-enabled category: jugaad` from the homepage because
`getCategory(l.category).summarize(...)` throws for an unknown category, there is no error
boundary, and the service worker keeps serving the old build until the user accepts an update prompt.

Do all of these:

1. `src/components/ErrorBoundary.jsx` (new): a React error boundary wrapped around the router/
   outlet in `main.jsx`/`App`. On error it shows a friendly Hindi/English screen with a
   "पेज दोबारा खोलें / Reload" button and a link to home. On errors that look like a stale build
   (message contains `Failed to fetch dynamically imported module`, `Unknown or not-yet-enabled
   category`, `Importing a module script failed`, or `ChunkLoadError`) it must FIRST do one
   automatic recovery: unregister service workers, delete Cache Storage entries, set
   `sessionStorage['ks_recovered']='1'`, then `location.reload()`. Never loop: if the flag is
   already set, show the friendly screen instead. Wrap every sessionStorage access in try/catch.
2. Add `getCategorySafe(key)` (or equivalent) in the listings registry that returns `null` for an
   unknown category instead of throwing. In `src/screens/Homepage.jsx` (both places that call
   `getCategory(...).summarize`) and in any other list screen that maps over listings
   (Browse, MyListings, search results — grep for `getCategory(`), skip/filter listings whose
   category is unknown instead of crashing. Keep `getCategory` throwing where it is called for a
   single known category.
3. Service worker updates: in `vite.config.js` PWA block set `registerType: 'autoUpdate'` and
   workbox `skipWaiting: true` (keep `clientsClaim: true`, `cleanupOutdatedCaches: true`). Adjust
   `PwaPrompts` so it no longer waits for a manual "update" tap for the new-version case; the
   offline-ready toast may stay. Make sure a new deploy reaches an already-open tab on the next
   navigation or reload without user action. Keep `navigateFallback` as it is.
4. Add a small unit-style check in the verifier that the boundary file exists, is mounted, and that
   `getCategorySafe('nonexistent')` returns null.

## 2. Task A2 — One central place for layout and theme (owner's requirement)

The owner wants all config/theme in ONE place that every page uses, for uniformity and easy change.

1. Inspect what exists first (Tailwind v4 `@theme` in the main CSS, `src/components/ui.jsx`
   `Screen`, `PageShell`, `Section`, `ContentColumn`). Do NOT create a second parallel system —
   consolidate into what exists, or create a single `src/lib/theme.js` plus the CSS `@theme`
   tokens and make everything read from there.
2. Define in that one place: page width presets (`content` ≈ 72ch for long reading text only,
   `wide` = `max-w-[1200px]`, `full`), horizontal page padding (`px-4 sm:px-6 lg:px-8`), vertical
   section spacing scale, card radius/shadow, grid gaps, and the 2-column "form + side panel" layout.
3. Make `wide` the DEFAULT for `Screen` and `PageShell` (today `Screen` defaults to a narrow
   ~70ch column, which is why /post, /browse, /resources, /kisan-mela look squeezed on desktop).
   Only long-form reading pages (Sawaal detail body text, Terms, Privacy) keep a `content`-width
   text block, but still inside the wide page frame so the header/footer/side areas line up.
4. Migrate these screens to the shared layout: Post, Browse, Resources, KisanMela (and its detail),
   Homepage, ListingDetail, MyListings, Bazaar pages. Remove per-page hard-coded `max-w-*`,
   `mx-auto` wrappers and ad-hoc padding that duplicate the shared layout.
5. Verifier: scan `src/screens/**` and fail if any screen file still contains a hard-coded
   `max-w-` page-width wrapper outside the shared layout (allow a short whitelist you document,
   e.g. images and modals).
6. Check in the browser at 1440px, 1024px, 768px, 390px widths (use the Playwright Chromium in
   the sandbox or the owner-run dev server if the sandbox cannot start Vite; say which in the
   report). No horizontal scroll at any width.

## 3. Task A3 — Homepage search box (typing AND speaking)

1. Add a large search hero block near the top of the homepage: one wide input with a search
   button and a microphone button, with a short Hindi placeholder (e.g. about mandi bhav, schemes,
   machines, a place) and 4–6 quick-suggestion chips below (links to existing routes/queries).
2. REUSE the existing `SearchBar`, `VoiceSearchButton` and existing voice-transcription and search
   logic. Do not write a second search engine. Extract a shared hook/component if needed so the
   NavBar search and the homepage hero use the same code.
3. On the homepage hide the small NavBar search (avoid two search boxes); on all other pages keep it.
4. Pressing Enter or the button goes to the existing search results route/page. Voice: on tap
   start recording, show a clear listening state, on result fill the input and search. Handle
   permission denied and unsupported browsers with a short Hindi message (no crash).

## 4. Task A4 — Kisan Mela: wrong "nearest" events, and date sorting

Data facts (checked in the live DB on 11 Oct 2026): table `kisan_mela` has `event_date_start`,
`event_date_end`, `is_date_confirmed`, `expected_period`, `is_active`, `moderation_status`,
`merged_into`. "Vibrant Krishika Expo 2026" runs 2026-10-09 to 2026-10-12 and is ongoing now, but
`fetchUpcomingMelas` in `src/lib/mela/melaApi.js` keeps only `event_date_start >= today`, so it is
dropped and later melas show first. Undated rows (only `expected_period`) are also mixed in.
Several rows are duplicates marked `merged_into` / `is_active=false`.

1. Fix `fetchUpcomingMelas`: include an event if its END date (fall back to START when end is
   null) is `>= today` (use the user's local date, India/IST, not UTC). Always filter
   `is_active = true`, `merged_into is null`, `moderation_status = 'approved'`. Sort by start date
   ascending. Homepage teaser shows ONLY dated events (undated "expected period" ones are not
   shown on the homepage). Mark in-progress events with a "चल रहा है / Ongoing" badge.
2. Put the "is this event still upcoming/ongoing/ended" and sort logic in one pure function in
   `src/lib/mela/` that takes an injectable `today` so it can be unit-tested. Add tests to the
   verifier with fixed dates (ongoing, starts today, ended yesterday, undated).
3. `/kisan-mela` page: add a sort control — "जल्द से जल्द (default) / सबसे बाद में / नाम" —
   and a toggle "बीते हुए मेले दिखाएँ" (default OFF, ended events hidden). Group order: ongoing,
   upcoming by date, then "तारीख़ अभी तय नहीं" (undated, grouped by `expected_period`) at the end.
   Keep existing filters (state/category/etc.) working together with sort.
4. Data issue — DO NOT edit data: "Krishi Mela, UAS Bengaluru" has dates 22–25 Oct 2026 but
   `expected_period` "Nov 2026". List this (and any similar date/period mismatch you notice) in
   the report under "Data to confirm".

## 5. Task A5 — Real, distinct images for the home category tiles

Problem: the Machines tile shows a red tractor with no rotavator; the Seeds/inputs tile
(`cat-inputs.jpg`) is blurry grain sacks and is ALSO reused for building materials and
greenhouse; other tiles reuse each other's images (`cat-machines.jpg` for equipment+jugaad,
`list-tractor.jpg` for tanker+transport, `cat-straw.jpg` for bhusa+carbon).

The owner's instruction: search the internet and use real images; do NOT spend time on licence
research now — he will swap images later if needed. Still record the source for traceability.

1. Give EVERY category tile in `CATEGORY_TILES` its own distinct image in
   `public/images/home/` (new file names, e.g. `cat-rotavator.jpg`, `cat-seeds.jpg`,
   `cat-building-materials.jpg`, `cat-greenhouse.jpg`, `cat-jugaad.jpg`, `cat-tanker.jpg`,
   `cat-transport.jpg`, `cat-carbon.jpg`). Do not overwrite the old files; update `IMG()` /
   `CATEGORY_TILES` / `LIST_IMG` / `EQUIP_TYPE_IMG` mappings.
2. Required subjects: Machines/Equipment = a tractor WITH a rotavator (rotary tiller) attached or
   working; Seeds/Inputs = clear close-up of seeds (wheat/paddy/pulses) in hands or a seed pile;
   Building materials = cement bags/bricks/sand; Greenhouse = polyhouse/shade-net house with crops;
   Jugaad = an improvised/homemade farm tool or machine; Tanker = water tanker/bowser;
   Transport = a loaded pickup/truck/tractor-trolley on a rural road; Carbon = trees/farm
   landscape. Agriculture-in-India look preferred.
3. How to find them: you have network access in the sandbox. Use whatever works: the Wikimedia
   Commons API (`action=query&generator=search&gsrsearch=...&prop=imageinfo&iiprop=url|extmetadata`),
   Pexels/Unsplash/Pixabay image URLs, etc. Download with Node `fetch`. Prefer landscape,
   sharp, well-lit. Resize to max 1200px wide, JPEG quality ~80, target under ~200 KB each.
   If a source blocks scripted download, try another source; do not give up on a tile —
   if truly nothing is found for a tile, say so in the report and keep a clearly different
   existing image rather than reusing a wrong one.
4. Update `public/images/home/manifest.json` with, per new image: file, subject, source URL, author
   if known, licence text if shown on the page, and `"needs_licence_review": true`.
5. Write `docs/review/BATCH6A_IMAGES.md`: a table of tile → file → what it shows → source URL, so
   the reviewer can open each file and check it visually. Do NOT claim an image shows a rotavator
   unless you actually verified it (inspect the file; check the source title/description).

## 6. Task A6 — Homepage Farmer Q&A cards

Today it shows 2 very wide stretched cards. Change to 3 cards in a row on desktop (2 on tablet,
1 on phone), equal height (CSS grid with `items-stretch` and flex-col cards), question title clamped
to 2 lines (`line-clamp-2`), short answer clamped to 3 lines, and a "पूरा उत्तर पढ़ें" link at the bottom of
each card. Change the fetch from `fetchFeaturedSawaal(2)` to 3. Add a "सभी सवाल देखें" link to `/sawaal`.

## 7. Task A7 — Footer credit

In the shared Footer add a line (Hindi and English, via strings):
- hi: "डिज़ाइन, विकास और रखरखाव: USD Vision AI LLP"
- en: "Designed, developed and maintained by USD Vision AI LLP"
"USD Vision AI LLP" links to https://usdvisionai.com (opens in new tab, `rel="noopener noreferrer"`).
Company name only; do not add any individual's name.

## 8. Task A8 — Remove the "future listing charges" line

Remove the sentence "भविष्य में लिस्टिंग शुल्क लागू हो सकता है।" / "Listing charges may apply in the
future." everywhere it renders (key `agri_vendor_future_charges`, rendered in `src/screens/Post.jsx`).
Delete the render AND the now-unused string key, and make sure no test or i18n parity check still
expects it. Verify with grep that nothing references it.

## 9. Task A9 — Self-host the Devanagari font (removes the CSP console errors, faster on slow phones)

Console shows Workbox failing to fetch `fonts.googleapis.com` because of the CSP `connect-src`.

1. Download the Noto Sans Devanagari font files (woff2, weights actually used by the site — check
   the CSS — Devanagari + Latin subsets) into `public/fonts/` (or install `@fontsource/noto-sans-devanagari`
   and import it; choose whichever works on this setup, but the result must be files served from
   our own domain).
2. Add `@font-face` with `font-display: swap`, update the font-family stack, remove the Google
   Fonts `<link>`s from `index.html`.
3. In `public/_headers` remove `fonts.googleapis.com` from `style-src` and `fonts.gstatic.com`
   from `font-src` ONLY if nothing else in the repo uses them (grep first). Keep every other CSP
   entry unchanged.
4. Make sure the PWA precache includes the font files (glob already has woff2).

## 10. Definition of done

- `node scripts/verify-batch6a.mjs` passes with 0 failed.
- Existing tests: same results as before this batch (no new failures).
- Report written, progress file complete, nothing committed, no secrets touched.
- Final message to the owner: 10 lines max, plain language, list what to look at on the preview.
