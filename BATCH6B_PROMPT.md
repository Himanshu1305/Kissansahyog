# BATCH 6B — The /post overhaul: layout, bento side panel, consents, photos, location

You are the builder. The architect/reviewer (Claude) reviews afterwards.
Work ONLY inside this repo (`C:\Users\usdvi\projects\Kissansahyog`).

PREREQUISITE: Batch 6A must already be merged/committed on the branch you start from.
It created the central layout/theme (`src/lib/theme.js` or the equivalent you find), the
`ErrorBoundary`, `getCategorySafe`, and the wide default `Screen`. Reuse them. If you cannot find
them, STOP and say so in the report instead of re-creating them.

## 0. Rules (same as 6A, plus DB rules)

- Start from the branch the owner tells you (normally `integration/batch5-test` after 6A is merged).
  Create `codex/batch6b-post`.
- Do NOT `git commit`, do NOT deploy, do NOT run migrations, do NOT touch the live database.
  You WRITE the migration file; the owner runs it after Claude reviews it.
- Never read/print/commit `.env` or secrets.
- Hindi first, English second; all text via `src/lib/i18n/strings.js` (+ `disclaimers.js` for
  consent text). No hard-coded Devanagari in components. Plain farmer-friendly Hindi.
- Shared database: migrations are ADDITIVE ONLY. No drop/rename/narrowing of columns, tables,
  policies or function signatures. An older production build (`ba455ae`) reads the same DB and
  must keep working: the old `profiles.disclaimer_accepted_at` column must keep being set.
  Number the migration `0054_...` (contiguous with `0053`). Put a rollback note at the top.
  Use `create or replace function` only when the old signature stays callable.
- Pre-existing failing tests to leave alone: `v11_phase6`, `v2_citation_audit`, `batch4_ui_style`.
  Do not delete/skip/loosen tests.
- Keep `docs/review/BATCH6B_PROGRESS.md` updated; at the end write `docs/review/BATCH6B_REPORT.md`
  (done / not done and why / files changed / unsure items / pages to check after deploy /
  "Owner must do" list) and a verifier `scripts/verify-batch6b.mjs` with PASS/FAIL lines; save its
  UTF-8 output to `docs/review/BATCH6B_VERIFY_OUTPUT.txt`. Add UI strings table
  `docs/review/UI_STRINGS_BATCH6B.md` (key / Hindi / English / page).

## 1. Task B1 — /post layout: wide, tighter, two columns on desktop

Owner feedback: the page is not edge to edge, has too much blank space, wastes real estate, and
should market our services.

1. Use the shared wide frame (from 6A). On `lg` and up use a two-column grid: form on the left
   (about 2/3), a sticky side panel on the right (about 1/3; `sticky top-24`). On smaller screens
   the side panel moves BELOW the form and the form is full width.
2. Tighten vertical spacing in the form (use the shared spacing scale; no giant gaps between
   fields). Put short related fields side by side on `md+` (e.g. quantity + unit, rate + negotiable,
   village + pincode). Keep the category selector compact (grid of chips/tiles, not a tall list).
3. Do not remove any existing validation or field. Do not change what is submitted unless a task
   below says so.

## 2. Task B2 — Bento side panel with internal promotion (reusable)

The owner does NOT want USD Vision AI products here. He wants bento boxes that show OTHER parts of
this site and interlink to them: e.g. a couple of important Sawaal questions, the nearest KVK
address, mandi prices, weather, schemes, the nearest Kisan Mela, WhatsApp join, "how posting works".

1. Create ONE reusable component `src/components/PromoBento.jsx` and ONE central config
   `src/content/promoTiles.js` listing the tiles (id, type, route, strings keys, optional
   `showOn` pages). Both are used by /post now and must be reusable on other pages later
   (Browse empty state, post-success screen, 404, Resources).
