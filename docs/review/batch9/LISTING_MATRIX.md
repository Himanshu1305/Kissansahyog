# Batch 9 Phase 5B.3 — LISTING MATRIX (staging WEBSITE, phone viewport)

Run 2026-10-15 on https://staging.kissansahyog.com (same `Post.jsx` as the staging app, same staging Supabase
project), headless Chromium 412×915, each persona signed in by mobile, posting through the real 3-step Post UI.
**Not covered:** the app itself (no emulator this session, low memory) and the real camera/gallery picker —
photos were attached with Playwright `setInputFiles` and a generated test JPEG.
Every listing's coordinates come from the "use current location" button (browser geolocation set to the
persona's town). Marker: the asset village text `KSTEST-KEEP Lnn <town>` (stored in `listings.village_name`;
see finding F-village — it is not displayed anywhere). Script: `scripts/phase5b/listings.mjs`;
results: `results-phase5b.json` / `RESULTS_PHASE5B.md`.

**Registry:** 11 enabled categories (`src/lib/listings/registry.jsx:22`), and every one offers BOTH types
(step 1 shows offer + requirement for all; nothing is "not offered"). 22 category × type cells → all 22
posted (RAN-PASSED), plus L23 (HIDDEN vendor agri-inputs, leak check), L24 (far-away SHOWN poster) and
L25 (noise, used for the My Listings close test). **25/25 RAN-PASSED, 0 failed, 0 skipped, 0 not-offered.**

Sources: farmer personas posted as farmer; P5/P6 as vendor (`post-source-vendor`); P7 posted the provider
categories (equipment, warehouse, greenhouse, jugaad offers) with the provider declaration ticked — server
row has `provider_declared: true` on all four.

| # | Category | Type | Source | Persona | Result | Listing id | Checked on the server row | Evidence |
|---|---|---|---|---|---|---|---|---|
| L01 | equipment | offer (seller) | farmer | P7 (SHOWN) | RAN-PASSED | `3cd24b09-0eac-4840-8776-abb353d3e316` | photo ✓ (1 stored); provider declaration ✓ | evidence/phase5b/listings/L01-equipment-offer/ |
| L02 | equipment | requirement (buyer) | farmer | P2 (SHOWN) | RAN-PASSED | `424248fa-f587-4239-814d-ba2b9ccb8f48` |  | evidence/phase5b/listings/L02-equipment-requirement/ |
| L03 | labor | offer (seller) | farmer | P1 (SHOWN) | RAN-PASSED | `76e13f41-f2eb-4565-998a-5244640329b7` |  | evidence/phase5b/listings/L03-labor-offer/ |
| L04 | labor | requirement (buyer) | farmer | P2 (SHOWN) | RAN-PASSED | `915e5178-331e-4acf-ad1e-9d06888b56c8` |  | evidence/phase5b/listings/L04-labor-requirement/ |
| L05 | drone_didi | offer (seller) | farmer | P1 (SHOWN) | RAN-PASSED | `8f5c1fb1-fdc8-4df9-a3e8-da909ac59263` |  | evidence/phase5b/listings/L05-drone_didi-offer/ |
| L06 | drone_didi | requirement (buyer) | farmer | P2 (SHOWN) | RAN-PASSED | `0ee85a0d-b623-457f-913a-cbedc7aa7bde` |  | evidence/phase5b/listings/L06-drone_didi-requirement/ |
| L07 | bhusa | offer (seller) | farmer | P1 (SHOWN) | RAN-PASSED | `364cf291-9d74-48dd-97e9-c7c18953921b` | wide ✓ (server wide_visibility=true); photo ✓ (1 stored) | evidence/phase5b/listings/L07-bhusa-offer/ |
| L08 | bhusa | requirement (buyer) | vendor | P6 (HIDDEN) | RAN-PASSED | `087638e1-c335-458f-a820-516a06f454be` |  | evidence/phase5b/listings/L08-bhusa-requirement/ |
| L09 | agri_inputs | offer (seller) | vendor | P5 (SHOWN) | RAN-PASSED | `3b8071b1-e3a4-412b-8ac3-3fe8530197ad` | wide ✓ (server wide_visibility=true); **owner mobile stored in public details.contact_phone** | evidence/phase5b/listings/L09-agri_inputs-offer/ |
| L10 | agri_inputs | requirement (buyer) | farmer | P4 (HIDDEN) | RAN-PASSED | `203a0859-a432-4a2a-ab64-8d954baa13c9` |  | evidence/phase5b/listings/L10-agri_inputs-requirement/ |
| L11 | building_materials | offer (seller) | vendor | P5 (SHOWN) | RAN-PASSED | `3338eb8b-2e71-47e9-a6cd-a30367a205f0` | photo ✓ (1 stored) | evidence/phase5b/listings/L11-building_materials-offer/ |
| L12 | building_materials | requirement (buyer) | vendor | P6 (HIDDEN) | RAN-PASSED | `f4ffa4dc-8b72-45c2-96a6-b9fc95ca41f9` |  | evidence/phase5b/listings/L12-building_materials-requirement/ |
| L13 | warehouse | offer (seller) | farmer | P7 (SHOWN) | RAN-PASSED | `d14c4ac6-a1cc-48e3-9656-4dc9a240864c` | photo ✓ (1 stored); provider declaration ✓ | evidence/phase5b/listings/L13-warehouse-offer/ |
| L14 | warehouse | requirement (buyer) | farmer | P4 (HIDDEN) | RAN-PASSED | `6d551014-1d1a-4736-be14-7be86ef40659` |  | evidence/phase5b/listings/L14-warehouse-requirement/ |
| L15 | greenhouse | offer (seller) | vendor | P7 (SHOWN) | RAN-PASSED | `bb28aff9-08b3-4813-a420-772c44649157` | wide ✓ (server wide_visibility=true); provider declaration ✓ | evidence/phase5b/listings/L15-greenhouse-offer/ |
| L16 | greenhouse | requirement (buyer) | farmer | P2 (SHOWN) | RAN-PASSED | `44442f60-abf9-4519-b8ff-26d297d1c072` |  | evidence/phase5b/listings/L16-greenhouse-requirement/ |
| L17 | jugaad | offer (seller) | farmer | P7 (SHOWN) | RAN-PASSED | `f453ce46-82c3-4c35-9ac7-030c046a30df` | photo ✓ (1 stored); provider declaration ✓ | evidence/phase5b/listings/L17-jugaad-offer/ |
| L18 | jugaad | requirement (buyer) | farmer | P3 (HIDDEN) | RAN-PASSED | `d1bc23b1-992b-4617-a7d0-ea06d2a9de6d` |  | evidence/phase5b/listings/L18-jugaad-requirement/ |
| L19 | transport | offer (seller) | farmer | P3 (HIDDEN) | RAN-PASSED | `97af326f-2838-4e87-9fed-497b723eef28` | from/to ✓ | evidence/phase5b/listings/L19-transport-offer/ |
| L20 | transport | requirement (buyer) | farmer | P8 (SHOWN) | RAN-PASSED | `6dd92f00-be98-435b-8709-906e89af9592` | from/to ✓ | evidence/phase5b/listings/L20-transport-requirement/ |
| L21 | land | offer (seller) | farmer | P3 (HIDDEN) | RAN-PASSED | `125b9723-e476-4b38-bd85-f82cbf66b958` | photo ✓ (1 stored); ownership self-declaration ✓ | evidence/phase5b/listings/L21-land-offer/ |
| L22 | land | requirement (buyer) | farmer | P8 (SHOWN) | RAN-PASSED | `3ac1830c-ad5e-4fac-a333-e6fd63e50096` |  | evidence/phase5b/listings/L22-land-requirement/ |
| L23 | agri_inputs | offer (seller) | vendor | P6 (HIDDEN) | RAN-PASSED | `2286327f-63b1-4101-b666-293f07c17476` | **owner mobile stored in public details.contact_phone** | evidence/phase5b/listings/L23-agri_inputs-offer/ |
| L24 | labor | offer (seller) | farmer | P8 (SHOWN) | RAN-PASSED | `64a21928-58ef-4723-b389-2a547f506b88` |  | evidence/phase5b/listings/L24-labor-offer/ |
| L25 | labor | offer (seller) | farmer | P1 (SHOWN) | RAN-PASSED (closed later in V4) | `8886a32b-562c-4ca5-b4d7-d94c5e61cc52` | KSTEST noise | evidence/phase5b/listings/L25-labor-offer/ |

