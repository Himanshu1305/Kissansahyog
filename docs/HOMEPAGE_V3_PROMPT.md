# Kisan Sahyog — Homepage V3 Redesign Prompt

DO NOT ask for approval. Auto-accept all actions. Read PROJECT_CONTEXT.md before starting. Update PROJECT_CONTEXT.md after completing.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy after completing:** `npm run build && npx wrangler pages deploy dist --project-name kissansahyog`

---

## Context

This is a complete homepage redesign. The current homepage has:
- A hero that is just 3 buttons floating on a green strip with no headline visible
- Full-width listing cards on desktop that look stretched and wrong
- A WhatsApp button that shows an image/logo instead of a clean icon
- Content that does not go full bleed on desktop

This prompt replaces the entire Homepage.jsx layout with the approved design below.

---

## Design tokens (already in index.css — do not redefine, just use)

```
--ks-primary: #2d5a1b
--ks-primary-dark: #1e3d12
--ks-primary-light: #3d7a25
--ks-primary-muted: #e8f5e0
--ks-accent: #f59e0b
--ks-accent-dark: #d97706
--ks-accent-muted: #fef3c7
--ks-bg: #faf8f2
--ks-bg-card: #ffffff
--ks-border: #e8e0d0
--ks-border-light: #f0ece0
--ks-text: #1a1a1a
--ks-text-secondary: #555
--ks-text-muted: #888
--ks-whatsapp: #25D366
```

---

## Layout rule — FULL BLEED EVERYWHERE

Every section on the homepage spans 100% of the viewport width on all screen sizes — mobile AND desktop. No `max-width` containers anywhere on the homepage. No `mx-auto`. No centering wrapper divs.

On desktop, content inside sections uses `padding-left: 40px; padding-right: 40px` to keep text readable — but the section background itself always goes edge to edge.

On mobile (≤640px), content padding is `padding-left: 14px; padding-right: 14px`.

Apply this consistently: ticker, hero, rain alert, info band, category strip, listings section, govt contacts, schemes, Q&A, articles, mission bar, footer — ALL full bleed.

---

## Section 1 — Nav (unchanged from current — keep exactly as-is)

---

## Section 2 — Mandi ticker (unchanged — keep exactly as-is)

---

## Section 3 — Hero (redesigned — 2-column on desktop, stacked on mobile)

```
Background: var(--ks-primary)
Padding: 40px 40px 0 on desktop, 24px 14px 0 on mobile
```

### Desktop layout (≥768px): CSS Grid, 2 equal columns, gap 48px, align-items center

**Left column:**
```
Eyebrow badge:
  background: var(--ks-accent)
  color: var(--ks-accent-dark)
  font-size: 12px, font-weight: 800
  padding: 4px 14px, border-radius: 20px
  margin-bottom: 16px
  display: inline-block
  Text: "🌾 किसानों का अपना डिजिटल मंच" / "Farmers' Own Digital Platform"

H1:
  font-size: 40px on desktop, 28px on mobile
  font-weight: 900
  color: #ffffff
  line-height: 1.15
  margin-bottom: 12px
  Text (2 lines): "किसान की आय बढ़ाना" / "रोज़गार के अवसर बनाना"

Subline:
  font-size: 15px
  color: #a8d4b8
  line-height: 1.65
  margin-bottom: 28px
  Text: "ज़मीन · उपकरण · मज़दूर · ड्रोन दीदी · गोदाम · कृषि सामग्री"
        "सीधा संपर्क · बिना बिचौलिए · बिल्कुल मुफ़्त"

Buttons (flex row, gap: 10px, flex-wrap: wrap):
  Button 1 "लिस्टिंग देखें →": background var(--ks-accent), color var(--ks-accent-dark), font-weight 800, padding 12px 24px, border-radius 24px, font-size 15px, border none
  Button 2 "+ नई लिस्टिंग": background rgba(255,255,255,0.15), color #fff, border 1.5px solid rgba(255,255,255,0.3), padding 12px 22px, border-radius 24px, font-size 15px
  Button 3 WhatsApp: background var(--ks-whatsapp), color #fff, padding 12px 20px, border-radius 24px, font-size 15px, border none
    WhatsApp button content: SVG icon + text "WhatsApp"
    SVG icon (inline, no img tag, no external URL):
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px;margin-right:6px">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.12.554 4.112 1.522 5.836L.057 23.854a.5.5 0 00.609.61l6.249-1.676A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.712 9.712 0 01-4.953-1.354l-.355-.211-3.679.988.938-3.58-.231-.368A9.712 9.712 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
    </svg>
    Text after SVG: "WhatsApp पर शेयर करें" / "Share on WhatsApp"
    href: https://wa.me/?text={encodeURIComponent("किसान सहयोग — kissansahyog.com")}
    target: _blank
```

