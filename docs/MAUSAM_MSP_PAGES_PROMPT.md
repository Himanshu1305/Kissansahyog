# Kisan Sahyog — मौसम (`/mausam`) and MSP & मंडी भाव (`/msp`) pages

DO NOT ask for approval or questions. Decide and proceed. Read PROJECT_CONTEXT.md, KNOWN_ISSUES.md and the two latest files in docs/review/ first.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy only after Phase 8 passes:** `npm run build && npx wrangler pages deploy dist --project-name kissansahyog`

**One migration file for everything in this prompt:** `supabase/migrations/0024_mausam_msp.sql`. Apply with `npm run db migrate`.

---

## What these pages are and why they matter

These two pages answer the two questions a farmer asks every single day — "बारिश होगी?" and "आज भाव क्या है?" — for a named location and a named mandi, updated daily. They are the highest-search-volume, most-forwarded content the site will have. Every design decision below serves three things: **answer the daily question fast**, **turn the data into a decision**, and **make it one tap to forward on WhatsApp**.

Both pages share one skeleton and one set of components; build the components once:
`PageExplainer` · `LocationControl` · `TodayCard` · `ActionWindows` · `TrendChart` · `FaqAccordion` (with FAQPage schema) · `ShareWhatsApp` (pre-filled text) · `DailyUpdateSignup`.

Design: same tokens, type scale, edge-to-edge rule and card kit as the v4 homepage. No new colours.

**Two honesty rules, non-negotiable, written into the copy:**
1. The site never predicts prices. It may show the trend, the arithmetic of waiting, and what happened in past years — never "भाव बढ़ेगा".
2. The site never calls its own rain classification an IMD warning. It explains IMD's thresholds in plain Hindi and links to the official IMD district bulletin as the authority.

---

## Phase 1 — Data foundations (migration 0024 + scripts)

### 1a. Multi-location weather cache
Replace the single-row `weather_cache` with a location-keyed one:
```sql
CREATE TABLE weather_cache_v2 (
  grid_key text PRIMARY KEY,             -- lat/lng rounded to 0.1° e.g. "23.8_78.7"
  latitude numeric NOT NULL, longitude numeric NOT NULL,
  current jsonb NOT NULL,                -- temp, humidity, wind_kmh, weathercode, precipitation
  hourly jsonb NOT NULL,                 -- next 48h: [{time, temp, precip_mm, precip_prob, wind_kmh, humidity}]
  daily jsonb NOT NULL,                  -- 16 days: [{date, tmax, tmin, precip_mm, precip_prob, wind_max, weathercode, et0, soil_moisture}]
  season_rain jsonb,                     -- {season_start, to_date_mm, normal_mm, source}
  fetched_at timestamptz DEFAULT now()
);
```
Public read. Also:
```sql
CREATE TABLE weather_grid_requests (
  grid_key text PRIMARY KEY, latitude numeric NOT NULL, longitude numeric NOT NULL,
  last_requested_at timestamptz NOT NULL DEFAULT now()
);
```
Anon may upsert a row (the page writes it when a new pincode is entered); the refresh script reads it. Extend `scripts/refresh-mandi-prices.mjs` (rename to `scripts/refresh-data.mjs`, keep the npm script name working) to refresh every grid cell that has been requested in the last 30 days (track requested cells in a small `weather_grid_requests` table written by the page), always including the pilot cells for Sagar district (Khurai, Sagar, Bina, Rehli, Deori, Banda, Rahatgarh, Malthon). Open-Meteo params to add: `hourly=temperature_2m,precipitation,precipitation_probability,wind_speed_10m,relative_humidity_2m`, `daily=...,wind_speed_10m_max,et0_fao_evapotranspiration,precipitation_probability_max`, `forecast_days=16`, and `soil_moisture_0_to_7cm` from the hourly set (take the daily mean). Keep the existing 3-hourly GitHub Actions cron.

**Season rainfall:** use Open-Meteo's archive API (`archive-api.open-meteo.com`) to sum precipitation from 1 June (kharif) or 1 October (rabi) to date for the cell; for "normal", sum the same window's daily mean over 2015–2025 from the archive once and cache it per cell. Label the normal as "पिछले 10 साल का औसत".

Keep the homepage Today card working: point it at the viewer's cell in `weather_cache_v2`, then drop the old table.

