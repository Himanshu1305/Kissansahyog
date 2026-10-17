# Batch 10C close — slow-phone check on PRODUCTION (1.9)

Run 2026-10-17T22:55:48.328Z by `node scripts/batch10c/slow-phone.mjs` against PRODUCTION https://kissansahyog.com (chunk sizes from the live files).
Conditions: 360x640 touch, CPU 4x slower, ~1.6 Mbps down / ~750 Kbps up / 150 ms latency (CDP), cold cache, service worker blocked, Hindi, NORMAL demo speed.

| Page | First screen visible (from navigation start) | FCP | Play-through | Steps in order / finished | Long tasks > 200 ms during play | Longest task during play | Long tasks > 200 ms during load | Transferred |
|---|---|---|---|---|---|---|---|---|
| `/guide` | 4503 ms | 1932 ms | — | 4 cards | — | — | 223 ms, 233 ms | 546 KB |
| `/guide/register` | 4609 ms | 1960 ms | 38.0 s | yes (0,1,2,3,4,5,6,7,8) / yes | 0 | 102 ms | 237 ms, 212 ms, 264 ms | 566 KB |
| `/guide/post` | 5513 ms | 2596 ms | 59.9 s | yes (0,1,2,3,4,5,6,7,8,9,10,11,12,13) / yes | 2 | 208 ms | 536 ms, 325 ms, 374 ms | 565 KB |
| `/guide/find` | 5618 ms | 2560 ms | 27.7 s | yes (0,1,2,3,4,5,6,7) / yes | 1 | 345 ms | 216 ms, 448 ms, 354 ms | 565 KB |
| `/guide/tour` | 4669 ms | 2632 ms | 24.5 s | yes (mandi,weather,schemes,questions,market) / yes | 0 | 50 ms | 207 ms, 250 ms, 441 ms | 565 KB |

## Guide chunks (dist/assets, gzip -9)

| File | Raw | gzip -9 |
|---|---|---|
| catalog-KGaQpWeV.js | 19.1 KB | 6.4 KB |
| DemoPlayer-CGPGNn-k.js | 24.6 KB | 7.6 KB |
| disclaimers-D37lztIn.js | 3.2 KB | 1.2 KB |
| guide-BiyxCfv8.js | 4.0 KB | 1.5 KB |
| guide-CZRgRg7c.css | 19.1 KB | 4.4 KB |
| GuideDemoPage-BQPd4yAN.js | 8.6 KB | 2.8 KB |
| GuideHelpButton-D7Yom6p6.js | 2.2 KB | 1.1 KB |
| GuideHub-D5eP1opf.js | 6.2 KB | 2.1 KB |
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

- Hub usable within 4 s: **4503 ms** — MISS
- No long task over 300 ms during play: longest **345 ms** — MISS
- Every demo plays to the finish, no skipped step: PASS
- Guide route chunk under 40 KB gzipped: **16.7 KB** — PASS

Notes: "first screen visible" = the first moment the element (hub: the first card; demo: the phone screen) is rendered with a size (it may be below the fold), measured in the page with performance.now() (navigation start = 0). The shared LanguageProvider / react-vendor / index chunks are part of every page and are not counted as "guide chunk".