**Right column (desktop only, hidden on mobile):**
A 2x2 grid of info cards showing live data from the existing hooks:

```
Card 1 — Weather:
  Label: "🌤️ मौसम / Weather"
  Value: current temperature from weather_cache
  Sub: condition + "आपके नज़दीक / Near you"

Card 2 — MSP Wheat:
  Label: "📋 MSP गेहूं 2026-27"
  Value: ₹2,585 (from msp_prices table)
  Sub: compare with mandi price — "मंडी ₹X · MSP से नीचे/ऊपर"

Card 3 — Rain:
  Label: "🌧️ बारिश"
  Value: from weather_cache forecast — "X दिन" if rain_alert_48h else "साफ मौसम"
  Sub: "कल ~Xमिमी · परसों ~Xमिमी" or "अगले 5 दिन बारिश नहीं"

Card 4 — Listings:
  Label: "📊 लिस्टिंग"
  Value: "50+" (or real count from listings table)
  Sub: "30 किमी दायरे में · मुफ़्त"

Each info card style:
  background: rgba(255,255,255,0.1)
  border: 1px solid rgba(255,255,255,0.15)
  border-radius: 12px
  padding: 16px
  Label: font-size 11px, color #90c8a0, text-transform uppercase, letter-spacing 0.4px, margin-bottom 6px
  Value: font-size 24px, font-weight 800, color #ffffff, margin-bottom 3px
  Sub: font-size 12px, color #a8d4b8
```

### Stats bar (below the hero grid, full width of hero):
```
background: rgba(0,0,0,0.2)
border-top: 1px solid rgba(255,255,255,0.1)
display: flex, 5 equal columns
padding: 0 40px on desktop, 0 on mobile

Columns: 50+ लिस्टिंग | 9 सेवाएं | 30 किमी दायरा | मुफ़्त बिल्कुल | MP पायलट क्षेत्र
Number: font-size 18px, font-weight 800, color var(--ks-accent), margin-bottom 2px
Label: font-size 11px, color #90c8a0
Each cell padding: 12px 0
Borders between cells: 1px solid rgba(255,255,255,0.1)
```

---

## Section 4 — Rain alert (unchanged — keep exactly as-is)

---

## Section 5 — Category strip (unchanged — keep exactly as-is)

---

## Section 6 — Listings (full bleed, 3 columns on desktop, 2 on mobile)

```
Section wrapper: width 100%, background var(--ks-bg), padding: 24px 40px on desktop, 16px 14px on mobile

Section heading row (flex, justify-content space-between, margin-bottom 16px):
  Left: "हाल की लिस्टिंग / Recent Listings" — font-size 20px, font-weight 800, color var(--ks-text), border-left 3px solid var(--ks-accent), padding-left 10px, border-radius 0
  Right: "सभी देखें → / View All →" — font-size 13px, color var(--ks-primary), font-weight 600

Grid: 3 columns on desktop (≥768px), 2 columns on mobile
  grid-template-columns: repeat(3, 1fr) on desktop
  grid-template-columns: repeat(2, 1fr) on mobile
  gap: 12px
```

### Each listing card:

```
background: var(--ks-bg-card)
border: 1px solid var(--ks-border)
border-radius: 12px
overflow: hidden
transition: border-color 0.15s
On hover: border-color var(--ks-primary)

Card body (padding 12px):
  Badge row (flex, gap 4px, margin-bottom 6px):
    Offer badge: background var(--ks-primary-muted), color var(--ks-primary-dark), font-size 10px, font-weight 700, padding 2px 7px, border-radius 6px
    Requirement badge: background var(--ks-accent-muted), color var(--ks-accent-dark), font-size 10px, font-weight 700, padding 2px 7px, border-radius 6px
    Vendor badge (if listing_source = vendor): background #fff7ed, color #7c2d12, font-size 10px, font-weight 700, padding 2px 7px, border-radius 6px

  Title: font-size 14px, font-weight 700, color var(--ks-text), margin-bottom 4px, line-height 1.3
  Price: font-size 13px, font-weight 700, color var(--ks-primary), margin-bottom 4px
  Location: font-size 11px, color var(--ks-text-muted), display flex, align-items center, gap 3px
  Time posted: font-size 10px, color #bbb, margin-top 3px

Card footer (padding 8px 12px, border-top 1px solid var(--ks-border-light), display flex, gap 6px, align-items center):
  "लिस्टिंग देखें →" button:
    flex: 1
    background: var(--ks-primary)
    color: #ffffff
    border: none
    border-radius: 8px
    padding: 8px
    font-size: 12px
    font-weight: 600
    cursor: pointer

  WhatsApp button (NO IMG TAG — use inline SVG or text only):
    width: 34px, height: 34px
    background: var(--ks-whatsapp)
    border: none
    border-radius: 8px
    display: flex, align-items center, justify-content center
    cursor: pointer
    flex-shrink: 0
    href: https://wa.me/?text={encodeURIComponent(`किसान सहयोग पर देखें — ${listing.title||listing.category}: ${window.location.origin}/listing/${listing.id}`)}
    target: _blank
    Content: inline SVG WhatsApp icon (white, 16x16) — same SVG path as in Section 3 above but smaller
    DO NOT use <img> tag, DO NOT use an external image URL, DO NOT use background-image
```

