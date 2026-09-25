# Kisan Sahyog — मौसम/MSP Polish, Nav Fix, सवाल Discoverability, Drone Didi Data Check

DO NOT ask for approval or questions. Decide and proceed. Read PROJECT_CONTEXT.md, KNOWN_ISSUES.md and the latest docs/review/ files first.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy only after Phase 7 passes:** `npm run build && npx wrangler pages deploy dist --project-name kissansahyog`

This is a fix-and-polish pass on the मौसम and MSP pages built in the last session, plus a nav bug, a सवाल discoverability upgrade, and a data-integrity check on /drone-didi. No new tables required unless noted. Do not change anything not named below.

---

## Phase 1 — Shared component: InfoTip

Build one reusable component, `InfoTip`, before touching any page: a small "ⓘ" icon that, on tap/click (not hover — this audience is mobile-first), opens a short popover/tooltip with one explanation, dismissible by tapping outside or an ✕. Props: `label` (Hindi text), `label_en`. Use it everywhere Phase 2 and Phase 3 call for it. This replaces scattered inline explanations with a consistent, point-of-need pattern.

---

## Phase 2 — `/mausam` fixes

**2a. Reframe the IMD badge — confidence, not caveat.**
First, research whether India Meteorological Department (mausam.imd.gov.in) publishes any genuinely accessible free API or open data feed for district-level nowcast/warnings (check mausam.imd.gov.in and data.gov.in for an IMD-published dataset). If a real, usable, keyless-or-freely-registrable feed exists, note it in the review doc as a candidate for a future prompt — do not integrate it now, this phase is about the copy only.
Rewrite the existing rain-alert/IMD-threshold copy so it reads as confident sourcing, not an apology: state plainly what the badge is ("किसान सहयोग का अनुमान, Open-Meteo के मौसम मॉडल पर आधारित, IMD के बारिश वर्गीकरण [Yellow ≥64.5mm / Orange ≥115.5mm / Red ≥204.5mm] के अनुसार"), then a clearly separate line/button: "आधिकारिक चेतावनी यहाँ देखें →" linking to `https://mausam.imd.gov.in` — framed as "check the official source too," not as "don't trust us." Never remove the distinction between our derived badge and an official IMD warning (existing honesty rule stays), only fix the tone.

**2b. Remove "इस मौसम में आपकी फसल" (crops this season) from `/mausam` entirely.**
Move its content to a new page `/fasal-salah` (public, reachable from the बाज़ार dropdown or a new small nav entry — decide the least-cluttered placement and note it). Keep the same content (per-crop, per-season advice) and the same rule-based generation from `weatherRules.js`. Add a small "मौसम अनुसार सलाह देखें → /mausam" cross-link from `/fasal-salah` and, from `/mausam`, replace the removed section with a one-line teaser card: "आपकी फसल के लिए क्या करें? → फसल सलाह देखें" linking to `/fasal-salah`.

**2c. Move the "मौसम को समझें" glossary trigger higher.**
Keep the full glossary section where it is (bottom of page, for anyone who wants to read all of it), but add `InfoTip` triggers at the point of need, near the top: on the IMD badge (explaining Yellow/Orange/Red), on the rain-probability number in the hourly strip (explaining what % means), and on the ActionWindows verdicts (explaining ठीक/सावधानी/रुकें). Each InfoTip's text is a short excerpt of the relevant glossary entry, not a link elsewhere.

**2d. Source citation on "इस सीज़न की बारिश।"**
Add directly under that section, small grey text: "स्रोत: Open-Meteo ऐतिहासिक डेटा — 2015–2025 का औसत।" Match the exact years actually used in the archive query from the last build; adjust the stated range if the code uses a different window.

**2e. Source citation on the 16-day outlook.**
Add directly under that section: "स्रोत: Open-Meteo मौसम मॉडल · 7 दिन से आगे का अनुमान कम भरोसेमंद है।"

---

## Phase 3 — `/msp` and `/msp/:crop` fixes

**3a. `/msp` landing page — add an all-crops snapshot table.**
Before or alongside the crop selector chips, add a compact table: every tracked crop, its latest modal price (any Sagar-district mandi with data, most recent date), MSP, and a green/amber verdict chip — one row per crop, sorted with crops that have today's data first. Each row links to `/msp/:crop`. This gives a farmer the full picture before drilling into one crop, addressing the "too little information" feedback on the landing page specifically.

