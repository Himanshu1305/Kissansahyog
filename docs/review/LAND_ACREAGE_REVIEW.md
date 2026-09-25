# Land acreage — Part B review (2026-09-26)

Replaces Land's size-range buckets with a plain numeric acreage input (no upper limit) across
ठेका/बटाई/पट्टा, confirms the per-acre rate + adds an optional per-listing contact number, and keeps
the village-only location display. Builds directly on Part A's village geocoding.

## Phase 1 — inspection

### 1a — dependency check (PASS)
Part A's village geocoding has landed: the `village_coordinates` table exists (resolved cache +
pending queue), and the distance path no longer uses pincode as its primary anchor —
`create_listing` resolves coords from the **village name**, listings store their own denormalized
`latitude/longitude`, and `fetchHomeFeed`/`fetchNearby`/`nearby_counts` read those. The listing form
(shared `ListingForm`, changed in Part A/A3) now asks for a **village name with autocomplete** for
*every* category including Land — verified by `e2e/phase14` ("Land form also uses the village input,
no pincode"). So Land already meets the "village-only, no pincode fallback" requirement; **no blocking
dependency.** (Note: `land.jsx`/`equipment.jsx` still export now-unused `locationLabelKey`/
`locationPlaceholderKey` pincode constants — dead code since A3; left untouched, not referenced by
`ListingForm`.)

### 1b — current Land schema, form, and display
Land details are a JSONB blob on `listings.details` (no dedicated columns). Current shape
(`src/components/categories/land.jsx`):
- **`size_range`** — REQUIRED bucket string from `SIZE_RANGE`: `<1`, `1-2`, `2-5`, `5-10`, `10+`
  (labels "1 एकड़ से कम" … "10+ एकड़"). This is the capped field Part B removes. **Seed data:** 9 land
  listings — `2-5`×4, `1-2`×3, `5-10`×2 (no `<1`/`10+` in seed).
- `arrangement[]` — multi-select from `ARRANGEMENT`: `lease`=पट्टा, `sharecropping`=बटाई,
  `contract_farming`=ठेका. (This is how the three sub-types are captured — a multi-select, not
  separate forms, so the acreage change applies to all three uniformly by construction.)
- `water_source`, `crop_id`, `season`, `photo_urls[]`.
- **`price_type`** — REQUIRED, from `PRICE_TYPE`: `fixed` (तय ठेका दर), `sharecropping` (बटाई % में),
  `negotiable` (बातचीत से).
- **`price_amount`** — numeric-ish text, shown for `fixed`/`sharecropping`. For `fixed` the placeholder
  is already **"जैसे: ₹8,000 प्रति एकड़"** — i.e. a **per-acre rate already exists** for ठेका
  (`ph_price_fixed`); for `sharecropping` it's the % split ("जैसे: 50% बटाई").

**Display:** `summarize()` renders "ज़मीन का आकार" via `optionLabel(SIZE_RANGE, …)` (the bucket label);
the listing card (`ListingCard.jsx`) shows the public village/town + district only ("📍 [Village],
Sagar") — exact plot location is never shown. Contact is **not** on the card.

### Contact number — current sourcing
Contact is sourced from the **poster's profile**, revealed only via the `get_listing_contact(p_listing_id)`
SECURITY DEFINER RPC (returns `full_name, phone` from `profiles` for active listings), surfaced on
`ListingDetail` behind a disclaimer + phone-reveal gate. There is **no per-listing contact override**
today. Part B adds an optional one (3b) defaulting to the profile phone.

### Decisions for Phases 2–3 (recorded here)
- **2b (size migration):** `size_range` → numeric `size_acres` in `details`; convert seed buckets to a
  representative midpoint (approximation, not precision): `<1`→0.5, `1-2`→1.5, `2-5`→3.5, `5-10`→7.5,
  `10+`→12. Migration `0028_land_acreage.sql`.
- **3a (per-acre rate):** a per-acre ₹ value already exists as `price_amount` for `fixed`/ठेका — keep
  it, make the "per acre" meaning explicit in the label/placeholder. बटाई's % split mechanism stays
  unchanged. No new schema field needed for the rate.
- **3b (contact):** add an OPTIONAL per-listing `contact_phone` (in Land details), defaulting to the
  profile phone when blank; `get_listing_contact` returns the override when present.
