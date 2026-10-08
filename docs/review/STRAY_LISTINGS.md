# Suspected stray / test listings — read-only audit (Batch 4 item G)

**Read-only. Nothing was deleted or edited.** The owner reviews and decides.
Generated 2026-10-08 from the shared Supabase `listings` table.

## Method
Queried for listings that look like test or junk data, **excluding** the sample
listings marked `is_test_data = true` (those stay visible by owner decision). Checks:
1. `details` text matching test/script patterns (`[B4-TEST]`, `test`, `playwright`, `e2e`, `dummy`, `asdf`, `xxxx`).
2. Listings created by test-looking accounts (profile phone `9000000…`).
3. Rapid-duplicate clusters (≥4 listings by one user within the same minute).
No phone numbers are printed.

## Result: **no stray listings found**

- Pattern match (1): **0 rows.**
- Test-account listings (2): **0 rows.**
- Rapid-duplicate clusters (3): **0 rows.**

This batch's own tests (`batch4_wide_visibility.mjs`, prefix `[B4-TEST]`) were removed in
teardown by their exact ids; a re-check found none left.

## Context (not stray — for the owner's awareness)
- **Real (non-test) listings: 6.** All look like genuine pilot content:

  | id | category | status | created | label |
  |---|---|---|---|---|
  | 454c4940-e8c4-4568-bd74-aad844092112 | drone_didi | active | 2026-10-05 | Soyabean |
  | 2dbe6916-361b-4d00-bedd-92143db5ef1b | land | active | 2026-09-27 | land |
  | 2d135200-5231-4da2-8198-30202971c678 | bhusa | active | 2026-09-15 | bhusa |
  | 6219caa3-5ddc-4bc9-bdeb-4c07602ee92f | land | active | 2026-09-15 | land |
  | 0277aeaa-7fae-4001-89cc-16be1e7659fd | equipment | active | 2026-08-22 | (equipment type 4) |
  | 8e4bdc59-28b1-499f-bef9-8261680160fa | equipment | active | 2026-08-22 | (equipment type 3) |

  The two 2026-08-22 equipment rows were created the same day but are **not** a rapid
  duplicate cluster (different items, not within seconds); left for the owner to judge.
- **Sample listings: 65** (`is_test_data = true`) — intentionally kept visible (PROJECT_CONTEXT §14),
  not listed here.

**Recommendation:** nothing to clean up. If the owner later wants the sample listings
hidden, that is a separate owner-driven decision (not done in this batch).
