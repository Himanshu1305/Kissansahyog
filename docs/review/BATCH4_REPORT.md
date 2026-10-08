# KISSAN SAHYOG — BATCH 4 REPORT

**Date:** 2026-10-08 · **Preview:** https://v2-preview.kissansahyog.pages.dev (build `5013e32a`)
**Scope:** Items B, C, D, E, F + the owner review pack complete; item A at **61 new published Q&As**
(gate 60 cleared; aim 80 not reached — see below). Items G + H done. Production untouched
(only `--branch v2-preview` deploy used).

## Deferred items
**None.** Every item was done within rules 1/5/6 (no migration needed anywhere; no existing
data deleted or edited; preview-only deploy). Item A's **aim of 80** was not reached (stopped
at 61); this is not a deferral — the gate is 60 and sources are not exhausted (see item A).

---

## What changed, item by item (with counts)

### B — full natural-Hindi pass on UI strings + homepage
- New guard `scripts/test/batch4_ui_style.mjs`: avoid-list on UI strings; **reports every Hindi UI
  string over 15 words** (66 at start); **FAILs on any Hindi sentence over 25 words** except
  `ks-style-ok` legal (a sentence-based gate matching the ≤22-word/sentence style rule, so
  legitimately-multi-sentence help cards are not gutted — recorded in the progress file); and a
  **placeholder / HTML-tag / key-set diff vs the pre-batch commit `617f9a6`** (fails on any drift).
- **18 Hindi strings + 14 English strings rewritten** across the most-visible surfaces (homepage
  `near_title`, `tagline`, `loading`, `welcome_intro`, `resources_subtitle`, `car_welcome_sub`,
  `no_my_listings`, `mela_none`, `err_pincode_not_found`, `err_report_rate_limited`,
  `err_self_declaration_required`, `kisan_interest_*`, `cal_owner_hint`, `mausam_explain_4`,
  `sawaal_sub`, …). **3 run-on sentences fixed** (`agro_explain_1`, `agro_region_body2`, `dd_intro`);
  `rules_agreement_buyer` marked legal.
- Honest finding: the core homepage/nav/help/consent strings were **already natural** (Batch 3) —
  reviewed and kept (quality over count; we did not churn good strings).
- `UI_STRINGS_REVIEW.md` written for the owner's Hindi reader (40 visible strings before→after, 5 flagged).
- Keys total **1,671 → ~1,690** (only additions; no key removed/renamed — guard-enforced).

### F — agri_inputs wide-visibility opt-in (kept 30 km default)
- **Mechanism found & reused (no migration):** per-listing `wide_visibility` boolean
  (migration 0025); `create_listing` RPC param `p_wide_visibility boolean default false`; server
  guard (latest RPC 0050) allows wide only for `bhusa, agri_inputs, warehouse, greenhouse`. JS
  policy in `src/lib/distance.js` (`RADIUS_KM=30`, `FALLBACK_RADIUS_KM=50`, `WIDE_RADIUS_KM=100`,
  `partitionByRadius`/`isWideVisible`). **Nothing is wide-by-default** — it is always a per-listing
  opt-in; agri_inputs already defaults to 30 km. Rule 5 satisfied (additive storage already exists).
- The step-3 toggle **already existed**, off by default. Added this batch: concrete wording
  **"100 किमी तक के किसानों को दिखाएँ"** + helper **"ज़्यादा किसानों तक पहुँचेगा…"**; a
  **vendor-stronger variant** shown when the poster is a vendor (still off by default); a **"100 किमी
  तक दिखेगा" badge** on the listing page and the post-success screen.
- Test `scripts/test/batch4_wide_visibility.mjs` (8/0): posts a real agri_inputs listing via RPC with
  wide ON (visible at ~60 km) and OFF (hidden), teardown by exact id, `[B4-TEST]` prefix. `p_0025` 44/0.

### A — new Kisan Sawaal Q&As
- **Published Q&As: 58 → 119 = 61 NEW** (count from DB `select count(*) … is_published and slug not null`,
  before and after). Gate of 60 cleared.
- All 61 are from the **Madhya Pradesh Agriculture Department** (`mpkrishi.mp.gov.in`) crop capsule
  pages — ideal Central-Zone/MP regional fit — with **verbatim quotes** in `SOURCES.md`
  (`S-QBR-01`…`S-QBR-11`) and `cites` on every fact. Every chemical dose carries
  **"लेबल पर लिखी मात्रा ही उपयोग करें"**. Byline **Team Kissan Sahyog**.
- Coverage (crop — count): wheat 5, chana 3, masoor 7, mustard 6, linseed 4, pea 6, garlic 5,
  sunflower 4, sugarcane 6, moong 8, urad 7 (sowing-time, seed-rate, varieties, fertiliser,
  seed-treatment, irrigation, and key pests/diseases per crop). No duplicate of the 58 existing
  (slugs + questions checked).
- New fact-check `scripts/test/batch4_qa_facts.mjs` (**61/0**): extracts every number/dose/₹/date/variety
  token from the Hindi **and** English answer and fails unless it appears in a cited quote; normalises
  Devanagari/ASCII digits, ₹, क्विंटल, ranges (variety names validated by their digit core, since the
  MP source prints them in Devanagari). Run green before every seed.
