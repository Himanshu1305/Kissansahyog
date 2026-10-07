# Known Issues

**Test checklists:** No test-checklist item (v1 Phases 1–9, plus v1.1 Phases 1–7,
positive/negative/edge) was ever deferred or skipped — every one passed before its phase was
committed. v1.1 backend suites `v11_phase1..7` (82 checks) are green against the live project;
the v1 backend suites still pass (seed-count assertions updated for the new lookup rows).

What follows are **resolved items**, **intentional MVP design limitations**, and Phase-2
follow-ups — documented so they're picked up deliberately, not discovered by surprise.

---

## Batch 3 — content rewrite (2026-10-08)

- **Kisan Sawaal English is now filled (RESOLVED from Batch 2).** All 58 published Q&As have
  `question_en` / `answer_en` / `answer_blocks_en`; the EN toggle renders English. 19 legacy rows were
  restructured + sourced; **1 row unpublished** (`saala-soyaabina-bhaava-kaisaa-rahegaa-mandi-bechane` — a
  price forecast that cannot be sourced). 4 new sources `S-QAL-01..04` quoted into `SOURCES.md`.
- **Item 7 (new Q&As) NOT done** — explicitly optional ("only if time allows"); items 1–6 + the owner
  review pack were prioritised for the ~1-day launch window. `build-qa.mjs`/`seed-sawaal.mjs` now support
  `short_en`/`blocks_en`/`unpublish`, so the backlog in `QA_DEMAND.md` can be added cleanly.
