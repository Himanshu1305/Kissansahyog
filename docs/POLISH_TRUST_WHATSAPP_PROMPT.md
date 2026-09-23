# Kisan Sahyog — Homepage Polish + Trust + WhatsApp Share Prompt

DO NOT ask for approval. Auto-accept all actions. Read PROJECT_CONTEXT.md before starting. Update PROJECT_CONTEXT.md after completing.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy after completing:** `npx wrangler pages deploy dist --project-name kissansahyog`

---

## Overview

Six focused improvements in one prompt:
1. Rain alert — richer, actionable, with IMD colour-code classification and duration
2. Edge-to-edge layout — remove remaining unnecessary side padding
3. MSP caption repositioned below the MSP box
4. WhatsApp share buttons on listing detail pages and homepage
5. Homepage trust carousel — farmer photos + government scheme imagery
6. Drone Didi page — real imagery from PIB/govt sources

No schema changes. No new tables. UI and content only.

---

## Phase 1 — Rain alert: richer, actionable, IMD-informed

### 1a. Rainfall classification using IMD colour-code system

The existing `rain_alert_48h` boolean is too simple. Extend the weather widget component to classify rainfall severity using IMD's official colour-code thresholds (derived from the `forecast` JSONB already in `weather_cache`):

```javascript
// IMD rainfall classification — based on 24-hour precipitation_sum (mm)
function getIMDAlert(precipitationMm, daysCount) {
  if (precipitationMm === 0) return null;
  if (precipitationMm < 15) return {
    level: 'light',
    color: 'green',
    hi: `हल्की बारिश (${Math.round(precipitationMm)} मिमी)`,
    en: `Light rain (${Math.round(precipitationMm)}mm)`
  };
  if (precipitationMm < 64.5) return {
    level: 'moderate',
    color: 'blue',
    hi: `मध्यम बारिश (${Math.round(precipitationMm)} मिमी)`,
    en: `Moderate rain (${Math.round(precipitationMm)}mm)`
  };
  if (precipitationMm < 115.5) return {
    level: 'heavy',
    color: 'yellow', // IMD Yellow alert threshold
    hi: `भारी बारिश — IMD पीली चेतावनी (${Math.round(precipitationMm)} मिमी)`,
    en: `Heavy rain — IMD Yellow Alert (${Math.round(precipitationMm)}mm)`
  };
  if (precipitationMm < 204.5) return {
    level: 'very_heavy',
    color: 'orange', // IMD Orange alert threshold
    hi: `बहुत भारी बारिश — IMD नारंगी चेतावनी (${Math.round(precipitationMm)} मिमी)`,
    en: `Very heavy rain — IMD Orange Alert (${Math.round(precipitationMm)}mm)`
  };
  return {
    level: 'extreme',
    color: 'red', // IMD Red alert threshold
    hi: `अत्यधिक भारी बारिश — IMD लाल चेतावनी (${Math.round(precipitationMm)} मिमी)`,
    en: `Extremely heavy rain — IMD Red Alert (${Math.round(precipitationMm)}mm)`
  };
}
```

### 1b. Duration and day-count context

From the `forecast` array in `weather_cache`, calculate:
- How many consecutive days have rainfall > 3mm starting from today
- The total expected rainfall over those days

### 1c. Actionable farmer advice per alert level

The alert strip must tell the farmer what to DO, not just that it will rain:

```javascript
const FARMER_ADVICE = {
  light: {
    hi: "हल्की बारिश — सिंचाई की ज़रूरत नहीं, खेत के काम जारी रखें",
    en: "Light rain — no irrigation needed, fieldwork can continue"
  },
  moderate: {
    hi: "मध्यम बारिश — छिड़काव टालें, कटी फसल सुरक्षित रखें",
    en: "Moderate rain — delay spraying, protect harvested crops"
  },
  heavy: {
    hi: "भारी बारिश (IMD पीली चेतावनी) — कटाई रोकें, मज़दूर बुकिंग टालें, पशुओं को सुरक्षित स्थान पर रखें",
    en: "Heavy rain (IMD Yellow Alert) — stop harvesting, delay labor bookings, shelter animals"
  },
  very_heavy: {
    hi: "बहुत भारी बारिश (IMD नारंगी चेतावनी) — खेत में न जाएं, फसल को नुकसान हो सकता है, निचले इलाकों में बाढ़ का खतरा",
    en: "Very heavy rain (IMD Orange Alert) — avoid fields, crop damage likely, flood risk in low areas"
  },
  extreme: {
    hi: "अत्यधिक भारी बारिश (IMD लाल चेतावनी) — घर में रहें, प्रशासन के निर्देशों का पालन करें",
    en: "Extremely heavy rain (IMD Red Alert) — stay indoors, follow district administration orders"
  }
};
```

