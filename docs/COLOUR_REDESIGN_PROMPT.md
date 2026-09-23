# Kisan Sahyog — Colour Redesign + Critical Fixes Prompt

DO NOT ask for approval. Auto-accept all actions. Read PROJECT_CONTEXT.md before starting. Update PROJECT_CONTEXT.md after completing.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy after completing:** `npx wrangler pages deploy dist --project-name kissansahyog`

---

## Context

The homepage has three simultaneous problems that must all be fixed in this single prompt:
1. All external images are blocked by Cloudflare CSP — hero and carousel appear as dark voids
2. The colour scheme is dark, institutional, and demotivating — feels like a 2010 government website
3. Font sizes are too small, layout is not truly edge-to-edge, weather location is hardcoded

This prompt fixes all three together by applying a new colour system AND the technical fixes simultaneously. Do not do them separately.

---

## The new colour system — Saffron & Forest Green

Define these CSS custom properties as the global design tokens in the app's main CSS file (index.css or equivalent). Replace ALL existing colour references throughout the entire codebase with these tokens:

```css
:root {
  /* Primary — Forest Green (nature, growth) */
  --ks-primary: #2d5a1b;
  --ks-primary-dark: #1e3d12;
  --ks-primary-light: #3d7a25;
  --ks-primary-muted: #e8f5e0;

  /* Accent — Saffron/Amber (warmth, harvest, Indian identity) */
  --ks-accent: #f59e0b;
  --ks-accent-dark: #d97706;
  --ks-accent-light: #fbbf24;
  --ks-accent-muted: #fef3c7;

  /* Page background — warm cream (not clinical white) */
  --ks-bg: #faf8f2;
  --ks-bg-card: #ffffff;
  --ks-bg-section: #f5f0e8;

  /* Borders */
  --ks-border: #e8e0d0;
  --ks-border-light: #f0ece0;

  /* Text */
  --ks-text: #1a1a1a;
  --ks-text-secondary: #555;
  --ks-text-muted: #888;

  /* Semantic */
  --ks-offer: #e8f5e0;
  --ks-offer-text: #1e3d12;
  --ks-requirement: #fef3c7;
  --ks-requirement-text: #92400e;
  --ks-vendor: #fff7ed;
  --ks-vendor-text: #7c2d12;

  /* WhatsApp */
  --ks-whatsapp: #25D366;
}
```

Apply these tokens throughout. Do a global find-and-replace of all existing hardcoded hex colours:

| Old colour | Replace with |
|---|---|
| `#1a5c2e` | `var(--ks-primary)` |
| `#0f3d1f` | `var(--ks-primary-dark)` |
| `#3da85f`, `#4caf70` | `var(--ks-primary-light)` |
| `#e6f4ea`, `#dcf5e7` | `var(--ks-primary-muted)` |
| Any amber/gold CTA colours | `var(--ks-accent)` |
| `#f5f5f0`, `#f8f8f4`, white page backgrounds | `var(--ks-bg)` |
| Card backgrounds | `var(--ks-bg-card)` |
| Border colours `#e5e5e0`, `#e0e0d8` | `var(--ks-border)` |

---

## Fix 1 — CSP: allow external images (CRITICAL — do first)

Create `public/_headers` (Vite copies the `public/` folder to `dist/` at build time — this is how Cloudflare Pages picks up the _headers file):

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://images.pexels.com https://images.unsplash.com https://upload.wikimedia.org https://pib.gov.in https://mpinfo.org https://lh3.googleusercontent.com; connect-src 'self' https://*.supabase.co https://api.open-meteo.com https://mandi-api.onrender.com https://api.data.gov.in; font-src 'self' data:; frame-ancestors 'none'
```

If a `_headers` file already exists in `public/` or root, update it — do not create a duplicate.

Add `crossOrigin="anonymous"` to every `<img>` tag that loads from an external domain (hero image, all carousel slide images, article images).

After deploy, verify with:
```bash
curl -I https://staging.kissansahyog.com | grep -i content-security
```
The response must include `img-src` containing `images.pexels.com`.

---

## Fix 2 — Nav redesign

```
Background: #ffffff
Border-bottom: 1px solid var(--ks-border-light)
Height: 52px

