# Batch 6B report

## Done

- `/post` now uses the shared wide frame with a compact desktop two-column form/bento layout and stacked mobile layout.
- Added reusable `PromoBento` and `promoTiles` for internal links, published Sawaal links, KVK contact, dated Kisan Mela, weather, mandi, schemes and the existing WhatsApp join path.
- Added four required, keyboard-accessible listing consent checkboxes. The save RPC records the versioned JSON consent and preserves `profiles.disclaimer_accepted_at` for older builds.
- Added reusable `PhotoPicker`, browser JPEG compression, category-specific limits (3 default; 5 land/warehouse/greenhouse), prescribed storage paths, card cover and detail gallery.
- Added click-only geolocation, safe Google Maps URL validation/storage, and detail-page map links.
- Added transport From/To (From remains the search anchor), Land rename, and land search synonyms.

## Not done / why

- There is no dedicated vendor/advertise route in the router, so no vendor bento tile was added.
- Resource/KVK rows have no stored latitude/longitude. The bento chooses a matching saved area where available and otherwise defaults to KVK Sagar; exact geospatial KVK ranking needs coordinates in the resource data.

## Files changed

- Post, listing card/detail, transport and land category UI; listing/auth APIs.
- `src/components/{PromoBento,ConsentChecklist,PhotoPicker}.jsx` and `src/content/promoTiles.js`.
- `src/lib/i18n/{strings,disclaimers}.js`, listings catalog/search synonyms/photos.
- `supabase/migrations/0054_consents.sql`, verifier and review artifacts.

## Unsure items

- Consent wording needs lawyer review, as requested.
- Browser HEIC support varies; unsupported HEIC is deliberately shown as a friendly error rather than uploaded.

## Pages to check after deploy

- `/post` at phone and desktop widths, especially every category’s photo limit.
- `/listing/:id` with photos, map link and a transport listing.
- `/resources` KVK contact data and `/kisan-mela` upcoming event availability.

## Owner must do

1. Have Claude review the SQL, then run `npm run db migrate`.
2. Verify the `listing-photos` bucket’s existing insert policy permits the new `listings/<uuid>/<index>.jpg` prefix.
3. Have legal counsel review the four consent statements.

Paid Google Places autocomplete was deliberately skipped; this uses only browser geolocation and pasted Google Maps links.

## Verification

- `node scripts/verify-batch6b.mjs`: PASS, 0 failed (saved in `BATCH6B_VERIFY_OUTPUT.txt`).
- `git diff --check`: PASS.
- `npm.cmd run build` could not start because this checkout's `@tailwindcss/oxide-win32-x64-msvc` native binary is unloadable in this environment. `npm.cmd run lint` could not start because ESLint is not installed in `node_modules`.
