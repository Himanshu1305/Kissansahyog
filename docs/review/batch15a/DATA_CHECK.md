# Batch 15A - data check (CEDA fetch vs the architect's hand-pulled table)

Fetched 2026-10-23 by `scripts/fetch-mandi-history.mjs` (one request at a time; CEDA answered with HTTP 504 gateway pages on some tries and the script waited and retried; no request was refused or blocked). 72 requests: 12 crops x (state + 5 districts). CEDA returned no month after 2025-10.

**Result: ALL 12 COMMODITIES MATCH.** Every month count and every district count is identical; every price is within 1 to 2 rupees (rounding); every sum is within +/- 60 (the largest difference is 12).

Columns: division months / mp months | division 2021-03 (price, districts) | division 2025-10 (price, districts) | mp 2025-10 | sum of division prices | sum of mp prices.

| commodity | expected (architect) | computed by the script | status |
|---|---|---|---|
| Wheat | 118 / 118 | 1616, 5 | 2454, 5 | 2497 | 231162 | 237616 | 118 / 118 | 1616, 5 | 2454, 5 | 2497 | 231166 | 237616 | OK |
| Gram | 118 / 118 | 4653, 5 | 5286, 4 | 5302 | 571715 | 572745 | 118 / 118 | 4652, 5 | 5286, 4 | 5302 | 571711 | 572745 | OK |
| Lentil | 118 / 118 | 5067, 4 | 6196, 4 | 5996 | 588624 | 578813 | 118 / 118 | 5067, 4 | 6196, 4 | 5996 | 588615 | 578813 | OK |
| Mustard | 118 / 118 | 4906, 5 | 5947, 5 | 6229 | 537653 | 546571 | 118 / 118 | 4906, 5 | 5947, 5 | 6229 | 537648 | 546571 | OK |
| Barley | 118 / 118 | 1256, 2 | 2138, 3 | 2237 | 204362 | 208585 | 118 / 118 | 1256, 2 | 2138, 3 | 2237 | 204350 | 208585 | OK |
| Soyabean | 118 / 118 | 4910, 4 | 3847, 5 | 3912 | 480324 | 486728 | 118 / 118 | 4910, 4 | 3847, 5 | 3912 | 480324 | 486727 | OK |
| Moong | 94 / 101 | 5810, 1 | 6042, 2 | 6636 | 473474 | 550218 | 94 / 101 | 5810, 1 | 6042, 2 | 6636 | 473474 | 550217 | OK |
| Urad | 111 / 111 | 4971, 5 | 5727, 5 | 5693 | 547697 | 542247 | 111 / 111 | 4971, 5 | 5727, 5 | 5693 | 547697 | 542246 | OK |
| Paddy(Dhan)(Common) | 95 / 118 | 1120, 1 | 1801, 3 | 2366 | 156370 | 236271 | 95 / 118 | 1120, 1 | 1801, 3 | 2366 | 156370 | 236271 | OK |
| Maize | 94 / 118 | 1147, 1 | 1676, 3 | 1641 | 194238 | 191820 | 94 / 118 | 1147, 1 | 1676, 3 | 1641 | 194238 | 191820 | OK |
| Garlic | 116 / 118 | 3685, 2 | 3408, 3 | 3768 | 503220 | 590328 | 116 / 118 | 3685, 2 | 3408, 3 | 3768 | 503220 | 590327 | OK |
| Linseed | 113 / 118 | 5110, 2 | 7141, 2 | 7223 | 593207 | 611981 | 113 / 118 | 5110, 2 | 7141, 2 | 7223 | 593207 | 611981 | OK |

## Sanity values (Sagar division, March to May, 2021 to 2025, 15 month points each)

| crop | computed | architect | difference | allowed | status |
|---|---|---|---|---|---|
| Gram | 5090 | about 5091 | -0.02% | rounding | OK |
| Mustard | 5337 | about 5337 | 0.00% | rounding | OK |
| Lentil | 5669 | about 5669 | 0.00% | rounding | OK |
| Wheat | 2127 | about 2113 | 0.66% | 3% (architect left out the Sagar district for wheat) | OK |

## What verify.sql must show after the load (production and staging)

Total rows: **2723** in 6 part files. Months per crop and scope (first month 2016-01 or later, last month never after 2025-10):

| crop | sagar_division months | mp months |
|---|---|---|
| Wheat | 118 (2016-01 .. 2025-10) | 118 (2016-01 .. 2025-10) |
| Gram | 118 (2016-01 .. 2025-10) | 118 (2016-01 .. 2025-10) |
| Lentil | 118 (2016-01 .. 2025-10) | 118 (2016-01 .. 2025-10) |
| Mustard | 118 (2016-01 .. 2025-10) | 118 (2016-01 .. 2025-10) |
| Barley | 118 (2016-01 .. 2025-10) | 118 (2016-01 .. 2025-10) |
| Soyabean | 118 (2016-01 .. 2025-10) | 118 (2016-01 .. 2025-10) |
| Moong | 94 (2016-01 .. 2025-10) | 101 (2016-01 .. 2025-10) |
| Urad | 111 (2016-01 .. 2025-10) | 111 (2016-01 .. 2025-10) |
| Paddy(Dhan)(Common) | 95 (2016-01 .. 2025-10) | 118 (2016-01 .. 2025-10) |
| Maize | 94 (2016-01 .. 2025-10) | 118 (2016-01 .. 2025-10) |
| Garlic | 116 (2016-01 .. 2025-10) | 118 (2016-01 .. 2025-10) |
| Linseed | 113 (2016-01 .. 2025-10) | 118 (2016-01 .. 2025-10) |
