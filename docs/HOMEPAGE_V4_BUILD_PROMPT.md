# Kisan Sahyog — Homepage v4 build (Direction B · Balanced)

DO NOT ask for approval or questions. Decide and proceed. Read PROJECT_CONTEXT.md and KNOWN_ISSUES.md first. Update PROJECT_CONTEXT.md at the end.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy only after Phase 7 passes:** `npm run build && npx wrangler pages deploy dist --project-name kissansahyog`

---

## Why this build is different

Six previous homepage prompts each patched a few things and broke others. This is ONE complete build: a design system first, real photographs downloaded and visually verified before any layout, every section built from shared components, and a screenshot self-review that you must actually look at before deploying. "Elements exist" is not "done". "Done" means the screenshots look like the reference.

**Reference:** a rendered concept, direction "B · Balanced", which the owner approved. Its qualities, in order of importance:
1. Photographs everywhere — a real farmer in the hero, a real photo on every category tile and every listing card. The page must look like farming within one second.
2. Warm, light, colourful. Cream page, white cards, green for the primary action, **orange for the second action**, saffron for alerts. Dark green only in the ticker and footer strips.
3. The hero is not a marketing banner: it says **आज किसान के लिए**, then shows today's weather, today's wheat price vs MSP, and today's one-line advice, then two giant actions.
4. Then it proves the marketplace is alive: **आपके आसपास — 30 किमी** with live counts, then listings with WhatsApp + Call.
5. Big type, big buttons, edge to edge.

---

## Phase 1 — Design system (before any layout)

### 1a. `src/styles/tokens.css`
```css
:root{
  --ks-bg:#FBFAF5; --ks-bg-soft:#F1F6E9; --ks-bg-warm:#FFF3DF;
  --ks-card:#FFFFFF; --ks-border:#E6E2D6; --ks-border-strong:#D8D2C2;
  --ks-green:#24733F; --ks-green-dark:#185A31; --ks-green-tint:#EAF3DE;
  --ks-orange:#E8731F; --ks-orange-dark:#B4520A; --ks-orange-tint:#FFE6D5;
  --ks-saffron:#E69A2D; --ks-saffron-tint:#FFF3DF;
  --ks-terracotta:#C96F4B;
  --ks-ink:#173323; --ks-ink-2:#3F4A38; --ks-ink-3:#5B6350;
  --ks-strip:#173F2A; --ks-strip-2:#12321F;
  --ks-blue:#1D4ED8; --ks-blue-tint:#E6F1FB;
  --ks-whatsapp:#25D366;
  --ks-radius:12px; --ks-radius-lg:16px;
  --ks-gutter:12px;
}
```
Replace every hardcoded homepage colour with these tokens. Existing `--ks-primary`/`--ks-accent` tokens from earlier builds: alias them to the new values so other pages don't break, then stop using them on the homepage.

### 1b. Typography (Noto Sans Devanagari via Google Fonts, weights 400/600/700/800 — if not already loaded, load it)
| Element | Desktop | Mobile |
|---|---|---|
| H1 (hero) | 50px / 800 / lh 1.1 | 32px |
| Hero subline | 18px / 400 | 15px |
| H2 (section) | 28px / 700 | 24px |
| Card title | 17px / 700 | 16px |
| Price | 17px / 800 | 16px |
| Body | 16px | 16px |
| Caption / meta | 14px | 14px |
| Buttons | 16–18px / 700, min-height 48px; giant actions 20px / 800, min-height 64px | 44px / 56px |

Nothing user-facing below 14px. Nothing.

### 1c. Shared components (create once, use everywhere)
- `SectionHeader` — H2 left, "सभी … →" link right, `margin-bottom: 12px`
- `PhotoTile` — image + gradient-free dark overlay `rgba(23,51,35,.38)` + white label; props: src, label, sublabel, href, height
- `InfoTile` — white card: small caption, big value, one-line note in a semantic colour
- `ListingCard` — photo (top), badge, title, price, "village · X किमी · name", footer with `WhatsApp` button (green, inline SVG icon) + `Call` button (40×40)
- `CountChip` — big number + label, white pill
- `Button` — variants: primary (green), secondary (orange), ghost (white with green border)
- `WhatsAppIcon` — inline SVG, never an `<img>`

