# Fixes, Nav, Scheme Pages, Drone Didi, Content & Features — review

**I looked at the screenshots.** Full-page screenshots were taken at 1280×800 and
375×812 for the homepage plus the new pages (`/yojana`, `/yojana/pm-kisan`,
`/yojana/mp`, `/videos`, `/drone-didi`), sliced into readable tiles and viewed with
the image viewer. `docs/review/home-desktop.png` and `home-mobile.png` are the saved
full captures.

## Phase 1 — v4 bug fixes (all visually confirmed)
| Item | Result |
|---|---|
| 1a Hero photo | REPLACED — was a tight turban/face crop; now a woman farmer working in a green wheat field, face + upper body visible, positioned on the right so the H1/tiles never cover her. Re-cropped so the subject sits clear of the left text column. |
| 1b Listing images | No md5 duplicates remain. Added a distinct `list-thresher.jpg`; equipment cards now map by `equipment_type_id` (harvester→list-harvester, thresher→list-thresher, else tractor). godown→list-godown, land→list-land verified. |
| 1c "0 किमी" distances | Root cause: 13 dummy listings sat at the viewer's own pincode (470117 Khurai), so the 8 nearest were all genuinely 0 km. Redistributed most across Sagar villages (coords from `pincodes`). Cards now show varying distances (Khurai 0 km, Malthon 18 km, …). |
| 1d Count-chip labels | Already correct — chips key by category name (not array index); RPC `nearby_counts` → मशीनें 6 · कृषि सहयोगी 3 · भूसा/पराली 4 · Drone Didi 6 · गोदाम 3 · ज़मीन 5. |
| 1e Nav overflow | Nav container is now `w-full` (edge-to-edge, no max-w/mx-auto); item list cut to 7 (Phase 2). No horizontal scroll at 1280 (scrollWidth = clientWidth). |
| 1f Video thumbnail | The illegible wheat thumbnail is gone — featured wheat video is now `ULZg7ewKOsY` ("गेहूँ की खेती की उन्नत तकनीक", legible). All 16 thumbnails viewed and legible. |
| 1g Broken article image | Carbon-credit cover re-pointed to a self-hosted green-field image; article thumb wrapped in a `--ks-green` block so a dead URL falls back to solid green, never a black box. Both article cards render real images. |

## Phase 2 — Nav
New primary nav shows exactly 7 items: **बाज़ार ▾ · मंडी भाव · मौसम · सरकारी योजनाएं ▾ · किसान सवाल · वीडियो · संपर्क**. बाज़ार dropdown lists the marketplace categories (Drone Didi → `/drone-didi`); सरकारी योजनाएं dropdown → केंद्र (`/yojana/central`) and मध्यप्रदेश (`/yojana/mp`). Mobile expands both inline in the hamburger. Removed the flat category list, लेख, जानकारी and the समुदाय dropdown.

## Phase 3 — Scheme pages
`/yojana/:slug` renders all 7 sections in order (H1+subtitle → direct-answer summary → लाभ → कौन आवेदन कर सकता है? → आवेदन कैसे करें? (numbered) → ज़रूरी दस्तावेज़ (bulleted) → FAQs (accordion) → स्रोत + last-verified → WhatsApp share). **FAQPage + Article JSON-LD emitted and validated** (parses; first FAQ question matches the rendered text word-for-word). `/yojana` shows both groups stacked with anchors + "सभी देखें →"; `/yojana/central` and `/yojana/mp` are the filtered views. Static routes registered before `/yojana/:slug`; `central`/`mp` rejected as slugs in the admin RPC. 8 central schemes backfilled (slug, government_level, docs, source_url, last_verified, 4-6 FAQs each). **4 verified MP state schemes seeded** (मुख्यमंत्री किसान कल्याण, ई-कृषि यंत्र अनुदान, बलराम तालाब, मुख्यमंत्री सोलर पंप/कुसुम-ब) with sources. Admin form extended with slug/level/docs/source/verified + a repeatable FAQ editor.

## Phase 4 — Drone Didi (`/drone-didi`)
Hero band (cat-drone photo + heading + intro) → यह योजना क्या है? (reuses the `drone-didi` scheme row: details/benefits/eligibility + "पूरी जानकारी देखें") → live local drone_didi listings (WhatsApp + Call) → आधिकारिक जानकारी (text only — no verified PIB photo available, so image omitted with a non-endorsement note) → WhatsApp share. Linked from the बाज़ार dropdown.

## Phase 5 — Videos & Q&A (admin tables)
`videos` table seeded with **16 videos** (3 original + 13 new, all verified public via oembed, thumbnails self-hosted under `public/images/videos/` and viewed for legibility) across pest/sowing/irrigation/drone/scheme/market/general. `/videos` page = filterable grid. Homepage "आज की 2 मिनट की वीडियो सलाह" now reads the 3 `is_featured` rows from the table; `src/content/videos.js` deleted. **19 published Q&A** total (16 seeded) across all categories; `related_video_id` cross-links populated for 4 matching pairs and surfaced as "संबंधित वीडियो" on the expanded Q&A.

## Phase 6 — Pest/disease banner
`kisan_sawaal` gained `crop` + `symptom_tag` (optional dropdowns on the ask form). `recent_crop_reports` RPC groups published rows (both tags set, last 14 days, count ≥ 2). Banner renders below the hero: "⚠️ हाल में देखा गया — सागर क्षेत्र में सोयाबीन पर 2 पीली पत्तियों की शिकायतें (पिछले 14 दिन)" with the "recently asked" framing (not an official alert). Seed guarantees the soybean/yellow_leaves group so it shows on staging.

## Phase 7 — Utilities
- **Availability calendar** (`listing_unavailable_dates` + owner-gated `set_listing_unavailable` RPC): month view on equipment-offer detail pages; owner toggles busy/free, others see booked dates greyed with "बुक्ड". Implemented and builds; only visible on the logged-in listing detail (protected route), so not in the anon screenshot set.
- **KVK events** (`farm_events` + admin RPCs): upcoming events on `/info`; when one falls within 7 days it shows in the hero as "📅 रवि — मिट्टी जांच शिविर · KVK सागर" (confirmed in the hero screenshot). 3 seeded.

## Closing checks
- **No horizontal scroll** at 1280 or 375 on the homepage and every new page (scrollWidth = clientWidth everywhere).
- **Bilingual**: every new string added to `strings.js`; static-key scan of all new/changed screens reports no missing keys.
- **Regression**: `/`, `/browse`, `/post`, `/info`, `/resources`, `/sawaal`, `/yojana`, `/safalta`, `/articles`, `/admin`, `/credits`, `/welcome`, `/videos`, `/drone-didi` all render with no JS/console errors (protected routes redirect anon as expected).
- **sitemap.xml** (26 URLs incl. every `/yojana/:slug`, `/yojana/central`, `/yojana/mp`, `/drone-didi`, `/videos` + existing public pages) created and referenced from **robots.txt**.
- **Migration**: single file `0023_schemes_content_features.sql` applied via `npm run db migrate`.