Left: Logo (wheat emoji 28px) + "किसान सहयोग" (15px, font-weight:800, color: var(--ks-primary)) + "Kisan Sahyog" (10px, color: var(--ks-text-muted), display:block)

Centre (desktop only): category links in var(--ks-text-secondary), 12px

Right: language toggle (हिं/EN pill, background var(--ks-accent-muted), active: var(--ks-accent) background, var(--ks-accent-dark) text) + user avatar (var(--ks-primary) background)
```

---

## Fix 3 — Mandi ticker (colour update)

```
Background: var(--ks-primary-dark)
Label section: var(--ks-primary) background
Label text: var(--ks-accent-muted) — warm cream
Commodity names (bold): #ffffff
Prices and market names: #c8e6b0 — soft green
Separator dots: var(--ks-primary-light)
```

---

## Fix 4 — Hero section (image + colour + size)

### 4a. Fix the image — CSP _headers from Fix 1 enables this

Hero background image:
```
src: https://images.pexels.com/photos/1327838/pexels-photo-1327838.jpeg?auto=compress&cs=tinysrgb&w=1200
crossOrigin: anonymous
object-fit: cover
opacity: 0.55 (NOT 0.45 — needs to be visible)
loading: eager
```

Fallback if image fails: `background: var(--ks-primary)` — a solid green, NOT a dark void.

Overlay gradient: `linear-gradient(135deg, rgba(30,62,18,0.82) 0%, rgba(30,62,18,0.48) 100%)`

### 4b. Hero content

```
Height: 260px mobile, 320px desktop

Eyebrow badge:
  background: var(--ks-accent)
  color: var(--ks-accent-dark) — dark amber text on gold
  font-size: 12px, font-weight: 800
  border-radius: 20px, padding: 4px 12px
  Text: "🌾 किसानों का अपना डिजिटल मंच" / "Farmers' Own Digital Platform"

H1:
  font-size: 28px mobile, 36px desktop
  font-weight: 900
  color: #ffffff
  line-height: 1.2
  margin-bottom: 8px
  Text: "किसान की आय बढ़ाना\nरोज़गार के अवसर बनाना"

Subline:
  font-size: 14px
  color: #c8e6b0
  line-height: 1.6
  Text: "ज़मीन · उपकरण · मज़दूर · ड्रोन दीदी · गोदाम · कृषि सामग्री\nसीधा संपर्क · बिना बिचौलिए · बिल्कुल मुफ़्त"

Buttons (3, in a flex row with gap: 8px, flex-wrap: wrap):
  Button 1: background var(--ks-accent), color var(--ks-accent-dark), font-weight:800
            "लिस्टिंग देखें →" / "Browse Listings →"
            padding: 10px 20px, border-radius: 24px, font-size: 14px
  Button 2: background rgba(255,255,255,0.15), color #fff
            border: 1.5px solid rgba(255,255,255,0.35)
            "+ नई लिस्टिंग" / "+ New Listing"
            padding: 10px 18px, border-radius: 24px, font-size: 14px
  Button 3: background var(--ks-whatsapp), color #fff
            "📲 WhatsApp" → links to https://wa.me/?text=किसान%20सहयोग%20—%20kissansahyog.com
            padding: 10px 16px, border-radius: 24px, font-size: 14px
```

### 4c. Stats bar (pinned to bottom of hero)

```
Background: rgba(20,40,12,0.80)
4 equal columns, border-right: 1px solid rgba(255,255,255,0.12)

Stats: 50+ लिस्टिंग | 9 सेवाएं | 30 किमी दायरा | मुफ़्त बिल्कुल

Number: font-size 18px, font-weight:800, color: var(--ks-accent)
Label: font-size 11px, color: #a0c890
Padding per cell: 8px
```

---

## Fix 5 — Trust carousel (image + colour + size)

```
Height: 180px mobile, 220px desktop
Auto-scroll: 8 seconds per slide
```

**Each slide image — add crossOrigin="anonymous" and onerror fallback:**

```jsx
<img
  src={slideImageUrl}
  crossOrigin="anonymous"
  onError={(e) => {
    e.target.style.display = 'none';
    e.target.parentElement.style.background =
      'linear-gradient(135deg, var(--ks-primary) 0%, var(--ks-primary-dark) 100%)';
  }}
  style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:0.55}}