### 1d. Layout rule — edge to edge
No `max-w-*`, no `mx-auto`, no `container` on the homepage. Every section is `width:100%`. Horizontal padding is exactly `var(--ks-gutter)` (12px) on desktop and 12px on mobile; grids use `gap: var(--ks-gutter)`. Section vertical spacing: 20px desktop, 16px mobile. Nothing else.

---

## Phase 2 — Real photographs (download, verify by looking, self-host)

Create `scripts/fetch-images.mjs` that downloads every image below into `public/images/home/` at the sizes given, as `.jpg` (quality 80). Sources, in order: Unsplash (`images.unsplash.com/...?w=<width>&q=80`), Pexels, Wikimedia Commons (record attribution). Find URLs by web search — do not guess IDs.

**Then, for every file, open it with the image viewer and confirm it matches the description.** Wrong subject (vegetables instead of wheat, a Western farm, a stock-photo model in a studio, a watermark) → delete, search again, re-verify. Never ship an image you have not looked at. Write `public/images/home/manifest.json` with `{file, description, source, author, license}` for each; add a "फोटो श्रेय / Photo credits" line in the footer linking to `/credits` (a plain page rendering the manifest).

| File | Description | Size |
|---|---|---|
| hero-farmer.jpg | Indian farmer (older man, real face, turban or gamcha) smiling in a golden wheat/soybean field, warm light, space on the left for text | 1600×720 |
| cat-machines.jpg | Tractor in an Indian field | 640×400 |
| cat-labour.jpg | Group of Indian farm workers harvesting | 640×400 |
| cat-drone.jpg | Agricultural drone spraying a crop | 640×400 |
| cat-straw.jpg | Straw bales / wheat straw pile | 640×400 |
| cat-inputs.jpg | Seed and fertiliser sacks at a shop | 640×400 |
| cat-godown.jpg | Grain warehouse / silo interior or exterior | 640×400 |
| cat-expert.jpg | Agricultural scientist or extension officer with a farmer in a field | 640×400 |
| cat-land.jpg | Green farmland plot, MP-like flat terrain | 640×400 |
| list-harvester.jpg, list-tractor.jpg, list-drone.jpg, list-straw.jpg, list-workers.jpg, list-godown.jpg, list-land.jpg, list-shop.jpg | One photo per listing category, used as the card image when a listing has no photo of its own | 640×400 |
| video-1.jpg … video-3.jpg | Thumbnails for the three videos in Phase 3d (download from `img.youtube.com/vi/<id>/hqdefault.jpg`) | as served |
| drone-didi-official.jpg | An official Drone Didi scheme press photo from pib.gov.in | 640×400 |
| pm-official.jpg, cm-official.jpg | Official press photos from pib.gov.in / mpinfo.org of the PM and the MP CM at an agricultural event | 640×400 |

Rules: real people, Indian context, no AI-generated faces. If an official PIB/MP photo cannot be found and verified, **omit that cell** from the trust row rather than substitute anything. The founder's photo is not available: render an initials avatar (`अ.दी.`) with a `TODO: founder photo` comment; do not use a stock face for him.

Because everything is self-hosted, the existing `_headers` `img-src` needs only `'self' data:` for these; keep the existing external allowances for article images.

---

## Phase 3 — Data for the new sections

### 3a. Trend arrows
For each ticker item, delta = today's modal_price − the most recent earlier `price_date` for the same commodity+market. Show `↑ 50` in `#FBE9B6`, `↓ 20` in `#F5B7B7`, nothing if no prior row.

### 3b. आज किसान के लिए (the signature card)
One function `getTodayForFarmer(weather, mandi, msp, lang)` returning `{advice, rainLine, weatherLine, priceLine}`:
- `rainLine`: from `weather_cache.forecast[0..1]`: "कल बारिश की संभावना (18 मिमी)" / "अगले 2 दिन बारिश नहीं"
- `advice` (one line, literal, actionable — reuse the IMD thresholds already in `rainAlert.js`): e.g. "आज सोयाबीन की कटाई पूरी करें, अनाज खुले में न छोड़ें" / "छिड़काव और कटाई के लिए अच्छा दिन"
- `priceLine`: top Sagar-relevant crop with both mandi and MSP data (prefer wheat, then soybean): "गेहूं ₹2,580 · MSP ₹2,585 से ₹5 नीचे" (amber) or "… से ₹115 ऊपर" (green)
- `weatherLine`: "24° · बादल छाए"

