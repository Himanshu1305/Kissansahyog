# Batch 10A — post-ship checks on https://kissansahyog.com (Part 2)

Run: 2026-10-17 ~19:00 local, by Claude, against production deployment `0845c733-e8d0-4553-957c-10f3db23ecca` (commit `17d77e8`).
Script: `prod-live-check.mjs` (this folder). Raw results: `results.json`; console output: `run-2.txt` (run-1 was a checker bug, see below).

**READ-ONLY.** No login, no sign-up, no form submit. The browser aborted every non-GET request and recorded it.
5 app writes were blocked and never reached production: `rpc/recent_crop_reports` (home), `weather_grid_requests` upsert x2 (home, /mausam), `rpc/increment_listing_view` x2 (listing view counter).
Only the browser's own localStorage was set (language; a typed place "सागर" so Browse shows results).

| Check | Status | What was seen |
|---|---|---|
| 2.1 `/`, `/browse`, `/signup`, `/login`, `/how-to-use`, `/sawaal`, `/yojana`, `/mausam` | RAN-PASSED | All 200 (plain fetch and browser), each has an h1 and text, no ErrorBoundary, no page errors, no failed or 4xx/5xx request to kissansahyog.com, Supabase or `/functions`. |
| 2.2 `/signup` at 412 and 360 px, Hindi and English | RAN-PASSED | One page (no step buttons), no `<select>` (no language dropdown), no किसान/farmer-profile block, exactly one "show my details" checkbox (ticked), the explanation line, then "ज़रूरी सूचना / Important notice", then the accept box, then the Register button ("स्वीकार करें और आगे बढ़ें" / "Accept and continue"). No sideways overflow. Nothing submitted. |
| 2.3 `/browse?cat=equipment` tag chips | RAN-PASSED (one item HUMAN-REVIEW) | At 412 and 360 px: chips "सभी", "सब्ज़ी खेती के यंत्र", "दुर्लभ या ज़रूरत पर मिलने वाले यंत्र" sit right under the category chips (top 501 px vs categories end 489 px at 360), all 44 px high, "सभी" first. Tapping "दुर्लभ…" selects it (✓, filled) and filters 2 cards to 1; tapping again clears (back to "सभी", 2 cards). Deep link `/browse?cat=equipment&etag=rare_emergency` opens with that chip selected. |
| 2.4 new code is live (JS chunks) | RAN-PASSED | Live main chunk `/assets/index-DRo2-cnt.js` = the one the ship script printed. 109 chunks followed. `जैसे 2023` and the example template `जैसे ${n}` + `575 DI` in `catalog-KGaQpWeV.js`; `post-source-farmer` in `Post-dpxp-I3C.js`; `equipment-tag-filters` in `Browse-CwftU5zq.js`; FieldRow marker `grid-rows-subgrid` / `min-[400px]:grid-cols-2` in `registry-P3Jm2R9h.js`. |
| 2.5 an existing listing opens | RAN-PASSED | Clicked the first card on Browse → `/listing/8659a116-bb5f-4251-a3d4-0a1db599b3c7` (मशीन, चाहिए, थ्रेशर, प्रति घंटा ८००): 200, details shown, no errors. |
| 2.6 sitemap and robots | RAN-PASSED | `/sitemap.xml` 200 `application/xml`, a sitemap index. `/robots.txt` 180 bytes, sha256 equal to `evidence/prod-before.json`. |

## HUMAN-REVIEW

- **2.3 "URL gets `etag`" on tap.** The prompt expected the address bar to change when a tag is tapped. It does not: the tap filters on the page only, and `etag` is read only when the page opens (the deep link from Bazaar). This is how the code is written (`Browse.jsx`, `setEquipmentTag`) and how staging tested it, so it is not a regression. Founder to decide if a tapped tag should also go into the URL (so it can be shared/bookmarked).

## Known noise, not caused by this ship (allowed in the checker)

- Every page logs a CSP error for Cloudflare's analytics beacon (`static.cloudflareinsights.com/beacon.min.js`). The same error is in the Batch 9 prod results and in the 10A rollback run on the old build; `public/_headers` did not change in 10A.
- Prerendered pages try to load `http://localhost:4178/assets/...` modulepreload links, blocked by CSP (BACKLOG B17, pre-existing, also allowed by `verify-batch9-live.mjs`).
- run-1 failed 2.1 and 2.5 only because of the checker: it counted its own blocked writes as failures and looked for `<a href="/listing/…">`, but cards are buttons. Fixed in the checker (attempt 1), re-run = run-2.

## Screenshots looked at

- `signup-360-hi.png`: one page; fields full width; password + "दिखाएँ" and place + "खोजें" fit; Hindi not clipped; no overflow. The bottom nav bar appears in the middle of the image — an artifact of full-page capture of a bar pinned to the screen, not an overlap on a real phone.
- `signup-412-en.png`: same layout in English; "Show my details (recommended)" ticked; notice above accept box above "Accept and continue". Same full-page nav artifact.
- `browse-equipment-rare-360.png`: tag chips under the 11 category chips; the long "दुर्लभ या ज़रूरत पर मिलने वाले यंत्र" chip fits on one line, filled with ✓; nothing clipped. At 360 px the results start below the first screen (pre-existing, many category chips).
- `listing-detail.png`: listing card, call/WhatsApp buttons, type, rent, availability; no overlap. (The rent shows Devanagari digits "८००"; pre-existing display, not part of 10A.)
- Also saved: `route-*.png` (8 routes), `signup-412-hi.png`, `signup-360-en.png`, `browse-equipment-{412,360}.png`, `browse-equipment-rare-412.png`.

## Decision rule result

No blank page, no ErrorBoundary, no 5xx, `/signup` and `/browse` usable → **no rollback**.
