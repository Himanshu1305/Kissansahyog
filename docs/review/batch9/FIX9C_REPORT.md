# Batch 9C — report (equipment spec fields: brand, model, year, horsepower, output per hour)

Date 2026-10-15 · branch `release-9` · **staging only** (database `wzxtqbqlahyahsnoqqva`, staging.kissansahyog.com,
deployment `b88c7c5a`). **Production was not touched**: no SQL, no migration, no deploy.
Decisions: `DECISIONS_FIX9C.md` · progress: `PROGRESS_FIX9C.md` · coverage: `evidence/fix9c/COVERAGE_MATRIX.md` ·
new backlog lines: end of `BACKLOG.md`.

## What changed (plain language)

- When someone posts a machine **offer**, the form now asks for the machine's details: **brand, model, year,
  horsepower (HP)**, plus 0–2 extra details that depend on the machine (for example crop and cutting width for a
  harvester, tank litres and flight minutes for a drone). All of these are **required**. **Output per hour** (for
  example "1.5 acre/hour") is optional.
- **Tractor, Pit Digging Tractor and Crane Tractor** get a brand **list** (Mahindra, Swaraj, Massey Ferguson…).
  Choosing "अन्य ब्रांड / Other brand" opens a box where the brand must be typed. Every other machine has a
  normal text box for the brand.
- **Year** must be a whole year from 1990 to next year (2027). **HP** must be above 0 and up to 500. For "Other"
  machines, 0 is allowed ("इंजन न हो तो 0 लिखें"). Wrong entries such as "abc" or "4O" are blocked with a clear
  Hindi message that names the field. The same message also appears in red under that field, and the page scrolls
  to it. Number boxes open the phone's number keyboard.
- A buyer posting a **requirement** is not forced to fill anything new. They see one optional box,
  "न्यूनतम अश्वशक्ति (HP)" (minimum HP), on machines that have HP.
- **Trolley and Water tanker** forms are exactly as before.
- **Listing cards** get one extra line, for example "स्वराज KSTEST 245 · 2022 · 45 HP · 1.5 एकड़/घंटा".
  The **detail page** shows one row per detail, plus the note "ℹ️ विक्रेता द्वारा दी गई जानकारी / Details given by
  the seller". Older listings look exactly as before.
- **The server also checks it** (migration `0063`), so the rule cannot be skipped by calling the system directly.
  Only the new app is checked (it marks its posts with `spec_version: 1`). The older APK and cached websites still
  post as before, until they are retired (BACKLOG).

## The per-type table, as built

| Type | Brand | Extra required details | HP field | Output unit pre-selected |
|---|---|---|---|---|
| Tractor | list | — | Tractor HP | acre/hour |
| Pit Digging Tractor | list | auger size | Tractor HP | pits/hour |
| Crane Tractor | list | lifting capacity | Tractor HP | other |
| Thresher | text | crop | Tractor HP needed | quintal/hour |
| Harvester | text | cutting width, crop | Engine HP | acre/hour |
| Rotavator | text | working width | Tractor HP needed | acre/hour |
| Seed Drill | text | number of rows (1–100) | Tractor HP needed | acre/hour |
| Reaper | text | working width | Power HP | acre/hour |
| Paddy Planting Machine | text | number of rows (1–100) | Power HP | acre/hour |
| Blower | text | — | Power HP | quintal/hour |
| LCB (Straw Machine) | text | — | Power HP | quintal/hour |
| JCB / Excavator | text | bucket size | Engine HP | cubic metre/hour |
| Drone | text | tank litres (≤1000), flight minutes (≤600) | **none** | acre/hour |
| Other | text | machine name | Power HP, 0 allowed | other |
| Trolley, Water tanker | unchanged | — | — | — |

