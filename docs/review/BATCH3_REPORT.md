# KISSAN SAHYOG — BATCH 3 REPORT

**Date:** 2026-10-08 · **Preview:** https://v2-preview.kissansahyog.pages.dev (build `bb5f5cef.kissansahyog.pages.dev`)
**Scope:** Items 1–6 + the owner review pack complete. Item 7 (new Q&As) not done — explicitly optional.

Content in natural Hindi (written first) and fresh English. **Words only** — no layout, route, feature
or schema change. The only DB writes were `kisan_sawaal` content rows + the already-migrated additive
columns (`answer_blocks_en`, from Batch-2 migration 0052). `v2_citation_audit` stayed green throughout;
every number, ₹, date, dose, variety, scheme figure and law kept its `cites`. Byline **Team Kissan Sahyog**.

---

## What was rewritten, with word counts (Hindi, before → after)

| Page | Route | Before | After | Target | Notes |
|---|---|---:|---:|---|---|
| Greenhouse guide | `/greenhouse/subsidy` | 3,337 | **1,221** | 1,000–1,500 | 7-section order; NVPH cost-norm→50% table kept with cites; MPFSTS numbered steps; NHB 50%→35% stated separately; Khargone fraud (2 lines); vendor lists by year; 10 FAQs |
| Jugaad guide | `/jugaad/jankari` | 3,172 | **915** | 800–1,200 | what-to-list; help cards (NIF/MVIF/NIDHI-PRAYAS/Seed Fund/MP Startup Policy/CFMTTI Budni); 2 SC cases one line each; patents in 2 lines, no offer of help; soft "how we help" (no named bodies); 8 FAQs |
| Carbon page | `/carbon-credit` | 2,802 | **1,661** | 1,500–2,000 | what-is-it +Sagar example; India examples (PastExampleNote/Calc kept); Sagar/Bundelkhand; for/against 2-col table; red-flag checklist; MP policy options; poll+suggestions unchanged; 10 FAQs |
| Carbon brief | `/carbon-credit/niti-sujhav` | 279 | **282** | 1–2 pages | reworded to match the new main page |
| Cold storage | `/cold-storage` | — | — | — | "how to choose" temperature bullet reworded (उपयुक्त→सही); intro/FAQ confirmed plain |
| Grievance | `/grievance` | — | — | — | passive "भारत द्वारा होता है"→active; long GAC-appeal sentence split |
| Terms / Privacy | `/terms` `/privacy` | — | — | — | draft-disclaimer line simplified; kept the careful non-overclaiming "DPDP की भावना के अनुरूप" |
| UI strings | `strings.js` | — | — | — | swept avoid-list words (सूचीबद्ध, अत्यधिक[non-IMD], हेतु, एवं[non-proper], नवाचार, उपलब्ध कराना); IMD class labels + official ministry/dept/scheme names kept with `ks-style-ok` markers |
| fasal-salah crop lines | `cropadv_*` (9 crops) | — | — | — | reviewed; already plain/short/actionable; urad fixed (हेतु). Literal 3–5-bullet lists deferred (panel renders each as one `<p>` → needs a rendering change, out of "words only"; padding to 5 points would need unsourced facts) |

**Style guide:** `docs/content/STYLE_GUIDE.md` (Hindi-first, आप, ≤22-word sentences, avoid-list, read-aloud test).

## Kisan Sawaal — English coverage

- **58 published Q&As now have full English:** `question_en`, `answer_en` (the संक्षेप, ≤50 words) and
  `answer_blocks_en` (a structural mirror of the Hindi blocks with identical cites). **0 published rows
  missing any English field.** The EN language toggle now renders the English answer (verified on preview).
- A **"संक्षेप में" short answer (≤50 words, Hindi + English)** was added/confirmed on every Q&A.
- The 40 V2 Q&As also got a light Hindi style reword (avoid-words, long sentences) with every
  number/dose/cite preserved — verified that all reused doses exist verbatim in their cited source.

## Legacy Q&As — fixed or unpublished

- **18 of 19 legacy rows rewritten** into the 5-part structure (short → पहचान → क्या करें,
  cultural→biological→chemical → रोकथाम → KVK सागर को कब फ़ोन करें), bilingual, each sourced:
  - **13 reuse the matching V2 cite** (facts pulled from the already-sourced V2 Q&A; doses verified present).
  - **4 are newly fetch-and-quoted** (facts quoted into `SOURCES.md`):
    `S-QAL-01` masoor sowing/seed-rate/treatment (Apni Kheti), `S-QAL-02` paddy nursery N/Zn (TNAU),
    `S-QAL-03` mustard aphid (TNAU), `S-QAL-04` Namo Drone Didi scheme (GovtSchemes.in — PIB 403s to fetch).
  - **1 reworded-general** ("where to get govt advice") — the unsourceable Kisan Call Centre number was dropped.
  - Unsourced legacy facts were removed, not kept: FeSO₄ 0.5% & Carbendazim soybean doses; the
    HI-8498/GW-496/K-9107 & HI-1544/Pusa-Tejas wheat varieties (replaced with the source-named varieties);
    the KCC helpline — each replaced with "KVK सागर से पूछें".
- **1 legacy row unpublished** and listed here for the owner:
  - `saala-soyaabina-bhaava-kaisaa-rahegaa-mandi-bechane` — "what will this year's soybean price be / when
    to sell". A price forecast cannot be sourced. Selling-decision guidance is already covered by the
    published `msp-par-kaise-bechein-mp` and `msp-kya-hai` Q&As. (`is_published=false`.)

## New Q&As added and skipped

