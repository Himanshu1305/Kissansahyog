# KISSAN SAHYOG — BATCH 2: Finish the structure (preview only)

Repo: `~/projects/Kissansahyog` (Mac, macOS Terminal). Stack: React 19 + Vite + Tailwind v4, Supabase, Cloudflare Pages (Direct Upload). The owner is non-technical, and every command you print for him must work in macOS Terminal. **Launch is in 2 days**, so finish, verify and keep the build green.

Read `docs/review/BATCH1_REPORT.md` and `KNOWN_ISSUES.md` first. Batch 1 (navigation, Browse, public browsing, Call/WhatsApp, 3-step posting) is done. Do not redo or undo it.

## What the owner wants (his words, summarised)
It is a **simple marketplace**: people list items or services, and others find them and contact them. Every page must use the same central layout, edge to edge, on mobile and desktop. Listings come first on every marketplace page, and information comes second. No Google-style "claim this listing". Pages must be useful, not thin.

## Hard rules
1. **Preview only.** The only deploy allowed is:
   `npm run build:full && npx wrangler pages deploy dist --project-name kissansahyog --branch v2-preview`
   **Never** run a deploy without `--branch v2-preview`.
2. **Database:** additive migrations only, starting at **0051**, idempotent, with RLS on any new table. Never drop a table or column holding data. Removing a feature means hiding it in the UI. Apply migrations with `npm run db migrate`.
3. **No long-form content writing in this batch.** Batch 3 rewrites content. In this batch you may only:
   - **move** existing content blocks between pages;
   - **shorten** them by cutting;
   - write short UI strings: labels, buttons, empty states, and intro lines of at most 2 sentences.

   Do not invent any fact, number, scheme rule or date. Any number shown must already be in `docs/research/SOURCES.md` / `src/content/sources.js` with its citation.
4. **Hindi UI strings:** write them the way a farmer in Sagar speaks: short and plain. Examples: "कॉल करें", "पास के कोल्ड स्टोरेज", "अपना गाँव या पिनकोड लिखें", "दिशा देखें". Avoid bookish words (सूचीबद्ध, उपयुक्त, प्रस्तुत, एकरूपता, दावा करें). Write the English separately and naturally. All strings go in `strings.js`, and the `v11_phase6` audit stays green.
5. Keep all existing conventions:
   - Land is last.
   - The radius rules (30 km, 30–50 km fallback, 100 km wide visibility for bhusa, agri_inputs, warehouse and greenhouse).
   - `create_listing` contract.
   - The `is_test_data` sample listings stay visible (owner decision).
   - 44px tap targets.
6. **Commit and push after each item** with the message `Batch2 item X: …`. Keep `docs/review/BATCH2_PROGRESS.md`. If you are resuming, continue from the first unticked item. Work autonomously, do not ask questions, and record judgement calls in the progress file.
7. **Priority order:** A → B → C → D → E → F → G. Commit after every item so progress is safe if the run is cut off. **Write `BATCH2_REPORT.md` only when items A–F are all complete** (G is optional). Never write the report early: the runner treats the report as "batch finished". Never leave the build broken.
8. **The live site shares this database.** kissansahyog.com still runs the old (pre-V2) app against the same Supabase project. **Every database change must keep the live app working:** additive columns only; RPC changes only with new parameters that have defaults; never make an existing parameter or `details` field newly required; never rename or remove anything the old app reads. (A V2 change already broke posting on the live site once; it was hot-fixed by migration 0050.) Before applying each migration, check the old app's calls with `git show ba455ae:src/...`, and record in the progress file why the migration is safe.
9. **Tests:** if a feature is intentionally removed (for example, the claim UI), you may delete or replace its tests. Write each change and the reason in the progress file. Otherwise, counts must not drop.
10. **Hard stop:** if you are truly blocked (missing credentials, a failing migration you cannot fix safely, the build impossible to recover), write the reason to `docs/review/BATCH2_BLOCKED.md`, commit and stop.

## Item A: one layout everywhere (finish Batch 1 item 1)
- Remove the page-level width from **all 21 screens** that still set one: Admin, AgroForestry, Articles, DroneDidi, FasalSalah, Homepage, Info, KisanMela, KisanMelaSubmit, ListingDetail, Mausam, Msp, NotFound, Post, Privacy, Resources, Safalta, Sawaal, SchemeDetail, Terms and Welcome. Grep for `max-w-` and `maxWidth` in `src/screens/`. Every screen uses `PageShell` (wide) plus the layout primitives.
- **Long text stays readable:** prose, articles, Q&A bodies, Terms and Privacy stay inside the readable column, at about 70 characters per line. Backgrounds, heroes, grids, tables and boxes are full width.
- Grids: 2 columns on mobile, 3 on tablet, 4 on desktop for tiles and listing cards.
- Add `scripts/test/batch2_layout.mjs`. It must fail if any file in `src/screens/` sets a page-level `max-w-` or `maxWidth`. Allowlist modals, cards and chips by an explicit comment marker.
- Delete the dead `src/components/ListingForm.jsx` and any imports of it.

