# KISSAN SAHYOG — BATCH 1: Marketplace basics (preview only)

Repo: `~/projects/Kissansahyog` (Mac, macOS Terminal). Stack: React 19 + Vite + Tailwind v4, Supabase, Cloudflare Pages (Direct Upload). The owner is non-technical, and every command you print for him must work in macOS Terminal.

## Why this batch exists
The V2 build (phases 0–15) is on `main` and on the preview at https://v2-preview.kissansahyog.pages.dev. The owner reviewed it and rejected the experience. It is a **simple marketplace**: people list items or services, other people find them and contact the seller. V2 made that harder. This batch fixes **only the marketplace basics**. Content, Hindi rewriting, cold storage, Greenhouse, Jugaad, Q&A and Fasal Salah are later batches. **Do not touch them** beyond what the shared layout changes automatically.

## Hard rules
1. **Preview only.** The only deploy command allowed is:
   `npm run build:full && npx wrangler pages deploy dist --project-name kissansahyog --branch v2-preview`
   **Never** run a deploy without `--branch v2-preview`. The production site must not change.
2. **Database:** the only change allowed is migration 0050 (item 0). No new tables or columns, and no other RPC changes.
3. **No new features, no new pages, no content edits.** Do not add, remove or rename categories. Land stays last in every ordered category list.
4. **Hindi UI text:** every new or changed string goes in `src/lib/i18n/strings.js` (the `v11_phase6` audit must stay green). Write the Hindi the way a farmer in Sagar speaks: short and plain. Examples: "कॉल करें", "WhatsApp करें", "किराये पर दें", "बेचना है", "चाहिए", "आगे बढ़ें", "पीछे". Avoid bookish words (सूचीबद्ध, उपयुक्त, प्रस्तुत, एकरूपता). Write the English separately and naturally. It must not be a word-for-word translation.
5. **Tap targets** are at least 44px. Keep it accessible: labelled fields and visible focus.
6. **Commit and push after each item** with the message `Batch1 item N: <summary>`. Keep `docs/review/BATCH1_PROGRESS.md` as a checklist. If you are resuming, continue from the first unticked item.
7. **Timebox:** about 3 hours. If you run out of time or are blocked, finish the current item, deploy the preview, and write the report listing what is left. Never leave the build broken.
8. Work autonomously. Do not ask questions. Record any judgement call in `BATCH1_PROGRESS.md`.

## Owner decisions (already made, do not change)
- **Browsing is public.** Anyone can browse listings and open a listing without logging in. Login is needed only to see a phone number (Call/WhatsApp), to post, and for My listings and Profile. See item 3A.
- **Sample listings (`is_test_data`) stay visible to everyone**, including in "Most viewed". Do not hide them.

## Build order (priority if time runs short)
Item 0 → 2 → 3 + 3A → 4 → 5 → 1. Items 0, 2, 3, 3A, 4 and 5 must be completed. If time runs short, the per-page width cleanup in item 1 on the information pages (Terms, Privacy, Info and similar) may be left for later. List anything left in the report.

## Item 0: save the live hotfix as a migration
The owner already ran this SQL on the live database. Create `supabase/migrations/0050_provider_declaration_hotfix.sql`. It must `create or replace` `public.create_listing` with a body **identical to migration 0044**, except for the provider-declaration condition, which becomes:
```sql
if p_listing_type = 'offer' and p_category in ('equipment', 'warehouse', 'greenhouse', 'jugaad')
   and (p_details ? 'provider_declared')
   and coalesce(p_details->>'provider_declared', '') <> 'true' then
  raise exception 'provider_declaration_required';
end if;
```
Keep the same grant line, then run `npm run db migrate`. Add a backend test with two cases: an offer with no `provider_declared` key succeeds, and an offer with `provider_declared: false` fails.

## Item 1: one layout, edge to edge
Problem: most pages render inside the narrow `.ks-content` reading column (`--content-max`), which leaves empty space on both sides on desktop. Also, `PageShell` defaults to `width="content"`, and many screens set their own widths.

