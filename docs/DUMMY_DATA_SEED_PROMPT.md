# Kisan Sahyog — Dummy Data Seed Prompt

DO NOT ask for approval. Auto-accept all actions. Read PROJECT_CONTEXT.md before starting.

This prompt creates realistic dummy data for testing and demonstration purposes. All data is clearly marked as test data in the database. No UI changes — database seeding only.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Target area:** Khurai tehsil and surrounding areas, Sagar district, Madhya Pradesh

---

## Objective

Seed the database with realistic-looking dummy data across all categories so:
- The homepage shows live listings
- Browse tabs show meaningful results
- Distance filtering can be tested across different pincodes
- The admin dashboard shows non-zero stats
- The platform looks lived-in to a first-time visitor

---

## Step 1 — Research and verify real Khurai-area pincodes

Before writing any seed data, look up and verify real pincodes for Khurai and surrounding villages/towns in Sagar district, MP. Use only real, accurate pincodes with real approximate lat/long coordinates. Do not fabricate pincode data.

Target areas to cover (research actual pincodes for each):
- Khurai town (main)
- Banda (near Khurai)
- Rehli
- Deori
- Malthone
- Bina
- Rahatgarh
- Sagar city

Seed any missing pincodes into the `pincodes` table (the existing table already has 20 Sagar-district pincodes — add any of the above that are missing, with accurate lat/long). Document which pincodes were added.

---

## Step 2 — Create 7 dummy user profiles

Create 7 fake user profiles using clearly fake phone numbers (use numbers starting with 9999 so they are obviously test data and cannot be mistaken for real users). Set `is_test_data = true` on each — add this boolean column to the `profiles` table (default false, existing rows stay false) so test data can be bulk-deleted later without touching real users.

Migration: add `is_test_data boolean NOT NULL DEFAULT false` to profiles.

Dummy users — use realistic Indian farming names from the Sagar/Bundelkhand region:

1. रामलाल पटेल — phone: 9999000001 — village: Khurai — pincode: (Khurai pincode)
2. सुरेश कुमार लोधी — phone: 9999000002 — village: Banda — pincode: (Banda pincode)
3. मोहन सिंह ठाकुर — phone: 9999000003 — village: Rehli — pincode: (Rehli pincode)
4. गीताबाई विश्वकर्मा — phone: 9999000004 — village: Deori — pincode: (Deori pincode)
5. राजेश कुमार यादव — phone: 9999000005 — village: Malthone — pincode: (Malthone pincode)
6. प्रकाश सिंह परिहार — phone: 9999000006 — village: Bina — pincode: (Bina pincode)
7. शांतिबाई कुशवाह — phone: 9999000007 — village: Rahatgarh — pincode: (Rahatgarh pincode)

Set `preferred_language = 'hi'` for all, `disclaimer_accepted_at = now()`, `auth_provider = 'phone'` for all.

---

## Step 3 — Seed dummy listings

Add `is_test_data boolean NOT NULL DEFAULT false` to the `listings` table as well (same pattern). All dummy listings below get `is_test_data = true`.

Create the following listings — distribute them across the 7 dummy users realistically (one user can have multiple listings of different types):

### Land listings (8 total — mix of Offers and Requirements)

1. **Offer** — user: रामलाल पटेल — 3-5 acres — arrangement: बटाई — water: borewell — crop: गेहूं — season: rabi — price_type: sharecropping — price: "50% बटाई / 50% crop share" — location: Khurai pincode
2. **Offer** — user: सुरेश कुमार लोधी — 1-2 acres — arrangement: lease — water: canal — crop: सोयाबीन — season: kharif — price_type: fixed — price: "₹8,000 प्रति एकड़ / ₹8,000 per acre" — location: Banda pincode
3. **Offer** — user: मोहन सिंह ठाकुर — 5-10 acres — arrangement: contract_farming — water: rainfed — crop: चना — season: rabi — price_type: negotiable — price: "बातचीत से / Negotiable" — location: Rehli pincode
4. **Offer** — user: प्रकाश सिंह परिहार — 2-5 acres — arrangement: batai — water: borewell — crop: मसूर — season: rabi — price_type: sharecropping — price: "40% बटाई" — location: Bina pincode
5. **Requirement** — user: राजेश कुमार यादव — looking for 2-5 acres — kharif — soybean — any water source — location: Malthone pincode
6. **Requirement** — user: गीताबाई विश्वकर्मा — looking for 1-2 acres — rabi — wheat — borewell preferred — location: Deori pincode
7. **Offer** — user: शांतिबाई कुशवाह — 1-2 acres — arrangement: lease — water: canal — crop: लहसुन — season: rabi — price_type: fixed — price: "₹12,000 प्रति एकड़" — location: Rahatgarh pincode
8. **Requirement** — user: रामलाल पटेल — looking for 5-10 acres — year round — paddy — canal water — location: Khurai pincode