/>
```

**Slide image URLs (keep these exactly):**

Slide 1 — typographic (no image needed):
```
background: linear-gradient(135deg, var(--ks-primary) 0%, var(--ks-primary-dark) 100%)
Heading: "किसान सहयोग में आपका स्वागत है" — font-size:20px, font-weight:800, color:#fff
Subtext: "किसान की आय बढ़ाना और रोज़गार के अवसर बनाना — हमारे दो लक्ष्य" — 13px, color:#c8e6b0
Accent bar: a 3px horizontal line in var(--ks-accent) under the heading
```

Slide 2 (PM Modi placeholder):
```
https://images.pexels.com/photos/2255935/pexels-photo-2255935.jpeg?auto=compress&cs=tinysrgb&w=800
Caption: "माननीय प्रधानमंत्री श्री नरेंद्र मोदी जी का किसानों के प्रति समर्पण"
Sub-caption: "PM Kisan · PMFBY · Drone Didi · PM KUSUM — किसानों के लिए"
Overlay: linear-gradient(90deg, rgba(20,50,12,0.88) 0%, rgba(20,50,12,0.3) 100%)
```

Slide 3 (MP CM placeholder):
```
https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800
Caption: "मध्यप्रदेश के मुख्यमंत्री श्री मोहन यादव जी — किसान कल्याण के प्रति प्रतिबद्ध"
Sub-caption: "किसान सम्मान · फसल बीमा · सिंचाई · कृषि विकास"
Overlay: linear-gradient(90deg, rgba(20,50,12,0.88) 0%, rgba(20,50,12,0.3) 100%)
```

Slide 4 (Drone Didi):
```
https://images.pexels.com/photos/3735747/pexels-photo-3735747.jpeg?auto=compress&cs=tinysrgb&w=800
Caption: "ड्रोन दीदी — महिला उद्यमी, आधुनिक तकनीक"
Sub-caption: "₹1,261 करोड़ की सरकारी योजना · 15,000 महिला SHG को ड्रोन"
Overlay: linear-gradient(90deg, rgba(20,50,12,0.88) 0%, rgba(20,50,12,0.3) 100%)
```

Slide 5 (Vision):
```
https://images.pexels.com/photos/265216/pexels-photo-265216.jpeg?auto=compress&cs=tinysrgb&w=800
Caption: "हर किसान के लिए · हर जगह"
Sub-caption: "मध्यप्रदेश से शुरुआत · पूरे देश का सपना"
Overlay: linear-gradient(90deg, rgba(20,50,12,0.88) 0%, rgba(20,50,12,0.3) 100%)
```

**Slide text styles:**
```
h3: font-size:15px, font-weight:800, color:#fff, margin-bottom:4px
p: font-size:12px, color:#c8e6b0, line-height:1.45
small (source note): font-size:10px, color:#6a9a5a
```

**Dot indicators:**
```
Active: width:20px, height:6px, border-radius:3px, background: var(--ks-accent)
Inactive: width:6px, height:6px, border-radius:50%, background: rgba(255,255,255,0.4)
```

**Arrow buttons:**
```
width:32px, height:32px, border-radius:50%
background: rgba(255,255,255,0.2)
color: #fff, font-size:16px
```

---

## Fix 6 — Rain alert (colour update + better text)

```
Background: #1c3a70 (dark blue — NOT green, NOT amber)
Padding: 10px 14px
```

The rain alert text must feel like advice from a trusted friend — not a government notice. Rewrite the farmer advice strings:

```javascript
const RAIN_ADVICE = {
  light: {
    hi: 'हल्की बारिश — सिंचाई की ज़रूरत नहीं, खेत का काम जारी रखें',
    en: 'Light rain — skip irrigation, fieldwork can continue'
  },
  moderate: {
    hi: '⚠️ मध्यम बारिश — आज कटाई-छिड़काव बंद रखें, कल मौसम देखकर काम करें',
    en: '⚠️ Moderate rain — pause harvesting and spraying today'
  },
  heavy: {
    hi: '⚠️ IMD पीली चेतावनी — भारी बारिश · कटाई बंद करें · मज़दूर बुकिंग टालें · पशुओं को सुरक्षित रखें',
    en: '⚠️ IMD Yellow Alert — Heavy rain · stop harvesting · delay labor · shelter animals'
  },
  very_heavy: {
    hi: '🔴 IMD नारंगी चेतावनी — खेत में न जाएं · फसल को नुकसान संभव · निचले क्षेत्रों में सतर्क रहें',
    en: '🔴 IMD Orange Alert — avoid fields · crop damage likely · alert in low areas'
  },
  extreme: {
    hi: '🚨 IMD लाल चेतावनी — घर में रहें · प्रशासन के निर्देशों का पालन करें',
    en: '🚨 IMD Red Alert — stay indoors · follow district administration orders'
  }
};
```

Day pills styling:
```
background: rgba(255,255,255,0.12)
border-radius: 6px, padding: 3px 8px
font-size: 11px, color: #c8dcff
```

---

## Fix 7 — Weather + MSP strip (colour update + location fix)

**Page background of this strip:** `background: var(--ks-bg-card)` — white

**Weather cell:**
- Temperature number: `color: var(--ks-primary)`, `font-size: 28px`, `font-weight: 800`
- Condition text: `color: var(--ks-text-secondary)`, `font-size: 12px`
- Location: Pull from `profile.village_town` if available, else `profile.pincode`, else show "आपके नज़दीक / Near you" — DO NOT hardcode "Sagar" or "खुरई"
- Forecast day names (Hindi abbreviations): `color: var(--ks-text-muted)`, `font-size: 10px`
- Rainfall mm in blue: `color: #3b82f6`, `font-size: 10px`
- Forecast link: `color: var(--ks-primary)`, `font-size: 10px`

