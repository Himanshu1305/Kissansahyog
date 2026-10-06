# Kisan Sawaal — demand research & ranking (Phase 12)

**Goal:** find the questions farmers in Sagar / Madhya Pradesh actually ask, and
publish fully-sourced answers for the most-asked ones first.

## Method & data sources

1. **Kisan Call Centre (KCC) query dataset (data.gov.in)** — the richest demand
   signal (actual farmer calls, by crop/season/district).
   - **Status: NOT pulled.** `DATA_GOV_IN_API_KEY` is absent from `.env` (see
     §0.8 / decisions D2, D18), and the KCC resource on data.gov.in requires an
     API key. This is listed as an **owner action** (get a free data.gov.in key,
     then re-rank with the MP / Sagar KCC records and expand the batches).
2. **Existing `kisan_sawaal` rows** (19 published community questions) — real
   questions already asked on the platform, tagged by crop/category. These seed
   the ranking and each now gets a slug + page.
3. **Google autocomplete / People-Also-Ask patterns** (Hindi, Hinglish, English)
   for each crop × problem, e.g. "सोयाबीन पीला मोज़ेक", "गेहूं में रतुआ",
   "चना इल्ली दवा", "टमाटर झुलसा", "pm kisan status", "fasal bima claim kaise",
   "kcc byaj dar", "soil health card". These recur across crops and map onto the
   topics below.
4. **ICAR / KVK advisory calendars** for Sagar / Bundelkhand crops (soybean,
   wheat, gram) — which pests/diseases dominate each season.

## Crops & topics in scope (§12.2)

Crops: soybean, wheat, gram (chana), masoor (lentil), urad, moong, maize, and
vegetables — tomato, onion, garlic, chilli.
Topics: pests, diseases, nutrient deficiency, weeds, seed varieties, sowing time,
irrigation, weather damage, harvesting, storage, mandi/MSP selling, soil testing,
schemes (PM-KISAN, PMFBY, KCC, Soil Health Card), equipment.

## Ranked question set (most-asked first) — published batch 1

All answers follow the fetch-and-quote rule (§0.2(4)): every fact is quoted in
`SOURCES.md` from a source that was actually opened. Answers give cultural →
biological → chemical control in that order, name chemicals/doses only as the
cited source gives them, and always add "लेबल पर लिखी मात्रा ही उपयोग करें".

Published (40 Q&As — see `src/content/qa/*.js`, seeded into `kisan_sawaal`):

**Schemes & practices (15):** PM-KISAN (what it is, eligibility, e-KYC, status
check); PMFBY (cover, premium %, claim & timelines); KCC (what it is, interest,
how to apply); Soil Health Card (what it is, how to test & read); MSP (what it
is, selling at MSP in MP); on-farm grain storage. Sources: official PIB releases,
HP Agriculture Dept, MP e-Uparjan, FAO.

**Soybean (6):** girdle beetle, yellow mosaic virus, sowing time & seed rate,
recommended MP varieties, harvesting/maturity, seed treatment.

**Wheat (5):** yellow (stripe) rust, loose smut, Phalaris minor weed,
recommended MP varieties, [irrigation → deferred, see backlog].

**Maize (3):** fall armyworm, sowing time & seed rate, varieties/hybrids.

**Pulses & vegetables (12):** gram pod borer, chana sowing/varieties; tomato
fruit borer, early & late blight, leaf curl virus, fusarium wilt; onion thrips,
purple blotch, rabi storage; garlic thrips/mite; chilli thrips/sucking-pest IPM,
chilli fruit-rot field sanitation. Sources: ICAR-CRIDA, ICAR Indian Horticulture,
ICAR-DOGR+MANAGE, ICAR-IISR (spices).

## Backlog (ranked) — NOT yet published (no citable source opened, or batch limit)

These are genuinely in-demand but were skipped because an authoritative source
could not be fetched/quoted in this run (expired TLS certs on TNAU/eagri, JS-only
Vikaspedia bodies, image-only PDF pages), or fall in later batches. Per §12.2/§12.5
they are listed here for the owner / next run:

- **Wheat irrigation schedule** — exact CRI-stage timing & day-counts (ICAR-IIWBR
  pocket guide PDF unreadable).
- **Soybean** — stem fly & white grub doses; iron-chlorosis nutrient deficiency.
- **Masoor (lentil)** — rust & wilt, resistant varieties, sowing (dpd.gov.in /
  eagri timed out).
- **Urad & moong** — yellow mosaic virus & YMV-resistant varieties.
- **Wheat sulfosulfuron dose; maize stem borer & storage.**
- **Chilli leaf-curl & thrips chemical doses** (IISR PDF dose pages image-garbled).
- **Weather-damage / unseasonal-rain crop advisories; soil-test interpretation
  by crop; equipment (seed drill, sprayer) how-to.**
- Deeper per-crop coverage toward the 150–300 target once the KCC dataset ranks
  demand.

**Owner actions:** (1) add `DATA_GOV_IN_API_KEY` to `.env` to pull the KCC dataset
and rank the full backlog; (2) a TNAU Agritech mirror or offline ICAR
package-of-practices PDFs would unblock most of the backlog doses.
