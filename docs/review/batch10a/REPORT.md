# Batch 10A — report (lighter forms: Post form, equipment tags, shorter signup)

Branch `release-10a` (from `ee3ecfd`, tag `pre-10a-start`). **Website only, no database change.**
Production was not touched: no SQL, no sign-ups, no posts, no deploy. Decisions: `DECISIONS.md` (25 entries) ·
progress: `PROGRESS.md` · baseline: `BASELINE.md` · gates: `evidence/after/GATES.md` · ship: `SHIP.md`.

## Tasks

| Task | Status | One line |
|---|---|---|
| A — who is posting first | DONE | Farmer / Business buttons are now the first question of the Post form (step 1, above the category tiles), equal width, 56 px, filled + ✓ when chosen; same state, testids and consent behaviour. |
| B — short fields side by side | DONE | New `FieldRow` (1 column under 400 px, 2 from 400 px): Brand\|Model, Year\|HP (Drone: Year alone), Output\|Unit, Rental basis\|Rate (not tanker); building materials Quantity\|Unit; Post step 3 left as is (no obvious pair). |
| C — example values | DONE | Grey examples on Model, Year, HP, Output per hour and requirement min HP; never saved, empty fields still fail "required" (tested). |
| D — equipment tags | DONE | Tags sit right under the machine type; Crane Tractor, Pit Digging Tractor, JCB, Drone, Water tanker pre-tick "rare/emergency" until the poster touches the chips; Browse shows big tag chips right under the category chips (All first, tap again to clear, `etag` link kept). |
| E — shorter signup | DONE | One page: Name, Mobile, Email, Password, Village, one "show my details" checkbox (on by default, with its explanation and warning), the unchanged notice + accept box, Register. No language dropdown, no farmer block (still on Profile). Same data sent as before. |
| F — village pre-filled | DONE | Step 3's village field starts with the profile's village when empty (6 lines, no location logic). |
| G — tests, staging, prod script | DONE | Staging tests all passed, no new failure vs baseline, staging deployed, prod ship script written and dry-run (exit 0), NOT run. |

## Placeholders added (Task C)

Fixed examples on all spec types: Year `जैसे 2023` / `e.g. 2023`; requirement min HP `जैसे 40` / `e.g. 40`.

| Field | Type(s) | hi | en |
|---|---|---|---|
| Model | Tractor, Pit Digging Tractor, Crane Tractor | जैसे 575 DI | e.g. 575 DI |
| Model | all other spec types | मॉडल का नाम | Model name |
| Year | all spec types | जैसे 2023 | e.g. 2023 |
| HP (tractor_hp) | Tractor, Pit Digging Tractor, Crane Tractor | जैसे 45 | e.g. 45 |
| HP (tractor_hp_needed) | Thresher, Rotavator, Seed Drill | जैसे 35 | e.g. 35 |
| HP (engine_hp) | Harvester, JCB / Excavator | जैसे 90 | e.g. 90 |
| HP (power_hp) | Reaper, Paddy Planting Machine, Blower, LCB, Other | जैसे 7 | e.g. 7 |
| Output per hour (acre/hour) | Tractor, Harvester, Rotavator, Seed Drill, Reaper, Paddy Planting, Drone | जैसे 1.5 | e.g. 1.5 |
| Output per hour (quintal/hour) | Thresher, Blower, LCB | जैसे 20 | e.g. 20 |
| Output per hour (pits/hour) | Pit Digging Tractor | जैसे 50 | e.g. 50 |
| Output per hour (cubic metre/hour) | JCB / Excavator | जैसे 25 | e.g. 25 |
| Output per hour (other) | Crane Tractor, Other | — | — |
| Minimum HP (requirement) | every type with HP (not Drone) | जैसे 40 | e.g. 40 |

Full per-type table (66 rows): `evidence/placeholders.md`. The output example follows the unit shown in the form,
which starts at the type's default unit (decision 10).

## Tag mapping — founder may change

