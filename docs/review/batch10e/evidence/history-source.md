# Batch 10E · Phase 2A — mandi price history source (research, read-only)

Date of research: 2026-10-18. No database writes, no code changes. Only GET requests to the APIs
(about 35 requests to api.data.gov.in, page size 1–1000, ~1.5 s apart), plus one read-only anon
`select` on `mandi_prices` (the project in local `.env`) to see the market names already stored.

**API key used:** `DATA_GOV_IN_API_KEY` is **not** in local `.env` (checked with `node --env-file=.env`;
the real key exists only as a CI secret). The sample key that `scripts/refresh-data.mjs` hard-codes
now returns `403 {"error":"Key not authorised"}`. All data.gov.in tests below used the **public sample
key that data.gov.in itself embeds in the resource page's download link**
(`https://www.data.gov.in/resource/variety-wise-daily-market-prices-data-commodity` → "field_datafile_url").
No key is printed here. The real backfill should use the CI secret.

## Verdict in one line

**RECOMMENDED: data.gov.in resource `35985678-0d79-46b4-9ed6-6f13308a1d24` "Variety-wise Daily Market
Prices Data of Commodity" (DMI / Agmarknet, Government Open Data License – India).** It accepts a date
filter and a date sort, holds per-mandi daily rows for all Sagar Division districts (except Niwari, which
reports nothing), covers our crops, and its latest data is **17/10/2026** (yesterday). Data for Sagar
district goes back years (rows from 2014 exist).

---

## 1. Existing sources

### 1a. `mandi-api.onrender.com` (wrapper used first by `refresh-data.mjs`)

- URL: `https://mandi-api.onrender.com/v1/prices?state=Madhya Pradesh&commodity=Wheat[&date=YYYY-MM-DD]`;
  root `/` lists endpoints `/v1/states`, `/v1/commodities`, `/v1/markets`, `/v1/prices`, `/v1/prices/history`.
- Date filter: **yes** (`date=2026-08-20` returned MP wheat rows for that date, fields
  `state, district, market, commodity, variety, grade, arrival_date, min/max/modal_price, fetched_at`).
- But depth is only what this third party happened to snapshot: `date=2026-07-20`, `2026-06-01`,
  `2026-01-15` → **0 rows**. `/v1/prices/history?state=Madhya Pradesh&commodity=Wheat` → 4 rows
  (2026-07-28 … 2026-07-31), **state averages** (`mode: STATE_AVERAGE`), not per mandi.
- Operator / source code / licence / terms: **none found** (no `/docs`, no `/openapi.json`; web search
  found no owner or repo). Sample: `{"district":"Vidisha","market":"Sironj APMC","commodity":"Wheat","variety":"Wheat","grade":"FAQ","arrival_date":"2026-08-20","min_price":2442,"max_price":2830,"modal_price":2830}`.
- **Verdict: NOT USED for history** (gappy, unknown operator, no stated terms). It re-serves the same
  government data that we can take directly from data.gov.in.

### 1b. data.gov.in `9ef84268-d588-465a-a308-a864a43d0070` "Current Daily Price of Various Commodities from Various Markets (Mandi)"

- URL: `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=…&format=json`
- Metadata `updated_date` 2026-10-18T09:00:46Z; exposed filters: `state.keyword, district, market, commodity, …`
  (`arrival_date` is a field but **not an exposed filter**).
- Date filter: **no.** `filters[arrival_date]=20/08/2026` and `=20-08-2026` both ignored → total 8142,
  rows dated **18/10/2026** (today). Confirms KNOWN_ISSUES: today-only snapshot.
- **Verdict: NOT a history source** (keep it for the 3-hourly refresh only).

## 2. Other data.gov.in resources — `35985678-0d79-46b4-9ed6-6f13308a1d24` (RECOMMENDED)

- Resource page: https://www.data.gov.in/resource/variety-wise-daily-market-prices-data-commodity
- Catalog: https://www.data.gov.in/catalog/variety-wise-daily-market-prices-data-commodity
  (catalog uuid `6141ea17-a69d-4713-b600-0a43c8fd9a6c`, the same Agmarknet catalog as `9ef84268`).