### Equipment listings (10 total)

1. **Offer** — user: सुरेश कुमार लोधी — Tractor — per acre — ₹800 प्रति एकड़ — available now — location: Banda
2. **Offer** — user: मोहन सिंह ठाकुर — Thresher — per day — ₹1,500 प्रति दिन — available now — location: Rehli
3. **Offer** — user: प्रकाश सिंह परिहार — Harvester — per acre — ₹1,200 प्रति एकड़ — available: Nov-Dec — location: Bina
4. **Offer** — user: राजेश कुमार यादव — Rotavator — per acre — ₹600 प्रति एकड़ — available now — location: Malthone
5. **Offer** — user: रामलाल पटेल — Trolley — per day — ₹500 प्रति दिन — available now — location: Khurai
6. **Offer** — user: शांतिबाई कुशवाह — Seed Drill — per acre — ₹400 प्रति एकड़ — available: Oct-Nov — location: Rahatgarh
7. **Offer** — user: गीताबाई विश्वकर्मा — Drone — per acre — ₹250 प्रति एकड़ (Drone Didi) — available now — location: Deori
8. **Requirement** — user: रामलाल पटेल — needs Harvester — per acre — location: Khurai
9. **Requirement** — user: राजेश कुमार यादव — needs Tractor — per day — location: Malthone
10. **Requirement** — user: मोहन सिंह ठाकुर — needs Thresher — per day — location: Rehli

### Labor listings (7 total)

1. **Offer** — user: गीताबाई विश्वकर्मा — 8 workers — harvesting — available Oct 15 to Nov 30 — ₹450 प्रति दिन प्रति व्यक्ति — location: Deori
2. **Offer** — user: शांतिबाई कुशवाह — 5 workers — sowing — available now — ₹350 प्रति दिन — location: Rahatgarh
3. **Offer** — user: प्रकाश सिंह परिहार — 12 workers — general/palledaar — available now — बातचीत से — location: Bina
4. **Offer** — user: सुरेश कुमार लोधी — 3 workers — weeding — available now — ₹300 प्रति दिन — location: Banda
5. **Offer** — user: गीताबाई विश्वकर्मा — 2 Drone operators (Drone Didi) — drone spraying — available now — ₹250 प्रति एकड़ — location: Deori
6. **Requirement** — user: रामलाल पटेल — needs 10 workers — harvesting — Oct-Nov — location: Khurai
7. **Requirement** — user: मोहन सिंह ठाकुर — needs 5 workers — sowing — location: Rehli

### Bhusa/Parali listings (6 total)

1. **Offer** — user: सुरेश कुमार लोधी — Parali (paddy straw) — 50 quintal — buyer collects from farm — individual/small buyer — ₹150 प्रति क्विंटल — location: Banda
2. **Offer** — user: मोहन सिंह ठाकुर — Bhusa (wheat straw) — 30 quintal — either works — commercial/industrial buyer preferred — ₹120 प्रति क्विंटल — location: Rehli
3. **Offer** — user: राजेश कुमार यादव — Bhusa — 2 trolley loads — farmer will deliver — either — बातचीत से — location: Malthone
4. **Offer** — user: प्रकाश सिंह परिहार — Sugarcane waste — 20 quintal — buyer collects — commercial/industrial — ₹80 प्रति क्विंटल — location: Bina
5. **Requirement** — user: रामलाल पटेल — needs Bhusa — 10 quintal — individual buyer — will collect — location: Khurai
6. **Requirement** — user: शांतिबाई कुशवाह — needs Parali — 25 quintal — commercial — farmer delivers preferred — location: Rahatgarh

