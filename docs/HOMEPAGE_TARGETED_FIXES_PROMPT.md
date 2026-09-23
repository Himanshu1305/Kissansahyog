# Kisan Sahyog — Homepage Targeted Fixes

DO NOT ask for approval. Auto-accept all actions.

**Deploy after completing:** `npm run build && npx wrangler pages deploy dist --project-name kissansahyog`

---

## Fix 1 — Remove the weather/MSP section below listings

The homepage currently shows weather in TWO places:
1. In the hero right column (info cards) — KEEP THIS
2. As a separate section below the listings grid — REMOVE THIS ENTIRELY

Delete the entire weather+MSP section (Section 7 in Homepage.jsx) that appears below the listings grid. It should not exist on the homepage at all. Weather and MSP data is already shown in the hero info cards. If a user wants the full detail they go to /info.

After removing: listings → government contacts → schemes → Q&A → articles → mission bar → footer.

---

## Fix 2 — Hero height and visibility

The hero section is too short — the H1 headline is not visible on screen. The stats bar at the bottom of the hero is showing at the very top of the viewport, which means the hero content above it is being cut off or has zero height.

Fix:
```
Hero section minimum height: 320px on desktop, 260px on mobile
Hero padding-top: 48px on desktop, 32px on mobile
Hero padding-bottom: 0 (stats bar is pinned to bottom)
```

The hero grid (2 columns on desktop) must have `align-items: center` so both columns are vertically centred within the hero height.

The H1 must be fully visible without scrolling on both desktop and mobile.

---

## Fix 3 — Font sizes: increase everything

Current font sizes are too small. Apply these minimums across the entire homepage:

**Hero:**
- H1: 42px desktop, 30px mobile, font-weight 900
- Eyebrow badge: 13px
- Subline: 16px desktop, 14px mobile
- CTA buttons: 15px, padding 13px 24px
- Stats bar numbers: 20px
- Stats bar labels: 12px
- Hero info card value: 26px
- Hero info card label: 12px
- Hero info card sub: 13px

**Mandi ticker:**
- Items: 14px
- Label: 13px

**Rain alert:**
- Main text: 14px
- Pills: 12px
- Advice: 13px

**Category strip chips:**
- Text: 13px
- Padding: 10px 14px

**Section headings ("हाल की लिस्टिंग" etc.):**
- Font-size: 20px, font-weight 800

**Listing cards:**
- Badge text: 11px
- Title: 15px, font-weight 700
- Price: 14px, font-weight 700
- Location: 12px
- Time: 11px
- "लिस्टिंग देखें →" button: 13px

**Government contacts:**
- Card title: 14px
- Phone: 15px, font-weight 700
- Link: 12px

**Scheme cards:**
- Name: 14px
- Benefit: 13px
- Eligibility: 12px

**Q&A:**
- Question: 15px, font-weight 700
- Answer: 13px
- Meta: 11px
- Ask button: 14px

**Articles:**
- Title: 14px
- Tag: 11px

**Mission bar:**
- Text: 14px

**Footer:**
- Logo: 16px
- Links: 12px
- Copyright: 11px

---

## Fix 4 — Weather location

In the weather info card in the hero AND anywhere else weather location is displayed, replace hardcoded "Sagar" with:

```javascript
const locationLabel = profile?.village_town || profile?.district || (language === 'hi' ? 'आपके नज़दीक' : 'Near you');
```

For unauthenticated users or users without profile data: show "आपके नज़दीक / Near you".

Never show "Sagar" as the weather location — that is hardcoded and wrong.

---

## Fix 5 — WhatsApp button on listing cards

The WhatsApp button on listing cards is currently showing a WhatsApp logo image. Verify it is using the inline SVG approach (no img tag). If it is still showing an image, replace with:

```jsx
<a
  href={`https://wa.me/?text=${encodeURIComponent(`किसान सहयोग पर देखें: ${window.location.origin}/listing/${listing.id}`)}`}
  target="_blank"
  rel="noopener noreferrer"
  onClick={e => e.stopPropagation()}
  style={{width:34,height:34,background:'#25D366',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,minHeight:34}}
  aria-label="Share on WhatsApp"
>
  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.12.554 4.112 1.522 5.836L.057 23.854a.5.5 0 00.609.61l6.249-1.676A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.712 9.712 0 01-4.953-1.354l-.355-.211-3.679.988.938-3.58-.231-.368A9.712 9.712 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
  </svg>
</a>
```

---

## Verify before deploying

- Hero H1 "किसान की आय बढ़ाना / रोज़गार के अवसर बनाना" is fully visible on screen without scrolling on desktop
- Weather appears ONLY ONCE — in the hero info cards — not again below the listings
- All text is noticeably larger than before
- Weather location shows "आपके नज़दीक" not "Sagar" for a logged-out user
- WhatsApp buttons show SVG icon, not an image

Deploy: `npm run build && npx wrangler pages deploy dist --project-name kissansahyog`