### 1b. Mandi price history backfill
`mandi_prices` already stores one row per commodity+market+date. Add `arrivals_tonnes numeric` (nullable). Create `.github/workflows/backfill-mandi-history.yml` (manual `workflow_dispatch`) that, from a GitHub runner (where the official API is not blocked), pulls the last **3 years** of Agmarknet records for state = Madhya Pradesh, district = Sagar, for the 10 tracked commodities, via `api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070`, paginating with `offset`/`limit`, and upserts them.

**API key — required.** The public sample key returns only ~10 records per request, which makes a multi-year backfill impossible. The workflow must read `DATA_GOV_IN_API_KEY` from GitHub secrets and use `limit=1000` per page. This key is a free registration at https://data.gov.in (Register → My Account → API key). **Claude Code cannot create it.** If the secret is absent when the workflow runs, the workflow must fail fast with a clear message, and the final report must state in bold that the owner needs to (1) register at data.gov.in, (2) add `DATA_GOV_IN_API_KEY` as a repository secret, (3) re-run the "Backfill mandi history" workflow from the Actions tab. Also use this key, when present, as the official-API fallback in the regular refresh script.

Run the backfill as part of this build if the secret exists; verify row counts per commodity and the earliest date achieved, and record both in PROJECT_CONTEXT.md. If Agmarknet has fewer years for Sagar than requested, backfill what exists. Never fabricate history.

### 1c. Subscriptions (capture only — no sending in this build)
```sql
CREATE TABLE alert_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  pincode text NOT NULL,
  crops text[] NOT NULL DEFAULT '{}',
  alert_types text[] NOT NULL DEFAULT '{weather,price}',
  channel text NOT NULL DEFAULT 'whatsapp',
  consent_text text NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now(),
  source_page text,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (phone, channel)
);
```
Anon INSERT allowed (with CHECK that phone matches `^[6-9][0-9]{9}$`); no anon read. Submissions are an **upsert on (phone, channel)** — a farmer re-submitting with a new pincode or crops updates the row (and re-activates it) rather than erroring. Admin RPC to list/export CSV and toggle `is_active`. Store the exact consent sentence shown to the user in `consent_text`.

### 1d. Procurement centres and sell-at-MSP links
```sql
CREATE TABLE procurement_centres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_hi text NOT NULL, location text, district text DEFAULT 'Sagar',
  crops text[] NOT NULL, season text CHECK (season IN ('kharif','rabi')),
  registration_open date, registration_close date, procurement_from date, procurement_to date,
  portal_url text, notes_hi text, is_active boolean DEFAULT true, updated_at timestamptz DEFAULT now()
);
```
Admin-managed; seed with the MP e-Uparjan portal (`https://mpeuparjan.nic.in`) and e-NAM entries for wheat and soybean, with dates left null where unknown (render "तारीख़ें जल्द" — never invent dates).

### 1e. FAQ seeds and site settings
Store the FAQs for both pages in a small `page_faqs` table (`page_key`, `q_hi`, `q_en`, `a_hi`, `a_en`, `sort_order`) so they are admin-editable and drive the FAQPage schema. Seed 8 for `mausam` and 8 for `msp` (content in Phases 2 and 3).

Add a `site_settings` key/value table (`key text PRIMARY KEY, value jsonb, updated_at`) with public read and admin write; seed `mausam_msp_content_reviewed = false`. This is the flag Phase 7 uses.

Crop slugs map to data names in one place, `src/content/crops.js`: `gehun→Wheat`, `soyabean→Soyabean`, `chana→Gram`, `masoor→Lentil`, `moong→Moong`, `urad→Urad`, `dhan→Paddy(Dhan)(Common)`, `makka→Maize`, `sarson→Mustard`, `lahsun→Garlic`, each with the matching `msp_prices.crop_en` via the existing MANDI_TO_MSP map and Hindi display names.

---

## Phase 2 — `/mausam` (मौसम)

Route `/mausam`, public. `/info#weather` redirects here. Nav item **मौसम** points here.

**Section order — build exactly this:**

