# Batch 10G — database tests of 0065 on STAGING (2026-10-19T09:47:26.547Z)

## Seller disable / enable
- PASS — a new listing is active and publicly readable
- PASS — search_listings finds the active KSTEST listing
- PASS — non-owner cannot disable → not_owner (not_owner)
- PASS — unknown listing → not_found (not_found)
- PASS — owner disables → status disabled
- PASS — disabled listing hidden from public reads (RLS)
- PASS — disabled listing hidden from search_listings
- PASS — get_my_listings still shows it to the owner, admin_disabled = false, old columns kept
- PASS — owner enables → active and public again

## Enable does not bypass expiry; closed cannot be toggled
- PASS — enabling an expired listing keeps expires_at (still expired, not public)
- PASS — closed listing cannot be disabled → invalid_state (invalid_state)

## Admin disable / enable
- PASS — non-admin cannot call admin_set_listing_disabled → not_admin (not_admin)
- PASS — admin disable needs a reason → reason_required (reason_required)
- PASS — reason over 300 characters → reason_too_long (reason_too_long)
- PASS — admin disables → disabled, admin_disabled_at set, reason trimmed
- PASS — owner sees admin_disabled = true and the reason
- PASS — seller cannot enable an admin-disabled listing → disabled_by_admin (disabled_by_admin)
- PASS — get_admin_listings returns admin_disabled_at, reason and photo_count (old columns kept)
- PASS — non-admin cannot read get_admin_listings → not_admin (not_admin)
- PASS — admin enables → active, marks cleared, public again

## Seller permanent delete (child rows, report link, photo paths)
- PASS — non-owner cannot delete → not_owner (row still there) (not_owner)
- PASS — even an admin cannot use the SELLER delete on another's listing → not_owner (not_owner)
- PASS — owner delete returns only our bucket's photo path (["listings/kstest-10g-dbtest/0.jpg"] )
- PASS — the listing row is gone
- PASS — child rows gone: unavailable_dates / private_contact / view_log
- PASS — the report stays but loses its listing link (set null)
- PASS — deleting again → not_found (not_found)

## Admin permanent delete (audit row, report resolved)
- PASS — non-admin cannot call admin_delete_listing → not_admin (not_admin)
- PASS — admin delete needs a reason → reason_required (reason_required)
- PASS — admin delete returns the photo path and removes the row
- PASS — exactly one audit row for the delete (before: 0)
- PASS — the audit row holds only admin, listing id, action, category, reason, time
- PASS — the open report was resolved as removed with the reason, link nulled
- PASS — admin disable + enable on L1 wrote two audit rows

## The audit table is not readable or writable through the API
- PASS — anon select on listing_admin_actions is refused or empty (permission denied for table listing_admin_actions)
- PASS — anon insert on listing_admin_actions is refused (permission denied for table listing_admin_actions)
- PASS — anon cannot update listings directly (status stays via RPC only)

cleanup: 3 KSTEST profiles deleted (their listings cascade)
listings left for these profiles: 0

**37 passed, 0 failed**
