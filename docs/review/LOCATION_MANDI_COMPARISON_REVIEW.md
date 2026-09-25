# Location fix + Mandi comparison — review (2026-09-25)

Execution of `docs/LOCATION_FIX_MANDI_COMPARISON_PROMPT.md`, all 4 phases.
**I viewed every screenshot** (local preview at 1280×800 + 375×812, and a live mobile
re-check with a Hyderabad location). Deployed: https://e1719ed0.kissansahyog.pages.dev

## Phase 1 — Root cause of the Hyderabad→Deori bug

**Root cause = candidate #3** ("coordinates correct, Deori genuinely is the nearest seeded
point, no distance-sanity check"). Confirmed factually before changing logic:

- Instrumented `nearestPincode` with a `?debug=1`-gated overlay showing the raw lat/lng and
  the computed distance to every candidate village.
- Computed against the live `pincodes` seed: from Hyderabad (17.385, 78.487) the nearest
  seeded village is **Deori at ~669 km** (next: Kesli 671, Jaisinagar 691…). Every seeded
  pincode is in the Sagar pilot area, so "nearest" was doing exactly what it was told — it
  just had no notion of "too far to be meaningful". The coordinates were correct; there was
  no cache/logic defect (candidates #1/#2 ruled out), though as a defensive measure the
  geolocation options were also tightened.

**Fix (Phase 1c):**
- Added `SERVICE_AREA_KM = 100` in `src/lib/location/locationStore.js`.
- In `LocationControl.detect()`, if the nearest seeded village is beyond 100 km we do **not**
  commit it. Instead we show the honest amber notice: *"आपकी सटीक जगह के लिए डेटा उपलब्ध नहीं
  है (आप किसान सहयोग के सेवा क्षेत्र से बाहर हैं) — निकटतम उपलब्ध जगह: Deori (~670 किमी)"* with
  the manual pincode override immediately visible and an explicit **"Deori का डेटा फिर भी
  देखें"** button — the far village's data is used only on an explicit tap, never defaulted to.
  Screenshot-confirmed on `/mausam` and `/msp` (pincode stays 470117, no silent switch).
- Also forced a **fresh** GPS fix: `enableHighAccuracy: true, timeout: 15000, maximumAge: 0`
  (was `false / 600000`) so a stale OS/browser cache can't feed a wrong position (candidate #1).
- The debug overlay is **gated behind `?debug=1`** (Phase 1d) — never shown to normal users,
  retained for future troubleshooting.
- **Phase 1e:** the check lives in the single shared `LocationControl`, so `/mausam`, `/msp`
  and the homepage "आपके आसपास" all get the identical honest message (no three different
  silent-wrong behaviours). Permission-denied behaviour was left untouched (still falls back
  to the manual pincode input).

## Phase 2 — Mandi comparison table (exactly ≤ 3 mandis)

- View toggle **फसल अनुसार / मंडी तुलना** on `/msp` and `/msp/:crop` (crop-first default).
- **मंडी तुलना:** a chip picker over `SELECT DISTINCT market`; up to 3 selectable. A 4th tap is
  **blocked** with "अधिकतम 3 मंडी चुन सकते हैं — पहले एक हटाएं" (never 4 simultaneously —
  screenshot + E2E confirmed). With **zero selected it auto-shows the nearest 1–3 mandis**
  (reusing the distance ranking + `mandiCoords`), not a blank state — screenshot shows Khurai /
  Khurai APMC / Bina APMC auto-selected for the Khurai default with the "नज़दीकी मंडियाँ" note.
- Table: rows = every tracked commodity, columns = the shown mandis, far-right **MSP** column;
  each cell = that mandi's latest price (staleness rule below) or "—". With **2+ mandis the
  highest price per row is highlighted green** (screenshot: सरसों Bina ₹7,910 green vs Khurai
  APMC ₹7,700; मक्का Bhikangaon ₹2,375 green vs Badwaha ₹1,600). With 1 selected, no highlight.
- **Mobile (375px):** table-only horizontal scroll with the commodity column **sticky** on the
  left; verified **no whole-page horizontal scroll** (documentElement scrollWidth == clientWidth
  == 393).

## Phase 3 — Consistent stale / missing labelling

One shared `PriceCell` / `StaleTag` / `priceStaleness` in `src/components/pages/shared.jsx`,
applied to the crop-first "आज का भाव" table, the सभी फसलें snapshot, the mandi-search result,
and the new comparison table:
- Dated today/yesterday → plain price.
- Older than that → amber **"पुराना भाव (dd/mm)"** tag matching the site's badge styling
  (screenshot: मसूर/मूंग ₹… "पुराना भाव (22/09)", सरसों "पुराना भाव (23/09)").
- Never recorded → **"—"** with a `title` tooltip "इस मंडी में यह फसल दर्ज नहीं है".

## Phase 4 — Screenshots, tests, deploy

**Screenshots viewed** (both viewports): out-of-area `/mausam` + `/msp`; मंडी तुलना default
(auto-nearest), 1-selected, 3-selected (best-price highlight), 4th-attempt (blocked); the
stale-price tag. All clean — no fixes needed.

**Tests (permanent, committed):**
- Re-ran last build's suites: backend **23 pass / 5 fail** (the 5 are the same pre-existing
  failures documented in the previous review — count rose from 22, none regressed);
  E2E from the last build still green.
- New: `scripts/test/p_0026_location_compare.mjs` (**19/19** — distance threshold positive/
  negative, comparison data/cap/auto-nearest/sticky, staleness rule) and
  `e2e/phase11_location_compare.spec.js` (**4/4** — far-location shows the honest message,
  local location matches silently, zero-selected auto-nearest table, 1→3 render + 4th blocked).
- Full combined E2E (phase10 + phase11): **19/19**.

**Deployed** and re-checked on the **live** site with mobile emulation + a Hyderabad location:
the out-of-area message appears ("…सेवा क्षेत्र से बाहर… निकटतम उपलब्ध जगह: Deori (~670 किमी)")
and the comparison table renders. 

### Notes
- Auto-nearest ranking uses the approximate town gazetteer (`src/content/mandiCoords.js`),
  same informational-only basis as the last build; distance is never a filter here.
- The missing-price "—" uses a native `title` tooltip (hover / long-press) rather than an
  `InfoTip` ⓘ button, to avoid an ⓘ on every empty cell in a dense comparison grid.
