# BATCH 6E — /mausam rebuild, /msp comparison, crop guide (फसल गाइड) structure

You are the builder. The architect/reviewer (Claude) reviews afterwards.
Work ONLY inside this repo (`C:\Users\usdvi\projects\Kissansahyog`).
Start from the branch the owner tells you (after 6A and 6D are merged). Create `codex/batch6e-weather-msp-crops`.
Reuse the central layout/theme (`src/styles/tokens.css`, `PageShell`, `Screen`). All pages use the wide frame.

## 0. Rules

- Do NOT `git commit`, do NOT deploy, do NOT run migrations, do NOT write to the database.
  This batch needs NO migration. If you think one is needed, stop and say why in the report.
- Never read/print/edit/commit `.env` or secrets.
- Hindi first, English second; all text via `src/lib/i18n/strings.js`. No hard-coded Devanagari in
  components. Plain farmer-friendly Hindi. No "coming soon" / "under review" labels.
- NO invented agronomy. Anything that tells a farmer what to do (spray limits, thresholds, crop
  advice) must come from an official source (IMD, ICAR, CIB&RC label rules, JNKVV, MP agriculture
  dept, KVK) and be cited in a code comment AND in the content data's `sources`. If you cannot
  confirm it, leave it out.
- Pre-existing failing tests to leave alone: `v11_phase6`, `v2_citation_audit`, `batch4_ui_style`.
  Do not delete/skip/loosen tests.
- Windows + Node 24: dynamic `import()` of absolute paths needs `pathToFileURL(...).href`.
- Keep `docs/review/BATCH6E_PROGRESS.md` updated. At the end write `docs/review/BATCH6E_REPORT.md` and
  `scripts/verify-batch6e.mjs` (PASS/FAIL), UTF-8 output in `docs/review/BATCH6E_VERIFY_OUTPUT.txt`.
- If `npm run build` is blocked by the sandbox, say so; the owner builds on his own terminal.

## FACTS you must know (verified by reading the code and the database)

- Weather data is NOT from IMD. `src/lib/weather/weatherApiV2.js` reads Open-Meteo (cached in
  Supabase table `weather_cache_v2` by a cron, with a live Open-Meteo fallback). IMD is used only as
  (a) a link to https://mausam.imd.gov.in and (b) colour thresholds in `weatherRules.js`/`rainAlert.js`
  (IMD 24-hour rainfall classes) applied to Open-Meteo rainfall numbers.
  Therefore the UI must NEVER say or imply that IMD issued, measured or warned about anything
  that comes from our own calculation.
- Open-Meteo's free API is for non-commercial use and requires CC BY 4.0 attribution; a footer credit
  was added in 6D. Add this note to the report: "Before adding ads, listing fees or paid promotion,
  Open-Meteo needs a paid commercial plan."
- `/mausam` (`src/screens/Mausam.jsx`) ALREADY computes spray / irrigation / harvest / sowing
  verdicts (`weatherRules.js`), a 48-hour strip, a 7-day table, season rainfall, a 16-day strip, a
  glossary, WhatsApp share, daily-update signup and an FAQ. The problem is hierarchy and
  presentation: a long explainer paragraph at the top, small plain boxes, a table, and the
  "What to do for your crop" button that opens `/fasal-salah` (which is generic crop info).
- `/fasal-salah` (`src/screens/FasalSalah.jsx`) has only 10 crops (`src/content/crops.js`) and each
  crop's content is ONE sentence string `cropadv_<slug>` split into bullets. `/fasal/<crop>/samasya`
  pages exist (Q&A list per crop).
- `/msp` (`src/screens/Msp.jsx`) shows a `TrendChart` from `fetchMandiHistory(...)` (7/30/90 days) but the
  database has mandi prices only from 2026-09-22 (18 days), so the 30/90-day chart is mostly empty.
  `msp_prices` has only the current year's MSP (51 rows).

## E1 — /mausam rebuild (farmer-first, impressive, trustworthy)

