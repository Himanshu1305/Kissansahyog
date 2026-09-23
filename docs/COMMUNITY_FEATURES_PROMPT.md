# Kisan Sahyog — Kisan Sawaal + Kisan Safalta + Sarkari Yojana Prompt

DO NOT ask for approval. Auto-accept all actions. Read PROJECT_CONTEXT.md before starting. Update PROJECT_CONTEXT.md after completing. Commit and push after each phase.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy after all phases complete:** `npx wrangler pages deploy dist --project-name kissansahyog`

---

## Overview

Three new content features added together since they share the same architecture: admin-managed content, public read, no new listing/marketplace logic, same articles-style CMS pattern already built.

1. **किसान सवाल / Kisan Sawaal** — Farmer Q&A community forum
2. **किसान सफलता / Kisan Safalta** — Farmer success stories
3. **सरकारी योजनाएं / Sarkari Yojana** — Government schemes directory

All three: new DB tables, admin management in /admin, public pages, linked from homepage and /info.

---

## Phase 1 — Database migrations (single file: 0021_community_features.sql)

Write ONE migration file containing all three tables below.

### Table 1: kisan_sawaal (Q&A)

```sql
CREATE TABLE kisan_sawaal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_hi text NOT NULL,
  question_en text,
  asked_by_name text NOT NULL DEFAULT 'किसान',
  asked_by_village text,
  category text CHECK (category IN (
    'land', 'equipment', 'crop', 'pest', 'weather',
    'market', 'scheme', 'drone_didi', 'general'
  )),
  is_published boolean NOT NULL DEFAULT false,
  -- Admin publishes after reviewing for spam/quality
  answer_hi text,
  answer_en text,
  answered_by text,
  -- Name of expert/team who answered
  answered_at timestamptz,
  view_count integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  -- Featured Q&As appear on homepage
  created_at timestamptz DEFAULT now()
);
```

RLS for kisan_sawaal — three distinct policies:
1. Public SELECT: anon can read rows where `is_published = true` only
2. Public INSERT: anon CAN insert new rows — but only with `is_published = false` (enforced via a CHECK constraint or RLS policy that forces is_published = false on insert from anon role)
3. Admin SELECT + UPDATE: via SECURITY DEFINER RPCs that check is_admin — admins can see all rows including unpublished, and can update any row

```sql
-- After CREATE TABLE kisan_sawaal:
ALTER TABLE kisan_sawaal ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON kisan_sawaal TO anon;
GRANT INSERT ON kisan_sawaal TO anon;

-- Anon can only read published questions
CREATE POLICY sawaal_public_read ON kisan_sawaal
  FOR SELECT TO anon
  USING (is_published = true);

-- Anon can insert new questions but is_published MUST be false
CREATE POLICY sawaal_public_insert ON kisan_sawaal
  FOR INSERT TO anon
  WITH CHECK (is_published = false);
-- Admin reads/updates via SECURITY DEFINER RPCs (no direct anon update allowed)
```

### Table 2: kisan_safalta (Success stories)

