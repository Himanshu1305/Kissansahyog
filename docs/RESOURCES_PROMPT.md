# Kisan Sahyog — Resource Directories + Homepage Section Prompt

DO NOT ask for approval. Auto-accept all actions. Read PROJECT_CONTEXT.md before starting. Update PROJECT_CONTEXT.md after completing.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy after completing:** `npx wrangler pages deploy dist --project-name kissansahyog`

---

## Overview

Build Section 6.3 of the platform — a "Useful Resources" (उपयोगी संपर्क) section containing three practical directories for farmers:
1. Soil Testing Laboratories
2. Veterinary / Animal Doctor contacts
3. Government Agricultural Offices

These are NOT listing categories — they are static, admin-managed information pages with real contact data. No user posting required. Think of them as a well-organised information board for a farmer who needs a contact.

Also add a Resources highlight section on the public homepage so visitors can see this feature immediately.

---

## Phase 1 — Database schema for resources

Create a new table `resources` in Supabase (write migration 0016):

```sql
CREATE TABLE resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type text NOT NULL CHECK (resource_type IN ('soil_lab', 'veterinary', 'govt_office')),
  name_hi text NOT NULL,
  name_en text NOT NULL,
  description_hi text,
  description_en text,
  address_hi text,
  address_en text,
  district text NOT NULL DEFAULT 'Sagar',
  area text, -- e.g. 'Khurai', 'Sagar City', 'Deori'
  phone_primary text,
  phone_secondary text,
  phone_tollfree text,
  email text,
  website text,
  timings_hi text,
  timings_en text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

RLS: Public read for is_active = true. Admin-only insert/update/delete (service role key).

**Seed the following verified real contacts directly in the migration:**

### Soil Testing Labs (resource_type = 'soil_lab')

**Record 1:**
- name_hi: "मृदा परीक्षण प्रयोगशाला, सागर"
- name_en: "Soil Testing Laboratory, Sagar"
- description_hi: "सरकारी मृदा परीक्षण प्रयोगशाला — मिट्टी के 14 पैरामीटर की जांच, खाद की सही मात्रा की जानकारी"
- description_en: "Government soil testing laboratory — tests 14 soil parameters, provides fertilizer dosage recommendations"
- address_hi: "जिला कृषि कार्यालय परिसर, सागर, म.प्र."
- address_en: "District Agriculture Office Campus, Sagar, M.P."
- district: "Sagar"
- area: "Sagar City"
- phone_tollfree: "1800-180-1551"
- website: "https://mpstl.mponline.gov.in"
- timings_hi: "सोमवार-शनिवार, सुबह 10 बजे से शाम 5 बजे तक"
- timings_en: "Monday–Saturday, 10 AM to 5 PM"

**Record 2:**
- name_hi: "मृदा सर्वेक्षण प्रयोगशाला, सागर"
- name_en: "Soil Survey Laboratory, Sagar"
- description_hi: "JNKVV के अंतर्गत मृदा सर्वेक्षण और परीक्षण सुविधा"
- description_en: "Soil survey and testing facility under JNKVV (Jawaharlal Nehru Krishi Vishwa Vidyalaya)"
- address_hi: "JNKVV परिसर, सागर, म.प्र."
- address_en: "JNKVV Campus, Sagar, M.P."
- district: "Sagar"
- area: "Sagar City"
- phone_primary: "07582-288228"
- email: "kvk_sagar@rediff.com"

**Record 3 — Online portal note:**
- name_hi: "ऑनलाइन मिट्टी परीक्षण आवेदन (MP Online)"
- name_en: "Online Soil Testing Application (MP Online)"
- description_hi: "घर बैठे ऑनलाइन मृदा परीक्षण के लिए आवेदन करें। नमूना जमा करने की प्रक्रिया और निकटतम प्रयोगशाला खोजें।"
- description_en: "Apply online for soil testing from home. Find nearest lab and learn sample submission process."
- district: "Sagar"
- area: "All areas"
- website: "https://mpstl.mponline.gov.in"
- timings_hi: "24 घंटे उपलब्ध"
- timings_en: "Available 24 hours"

### Veterinary Contacts (resource_type = 'veterinary')

**Record 1 — MP Mobile Veterinary Unit (most important — toll-free):**
- name_hi: "मोबाइल पशु चिकित्सा सेवा (घर पर इलाज)"
- name_en: "Mobile Veterinary Service (Treatment at Home)"
- description_hi: "पशु बीमार हो तो घर पर डॉक्टर बुलाएं। सुबह 7 बजे से शाम 5 बजे तक 1962 पर कॉल करें — एंबुलेंस आपके घर आएगी।"
- description_en: "If your animal is sick, call a doctor home. Call 1962 from 7 AM to 5 PM — ambulance will come to your location."
- district: "Sagar"
- area: "All areas"
- phone_tollfree: "1962"
- timings_hi: "सोमवार-रविवार, सुबह 7 बजे से शाम 5 बजे तक"
- timings_en: "Monday–Sunday, 7 AM to 5 PM"

**Record 2 — MP Directorate of Animal Husbandry:**
- name_hi: "पशुपालन एवं डेयरी विभाग, म.प्र."
- name_en: "Directorate of Animal Husbandry & Dairying, M.P."
- description_hi: "पशुपालन योजनाओं, बीमा, नस्ल सुधार और पशु चिकित्सा सेवाओं के लिए संपर्क करें"
- description_en: "Contact for animal husbandry schemes, insurance, breed improvement and veterinary services"
- district: "Sagar"
- area: "Madhya Pradesh"
- phone_primary: "07552-772262"
- email: "dirveterinary@mp.gov.in"
- website: "https://mpdah.gov.in"
- timings_hi: "सोमवार-शनिवार, सुबह 10 बजे से शाम 5 बजे तक"
- timings_en: "Monday–Saturday, 10 AM to 5 PM"

**Record 3 — Veterinary Hospital Khurai area:**
- name_hi: "पशु चिकित्सालय, खुरई"
- name_en: "Veterinary Hospital, Khurai"
- description_hi: "खुरई क्षेत्र के पशुपालकों के लिए नज़दीकी पशु चिकित्सा सुविधा"
- description_en: "Nearest veterinary facility for animal keepers in the Khurai area"
- address_hi: "बड़ोदिया नैनागीर, जिला सागर, खुरई, म.प्र. 470117"
- address_en: "Barodiya Nainagir, District Sagar, Khurai, M.P. 470117"
- district: "Sagar"
- area: "Khurai"
- timings_hi: "सोमवार-शनिवार, सुबह 9 बजे से शाम 5 बजे तक"
- timings_en: "Monday–Saturday, 9 AM to 5 PM"

**Record 4 — Dr. Rohit Kumar Sitole (Khurai area vet):**
- name_hi: "डॉ. रोहित कुमार सिटोल, पशु चिकित्सक"
- name_en: "Dr. Rohit Kumar Sitole, Veterinary Surgeon"
- description_hi: "V.A.S. बड़धा ब्लॉक, खुरई — पशु चिकित्सा सहायक शल्यज्ञ"
- description_en: "V.A.S. Bardha Block, Khurai — Veterinary Assistant Surgeon"
- address_hi: "V.A.S. बड़धा ब्लॉक, खुरई, जिला सागर, म.प्र."
- address_en: "V.A.S. Bardha Block, Khurai, Distt. Sagar, M.P."
- district: "Sagar"
- area: "Khurai"

### Government Agricultural Offices (resource_type = 'govt_office')

**Record 1 — KVK Sagar-I (most important):**
- name_hi: "कृषि विज्ञान केन्द्र, सागर-I"
- name_en: "Krishi Vigyan Kendra (KVK), Sagar-I"
- description_hi: "किसानों को कृषि प्रशिक्षण, नई तकनीक की जानकारी, मिट्टी परीक्षण और कृषि विशेषज्ञों से परामर्श के लिए संपर्क करें"
- description_en: "Contact for agricultural training, new technology guidance, soil testing, and consultation with agricultural scientists"
- address_hi: "बामहोरी सीड फार्म, जिला सागर, म.प्र. - 470002"
- address_en: "Bamhori Seed Farm, Distt. Sagar, M.P. - 470002"
- district: "Sagar"
- area: "Sagar City"
- phone_primary: "07582-288228"
- phone_secondary: "09425854876"
- email: "kvk_sagar@rediff.com"
- timings_hi: "सोमवार-शनिवार, सुबह 9 बजे से शाम 5 बजे तक"
- timings_en: "Monday–Saturday, 9 AM to 5 PM"

**Record 2 — KVK Sagar-II (Deori area):**
- name_hi: "कृषि विज्ञान केन्द्र, सागर-II (देवरी)"
- name_en: "Krishi Vigyan Kendra (KVK), Sagar-II (Deori)"
- description_hi: "देवरी और आसपास के किसानों के लिए नज़दीकी कृषि विज्ञान केन्द्र"
- description_en: "Nearest KVK for farmers in Deori and surrounding areas"
- address_hi: "पोस्ट एवं ग्राम बिजोरा, देवरी, जिला सागर - 470226"
- address_en: "Post & Village Bijora, Deori, Distt. Sagar - 470226"
- district: "Sagar"
- area: "Deori"
- email: "kvkbijora@jnkvv.org"

**Record 3 — College of Agriculture, Khurai (JNKVV):**
- name_hi: "कृषि महाविद्यालय, खुरई (JNKVV)"
- name_en: "College of Agriculture, Khurai (JNKVV)"
- description_hi: "खुरई में जवाहरलाल नेहरू कृषि विश्वविद्यालय का कृषि महाविद्यालय — किसानों को कृषि संबंधी तकनीकी जानकारी"
- description_en: "JNKVV College of Agriculture in Khurai — technical agricultural guidance for farmers"
- address_hi: "कृषि महाविद्यालय परिसर, खुरई, जिला सागर, म.प्र."
- address_en: "College of Agriculture Campus, Khurai, Distt. Sagar, M.P."
- district: "Sagar"
- area: "Khurai"
- phone_primary: "0761-2681235"
- phone_secondary: "9340004878"
- email: "deankhurai@rediffmail.com"
- timings_hi: "सोमवार-शनिवार, सुबह 9 बजे से शाम 5 बजे तक"
- timings_en: "Monday–Saturday, 9 AM to 5 PM"

**Record 4 — Joint Director Agriculture, Sagar Division:**
- name_hi: "संयुक्त संचालक कृषि, सागर संभाग"
- name_en: "Joint Director Agriculture, Sagar Division"
- description_hi: "कृषि विभाग की सरकारी योजनाओं, अनुदान और किसान कल्याण कार्यक्रमों की जानकारी के लिए संपर्क करें"
- description_en: "Contact for government agricultural schemes, subsidies, and farmer welfare programs"
- address_hi: "कृषि संभागीय कार्यालय, सागर, म.प्र."
- address_en: "Agriculture Divisional Office, Sagar, M.P."
- district: "Sagar"
- area: "Sagar City"
- phone_primary: "07582-222810"
- phone_secondary: "9406904009"
- email: "zmagrisag@mp.gov.in"
- timings_hi: "सोमवार-शनिवार, सुबह 10 बजे से शाम 5 बजे तक"
- timings_en: "Monday–Saturday, 10 AM to 5 PM"

**Record 5 — MP Farmer Helpline (Toll Free):**
- name_hi: "किसान हेल्पलाइन — कृषि विभाग म.प्र."
- name_en: "Farmer Helpline — Agriculture Dept. M.P."
- description_hi: "कृषि से जुड़ी किसी भी समस्या या जानकारी के लिए टोल-फ्री नंबर पर कॉल करें"
- description_en: "Call the toll-free number for any agriculture-related query or problem"
- district: "Sagar"
- area: "All areas"
- phone_tollfree: "1800-180-1551"
- timings_hi: "सोमवार-शनिवार, सुबह 9 बजे से शाम 5 बजे तक"
- timings_en: "Monday–Saturday, 9 AM to 5 PM"

**Record 6 — Collector's Office Sagar:**
- name_hi: "कलेक्टर कार्यालय, सागर"
- name_en: "Collector's Office, Sagar"
- description_hi: "जिला प्रशासन, भूमि विवाद, सरकारी योजनाओं और आपात स्थिति के लिए संपर्क करें"
- description_en: "District administration, land disputes, government schemes, and emergencies"
- address_hi: "कलेक्टर कार्यालय, सागर, म.प्र."
- address_en: "Collector Office, Sagar, M.P."
- district: "Sagar"
- area: "Sagar City"
- phone_primary: "07582-222199"
- email: "mpsag@nic.in"
- website: "https://sagar.nic.in"
- timings_hi: "सोमवार-शनिवार, सुबह 10 बजे से शाम 5 बजे तक"
- timings_en: "Monday–Saturday, 10 AM to 5 PM"

---

## Phase 2 — Resource directory pages (UI)

**Route:** `/resources` — public, no login required

**Nav link:** Add "उपयोगी संपर्क / Resources" to the footer navigation and as a secondary link in the main nav (can be under a "More" dropdown if nav is crowded, but must be reachable within 2 taps from homepage)

**Page layout (`/resources`):**
- Page heading: "उपयोगी संपर्क — किसान सहयोग" / "Useful Contacts — Kisan Sahyog"
- Subheading: "सागर जिले के किसानों के लिए महत्वपूर्ण सरकारी संपर्क" / "Important government contacts for farmers of Sagar district"
- Three tabbed sections (or scrollable sections with anchor links): मृदा परीक्षण / Soil Testing | पशु चिकित्सा / Veterinary | कृषि कार्यालय / Agri Offices

**Each resource card shows:**
- Name (Hindi primary, English below)
- Description (1-2 lines)
- Area/location tag (e.g. "खुरई", "सागर शहर", "सभी क्षेत्र / All areas")
- Phone number(s) with a call button (`tel:` link) — toll-free numbers displayed with a "Toll Free" / "निःशुल्क" badge
- Email (if present) as a `mailto:` link
- Website (if present) as an external link
- Timings (if present)
- Address (if present)

**Disclaimer on the page (below the heading):**
> "ये संपर्क सार्वजनिक सरकारी जानकारी के आधार पर दिए गए हैं। कृपया जाने से पहले फ़ोन पर समय की पुष्टि करें।"
> "These contacts are based on publicly available government information. Please confirm timings by phone before visiting."

**Process guide for soil testing** (add as a collapsible/accordion section below the soil lab cards):
- Hindi: "मिट्टी का नमूना कैसे लें? / How to collect a soil sample?"
- Steps (in both languages):
  1. खेत के अलग-अलग हिस्सों से 8-10 जगह से मिट्टी लें (6 इंच गहराई तक) — Collect soil from 8-10 spots in different parts of the field (6 inches deep)
  2. सभी नमूनों को एक साफ बर्तन में मिलाएं — Mix all samples in a clean container
  3. लगभग 500 ग्राम मिट्टी एक साफ थैली में रखें — Put approximately 500 grams in a clean bag
  4. अपना नाम, गांव, खेत नंबर और फसल का नाम थैली पर लिखें — Write your name, village, field number, and crop name on the bag
  5. नज़दीकी मृदा परीक्षण प्रयोगशाला में जमा करें — Submit at the nearest soil testing laboratory
  6. रिपोर्ट आने पर उसके अनुसार खाद डालें — Apply fertilizer as recommended in the report

---

## Phase 3 — Homepage Resources section

Add a "उपयोगी संपर्क / Useful Contacts" highlight section on the public homepage, positioned between the "How it works" section and the category cards (or between the category cards and the live listings — wherever it flows better visually).

**Section content:**
- Heading: "ज़रूरी सरकारी संपर्क" / "Important Government Contacts"
- Subheading: "सागर जिले के किसानों के लिए" / "For farmers of Sagar district"
- Show 3 highlight cards (one per resource type), each linking to the full /resources page:

  Card 1 — Soil Testing:
  - Icon: 🧪 (or a soil/lab icon)
  - Title: "मिट्टी जांच / Soil Testing"
  - Key info: "टोल-फ्री: 1800-180-1551" + "Online: mpstl.mponline.gov.in"
  - Link: "पूरी जानकारी / Full details →" → /resources#soil

  Card 2 — Veterinary:
  - Icon: 🐄 (or animal icon)
  - Title: "पशु चिकित्सा / Veterinary"
  - Key info: "टोल-फ्री: 1962 (घर पर इलाज)" — "Toll-free: 1962 (home treatment)"
  - Link: "पूरी जानकारी / Full details →" → /resources#veterinary

  Card 3 — Agri Offices:
  - Icon: 🏛️ (or govt building icon)
  - Title: "कृषि कार्यालय / Agri Offices"
  - Key info: "KVK सागर: 07582-288228" + "किसान हेल्पलाइन: 1800-180-1551"
  - Link: "पूरी जानकारी / Full details →" → /resources#offices

These are visually distinct from the listing category cards — use a different background colour or style so users immediately understand these are reference contacts, not listing categories.

---

## Phase 4 — Admin dashboard integration

In the admin dashboard, add a "Resources" management section:
- Table of all resource entries (name, type, area, phone, active status)
- Toggle active/inactive per entry
- Edit button (opens a form to edit all fields)
- Add new resource button
- This allows adding new contacts over time as Khurai-area local contacts are identified, without a code change

---

## Phase 5 — Bilingual audit and verification

- All new strings (page headings, card labels, process steps, disclaimer, homepage section) through the translation system — no hardcoded text
- Verify language toggle switches all resource page content correctly
- Verify all phone numbers are `tel:` links that work on mobile
- Verify all `mailto:` and website links open correctly

**Test checklist:**
- Positive: /resources page loads with all 3 tabs — soil testing, veterinary, govt offices — all showing correct data
- Positive: Clicking a phone number opens the dialer on mobile
- Positive: Toll-free badge shows on 1962 and 1800-180-1551 entries
- Positive: Soil sample process guide expands/collapses correctly
- Positive: Homepage resources section shows 3 cards, each links to /resources correctly
- Positive: Language toggle switches all content on /resources page
- Positive: Admin can toggle a resource inactive — it disappears from /resources but stays in admin table
- Negative: Resource with is_active = false does not appear on the public /resources page
- Regression: Existing nav, categories, articles, expert directory all unaffected

---

## Commit and deploy

Single commit: "Resources section: soil testing labs, veterinary contacts, govt agri offices — real Sagar/Khurai data seeded; homepage highlight cards"
Deploy: `npx wrangler pages deploy dist --project-name kissansahyog`
Confirm staging.kissansahyog.com/resources loads with all contacts after deploy.