### 3c. आपके आसपास counts
Pincode resolution: profile pincode → else `localStorage.ks_pincode` → else default `470117` (Khurai) with a visible "पिनकोड बदलें" control that prompts for a 6-digit pincode and stores it. A Supabase RPC `nearby_counts(p_pincode text, p_km int)` returning `{category, count}` using the existing asset-location distance logic (30 km, fallback 50). Show six chips: मशीनें, कृषि सहयोगी, भूसा/पराली, Drone Didi, गोदाम, ज़मीन. Zero shows as "0" — never hide a chip.

### 3d. Videos
Create `src/content/videos.js` with three entries `{youtubeId, title_hi, title_en, duration}`. Find three real, public Hindi farming videos (ICAR, KVK, DD Kisan, or an MP agriculture channel) on: soybean yellow mosaic, wheat sowing time/seed rate, drone spraying. Cards link out to YouTube (`https://www.youtube.com/watch?v=…`, opens the app on phones); thumbnails are the self-hosted files. No iframes.

### 3e. Listings near you
Reuse the existing nearby-listings query; take 8, ordered by distance then recency. Card image: the listing's own photo if any, else `list-<category>.jpg`.

---

## Phase 4 — The homepage, section by section (desktop 1280 first)

Delete the current `Homepage.jsx` content and rebuild in this exact order. Nothing from the old homepage survives unless named here.

**1. Nav** (white, 60px, 12px side padding): logo + "किसान सहयोग" / small "खेती की जानकारी भी · खेती का बाज़ार भी"; links: बाज़ार · मंडी भाव · मौसम · किसान सवाल · वीडियो · योजनाएँ · संपर्क; right: हिं | EN pill, **+ नई लिस्टिंग** (green), avatar/login.

**2. Ticker** (36px, `--ks-strip`): label "आज के मंडी भाव (MP)" on `--ks-strip-2`; items `गेहूं ₹2,580 ↑50 · Shahagarh`, CSS marquee, pause on hover.

**3. Hero — आज किसान के लिए** (full-bleed, `hero-farmer.jpg` as background, `background-position: right center`, overlay `linear-gradient(90deg, rgba(251,250,245,.96) 0%, rgba(251,250,245,.85) 45%, rgba(251,250,245,.15) 100%)` so the farmer stays visible on the right and text is on cream on the left; min-height 460px; 12px padding). Left column (max 58% width):
- Eyebrow pill (saffron tint, saffron-dark text): "किसान की आय बढ़ाना · रोज़गार के अवसर"
- H1: **आज किसान के लिए**
- Subline: "सही जानकारी, सही मौके — आपके आसपास"
- Three `InfoTile`s in a row (gap 12px): मौसम (24° · बादल छाए · rainLine in blue) / गेहूं का भाव (₹2,580 · MSP ₹2,585 · "₹5 नीचे" amber or "₹115 ऊपर" green) / आज की सलाह (advice, saffron-tinted tile)
- Two giant actions side by side: **मुझे कुछ चाहिए** (green, search icon, sub-label "खोजें, संपर्क करें, किराये पर लें") → /browse; **मेरे पास कुछ है** (orange, plus icon, sub-label "बेचें, किराये पर दें, लोगों तक पहुँचें") → /post
Mobile: photo becomes a 200px banner on top, content stacks below on cream.

**4. आपके आसपास क्या उपलब्ध है? (30 किमी)** (`--ks-bg-soft` band): H2 with the pincode control; six `CountChip`s in one row.

**5. कृषि बाज़ार की श्रेणियाँ**: two rows of four `PhotoTile`s (height 150px): मशीनें · कृषि सहयोगी · Drone Didi · भूसा/पराली · बीज, खाद व इनपुट · गोदाम/भंडारण · कृषि विशेषज्ञ · ज़मीन (पट्टा/बटाई). Label + one-line sublabel on each.

**6. आपके आसपास की ताज़ा लिस्टिंग**: 8 `ListingCard`s in 4 columns (2 on mobile), photo 130px, WhatsApp + Call in the footer of every card.

**7. आज की 2 मिनट की वीडियो सलाह** (`--ks-bg-soft` card, full width): three video cards with a play badge and duration.

