# Batch 10F — Report: homepage hero rework, collapsible sections, /msp dates and trend integrity

Branch `release-10f` (from `release-10e` `dd49223`; safety tag `pre-10f-ship`). **STAGING only. Production not touched** (no deploy, no production database access; the ship dry run only read the live site and the Cloudflare project).
Details: `PROGRESS.md`, `DECISIONS.md` (1–41), `SHIP.md`, `BACKLOG.md`, `HINDI_CAPTIONS.md`, `evidence/`.

## The founder's 7 points

| # | Point | Status | Key fact |
|---|---|---|---|
| 1 | Remove persona tabs + phone mock-up | DONE-ON-STAGING | `src/features/home-live/` deleted (tabs, phone, bubble, scenes, engine/timer + lazy `LiveStage` chunk, facts row, "रजिस्टर करें" hero button). Kept: chip, heading + sub-line, two big buttons, the 3 info cards (static, same real data), "पहली बार?" banner, ONE demo button → **`/guide`** (same as the 10D button). At 360 px the hero (+ old band) is **940 px shorter** (1,734 → 794 px before the next section). |
| 2 | No homepage animation | DONE-ON-STAGING | Field band, tractor, crop marquee, count-up and the section rise-and-fade removed; nothing animates on the homepage except the mandi ticker (founder keeps it). Deferral recorded (DECISIONS 12). |
| 3 | Collapsible sections with an arrow | DONE-ON-STAGING | One native `<details>` component, arrow right after the heading text; `/msp`, `/mausam`, homepage below the hero. On phones the secondary sections start collapsed (only while off-screen), ≥ 768 px all open, choice remembered. Page height at 412 px: `/msp/gehun` 6,595 → 4,455 px; homepage 8,996 → 5,412 px. Defaults: `evidence/collapsible-defaults.md` (HUMAN-REVIEW). |
| 4 | Last-price date stands out | DONE-ON-STAGING | Badge with calendar icon: saffron "अंतिम भाव: 17 अक्टू 2026" (glow pulses 3×, then steady; static with reduced motion) or green "आज का भाव · 19 अक्टू" when the price is from today (IST). Next to "आज का भाव", "सभी फसलें — आज का भाव" and "मंडी तुलना"; one line at 360 px. |
| 5 | Dates on the chart dots | DONE-ON-STAGING | Tooltip by hover / tap / press-and-drag (nearest dot, guide line) / keyboard: "17 अक्टू · ₹2,526" + "N मंडी". Always-visible labels on first, last, highest, lowest (7-day: every dot, or every 2nd at 320 px); date ticks ~5 / ~15 days, never overlapping; collapsible "सारणी देखें" table. |
| 6 | CHECK: the 17 Oct dip | DONE-ON-STAGING | **Cause:** the daily point was the median of whichever mandis reported. 17 Oct (Saturday) had 16 mandis instead of ~30; the same mandis moved only −₹5, but the median of the smaller mix fell ₹44. The 15 Aug spike had the same cause (2 mandis). **Fix:** stable basket (mandis on ≥ 60 % of days), a day counts only if ≥ ⅔ of the basket reported, < 3 stable mandis → plain median labelled "कम मंडियों का भाव". **Wheat 30 days: before ends 17 Oct ₹2,526 ("₹44 गिरा"); after ends 16 Oct ₹2,560 ("₹1 बढ़ा").** Sentence, calculator and WhatsApp text use the same series. `evidence/trend-investigation.md`. |
| 7 | CHECK: ISO dates | DONE-ON-STAGING | Every visible date on /msp is "17 अक्टू" / "17 अक्टू 2026" (Hindi months जन … दिस; English Jan–Dec), incl. the "पिछला भाव (…)" tags, the mandi search, the table and the WhatsApp text (which now names the price date, not today). Test: no `2026-10-17` text anywhere on /msp, hi and en. |

