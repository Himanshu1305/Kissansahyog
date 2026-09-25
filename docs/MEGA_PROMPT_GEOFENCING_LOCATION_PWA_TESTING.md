# Kisan Sahyog — Geofencing, Location, Mandi Search, Fixes, PWA, Input Tracker, E2E Testing

DO NOT ask for approval or questions. Decide and proceed. Read PROJECT_CONTEXT.md, KNOWN_ISSUES.md and every file in docs/review/ first — this build touches shared code (listings query, location) that many pages depend on, so understand the current state before changing anything.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy only after Phase 8 passes:** `npm run build && npx wrangler pages deploy dist --project-name kissansahyog`

**One migration file for everything in this prompt:** `supabase/migrations/0025_visibility_location_inputs.sql`. Apply with `npm run db migrate`.

This is a large, foundational batch. Work through phases in order — later phases depend on earlier ones being correct, not just present. Do not skip Phase 0 or Phase 7.

---

## Phase 0 — Geofencing: verify, then enforce (do this first, before anything else)

**0a. Investigate.** Read the actual code behind the nearby-listings query and the "आपके आसपास" `nearby_counts` RPC. Determine, factually: is there a hard distance cutoff (results beyond 30km, or 50km on fallback, are excluded from the result set entirely), or does the query fetch broadly and only sort/label by computed distance with no exclusion? Write the finding plainly at the top of `docs/review/PHASE0_GEOFENCING_FINDING.md` before changing any code: "Hard cutoff: YES/NO, evidence: …".

**0b. Enforce, if missing.** This is a fraud-prevention requirement, not a UX preference — proximity is what makes a listing trustworthy and actionable (a farmer can go look at the tractor, meet the person). If no hard cutoff exists, implement one in the nearby-listings query and the `nearby_counts` RPC:
- Default: exclude anything beyond 30km.
- Fallback: only when a category has **zero** results within 30km for that search, widen to 50km for that category only, and label those results "30–50 किमी के बाहर" (reuse the existing UI pattern for this label if one exists from an earlier build; create it consistently if not).
- Never widen beyond 50km for standard listings (see Phase 1 for the one exception).
- This applies to every category **except** where Phase 1's opt-in flag is set, and has no bearing at all on Phase 3's mandi price search (that is a separate, deliberately unrestricted feature — do not let this logic leak into it).

**0c. If a hard cutoff already existed and was correct,** state that in the finding doc and change nothing in this phase beyond confirming it with a test (folded into Phase 7).

**0d. Zero-listings safety check.** Immediately after implementing or confirming the cutoff, run a manual count query per category (`SELECT category, COUNT(*) FROM listings WHERE is_active = true`) from at least two different test locations, and confirm the nearby-results count is neither zero for every category (an overly strict clause silently hiding everything) nor identical to the total unfiltered count (the cutoff not actually applying). Record both counts in the finding doc. This is a kill-switch check on logic every other page depends on — do not skip it.

---

## Phase 1 — Per-listing visibility radius opt-in (restricted scope)

**1a. Schema (migration 0025):**
```sql
ALTER TABLE listings ADD COLUMN wide_visibility boolean NOT NULL DEFAULT false;
```
Add an application-level guard (in the create/update listing RPC or handler, not just the UI) that only permits `wide_visibility = true` when `category IN ('parali', 'agri_inputs')` (use the actual category key names from the existing schema — verify exact values before writing the check). Any attempt to set it true for another category, including via a direct API/RPC call bypassing the form, must be rejected server-side, not just hidden in the UI.

**1b. Listing form.** For Bhoosa/Parali and Seeds & Inputs categories only, add a checkbox at listing creation/edit time, **default unchecked**:
"इसे 30 किमी से दूर के लोगों को भी दिखाएं"
with a one-line note beside it: "नज़दीकी खरीदार मिलना आसान और सुरक्षित होता है — दूर के लोगों से सावधानी से डील करें।"
No checkbox appears on any other category's form.

**1c. Query logic.** The nearby-listings query: for the two eligible categories, if a listing has `wide_visibility = true`, include it for searchers up to 100km away (label distance plainly, no special "wide" badge needed — the km number speaks for itself), while all other listings in every category still obey Phase 0's 30/50km rule.

---

## Phase 2 — Location: auto-detect + unify into one component

