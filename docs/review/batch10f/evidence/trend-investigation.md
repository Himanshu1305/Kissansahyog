# Batch 10F 3C — why the /msp trend dipped, and the fix

Data: read-only SELECT on STAGING (`wzxtqbqlahyahsnoqqva`), Sagar division rows, last ~95 days, pulled 2026-10-19
(`scripts/batch10f/pull-mandi-90d.mjs` → `staging-mandi-90d.json`, 6,641 rows; public Agmarknet prices, no personal data).
No row was changed or deleted. Analysis: `scripts/batch10f/trend-investigate.mjs` (all crops: `trend-investigation-all.txt`;
wheat 90 days day by day: `trend-investigation-wheat90-daily.txt`), thresholds: `scripts/batch10f/trend-threshold-compare.mjs`
(`trend-threshold-compare.txt`).

## How the daily point was made (10E)
`medianByDate` in `src/lib/mandi/history.js`: for each date, the median modal price of **every mandi that reported that date**.
Mandis report irregularly: a normal weekday has 29–33 wheat mandis, a Saturday or holiday 2–16, a Sunday a handful.
So the point jumps whenever the *set* of mandis changes, even if no mandi's price moved.

## Wheat, 30-day view: the 17 Oct "drop"
| Date | Mandis reporting | Old point (median of whoever reported) |
|---|---|---|
| 14 Oct (Wed) | 30 | ₹2,566 |
| 15 Oct (Thu) | 29 | ₹2,560 |
| 16 Oct (Fri) | 30 | ₹2,565 |
| **17 Oct (Sat)** | **16** | **₹2,526** |

Same mandis, 16 → 17 Oct (14 reported both days): Ajaygarh 2,600→2,550, Badamalhera 2,620→2,526, Damoh 2,515→2,510,
Harpalpur 2,700→2,715, Hata 2,410→2,520, Kesli 2,620→2,610, Khargapur 2,535→2,600, LavKush Nagar 2,550→2,510,
Panna 2,516→2,534, Rajnagar 2,500→2,500, Rehli 2,605→**2,210**, Shahagarh 2,600→2,495, Simariya 2,560→2,525,
Tikamgarh 2,660→2,680. **Median change of the same mandis: −₹5.** Only on 17 Oct: Malthone ₹2,510, Sagar ₹2,680.
The 30-day sentence said "₹44 down in 30 days" because the window ended on that thin Saturday.

## Wheat, 90-day view: the 15 Aug spike
15 Aug (Independence Day): **2 mandis** reported, median **₹3,263** (14 Aug: 36 mandis, ₹2,523; 17 Aug: 31 mandis, ₹2,535).
16 Aug: 4 mandis. **Same cause.**

## Other crops (30 days; old → new end point; full table in `trend-investigation-all.txt`)
| Crop | Mandis | Stable basket | Old first → last | New first → last |
|---|---|---|---|---|
| Wheat | 35 | 25 | 19 Sep ₹2,570 → 17 Oct ₹2,526 (−44) | 21 Sep ₹2,559 → 16 Oct ₹2,560 (+1) |
| Gram | 29 | 14 | ₹6,045 → ₹6,800 (+755) | ₹6,180 → 16 Oct ₹6,905 (+725) |
| Mustard | 24 | 7 | ₹7,130 → ₹7,900 (+770) | ₹7,265 → 17 Oct ₹7,800 (+535) |
| Soyabean | 21 | 6 | ₹5,600 → ₹6,500 (+900) | ₹5,448 → 16 Oct ₹6,745 (+1,297) |
| Urad | 20 | 10 | ₹6,000 → ₹6,975 (+975) | ₹6,303 → 16 Oct ₹6,500 (+197) |
| Lentil | 18 | 7 | ₹6,253 → ₹6,015 (−238) | ₹6,750 → 16 Oct ₹6,120 (−630) |
| Maize | 13 | 1 → few | unchanged (plain median, "कम मंडियों का भाव") | |
| Moong | 13 | 2 → few | unchanged (plain median, labelled) | |
| Paddy | 5 | 0 → few | unchanged (plain median, labelled) | |
| Garlic (no MSP, no trend section) | 6 | 1 → few | — | |

## The fix (`src/lib/mandi/basket.js`, used by /msp for the chart, the sentence, the calculator note and the WhatsApp text)
1. Window days = dates inside the window with at least one price.
2. Stable basket = mandis that reported on ≥ 60 % of those days.
3. Daily value = median of the basket mandis that reported that day; the day is **skipped** when fewer than **⅔** of the
   basket reported (the line goes straight from the day before to the day after; no value is made up).
4. Fewer than 3 stable mandis → plain daily median, and the chart says "कम मंडियों का भाव" / "Based on few mandis".
Each point keeps the number of mandis it is based on (tooltip "N मंडी").

Why ⅔ and not ½ (the brief's number): with ½, 17 Oct still passes (13 of 25 basket mandis) and still shows ₹2,526.
Error of each day-to-day step against the like-for-like change of the same mandis, mean / worst (`trend-threshold-compare.txt`):
wheat 30 d old 11 / 32 → ½ 10 / 27 → **⅔ 9 / 20**; wheat 90 d old 14 / 70 → **⅔ 9 / 30**; Urad 30 d old 360 / 1,343 → ½ 276 / 658 → **⅔ 225 / 452**;
Mustard 30 d old 268 / 1,000 → **⅔ 114 / 410**. ¾ removes many more days (e.g. Soyabean 90 d 61 → 45 points) for little gain.
Exception: **Lentil** is worse with any basket (mean 161 → 227 at 30 d): its few stable mandis sit at very different price
levels. Kept one rule for all crops (BACKLOG).

## Result (real staging data)
- Wheat 30 days: last point **before 17 Oct ₹2,526**, **after 16 Oct ₹2,560** (17 Oct skipped: 13 of 25 basket mandis).
  Sentence "₹44 down" → "₹1 up" (21 Sep ₹2,559 → 16 Oct ₹2,560).
- Wheat 90 days: 15 Aug (₹3,263, 2 mandis) and 16 Aug (4 mandis) no longer plotted; highest point now < ₹2,700.
- Unit tests: `tests/unit/mandi-basket.test.mjs` (synthetic spike/dip, real-data wheat assertions above).