## Item B: cold storage, rebuilt for users (`/cold-storage`, `/cold-storage/:district`)
**Remove:** the claim / correct / remove block and its modal from every card, and the claim queue from Admin. Keep the tables and data. Replace it with one small link per card, **"गलत जानकारी? बताएँ"**, which opens the existing `ReportButton` flow (`target_type='cold_storage'`).

**Each card shows:**
- Name, **full address** (`address`, city, district, pincode), crops/products stored (`products`), capacity and type.
- **📞 कॉल करें** (`tel:`) and **WhatsApp करें** (`wa.me/91…`), only when a valid 10-digit Indian mobile number exists. Landlines get Call only.
- **दिशा देखें**: a Google Maps search link built from name + address + city. No API key is needed:
  `https://www.google.com/maps/search/?api=1&query=<encoded>`
- The source link stays as small grey text at the bottom. Old-list entries keep the "पुरानी सरकारी सूची" note.
- Directory phone numbers are public (owner approved), so no login is needed for directory cards.

**Location search at the top of the page:**
- A text box, **"अपना शहर, गाँव या पिनकोड लिखें"**, a **"मेरी लोकेशन"** (GPS) button, and filters for district, crop and type.
- Results are sorted by distance, nearest first, and show "~X किमी".
- For distances, add `latitude`/`longitude` columns to `cold_storage_directory` (migration 0051). Fill them **once** with a script `scripts/geocode-cold-storage.mjs` that calls Nominatim at **at most 1 request per second**, using the existing `/geocode` approach and User-Agent.
  - Query: address + city + district + Madhya Pradesh. If that fails, fall back to city + district.
  - Record the precision (`address` / `city`) in a `geo_precision` column, and write a log of failures.
- The typed location is resolved with the existing pincode table (`fetchPincode`) or `/geocode`.
- If nothing is within 50 km, show the nearest 10 anyway, with their distances.

**Page order:**
1. Search box and filters.
2. Results.
3. A **"कोल्ड स्टोरेज मालिक हैं? मुफ़्त में अपनी लिस्टिंग डालें"** button that opens `/post` with the Warehouse category preselected.
4. Short existing sections: "how to choose" (cut to at most 8 bullet points) and the MP capacity fact with its citation.
5. District links.

District pages use the same card and search, with the district preselected.

**Tests:**
- The claim UI is gone.
- Cards show address, Call/WhatsApp and directions.
- A search for "Bina" or "470113" sorts Bina entries first.
- Geocode coverage is at least 90% (report the exact numbers).

## Item C: Greenhouse split (marketplace first)
**`/greenhouse` becomes the marketplace page:**
1. A heading and one sentence.
2. Two big buttons: **"वेंडर हैं? अपनी सेवा डालें"** and **"पॉलीहाउस बनवाना है? अपनी ज़रूरत डालें"**. They open `/post` with the Greenhouse category and the offer or requirement type preselected. Add preselect support to `/post` via `?cat=&type=`.
3. Vendor and requirement listings in a grid, with filters by vendor sub-type (निर्माण, मरम्मत/फ़िल्म, ड्रिप, नर्सरी, सब्सिडी कागज़ात, पुराना सामान) and district. Cards use the Batch 1 `ContactActions`.
4. Then a short box: "सब्सिडी और लागत की जानकारी →", linking to the guide.

**`/greenhouse/subsidy`** (new route: prerendered, in the sitemap, with SEO and FAQPage JSON-LD) becomes the guide:
- **Move** the existing guide content and calculators here unchanged; Batch 3 rewrites the wording.
- **Fix the MP subsidy table citation:**
  - Download the MPFSTS state-scheme guideline PDF linked in `docs/research/greenhouse_dossier.md` (the addendum).
  - Render its pages with `pdftoppm -r 150`, open the PNGs, and read the cost-norm and subsidy rows and the area bands.
  - If they match what is published: add the PDF as a new source in `SOURCES.md` (page number plus a verbatim quote) and cite it as the **primary** source. The Haryana MIDH source stays only as secondary.
  - If you cannot read or confirm the values: **remove the ₹/m² table and the worked example**, and replace them with a link to the MPFSTS guidelines page plus the verified 50% figure.
  - Record the outcome in the progress file.

Update `/greenhouse` links in the NavBar, homepage tiles, `RelatedBoxes`, the search index and the sitemap.

## Item D: Jugaad split (marketplace first) and a simpler form
**`/jugaad` becomes the marketplace page:**
1. A heading and one sentence.
2. A big **"अपना जुगाड़ डालें"** button (opens `/post?cat=jugaad&type=offer`).
3. Listings grid with filter chips: बेचना · किराया · सेवा · ऑर्डर पर बनाना · विकास में (मदद चाहिए).
4. A link box to the guide.

**`/jugaad/jankari`** (new route: prerendered, in the sitemap, with SEO) receives the existing info and legal guide, moved unchanged.

