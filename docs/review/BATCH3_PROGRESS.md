# BATCH 3 — Progress checklist

Content in natural Hindi + English. **Preview only.** No layout/route/feature/schema
changes (Q&A content rows + additive columns only). Commit after every item
(`Batch3 item N: …`). Report only after items 1–6 + the review pack. Resume from the
first unticked item.

Rules kept in view: facts only from SOURCES.md/sources.js, keep every `cites`;
`v2_citation_audit` stays green; §0.7 / do-not-publish lists apply; byline
**Team Kissan Sahyog**; live app must keep working (additive DB only).

- [x] **Foundation** — `docs/content/STYLE_GUIDE.md`, `scripts/test/batch3_style.mjs`
      (avoid-list scan + per-page sentence length, fail > 18 avg), this progress file.
- [x] **Item 1** — Style guide written. `strings.js` swept: removed सूचीबद्ध/अत्यधिक(non-IMD)/हेतु/
      एवं(non-proper-name)/नवाचार; IMD class labels (अत्यधिक भारी, imd_red, imd_tip, advice_extreme)
      and the official ministry/dept/scheme names kept with `// ks-style-ok` markers. `agroforestry.js`
      + `boxRegistry.js` cleaned (official names marked). strings.js + agroforestry + boxRegistry are
      avoid-word clean. v11_phase6 31/0, v2_seo_audit 2/0, v2_citation_audit 6/0 green. Remaining
      avoid-word hits live only in the big pages (greenhouse/carbon/jugaad → items 3/4/5), cold-storage
      (item 6) and the Q&A seeds (item 2); the style test goes fully green as those items complete.
      Judgement: a full stiffness re-read of all 217 KB of strings is impractical; the concrete
      avoid-list criterion + the already-<18 sentence average are the gate used for the UI sweep.
- [x] **Item 2** — Kisan Sawaal. Pipeline extended: `build-qa.mjs` now carries `short_en`/`blocks_en`/
      `unpublish`; `seed-sawaal.mjs` now writes `question_en`, `answer_en` (संक्षेप EN), `answer_blocks_en`,
      and sets `is_published=false` for unpublish rows. **All 40 V2 Q&As** got `short_en` + `blocks_en`
      (English mirror, identical cites) + a light Hindi style reword (avoid words, long sentences) with
      every number/dose/cite preserved — verified. **19 legacy rows** authored into
      `docs/research/qa_raw/legacy.json` in the 5-part structure (short/पहचान/क्या करें
      cultural→bio→chem/रोकथाम/KVK), bilingual, each sourced: 13 reuse the matching V2 cites (doses verified
      to exist verbatim in the cited source), 4 fetch-and-quoted new sources **S-QAL-01** masoor (Apni Kheti),
      **S-QAL-02** paddy nursery (TNAU), **S-QAL-03** mustard aphid (TNAU), **S-QAL-04** Namo Drone Didi
      (GovtSchemes.in — PIB 403s to fetch), 1 reworded-general (dropped the unsourceable Kisan Call Centre
      number), **1 unpublished**: `saala-soyaabina-bhaava-kaisaa-rahegaa-mandi-bechane` (price forecast cannot
      be sourced; selling advice covered by msp-* Q&As). Re-seeded: **58 published**, 0 missing question_en/
      answer_en/answer_blocks_en/answer_blocks; संक्षेप ≤50 words (hi+en) everywhere. v2_citation_audit 6/0;
      Q&A seeds avoid-word clean. Safe for live app: only kisan_sawaal (V2-only) touched, content rows +
      already-migrated additive columns (0052 answer_blocks_en), nothing renamed/required.
      Judgement: unsourced legacy doses (FeSO4 0.5%, Carbendazim, HI-8498/GW-496/K-9107 varieties, the KCC
      helpline) were dropped and replaced with "KVK सागर से पूछें", per the no-unsourced-fact rule.
- [ ] **Item 3** — Greenhouse guide `/greenhouse/subsidy` (1,000–1,500 Hindi words).
- [ ] **Item 4** — Jugaad guide `/jugaad/jankari` (800–1,200 Hindi words).
- [ ] **Item 5** — Carbon credit `/carbon-credit` + brief `/carbon-credit/niti-sujhav`
      (1,500–2,000 Hindi words).
- [ ] **Item 6** — Smaller pages: cold-storage, fasal-salah crop lines, homepage hero/intros,
      grievance, Terms, Privacy, greenhouse/jugaad/bazaar intros.
- [ ] **Owner review pack** — `docs/review/CONTENT_FOR_REVIEW.md`.
- [ ] **Verification** — citation/seo/i18n/backend/e2e/build:full all green; style test;
      screenshots 375×812 + 1280×800; preview deploy + route 200 + prerendered text checks.
- [ ] **Report** — `docs/review/BATCH3_REPORT.md`.
- [ ] **Item 7 (optional)** — new Q&As from QA_DEMAND.md.

## Baseline (before Batch 3)
- Published kisan_sawaal rows: **59** (40 V2 + 19 legacy). Legacy (no answer_blocks): 19.
  Missing question_en: 16; missing answer_en: 56; missing answer_blocks_en: 59.
- Content pages (Hindi avg / max words per sentence): carbon-brief 13.9/24,
  carbon-credit 15.2/49, cold-storage 12.3/32, greenhouse 15.8/66, grievance 10.9/38,
  jugaad 16.1/51. (Avg already < 18; the max values are the stiff sentences to break up.)
- Avoid-word hits at start: strings.js 15; content pages ~20; qa seeds ~9; agroforestry 3.

## Judgement calls / notes
- (recorded as work proceeds)
