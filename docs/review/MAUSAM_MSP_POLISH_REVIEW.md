# मौसम/MSP Polish — review (2026-09-25)

**I viewed the screenshots** (10: `/mausam`, `/fasal-salah`, `/msp`, `/msp/gehun`, `/sawaal` at 1280×800 and 375×812), on both the local preview and the live staging URL. Saved desktop captures are in `docs/review/*-d.png`. No horizontal scroll on any page at either width (scrollWidth = clientWidth everywhere).

## Backfill check (pre-Phase-3c instruction)
`backfill-mandi-history.mjs` had **never run** (empty workflow history) and still used the broken capital-case filters (`filters[State]`). I fixed it to the working lowercase `filters[state]` + MP-wide token match and re-triggered it — **run succeeded**. Result: it pulled the MP snapshot (85 rows, all dated **today**) and wrote चना(2)/धान(1)/मक्का(4)/सरसों(2)/लहसुन(1). **Key finding: resource `9ef84268-…` is a *daily snapshot* (today only), not a historical archive — so no multi-year history is obtainable from it.** The trend chart's thin data is therefore a genuine source limitation, not a bug (see 3c).

## Phase 1 — InfoTip
Reusable click-to-open popover (`src/components/pages/shared.jsx`): "ⓘ" button, dismiss on outside-click or ✕, anchors left/right by screen position so it never causes horizontal scroll. Verified via Playwright: opens on click, closes on outside click.

## Phase 2 — /mausam
- **2a IMD framing:** badge now reads "● हल्की बारिश ⓘ" + "किसान सहयोग का अनुमान — Open-Meteo के मौसम मॉडल पर आधारित, IMD के बारिश वर्गीकरण के अनुसार।" + a separate "आधिकारिक चेतावनी यहाँ देखें →" link. Confident sourcing; the derived-vs-official distinction is kept.
  - **2a IMD API research:** IMD **does** publish official APIs at **api.imd.gov.in** (endpoints incl. District-wise Warnings, City 7-day Forecast, District-wise Rainfall, Agromet Advisory; docs at api.imd.gov.in/public/api_reference.html and mausam.imd.gov.in/responsive/apis.php). It appears freely usable (registration-based). **Not integrated now** (copy-only phase) — logged as a backlog candidate for a future prompt.
- **2b crops-season removed** from /mausam → moved to new **`/fasal-salah`** (same rule-based per-crop advice from `weatherRules.js`; current-season crops carry live spray/harvest verdicts + all crops show static advice; cross-links back to /mausam). /mausam now shows a one-line teaser card linking there. **Placement decision:** added "फसल सलाह" to the **बाज़ार dropdown** (least clutter — no new top-level nav item) and to the sitemap.
- **2c InfoTips** at point of need: on the IMD badge (Yellow/Orange/Red thresholds), the 48-hour strip heading (rain probability %, now shown per cell), and the ActionWindows heading (ठीक/सावधानी/रुकें).
- **2d/2e source lines:** "स्रोत: Open-Meteo ऐतिहासिक डेटा — 2015–2025 का औसत।" under season rainfall (matches the archive query which starts 2015); "स्रोत: Open-Meteo मौसम मॉडल · 7 दिन से आगे का अनुमान कम भरोसेमंद है।" under the 16-day outlook.