**2a. Build `LocationControl`** (one shared component, used everywhere location is needed): on mount, request browser Geolocation (`navigator.geolocation.getCurrentPosition`) behind a clear, dismissible prompt ("अपनी जगह अपने आप पता करें?" / "हाँ" / "पिनकोड डालें"). On grant: use the returned lat/lng directly for weather (Open-Meteo takes lat/lng natively, no reverse geocoding needed); separately, match the lat/lng to the nearest seeded village/pincode for pincode-dependent features (nearby counts, listings, MSP mandi ranking). **First locate whatever already stores village coordinates from the मौसम/MSP build — this may be a DB table or a JS constants file (e.g. `src/content/villages.js` or similar) — and reuse it as the single source of truth; do not create a second, parallel coordinates source.** On denial, dismissal, or an unsupported browser: fall back to the existing manual pincode input — this manual override must always remain available and visible even after a successful auto-detect, so a farmer can check a different village's data deliberately.

**2b. Replace all three existing separate location/pincode inputs** — homepage's "आपके आसपास" control, `/mausam`'s location control, `/msp`'s location control — with this single shared component. Same copy, same behavior, everywhere.

**2c. Recent locations.** Store up to 5 recently-used locations (label + lat/lng or pincode) in `localStorage` (no login required, no server round-trip). Show as quick-pick chips below the LocationControl input: "हाल की जगहें: खुरई · सागर · बीना". Cap at 5, drop oldest on overflow.

---

## Phase 3 — MSP: nearby-mandi ranking + free mandi search (deliberately NOT geofenced)

**3a. Rank existing mandi table by real distance.** On `/msp/:crop`, the "आज का भाव" table (already showing every reporting mandi from the earlier build) should be sorted by actual distance from the farmer's current location (from Phase 2), nearest first, with the km shown per row — replacing whatever ordering exists now (likely alphabetical or price-based).

**3b. Mandi search.** Add a text input/autocomplete above the table: "मंडी का नाम खोजें (जैसे: बीना, रहली)". Source the list of valid mandi names from `SELECT DISTINCT market FROM mandi_prices` — not a geographic gazetteer, not a hardcoded list. Typing a name (fuzzy/partial match) and selecting it shows that mandi's latest price for the currently-selected crop, appended to or highlighted within the results, however far away it is — and shows the price's date alongside it (same "अंतिम भाव: [date]" pattern used elsewhere), so an old cached price is never presented as if it were today's.

**3c. Explicit separation, in code and in a comment.** This feature must not import or call the Phase 0/1 distance-cutoff logic. Add a comment at the top of the relevant file stating plainly: "Mandi price comparison is a farmer's own selling decision, not a person-to-person trust interaction — distance is informational only here, never a filter. Do not apply the 30/50km listing-visibility rule to this feature." This separation gets a dedicated regression test in Phase 7.

---

## Phase 4 — Small fixes

**4a. Nav link for `/fasal-salah`.** Add "फसल सलाह" as the last item in the बाज़ार nav dropdown, linking to `/fasal-salah`. Confirm it is in `public/sitemap.xml`; add it if missing.

**4b. CSP Google Fonts fix.** Add `https://fonts.googleapis.com` to `style-src` and `https://fonts.gstatic.com` to `font-src` (or the equivalent existing CSP directives) in `_headers`. Confirm the browser console CSP notice for Google Fonts is gone after deploy.

---

## Phase 5 — Progressive Web App (PWA)

Use `vite-plugin-pwa` rather than a hand-rolled service worker — this project deploys frequently, and a naive service worker risks locking farmers onto a stale cached build indefinitely with no way to know a fix has shipped. Configure it with `registerType: 'prompt'` (never `'autoUpdate'` silently swapping content mid-session) so the update flow is explicit and visible.

**5a. `public/manifest.json`:** name "किसान सहयोग", short_name "Kisan Sahyog", icons (reuse/generate 192x192 and 512x512 from the existing logo asset), theme_color and background_color matching the site's `--ks-primary`/`--ks-bg` tokens, `start_url: "/"`, `display: "standalone"`.

