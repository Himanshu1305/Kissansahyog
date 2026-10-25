# Batch 10E — Report: founder feedback fixes + mandi history backfill + backlog

Branch `release-10e` (from `release-10d` head `e81a100` = 10C + 10D; safety tag `pre-10e-ship` → e81a100). **STAGING only. Production was not touched** (no deploy, no production database access).
Each phase was done by a subagent and checked by the orchestrator (diffs, screenshots, re-running checks). Details: `PROGRESS.md`, `DECISIONS.md` (1–78), `evidence/phase6/VERIFY.md`, `SHIP.md`, `BACKLOG.md`, `HINDI_CAPTIONS.md`.

## The 9 founder items

| # | Item | Status | Key fact |
|---|---|---|---|
| 1 | No email at sign-up / sign-in | DONE-ON-STAGING | Sign-up is name + mobile (+ village, visibility box, notice). It uses the founder's staging function `app_register_phone`, now committed as migration `0064` (+ rollback); the file matches staging byte for byte. Mobile login never asks for email; email accounts still log in through the email box. New line on login: "ईमेल नहीं है? मोबाइल नंबर से लॉगिन करें". |
| 2 | Listing photos not displaying | DONE-ON-STAGING | **Cause: the site security policy (`public/_headers` CSP `img-src`) did not list the Supabase storage host**, so browsers blocked every stored photo (on production too). Fixed by adding the two exact project hosts to `img-src` only. Test proves the old header blocks the image and the new one shows it. |
| 3 | Optional "अतिरिक्त जानकारी" box | DONE-ON-STAGING | All categories, 300 chars, live counter, phone numbers blocked, shown on the listing page as plain text. Stored in `details.extra_info` (proved on staging that the create RPC keeps it; no migration). |
| 4 | "सीताराम 🙏" instead of "शाबाश" | DONE-ON-STAGING | The only "शाबाश" was the demo finish line; now "सीताराम 🙏 …" / "Sitaram 🙏 …". There was no per-step praise to change. |
| 5 | /msp 30 vs 90 days identical | DONE-ON-STAGING | **Source: data.gov.in "Variety-wise Daily Market Prices Data of Commodity" (Agmarknet/DMI), resource 35985678-…, Government Open Data License – India (attribution required).** Loaded on staging: **2026-06-20 → 2026-10-17**, Sagar division, 10 crops, 8,556 real rows (one real row per crop/market/day; nothing averaged, nothing rejected). Production: 18 SQL files (8,625 rows) for the founder. Also fixed: the chart read only the oldest 1,000 rows (server limit) and the market search saw only 7 of 57 markets. Thin crops: Paddy (34 of 90 days), Maize (48), Garlic (65; 5 markets). No crop has identical 30/90-day series now. |
| 6 | Dates on the 7/30/90 tabs | DONE-ON-STAGING | e.g. "7 दिन / 11–17 अक्टू", "90 दिन / 20 जुल – 17 अक्टू"; dates at the chart ends and in the trend sentence; honest "इस अवधि में N दिन का भाव उपलब्ध" when days are missing. |
| 7 | Hand cursor on category tiles | DONE-ON-STAGING | One global pointer-cursor rule; the 15 tiles are now real links. |
| 8 | Tiles highlight / glow on hover | DONE-ON-STAGING | Saffron ring + green glow + 2 px lift (mouse only), same glow for keyboard focus, press state on touch, no lift with reduced motion. No layout shift. |
| 9 | Demo: photos + availability; mandatory dates | DONE-ON-STAGING | Post demo now 16 steps: real date block (आज/कल/परसों/तारीख़ चुनें, "कब से उपलब्ध *", "जब तक चाहें") and a photo step (drawn sample picture, nothing uploaded). **Dates now required for Equipment (incl. water tanker), Land, Labor and Drone Didi**, offer and requirement. Browser-side only; server-side enforcement is in BACKLOG. Transport/greenhouse/cold storage left for review. |

## Backlog tasks (Phase 5)
| Task | Status | Key fact |
|---|---|---|
| 5.1 Kisan Mela filter | RAN-PASSED | Homepage shows only MP + UP, MH, CG, GJ, RJ fairs, MP first; section hidden when none. Karnataka fairs gone from the homepage (the /post side widget still shows them: BACKLOG). |
| 5.2 Test health | RAN-PASSED | Of the 23 old failing tests: 22 stale (fixed, tests only), 0 real bugs, 1 environment (phase19 "price-missing": staging has prices for every crop). `evidence/failing-triage.md`. |
| 5.3 10D leftovers | RAN-PASSED (1024 tiles) / HUMAN-REVIEW (1440) | Badge check updated; 1024 px tiles wrap 2+1 instead of 4–5-line wraps. The 1440 hero stays 1200 px because every section below it is 1200 px. |
| 5.4 BACKLOG.md | DONE | All requested items with why and size; photo compression already exists (`compressPhoto`, ≤1600 px, ≤300 KB); Android app not affected by the photo CSP. |
| B17 build bug (Phase 1D) | DONE-ON-STAGING | The prerender leaked `localhost:4178` into every page (preload links, stylesheets, WhatsApp share links). Fixed at the source; new gate `scripts/check-no-localhost-dist.mjs` runs in `build:full` and `build:prod`. Side effect: the 10C guide tests now pass 30/30 on prerendered builds (23 failed before). |