## Phase 3 — /msp
- **3a snapshot table** "सभी फसलें — आज का भाव": all 10 crops with latest modal price, MSP, and ऊपर/नीचे verdict; today's-data-first; each row links to `/msp/:crop`.
- **3b overlap fixed:** the trend summary + "डेटा उपलब्ध" now sit in a dedicated block with `mt-4` clearance below the chart — no overlap at 1280 or 375.
- **3c 7/30/90 root cause:** the query (`fetchMandiHistory`, `.gte('price_date', isoDay(-days))`) *does* use different date ranges — **not a bug**. All three windows render the same series because only **≤3 distinct dates exist** (daily-snapshot source, no history). Added a visible note **"इस अवधि में केवल N दिन का डेटा उपलब्ध"**. **Real distinct-date counts per commodity:** Wheat 3, Soyabean 3, Garlic 3, Gram 2, Maize 2, Mustard 2, Paddy 2, Lentil 1, Moong 1 (span 2026-09-22 → 2026-09-25). No points fabricated.
- **3d mandi comparison:** the "आज का भाव" table now shows **every reporting mandi** for the crop, sorted by price descending; a one-mandi note ("आज केवल X मंडी से डेटा उपलब्ध है") appears when only one reports. **Mandis reporting per commodity (latest date):** Maize 5, Mustard 3, Gram 2, Garlic 2; Wheat/Soyabean/Paddy/Lentil/Moong 1. Since most Sagar commodities have a single reporting mandi most days, **widening the pull to named MP mandis beyond Sagar district is worth a future prompt** (logged in backlog).
- **3e chart clarity:** per-day dot markers with native `title` (date + ₹); the band between the price line and MSP line is shaded light-green above / light-amber below MSP; the takeaway sentence now appears **above** the chart as well as below.
- **3f calculator shows its work:** labelled arithmetic — `MSP से अंतर: ₹2,585 − ₹2,560 = ₹25/क्विंटल नीचे` · `कुल अंतर: ₹25 × 50 = ₹1,250` · `गोदाम किराया: ₹12/क्विंटल/माह × 3 = ₹36` · `बराबरी के लिए: ₹25 + ₹36 = ₹61` — plus "यह पिछले 30 दिन के रुझान पर आधारित गणित है, भविष्यवाणी नहीं — फैसला आपका है।" and the existing disclaimer.

## Phase 4 — Nav dropdowns
Both बाज़ार and सरकारी योजनाएं are now **click-to-open, click-outside-to-close** (hover logic removed; opening one closes the other). Verified via Playwright: click opens, contains items (incl. फसल सलाह), outside-click closes. Mobile inline-expand unchanged.

## Phase 5 — /sawaal
Search box (debounced, client-side over question_hi/en) above category chips; chips now show **counts** ("सभी (19) · कीट (8) · फसल (3) · योजनाएं (2) …"); empty state "कोई सवाल नहीं मिला — अपना सवाल पूछें" with the ask-by-photo button, which stays prominent regardless of filter. (19 published Q&A — small enough for client-side filtering.)

## Phase 6 — /drone-didi data integrity
**All 8 active drone_didi listings are `is_test_data = true` — 0 are real.** Each card now carries a small **"उदाहरण लिस्टिंग"** badge; real listings (none currently) would not be labelled. Cards kept so the page looks populated, but seeded data no longer masquerades as real operators.

## Closing checks
- Bilingual: every new string added to `strings.js`; static-key scan clean (only `t(e.i18nKey)`/template-literal false positives).
- Routes: /, /mausam, /fasal-salah, /msp, /msp/:crop (incl. lahsun), /sawaal, /drone-didi, /videos, /yojana, /info, /browse, /admin all load with no JS/console errors.
- Sitemap includes `/fasal-salah`.
- **Backend suites not run this session** — changes are frontend + additive read helpers (`fetchMandiSnapshot`) + the backfill script casing fix; no schema/RPC changes.
- **Pre-existing:** live console shows a Google-Fonts stylesheet CSP notice; Hindi renders correctly via the system Noto font (visible in every screenshot). Not introduced by this pass; a one-line `_headers` CSP allowance would clear it.

## Backlog added
- Real IMD data feed integration (api.imd.gov.in — district warnings / 7-day forecast / agromet).
- Widen mandi price collection to named MP mandis beyond Sagar district (most commodities have one reporting mandi/day).
- Voice-based question asking on /sawaal; AI-generated Q&A answers with "AI-जनित, समीक्षा लंबित" labelling (Crop Doctor extension).
