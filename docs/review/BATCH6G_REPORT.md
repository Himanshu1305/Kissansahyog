# Batch 6G report — founder page, homepage trust band, footer link

Branch `codex/batch6g-founder`. Nothing committed, nothing deployed, no migration run, no database
write, `.env` not read or printed.

## Status

All eight tasks (G1 to G8) are implemented.

- `node scripts/verify-batch6g.mjs`: **49 passed, 0 failed** (output in `docs/review/BATCH6G_VERIFY_OUTPUT.txt`).
- `npm run build`: **succeeded** (output in `docs/review/BATCH6G_BUILD_OUTPUT.txt`).
- Local screenshots of the built site at 1440px and 390px are in `docs/review/shots-batch6g/`.
  On `/founder` at both widths: one `<h1>`, no horizontal scroll, heading order h1 → h2 → h3 → h4,
  no link or button under 44px tall, no page errors.

## Done

| Task | What was built |
|---|---|
| G1 | `src/content/founder.js`: all copy as `{hi, en}`, Hindi verbatim from the prompt. Portrait, parents, two innovation photos and two certificate slots all `null`; `video.youtube_id` `null`. |
| G2 | `src/screens/Founder.jsx` at `/founder` (lazy route), in `PageShell` wide. Order: hero, at a glance, roots with education stepper, service timeline, innovations and awards, resolve, three promises, blessings, FAQ, optional video, closing band. Initials avatar "अ.दी." while there is no portrait. |
| G3 | Homepage trust section now shows a band: avatar, name, role, three badges, "WE WILL DO IT", and a "पूरा परिचय पढ़ें →" link to `/founder`. Old role text removed; name is now श्री अभिनन्दन दीक्षित / Shri Abhinandan Dixit. |
| G4 | Footer link "संस्थापक" / "Founder". Author line with a link to `/founder` on `/agro-forestry`. Carbon-credit pages untouched. |
| G5 | `/founder` added to the shared static route list (used by both sitemap and prerender) and to the search index. Page renders its own title, description, canonical, hreflang, Open Graph and Twitter tags. JSON-LD: `Person`, `Organization` (founder relation), `FAQPage`. Three visible FAQ questions. New share image `public/og/founder.png` (text only, no face). |
| G6 | `public/founder/README.md` (Hindi + English): filenames, the field to set for each, sizes. |
| G7 | `docs/review/FOUNDER_CONFIRM_LIST.md` and `docs/review/FOUNDER_VIDEO_SCRIPT.md`. |
| G8 | `scripts/verify-batch6g.mjs`. |

## Not done, or done differently, and why

1. **Video block is a link-out card, not an embedded player.** The prompt asks for a
   `youtube-nocookie.com` click-to-load embed but also says to reuse the `Videos.jsx` pattern and not
   loosen the CSP. `Videos.jsx` has no iframe (cards open YouTube), and the CSP in `public/_headers`
   has no `frame-src`, so an embed would be blocked. I followed the no-CSP-change rule: when
   `video.youtube_id` is set, a card opens the video on YouTube. An embedded player needs an owner
   decision to add `frame-src https://www.youtube-nocookie.com` to the CSP.
2. **The article itself still shows the old name until the database is updated.** `AgroForestry.jsx`
   had no author line; the "लेखक: श्री ए.के. दीक्षित" line lives in the article row in the database.
   I added a linked author line on `/agro-forestry` and changed the name in
   `scripts/seed_agroforestry.mjs`, but did not run it. So `/articles/intercropping-madhya-pradesh`
   still shows "श्री ए.के. दीक्षित" in the byline and first line. When the row is updated,
   `scripts/test/p_0032_legal_availability_profile.mjs` line 38 (which expects the old initials)
   must be changed too; I left that test alone.
3. **Prerendered output and sitemaps were not regenerated.** They need `npm run build:full`, which
   reads `.env`. My plain `npm run build` replaced `dist/`, so `dist/` currently has no prerendered
   pages and `scripts/test/v2_seo_audit.mjs` fails until the owner runs `build:full`.
   `public/search-index.json` was edited by hand to add the `/founder` entry (the generator also has
   it, so a regenerated index keeps it).
4. **No i18n audit was run as a separate step.** The only existing one is inside
   `scripts/test/v11_phase6.mjs` (already failing before this batch). The 6G verifier checks hi/en
   parity and Devanagari-free `.jsx` for this batch's files.
