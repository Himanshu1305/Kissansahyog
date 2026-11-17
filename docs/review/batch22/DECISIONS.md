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
