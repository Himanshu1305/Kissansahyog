# Kisan Sahyog — Legal Checkbox, Agro Forestry + Article, Availability System, Admin Dashboard, किसान प्रोफाइल, PWA Banner

DO NOT ask for approval or questions. Decide and proceed. Read PROJECT_CONTEXT.md and KNOWN_ISSUES.md first.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy only after the final Phase passes:** `npm run build && npx wrangler pages deploy dist --project-name kissansahyog`

**One migration file for everything in this prompt** — use the next available number, check the migrations folder first. **Commit after every phase** (this is a large prompt; if interrupted, a fresh session should check `git log` and resume from the first phase without a commit, not restart from Phase 1).

**Explicitly excluded from this prompt** (do not build):
- **Vegetable category** — waiting on the owner's list of specific vegetables.
- **Actual WhatsApp message sending** — the Business API is not yet obtained. `alert_subscriptions` capture (built earlier) is untouched. Any "nudge" logic in this prompt uses in-app notifications, not WhatsApp, and must be built so it can be pointed at WhatsApp later with no restructuring.

---

## Phase 1 — Mandatory rules-compliance checkbox

**1a. Seller side.** On every listing creation form (all categories), add a required checkbox before submission is allowed:
"मैं सभी लागू नियमों और कानूनों का पालन करने के लिए सहमत हूं। किसी भी उल्लंघन की स्थिति में मैं स्वयं ज़िम्मेदार हूँगा/हूँगी। मैं समझता/समझती हूं कि किसान सहयोग लेन-देन का हिस्सा नहीं है और लिस्टिंग की पुष्टि नहीं करता।"
Enforce server-side (RPC rejects listing creation without this flag set true), not just a disabled submit button.

**1b. Buyer/contact side.** Since browsing and contacting a lister does not require an account, there is no natural form to attach this to. Implement a one-time modal shown the FIRST time any user (logged in or anonymous, tracked via a cookie/localStorage flag) taps any "WhatsApp" or "Call" contact button anywhere on the platform: the same rules-compliance statement adapted for a buyer/contact perspective, with a single "मैं सहमत हूं और आगे बढ़ता/बढ़ती हूं" button. Once accepted, do not show again for that browser (localStorage flag), and let the original tap action (opening WhatsApp/dialing) proceed immediately after acceptance.

**1c.** Add a real, published Terms of Use page if one does not already exist, linked from both checkboxes and the footer, stating plainly that Kisan Sahyog is an information/listing platform, does not verify listings, does not mediate or guarantee transactions, and that users are responsible for their own dealings — consistent with the checkbox wording above.

---

## Phase 2 — Agro Forestry & Horticulture page + intercropping article

### 2a. Schema

Check `sarkari_yojana`'s `category` CHECK constraint (existing values: `'income_support', 'crop_insurance', 'credit', 'equipment', 'solar', 'storage', 'women', 'general'`). Add `'horticulture'`.

### 2b. Seed two real, verified MP schemes

Insert as new `sarkari_yojana` rows, `government_level = 'state'`, `category = 'horticulture'`, following the exact field structure already used for existing scheme rows (slug, names, ministry, description, benefit, eligibility, how_to_apply, documents_required, source_url, faqs jsonb, last_verified_date = today):

- **Fal Podharopan Yojana** (slug: `fal-podharopan-yojana`) — Horticulture and Food Processing Department, Govt of MP. 40-50% subsidy on fruit sapling planting cost, disbursed over 3 years in a 60:20:20 ratio, for land areas of 0.25 to 4 hectares. Source: myScheme.gov.in.
- **Aushadhi Avam Sugandhit Fasal Shetra Vistar** (slug: `aushadhi-sugandhit-fasal-vistar`) — same department. 20-50% subsidy for expanding cultivation of medicinal/aromatic crops: Amla, Ashwagandha, Bel, Kaliyas, Gudmar, Kalmegh, Safed Musli, Sarpagandha, Satavar, Tulsi. Source: myScheme.gov.in.

