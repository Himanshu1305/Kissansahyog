# Batch 22 - decisions the prompt did not dictate
1. **Listing creation paths found**: the only code that creates a listing is `createListing` (src/lib/listings/listingsApi.js), called only from `src/screens/Post.jsx`. There is no admin "post on behalf of a farmer" screen. Only SQL/test scripts (scripts/batch10g) call `create_listing_with_location` directly. The Mitra dropdown is on the farmer's own Post form only. A first offer made through any other path is simply not linked; an admin can link by hand (reassign).
2. **Hard delete**: "delete permanently" (`delete_my_listing`) really removes the row, so it cannot be remembered by a listings query. A farmer whose only offer was permanently deleted would see the dropdown again. Removed/closed/disabled offers are all remembered. Fix later if wanted (a marker column on profiles).
3. **Who counts as having "offered"**: offers with status removed, or disabled by an admin, do not count for payment (`ks_mitra_offered`). "First offer" for the dropdown looks at offers of ANY status.
4. **Helper layout**: `ks_mitra_first_offer_at` holds the rule; `ks_mitra_offered` is "first offer exists". One definition.
5. **Today / last 7 days** on the Mitra cards: farmers by their first-offer date, ads by creation date.
6. **offers_count** counts live offers (not removed, not admin-disabled) so it agrees with "not counted yet".
7. **unattributed_total** = people who offered and have no Mitra, with no start date (includes people from before the Mitra feature).
8. **admin_get_announcement_mitras** returns id -> { mitra_id, paid } (not a bare id), so the list can show the chip and the read-only note.
9. **admin_reassign_registration** is re-created with identical behaviour, as the prompt listed it.
10. **Ads**: a deleted announcement leaves the unpaid count; one already paid keeps its payment row. Duplicating an announcement does not copy its Mitra. The Mitra dropdown lists active and inactive Mitras.
11. **Ad save**: the card is saved first, then the Mitra by a second call; if that fails the form stays open with a plain error and a retry updates (does not duplicate) the card.
12. **Payment is once per farmer**, at the first offer; no payment for later offers (to be revisited with data).
13. **Old string key** `mitra_field_label` removed (replaced by `mitra_offer_label`).
14. **Browser checks** write to `docs/review/batch22/evidence` (Batch 20 evidence is untouched).
15. **Statement amounts (22D)**: each row shows the Mitra's CURRENT rate (farmer rate for a farmer, ad rate for an ad; blank = rate not set). A payment is stored as one lump sum and the founder may change the amount when paying, so no per-row amount is stored. If a rate changes, old rows show the new rate. Paid/Due on the statement are sums of those per-row amounts; the payment ledger stays the record of money actually paid.
16. **Statement excludes**: blocked people, people who have not offered (shown only as a small "N waiting for their first offer" count, blocked ones not counted), removed or admin-disabled offers, and anything of another Mitra. Never returned: full or private phone, listing details, photos. The phone is masked (last 4) in the database answer but the screen and the CSV do not show it at all.
17. **Statement page sizes**: the screen asks for 50 rows per request ("Load more"); the CSV fetches 500 per request until everything is read; the database function accepts 1 to 500 (default 200). Totals always cover all rows.
18. **Category** on a farmer row is the category of the listing created at the first live offer time (found through the 0076 helper, so the live-offer rule is written only once).
19. **CSV**: columns date, kind, name, village, category, amount_rupees, status, paid_on; dates in India time; category in the screen language; file `kissan-mitra-<name-slug>-<date>.csv` (a Hindi-only name becomes `mitra`); UTF-8 with BOM; formula-looking cells get an apostrophe.