### 1d. Full alert strip format

Replace the current simple amber strip with a dynamic alert strip:

```
[colour indicator dot] [IMD alert level if applicable] अगले [X] दिन बारिश की संभावना — खुरई / सागर
[precipitation amount] | [duration] | [farmer action]
```

Example for moderate rain over 2 days:
```
🔵 अगले 2 दिन मध्यम बारिश — खुरई / सागर | कुल ~28 मिमी
छिड़काव टालें, कटी फसल सुरक्षित रखें
```

Example for IMD Yellow Alert:
```
🟡 IMD पीली चेतावनी — भारी बारिश — खुरई / सागर | अगले 1 दिन | ~85 मिमी
कटाई रोकें, मज़दूर बुकिंग टालें, पशुओं को सुरक्षित स्थान पर रखें
```

Strip background colour matches the alert level: blue for light/moderate, amber for heavy (yellow), orange for very_heavy, red for extreme.

**Note on IMD API:** The IMD does not have a simple free public API for district-level colour-coded alerts. The colour classification above is derived from Open-Meteo precipitation data using the same thresholds IMD uses — this is accurate and consistent with IMD methodology, but is calculated from forecast data rather than directly fetched from IMD. Do NOT claim "IMD ने चेतावनी जारी की है" unless the precipitation threshold actually crosses Yellow (64.5mm+). For light/moderate rain, only say "संभावना" (expected), not "चेतावनी" (alert).

---

## Phase 2 — Edge-to-edge layout fix

Looking at the live site, the listing cards and homepage sections have unnecessary left/right padding that wastes screen real estate on mobile. Apply these specific fixes:

- Homepage main content wrapper: change any `px-4 sm:px-6 lg:px-8` patterns to `px-2 sm:px-3` on mobile
- Listing card grid: remove any `mx-auto max-w-7xl` container that adds side margins — let it fill the available width
- The category strip already goes edge-to-edge — the listing cards below it should match
- The mandi ticker already goes edge-to-edge — the sections below it should match
- The weather + MSP 2-column section: `px-2` on mobile, not `px-4` or more
- Do NOT remove padding from the nav bar or the mandi ticker (these are correct already)
- Test at 375px viewport — content should start within 8px of the screen edge on both sides

---

## Phase 3 — MSP caption repositioned

The text "MSP वह न्यूनतम मूल्य है जो सरकार आपकी फसल के लिए देती है" currently appears beside the MSP price values, competing visually with the numbers.

Move it to below the MSP box, as a small italic caption in grey — same as a newspaper caption under a table:

```jsx
<div className="msp-highlight-box">
  {/* MSP crop prices here */}
</div>
<p className="text-xs text-gray-500 italic mt-1">
  {t('msp_caption')} {/* "MSP वह न्यूनतम मूल्य है जो सरकार आपकी फसल के लिए देती है" */}
</p>
```

This is a small DOM reorder — keep the text, just move it below.

---

## Phase 4 — WhatsApp share buttons

### 4a. Implementation (no API key needed)

WhatsApp sharing uses a simple universal link — no API, no registration:
- Mobile: `whatsapp://send?text=<encoded_message>` — opens WhatsApp app directly
- Desktop: `https://wa.me/?text=<encoded_message>` — opens WhatsApp Web
- Use `https://wa.me/?text=` universally — it works on both mobile and desktop correctly

### 4b. Listing detail page — share button

On every listing detail page, add a WhatsApp share button prominently below the disclaimer and above/beside the Call button:

