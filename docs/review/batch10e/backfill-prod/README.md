# Production backfill — mandi price history (Batch 10E)

Generated 2026-10-18T16:30:06.196Z by `scripts/backfill-mandi-history.mjs --project prod --from-cache …` (no database was
contacted). Exactly the rows that passed validation in the same run that was applied to STAGING.

Source: Agmarknet (DMI, Ministry of Agriculture & Farmers Welfare) via data.gov.in resource
`35985678-0d79-46b4-9ed6-6f13308a1d24` "Variety-wise Daily Market Prices Data of Commodity", https://www.data.gov.in/resource/variety-wise-daily-market-prices-data-commodity — Government Open Data License – India (GODL). Details: `docs/review/batch10e/evidence/backfill-source.md`.

Window: **2026-06-20 … 2026-10-17**. Scope: Madhya Pradesh, Sagar Division (Sagar, Damoh, Panna, Tikamgarh, Chhatarpur, Niwari). Rows: **8625** in **18** files (≤ 500 rows each, ordered by date).

## Order (Supabase dashboard → PRODUCTION project → SQL editor; paste each file, Run)

1. `verify.sql` — note the numbers (read-only).
2. `part-01.sql`
3. `part-02.sql`
4. `part-03.sql`
5. `part-04.sql`
6. `part-05.sql`
7. `part-06.sql`
8. `part-07.sql`
9. `part-08.sql`
10. `part-09.sql`
11. `part-10.sql`
12. `part-11.sql`
13. `part-12.sql`
14. `part-13.sql`
15. `part-14.sql`
16. `part-15.sql`
17. `part-16.sql`
18. `part-17.sql`
19. `part-18.sql`
20. `verify.sql` again.

Each part is one `insert … on conflict (commodity_en, market, price_date) do nothing` in `begin; … commit;`.
Safe to re-run; a part that fails changes nothing (paste it again). It never updates or deletes a row,
so prices the 3-hourly refresh already stored stay as they are.

## Expected after-counts (approximately)

These are the rows in the files per crop. After the run, `verify.sql` (scope `sagar_division`) should show
at least these distinct days for the window; rows can be a little lower than "+ rows" because a
(crop, market, date) the refresh already stored is skipped.

| crop | rows in files | distinct days | first | last |
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
