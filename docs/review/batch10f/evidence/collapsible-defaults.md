# Batch 10F Phase 2 — collapsible sections: default open / collapsed

Component: `src/components/CollapsibleSection.jsx` (native `<details>`/`<summary>`).

Rules (all pages):
- Prerendered HTML, no-JS and the first client render: **every section open**, all text in the HTML.
- After hydration, **768 px and wider: everything open.**
- After hydration, **below 768 px:** sections marked "phone: collapsed" start collapsed — **only if they are still below the fold** at that moment (so nothing the visitor sees moves; a section already on screen stays open).
- **Always open:** the first three collapsible sections of each page and the page's main data table.
- The visitor's own tap is remembered per page + section (`localStorage` key `ks_sections_v1`, e.g. `"msp:trend": 1`) and wins over the default. `/msp` and every `/msp/<crop>` share the page key `msp`.
- A `#hash` link to a section (or anything inside it) opens it and scrolls to it, e.g. `/msp/gehun#procurement`.

All defaults below are **HUMAN-REVIEW** (founder may want e.g. the trend open on phones).

## /msp and /msp/&lt;crop&gt; (page key `msp`)
| # | Section (heading) | id | Phone (< 768) | 768+ |
|---|---|---|---|---|
| 1 | यह पेज किस लिए है (explainer) | `explainer` | open (first three) | open |
| 2 | सभी फसलें — आज का भाव (all-crops table) | `snapshot` | open (first three) | open |
| 3 | आज का भाव (by-crop view: today's mandi table = main data table) | `today` | open (first three + main table) | open |
| 3b | मंडी तुलना (mandi-compare view, shown instead of 3 when that tab is chosen) | `compare` | open | open |
| 4 | रुझान (trend chart) | `trend` | **collapsed** | open |
| 5 | अभी बेचें या रोकें? — गणित (calculator) | `calc` | **collapsed** | open |
| 6 | MSP पर कहाँ बेचें | `procurement` | **collapsed** | open |
| 7 | MSP से नीचे बिक गया? | `below` | **collapsed** | open |
| 8 | पिछले सालों में (past years; only when ≥ 12 months of data) | `pastyears` | **collapsed** | open |
| 9 | अक्सर पूछे जाने वाले सवाल (FAQ) | `faq` | **collapsed** | open |
| – | रुझान → सारणी देखें (trend table, Phase 3) | `trend-table` | **collapsed (all widths)** | **collapsed** |

Not collapsible: the page `<h1>` (the founder's example "गेहूं भाव — आज व MSP से तुलना" is the page title, not a section heading — DECISIONS 21), the location control, the view toggle, the crop chips, the WhatsApp share button, the "भाव MSP से ऊपर जाए तो WhatsApp पर बताएँ" sign-up box, the WhatsApp channel box and the related-pages boxes (not in the founder's list).

## /mausam (page key `mausam`) — most sections exist only once a place is set
| # | Section | id | Phone | 768+ |
|---|---|---|---|---|
| 1 | यह पेज किस लिए है | `explainer` | open (first three) | open |
| – | today card (no heading) | — | not collapsible | — |
| 2 | action windows (छिड़काव / सिंचाई / कटाई / बुवाई) | `actions` | open (first three) | open |
| 3 | अगले 48 घंटे | `hours48` | open (first three) | open |
| 4 | 7 दिन (7-day table = main data table) | `week7` | open (main table) | open |
| 5 | season rainfall | `season` | **collapsed** | open |
| 6 | 16-day outlook | `days16` | **collapsed** | open |
| 7 | glossary | `glossary` | **collapsed** | open |
| 8 | FAQ | `faq` | **collapsed** | open |

## Homepage (page key `home`) — below the hero only
| # | Section | id | Phone | 768+ |
|---|---|---|---|---|
| 1 | क्या खोज रहे हैं? (search) | `search` | open (first three) | open |
| 2 | आपके आसपास (near you, 30 km) | `near` | open (first three) | open |
| – | कृषि बाज़ार की श्रेणियाँ (category tiles) | — | **never collapsible** (founder) | — |
| 3 | listings (ताज़ा लिस्टिंग) | `listings` | open (first three) | open |
| 4 | आज की 2 मिनट की वीडियो सलाह | `videos` | **collapsed** | open |
| 5 | किसान सवाल | `qa` | **collapsed** | open |
| 6 | आस-पास के किसान मेले (only when a regional mela exists) | `mela` | **collapsed** | open |
| 7 | सरकारी मदद | `govt` | **collapsed** | open |
| 8 | भरोसेमंद लोग | `trust` | **collapsed** | open |
| 9 | किसान लेख (only when articles exist) | `articles` | **collapsed** | open |

Never collapsible on the homepage: the hero, the ticker, the open-to-all strip, the "पहली बार?" banner, the category tiles, banners without a heading (tanker season, pest alert, availability nudge). "First three" counts collapsible sections only, so the listings stay open (the category tiles are never collapsible).

## Measured page height at 412 px (Hindi), Phase 0 → Phase 2
- `/msp/gehun`: 6,595 → **4,455 px (−2,140 px)**.
- `/`: 8,996 (Phase 0) → 8,057 (Phase 1, hero) → **5,412 px (Phase 2)**: −2,645 px from the sections, −3,584 px in total.
Screens: `screens/phase0-msp-gehun-hi-412.png` → `screens/phase2-msp-gehun-hi-412.png`; collapsed rows `screens/phase2-msp-collapsed-hi-412.png`, `screens/phase2-home-sections-hi-360.png`.
