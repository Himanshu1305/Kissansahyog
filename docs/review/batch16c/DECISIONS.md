# Batch 16C decisions

1. Official data.gov.in feed first, wrapper only as a labelled fallback ("wrapper (fallback)" in the summary): the wrapper answered 429 and its date field is unknown.
2. Date field read from `arrival_date`, `Arrival_Date`, `date` or `price_date` (first present); formats dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd, ISO datetime.
3. Per market the newest record in the last 7 days is written (one row per market, as before); upsert key `commodity_en,market,price_date` unchanged.
4. Future-dated records are skipped too (counted in the skip log).
5. Dry runs also compute the exit verdict (so a dry run with no data exits 1 and says why); the ref guard is ignored in dry runs.
6. Weather failures stay non-fatal; only the mandi verdict (and the ref guard) decide the exit code. Weather still runs when mandi fails.
7. The ref guard runs before any network call. The workflow also fails with a plain message when a target's secret is empty.
8. Season-rain calculation now uses the IST calendar date instead of the runner's UTC date.
9. Secrets are scrubbed from every console line and from the step summary (`redact`).
10. Other workflows (`backfill-mandi-history`, `discover-melas`) not changed; see RECON blast radius.
11. CEDA alternative documented, not built: cannot verify its response from here.
12. A second probe of the official endpoint was blocked by the permission check and was not retried.
13. `public/search-index.json` is rewritten by `npm run build`; it was restored so `src` and `public` stay unchanged.