## Numbers (Phase 0 → final)
- **Main JS chunk:** 27,569 → **27,538 B gzip (−31 B)**. Main CSS 15,927 → 13,717 B gzip (−2,210). Homepage chunk 14,729 → 9,400 B gzip; the lazy LiveStage chunk is gone; Msp chunk +4.8 KB gzip (chart, layout, basket).
- **Homepage speed** (10D slow-phone method, 5 × 5 interleaved with the frozen Phase 0 build): **LCP 2,916 → 2,728 ms (−188)**, **CLS 0.0117 → 0.0106**, TBT 186 → 179 ms. No new render-blocking asset.
- **Tests:** unit **81/81** (66 + 15 new). E2E full suite on the final build, one file at a time: **190/191** — the only failure is the known `phase19` "price-missing" environment test (also failing at Phase 0). New specs: `home-10f` 19, `collapsible-10f` 10, `msp-10f` 16. Baseline was 177/178.
- **On staging** (`https://staging.kissansahyog.com`, deployment `f9011c22-5ed5-4e9b-b3ee-6a985613b6b3`): home-10f 19/19, collapsible-10f 10/10, msp-10f 16/16, msp-trend-10e 4/4, guide-10c 34/34, phase20_mela 8/8, phase10_location_pwa 7/7, phase19 5/6 (known).
- **Widths:** `/`, `/msp/gehun`, `/mausam` × 320–1440 × hi/en with every section open: no horizontal scroll (42 combinations).
- **SEO text diff (prerendered HTML, 268 routes): nothing lost.** Differences: `/` — removed hero/tabs/phone/facts/field text (intended) + "बंद करें" section labels; `/msp` and 10 crop pages — badge, readable dates, chart labels/ticks, table, corrected trend sentence and calculator, "बंद करें"; `/mausam` — "बंद करें" ×2; `/yojana`, `/yojana/central`, `/yojana/mp` — the real scheme list instead of "थोड़ा रुकें…" (prerender readiness fix); `/agro-forestry` — a few database lines captured mid-load (present in a live render of the same build). `evidence/phase4/text-diff-final.txt`.
- `check-no-localhost-dist`: OK in every build. Ship dry run on the pushed head: **DRY RUN OK** (database probe skipped by rule; live production = 10C `7f5dc56a-…`).

## HUMAN-REVIEW
1. Hindi wording (`HINDI_CAPTIONS.md`): badge, chart help line, "कम मंडियों का भाव", "सारणी देखें", skipped-days line, "हिसाब का भाव … बीच का भाव", screen-reader "खोलें / बंद करें".
2. Section defaults (`evidence/collapsible-defaults.md`) — e.g. the trend and calculator start folded on phones.
3. Arrow placement: on section headings, not on the page title "गेहूं भाव — आज व MSP से तुलना" (DECISIONS 21).
4. 360 × 640 first screen: heading visible, the two big buttons and the demo button just below (DECISIONS 10, BACKLOG 1).
5. Day threshold ⅔ instead of the brief's ½ (DECISIONS 16); Lentil noisier (BACKLOG 4); the chart may end a day before the newest table date (DECISIONS 40).
6. Desktop farmer photo removed with the phone mock-up (DECISIONS 9).
7. Prerender readiness fix for `/mausam` and `/yojana` and the ship's new size limits / pre-deploy check (DECISIONS 32–33).

## Ship order (founder; full detail in `SHIP.md`)
1. Look at staging on your phone (already uploaded).
2. Production is still 10C: first apply migration 0064 in the PRODUCTION SQL editor (10E SHIP.md step 2).
3. `bash scripts/ship-prod-10f.sh --dry-run` → DRY RUN OK.
4. `bash scripts/ship-prod-10f.sh 2>&1 | tee docs/review/batch10f/evidence/ship-real.log` (instead of the 10E script).
5. After SHIP OK: 10E backfill `verify.sql`, `part-01` … `part-18`, `verify.sql`.
6. Undo: `bash scripts/rollback-prod-10f.sh 7f5dc56a-9d1c-4bd2-8bde-a4512a96be20` (or the id the ship prints).
7. Paste `BATCH10F_CLOSE_PROMPT.md`.
