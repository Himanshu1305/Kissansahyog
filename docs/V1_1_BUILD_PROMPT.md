# Kisan Sahyog — v1.1 Build Prompt

DO NOT ask for approval at any step. Auto-accept all actions. Work through every phase in order without stopping for confirmation between phases. Push to GitHub after each phase passes its test checklist.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Live staging URL:** https://staging.kissansahyog.com
**Deploy command (unchanged from v1):** `npx wrangler pages deploy dist --project-name kissansahyog`

Read PROJECT_CONTEXT.md before starting. Update PROJECT_CONTEXT.md after every phase that changes the architecture, schema, or UI structure.

---

## Context

This is a set of additions and fixes on top of the existing v1 codebase. The core platform (Land/Equipment/Labor categories, 30km proximity matching, phone-OTP-ready auth, bilingual Hindi/English, PWA, RLS + SECURITY DEFINER RPCs) is already built and live. Do not rebuild or reorganize existing architecture unless a specific fix below requires it.

The mission is: **किसान की आय बढ़ाना — increasing the income of farmers.**

---

## Phase 1 — Critical bug fix: asset location vs. owner location

**The problem:** The 30km radius matching currently may calculate distance from the poster's profile location rather than the location of the land/equipment/labor being offered. This is wrong — a landowner in Hyderabad or abroad listing land in Sagar must have the LAND's location used for distance matching, not their own home location.

**What to fix:**
1. For every listing category (Land, Equipment, Labor, and the new ones coming in this prompt), the listing's own lat/long/pincode fields must be used for distance filtering in browse/search queries — never the poster's profile lat/long. Audit every query that filters by distance and confirm this is the case.
2. On the listing creation form for Land specifically, make the "where is this land located?" pincode field a clearly required, prominently labelled step — separate from and not silently defaulting to the user's profile pincode. Label it explicitly: "ज़मीन का पिनकोड / Land's pincode" not "your pincode."
3. Apply the same explicit "where is this actually located?" prompt to Equipment and Labor listing creation — do not assume the poster's location equals the asset/team's location.
4. Add a soft radius fallback: default search shows matches within 30km, but if fewer than 5 results exist, automatically show a secondary section "30-50 किमी दूर / 30-50km away" so early users in a low-density pilot aren't shown a completely empty screen.