- **cropadv_<slug> left as single-sentence advice** (not literal 3–5 bullet lists) — the fasal-salah panel
  renders each as one `<p>`, so bullets would need a rendering change (out of Batch 3's "words only" scope),
  and padding each to 5 points would require unsourced agronomic facts. They were reworded to plain Hindi.
- **E2E `phase6` (land "mark Found") fails on dummy-seed land count** — it expects exactly 1 land card in
  browse, but the dummy seed (migration 0014, 2026-09-30) has 2 land listings within the test account's
  30 km. Test-data/distance sensitivity in a pre-V2 feature untouched by Batch 3; shared seed data was not
  deleted (PROJECT_CONTEXT §14). Same environmental category as the carried `phase18_transport` /
  `phase20_mela` failures. Backend suite: 0 failing; e2e 79/82.
- **`v2_phase7/8/9` assertions updated to the Batch-3 spec** (prompt rule 9): `≥20/≥15 FAQs`→the new
  "up to 10/8" ranges; `≥2500 tokens`→the new shorter targets; carbon `≥5 fact-blocks`→`≥5 cited blocks`
  (facts moved into cited paragraphs/table/calc); jugaad soft-help marker updated after the avoid-word
  "प्रस्तुत" was removed. Reasons recorded in `docs/review/BATCH3_PROGRESS.md`.

---

## Batch 2 — deferred / follow-ups (2026-10-07)

- **Item G NOT built (public `/bazaar/*` category landing pages)** — explicitly optional in the spec
  ("only if time allows"); deferred to avoid adding new public/prerendered SEO surface two days before
  launch. The infrastructure (prerender-routes, sitemaps, Browse components, FAQPage/BreadcrumbList
  JSON-LD) is already in place, so it can be picked up cleanly in Batch 3.
- **Kisan Sawaal English is empty for now (by design)** — migration 0052 added `answer_blocks_en` and
  `question_en`/`answer_en` exist, but they are unpopulated. When the language toggle is EN, the Q&A shows
  the Hindi content with the note "This answer is available in Hindi only for now." **Batch 3 fills the
  English.** The re-slug transliteration is phonetic (readable, not reversible).
- **Batch 1 layout deferral is now RESOLVED** — all 21 page-level `max-w-*`/`maxWidth` wrappers were
  removed in Batch 2 item A, and the static guard shipped as `scripts/test/batch2_layout.mjs` (not the
  originally-planned `batch1_layout.mjs`). The Batch 1 "Item 1 info-page width cleanup — DEFERRED" entry
  below is superseded.
- **`components/ListingForm.jsx` is now DELETED** — the Batch 1 "dead code, left in place" note below is
  superseded; v2_phase4/9 static assertions were repointed at `Post.jsx`.
- **E2E 80/82 — two environmental failures (NOT regressions):**
  - `phase20_mela` — the seeded merged-away mela's survivor event **ended 2026-10-06** (`is_active=false`),
    so it no longer renders (the test was passing when Batch 1 ran on 2026-10-06). Re-seed a future-dated
    mela chain to restore it; no code fix applies to an expired seed.
  - `phase18_transport` — depends on the spec's self-created transport listing + geocoding/distance timing;
    transport is a pre-V2 feature untouched by Batch 2.
  - `phase17` (`/sawaal` grid) was updated for the required grouped-by-topic layout and passes.

---

## Batch 1 — deferred / follow-ups (2026-10-06)

- **Item 1 info-page width cleanup — DEFERRED (prompt-permitted).** `PageShell` now defaults to
  `wide` and Browse is edge-to-edge, but the per-page `max-w-*` / inline `maxWidth` wrappers on the
  information/homepage-style screens are still in place, so those pages are centred in a ~960 px
  column on wide desktops instead of full-bleed. Screens to widen (keeping long prose inside a
  readable `ContentColumn`): Mausam, Msp, Info, FasalSalah, AgroForestry, Resources, Sawaal,
  KisanMela, Articles, Admin, DroneDidi, SchemeDetail, Safalta, Privacy, Terms, Welcome, and the
  content-hub PageShell pages Greenhouse, Jugaad, Search. The static guard
  `scripts/test/batch1_layout.mjs` (fail on any page-level `max-w-`/`maxWidth` in `src/screens/`,
  allowlisting only modals/cards/chips) is to be added as part of that cleanup.
- **`components/ListingForm.jsx` is now dead code** — the 3-step `Post.jsx` replaced it. Some static
  backend checks (`v2_phase4/7/9`) still read it for provider-declaration wiring; delete it together
  with updating those checks in a later pass.
- **"Most viewed" is global-within-category, not distance-filtered** — intentional (it surfaces the
  most-viewed listings in a category); a remote viewer may see Sagar listings there. Revisit if the
  pilot expands beyond one district.

## Resolved in Phase 3

- **Homepage nav home button — FIXED.** The NavBar logo now links to `/` (public homepage)
  for all users, `/` is viewable while logged in, and the authenticated dashboard renders the
  global NavBar — so logged-in users can always get back to the homepage (Phase 1).

## Density / Vendor / Warehouse / Rojgar build (flagged)

- **Land category fencing should use the tehsil boundary** (tighter than the 30 km district
  radius) — confirmed backlog, **not yet implemented**. Land still uses the standard 30 km +
  30–50 km fallback like every other category.
- **Drone Didi icon** replaced with a non-helicopter multi-rotor quadcopter SVG (`<CatIcon>`).
  Verify on a real device that it reads clearly at small chip/card size; a real PIB/Govt Drone
  Didi image could be swapped in later if desired.

## New in Phase 3 (intentional / flagged)

- **Email verification is NOT enabled.** Email-registered users are trusted on signup without
  confirming their address (`mailer_autoconfirm` on) — acceptable for the MVP, flagged for a
  future phase (add confirmation emails before wider launch). Phone auth still lacks real OTP.
- **Deleting an account leaves the Supabase `auth.users` row.** `delete_account` removes the
  profile (cascading listings) and signs the user out, but the underlying auth user is not
  deleted from the client (that needs the service role). Harmless — login then finds no profile —
  but worth a server-side cleanup later.
- **Admin trust model.** Admin RPCs verify `is_admin` on the passed profile id (same trust model
  as the rest of the RPC surface); becomes cryptographic when phone OTP / `auth.uid()` lands.
- **v1 Playwright E2E specs** still need the new required listing fields (asset pincode, land
  price type, equipment rate) filled before re-running — carried from v1.1. Phase 3 features are
  covered by the `p3_phase*` backend suites + Playwright smoke checks.

## Resolved in v1.1

- **Asset-location distance bug — FIXED.** Listings previously inherited the poster's *profile*
  coordinates, so an asset located away from the poster's home matched in the wrong place. Now
  the create form asks the asset's pincode explicitly (required, never defaulted from the
  profile) and `create_listing` derives the coordinates from that pincode **server-side**.
  Verified across all 5 categories (`v11_phase1.mjs`, `v11_phase7.mjs`). See PROJECT_CONTEXT §6.