```jsx
function WhatsAppShareButton({ listing }) {
  const url = `${window.location.origin}/listing/${listing.id}`;
  const msg = generateShareMessage(listing, url);
  const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 w-full py-2 bg-[#25D366] text-white rounded-lg font-medium"
    >
      <svg>/* WhatsApp SVG icon */</svg>
      {t('share_whatsapp')} {/* "WhatsApp पर शेयर करें" / "Share on WhatsApp" */}
    </a>
  );
}
```

**Pre-written share messages by category** (bilingual — uses current language):

```javascript
function generateShareMessage(listing, url) {
  const { category, listing_type, details, pincode } = listing;
  const offerReq = listing_type === 'offer' ? 'उपलब्ध' : 'चाहिए';

  const templates = {
    land: `🌾 ज़मीन ${offerReq} — ${details.size_range} एकड़, ${details.arrangement?.join('/')} — ${pincode} | किसान सहयोग पर देखें: ${url}`,
    equipment: `🚜 उपकरण ${offerReq} — ${details.equipment_type}, ${details.rate_amount}/${details.rental_basis} — ${pincode} | किसान सहयोग: ${url}`,
    labor: `👷 कृषि सहयोगी ${offerReq} — ${details.worker_count} मज़दूर, ${details.work_type} — ${pincode} | किसान सहयोग: ${url}`,
    drone_didi: `🚁 ड्रोन दीदी सेवा ${offerReq} — ${details.rate_per_acre}/एकड़ — ${pincode} | किसान सहयोग: ${url}`,
    parali: `🌿 भूसा/पराली ${offerReq} — ${details.residue_type}, ${details.asking_price} — ${pincode} | किसान सहयोग: ${url}`,
    agri_inputs: `🌱 कृषि सामग्री ${offerReq} — ${details.item_name || details.business_name}, ${details.asking_price || ''} — ${pincode} | किसान सहयोग: ${url}`,
    warehouse: `🏭 गोदाम ${offerReq} — ${details.capacity_quintals} क्विंटल, ${details.rate} — ${pincode} | किसान सहयोग: ${url}`,
  };

  return templates[category] || `किसान सहयोग पर लिस्टिंग देखें: ${url}`;
}
```

### 4c. Homepage — general share button

Add a WhatsApp share button in the homepage hero section (below the two CTA buttons, or as a third smaller button):

```
"📲 किसान सहयोग किसानों को शेयर करें / Share Kisan Sahyog with farmers"
```

Share message: `"किसान सहयोग — ज़मीन, उपकरण, मज़दूर, ड्रोन दीदी और कृषि सामग्री के लिए सीधा संपर्क। kissansahyog.com पर जोड़ें।"`

### 4d. Articles page — share button on each article

On article detail pages (`/articles/:slug`), add a WhatsApp share button below the article content:

Share message: `"[Article title in Hindi] — किसान सहयोग पर पढ़ें: [article URL]"`

---

## Phase 5 — Homepage trust carousel

### 5a. Carousel placement

Add a full-width trust carousel immediately below the hero section and above the mandi ticker. This is the first thing a visitor sees after the headline — it should build confidence.

### 5b. Carousel content and structure

Auto-scrolling image carousel (5-7 seconds per slide, manual navigation arrows + dot indicators):

**Slide 1 — Welcome / Platform intro:**
- Background: deep green gradient
- Text: "किसान सहयोग में आपका स्वागत है" (large)
- Subtext: "किसान की आय बढ़ाना — रोज़गार के अवसर बनाना"
- No image needed — typographic slide

**Slide 2 — PM Modi with farmers (PLACEHOLDER):**
- Placeholder: green background with text "[ PM Modi farmer photo — to be added with permission ]"
- Caption: "माननीय प्रधानमंत्री श्री नरेंद्र मोदी जी का किसानों के प्रति समर्पण"
- Mark with code comment: `{/* TODO: Replace placeholder with official photo after permission obtained */}`

**Slide 3 — MP Chief Minister with farmers (PLACEHOLDER):**
- Placeholder: green background with text "[ MP CM farmer photo — to be added with permission ]"
- Caption: "मध्यप्रदेश के मुख्यमंत्री जी का किसान कल्याण के प्रति संकल्प"
- Mark with code comment: `{/* TODO: Replace placeholder with official photo after permission obtained */}`