5. **WhatsApp join button** on the closing band appears only when the WhatsApp channel is set in site
   settings, the same rule as every other join link on the site. It did not appear in my local
   screenshots.

## Changes outside the literal task list

- **Second Hindi spelling fixed.** The grievance page and legal text spelled the name "अभिनंदन".
  Since the site must use one spelling, I changed those four places to "अभिनन्दन"
  (`src/content/pages/grievance.js`, `src/lib/i18n/legal.js`). Only the name changed.
- `src/styles/tokens.css`: one new class `.ks-measure` (72ch reading width, left-aligned), because
  `batch2_layout` forbids inline `maxWidth` in screens.
- `docs/review/BATCH6D_LAYOUT_INVENTORY.md`: one row for `Founder.jsx`, so the 6D verifier still passes.
- `scripts/gen-og.mjs`: `founder` card added, plus an optional name argument so one card can be
  regenerated without rewriting the other six images.

## Files changed

New:
- `src/content/founder.js`
- `src/screens/Founder.jsx`
- `scripts/verify-batch6g.mjs`
- `public/founder/README.md`
- `public/og/founder.png`
- `docs/review/FOUNDER_CONFIRM_LIST.md`, `FOUNDER_VIDEO_SCRIPT.md`
- `docs/review/BATCH6G_PROGRESS.md`, `BATCH6G_REPORT.md`, `BATCH6G_VERIFY_OUTPUT.txt`, `BATCH6G_BUILD_OUTPUT.txt`
- `docs/review/shots-batch6g/` (8 screenshots)

Modified:
- `src/App.jsx` (route)
- `src/screens/Homepage.jsx` (trust band)
- `src/screens/AgroForestry.jsx` (author line)
- `src/components/layout/Footer.jsx` (link)
- `src/lib/i18n/strings.js` (3 values replaced, 12 keys added)
- `src/styles/tokens.css` (`.ks-measure`)
- `src/content/pages/grievance.js`, `src/lib/i18n/legal.js` (name spelling)
- `scripts/lib/prerender-routes.mjs`, `scripts/build-search-index.mjs`, `scripts/gen-og.mjs`, `scripts/seed_agroforestry.mjs`
- `public/search-index.json`
- `docs/review/BATCH6D_LAYOUT_INVENTORY.md`

## Tests

Run before and after, without `.env`:

| Test | Before | After |
|---|---|---|
| `verify-batch6a` / `6b` / `6c` / `6d` | pass | pass, same output |
| `batch2_layout` | pass | pass |
| `batch3_style` | 1 failed (Q&A file) | same output |
| `batch4_ui_style` | 1 failed | same output |
| `v2_brand` | 1 failed | same output |
| `v11_phase6` | 2 failed | 2 failed; the existing Devanagari list gains `src\content\founder.js` (on Windows that check lists every file in `src/content/`) |
| `v2_seo_audit` | pass | fails only because `dist/` is no longer prerendered (item 3 above) |
| `v2_citation_audit`, `v11_homepage` | crash at start | same |

Tests that need `.env` or the database were not run. No test was edited, skipped or deleted.

## Unsure — please review

- **`cta_ask` wording.** "किसान से सवाल पूछें" is used verbatim, but it reads as "ask the farmer a
  question". The English is "Ask a farming question". Confirm the Hindi is what is wanted.
- **`resolve_heading` English.** "जिद" is rendered as "a firm determination".
- **English brand spelling.** JSON-LD and English copy use "Kissan Sahyog" (the prompt wrote "Kisan
  Sahyog"), because `v2_brand` fails on the single-s form.
- **Two `Organization` JSON-LD blocks on `/founder`:** the sitewide one and the page's own with the
  `founder` relation.
- **Hindi words on the style avoid-list.** The owner's text uses "नवाचार" and "एवं"; those lines are
  marked `ks-style-ok` so `batch3_style` does not flag them.
- **`founder.png` share image** was rendered with this machine's system fonts; check it looks acceptable.
- The six factual points in `docs/review/FOUNDER_CONFIRM_LIST.md` are still unconfirmed and are live
  in the copy, including the homepage Guinness badge.

## Pages to check after `build:full` and preview deploy

- `/founder` at 1440px and 390px.
- `/` — the trust band near the bottom and its link.
- `/agro-forestry` — the author line and its link.
- The footer "संस्थापक" link on any page.
- `/grievance` and `/privacy` — the name spelling.
- `/articles/intercropping-madhya-pradesh` — still shows the old initials (item 2).
- Site search for "संस्थापक" or "Dixit".
