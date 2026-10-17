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
7. **Task A — placement and look of "who is posting".** The block is the first thing in step 1, ABOVE the
   `post_step_what` heading (so it is literally the first question), shown as an `h2` like the other step-1
   questions. Buttons: two equal columns, `min-h-[56px]` (same as the category tiles), selected = solid fill
   (green for farmer, amber-700 for vendor, white text) plus a ✓, matching the offer/requirement toggle style.
   Same `source` state, values, testids and strings; no new strings. A wrapper `data-testid="post-source-block"`
   was added for tests. *Alternative:* put it below the heading, before the tiles — rejected, the heading asks
   "what?" and the role question would read as a sub-part of it.
   *Note for tests:* older scripts (`scripts/fix9b/tests.mjs`, `scripts/fix9c/tests.mjs`, `scripts/phase5b/*`,
   `scripts/phase5c/*`) wait for `post-source-farmer` as a "step 2 is open" marker and click
   `post-source-vendor` on step 2; those need updating if they are re-run (Task G).
8. **Task B — FieldRow layout details.** `FieldRow` (fields.jsx) is `grid-cols-1 min-[400px]:grid-cols-2` with
   `gap-x-3` and NO vertical gap (`gap-y-0`): each `Field` already has its own bottom margin, so a stacked row
   (< 400 px) looks exactly like the old one-per-row form. From 400 px each child Field becomes a 3-row subgrid
   (label / control / hint-or-error), so when one label wraps to two lines (e.g. Hindi "ट्रैक्टर की अश्वशक्ति (HP)")
   both controls still start on the same line; without subgrid support the fields simply align at the top.
   Children get `min-w-0` so a long dropdown option cannot widen the page at 320 px.
   *Alternative:* plain `gap-3 items-start` — rejected, the inputs would sit at different heights whenever only
   one label wraps, and the stacked layout would get 12 px of extra space between fields.
   Pairs used: equipment Brand|Model, Year|HP (Drone: Year alone), Output per hour|Unit, Rental basis|Rate
   (non-tanker branch only); building materials Quantity|Unit (obvious pair). Post step 3 left unchanged:
   transport From/To are village names (long text) and already sit in an `md:grid-cols-2` grid; the asset
   village is a single field.
9. **Task C — where placeholders live.** Static examples are an optional `ph: { hi, en }` on `SPEC_FIELDS`
   (`model` = "मॉडल का नाम / Model name", `year` = "जैसे 2023 / e.g. 2023", `min_hp` = "जैसे 40 / e.g. 40").
   Per-type examples (tractor model "575 DI", HP by power kind, output by unit) come from one exported helper
   `specPlaceholder(key, typeName, unit?) → { hi, en } | null` in `catalog.js`; `equipment.jsx` passes
   `placeholder={…[lang]}` to the spec TextFields, `output_per_hour` and `min_hp`. Placeholders are only the
   input's `placeholder` attribute: `checkEquipmentSpec` / `cleanSpecDetails` read `details` only, so an empty
   field still fails "required" (checked; table in `evidence/placeholders.md`). `equipmentSpecFields()` and
   `equipmentServerRules()` are unchanged (no server-rule drift). Brand dropdown, brand_other, the unit
   "write the unit" field and type-specific extras get no placeholder (not listed in Task C).
   *Alternative:* put per-type examples inside `EQUIPMENT_SPECS` — rejected, it would spread one feature over
   14 rows; a helper with 3 small maps is easier to read and test.
10. **Task C — output-per-hour example follows the unit SHOWN in the form.** The form pre-selects the type's
   default unit (`onType` unchanged), so the first example is exactly the one Task C lists for the type's
   default unit. If the user switches the unit, the example switches with it (e.g. quintal/hour → "e.g. 20";
   other → no example), so a "1.5" hint never sits next to "quintal/hour". *Alternative:* always the type
   default — rejected as slightly misleading after a unit change; the difference is one argument.
