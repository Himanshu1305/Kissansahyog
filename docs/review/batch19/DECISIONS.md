# Batch 19 - DECISIONS

## Why static pages, not the `yojana` table
The `yojana` table is database content for government schemes and is read live. These pages need a status, an as-of date and per-fact sources that the founder updates by a small code edit, and the work must not touch any database (batch rule). Static pages also prerender and enter the sitemap exactly like Greenhouse/AgroForestry. An admin editor is out of scope (planned later).

## The status model
`status` = `planned | announced | open | closed | unknown` on every scheme page, plus `info` for the breeds page only (it is not a scheme). Used values on 5 Nov 2026: desi cow = planned; Kamdhenu = unknown (portal exists, current opening not confirmed, news only to 2025-26); gaushala = announced (cabinet, Apr 2025, one news source); KCC = open (standing bank facility; limits must be confirmed with the bank); central schemes = unknown (Gokul Mission approval ends 2025-26, continuation not found).
Each page also has `asOf` and `sources[]` (title, url, type OFFICIAL/NEWS/PRIVATE, date). The hub table repeats status/asOf; a test fails if they differ from the detail page.

## How conflicting sources were handled
- KCC limit: leaflet (2023, via summary) Rs 1.6 lakh vs a Feb 2025 government answer Rs 2 lakh. Both are shown, dated, with "confirm with the bank"; no interest rate printed.
- District lists for breeds differ between ETV Bharat and Lalluram: both are shown, attributed.
- Kamdhenu private sites disagree on cost: cost omitted; only "unit of 25 animals / 3.5 acres" kept, labelled "एक वेबसाइट के अनुसार (सरकारी पुष्टि बाकी)".
- Rs 40 crore vs 500 x Rs 900 x 12 = Rs 54 lakh: both shown, gap stated as unexplained; Rs 40 crore is not called the phase 1 cost.
- Newer-than-5-Nov check: nothing found; status stays `planned`.

## Left out because it could not be verified
Official scheme name/department/eligibility/application of the desi cow assistance; Kamdhenu eligibility, documents, loan amount, interest, cost; gaushala conditions and the Zee Business PPP gau-vihar report (HTTP 402); KCC interest rate, MP online fees (Rs 30/100) and Scheme ID; NLM/AHIDF subsidy numbers; Gopal Protsahan (Rs 2 lakh prize) - therefore **not on any page**; Gopal-Krishna Gram award (different scheme); "Mukhyamantri Pragatisheel Pashupalak Protsahan Yojana Rs 10,000-15,000" (title only); the 2022 Rs 900 announcement (relation to 2026 unknown); Nimadi "Gir x Khillari" and Gaolao "Arvi" (single source); the Kenkatha sale price; any milk-yield figure; the mpdah.gov.in re-check (certificate error) and the Gaupalan Board site.
Official DAHD PDFs (KCC leaflet, scheme booklet, AHDF-KCC guidelines) returned 403/404 to our fetch; they were read only through search summaries and are marked "via summary" in FACTS.md.

## Kenkatha spelling
ETV prints "केनथला"; Lalluram, Gaon Connection and the NBAGR 2006 monograph use Kenkatha. Pages use Hindi "केनकथा" with English "Kenkatha". Variant noted on the breeds page.

## Safe-updating checks (tests/unit/pashupalan-19-content.test.mjs)
1. Every page has asOf, seo, h1, answer and >=1 source (URL, type, date); detail status is one of the five (breeds: `info`).
2. Every text item (paragraph, step, FAQ, table row, checklist...) carries `f:[FACTS ids]`; each id must exist as a row in docs/review/batch19/FACTS.md. `GEN` = general preparation, allowed only when the item has no number.
3. Number rule: any item containing a digit (Latin or Devanagari) must carry at least one real FACTS id (GEN alone fails).
4. `planned`/`announced` pages must not contain running-claims ("शुरू हो चुकी/गई", "मिल रहा है", "has started"...) except inside a question or negation. (No source is dated after the claim, so there is no exemption.)
5. Forbidden words: free/निःशुल्क/मुफ़्त/फ्री, पायलट/pilot, under review/समीक्षाधीन, "आपको मिलेगा" (the source name "Free Press Journal" is exempted). No politician named.
6. Hub table status/asOf equal the detail pages; guide logic resolves to real pages; related links are real routes; 5-8 FAQs; word minimums (detail >= 800 Hindi, hub >= 1000, English >= 40%).
Other tests: wiring/SEO/JSON-LD/lazy-chunk/prerender/sitemap/search-index (pashupalan-19-wiring) and the review-doc freshness test (pashupalan-19-review-doc).