**Test checklist:**
- Positive: A user with profile pincode in Hyderabad posts a Land listing with a Sagar pincode — that listing appears in search results for a user in Sagar (within 30km of the land's pincode), not search results for someone in Hyderabad.
- Negative: Confirm the query does NOT join on profiles.latitude/longitude for distance calculation anywhere in the codebase. Search for every instance of distance/haversine logic and verify the source of coordinates.
- Edge: A user who doesn't fill in the land's separate pincode (attempts to skip it) — form must reject submission with a clear message in both Hindi and English.

Commit + push: "Phase 1: fix asset-location distance matching, soft radius fallback"

---

## Phase 2 — Quick fixes to existing data and UI

**2a. Add missing equipment types to the equipment_types seed/lookup table:**
Add these (with both Hindi and English names): ड्रोन/Drone, सीड ड्रिल/Seed Drill, रीपर/Reaper, ब्लोअर/Blower, एल.सी.बी. (भूसा मशीन)/LCB (Straw Machine)

**2b. Add missing crop to the crops lookup table:**
Add: मसूर/Masoor (Lentil) — to the Sagar/MP pilot seed set alongside the existing 10 crops.

**2c. Add structured price/rate field to Land and Equipment listings:**
- Land listings: add a "Rate/Price" field with a type selector (dropdown): Fixed rent amount (ठेका दर), Sharecropping % split (बटाई — % में), Open to negotiation (बातचीत से). Show an amount field only when "Fixed rent amount" is selected. This field is required — a listing cannot be submitted without selecting one of the three options.
- Equipment listings: make the existing rate_amount field required (was optional in v1), and ensure the rental_basis dropdown (per hour/acre/day) is always shown alongside it. Both fields required together.

**2d. Hindi UI terminology update:**
Across all Hindi-language strings in the app, make these replacements:
- "ठेकेदार" or "कांट्रेक्टर" → "कृषि मित्र" (Krishi Mitra)
- "मज़दूर" → "कृषि सहयोगी" (Krishi Sahyogi)
Update all translation keys, display labels, form field labels, dropdown options, and any placeholder text where these terms appear. The English equivalents stay unchanged (contractor/laborer remain in English mode).

**2e. Add Drone Didi as a Labor sub-type:**
In the Labor listing category (Offer), add "ड्रोन ऑपरेटर (ड्रोन दीदी)" as an option in the work_type dropdown alongside the existing types (sowing, harvesting, weeding, general, other). This represents women drone operators available for pesticide/fertilizer spraying under the government's Drone Didi scheme.

**Test checklist:**
- Positive: All new equipment types and masoor appear correctly in their respective dropdowns in both Hindi and English.
- Positive: Land listing creation requires a price type selection before submission; Equipment listing creation requires rate amount and basis.
- Positive: All updated Hindi terminology displays correctly across every affected screen.
- Positive: Drone Didi option appears in Labor Offer work_type dropdown.
- Negative: Attempting to submit a Land listing without selecting a price type — rejected with clear message.
- Regression: Existing Land/Equipment/Labor listings created in v1 still display correctly despite the new required fields (these are additions to the form, not breaking changes to existing data).

Commit + push: "Phase 2: equipment/crop additions, price fields, Krishi Mitra terminology, Drone Didi"

---

## Phase 3 — New category: Bhusa/Parali (Agricultural Residue)

This is a new top-level navigation item — not nested under Equipment. Give it distinct, prominent placement in the nav with a clear icon/label in both languages.

**Category name:** भूसा / पराली (Bhusa/Parali) — Agricultural Residue

**Listing fields (stored in the `details` JSONB column of the existing `listings` table — reuse the same listings table, just add a new category value):**
- residue_type (dropdown, required): भूसा/Bhusa (Wheat Straw), पराली/Parali (Paddy Straw), गन्ना वेस्ट/Sugarcane Waste, कपास वेस्ट/Cotton Waste, अन्य/Other
- quantity (text, required): free text with unit hint e.g. "5 quintal, 2 trolley loads"
- pickup_arrangement (dropdown, required): खरीदार खेत से उठाएगा/Buyer collects from farm, किसान डिलीवर करेगा/Farmer will deliver, दोनों चलेगा/Either works
- buyer_type_preference (dropdown, required): व्यक्तिगत किसान/Individual farmer or small buyer, व्यावसायिक/उद्योग/Commercial or industrial buyer, दोनों/Either
- asking_price (text, required): amount with unit e.g. "₹200 per quintal" or "बातचीत से/Negotiable"
- location of material (separate pincode field, required — same asset-location pattern from Phase 1): "भूसे/पराली का स्थान / Location of residue"
- available_from (date, optional)

**Requirement listings** use the same fields framed as "looking for" — buyer_type_preference becomes the buyer's own type (individual vs. commercial).

**Self-declaration:** Not required for this category (unlike Land — no ownership claim being made, just availability of a farm byproduct).

**Browse/search:** Same 30km radius filtering using the residue's location (not the poster's home). Same Offer/Requirement filter. Sort nearest-first by default.

**Disclaimer on listing form (add alongside the existing form footer disclaimer):**
> "भूसा/पराली जलाने से पर्यावरण को नुकसान होता है। इसे बेचकर आप आय कमाएं और प्रदूषण भी कम करें।"
> "Burning crop residue harms the environment. By selling it, you earn income and reduce pollution."

**Test checklist:**
- Positive: Create a Bhusa Offer with all required fields — appears in browse tab and detail view correctly.
- Positive: Create a Parali Requirement (commercial buyer) — appears in browse and is correctly filtered by the residue's location pincode (not the poster's home).
- Negative: Attempt to submit without the residue location pincode — rejected.
- Negative: Attempt to submit without selecting buyer_type_preference — rejected.
- Edge: A Bhusa listing at exactly 30km from the searcher — appears in the primary results section. At 31km — appears in the soft fallback section ("30-50km away") introduced in Phase 1.
- Regression: Existing Land/Equipment/Labor browse tabs unaffected by the new nav item.

