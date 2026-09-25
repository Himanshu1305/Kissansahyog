# मौसम (/mausam) & MSP (/msp) — screenshot self-review

**I looked at the screenshots.** Full-page shots at 1280×800 and 375×812 of
`/mausam`, `/msp`, `/msp/gehun`, `/msp/soyabean` (8 images) were captured, sliced
into readable tiles, and viewed. `docs/review/*-d.png` hold the desktop captures.

## Checklist (Phase 8)
| Check | Result |
|---|---|
| Explainer block first | PASS — soft-green "यह पेज किस लिए है" card on both pages |
| Today card shows rain timing | PASS — "अगली बारिश: 6 घंटे बाद ~7 मिमी" + IMD-threshold badge linking to mausam.imd.gov.in |
| Four ActionWindows with a verdict each | PASS — छिड़काव/सिंचाई/कटाई-सुखाई/बुवाई, each ठीक/सावधानी/रुकें + one-line reason; समीक्षाधीन tag |
| Hourly strip scrolls | PASS — 48h, 3-hour steps (time/temp/mm/wind) |
| 7-day table complete | PASS — day, icon, max/min, rain mm+%, wind; ⚠️ on ≥64.5 mm |
| Season rainfall bars | PASS — अब तक 796 मिमी vs 10-year avg 1190 मिमी, "सामान्य से 33% कम" |
| Today's price table with verdicts | PASS — per-mandi modal vs MSP, ₹/₹% diff, green "ऊपर"/amber "नीचे" |
| Trend chart with MSP line + sentence | PASS — inline SVG, dashed MSP reference, 7/30/90 toggle, "30 दिन में ₹242 चढ़ा" |
| Calculator works with sample inputs | PASS — 50 qtl × 3 months → "₹25/क्विंटल MSP से नीचे · कुल अंतर ₹1,250", storage ₹36, break-even ₹36 (a sign-inversion bug was found and fixed) |
| e-Uparjan / Bhavantar cards with real links | PASS — mpeuparjan.nic.in, enam.gov.in; Bhavantar → /yojana/bhavantar, PM-AASHA → /yojana/pm-aasha; complaint 1800-180-1551 |
| FAQ accordion + valid JSON-LD | PASS — /mausam: Article+FAQPage; /msp/:crop: Article+Dataset+FAQPage (all parse) |
| Share opens wa.me with live text | PASS — e.g. `🌾 गेहूं मंडी भाव — 25 सितंबर\nShahagarh APMC ₹2,560\nMSP ₹2,585 (नीचे ₹25)\n30 दिन में ₹242 चढ़ा\nरोज़ देखें: kissansahyog.com/msp/gehun` (< 300 chars, link last) |
| Signup validates 10-digit + writes a row | PASS — submitted 9990001234, "धन्यवाद" shown, row confirmed in alert_subscriptions (source_page=mausam) |
| No horizontal scroll on mobile | PASS — scrollWidth = clientWidth on all 8 shots |
| Nothing under 14px | PASS |

## Closing checks
- **Bilingual**: every new string in `strings.js`; static-key scan of the new pages/components clean; both pages render in EN via the global toggle.
- **Route regression**: /, /browse, /post, /info, /resources, /sawaal, /yojana (+ subpages incl. new /yojana/bhavantar), /drone-didi, /videos, /safalta, /articles, /admin, /mausam, /msp, /msp/:crop all load with no JS/console errors. Legacy hash links redirect client-side: `/info#weather` → `/mausam`, `/info#msp` → `/msp`.
- **Homepage Today card** renders from `weather_cache_v2` ("25° · आंशिक बादल"); old `weather_cache` table dropped.
- **Charts** are inline SVG with an `sr-only` table fallback; above-the-fold reads one cached Supabase query (no browser Open-Meteo).
- `public/sitemap.xml` (39 URLs) includes /mausam, /msp, all 10 /msp/:crop (daily changefreq) + existing pages; referenced from robots.txt.
- `/msp/lahsun` correctly omits MSP sections (garlic has no MSP) and says so.

## Data foundations
- **weather_cache_v2** populated for all 8 Sagar pilot cells (Khurai, Sagar, Bina, Rehli, Deori, Banda, Rahatgarh, Malthon): current + 48h hourly + 16-day daily (incl. ET0, soil moisture, precip probability) + season rainfall (to-date vs 2015-based 10-yr archive normal). Refresh via `scripts/refresh-data.mjs` (renamed from refresh-mandi-prices.mjs; `npm run refresh-prices` unchanged; 3-hourly cron kept).
- **Subscriptions / procurement / page-FAQs / site-settings** tables + admin RPCs created; 16 FAQs (8+8), 3 procurement centres (e-Uparjan wheat/soybean, e-NAM), Bhavantar scheme row seeded. Admin panels added (subscriptions list+CSV+deactivate, procurement CRUD, page-FAQ CRUD, read-only data-health, content-review toggle).

## ⚠️ Mandi history backfill — action required by the owner
The 3-year Agmarknet backfill was **NOT run**: it needs a real `DATA_GOV_IN_API_KEY`
(the public demo key returns only ~10 rows/request, and the official API is IP-blocked
off GitHub runners). **The owner must: (1) register free at https://data.gov.in
(Register → My Account → API key); (2) add it as the repository secret
`DATA_GOV_IN_API_KEY`; (3) run the "Backfill mandi history" workflow from the Actions
tab.** Until then, the trend chart and the "पिछले सालों में" section show only the
short history the 3-hourly refresh has gathered (and the past-years section stays hidden
until ≥12 months exist). `.github/workflows/backfill-mandi-history.yml` fails fast with
this message if the secret is missing; the same key is also used as the refresh
fallback when present. No history was fabricated.