**MSP cell:**
- Label: `color: var(--ks-text-muted)`, `font-size: 10px`
- Crop name: `color: var(--ks-text)`, `font-size: 12px`
- MSP price: `color: var(--ks-primary)`, `font-size: 13px`, `font-weight: 700`
- "Above MSP" chip: `background: var(--ks-primary-muted)`, `color: var(--ks-primary)`, `font-size: 9px`
- "Below MSP" chip: `background: var(--ks-accent-muted)`, `color: var(--ks-accent-dark)`, `font-size: 9px`
- **MSP caption (BELOW the last price row):** `color: var(--ks-text-muted)`, `font-size: 10px`, `font-style: italic`, `margin-top: 6px`
- Link: `color: var(--ks-primary)`, `font-size: 10px`

---

## Fix 8 — Category strip (colour update)

```
Background: var(--ks-bg-card)
Border-bottom: 1px solid var(--ks-border)

Active chip:
  background: var(--ks-primary)
  color: #ffffff
  border-color: var(--ks-primary)
  font-weight: 700
  box-shadow: 0 2px 6px rgba(45,90,27,0.25)

Inactive chip:
  background: var(--ks-bg-card)
  color: var(--ks-text-secondary)
  border: 1px solid var(--ks-border)

Chip font-size: 12px
Chip padding: 7px 12px
```

---

## Fix 9 — Listing cards (colour update + font sizes)