Commit + push: "Phase 3: Bhusa/Parali residue marketplace category"

---

## Phase 4 — New category: Agri-Inputs (Agricultural Inputs)

**Category name:** कृषि सामग्री (Agri-Inputs)

Two sub-types on the same listing form — user selects at the start which type they are:

**Sub-type A: Farmer selling surplus**
A farmer who has extra seeds, fertilizer, or chemicals and wants to sell them.
Fields:
- input_type (dropdown, required): बीज/Seeds, खाद (यूरिया/DAP/अन्य)/Fertilizer, कीटनाशक/Pesticide, अन्य/Other
- item_name (text, required): specific name e.g. "HI-8498 Wheat Seed", "DAP", "Chlorpyrifos"
- quantity (text, required)
- asking_price (text, required)
- material_address (text, required): full address where material is available for pickup — NOT auto-filled from profile, asked explicitly: "सामग्री कहाँ उपलब्ध है? / Where is the material available?"
- material_pincode (required): for distance matching — use this, not the profile pincode
- condition (dropdown, required for seeds/fertilizer): अच्छी स्थिति में/Good condition, मूल पैकेजिंग में/Original packaging, खुली/Opened

**Sub-type B: Vendor listing**
A shop or supplier listing what they sell.
Fields:
- business_name (text, required)
- input_type (same dropdown as above, multi-select)
- items_description (text area, required): what they sell
- price_range (text, optional): general price indication
- shop_address (text, required)
- shop_pincode (required): for distance matching
- contact_phone (pre-filled from profile, editable)

**Important note on vendor listings:** Free to list for now. In the UI, add a subtle note on the vendor listing form: "भविष्य में लिस्टिंग शुल्क लागू हो सकता है। / Listing charges may apply in the future." This sets expectations without blocking listings now. Do NOT implement any payment gate.

**Browse/search:** Same 30km proximity filter using the material/shop pincode. Offer/Requirement filter. Farmer surplus and vendor listings appear in the same browse feed (both are offers of available goods). A "Requirement" listing type for Agri-Inputs is also supported — a farmer looking to buy specific inputs.

**Test checklist:**
- Positive: Create a Farmer Surplus listing (DAP fertilizer, Sagar pincode) — appears in browse, detail view correct.
- Positive: Create a Vendor listing (seed shop in Khurai) — appears in browse alongside farmer surplus listings.
- Positive: Create an Agri-Input Requirement (looking for wheat seeds) — appears in browse with Requirement filter.
- Negative: Farmer surplus submitted without material_address — rejected.
- Negative: Vendor listing submitted without shop_pincode — rejected.
- Regression: All prior categories unaffected.

Commit + push: "Phase 4: Agri-Inputs category (farmer surplus + vendor listings)"

---

## Phase 5 — New section: Expert Consultation Directory

**Model A only (directory, no booking, no payment).**

This is NOT a listing category in the same sense as Land/Equipment — it is a curated, admin-managed directory section. It is NOT user-self-submitted in v1.1 (to protect credibility — only verified experts appear). An admin inserts expert records directly into the database.

**New database table: `experts`**
- id (uuid, primary key)
- name (text, not null)
- name_hi (text — Hindi name, nullable)
- specialisation_en (text): e.g. "Soil Health & Crop Nutrition"
- specialisation_hi (text): Hindi specialisation
- bio_en (text): 2-4 sentence bio
- bio_hi (text): Hindi bio
- phone (text, not null) — revealed via the same disclaimer + tel: link pattern used for listings
- organisation (text, nullable): e.g. "ICAR, Jabalpur" or "Retired, MPKV"
- is_active (boolean, default true)
- created_at (timestamptz)

**RLS:** Public read access for active experts (is_active = true). No public insert/update — admin only via service role key.

**UI:**
- Add "विशेषज्ञ / Experts" as a navigation item (separate from the listings categories)
- Expert directory page: a browsable list of active experts, each showing name, organisation, specialisation, and a short bio
- Tapping an expert card shows the full detail view with the same disclaimer banner and "Call" (tel:) button as listings — phone number revealed only after the disclaimer is shown
- No distance filtering for experts — they're available to all users regardless of location (their knowledge is not geographically limited)
- Search/filter by specialisation (simple client-side filter on the specialisation field)

