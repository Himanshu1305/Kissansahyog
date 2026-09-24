# Homepage v4 (Direction B · Balanced) — screenshot self-review

**I looked at the screenshots.** Both full-page screenshots (`home-desktop.png` at
1280×800, `home-mobile.png` at 375×812) were rendered from `npm run build && npm run
preview`, sliced into readable tiles (`scripts/slice.mjs`), and viewed with the image
viewer. Every image asset was also downloaded, `file`-verified as real JPEG/PNG,
resized, and viewed individually before the build (Phase 2).

## Checklist (per Phase 7)

| Check | Desktop | Mobile |
|---|---|---|
| Hero farmer photo visible, face not covered by text | PASS — farmer on the right, cream gradient carries the text on the left; face clear | PASS — 200px photo banner on top, full face visible |
| H1 "आज किसान के लिए" readable | PASS (computed 50px) | PASS (computed 32px) |
| Three InfoTiles readable (मौसम / भाव / सलाह) | PASS | PASS (stacked) |
| Two giant buttons green + orange | PASS | PASS |
| No grey/black/empty image blocks; every category tile + listing card has a photo | PASS — 8 category photos, 8 listing photos | PASS |
| Counts row shows six numbers | PASS (6·3·4·6·3·5) | PASS (3×2) |
| Listings show price, distance, WhatsApp (green) + Call | PASS | PASS |
| Video cards have thumbnails + play badges + duration | PASS (3:07 / 7:22 / 22:07) | PASS |
| Page background cream; no large dark-green blocks except ticker + footer | PASS | PASS |
| Content touches ~12px from both edges (edge-to-edge) | PASS | PASS |
| Text sizes match Phase 1b (H1/H2 spot-checked via getComputedStyle) | PASS (H1 50 / H2 28) | PASS (H1 32 / H2 24) |
| No horizontal scroll | PASS (scrollWidth 1280 = clientWidth) | PASS (375 = 375) |
| Buttons ≥ 44px | PASS | PASS |

### One issue found and fixed
- **Desktop horizontal scroll (scrollWidth 1334 > 1280).** Cause: the shared `NavBar`
  row (`max-w-6xl`, gap-3, px-4) overflowed at exactly 1280 once the full category-link
  set + language toggle + login/join cluster were laid out. Fixed by widening the nav
  container to `max-w-7xl` and tightening gap/padding (`gap-2 px-3`). Re-measured:
  scrollWidth = 1280. Re-screenshotted and re-viewed — nav now fits, join button visible.

## Regression (Phase 6)
Playwright smoke over `/`, `/credits`, `/info`, `/resources`, `/sawaal`,
`/sawaal?ask=1&photo=1`, `/yojana`, `/safalta`, `/articles`, `/browse`, `/post`,
`/welcome`: all render, no uncaught JS or console errors. `/browse` and `/post`
correctly redirect anonymous users to `/` (Protected route). New `/credits` route added.

## Image manifest summary (20 assets, all self-hosted)
Photographs (Pexels, 17): hero-farmer (elderly farmer in gamcha), cat-machines
(red tractor), cat-labour (women harvesting), cat-drone / list-drone (drone spraying),
cat-straw / list-straw (straw bales), cat-inputs (input sacks), cat-godown / list-godown
(grain warehouse), **cat-expert (re-searched — Indian farmer surveying a green paddy
field; the previous asset was a Western couple and was replaced)**, **cat-land
(re-searched — flat green paddy plot; previous asset was a Himalayan valley, not
MP-flat)**, list-harvester (combine), list-tractor (Indian women + tractor),
list-workers (Punjabi harvesters), list-land (flat farmland), list-shop (Indian shop).
Video thumbnails (YouTube, 3): video-1 soybean YMV (ICAR NSRI Indore, 2fOVTX4mDZ8),
video-2 wheat sowing (Annadata/News18, KI-K1O59mDo), video-3 drone spraying (O0PMu9lfboY).
Full attribution in `public/images/home/manifest.json`, surfaced at `/credits`.

## Pipeline hardening (per resume instructions)
`scripts/fetch-images.mjs` now runs `file -b` on every download and rejects anything
that is not `JPEG image data` / `PNG image data` (deletes it and flags a re-search).
The over-1200px hero was downscaled with `sips -Z 1200` before viewing; every asset is
< 1 MB. All interim/placeholder duplicates (cat-expert, video-1..3) were deleted and
re-fetched for real — no placeholder remains.

## Omitted (could not be verified)
- **drone-didi-official.jpg, pm-official.jpg, cm-official.jpg** — official PIB / mpinfo
  press photos. pib.gov.in returns HTTP 403 to automated fetch and Wikimedia Commons has
  no matching, verifiable, licensable image. Per the Phase 2/§10 rule ("omit any official
  cell that cannot be verified; do not substitute anything"), the three official cells in
  the "भरोसेमंद लोग" trust row are omitted. The founder cell renders an initials avatar
  (अ.दी.) with a `TODO: founder photo` comment — no stock face used.