1. **PageExplainer** ("यह पेज किस लिए है") — a soft-green card, 3–4 sentences, Hindi first with English toggle: what it shows (आपके पिनकोड के लिए अगले 48 घंटे और 16 दिन का मौसम), where the data comes from (Open-Meteo मौसम मॉडल; IMD की आधिकारिक चेतावनी के लिए लिंक), how to use it (सुबह देखें — छिड़काव, सिंचाई, कटाई का फैसला करें), what it is not (यह IMD की आधिकारिक चेतावनी नहीं है; 7 दिन से आगे का अनुमान कम भरोसेमंद है). This paragraph is also the page's meta description.
2. **LocationControl** — pincode (profile → localStorage → default 470117), "बदलें" prompt; on change, write to `weather_grid_requests` and fetch/refresh that cell.
3. **TodayCard** — temperature, condition, humidity, wind; **rain timing** from hourly: "आज बारिश नहीं · कल दोपहर 2 बजे के बाद ~18 मिमी"; the IMD-threshold classification badge (green/blue/yellow/orange/red) with the label "अनुमान — IMD की आधिकारिक चेतावनी यहाँ देखें →" linking to `https://mausam.imd.gov.in` district page.
4. **ActionWindows** ("आज क्या करें") — the visual centre of the page. Four tiles: **छिड़काव** · **सिंचाई** · **कटाई / सुखाई** · **बुवाई**. Each shows ठीक / सावधानी / रुकें with a one-line reason, computed as:
   - छिड़काव: रुकें if rain ≥ 2 mm within 6h or wind > 15 km/h; सावधानी if rain within 24h or wind 10–15; else ठीक ("सुबह 7–10 बजे सबसे अच्छा")
   - सिंचाई: रुकें if rain ≥ 10 mm next 48h; सावधानी if soil moisture is high; ठीक if et0 high and no rain and soil dry
   - कटाई / सुखाई: रुकें if rain ≥ 5 mm next 48h ("कटी फसल ढकें"); सावधानी if rain within 72h; else ठीक
   - बुवाई: ठीक if 10–30 mm expected over next 5 days and no heavy rain; सावधानी if dry; रुकें if ≥ 40 mm in 24h
   Thresholds live in one `weatherRules.js` with comments; the page footer says "नियम: किसान सहयोग कृषि विशेषज्ञ — श्री ए.के. दीक्षित की समीक्षा में" (mark TODO until he reviews).
5. **48-hour hourly strip** — horizontal scroll, 3-hour steps: icon, temp, rain mm, wind.
6. **7-day table** — date (Hindi day name), icon, max/min, rain mm + probability, wind; the IMD badge on any day ≥ 64.5 mm.
7. **इस मौसम में आपकी फसल** — per-crop cards for the season's crops (kharif: सोयाबीन, उड़द, मूंग, धान, मक्का; rabi: गेहूं, चना, मसूर, सरसों): 2–3 lines of plain advice generated from the same rules + a crop-stage hint (sowing/growing/harvest by calendar month). Static rule content, reviewed — no AI generation.
8. **इस सीज़न की बारिश** — to-date vs 10-year normal for this cell as two bars and one sentence ("अब तक सामान्य से 18% कम").
9. **16-day outlook** — compact, clearly labelled "अनुमान — पक्का नहीं".
10. **मौसम को समझें** — glossary: what 5/10/25 mm feels like, what IMD Yellow/Orange/Red mean (64.5 / 115.5 / 204.5 mm thresholds), why our badge is derived, when to trust a forecast. Plain Hindi, short.
11. **FaqAccordion** — 8 FAQs from `page_faqs` (examples to seed: "कल बारिश होगी या नहीं कैसे पता करें?", "छिड़काव के लिए सबसे अच्छा समय?", "IMD की पीली चेतावनी का मतलब?", "क्या यह पूर्वानुमान पक्का है?", "मेरे गाँव का मौसम कैसे देखें?", "बारिश में कटी फसल कैसे बचाएँ?", "सिंचाई कब करें?", "मौसम की जानकारी WhatsApp पर कैसे पाएँ?") with matching FAQPage JSON-LD.
12. **ShareWhatsApp** — pre-filled text, generated from live data, e.g.: `📍 खुरई मौसम — 25 सितंबर\n🌤 24°, बादल · कल दोपहर बाद बारिश ~18 मिमी\n✅ छिड़काव: आज सुबह ठीक · कटाई: आज पूरी करें\nरोज़ देखें: kissansahyog.com/mausam` — under 300 characters, Hindi, with the link last.
13. **DailyUpdateSignup** — "रोज़ सुबह अपने गाँव का मौसम WhatsApp पर पाएँ — पायलट के दौरान मुफ़्त": phone, pincode (prefilled), crops (chips, multi-select), one checkbox with the exact consent sentence ("मैं किसान सहयोग से WhatsApp पर मौसम और भाव के संदेश पाने के लिए सहमत हूँ। कभी भी STOP लिखकर बंद कर सकते हैं।"). Success: "धन्यवाद — जल्द शुरू होगा।" Writes to `alert_subscriptions` with `source_page='mausam'`. No message is sent.

