# BATCH 15B — "कम पानी में कौन-सी फसल" page (/fasal-salah/kam-pani)

You are Claude Code, the builder. Himanshu (non-technical founder) runs you; Claude (Cowork) is the architect/reviewer and wrote this prompt. Read the whole file before touching anything and work through the phases in order. Do not ask Himanshu questions you can answer from the repo. If a rule below blocks you, stop and report instead of working around it.

## What we are building

A new public page that turns the official ICAR-CRIDA contingency plan for Sagar district, plus our own mandi and MSP data, into a short Hindi "what do I do in my situation" guide: which rabi crops suit limited irrigation water, what each earns compared with MSP, today's Sagar-mandi price and the 5-year average price, government support, and what to do when the monsoon is late or too heavy. The farmer picks how much irrigation water he has (none, 1, 2, 3 or more) and sees which crops to sow and which to avoid.

The page was designed and approved by Himanshu as a mockup. **The approved mockup is `docs/review/batch15b/mockup-v4.html` in this repo** (the architect commits it next to this prompt). It is the source of truth for structure, Hindi wording, numbers and the source of each statement. Read it fully, including its JavaScript data (`CROPS`, `WATER`, the `V.*` views). Do not retype the Hindi from memory; carry it over from the mockup file. Where this prompt and the mockup differ, this prompt wins (see "Differences from the mockup").

## PRECONDITION (check first, stop if it fails)

BATCH15A must be done and applied on STAGING: the table `public.mandi_monthly_history` exists on staging (project ref `wzxtqbqlahyahsnoqqva`) with data, and `src/lib/mandi/history10y.js` exists with `fetchMonthlyHistory`, `harvestAverage`, `harvestByYear`, `gapVsAverage`. Verify with a read-only staging query and by reading the file. If either is missing, stop and tell Himanshu to finish 15A first. Do not rebuild 15A's work here.

## HARD RULES (do not break; stop and report if one blocks you)

1. **No database changes in this batch.** No migration, no table, no write to any database. Read-only use of staging data and of the 15A history table. Never read or write the PRODUCTION database.
2. **Do not touch the switches.** `otp_required` must stay TRUE and `session_enforced` FALSE. No ship script sets a flag.
3. **No real production ship.** Build the ship and rollback scripts and run them with `--dry-run` only. The owner ships.
4. **No price prediction, no yield promise, no medicine or dose advice.** Never write "will rise/fall", "buy/sell now", "guaranteed", or any pesticide, fertilizer or seed-rate number. Every earning figure is labelled as an estimate before costs, with the sentence that harvest-time prices may differ.
5. **Every statement carries its source and the "आख़िरी जाँच" date.** Nothing from the mockup is invented; if you cannot find a statement's source in the mockup, drop the statement and list it in BACKLOG.
6. **Unreviewed means labelled.** Content that is not yet confirmed by KVK Sagar or A.K. Dixit must show the existing "समीक्षाधीन" tag (string key `under_review`). Find how the repo already does this for other pages (search for `under_review` and the admin "mark reviewed" flow in `src/screens/Admin.jsx` and `src/lib/pages/pagesApi.js`) and follow that pattern if it fits. If it is database-driven and would need a migration, do NOT use it; instead give each content block a `reviewed: false` field in the content file and render the tag from that. Initially every block below listed as "starts unreviewed" has `reviewed: false`.
7. **Hindi first, plain words a farmer uses.** Use the term **Modal भाव** (never "बीच का भाव"). Every visible string has `hi` and `en` in `src/lib/i18n/strings.js` or in the content file, following how the repo does it. English can be plain and short. No emojis in the page text.
8. Mobile first at 375 px: no horizontal page scroll (tables scroll inside their own box), tap targets at least 44 px, body text at least 14 px, fits the existing look of `/msp` and `/fasal-salah` (use `PageShell`, `PageExplainer`, `JsonLd` and the CSS variables already used).
9. Keep existing pages working. Do not change `/msp` or `/fasal-salah` except the small link additions in Phase 4. Known flaky test `e2e/collapsible-10f.spec.js` C5 is unrelated; report it if it fails.

## Phase 0 — Read first, then report (no changes yet)

