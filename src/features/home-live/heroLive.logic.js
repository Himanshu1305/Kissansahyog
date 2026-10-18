// Batch 10D — homepage live hero: pure logic (no React, no DOM), importable from plain Node.
import { HERO_TIMING as T } from './heroLive.config.js'

export const PERSONA_COUNT = 5

// ── Ticker state (one reducer; the one timer dispatches 'step') ───────────────────────────
// idx: active persona · tick: 0…cycleTicks · auto: still rotating · rot: rotations so far.
export const HERO_INITIAL = { idx: 0, tick: 0, auto: true, rot: 0 }

export function heroReducer(s, a) {
  switch (a.type) {
    case 'step': {
      if (s.tick < T.cycleTicks - 1) return { ...s, tick: s.tick + 1 }
      if (s.auto && s.rot < T.maxRotations) {
        return { ...s, idx: (s.idx + 1) % PERSONA_COUNT, tick: 0, rot: s.rot + 1 }
      }
      // Rotation over (limit reached or a tab was picked): the active persona stays drawn.
      return { ...s, tick: T.cycleTicks, auto: false }
    }
    case 'pick':
      return { ...s, idx: a.idx, tick: 0, auto: false }
    default:
      return s
  }
}

/** The persona finished and nothing more will move (the timer can stop). */
export const heroEnded = (s) => !s.auto && s.tick >= T.cycleTicks

/** Next tab index for a key on the tablist, or -1. */
export function keyTarget(key, idx, n = PERSONA_COUNT) {
  if (key === 'ArrowRight' || key === 'ArrowDown') return (idx + 1) % n
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (idx - 1 + n) % n
  if (key === 'Home') return 0
  if (key === 'End') return n - 1
  return -1
}

// ── Text ──────────────────────────────────────────────────────────────────────────────────
// A text value in persona data: 'string_key' → t(key) · { raw: '₹2,450' } → as-is · [..] → joined.
export function txt(t, v) {
  if (v == null) return ''
  if (typeof v === 'string') return t(v)
  if (Array.isArray(v)) return v.map((x) => txt(t, x)).join('')
  if (typeof v === 'object' && 'raw' in v) return v.raw
  return ''
}

/** Split into user-perceived characters, so typing never shows half a Devanagari cluster. */
export function graphemes(s) {
  try {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      return Array.from(new Intl.Segmenter('hi', { granularity: 'grapheme' }).segment(s), (x) => x.segment)
    }
  } catch { /* old browser */ }
  return Array.from(s)
}

/** How much of a typed text shows at tick k (at → end), and whether the caret shows. */
export function typedAt(g, at, end, k) {
  const n = Math.max(0, Math.min(g.length, Math.round((g.length * (k - at)) / (end - at))))
  return { text: g.slice(0, n).join(''), caret: k >= at && k < end + T.caretTail }
}

/** Time left on the active tab, 1 → 0 (CSS --p). */
export const timeLeft = (tick) => Math.max(0, 1 - tick / T.cycleTicks)