Schema: `Article` (dateModified = fetched_at) + `FAQPage`. Title: "खुरई मौसम आज और 7 दिन का पूर्वानुमान — किसानों के लिए | किसान सहयोग" (location dynamic).

---

## Phase 3 — `/msp` and `/msp/:crop` (MSP और मंडी भाव)

Routes `/msp` (default crop: गेहूं in Oct–Mar, सोयाबीन in Apr–Sep) and `/msp/:crop` for each of: `gehun`, `soyabean`, `chana`, `masoor`, `moong`, `urad`, `dhan`, `makka`, `sarson`, `lahsun` (garlic has no MSP — its page omits MSP sections and says so). `/info#msp` redirects to `/msp`. Nav item **मंडी भाव** points to `/msp`. Register static routes before `/msp/:crop`.

**Section order — build exactly this:**

1. **PageExplainer** — what it shows (आज का मंडी भाव, सरकारी MSP, दोनों का फ़र्क, हफ्ते–महीने का रुझान), sources (Agmarknet / data.gov.in; CACP for MSP), how to use it (बेचने से पहले देखें; MSP से नीचे हो तो नीचे दिए रास्ते देखें), what it is not (हम भाव की भविष्यवाणी नहीं करते; मंडी में अंतिम भाव नीलामी से तय होता है).
2. **Crop selector** — chips for the 10 crops; selection changes the URL.
3. **आज** — a table of today's (or latest, with the date shown) modal price at every Sagar-district mandi with data, vs MSP: difference in ₹ and % with a green "MSP से ऊपर" / amber "MSP से नीचे" verdict per row; arrivals if available. If today's data is missing, show the latest date plainly ("अंतिम भाव: 24 सितंबर").
4. **TrendChart** — 7 / 30 / 90 day toggle, line of the district's daily modal price (median across mandis) with the MSP as a flat reference line; one sentence: "इस हफ्ते ₹80 चढ़ा" / "30 दिन में ₹150 गिरा". Uses the backfilled history; if history is shorter than the window, show what exists and say "डेटा … से उपलब्ध".
5. **अभी बेचें या रोकें? — गणित** — a calculator, not a prediction: inputs quantity (quintal) and months to wait; shows the current shortfall vs MSP, the storage cost of waiting using the median rate of your own active गोदाम listings (fallback ₹15/क्विंटल/माह, labelled), and the price rise needed to break even. Ends with "पास के गोदाम देखें →" linking to the warehouse category. Disclaimer line: "यह सिर्फ़ गणित है, भविष्यवाणी नहीं। फैसला आपका है।"
6. **MSP पर कहाँ बेचें** — cards from `procurement_centres`: MP e-Uparjan (steps: समग्र ID + आधार से पंजीकरण → पर्ची → केंद्र पर बिक्री → खाते में भुगतान), e-NAM, and any seeded centre with its dates; "तारीख़ें जल्द" when null.
7. **MSP से नीचे बिक गया?** — two cards: **भावांतर भुगतान योजना (MP)** — the state pays the difference to your bank account; registration window; which crops (soybean in the 2025 round; keep the list admin-editable) → links to its scheme page (create the `bhavantar` row in `sarkari_yojana` as an MP state scheme if not present, with sources) — and **PM-AASHA** → its scheme page. Plus the mandi complaint route: "तौल या भुगतान में गड़बड़ी? मंडी सचिव / 1800-180-1551".
8. **पिछले सालों में** — only when ≥ 12 months of history exists for the crop: a 12-month average-by-month bar chart with "पिछले N साल में सबसे कम भाव … महीने में, सबसे ज़्यादा … महीने में रहा" — worded strictly as past fact. If history is insufficient, omit the section entirely.
9. **FaqAccordion** — 8 FAQs (seed: "MSP क्या है?", "MSP से कम भाव मिले तो क्या करें?", "भावांतर योजना में पैसा कैसे मिलता है?", "e-Uparjan पर पंजीकरण कैसे करें?", "मंडी का मॉडल भाव क्या होता है?", "भाव रोज़ कब अपडेट होता है?", "क्या रोकने से फायदा होगा?" — answer: गणित सेक्शन, no prediction, "गोदाम का किराया कितना है?").
10. **ShareWhatsApp** — pre-filled: `🌾 गेहूं भाव — 25 सितंबर\nखुरई मंडी ₹2,580 · सागर ₹2,560\nMSP ₹2,585 (₹5 नीचे)\nइस हफ्ते ↑ ₹80\nरोज़ देखें: kissansahyog.com/msp/gehun`.
11. **DailyUpdateSignup** — same component, `source_page='msp'`, copy: "भाव MSP से ऊपर जाए तो WhatsApp पर बताएँ — पायलट के दौरान मुफ़्त".