## New v1.1 limitations (intentional)

- **Expert phone is readable in the directory row.** Unlike listing phones (RPC-gated), the
  `experts` table exposes `phone` in the anon-readable active row; the UI still gates it behind
  the disclaimer + "Show number" button. Acceptable because experts are a small curated set who
  consent to being listed publicly. Revisit if the directory grows or abuse appears.
- **Land `price_type` is client-validated only** (server stores it as-is), consistent with the
  existing land `size_range` pattern; the bhusa/agri required fields *are* server-validated.
- **Agri-Inputs vendor listings are free** with only a "charges may apply later" UI note — no
  payment gate exists anywhere (never in this codebase).
- **v1 E2E specs need updating before re-run.** `e2e/phase{2..9}.spec.js` fill the v1 create
  forms, which now have new required fields (asset pincode, land price type, equipment rate).
  Those specs must fill the new fields before the Playwright suite will pass again; v1.1 logic
  is covered by the `v11_phase*` backend suites in the meantime.

---

## Intentional MVP trust-model limitations (by design)

1. **Identity is not cryptographically verified.** The SECURITY DEFINER RPCs take the
   acting `profile_id` as an argument; a crafted client could pass another user's id and
   act as them. This is the same trust model as the self-declaration checkbox and
   "no police verification" — deliberate for the low-friction MVP. **Resolved in Phase 2**
   when real Phone OTP gives `auth.uid()` and RLS row policies (see PROJECT_CONTEXT.md §5).
   *Impact:* a technical user could impersonate/close/create as another account.