## Numbers (Phase 6, `evidence/phase6/VERIFY.md`)
- **Main chunk:** 27,569 B gzip vs 27,565 B at Phase 0 (+4 B; budget +1,500 B). Main CSS +422 B. Everything else added is lazy-loaded.
- **Homepage speed** (slow phone, measured side by side with the frozen Phase 0 build in one session, 5 runs each): **LCP 2,888 ms vs 2,872 ms (+16 ms; budget +300)**, **CLS 0.0118 vs 0.0118**, TBT 188 vs 202 ms. Auto-play: no long task. No new render-blocking asset.
- **Tests:** unit 66/66. E2E, all 29 files one at a time on a local preview of the staging build: 177/178. The only failure is phase19 "price-missing" (environment). One flaky PWA test was a test bug, fixed in the test. **No new failures; 45 of the 46 tests failing in 10D now pass.**
- **Widths:** 7 pages × 320–1440 × hi/en: no horizontal scroll.
- **SEO text diff:** 268 routes compared, **nothing lost**. Intended changes only: `/guide` (register card text), `/guide/register` (no email step, new description), `/guide/post` (two new steps), `/msp` + 10 crop pages (dated tabs and real history), homepage mela teaser (regional). Every other difference was a page captured while still loading and was re-checked live (decision 5).

## Staging
- Upload **RAN-PASSED**: deployment **`ca08070a-406f-4061-b56e-518c3512b180`**, https://staging.kissansahyog.com. No `localhost` in the live HTML; the CSP lists both photo hosts.
- On staging: photos 3/3, phone sign-up 6/6, post form 5/5, /msp trend 4/4, homepage hero 32/32, guide 34/34 (two test-only tolerance fixes for deployed hosts, decision 78).

## Known and accepted
- Phone-only sign-up and login are trust-based until OTP is live (anyone who knows the number can sign in), as mobile login already was. Throttling unchanged.
- Phone-only users have no email or password, so they cannot reset or recover their account until OTP is live.
- Dates are enforced in the browser only.

## HUMAN-REVIEW (decide or check)
1. All new Hindi wording (`HINDI_CAPTIONS.md`): login line, extra-info box, date block, /msp tab and trend wording, demo steps, register card text, month abbreviations ("फ़र", "अप्रै").
2. **GODL attribution wording on /msp** (licence requires naming the source; proposed text in `evidence/backfill-source.md`).
3. Wheat 90-day chart shows a one-day spike on 15 Aug (only 2 mandis reported). Real data, not smoothed; a "minimum mandis per day" rule is in BACKLOG.
4. /msp trend now uses Sagar division rows only (decision 24); the market picker lists markets seen in the last 120 days (decision 29).
5. A few old Gram rows may be Arhar (refresh bug, now fixed for the future; one staging row unverifiable; production needs a read-only check). Nothing deleted.
6. Phone-number rule in the extra-info box blocks e.g. "2023 2024 2025" (errs towards blocking).
7. Equipment "available now" is now saved as a start date; drone didi `preferred_date` replaced by `available_from` (old rows still display).
8. The post demo is 16 steps (~68 s on a slow phone); extra-info has no own step; demo uses both "उदाहरण" and "नमूना".
9. Email box still shown above the mobile box on the login page.
10. The homepage "submit a Mela" prompt disappears when no regional fair qualifies.
11. The guard scripts now ignore the two photo hosts on the CSP line of `_headers` only (decision 8); prerendered share links use kissansahyog.com (decision 12).
12. The machine running this batch was short on memory (a stray `grep` process, PID 21896, ~3 GB, could not be stopped by the AI). Closing it frees memory for full test runs.

## Ship order (founder; full detail in `SHIP.md`)
1. Look at staging on your phone.
2. Production SQL editor: apply migration `0064` (sign-up function) — before the ship.
3. `bash scripts/ship-prod-10e.sh --dry-run` (must end DRY RUN OK; it probes that 0064 exists).
4. `bash scripts/ship-prod-10e.sh 2>&1 | tee docs/review/batch10e/evidence/ship-real.log` (ships 10C+10D+10E).
5. Only after SHIP OK: production backfill — `verify.sql`, `part-01.sql` … `part-18.sql`, `verify.sql`.
6. Undo if needed: `bash scripts/rollback-prod-10e.sh <previous id the script prints>` (today `7f5dc56a-9d1c-4bd2-8bde-a4512a96be20`).
7. Paste `BATCH10E_CLOSE_PROMPT.md`.
