# Backfill source record (Batch 10E, Phase 2B/2C)

`public.mandi_prices` has no source column and this batch does not add one, so the source of the
backfilled rows is recorded here.

- **Source:** Agmarknet — Directorate of Marketing & Inspection (DMI), Department of Agriculture & Farmers
  Welfare, Ministry of Agriculture & Farmers Welfare — published on data.gov.in.
- **Resource:** `35985678-0d79-46b4-9ed6-6f13308a1d24` "Variety-wise Daily Market Prices Data of Commodity"
- **URL:** https://www.data.gov.in/resource/variety-wise-daily-market-prices-data-commodity · API `https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24`
- **Licence:** Government Open Data License – India (GODL). Attribution text to show (founder to approve wording, HUMAN-REVIEW):
  > Source: Agmarknet, Directorate of Marketing & Inspection, Ministry of Agriculture & Farmers Welfare, via data.gov.in (Government Open Data License – India (GODL)), https://www.data.gov.in/resource/variety-wise-daily-market-prices-data-commodity
- **Date range loaded:** 2026-06-20 … 2026-10-17 (120 days; data fetched 2026-10-18T16:25:50Z).
- **Generated:** 2026-10-18T16:30:06.196Z.
- **Scope:** State = Madhya Pradesh; District ∈ {Sagar, Damoh, Panna, Tikamgarh, Chhatarpur, Niwari} (from `src/lib/location/places.js`);
  crops from `src/content/crops.js` with an exact source name: Wheat = "Wheat"; Soyabean = "Soyabean"; Gram = "Bengal Gram(Gram)(Whole)"; Lentil = "Lentil(Masur)(Whole)"; Moong = "Green Gram(Moong)(Whole)"; Urad = "Black Gram(Urd Beans)(Whole)"; Paddy(Dhan)(Common) = "Paddy(Common)"; Maize = "Maize"; Mustard = "Mustard"; Garlic = "Garlic".
- **Row mapping:** Arrival_Date → price_date; Market (as spelled by the source) → market; District, State as given;
  Min/Max/Modal_Price → min/max/modal_price (₹/quintal); arrivals_tonnes NULL (not in the source);
  in_sagar_division = true; is_sagar_district = (District = 'Sagar'); commodity_hi from crops.js.
- **Selection rule (one row per commodity, market, date):** the source has one row per variety/grade. Picked
  deterministically, never averaged: Grade "FAQ" first; then the lexicographically smallest Variety; then
  (only for rows identical in grade and variety) the lowest modal, then min, then max price.
- **Validation:** all three prices > 0; min ≤ modal ≤ max; date a real calendar date, not in the future and
  inside the window; outliers (modal > 5× or < 1/5 of that crop's median modal in this batch) are listed and not loaded.
- **Counts:** source rows fetched 11484; passed row checks 11484; rejected
  0 {}; duplicate keys 2336
  (2859 extra rows not used); outliers not loaded 0; **rows loaded/offered 8625**.
- **Production:** `docs/review/batch10e/backfill-prod/` — 18 part files, 8625 rows, plus `verify.sql` and `README.md`.

| crop | rows | distinct days | first | last |
|---|---|---|---|---|
| Wheat | 2967 | 119 | 2026-06-20 | 2026-10-17 |
| Soyabean | 1032 | 105 | 2026-06-20 | 2026-10-17 |
| Gram | 1304 | 108 | 2026-06-20 | 2026-10-17 |
| Lentil | 729 | 98 | 2026-06-20 | 2026-10-17 |
| Moong | 616 | 96 | 2026-06-20 | 2026-10-17 |
| Urad | 570 | 96 | 2026-06-20 | 2026-10-17 |
| Paddy(Dhan)(Common) | 51 | 46 | 2026-06-22 | 2026-10-17 |
| Maize | 107 | 53 | 2026-06-20 | 2026-10-17 |
| Mustard | 1127 | 108 | 2026-06-20 | 2026-10-17 |
| Garlic | 122 | 87 | 2026-06-20 | 2026-10-17 |

## Staging apply (2026-10-18, project wzxtqbqlahyahsnoqqva)

- Same cache, same 8,625 validated rows, same `insert … on conflict (commodity_en, market, price_date) do nothing`
  (wrapped in a counting CTE), 18 batches of ≤ 500: **8,556 inserted, 69 skipped** because the key already
  existed (rows from the 3-hourly refresh, left untouched). Re-run: **0 inserted** (idempotent).
  Evidence: `backfill-staging-before.txt`, `backfill-dryrun.txt`, `backfill-apply-staging.txt`, `backfill-staging-after.txt`.
- Unique constraint checked read-only before writing: `mandi_prices_commodity_en_market_price_date_key UNIQUE (commodity_en, market, price_date)`.
- Fetch: 61 GET requests to api.data.gov.in (1.5 s apart), public sample key that data.gov.in embeds in the
  resource page's download link, passed via the command's environment only (not stored, never printed).
  For production refreshes use the real `DATA_GOV_IN_API_KEY` CI secret.
