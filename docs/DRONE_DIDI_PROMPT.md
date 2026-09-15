# Kisan Sahyog — Drone Didi Category + Dummy Data Prompt

DO NOT ask for approval. Auto-accept all actions. Read PROJECT_CONTEXT.md before starting. Update PROJECT_CONTEXT.md after completing.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy after completing:** `npx wrangler pages deploy dist --project-name kissansahyog`

---

## Context

Drone Didi is a Government of India flagship scheme connecting women self-help groups (SHGs) with drone technology for agricultural use — primarily spraying fertilizer, pesticide, and water on crops. This is being added as a dedicated top-level category on Kisan Sahyog, separate from Labor, because:
- It is a government-backed initiative that deserves high visibility
- The listing model is different from general labor: it is a specific service (drone spraying) offered at a per-acre rate, with a drone asset involved
- Keeping it separate allows it to be found by farmers specifically looking for drone spraying, without needing to browse through general labor listings
- It directly serves the platform's mission of increasing farmer income — Drone Didi operators earn from providing this service

The existing Drone Didi work_type option in the Labor category can remain as-is (some operators may still list there) — this new category is additive, not a replacement.

---

## Phase 1 — New category: Drone Didi

**Category identifier (in DB):** `drone_didi`
**Category name:**
- Hindi: `ड्रोन दीदी`
- English: `Drone Didi`

**Nav placement:** After कृषि सहयोगी (Labor) and before भूसा/पराली (Bhoosa/Parali) — so the order is: Land → Equipment → Labor → Drone Didi → Bhoosa/Parali → Seeds/Fertilizers → Experts.

**Homepage category card:** Add as the 4th card (after Land, Equipment, Labor). Description:
- Hindi: "ड्रोन से खाद और कीटनाशक छिड़काव — महिला उद्यमियों द्वारा संचालित"
- English: "Drone spraying for fertilizer and pesticide — operated by women entrepreneurs"

**Listing fields (stored in `details` JSONB — same listings table, new category value):**

Offer (Drone Didi operator listing their service):
- operator_name (text, required): name of the operator or SHG group
- drone_type (dropdown, required): मल्टी-रोटर/Multi-rotor, फिक्स्ड विंग/Fixed-wing, अन्य/Other
- service_type (multi-select, required): कीटनाशक छिड़काव/Pesticide spraying, खाद छिड़काव/Fertilizer spraying, पानी छिड़काव/Water spraying, बीज बुआई/Seed sowing
- rate_per_acre (text, required): price per acre e.g. "₹250 प्रति एकड़"
- min_acres (text, optional): minimum acreage per booking
- available_from, available_to (dates, optional)
- coverage_area (text, optional): "Khurai and 20km radius" — free text describing their coverage
- asset_pincode (required): where the operator is based — used for distance matching
- asset_village (text, required): village/town of the operator
- government_scheme (boolean, default true): "सरकारी ड्रोन दीदी योजना के तहत / Under Government Drone Didi Scheme" — checkbox, shown on detail view as a badge if true
- crops_covered (text, optional): which crops they have experience with

Requirement (farmer looking for drone spraying):
- crop_type (text, required): which crop needs spraying
- acreage (text, required): how many acres
- service_needed (dropdown, required): same options as service_type above
- preferred_date (date, optional)
- asset_pincode (required): location of the farm needing spraying
- asset_village (text, required)

**Detail view:**
- Show "सरकारी ड्रोन दीदी योजना ✓" badge prominently if government_scheme = true
- Show rate per acre clearly
- Show service types as tags
- Same disclaimer + call button pattern as all other categories