**Seed data:** Insert at least 2-3 placeholder expert records (clearly marked as "PLACEHOLDER — replace with real expert details before launch") so the section is visually testable without real data.

**Test checklist:**
- Positive: Expert directory page loads, shows placeholder experts, detail view opens correctly with disclaimer and call button.
- Positive: Specialisation filter narrows the list correctly.
- Negative: Attempting to insert an expert via the normal client/anon key is rejected by RLS.
- Edge: Expert with is_active = false does not appear in the public-facing list.

Commit + push: "Phase 5: Expert consultation directory (admin-curated, Model A)"

---

## Phase 6 — Full bilingual audit of all new additions

Audit every new string added in Phases 1-5 for Hindi/English toggle coverage:
- All new category names, nav labels, form field labels, dropdown options, placeholder text, disclaimer copy, error messages
- The soft radius fallback section label ("30-50km away") must have a Hindi equivalent
- The vendor listing "future charges" note must be in both languages
- The Bhusa/Parali environmental disclaimer must be in both languages (it is, per the spec above — verify it's actually wired through the translation system, not hardcoded)

**Test checklist:**
- Toggle language on every new screen added in this prompt and confirm every visible string switches correctly.
- Search codebase for any hardcoded Hindi-only or English-only user-facing strings in new code.

Commit + push: "Phase 6: bilingual audit of all v1.1 additions"

---

## Phase 7 — Integration test pass and documentation

**Cross-category integration checks:**
- Full user journey: sign up → post one listing in each of the 5 categories (Land, Equipment, Labor, Bhusa/Parali, Agri-Inputs) → browse from a second account at a Sagar-district pincode → confirm all 5 appear correctly with correct distance filtering
- Confirm the JSONB `details` schema for the two new categories (Bhusa/Parali and Agri-Inputs) is consistent with the existing three — inspect raw database rows
- Confirm the asset-location fix from Phase 1 applies consistently to ALL 5 categories — no category should be reverting to profile location for distance matching
- Confirm the Experts section loads and functions correctly independently of the listings system

**Update PROJECT_CONTEXT.md** to reflect:
- The 5 new/modified categories and their JSONB field schemas
- The `experts` table schema
- The asset-location fix and the standing rule: distance matching always uses listing location fields, never profile location
- The soft radius fallback behavior
- The admin-only expert insertion pattern (service role key required)
- The v1.1 build sequence and what changed from v1

**Update KNOWN_ISSUES.md** — close any issues that are now resolved (asset-location bug is fixed), and document any new known limitations from this build.

Commit + push: "Phase 7: v1.1 integration tests, PROJECT_CONTEXT.md and KNOWN_ISSUES.md updated"

---

## Explicitly OUT of scope for this build

- Local/forest produce marketplace (imli, ber, gwar, amla) — deferred indefinitely
- Carbon credit/trading feature — content article only, no product feature
- Khurai equipment export — dropped
- WhatsApp voice-to-listing pipeline — future consideration
- Ratings/reviews — v2+
- Phone OTP verification — v2+
- Paid expert consultation booking — v2+
- Any payment processing — never in this codebase

---

## Definition of done for v1.1

- All 5 categories functional: Land (with price field), Equipment (with required rate), Labor (with Drone Didi), Bhusa/Parali, Agri-Inputs
- Asset-location bug fixed and verified across all 5 categories
- Hindi terminology updated: Krishi Mitra, Krishi Sahyogi throughout
- Expert directory live and browsable with placeholder data
- Soft radius fallback working (shows 30-50km results when <5 primary results)
- All new strings fully bilingual, no hardcoded single-language text
- All phase checklists passed (positive, negative, edge cases)
- PROJECT_CONTEXT.md and KNOWN_ISSUES.md updated
- All 7 phases committed and pushed individually to https://github.com/Himanshu1305/Kissansahyog
- App builds and deploys successfully to staging.kissansahyog.com
