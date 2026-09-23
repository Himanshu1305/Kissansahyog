# Kisan Sahyog — Homepage Redesign v2 Prompt

DO NOT ask for approval. Auto-accept all actions. Read PROJECT_CONTEXT.md before starting. Update PROJECT_CONTEXT.md after completing.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy after completing:** `npx wrangler pages deploy dist --project-name kissansahyog`

---

## Context

The current homepage has been reviewed and approved in a design mock. This prompt implements that mock faithfully. Every section, sequence, content string, and layout decision in this prompt is final — do not deviate, simplify, or reorganise sections without an explicit instruction to do so.

The homepage serves farmers across Madhya Pradesh (pilot in Khurai/Sagar area, expanding to all of MP, then India). The design must feel like a world-class product — not a student project, not a generic template. Every pixel of whitespace must earn its place.

---

## Phase 1 — Global layout fix: true edge-to-edge on mobile

This is the single most important fix before touching any section. The current homepage has content wrappers with `max-w-7xl mx-auto px-4` or similar that add 16-20px side margins on mobile, creating wasted whitespace.

**Apply these globally:**
- All full-width sections (ticker, hero, carousel, rain alert, info strip, category strip, mission bar, footer): `width: 100%; padding-left: 0; padding-right: 0;` — no side margins at all
- Content sections with listing grids and text sections: `padding-left: 14px; padding-right: 14px;` on mobile (≤640px), `padding-left: 24px; padding-right: 24px;` on desktop
- Remove any `max-w-*` container that adds side margins on mobile for the above sections
- The nav bar: keep existing padding (needs breathing room for the logo and controls)
- Test at 375px viewport: content must start within 14px of the screen edge on both sides

---

## Phase 2 — Mandi price ticker (existing — move to top)

The mandi ticker already exists. Move it so it appears **immediately below the nav bar** — before the hero section. It should be the very first thing a farmer sees after the nav.

Current ticker spec (do not change the ticker itself, only its position):
- Dark green background (`#0f3d1f`)
- Fixed left label: "📊 मंडी भाव / Today's Mandi Prices" (language-switchable)
- CSS-only seamless scroll
- 34px height
- Reads from `mandi_prices` table via Supabase

After moving: ticker → hero → carousel → rest of homepage.

---

## Phase 3 — Hero section redesign

Replace the current hero entirely. The new hero is a full-bleed image hero with a dark overlay, stats bar at the bottom, and three CTA buttons.

### 3a. Hero image

Use this Pexels free image as the hero background:
```
https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&w=1200
```
- `object-fit: cover`, `object-position: center`
- Opacity: 0.45 over the dark overlay
- Fallback background: `#0f3d1f` if image fails to load
- Dark overlay: `linear-gradient(135deg, rgba(8,32,16,0.88) 0%, rgba(8,32,16,0.55) 100%)`
- Total hero height: 240px on mobile, 300px on desktop

### 3b. Hero content (z-index above overlay)

```
[eyebrow badge]  🌾 किसानों का अपना डिजिटल मंच
                    Farmers' Own Digital Platform

[h1]  किसान की आय बढ़ाना
      रोज़गार के अवसर बनाना

[subline]  ज़मीन · उपकरण · मज़दूर · ड्रोन दीदी · गोदाम · कृषि सामग्री
           सीधा संपर्क · बिना बिचौलिए · बिल्कुल मुफ़्त

[3 buttons row]
  Button 1: "लिस्टिंग देखें →" / "Browse Listings →"  — filled green (#3da85f)
  Button 2: "+ नई लिस्टिंग" / "+ New Listing"  — semi-transparent white border
  Button 3: "📲 WhatsApp पर शेयर करें" / "Share on WhatsApp"  — #25D366 green
             → links to: https://wa.me/?text=किसान%20सहयोग%20—%20kissansahyog.com
```

Eyebrow badge styling: `background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.18); border-radius: 20px; padding: 3px 10px; font-size: 10px; color: #b8dfc4;`

All hero strings must go through the existing translation system — no hardcoded text.

### 3c. Stats bar (bottom of hero)