**Do not invent additional schemes, percentages, or deadlines beyond what is stated here.** These two rows automatically get full scheme pages via the existing `/yojana/:slug` infrastructure — verify this works, no new page component needed for them individually.

### 2c. Imagery

Source 2-3 real, freely-licensed images (Wikimedia Commons or similar) — an agroforestry/intercropping scene and a horticulture/fruit-sapling scene, India-context preferred. **View each image before use** to confirm it genuinely matches its description — no AI-generated images, no mismatched subjects. Self-host in `public/images/agroforestry/` with a `manifest.json` entry matching the existing `/credits` page pattern.

### 2d. `/agro-forestry` hub page

Public, no login. Add "एग्रो फॉरेस्ट्री" to the बाज़ार nav dropdown (same precedent as the existing "फसल सलाह" entry). Sections, in order:
1. PageExplainer ("यह पेज किस लिए है") — same pattern as `/mausam`/`/msp`.
2. Hero band — sourced image + plain-Hindi explanation of what agroforestry/intercropping means and why it helps (general, accurate statements only).
3. "आपके क्षेत्र में" — South Sagar Forest Development Agency named as the local forest agency covering Sagar (sourced from the MP Forest Department FDA document already verified in prior research), one sentence on what FDAs generally do.
4. "सरकारी योजनाएं" — two scheme cards (reuse existing component) linking to the pages from 2b.
5. Link to the full intercropping article (2e) — replaces any placeholder text, since the article is being written in this same prompt.
6. WhatsApp share button (existing pattern).
7. FAQ (4-5 questions, sourced only from 2b's verified content) with FAQPage JSON-LD.

### 2e. The intercropping article

Write a genuinely well-researched, original article on intercropping in the Indian/Madhya Pradesh context — this is a real content deliverable, not filler. **Write it in Hindi as the primary language, matching every other page on this platform** (with an English version through the same bilingual fields the existing articles table already uses, if it has them — check the existing articles schema first). Do not default to English because the source research material is mostly in English — translate and localize the actual content into plain, accessible Hindi, same register as the rest of the site.

Requirements:

- **Research first.** Web search for real, current information on intercropping systems relevant to MP (crop combinations, spacing, benefits — soil health, income diversification, risk reduction), drawing on agricultural university (ICAR, JNKVV) and government extension sources where possible. Use the MP-specific academic reference already found in prior research (agroforestry practices in MP, tree-crop combinations like Acacia nilotica with rice) as one input, not the only one.
- **Original writing, properly cited, no copyright violations.** Paraphrase throughout; any quotation under 15 words, one quote maximum per source; no reproduction of substantial passages from any single source. This is a new article, not a compilation of others' text.
- **Structure for SEO/AEO** (same discipline as the scheme pages): a clear H1, a 40-100 word direct-answer summary immediately below it, question-shaped H2s ("इंटरक्रॉपिंग क्या है?", "कौन सी फसलें साथ में लगाई जा सकती हैं?", "इसके क्या फायदे हैं?", "मध्यप्रदेश में कौन से संयोजन उपयुक्त हैं?"), a sources/references section at the end, and FAQPage + Article JSON-LD schema.
- **Author credit — one line only, nothing more:** "लेखक: श्री ए.के. दीक्षित, सेवानिवृत्त वन विभाग अधिकारी" placed prominently near the top or bottom of the article. Do NOT add any further biographical content, invented career details, or photo — only this single line, exactly as given.
- **No invented specific numbers** (yield increases, income figures) unless sourced from a real, cited reference found during research; use qualitative, accurate language where a specific figure can't be verified.
- **Fact-verification checklist — mandatory.** Before finishing this phase, list every specific factual claim made in the article (every named crop combination, every cited benefit, every number or percentage) in the review doc as a table: claim → source URL. This is the highest fabrication-risk item in this entire prompt — a long article assembled from web research is exactly where a plausible-sounding but unverified detail can slip in unnoticed. This checklist is what lets the owner spot-check the article's accuracy in a few minutes rather than having to re-verify the whole thing themselves.
- Publish as a real article using the existing articles system (same table/pattern as the two existing articles), reachable from `/articles` and linked from the `/agro-forestry` hub page (2d, section 5).

---

## Phase 3 — Owner-controlled availability (in-app, not WhatsApp)

### 3a. Schema

Add `is_available boolean not null default true` to the listings table (or the appropriate per-category structure — check the existing schema first). Applies across all offer-type listings regardless of category — the owner decides when to toggle it, not the system.

### 3b. One-tap toggle

On "My Listings" (existing page), add a visible switch per listing: "उपलब्ध" / "उपलब्ध नहीं". When set to unavailable, the listing is hidden from public browse/search/nearby results but remains visible to the owner in My Listings (never deleted). One tap, no confirmation dialog, no form.

### 3c. Engagement tracking

Add a lightweight counter: increment a `contact_click_count` on a listing each time its WhatsApp or Call button is tapped (already-tracked analytics if this exists; otherwise a simple increment). No personal data about who clicked is stored beyond the count.

### 3d. In-app nudge (not WhatsApp)

When a listing's `contact_click_count` crosses a threshold (e.g. 3+ clicks within 5 days) since it was last toggled or created, show the OWNER (only when logged in and viewing My Listings or the homepage) a dismissible in-app banner: "आपकी [listing title] में हाल में कई लोगों ने संपर्क किया है। क्या यह अभी भी उपलब्ध है? [हाँ, है] [नहीं, छुपाएं]" — both options are one tap, directly toggling `is_available` accordingly. Build this as a reusable component/function so that when WhatsApp sending becomes available later, the same trigger logic can additionally send a WhatsApp message without restructuring — do not hardcode it as UI-only in a way that would need rework.

**Buyer-side nudge is explicitly deferred** — there is no reliable way to reach an anonymous buyer without WhatsApp API access or a login requirement on browsing, neither of which is being added now. Document this limitation in the review doc; do not attempt a partial implementation.

**No auto-expire, no automatic deactivation** — confirmed excluded per prior decision. A listing stays as the owner last set it, indefinitely, until they change it.

### 3e. Consumer audit — apply `is_available` everywhere a listing can appear

Grep every place a listing is queried or displayed: category browse pages, the homepage "आपके आसपास" feed and counts, any search functionality, the nearby-listings RPC, and any other view found. For each one, confirm it filters out `is_available = false` listings (except the owner's own "My Listings" view, which must always show them). This is the same discipline that caught a real bug in an earlier build (a location refactor missed one consumer, `FasalSalah.jsx`, and it would have crashed) — a missed consumer here means a listing marked unavailable still shows up somewhere it shouldn't, silently. List every consumer found and its filter status in the review doc, not just the ones anticipated in this prompt.

---

## Phase 4 — Admin resource/booking dashboard

A new admin view showing every listing's availability status (from Phase 3), filterable by category, with counts (e.g. "उपकरण: 12 कुल, 9 उपलब्ध, 3 उपलब्ध नहीं"). Reachable two ways, showing the same data:
1. The existing `/admin` route (standard entry point).
2. A link/section on the admin user's own profile page (if a logged-in user has `is_admin = true`, show a "एडमिन संसाधन डैशबोर्ड" link/card on their regular profile view, leading to the same dashboard).

Admin-only access via the existing `require_admin` RPC pattern.

---

## Phase 5 — किसान प्रोफाइल at registration

**5a.** Add to the registration/profile flow: village/area name, total land owned (acres, optional, general figure), main crops grown (multi-select or free text), and two yes/no interest flags — "क्या आप कभी ज़मीन बटाई/ठेके पर देने में रुचि रखते हैं?" and an equivalent for equipment. Keep registration itself lightweight — these fields can be asked during signup or immediately after, not blocking account creation if skipped.

**5b.** Prominent disclaimer next to these fields, exact wording: "यह जानकारी केवल किसान सहयोग के उपयोग के लिए है — हम इसे कभी किसी को नहीं बेचते।"

**5c.** Farmer can view and edit this profile information later from their own account settings — not locked after registration.

**5d.** This data is never shown publicly on listings or to other users — profile-only, visible to the farmer themselves and to admin (Phase 6).

---

## Phase 6 — Admin tabular view of farmer profiles

A sortable/filterable admin table (village, land size, crops, interest flags) built on Phase 5's data, for campaign planning. Admin-only access, same `require_admin` pattern. Reachable from the same admin dashboard area as Phase 4 (a separate tab/section, not merged into the listings-availability view).

---

## Phase 7 — PWA install banner

A slim, dismissible banner strip below the nav, above the hero, on the homepage:
"📲 किसान सहयोग को अपने फ़ोन में इंस्टॉल करें — बिल्कुल मुफ़्त, कोई स्पैम नहीं" with an "इंस्टॉल करें" button and a ✕ dismiss.

- On Android/Chrome: tapping the button triggers the existing native install prompt mechanism (from the PWA build).
- On iOS/Safari (no native install API exists): detect this and show instructions instead of a broken button — "अपने फ़ोन में: नीचे शेयर बटन दबाएं, फिर 'होम स्क्रीन पर जोड़ें' चुनें।"
- **Never show this banner if the app is already running in installed/standalone mode** — check `window.matchMedia('(display-mode: standalone)').matches` (or the equivalent iOS check) and skip rendering the banner entirely if true. Someone who already installed the app and is using it as an app should never see "install this app."
- Complements, does not replace, the existing one-time post-second-visit install prompt from the earlier PWA build.
- Dismissing the banner hides it for the session; a dismissed banner can reappear on a later visit (not permanently gone), unlike the one-time prompt's 14-day cooldown.

---

## Phase 8 — Screenshot self-review + tests (mandatory before deploy)

Screenshots at 1280×800 and 375×812 of: the rules-compliance checkbox on a listing form and the one-time buyer modal; `/agro-forestry` and both new scheme pages; the intercropping article rendered in full with the author line; the availability toggle on My Listings and the in-app nudge banner (trigger it with test data); the admin dashboard from both entry points (`/admin` and the profile-page link); the किसान प्रोफाइल fields with the disclaimer visible; the admin farmer-data table; the PWA install banner on both a simulated Android and a simulated iOS view. **View every one.**

Add permanent tests covering: the rules checkbox is enforced server-side (a raw RPC call without the flag is rejected); the buyer modal shows once per browser and not again after acceptance; both new scheme pages render correctly; the availability toggle hides a listing from every consumer identified in Phase 3e without deleting it; the engagement-nudge threshold triggers correctly and does not trigger below it; admin-only access is enforced on both new admin views; profile data is never exposed to non-admin, non-owner users; the PWA install banner does not render when `display-mode: standalone` is true. Re-run the full existing suite, confirm no regressions across geofencing, weather/location, and prior scheme-page work.

Write `docs/review/COMBINED_LEGAL_AGROFORESTRY_AVAILABILITY_PROFILE_REVIEW.md` covering all eight phases, explicitly confirming: no fabricated agroforestry/intercropping facts beyond what was sourced, the buyer-nudge limitation is documented (not silently half-built), and WhatsApp-readiness of the Phase 3 nudge architecture for future upgrade.

Commit message: "Rules-compliance checkboxes (seller + one-time buyer modal) with Terms of Use; Agro Forestry hub page + researched intercropping article (एके दीक्षित author credit); owner-controlled availability toggle + in-app engagement nudge (WhatsApp-ready, not yet wired); admin resource dashboard (two entry points); किसान प्रोफाइल at registration with no-sell disclaimer; admin farmer-data table; PWA install banner with iOS fallback; screenshot-reviewed"
