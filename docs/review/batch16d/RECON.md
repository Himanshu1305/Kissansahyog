# Batch 16D recon

## FIRST: what could not be done
**`DATA_GOV_IN_API_KEY` is not in `.env`** (also not in `.env.production`, `.env.example` or the shell). Rule 2 says stop the live phases when it is missing and do not use the shared demo key. So **Phase 0 items 1, 2, 3 and the keyed dry run in Phase 3 were NOT run.** The question "does resource 35985678 have division prices newer than 17 Oct, and how many days behind?" is therefore **still unanswered**. Add `DATA_GOV_IN_API_KEY=...` to `.env` and run the one command at the bottom to answer it in about 3 minutes. Nothing was written anywhere.

## What was proven without the key
- **This laptop reaches data.gov.in.** A request with no key to `api.data.gov.in/resource/35985678-...?limit=1` returned HTTP 400 `{"error":"Authorization field missing"}`. So DNS, TLS and the host work from here; only a key is missing.
- **The third-party wrapper is stale** (only source usable without a key). Dry run with `--days 14` on 25 Oct: 69 rows, newest `2026-10-16`, nine days old. Gram, Lentil, Moong, Urad, Paddy returned nothing. This matches the 16C finding and shows the wrapper cannot be the daily source.

## Why GitHub saw "fetch failed" (what I can and cannot prove)
- Cannot prove: I could not reproduce the exact `9ef84268` request (needs the key), so the GitHub failure stays unexplained. "GitHub is blocked by data.gov.in" is not proven; a laptop reaches the host fine.
- Proven: the old code hid the reason. Node's `fetch` puts the real reason (for example `ENOTFOUND`, `ECONNRESET`, `UND_ERR_CONNECT_TIMEOUT`) in `error.cause`, and `refresh-data.mjs` printed only `e.message`, which is always "fetch failed". **Fixed:** every network error now prints name, message, `cause` code and HTTP status through `describeError()`, with the key masked (tested). The next GitHub run will say the real reason.
- Also new: the step "Reach data.gov.in" prints just the HTTP status of one tiny request, so the founder can see in one line whether GitHub can reach the new source.

## Homepage "Today's price: Wheat" (2,210) vs the strip (Sagar, 2,680)
Two different questions on the same table, `mandi_prices`, same date:
- **Strip** (`src/components/MandiTicker.jsx` > `tickerRows`): one row per crop. It prefers a Sagar-division market, then the market named Sagar, then the biggest arrivals. So it shows Sagar's own wheat price.
- **Homepage tile** (`src/lib/today/forFarmer.js` > `pickCrop` > `mandiOf`): takes the FIRST wheat row of the day in the list that `fetchMandiPrices` returns, and that list is sorted division-first and then by `modal_price` **ascending** (`src/lib/mandi/mandiApi.js` `pricesFor`). So the tile shows the **cheapest** division market's wheat price, not Sagar's. The tile says "Today's price" with no market name, so the two numbers look like a contradiction when they are two different mandis (one lowest, one Sagar). Not changed in this batch (rule: no `src/` change); a one-line fix is to pick the Sagar row, or label the tile "lowest in division". For the architect to decide.

## Fallback if 35985678 works on a laptop but is red on GitHub (five lines)
1. Add a Supabase Edge Function `refresh-mandi` (Deno), in the Mumbai region, that runs the same plan and mapping as `scripts/lib/mandi-daily.mjs`.
2. Store `DATA_GOV_IN_API_KEY` as an Edge Function secret; the service role key is already available inside the function.
3. Schedule it with `pg_cron` + `pg_net` once a day (for example 07:30 IST), per project (production and staging).
4. Keep GitHub Actions only for the weather and for a read-only check that fails loudly when the newest `price_date` is old.
5. Cost: the code is shared (pure module), but Deno needs a copy of the fetch loop; about half a day of work, plus one secret per project.

## What changed in the code
- `scripts/lib/mandi-daily.mjs` (new, pure): day window, request plan, paging rule, mapping/validation (10E helpers reused), fallback runner, write policy, safe error text, "normal or red" note.
- `scripts/refresh-data.mjs`: primary 35985678, then 9ef84268, then wrapper, per crop; demo key removed; error causes logged; writes split into upsert (last 2 days) and insert-if-absent (older); `--days` / `MANDI_DAYS`.
- `scripts/lib/mandi-feed.mjs`: the per-crop summary line also shows the source.
- `.github/workflows/refresh-mandi-prices.yml`: `days` input, "Reach data.gov.in" step.

## Dry-run output (no key, so wrapper only), `--dry-run --days 14`, 25 Oct 2026
```
- source used: wrapper (fallback)
- rows written: 69 (Sagar-division rows: 69)    <- "would write"; nothing was written
- newest price_date: 2026-10-16
- Wheat 29, Soyabean 15, Maize 9, Mustard 15, Garlic 1 (all via wrapper, newest 2026-10-16)
- Gram, Lentil, Moong, Urad, Paddy: 0 rows
- reading: RED: the newest price is 9 days old (limit 3).
- result: FAILED - newest price_date written (2026-10-16) is more than 3 days old
```
This is the correct red result. The keyed run is still to do:

## To finish Phase 0 and 3 (needs the key in `.env`)
```
node --env-file=.env scripts/refresh-data.mjs --dry-run --days 14
```
It opens no database connection. Look at: "source used", each crop's newest date, and the lag in the "reading" line. If the newest date for 35985678 is still 17 Oct or older, the government source itself is stale; tell the architect.
