# Batch 10F — backlog (found, not done in this batch)

| # | Item | Why it matters | Size |
|---|---|---|---|
| 1 | **Homepage first screen on 360 × 640.** The two big buttons and the demo button now sit right after the first screen (bottoms 667 / 743 / 828 px; heading at 565 px). Getting them onto the first screen needs room above the hero: e.g. the "बिना लॉगिन के सारी जानकारी देखें" strip as one sideways-scrolling row (≈ −110 px) and/or the install strip moved lower. Founder choice (DECISIONS 10). | First-time visitors see the two main actions without scrolling | S |
| 2 | **Homepage animation** (founder: decide later). Nothing animated is left on the homepage except the mandi ticker scroll. | Founder decision | — |
| 3 | **Lentil trend:** its few stable mandis sit at very different price levels, so the basket median moves more than the like-for-like change (DECISIONS 18). A like-for-like (chain) index, or a per-mandi level adjustment, would fit better but would show computed levels, not medians of real prices — needs a founder decision on wording. | Honest trend for thin, mixed crops | M |
| 4 | **Production data check of the basket rule.** The rule was tuned on STAGING (no production access by rule). After the production backfill, re-run `scripts/batch10f/trend-investigate.mjs` on a production snapshot (read-only) to confirm the same behaviour. | Same honesty on production | S |
| 5 | **Desktop-only `/msp` share of collapsed sections** — the remembered open/closed choice is per browser; a farmer who shares a link with `#trend` gets it opened, but other sections follow the receiver's defaults. | — | — |