Read: `PROJECT_CONTEXT.md` (mandi, MSP, i18n, prerender, search sections), `KNOWN_ISSUES.md`, `docs/review/batch15a/*` (what 15A delivered), `src/screens/FasalSalah.jsx`, `src/screens/Msp.jsx`, `src/lib/mandi/mandiApi.js`, `history.js`, `basket.js`, `marketNames.js`, `src/lib/mandi/history10y.js`, `src/content/crops.js`, `src/components/pages/shared*` (`PageExplainer`, `JsonLd`, `TrendChart`, `MonthBars`, `FaqAccordion`), `src/App.jsx` (routes), `scripts/prerender.mjs`, `scripts/gen-sitemaps.mjs`, `scripts/build-search-index.mjs`, the search index source (`src/lib/search/searchApi.js`, `src/content/searchSynonyms.js`), `scripts/ship-prod-14a.sh` and the 15A ship scripts. Then write 8 lines: what you reuse, how routes get prerendered and listed in the sitemap, how the search index picks up pages, how the review tag works, where the KVK Sagar contact lives (it is the string `res_card_offices_1`, "KVK सागर: 07582-288228", used on the resources page; reuse that string, do not duplicate the number).

## Phase 1 — Content file and pure logic (no UI yet)

Create `src/content/kamPani.js` holding all page text and facts as structured data, carried over from the mockup: the five crop cards (gram, lentil, mustard, wheat, barley), the four water levels, the government-support cards, the late-monsoon cards with variety names, the heavy-rain cards, the water-saving cards, the sources list with URLs, and `lastChecked: '2026-10-23'`. Each block has `id`, `reviewed` (boolean) and `sources` (array of source ids).

Constants (carry exactly, with source ids):

- MSP for marketing season 2027-28 (Cabinet decision, 1 Oct 2026, Rs per quintal): wheat 2610, barley 2286, gram 5958, lentil 7390, rapeseed-mustard 6613. Source: Cabinet Committee on Economic Affairs, reported by global-agriculture.com, 1 Oct 2026. The mockup says "30 सितंबर 2026"; use the source's 1 October date and fix the footer.
- Sagar normal yield, quintal per hectare (ICAR-CRIDA Sagar plan, 2013): gram 7.65, wheat 11.23, lentil 4.32. No Sagar yield exists for mustard or barley: show none.
- Good-management upside for gram only: 13 to 20 quintal per hectare (ICAR research varieties such as Pusa JG 16), always shown as an upside, 5-year average price.

Pure functions in `src/lib/kamPani/logic.js` (unit tested):

- `recommendForWater(level)` returning the ordered keep/avoid list from the mockup's `WATER` table for levels 0, 1, 2, 3 (3 means 3 or more).
- `incomeEstimate({ yieldQ, price })` and the three lines shown on a card: at the 5-year harvest average price, at today's price (if present), and for gram the upside range at the 5-year average price.
- `gapPercent(today, reference)` whole percent, sign kept.
- `sowingBanner(now)` returns the "अभी बुवाई का समय है" banner only while `now` is before the banner's `validUntil` date (`2026-11-15` for the rabi sowing banner); after that it returns null so a stale claim can never show. The rain-facts banner has its own `validUntil` of `2026-12-31`.

## Phase 2 — Data wiring (read-only)

For each of the five crops, using existing helpers where they fit (do not write a second price pipeline):

- **Today's Sagar-mandi price:** median Modal price over the last 14 days at the Sagar mandi from `mandi_prices` (market name as stored; use `marketNames.js`). If Sagar has fewer than 3 reports in 14 days for a crop, show "आज का भाव उपलब्ध नहीं" and carry on with the other numbers. Also the top three Sagar-division mandis by 14-day median for the "ऊँची मंडियाँ" line.
- **5-year harvest-time average:** `harvestAverage` from `history10y.js`, Sagar-division scope, years 2021 to 2025, months March to May for these rabi crops, and `harvestByYear` for the year-by-year table.
- **MSP:** the constants above, not the `msp_prices` table (see "Findings to report").
- Barley has no Sagar-mandi price in our daily data: show "डेटा नहीं" for today and still show MSP and the 5-year average.
- Everything loads after first paint with a clear loading state and a quiet fallback: if data fails, show the static content (water selector, cards, government support) with the price lines hidden, never an error screen.

## Phase 3 — The page

Route `/fasal-salah/kam-pani`, screen `src/screens/KamPani.jsx`, lazy loaded like the other screens, with a BackButton to `/fasal-salah`.

Structure (carry the wording from the mockup):

