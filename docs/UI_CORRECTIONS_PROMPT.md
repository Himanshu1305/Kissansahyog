# Kisan Sahyog — UI Corrections & Help Text Prompt

DO NOT ask for approval. Auto-accept all actions. Read PROJECT_CONTEXT.md before starting. This is a UI/content-only change — no schema changes, no new tables, no RLS changes.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy after completing:** `npx wrangler pages deploy dist --project-name kissansahyog`

---

## Change 1 — Hindi tab label correction

**Location:** Every place "कृषि सहयोगी" appears as a category tab label in the nav, browse tabs, category cards on homepage, and post listing category selector.

**Change:** Add "(Labor)" in brackets after the Hindi label:
- Before: `कृषि सहयोगी`
- After: `कृषि सहयोगी (Labor)`

This applies only to the **tab/nav/category label** — not inside the listing form fields or body text where "कृषि सहयोगी" appears as a term for workers. Only the category name label gets the bracketed English addition.

---

## Change 2 — Category name renames

Apply these renames consistently everywhere the category name appears: nav tabs, browse tabs, homepage category cards, post listing category selector, listing detail view category badge, admin dashboard, breadcrumbs, page titles, translation keys.

| Category | Hindi label (updated) | English label (updated) |
|---|---|---|
| Bhusa/Parali | भूसा / पराली | Bhoosa / Parali |
| Agri-Inputs | कृषि सामग्री | Seeds, Fertilizers & More |

Update all translation keys (`strings.js` or equivalent) for both languages. Do a full codebase search for the old strings ("Residue", "Agri-Inputs", "Agri Inputs", "कृषि सामग्री" used as a category label) and replace every instance.

---

## Change 3 — Category '?' help modals

Add a small circular '?' icon button next to each category tab label in the browse view and next to each category option in the post listing category selector. Tapping/clicking this icon opens a simple modal or bottom sheet explaining what that category is for.