2. **Phone numbers are reachable by any client.** `get_listing_contact` returns a lister's
   name + phone for any active listing (that's how "Call" works). A determined script could
   enumerate active listings and scrape phone numbers. Acceptable for the MVP (numbers are
   shared to enable calls); revisit with rate-limiting / auth-gating if abuse appears.

3. **Anonymous photo upload.** The `listing-photos` storage bucket allows `anon` inserts
   (trust-based, consistent with the rest of the platform). A spam vector in theory. Phase-2
   auth would scope uploads to `auth.uid()`'s folder.

4. **No rate limiting** on signup or listing creation. Fine for the pilot; add abuse
   controls (and Phase-2 auth) before wider launch.

---

## Data / content caveats

5. **Pincode seed is Sagar-district only** (20 real pincodes with real coordinates). Two
   rows carry a research caveat to confirm before wider launch (noted in the seed research):
   Kesli (used PO code 470235 vs a shared 470339) and Barodia Kalan (470661 vs 470441/470117
   in some listings). Core towns are high-confidence. Expanding to more regions is data-only
   (add pincode rows) — see PROJECT_CONTEXT.md §2.

6. **Crops/equipment lists are starter sets** for the Sagar pilot — confirm/expand with the
   founder before wider regional launch (flagged in `supabase/seed/lookups.json`).

---

## Minor / nice-to-have

7. **No client-side image compression** on land photos. On slow rural networks a large
   phone photo may upload slowly. Consider downscaling before upload in a later pass.

8. **Slow-3G / low-end usability** is addressed by a small bundle (~129KB gzip initial),
   code-splitting, lazy images, and an offline app shell, but has not been profiled on a
   physical low-end device — worth a real-device pass before launch.

9. **Deployment is not automated.** The app builds for Cloudflare Pages but is not deployed
   here (per scope). Founder connects Cloudflare Pages to the repo and sets the same env
   vars as a follow-up step.

## Tech Debt

Deferred, non-urgent cleanup. Not functional bugs — nothing here misbehaves for users; each is
left because acting on it touches working, pre-existing code with no reported issue driving it.

- **TD-1 — RESOLVED (2026-09-30).** The four hardcoded Hindi strings were moved into `strings.js`
  (`dd_official_body`, `unit_km` + `founder_initials`, `infotip_more` + `infotip_close`, `label_suffix_hi`;
  the Admin `unit: 'बोरी'` default was dropped — the RPC coalesces a missing unit). `v11_phase6` is now
  fully green (29 passed / 0 failed); it is no longer the intentionally-red suite. Original note below.

- **TD-1 (original) — Four hardcoded Hindi strings should move to i18n (`strings.js`).** The
  `v11_phase6` Devanagari audit (after the comment-stripping + label-allowlist cleanup)
  correctly flags four spots where Hindi is written inline in render code instead of via a
  `t()` key. **Low risk, no functional bug** (they render fine today, including in English —
  three are already `lang === 'en' ? … : …` conditionals). **Deferred** because it edits four
  working pre-existing files and no reported issue is driving it. This is the sole reason
  `v11_phase6` stays red (backend suite: 27 pass / 1 fail).
  - `src/screens/DroneDidi.jsx` — the "official info" paragraph (a `lang===` conditional block
    of Hindi/English prose).
  - `src/screens/Homepage.jsx` — the `किमी` distance unit appended inline in the nearby-listings
    feed, and the `अ.दी.` founder-initials avatar text.
  - `src/components/pages/shared.jsx` — the InfoTip `aria-label` values `'जानकारी'` / `'बंद करें'`
    (`lang===` conditionals).
  - `src/screens/Admin.jsx` — the `(हिं)` suffix on an admin input-price field label.
  - *Fix when picked up:* add keys to `src/lib/i18n/strings.js`, replace the literals with
    `t(...)`, then `v11_phase6` goes green with no further changes. Small, self-contained.

## Homepage v4 (2026-09-24)

- **Official PIB / MP trust-row photos omitted.** drone-didi-official / pm-official /
  cm-official could not be verified (pib.gov.in returns 403 to automated fetch; no
  Wikimedia Commons match). Per spec those cells are omitted rather than substituted; the
  founder cell uses an initials avatar (अ.दी., `TODO: founder photo`). Swap in verified
  official images later if desired.
- **Sawaal photo upload is best-effort for anonymous users.** Uploads go to the
  `listing-photos` bucket; if storage RLS rejects an anonymous upload the question is still
  submitted (without the photo). Confirm/relax the storage policy for anon Q&A photos, or
  gate the photo field behind login, in a later pass.
- **Backend suites not re-run this session** (no service-role run performed). Homepage v4
  changes are additive (new functions, one optional RPC-backed count, one nullable column
  already migrated); `npm run build` is green and a Playwright route smoke passed.

## Fixes + Schemes build (2026-09-24)
- **Availability calendar auth**: writes go through the owner-gated
  `set_listing_unavailable` RPC (verifies `listings.user_id == actor`). It renders on
  equipment-offer detail pages (a Protected route), so it is not in the anonymous
  screenshot set — verified by build + code, not by a logged-in screenshot.
- **KVK events are seed placeholders** and need ongoing admin maintenance (dates roll
  forward relative to seeding; keep them current via the admin events panel).
- **MP `e-krishi-yantra` / `balram-talab` helplines** are null (no single official
  helpline verified); source URLs recorded instead.

## मौसम/MSP build (2026-09-25)
- **DATA_GOV_IN_API_KEY secret not set → 3-year mandi history not backfilled.** Trend
  and "पिछले सालों में" sections show only the short history the 3-hourly refresh has
  gathered; the past-years bar chart stays hidden until ≥12 months exist. Owner action:
  register at data.gov.in, add the `DATA_GOV_IN_API_KEY` repo secret, run the "Backfill
  mandi history" GitHub workflow.
- **ActionWindows / per-crop advice / procurement steps are pending expert review** —
  they carry a "समीक्षाधीन" tag until Shri A.K. Dixit reviews docs/content/
  MAUSAM_MSP_CONTENT_REVIEW.md and an admin flips the review flag.
- **Season-rainfall normal** is computed from the Open-Meteo archive (2015→) at refresh
  time; labelled "पिछले 10 साल का औसत". Values shift slightly as the archive updates.

## Mandi official-API fallback (2026-09-25)
- **Fixed:** the refresh workflow ran `node --env-file=.env` in CI (no .env there) → `.env: not found`. CI now runs `node scripts/refresh-data.mjs` directly; local `npm run refresh-prices` keeps `--env-file=.env`. Also bumped both workflows to Node 22 (supabase-js needs native WebSocket).
- **Official fallback now uses `DATA_GOV_IN_API_KEY`** (secret is set). Findings from live CI runs on resource `9ef84268-…` (data.gov.in "current daily prices"):
  - Filter field names must be **lowercase** (`filters[state]=Madhya Pradesh`); the capitalised `filters[State]`/`.keyword` forms return 0. The text filter also returns other "*Pradesh" states, so we narrow to true MP client-side (~85 rows/day).
  - **The daily feed currently carries NO Sagar-district rows.** So `refresh-data.mjs` pools MP-wide and picks the best available MP mandi for a commodity (marked `is_sagar_district=false`) when Sagar has none. गेहूं/सोयाबीन/मक्का/सरसों/लहसुन come from the wrapper (Sagar); चना and धान now populate from MP mandis via the official API.
  - **मसूर/मूंग/उड़द** still don't populate on some days: they are simply absent from the MP daily feed (off-season / not reported that day) — a data-availability reality, not a code bug. They fill in automatically on days the feed has them.
- **Note for the history backfill:** resource `9ef84268-…` is a *daily-snapshot* resource (today's rows only), and its filters are lowercase; `backfill-mandi-history.mjs` should be revisited (lowercase filters + a genuinely historical Agmarknet source) before relying on it for multi-year history.

## Geofencing / Location / Mandi / PWA / Inputs build (2026-09-25, migration 0025)
- **Failing backend suites — CORRECTED (2026-09-25).** The baseline was 21 pass / 5 fail. This
  note originally claimed all 5 were pre-existing "verified via `git stash`" — that was wrong
  for two, because `phase8.mjs` reads the git-ignored `dist/` build output, so the stash never
  rebuilt it. Accurate breakdown:
  - `phase8` — **was caused by this build's PWA change** (`registerType:'prompt'` +
    `injectRegister:null` → no `registerSW.js`). **Fixed:** `phase8.mjs` now asserts the
    prompt-flow architecture (virtual-module registration, NetworkFirst live data). Passes.
  - `v11_phase6` (Devanagari-outside-allowlist) — already red on many pre-existing comment-based
    files, but this build's new `mandiCoords.js`/`locationStore.js`/`inputsApi.js` were added
    to it. **Fixed:** those three are Devanagari-free at source now (unicode-escaped regex range,
    transliterated comments, dropped a hardcoded `'बोरी'` the RPC already coalesces). Still red
    on the pre-existing files + the empty `mausam_h1_a` key.
  - `p_community` (old "Community" nav dropdown), `phase1` (equipment_types count 11→15 drift),
    `v11_phase2` (labor label "(Labor)" suffix) — genuinely pre-existing; `phase1`/`v11_phase2`
    are in listings-adjacent code but their *failing assertions* aren't from these builds.
  - **Current state: 24 pass / 4 fail** (the 4 above minus `phase8`). The 4 remain open, out of
    scope for these builds.
- **`input_prices` are seeded starter data**, not a live feed — 3 Khurai shops × Urea/DAP/
  diesel with plausible prices. They need ongoing admin maintenance via the `/admin` panel
  (same caveat as KVK events). Not auto-refreshed by any cron.
- **Mandi distance is approximate + informational only.** `/msp/:crop` ranks the today table
  by distance from `src/content/mandiCoords.js` (town-centre coordinates for the ~19 markets
  currently reporting; unlisted markets fall back to a district centre or show "—"). Distance
  is never a filter here (Phase 3c), so approximation is acceptable; expand the gazetteer if
  new markets start reporting.
- **PWA update flow is now explicit (`prompt`).** A new deploy no longer swaps content
  silently — the user sees a "नया अपडेट उपलब्ध है — रीलोड करें" banner and must accept it. The
  two-consecutive-deploys manual check (an old tab shows the banner) was not run in this
  session; the config + `onNeedRefresh` wiring is covered by the static config test and the
  install/offline E2E. Worth a manual two-deploy confirmation on a real device before launch.
- **`index.html` `theme-color` meta** was corrected from `#15803d` to `#24733F` (manifest was
  already correct); the value shipped in the final deploy recorded in the review doc.
- **Auth-gated pages** (`/browse`, `/post`, `/listing/:id`, `/admin`) are covered by the
  logged-in Phase 8 screenshot pass + backend RPC guard tests, not by the public E2E specs
  (the legacy `e2e/phase{2..9}` specs still need the new required create-listing fields before
  they can re-run — carried from earlier).

## Location out-of-area fix + Mandi comparison (2026-09-25, 0026)
- **Out-of-area threshold is 100 km** (`SERVICE_AREA_KM`). Since the pincode seed is Sagar-only,
  ANY user outside ~100 km of Sagar (including elsewhere in MP) sees the out-of-service-area
  message on GPS auto-detect and must either enter a pincode or explicitly tap to view the
  nearest village's data. This is intended for the Sagar pilot; widen the pincode seed (data-only)
  to expand the service area. Root cause of the original Hyderabad→Deori bug was the missing
  distance check (candidate #3), not a cache/logic defect — documented in the review doc.
- **If the pincodes table hasn't finished loading when the user taps "हाँ"**, the distance check
  has no data and detect falls back to committing the precise GPS coords with the default pincode
  (no far-village substitution, but also no out-of-area notice). Normal on a fast load; the E2E
  waits for the pincodes response to avoid this race.
- **Mandi comparison distances** reuse the approximate town gazetteer (`mandiCoords.js`); auto-
  nearest ranking is only as good as that gazetteer (unlisted markets fall back to district
  centre / are skipped for ranking). Distance is informational, never a filter.
- **Missing-price "—" uses a native `title` tooltip** (hover / long-press), not an `InfoTip` ⓘ
  button, to avoid an ⓘ on every empty cell in the dense comparison grid — tap-reveal is
  therefore browser-dependent on mobile.
- **Backend suites: 24 pass / 4 fail** after the correction above. This build added
  `p_0026_location_compare.mjs` (19, passes). Of the previously-reported "5 pre-existing / 5
  fail", `phase8` turned out to be a PWA-change regression (now fixed) and `v11_phase6` had this
  build's new files added to it (now removed at source) — see the corrected 0025 note above.
  The 4 remaining failures are genuinely pre-existing.

## Stale-assertion refresh + v11_phase6 cleanup (2026-09-25 follow-up)
- **Refreshed 3 stale assertions to current reality:** `phase1` equipment_types count 11→15
  (4 machines added since v1.1), `v11_phase2` labor label `'कृषि सहयोगी'`→`'कृषि सहयोगी (Labor)'`,
  `p_community` nav check (old single "Community" dropdown → current schemes-dropdown + सवाल link).
- **`v11_phase6` option 1 + 3 done:** the Devanagari audit now strips comments before scanning
  (Hindi in comments is not a localisation bug) and allowlists the bilingual label/content files
  (`content/crops.js`, new `content/months.js` — `MONTHS_HI` moved there out of `Msp.jsx`); the
  `SchemeDetail.jsx` regex Devanagari-digit range `०-९` is now `०-९`. The empty
  `mausam_h1_a` i18n key was removed (the /mausam H1 now renders `{place} {mausam_h1_b}`).
- **`v11_phase6` still fails — OPTION 2 DEFERRED (documented i18n debt).** After the cleanup the
  audit precisely pinpoints 4 files with genuinely hardcoded Hindi in render code that should move
  into `strings.js`. These are pre-existing (none from the 0025/0026 builds) and left as-is by
  explicit decision — full list + rationale under **Tech Debt → TD-1** above. Until then
  `v11_phase6` is the one intentionally-red suite.
- **Backend suites: 27 pass / 1 fail** (only `v11_phase6`, failing solely on the TD-1 debt files).

## Weather/Location split + mandi rates + 5-mandi compare (2026-09-25, migration 0026)
- **Phase 1e real-device verification is OPEN (not marked complete).** The original
  Hyderabad→Deori bug once falsely passed on emulation. Real-device testing isn't possible from
  the build environment, so the `?debug=1` overlay surfaces the raw returned lat/lng, accuracy
  radius, and timestamp (`data-testid="geo-debug"`). **Owner action:** open `/mausam?debug=1` on a
  phone, tap "हाँ", confirm the three values reflect the real location. Until then 1e is unverified.
- **Weather live-fetch write-back is anon via `cache_weather_cell` (SECURITY DEFINER).** This is
  the one narrow anon write path into `weather_cache_v2` (weather is public + self-correcting on
  the next cron pass, so the abuse surface is negligible). It validates the grid key + coords and
  preserves any cron-computed `season_rain`. A client live-fetch supplies forecast only
  (season_rain stays null until the cron fills it), so a brand-new cell's /mausam season section
  shows "unavailable" for one cron cycle.
- **Out-of-area homepage/`/msp`**: counts show 0 and the nearby-listings feed shows newest
  (unfiltered) rather than an empty state; the LocationControl carries the honest "सेवा क्षेत्र से
  बाहर" notice. Weather still shows the user's real location. This is intended (weather global,
  village features gated).
- **उड़द (Urad) is genuinely absent** from the mandi feed (zero rows) — shows a bare "—" + the
  honest note, not a bug. मसूर/मूंग are sparse (single mandi, may be days old) — shown with the
  cross-mandi hint / stale tag. Data-availability reality of the Agmarknet daily snapshot.
- **Cross-mandi hint uses `InfoTip`** (an ⓘ per empty-but-available cell). In a 5-mandi × 10-crop
  grid that is several ⓘ icons; acceptable for an opt-in comparison view, but if it feels noisy a
  future pass could switch to a single per-row hint.

## Location naming (2026-09-26)
- **IP-city suggestion is production-only.** `functions/geo.js` runs on Cloudflare's edge;
  `vite preview` (local screenshots/E2E) does not execute Pages Functions, so `/geo` returns
  the SPA fallback and the suggestion no-shows — intended (Phase 2d). Tests mock `/geo` to
  exercise the suggestion path.
- **Reverse-geocode names can differ in wording from seeded village names.** Handled by 1a-ii
  (in-area keeps `matchedVillage`'s name; only out-of-area coords are geocoded), but the
  geocoder's town-level names for a brand-new area are whatever BigDataCloud returns (Hindi
  where available, else English — accepted per spec).
- **BigDataCloud is a free, keyless third-party.** No key/quota managed here; if it is ever
  down or rate-limited, Phase 1c falls back to the nearest-village/generic label (never raw
  coords). A future pass could add a second geocoder or self-host if reliability matters.
- **`?debug=1` overlay is the ONLY place raw coordinates appear** (by design, for real-device
  diagnosis). Grep-audited: no other user-facing view renders a lat/lng pair.

## Legal / Agro-Forestry / Availability / Profile (2026-09-26, migration 0032)
- **v1 E2E specs `phase2–9` remain pre-existing-broken (23 tests) — NOT a regression from this build.**
  They predate the homepage-as-landing redesign (`/welcome` button is now `t('new_user')`, not the
  "नया खाता बनाएं" they assert — a screen untouched here), the required asset fields, the Land `size_acres`
  change, and now the mandatory rules checkbox. Updating them is out of scope; the maintained suites cover
  the shipped behaviour: backend 32/1 (only the TD-1 `v11_phase6` i18n debt), maintained E2E phase10–16 = 34/34.
- **Rules-compliance is mandatory server-side:** any future code path that creates a listing MUST pass
  `p_rules_agreed=true` to `create_listing` (the old 11-arg overload was dropped). Direct-insert seeding
  (`seed_dummy.mjs`) bypasses the RPC and is unaffected.
- **Availability of listing detail-by-id + phone reveal are intentionally NOT `is_available`-filtered** — an
  unavailable listing stays reachable by a direct link / owner preview; it is only removed from browse/feed/
  counts. Documented decision (Phase 3e).
- **Buyer-side engagement nudge is deferred** (needs WhatsApp API or login-to-browse). The owner-side nudge
  is WhatsApp-ready (`get_availability_nudges` + `set_listing_availability`).
- **Agro-forestry images** are 2 CC BY-SA 3.0 Wikimedia Commons photos (attributed in
  `public/images/agroforestry/manifest.json` + /credits) — attribution must be retained.

## Sawaal/PWA/BackButton/Ticker/AgroForestry build (2026-09-26)
- **PWA install-banner regression root cause + test blind spot (fixed).** The banner was invisible to
  real visitors because its render gate required `beforeinstallprompt` to have fired (rare in practice;
  never on iOS/Firefox/incognito/installed). The earlier E2E masked this by dispatching a synthetic
  `beforeinstallprompt` before asserting visibility. Fixed: visibility decoupled from the event; the
  fresh-visitor test no longer dispatches it. Lesson: never synthesise a browser-gated event before
  asserting a "shows for everyone" state.
- **Global 44px tap-target `min-height`** (index.css, on `a/button/input/select/textarea`) can break
  compact strips (it clipped the 38px mandi ticker). Opt slim in-strip controls out with `min-h-0`.
- **BackButton relies on `location.key`** to distinguish in-app history (`!== 'default'`) from a direct
  link. This is React Router's initial-entry marker; if the router setup changes, revisit this heuristic.
- **/agro-forestry cross-links intentionally omitted** — no genuinely relevant Kisan Sawaal question or
  video exists yet; add them later if matching horticulture/agroforestry content is created.

---

## V2 release known issues / follow-ups

- **Source links that return 403 to automated fetch (not dead):** all `pib.gov.in` PIB
  press-release URLs (e.g. S-QAS-01/04/05/06/07/08/09, S-JUG-*) return HTTP 403 to the link
  checker but open normally in a browser. The facts were verified via domain-restricted search
  (D13/D18). `bioone.org` (S-QAG-08) returned 500 (transient). Several govt sites (TNAU
  `agritech.tnau.ac.in` S-QAG-03, `icar.gov.in` S-GH-21/22, fmttibudni, pmkisan) have
  expired/unverifiable TLS certs — transient, reachable in a browser. None are genuine dead links.
- **Total JS gzip grew to ~434 KB (from 306 KB baseline)** — by design (D1b): V2 content hubs
  (greenhouse/carbon/jugaad ~3000 words each), the Kisan Sawaal pages, and the `qrcode` lib all ship
  as **lazy route chunks**. The governing guard is the **eager** bundle (index+react-vendor+supabase),
  currently **~140 KB**, well under the ~209 KB cap.
- **`qrcode` npm dependency** flags 4 high-severity advisories in transitive deps (build-time/client
  QR only, used in lazy admin/join chunks). Low risk; revisit or vendor a smaller encoder if desired.
- **Kisan Sawaal backlog:** 40 Q&As published; the ranked remainder (lentil/urad/moong YMV, several
  pesticide doses, wheat irrigation day-counts, weather-damage advisories) could not be fetch-and-quoted
  this run (expired certs / image-only PDFs) and are listed in `docs/research/QA_DEMAND.md` + the final
  report. Adding `DATA_GOV_IN_API_KEY` unblocks KCC-ranked expansion toward the 150–300 target.
- **Unknown URLs serve HTTP 200 (SPA) with the real noindex 404 page rendered client-side.** The
  catch-all route is `<Route path="*" element={<NotFound/>}/>` (noindex, links to key hubs) — no longer
  the old soft-redirect. If a hard 404 status is wanted, add a `dist/404.html` for Cloudflare Pages.
- **WhatsApp features are built but hidden** until an admin pastes the channel URL into
  Admin → WhatsApp (`site_settings.whatsapp_channel_url`). Nothing WhatsApp-related shows while empty.