A translucent strip pinned to the bottom of the hero section:
```
background: rgba(8,32,16,0.75)
4 equal columns, separated by rgba(255,255,255,0.1) borders
```

| Stat | Label (Hindi) | Label (English) |
|---|---|---|
| 50+ | लिस्टिंग | Listings |
| 9 | सेवाएं | Categories |
| 30 किमी | दायरा | Radius |
| मुफ़्त | बिल्कुल | Free |

Number in `#4caf70` (bright green), label in `#90c8a0` (muted green), 9px font. All four labels through i18n.

---

## Phase 4 — Trust carousel (new — replaces current large carousel)

The current carousel is too tall and dominates the page. Replace with a compact but impactful carousel.

**Height:** 165px on mobile, 200px on desktop (NOT the current full-height version)
**Position:** Immediately after the hero section
**Auto-scroll:** 8 seconds per slide (slow enough to actually read)
**Touch/swipe:** supported
**Controls:** left/right arrow buttons + dot indicators at bottom
**Animation:** CSS transform translateX, 0.4s ease transition

### Slide content (5 slides):

**Slide 1 — Welcome (typographic, no image):**
- Background: `#0a2010`
- Large text: "किसान सहयोग में आपका स्वागत है"
- Subtext: "किसान की आय बढ़ाना और रोज़गार के अवसर बनाना — हमारे दो लक्ष्य"

**Slide 2 — PM Modi (government press image):**
Search for a publicly available PIB (Press Information Bureau) press image of PM Modi with farmers or at an agricultural event. PIB images are released by the Government of India for public use. Search `pib.gov.in` or Google Images filtered to PIB source for "PM Modi kisan agriculture". Use the direct image URL if found. If a direct hotlinkable URL cannot be confirmed, use this Pexels placeholder:
```
https://images.pexels.com/photos/2255935/pexels-photo-2255935.jpeg?auto=compress&cs=tinysrgb&w=800
```
- Dark overlay: `linear-gradient(90deg, rgba(5,20,10,0.88) 0%, rgba(5,20,10,0.3) 100%)`
- Caption: "माननीय प्रधानमंत्री श्री नरेंद्र मोदी जी का किसानों के प्रति समर्पण"
- Sub-caption: "PM Kisan · PMFBY · Drone Didi · PM KUSUM — किसानों के लिए"
- Source note (9px): "फोटो: PIB, भारत सरकार" — add code comment: `{/* TODO: Replace with official PIB photo once permission confirmed */}`

**Slide 3 — MP Chief Minister (government press image):**
Search for a publicly available government press image of MP Chief Minister Mohan Yadav at an agricultural event or with farmers. Use `mpinfo.org` or MP government press releases. If direct URL not confirmed, use this placeholder:
```
https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800
```
- Caption: "मध्यप्रदेश के मुख्यमंत्री श्री मोहन यादव जी — किसान कल्याण के प्रति प्रतिबद्ध"
- Sub-caption: "किसान सम्मान · फसल बीमा · सिंचाई · कृषि विकास"
- Source note: "फोटो: MP Information Department" — add code comment: `{/* TODO: Replace with official MP govt photo */}`

**Slide 4 — Drone Didi scheme:**
Use this image URL (woman with technology/drone, freely licensed):
```
https://images.pexels.com/photos/3735747/pexels-photo-3735747.jpeg?auto=compress&cs=tinysrgb&w=800
```
- Caption: "ड्रोन दीदी — महिला उद्यमी, आधुनिक तकनीक"
- Sub-caption: "₹1,261 करोड़ की सरकारी योजना · 15,000 महिला SHG को ड्रोन"
- Source note: "योजना: Ministry of Agriculture, Govt. of India"

**Slide 5 — Vision (wheat field):**
```
https://images.pexels.com/photos/265216/pexels-photo-265216.jpeg?auto=compress&cs=tinysrgb&w=800
```
- Caption: "हर किसान के लिए · हर जगह"
- Sub-caption: "मध्यप्रदेश से शुरुआत · पूरे देश का सपना"

