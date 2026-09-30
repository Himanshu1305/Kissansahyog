# Legacy E2E cleanup · Transport · Voice search · Mandi labeling · IMD research · i18n debt

Date: 2026-09-30 → 2026-10-01. Spec: `docs/TRANSPORT_VOICE_MANDI_IMD_TECHDEBT_PROMPT.md`.
Migrations: `0033_transport_category.sql`, `0034_voice_transcribe_rate_limit.sql` (both applied to the live DB).

---

## Phase 1 — Legacy E2E rewrite (clean baseline)

Executed `docs/review/LEGACY_E2E_AUDIT.md` directly (did not re-investigate).

- **Before:** fresh build → `e2e/phase2–9` = **23 failed / 3 passed** (matched the audit baseline exactly).
- **Action:** rewrote the **22 "Rewrite"** tests to current reality across the audit's 6 root causes
  (homepage-as-landing → `/welcome`; post source step; numeric `#f_size_acres`; asset VILLAGE name not
  pincode; mandatory `rules-agree-checkbox`; CategoryStrip `chip-<cat>` with Land last; integer "N km away").
  Removed the **1 "Merge"** test (phase8 offline-shell) — already covered by the passing
  `phase10_location_pwa` offline test.
- **After:** `e2e/phase2–9` = **25 passed / 0 failed** (22 rewritten + 3 previously-passing kept). One
  redundant test merged away; no meaningful coverage lost.
- **Two count assertions made robust to seed data** added in migration 0014 (after these tests were written):
  Journey A tracks per-category browse deltas via `?cat=` deep-links; Journey B uses an isolated remote
  coordinate. This was a real correction — the dummy seed surrounds Deori/Malthon, so absolute counts of 1
  are no longer valid there.

## Phase 2 — Transport / logistics (10th category)

Anchored like every other category (own-location listing, standard 30/50 km radius, **no route model, no
wide-visibility**). Migration `0033` widened `listings_category_check` and added `create_listing` validation
(vehicle_type + rate_basis required; 12-arg signature unchanged). Module `transport.jsx`; catalog
`VEHICLE_TYPE` (ट्रैक्टर-ट्रॉली/पिकअप/ट्रक/टेम्पो/अन्य) + `TRANSPORT_RATE_BASIS` (प्रति किमी/प्रति ट्रिप/बातचीत से).
Placement: NavBar बाज़ार dropdown, homepage tile + card-photo fallback, category-agnostic browse/detail/post,
`/?cat=transport` in `sitemap.xml`, 4 seeded dummy listings (`is_test_data`, 54 rows total). **2d:** no
hardcoded "N categories" is rendered anywhere (`stat_categories_label` is unused since Homepage v4);
`nearby_counts` covers a 6-category subset (already omits agri_inputs) so transport follows that precedent;
Admin uses `CATEGORIES`+`CATEGORY_META` so it lists transport automatically. **2e:** re-ran all Phase 1 tests
with transport present — 25/25 green, Land still LAST.

## Phase 3 — Voice search (Web Speech primary, Gemini fallback, graceful without a key)

- **Primary:** Web Speech API (`SpeechRecognition`/`webkitSpeechRecognition`, `hi-IN`, interim results fill the
  field live) on the `/sawaal` search box (`VoiceSearchButton` + `lib/voice/voiceSearch.js`). Free, client-side,
  covers the pilot's Chrome-Android audience.
- **Graceful failures:** permission-denied → "माइक की अनुमति नहीं मिली — टाइप करके खोजें"; onerror/onnomatch →
  "सुन नहीं पाया, दोबारा कोशिश करें" + button resets; unmount cleanup + 15 s recorder auto-stop → never stuck.
- **Support detection:** unsupported browsers show a mic ONLY when the fallback is usable (a `GET /transcribe`
  probe reports a key AND MediaRecorder has a usable mime), else no mic — normal text search remains.