- API: `https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24?api-key=…&format=json&limit=1000&offset=0`
- Publisher: Ministry of Agriculture and Farmers Welfare → Department of Agriculture and Farmers Welfare →
  **Directorate of Marketing and Inspection (DMI)**. Catalog text: *"The data refers to prices of various
  commodities. It has the wholesale maximum price, minimum price and modal price on daily basis. This
  dataset is generated through the AGMARKNET Portal (http://agmarknet.gov.in), which disseminates daily
  market information of various commodities."* Frequency/granularity: Daily.
- API metadata: `created_date` 2023-09-19, **`updated_date` 2026-10-17T23:34:49Z**, `total` 82,577,538 rows.
- Fields: `Arrival_Date (dd/MM/yyyy), State, District, Market, Commodity, Commodity_Code, Variety, Grade,
  Min_Price, Max_Price, Modal_Price`. **No arrivals/quantity field.**
- Exposed filters: `State` (mandatory), `District` (mandatory), `Commodity`, `Arrival_Date` (format `dd-MM-yyyy`;
  `dd/MM/yyyy` also worked). Exact keyword match (no fuzzy "*Pradesh" leakage seen).
  **`sort[Arrival_Date]=desc` works** and is stable across `offset` pages (verified monotone over 2 pages).
- Page size: `limit=1000` accepted with the sample key. Response headers: `X-Ratelimit-Limit: -1`
  (no limit advertised). We still recommend ≥1 s between requests.
- **Latest date available:** `filters[State]=Madhya Pradesh&filters[Arrival_Date]=17-10-2026` → 1,706 MP rows;
  16-10-2026 → 2,743; 15-10-2026 → 2,605. (18-10 not yet published; the resource refreshes nightly.)

### Licence (GODL)

- data.gov.in footer on the resource page (verbatim): *"Content is owned by the respective
  Ministries/Departments/Organizations and licensed under the Government Open Data License-India."*
  and *"All rights reserved except published datasets/resources and metadata."*
- The resource's own `field_data_licence` is empty, so the portal-wide GODL applies.
- GODL (Gazette notification, https://data.gov.in/sites/default/files/Gazette_Notification_OGDL.pdf; text quoted
  via https://wiki.openstreetmap.org/wiki/Open_Geospatial_Data_from_Government_of_India because the PDF is a
  scan): *"all users are provided a worldwide, royalty-free, non-exclusive license to use, adapt, publish …
  for all lawful commercial and non-commercial purposes"*; attribution: *"The user must acknowledge the
  provider, source, and license of data by explicitly publishing the attribution statement"* including the
  DOI or URL of the data.
- **Obligation for us:** show an attribution on /msp, e.g. "Source: Agmarknet, Directorate of Marketing &
  Inspection, Ministry of Agriculture & Farmers Welfare, via data.gov.in (Government Open Data License –
  India), https://www.data.gov.in/resource/variety-wise-daily-market-prices-data-commodity".

### Coverage proof (Madhya Pradesh, Sagar Division)

**A. Per district, per date (all commodities), 18 requests** — `filters[State]=Madhya Pradesh&filters[District]=<D>&filters[Arrival_Date]=<date>&limit=1000`:

| date | Sagar | Damoh | Panna | Tikamgarh | Chhatarpur | Niwari |
|---|---|---|---|---|---|---|
| 2026-07-20 | 103 | 32 | 19 | 13 | 46 | 0 |
| 2026-08-20 | 85 | 33 | 16 | 12 | 34 | 0 |
| 2026-09-10 | 91 | 38 | 22 | 7 | 35 | 0 |

Rows for our crops in those 586 rows (Sagar Division total; rows / distinct markets):

| crop (our `commodity_en`) | official `Commodity` | 20 Jul | 20 Aug | 10 Sep |
|---|---|---|---|---|
| Wheat गेहूं | `Wheat` | 50 / 34 | 41 / 33 | 41 / 31 |
| Soyabean सोयाबीन | `Soyabean` | 21 / 14 | 15 / 12 | 9 / 7 |
| Gram चना | `Bengal Gram(Gram)(Whole)` | 27 / 17 * | 24 / 17 * | 24 / 15 * |
| Mustard सरसों | `Mustard` | 19 / 16 | 15 / 12 | 15 / 13 |
| Lentil मसूर | `Lentil(Masur)(Whole)` | 15 / 11 | 5 / 5 | 14 / 8 |
| Moong मूंग | `Green Gram(Moong)(Whole)` | 13 / 13 | 9 / 9 | 5 / 5 |
| Urad उड़द | `Black Gram(Urd Beans)(Whole)` | 6 / 6 | 4 / 3 | 3 / 3 |
| Maize मक्का | `Maize` | 1 / 1 | 1 / 1 | 3 / 2 |
| Garlic लहसुन | `Garlic` | 1 / 1 | 2 / 2 | 2 / 2 |
| Paddy धान | `Paddy(Common)` | 0 | 0 | 1 / 1 |

\* these counts used the token rule from `refresh-data.mjs` and so **also include `Red gram/Arhar/Tur(whole)`** (see bug below); Bengal Gram alone is somewhat lower.
All 586 rows passed `Modal_Price > 0` and `Min ≤ Modal ≤ Max`.

**B. Depth for 90 days, Sagar district, sorted desc, 1 page each:**

| crop | rows since 2026-07-20 | distinct dates | markets |
|---|---|---|---|
| Wheat | 1,044 | 81 | 14 |
| Soyabean | 603 | 75 | 14 |
| Bengal Gram(Gram)(Whole) | 600 | 78 | 13 |

Sagar Wheat: offset 0 → 17/10/2026 … 22/07/2026; offset 1000 → 22/07 … 25/05/2026; offset 4000 → 29/01/2026 …
12/11/2025 (all markets still spelled "… APMC"). Rows as old as 2014 exist (spelled without "APMC", e.g. "Bamora").

**Sample rows** (as returned):

```
{"Arrival_Date":"20/08/2026","Commodity":"Wheat","District":"Sagar","Grade":"FAQ","Market":"Sagar APMC","Variety":"Wheat","Min_Price":2405,"Modal_Price":2560,"Max_Price":4200,"State":"Madhya Pradesh"}
{"Arrival_Date":"20/08/2026","Commodity":"Wheat","District":"Sagar","Grade":"FAQ","Market":"Khurai APMC","Variety":"Wheat","Min_Price":2500,"Modal_Price":2525,"Max_Price":4090}
{"Arrival_Date":"20/08/2026","Commodity":"Wheat","District":"Sagar","Grade":"Non-FAQ","Market":"Rehli APMC","Variety":"Wheat","Min_Price":2505,"Modal_Price":2525,"Max_Price":2555}
{"Arrival_Date":"20/07/2026","Commodity":"Soyabean","District":"Sagar","Grade":"FAQ","Market":"Sagar APMC","Variety":"Soyabeen","Min_Price":4000,"Modal_Price":7175,"Max_Price":8025}
{"Arrival_Date":"20/07/2026","Commodity":"Soyabean","District":"Sagar","Grade":"FAQ","Market":"Bamora APMC","Variety":"Yellow","Min_Price":6700,"Modal_Price":7305,"Max_Price":7305}
{"Arrival_Date":"20/07/2026","Commodity":"Bengal Gram(Gram)(Whole)","District":"Sagar","Grade":"FAQ","Market":"Khurai APMC","Variety":"Gram","Min_Price":4681,"Modal_Price":5770,"Max_Price":6200}
{"Arrival_Date":"17/10/2026","Commodity":"Bengal Gram(Gram)(Whole)","District":"Sagar","Grade":"FAQ","Market":"Sagar APMC","Variety":"Gram","Min_Price":5200,"Modal_Price":6800,"Max_Price":6995}
{"Arrival_Date":"20/08/2026","Commodity":"Bengal Gram(Gram)(Whole)","District":"Sagar","Grade":"FAQ","Market":"Garhakota APMC","Variety":"Gram","Min_Price":5925,"Modal_Price":5975,"Max_Price":5975}
```

## 3. CEDA / Ashoka Agmarknet portal (https://agmarknet.ceda.ashoka.edu.in/)

- What it is now: a Next.js dashboard over its own API (`/api/states`, `/api/districts`, `/api/commodities`,
  `/api/prices`, `/api/quantities`); downloads go through an **OTP login** (`api.ceda.ashoka.edu.in/v1/auth/portal/download`).
- Has MP (state 23), Sagar (district 427), Damoh (428), Wheat (1), Bengal Gram (6), Soyabean (13).
- Granularity: **district-level averages** (`{"t":"2025-10-30","cmdty":"Wheat","district":"Sagar","p_min":2349.5,"p_max":2516.9,"p_modal":2432.2}`), **not per mandi**.
- **Latest data: 2025-10-30** (Sagar wheat, daily, 2025-01-01 → 2026-10-18 query returned 296 points, newest 2025-10-30) → about a year stale.
- Terms (https://ceda.ashoka.edu.in/republish-policy/): *"CEDA data products and visualizations are made available
  for non-commercial use"*; data *"may be used, shared, or adapted under the same Creative Commons license"*
  (CC BY-ND 4.0) *"unless otherwise stated"*; *"CEDA material is not for commercial use"*; *"You cannot
  systematically republish all CEDA material."* API terms (https://ceda.ashoka.edu.in/api-terms-conditions/) require a CEDA logo + credit on visuals.
- **Verdict: NOT USED.** Stale, not per mandi, non-commercial + no-derivatives terms, login-gated. No bulk ingest.

## 4. Official agmarknet.gov.in (Agmarknet 2.0) date-range reports

- robots.txt allows `/` (disallows only sign-in/data-entry paths), but no terms of use permitting automated
  extraction were found (`/TermsConditions.aspx` is a JS shell; no licence text found by search).
- **Verdict: NOT USED.** Not needed: the same DMI/Agmarknet data is officially published under GODL via
  data.gov.in resource `35985678-…` with an API.

---

## Recommendation and reasons

Use **data.gov.in `35985678-0d79-46b4-9ed6-6f13308a1d24`**:
1. Legal: official DMI/Agmarknet data, GODL (commercial + non-commercial use, attribution required).
2. Recent: latest date 17/10/2026; nightly refresh.
3. Per-mandi daily rows for every Sagar Division district we flag (Niwari has none), all 10 site crops present.
4. Server-side date filter and date sort → a small, polite request plan.
5. Same "… APMC" market spelling as the rows our refresh already stores (e.g. `Sagar APMC`, `Khurai APMC`,
   `Shahagarh APMC`, `Gadakota APMC`), so backfilled rows join the existing series.

## Field mapping → `public.mandi_prices`

| mandi_prices column | from | note |
|---|---|---|
| `price_date` | `Arrival_Date` dd/MM/yyyy → yyyy-MM-dd | |
| `commodity_en` | our api name (Wheat, Soyabean, Gram, …) via **exact** `Commodity` map below | |
| `commodity_hi` | from the site's COMMODITIES list | |
| `market` | `Market` as is ("Sagar APMC") | |
| `district` | `District` | |
| `state` | `State` ("Madhya Pradesh") | |
| `min_price` / `max_price` / `modal_price` | `Min_Price` / `Max_Price` / `Modal_Price` (₹/quintal) | numbers (older rows are strings) |
| `arrivals_tonnes` | — | **not in this resource → NULL** |
| `is_sagar_district` | `District == 'Sagar'` | same rule as refresh |
| `in_sagar_division` | District ∈ {Sagar, Damoh, Panna, Tikamgarh, Chhatarpur, Niwari} | |
| `fetched_at` | run time | |
| source | — | **no source column** exists (0019/0024/0058) → record in `backfill-source.md` per prompt 2B |
| `Variety`, `Grade`, `Commodity_Code` | — | no columns; use only for row selection |

Exact commodity map (use `filters[Commodity]=` with these, NOT token matching):
Wheat→`Wheat`; Soyabean→`Soyabean`; Gram→`Bengal Gram(Gram)(Whole)`; Lentil→`Lentil(Masur)(Whole)`;
Moong→`Green Gram(Moong)(Whole)`; Urad→`Black Gram(Urd Beans)(Whole)`; Paddy(Dhan)(Common)→`Paddy(Common)`;
Maize→`Maize`; Mustard→`Mustard`; Garlic→`Garlic`. (Wheat, Soyabean, Bengal Gram, Lentil verified as filters;
the rest observed as names in returned rows — verify each in the 2B dry run.)

**Unique key clash:** the table key is `(commodity_en, market, price_date)` but the source has one row per
variety/grade: 82 of 491 (commodity, market, date) keys in the sample had >1 row (e.g. `Bamora APMC` wheat
20/08: two "Mill Quality" FAQ rows 2500 and 2426). The backfill must pick ONE real row per key by a fixed,
documented rule (suggest: Grade `FAQ` first, then the row whose Variety equals the commodity's common variety,
then the lowest `Modal_Price`… any deterministic rule), never average. `on conflict do nothing` keeps rows our
refresh already wrote.

## Request plan

Query per (district, commodity): `filters[State]=Madhya Pradesh&filters[District]=<D>&filters[Commodity]=<C>&sort[Arrival_Date]=desc&limit=1000&offset=<n>`, stop paging when the oldest row on a page is before the cut-off date. 5 districts with data × 10 crops = 50 combos (Niwari can be asked once per crop, returns 0).

- **90 days:** Sagar Wheat ≈ 1,050 rows (2 pages); every other combo ≤ 1,000 rows (1 page) → **≈ 55–65 requests**, ~2 min at 1.5 s spacing. Expected volume ≈ 6–8k raw rows → ≈ 5–6k after one-row-per-key.
- **1 year:** Sagar Wheat ≈ 5 pages, Sagar Soyabean/Gram ≈ 3 each, other districts 1–2 each → **≈ 110–150 requests**.
- Alternative (per district per date, all commodities): 90 × 6 = 540 requests — not recommended.
- Use the real `DATA_GOV_IN_API_KEY` CI secret; the page's public sample key also worked at limit 1000.

## Findings to pass on / HUMAN-REVIEW

1. **HUMAN-REVIEW (legal, low risk):** GODL requires a visible attribution (provider, source, licence, URL) on /msp. Founder to approve wording. CEDA terms (non-commercial, no-derivatives) rule it out; the onrender wrapper has no terms.
2. **Bug found (not fixed, read-only task):** `matchCommodity()` in `scripts/refresh-data.mjs` (and the old backfill) treats `Red gram/Arhar/Tur(whole)` as Gram/चना because it only excludes "green"/"black". Arhar rows can be written as चना. The backfill must use exact names; the refresh should exclude "red"/"arhar"/"tur" too.
3. **Scope note:** `fetchMandiHistory()` takes the median across ALL stored rows of a crop, including non-division MP fallback markets the refresh sometimes writes (Indore, Khargone, Narsinghpur, …). The backfill should load Sagar Division districts only; mixing scopes can shift the median.
4. **Market spelling:** the source has both `Gadakota APMC` and `Garhakota APMC` for Sagar (same town, separate rows on the same day); the DB already has `Gadakota APMC`, plus older wrapper rows `Sagar` / `Khurai` without "APMC". Keep source spelling; do not merge without a decision.
5. Niwari district has no rows in this resource for the tested dates.
6. Arrivals (tonnes) are not available historically from this resource → backfilled rows have NULL arrivals.
7. Current DB (local `.env` project) holds 159 rows, 2026-09-22 → 2026-10-18, 26 distinct dates — consistent with the item-5 complaint.

Throwaway probe scripts/outputs: `C:/Users/usdvi/AppData/Local/Temp/claude/C--Users-usdvi-projects-Kissansahyog/96adcb5e-cc7a-42fe-b6ff-2a5d315c4140/scratchpad/p2a/`.
