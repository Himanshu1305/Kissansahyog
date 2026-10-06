# KISSAN SAHYOG — BATCH 1 REPORT (Marketplace basics)

Preview: **https://v2-preview.kissansahyog.pages.dev**
Scope: the marketplace basics only (items 0, 2, 3, 3A, 4, 5 done; item 1 partial — see below).
Production was **not** touched (preview branch only).

---

## What changed, item by item

### Item 0 — provider-declaration hotfix recorded as a migration
- `supabase/migrations/0050_provider_declaration_hotfix.sql` — `create or replace create_listing`, byte-for-byte identical to 0044 except the provider-declaration guard now fires **only** when `provider_declared` is present and not `'true'`. An offer with no key succeeds; `provider_declared:false` still fails. Applied to the live DB via `npm run db migrate`.
- Test `scripts/test/batch1_item0.mjs` (3 cases: no-key succeeds, `false` fails, `true` succeeds). Four stale negative assertions in `v2_phase4/7/9` updated to `provider_declared:false` (so they still exercise the guard).

### Item 2 — navigation on every screen
- `Screen` (`components/ui.jsx`) now renders **inside `PageShell`**: the global **NavBar** first, then a slim title row with the back button. The 10 old `Screen` routes (Browse, Post, ListingDetail, MyListings, Experts, ExpertDetail, Profile, Login, Signup, KisanMelaSubmit) all get the same NavBar. `/admin` already had it.
- New fixed **mobile bottom tab bar** (`components/BottomTabBar.jsx`, below `md`), rendered once in `App`:
  - Logged in: होम · खोजें · **पोस्ट करें** (centre, raised) · मेरी लिस्टिंग · प्रोफ़ाइल.
  - Logged out: होम · खोजें · **पोस्ट करें** (→ login, returns to post) · लॉगिन.
- Body reserves bottom padding on mobile + honours the iPhone safe area. Desktop keeps the top NavBar only. NavBar Login/Signup are hidden below `md` (the bottom bar carries Login) — this also removed a 13 px mobile top-bar overflow. The redundant per-screen language toggle was removed (NavBar already has one).

### Item 3 — Browse
- All **10 category chips wrap** into rows (`flex-wrap`); nothing is hidden behind a horizontal scroll (replaced the old single-row `CategoryStrip`). Verified at 375×812 and 1280×800.
- **"Most viewed" now filters by the selected category** (`fetchTopViewed({category})`) — fixes the bug where Bhusa showed other categories' listings. The box hides when empty. Sample listings stay visible (owner decision).
- Grids: 2 (mobile) · 3 (tablet) · 4 (desktop); Land stays 1-column on mobile.

### Item 3A — public browsing
- `/browse` and `/listing/:id` are **public** (the `Protected` wrapper removed). `/post`, `/my`, `/profile`, `/home`, `/experts*` stay gated.
- Logged-out visitors get the shared **LocationControl** (GPS / pincode / village, Sagar default) so the 30 km and 30–50 km rules work without a profile. Logged-in users keep their exact profile coordinates.
- **The phone stays behind login:** Call / WhatsApp / show-number send a logged-out user to `/login?next=/listing/:id`; after login they land back on the **same listing** and the reveal continues. Login & Signup honour `?next=` / `state.from` (`src/lib/returnPath.js`); `PublicOnly` honours `next` too.
- Homepage tiles + NavBar बाज़ार menu open `/browse?cat=…` for everyone.
- Both routes are `noindex` (Seo) and stay out of the prerender list and sitemaps.

### Item 4 — Call & WhatsApp on every listing
- New `components/ContactActions.jsx`: **📞 कॉल करें** + **WhatsApp करें** on every `ListingCard` (below the summary; the card still opens the listing) and at the **top of ListingDetail** under the title. Hidden on your own listings.
- Reuses the existing reveal RPC (`getListingContact`), `BuyerComplianceGate` (it intercepts the `tel:`/`wa.me` links), the `phoneReveal` disclaimer (in a small bottom sheet), and `incrementContactClick`. WhatsApp opens `wa.me/91<10-digit>?text=<listing title + link>`.
- Logged-out → login, return to the same listing. ListingDetail's old share button is now a small secondary **शेयर करें**.

### Item 5 — posting in 3 steps
- `Post.jsx` rebuilt as **3 steps with an `N/3` indicator**; Back keeps all entered data.
  1. **क्या?** — category tiles (10, Land last) + **देना / बेचना है** (offer) · **चाहिए** (requirement).
  2. **जानकारी** — the category's fields + a small किसान / व्यापारी toggle (default किसान, vendor note kept).
  3. **जगह और पुष्टि** — asset village (primary distance anchor, autocomplete) + a phone check + **ONE** plain-Hindi checkbox that covers the rules agreement and, for offer categories, the provider declaration / land ownership (sets `p_rules_agreed`, `details.provider_declared`, `self_declared`).
- Essentials-only form relaxations (client-side only — the DB validation is unchanged per Hard rule 2): equipment rate required for offers only + rental basis optional; land price type required for offers only; agri-inputs condition optional. Photos stay optional. The remaining per-category required fields are **server-enforced** in `create_listing`, so they stay required.
- `components/ListingForm.jsx` is now unused (left in place; some static backend checks still read it).