```sql
CREATE TABLE kisan_safalta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_name text NOT NULL,
  village text NOT NULL,
  district text NOT NULL DEFAULT 'Sagar',
  crop_or_activity text NOT NULL,
  -- What they farm or do (e.g. "गेहूं और सोयाबीन", "ट्रैक्टर किराया")
  story_hi text NOT NULL,
  -- Full story in Hindi (3-5 paragraphs)
  story_en text,
  income_before text,
  -- e.g. "₹40,000 प्रति वर्ष"
  income_after text,
  -- e.g. "₹85,000 प्रति वर्ष"
  how_helped_hi text NOT NULL,
  -- How Kisan Sahyog specifically helped (1-2 sentences)
  how_helped_en text,
  photo_url text,
  -- Optional farmer photo
  is_published boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  -- Featured stories appear on homepage
  published_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

RLS: Public read for is_published = true only. Admin-only writes.

### Table 3: sarkari_yojana (Government schemes)

```sql
CREATE TABLE sarkari_yojana (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_name_hi text NOT NULL,
  scheme_name_en text NOT NULL,
  ministry_hi text,
  ministry_en text,
  category text NOT NULL CHECK (category IN (
    'income_support', 'crop_insurance', 'credit',
    'equipment', 'solar', 'storage', 'women', 'general'
  )),
  description_hi text NOT NULL,
  -- 2-3 sentence plain-language explanation
  description_en text NOT NULL,
  benefit_hi text NOT NULL,
  -- Key benefit in one line e.g. "₹6,000 प्रति वर्ष सीधे खाते में"
  benefit_en text NOT NULL,
  eligibility_hi text NOT NULL,
  -- Who can apply (plain language)
  eligibility_en text NOT NULL,
  how_to_apply_hi text,
  -- Step-by-step in plain Hindi
  how_to_apply_en text,
  official_website text,
  helpline text,
  deadline_note_hi text,
  -- e.g. "खरीफ के लिए 31 जुलाई तक"
  deadline_note_en text,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

RLS: Public read for is_active = true. Admin-only writes.

---

## Phase 2 — Seed verified government scheme data

Seed the following 8 schemes with real, verified 2026 data. All content must be in plain, simple Hindi (not bureaucratic language) — a farmer with class 8 education should understand every word.

```sql
INSERT INTO sarkari_yojana (scheme_name_hi, scheme_name_en, ministry_hi, ministry_en, category, description_hi, description_en, benefit_hi, benefit_en, eligibility_hi, eligibility_en, how_to_apply_hi, how_to_apply_en, official_website, helpline, deadline_note_hi, deadline_note_en, is_active, is_featured, sort_order) VALUES

-- 1. PM Kisan
('पीएम किसान सम्मान निधि', 'PM Kisan Samman Nidhi',
'कृषि एवं किसान कल्याण मंत्रालय', 'Ministry of Agriculture & Farmers Welfare',
'income_support',
'सरकार हर साल ₹6,000 तीन किस्तों में सीधे किसान के बैंक खाते में भेजती है। यह पैसा किसी भी काम के लिए उपयोग किया जा सकता है।',
'The government sends ₹6,000 per year in 3 installments directly to the farmer''s bank account. No middleman, no paperwork after registration.',
'₹6,000 प्रति वर्ष — तीन किस्तों में (₹2,000 प्रत्येक)', '₹6,000/year in 3 installments of ₹2,000 each',
'सभी छोटे और सीमांत किसान जिनके पास खेती योग्य ज़मीन है। आयकर देने वाले, सरकारी कर्मचारी और पेंशनधारी पात्र नहीं।',
'All small and marginal farmers with cultivable land. Income tax payers, government employees and pensioners are not eligible.',
'1. pmkisan.gov.in पर जाएं\n2. "New Farmer Registration" पर क्लिक करें\n3. आधार नंबर और बैंक खाता जानकारी भरें\n4. ज़मीन के कागज़ अपलोड करें\n5. पंजीकरण के बाद किस्त आना शुरू हो जाएगी',
'1. Visit pmkisan.gov.in\n2. Click "New Farmer Registration"\n3. Enter Aadhaar and bank account details\n4. Upload land records\n5. Installments begin after registration',
'https://pmkisan.gov.in', '155261',
'पूरे साल पंजीकरण खुला है', 'Registration open throughout the year',
true, true, 1),

-- 2. Fasal Bima
('प्रधानमंत्री फसल बीमा योजना (PMFBY)', 'PM Fasal Bima Yojana (PMFBY)',
'कृषि एवं किसान कल्याण मंत्रालय', 'Ministry of Agriculture & Farmers Welfare',
'crop_insurance',
'फसल खराब होने पर बीमा का पैसा मिलता है — बाढ़, सूखा, ओले, कीट, किसी भी कारण से। किसान को केवल 2% प्रीमियम देना होता है।',
'Get insurance payout if crop is damaged by flood, drought, hail, pest or any reason. Farmer pays only 2% premium for Kharif, 1.5% for Rabi.',
'खरीफ में 2%, रबी में 1.5% प्रीमियम — बाकी सरकार देती है। नुकसान होने पर पूरी राशि मिलती है।',
'Only 2% premium (Kharif) or 1.5% (Rabi) — government pays the rest. Full claim paid on loss.',
'सभी किसान — ज़मीन मालिक, किरायेदार और बटाईदार। अधिसूचित फसल और अधिसूचित क्षेत्र में खेती होनी चाहिए।',
'All farmers — landowners, tenants and sharecroppers. Crop and area must be notified by the state government.',
'1. pmfby.gov.in पर जाएं या नज़दीकी बैंक/CSC जाएं\n2. खरीफ के लिए 31 जुलाई से पहले आवेदन करें\n3. आधार, बैंक खाता और खसरा नंबर साथ रखें\n4. नुकसान होने पर 72 घंटे में 14447 पर सूचित करें',
'1. Visit pmfby.gov.in or nearest bank/CSC\n2. Apply before 31 July for Kharif\n3. Keep Aadhaar, bank account and Khasra number ready\n4. Report crop damage within 72 hours by calling 14447',
'https://pmfby.gov.in', '14447',
'खरीफ: 31 जुलाई | रबी: 31 दिसंबर', 'Kharif: 31 July | Rabi: 31 December',
true, true, 2),

-- 3. PM KUSUM
('पीएम कुसुम योजना (सोलर पंप)', 'PM KUSUM Yojana (Solar Pump)',
'नवीन एवं नवीकरणीय ऊर्जा मंत्रालय', 'Ministry of New and Renewable Energy',
'solar',
'खेत में सोलर पंप लगाएं — सरकार 60% सब्सिडी देती है, 30% लोन मिलता है, सिर्फ 10% आपको देना है। डीज़ल का खर्च हमेशा के लिए खत्म।',
'Install solar pump in your field — government gives 60% subsidy, 30% as loan, you pay only 10%. End diesel costs forever and earn by selling extra solar power.',
'60% सब्सिडी + 30% लोन — किसान का खर्च केवल 10%। बिजली बेचकर अतिरिक्त कमाई भी हो सकती है।',
'60% subsidy + 30% loan — farmer pays only 10%. Can also earn extra income by selling electricity.',
'सभी किसान, किसान समूह, पंचायत और सहकारी समितियां। खेती योग्य ज़मीन होना ज़रूरी है।',
'Individual farmers, farmer groups, panchayats and cooperatives. Agricultural land required.',
'1. pmkusum.mnre.gov.in पर जाएं\n2. Farmer Registration पर क्लिक करें\n3. ज़मीन, आधार और बैंक जानकारी भरें\n4. आवेदन के बाद राज्य विभाग संपर्क करेगा',
'1. Visit pmkusum.mnre.gov.in\n2. Click Farmer Registration\n3. Fill land, Aadhaar and bank details\n4. State department will contact after application',
'https://pmkusum.mnre.gov.in', '1800-180-3333',
'योजना 31 मार्च 2027 तक बढ़ाई गई है', 'Scheme extended till 31 March 2027',
true, true, 3),

-- 4. Kisan Credit Card
('किसान क्रेडिट कार्ड (KCC)', 'Kisan Credit Card (KCC)',
'वित्त मंत्रालय / कृषि मंत्रालय', 'Ministry of Finance / Agriculture',
'credit',
'खेती के लिए सस्ता लोन पाएं — 3 लाख रुपये तक केवल 4% ब्याज पर (सरकार बाकी ब्याज देती है)। बीज, खाद, उपकरण — जो चाहें उस पर खर्च करें।',
'Get cheap farm loan — up to ₹3 lakh at only 4% interest (government pays rest). Use for seeds, fertilizer, equipment — anything farm-related.',
'₹3 लाख तक केवल 4% ब्याज। समय पर चुकाने पर और सस्ता हो सकता है।',
'Up to ₹3 lakh at 4% interest. Can be even cheaper if repaid on time.',
'सभी किसान — ज़मीन मालिक, बटाईदार और किरायेदार। पशुपालक और मछुआरे भी पात्र हैं।',
'All farmers — landowners, sharecroppers and tenants. Animal husbandry and fishery farmers also eligible.',
'1. नज़दीकी बैंक (SBI, PNB, को-ऑपरेटिव बैंक) में जाएं\n2. KCC आवेदन फॉर्म भरें\n3. आधार, ज़मीन के कागज़ और पासपोर्ट फोटो साथ ले जाएं\n4. 2 सप्ताह में कार्ड मिल जाएगा',
'1. Visit nearest bank (SBI, PNB, cooperative bank)\n2. Fill KCC application form\n3. Bring Aadhaar, land documents and passport photo\n4. Card issued within 2 weeks',
'https://www.pmkisan.gov.in/KCC.aspx', '1800-180-1111',
null, null,
true, false, 4),

-- 5. Drone Didi Scheme
('ड्रोन दीदी योजना', 'Drone Didi Scheme',
'कृषि एवं किसान कल्याण मंत्रालय', 'Ministry of Agriculture & Farmers Welfare',
'women',
'महिला स्वयं सहायता समूहों को ड्रोन दिए जाते हैं — खेतों में कीटनाशक और खाद का छिड़काव करके कमाई करें। सरकार ट्रेनिंग और सब्सिडी देती है।',
'Women SHGs get drones — earn by spraying pesticide and fertilizer on fields. Government provides training, subsidy and support.',
'ड्रोन पर 80% सब्सिडी + मुफ्त ट्रेनिंग। ड्रोन छिड़काव से ₹1,000-1,500 प्रति एकड़ की कमाई।',
'80% subsidy on drone + free training. Earn ₹1,000-1,500 per acre from drone spraying service.',
'महिला स्वयं सहायता समूह (SHG) जो NRLM के तहत पंजीकृत हैं। कम से कम 8वीं पास और 18-45 वर्ष की उम्र।',
'Women SHGs registered under NRLM. Minimum class 8 pass, age 18-45 years.',
'1. नज़दीकी आजीविका मिशन कार्यालय से संपर्क करें\n2. SHG के नाम पर आवेदन करें\n3. ट्रेनिंग पूरी करें और ड्रोन लाइसेंस लें\n4. अपनी सेवा किसान सहयोग पर लिस्ट करें',
'1. Contact nearest Aajeevika Mission office\n2. Apply in SHG name\n3. Complete training and get drone license\n4. List your service on Kisan Sahyog',
'https://agriwelfare.gov.in', '1800-180-1551',
null, null,
true, true, 5),

-- 6. Soil Health Card
('मृदा स्वास्थ्य कार्ड योजना', 'Soil Health Card Scheme',
'कृषि एवं किसान कल्याण मंत्रालय', 'Ministry of Agriculture & Farmers Welfare',
'general',
'अपनी मिट्टी की जांच कराएं — मुफ्त में। पता चलेगा कि किस फसल के लिए कितनी खाद चाहिए। सही खाद डालने से खर्च कम और उपज ज़्यादा।',
'Get your soil tested — for free. Know exactly what fertilizer your soil needs for each crop. Right fertilizer means less cost and higher yield.',
'मुफ्त मिट्टी जांच + खाद की सटीक सलाह। ऑनलाइन Soil Health Card मिलता है।',
'Free soil testing + precise fertilizer advice. Get Soil Health Card online.',
'सभी किसान। हर 2 साल में एक बार जांच करवा सकते हैं।',
'All farmers. Can get tested once every 2 years.',
'1. नज़दीकी मृदा परीक्षण प्रयोगशाला जाएं (देखें: किसान सहयोग → उपयोगी संपर्क)\n2. खेत के अलग हिस्सों से 500 ग्राम मिट्टी लेकर जाएं\n3. 2-4 सप्ताह में Soil Health Card मिलेगा\n4. कार्ड पर लिखी सलाह के अनुसार खाद डालें',
'1. Visit nearest soil testing lab (see: Kisan Sahyog → Useful Contacts)\n2. Bring 500 grams soil from different parts of your field\n3. Soil Health Card issued in 2-4 weeks\n4. Apply fertilizer as per card recommendation',
'https://soilhealth.dac.gov.in', '1800-180-1551',
null, null,
true, false, 6),

-- 7. e-NAM
('e-NAM (राष्ट्रीय कृषि बाज़ार)', 'e-NAM (National Agriculture Market)',
'कृषि एवं किसान कल्याण मंत्रालय', 'Ministry of Agriculture & Farmers Welfare',
'market',
'अपनी फसल ऑनलाइन बेचें — पूरे देश के खरीदारों को। मंडी के बाहर भी दाम मिलेगा, बिचौलिया नहीं होगा, सीधे पैसा खाते में।',
'Sell your crop online to buyers across India. Get better prices outside local mandi, no middleman, money directly to your account.',
'ऑनलाइन नीलामी से बेहतर दाम। सीधे खाते में भुगतान।',
'Better prices through online auction. Direct payment to account.',
'सभी किसान जो e-NAM से जुड़ी मंडी में रजिस्टर्ड हैं।',
'All farmers registered with an e-NAM connected mandi.',
'1. enam.gov.in पर जाएं\n2. Farmer Registration करें\n3. नज़दीकी e-NAM मंडी में जाकर उपज लाएं\n4. ऑनलाइन नीलामी में भाग लें',
'1. Visit enam.gov.in\n2. Complete Farmer Registration\n3. Bring produce to nearest e-NAM connected mandi\n4. Participate in online auction',
'https://enam.gov.in', '1800-270-0224',
null, null,
true, false, 7),

-- 8. Pradhan Mantri Annadata Aay SanraksHan Abhiyan (PM-AASHA)
('पीएम आशा योजना', 'PM-AASHA Scheme',
'कृषि एवं किसान कल्याण मंत्रालय', 'Ministry of Agriculture & Farmers Welfare',
'income_support',
'अगर मंडी में फसल का दाम MSP से कम मिल रहा है तो सरकार अंतर की राशि सीधे खाते में देती है। किसान को घाटे में बेचने की ज़रूरत नहीं।',
'If mandi price falls below MSP, government pays the difference directly to your account. No need to sell at a loss.',
'MSP और मंडी भाव के बीच का अंतर सीधे खाते में।',
'Difference between MSP and mandi price paid directly to account.',
'राज्य सरकार द्वारा अधिसूचित फसल और क्षेत्र के किसान। e-NAM या सरकारी खरीद केंद्र पर रजिस्टर्ड होना ज़रूरी।',
'Farmers of notified crops in notified areas. Must be registered at e-NAM or government procurement centre.',
'1. नज़दीकी कृषि विभाग कार्यालय से संपर्क करें\n2. PM-AASHA के तहत पंजीकरण कराएं\n3. MSP से कम दाम मिलने पर आवेदन करें',
'1. Contact nearest Agriculture Department office\n2. Register under PM-AASHA\n3. Apply when market price falls below MSP',
'https://agricoop.gov.in', '1800-180-1551',
null, null,
true, false, 8)

ON CONFLICT DO NOTHING;
```

### Seed 3 placeholder Q&As for Kisan Sawaal (clearly marked as examples):

```sql
INSERT INTO kisan_sawaal (question_hi, question_en, asked_by_name, asked_by_village, category, is_published, answer_hi, answer_en, answered_by, answered_at, is_featured) VALUES

('सोयाबीन की फसल में पीले पत्ते क्यों हो रहे हैं? क्या करें?',
'Why are soybean leaves turning yellow? What should I do?',
'रामलाल पटेल', 'खुरई', 'pest',
true,
'सोयाबीन में पत्ते पीले होने के कई कारण हो सकते हैं:\n\n1. **आयरन की कमी:** पत्तियां हल्की पीली हों तो फेरस सल्फेट (FeSO4) का 0.5% घोल बनाकर छिड़काव करें।\n\n2. **पीला मोज़ेक वायरस:** पत्तियों पर पीले-हरे धब्बे हों तो यह वायरस है — संक्रमित पौधे तुरंत निकाल दें, सफेद मक्खी को नियंत्रित करें।\n\n3. **जड़ सड़न:** पौधे की जड़ें काली हों तो जल निकासी सुधारें और Carbendazim का उपचार करें।\n\nKVK सागर (07582-288228) से अपनी फसल की जांच करवाएं।',
'Why are soybean leaves turning yellow?\n\n1. **Iron deficiency:** If leaves are light yellow, spray 0.5% Ferrous Sulphate solution.\n\n2. **Yellow Mosaic Virus:** If leaves have yellow-green patches, this is a virus — remove infected plants immediately and control whitefly.\n\n3. **Root rot:** If plant roots are black, improve drainage and treat with Carbendazim.\n\nContact KVK Sagar (07582-288228) for field diagnosis.',
'Team Kisan Sahyog', now(),
true),

('गेहूं की बुवाई के लिए कौन सा बीज सबसे अच्छा है सागर जिले के लिए?',
'Which wheat seed variety is best for Sagar district?',
'मोहन सिंह', 'रेहली', 'crop',
true,
'सागर जिले की जलवायु और मिट्टी के लिए ये गेहूं किस्में उपयुक्त हैं:\n\n1. **HI-8498 (मालव रत्न):** JNKVV द्वारा विकसित, MP के लिए विशेष रूप से अनुशंसित। अच्छी उपज, रस्ट प्रतिरोधी।\n\n2. **GW-496:** सिंचित और असिंचित दोनों के लिए उपयुक्त।\n\n3. **K-9107:** देर से बुवाई के लिए अच्छा विकल्प।\n\nबुवाई का सही समय: 1-25 नवंबर। बीज दर: 40-50 किलो प्रति एकड़।\n\nKVK सागर-I (09425854876) से मुफ्त परामर्श लें।',
'Best wheat varieties for Sagar district:\n\n1. **HI-8498 (Malav Ratna):** Developed by JNKVV, specifically recommended for MP. Good yield, rust resistant.\n\n2. **GW-496:** Suitable for both irrigated and rainfed conditions.\n\n3. **K-9107:** Good option for late sowing.\n\nBest sowing time: 1-25 November. Seed rate: 40-50 kg per acre.\n\nFree consultation from KVK Sagar-I: 09425854876',
'Team Kisan Sahyog', now(),
true),

('किसान क्रेडिट कार्ड के लिए कौन से कागज़ात चाहिए?',
'What documents are needed for Kisan Credit Card?',
'सुरेश यादव', 'मालथोन', 'scheme',
true,
'किसान क्रेडिट कार्ड के लिए ये कागज़ात लेकर बैंक जाएं:\n\n**ज़रूरी दस्तावेज़:**\n- आधार कार्ड\n- ज़मीन के कागज़ (खसरा/खतौनी)\n- पासपोर्ट साइज़ 2 फोटो\n- बैंक खाता नंबर और IFSC कोड\n\n**प्रक्रिया:**\n1. SBI, PNB या ज़िला सहकारी बैंक में जाएं\n2. KCC आवेदन फॉर्म मांगें और भरें\n3. कागज़ात जमा करें\n4. 7-15 दिन में कार्ड मिल जाएगा\n\n₹3 लाख तक केवल 4% ब्याज पर लोन मिलता है। समय पर चुकाने पर 3% की अतिरिक्त छूट भी मिल सकती है।',
'Documents needed for Kisan Credit Card:\n\n**Required documents:**\n- Aadhaar Card\n- Land records (Khasra/Khatauni)\n- 2 passport size photos\n- Bank account number and IFSC code\n\n**Process:**\n1. Visit SBI, PNB or District Cooperative Bank\n2. Ask for KCC application form and fill it\n3. Submit documents\n4. Card issued in 7-15 days\n\nLoan up to ₹3 lakh at only 4% interest. Additional 3% discount for timely repayment.',
'Team Kisan Sahyog', now(),
false)

ON CONFLICT DO NOTHING;
```

### Seed 2 placeholder success stories (marked as examples — replace with real farmer stories):

```sql
INSERT INTO kisan_safalta (farmer_name, village, district, crop_or_activity, story_hi, story_en, income_before, income_after, how_helped_hi, how_helped_en, is_published, is_featured) VALUES

('[नाम — वास्तविक कहानी जल्द आ रही है]', 'खुरई', 'Sagar',
'ट्रैक्टर किराया',
'[यह एक उदाहरण है। वास्तविक किसान सफलता की कहानियां जल्द जोड़ी जाएंगी। क्या आपके पास किसी किसान की सफलता की कहानी है? admin@kissansahyog.com पर लिखें।]',
'[This is a placeholder. Real farmer success stories coming soon. Do you know a farmer with a success story? Write to admin@kissansahyog.com]',
null, null,
'किसान सहयोग पर उपकरण लिस्ट करके किसानों ने अपनी खाली मशीनरी से कमाई शुरू की।',
'By listing equipment on Kisan Sahyog, farmers started earning from idle machinery.',
false, false),

('[Name — Real story coming soon]', 'Sagar', 'Sagar',
'Land leasing',
'[Placeholder — real stories coming soon]',
'[Placeholder — real stories coming soon]',
null, null,
'Kisan Sahyog helped connect landowners with farmers looking for land.',
'Kisan Sahyog helped connect landowners with farmers looking for land.',
false, false)

ON CONFLICT DO NOTHING;
```

---

## Phase 3 — Public pages

### 3a. /sawaal — Kisan Sawaal Q&A page

**Route:** `/sawaal` — public, no login required

**Page layout:**
- Heading: "किसान सवाल / Kisan Sawaal — आपके सवाल, हमारे जवाब"
- Subheading: "किसानों के सबसे ज़रूरी सवाल और उनके जवाब"
- Category filter tabs (horizontal scroll on mobile): सभी / Land / Equipment / फसल / कीट / मौसम / योजनाएं / General
- Q&A cards: question in bold Hindi, then answer below (collapsed by default, expandable on tap — accordion style)
- Each card shows: question, category tag, village/district of asker, answer by whom
- "अपना सवाल पूछें / Ask a question" button — opens a simple form:
  - Name (optional, defaults to "किसान")
  - Village
  - Category dropdown
  - Question in Hindi (textarea)
  - Submit → saves to kisan_sawaal with is_published = false (admin reviews and answers before publishing)
  - Confirmation: "आपका सवाल मिल गया। हम जल्द जवाब देंगे। / Your question received. We'll answer soon."

**Important:** Questions submitted by users go to the DB with is_published = false — they are NOT publicly visible until an admin answers and publishes them. This prevents spam.

### 3b. /safalta — Kisan Safalta success stories page

**Route:** `/safalta` — public, no login required

**Page layout:**
- Heading: "किसान सफलता / Kisan Safalta — जब किसान जीतता है"
- Subheading: "सागर जिले के किसानों की असली कहानियां"
- Story cards (full width on mobile): farmer name + village, crop/activity, before/after income comparison (green arrow ↑), story text (show first 3 lines, expand on tap), "how Kisan Sahyog helped" highlighted in a green callout box
- Placeholder message when no published stories: "सफलता की कहानियां जल्द आ रही हैं। क्या आपके पास एक कहानी है? हमें बताएं: admin@kissansahyog.com"
- "अपनी कहानी शेयर करें / Share your story" button — simple form (name, village, crop, brief story, contact number) → saves for admin review

### 3c. /yojana — Government Schemes directory

**Route:** `/yojana` — public, no login required

**Page layout:**
- Heading: "सरकारी योजनाएं / Sarkari Yojana — किसानों के लिए सरकारी मदद"
- Subheading: "जानें कौन सी योजना आपके लिए है और कैसे आवेदन करें"
- Category filter: सभी / आय सहायता / फसल बीमा / लोन / उपकरण / सौर ऊर्जा / महिला / बाज़ार
- Scheme cards layout:
  - Scheme name (Hindi + English)
  - Ministry
  - **Benefit highlight box** (green background): "मुख्य लाभ: ₹6,000 प्रति वर्ष" — this is the first thing visible
  - Description (2-3 sentences)
  - Eligibility (collapsed, expand on tap)
  - How to apply (collapsed, expand on tap)
  - Helpline button (tel: link)
  - Official website button (external link)
  - Deadline note (if applicable, shown in amber)
- **MSP vs mandi cross-link:** Below the scheme cards, add a small callout: "फसल का सही दाम जानें → मंडी भाव और MSP की तुलना /info#msp पर देखें"

---

## Phase 4 — Homepage additions

### 4a. Featured Q&A strip

Add a compact "आज का सवाल / Today's Question" strip on the homepage — shows 1-2 featured Q&As (is_featured = true) with short question preview and a "→ /sawaal" link. Style: similar to the resources strip but lighter.

### 4b. Kisan Safalta teaser

Add a "किसान सफलता" section on the homepage (below the Q&A strip) — shows featured success stories (is_featured = true). When no published stories exist, shows the placeholder invite message and a "Share your story" link. Height: compact, does not add significant scroll length.

### 4c. Nav update — Community dropdown

The global nav already has many items. Do NOT add three separate nav items. Instead, group all three under a single **"समुदाय / Community"** dropdown in the nav:

```
समुदाय / Community ▾
  ├── किसान सवाल / Q&A        → /sawaal
  ├── किसान सफलता / Stories   → /safalta
  └── सरकारी योजनाएं / Schemes → /yojana
```

This keeps the top-level nav clean. The dropdown opens on tap/hover. On mobile, it expands inline within the hamburger menu.

Also update `/info` page: add a "सरकारी योजनाएं" section that shows 3 featured scheme cards with "पूरी सूची → /yojana" link.

---

## Phase 5 — Admin dashboard additions

Add three new sections in /admin:

**5a. Kisan Sawaal management:**
- List all questions (published + unpublished)
- Columns: question preview, village, category, submitted date, published status
- Unpublished questions: "Answer & Publish" action — opens a form to write the Hindi answer, English answer (optional), answerer name, then publishes
- Published questions: toggle featured, unpublish, delete

**5b. Kisan Safalta management:**
- List all stories (published + unpublished)
- "Review & Publish" action for submitted stories
- Toggle featured, unpublish, delete

**5c. Sarkari Yojana management:**
- List all schemes with toggle active/inactive, toggle featured, edit button
- Edit opens a full form covering all scheme fields

---

## Phase 6 — Bilingual audit + verification

All new strings through i18n:
- All three page headings and subheadings
- Category filter tab labels for Sawaal
- Scheme category filter labels
- Form labels and confirmation messages on Sawaal and Safalta submission forms
- Homepage strip labels
- Admin section labels

**Test checklist:**
- Positive: /sawaal loads with 3 placeholder Q&As, category filter works, accordion expand/collapse works
- Positive: User submits a question → saved with is_published = false → does NOT appear publicly
- Positive: Admin publishes a Q&A → appears publicly immediately
- Positive: /yojana loads with all 8 schemes, category filter works, scheme cards expand eligibility and how-to-apply on tap
- Positive: Helpline tel: links work on mobile
- Positive: /safalta loads with placeholder invite message (no published stories yet)
- Positive: Language toggle switches all strings on all three pages
- Positive: Featured Q&As appear on homepage
- Positive: Admin can answer + publish a Q&A from /admin
- Negative: Unpublished Q&As do NOT appear on /sawaal (verify at API level, not just UI)
- Negative: Inactive schemes do NOT appear on /yojana
- Regression: Existing pages (homepage, /info, /resources, categories, articles) unaffected

---

## Commit and deploy

Single commit: "Community features: Kisan Sawaal Q&A, Kisan Safalta success stories, Sarkari Yojana directory — 8 verified schemes seeded; admin management; homepage strips"

Deploy: `npx wrangler pages deploy dist --project-name kissansahyog`

Confirm on staging:
- `/sawaal` page loads with Q&As
- `/yojana` page loads with 8 government schemes
- `/safalta` page loads with placeholder message
- Homepage shows Q&A and Safalta strips
- Admin dashboard has all three management sections