Goal: a farmer opens the page and in 3 seconds sees today's weather and "can I spray / irrigate /
harvest / sow today?", then rain and temperature for the next hours and days — with visual impact.

1. Trust wording (owner decision: no weak/negative disclaimers):
   - REMOVE the "What this page is for" explainer block (`PageExplainer` with `mausam_explain_1..4`) and
     the sentence "This is not an official IMD warning…", and any text naming the data source
     (Open-Meteo) on this page. Remove `imd_badge_desc`-style texts that explain our derivation.
   - REPLACE with: a one-line subtitle (hi: "आपके गाँव के लिए अगले 7 दिन का मौसम — छिड़काव, सिंचाई और कटाई का फ़ैसला यहीं से";
     en equivalent) and a row of 2 small trust chips: "📍 आपकी लोकेशन के हिसाब से" and
     "🕐 अपडेट: <time from wx.fetched_at in India time>".
   - RENAME the coloured rain badge (`imd_green/blue/yellow/orange/red` labels) to neutral wording
     about OUR forecast: e.g. "बारिश: हल्की / मध्यम / भारी / बहुत भारी / अत्यधिक की संभावना", keep the same
     colour scale. The word "IMD" must not appear in these labels.
   - KEEP one honest, trust-building pointer: a link "सरकारी मौसम चेतावनी देखें — मौसम विभाग (IMD) →"
     to https://mausam.imd.gov.in (opens in a new tab). This is a real government resource.
   - Glossary: rewrite `gloss_*` strings so none says IMD issued the colour; title "रंगों का मतलब".
     Collapse the glossary into an accordion at the bottom.
   - Grep ALL strings and components for `IMD`/`imd_` and fix every place that implies IMD data.
     Report the list of changed keys.
2. Layout order (desktop two columns where sensible, single column on phone):
   1. H1 + one-line subtitle + trust chips + `LocationControl` (compact).
   2. ALERT banner (only when needed): heavy/very heavy rain in the next 48h (existing `getRainAlert`),
      strong wind (use the existing wind numbers), and frost/heat/cold ONLY if you can cite official
      thresholds (IMD published criteria) in a code comment; otherwise skip those two.
   3. HERO today card: large icon + temperature, condition, humidity, wind, "अगली बारिश" line, a
      background colour/gradient that matches the condition (clear/cloudy/rain), all text high contrast.
   4. FOUR big action cards (spray / irrigation / harvest / sowing) immediately under the hero: icon,
      big verdict word (ठीक / सावधानी / रुकें) in the status colour, and ONE plain sentence of reason
      (the existing `aw_*` reason strings; improve wording if unclear). Each card has an "ⓘ" opening a
      short "how we decide" text that lists the actual rule thresholds in farmer words, e.g. "6 घंटे में
      2 मिमी से ज़्यादा बारिश या 15 किमी/घंटे से तेज़ हवा हो तो छिड़काव न करें" — taken from
      `weatherRules.js`; note in a code comment that Shri A.K. Dixit reviews these thresholds.
   5. HOURLY strip: next 24 hours, every hour for the first 12 and every 3 hours after; each cell icon,
      temperature, rain mm and probability, wind; rainy hours highlighted; horizontal scroll with snap.
   6. 7-DAY cards (not a table): day name + date, icon, max/min, rain mm and chance, wind; rainy days
      tinted; plus a small inline-SVG bar chart of daily rain (mm) for 7 days with accessible labels.
   7. "आपकी फसल के लिए मौसम" (replaces the old teaser button, see E2).
   8. Season rainfall block (keep data, improve visuals: two bars + one sentence).
   9. 16-day strip (keep, compact) with the single honest caution "7 दिन से आगे का अनुमान कम भरोसेमंद".
   10. WhatsApp share, daily-update signup, FAQ, glossary accordion, `WhatsAppJoin`, `RelatedBoxes`.
3. Performance and robustness: still ONE weather fetch (`fetchWeatherCell`); no new network calls from
   the browser except what exists; skeleton loading state instead of only a spinner; graceful message if
   weather is unavailable; no layout shift; works at 390px.