### Item 1 — one layout, edge to edge (PARTIAL)
- `PageShell` default flipped from `content` → **`wide`** (the "one layout" structural change). Browse is wide with the 2/3/4 grid. Desktop Browse is now genuinely edge-to-edge.
- **Deferred (explicitly permitted by the prompt):** removing the per-page `max-w-*` / inline `maxWidth` wrappers on the information/homepage-style screens (Mausam, Msp, Info, FasalSalah, AgroForestry, Resources, Sawaal, KisanMela, Articles, Admin, DroneDidi, SchemeDetail, Safalta, Privacy, Terms, Welcome, Greenhouse, Jugaad, Search), widening them while keeping long prose in a readable `ContentColumn`, and the `scripts/test/batch1_layout.mjs` static guard that enforces it. These pages still render inside their existing (narrower) column on desktop — functional, just not full-bleed yet. See KNOWN_ISSUES.

---

## Test counts (before → after)
- **E2E (Playwright):** 77 → **82** (added `e2e/batch1.spec.js`: 5 tests; updated 8 legacy post specs to the 3-step flow). Full suite **82 passed**.
- **Backend / logic:** all suites green, including new `batch1_item0.mjs` (3) and `batch1_categories.mjs` (20 — every category posts an offer + a requirement). No count below baseline.
- **i18n audit `v11_phase6`:** 31 passed (new strings all bilingual; no hardcoded Devanagari).
- **SEO/AEO audit `v2_seo_audit`:** 2 passed (176 prerendered pages; `/browse` + `/listing` correctly excluded).
- **`npm run build:full`:** success (176/176 prerendered, sitemaps written).

## The agri_inputs findings (item 3b)
Direct DB query (service role): **7 active agri_inputs listings** = 5 farmer-surplus + 2 vendor, all available, all with `wide_visibility = false`. From the Sagar/Khurai default location, **4 are ≤30 km and show** (2×0 km, 18.1, 29.3); the other 3 are **64 / 87 / 101 km away and are correctly hidden** — agri_inputs is wide-*eligible* (100 km) but none of these rows opted into wide visibility, so the normal 30/50 km rule applies (0 rows in the 30–50 ring). The form renders **both** sub-types (farmer-surplus + vendor) and every input-type option — nothing is missing.
**Conclusion:** no agri_inputs listing or sub-type is broken. The owner's "not showing all options" was (a) category chips hidden in the old horizontal strip (fixed — they now wrap) and/or (b) Browse requiring login on V2 (fixed — Browse is public). The far listings not appearing is correct distance behaviour, not a bug.

## Anything not done
- **Item 1 info-page width cleanup** + its static guard `batch1_layout.mjs` — deferred (listed above), as the prompt permits. Owner-visible effect: Mausam/Msp/Info/Terms/etc. are not yet full-bleed on wide desktops (they still look fine, just centred in a ~960 px column).
- `components/ListingForm.jsx` is dead code now; safe to delete in a later pass.

## Preview URL
**https://v2-preview.kissansahyog.pages.dev** (all routes above return 200).

---

## 10-point checklist for the owner (test on your phone)
1. ऐप खोलें — हर पेज पर ऊपर नेविगेशन बार और नीचे टैब बार (होम · खोजें · पोस्ट करें · मेरी लिस्टिंग · प्रोफ़ाइल) दिखे।
2. खोजें खोलें — सभी 10 कैटेगरी बिना साइड-स्क्रॉल के दिखें (कई लाइनों में)।
3. **लॉग आउट रहते हुए** खोजें खोलें, कोई लिस्टिंग खोलें — बिना लॉगिन के दिखनी चाहिए; "कॉल करें" दबाएँ तो लॉगिन माँगे, और लॉगिन के बाद **उसी लिस्टिंग** पर वापस आकर नंबर दिखे।
4. किसी भी लिस्टिंग कार्ड पर **📞 कॉल करें** और **WhatsApp करें** के दो बड़े बटन दिखें।
5. लिस्टिंग खोलें — ये दोनों बटन शीर्षक के ठीक नीचे हों; "शेयर करें" छोटा बटन हो।
6. अपनी ही लिस्टिंग पर कॉल/WhatsApp बटन न दिखें।
7. पोस्ट करें खोलें — ऊपर "1/3" लिखा हो; पहली स्क्रीन पर कैटेगरी चुनें और "देना/बेचना है" या "चाहिए" चुनें।
8. दूसरी स्क्रीन (2/3) पर जानकारी भरें, "पीछे" दबाने पर भरी हुई जानकारी बनी रहे।
9. तीसरी स्क्रीन (3/3) पर गाँव/पिनकोड डालें, एक ही चेकबॉक्स पर टिक करें, और लिस्टिंग पोस्ट करें — हर कैटेगरी में काम करे।
10. खोजें में "बाज़ार/कैटेगरी" बदलें — "सबसे ज़्यादा देखा गया" सिर्फ़ उसी कैटेगरी की लिस्टिंग दिखाए (खाली हो तो बॉक्स न दिखे)।
