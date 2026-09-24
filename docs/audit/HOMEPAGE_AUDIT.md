# Kisan Sahyog — Homepage Visual Audit

**URL:** https://staging.kissansahyog.com
**Date:** 2026-09-24
**Viewports:** 375×812 (mobile) · 1280×800 (desktop)
**Method:** Playwright full-page screenshots, sliced and inspected section by section. Zero JS console errors at both sizes. No code was changed.

**Screenshots:**
- `docs/audit/home-mobile-full.png` (375px, page 4323px tall) · `home-mobile-fold.png`
- `docs/audit/home-desktop-full.png` (1280px, page 2878px tall) · `home-desktop-fold.png`
- Section slices in `docs/audit/slices/` (`mobile-00..06`, `desktop-00..04`)

---

## Problems (most to least serious)

### P1 — Desktop nav overflows the viewport → horizontal scrollbar  *(desktop)*
Measured page `scrollWidth = 1333px` at a 1280px viewport. The offending element is the nav's right cluster (`.ml-auto flex … md:ml-0`) plus the लॉगिन/जुड़ें buttons, whose right edge sits at 1333px. The full category row (उपकरण · कृषि सहयोगी · ड्रोन दीदी · भूसा/पराली · कृषि सामग्री · गोदाम · विशेषज्ञ · ज़मीन · लेख · जानकारी · उपयोगी संपर्क · समुदाय) + language toggle + login + signup do not fit on one line and push ~53px past the edge.
**Farmer experience (desktop):** a stray horizontal scrollbar; the whole page can be nudged sideways, and the "जुड़ें" button can sit half-off the right edge. Looks buggy.

### P2 — Government-contacts cards are mostly empty (excessive whitespace)  *(desktop + mobile)*
In the amber "ज़रूरी सरकारी संपर्क" strip, each card has the icon (🧪/🐄/🏛️) floating at the top, then a large dead gap, then title + phone + link clustered near the bottom. On desktop the cards are very tall with ~50% empty space; on mobile they're similarly airy.
**Farmer experience:** the section reads as unfinished/placeholder — lots of empty boxes with a phone number tucked in a corner. The three most useful helpline numbers don't feel important because they're drowning in whitespace.

### P3 — Carbon-credit article cover photo reads as a black block  *(desktop + mobile)*
The right article card ("क्या किसान कार्बन क्रेडिट से कमाई कर सकते हैं?") uses a very dark Pexels photo (`1482476`). It loads correctly (`naturalWidth: 400`) but is so dark it looks like a near-black rectangle with a faint shadow — indistinguishable from a broken/void image next to the bright green field photo on the left.
**Farmer experience:** one article looks inviting (green field), the one beside it looks like a broken or "coming soon" black box.

### P4 — Mandi ticker shows a ₹0 price for one commodity  *(mobile + desktop)*
The ticker cycles real prices (गेहूं ₹2,580, सोयाबीन ₹5,405/₹5,750, मक्का ₹1,930) but one entry renders as **"0/क्विंटल · Sagar APMC"** (captured in `mobile-00`). A ₹0 price is a data-quality problem surfacing on the very first thing a farmer sees. The strip is also labelled "आज के मंडी भाव" while carrying a "कल के / yesterday's" badge (acceptable fallback, but worth noting).
**Farmer experience:** "₹0 per quintal" looks broken and undermines trust in the price data at the top of the page.

### P5 — Uneven card heights leave dead space in the listings grid  *(mobile + desktop)*
Because grid rows stretch to the tallest card, a short card (e.g. a land *requirement* with only a size + no price, like "5–10 एकड़ · नहर") gets a large empty gap between "8 दिन पहले" and its footer button, to match a taller neighbour (e.g. "ट्रैक्टर · ₹800 प्रति एकड़"). Visible in `mobile-02` and `desktop-02`.
**Farmer experience:** some cards look half-empty/awkward; the grid feels ragged rather than tidy.

### P6 — "संपर्क देखने के लिए जुड़ें" footer button is oversized and unbalanced  *(mobile)*
On every logged-out card the join button is a wide pale-green block whose label wraps to two lines on mobile, making the footer tall; the 34px WhatsApp button beside it then looks small and off-balance (`mobile-01`, `mobile-02`).
**Farmer experience:** the card footer is dominated by a big soft-green box; the two actions (join vs. share) don't read as equally tappable.