Fix:
- `PageShell` defaults to **wide**: full-bleed section backgrounds, inner max width `--wide-max` (about 1280px), side padding 14px on mobile and 40px on desktop.
- Use the narrow reading column **only** for long prose blocks and forms *inside* a page, never as the page wrapper.
- **Long text must stay readable after this change.** The shared content renderer (`ContentPage` / `ContentBlocks`), article and Q&A bodies, Terms and Privacy keep their paragraphs inside the readable column, at about 70 characters per line. The page background, hero, listing grids and boxes go full width. Check this in the screenshots: no paragraph should stretch across a 1280px screen.
- Remove every per-page width: `max-w-*` wrappers and inline `maxWidth` in screens. Known ones: FasalSalah (`maxWidth: 960`), Welcome, Safalta, Post, NotFound, Admin, Terms, Sawaal, Resources, Privacy, KisanMelaSubmit, KisanMela, Info, Homepage, Articles, Mausam and Msp. Grep for others.
- Grids: 2 columns on mobile, 3 on tablet, 4 on desktop for listing and tile grids. Land listings stay 1 column on mobile.
- Add a static test (`scripts/test/batch1_layout.mjs`) that fails if any file in `src/screens/` sets a page-level `max-w-` or `maxWidth`. Allowlist only modals, cards and chips.

## Item 2: navigation on every screen
Problem: 10 screens use the old `Screen` component (a green bar with only a back button) and have **no NavBar**: Browse, Post, ListingDetail, MyListings, Experts, ExpertDetail, Profile, Login, Signup and KisanMelaSubmit.

Fix:
- Every route renders the same NavBar, including `/admin`. Refactor `Screen` to render inside `PageShell`: NavBar first, then a slim title row with a back button.
- **Mobile bottom tab bar**, fixed, on every page below the `md` breakpoint:
  - Logged in: होम · खोजें · पोस्ट करें (centre, highlighted) · मेरी लिस्टिंग · प्रोफ़ाइल.
  - Logged out: होम · खोजें · पोस्ट करें (goes to login, then returns to post) · लॉगिन.
- Add bottom padding to page content so nothing hides behind the bar, and respect the iPhone safe area.
- Desktop keeps the top NavBar only.

## Item 3: Browse
- **All 10 categories visible with no hidden horizontal scroll.** Mobile: wrap the chips into rows (a 2- or 3-row grid is fine). Desktop: one wrapping row. Add a test at 375×812 and 1280×800 that checks all 10 chips are inside the viewport.
- **"Most viewed" (`fetchTopViewed`)** must filter by the selected category; sample listings are allowed (owner decision). Hide the box if it is empty. It currently shows other categories' listings under Bhusa.
- The owner reported that `/browse?cat=agri_inputs` "is not showing all options". Investigate both possible meanings:
  - (a) Category chips hidden off-screen. Fixed by the item above.
  - (b) agri_inputs listings or sub-types missing. Compare what the page shows against a direct DB query of active agri_inputs listings within the 100 km wide-visibility rule, and check that every agri_inputs sub-type in the catalog appears in the form and filters.

  Fix what is broken, and record findings in `BATCH1_PROGRESS.md`.

## Item 3A: public browsing (no login needed to look)
- Remove the `Protected` wrapper from `/browse` and `/listing/:id`. Keep `/post`, `/my`, `/profile`, `/home` and `/experts*` as they are.
- **Location for logged-out visitors:** use the existing location control (`initialLocation` / `LocationControl`: GPS, pincode or village, with the Sagar default) so the 30 km and 30–50 km fallback rules work without a profile. Logged-in users keep their profile location.
- **The phone number stays behind login:** Call, WhatsApp and "show number" send a logged-out user to login with a return path. After login, they land back on the **same listing**, where the reveal flow continues. Make Login and Signup honour the return path (`state.from` or a `?next=` parameter). Today `Protected` redirects to `/`.
- The homepage category tiles and NavBar बाज़ार menu open `/browse?cat=…` for everyone.
- `/browse` and `/listing/:id` stay out of the sitemap and pre-render, and are `noindex` for now. SEO for listings is a later batch.
- Tests: logged out, open `/browse?cat=equipment` → listings visible → tap Call → login → back on the same listing → number reveals.