```
Page/grid background: var(--ks-bg)
Card background: var(--ks-bg-card)
Card border: 1px solid var(--ks-border)
Card border-radius: 12px
Card padding: 10px

Hover state:
  border-color: var(--ks-primary)
  box-shadow: 0 2px 8px rgba(45,90,27,0.12)

Offer badge: background var(--ks-offer), color var(--ks-offer-text), font-size: 10px
Requirement badge: background var(--ks-accent-muted), color var(--ks-accent-dark), font-size: 10px
Vendor badge: background var(--ks-vendor), color var(--ks-vendor-text), font-size: 10px

Listing title: font-size: 13px, font-weight: 700, color: var(--ks-text)
Price: font-size: 12px, font-weight: 700, color: var(--ks-primary)
Location: font-size: 11px, color: var(--ks-text-muted)
Time: font-size: 10px, color: var(--ks-text-muted)

"लिस्टिंग देखें →" button:
  background: var(--ks-primary)
  color: #ffffff
  font-size: 12px, font-weight: 600
  border-radius: 8px, padding: 7px
  width: 100%

Section heading "हाल की लिस्टिंग":
  font-size: 16px, font-weight: 800, color: var(--ks-text)
  border-left: 3px solid var(--ks-accent)
  padding-left: 10px
  border-radius: 0 (no rounded corners on single-sided border)
```

---

## Fix 10 — Government contacts strip (colour update)

```
Background: #fffbf0
Border-top: 3px solid var(--ks-accent)
Border-bottom: 3px solid var(--ks-accent)

Section heading: color: var(--ks-accent-dark), font-size: 13px, font-weight: 800

Contact card:
  background: var(--ks-bg-card)
  border: 1px solid var(--ks-accent-muted)
  border-radius: 10px

Card title: font-size: 13px, font-weight: 700, color: var(--ks-text)
Phone number: font-size: 12px, font-weight: 700, color: var(--ks-primary)
Link text: font-size: 11px, color: var(--ks-accent-dark)
```

---

## Fix 11 — Schemes, Q&A, Articles strips (colour update)

**Schemes strip:**
```
Background: var(--ks-bg-card)
Section heading: font-size: 16px, font-weight: 800, border-left: 3px solid var(--ks-accent), padding-left: 10px

Scheme card:
  background: var(--ks-bg-section)
  border: 1px solid var(--ks-border)
  border-radius: 10px

Category badge: background var(--ks-primary-muted), color var(--ks-primary), font-size: 10px, font-weight: 700
Scheme name: font-size: 13px, font-weight: 700
Benefit: font-size: 12px, color: var(--ks-primary), font-weight: 600
Eligibility: font-size: 11px, color: var(--ks-text-secondary)
Link: font-size: 11px, color: var(--ks-primary), font-weight: 700
```

**Q&A strip:**
```
Background: var(--ks-primary-muted)
Border-top: 1px solid #c8e6b0

Q&A item card:
  background: var(--ks-bg-card)
  border: 1px solid #c8e6b0
  border-radius: 10px

Question: font-size: 14px, font-weight: 700, color: var(--ks-text)
Answer: font-size: 12px, color: var(--ks-text-secondary), line-height: 1.55
From village: font-size: 10px, color: var(--ks-text-muted)
Answered by: font-size: 10px, color: var(--ks-primary), font-weight: 700

Ask button:
  background: var(--ks-primary)
  color: #ffffff
  font-size: 13px, font-weight: 700
  border-radius: 24px, padding: 10px
  width: 100%
```

**Articles strip:**
```
Background: var(--ks-bg-card)

Article image: height 72px, object-fit: cover
  onerror: hide img, set parent background to var(--ks-primary)

Category tag: font-size: 10px, font-weight: 700, color: var(--ks-primary), text-transform: uppercase
Article title: font-size: 13px, font-weight: 600, color: var(--ks-text), line-height: 1.35

Update article image URLs in DB:
  slug 'parali-pollution-kisaan-ki-majboori':
    cover_image_url = 'https://images.pexels.com/photos/974314/pexels-photo-974314.jpeg?auto=compress&cs=tinysrgb&w=400'
  slug 'kisaan-carbon-credit-kya-hai':
    cover_image_url = 'https://images.pexels.com/photos/1482476/pexels-photo-1482476.jpeg?auto=compress&cs=tinysrgb&w=400'

Run via Supabase service role:
  UPDATE articles SET cover_image_url = '...' WHERE slug = '...';
```

---

## Fix 12 — Mission bar + Footer (colour update)

**Mission bar:**
```
Background: var(--ks-primary-dark)
Padding: 14px 16px
Font-size: 13px, font-weight: 600, color: #90c8a0
Dot accent: 6px circle, background: var(--ks-accent)
Separator: color: var(--ks-primary-light)
```