**Slide 4 — Drone Didi scheme (PIB imagery):**
- Search for and use a publicly available Drone Didi scheme image from PIB (press.pib.gov.in) — search "Drone Didi" on the PIB site and use the first government-released press image found. If no suitable image is found, use a placeholder with the text "[ Drone Didi scheme photo — PIB source ]"
- Caption: "ड्रोन दीदी — महिला किसान, आधुनिक तकनीक"
- Source attribution in tiny text: "स्रोत: PIB, भारत सरकार"

**Slide 5 — Khurai / Sagar farming landscape:**
- Search Wikimedia Commons for a freely licensed image of farming in Madhya Pradesh or Sagar district. Use only images with CC0 or CC-BY license. If none found, use a green wheat field image from Unsplash (free for commercial use).
- Caption: "सागर जिले के किसान — मध्यप्रदेश की शान"

**Slide 6 — Equipment / tractor:**
- Use a freely licensed tractor farming image from Unsplash or Wikimedia Commons
- Caption: "उपकरण साझा करें — खर्च बचाएं, आय बढ़ाएं"

### 5c. Carousel technical spec

- CSS-only auto-scroll OR lightweight JS (no heavy carousel library — keep bundle size minimal)
- Touch/swipe support on mobile
- Dots for navigation (visible on mobile), arrows (visible on desktop)
- Each slide: 200px height on mobile, 280px on desktop — not full-screen (don't push content below the fold)
- Image: `object-fit: cover`, lazy-loaded
- Text overlay: semi-transparent dark gradient at bottom of image so caption is readable
- Pause on hover/touch
- `aria-label="Trust carousel"` for accessibility

---

## Phase 6 — Drone Didi page imagery

The Drone Didi browse/detail page currently uses a generic icon. Add visual context:

### 6a. Drone Didi category banner

At the top of the Drone Didi browse page, add a small banner (80px height on mobile) showing:
- A drone SVG illustration (not helicopter) OR a PIB-sourced Drone Didi press image if found in Phase 5 research
- Text overlay: "ड्रोन दीदी — सरकारी योजना के तहत महिला उद्यमियों द्वारा संचालित ड्रोन छिड़काव सेवा"
- A "और जानें / Learn more" link to the article or resources page

### 6b. Government scheme badge on the page

Already exists on individual listing cards (the "सरकारी ड्रोन दीदी योजना ✓" badge). Ensure it's also visible on the browse page header/banner area, not just on individual cards.

---

## Phase 7 — Bilingual audit + verification

All new strings through i18n:
- Rain alert levels and farmer advice text (all IMD colour-code level strings)
- WhatsApp share button labels
- WhatsApp share message templates (Hindi and English variants)
- Carousel slide captions
- Drone Didi banner text

**Test checklist:**
- Positive: Rain alert with 10mm forecast → blue strip with moderate rain advice, no "IMD चेतावनी" label
- Positive: Rain alert with 80mm forecast → amber strip with "IMD पीली चेतावनी" label and heavy-rain farmer advice
- Positive: No rain forecast → no alert strip at all
- Positive: WhatsApp share button on listing detail page generates correct pre-filled message with listing URL
- Positive: Homepage share button generates correct pre-filled platform message
- Positive: Carousel auto-scrolls and pauses on touch
- Positive: Placeholder slides show placeholder text with TODO comment (not broken images)
- Positive: Listing cards go edge-to-edge at 375px mobile viewport
- Positive: MSP caption appears below the MSP box, not beside the prices
- Positive: Language toggle switches all new strings correctly
- Negative: WhatsApp share link on desktop opens WhatsApp Web in a new tab (not a broken link)
- Regression: Mandi ticker, weather widget, category strip, admin dashboard all unaffected

---

## Commit and deploy

Single commit: "Polish: rich rain alert with IMD classification + farmer advice; edge-to-edge layout; MSP caption repositioned; WhatsApp share buttons; trust carousel; Drone Didi imagery"

Deploy: `npx wrangler pages deploy dist --project-name kissansahyog`

Confirm on staging:
- Rain alert strip (if rain forecast) shows level + mm + days + farmer advice
- Listing detail pages have green WhatsApp share button
- Homepage hero has "Share on WhatsApp" button
- Trust carousel visible below hero, auto-scrolling
- Listing cards go edge-to-edge on mobile
- MSP caption is below the MSP box