- **Fallback:** `functions/transcribe.js` Pages Function → Gemini `gemini-3.5-transcribe`
  (`generateContent`, inline base64 audio, `x-goog-api-key` header, `audio/webm` — all **verified against
  Google's live docs, 2026-09**; model overridable via `GEMINI_MODEL`). **Key stays server-side** — the browser
  only calls same-origin `/transcribe`. Safari's `audio/mp4` path is attempted but flagged less-certain
  (Gemini lists m4a/aac; Safari is the exact browser lacking SpeechRecognition, so its recorder is the fallback
  target — if it proves unreliable in practice, hide the mic for it).
- **Rate limit (3c-i):** DB-backed `check_transcribe_rate` + `voice_transcribe_calls` (migration `0034`),
  20/IP/hour, real persistent state. Verified: 20 allowed / 5 denied. Fails open if the function's Supabase env
  is unset.
- **CSP (3e):** no change needed — `connect-src 'self'` already permits the same-origin `/transcribe` call.
- **Verified locally** (wrangler pages dev): `GET /transcribe → {configured:false}`, `POST → 503
  not_configured`; rate-limit RPC 20/5.

> ### ⚠️ OWNER ACTION REQUIRED — Gemini key (fallback for Safari/Firefox users)
> The voice fallback is fully built but **inert until a key is provided**. The primary Web-Speech path already
> works for Chrome/Android; unsupported browsers currently show **no mic** (the graceful state). To activate the
> fallback for Safari/Firefox:
> 1. Obtain a **Gemini API key** (Google AI Studio / `aistudio.google.com`).
> 2. Add it as a **Cloudflare Pages environment variable** named `GEMINI_API_KEY` (Pages project → Settings →
>    Environment variables — *not* a GitHub repo secret; the Pages Function reads `context.env`).
> 3. Optional: `GEMINI_MODEL` (defaults to `gemini-3.5-transcribe`); and `SUPABASE_URL` +
>    `SUPABASE_SERVICE_ROLE_KEY` to enable the per-IP rate limit for the function.
> Until then everything degrades gracefully and no error is shown.

## Phase 4 — Mandi data: diagnosed, then honest labeling

**4a diagnosis (investigated, not assumed):**
- The 3-hourly cron (`refresh-mandi-prices.yml`, 8 runs/day) is **healthy**. Last 2 weeks: **29/39 runs
  succeeded**, and **all 10 failures predate the 2026-09-25 Node-22 WebSocket fix** — every run since 09-26 is
  green (20/20). Data lands **near-daily** (the only gap in the window, 09-24, was inside the pre-fix failure
  window).
- **MP-wide collection is already the DEFAULT**, not an emergency fallback: `refresh-data.mjs`
  `getOfficialPool()` fetches an MP-wide pool and only *prefers* Sagar rows within it (`is_sagar_district=false`
  when Sagar has none).
- Coverage: Wheat/Soyabean/Garlic/Maize/Mustard reliable daily; Gram/Paddy/Lentil/Moong sparse — a
  data-availability reality of the Agmarknet daily snapshot, already documented; not a bug.

**4b:** because daily collection is already reliable and MP-wide, **no refresh-script change was made.**

**4c honest labeling (applied to BOTH the ticker and the MSP page):**
- No "बासी/स्टेल" wording existed. `priceStaleness` now returns `today | yesterday | older`; `PriceCell`/`StaleTag`
  always show the **exact date** next to a non-today price — neutral "कल का भाव (dd/mm)" (yesterday), amber
  "पिछला भाव (dd/mm)" (older) — never a tooltip. Never-recorded commodities keep the honest "—".
- `fetchMandiPrices` now falls back to the most-recent available date (not just today/yesterday) and returns
  `{day, date}`; the ticker renders a dated badge instead of an undated "कल के" badge or a false "coming soon".
- `priceStaleness` was extracted to a pure module (`lib/mandi/staleness.js`) so it is unit-testable.

## Phase 5 — IMD feed research (NOT integrated — 5b decision gate)

Researched the live IMD API surface (`api.imd.gov.in`). The modern API **does** expose a genuinely
district-granular feed — `GET /api/v1/districtwarning?id=<district_id>` returns 5-day colour-coded warnings
(Red/Orange/Yellow/Green) per district — which would meaningfully improve on our derived classification.

**But real requests confirmed it is not usable now:**
- `districtwarning` → `401 {"error":"API key missing"}` and **no CORS header** (browser-blocked).
- legacy `city.imd.gov.in` forecast → `401 "IP … needs to be whitelisted"` (server-IP allow-list).
- The key is **registration-gated** (create an account + accept terms at api.imd.gov.in — no public/demo key);
  Sagar's district id can't be enumerated without access; any use needs a server-side proxy for CORS.

**Decision:** per 5b, **do not force a broken/low-value integration.** `/mausam` keeps its derived
classification + link to `mausam.imd.gov.in` unchanged. **Path for later** (when the owner registers + gets a
key): add a `/imd-warning` Cloudflare Function proxy (key server-side, same pattern as `/transcribe`) calling
`districtwarning?id=<Sagar id>` and render an official IMD badge on `/mausam` alongside the derived one.

## Phase 6 — Tech debt: 4 hardcoded strings → i18n

Moved all four into `strings.js`: `DroneDidi.jsx` official paragraph → `dd_official_body`; `Homepage.jsx`
`किमी` → `unit_km` and `अ.दी.` → `founder_initials`; `shared.jsx` InfoTip aria-labels → `infotip_more`/
`infotip_close`; `Admin.jsx` `(हिं)` → `label_suffix_hi` (+ dropped the `unit:'बोरी'` form default the RPC
coalesces). Added `transport.jsx` to the audit's label allowlist + parity list. **`v11_phase6` is now
29 passed / 0 failed** — it is no longer the intentionally-red backend suite.

## Phase 7 — Testing, bug-fix loop, review

- **7a baseline:** Phase 1 established `phase2–9` = 25 passing; the maintained `phase10–17` suites add 38 → 63.
- **7b new permanent tests (positive/negative/edge):**
  - `scripts/test/p_transport.mjs` (11) — create_listing valid/negative (vehicle_type + rate_basis required),
    category CHECK admits transport, 30/50 km geofencing, transport NOT wide-eligible.
  - `scripts/test/p_mandi_labeling.mjs` (9) — priceStaleness today/yesterday/older/null, dated labels, "—".
  - `e2e/phase18_transport.spec.js` (2) — transport chip present + Land last + strip count = 8; near shows /
    far filtered.
  - `e2e/phase19_voice_mandi.spec.js` (5) — Web Speech populates the field (mocked); unsupported+key → gemini
    mic; unsupported+**no key → mic hidden, text search still works, no crash** (the most important negative,
    fully mocked — no real Gemini call); /msp dated tags + "—"; ticker still shows live prices.
- **7c downstream sweep + 7d bug-fix loop:** full E2E suite = **70 passed / 0 failed**; key backend suites all
  green (`p_transport` 11, `p_mandi_labeling` 9, `v11_phase6` 29, `p_0032` 29, `p_0025` 44). Total E2E rose from
  the 63 baseline to 70 (only increased). The ticker-live-prices regression guard passes.
- **7e bilingual audit:** `v11_phase6` = 29/0 (every new/changed string is bilingual via i18n).

## Test-count summary

| Suite | Before | After |
|---|---|---|
| `e2e/phase2–9` (legacy) | 23 fail / 3 pass | **25 pass / 0 fail** (22 rewritten, 1 merged) |
| Full E2E | 63 pass (maintained) | **70 pass / 0 fail** (+7 new) |
| `v11_phase6` (Devanagari audit) | 27 / 1 | **29 / 0** |
| New backend | — | `p_transport` 11/0, `p_mandi_labeling` 9/0 |

## Open items / owner actions
1. **`GEMINI_API_KEY`** (+ optional `GEMINI_MODEL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) as Cloudflare
   Pages env vars → activates the voice fallback for Safari/Firefox (see the boxed note under Phase 3).
2. **IMD API key** (register at api.imd.gov.in) → then wire the documented `/imd-warning` proxy for an official
   IMD warning badge on `/mausam` (Phase 5).
3. **Transport tile photo** reuses the tractor photo (a tractor-trolley); a dedicated truck photo can be swapped
   into `public/images/home/` later.
