# Batch 10D — Task D: SEO text diff of the prerendered homepage

**Verdict: NOTHING LOST** (RAN-PASSED)

Built 2026-10-18 from `release-10d` working tree (HEAD 9be69fb, Tasks A–C), staging:
`node --env-file=.env scripts/check-staging-env.mjs && npm run build:full && node --env-file=.env scripts/check-staging-env.mjs --dist`
→ 268/268 prerendered (`/` via fallback, as in the baseline), staging guard OK. Log: `build.txt`.

Rerun: `node scripts/batch10d/seo-text.mjs dist/index.html <dir> --sitemaps dist`
then `node scripts/batch10d/seo-diff.mjs docs/review/batch10d/evidence/baseline <dir>` (exit 0 = nothing lost).
Files here: `home-text.txt`, `home-seo.json` (after), `seo-diff.json` (machine-readable result), `build.txt`.

## Method
1. `seo-text.mjs` writes every non-empty `<body>` text node of `dist/index.html` (JS disabled), one per line.
2. Data-driven lines are cut out of both texts by anchor lines (static headings/links around them) — see the table below. Everything else is treated as static copy.
3. The baseline rendered the hero twice (desktop `<p>` instance + mobile `<h1>` instance). The second copy (baseline lines 111–127, from the 2nd hero eyebrow to the search h2) was checked to repeat lines of the first copy only, and is taken out of the requirement; each of its lines must still appear at least once.
4. Words = whitespace-separated tokens, exact match (punctuation kept, no stemming). Every remaining baseline word must appear in the new text at least as many times as in the baseline. Additionally every static baseline line must still exist as a whole line.

## Counts
| | baseline | after |
|---|---|---|
| text lines | 305 | 387 |
| data-driven lines (excluded) | 128 | 126 |
| words total | 1,053 | 1,184 |
| static words (baseline) / required after removing the duplicate hero | 597 / **520** (301 distinct) | — |
| required words missing | — | **0** |
| static lines missing | — | **0** |
| new lines added (hero tabs, phone example, captions, field band, crop strip, facts) | — | 83 |

## Expected 2 → 1 (duplicate hero copy removed, single hero now)
Every phrase is still present at least once; the single `<h1>` has the exact text "आज किसान के लिए".

| phrase | baseline | after |
|---|---|---|
| 🌾 किसान की आय बढ़ाना · रोज़गार के अवसर (eyebrow) | 2 | 1 |
| ✓ निःशुल्क रजिस्ट्रेशन (badge + post-free-registration note) | 4 | 2 |
| आज किसान के लिए (h1 / desktop `<p>`) | 2 | 1 |
| सही जानकारी, सही मौके — आपके आसपास (subline) | 2 | 1 |
| मौसम (tile caption; nav "मौसम" also remains) | 3 | 2 |
| मौसम देखने के लिए अपनी जगह बताएँ | 2 | 1 |
| मेरी लोकेशन साझा करें · 5 दिन का पूर्वानुमान → | 2 | 1 |
| आज का भाव | 2 | 1 |
| गेहूं ₹2,690 (data: today price) | 2 | 1 |
| MSP ₹2,585 से ₹105 ऊपर · पूरी सूची → (data: MSP diff) | 2 | 1 |
| आज की सलाह | 2 | 1 |
| छिड़काव और कटाई के लिए अच्छा दिन | 2 | 1 |
| मुझे कुछ चाहिए / खोजें, संपर्क करें, किराये पर लें | 2 | 1 |
| मेरे पास कुछ है / बेचें, किराये पर दें, लोगों तक पहुँचें | 2 | 1 |

At word level this is 36 distinct words whose count dropped, each by exactly the duplicate amount (list in `seo-diff.json` → `expectedDuplicateDrops.words`). Note: `scripts/verify-batch7d.mjs` counts the badge twice in `dist/index.html`; it will now find one per spot (DECISIONS 8).

