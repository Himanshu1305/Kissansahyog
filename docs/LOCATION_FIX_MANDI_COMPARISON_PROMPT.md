# Kisan Sahyog — Location Detection Fix + Mandi Comparison Table

DO NOT ask for approval or questions. Decide and proceed. Read PROJECT_CONTEXT.md, KNOWN_ISSUES.md, docs/review/PHASE0-8_FULL_REVIEW.md and E2E_TEST_REPORT.md first — this touches the LocationControl and mandi-price code from the last build.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy only after Phase 4 passes:** `npm run build && npx wrangler pages deploy dist --project-name kissansahyog`

---

## Context

On a mobile device, with location permission genuinely granted, a user physically in Hyderabad had their location resolved to "Deori" (a Sagar-district village ~500km away) with no indication anything was wrong — Deori's weather/data was shown as if it were local. Permission-denied behavior (tested separately, on a laptop with location access blocked) is confirmed correct and must not be changed.

---

## Phase 1 — Diagnose and fix the Hyderabad→Deori bug

**1a. Instrument first.** Before changing any logic, add a temporary console/debug log (or a hidden dev-only overlay) that shows: the raw lat/lng returned by `navigator.geolocation.getCurrentPosition`, and the computed distance to every candidate village in the nearest-pincode matching table. Reproduce on an actual mobile device with location granted, physically away from the Sagar/Khurai area if possible (or by manually overriding coordinates in browser dev tools to Hyderabad's lat/lng, ~17.385°N 78.487°E, if physical travel isn't practical) — confirm what the raw coordinates actually are before assuming the bug is in the matching logic.

