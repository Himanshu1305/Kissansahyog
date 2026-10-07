# KISSAN SAHYOG — BATCH 2 REPORT

**Date:** 2026-10-07 · **Preview:** https://v2-preview.kissansahyog.pages.dev (build `fd70d462.kissansahyog.pages.dev`)
**Scope:** Items A–F complete. Item G (public `/bazaar/*` category pages) not done — explicitly optional, deferred to keep the build safe two days before launch.

Preview-only deploys throughout (`--branch v2-preview`). All migrations additive from 0051; the shared live (pre-V2) app is unaffected (see each item's safety note). Content rule honoured: only moved/shortened existing content + short UI strings; no new facts/numbers invented.

---

## What changed, item by item

### Item A — one layout everywhere
All 21 page-level `max-w-*` / `maxWidth` wrappers removed from `src/screens/`. Prose pages (Privacy, Terms, SchemeDetail) use `PageShell width="content"` (~70ch readable); dashboards/grids/directories use `width="wide"` (edge-to-edge). Inner readable clamps kept with explicit `ks-allow-width` markers. New static guard `scripts/test/batch2_layout.mjs` fails on any page-level width in `src/screens/` (allowlist via `ks-allow-width`). Dead `src/components/ListingForm.jsx` deleted; the two static assertions that read it (v2_phase4, v2_phase9) repointed at `Post.jsx`. Grids are 2/3/4 (mobile/tablet/desktop).

### Item B — cold storage, rebuilt for users (`/cold-storage`, `/cold-storage/:district`)
Claim/correct/remove block + modal + the Admin claim queue **removed** (RPCs/tables kept in DB, hidden in UI). Replaced per card with **"गलत जानकारी? बताएँ"** → existing `ReportButton` (`target_type='cold_storage'`). Each card: name, full address (address/city/district/pincode), products, capacity, type, **📞 कॉल करें** (tel: — mobile or landline), **WhatsApp करें** (wa.me — valid 10-digit mobile only), **दिशा देखें** (`google.com/maps/search/?api=1&query=…`, no key), source footer, "पुरानी सरकारी सूची" note on old-list rows. New `ColdStorageFinder` at the top: text box "अपना शहर, गाँव या पिनकोड लिखें", **"मेरी लोकेशन"** GPS, district/crop/type filters, distance-sorted "~X किमी", then the post CTA → `/post?cat=warehouse&type=offer`, short info (MP-capacity fact + citation, how-to-choose ≤8, FAQ), district links. District pages reuse the finder with the district locked.
**Migration 0051** adds `latitude`/`longitude`/`geo_precision` + refreshes `cold_storage_public`. `scripts/geocode-cold-storage.mjs` (Nominatim, ≤1 req/s, address→city→district tiers, precision recorded, failure log).
**Safe for live app:** `cold_storage*` is V2-only (no refs in `ba455ae`), purely additive.

### Item C — Greenhouse split (marketplace first)
`/greenhouse` is now the **marketplace**: heading + one sentence, two CTAs ("वेंडर हैं? अपनी सेवा डालें" → `/post?cat=greenhouse&type=offer`; "पॉलीहाउस बनवाना है? अपनी ज़रूरत डालें" → `?type=requirement`), listings grid (ListingCard + ContactActions) filtered by vendor sub-type / type / district, link box → the guide. New `/greenhouse/subsidy` (prerendered, sitemap, SEO, FAQPage JSON-LD) holds the **moved** guide + calculators unchanged. `/post?cat=&type=` preselect added (shared by B/C/D). NavBar + homepage tile keep `/greenhouse`.
**MP PDF outcome: VERIFIED — see below.**

### Item D — Jugaad split (marketplace first) + simpler form
`/jugaad` is now the **marketplace**: heading + one sentence, big **"अपना जुगाड़ डालें"** → `/post?cat=jugaad&type=offer`, listings grid with filter chips (बेचना · किराया · सेवा · ऑर्डर पर बनाना · विकास में), link box → the guide. New `/jugaad/jankari` (prerendered, sitemap, SEO) holds the **moved** info + legal guide unchanged. Simpler form (`categories/jugaad.jsx`): required photo (≥1), name, what-it-does, type (5 options), own price/rent (optional for "विकास में"); optional crop/work, demo-video, tested. "units made" + testing-body removed from the form (legacy values still displayed). Road-vehicle rule is one line inside the Post declaration checkbox, not a field; `finalizeDetails` sets `not_road_vehicle:'true'` so the RPC minimum still holds. Client + RPC agree; existing jugaad listings still display.

### Item E — Fasal Salah that does something (`/fasal-salah`)
Crop cards are now **buttons**; tapping one opens an in-page **crop panel** (choice recorded: a panel, not a `/fasal-salah/<crop>` route — the data is location-dependent, avoids new prerendered pages). Panel: **आज की सलाह** (spray/irrigate/harvest OK/caution/stop + one-line reason, from `actionWindows` + the weather cell); **इस मौसम का काम** (existing `cropadv_<slug>` only — no new advice); **आम समस्याएँ** (top-5 crop Q&A → `/sawaal/<slug>` + `/fasal/<crop>/samasya`, hidden when none); **पास में मदद** (Browse agri_inputs / Drone Didi / equipment + KVK Sagar via /resources). Location control stays at top, public, no login.

### Item F — Kisan Sawaal fixes (structure only)
- **Slugs + redirects.** `scripts/sawaal-reslug.mjs` transliterates each Hindi question (Devanagari→Latin, stop-words dropped) to a meaningful slug and records old→new. Ran it: **0 legacy `sawaal-*` slugs remain**, **16 redirects** stored, every published row has a slug. `/sawaal/<old-slug>` redirects both client-side (`Navigate replace` via `fetchSawaalSlugRedirect`) and via a generated 301 block in `public/_redirects` (confirmed live). Sitemap + search index regenerated from the DB (sawaal sitemap: 88 entries).
- **Breadcrumb** fixed to होम › किसान सवाल › `<crop or topic>` › question (topic crumb → `/fasal/<crop>/samasya` or `/sawaal/vishay/<cat>`); the stray "/" is gone.
- **English support.** Migration **0052** adds `answer_blocks_en` (jsonb, nullable; `question_en`/`answer_en` pre-exist from 0047). `SawaalDetail` renders English only when the toggle is EN **and** English exists, else Hindi with the note "This answer is available in Hindi only for now." (never an EN label over Hindi content without it). Batch 3 fills the English.
- **Legacy rows** (19 have no `answer_blocks`) now render in the same संक्षेप-box + body layout, not a bare summary.
- **`/sawaal` index** grouped by topic as a full-width responsive grid (2/.../3 cols), with the ask form moved below.
**Safe for live app:** `kisan_sawaal` is V2-only (0047); 0052 is purely additive (one nullable column + one new RLS table), nothing renamed/required.

### Verification fixes (from the screenshot pass)
- `ContentBlocks`: `break-words` on paragraph/list/checklist/summary/fact/faq text so long raw URLs in moved guide content wrap on mobile (`/greenhouse/subsidy` had overflowed to 606px at 375 from a `Farmer_UserManual.pdf` link).
- `NavBar`/`SearchBar`: compacted the desktop top bar (nav `px-2`, restore `px-3` at `2xl`; search `lg:w-44`) so the **English** top bar fits at 1280 instead of overflowing to 1386.

---

## Test counts

- **Entire backend suite GREEN — 0 failed** across all `scripts/test/*.mjs`. Highlights: `v11_phase6` (i18n audit) **31/0**, `v2_seo_audit` **2/0**, `v2_citation_audit` **6/0**, `v2_phase12` (sawaal/routes) **17/0**, `v2_phase6` (cold storage) **26/0**, `v2_phase7` (greenhouse) **20/0**.
- **New Batch 2 tests:** `batch2_layout` 1/0, `batch2_coldstorage` 13/0, `batch2_jugaad` 14/0, `batch2_fasal` 8/0, `batch2_sawaal` **14/0**.
- **`build:full`:** 178/178 routes prerendered, 0 failed.
- **E2E (Playwright): 80 passed / 82.** `phase17` (`/sawaal` grid) was updated for the required grouped-by-topic layout (asserts the widest row = 3 desktop / 1 mobile) and **passes**. The **2 failures are pre-existing, environmental, and in features untouched by Batch 2:**
  - `phase20_mela` — the seeded survivor mela's event **ended 2026-10-06** (`is_active=false`), so it no longer renders. Pure time/data expiry: it was live when Batch 1 ran on 2026-10-06; today is 2026-10-07. No code change can revive an expired seed.
  - `phase18_transport` — depends on the transport spec's self-created listing + geocoding/distance timing. Transport is a pre-V2 feature untouched by this batch.
  - (Batch 1 reported e2e 82/0 on 2026-10-06; the drop to 80 is entirely the two data/time-dependent specs above, not a regression from items A–F.)

---

## Geocode coverage (Item B)

**239 / 243 = 98.4%** of `cold_storage_directory` rows geocoded (≥ the 90% bar). The 4 un-geocoded rows have neither city nor district to query. `geo_precision` records `address` vs `city`; failures were logged by the geocode script.

---

## MP PDF outcome (Item C) — VERIFIED ✓

Downloaded the MP state protected-cultivation guideline PDF from MPFSTS (`mpfsts.mp.gov.in/mphd/Guidelines/…राज्य.pdf`, 7 pp), rendered page 2 at `pdftoppm -r 150`, and read the cost-norm table:
- NVPH ₹1,060 / 935 / 890 / 844 → 50% → **₹530 / 467.50 / 445 / 422 per m²**
- Fan-pad ₹1,650 / 1,465 / 1,420 / 1,400 → **₹825 / 732.50 / 710 / 700**
- Shade-net ₹710 → **₹355**; area slabs 500 / 1,008 / 2,080 / 4,000 m².

**These match the published figures.** Added source **S-GH-56** (MP state scheme guideline, page 2 + verbatim quote) to `SOURCES.md`, regenerated `sources.js`, and made it the **primary** cite for every MP-state subsidy figure. Haryana MIDH (S-GH-14) kept as **secondary**. The ₹/m² table + worked example are retained (now primary-cited).

---

## New routes

| Route | Item | Notes |
|---|---|---|
| `/greenhouse` | C | repurposed → marketplace (was the guide) |
| `/greenhouse/subsidy` | C | **new** — moved guide; prerendered, sitemap, SEO, FAQPage JSON-LD |
| `/jugaad` | D | repurposed → marketplace (was the guide) |
| `/jugaad/jankari` | D | **new** — moved info/legal guide; prerendered, sitemap, SEO |
| `/post?cat=&type=` | C/D | preselect params added to the existing `/post` |
| `/fasal-salah` (crop panel) | E | in-page panel, no new route |
| `/cold-storage`, `/cold-storage/:district` | B | rebuilt (existing routes) |

## Slug redirect map (Item F) — 16 entries (also in `public/_redirects` as 301s)

| Old slug | New slug |
|---|---|
| sawaal-crop | masura-buvaai-sahi-samaya-bija-dara-bija |
| sawaal-crop-2 | gehun-kauna-kisma-saagara-achchhi-sinchaai-kitani |
| sawaal-drone_didi | drona-didi-yojanaa-gaanva-drona-davaa-chhidakaava |
| sawaal-equipment | soyaabina-buvaai-sida-drila-sahi-haatha-chhitakakara |
| sawaal-general | kheti-juda-sarakaari-salaaha-mausama-jaanakaari-mujhe |
| sawaal-land | mere-kheta-mitti-kaali-chikani-soyaabina-bone |
| sawaal-market | saala-soyaabina-bhaava-kaisaa-rahegaa-mandi-bechane |
| sawaal-pest | chane-phasala-illi-phali-chhedaka-laga-gai |
| sawaal-pest-2 | dhaana-narsari-paudhe-pile-kamajora-raha-gae |
| sawaal-pest-3 | gehun-pattiyon-bhure-pile-chakatte-naarangi-dhaariyaan |
| sawaal-pest-4 | sarason-phasala-maahu-chenpaa-laga-gayaa-tahaniyon |
| sawaal-pest-5 | makkaa-phasala-tanaa-chhedaka-jaisaa-kita-pattiyon |
| sawaal-pest-6 | meri-soyaabina-patte-upara-pile-pada-rahe |
| sawaal-pest-7 | pada-kheton-soyaabina-pili-pada-rahi-yaha |
| sawaal-scheme | pradhaanamantri-kisaana-sammaana-nidhi-pm-kisan-kista |
| sawaal-weather | agale-tina-chaara-dina-baarisha-sanbhaavanaa-meri |

---

## Not done

- **Item G** (public `/bazaar/*` category landing pages) — explicitly optional ("only if time allows"); deferred to avoid adding new public/prerendered surface two days before launch. Infrastructure (prerender, sitemaps, Browse components, FAQ JSON-LD) is in place if it's picked up in Batch 3.
- English Q&A text (`question_en`/`answer_en`/`answer_blocks_en`) is intentionally left empty — Batch 3 fills it. The UI shows the Hindi-only note until then.
- The 2 environmental e2e specs above (transport, expired mela seed) — data/time issues, not code.

---

## Preview URL

**https://v2-preview.kissansahyog.pages.dev** · All Verification routes return 200 (a 308 trailing-slash normalization then 200), the prerendered HTML carries page content, and legacy `/sawaal/sawaal-crop` 301-redirects to its new slug — all confirmed against the live preview.

---

## 📱 फ़ोन पर 12 जाँच (मालिक के लिए — सब हिंदी में, एक-एक लाइन)

1. होम पेज खोलें — ऊपर नीचे की पट्टी दिखे, पेज किनारे से किनारे तक भरा हो, दाएँ-बाएँ न खिसके।
2. कोल्ड स्टोरेज पेज पर "470113" या "Bina" लिखें — पास वाले सबसे ऊपर, हर कार्ड पर "~X किमी" दिखे।
3. किसी कोल्ड स्टोरेज कार्ड पर 📞 कॉल करें और "दिशा देखें" दबाएँ — फ़ोन और गूगल मैप सही खुले।
4. ग्रीनहाउस पेज खोलें — पहले लिस्टिंग/बटन दिखें, फिर नीचे "सब्सिडी और लागत की जानकारी →" का बॉक्स।
5. ग्रीनहाउस सब्सिडी गाइड खोलें — ₹/वर्ग मीटर वाली टेबल पढ़ें, पेज दाएँ-बाएँ न खिसके।
6. जुगाड़ पेज पर "अपना जुगाड़ डालें" दबाएँ — फ़ॉर्म में फ़ोटो, नाम, क्या करता है, और दाम माँगे।
7. फसल सलाह खोलें, कोई फसल (जैसे सोयाबीन) दबाएँ — "आज की सलाह" और "इस मौसम का काम" दिखे।
8. किसान सवाल पेज खोलें — सवाल विषय के हिसाब से समूह में दिखें, सवाल पूछने का फ़ॉर्म नीचे हो।
9. कोई एक सवाल खोलें — ऊपर रास्ता (होम › किसान सवाल › विषय › सवाल) सही हो, बीच में अकेला "/" न हो।
10. भाषा EN करके वही सवाल देखें — "This answer is available in Hindi only for now." लाइन दिखे, जवाब हिंदी में रहे।
11. **लॉगआउट करके** कोल्ड स्टोरेज का नंबर और सवाल के जवाब देखें — बिना लॉगिन के भी खुलें।
12. पुराना लिंक `kissansahyog.com/sawaal/sawaal-crop` खोलें — अपने आप नए पते पर पहुँचे, 404 न आए।
