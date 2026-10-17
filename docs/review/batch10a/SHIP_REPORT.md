# Batch 10A — production ship report

**Status: SHIPPED.** Batch 10A is live on https://kissansahyog.com. **No database change** (website only; no migration, no SQL on production).

| Item | Value |
|---|---|
| Shipped commit | `17d77e8` (`17d77e88b9d3b03589cc273893dd4f114b267d2e`, branch `release-10a`). App code = tag `pre-10a-ship` (`020a50a`); the commits on top change only docs and `scripts/ship-prod-10a.sh`. |
| Tag | `prod-10a` → `17d77e8` (pushed to origin) |
| New production deployment | `0845c733-e8d0-4553-957c-10f3db23ecca` (https://0845c733.kissansahyog-prod.pages.dev) |
| Live main chunk | `/assets/index-DRo2-cnt.js` |
| Previous production deployment | `bf4f9479-821b-41a0-b20c-60ce22eb6303` (source `ee3ecfd`, Batch 9, main chunk `/assets/index-Cy1O2hd0.js`) |
| Time | 2026-10-17, ship run stamp `20261017-182316` (started 18:23 local, SHIP OK at ~18:28). Run by the founder: `bash scripts/ship-prod-10a.sh` (once). |
| Logs | `evidence/prod-ship/ship-real-2.log`; gates `evidence/prod-ship/prod-gates-20261017-182316.txt`; build `build-prod-20261017-182316.log`; deploy `deploy-20261017-182316.log` |

## Ship gates (from the log)

| Gate | Status |
|---|---|
| 0 preconditions: branch release-10a, HEAD 17d77e8 = origin, tag pre-10a-ship on origin | RAN-PASSED |
| 1 live deployment before ship = bf4f9479 (expected) | RAN-PASSED |
| 2 live prod matches `evidence/prod-before.json`; fresh snapshot `prod-before-ship.json` | RAN-PASSED (ALL PASSED x2) |
| 3 `npm run build:prod`, 263/263 routes prerendered, 0 failed | RAN-PASSED |
| 4 `wrangler pages deploy` → 0845c733 | RAN-PASSED |
| 5 kissansahyog.com serves the new main chunk | RAN-PASSED |
| 6 `verify-batch9-live.mjs` pages, compare, cors, functions, static, sw, data | RAN-PASSED (79 PASS, 0 FAIL, "ALL PASSED") |
| 6 10A routes /signup, /post, /browse → 200 + `index-DRo2-cnt.js` | RAN-PASSED |
| Verdict | `SHIP OK` — no rollback |

## Post-ship checks (Part 2, read-only)

All 6 groups RAN-PASSED: routes, one-page signup at 412/360 px in Hindi and English, equipment tag chips on Browse, Batch 10A markers in the live JS, an old listing opens, sitemap/robots unchanged. One HUMAN-REVIEW item: tapping a tag filters the page but does not add `etag` to the address bar (the deep link does work). Details: `evidence/prod-live/RESULT.md`.

## Earlier attempt the same day (rolled back)

- 16:38 run (stamp `20261017-163801`) built `0306039` and deployed `60bca777-5d7b-4e0e-9d91-ed62c55498b2`. All site gates passed, but the script's own 10A route check falsely failed /post and /browse: `printf "$body" | grep -q` under `set -o pipefail` hit SIGPIPE (exit 141) on ~77 KB pages (reproduced read-only 38/40 times). The script rolled back automatically to bf4f9479 and its page check passed. Log: `evidence/prod-ship/ship-real.log`, `rollback-20261017-164404.txt`.
- Fix: commit `17d77e8` makes the check use here-strings (`grep -q "$NEW_MAIN" <<<"$body"`). Dry run 3 then ended DRY RUN OK (`evidence/prod-ship/ship-dry-run-3.txt`), and the founder shipped once.

## Manual rollback (if anything looks wrong)

```
bash scripts/rollback-prod-10a.sh bf4f9479-821b-41a0-b20c-60ce22eb6303
```
This only switches the website back to the Batch 9 deployment. There is no database change to undo.
