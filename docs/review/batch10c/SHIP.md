# Batch 10C — putting the Guide on kissansahyog.com

Production has NOT been changed. Batch 10C has **no database change** (website code only), so there is no SQL step.

## Step 1 — staging first (needed: the AI was not allowed to run this)

The staging build is done and checked (268/268 pages, staging guard OK), but the upload to staging was
blocked by Claude Code's permission system (it treats `wrangler pages deploy … --branch main` as a production
deploy, although the project `kissansahyog` is staging). Run it yourself (Git Bash), exactly as in Batch 10A:

```
cd ~/projects/Kissansahyog
git checkout release-10c
git pull
node --env-file=.env scripts/check-staging-env.mjs && npm run build:full && node --env-file=.env scripts/check-staging-env.mjs --dist && npx wrangler pages deploy dist --project-name kissansahyog --branch main --commit-dirty=true
```

Then open https://staging.kissansahyog.com/guide on your phone. If you want, ask Claude Code to re-run the
guide tests against staging and record the deployment id (`npx wrangler pages deployment list --project-name kissansahyog`).

## Step 2 — production (founder runs it)

```
bash scripts/ship-prod-10c.sh --dry-run     # changes nothing; must end with "DRY RUN OK"
bash scripts/ship-prod-10c.sh 2>&1 | tee docs/review/batch10c/evidence/ship-real.log
```

Manual rollback, if anything looks wrong later:

```
bash scripts/rollback-prod-10c.sh 0845c733-e8d0-4553-957c-10f3db23ecca
```

## What the ship script does

Same steps as Batch 10A (`docs/review/batch10a/SHIP.md`), with these changes:

| Step | Change for 10C |
|---|---|
| 0 | Branch `release-10c`, tag `pre-10c-ship` (on `3b619d0`, pushed), snapshot `docs/review/batch10c/evidence/prod-before.json` (read-only, taken 2026-10-18 while preparing 10C). |
| 1 | The live deployment must be `0845c733-e8d0-4553-957c-10f3db23ecca` (Batch 10A, source `17d77e8`); a real run stops if not. |
| 3 | Prerender must report **268/268** (5 new `/guide` pages). The build must contain the guide chunks `GuideHub-*.js` and `GuideDemoPage-*.js` holding the guide code (marker `ksg-`), and `dist/index.html` must carry the top-bar Guide pill (marker `nav-guide`). Otherwise it stops before deploying. |
| 6 | After the deploy: `/`, `/signup`, `/browse`, `/guide`, `/guide/register`, `/guide/post`, `/guide/find`, `/guide/tour` must answer 200 with the new build; the guide chunks must answer 200 with `ksg-` inside; `/` must carry `nav-guide`. All plain GETs. |
| 7 | Any failure in 4–6 → automatic `bash scripts/rollback-prod-10c.sh 0845c733-…`. |

The here-string form `grep -q "$X" <<<"$body"` from the 10A fix is kept (no `printf | grep -q` under pipefail).

## Status

- `bash -n` of both scripts: RAN-PASSED.
- `bash scripts/ship-prod-10c.sh --dry-run`: RAN-PASSED, exit 0, ends `DRY RUN OK` (`evidence/ship-dryrun.txt`). Its built-in rollback dry run also passed (live = 0845c733, source 17d77e8).
- Staging deploy: NOT-RUN (blocked by the permission system; Step 1 above).
- Real production ship: NOT-RUN (founder runs it).
