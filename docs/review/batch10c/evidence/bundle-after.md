# Bundle after Batch 10C (Task F)

Build: `npx vite build --mode staging` of a CLEAN copy of HEAD `86f047e` (`git archive HEAD`, same `.env`,
`node_modules` linked). Baseline: `bundle-before.md` / the Task A baseline build of `release-10a` head `b6a65bf`.
Sizes in bytes; "gz" = `gzip -9`.

## Eagerly loaded (every page)

| Chunk | Before raw | Before gz | After raw | After gz | Δ raw | Δ gz |
|---|---|---|---|---|---|---|
| **index-*.js (main)** | 80,883 | 27,156 | 81,615 | 27,391 | **+732** | **+235** |
| **LanguageProvider-*.js** (all strings) | 216,876 | 56,143 | 237,503 | 61,207 | **+20,627** | **+5,064** |
| PageShell-*.js (NavBar, Footer) | 53,070 | 14,911 | 54,062 | 15,220 | +992 | +309 |
| react-vendor-*.js | 228,865 | 72,259 | 228,872 | 72,263 | +7 | +4 |
| supabase-*.js | 208,116 | 53,057 | 208,116 | 53,057 | 0 | 0 |
| useNativeBack / rolldown-runtime / device | 1,674 | 1,173 | 1,674 | 1,174 | 0 | +1 |
| index-*.css (Tailwind) | 60,766 | 11,938 | 62,993 | 12,305 | +2,227 | +367 |
| **Total eager** | | **236,637** | | **242,617** | | **+5,980 (+2.5 %)** |

- Main chunk: +235 B gz (Vite's preload map gains the new route chunk names). Within "a few KB".
- Almost all of the eager growth is the 136 new `guide_*` strings in `strings.js` (rule 4 puts all text there),
  already flagged HUMAN-REVIEW in DECISIONS.md A-46.
- No guide code in any eager chunk: `ksg-` / `demo-player` appear only in `DemoPlayer-*.js` and `GuideDemoPage-*.js`.

## Pages that got an entry point (lazy route chunks)

| Chunk | Before gz | After gz | Δ gz |
|---|---|---|---|
| Signup | 3,303 | 3,370 | +67 |
| Login | 1,674 | 1,755 | +81 |
| Post | 7,475 | 7,589 | +114 |
| Browse | 2,521 | 2,655 | +134 (includes the Task H `etag` fix) |
| Welcome | 773 | 1,215 | +442 |
| Homepage | 9,096 | 9,337 | +241 |
| HowToUse | 14,444 | 14,752 | +308 |

## Guide chunks (new, lazy)

| Chunk | Raw | gz |
|---|---|---|
| DemoPlayer-*.js (player, engine, demos, MockScreen) | 25,154 | 7,756 |
| GuideDemoPage-*.js (page + TourExplorer) | 8,801 | 2,894 |
| GuideHub-*.js | 6,339 | 2,160 |
| guide-*.js (config, timing, progress, icons) | 4,052 | 1,542 |
| useLoopActive-*.js | 665 | 398 |
| guide-*.css | 19,562 | 4,580 |
| GuideSheet-*.js (help sheet) | 3,982 | 1,793 |
| GuideHelpButton-*.js (shared by Signup/Login/Post/Browse) | 2,220 | 1,178 |

A demo page (`/guide/<id>`) needs GuideDemoPage + DemoPlayer + guide + useLoopActive + css ≈ **17 KB gz**
(plus the app's existing `catalog` 6.6 KB gz and `disclaimers` chunks if not already cached). Exact gzip -9 per route
set: `slow-phone.md`. Target "under 40 KB gz": met.

## Warning for the ship step (G): untracked files inflate the CSS of a local build

Tailwind v4 scans every file that is not git-ignored. The untracked folder `design/reference/` (TSX files of a
"hearlog hero" reference, not part of this batch) adds its classes to the app CSS when you build from the working
folder: `index-*.css` becomes **71,583 raw / 14,063 gz** instead of 62,993 / 12,305 (+1.7 KB gz on every page,
classes no page uses). Build the release from a clean checkout (or move `design/reference/` out / git-ignore it)
before deploying. Nothing was changed for this; the founder's untracked files were left alone.