- **Item 7 (up to 40 new Q&As) — NOT done** (explicitly optional, "only if time allows"). Items 1–6 +
  the review pack were prioritised for the ~1-day launch window. The pipeline is ready: author
  `docs/research/qa_raw/<batch>.json` (now supports `short_en`/`blocks_en`), run `node scripts/build-qa.mjs`
  then `node --env-file=.env scripts/seed-sawaal.mjs`. QA_DEMAND.md lists the rabi-first backlog
  (wheat, chana, masoor, mustard).
- **New sources added this batch:** S-QAL-01..04 (above), quoted into `SOURCES.md`; `sources.js` regenerated
  (218 sources) and in sync (citation audit check 5 green).

## Style-test results (`scripts/test/batch3_style.mjs`)

- **Avoid-list scan: PASS** — no avoid-list word in any Hindi in `src/content/**` or `strings.js`
  (official IMD class labels, ministry/department/fund/order names, and one search keyword carry
  `ks-style-ok` markers with reasons).
- **Sentence length: PASS** — no content page averages > 18 words/sentence. Averages dropped markedly:
  greenhouse 15.8→11.7, carbon 15.2→13.6, jugaad 16.1→12.3, carbon-brief 13.9→14.0, cold-storage 12.3,
  grievance 10.9.

## Verification (all green unless noted)

- `v2_citation_audit` **6/0**, `v2_seo_audit` **2/0** (178 prerendered, titles/meta within limits & unique),
  `v11_phase6` i18n **31/0**, `v2_phase12` sawaal **17/0**, `batch3_style` **2/0**.
- **Full backend suite: 0 suites failing.** The three page suites were updated per prompt rule 9 to assert
  the Batch-3 spec (the old `≥20/≥15 FAQs` and `≥2500 tokens` asserts contradicted this batch's own
  "up to 10/8 FAQs" + shorter-page targets; carbon's `≥5 fact-blocks` → `≥5 cited blocks` since facts moved
  into cited paragraphs/table/calc; jugaad's soft-help marker updated after the avoid-word "प्रस्तुत" was
  removed). Each change + reason is in `BATCH3_PROGRESS.md`.
- `build:full`: **173/173 routes prerendered, 0 failed**; sitemaps pages 37 / sawaal 83 / cold-storage 35 / schemes 18.
- **E2E (Playwright): 79 passed / 82.** The 3 failures are pre-existing and in features Batch 3 did not touch:
  - `phase18_transport`, `phase20_mela` — the documented environmental/time-expiry failures carried from Batch 2.
  - `phase6` (land "mark Found") — expects exactly 1 land card in browse but the **dummy seed** (migration 0014,
    seeded 2026-09-30) has 2 land listings within the test account's 30 km. Pure test-data/distance sensitivity
    in a pre-V2 feature; Batch 3 changed no listing code or data. Shared seed data was deliberately not deleted
    (PROJECT_CONTEXT §14 says keep it until there are enough real listings).
- **Screenshots:** 32 shots at 375×812 + 1280×800 in `docs/review/shots-batch3/` (`scripts/shots-batch3.mjs`) —
  **no horizontal-scroll or missing-nav warnings.** Spot-checked: greenhouse cost table, carbon for/against
  table + poll, and the Q&A English toggle ("In brief" box) all render well.
- **Preview deploy:** `/greenhouse/subsidy`, `/carbon-credit`, `/jugaad/jankari`, `/grievance`, `/cold-storage`,
  `/carbon-credit/niti-sujhav` all return **HTTP 200** and the prerendered HTML carries the new Batch-3 text (verified).

## Live-app safety

Every DB write was to `kisan_sawaal` (a V2-only table, added in 0047) — content rows plus the additive
`answer_blocks_en` column (0052, already applied). No column renamed or made newly required; no RPC
signature changed. The old (pre-V2) live app has no Q&A feature, so it is unaffected. No new migration in
this batch.

## Preview URL

**https://v2-preview.kissansahyog.pages.dev** (build `bb5f5cef`).

---

## 📱 फ़ोन पर 8 जाँच (मालिक के लिए — सब हिंदी में)

1. ग्रीनहाउस गाइड खोलें (/greenhouse/subsidy) — ऊपर "क्या पॉलीहाउस आपके लिए सही है?" की 6-सवाल सूची,
   फिर ₹/वर्ग मीटर वाली सब्सिडी टेबल दिखे; पेज छोटा और पढ़ने लायक लगे।
2. किसान सवाल खोलें (/sawaal) — कोई सवाल दबाएँ, ऊपर हरे बॉक्स में "संक्षेप में" छोटा जवाब दिखे।
3. वही सवाल खोलकर ऊपर **EN** दबाएँ — अब पूरा जवाब अंग्रेज़ी में दिखे (हिंदी-only वाली लाइन न दिखे)।
4. कोई पुराना सवाल खोलें (गेहूं रतुआ / चना इल्ली) — जवाब अब क्रम में हो: पहचान → क्या करें → रोकथाम → KVK।
   हर दवा के साथ "लेबल पर लिखी मात्रा ही उपयोग करें" लिखा हो।
5. जुगाड़ गाइड खोलें (/jugaad/jankari) — भाषा सीधी लगे; "सड़क पर चलने वाले वाहन नहीं" वाली बात साफ़ दिखे।
6. कार्बन पेज खोलें (/carbon-credit) — "पक्ष और विपक्ष" की दो-कॉलम टेबल और सबसे नीचे वोट/सुझाव बॉक्स दिखें।
7. शिकायत पेज (/grievance) और शर्तें (/terms) पढ़ें — भाषा आसान लगे, कहीं "सरकारी सर्कुलर" जैसी भारी न हो।
8. हर पेज मोबाइल पर दाएँ-बाएँ न खिसके; टेबल और सूचियाँ ठीक दिखें। जहाँ कोई शब्द किताबी लगे, वह लाइन लिख भेजें।