**Help modal ('?' icon) content:**
- Hindi: "ड्रोन दीदी योजना के तहत महिला उद्यमी ड्रोन से आपके खेत में खाद, कीटनाशक या पानी का छिड़काव करती हैं। यह सेवा सस्ती, तेज़ और सटीक होती है। ड्रोन ऑपरेटर अपनी सेवा यहाँ लिस्ट कर सकती हैं, और किसान अपने खेत के लिए ड्रोन बुक कर सकते हैं।"
- English: "Under the Drone Didi government scheme, women entrepreneurs use drones to spray fertilizer, pesticide, or water on your fields. The service is affordable, fast, and precise. Drone operators can list their service here, and farmers can find a drone operator near their farm."

**Form placeholder text:**
- operator_name: "जैसे: राधा महिला स्वयं सहायता समूह / e.g. Radha Women SHG"
- rate_per_acre: "जैसे: ₹250 प्रति एकड़ / e.g. ₹250 per acre"
- coverage_area: "जैसे: खुरई और 20 किमी आसपास / e.g. Khurai and 20km around"
- crop_type (requirement): "जैसे: गेहूं, सोयाबीन / e.g. wheat, soybean"
- acreage: "जैसे: 5 एकड़ / e.g. 5 acres"
- asset_pincode: "ऑपरेटर कहाँ से हैं? पिनकोड डालें / Where is the operator based? Enter pincode"

**Bilingual:** All new strings (category name, card description, help modal, form labels, placeholders, badge text) must be wired through the existing translation system — no hardcoded text anywhere.

---

## Phase 2 — Dummy data: 8 Drone Didi listings

Add `is_test_data = true` to all dummy listings (existing flag from the seed migration). Use existing dummy users where available; create 2 additional Drone Didi-specific test users if needed for realism.

**2 additional test users (if needed for operator realism):**
- User 8: राधा महिला स्वयं सहायता समूह — phone: 9999000008 — village: Khurai — pincode: (Khurai pincode) — is_test_data: true
- User 9: गायत्री ड्रोन सेवाएं — phone: 9999000009 — village: Rahatgarh — pincode: (Rahatgarh pincode) — is_test_data: true

**8 dummy Drone Didi listings:**

1. **Offer** — user: राधा महिला SHG (9999000008) — operator: "राधा महिला स्वयं सहायता समूह, खुरई" — drone: Multi-rotor — services: Pesticide + Fertilizer spraying — rate: ₹250 प्रति एकड़ — min_acres: 2 — available: Oct 1 to Mar 31 — coverage: खुरई और 25 किमी आसपास — govt_scheme: true — crops: गेहूं, सोयाबीन, चना — asset_pincode: Khurai

2. **Offer** — user: गायत्री ड्रोन सेवाएं (9999000009) — operator: "गायत्री ड्रोन सेवाएं, राहतगढ़" — drone: Multi-rotor — services: Pesticide + Water spraying — rate: ₹220 प्रति एकड़ — min_acres: 3 — available: Now — coverage: राहतगढ़ और आसपास — govt_scheme: true — crops: धान, मक्का — asset_pincode: Rahatgarh

3. **Offer** — user: गीताबाई विश्वकर्मा (9999000004) — operator: "गीताबाई विश्वकर्मा, देवरी" — drone: Multi-rotor — services: Pesticide spraying — rate: ₹280 प्रति एकड़ — available: Now — coverage: देवरी और 15 किमी — govt_scheme: false — crops: सोयाबीन, उड़द — asset_pincode: Deori

4. **Offer** — user: शांतिबाई कुशवाह (9999000007) — operator: "शांतिबाई ड्रोन सेवा, राहतगढ़" — drone: Multi-rotor — services: Fertilizer + Seed sowing — rate: ₹300 प्रति एकड़ — available: Nov 1 to Feb 28 — coverage: राहतगढ़, बांदा और आसपास — govt_scheme: true — crops: गेहूं, सरसों — asset_pincode: Rahatgarh