The modal must:
- Be dismissible by tapping outside it or a close button
- Show Hindi text first, English below (following the app's language toggle)
- Be mobile-friendly (bottom sheet on mobile, centered modal on desktop)
- Not block the underlying UI when open

Write the following help content for each category. Both languages required — wire through the translation system, not hardcoded:

**ज़मीन / Land:**
> हिंदी: "यहाँ आप अपनी खाली ज़मीन किराए पर दे सकते हैं या किसी की ज़मीन पर खेती के लिए ले सकते हैं। ठेका, बटाई या कॉन्ट्रैक्ट फार्मिंग — जो भी आपको सही लगे।"
> English: "Here you can offer your unused land for farming, or find land to farm on lease, sharecropping (batai), or contract. Enter details about the land's size, location, water source, and your preferred arrangement."

**उपकरण / Equipment:**
> हिंदी: "ट्रैक्टर, थ्रेशर, हार्वेस्टर, ड्रोन जैसे महंगे उपकरण किराए पर दें या लें। अपने उपकरण की दर (प्रति एकड़/प्रति घंटा/प्रति दिन) और उपलब्धता बताएं।"
> English: "Rent out or hire agricultural equipment like tractors, threshers, harvesters, drones, and more. Specify the rental rate (per acre/hour/day) and when the equipment is available."

**कृषि सहयोगी (Labor):**
> हिंदी: "बुवाई, कटाई, निराई या अन्य कृषि कार्यों के लिए मज़दूर उपलब्ध कराएं या खोजें। ड्रोन दीदी योजना के तहत ड्रोन ऑपरेटर भी यहाँ लिस्ट कर सकते हैं।"
> English: "Offer or find farm workers for sowing, harvesting, weeding, or general labor. Drone Didi operators can also list here. Specify the number of workers, type of work, and daily rate."

**भूसा / पराली (Bhoosa / Parali):**
> हिंदी: "गेहूं का भूसा, धान की पराली, गन्ना वेस्ट जैसी फसल की बची हुई सामग्री बेचें या खरीदें। पराली जलाने की बजाय बेचें — आय भी बढ़ेगी, प्रदूषण भी कम होगा।"
> English: "Buy or sell crop residue like wheat straw (bhusa), paddy stubble (parali), sugarcane waste, and cotton waste. Instead of burning, sell your residue — earn income and reduce pollution."

**कृषि सामग्री (Seeds, Fertilizers & More):**
> हिंदी: "अगर आपके पास बचे हुए बीज, खाद (यूरिया, DAP) या कीटनाशक हैं तो यहाँ बेचें। दुकानदार भी अपनी दुकान की जानकारी यहाँ लिस्ट कर सकते हैं।"
> English: "Sell surplus seeds, fertilizers (Urea, DAP), or pesticides. Agricultural input shops and dealers can also list their products and location here for farmers to find them locally."

**विशेषज्ञ / Experts:**
> हिंदी: "कृषि वैज्ञानिक, सेवानिवृत्त कृषि अधिकारी और विशेषज्ञ जो किसानों को सलाह दे सकते हैं। सीधे फ़ोन पर संपर्क करें।"
> English: "Agricultural scientists, retired government agriculture officers, and domain experts who can advise farmers. Browse by specialisation and contact them directly by phone."

---

## Change 4 — Placeholder text inside form fields

For every listing creation form (Land, Equipment, Labor, Bhusa/Parali, Agri-Inputs), add meaningful placeholder text inside each input field so users understand exactly what to enter. Apply in both languages (placeholder switches with language toggle).

**Land form:**
- Size field placeholder: "जैसे: 2 एकड़ / e.g. 2 acres"
- Price/rate field placeholder (when fixed selected): "जैसे: ₹8,000 प्रति एकड़ / e.g. ₹8,000 per acre"
- Price/rate field placeholder (when sharecropping selected): "जैसे: 50% बटाई / e.g. 50% crop share"
- Asset pincode placeholder: "ज़मीन का पिनकोड डालें / Enter land's pincode"
- Village/town (asset location): "ज़मीन किस गाँव/कस्बे में है? / Which village/town is the land in?"

**Equipment form:**
- Rate amount placeholder: "जैसे: ₹800 / e.g. ₹800"
- Available from placeholder: "कब से उपलब्ध है? / Available from when?"
- Asset pincode placeholder: "उपकरण कहाँ है? पिनकोड डालें / Where is the equipment? Enter pincode"

**Labor form:**
- Worker count placeholder: "कितने मज़दूर उपलब्ध हैं? / How many workers available?"
- Rate amount placeholder: "जैसे: ₹400 प्रति दिन / e.g. ₹400 per day"
- Asset pincode placeholder: "मज़दूर कहाँ के हैं? पिनकोड डालें / Where are the workers based? Enter pincode"
- Available from/to placeholder: "जैसे: 1 अक्टूबर से 30 नवंबर / e.g. Oct 1 to Nov 30"

**Bhusa/Parali form:**
- Quantity placeholder: "जैसे: 50 क्विंटल या 3 ट्रॉली / e.g. 50 quintal or 3 trolley loads"
- Asking price placeholder: "जैसे: ₹150 प्रति क्विंटल या बातचीत से / e.g. ₹150 per quintal or negotiable"
- Asset pincode placeholder: "भूसा/पराली कहाँ उपलब्ध है? पिनकोड डालें / Where is the residue located? Enter pincode"

**Agri-Inputs form (farmer surplus):**
- Item name placeholder: "जैसे: HI-8498 गेहूं बीज, DAP खाद / e.g. HI-8498 wheat seed, DAP fertilizer"
- Quantity placeholder: "जैसे: 5 क्विंटल, 10 बैग / e.g. 5 quintal, 10 bags"
- Asking price placeholder: "जैसे: ₹3,200 प्रति क्विंटल / e.g. ₹3,200 per quintal"
- Material address placeholder: "दुकान/घर का पता जहाँ से सामग्री मिलेगी / Address where material can be collected"
- Material pincode placeholder: "सामग्री का पिनकोड / Pincode where material is available"

**Agri-Inputs form (vendor):**
- Business name placeholder: "जैसे: पटेल कृषि केंद्र / e.g. Patel Krishi Kendra"
- Items description placeholder: "आप क्या बेचते हैं? जैसे: गेहूं-सोयाबीन बीज, यूरिया, DAP, कीटनाशक / What do you sell? e.g. wheat-soybean seeds, Urea, DAP, pesticides"
- Price range placeholder: "जैसे: बाज़ार भाव पर / e.g. at market rates (optional)"
- Shop address placeholder: "दुकान का पूरा पता / Full shop address"

---

## Test checklist

- Positive: All renamed category labels appear correctly in both Hindi and English across nav, browse tabs, homepage cards, post form, listing detail, admin dashboard.
- Positive: "कृषि सहयोगी (Labor)" label shows correctly everywhere the Labor category name is displayed.
- Positive: Tapping '?' on each category opens the correct help modal in the current language.
- Positive: Closing the modal (tap outside or close button) works correctly on mobile.
- Positive: All form placeholders appear in the correct language when language is toggled.
- Negative: No old category name strings remain anywhere in the UI — search for "Residue", "Agri-Inputs", "Agri Supplies", "कृषि सामग्री" (as label) and confirm all replaced.
- Regression: Existing listings in the database still display correctly with the renamed category labels — category values in the DB (land/equipment/labor/parali/agri_inputs) are unchanged, only display labels change.

---

## Commit and deploy

Single commit: "UI: category renames, Labor Hindi fix, help modals, form placeholder text"
Then deploy: `npx wrangler pages deploy dist --project-name kissansahyog`
