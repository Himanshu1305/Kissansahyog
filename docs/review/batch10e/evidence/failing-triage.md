# Batch 10E 5.2 — triage of the 23 known-failing old (v1) e2e tests

Reference list: `docs/review/batch10d/evidence/e2e-failed.txt` (46 titles; 23 are the guide-10c B17 failures fixed in 10E Phase 1, the other **23** are below).
Method: each spec file run alone (`node --env-file=.env node_modules/@playwright/test/cli.js test e2e/<file> --workers=1`) against the Phase 5 STAGING build (`build:full`, served on 4173). Raw output: `evidence/phase5/triage-before/<file>.txt` (phase7 / phase9: `*.HEAD.txt`, the committed spec text) and `evidence/phase5/triage-after/<file>.txt`.
Classes: **stale test** (the app changed on purpose; the test still expects the old app) / **real bug** / **environment** (depends on data or machine, not on code).

Summary: **22 stale test, 0 real bug, 1 environment.** 2 of the stale ones (phase2) were already fixed in 10E Phase 3A; **20 fixed in Phase 5 (tests only)**; the environment one is left failing and reported. After: every touched file passes (batch1 5/5, batch5a 4/4, phase11 2/2, phase14 2/2, phase16 4/4, phase18 2/2, phase3 3/3, phase4 3/3, phase5 3/3, phase6 2/2, phase7 3/3, phase9 2/2, phase2 7/7); phase19 5/6 (the environment test). No product code was changed for 5.2.

| # | Test (file:line › title) | Failing assertion (before) | Class | Reason | Status |
|---|---|---|---|---|---|
| 1 | batch1:44 › browse: all 10 category chips inside 375×812 | `chips toHaveCount(10)` → received 11 | stale | Batch 5A added the Building materials category (11 browse chips) | FIXED: 11 |
| 2 | batch1:44 › … 1280×800 | same | stale | same | FIXED |
| 3 | batch1:66 › logged out: Call asks for login and returns | `getByRole('button', {name:'Log in'})` strict-mode: 2 buttons | stale | 10A login page has "Log in with email" and "Log in with mobile number" | FIXED: `login-phone-submit` test id |
| 4 | batch1:109 › post flow: land OFFER | `#f_asset_village` never appears (timeout) | stale | 10E 3C: land needs a start date, step 2 does not advance; also 6B/9B consent checklist | FIXED: tap "Today", tick all consents |
| 5 | batch1:130 › post flow: labor REQUIREMENT | same | stale | same (labor) | FIXED |
| 6 | batch5a:23 › posts building materials … responsibility note | `rules-agree-checkbox` never appears | stale | that box is only the ownership/provider declaration; building materials has none; the 6B/9B consent checklist gates Submit | FIXED: tick all consents |
| 7 | batch5a:43 › posts and filters equipment tagged Vegetable farming equipment | `#f_asset_village` timeout | stale | "option index 1" now needs 9C spec fields (brand/model/year/HP), and 10E start date | FIXED: Trolley + Today + consents |
| 8 | batch5a:43 › … Rare or emergency equipment | same | stale | same | FIXED |
| 9 | phase11_location_compare:7 › zero selected shows the auto-nearest table | `mandi-compare table` not found | stale | since 7L-1 there is no default centre: auto-nearest needs the visitor's location (no location → honest "no data") | FIXED: test seeds a saved Sagar location |
| 10 | phase14_village_geocoding:14 › Land/Equipment form asks for a VILLAGE | `#f_asset_village` not found | stale | equipment "index 1" needs 9C spec fields (10E already added the Today tap) | FIXED: Trolley |
| 11 | phase16_legal_availability:44 › seller rules checkbox gates submit | `rules-agree-checkbox` not visible (timeout) | stale | step 2 blocked: 9C spec fields + 10E start date; the consent checklist also gates Submit | FIXED: Trolley + Today; tick all other boxes so the rules box alone still gates Submit |
| 12 | phase18_transport:25 › Transport is a full browse category | `toHaveCount(10)` → 11 | stale | Building materials (5A) → 11 chips, transport is index 9 | FIXED |
| 13 | phase19_voice_mandi:103 › /msp dated tags and "—" for never-recorded | `price-missing` not found | **environment** | needs at least one crop with NO price ever on /msp/masoor; staging has prices for all (more so after the 10E 2B backfill); failed in 10D for the same data reason. Not a product bug | NOT FIXED (reported) |
| 14 | phase2:107 › login with unknown phone shows not-found path | (10D) "Log in" strict mode | stale | 10A two login buttons | fixed in 10E Phase 3A (passes: phase2 7/7) |
| 15 | phase2:117 › language persists across logout/login | same | stale | same | fixed in Phase 3A |
| 16 | phase3:45 › land OFFER: confirm checkbox gates submit, Call reveals number | `#f_asset_village` timeout; then heading `'Land'` exact not found | stale | 10E start date; consent checklist; 6B renamed the category to "Land (Bhoomi / Rakba)" | FIXED: Today, other boxes ticked (declaration alone gates Submit), heading `/^Land/` |
| 17 | phase3:72 › land REQUIREMENT: single confirm checkbox | `#f_asset_village` timeout | stale | 10E start date; "exactly 1 checkbox" is now the consent checklist | FIXED |
| 18 | phase4:32 › equipment OFFER with availability toggle | `button 'Specific dates'` not found | stale (obsolete by design) | 10E 3C replaced the now/dates toggle with the start date (DECISIONS 46); "Tractor" needs 9C specs | REWRITTEN as "equipment OFFER with availability (start date, 3-step flow)" (DECISIONS 70) |
| 19 | phase5:32 › labor OFFER with blank rate renders cleanly | `#f_asset_village` timeout | stale | 10E start date; consent checklist | FIXED |
| 20 | phase6:33 › mark Found closes listing: disappears from browse | browse `listing-card toHaveCount(0)` → 1 | stale | the 6D "Popular listings" strip on Browse is not location-scoped and uses the same `listing-card`; the closed listing itself is gone | FIXED: count only result cards (not the popular strip) |
| 21 | phase6:64 › expired listing … absent from browse | same → 1 | stale | same | FIXED |
| 22 | phase7:69 › posting works in Hindi UI | `#f_asset_village` timeout | stale | 10E start date (आज); consent checklist | FIXED |
| 23 | phase9:26 › Journey A: signup → post all 3 → My Listings → close one | `#f_asset_village` timeout (after the 3A sign-up step passes) | stale | 10E start date; consent checklist | FIXED |

Helpers added to `e2e/support.js` (tests only): `pickTodayIfAsked`, `tickAllConsents`, `selectSpecFreeEquipmentType` (DECISIONS 69).

Also touched (not in the 23): `e2e/phase20_mela.spec.js` teaser test updated for 5.1 + one new test (8/8).

Old static verifiers (checks, not product code), DECISIONS 72: `verify-batch7d.mjs` 73/78, `verify-batch7l1.mjs` 53/54, `verify-batch7l2.mjs` 58/59 after the update; every remaining failure predates 10E and is listed in BACKLOG.md.