5. **Offer** — user: राधा महिला SHG (9999000008) — operator: "राधा महिला स्वयं सहायता समूह" — drone: Multi-rotor — services: Pesticide + Fertilizer + Water spraying — rate: ₹240 प्रति एकड़ (bulk discount for 10+ acres) — min_acres: 5 — available: Now — coverage: खुरई, बीना, मालथोन — govt_scheme: true — crops: सभी फसलें/All crops — asset_pincode: Khurai

6. **Requirement** — user: रामलाल पटेल (9999000001) — crop: गेहूं — acreage: 8 एकड़ — service: Pesticide spraying — preferred_date: Nov 15 — asset_pincode: Khurai

7. **Requirement** — user: मोहन सिंह ठाकुर (9999000003) — crop: सोयाबीन — acreage: 5 एकड़ — service: Fertilizer spraying — preferred_date: None — asset_pincode: Rehli

8. **Requirement** — user: राजेश कुमार यादव (9999000005) — crop: मक्का — acreage: 3 एकड़ — service: Pesticide + Water spraying — preferred_date: Oct 20 — asset_pincode: Malthone

---

## Phase 3 — Verification and documentation

**Verify on staging:**
- Drone Didi appears as 4th nav item, between Labor and Bhoosa/Parali
- Homepage shows Drone Didi as a category card (now 7 cards total: Land, Equipment, Labor, Drone Didi, Bhoosa/Parali, Seeds/Fertilizers, Experts)
- Browse → Drone Didi shows 5 Offers and 3 Requirements
- Government scheme badge shows on listings where govt_scheme = true
- Rate per acre is prominently displayed on listing cards and detail view
- Help modal opens correctly on mobile with correct Hindi/English content
- Distance filtering uses asset_pincode (operator's base location), not profile pincode
- Unauthenticated users can see listings but not phone numbers (existing privacy pattern)

**Dummy data verification:**
```sql
SELECT 
  (SELECT COUNT(*) FROM profiles WHERE is_test_data = true) as dummy_users,
  (SELECT COUNT(*) FROM listings WHERE is_test_data = true) as dummy_listings,
  (SELECT COUNT(*) FROM listings WHERE category = 'drone_didi' AND is_test_data = true) as drone_didi_listings;
```
Expected: dummy_users = 9, dummy_listings = 46 (38 original + 8 new), drone_didi_listings = 8.

Update seed_log:
```sql
INSERT INTO seed_log (seed_name, record_count, notes)
VALUES ('dummy_data_drone_didi_v1', 8, 'Drone Didi category test data. 2 new test users (9999000008-9), 8 listings (5 offers, 3 requirements). Remove with: DELETE FROM listings WHERE category = ''drone_didi'' AND is_test_data = true;');
```

**Update PROJECT_CONTEXT.md:**
- Add drone_didi to the category list with its JSONB schema
- Note that nav order is now: Land → Equipment → Labor → Drone Didi → Bhoosa/Parali → Seeds/Fertilizers → Experts
- Note that homepage now has 7 category cards
- Update dummy data counts (9 test users, 46 test listings)

**Test checklist:**
- Positive: Post a Drone Didi Offer listing — appears in browse, detail view shows govt_scheme badge correctly
- Positive: Post a Drone Didi Requirement — appears in browse with Requirement filter
- Positive: Help modal shows correct content in both Hindi and English
- Positive: Language toggle switches all new strings correctly
- Negative: Submit Drone Didi Offer without rate_per_acre — rejected with clear message
- Negative: Submit without asset_pincode — rejected
- Edge: Operator with govt_scheme = false does NOT show the government badge
- Regression: All 6 existing categories (Land, Equipment, Labor, Bhoosa/Parali, Seeds/Fertilizers, Experts) unaffected — verify browse and post still work for each

---

## Commit and deploy

Single commit: "Drone Didi: new top-level category, 8 dummy listings, 2 test users, help modal, form placeholders"
Deploy: `npx wrangler pages deploy dist --project-name kissansahyog`
Confirm staging.kissansahyog.com shows Drone Didi in nav and homepage after deploy.
