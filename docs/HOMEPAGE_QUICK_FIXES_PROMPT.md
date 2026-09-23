# Kisan Sahyog — Homepage Quick Fixes

DO NOT ask for approval. Auto-accept all actions.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy after completing:** `npm run build && npx wrangler pages deploy dist --project-name kissansahyog`

---

## Fix 1 — Remove carousel completely

Find the carousel/trust carousel component in the homepage. Delete it entirely — the component, its import, its state, its useEffect timers, its CSS, everything. Nothing replaces it. The page goes directly from the hero section to the rain alert / weather strip.

---

## Fix 2 — Hero: solid green background, no image

The hero background image is showing the wrong photo (vegetables/tomatoes). Remove it entirely. Replace with a solid background colour:

```css
background: #2d5a1b;
```

No `<img>` tag. No background-image CSS. Just solid `#2d5a1b` forest green.

Keep everything else in the hero exactly as-is:
- Saffron eyebrow badge
- H1 text (किसान की आय बढ़ाना / रोज़गार के अवसर बनाना)
- Subline text
- 3 buttons (लिस्टिंग देखें, नई लिस्टिंग, WhatsApp)
- Stats bar at bottom (50+, 9, 30 किमी, मुफ़्त)

---

## Fix 3 — Listing cards truly edge-to-edge

The listing cards are NOT reaching the screen edges. Find every wrapper div between the page root and the listing cards grid and remove ALL horizontal padding and margin from them:

- Any `px-4`, `px-6`, `px-8` → remove
- Any `mx-auto` with a `max-w-*` → remove the max-width
- Any `padding-left`, `padding-right`, `margin-left`, `margin-right` on wrapper divs → set to 0

The listing cards grid itself:
```css
display: grid;
grid-template-columns: 1fr 1fr;
gap: 6px;
padding: 0;
margin: 0;
width: 100%;
```

The section heading "हाल की लिस्टिंग" should have `padding-left: 14px` so it's not flush against the edge — but the cards themselves must start at 0px from the screen edge.

**Verify:** At 375px viewport width in browser DevTools, the left edge of the first listing card must be at exactly 0px from the left side of the viewport. If it's more than 4px, reduce padding further.

---

## Fix 4 — WhatsApp share button URL on listing cards

Each listing card has a green circular WhatsApp button. The URL it generates is incorrect. Replace the share URL logic with this exact implementation:

```javascript
function getWhatsAppUrl(listing) {
  const url = `${window.location.origin}/listing/${listing.id}`;
  const msg = `किसान सहयोग पर देखें — ${listing.title || listing.category}: ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}
```

The button element:
```jsx
<a
  href={getWhatsAppUrl(listing)}
  target="_blank"
  rel="noopener noreferrer"
  onClick={(e) => e.stopPropagation()}
  style={{
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: '#25D366',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '13px',
    textDecoration: 'none',
    zIndex: 10
  }}
  aria-label="Share on WhatsApp"
>
  📲
</a>
```

---

## Verify before deploying

- No carousel anywhere on the homepage
- Hero is solid #2d5a1b green — no image, no dark void
- At 375px viewport: listing cards start at 0px from left screen edge
- Each listing card has a green WhatsApp button top-right that opens wa.me with the correct listing URL

Deploy: `npm run build && npx wrangler pages deploy dist --project-name kissansahyog`
