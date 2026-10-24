# Batch 16A - Phase 0 recon (read-only findings, written before coding)

Run date: 2026-10-25 (IST). Branch `release-16a` from `release-15b` HEAD `775ffd7` (tag `ship-15b2`): confirmed.

## mandi_prices and how the site gets "the price"
- Table (migrations 0019, 0058 and later): `commodity_en`, `commodity_hi`, `market`, `district`, `state`, `min_price`, `max_price`, `modal_price` (Rs per quintal), `price_date`, `is_sagar_district`, `in_sagar_division` (the six-district Sagar division flag, migration 0058), `arrivals_tonnes` (the column exists but is **null in the rows read**, so arrivals are not used), `fetched_at`. Unique `(commodity_en, market, price_date)`. Anon can SELECT.
- "Sagar division" = `in_sagar_division = true`, falling back to `is_sagar_district` if the column is missing (src/lib/mandi/mandiApi.js `withLocalFlag`). The generator does the same (scripts/morning/lib/supa.js).
- Headline price on /msp (src/screens/Msp.jsx): the **latest point of the 30-day stable-basket series** (`basketSeries` in src/lib/mandi/basket.js, built from the Sagar-division rows of the 30-day tab). The generator imports that same helper and window, and a unit test proves parity.
- Crop keys: `src/content/crops.js` (`mandi_en`, `hi`, `season`, `harvest_months`). Hindi mandi names: `src/lib/i18n/strings.js` + `src/lib/mandi/marketNames.js` (imported as they are, Node-safe).

## Which database the configured env points to, and the data in it
- `.env` (used by `npm run morning`) points to **staging**, host `wzxtqbqlahyahsnoqqva.supabase.co`. `.env.production` points to **production**, host `eltmcznjcqiahqhjvpjg.supabase.co`. Both were read with the public anon key only, SELECT only.
- Latest `mandi_prices` date and Sagar-division rows per day (anon read, 2026-10-25):

| day | staging all rows | staging division rows | production all rows | production division rows |
|---|---|---|---|---|
| 2026-10-24 .. 2026-10-18 | 5 per day | **0** | none | none |
| 2026-10-17 | 63 | 58 (24 mandis) | 60 | 60 (24 mandis) |
| 2026-10-16 | 126 | 111 (34 mandis) | 122 | 122 (34 mandis) |
| 2026-10-15 | 117 | 112 (33 mandis) | 116 | 116 (33 mandis) |

  The freshest Sagar-division prices are from **17 October** (staging and production): older than 3 days, so today's message honestly says the mandi numbers have not come. Production has no rows at all after 17 Oct. Staging gets only 5 rows a day, none flagged `in_sagar_division`. **This is the main risk for the 6 AM message**: check that `refresh-mandi-prices.yml` (needs the service-role secret in GitHub) really runs and fills division rows before relying on the price section.

## Weather code already in the repo
- Yes: Open-Meteo is already used by `scripts/refresh-data.mjs` (service cron) and `src/lib/weather/weatherApiV2.js`. Coordinates in the repo: Sagar town `23.8388, 78.7378` (`scripts/refresh-data.mjs:46`) and 23.84, 78.74 in `src/content/mandiCoords.js`. The generator uses 23.8388 N, 78.7378 E and the same provider, behind `getForecast(lat, lon, date)` (scripts/morning/lib/weather.js) so it can be swapped.

## Season and date constants
- Sowing banner `BANNERS.sowing.validUntil = '2026-11-15'`, rain banner `'2026-12-31'` (src/content/kamPani.js). The countdown and the season task use the sowing date. `harvest_months` in crops.js. `MSP_2027_28` in src/content/kamPani.js is used by the site for the crop being sown; it is deliberately **not** compared with today's mandi price here.
- KVK Sagar phone: the site constant is the string `res_card_offices_1` in src/lib/i18n/strings.js; the generator extracts the number from it (never retyped).

## Fonts, Playwright, tests
- No Devanagari font file was in `public/` or `src/` (the site loads fonts from a CDN). The OFL font `@fontsource/noto-sans-devanagari` (devDependency) files are copied to `scripts/morning/card/fonts/` with the licence text, so the card never depends on system fonts. Playwright 1.62.1 with chromium is installed and reused.
- Unit tests: `tests/unit/*.test.mjs` run with `node --test "tests/unit/*.test.mjs"`. e2e: `e2e/*.spec.js`. Script style: `node --env-file=.env scripts/...`.

