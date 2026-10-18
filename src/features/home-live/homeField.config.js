// Batch 10D C — the homepage "Morning Field" band, crop strip, facts row and section reveal:
// every size, distance and timing in one place. homeField.css reads them through the CSS
// variables from FIELD_CSS_VARS (set once on the band wrapper), so no number is hard-coded in JSX.
// Breakpoints: drive / drift switch to the wide values from `wideFrom` px; the band is
// `height.desktop` tall from 1024 px (media queries in homeField.css mirror these).
//
// The SVG is viewBox 0 0 1200 190 with "slice": a 360 px phone (190 px tall) shows only the
// central ~360 units (x 420–780), a 1280 px desktop (230 px tall) shows x ≈ 70–1130. CSS px in
// the drive / drift keyframes are user units, because the transforms are in the SVG's user space.

/** Wheat sway period (s): the CSS loop and the per-group phase offsets use the same value. */
const SWAY = 3.2

export const FIELD_SCENE = {
  w: 1200,
  h: 190,
  // xMidYMax (not xMidYMid): identical up to ~1450 px wide; wider than that the bottom (the
  // ground, the wheat and the tractor) stays in view and only sky is cut (DECISIONS 20).
  aspect: 'xMidYMax slice',
  skyId: 'ksf-sky',
  sun: { cx: 700, cy: 50 },
  hills: [
    { d: 'M0 120 Q100 92 220 112 T460 104 T700 110 T940 100 T1200 112 V190 H0Z', opacity: 0.38 },
    { d: 'M0 142 Q150 118 300 138 T600 132 T900 136 T1200 130 V190 H0Z', opacity: 0.55 },
  ],
  clouds: [
    // [cx, cy, rx, ry] puffs drawn near x = 0; the drift moves them across. delay < 0 = mid-way at load.
    { puffs: [[60, 38, 26, 9], [78, 31, 17, 9]], delay: -12 },
    { puffs: [[40, 70, 20, 7], [54, 64, 13, 7]], delay: -30 },
  ],
  // Two rows: 86 + 100 = 186 stalks (seeded, so the prerendered HTML equals the client render).
  wheat: [
    { base: 178, step: 14, x0: 4, hMin: 16, hMax: 26, seed: 7, groups: 5, sway: SWAY, stem: 'var(--ks-green)', stemOpacity: 0.75 },
    { base: 192, step: 12, x0: 9, hMin: 18, hMax: 32, seed: 31, groups: 5, sway: SWAY, stem: 'var(--ks-green-dark)', stemOpacity: 1 },
  ],
  // The 10C hub tractor, scaled: 52 units long, wheels on the ground between the two rows.
  tractor: { y: 138, scale: 0.85 },
}

export const FIELD_MOTION = {
  /** Band height (px): phones and tablets, and from 1024 px. */
  height: { mobile: 190, desktop: 230 },
  /** From this width the drive / drift use the wide values (the visible part is wider). */
  wideFrom: 480,
  /** Tractor drive (user units, seconds). Phone: enters left of x 352 and leaves right of x 850,
   *  so it really crosses the visible x 420–780 of a 320–479 px phone; seen every 11 s. */
  drive: { phone: { from: 300, to: 850, dur: 11 }, wide: { from: -90, to: 1290, dur: 26 } },
  /** Cloud drift (user units, seconds for cloud 1 / cloud 2). */
  drift: { phone: { from: 330, to: 830, dur: 34, dur2: 47 }, wide: { from: -120, to: 1260, dur: 70, dur2: 95 } },
  /** Where the tractor and clouds stand when the band is still (reduced motion / save-data). */
  still: { tractor: 560, cloud: 470, cloud2: 600 },
  sunSpin: 40,
  sway: SWAY,
  /** Crop strip: seconds for one half of the strip to pass (slow). */
  marquee: 38,
  /** Facts count-up length (ms). */
  countUpMs: 900,
  /** Section reveal: rise distance (px) and fade length (ms). */
  reveal: { rise: 18, ms: 600 },
}

const px = (n) => `${n}px`
const s = (n) => `${n}s`

function fieldCssVars() {
  const M = FIELD_MOTION
  return {
    '--ksf-h-m': px(M.height.mobile),
    '--ksf-h-d': px(M.height.desktop),
    '--td-from-p': px(M.drive.phone.from),
    '--td-to-p': px(M.drive.phone.to),
    '--td-dur-p': s(M.drive.phone.dur),
    '--td-from-w': px(M.drive.wide.from),
    '--td-to-w': px(M.drive.wide.to),
    '--td-dur-w': s(M.drive.wide.dur),
    '--cd-from-p': px(M.drift.phone.from),
    '--cd-to-p': px(M.drift.phone.to),
    '--cd-dur-p': s(M.drift.phone.dur),
    '--cd-dur2-p': s(M.drift.phone.dur2),
    '--cd-from-w': px(M.drift.wide.from),
    '--cd-to-w': px(M.drift.wide.to),
    '--cd-dur-w': s(M.drift.wide.dur),
    '--cd-dur2-w': s(M.drift.wide.dur2),
    '--td-static': px(M.still.tractor),
    '--cd-static': px(M.still.cloud),
    '--cd-static2': px(M.still.cloud2),
    '--ksf-sun-dur': s(M.sunSpin),
    '--ksf-sway-dur': s(M.sway),
    '--ksf-marq-dur': s(M.marquee),
  }
}

/** Static, computed once. */
export const FIELD_CSS_VARS = fieldCssVars()