**8. किसान सवाल**: two latest published Q&As as compact rows (thumbnail if any, question, "N जवाब"), and a prominent button **📷 फोटो भेजकर सवाल पूछें** → `/sawaal?ask=1&photo=1`. Add an optional image upload (Supabase storage, ≤2 MB, jpg/png) to the existing ask form; store the URL on `kisan_sawaal.photo_url` (add the column via a new migration).

**9. सरकारी मदद** — one row of three compact link cards (no scheme grid): **योजनाएँ** (PM किसान ₹6,000 · फसल बीमा 2% · कुसुम 60% → /yojana) · **ज़रूरी नंबर** (पशु 1962 · हेल्पलाइन 1800-180-1551 · KVK → /resources) · **MSP 2026-27** (गेहूं ₹2,585 · सोयाबीन ₹5,708 · चना ₹5,875 → /info#msp).

**10. भरोसेमंद लोग** — one row: founder card (initials avatar, quote "यह मंच खेती को समझने वाले लोगों ने किसानों के लिए बनाया है।", "श्री ए.के. दीक्षित · कृषि विशेषज्ञ, किसान परिवार से") · Drone Didi official photo with caption · PM official photo ("आधिकारिक स्रोत · PIB") · CM official photo ("आधिकारिक स्रोत · MP सूचना"). Omit any official cell whose photo failed verification.

**11. लेख** — two small horizontal cards (thumb + title). Modest.

**12. Footer** (`--ks-strip`): mission line, links, "फोटो श्रेय", USD Vision AI LLP · मध्यप्रदेश, भारत.

Removed for good: the old weather/MSP strip, the category chip strip, the stats bar, the mission bar, the carousel, the "About" block, the standalone rain-alert strip (its content now lives in the Today card; keep the classifier).

---

## Phase 5 — Mobile

Desktop is the priority, but at 375px every section must stack cleanly: hero photo banner → content; counts wrap to 3×2; categories 2 columns; listings 2 columns; videos 1 column; trust row 1 column. Buttons ≥ 44px. No horizontal scroll anywhere.

---

## Phase 6 — Bilingual, accessibility, regression

- Every new string through i18n; run the audit.
- Real `<a>`/`<button>` elements, `aria-label` on icon-only buttons, 4.5:1 contrast on all text (check amber-on-cream and orange-on-white in particular; darken if needed).
- /browse, /post, /listing/:id, /info, /resources, /sawaal, /yojana, /safalta, /articles, /admin all still load. Backend suites green.

---

## Phase 7 — Screenshot self-review (mandatory, before any deploy)

1. `npm run build && npm run preview`; with Playwright take **full-page** screenshots at 1280×800 and 375×812 → `docs/review/home-desktop.png`, `docs/review/home-mobile.png`.
2. **Open both screenshots with the image viewer and look at them.** Check every line:
   - Hero farmer photo visible, face not covered by text; H1 "आज किसान के लिए" readable; three tiles readable; two giant buttons green and orange.
   - No grey/black/empty image blocks anywhere. Every category tile and listing card has a photograph.
   - Counts row shows six numbers.
   - Listings show price, distance, WhatsApp (green) and Call.
   - Video cards have thumbnails and play badges.
   - Page background is cream; no large dark green blocks except ticker and footer.
   - Content touches 12px from both edges on desktop; nothing centred in a narrow column.
   - Text sizes match Phase 1b (spot-check H1, H2, card title, caption with `getComputedStyle`).
   - Mobile: no horizontal scroll, buttons ≥ 44px, nothing clipped.
3. Anything failing → fix → rebuild → re-screenshot → re-view. Repeat until every line passes.
4. Only then: commit, push, deploy. Then screenshot the **live** staging URL the same way, view it, and confirm it matches the preview.

Write `docs/review/HOMEPAGE_V4_REVIEW.md`: the checklist with pass/fail per line, the image manifest summary (which photos, from where), and anything omitted (e.g. an official photo not found). The final message must state plainly that you looked at the screenshots.

Commit message: "Homepage v4 (Direction B): design tokens + components, real self-hosted photos, आज किसान के लिए hero, आपके आसपास counts, WhatsApp+Call listings, videos, photo Q&A, compact govt row, trust row; screenshot-reviewed"
