# Batch 23 - notes for the NEXT batch: which `scripts/ship-prod-22.sh` checks would fail on this build

`scripts/ship-prod-22.sh`, `ship-prod-20.sh` and `rollback-prod-22.sh` were **not edited** (rule of this batch). The next batch writes `ship-prod-23.sh` as a copy of `ship-prod-22.sh` with the changes below. Method: I built production style (`npm run build:prod`, 278 routes) and compared the new `dist` with the previous local build (which is the same as what is live now) and read the script line by line.

New build facts: `/` is 105,039 bytes (was 113,324, ratio 0.927); `/msp` is 90,595 bytes (was 123,043, ratio **0.736**); `/msp/<crop>` pages are about 89,000 bytes (were 103,000-110,000). `dist/msp/index.html` no longer contains `ks-date-badge`, any `कल का भाव` / `पिछला भाव`, or a baked price date. The `ks-date-badge` class is still in the JS chunk `dist/assets/Msp-*.js`.

| # | Gate in ship-prod-22.sh | Line(s) | On the new build | What it should become in ship-prod-23.sh |
|---|---|---|---|---|
| 1 | **`dist_markers`**: `grep -q "$BADGE_MARKER" dist/msp/index.html` (the "last-price badge in the prerendered /msp") | ~469 | **FAILS** ("MISSING: ks-date-badge in dist/msp/index.html") and stops the ship before any deploy | Replace by: `dist/msp/index.html` contains `data-testid="snapshot-placeholder"` AND contains none of `कल का भाव`, `पिछला भाव`, `ks-date-badge`. Keep the chunk check below. |
| 2 | **`dist_markers`**: the badge class must be in a JS chunk (`BADGE_CHUNKS`) | ~388, 407, 417 | passes (`Msp-*.js` holds it) | keep as is |
| 3 | **post-deploy `[10f_msp]`**: `GET /msp` must be 200, new main chunk AND contain `ks-date-badge` | ~562-565 | **FAILS** after deploy (and would trigger the automatic rollback) | Replace the badge test by `data-testid="snapshot-placeholder"`, keep "new main chunk". |
| 4 | post-deploy `[10f_msp]` badge chunk fetch (`GET $a` holds `ks-date-badge`) | ~692 | passes | keep |
| 5 | **Compare gate sizes** (`predeploy-size-check.mjs` before the deploy and `verify-batch9-live.mjs --checks compare` after): `HOME_SHRINK='root=0.70,browse=0.70'` (everything else has the default floor 0.85) | 112-117, 510, 535 | `/` 0.927 and `/browse` (served the homepage html) 0.927: **pass**. `/msp` 0.736: **FAILS** the default 0.85 floor (and the script only accepts floors from 0.5 to 0.85) | `HOME_SHRINK='root=0.70,browse=0.70,msp=0.60'`. Re-measure against the live snapshot taken at ship time. The growth limits (`HOME_GROWTH`) can go back to the default for `/msp`. |
| 6 | Compare gate: title and h1 unchanged, no ErrorBoundary, for `/`, `/msp`, `/browse` ... | 354 | pass (title, h1 and text outside the price blocks are unchanged) | keep |
| 7 | **`data` gate** (`verify-batch9-live.mjs --checks data`): the strip on `/` must show `₹` + a number within 30 s of loading | ~387 | should pass, **but now it truly proves the live app fills the strip** (the static HTML has no `₹` in the strip), so a broken price read is no longer hidden by baked-in prices. Needs production read access from the browser (normal). | keep; note in the ship text that this is the real test of the new code. |
| 8 | Prerender route floor `MIN_ROUTES` (`prerender_check`) | 37-38 | passes: 278/278 routes, 0 failed (one `/` "fallback, no marker", as before) | keep 278 |
| 9 | All other markers (`nav-guide`, hero markers, removed-10D markers, footer line, WhatsApp channel link, guide/sign-up/Mitra chunks, OTP/listing markers, 17x/19/20/22 route checks, DB function gate) | 80-130, 380-500 | checked the homepage ones on the new dist: all still present; the rest is untouched code | keep |
| 10 | `GATE_TAG` first gate ("Batch 20 live, tag ship-20") | 40, 141 | not related to this batch | change to the tag of the previous live ship (Batch 22) in the new script |

Also for the next batch:
- **No database step.** Batch 23 has no migration; the ship is a site deploy only. The GitHub workflow change (`refresh-mandi-prices.yml`) only takes effect when it is on `main` (GitHub runs `schedule` only from the default branch).
- After the deploy, view-source of `/` and `/msp` must show no old price date; `curl -s https://kissansahyog.com/ | grep -c "कल का भाव"` must print 0.
- `MIN_CROPS` is decided: 7 (`DECISIONS.md` section 8).
- The watchdog now has a 14:00 IST grace (warning before, failure from 14:00 IST), so early-morning runs cannot fail on a late feed. The first run that can fail is 15:47 IST.
- `/msp` size: re-measure after the final build (see the numbers at the top; the median pick did not change page sizes materially).