Schema: `Article` + `FAQPage` + `Dataset` (name, description, temporalCoverage, source URL) on the crop pages. Title per crop: "गेहूं का भाव आज — सागर, खुरई मंडी | MSP से तुलना | किसान सहयोग".

---

## Phase 4 — Homepage and nav wiring
- Homepage Today card: weather from `weather_cache_v2`; "5 दिन का पूर्वानुमान →" → `/mausam`; "पूरी सूची →" on the MSP tile → `/msp`; the ticker items link to `/msp/:crop`.
- Nav: मौसम → `/mausam`, मंडी भाव → `/msp`.
- `/info`: remove its weather and MSP sections; leave contacts/events; link out to the two pages. Hash links cannot be redirected server-side: on mount, `/info` checks `window.location.hash` and client-side navigates `#weather` → `/mausam` and `#msp` → `/msp`.
- Sitemap: add `/mausam`, `/msp`, and all 10 `/msp/:crop` pages with daily `changefreq`.

## Phase 5 — Admin
Add to `/admin`: alert subscriptions (list, CSV export, deactivate), procurement centres (CRUD), page FAQs (CRUD for `mausam` and `msp`), and a read-only "data health" panel: last weather refresh per cell, last mandi price date per commodity, backfill row counts.

## Phase 6 — Bilingual, accessibility, performance
- All strings via i18n; both pages fully readable in EN.
- Charts as inline SVG (no chart library), with a table fallback for screen readers.
- Both pages must render their above-the-fold content from the cache in one Supabase query each; no Open-Meteo call from the browser.

## Phase 7 — Content review gate
Everything a farmer might act on — ActionWindows rules, per-crop advice, Bhavantar/e-Uparjan steps, FAQ answers — goes into `docs/content/MAUSAM_MSP_CONTENT_REVIEW.md` as a single document for Shri A.K. Dixit to review. While `site_settings.mausam_msp_content_reviewed` is false, those sections show a small "समीक्षाधीन" (under review) tag; an admin toggle in `/admin` flips it.

## Phase 8 — Screenshot self-review (mandatory before deploy)
Build + preview; full-page screenshots at 1280×800 and 375×812 of `/mausam`, `/msp`, `/msp/gehun`, `/msp/soyabean` (8 images); **view every one** and check: explainer block first; Today card shows rain timing; four ActionWindows with a verdict each; hourly strip scrolls; 7-day table complete; season rainfall bars; today's price table with verdicts; trend chart with MSP line and the sentence; calculator works with sample inputs; e-Uparjan/Bhavantar cards present with real links; FAQ accordion + valid JSON-LD; share button opens `wa.me` with the live text (log the generated text and read it); signup form validates a 10-digit number and writes a row; no horizontal scroll on mobile; nothing under 14px. Fix → re-screenshot → re-view until clean. Then the standard closing checks: bilingual audit passes; every existing route still loads (/, /browse, /post, /listing/:id, /info, /resources, /sawaal, /yojana and its subpages, /drone-didi, /videos, /safalta, /articles, /admin); all backend suites green; the homepage Today card still renders from the new cache. Then deploy and repeat the screenshot check on the live staging URL. Write `docs/review/MAUSAM_MSP_REVIEW.md` including the backfill result (years achieved, rows per commodity — or the bold note that the `DATA_GOV_IN_API_KEY` secret is still needed).

Commit message: "मौसम and MSP pages: location-keyed 16-day/hourly weather with action windows, season rainfall, glossary; MSP vs mandi with 3-year Agmarknet backfill, trend, wait-vs-sell calculator, e-Uparjan & Bhavantar routes, per-crop pages; explainer blocks, WhatsApp share with live text, subscription capture; FAQ/Article/Dataset schema; screenshot-reviewed"