**Carousel implementation:**
- Each slide: `position: relative; overflow: hidden`
- Background image: `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.5`
- Overlay: `position: absolute; inset: 0` with the gradient specified per slide
- Text: `position: relative; z-index: 2; padding: 0 16px`
- h3: `font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 3px`
- p: `font-size: 10.5px; color: #90c8a0; line-height: 1.4`
- small source note: `font-size: 8.5px; color: #5a8a6a; margin-top: 2px; display: block`
- Dot indicators: active dot is `#4caf70` and wider (14px wide, 5px tall, border-radius 3px), inactive dots are `rgba(255,255,255,0.3)` and 5×5px circles
- All carousel strings through i18n

---

## Phase 5 — Rain alert redesign

Replace the current single-line rain alert with the new rich format. Only show this strip when `rain_alert_48h = true` in the `weather_cache` table. Hide completely when no rain is forecast.

**Strip styling:**
- Background: `#1c3a70` (dark blue, NOT amber — amber was the old design)
- Full width, no side padding on the strip itself
- Content padding: `8px 14px`
- Layout: flex row, gap 8px

**Content structure:**
```
[blue dot 7px]  [right column]
                 🌧️ अगले X दिन बारिश की संभावना  (X = consecutive rainy days count)
                 [day pills row]  कल ~18मिमी  ·  परसों ~20मिमी  ·  नरसों ~16मिमी
                 [action text based on IMD classification]
```

**Day pills:** `background: rgba(255,255,255,0.1); border-radius: 5px; padding: 2px 7px; font-size: 9.5px; color: #c8dcff`

**The action text (farmer advice) — derive from precipitation data in `weather_cache.forecast`:**

Calculate the maximum single-day precipitation from the next 48 hours of forecast data. Then apply:

```javascript
// IMD thresholds — 24h precipitation in mm
function getRainAdvice(maxMm, lang) {
  if (maxMm < 15) return lang === 'hi'
    ? 'हल्की बारिश — सिंचाई की ज़रूरत नहीं, खेत के काम जारी रखें'
    : 'Light rain — no irrigation needed, fieldwork can continue';
  if (maxMm < 64.5) return lang === 'hi'
    ? '⚠️ सोयाबीन-उड़द की कटाई जल्द करें — छिड़काव कम से कम 48 घंटे टालें'
    : '⚠️ Harvest soybean/urad soon — delay spraying by at least 48 hours';
  if (maxMm < 115.5) return lang === 'hi'
    ? '⚠️ IMD पीली चेतावनी — कटाई रोकें, मज़दूर बुकिंग टालें, पशुओं को सुरक्षित स्थान पर रखें'
    : '⚠️ IMD Yellow Alert — stop harvesting, delay labor, shelter animals';
  if (maxMm < 204.5) return lang === 'hi'
    ? '🔴 IMD नारंगी चेतावनी — खेत में न जाएं, फसल को नुकसान संभव, निचले इलाकों में सतर्क रहें'
    : '🔴 IMD Orange Alert — avoid fields, crop damage likely, stay alert in low-lying areas';
  return lang === 'hi'
    ? '🚨 IMD लाल चेतावनी — घर में रहें, प्रशासन के निर्देशों का पालन करें'
    : '🚨 IMD Red Alert — stay indoors, follow district administration orders';
}
```

Only use "IMD चेतावनी" language for ≥64.5mm. For lower rainfall say "संभावना" (expected) not "चेतावनी" (alert).

Per-day amounts: extract `precipitation_sum` for each of the next 3 days from the forecast JSON and show as: "कल ~Xमिमी · परसों ~Xमिमी · नरसों ~Xमिमी" — round to nearest integer.

All rain alert strings through i18n.

---

## Phase 6 — Weather + MSP info strip

Replace the current weather/MSP section with this compact two-column strip.

**Container:** `display: flex; background: #fff; border-bottom: 1px solid #e8e8e4`

