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
11. **Task D — how "tags touched" is tracked.** A form-only flag `__tags_touched: true` is set in `details` when the
   poster taps any tag chip on the Post form. It lives in `details` (not in component state/ref) because
   `Fields` un-mounts when going to step 3 and re-mounts on Back, which would forget a ref. `cleanSpecDetails`
   (called by `finalizeDetails`, which Post always runs for equipment before `createListing`) deletes the flag
   first, so the saved `details` keys are exactly as before (rule 9). Same idea as jugaad's `__photoFiles`.
   *Alternative:* `useRef`/state in Post passed down as a prop — rejected, touches Post.jsx and adds a prop for
   one category.
12. **Task D — pre-fill behaviour.** `EQUIPMENT_TYPE_DEFAULT_TAGS` (catalog.js, keyed by English type name;
   founder may change): Crane Tractor, Pit Digging Tractor, JCB / Excavator, Drone, Water tanker →
   `rare_emergency`; nothing → `vegetable_farming`. On a type pick, while untouched, `equipment_tags` is SET to
   the type's default (an unmapped type resets it to `[]`, so a Drone → Tractor switch does not leave a Drone
   tag behind). Once any chip is tapped the type never changes the tags again. Changing the category re-runs
   `initialDetails()` (flag gone, tags `[]`) as before.
   *Edit path:* there is no edit screen for listings (no `/edit`, `EditListing`, or pre-loaded details in
   Post; `initialDetails()` is only used by Post's create flow), so pre-fill can only run on new listings.
13. **Task D — Browse tag filter.** For `cat=equipment` only, the block (`data-testid="equipment-tag-filters"`)
   now sits directly under `browse-cats`, above LocationControl, the offer/requirement + sort row and results.
   Chips: `min-h-[44px]`, `text-base`, `whitespace-normal` (long Hindi label wraps), selected = solid green +
   ✓ + `aria-pressed`; "All / सभी" (`filter_all`) first; tapping the selected chip clears to All. Testids
   `etag-chip-all`, `etag-chip-<value>`. `etag` is still READ from the URL on load; it is NOT written back on
   change (minimal, matches today's behaviour; no history entries per tap). Cards keep their tag rows.
14. **Task E — one-page signup, field order and Register button.** Order: Name, Mobile, Email, Password, Village/Town
   (`PlaceField`), visibility line, `disclaimer_title` + `DisclaimerBanner which="signup"` (unchanged) + the
   existing `disclaimer-accept` checkbox, Register last. The `step` state, `goToDisclaimer` and the Back-button step
   branch are gone (Back → `/`). Register label = the EXISTING `accept_and_continue` ("स्वीकार करें और आगे बढ़ें" /
   "Accept and continue") — no new string; it reads right as the last button after the acknowledgment and keeps
   every harness that clicks by that name working. Register is the form's `type="submit"` button and is NOT
   disabled: pressing it validates every field AND, if the box is unticked, shows the existing
   `err_disclaimer_not_accepted` in `signup-error` and never calls `register` (scrolls to top). Ticking the box clears
   that one message. *Alternative:* keep the button disabled until ticked (as old step 2) — rejected: a disabled
   button gives a farmer no reason why nothing happens, and field errors would only appear after ticking.
15. **Task E — visibility = one checkbox; testid mapping.** Wrapper keeps `data-testid="visibility-choice"` with
   `data-choice="show|hidden"`; small heading = existing `vis_title`; the checkbox (`data-testid="visibility-show"`)
   is labelled with the existing `vis_show` verbatim, ticked by default (`useState(true)`); unticked shows the
   existing `vis_hidden_warning` (`visibility-warning`). Sent exactly as before: `show_details: showDetails` →
   authService `p_show_details: show_details !== false` (authService.js untouched), same consents key
   `details_visibility`. `visibility-hidden` no longer exists → tests map "click visibility-hidden" to
   `uncheck('[data-testid="visibility-show"]')` and "click visibility-show" to `check(...)`. `vis_explain` and
   `vis_hidden` are no longer shown on signup (strings kept unchanged in strings.js; nothing reworded).
16. **Task E — language and farmer block.** The `#language` dropdown is removed; `register` gets `language: lang`
   (the active app language, switched with the header हिं/EN toggle). `KisanFields` is removed from signup (still on
   Profile.jsx). Signup always sends `kisan: { ...EMPTY_KISAN }` where `EMPTY_KISAN` = `{ land_acres: '', main_crops:
   '', interest_lease: false, interest_equipment: false, whatsapp_opt_in: false, preferred_mandi: '' }` — byte-for-
   byte the old initial state, which is what the old form sent when the block was untouched, so `applyKisan`'s
   `hasKisan` check and `app_register` behave exactly as before.
17. **Task E — Email + Password block.** New `src/components/auth/EmailPasswordFields.jsx` (props `t, values, errors,
   onChange, required=true`; owns the show/hide state, keeps `#email`, `#password`, `password-toggle`). A later OTP
   batch can pass `required={false}` or drop it. Validation stays in Signup (both still required, HARD RULE 4).
18. **Task E — tests/harness changes (no check loosened).**
   - `scripts/verify-batch7l2.mjs` (static): 5 checks rewritten to the new structure — form has name/phone/place +
     `<EmailPasswordFields>` (whose file has `#email`/`#password`) and NO `#language`, sends `language: lang`;
     KisanFields NOT on signup but on Profile + the exact `EMPTY_KISAN` literal is sent; password toggle checked in
     screen+block; acknowledgment on the same page (no `step`), gated by `err_disclaimer_not_accepted` before
     `register`, checkbox before the submit button; visibility = one checkbox, default ticked, `data-choice`
     mapping, warning on untick. The i18n-key check now also scans EmailPasswordFields.
   - `scripts/shots-batch7l2.mjs`, `scripts/verify-batch7l2-stageb.mjs`: tick-then-Register; visibility-hidden →
     uncheck; field-list check now asserts language/k_* are ABSENT and visibility/disclaimer boxes present;
     big-target check is the checkbox row ≥ 44px (was two ≥ 56px buttons).
   - `scripts/phase5b/lib.mjs`: `fillSignupForm` uses new `setAppLang` (header toggle) instead of `#language`,
     `setChecked(visibility-show, p.show)`, no longer fills kisan; `signup()` ticks then presses `registerBtn`.
     `negatives.mjs`: N04 rewritten (no step 2/Back): N04b = Register unticked → refused with the acknowledgment
     message and no network call; N04c = fields kept after that refusal; N05/N06/N08 tick-then-Register.
     `personas.mjs`: P9 language switch via toggle; profileData expects the EMPTY farmer profile (signup no longer
     collects it). `scripts/phase5c/network.mjs`: `acceptBtn` = the form submit; no step 2.
     `scripts/android/staging-tests.mjs`: tick then submit.
   - `e2e/phase2.spec.js`: signup tests rewritten to the one-page form (they were already failing at baseline on
     the removed pincode field); "unknown pincode" replaced by "Register unticked is refused + visibility untick
     warns". `e2e/phase9.spec.js` Journey A: signup lines only (post-flow parts left for Task G).
19. **Task E — double-tap guard.** Register is now the always-enabled submit button, so Signup adds a `useRef`
   in-flight flag next to `busy` (the button is still replaced by the spinner while registering); a fast double tap
   calls `register` once (phase5b N05 checks this on staging).
20. **Task F — when the village pre-fills.** A `useEffect` on `[step, user?.village_town]` in `Post.jsx` sets
   `village` from `user.village_town` only when step 3 is shown and the field is empty. `village` is deliberately
   not a dependency, so a poster who clears the field while on step 3 is not refilled; leaving and re-entering
   step 3 (or `resetAll`) pre-fills again. Transport (from/to) and coordinates/geocoding are untouched — the name is
   resolved on submit exactly as if typed. Alternative (pre-fill at mount) rejected: it would show before step 3
   and refill after deliberate clearing.
21. **Independent review (after Task F) — fixes.** The reviewer saw only the diff and tasks A–F; nothing must-fix.
   Fixed: signup no longer showed `vis_explain` (the plain explanation behind the show-details choice). Rule 3
   allows moving consent text, not removing it, so it is shown again as small text under the checkbox
   (`data-testid="visibility-explain"`), and verify-batch7l2's explanation check now also requires it on the screen.
   Marked HUMAN-REVIEW: founder/lawyer may decide later whether that line can go. Not changed (false alarm):
   "every equipment listing now saves `equipment_tags: []`" — `initialDetails()` already set `equipment_tags: []`
   before this batch (`git show pre-10a-start:src/components/categories/equipment.jsx` line 29). Notes accepted
   as-is: Register uses the existing `accept_and_continue` label (no new string); the step-3 village re-fills if
   the poster empties it and comes back (harmless). Full review text: `evidence/independent-review.md`.
22. **Task G5 — prod ship script = copies, batch 9 untouched.** `scripts/ship-prod-10a.sh` and
   `scripts/rollback-prod-10a.sh` are copies of the batch 9 pair with branch `release-10a`, tag `pre-10a-ship`,
   evidence `docs/review/batch10a/evidence/prod-ship`, fallback rollback id `bf4f9479-…`. Removed: the 0b database
   section (migration list + the read-only `listings` column probe on prod) and the database-rollback lines — this
   batch has no migrations, so no prod database request at all. The compare/gate logic is NOT forked: both scripts
   call `scripts/verify-batch9-live.mjs` unchanged (only `--out`/`--snapshot` paths differ), so the agreed size
   tolerances (0.85–1.15x; /sawaal and /yojana up to 4.0x; FAQ-added pages 1.6x) are exactly batch 9's.
   Alternative (a new verify-batch10a-live.mjs) rejected: nothing batch-specific needed changing.
23. **Task G5 — live id differs from `bf4f9479-…` → STOP (real run), WARN (dry run).** Safest: if prod is not
   the version this batch was prepared against, the snapshot and the rollback target may be wrong, so the real run
   stops before any change; override after checking with `KS_EXPECT_LIVE_ID=<id>`. The dry run only warns so it
   can still validate everything else. Alternative (warn and continue) rejected: the rollback would then return to
   an unreviewed version. Live id seen 2026-10-17: `bf4f9479-821b-41a0-b20c-60ce22eb6303` (source `ee3ecfd`).
24. **Task G5 — 10A's own snapshot.** Batch 9's step 2 compares against a "night snapshot". For 10A a read-only
   snapshot of live prod was taken while preparing (GETs only): `docs/review/batch10a/evidence/prod-before.json`
   (log `evidence/prod-snapshot/`); an immediate read-only compare against it passed. Rollback `--dry-run` ran
   read-only (exit 0, `evidence/rollback-prod-10a-dryrun.txt`). Ship `--dry-run` not run here (needs the tag).
25. **Task G5 — extra 10A checks.** After the gates, plain GETs of `/signup`, `/post`, `/browse` must answer 200
   and serve the new main chunk (no login, no write). Also added a guard (not in batch 9): the real run stops if
   the new main chunk name cannot be read from `dist/index.html`, because an empty name would make the
   "new build is live" checks pass on anything.