## Edge checks (throw-away account `KSTEST N1`, never a KEEP persona) — `scripts/phase5b/listing-edges.mjs`

| Id | Check | Result | What was seen |
|---|---|---|---|
| E1 | Every category × type (22) on an empty step 2 shows its required-field message and stays on step 2 | RAN-PASSED | 22/22, e.g. "कृपया मशीन का प्रकार चुनें।", "कृषि सहयोगियों की संख्या 1 या उससे अधिक होनी चाहिए।" |
| E2 | 3-step form: Back keeps data (step 3→2→1→2→3) incl. photos and the step-3 village | RAN-PASSED | all kept |
| E3a | Maps link `https://example.com/…` → message on blur and on Submit, nothing posted | RAN-PASSED | "सिर्फ़ Google Maps का सही लिंक डालें।", 0 create calls |
| E3b | Valid `https://maps.app.goo.gl/…` accepted and stored as `details.map_url` | RAN-PASSED | noise listing `926651a4-8eb1-4095-b63d-7a20a546c0b4` |
| E4 | Transport: missing "to" and missing "from" each blocked | RAN-PASSED | "कहाँ तक जाना है, लिखें।" / "कहाँ से जाना है, लिखें।" |
| E5 | Double tap on Submit → exactly one listing | RAN-PASSED | 1 create call |
| E6 | Posting while offline (`context.setOffline`) → message, nothing created, no duplicate | RAN-PASSED (note) | My Listings count unchanged; message is the generic "कुछ गड़बड़ हुई। कृपया दोबारा कोशिश करें।" — it does not say "no internet" |
| E7 | Photo limit: 4 photos into bhusa (limit 3) | RAN-PASSED | counter "3/3" |
| E8 | Wide-visibility box only for eligible categories | RAN-PASSED | bhusa shows it, labor does not |
| F-photohelp | Photo help text vs limit | **RAN-FAILED** | warehouse/land/greenhouse counter "1/5" but help text "ज़्यादा से ज़्यादा 3 फोटो" (duplicate key `photos_help`, `strings.js:869` and `:894`) — `listings/L13-warehouse-offer/step2.jpg` |
| F-village | Asset village shown to buyers | **RAN-FAILED** | not shown on the card or detail page (`village_name` stored; UI reads `village_town`/`pincode`) — `visibility/V2-shown-loggedin.jpg` |
