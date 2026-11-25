# Batch 23 - decisions (plain words)

Everything below lives in ONE small file, `src/lib/mandi/pickRule.js`. The homepage strip, the homepage price tile, `/msp` (all-crops table and the per-crop table), the daily watchdog and the morning post's mandi count all read it, so they cannot drift apart again.

## 1. Which DATE is shown
- "Today" means today in India (IST, via `Intl` / `Asia/Kolkata`), never UTC and never the visitor's own clock.
- Look at today and the 7 days before it. Pick the **newest day with decent coverage**: **at least 3 different mandis AND at least 7 of the 10 tracked crops** with a real price (`MIN_MANDIS = 3`, `MIN_CROPS = 7`). 7 was chosen so a thin Sunday (real ones had 5 and 6 crops) is skipped and Monday shows Saturday, while a normal weekday (real lowest: 9 crops) always passes.
- The 10 tracked crops (from `src/content/crops.js`): wheat, soybean, chana (gram), masoor (lentil), moong, urad, dhan (paddy), maize, mustard, garlic.
- If no day in those 8 days is decent, take the newest day that has any rows and mark it **stale**. Rows dated after today are ignored.
- The watchdog has its OWN, lower floor (3 mandis, 5 crops: `WATCHDOG_MIN_MANDIS`, `WATCHDOG_MIN_CROPS`). Both pairs sit in `pickRule.js` with a comment: the display bar chooses a nice day, the watchdog bar only catches breakage.

## 2. Which LABEL
| The price is dated | Hindi | English |
|---|---|---|
| today (IST) | आज का भाव | Today's price |
| yesterday (IST) | कल का भाव (dd/mm) | Yesterday's price (dd/mm) |
| older | पिछला भाव (dd/mm) | Previous price (dd/mm) |

dd/mm is always the real date of the data. A crop with no price on the chosen day shows **its own** last price with **its own** date (never mixed under the others' date).

## 3. Which MANDI for a crop (the same on the homepage and /msp, every load)
For one crop on the chosen date, first match wins (the function also returns which step chose it):
- **a** - the mandi nearest the visitor's device location: **not used**. No such logic exists for the strip or the /msp all-crops table (the nearest-mandi ranking only orders the long per-crop table), so this step never fires.
- **b** - the **Sagar town mandi** ("Sagar APMC", the repo's own notion from the old strip pick), if it reported that crop that day. ("Sagar(F&V) APMC" is a different market and does not count.)
- **c** - else, among the Sagar-division mandis that reported it (districts Sagar, Damoh, Tikamgarh, Chhatarpur, Panna, Niwari, or the database's "in Sagar Division" flag), the mandi with the **median price**. Even count: the lower of the two middle prices. Several mandis at that price: the lowest name.
- **d** - else (no division mandi reported it), the median-priced mandi among all that reported, same tie rules.
`arrivals_tonnes` is not used (empty in production). Every database read has an explicit sort.

## 4. Names next to prices
The homepage strip, the `/msp` all-crops table and the per-crop table all show the mandi name next to the price (Hindi names from `marketNames.js`).

## 5. The static (prerendered) HTML
Built at deploy time, so it can be days old by the time anyone reads it. It now carries **no price, no price date and no "आज / कल / पिछला भाव" claim**: the homepage strip, the homepage price tile, the `/msp` all-crops table, the per-crop price table and the "today vs 5-year" number show a neutral "आज का भाव देखें / See today's price" in a box of the same size. The live app fills in the real, dated, labelled prices after it loads. What stays: dated history charts (each with its own explicit date range), 5-year monthly averages (labelled by month/year), MSP values, FAQ and JSON-LD.

## 6. The watchdog (GitHub job "Refresh Mandi Prices", production)
Checks:
1. no price rows, or the newest price date (IST) is older than yesterday;
2. yesterday (IST) has fewer than 3 mandis or fewer than 5 of the 10 crops - a Sunday or a day in `PUBLIC_HOLIDAYS_IST` (empty list, the founder fills it) is only a warning while at least 1 mandi and 1 crop reported;
3. nothing was written to `mandi_prices` (`fetched_at`) in the last 12 hours. Skipped, with a note, if `fetched_at` cannot be read.

**Grace:** checks 1 and 2 give only a `::warning::` when the run starts **before 14:00 IST** (hour computed in IST from the clock, not the runner's zone) and **fail from 14:00 IST on**. Check 3 fails at any hour. The cron runs at minute 17 of every even UTC hour = 05:47, 07:47, 09:47, 11:47, 13:47, **15:47**, 17:47, 19:47, 21:47, 23:47, 01:47, 03:47 IST. So five runs a day (15:47, 17:47, 19:47, 21:47, 23:47 IST) fall after 14:00 IST and can fail. GitHub often starts scheduled runs late, which only moves them later. No schedule change is needed. The job summary shows the last 5 days (date, rows, mandis, crops).

## 7. The morning post
Its own date choice (yesterday first, up to 2 days back, per-crop 3-mandi minimum) is **unchanged on purpose**: its message must not change. It now imports `MIN_MANDIS` from the shared file. The generated `message.txt` and `poll.txt` are byte-identical before and after (`evidence/morning-before-after.txt`).

## 8. Decided by the founder (this round)
`MIN_CROPS = 7` for choosing the display date (was 5). Replay on real production rows: the Mondays 16 and 23 Nov show **Saturday** with Saturday's real date ("पिछला भाव (14/11)" and "(21/11)"); every weekday is unchanged. Step counts per day (b / c / d) are in `evidence/replay-pick.txt`: step d never fires in real data, step b (Sagar APMC reported) covers 6-8 of 10 crops, step c the rest.