1. Heading, one-line intro, and a row of jump chips (anchor links): सुरक्षित फसलें, सरकारी सहारा, बारिश देर से / सूखा, बारिश ज़्यादा, पानी बचाने के तरीके. All five sections are in the DOM at once (good for search engines); the chips only scroll. Do not hide content behind JavaScript tabs.
2. **सुरक्षित फसलें और कमाई की तुलना** (anchor `#surakshit-fasal`): the sowing-window banner (while valid), the rain facts (national 12.6 percent below normal, Madhya Pradesh 95.4 percent of normal, Sagar division and eastern MP about 4 percent above normal; reservoirs about 70 percent), the Sagar irrigation facts (45 percent irrigated, 63 percent from wells and tube wells, 3 percent canal; CRIDA 2013), the water selector, the five crop cards, "आज का भाव बनाम 5 साल का औसत" table, the year-by-year table inside a collapsible card.
3. **सरकारी सहारा** (anchor `#sarkari-sahara`): MSP purchase, crop insurance (PMFBY), farm-pond subsidy. The farm-pond card has anchor `#sarkari-sahara-khet-talab` and opens itself when the URL hash points to it. All three start unreviewed.
4. **बारिश देर से / सूखा** (anchor `#barish-der-se`) with the variety-name card.
5. **बारिश ज़्यादा, पानी भरा** (anchor `#barish-zyada`) with the soybean-variety card.
6. **पानी बचाने के तरीके** (anchor `#pani-bachana`): its "खेत तालाब पर सब्सिडी" line is a real in-site link, an `<a>` or router `<Link>` to `/fasal-salah/kam-pani#sarkari-sahara-khet-talab` (this is for search-engine interlinking, as Himanshu asked), not text.
7. Footer: sources (collapsible list with links), "आख़िरी जाँच: 23 अक्तूबर 2026", the line "बीज की किस्म, दवा की मात्रा और योजना की शर्तें कृषि विज्ञान केंद्र (KVK) सागर से पूछें" followed by the KVK Sagar contact (reuse `res_card_offices_1`; flag in your summary that the owner should confirm this number is current), the attribution line for the price history ("स्रोत: Agmarknet (कृषि मंत्रालय, DMI), CEDA अशोका विश्वविद्यालय के माध्यम से; आँकड़े अक्तूबर 2025 तक"), and two buttons: "आज का मंडी भाव देखें" (to `/msp`) and "बीज / पंप / ट्रैक्टर ढूँढें" (to `/bazaar`).

Starts unreviewed (shows "समीक्षाधीन"): the three government-support cards; the late-monsoon and heavy-rain cards; every variety list (CRIDA names are from 2013 and some are replaced; soybean names come from a 2025 news list); the barley card and its "about 2 irrigations" claim (farmer-reported); the mustard card's irrigation claim; the "days to harvest" figures (general knowledge, marked with the footnote star in the mockup); the "15 to 20 percent" soil-moisture line (NRAA). Reviewed from the start (no tag): the numbers computed from our own data and the cited CRIDA yield and irrigation figures, each with its source and date.

SEO: page title, meta description, `JsonLd` Article, a canonical URL; add the route to prerender and the sitemap generator following how other pages are listed, and add the page and its section titles to the search index and `searchSynonyms.js` ("कम पानी", "सूखा", "बारानी", "सिंचाई", "फसल बीमा", "खेत तालाब").

## Phase 4 — Links into the page (small, careful)

- `/fasal-salah`: add one prominent card near the top: "कम पानी में कौन-सी फसल" linking to the new page.
- `/msp` crop pages for the five rabi crops (gram, lentil, mustard, wheat, barley where a page exists): one line under the price block, "पानी कम हो तो कौन-सी फसल: देखें →" linking to the new page. Do not add it to crops that are not in the page.
- Nothing on the homepage in this batch.

## Phase 5 — Tests

- Unit tests for `logic.js` (water recommendations for each level, income lines, gap percent sign, banner expiry on both sides of the date).
- A content-integrity test: every block has `id`, `reviewed` boolean and at least one source; no string contains "बीच का भाव"; no content string contains digits followed by "किलो" or "ml" or "लीटर" in a dose-like pattern (a simple guard against dose advice); sources referenced exist.
- Playwright e2e at 375 px: the page opens, the five jump chips scroll to their sections, selecting each of the four water levels changes the list, the farm-pond link from "पानी बचाने के तरीके" lands on and opens the farm-pond card, no console errors, no horizontal scroll. A second test with price data mocked as empty: the static content still renders and no error appears. A third test with `now` after the banner `validUntil`: the sowing banner is gone.
- Run the full existing suites you ran in 15A (build, unit, e2e) and report counts against the 15A baseline.