4. SEO: keep `JsonLd`, keep prerender working for `/mausam`; update meta description to the new subtitle.

## E2 — Crop-linked weather on /mausam, and honest links between the two pages

1. On `/mausam` add the crop selector section (E1 item 7): chips for the crops in `CROPS`, default =
   the crop from `?crop=<slug>` if present, else the user's profile `main_crops` match, else the
   in-season default (`defaultCropSlug`). Selecting a crop shows a card "इस फसल के लिए आज की मौसम सलाह".
2. Content source: new data file `src/content/cropWeatherTips.js`: per crop slug, per condition
   (`rain_heavy`, `dry_spell`, `wind_strong`, `cold`, `heat`) a short Hindi + English tip, each with a
   `source` {title,url} from an official source (ICAR / state agricultural university / KVK / MP agri
   dept). The card shows the tips whose condition is true in the current forecast, plus the general
   action verdicts. If a crop has NO tip for the current conditions, show only the verdicts and a link
   to its crop guide — never filler text. Start with these crops IF you can source them: wheat (gehun),
   gram (chana), soybean (soyabean), paddy (dhan), maize (makka), mustard (sarson). Others later.
3. Label and link honesty:
   - The old teaser (`teaser_crops_q/sub/cta`) is replaced by the new section.
   - On `/fasal-salah` the link "🌤 See weather-based advice →" must go to `/mausam?crop=<selected slug>`
     when a crop is selected, otherwise `/mausam`, and its label must say what it does:
     "इस फसल के लिए मौसम देखें" / "Weather for this crop".
   - Rename the page title/nav label from "फसल सलाह" to "फसल गाइड" (en "Crop guide") everywhere
     (H1, nav, search suggestions, sitemap titles, breadcrumbs) — it is a guide, not live advice.
     KEEP the URL `/fasal-salah` and add nothing that breaks existing links.

## E3 — /msp: replace the trend line chart with a clear comparison

