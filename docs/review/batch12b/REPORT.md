# Batch 12B — Dussehra greeting + home desktop layout

## What was built
- `src/lib/festivals.js`: festival list (one entry, `dussehra-2026`, 2026-10-20 to 2026-10-20, India dates) and `activeFestival(now)` using `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' })`.
- `src/components/FestivalCard.jsx`, used in `Homepage.jsx` right under the mandi ticker. Client-side only (decided in an effect after mount; skipped when `window.__KS_PRERENDER` is set). No animation, no script, no tracking. Close button 48 px, remembered in `localStorage` (try/catch). Region with aria-label.
- Picture: CC0 photograph from Wikimedia Commons (IMAGE_LICENSE.md), `public/festival/neelkanth.webp` 31,708 B and `neelkanth-112.webp` 2,862 B. Added to the Android bundle with `public/` (about 34 KB total, no hot-linking).
- Desktop: the "पहली बार?" banner and the WhatsApp card moved into the hero's centered column (`.ks-section-inner`). Mobile unchanged.

## Numbers
| Check | Result |
|---|---|
| Unit (full suite) | 120/120 (114 before, +6 new) |
| New E2E `festival-12b.spec.js` (frozen copy of dist, fake clock) | 11/11 |
| Existing `whatsapp-channel-12a.spec.js` + `home-10f.spec.js`, run once | 34/34 (after pre-dismissing the card in their setup, see DECISIONS.md 7) |
| Prerender | 268/268, 1 via fallback (`/`), same as baseline |
| Prerendered text vs baseline | `/` identical except the two layout wrapper classes of Phase 2; the card is NOT in any prerendered page. 3 other pages differ between two builds by live data (articles, videos, safalta, agro-forestry lists load from staging at build time), unrelated to this batch |
| Main chunk (`index-*.js`) gzip | 28.78 kB to 28.77 kB; strings chunk (`LanguageProvider-*.js`) 66.49 to 66.80 kB (+0.31 kB for the new text); CSS 14.35 kB |
| Card height at 360 / 320 px | 90 px (target about 88) |
| Mobile position check | "I need" button y 615, "I have" button y 691, same as production (12A test) |

## Layout shift on the day
The card is added after the page mounts, so on 20 Oct the content below it moves down once by about 98 px (card 90 px + 8 px top gap). Kept compact (no extra rows on phones) to keep it small. It does not happen on any other day.

## Screenshots (looked at)
`docs/review/batch12b/evidence/screens/`: `card-360x640.png`, `card-320x640.png`, `card-1366x768.png`, `card-1920x1080.png`, desktop `before-*-full.png` and `after-*-full.png`, and `before-360x640.png`, `before-320x640.png`.

## Not done
- **Staging deploy** and **ship-script dry run**: the tool permission check denied both (production-deploy rule) and I did not work around it. Run them yourself or allow them and I will finish: staging deploy command is in the prompt, dry run is `bash scripts/ship-prod-12b.sh --dry-run`. `release-12b` is pushed and `ship-12b` is on its head.
- Staging switch values were not read (needs the deploy).
- Android build not run.

## Secret scan
Run over the diff and the new docs: no keys, tokens or phone numbers (the public WhatsApp channel link is not a secret).
