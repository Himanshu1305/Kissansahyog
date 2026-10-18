# Batch 10D — putting the live homepage on kissansahyog.com

Production has NOT been changed. Batch 10D has **no database change** (website code only).
Batch 10C is already live and closed (tag `prod-10c`, deployment `7f5dc56a-9d1c-4bd2-8bde-a4512a96be20`).

## Step 1 — staging (DONE)

The upload to staging worked this time:

```
node --env-file=.env scripts/check-staging-env.mjs && npm run build:full && node --env-file=.env scripts/check-staging-env.mjs --dist && npx wrangler pages deploy dist --project-name kissansahyog --branch main --commit-dirty=true
```

- Staging deployment: **`af949ffd-b49b-4312-97a9-c8df6c49b1a3`** (built from `e267c46`; main chunk `/assets/index-DfikRbEu.js`). Staging now holds 10C + 10D.
- Open on your phone: **https://staging.kissansahyog.com**
- Re-tested on staging: `e2e/home-10d.spec.js` **32/32 passed** (`evidence/staging-deploy/e2e-home-10d-staging.txt`). Slow phone on staging (real network): LCP median 6.4 s (the H1), CLS 0, farmer photo not loaded on phones; during auto-play no task over 300 ms (longest 76 ms) (`evidence/staging-deploy/perf-staging*.json`).

## Step 2 — production (founder runs it, after looking at staging)

```
git checkout release-10d && git pull
bash scripts/ship-prod-10d.sh --dry-run     # changes nothing; must end with "DRY RUN OK" and no "Pending" lines
bash scripts/ship-prod-10d.sh 2>&1 | tee docs/review/batch10d/evidence/ship-real.log
```

Undo (manual rollback) if anything looks wrong later:

```
bash scripts/rollback-prod-10d.sh 7f5dc56a-9d1c-4bd2-8bde-a4512a96be20
```

## What the ship script does (copy of the 10C script, changes only)

| Step | Change for 10D |
|---|---|
| G (new, first) | Refuses to run unless tag `prod-10c` is on origin AND `https://kissansahyog.com/guide` answers 200 (10C must be shipped and closed first). |
| 0 | Branch `release-10d`, tag `pre-10d-ship` = HEAD, pushed; snapshot `docs/review/batch10d/evidence/prod-before.json` (read-only, taken while preparing 10D). |
| 1 | The live deployment must be `7f5dc56a-9d1c-4bd2-8bde-a4512a96be20` (Batch 10C). If someone changed production since, it stops; after checking: `KS_EXPECT_LIVE_ID=<live id> bash scripts/ship-prod-10d.sh`. |
| 3 | `build:prod`; prerender 268/268; `dist/index.html` must carry `home-live` and `home-field`; a `LiveStage-*.js` chunk; the 10C markers (`nav-guide`, guide chunks with `ksg-`). |
| 5 | Compare gate: `/` and `/browse` may grow up to +40% (the new hero, band and facts; same-mode builds measured +20%, about +26% live); every other page keeps the old limits; title and h1 must stay the same. |
| 6 | After the deploy: `/`, `/signup`, `/browse`, `/guide` answer 200 with the new build; `/` carries `home-live`, `home-field`, `nav-guide`; the LiveStage chunk answers 200. |
| 7 | Any failure → automatic `bash scripts/rollback-prod-10d.sh 7f5dc56a-…`. |

The here-string form `grep -q "$X" <<<"$body"` is kept. The token is never printed.

## Status

- `bash -n` of both scripts: RAN-PASSED.
- `bash scripts/ship-prod-10d.sh --dry-run`: RAN-PASSED, `DRY RUN OK` (`evidence/ship-dryrun.txt`, taken before the final commit/tag; at that time it listed as pending: commit the 2 changed files, create the tag, push). Re-run after tagging: see the final summary of this run / `evidence/ship-dryrun-final.txt` (not committed, because committing it would move HEAD past the tag).
- `bash scripts/rollback-prod-10d.sh --dry-run 7f5dc56a-…`: RAN-PASSED (`evidence/rollback-dryrun.txt`).
- Real production ship: NOT-RUN (founder runs it).