2. Tile types (build all; each is a small card linking inside the site; verify each target route
   exists in the router — NEVER link to a route that does not exist; if one does not exist,
   skip that tile and list it in the report):
   - "How posting works" — 3 short steps (fill → we show it nearby → people contact you directly). Not clickable.
   - Random important Sawaal — shows 2 questions picked at random from published Q&As each page
     load (use the existing sawaal fetch helpers; cache the list once; fall back to nothing, never
     crash if the fetch fails). Links to `/sawaal/<slug>`.
   - Nearest KVK — find how KVK data is stored/shown in the repo (grep `kvk`). Show the KVK nearest
     to the user's saved location (profile lat/lng or pincode) with name + address + phone, and
     link to the KVK page. If no location, show the KVK nearest Sagar as default. If the repo
     has no KVK data, skip this tile and report it.
   - Mandi prices (link), Weather (link), Schemes (link), Sawaal home (link).
   - Nearest/ongoing Kisan Mela (use the fixed 6A function; dated events only).
   - WhatsApp join (reuse the existing `WhatsAppJoin` component/link).
   - "Vendors: show your shop/product here" CTA → the existing vendor/advertise page if one
     exists (grep), else skip and report.
3. Layout: CSS grid bento (mix of 1x1 and 2x1 tiles), consistent card style from the shared theme.
   On /post show about 6 tiles in the side panel, choosing a rotating subset (random per load,
   but stable during one visit — seed from a value stored in a module variable, not localStorage).
4. All tile text through strings; every link is a React Router `<Link>`; add `aria-label`s.

## 3. Task B3 — Separate consents (do not proceed until ALL accepted)

Today one `DisclaimerBanner` (`which="listingForm"`) is shown on Post and one timestamp
`profiles.disclaimer_accepted_at` is stored.

1. New central component `src/components/ConsentChecklist.jsx`. Show 4 SEPARATE checkboxes, each
   with its own text. The primary action (Continue / Submit) stays disabled until all 4 are
   ticked. Unticking one disables it again. Keyboard accessible, large touch targets.
2. Draft wording (put in `src/lib/i18n/disclaimers.js`; keep Hindi plain and gender-neutral):
   1. hi: "मुझे पता है कि किसान सहयोग सिर्फ़ लोगों को आपस में जोड़ता है। किसान सहयोग किसी सौदे का पक्ष नहीं है।"
      en: "I understand Kisan Sahyog only connects people. It is not a party to any deal."
   2. hi: "मुझे पता है कि किसान सहयोग लिस्टिंग या लोगों की जाँच नहीं करता।"
      en: "I understand Kisan Sahyog does not verify listings or people."
   3. hi: "पैसे का लेन-देन किसान सहयोग से नहीं होता। भुगतान से पहले सामान या सेवा और सामने वाले को खुद जाँच लेना मेरी ज़िम्मेदारी है।"
      en: "Payments do not go through Kisan Sahyog. It is my responsibility to check the goods or service and the other person before paying."
   4. hi: "मेरी दी हुई जानकारी सही है, और मुझे पोस्टिंग के नियम मंज़ूर हैं।"
      en: "The information I give is correct, and I accept the posting rules."
   Item 4 links to `/terms`. Mark in the report that this wording needs lawyer review. Do NOT
   show any "under review" label in the UI.
3. Find where the existing disclaimer is accepted and written (grep `disclaimer_accepted_at`
   in `src/` and `supabase/migrations/`; it may be a direct profile update or an RPC). Keep that
   path working: when all 4 are accepted, still set `disclaimer_accepted_at` (old build compat).
4. Migration `0054_consents.sql` (additive): `alter table public.profiles add column if not exists
   consents jsonb not null default '{}'::jsonb;` storing e.g.
   `{"version":"2026-10","accepted_at":"<iso>","items":{"connect_only":true,"no_verification":true,"no_payments":true,"posting_rules":true}}`.
   Make sure the existing RLS/update path lets a user write ONLY their own row's `consents`
   (inspect the existing policies; do not loosen them). If writes go through an RPC, add a new
   function or extend with `create or replace` keeping the old signature callable.
5. A returning user who already has `disclaimer_accepted_at` but no `consents` is asked once to
   accept the 4 items (treat the old single consent as not sufficient for the new list).
6. Use `ConsentChecklist` in place of `DisclaimerBanner` on /post (both usages around lines ~211
   and ~319) and anywhere else the listing disclaimer gates an action (grep).

## 4. Task B4 — Seller photos

Owner decision: 3 photos by default; 5 for warehouse (includes cold storage), land, greenhouse.
First photo is the cover. Keep the existing Report button on listings.

1. The Supabase bucket `listing-photos` already exists (public read; anonymous insert policy). Reuse it.
   Do NOT add a new bucket. Upload path: `listings/<random uuid>/<index>.jpg`.