**Brand list (draft for your review):** Mahindra / महिंद्रा, Swaraj / स्वराज, Massey Ferguson / मैसी फर्ग्यूसन,
John Deere / जॉन डियर, Sonalika / सोनालिका, New Holland / न्यू हॉलैंड, Eicher / आयशर, Farmtrac / फार्मट्रैक,
Kubota / कुबोटा, Powertrac / पावरट्रैक, Preet / प्रीत, Indo Farm / इंडो फार्म, Other brand / अन्य ब्रांड.

## Tests (all on staging; headless browser, one test at a time; screenshots in `evidence/fix9c/`)

The test cases are **generated from the same table the app uses**, so tests and code cannot drift apart.

**Coverage matrix: 68 of 68 required fields are created, required in the form, checked on the server, tested and passing.**

| Where | Result |
|---|---|
| Static gate (`scripts/check-equipment-specs.mjs`) | 837/837 checks passed; build OK |
| New build on this PC + staging database | **229/229 RAN-PASSED**: C1 68 (each required field: blocked with its name when empty, then posts once filled) · C2 14 (detail page rows + seller note) · C3 14 (output with the right unit) · C3b 14 (empty output never blocks) · C4 1 (years 1985/3000/abc and HP 0/600/4O blocked; Other accepts 0) · C5 4 (brand list, "Other brand" needs text, other types use free text) · C6 4 (requirements: nothing forced, min HP saved and shown; Drone has none) · C7 2 (Trolley and Water tanker unchanged) · C8 1 (4 older listings render, no errors) · C9 7 (Hindi + English at 360 px, normal and 130 % text, number keyboard, boxes ≥ 56 px, card line not cut, focused box visible on a keyboard-sized screen) · C10 10 (one post in each other category) · C11 89 (direct API: each missing field refused per type, blank values, Other brand, ranges, older-app call still works, Trolley/tanker/requirement still work) · C11UI 1 (server refusal shows the same Hindi message in the app) |
| Deployed staging (`b88c7c5a`) | **136/136 RAN-PASSED**: C11 89, C5 4, C8 1, C1 14 (one per type), C2 14, C3 14 |

**Migration:** applied to staging, rolled back, and applied again. After the rollback the function was
byte-identical to the original, and the permissions did not change.
**Advisors (staging):** nothing new. The changed function appears only in the two "callable with the public key"
warnings that already existed (same permissions as before). There are no new performance findings.
**Clean-up:** all 181 "KSTEST 9C" test listings, their 1 photo, and 181 test village names were deleted. The 24
KSTEST-KEEP rows are untouched (`evidence/fix9c/cleanup.json`).

## Skipped / not run

- **Emulator smoke test: skipped, low memory** (1.3–1.8 GB free; the rule needs 4 GB). `ks-staging.apk` was not
  rebuilt. Nothing was checked inside the Android app. The keyboard check ran in the browser only (C9).
- `npm run lint` could not run, because ESLint is not installed. It was already like this before this batch (Batch 9
  PREFLIGHT). A temporary check on the new files was clean (BACKLOG has the pre-existing duplicate text keys it found).
- On the deployed site, C1 ran one required field per type (14), as the prompt asked. All 68 ran locally.

## Production — prepared, NOT done

- `scripts/ship-prod-9.sh` and `scripts/rollback-prod-9.sh` now list `0063` and its rollback, as files only. A real
  ship cannot check whether 0063 was applied (it only changes a function), so the script says to make sure it was
  run. Without 0063 the new site still works; production just would not double-check specs on the server.
- Dry runs: `ship-prod-9.sh --dry-run` and `rollback-prod-9.sh --dry-run` both **exit 0** (`evidence/fix9c/deploy/`).

## What you run next (in order)

1. Try it on staging.kissansahyog.com: post a **Tractor offer** (try an empty year, "abc" as HP, and "Other
   brand"), then post a **requirement**. Also check the brand list above.
2. When you decide to ship, in the Supabase SQL editor (**production** project), run
   `supabase/migrations/0063_equipment_specs.sql` after 0061 and 0062 (and 0054–0060 if those are still pending).
3. Then `bash scripts/ship-prod-9.sh --dry-run`, and if it is clean, `bash scripts/ship-prod-9.sh`.