## Weather provider terms (Open-Meteo), opened 2026-10-25
- https://open-meteo.com/en/terms says: "You may only use the free API services for non-commercial purposes." Commercial examples listed: websites or apps with subscriptions or advertisements, commercial products or promotional activities. Non-commercial: private or non-profit sites and apps without subscriptions or ads, educational content, voluntary donations. Free limits: under 10,000 calls a day, 5,000 an hour, 600 a minute (300,000 a month on the pricing page). Data is CC-BY 4.0 (credit Open-Meteo).
- **Verdict: not clearly covered.** A free information channel is non-commercial in spirit, but Kisan Sahyog also hosts a marketplace, and the terms do not say whether that makes it "commercial". **Label: "NOT cleared for production use"** (also written in report.txt). The existing site code already calls the same free API, so the same question applies there.
- Cheapest compliant alternative: Open-Meteo "API Standard" (commercial use allowed, 1,000,000 calls a month, no daily cap, billed monthly through Stripe). The pricing page I opened did **not print a price**. I believe it is roughly EUR 29 a month, but I could not confirm it: ask info@open-meteo.com or open the checkout. One call a day is about 30 calls a month. A free alternative: ask Open-Meteo in writing whether a free farmer information service on a marketplace site counts as non-commercial.

## Panchang cross-check (tithi at sunrise)
Source: https://www.drikpanchang.com/panchang/day-panchang.html?date=DD/MM/YYYY&geoname-id=1275841 (Bhopal, about 170 km from Sagar, so its sunrise is a few minutes earlier; a tithi that changes within minutes of sunrise could differ). Opened 2026-10-25.

| date | published panchang (Bhopal) | generator (Sagar, tithi number 1-30) | agree |
|---|---|---|---|
| 24 Oct 2026 | Shukla Trayodashi (till 13:36) | 13 | yes |
| 25 Oct 2026 | Shukla Chaturdashi (till 11:55) | 14 | yes |
| 28 Oct 2026 | Krishna Tritiya (till 01:06 next day) | 18 | yes |
| 5 Nov 2026 | Krishna Ekadashi (till 10:35) | 26 | yes |
| 9 Nov 2026 | Amavasya (till 12:31) | 30 | yes |
| 14 Nov 2026 | Shukla Panchami (till 23:23) | 5 | yes |

6 of 6 agree; no mismatches. Boundary cases (a tithi ending within minutes of sunrise) can differ between sources; none among these dates. HOWTO tells the founder to glance at a printed panchang for the first week.

## MSP verification (strict, official-source rule)
- The official PIB pages (pib.gov.in) answered **HTTP 403** to our fetcher, so I could not open them. What I did open: Akashvani (newsonair.gov.in, public broadcaster) for the rabi 2026-27 increases (wheat +160, barley +170, gram +225, masur +300, mustard +250); DD India (ddindia.co.in, Doordarshan) for the kharif 2026-27 figures; Tribune India for the rabi levels; Basis Point Insight as a second report for kharif. Values agree, and the rabi levels equal last year's level plus the Akashvani increases.
- **Rabi marketing season 2026-27 (CCEA, 1 Oct 2025), Rs/quintal:** wheat 2585, barley 2150, gram 5875, lentil 7000, mustard 6200, safflower 6540.
- **Kharif marketing season 2026-27 (CCEA, 13 May 2026), Rs/quintal:** paddy common 2441, soyabean (yellow) 5708, moong 8780, urad 8200, maize 2410.
- They are in `data/morning/msp-reference.json` with `verified:true` and the page I opened. **Please confirm against PIB** (the file's note says so).
- `msp_prices` table (anon read on staging, 51 rows): most crops are duplicated 3x; **Rapeseed & Mustard shows 5950 (the 2025-26 figure; official 2026-27 is 6200)** and Safflower 5940 (official 6540) are stale. Gram 5875, Lentil 7000, Wheat 2585, Barley 2150 and the kharif values match. The generator never reads this table.
- The new 2027-28 rabi MSP (wheat 2610, announced 1 Oct 2026, already on the kam-pani page) is for the crop being sown; the generator never compares it with today's mandi prices.

## Not verified (left out, as the rules require)
- **Schemes** (PM-KISAN, PMFBY, KCC): pmkisan.gov.in gave a certificate error and pmfby.gov.in returned only a title. No deadline or eligibility could be verified, so the three entries in `scheme-calendar.json` are `verified:false` and never shown (Monday and Friday fall back to the countdown).
- **Festivals**: `festivals.json` is `[]` (none verified from an authoritative source).
- **Procurement windows**: `procurement-windows.json` is `[]`; the generator only ever says "ask KVK / agriculture department".
- **Kahawat** (weather sayings): none with a citable published source, so none are included; Saturday falls back to the countdown.

---
# Part B recon (appended)
See the "Part B recon" section further below (added with Part B).
