# Combined Legal / Agro-Forestry / Availability / Profile — review (2026-09-26)

Covers all eight phases of `docs/COMBINED_LEGAL_AGROFORESTRY_AVAILABILITY_PROFILE_PROMPT.md`.
One migration: `0032_legal_agroforestry_availability_profile.sql`. Content seeded idempotently by
`scripts/seed_agroforestry.mjs`.

---

## Phase 1 — Mandatory rules-compliance checkbox
- **1a Seller (server-enforced):** every listing form (category-agnostic `ListingForm.jsx`) now has a
  required checkbox with the exact prompt wording (`rules_agreement_seller`). Submit is disabled until
  it is checked, AND `create_listing` was redefined with `p_rules_agreed boolean` — it raises
  `rules_not_agreed` if the flag is not true. The prior 11-arg `create_listing` was **dropped**, so
  there is no un-checked bypass path (verified: a raw RPC call without the flag is rejected).
- **1b Buyer (one-time modal):** `BuyerComplianceGate.jsx`, mounted once in `App.jsx`, installs a
  document-level **capture-phase** click interceptor. The first time any user (logged in or anonymous)
  taps any `tel:` or WhatsApp (`wa.me`) link — or any `[data-contact-action]` element — anywhere on the
  platform, it blocks the tap, shows the buyer-adapted statement (`rules_agreement_buyer`) with a single
  accept button, sets `localStorage.ks_buyer_agreed_v1`, and resumes the original tap. Never shown again
  for that browser. This catches every current AND future contact tap-site without per-site edits.
- **1c Terms of Use:** `/terms` already exists, is routed/published, and states plainly that Kisan
  Sahyog is an information/listing platform, does not verify listings, and does not mediate/guarantee
  transactions. Linked from both checkboxes and the homepage footer.

## Phase 2 — Agro Forestry & Horticulture page + intercropping article
- **2a:** `sarkari_yojana` category CHECK extended with `'horticulture'` (migration 0032).
- **2b:** two verified MP schemes seeded (`fal-podharopan-yojana`, `aushadhi-sugandhit-fasal-vistar`),
  `government_level='state'`, `category='horticulture'`, full field structure incl. FAQs. They get full
  pages automatically via the existing `/yojana/:slug` route (verified). No invented figures beyond the
  prompt's stated facts (40–50% / 60:20:20 / 0.25–4 ha; 20–50% + the named crops).
- **2c:** two real, freely-licensed Wikimedia Commons photos self-hosted in
  `public/images/agroforestry/` with `manifest.json`; each was **viewed** before use to confirm the
  subject matches (agroforestry turmeric intercrop; young fruit-sapling orchard). `/credits` extended
  to render this manifest too.
- **2d:** `/agro-forestry` public hub (`AgroForestry.jsx`) with all 7 required sections in order
  (PageExplainer → hero → "आपके क्षेत्र में" South Sagar FDA → 2 scheme cards → article link → WhatsApp
  share → FAQ with FAQPage JSON-LD). Added "एग्रो फॉरेस्ट्री" to the बाज़ार nav dropdown.
- **2e:** the intercropping article (Hindi primary + English) seeded into the `articles` table, reachable
  at `/articles/intercropping-madhya-pradesh` and linked from the hub. `ArticleDetail` enhanced to render
  a direct-answer summary, question-shaped `##` H2s, and **Article + FAQPage JSON-LD** (FAQ derived from
  the question H2s). Author credit line exactly: "लेखक: श्री ए.के. दीक्षित, सेवानिवृत्त वन विभाग अधिकारी".

### 2e — Fact-verification checklist (mandatory)
Every specific factual claim in the intercropping article, with its source. **No fabricated facts**:
where a precise figure could not be firmly verified, the article uses qualitative language ("अधिक कुल
उपज और शुद्ध आय") rather than an invented number.

| # | Claim in the article | Source |
|---|----------------------|--------|
| 1 | Intercropping = growing two or more crops on the same field at the same time in a fixed row ratio; differs from mixed cropping (no fixed rows). | Standard agronomy definition; [tractorkarvan — Intercropping in India](https://tractorkarvan.com/blog/intercropping-system-in-india) |
| 2 | Pigeonpea (arhar) pairs with short-duration legumes: green gram (moong), black gram (urad), soybean, cowpea, groundnut (central/south India). | [ICAR pigeonpea intercropping review (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5982186/); [ResearchGate — pigeonpea-based intercropping](https://www.researchgate.net/publication/354006419_Competition_indices_of_different_pigeonpea_based_intercropping_systems) |
| 3 | Legumes fix atmospheric nitrogen into the soil, benefiting a paired cereal/oilseed and the next crop. | Established soil science; ICAR pulses agronomy (as above) |
| 4 | Land Equivalent Ratio (LER) is often > 1 in intercropping (higher total yield than sole crops grown separately). | [ScienceDirect — soybean/pigeonpea intercropping yield advantage](https://www.sciencedirect.com/science/article/abs/pii/S037842900500122X) |
| 5 | Soybean + pigeonpea is a common, well-tested MP combination; research-institute demonstrations recorded higher total yield and net income than the sole crop (stated qualitatively, not as a specific %). | [ICAR–Indian Institute of Soybean Research, Indore](https://nsai.co.in/storage/app/media/sgbrdi.pdf); ResearchGate (as above) |
| 6 | Pigeonpea + green gram (2:2) and pigeonpea + pearl millet found useful in studies. | [ResearchGate — pigeonpea + green gram](https://www.researchgate.net/publication/319543746_Response_of_pigeonpea_based_intercropping_system_and_weed_management_practices); [Pharma Journal — pigeonpea + pearl millet](https://www.thepharmajournal.com/archives/2023/vol12issue12/PartJ/12-12-62-580.pdf) |
| 7 | Row ratios such as 2:4 are used (illustrative example of fixed-ratio intercropping). | ResearchGate pigeonpea systems (as above) |
| 8 | Agroforestry = trees + crops together; trees on bunds/rows give timber, fodder, fruit, shade, protect soil, add long-term income; early years intercrop turmeric/ginger/pulses between young trees. | ICAR–Central Agroforestry Research Institute (CAFRI), Jhansi (national authority); the self-hosted Commons photo depicts exactly this (turmeric under young trees) |
| 9 | JNKVV (Jabalpur) / KVK are the MP advisory authorities for ratios, spacing, varieties. | JNKVV is MP's state agricultural university (institutional fact) |

Named crops in the two schemes (Amla, Ashwagandha, Bel, Kaliyas, Gudmar, Kalmegh, Safed Musli,
Sarpagandha, Satavar, Tulsi) and all subsidy figures are taken verbatim from the prompt and confirmed
against [myScheme.gov.in – Fal Podharopan Yojana](https://www.myscheme.gov.in/schemes/fpy) and the
[MP Horticulture Department](https://mphorticulture.gov.in/). No additional schemes, percentages, or
deadlines were invented.