- `QA_NEW_FOR_REVIEW.md` written (61 rows: title, route, short Hindi, least-sure sentence).
- **Aim of 80 not reached (stopped at 61).** Sources are **not exhausted** — the MP capsule series has
  more crops (e.g. a potato/berseem/coriander/barley page 404'd under the names tried; ICAR-IIWBR
  `icar.gov.in` refused the connection). The remaining ~19 toward 80 are a straightforward continuation
  (more MP crop pages + soybean storage/selling + schemes/finance deep-dives) for a follow-up run.

### C — Fasal Salah 3–5 bullets per crop
- The crop panel's "इस मौसम में क्या करें" now renders each `cropadv_<slug>` text **split into 3–5 short
  bullet points** (rendering-only change; no new facts, no padding). A **"पूरा जवाब पढ़ें →" link** to the
  crop's top related Q&A sits under the bullets.
- All four rabi crops present and each yields exactly **3 bullets** (wheat, chana, masoor, mustard).
- `scripts/test/batch2_fasal.mjs` extended (bullet list, read-full link, 3–5 per rabi crop) — 14/0.

### E — voice search
- **Audit:** voice search **already existed and works** — `VoiceSearchButton` is wired into the NavBar
  `SearchBar`, the `/search` page and `/sawaal`; `functions/transcribe.js` is a same-origin Gemini
  fallback with a DB-backed per-IP rate limit (20/hour) and an 18 MB size cap; Web Speech API is the
  primary path. Gaps were closed, not rebuilt.
- **Built this batch:** (1) an **Origin/Referer allow-list** on `/transcribe` — accepts only
  `kissansahyog.com`, `www.kissansahyog.com`, `*.kissansahyog.pages.dev` and `localhost/127.0.0.1`
  (rejects cross-site POSTs with 403 before any key/quota work; the same-origin caller — new app and old
  `ba455ae` app — is unaffected). (2) `cleanTranscript()` + a unit test. (3) Mic bumped to **44 px**.
  (4) An **offline** message + `navigator.onLine` guard. (5) A **Privacy line** (hi+en): voice is used
  only to search and is never saved, **and the phone/browser's own speech service (e.g. Google/Apple)
  may process it** — does not claim voice never leaves the phone.
- Tests: `scripts/test/batch4_voice.mjs` (23/0 — clean-up unit + guard/privacy static); e2e `phase19`
  **permission-denied path added** (6/6). Real-device voice testing (Android Chrome, iPhone Safari)
  is for the owner.
- **Could not be tested on preview:** the Cloudflare **preview** environment has **no `GEMINI_API_KEY`**,
  so the MediaRecorder→/transcribe fallback path cannot run there. We did **not** set any secret.
  Web Speech (Chrome/Android) works without a key. **Owner action:** add `GEMINI_API_KEY` in the
  preview environment to test the fallback.

### D — public category landing pages `/bazaar/*`
- **7 routes added:** `/bazaar` (hub) + `/bazaar/{equipment,labor,bhusa,agri-inputs,transport,land}`
  (land last). The hub **links to** the four dedicated pages (cold-storage, greenhouse, jugaad,
  drone-didi) rather than duplicating them.
- Each landing page: H1 + 2–3 line intro, "यहाँ क्या मिलेगा", 3-step "कैसे काम करता है" + the
  connect-only note, **two big buttons** (Search → `/browse?cat=`, Post → `/post?cat=&type=offer`),
  3–5 FAQs, and **≥250 words of category-specific Hindi + a separately-written English version**
  (no template-with-name-swapped; no unsourced agronomic/legal facts — marketplace-usage text only).
- SEO: unique `<title>`/meta, canonical, **BreadcrumbList + FAQPage JSON-LD**, footer link, added to the
  sitemap and prerender list. `v2_seo_audit` **2/0**; `build:full` **249/249 prerendered, 0 failed**;
  sitemap pages 37→**44**, sawaal 83→**152**. Test `scripts/test/batch4_bazaar.mjs` **58/0**.

### G — suspected stray/test listings (read-only)
- `STRAY_LISTINGS.md`: **no stray/test listings found** (pattern match, test-account, rapid-duplicate
  checks all zero). 6 real listings (listed), 65 sample `is_test_data` rows intentionally kept. Nothing
  deleted or edited; no phone numbers printed.

### H — stabilise the 3 failing e2e specs
- `phase18_transport`, `phase20_mela` (merged-away redirect) and `phase6` are now **independent of seed
  data**: each creates exactly what it needs, asserts tolerantly, and **cleans up by its own ids** in
  teardown. No seed data was deleted or changed. All pass.

---

## Voice-search findings (summary)
Existed and worked (Web Speech primary + Gemini fallback, rate-limit, size cap, aria-live states,
error messages). Built: Origin allow-list, transcript clean-up, 44 px mic, offline message, Privacy
line, denied-path e2e. Could not test the fallback on preview (no `GEMINI_API_KEY` there — owner adds it).