---

## Section 7 — Weather + MSP (2 columns, full bleed)

```
Section wrapper: width 100%, background var(--ks-bg-card), padding 24px 40px on desktop, 16px 14px on mobile, border-top 1px solid var(--ks-border), border-bottom 1px solid var(--ks-border)

Grid: 2 equal columns on desktop, 1 column on mobile, gap 24px
```

**Left — Weather card:**
```
background: var(--ks-bg-card)
border: 1px solid var(--ks-border)
border-radius: 12px
padding: 18px

Label: "🌤️ मौसम / Weather" — 10px uppercase
Temperature: 32px, font-weight 800, color var(--ks-primary)
Condition: 13px, color var(--ks-text-secondary)
Location: "📍 आपके नज़दीक / Near you" — dynamic from profile, 11px, color var(--ks-text-muted)
5-day forecast row (flex, gap 12px, margin-top 12px):
  Each day: day name (Hindi abbrev) + icon emoji + rainfall mm in blue (#3b82f6) or "—"
Link: "5 दिन का पूर्वानुमान → /info#weather"
```

**Right — MSP card:**
```
background: var(--ks-bg-card)
border: 1px solid var(--ks-border)
border-radius: 12px
padding: 18px

Label: "📋 MSP 2026-27" — 10px uppercase
4 rows (गेहूं, सोयाबीन, चना, मसूर): crop name left, price right in var(--ks-primary)
  Comparison chip (if mandi data available): amber "↓ MSP से नीचे" or green "↑ MSP से ऊपर"
  Each row separated by border-bottom 1px solid var(--ks-border-light)
Caption BELOW last row: "MSP = न्यूनतम समर्थन मूल्य, सरकारी गारंटी" — 10px, italic, var(--ks-text-muted)
Link: "पूरी सूची → /info#msp"
```

---

## Section 8 — Government contacts (full bleed, amber strip)

```
width: 100%
background: #fffbf0
border-top: 3px solid var(--ks-accent)
border-bottom: 3px solid var(--ks-accent)
padding: 20px 40px on desktop, 16px 14px on mobile

Heading: "🏛️ ज़रूरी सरकारी संपर्क" — font-size 14px, font-weight 800, color #7c3800, margin-bottom 14px

Cards: 3 columns on desktop (repeat(3, 1fr)), 1 column on mobile, gap 12px
  Each card: background #fff, border 1px solid #fde68a, border-radius 10px, padding 14px
  Icon: font-size 22px, margin-bottom 6px
  Title: font-size 13px, font-weight 700, color var(--ks-text), margin-bottom 4px
  Phone: font-size 14px, font-weight 700, color var(--ks-primary)
  Link: font-size 11px, color var(--ks-accent-dark), margin-top 5px, display block
```

---

## Section 9 — Schemes (full bleed, 4 columns)

```
width: 100%
background: var(--ks-bg)
padding: 24px 40px on desktop, 16px 14px on mobile

Heading row: "सरकारी योजनाएं / Government Schemes" + "सभी 8 → / All 8 →"

Grid: 4 columns on desktop, 2 columns on mobile, gap 12px

Each scheme card:
  background: var(--ks-bg-card)
  border: 1px solid var(--ks-border)
  border-radius: 12px
  padding: 14px
  Category badge: background var(--ks-primary-muted), color var(--ks-primary), font-size 9px, font-weight 700
  Name: font-size 14px, font-weight 700, margin-bottom 4px
  Benefit: font-size 12px, color var(--ks-primary), font-weight 600, margin-bottom 3px
  Eligibility: font-size 11px, color var(--ks-text-secondary), line-height 1.4
  Link: "कैसे आवेदन करें → / How to apply →" — font-size 11px, color var(--ks-primary), font-weight 700, margin-top 8px

Graceful empty state if no schemes in DB: show placeholder text, do not crash
```

---

## Section 10 — Kisan Sawaal Q&A (full bleed, green tint)

