# Things for the founder, KVK Sagar and Shri A.K. Dixit to confirm

How to approve an item: open the file named below, find the item, change `"reviewed": false` to `"reviewed": true` (or `"verified": true` for schemes, festivals, MSP and procurement windows), save. Until then it is never used in a normal run (only in `--draft`, which prints a warning).

## A. Thresholds (data/morning/work-rules.json) - please confirm with KVK Sagar
| rule | fires when | tasks shown |
|---|---|---|
| rain | rain chance 50% or more, OR rain 5 mm or more | hold spraying till tomorrow; cover cut crop and grain; keep the drain clear |
| wind | wind 25 km/h or more | do not spray in strong wind |
| hot and dry | max temperature 35 C or more AND rain chance below 20% | check moisture in irrigated fields |
| cold | min temperature 6 C or less | watch for frost: cover young crop and nursery |
| sowing season | 1 Oct to 15 Nov (the site's kam-pani banner date), or whenever no other rule fired | check moisture in fields to be sown |

Other limits (scripts/morning/lib/mandi.js): a crop needs prices from at least 3 mandis; a one-day move above 15% or a price outside 0.5x to 2x of the 30-day median is held back as "suspect data"; up to 4 crops; data up to 3 days old is used and labelled.

## B. Content not yet reviewed (never used without --draft)
- `data/morning/gyaan.json` - 12 plain explainers ("मंडी का ज्ञान", Thursday): g01 to g12, all `reviewed:false`. Please check each one for accuracy and simple wording (g08 lists the six Sagar division districts; confirm).
- `data/morning/tips.json` - 4 money-saving facts ("आज की बचत", Wednesday), each tied to content already on the site (the file path is in `site_ref`): tip-moisture, tip-kvk, tip-compare, tip-past.
- `data/morning/scheme-calendar.json` - PM-KISAN, PMFBY, Kisan Credit Card entries are `verified:false`: the official pages could not be opened in this build, so there is no verified deadline or eligibility text. Fill `deadline` (YYYY-MM-DD or null) and `verified:true` only after reading the official page.
- `data/morning/festivals.json` - empty. Add `{date, name_hi, source_url, verified:true}` per festival after checking an authoritative calendar.
- `data/morning/procurement-windows.json` - empty. Add `{crop, state, start, end, source_url, verified:true}` only when the state announces a procurement window.
- `data/morning/lines.json` - blessing lines are marked reviewed (simple blessings). `kahawat` is empty: add weather sayings only with a published source.
- `data/morning/polls.json` - 12 poll questions and their season date ranges: please read them.

## C. MSP values to confirm against PIB (data/morning/msp-reference.json)
The PIB pages would not open for the builder (HTTP 403). Values came from DD India, Akashvani and Tribune, which agree. Kharif 2026-27: paddy 2441, soyabean 5708, moong 8780, urad 8200, maize 2410. Rabi 2026-27: wheat 2585, gram 5875, lentil 7000, mustard 6200. Please check them on pib.gov.in; set `verified` to false for any you doubt.

## D. Known data problems (not changed here)
- The `msp_prices` table is stale and duplicated; mustard shows 5950 where the official 2026-27 value is 6200. The generator does not use that table.
- No fresh Sagar-division mandi prices in the database since 17 October (see RECON.md): the mandi part will say "आँकड़े अभी नहीं आए" until the price feed is fixed.
- Weather: Open-Meteo free tier is not cleared for production use (see RECON.md).