### Agri-Inputs listings (7 total)

1. **Farmer surplus Offer** — user: रामलाल पटेल — Seeds (HI-8498 गेहूं बीज) — 5 quintal — ₹3,200 प्रति क्विंटल — original packaging — address: Khurai mandi area — location: Khurai pincode
2. **Farmer surplus Offer** — user: गीताबाई विश्वकर्मा — Fertilizer (DAP) — 10 bags — ₹1,350 प्रति बैग — good condition — address: Deori village — location: Deori pincode
3. **Farmer surplus Offer** — user: शांतिबाई कुशवाह — Pesticide (Chlorpyrifos 20% EC) — 8 litres — ₹420 प्रति लीटर — original packaging — address: Rahatgarh — location: Rahatgarh pincode
4. **Vendor Offer** — user: प्रकाश सिंह परिहार — business: "पटेल कृषि केंद्र, खुरई" — sells: Seeds, Fertilizer, Pesticide — "सभी प्रकार के बीज, खाद और कीटनाशक उपलब्ध। उचित दाम, घर पहुंच सेवा।" — shop address: Near Bus Stand, Khurai — location: Khurai pincode
5. **Vendor Offer** — user: सुरेश कुमार लोधी — business: "लोधी एग्रो सेंटर, बांदा" — sells: Fertilizer, Seeds — "यूरिया, DAP, NPK सभी खाद उपलब्ध। बांदा और आसपास डिलीवरी।" — shop address: Main Road, Banda — location: Banda pincode
6. **Requirement** — user: मोहन सिंह ठाकुर — needs: Soybean seeds (JS-9560 variety) — 2 quintal — location: Rehli
7. **Requirement** — user: राजेश कुमार यादव — needs: Urea fertilizer — 20 bags — location: Malthone

---

## Step 4 — Mark all dummy data clearly

After inserting all the above, run a verification query to confirm:
```sql
SELECT 
  (SELECT COUNT(*) FROM profiles WHERE is_test_data = true) as dummy_users,
  (SELECT COUNT(*) FROM listings WHERE is_test_data = true) as dummy_listings;
```
Expected: 7 dummy users, 38 dummy listings.

Also insert one record into a new `seed_log` table (create it):
```sql
CREATE TABLE IF NOT EXISTS seed_log (
  id serial PRIMARY KEY,
  seed_name text,
  seeded_at timestamptz DEFAULT now(),
  record_count integer,
  notes text
);
INSERT INTO seed_log (seed_name, record_count, notes) 
VALUES ('dummy_data_khurai_v1', 38, 'Test data for Khurai area. 7 fake users (9999000001-7), 38 listings across all 5 categories. Delete with: DELETE FROM listings WHERE is_test_data = true; DELETE FROM profiles WHERE is_test_data = true;');
```

---

## Step 5 — Verify on staging

After seeding, confirm:
- Homepage shows listings in the live listings section
- Browse → Land shows at least 6-8 listings
- Browse → Equipment shows at least 8-10 listings
- Browse → Labor shows at least 5-7 listings
- Browse → Bhusa/Parali shows at least 4-6 listings
- Browse → Agri-Inputs shows at least 5-7 listings
- Admin dashboard stats show non-zero numbers
- Distance filtering works: from a Khurai pincode, all listings should appear (all within 30km of each other within Sagar district)

---

## Cleanup note (document in PROJECT_CONTEXT.md)

Add a section "Test Data" to PROJECT_CONTEXT.md explaining:
- All test data has `is_test_data = true`
- Test user phone numbers are 9999000001 through 9999000007
- To remove all test data before public launch:
```sql
DELETE FROM listings WHERE is_test_data = true;
DELETE FROM profiles WHERE is_test_data = true;
```
- Do NOT delete test data before the platform has enough real users to replace it visually

Commit + push: "Seed: dummy data for Khurai area testing (38 listings, 7 test users)"