**3b. Fix the text truncation/overlap below the trend chart.**
The trend summary sentence ("30 दिन में ₹X चढ़ा/गिरा") and the "डेटा उपलब्ध: [date]" line are currently overlapping the chart's y-axis label. Give the summary sentence its own block below the chart with adequate top margin (at least 16px clearance from the chart's lowest rendered element) so nothing overlaps at any viewport width. Verify at both 1280 and 375.

**3c. Diagnose and fix identical 7/30/90-day chart data.**
Investigate the trend-chart query directly: check whether the 7/30/90-day windows are actually querying different date ranges, or whether a bug (e.g. a hardcoded LIMIT, a missing WHERE on price_date, or a fallback path always returning the same rows) is causing all three to render the same series regardless of window. Fix any such bug. If, after the fix, the underlying reason for repeated values is genuinely thin historical data (few real days on record — check row counts), leave the fix in place, add a visible note when a window has fewer real data points than the window implies ("इस अवधि में केवल N दिन का डेटा उपलब्ध"), and record the true row-count situation per commodity in the review doc — do not fabricate points to fill a window.

**3d. Market/mandi comparison.**
First, query how many distinct mandis have modal_price data for wheat (and the other 9 tracked commodities) on the latest available date. If multiple mandis report the same commodity: change the "आज का भाव" table to show every reporting mandi for the selected crop, sorted by price descending, so a farmer can compare where to sell — not just one mandi. If in practice only one Sagar-district mandi reports most commodities on most days (a real data limitation, not a bug), keep the single-row table but add a line stating this plainly: "आज केवल Shahagarh मंडी से डेटा उपलब्ध है" — and note in the review doc whether widening the pull to include more MP mandis by name (not just Sagar district) is worth a future prompt.

**3e. Chart clarity improvements.**
- Add visible per-day markers (small dots) on the trend line; tapping/hovering one shows that day's date and exact ₹ (a native `title` attribute is sufficient — no library).
- Shade the area between the price line and the MSP reference line differently depending on whether price is above (light green tint) or below (light amber tint) MSP, so "below MSP" is a visual band, not something that requires reading numbers.
- Move the one-line takeaway sentence ("30 दिन में ₹X चढ़ा") to ALSO appear directly above the chart (in addition to below, from 3b) so it's the first thing read, not the last.

**3f. Rewrite the "अभी बेचें या रोकें? — गणित" calculator to show its work.**
Replace the current output-only display with a labelled step-by-step breakdown, e.g.:
```
MSP से अंतर: ₹2,585 − ₹2,560 = ₹25/क्विंटल नीचे
आपकी मात्रा पर कुल अंतर: ₹25 × 50 क्विंटल = ₹1,250
गोदाम में रोकने का खर्च: ₹12/क्विंटल/माह × 3 माह = ₹36/क्विंटल
बराबरी के लिए भाव इतना चढ़ना ज़रूरी: ₹25 + ₹36 = ₹61/क्विंटल
```
Also add one explicit sentence naming where "trend" comes from, directly in this section: "यह पिछले 30 दिन के रुझान पर आधारित गणित है, भविष्यवाणी नहीं — फैसला आपका है।" Keep the existing disclaimer line as well.

---

## Phase 4 — Nav dropdown fix (सरकारी योजनाएं / बाज़ार)

The dropdown opens on hover but closes as soon as the mouse leaves the trigger, before reaching the menu — making it unclickable on desktop. Fix by switching both nav dropdowns (बाज़ार and सरकारी योजनाएं) to **click-to-open, click-outside-to-close** on all screen sizes, removing hover-based open/close logic entirely. Verify the mobile inline-expand behavior (already click-based) is unaffected. Test on desktop: click opens, click elsewhere closes, click a menu item navigates.

---

## Phase 5 — `/sawaal` discoverability