**1b. Likely causes to check, in order:**
- The geolocation call is succeeding but returning a stale/cached position (e.g. `maximumAge` not set to 0, or a browser/OS location cache from a previous test on a Sagar-area network) rather than a fresh fix — check the `getCurrentPosition` options and force `maximumAge: 0, enableHighAccuracy: true`.
- The nearest-pincode matching function has a bug that always returns the same village regardless of input distance (e.g. an unguarded default, an off-by-one in a sorted-distance array, or a hardcoded fallback value that isn't clearly a fallback).
- The raw coordinates are correct (genuinely Hyderabad) and the "nearest seeded village" logic is technically working — since Deori is likely closer to Hyderabad than other seeded villages, "nearest" may be doing exactly what it was told, just without any distance-sanity check.

**1c. Fix.** If the coordinates are correct and Deori genuinely is the nearest seeded point (root cause 3 above): add a maximum-distance sanity threshold (e.g. 100km) to the nearest-match logic. Beyond that threshold, do NOT silently present a far-away village's data as local. Instead show: "आपकी सटीक जगह के लिए डेटा उपलब्ध नहीं है (आप किसान सहयोग के सेवा क्षेत्र से बाहर हैं) — निकटतम उपलब्ध जगह: Deori (~500 किमी)" with the manual pincode override immediately available, and require an explicit tap to proceed with that far-away village's data rather than defaulting to it.
If the bug is a caching/logic defect (root causes 1 or 2 above): fix it directly and re-verify with the same instrumentation from 1a that a correct, fresh, nearby match now occurs for a genuinely local test.

**1d. Remove the temporary debug logging/overlay before deploy**, or gate it behind a `?debug=1` query param so it never shows to normal users but remains available for future troubleshooting.

**1e. Apply the same distance-sanity check everywhere `LocationControl`'s resolved location feeds into: `/mausam`, `/msp`, homepage "आपके आसपास".** All three must show the same honest out-of-service-area message rather than three different silent-wrong-answer behaviors.

---

## Phase 2 — Mandi comparison table (fixed at exactly 3 mandis)

**2a. Add a view toggle on `/msp` and `/msp/:crop`:** two tabs/buttons — "फसल अनुसार" (the existing crop-first table, default) and "मंडी तुलना" (new comparison view).

**2b. मंडी तुलना view:**
- A mandi picker showing checkboxes/chips for every mandi with any recent price data (from `SELECT DISTINCT market FROM mandi_prices`).
- **Up to 3 mandis may be selected — 1, 2, or 3 all render a valid comparison.** Selecting just 1 shows a single-column table (still useful — same layout, ready to add more). If a 4th is tapped while 3 are already selected, either replace the oldest selection automatically or block the 4th tap with a brief "अधिकतम 3 मंडी चुन सकते हैं — पहले एक हटाएं" message — pick whichever is simpler to implement correctly and consistent with existing UI patterns on the site; do not allow 4+ simultaneously under any interaction path. With zero selected, default to showing the nearest 1-3 mandis automatically (reusing the distance-ranking from the last build) rather than an empty state — a farmer should see something useful immediately, not a blank picker.
- Whatever the current selection count (1, 2, or 3), render a table: rows = every tracked commodity, columns = the selected mandis by name, each cell = that mandi's latest price for that commodity (applying the staleness rule from Phase 3 below), or "—" if never reported at that mandi. Add an MSP column at the far right for reference.
- When 2 or more mandis are selected, highlight the highest price in each row across the selected columns in green, so the best-selling option per commodity is visually obvious at a glance — this is the actual point of the feature per the stated goal of comparing where to sell. With only 1 selected, no highlight is needed (nothing to compare against).

**2c. Mobile layout.** At 375px, 3 price columns plus a commodity column plus an MSP column is tight — use horizontal scroll within the table container only (not the whole page) if needed, with the commodity name column frozen/sticky on the left so it stays visible while scrolling across mandi columns. Verify no whole-page horizontal scroll is introduced.

---

## Phase 3 — Consistent stale/missing-data labelling

Apply this everywhere a commodity price is shown (the existing crop-first table, the new comparison table, `/msp/:crop` individual pages):
- Price dated today or yesterday: show plainly, no extra label.
- Price older than 2 days but exists: show the price with a visible amber "पुराना भाव (dd/mm)" tag next to it — not a small parenthetical date easily missed, an actual visually distinct tag matching the site's existing badge styling.
- No price ever recorded for that commodity at that mandi: show "—" with a `title`/tooltip "इस मंडी में यह फसल दर्ज नहीं है" on hover/tap (reuse the `InfoTip` component from the last build if applicable).

---

## Phase 4 — Screenshot self-review (mandatory before deploy)

Build + preview; full-page screenshots at 1280×800 and 375×812 of: `/mausam` and `/msp` after simulating an out-of-area location (Hyderabad coordinates) confirming the honest out-of-service message appears instead of a silent wrong match; `/msp/gehun` in मंडी तुलना view with the default (zero-selected → auto nearest) state, with exactly 1 mandi selected, and with 3 mandis selected showing the comparison table and best-price highlight; the same view attempting a 4th selection; the stale-price tag rendering on a commodity with old data. **View every one.**

Then: re-run the full existing automated test suite (the permanent tests from the last build, `p_0025_visibility.mjs` and the Playwright specs) plus write new permanent tests for: the out-of-area distance-sanity threshold (positive: nearby location matches correctly; negative: far-away location shows the honest message, does not silently substitute); the mandi-comparison cap (positive: 1, 2, and 3 selections each render a valid table; edge: attempting a 4th does not allow 4 simultaneous selections under any path tested; edge: zero selected shows the auto-nearest default, not a blank state). Commit these as permanent tests in the existing suite, not throwaway scripts.

Fix → re-screenshot → re-verify tests → repeat until clean. Deploy, then repeat the screenshot check against the live staging URL specifically using a mobile device or mobile device emulation with a non-Sagar-area location.

Write `docs/review/LOCATION_MANDI_COMPARISON_REVIEW.md` documenting the actual root cause found in Phase 1 (which of the three candidate causes it was), and the final state of all four phases.

Commit message: "Fix location detection returning wrong far-away village as local match (adds distance-sanity threshold + honest out-of-area message); mandi comparison table (फसल अनुसार / मंडी तुलना toggle, up to 3 mandis, auto-nearest default, best-price highlight); consistent stale/missing-price labelling; permanent regression tests; screenshot-reviewed"
