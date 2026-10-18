// Batch 10D — homepage live hero ("Kisan Studio"): every size and timing in one place.
// homeLive.css reads sizes through the CSS variables from heroCssVars() (set once on the hero
// root), so no size is hard-coded in the JSX. Breakpoints: phone < 768, tablet 768–1023,
// desktop ≥ 1024 (media queries in homeLive.css).

export const HERO_TIMING = {
  /** The one timer. Divided by guideSpeed() (test hook window.__KS_GUIDE_SPEED). */
  tickMs: 45,
  /** Ticks per persona: 240 × 45 ms ≈ 10.8 s. */
  cycleTicks: 240,
  /** Auto-rotation stops after this many rotations. */
  maxRotations: 13,
  /** The typing caret stays this many ticks after the text is complete. */
  caretTail: 6,
  /** Live engine: requestIdleCallback timeout, and the plain timeout when rIC is missing. */
  idleTimeoutMs: 2500,
  idleFallbackMs: 1200,
}

export const HERO_LAYOUT = {
  /** Content max width and side padding. */
  maxWidth: 1200,
  pad: { mobile: 16, tablet: 24, desktop: 40 },
  padY: { mobile: 12, tablet: 20, desktop: 20 },
  /** Desktop columns (fr) and the gap between them. */
  cols: { text: 55, stage: 45 },
  colGap: 36,
  /** Gap between blocks in the text column. */
  gap: { mobile: 10, desktop: 14 },
  /** Gap between the text column, the phone panel and the existing tiles (phones / tablet). */
  blockGap: { mobile: 12, tablet: 20 },
  /** Gap between the phone and the guide bubble (phones). */
  stageGap: 8,
  h1: { mobile: 32, tablet: 40, desktop: 46 },
  lead: { mobile: 15, desktop: 18 },
  /** Persona tabs. Desktop rows are a vertical list; on a short desktop window they fold into
   *  two columns so the H1, the tabs and both buttons fit in a 720 px tall window. */
  tab: { minH: 44, minHDesktop: 52, font: 15, fontDesktop: 17, gap: 6, gapDesktop: 6, rowMaxW: 600 },
  shortDesktopMaxH: 860,
  /** Big buttons. */
  cta: { minH: 52, font: 18 },
  /** The phone: ~20 % larger from 1024 px. In-screen text scales with it (em units). */
  phone: {
    // Phone height 250 (not the preview's 310) keeps the first "I need" button within the 360x640
    // allowance (DECISIONS 4).
    mobile: { w: 216, h: 250, pad: 6, r: 30, screenR: 24, font: 11.5 },
    desktop: { w: 260, h: 300, pad: 7, r: 36, screenR: 29, font: 13.8 },
  },
  /** Guide bubble. */
  bubble: { minH: 62, font: 16, avatar: 40, maxWTablet: 360 },
  /** Desktop right-column panel. */
  panel: { pad: 24, radius: 24 },
}

const px = (n) => `${n}px`

/** CSS custom properties for the hero root; homeLive.css references these. */
export function heroCssVars() {
  const L = HERO_LAYOUT
  const pm = L.phone.mobile
  const pd = L.phone.desktop
  return {
    '--khl-max': px(L.maxWidth),
    '--khl-pad-m': px(L.pad.mobile),
    '--khl-pad-t': px(L.pad.tablet),
    '--khl-pad-d': px(L.pad.desktop),
    '--khl-pady-m': px(L.padY.mobile),
    '--khl-pady-t': px(L.padY.tablet),
    '--khl-pady-d': px(L.padY.desktop),
    '--khl-cols': `minmax(0, ${L.cols.text}fr) minmax(0, ${L.cols.stage}fr)`,
    '--khl-col-gap': px(L.colGap),
    '--khl-gap-m': px(L.gap.mobile),
    '--khl-gap-d': px(L.gap.desktop),
    '--khl-block-gap-m': px(L.blockGap.mobile),
    '--khl-block-gap-t': px(L.blockGap.tablet),
    '--khl-stage-gap': px(L.stageGap),
    '--khl-h1-m': px(L.h1.mobile),
    '--khl-h1-t': px(L.h1.tablet),
    '--khl-h1-d': px(L.h1.desktop),
    '--khl-lead-m': px(L.lead.mobile),
    '--khl-lead-d': px(L.lead.desktop),
    '--khl-tab-h': px(L.tab.minH),
    '--khl-tab-h-d': px(L.tab.minHDesktop),
    '--khl-tab-font': px(L.tab.font),
    '--khl-tab-font-d': px(L.tab.fontDesktop),
    '--khl-tab-gap': px(L.tab.gap),
    '--khl-tab-gap-d': px(L.tab.gapDesktop),
    '--khl-tab-row-max': px(L.tab.rowMaxW),
    '--khl-cta-h': px(L.cta.minH),
    '--khl-cta-font': px(L.cta.font),
    '--khl-phone-w': px(pm.w),
    '--khl-phone-h': px(pm.h),
    '--khl-phone-pad': px(pm.pad),
    '--khl-phone-r': px(pm.r),
    '--khl-screen-r': px(pm.screenR),
    '--khl-screen-font': px(pm.font),
    '--khl-phone-w-d': px(pd.w),
    '--khl-phone-h-d': px(pd.h),
    '--khl-phone-pad-d': px(pd.pad),
    '--khl-phone-r-d': px(pd.r),
    '--khl-screen-r-d': px(pd.screenR),
    '--khl-screen-font-d': px(pd.font),
    '--khl-bubble-h': px(L.bubble.minH),
    '--khl-bubble-font': px(L.bubble.font),
    '--khl-ava': px(L.bubble.avatar),
    '--khl-bubble-max-t': px(L.bubble.maxWTablet),
    '--khl-panel-pad': px(L.panel.pad),
    '--khl-panel-r': px(L.panel.radius),
  }
}

/** Static, computed once (the hero root's style object never changes). */
export const HERO_CSS_VARS = heroCssVars()
