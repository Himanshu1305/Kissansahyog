# Batch 10A — decisions

Each entry: what, why, the alternative.

1. **Branch start.** `origin/release-9` = `ee3ecfd` as expected. Tag `pre-10a-start` → `ee3ecfd` (pushed);
   branch `release-10a` from `origin/release-9` (pushed). Leftover files in the tree (modified
   `docs/review/batch7*/VERIFY_OUTPUT.txt`, `public/search-index.json`, untracked prompt files and
   `docs/review/batch9/PROD_MIGRATIONS_0061_0063.sql`, `docs/review/batch9/evidence/phase4/prod-ship/`) are left alone
   and never staged. *Alternative:* commit them — rejected, rule 6 says leave them.
2. **Staging deploy command (Task G4).** From batch9 PREFLIGHT 0.2 and PROJECT_CONTEXT:
   `node --env-file=.env scripts/check-staging-env.mjs && npm run build:full && node --env-file=.env scripts/check-staging-env.mjs --dist && npx wrangler pages deploy dist --project-name kissansahyog --branch main --commit-dirty=true`
   `--branch main` is passed explicitly so the upload becomes the deployment behind staging.kissansahyog.com
   regardless of the local branch name (batch9 PREFLIGHT note). The guard runs before and after the build.
   *Alternative:* the bare `npm run build:full && npx wrangler pages deploy dist --project-name kissansahyog` —
   rejected, without `--branch main` wrangler would label it `release-10a` (a preview, not staging).
3. **Staging guard check.** `.env` points at the staging ref (`wzxt…`). `check-staging-env.mjs` is not part of
   `build:full`, so it is run explicitly before/after the build (see 2). Its refusal of a prod URL was tested in
   the baseline (`evidence/baseline/guard.txt`).
4. **Lint.** `npm run lint` fails before this batch (`eslint` not installed, no config — batch9 PREFLIGHT 0.3).
   Kept as a known baseline failure; no ESLint is added in this batch (would be a dependency change outside scope).
   *Alternative:* install ESLint — rejected, out of scope.
5. **Baseline set.** lint, staging guard, `npm run build:full`, the static (no-DB-write) check scripts that the
   batch9 baseline ran (runner `scripts/run-static-checks-10a.sh`, adds `check-equipment-specs.mjs`), and
   `npm run test:e2e` against staging (test phone prefix 9000…, cleaned by its teardown). Skipped as in batch9:
   `v2_link_check` (external network, informational), `verify-batch5b-citations` (live check), scripts that
   import the service-role admin client.
6. **E2E command.** `npm run test:e2e` cannot start on Windows (shell shim run by node). Used the equivalent
   `node --env-file=.env node_modules/@playwright/test/cli.js test`. The baseline e2e ran from a separate
   worktree at `pre-10a-start` (`../ks-10a-baseline`, node_modules linked) so code work could start meanwhile.
   Port 4173 is reserved for that run; task work uses other ports. *Alternative:* fix package.json — rejected,
   tooling change outside scope (reported in REPORT).
