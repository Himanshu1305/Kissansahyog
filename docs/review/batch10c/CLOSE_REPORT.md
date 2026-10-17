# Batch 10C — close report

**Status: SHIPPED-AND-VERIFIED**

| | |
|---|---|
| Shipped commit | `40ddc4d` (`40ddc4db7371b495efd04309d027e7f2d0a7932f`), branch `release-10c` |
| New production deployment | `7f5dc56a-9d1c-4bd2-8bde-a4512a96be20` (https://7f5dc56a.kissansahyog-prod.pages.dev) |
| Previous production deployment | `0845c733-e8d0-4553-957c-10f3db23ecca` (commit `17d77e8`) |
| Shipped | 2026-10-18, run started 03:57:51 IST (`ship-prod-10c.sh`, log `evidence/ship-real.log`, ended `SHIP OK`) |
| Live main chunk | `/assets/index-NFbe6Fk2.js` (same as the ship log) |
| Tag | `prod-10c` → `40ddc4d`, pushed |
| Database | **No database change** in Batch 10C. Nothing was written to production during this close. |

## Checks (details: `evidence/prod-live/RESULT.md`)
- RAN-PASSED: 0.1 ship log, 0.2 live deployment, 1.1 pages (13 pages × Hindi/English × 360/412 px + NotFound), 1.2 hub + all four demos (Watch and Try-it), 1.3 register demo has no OTP, 1.4 entry points + Signup typed-data/Back check, 1.5 Browse tag chips, 1.6 new code markers live, 1.7 old listing page, 1.8 sitemaps and robots.txt.
- RAN-FAILED (targets only, no rollback): 1.9 slow phone — `/guide` usable in 4.5 s (target 4 s), longest task 345 ms on `/guide/find` (target 300 ms). All demos played through.

## HUMAN-REVIEW
1. Prerendered HTML has preload links to `http://localhost:4178/...` that the security policy blocks (pre-existing since before 10C; also on `0845c733`). Console errors on every page, and the browser cannot preload page chunks. Fix belongs in `scripts/prerender.mjs`.
2. Slow-phone targets missed on production (numbers above).
3. Hindi caption wording awaits founder review: `docs/review/batch10c/HINDI_CAPTIONS.md`.

## Undo
```
bash scripts/rollback-prod-10c.sh 0845c733-e8d0-4553-957c-10f3db23ecca
```