**5a. Category bento/section layout.**
Replace the current single flat scroll of Q&A cards with a layout grouped by the existing category taxonomy (land, equipment, crop, pest, weather, market, scheme, drone_didi, general) — same pattern as `/videos`' category tabs/grid. Show a compact card count per category up top (e.g. as filter chips: "सभी (34) · कीट (8) · फसल (12) · योजना (6) …"), selecting a chip filters the list below. Keep the existing "+ फोटो भेजकर सवाल पूछें" button prominent regardless of filter.

**5b. Search.**
Add a search input above the category chips: client-side filter (or a simple `ILIKE` query if the question set is large enough to warrant a server round-trip — check current row count and decide) matching against question text (`question_hi`, `question_en`). Debounce input; show a "कोई सवाल नहीं मिला — अपना सवाल पूछें" empty state with the ask button when a search returns nothing.

---

## Phase 6 — `/drone-didi` data integrity check

Query the drone_didi category listings currently shown on `/drone-didi` and check their `is_test_data` flag. Report plainly in the review doc which listings are real vs. seeded dummy data. If any shown listings are dummy/test data, add a small, honest label on those specific cards — do not remove them (the page needs to look populated), but do not let seeded data look like real active Drone Didi operators. Suggested label: a small badge "उदाहरण लिस्टिंग" (example listing) on any card where `is_test_data = true`. Do not label real listings.

---

## Backlog (record in PROJECT_CONTEXT.md — do not build now)

- Voice-based question asking on `/sawaal` (pairs with the existing "बोलकर खोजें" backlog item)
- AI agent to answer Kisan Sawaal questions not already in the database — must carry clear "AI-जनित, समीक्षा लंबित" labelling distinct from "Team Kisan Sahyog" answers when eventually built, given the accuracy/liability weight of agricultural advice; treat as an extension of the already-logged Crop Doctor concept
- Widening mandi price collection beyond Sagar district mandis by name, if Phase 3d's investigation shows most commodities have only one reporting mandi
- Real IMD data feed integration, if Phase 2a's research finds a genuinely usable source

---

## Phase 7 — Screenshot self-review (mandatory before deploy)

Build + preview; full-page screenshots at 1280×800 and 375×812 of `/mausam`, `/fasal-salah`, `/msp`, `/msp/gehun`, `/sawaal` (10 images total). **View every one.** Checklist:
- `/mausam`: no crops-season section present; teaser card links to `/fasal-salah`; IMD badge copy reads confidently with a working official-source link; InfoTips visible near the IMD badge, rain probability, and ActionWindows, and open on click; season-rainfall and 16-day sections both show a source line.
- `/fasal-salah`: loads, shows the moved per-crop content, cross-links back to `/mausam`.
- `/msp`: all-crops snapshot table visible above/alongside the crop chips.
- `/msp/gehun`: no text overlapping the chart at either viewport; chart has visible day markers and a shaded above/below-MSP band; takeaway sentence appears both above and below the chart; 7/30/90 toggle produces visibly different series (or, if data-limited, the "only N days available" note is present — confirm which is true from Phase 3c's finding); calculator shows the full labelled arithmetic; mandi table shows multiple mandis if the data supports it, or the honest one-mandi note if not.
- Nav: click बाज़ार, confirm it opens and stays open until a click elsewhere or a menu item; repeat for सरकारी योजनाएं.
- `/sawaal`: category chips with counts, search box present and filters the list, ask-by-photo button still visible.
- No horizontal scroll on mobile anywhere.

Fix → re-screenshot → re-view until clean. Then standard closing checks: bilingual audit; every existing route loads; backend suites green; sitemap includes `/fasal-salah`. Deploy, then repeat the screenshot check against the live staging URL.

Write `docs/review/MAUSAM_MSP_POLISH_REVIEW.md` covering every phase's outcome, explicitly including: the IMD-API research finding (Phase 2a), the true root cause of the 7/30/90-day chart issue and real row counts per commodity (Phase 3c), how many mandis report each commodity (Phase 3d), and the real-vs-dummy finding for `/drone-didi` (Phase 6).

Commit message: "मौसम/MSP polish: IMD framing, crop-advice moved to /fasal-salah, point-of-need InfoTips, source citations, MSP snapshot table + chart fixes + shown-work calculator + mandi comparison, nav dropdown click-fix, /sawaal category+search, drone-didi test-data labelling; screenshot-reviewed"