2. Photo picker component `src/components/PhotoPicker.jsx` (central, reusable): "फोटो जोड़ें"
   button using `<input type="file" accept="image/*" multiple>` (camera allowed on phones),
   thumbnails with remove and "make cover" (move to first), counter "2/3", clear Hindi error when
   the limit is reached. Max counts come from ONE config map in the listings catalog
   (`PHOTO_LIMITS = { default: 3, warehouse: 5, land: 5, greenhouse: 5 }`).
3. Compress in the browser BEFORE upload: draw to canvas, long edge max 1600px, JPEG quality ~0.8,
   then if still above ~300 KB re-encode with lower quality (floor 0.5). Handle HEIC/unsupported
   formats by showing a friendly error, not crashing. Revoke object URLs on cleanup.
4. Upload when the user submits (or on pick with a progress state — choose the simpler robust
   one). On failure keep the form and let the user retry; never create a listing that references a
   missing upload. Store public URLs in `details.photo_urls` (array, cover first) — the homepage
   `listingPhoto()` already reads that key. Check `create_listing` (latest migration) accepts
   `details` containing `photo_urls`; if its validation rejects unknown keys or caps length, handle
   it in migration 0054 (additive, keep old signature callable).
5. Show photos: cover on `ListingCard`; on `ListingDetail` a simple gallery (large image +
   thumbnails, swipe/scroll on phone, `loading="lazy"`, meaningful `alt`). Listings without photos
   keep today's category placeholder image.
6. Safety: `file_size_limit` is not set on the bucket. In migration 0054 add the single statement
   `update storage.buckets set file_size_limit = 5242880 where id = 'listing-photos';` with a
   comment that it is the only non-table change and how to revert. Do NOT set an
   `allowed_mime_types` list (the older build may upload other types).

## 5. Task B5 — Location: free Google Maps help (no paid APIs)

1. In the location area of /post (all categories, optional): a "मेरी वर्तमान लोकेशन लें" button
   using `navigator.geolocation` (handle denied/unavailable gracefully; ask only on click) that
   fills latitude/longitude into the listing the same way the form already stores coordinates.
2. An optional field "Google Maps लिंक (चाहें तो)" for a pasted map link. Accept only
   `https://maps.app.goo.gl/...`, `https://goo.gl/maps/...`, `https://www.google.com/maps/...`,
   `https://maps.google.com/...`; reject anything else with a short Hindi message. Store as
   `details.map_url`. Never fetch the URL server-side or client-side; just store and link.
3. On `ListingDetail` show an "Google Maps में खोलें" button when there is a `map_url`, else when
   there is lat/lng use `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`, else when
   there is a village/place name use the same URL with the encoded place text. Opens in a new tab
   with `rel="noopener noreferrer"`.
4. Do NOT add Google Places autocomplete or any Google API key. Add a line in the report that
   paid autocomplete was deliberately skipped.

## 6. Task B6 — Transport: simple From / To

Owner: "just ask from location and to location, no need to make it complicated."

For category `transport` (both offer and requirement) replace the generic asset-village field with
two plain fields: "कहाँ से / From" and "कहाँ तक / To" (free text with the existing village
datalist suggestions where available). Both required for transport. Store as
`details.from_location` and `details.to_location`; keep filling whatever field the backend/search
already relies on for transport location (so near-me search still works) with the From value.
Show "From → To" on the card and detail. Check `create_listing` validation for transport and adapt
via the 0054 migration only if needed (additive).

## 7. Task B7 — Rename Land label

Use BOTH words: category label hi "भूमि / रकबा", en "Land (Bhoomi / Rakba)". Update
`CATEGORY_META.land` and every place that prints the Land category name (tiles, chips, nav, card,
detail, Browse filter, search suggestions, bazaar pages, strings). The area/size field must be
labelled "क्षेत्रफल" (not "रकबा") to avoid a clash. Do not change the category KEY `land`.
Update the search synonyms so "ज़मीन", "जमीन", "रकबा", "भूमि", "khet", "land" all find it.

## 8. Definition of done

- `node scripts/verify-batch6b.mjs` passes 0 failed; existing tests unchanged.
- Migration `0054_*.sql` exists, additive, rollback note on top, numbering contiguous, and the
  verifier checks "no forbidden destructive SQL" the way `verify-batch5a.mjs` does.
- Report lists: owner must run `npm run db migrate` after Claude reviews the SQL.
- Nothing committed, no secrets touched.
