# Batch 10C — slow-phone check (F.10)

Run 2026-10-17T21:04:09.959Z by `node scripts/batch10c/slow-phone.mjs` against `vite preview` (production build, staging mode).
Conditions: 360x640 touch, CPU 4x slower, ~1.6 Mbps down / ~750 Kbps up / 150 ms latency (CDP), cold cache, service worker blocked, Hindi, NORMAL demo speed.

| Page | First screen visible (from navigation start) | FCP | Play-through | Steps in order / finished | Long tasks > 200 ms during play | Longest task during play | Long tasks > 200 ms during load | Transferred |
|---|---|---|---|---|---|---|---|---|
| `/guide` | 2814 ms | 2328 ms | — | 4 cards | — | — | 307 ms | 306 KB |
| `/guide/register` | 3207 ms | 2276 ms | 37.9 s | yes (0,1,2,3,4,5,6,7,8) / yes | 0 | 141 ms | 456 ms | 543 KB |
| `/guide/post` | 3252 ms | 2328 ms | 60.2 s | yes (0,1,2,3,4,5,6,7,8,9,10,11,12,13) / yes | 0 | 120 ms | 523 ms, 245 ms | 543 KB |
| `/guide/find` | 3213 ms | 2296 ms | 28.1 s | yes (0,1,2,3,4,5,6,7) / yes | 0 | 92 ms | 460 ms | 543 KB |
| `/guide/tour` | 3658 ms | 2564 ms | 24.6 s | yes (mandi,weather,schemes,questions,market) / yes | 0 | 0 ms | 825 ms | 543 KB |

## Guide chunks (dist/assets, gzip -9)

| File | Raw | gzip -9 |
|---|---|---|
| catalog-KGaQpWeV.js | 19.1 KB | 6.4 KB |
| DemoPlayer-CGPGNn-k.js | 24.6 KB | 7.6 KB |
| disclaimers-D37lztIn.js | 3.2 KB | 1.2 KB |
| guide-BiyxCfv8.js | 4.0 KB | 1.5 KB |
| guide-CZRgRg7c.css | 19.1 KB | 4.4 KB |
| GuideDemoPage-BGBxhDbP.js | 8.6 KB | 2.8 KB |
| GuideHelpButton-D7Yom6p6.js | 2.2 KB | 1.1 KB |
| GuideHub-vLuvuiNQ.js | 6.2 KB | 2.1 KB |
| GuideSheet-CZl8V4VR.js | 3.9 KB | 1.7 KB |
| useLoopActive-Db9yagvT.js | 0.6 KB | 0.4 KB |

| Route set | Raw | gzip -9 |
|---|---|---|
| /guide/:id (GuideDemoPage + DemoPlayer + useLoopActive + guide js + guide css) | 56.9 KB | 16.7 KB |
| /guide/:id JS only | 37.8 KB | 12.3 KB |
| /guide/:id + the shared app chunks it also needs (catalog, disclaimers) | 79.2 KB | 24.4 KB |
| /guide hub (GuideHub + useLoopActive + guide js + guide css) | 29.9 KB | 8.4 KB |
| help sheet (GuideSheet + DemoPlayer + guide js + css) | 51.5 KB | 15.2 KB |
| all guide-only chunks (no catalog / disclaimers) | 69.1 KB | 21.6 KB |

## Targets

- Hub usable within 4 s: **2814 ms** — PASS
- No long task over 300 ms during play: longest **141 ms** — PASS
- Every demo plays to the finish, no skipped step: PASS
- Guide route chunk under 40 KB gzipped: **16.7 KB** — PASS

Notes: "first screen visible" = the first moment the element (hub: the first card; demo: the phone screen) is rendered with a size (it may be below the fold), measured in the page with performance.now() (navigation start = 0). The shared LanguageProvider / react-vendor / index chunks are part of every page and are not counted as "guide chunk".
## Long tasks during page LOAD (not part of the target)

The "during load" column (one 245–825 ms task while the app starts on a 4x-slowed CPU) is app start-up, not the
guide: a control run with the same throttling (`scratchpad ctrl.mjs`, no in-page recorder) gave, per cold load,
`/about` none and 203 ms, `/how-to-use` none, `/guide` 321 ms, `/guide/tour` none and 244 ms — the same order of size
on non-guide pages, and it varies run to run. The slow-phone script's own in-page recorder (a MutationObserver doing
querySelector on every change) also adds work, so its play-through numbers are on the cautious side.
During play-through no task went over 141 ms (target 300 ms).