```
width: 100%
background: var(--ks-primary-muted)
border-top: 1px solid #c8e6b0
padding: 24px 40px on desktop, 16px 14px on mobile

Heading row: "किसान सवाल / Farmer Q&A" + "सभी सवाल → / All Questions →"

Show 2 featured Q&As (is_featured=true, is_published=true) in a 2-column grid on desktop, 1 column on mobile

Each Q&A card:
  background: var(--ks-bg-card)
  border: 1px solid #c8e6b0
  border-radius: 12px
  padding: 14px
  Question: font-size 14px, font-weight 700, color var(--ks-text), margin-bottom 8px, line-height 1.35
  Answer: font-size 12px, color var(--ks-text-secondary), line-height 1.6
  Meta row (flex, justify-content space-between, margin-top 8px):
    Village: font-size 10px, color var(--ks-text-muted)
    "Team Kisan Sahyog": font-size 10px, color var(--ks-primary), font-weight 700

Ask button (below the Q&A grid):
  width: 100%
  background: var(--ks-primary)
  color: #ffffff
  border: none
  border-radius: 24px
  padding: 12px
  font-size: 14px
  font-weight: 700
  cursor: pointer
  margin-top: 14px
  Text: "+ अपना सवाल पूछें / + Ask Your Question"

Graceful empty state if no featured Q&As: show only the ask button with message "कोई सवाल पूछें — हम जवाब देंगे"
```

---

## Section 11 — Articles (full bleed, 2 columns)

```
width: 100%
background: var(--ks-bg-card)
border-top: 1px solid var(--ks-border)
padding: 24px 40px on desktop, 16px 14px on mobile

Heading row: "किसान लेख / Articles" + "सभी लेख → / All Articles →"

Grid: 2 columns, gap 12px

Each article card:
  background: var(--ks-bg-card)
  border: 1px solid var(--ks-border)
  border-radius: 12px
  overflow: hidden

  Image area (height 90px):
    If article.cover_image_url exists: <img src={url} crossOrigin="anonymous" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{e.target.style.display='none'}} />
    If no image or image fails: background var(--ks-primary), display flex, align-items center, justify-content center, show category emoji (🌾 for parali, 🌿 for carbon)

  Body (padding 12px):
    Tag: font-size 9px, font-weight 700, color var(--ks-primary), text-transform uppercase, letter-spacing 0.5px
    Title: font-size 14px, font-weight 600, color var(--ks-text), line-height 1.35, margin-top 4px
```

---

## Section 12 — Mission bar (unchanged — keep exactly as-is)

---

## Section 13 — Footer (full bleed)

```
width: 100%
background: #111111
padding: 24px 40px on desktop, 16px 14px on mobile
display: flex, justify-content space-between, align-items center, flex-wrap wrap, gap 16px

Left:
  Logo: "🌾 किसान सहयोग" — font-size 15px, font-weight 700, color var(--ks-accent)
  Sub: "USD Vision AI LLP · Madhya Pradesh, India" — font-size 11px, color #555
  Copyright: "© 2026 Kisan Sahyog | kissansahyog.com | सभी अधिकार सुरक्षित" — font-size 10px, color #444, margin-top 4px

Right (links row):
  Privacy Policy · Terms · Resources · Articles · Contact
  Each: font-size 11px, color #666, cursor pointer
```

---

## WhatsApp button — global rule

EVERY WhatsApp button on the homepage and listing cards must use an inline SVG icon — never an `<img>` tag, never a background-image URL, never an external image source. The SVG renders natively as white on the green button background.

Search the entire codebase for any `<img>` tag that has "whatsapp" in its src, alt, or className — replace every one with the inline SVG approach shown in Section 3.

Also search for any CSS that sets `background-image` with a WhatsApp-related URL — replace with the inline SVG approach.

---

## Bilingual check

All section headings, button labels, badge text, empty state messages must have both Hindi and English versions going through the existing i18n system. No new hardcoded single-language strings.

---

## Test checklist

- Desktop (1280px): hero shows 2 columns — left has H1 and buttons, right has 4 info cards
- Desktop: listings show in 3-column grid
- Desktop: all sections are full bleed — no content centred with side margins
- Desktop: content padding is 40px on left and right inside full-bleed sections
- Mobile (375px): hero stacks — left column (H1, buttons) visible, right column hidden
- Mobile: listings show in 2-column grid
- Mobile: content padding is 14px on left and right
- WhatsApp buttons everywhere: green background, SVG icon, NO img tag, correct wa.me URL with listing details
- No console errors
- All existing pages (/info, /resources, /sawaal, /yojana, /safalta, /admin) still load

Deploy: `npm run build && npx wrangler pages deploy dist --project-name kissansahyog`
