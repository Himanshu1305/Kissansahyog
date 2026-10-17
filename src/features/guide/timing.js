// One place for every wait / duration of the guide.
// Test hook: if window.__KS_GUIDE_SPEED is a number (> 0), every wait is divided by it.

export function guideSpeed() {
  try {
    const s = typeof window !== 'undefined' ? window.__KS_GUIDE_SPEED : undefined
    return typeof s === 'number' && s > 0 ? s : 1
  } catch {
    return 1
  }
}

// A duration in ms, scaled by the speed hook.
export const dur = (ms) => ms / guideSpeed()

// Promise that resolves after `ms` (scaled).
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, dur(ms)))

// Wait for the next painted frame (after a state change has been committed).
export const nextFrame = () => new Promise((resolve) => {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve())
  else setTimeout(resolve, 16)
})

export function prefersReducedMotion() {
  try {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

// Data saver (Chrome / Android): no looping hero motion, no tour auto-rotation.
export function saveDataOn() {
  try {
    return !!navigator.connection?.saveData
  } catch {
    return false
  }
}
