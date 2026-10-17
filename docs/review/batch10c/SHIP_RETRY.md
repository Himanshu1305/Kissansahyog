# Batch 10C — ship retry

## What happened
First production ship (`evidence/ship-real-attempt1.log`): deploy was fine (guide chunks served, `nav-guide` on `/`), but the script's `10c_routes` gate failed on `/guide`, `/guide/register`, `/guide/post`, `/guide/find`, `/guide/tour` with **HTTP 308**, so it rolled back. Production is back on deployment **0845c733**.

## Cause
Cloudflare Pages 308-redirects `/guide` → `/guide/` (prerendered `guide/index.html`), the same as `/mausam`. The gate's `curl -s` did not follow redirects, so it saw 308 and an empty body. A gate bug, not a site bug.

## Fix
`scripts/ship-prod-10c.sh`, `check_routes_10c`: `curl -sL --max-redirs 5`. The final response must be 200 and contain the new main chunk. Nothing else changed. `scripts/rollback-prod-10c.sh` has no route check, so no change there.

## Proof
- Staging, same check (`evidence/staging-route-proof.txt`): 5/5 guide routes 308 without follow → 200 + `/assets/index-Berk0UA3.js` with follow.
- `bash scripts/ship-prod-10c.sh --dry-run` → **DRY RUN OK** (`evidence/ship-dryrun-retry.log`).

## Re-run the ship
```
bash scripts/ship-prod-10c.sh 2>&1 | tee docs/review/batch10c/evidence/ship-real.log
```
