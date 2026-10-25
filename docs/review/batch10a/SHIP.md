# Batch 10A — putting it on kissansahyog.com

Production has NOT been changed. The ship is one command that checks everything itself and puts
the old version back on its own if anything looks wrong. Batch 10A has **no database change**, so
there is no SQL step before or after.

## Commands (Git Bash)

```
cd ~/projects/Kissansahyog
git checkout release-10a
git pull
bash scripts/ship-prod-10a.sh --dry-run     # changes nothing; must end with "DRY RUN OK"
bash scripts/ship-prod-10a.sh               # the real ship (about 10 minutes, asks nothing)
```

## What the script does, step by step

| Step | What | Changes prod? |
|---|---|---|
| 0 | Checks: on `release-10a`; no modified tracked files except `public/search-index.json` and `docs/review/**`; tag `pre-10a-ship` exists locally and on origin; HEAD = `origin/release-10a`; `.env.production` and the prod snapshot `docs/review/batch10a/evidence/prod-before.json` present; wrangler logged in; Cloudflare API token usable (needed for the rollback). | no |
| 1 | Records the live prod deployment id (read-only) into `evidence/prod-ship/prod-deployment-before.txt`. It must be `bf4f9479-821b-41a0-b20c-60ce22eb6303` (Batch 9, source `ee3ecfd`). If it is not, a real run **stops**; the dry run only warns. | no |
| 2 | Read-only: live prod must still match `prod-before.json` (title/h1 same, size 0.85–1.15x, `/sawaal` and `/yojana` up to 4.0x, robots.txt identical, sitemaps valid). Then a fresh snapshot `evidence/prod-ship/prod-before-ship.json`. | no |
| 3 | `npm run build:prod`; must prerender 263/263; dist must hold no `.env*`/keys/APKs and no staging Supabase reference; `_routes.json` present. | no |
| 4 | `npx wrangler pages deploy dist --project-name kissansahyog-prod --branch main --commit-dirty=true` | **yes** |
| 5 | Waits (max 5 min) until kissansahyog.com serves the new main chunk. | no |
| 6 | Read-only gates (`scripts/verify-batch9-live.mjs`: pages, compare against the fresh snapshot, cors, functions, static, sw, data — browser writes aborted, no sign-up, no post, no feedback POST), then plain GETs: `/signup`, `/post`, `/browse` must answer 200 with the new build. | no |
| 7 | Any failure in 4–6 → automatic `bash scripts/rollback-prod-10a.sh <id from step 1>`. | rollback only |

The box at the end says `SHIP OK`, `SHIP STOPPED BEFORE ANY CHANGE TO PRODUCTION` (nothing changed;
the reason is printed), `SHIP FAILED … RESULT: the new version was NOT kept` (back on the old
version, nothing to do), or `… AUTOMATIC ROLLBACK DID NOT CONFIRM` (use the manual rollback below).

If step 1 stops because the live id differs: someone deployed or rolled back since this batch was
prepared. Check the Cloudflare dashboard; only if that live version is the right one to replace,
run `KS_EXPECT_LIVE_ID=<live id> bash scripts/ship-prod-10a.sh`. (Step 2 will then also stop if
the live pages differ from the snapshot — ask Claude Code to take a new snapshot.)

## Manual rollback (exact command)

```
bash scripts/rollback-prod-10a.sh bf4f9479-821b-41a0-b20c-60ce22eb6303
```

Without an id it uses the id the ship recorded (`evidence/prod-ship/prod-deployment-before.txt`),
falling back to `bf4f9479-…`. Add `--dry-run` to see what it would do. Method: Cloudflare API
`POST …/pages/projects/kissansahyog-prod/deployments/<id>/rollback` (wrangler has no Pages rollback
command); afterwards it runs the read-only page check. No database rollback exists or is needed.

If that fails: Cloudflare dashboard → Workers & Pages → **kissansahyog-prod** → Deployments →
`bf4f9479` → "…" → **Rollback to this deployment**.

## Prod snapshot used by step 2

`docs/review/batch10a/evidence/prod-before.json` — taken 2026-10-17 while preparing this batch with
`node scripts/verify-batch9-live.mjs --base https://kissansahyog.com --checks snapshot` (GET requests
only; log and results in `evidence/prod-snapshot/`). Live prod at that time: deployment
`bf4f9479-821b-41a0-b20c-60ce22eb6303` (source `ee3ecfd`), confirmed by
`wrangler pages deployment list` and the read-only rollback dry run
(`evidence/rollback-prod-10a-dryrun.txt`). An immediate read-only `compare` against it passed
(`evidence/prod-snapshot/results-prod-compare-check.json`).

## Status

- `bash -n` syntax check of both scripts: passed. Rollback `--dry-run`: RAN-PASSED (exit 0).
- Ship `--dry-run`: NOT-RUN here (needs tag `pre-10a-ship`, created by the orchestrator after the final commit).
- Real ship: NOT-RUN (founder decision).