## agri_inputs mechanism reused + how wide visibility behaves
Per-listing `wide_visibility` boolean (default false), opt-in on step 3, eligible categories enforced
server-side. Default stays **30 km**; when the toggle is on, an agri_inputs listing is visible out to
**100 km** (`partitionByRadius`). A "100 किमी तक दिखेगा" badge marks wide listings. No schema change.

## Test counts (before → after)
- **E2E (Playwright): 79/82 → 83/83.** The 3 known failures (`phase18_transport`, `phase20_mela`,
  `phase6`) are fixed by item H; one selector was updated for a reworded item-B string (`phase2`,
  rule 9). No assertion weakened.
- **Backend/audits (all green):** `v2_citation_audit` 6/0 · `v2_seo_audit` 2/0 · `v11_phase6` 31/0 ·
  `v2_phase12` 17/0 · `batch3_style` 2/0 · `batch4_ui_style` 4/0 · `batch4_qa_facts` 61/0 ·
  `batch4_wide_visibility` 8/0 · `batch4_voice` 23/0 · `batch4_bazaar` 58/0 · `batch2_fasal` 14/0 ·
  `p_0025_visibility` 44/0.
- `build:full`: **249/249 routes prerendered, 0 failed**; sitemaps pages 44 / sawaal 152 / cold-storage 35 / schemes 18.
- Screenshots: 26 files in `docs/review/shots-batch4/` (375×812 + 1280×800). No horizontal-scroll/nav
  warnings except a 2 px cosmetic artifact on one desktop Q&A shot.

## Not done / follow-up (owner)
- **Q&As toward the aim of 80:** 61 published; ~19 more are a simple continuation (sources not exhausted).
- **Voice fallback on preview:** add `GEMINI_API_KEY` to the preview environment to test the Safari path.
- Real-device voice testing (Android Chrome / iPhone Safari) is owner-side.

## Preview URL
**https://v2-preview.kissansahyog.pages.dev** (build `5013e32a`). New routes return HTTP 200 and the
prerendered HTML carries the new text (verified: `/bazaar/equipment` H1 + FAQPage JSON-LD; the wheat
sowing Q&A). Production unchanged.

---

## 📱 फ़ोन पर 10 जाँच (मालिक के लिए — सब हिंदी में)

1. होम पेज खोलें — ऊपर "सीताराम 🙏" दिखे (लॉगिन हो तो नाम के साथ); हीरो में "आज किसान के लिए" और नीचे
   "आपके आसपास क्या मिल रहा है?" दिखे। पेज दाएँ-बाएँ न खिसके।
2. फसल सलाह (/fasal-salah) खोलें — गेहूं दबाएँ। "इस मौसम में क्या करें" अब 3 छोटे बुलेट पॉइंट में दिखे,
   और नीचे "पूरा जवाब पढ़ें →" लिंक हो। सोयाबीन पर भी यही जाँचें।
3. कोई सामान डालें (पोस्ट) — श्रेणी "बीज, खाद व दवा" (agri_inputs) चुनकर तीसरे स्टेप तक जाएँ।
   "100 किमी तक के किसानों को दिखाएँ" टॉगल दिखे — डिफ़ॉल्ट रूप से बंद। चालू करके देखें।
4. ऊपर खोज बॉक्स में माइक 🎤 दिखे — दबाकर हिंदी में बोलें ("गेहूं का भाव")। बोली गई बात खोज बॉक्स में
   भर जाए और नतीजे दिखें। (iPhone पर पहली बार माइक की अनुमति माँगे तो दें।)
5. /bazaar खोलें — "किसान सहयोग बाज़ार" और श्रेणियों के कार्ड दिखें। किसी कार्ड (जैसे मशीनें या ज़मीन)
   पर जाएँ — H1, "यहाँ क्या मिलेगा", "कैसे काम करता है" और दो बड़े बटन (खोजें / डालें) दिखें।
6. एक नया सवाल खोलें — किसान सवाल (/sawaal) में "गेहूं की बुवाई का सही समय" खोलें। जवाब क्रम में हो
   और हर दवा के साथ "लेबल पर लिखी मात्रा ही उपयोग करें" लिखा हो।
7. वही या कोई नया सवाल खोलकर ऊपर **EN** दबाएँ — पूरा जवाब अंग्रेज़ी में दिखे (जैसे मूंग का पीला मोज़ेक)।
8. किसी agri_inputs या भूसा लिस्टिंग पर "100 किमी तक दिखेगा" बैज तब दिखे जब वह wide पर डाली गई हो।
9. फुटर में "बाज़ार" लिंक दिखे और /bazaar पर ले जाए। गोपनीयता पेज (/privacy) में "आवाज़ से खोज" वाली
   लाइन पढ़ें — साफ़ लिखा हो कि आवाज़ सेव नहीं होती और फ़ोन/ब्राउज़र की सेवा (Google/Apple) उसे प्रोसेस कर सकती है।
10. **लॉग आउट** होकर /bazaar, कोई लैंडिंग पेज और कोई नया सवाल खोलें — बिना लॉगिन सब खुलें और पढ़ने लायक हों।
    जहाँ कोई शब्द किताबी या अटपटा लगे, वह लाइन लिख भेजें।