**Simpler jugaad form** (`src/components/categories/jugaad.jsx`):
- Required: photo (at least 1), name of the jugaad, what it does (1–2 lines), type (the 5 options above), and price or rent (the seller's own; optional for "विकास में").
- Optional: crop or work, demo video link, tested yes/no.
- Remove "units made" and the testing-body name from the form; keep showing any existing values. Keep the road-vehicle rule as one line inside the declaration checkbox text, not a separate field.
- Validation on the client and in the RPC must agree. Existing jugaad listings must still display.

## Item E: Fasal Salah that does something (`/fasal-salah`)
- Crop cards become **buttons**. Tapping one opens a crop panel (or `/fasal-salah/<crop>`, your choice; record it) with:
  - **Today's call** for your location: spray / irrigate / harvest as OK, caution or stop, from the existing `actionWindows` and the weather cell, with the reason in one line, e.g. "कल बारिश की संभावना — आज छिड़काव न करें".
  - **This season's work for this crop:** use only the existing `cropadv_<slug>` text. Do not write new advice in this batch.
  - **Common problems:** links to that crop's Q&A pages (`/fasal/<crop>/samasya` and the top 5 `/sawaal/<slug>` for the crop). Hide the section if there are none.
  - **Nearby help:** links to Browse for agri_inputs, Drone Didi and equipment (harvester/thresher in harvest months), plus KVK Sagar contacts from Resources.
- The location control stays at the top. It is public, with no login.

## Item F: Kisan Sawaal fixes (structure only)
- **Slugs:** every Q&A gets a meaningful slug made from the Hindi question, transliterated into Latin script, for example `masoor-buvai-samay-beej-dar`. This includes the 19 legacy rows (e.g. `sawaal-crop`). Store old slugs in a `kisan_sawaal_slug_redirects` table (migration). `/sawaal/<old-slug>` must redirect (client `Navigate replace`, and a `_redirects` rule where possible) to the new slug. Update the sitemap and search index.
- **Breadcrumb:** होम › किसान सवाल › <crop or topic> › question. There is a stray "/" today.
- **English support:**
  - Add nullable `question_en`, `answer_en` and `answer_blocks_en` (jsonb) columns.
  - `SawaalDetail` renders English when the language toggle is EN and the English fields exist.
  - When they don't exist yet, show the Hindi content with one small line: "This answer is available in Hindi only for now."
  - Labels must never be English over Hindi content without that note.
  - Batch 3 fills in the English.
- **Legacy rows with no `answer_blocks`:** render their answer in the same structured layout ("संक्षेप में" box and body), not as a bare summary.
- `/sawaal` index: show the questions grouped by crop and topic as a full-width grid, with the ask form below.

## Item G: public category pages (only if time allows)
Prerendered, indexable landing pages, one per marketplace category, for example `/bazaar/tractor-kiraye-par`, `/bazaar/bhusa`, `/bazaar/beej-khad-dawa`. Pick slugs that match the existing categories and record them. Each page has:
- The H1 (e.g. "सागर में ट्रैक्टर किराये पर").
- One intro line.
- **Live listings** for that category around Sagar (default centre), reusing Browse components.
- Post and Browse buttons.
- 4–6 FAQ questions about *using Kissan Sahyog* (how to post, how to contact, is it free). No farming facts.
- SEO, JSON-LD (BreadcrumbList, FAQPage) and sitemap entries.

Link them from the footer.

## Verification (before deploying)
- Run the full backend suite, `npm run test:e2e`, `v11_phase6`, `v2_seo_audit`, `v2_citation_audit`, the new `batch2_*` tests, and `npm run build:full`. All green, with no count below the Batch 1 numbers.
- **Screenshots** at 375×812 and 1280×800, saved in `docs/review/shots-batch2/`. Open each, and fix any problem. Check: edge to edge, NavBar and bottom bar present, no horizontal scroll, long text readable. Pages:
  - `/`, `/browse`, `/listing/:id`
  - `/cold-storage` (with a search), `/cold-storage/sagar`
  - `/greenhouse`, `/greenhouse/subsidy`
  - `/jugaad`, `/jugaad/jankari`
  - `/fasal-salah` (with a crop opened)
  - `/sawaal`, one `/sawaal/<slug>` in Hindi and English, one legacy Q&A
  - `/mausam`, `/msp`, `/info`, `/terms`
  - every `/bazaar/*` page, if built
- Deploy the preview (Hard rule 1), and check that every route above returns 200 and that the prerendered HTML contains the page content.

## Report
Write `docs/review/BATCH2_REPORT.md` with these sections:
- What changed, item by item.
- Test counts.
- Geocode coverage.
- The MP PDF outcome.
- The new routes and the slug redirect map.
- Anything not done.
- The preview URL.
- **A 12-point phone checklist for the owner**, in plain Hindi, one line each, including one check done while logged out.

Print the checklist at the end. Update `PROJECT_CONTEXT.md` and `KNOWN_ISSUES.md`.