## Item 4: Call and WhatsApp on every listing
Goal: a buyer contacts the seller in **one or two taps**, from the card or the listing page.

- **Every `ListingCard`** shows two large buttons: **📞 कॉल करें** and **WhatsApp करें**. They are hidden on the viewer's own listings. The card itself still opens the listing; the buttons must stop the click from also opening it.
- **Reuse the existing reveal flow:** the same reveal RPC, `BuyerComplianceGate`, the short `phoneReveal` disclaimer, and `incrementContactClick` logging. Do not bypass any of them.
  - On first tap, show a small bottom sheet with the one-line disclaimer, plus Call and WhatsApp buttons.
  - After the number is revealed, Call opens `tel:`. WhatsApp opens `https://wa.me/91<10-digit>?text=<short Hindi message with the listing title and link>`.
- **Logged-out users:** tapping goes to login, then returns to the same listing.
- **ListingDetail:** the same two buttons, at the top under the title. The existing "share" button becomes a smaller secondary button labelled "शेयर करें".

## Item 5: Posting in 3 steps
Current flow: source → type → category → form → submit (4 screens before the form). New flow, with a "1/3" step indicator. Back keeps all entered data.

1. **What?** Category tiles (10, Land last), and on the same screen two big toggles: **"देना / बेचना है"** (offer) and **"चाहिए"** (requirement).
2. **Details:** the category's fields.
   - Audit each category form in `src/components/categories/*.jsx` and make **only essentials required**. Typically: what it is, price or rate (optional for requirements), and quantity where it applies. Photos stay optional. Everything else is optional.
   - Farmer/vendor becomes a small toggle on this step, default किसान. Keep the vendor note.
3. **Location and confirm:**
   - Village or pincode (existing control) and a phone number check.
   - **One checkbox** that covers both the rules agreement and, for offer categories, the provider declaration, written as one short plain-Hindi sentence. Checking it sets `p_rules_agreed=true` and `details.provider_declared=true`.
   - Submit button.

After posting, show the listing with a "शेयर करें" button. Update the E2E tests for the new flow. Every category must still post successfully: add or extend tests that post an offer and a requirement in each category.

## Verification (before deploying)
- Run the full backend suite, `npm run test:e2e`, `v11_phase6` (i18n), `v2_seo_audit`, the new `batch1_*` tests, and `npm run build:full`. All must be green, with no test count below the current baseline. If you change a test, say why in the progress file.
- **Screenshots** at 375×812 and 1280×800, saved in `docs/review/shots-batch1/`. Open them, look at them, and fix any problems. Pages:
  - `/`, `/home`
  - `/browse` with equipment, agri_inputs and land
  - one `/listing/:id`
  - `/post`, all 3 steps
  - `/my`, `/profile`, `/login`
  - `/mausam`, `/msp`, `/fasal-salah`, `/sawaal`, `/cold-storage`, `/greenhouse`

  Check: edge to edge, NavBar present, bottom bar on mobile, no horizontal scroll.
- Deploy the **preview** with the command in Hard rule 1, open the preview URL, and check that the routes above return 200.

## Report
Write `docs/review/BATCH1_REPORT.md` with these sections:
- What changed, item by item.
- Test counts before and after.
- The agri_inputs findings.
- Anything not done.
- The preview URL.
- **A 10-point checklist for the owner to test on his phone.** Plain language, one line each. Example: "Browse खोलें — सभी 10 कैटेगरी बिना स्क्रॉल के दिखें". Include one check done **logged out** (browse, then Call asks for login and returns to the same listing).

Print the same checklist at the end of your final message.

Also update `PROJECT_CONTEXT.md` (Batch 1 section) and `KNOWN_ISSUES.md`.
