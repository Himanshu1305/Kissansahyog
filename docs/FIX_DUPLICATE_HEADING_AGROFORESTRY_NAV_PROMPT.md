# Kisan Sahyog — Fix Duplicate Heading + Agro Forestry Nav Placement

DO NOT ask for approval or questions. Decide and proceed.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy after both fixes verified:** `npm run build && npx wrangler pages deploy dist --project-name kissansahyog`

---

## Fix 1 — Duplicate heading on MP schemes page

`/yojana/mp` ("Madhya Pradesh Government schemes") currently renders its page heading twice, stacked one above the other. Find where this heading is set — likely duplicated between the page component itself and a parent layout/wrapper both rendering a title for the same route. Remove the duplicate so the heading renders exactly once. Verify the same issue does not also exist on `/yojana/central` or `/yojana` (the combined view) — check and fix there too if present.

---

## Fix 2 — Move Agro Forestry out of the Marketplace dropdown to its own top-level nav item

"एग्रो फॉरेस्ट्री / Agro Forestry" currently sits inside the बाज़ार/Marketplace dropdown. Remove it from there and add it as its own top-level nav item, at the same level as: Marketplace, Mandi prices, Weather, Govt schemes, Q&A, Videos, Resources — not nested under any dropdown.

- Links to `/agro-forestry`, unchanged.
- Apply on both desktop nav and the mobile hamburger/menu.
- Label: "एग्रो फॉरेस्ट्री" (Hindi) / "Agro Forestry" (English), matching the site's existing bilingual nav pattern.
- Confirm the Marketplace dropdown no longer lists it, and the new top-level item is clickable and correctly navigates to `/agro-forestry` on both screen sizes.

---

## Verification before deploy

Screenshots at 1280×800 and 375×812 of: `/yojana/mp` showing the heading exactly once, the nav bar showing "एग्रो फॉरेस्ट्री / Agro Forestry" as a top-level item (not inside Marketplace), and the Marketplace dropdown open showing it is no longer listed there. View all of them. Confirm no other page was affected by either change (spot-check `/yojana`, `/yojana/central`, and the homepage nav render correctly).

Deploy: `npm run build && npx wrangler pages deploy dist --project-name kissansahyog`

Commit message: "Fix duplicate heading on /yojana/mp; move Agro Forestry from Marketplace dropdown to its own top-level nav item"