**5b. Service worker via `vite-plugin-pwa`:** cache the app shell (JS/CSS bundles, fonts, static images) for offline load; explicitly configure runtime caching to NEVER cache live data endpoints (mandi prices, weather, listings, Supabase API calls) as if they were fresh — a `NetworkOnly` or `NetworkFirst` strategy for those, `CacheFirst` only for static assets. If a cached page is shown offline, display a clear "आप ऑफ़लाइन हैं — आख़िरी बार अपडेट: [time]" banner rather than presenting stale prices/weather silently as current.

**5c. Update-available prompt.** When `vite-plugin-pwa`'s `onNeedRefresh` fires (a new deploy is live but the user has an old cached version open), show a small, non-blocking banner: "नया अपडेट उपलब्ध है — रीलोड करें" with a reload button that calls `updateSW(true)`. Verify this actually appears by deploying twice in a row during testing and confirming a browser tab open from before the second deploy shows the prompt.

**5d. Install prompt UI.** Do not show on first visit. Show "किसान सहयोग को होम स्क्रीन पर जोड़ें" after a signal of a returning visitor (e.g. second page view in a session, or a prior-visit flag in localStorage), dismissible, not shown again for 14 days if dismissed.

**5e. Verify** installability with Lighthouse's PWA audit (installable, has manifest, has service worker, works offline for the shell) as a sanity check — record the result in the review doc.

---

## Phase 6 — Input price tracker (pulled forward from backlog)

**6a. Schema (migration 0025, same file):**
```sql
CREATE TABLE input_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_hi text NOT NULL, item_en text,
  shop_name text NOT NULL, location text DEFAULT 'Khurai',
  price numeric NOT NULL, unit text NOT NULL DEFAULT 'बोरी',
  updated_date date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```
Public read where `is_active = true`; admin write via SECURITY DEFINER RPC, same `require_admin` pattern as `msp_prices`.

**6b. Seed** with 3 named Khurai-area shops × Urea, DAP, and diesel (per litre) — plausible current prices, clearly documented as a starting point requiring ongoing admin maintenance (note this in PROJECT_CONTEXT.md, same caveat already used for KVK events).

**6c. Display:** a compact card on `/info` (and optionally a small homepage teaser) — "कृषि सामग्री के भाव" — item, shop, price, unit, "अपडेट: [date]". Admin CRUD form in `/admin`, same pattern as MSP/scheme management.

---

## Phase 7 — Automated end-to-end testing (mandatory, before the screenshot review)

This phase exists because this batch touches shared code that many other pages depend on. Do not treat it as a formality — a failure here found late is far cheaper than a farmer finding it live.

**7a. Baseline.** Run every existing automated suite (Playwright, backend/API tests) before writing any new test. Record the exact pass count. This number must not decrease by the end of this phase.

**7b. New scenarios — write real, PERMANENT automated tests** (Playwright for UI flows, direct API/RPC calls for backend logic), committed into the existing test suite directory alongside the current tests — not throwaway scripts run once and discarded. These must become part of the baseline every future prompt's Phase 7a re-runs, the same way the existing suite already is; that is the entire point of this phase, given backend suites were skipped twice earlier in this project. Each with positive, negative, and edge cases:

*Geofencing (Phase 0/1):*
- Positive: a listing ~15km from a test location appears in results; a Bhoosa listing ~60km away with `wide_visibility=true` appears; an Equipment listing ~60km away does NOT appear.
- Negative: attempt to set `wide_visibility=true` on an Equipment listing via a direct RPC call (bypassing the UI) — must be rejected.
- Edge: listings at ~29.5km and ~30.5km from a test location (a real "exactly 30km" is not constructible with floating-point coordinates) — confirm and document which side of the boundary each falls on, and that behavior is consistent across repeated calls; a listing with null/missing coordinates does not crash the query and is excluded gracefully, not erroring.