1. Remove `TrendChart`, the 7/30/90-day buttons and the trend section from `/msp/:crop`. KEEP the
   one-sentence price movement text only when there are at least 7 days of history ("पिछले N दिनों
   में भाव ₹X बढ़ा/घटा").
2. Add "आज का भाव बनाम MSP": a horizontal bar chart (inline SVG, accessible, works at 390px) with two
   bars per crop on `/msp` (all crops) and a large single comparison on `/msp/:crop`: today's median
   mandi price vs MSP, and ONE factual sentence: "आज का भाव MSP से ₹X नीचे/ऊपर है" (no advice, no "sell/hold").
   Colour: green when at/above MSP, amber when below.
3. Add "पिछले 5 साल का MSP" table per crop (current year + 4 previous marketing years) from a NEW static
   file `src/content/mspHistory.js` with a `sources` array pointing to official releases (PIB / Ministry of
   Agriculture / CACP). Use only figures you can confirm from those releases; if a year/crop cannot be
   confirmed, omit that cell rather than guess; show "—". Do not touch the `msp_prices` table.
4. Keep the wait-vs-sell calculator exactly as it is (do not modify its logic), just make sure it
   still renders after the chart is removed. Update `Dataset` JSON-LD accordingly.
5. Remove strings that become unused (`msp_trend_*`) only if no other screen uses them.

## E4 — Crop guide structure (template + 3 pilot crops)

Goal: replace the one-sentence crop panel with a real guide per crop that earns farmers' trust.
Content for the remaining crops and new crops comes in a later batch; here you build the template,
the data schema, the verifier, and fill ONLY three pilot crops.

1. Routes: real pages `/fasal-salah/:slug` (e.g. `/fasal-salah/gehun`) — add them to the router, the
   prerender route list and the sitemap generator (same mechanism the Bazaar pages use). The
   `/fasal-salah` index becomes a clean crop grid (season grouping kept, in-season crops first, search
   box filtering by crop name) linking to the guides. Old in-page panel is removed. Old deep links
   must still land somewhere sensible (index page).
2. Guide template (wide frame, readable text column + sticky "इस पेज पर" table of contents on desktop,
   anchors for each section), sections in this order, each rendered only if the data has it:
   1. आज का फ़ैसला — the live weather verdict cards for this crop (reuse E1 components + E2 tips).
   2. एक नज़र में — season, sowing window, duration, typical yield note, and the MSP now (live `msp_prices`).
   3. बुवाई-कटाई कैलेंडर — a month strip (12 months) marking sowing, key operations, harvest.
   4. किस्में — varieties recommended for Madhya Pradesh / Bundelkhand-Sagar region.
   5. बुवाई — time, seed rate, seed treatment, spacing, land preparation.
   6. खाद और पोषण — by growth stage, "मिट्टी जाँच के हिसाब से" wording, per official package of practices.
   7. सिंचाई — critical stages.
   8. खरपतवार — what and when.
   9. कीट और रोग — table of symptom → likely cause → what to do (IPM first, chemical only as per
      label/KVK advice; NO made-up doses), linking to the matching Sawaal pages.
   10. कटाई और भंडारण.
   11. मंडी भाव (live, from existing mandi data) and MSP comparison (reuse E3 component).
   12. आम गलतियाँ — 3–5 short points.
   13. पास में मदद — KVK Sagar and the existing Browse/Drone Didi/equipment links.
   14. स्रोत — official source list with links and "जाँच की तारीख".
3. Data: `src/content/cropGuides/<slug>.js` per crop with a documented schema (JSDoc or a schema
   check in the verifier): each section holds Hindi text, English text and a `sources` list of
   {title,url}; plus `reviewed_by` (string or null) and `reviewed_on` (ISO date or null). Never invent
   a reviewer. Write 450–900 Hindi words per crop in total.
4. PILOT crops to write fully: gehun (wheat), chana (gram), soyabean (soybean). Sources to use: JNKVV
   Jabalpur, MP Department of Farmer Welfare and Agriculture Development, ICAR institutes (e.g. IIWBR,
   IIPR, ICAR-IISR), ICAR-KVK Sagar, Package-of-Practices publications. Fetch the actual pages, take
   facts only from them, and put the URL beside each section. Where official sources differ for MP,
   say "अपने KVK से पुष्टि करें".
5. Other crops (the remaining 7 in `CROPS`): their guide pages exist with the sections they already
   have (the existing one-line `cropadv_<slug>`, MSP, mandi, related Sawaal, nearby help) and NO
   placeholder text for missing sections; the verifier reports each crop's completeness percentage.
6. Verifier checks for pilot crops: all required sections present, each section has at least one
   source URL, word count within range, no banned phrases ("guaranteed", "100%", "गारंटी",
   "पक्का मिलेगा"), no dose/quantity appears without a source in the same section.

## E5 — Read-only investigation: real IMD warnings (do NOT integrate)

NDMA SACHET (https://sachet.ndma.gov.in) shows a CAP RSS feed link at `/CapFeed`. Investigate ONLY:
fetch it, report in `docs/review/BATCH6E_IMD_FEED_FINDINGS.md`: URL, format, whether it contains IMD
weather warnings, whether Madhya Pradesh / Sagar district alerts appear, update frequency, usage
terms or licence text if shown, and whether a browser can call it (CORS) or a server job is needed.
If the network is blocked, say so. Do not write integration code in this batch.

## E6 — Definition of done

- `node scripts/verify-batch6e.mjs` passes 0 failed; other tests unchanged.
- grep proves no UI string or label says IMD issued/measured our alert (list the remaining
  intentional mentions: the IMD link and its label only).
- Report includes: changed string keys, new files, routes added to prerender/sitemap, crop
  completeness table, the sources used for every pilot-crop section, the Open-Meteo commercial-use
  note, and the SACHET findings pointer.
- Nothing committed or deployed; DB untouched; no secrets touched.