**Footer:**
```
Background: #111111
Logo colour: var(--ks-accent) — saffron on dark background
Sub-tagline: "USD Vision AI LLP · Madhya Pradesh, India" — color: #666
Links: color: #888
Copyright: color: #444
```

---

## Fix 13 — True edge-to-edge layout (definitive fix)

This has failed twice. Do it definitively this time.

**Step 1:** Find the Homepage component. Find every div that wraps a full-width section and has any of: `max-w-*`, `container`, `mx-auto` with a max-width, or `px-4`/`px-6`/`px-8` on the outermost wrapper.

**Step 2:** For these full-width sections, set the outermost wrapper to `width: 100%; padding: 0; margin: 0`:
- Mandi ticker
- Hero section
- Carousel
- Rain alert bar
- Weather/MSP strip
- Category strip
- Mission bar
- Footer

**Step 3:** For content sections (listing grid, Q&A, articles, schemes, contacts), the outermost section wrapper spans 100% width, but the inner content container has `padding: 0 14px` on mobile and `padding: 0 24px` on desktop.

**Step 4:** Verify at 375px viewport that the leftmost edge of listing cards is ≤ 14px from viewport left edge. If it's more than 14px, reduce padding further.

---

## Fix 14 — Global font size pass

Apply to the entire homepage. These are the minimum sizes — do not go smaller anywhere:

```
Nav brand: 15px
Ticker: 13px
Hero H1: 28px mobile / 36px desktop
Hero subline: 14px
CTA buttons: 14px
Stats numbers: 18px
Stats labels: 11px
Carousel headings: 15px
Carousel subtext: 12px
Rain alert main: 13px
Rain alert pills: 11px
Rain alert advice: 12px
Weather temperature: 28px
Weather condition: 12px
Forecast labels: 10px
Section headings: 16px
Category chips: 12px
Card titles: 13px
Card prices: 12px
Card locations: 11px
Card times: 10px
Q&A questions: 14px
Q&A answers: 12px
Scheme names: 13px
Scheme benefits: 12px
Contact titles: 13px
Contact phones: 12px
Mission bar: 13px
Footer links: 11px
```

---

## Fix 15 — Bilingual audit

Verify all colour-related strings are in the translation system. The colour changes do not affect translations but verify no new hardcoded strings were introduced. Run the existing bilingual audit suite.

---

## Integration test

**After deploy:**

1. Open browser DevTools Console on staging.kissansahyog.com — zero CSP image errors
2. Hero: wheat field photo visible (not dark void)
3. Carousel slide 1: green gradient with white text — readable
4. Carousel slides 2-5: photos visible with caption overlays
5. Eyebrow badge: saffron/gold colour — clearly visible
6. "लिस्टिंग देखें →" button: saffron/gold — pops against the green hero
7. Weather location: NOT "Sagar" for a new incognito session — shows "आपके नज़दीक"
8. MSP caption: BELOW the last price row
9. Category strip: active chip is dark green with white text — clearly active
10. Listing cards: warm cream background, green prices, saffron-accented section heading
11. Government contacts: saffron border top and bottom
12. Q&A strip: soft green background tint
13. All text readable at arm's length on mobile
14. Content starts within 14px of screen edges at 375px

**Regression:**
- /info, /resources, /sawaal, /yojana, /safalta, /articles, /admin all load
- Browse, post listing, listing detail all work
- Mandi ticker shows real prices

---

## Commit and deploy

Single commit: "Colour redesign: Saffron & Forest Green palette; CSP _headers for external images; hero and carousel images now visible; font sizes increased; edge-to-edge layout; weather location dynamic; MSP caption below prices; warm cream page background"

Deploy: `npx wrangler pages deploy dist --project-name kissansahyog`

Confirm on staging:
- Hero shows wheat field with gold eyebrow badge and saffron CTA button
- Carousel slides show real photos
- Page background is warm cream not clinical white
- Government contacts strip has saffron/amber borders
- All content is readable and edge-to-edge