*Location (Phase 2):*
- Positive: using Playwright's `context.setGeolocation()` + `context.grantPermissions(['geolocation'])` to mock a grant — weather and nearby-counts reflect the mocked coordinates, not a stale default.
- Negative: mocking geolocation denial (`context.grantPermissions([])` or blocking the permission) — falls back to the manual pincode input with no broken state, no console error.
- Edge: mocked coordinates far outside MP (e.g. Hyderabad's lat/lng) — confirm no crash, and a sensible "इस जगह के लिए डेटा उपलब्ध नहीं" rather than nonsense output; recent-locations list handles a 6th entry by dropping the oldest, not erroring or growing unbounded.

*Mandi search (Phase 3):*
- Positive: exact mandi name match returns its current price; a partial/misspelled input still surfaces the right mandi via fuzzy match.
- Negative: a valid mandi name with no price data for the selected crop shows an honest empty state, not a stale or fabricated price, not a crash.
- Edge: automated test asserting the mandi-search code path does NOT call or import the Phase 0/1 distance-cutoff function at all (a static/code-level check, not just a behavioral one) — this directly verifies the Phase 3c separation requirement.

*PWA (Phase 5):*
- Positive: install-prompt logic fires on a simulated second visit, not on the first; the update-available banner appears after simulating two consecutive deploys (an old tab detects `onNeedRefresh`).
- Negative: service worker does not serve a cached price/weather value without the offline banner being shown alongside it; runtime caching config never applies `CacheFirst` to a Supabase/API request (a static/config-level check).
- Edge: fully offline load (Playwright `context.setOffline(true)`) of a previously-visited page shows the offline banner and cached shell rather than a blank screen or a hard failure.

**7c. Downstream touchpoint sweep.** Explicitly re-test, end to end, every page that reads listings, location, or mandi data but was not directly rewritten in this batch: `/browse`, `/post` (listing creation for a non-Phase-1 category still has no wide_visibility checkbox), `/listing/:id`, homepage "आपके आसपास" section, `/drone-didi`'s local-listings section, the admin dashboard's listing and vendor views, and the homepage mandi ticker (confirm it still shows live prices — this exact regression happened earlier this session and must not recur silently).

**7d. Bug-fix loop.** Any failure in 7b or 7c is fixed immediately. After any fix, re-run the ENTIRE 7a–7c sequence from the baseline — not just the failed test — since a fix can introduce a new regression elsewhere. Repeat until: the full suite is green, and the total test count has only increased (new tests added, none removed) relative to the Phase 7a baseline.

**7e. Write `docs/review/E2E_TEST_REPORT.md`:** every scenario from 7b and 7c, pass/fail, and for each bug found and fixed during the loop — what broke, what the fix was, and confirmation it was re-verified by a full re-run, not just the one test.

---

## Phase 8 — Screenshot self-review (mandatory, after Phase 7 passes, before deploy)

Build + preview; full-page screenshots at 1280×800 and 375×812 of: homepage, `/mausam`, `/msp/gehun` (with a mandi search performed and a distant mandi's result showing), `/post` for a Bhoosa listing (showing the wide_visibility checkbox) and for an Equipment listing (confirming the checkbox is absent), the PWA install prompt, and the बाज़ार dropdown showing "फसल सलाह". **View every one.** Checklist:
- LocationControl looks and behaves identically on homepage, /mausam, /msp.
- Geolocation prompt is clear and dismissible; manual pincode fallback always reachable.
- Mandi search box present and demonstrably returns a result for a mandi outside the farmer's 30km radius.
- Bhoosa/Seeds listing forms show the checkbox with its note; every other category's form does not.
- PWA install prompt copy and manifest icons render correctly.
- फसल सलाह reachable from नav on both screen sizes.
- Google Fonts CSP console notice is gone.
- No horizontal scroll anywhere; nothing under 14px.

Fix → re-screenshot → re-view until clean. Then confirm Phase 7's full suite is still green (re-run once more after any Phase 8 fix, since a visual fix can reintroduce a logic regression). Deploy, then repeat the screenshot check against the live staging URL, and re-confirm the homepage mandi ticker shows live prices on the live site specifically.

Write `docs/review/PHASE0-8_FULL_REVIEW.md` summarizing every phase's outcome, with explicit cross-references to `PHASE0_GEOFENCING_FINDING.md` and `E2E_TEST_REPORT.md`.

Commit message: "Geofencing verified/enforced (30km hard cutoff, 50km fallback); per-listing wide-visibility opt-in for Parali/Inputs; unified auto-detect LocationControl; MSP nearby-mandi ranking + free mandi search (deliberately distance-unrestricted); फसल सलाह nav link; Google Fonts CSP fix; PWA (manifest, service worker, install prompt); input price tracker; full E2E regression suite with bug-fix loop; screenshot-reviewed"