## The non-legal note
The standard note ("information is from government portals and news reports; confirm with the block veterinary hospital or the department") is plain informational copy. It is **not lawyer-reviewed**. Existing legal/disclaimer strings were not touched.

## Decided here, not in the prompt
- Search index: `public/search-index.json` is generated from the live database by `scripts/build-search-index.mjs` (needs a service key; barred this batch). I added the seven entries to the script's static hub list (they appear in every real `build:prod`) and tested the script. The founder's locally modified `public/search-index.json` was NOT touched or committed.
- Homepage: no tile (tiles need a photo; "no stock photos"). One pill "पशुपालन" was added to the existing open-to-all strip. Footer link added next to Bazaar. `/yojana` and `/yojana/mp` get a top link; `/yojana/central` does not (state topic).
- Sawaal hub has no topic list (database category chips), so no link added there; every page links to /sawaal.
- Resources/office directory: no veterinary offices are listed in it, so pages link to /resources for helplines only.
- Hub has two extra blocks (how to read the page, safety against cheating) to reach the word minimum with real content; detail pages gained "questions to ask" blocks for the same reason.
- Kendriya page is thin on verified facts: honest word count with the unverified list; no padding with remembered numbers.
- MIN_ROUTES in the ship script raised 270 -> 277 (19) and 277 -> 278 (19-B, the income page). Rollback target = the 17F deployment 8df469ad-2535-44a8-81e9-003dcde97938 (recorded in docs/review/batch17f/evidence/prod-ship/prod-deployment-after.txt; verified live by both dry runs).
- Desktop table is a real `<table>`; below 768 px it is stacked cards.
- `release-18` does not exist, so nothing from it could be missing.

## 19-B (rework after the founder opened the staging preview)
- **Heading:** the closing words of the old hub heading were removed from the hub H1, hub title/description, the related-card label, the search-index entry, JSON-LD (built from the same fields), tests and the generated review files. A test now fails if they come back in any Pashupalan file. The same everyday Hindi phrase exists on unrelated pages of the site (about, bazaar, strings and others); those were not touched. The old Batch 19 browser proof file (docs/review/batch19/evidence/browser/proof.json) still records the old heading; it is dated evidence and was left as it was.
- **Direct links:** the architect's finding was right. Internal links and direct URLs work (checked again, see docs/review/batch19b/evidence/links.json). The real gap was that portals were plain words and links existed only in "Sources". Now a registry (src/content/pashupalan/links.js, home pages only, opened on 5 Nov 2026) feeds (a) inline links wherever a portal is named, (b) a "direct links" panel under the hero with big buttons, (c) whole-card links on the hub. mpdah.gov.in is kept with ok:false: it blocks bots (403) and its certificate had expired on 5 Nov 2026; no deep link was invented.
- **Link checker:** scripts/batch19/check-links.mjs <baseUrl> (GET only; a government site that blocks bots is "blocked-by-site", never a failure).
- **Design:** new shared layout (hero with an original SVG, summary, big-number tiles, known/unknown panels, numbered steps or a calm "not started" card, timeline, callouts, accordion FAQ with the first two open, income block, WhatsApp share). Comparison table replaced by scheme cards on the hub (one visible version). Voice: talk to the farmer, short sentences (test: average Hindi sentence at most 18 words; actual about 11-15), no office words (tested).
- **Income page and numbers:** new page /pashupalan/pashupalan-se-kamai with a milk calculator (pure arithmetic, nothing stored or sent; inputs start empty). Numbers used are only those in FACTS F-I1..F-I8. No official statement was found that livestock income is steadier than crop income, so that sentence is written as general knowledge without a number. The 20th Livestock Census table for Madhya Pradesh could not be opened officially, so no head-count is printed. The 8.91 percent (2023-24) and MPCDF membership figures were seen only as snippets or in one news item and were not used. The 30.87 percent livestock share of agricultural GVA comes from one news report (IANS) and is attributed.
- **Footer:** no new footer link was added because the footer is on every page including the homepage, which must stay byte-identical. The income page is linked from the hub, from every detail page's income block and related cards, and from the search index.
- **Removed repeats:** the generic "how to read a press note" text now lives once, on the hub; pages do not repeat it.
- **Tests:** content checks rewritten around a shared walker (src/content/pashupalan/walk.js); minimums raised to 1,000 Hindi words per page and English at least 60 percent.