**Left cell — Weather:**
- Label: "🌤️ मौसम / Weather" (9px, uppercase, #888)
- Temperature: large (22px, bold, `#1a5c2e`)
- Condition: 10.5px, `#444`
- Location: "📍 आपके नज़दीक" (9px, #888) — NOT "खुरई / सागर". The location shown should be the user's profile pincode village/town if available, else "आपके नज़दीक / Near you"
- 5-day forecast row: compact, horizontal, 5 day columns. Each column: day name (Hindi abbreviation), weather icon emoji, rainfall mm in blue if >0 else "—"
- Link: "5 दिन का पूर्वानुमान → /info#weather" (9.5px, green)

Hindi day abbreviations: सोम, मंगल, बुध, गुरु, शुक्र, शनि, रवि (from the day of week index)

**Right cell — MSP:**
- Label: "📋 MSP 2026-27" (9px, uppercase, #888)
- Show 4 rows: गेहूं, सोयाबीन, चना, मसूर — with their MSP prices
- For crops that have a matching mandi price (use MANDI_TO_MSP map already in codebase): show a chip
  - Mandi > MSP: green chip "↑ MSP से ऊपर"
  - Mandi < MSP: amber chip "↓ MSP से नीचे"
- **MSP caption — CRITICAL:** Place `"MSP = न्यूनतम समर्थन मूल्य, सरकारी गारंटी / MSP = Minimum Support Price, govt. guarantee"` as a small italic grey caption **below** the last MSP row — NOT beside the prices, NOT above them. This is an explicit positioning requirement. font-size: 8.5px, color: #aaa, font-style: italic, margin-top: 5px.
- Link: "पूरी सूची → /info" (9.5px, green)

All strings through i18n.

---

## Phase 7 — Category scroll strip

The existing category strip is correct but needs two fixes:

**Fix 1 — Order:** Equipment → Labor (कृषि सहयोगी) → Drone Didi → Bhoosa/Parali → Seeds/Fertilizers → Warehouse → Experts → Land

Land must be last. Verify this order is consistent with the current codebase — if already correct, confirm and move on.

**Fix 2 — Active state styling:** The active chip must be clearly visible — `background: #1a5c2e; color: #fff; border-color: #1a5c2e`. Inactive chips: `background: #fff; color: #333; border: 1px solid #ddd`. No ambiguous dark/black states.

---

## Phase 8 — Listings grid

The listings grid already exists but needs two targeted fixes:

**Fix 1 — WhatsApp share button on each card:**
Add a small circular WhatsApp button (20×20px, `#25D366` background) positioned `top: 7px; right: 7px` on each listing card. Tapping it opens:
```
https://wa.me/?text=[pre-filled message]
```
First check the codebase for an existing `generateShareMessage(listing, url)` or `whatsappShareUrl(listing)` function — a previous build added this. If found, use it. If not found, implement the share URL using this format:
```javascript
function generateShareMessage(listing, url) {
  const templates = {
    land: `🌾 ज़मीन उपलब्ध — ${listing.details?.size_range || ''} एकड़ | किसान सहयोग: ${url}`,
    equipment: `🚜 उपकरण उपलब्ध — ${listing.details?.equipment_type || ''}, ${listing.details?.rate_amount || ''}/${listing.details?.rental_basis || ''} | किसान सहयोग: ${url}`,
    labor: `👷 कृषि सहयोगी उपलब्ध — ${listing.details?.worker_count || ''} मज़दूर | किसान सहयोग: ${url}`,
    drone_didi: `🚁 ड्रोन सेवा — ${listing.details?.rate_per_acre || ''}/एकड़ | किसान सहयोग: ${url}`,
    parali: `🌿 भूसा/पराली — ${listing.details?.residue_type || ''}, ${listing.details?.asking_price || ''} | किसान सहयोग: ${url}`,
    agri_inputs: `🌱 कृषि सामग्री — ${listing.details?.item_name || listing.details?.business_name || ''} | किसान सहयोग: ${url}`,
    warehouse: `🏭 गोदाम — ${listing.details?.capacity_quintals || ''} क्विंटल, ${listing.details?.rate || ''} | किसान सहयोग: ${url}`,
  };
  return templates[listing.category] || `किसान सहयोग पर लिस्टिंग देखें: ${url}`;
}
```
The WhatsApp button on each card: `<a href={\`https://wa.me/?text=\${encodeURIComponent(generateShareMessage(listing, listingUrl))}\`} target="_blank">`

**Fix 2 — Vendor badge visibility:**
Vendor listings (`listing_source = 'vendor'`) must show a visible "🏪 व्यापारी" badge in amber/orange. Verify this badge renders correctly and is not hidden or clipped.

**Section heading:** "हाल की लिस्टिंग / Recent Listings" with a "सभी देखें → / View All →" link aligned right.

---

## Phase 9 — Government contacts highlight strip

This section already exists from the RESOURCES_PROMPT build. Verify it still renders on the homepage. If it does, ensure it uses the amber border style (`border-top: 2px solid #e8a800; border-bottom: 2px solid #e8a800; background: #fffbf0`) and shows 3-4 horizontal scroll cards.

If the section is missing or broken, rebuild it as a compact horizontal scroll strip showing:
- 🧪 मिट्टी जांच · ☎ 1800-180-1551 · → /resources#soil
- 🐄 पशु चिकित्सा · ☎ 1962 (टोल-फ्री) · → /resources#veterinary
- 🌾 KVK सागर · ☎ 07582-288228 · → /resources#offices
- 📞 किसान हेल्पलाइन · ☎ 1800-180-1551

---

## Phase 10 — Government schemes strip (Sarkari Yojana)

This section uses the `sarkari_yojana` table built in the COMMUNITY_FEATURES_PROMPT. Show 3-4 featured schemes (is_featured = true) as a horizontal scroll card row.

**Each scheme card (min-width: 148px):**
- Category badge (green pill)
- Scheme name (Hindi, 11px bold)
- Benefit highlight (green, 10px bold) — the single most important benefit in one line
- Eligibility note (9px, grey)
- "कैसे आवेदन करें → / How to apply →" link

**Section heading:** "सरकारी योजनाएं / Government Schemes" with "सभी 8 → / All 8 →" link

If no schemes exist in the DB (migration 0021 not applied): show a graceful empty state — do not crash or show a broken section.

---

## Phase 11 — Kisan Sawaal featured strip

Uses the `kisan_sawaal` table (migration 0021). Show 1-2 featured Q&As (is_featured = true, is_published = true).

**Section heading:** "किसान सवाल / Farmer Q&A" with "सभी सवाल → / All Questions →" link

**Each Q&A item:**
- Question in bold Hindi (11.5px)
- Answer (first 2 lines, expandable on tap) (10.5px, #444)
- Meta row: asker village + "Team Kisan Sahyog" answerer (both 8.5px)

**"+ अपना सवाल पूछें / + Ask Your Question" button** — full width, green, links to /sawaal

If no featured Q&As exist: show the ask button only with a message "कोई सवाल पूछें — हम जवाब देंगे / Ask a question — we'll answer"

---

## Phase 12 — Articles strip

Already exists. Verify it renders with correct styling:
- 2-column grid
- Each card: image (68px height, `object-fit: cover`), category tag in green (8.5px), title in dark (10.5px bold)
- Article images must NOT be black/broken. If the image URL fails to load, show the card's `background: #2d6a3f` (dark green) as fallback — not a broken image icon.
- Add `onerror="this.style.display='none'"` on all article `<img>` tags so broken images fail silently to the background colour

---

## Phase 13 — Mission bar + Footer

**Mission bar** (already exists — verify correct):
- `background: #0f3d1f`
- Two items separated by a divider: "🌾 किसान की आय बढ़ाना" | "💼 रोज़गार के अवसर"
- Both items with a small green dot (5px, `#4caf70`) before the text
- Font: 10.5px, color: `#90c8a0`, font-weight 600

**Footer** (verify):
- Logo: "🌾 किसान सहयोग"
- Sub: "USD Vision AI LLP · Madhya Pradesh, India" — NOT "Sagar" specifically
- Links: Privacy Policy, Terms of Use, Resources, Articles, Contact (admin@kissansahyog.com)
- Copyright: "© 2026 Kisan Sahyog | kissansahyog.com | सभी अधिकार सुरक्षित"

---

## Phase 14 — Tagline and vision language audit

Search the entire codebase for any of the following strings and remove or replace them:

**Remove/replace:**
- "सागर जिले का अपना मंच" → remove entirely (replaced by "किसानों का अपना डिजिटल मंच" in hero eyebrow)
- Any hardcoded "खुरई / सागर" in the weather location display → replace with dynamic location from user profile, fallback to "आपके नज़दीक / Near you"
- Any meta description or page title that says "Sagar" as a geographic limit → update to reflect MP/India scope

**Keep** (these are correct references to Sagar, not limiting language):
- Mandi prices showing "Sagar APMC" or "Shahagarh APMC" — these are mandi names, factually correct
- Resource directory entries listing KVK Sagar, veterinary contacts etc. — factually correct
- Listing cards showing "Sagar" as district — factually correct

---

## Phase 15 — Full bilingual audit of all new/changed strings

Every string added or changed in Phases 1-14 must go through the existing translation system (strings.js or equivalent). No hardcoded Hindi-only or English-only user-facing text anywhere.

**Specific strings to audit:**
- Hero eyebrow, h1, subline, all three button labels, all four stat labels
- Carousel: all 5 slide captions and sub-captions (the source notes can be hardcoded as they are attribution text)
- Rain alert: main label, day pill format, all 5 levels of farmer advice
- Weather cell: label, location text, day abbreviations, forecast link
- MSP cell: label, MSP caption (below the prices), comparison chip labels, link
- Category strip: verify all 9 category chip labels are bilingual
- Listings section heading and "view all" link
- Government contacts strip heading and card labels
- Schemes strip heading and "all 8" link
- Q&A strip heading and "ask question" button
- Mission bar items
- Footer sub-tagline

---

## Phase 16 — Integration test

**375px mobile viewport test:**
- Open the page at 375px width
- Content must start within 14px of screen edges
- Hero + ticker + carousel visible in the first viewport (no need to scroll to see the mandi ticker)
- Carousel arrows and dots visible and tappable
- Category strip scrolls horizontally without wrapping to second row
- All listing cards show correct badges, prices, locations, and WhatsApp buttons
- Rain alert visible with blue background (not amber)
- MSP caption appears BELOW the MSP prices (critical — verify DOM order)
- Weather location shows "आपके नज़दीक" not a hardcoded city

**Content tests:**
- Language toggle switches all hero strings, rain alert, weather label, MSP caption, category chips, section headings
- Carousel auto-scrolls every 8 seconds
- Carousel manual navigation (arrows + dots) works
- WhatsApp share button on hero opens wa.me link
- WhatsApp buttons on listing cards open pre-filled messages
- Schemes section shows at least 3 cards (requires migration 0021 applied to DB)
- Q&A section shows featured questions or the ask button gracefully

**Regression:**
- /resources, /info, /sawaal, /yojana, /safalta all load correctly
- Admin dashboard unaffected
- Browse, post listing, listing detail all unaffected
- Mandi ticker still shows real prices

---

## Commit and deploy

Single commit: "Homepage redesign v2: full-bleed hero with wheat field photo, trust carousel (5 slides, 165px, 8s), rich rain alert with IMD classification and per-day mm, weather location-aware, MSP caption below prices, edge-to-edge layout, WhatsApp share on hero and listings, schemes and Q&A strips, vision language updated (no Sagar limit)"

Deploy: `npx wrangler pages deploy dist --project-name kissansahyog`

Confirm on staging.kissansahyog.com:
- Hero shows wheat field background image with dark overlay
- Mandi ticker is the first element below the nav
- Carousel is 165px, auto-scrolls at 8s intervals, shows 5 slides
- Rain alert (if active) shows blue strip with per-day rainfall and farmer advice
- MSP caption is below the prices, not beside them
- Weather location is dynamic, not hardcoded "Sagar"
- Category strip scrolls horizontally, Land is last
- All content is edge-to-edge on mobile