`EQUIPMENT_TYPE_DEFAULT_TAGS` in `src/lib/listings/catalog.js`:
Crane Tractor, Pit Digging Tractor, JCB / Excavator, Drone, Water tanker → `rare_emergency` ("दुर्लभ या ज़रूरत पर
मिलने वाले यंत्र"). Nothing maps to `vegetable_farming`. One constant; edit it to change the pre-ticks.

## Tests (honest statuses, vs `BASELINE.md`)

| Check | Baseline | After | Status |
|---|---|---|---|
| `npm run lint` | fails (ESLint not installed) | same | RAN-FAILED (pre-existing) |
| `npm run test:e2e` script | cannot start on Windows | same | RAN-FAILED (pre-existing tooling; direct CLI used) |
| e2e via Playwright CLI (staging) | 61 passed / 27 failed | **65 passed / 23 failed** | RAN-PASSED gate: no new failure; 4 signup tests fixed; all 23 were already failing |
| build:full + staging guards | OK | OK | RAN-PASSED |
| static check scripts (37) | 26 pass / 11 known fails | same (first run had 2 new fails from one Browse class, fixed) | RAN-PASSED gate |
| equipment spec gate | 805/805 | 805/805 | RAN-PASSED |
| New 10A tests on staging (`scripts/batch10a/tests.mjs`) | — | 15/15 + 4 screenshot runs | RAN-PASSED |
| Batch 9C regression subset (C1, C5, C7, C8; Tractor, Thresher, Drone) | — | 25/25 | RAN-PASSED |
| Saved `details` old build vs new build (Tractor, Thresher, same inputs) | — | identical keys and values; numbers as numbers, `spec_version: 1`, no form-only key | RAN-PASSED |
| Old listing without specs renders and opens | — | yes, no errors | RAN-PASSED |
| New staging user via one-page signup (box ticked) | — | 200, lands on /home logged in; unticked refused with no request | RAN-PASSED |
| Live staging render check (320/412 px) | — | chips 44 px, no sideways scroll, signup one page, 0 page errors | RAN-PASSED |
| Prod ship dry run | — | exit 0, nothing changed | RAN-PASSED |
| Real prod ship | — | — | NOT-RUN (on purpose) |
| Android app / emulator | — | — | NOT-RUN (website-only batch) |

Staging test data cleaned: 6 "KSTEST 10A" + 17 "KSTEST 9C" listings, their village names, and the test user
(profile + login). KSTEST-KEEP rows untouched (24 before and after).

**Screenshots** (`evidence/screens/`, 20 images, hi + en, 360 + 412 px). I opened four myself:
- `equipment-tractor-offer-hi-412`: Brand|Model, Year|HP and Output|Unit share rows. The Hindi HP label wraps to two lines but the inputs stay level. Tags sit under the type, and the grey examples show.
- `signup-hi-360`: one page with the explanation text, the notice box and the accept box above the button; no overflow.
- `browse-equipment-hi-360`: the tag chips sit under the category chips and above sort; no clipping.
- `post-top-hi-412`: farmer/business is the first control.

No overflow, clipped Hindi or overlap anywhere. Two things to know:
- In full-page captures the fixed bottom bar shows mid-image. That is a capture artefact.
- At 360 px the 11 category chips fill much of the first Browse screen, so the results start below the fold. That was true before this batch (`evidence/SCREENS.md`).

## Independent review

A separate reviewer saw only the diff and the rules (`evidence/independent-review.md`). It found no must-fix issues.
- **Fixed:** signup had dropped the visibility explanation (`vis_explain`). Rule 3 allows consent text to move, not to be removed, so it is back under the checkbox, and the static check now requires it on the screen. **HUMAN-REVIEW:** you or the lawyer can decide later whether that line may go.
- **Rejected:** it reported "every equipment listing now saves `equipment_tags: []`". That was already true before 10A.
- **Accepted as notes:**
  - Register reuses the existing "स्वीकार करें और आगे बढ़ें / Accept and continue" label, so no new text was written.
  - The step-3 village fills in again if the poster empties it and comes back.
- **Found later at the G3 gate:** a page-width rule flagged one class on the new Browse chips. It is removed.

## Numbers

- Last code commit: `74413b6`. Branch head and `pre-10a-ship`: `020a50a`. Report commit: see `git log -1 release-10a`.
- Staging deployment: **`b151dafd-81e7-49e8-aae0-48fe690448fe`** (https://staging.kissansahyog.com, source `74413b6`).
- Live production: `bf4f9479-821b-41a0-b20c-60ce22eb6303` (source `ee3ecfd`, unchanged).

## Ship production (founder)

```
bash scripts/ship-prod-10a.sh --dry-run    # check first; changes nothing
bash scripts/ship-prod-10a.sh              # the real ship (rolls back by itself if a gate fails)
```
Manual rollback, if anything looks wrong later:
```
bash scripts/rollback-prod-10a.sh bf4f9479-821b-41a0-b20c-60ce22eb6303
```
No database step is needed for this batch.

## NOT done on purpose

- OTP signup, and making email/password optional — Batch 10B, waiting for the Jio template approval. (Email +
  password are in their own block, `EmailPasswordFields`, so 10B can change them without a rewrite.)
- An account-level default "farmer / business" role — needs a database migration.
- Voice input for descriptions.
- "Call us to post".
- Fixing the pre-existing broken tooling (ESLint not installed; `npm run test:e2e` on Windows) and the 23 old e2e
  specs that were already failing before this batch.