## Phase 6 — Ship machinery (dry run only) and docs

- `scripts/ship-prod-15b.sh` and `scripts/rollback-prod-15b.sh`, same pattern as the 14A and 15A pair (reads the live Cloudflare deployment, expects the previous live deployment id to be the one recorded after 15A ships, requires `otp_required=true` and `session_enforced=false` before and after, never sets flags, `--dry-run`, size gate, auto-rollback, tag `ship-15b` on the pushed HEAD). There is no migration probe in this batch; instead probe that `mandi_monthly_history` answers an anonymous read (if not, the page still works but the 5-year parts are hidden; print a warning, do not fail). Post-deploy checks: `/fasal-salah/kam-pani` returns 200 and contains the Hindi H1 text in the prerendered HTML; the sitemap lists it. Marker greps must use literal strings that really appear in the built output, verified against the built files first (lesson from 13A: strings live in the `LanguageProvider` chunk and run-time-built ids never appear literally).
- `docs/review/batch15b/SHIP.md`: owner steps, one at a time, plain words.
- `docs/review/batch15b/BACKLOG.md`: see "Findings to report" and the items below.
- Update `PROJECT_CONTEXT.md` (new route, content file, how to refresh the dated claims) and `KNOWN_ISSUES.md`.

## Differences from the mockup (this prompt wins)

1. **No "लागत का अंदाज़ा" cost table.** The mockup's per-quintal costs were an all-India estimate, not Sagar data. Drop that card. Put "cost of cultivation for Madhya Pradesh from the CACP (Commission for Agricultural Costs and Prices) reports" in BACKLOG.
2. Placeholders "जोड़ना बाकी" disappear: KVK phone comes from the repo; the Sagar-district rainfall line is replaced by the Sagar-division figure with its source and date (district-level mm is not available; say so in BACKLOG).
3. The mockup's 5-year numbers were computed by the architect from CEDA data; the page must use the 15A table, so small differences (for example wheat, where the architect's number left out the Sagar district) are expected. Compare against the mockup's values (gram about 5,091; mustard about 5,337; lentil about 5,669 for the March to May average) and report any difference above 3 percent.
4. MSP footer date is 1 October 2026 (see Phase 1).
5. The tab bar becomes anchor chips with all sections in the DOM.
6. Seasonal banners auto-expire by date (Phase 1). They are not admin-editable yet; put "admin-editable season notes" in BACKLOG as a possible 15C.

## Findings to report (do NOT fix in this batch; put in BACKLOG.md and in your final summary)

The architect noticed three problems in the existing MSP data while writing this prompt. Check each on STAGING with a read-only query and report what you see:

1. `msp_prices` on staging shows 3 identical rows per crop for marketing year 2026-27 (for example Wheat 2585 three times). Find out why (variety rows? seed run three times?) and whether `/msp` is affected on staging.
2. Rapeseed & Mustard 2026-27 is 5950 in `msp_prices`, while the Cabinet-decision table (global-agriculture.com, 1 Oct 2026) lists 6200 for 2026-27. Report both and say which official source (PIB / CCEA) would settle it. Do not change the table.
3. The 2027-28 rabi MSP (announced 1 Oct 2026) is not loaded, so `/msp` still shows last year's MSP for crops being sown now. Say what a safe update would look like (new rows, which flag decides what `/msp` shows) so the architect can decide the next batch.

## Final summary (reply in this exact shape, short)

1. Verdict: DONE / DONE WITH NOTES / BLOCKED.
2. Precondition: 15A table and helpers found on staging? Row counts used.
3. Page: route, screenshots at 375 px (top of page, a crop card, the 5-year table, the water selector), and the list of blocks showing "समीक्षाधीन".
4. Numbers check: your 5-year averages versus the mockup's, any difference above 3 percent.
5. Tests: build, unit, e2e counts versus the 15A baseline; failures if any.
6. Dry run of the ship script: OK or the exact reason.
7. The three "Findings to report", one line each.
8. Files created or changed (paths only).
9. Owner next step in one sentence: "Open docs/review/batch15b/SHIP.md and do step 1."
10. Anything you assumed that the architect should look at (including the KVK Sagar phone number).
