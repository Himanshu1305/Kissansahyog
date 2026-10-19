# Batch 10G — progress

## Precondition — DONE
- `git fetch`; `release-10f` at `c44c418` (tag `ship-10f`), `docs/review/batch10f/SHIP.md` and `scripts/ship-prod-10f.sh` exist.
- `release-10g` created from `c44c418` (no pull). Tracked changes: only the 7 allowed generated files. Tag `pre-10g-ship` → `c44c418`, pushed.

## Phase 0 — baseline (no code change)
- Build `build:full` on STAGING: **RAN-PASSED** 268/268 (1 via fallback: the known `/`), localhost gate OK, staging guard OK (`evidence/build-baseline.txt`).
- Main chunk `index-ZgT7KPIE.js` 81,904 B raw / **27,538 B gzip**; main CSS 13,717 gz; Admin 15,980 gz; MyListings 1,563 gz; ListingDetail 3,638 gz (`evidence/chunk-sizes-baseline.txt`). Frozen copy served on :4201.
- Unit: **RAN-PASSED** 81/81. Text snapshot: 268 pages → `evidence/baseline-text/`.
- Full Playwright: running on the frozen copy (results added in the Phase 2 commit).
- Inventory: DECISIONS 2–7.

## Phase 1 — database (migration 0065, staging) — DONE
- `supabase/migrations/0065_listing_delete_disable.sql` + `rollback/0065_listing_delete_disable_rollback.sql`. Applied on STAGING with one query (guard passed), recorded in `schema_migrations` (`evidence/apply-0065-staging.txt`).
- **DB tests through the real RPCs: RAN-PASSED 37/37** (`scripts/batch10g/db-tests.mjs`, `evidence/db-tests.md`): owner disable/enable; disabled hidden from public reads and `search_listings`; expiry not bypassed; closed cannot toggle; non-owner / non-admin refused (`not_owner`, `not_admin`); admin disable needs a 1–300 char reason; seller cannot enable an admin-disabled listing (`disabled_by_admin`); admin enable restores; owner delete removes the row + rows in all 3 child tables and nulls the report link; admin delete writes exactly one audit row (only admin, listing id, action, category, reason, time) and resolves the open report; API cannot read/write the audit table. All KSTEST data deleted (0 listings left).
- Advisors: only the expected findings (DECISIONS 16).

## Phase 2 — photo removal — DONE (option 2)
- Option 1 (delete storage rows in SQL): **RAN-FAILED as expected** — refused by Supabase's `storage.protect_delete` guard; the URL kept answering 200. Not used (DECISIONS 17).
- Option 2 (queue-gated storage DELETE policy + Storage API remove by the app): **RAN-PASSED 15/15** (`scripts/batch10g/photo-proof.mjs`, `evidence/photo-proof.md`): seller and admin deletes remove the photo files (storage rows gone, every uncached request 400); unrelated photos and photos of existing listings cannot be deleted through the API; the queue is not readable; pending list empty after removal. KSTEST files and rows cleaned (0 left). CDN copy of a recently viewed photo for up to 1 h (HUMAN-REVIEW, DECISIONS 20).
- No orphan photos (`evidence/orphan-photos.md`). Other copies checked (DECISIONS 21). Production copy of the migration: `PROD_MIGRATION_0065.sql` + `PROD_ROLLBACK_0065.sql`.

## Phase 0 — E2E baseline (finished during Phase 3)
- Full Playwright on the frozen baseline: **190/191**; the only failure is the known `phase19` "price-missing" environment test (`evidence/baseline-e2e/`, `evidence/baseline-failing.txt`).

## Phase 3 — seller screens — DONE
- `OwnerListingActions` (disable / enable / permanent delete with confirmation, toast, plain errors) on My Listings and the own listing detail page; API `setMyListingDisabled`, `deleteMyListing` (+ photo removal), `retryPendingPhotoDeletions`, `listingErrorKey` in `listingsApi.js`; strings hi+en (HINDI_CAPTIONS.md). DECISIONS 23–30.
- **Build: RAN-PASSED** 268/268. Main chunk 27,538 → **27,604 B gz (+66)**.
- **E2E `listing-owner-10g`: RAN-PASSED 8/8** — disable/enable (hi 412, en 1280; public read hidden then visible; buttons ≥ 44 px; no horizontal scroll), delete with cancel then confirm (row gone, photo file gone, uncached URL 400, deleted listing page shows "यह लिस्टिंग नहीं मिली"), admin-disabled (badge + reason, no enable, delete offered; RPC `disabled_by_admin`), own detail page of a disabled listing (enable, delete → back to My Listings), keyboard + screen-reader (labelled group, alertdialog, focus on "नहीं", Escape returns focus), non-owner refused. No console errors.
- Screens (looked at): `evidence/screens/phase3-my-listings-*`, `phase3-delete-dialog-*`, `phase3-detail-admin-disabled-*`.