### P7 — Scheme-card text is small and cramped on mobile  *(mobile)*
In the 2-column "सरकारी योजनाएं" grid (`mobile-04`), the eligibility line (12px) and benefit text are tight and hard to read at arm's length on a low-end phone, especially the long eligibility sentences truncated at "…".
**Farmer experience:** the scheme details are squeezed; an older farmer would struggle to read the eligibility line without zooming.

### P8 — Footer links are low-contrast and small  *(mobile + desktop)*
Footer nav links (गोपनीयता नीति · उपयोग की शर्तें · उपयोगी संपर्क · लेख · संपर्क) render in grey `#666` on `#111` at ~12px (`mobile-06`). The copyright line is even fainter (`#444`).
**Farmer experience:** the legal/contact links are barely visible against the dark footer.

### P9 — Article covers can flash as blank green blocks while scrolling on mobile  *(mobile)*
Article images use `loading="lazy"`; in the mobile full-page capture both covers appeared as solid dark-green rectangles before painting (they do load — confirmed `naturalWidth: 400`). On a slow rural connection a farmer scrolling quickly will briefly see two empty green boxes above the article titles.
**Farmer experience:** momentary "empty green boxes" before the photos appear; on very slow networks this window is longer.

---

## What looks good

- **Hero (both sizes):** the H1 "किसान की आय बढ़ाना / रोज़गार के अवसर बनाना" is large, bold, white, and fully visible above the fold. The gold eyebrow badge and the saffron "लिस्टिंग देखें →" CTA pop nicely against the forest-green background. Three clear actions.
- **Hero live info cards (desktop):** the 2×2 cards show real, useful data — मौसम 24° / बादल छाए / आपके नज़दीक, MSP गेहूं ₹2,585 with a "मंडी ₹2,580 · MSP से नीचे" comparison, बारिश "2 दिन" with per-day mm, and लिस्टिंग 50+. This is genuinely valuable at a glance.
- **Stats bar:** clean 5-column band (50+ · 9 · 30 किमी · मुफ़्त · MP) with saffron numbers — readable and reassuring.
- **Rain alert:** the blue strip with per-day pills (कल ~18मिमी · परसों ~27मिमी) and plain-language advice ("मध्यम बारिश — आज कटाई-छिड़काव बंद रखें…") is exactly the trusted-friend tone intended; clearly distinct from the green sections.
- **Listing cards:** clear green "दे रहे हैं" vs amber "चाहिए" badges, category emoji, price, 📍 location, and a clean inline-SVG WhatsApp icon (no logo image). Colour semantics are consistent.
- **Colour system:** the saffron + forest-green + warm-cream palette is applied consistently across every section; nothing feels like the old dark/institutional look.
- **Q&A section:** readable question/answer cards on the soft-green tint, with a prominent full-width "+ अपना सवाल पूछें" button. Good.
- **Schemes on desktop:** the 4-column layout is tidy and each card's benefit line in green is scannable.
- **Left article image + articles layout:** the parali article's green-field cover looks great; 2-column layout is clean.
- **Footer branding:** saffron "🌾 किसान सहयोग" wordmark on dark, with company + copyright — feels finished (aside from link contrast, P8).
- **Full-bleed layout works:** sections span edge to edge on both sizes; content padding is comfortable (40px desktop / 14px mobile). No stray centred/narrow blocks.
- **Zero console errors** at both viewports; all images that are meant to load do load.

---

## Quick-reference summary

| # | Severity | Section | Issue |
|---|----------|---------|-------|
| P1 | High | Nav (desktop) | Content overflows 1280 → horizontal scrollbar (page 1333px wide) |
| P2 | High | Govt contacts | Cards mostly empty; excessive whitespace, looks unfinished |
| P3 | Medium | Articles | Carbon article cover is near-black, reads as a broken block |
| P4 | Medium | Mandi ticker | One commodity shows ₹0/क्विंटल |
| P5 | Medium | Listings grid | Uneven card heights → dead space in short cards |
| P6 | Medium | Listing card footer | Oversized join button, unbalanced vs WhatsApp button (mobile) |
| P7 | Low | Schemes | Eligibility text small/cramped on mobile |
| P8 | Low | Footer | Links low-contrast (grey on near-black), small |
| P9 | Low | Articles | Covers flash as blank green while lazy-loading on mobile |
