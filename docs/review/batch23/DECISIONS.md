# Batch 23 - decisions (plain words)

Everything below lives in ONE small file, `src/lib/mandi/pickRule.js`. The homepage strip, the homepage price tile, `/msp` (all-crops table and the per-crop table), the daily watchdog and the morning post's mandi count all read it, so they cannot drift apart again.

## 1. Which DATE is shown
- "Today" means today in India (IST, via `Intl` / `Asia/Kolkata`), never UTC and never the visitor's own clock. Between 00:00 and 05:30 IST the old code still thought it was yesterday; that bug is gone.
- Look at today and the 7 days before it. Pick the **newest day that has decent coverage**: **at least 3 different mandis AND at least 5 of the 10 tracked crops** with a real price.
- The 10 tracked crops (from `src/content/crops.js`): wheat, soybean, chana (gram), masoor (lentil), moong, urad, dhan (paddy), maize, mustard, garlic.
- If no day in those 8 days is decent, take the newest day that has any rows and mark it **stale**.
- Rows dated after today are ignored.

## 2. Which LABEL
| The price is dated | Hindi | English |
|---|---|---|
| today (IST) | आज का भाव | Today's price |
| yesterday (IST) | कल का भाव (dd/mm) | Yesterday's price (dd/mm) |
| older | पिछला भाव (dd/mm) | Previous price (dd/mm) |

dd/mm is always the real date of the data. A crop with no price on the chosen day shows **its own** last price with **its own** date (never mixed under the others' date).

## 3. Which MANDI for a crop (the same on every page, every load)
1. A mandi of Sagar Division first: districts Sagar, Damoh, Tikamgarh, Chhatarpur, Panna, Niwari (a row also counts when the database's own "in Sagar Division" flag is true).
2. Then the mandi with the larger `arrivals_tonnes` (missing or null counts as 0).
3. Then the lowest mandi name, A to Z (final tie-break).
Every database read now has an explicit sort, so nothing depends on the order Postgres happens to return rows in.

**Honest note on `arrivals_tonnes`:** the column exists (migration 0024) but production has **no values in it** (0 of 1,000 recent rows). Rule 2 is therefore built and tested but does nothing today, and the pick falls to rule 3: the alphabetically first mandi (for chana that is Ajaygarh). That is deterministic and the same on every page, but it is not "the most representative mandi". See the open question in the report. I did not add the column to the selects because it is empty.

The old rule "Sagar town first" (the strip's `normMarket === 'sagar'` step) was **removed** because the batch brief did not list it. If you want it back it is one line in `compareMandi`.

## 4. Names next to prices
The homepage strip, the `/msp` all-crops table and the per-crop table all show the mandi name next to the price (Hindi names from `marketNames.js`).

## 5. The static (prerendered) HTML
Built at deploy time, so it can be days old by the time anyone reads it. It now carries **no price, no price date and no "आज / कल / पिछला भाव" claim**: the homepage strip, the homepage price tile, the `/msp` all-crops table, the per-crop price table and the "today vs 5-year" number show a neutral "आज का भाव देखें / See today's price" in a box of the same size. The live app fills in the real, dated, labelled prices after it loads. What stays: dated history charts (each with its own explicit date range), 5-year monthly averages (labelled by month/year), MSP values, FAQ and JSON-LD.

## 6. The watchdog (GitHub job "Refresh Mandi Prices", production)
RED when any of these is true:
1. there are no price rows, or the newest price date (IST) is older than yesterday;
2. yesterday (IST, the last full day) has fewer than 3 mandis or fewer than 5 of the 10 crops - **except** a Sunday or a day in `PUBLIC_HOLIDAYS_IST` (empty list in `pickRule.js`, the founder fills it), which is only a warning while at least 1 mandi and 1 crop reported;
3. nothing was written to `mandi_prices` (`fetched_at`) in the last **12 hours** (the 3-hourly cron is stuck). Skipped, with a note, if `fetched_at` cannot be read.
The job summary shows a small table (date, rows, mandis, crops) for the last 5 days, and `::error::` / `::warning::` lines carry the reason into the failure e-mail. The staging job has `continue-on-error: true` while staging storage is being fixed.

## 7. The morning post
Its own date choice (yesterday first, up to 2 days back, per-crop 3-mandi minimum) is **unchanged on purpose**: its message must not change. It now imports `MIN_MANDIS` from the shared file. The generated `message.txt` and `poll.txt` are byte-identical before and after (`evidence/morning-before-after.txt`).

## 8. One decision the founder may want to change: the 5-crop threshold
With the thresholds as specified (3 mandis, 5 crops) the real Sunday **22 Nov** (17 mandis, **6 crops**) and Sunday 15 Nov (10 mandis, **5 crops**) count as decent, so on those Mondays the strip still shows Sunday's prices ("कल का भाव (22/11)"), not Saturday's. With **7 crops** the Mondays 16 and 23 Nov show Saturday with Saturday's real date, and every normal weekday is unchanged (a real Friday had 9 crops). `evidence/replay-pick-whatif-mincrops7.txt` shows this. It is a one-number change (`MIN_CROPS` in `pickRule.js`, the watchdog follows automatically); I left it at 5 because the brief says 5.