## Data-driven exclusions (filled from the staging DB / live data at build time)
| region | source | reason | this build vs baseline |
|---|---|---|---|
| mandi-ticker (after "📊 मंडी भाव" → before "बिना लॉगिन…" h2), incl. "कल का भाव (17/10)" | `MandiTicker` (fetchMandiPrices) | latest mandi day, crops, prices, APMCs | identical (51 lines) |
| listings (after "ताज़ा लिस्टिंग" / "सभी देखें →" → before video h2) | Homepage feed (fetchHomeFeed → HomeListingCard) | newest DB listings (KSTEST data on staging) | identical (40) |
| videos (video h2 / "सभी देखें →" → "किसान सवाल" h2) | fetchFeaturedVideos(3) | featured video titles, durations, channels | identical (9) |
| sawaal ("सभी सवाल देखें →" → "📷 फोटो भेजकर सवाल पूछें") | fetchFeaturedSawaal(3) | featured Q&A items | identical (12) |
| melas ("सभी मेले देखें →" → "सरकारी मदद" h2) | fetchUpcomingMelas(3) + melaStatus | next melas; status depends on the date | identical (10) |
| articles ("किसान लेख" / "सभी देखें →" → footer "किसान सहयोग") | fetchPublishedArticles | article titles | identical (2) |
| hero tile price line "गेहूं ₹2,690" | getTodayForFarmer (mandi + MSP) | crop and price of the day | present (2 → 1, duplicate hero) |
| hero tile MSP line "MSP ₹2,585 से ₹105 ऊपर · पूरी सूची →" | getTodayForFarmer (MSP vs mandi) | price difference | present (2 → 1, duplicate hero) |

Static copy around these (section headings, "सभी देखें →" links, "पूरा उत्तर पढ़ें" is inside sawaal items, "📷 फोटो भेजकर सवाल पूछें", "सरकारी मदद" cards, founder block, footer) is NOT excluded and was checked. On this build all data regions happen to be identical to the baseline anyway, so no word was excused by the exclusions.

## Head, structure, sitemaps
| check | result |
|---|---|
| title "किसान सहयोग — मंडी भाव, मौसम, योजनाएं व बाज़ार" | unchanged |
| meta description, og:title, og:description, html lang `hi`, robots (none), hreflang (3) | unchanged |
| canonical `https://kissansahyog.com` | unchanged |
| JSON-LD: 2 blocks (Organization, WebSite) | byte-identical |
| h1: exactly one, "आज किसान के लिए" | unchanged |
| h2: all 11 baseline h2, same order (no new h2); h3: none | unchanged |
| heading order (h1 + h2) | identical |
| FAQ | none before, none after |
| links: all 37 baseline hrefs still present | yes; 1 added: `/signup` (new "रजिस्टर करें" button) |
| sitemaps `sitemapsSha256NoLastmod` (5 files) | equal |
| `design/` (incl. `home-options-preview.html`) in `dist/` | not shipped (0 files) |

## Strings (rule 5)
Checked `src/features/home-live/*` and `src/features/guide/FieldScene.jsx`: no hard-coded Hindi/English user text in JSX (Hindi appears only in comments). All 54 string keys used exist in `src/lib/i18n/strings.js` with `hi` + `en`; the phone's example names/prices (`home_live_rent_l1`, `home_live_rent_l1_sub`, `home_live_sell_*`, …), tab labels, captions, aria-labels (`home_live_tabs_label`, `home_facts_label`), the "उदाहरण / Example" tag (`home_live_example`), field-scene description (`home_field_sr`), crop strip (`home_crops_*`) and facts labels (`home_facts_*`) all come from strings.js. Only raw values in data: emoji prefixes (📞, 📷), the " · " separator, "°", and the example mandi prices ₹2,450 / ₹4,600 / ₹5,500 in `screens.js` (numbers, 10C guide samples, shown only inside the labelled example phone). Nothing fixed.
