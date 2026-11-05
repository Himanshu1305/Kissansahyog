// Batch 17F - the ONE place that owns the browser's install event.
//
// Before this batch the homepage strip (PwaInstallBanner) and the returning-visitor bar
// (PwaPrompts) each had their own beforeinstallprompt listener and their own behaviour. Now both
// read this store. It has no UI. Rules it keeps:
//  - beforeinstallprompt is captured once, at module load (so an early event is not missed).
//  - prompt() is called synchronously inside the user's tap (no await before it).
//  - A website cannot place an icon or know whether it is on the home screen: appinstalled only
//    tells us the browser finished installing. Nothing here claims more than that.
import { detectInstallEnv } from './detectEnv.js'

export const KEYS = {
  installedAt: 'ks_installed_at',
  welcomed: 'ks_welcomed_standalone',
}

const NO_UI = { sheet: 'none' } // sheet: none | guide | later | success | welcome

function lsGet(win, key) { try { return win?.localStorage?.getItem(key) ?? null } catch { return null } }
function lsSet(win, key, val) { try { win?.localStorage?.setItem(key, val) } catch { /* storage blocked: fine */ } }

function readStandalone(win) {
  try {
    if (win?.matchMedia?.('(display-mode: standalone)')?.matches) return true
    return win?.navigator?.standalone === true
  } catch { return false }
}

function makeStore(win) {
  let deferred = null
  let installed = false
  let ui = NO_UI
  let welcomedThisLoad = false
  const listeners = new Set()
  let snapshot = null

  function compute() {
    const nav = win?.navigator
    const standalone = readStandalone(win)
    const canPrompt = !!deferred && !installed && !standalone
    const env = win
      ? detectInstallEnv(nav?.userAgent, {
        standalone,
        installed,
        canPrompt,
        touchPoints: nav?.maxTouchPoints,
        swSupported: nav ? 'serviceWorker' in nav : false,
      })
      : 'unsupported'
    return { env, canPrompt, installed, standalone, ui }
  }
  function emit() {
    snapshot = compute()
    listeners.forEach((fn) => { try { fn() } catch { /* a listener must not break the others */ } })
  }
  snapshot = compute()

  if (win?.addEventListener) {
    win.addEventListener('beforeinstallprompt', (e) => {
      // Stop the browser's own mini-bar: we show the prompt when the person taps Install.
      try { e.preventDefault() } catch { /* ignore */ }
      deferred = e
      emit()
    })
    win.addEventListener('appinstalled', () => {
      deferred = null
      installed = true
      lsSet(win, KEYS.installedAt, new Date().toISOString())
      ui = { sheet: 'success' }
      emit()
    })
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn) } },

    // MUST be called straight from a click handler: prompt() runs before anything is awaited.
    promptInstall() {
      const evt = deferred
      if (!evt) return Promise.resolve({ outcome: 'unavailable' })
      try { evt.prompt() } catch { deferred = null; emit(); return Promise.resolve({ outcome: 'unavailable' }) }
      deferred = null // a captured event can be prompted only once
      if (ui.sheet === 'guide') ui = NO_UI // the browser's own box takes over from our steps
      emit()
      return Promise.resolve(evt.userChoice)
        .then((choice) => {
          const outcome = choice?.outcome === 'accepted' ? 'accepted' : 'dismissed'
          if (outcome === 'dismissed') { ui = { sheet: 'later' }; emit() }
          return { outcome }
        })
        .catch(() => ({ outcome: 'dismissed' }))
    },

    openGuide() { ui = { sheet: 'guide' }; emit() },
    closeSheet() { if (ui.sheet !== 'none') { ui = NO_UI; emit() } },

    // First launch from the home-screen icon: one small welcome (also covers iPhone, which has
    // no appinstalled event). Once per phone (flag), once per page load (memory).
    maybeWelcome() {
      if (!readStandalone(win) || welcomedThisLoad) return
      welcomedThisLoad = true
      if (lsGet(win, KEYS.welcomed) === '1') return
      lsSet(win, KEYS.welcomed, '1')
      ui = { sheet: 'welcome' }
      emit()
    },
  }
}

const SLOT = '__ksInstallStore'
// One store per window: asking again returns the same one (and adds no second listener).
export function getInstallStore(win) {
  if (!win) return makeStore(null)
  if (!win[SLOT]) {
    try { Object.defineProperty(win, SLOT, { value: makeStore(win), enumerable: false }) } catch { win[SLOT] = makeStore(win) }
  }
  return win[SLOT]
}

// The store of this page. Created when this file is first imported (module load), which happens
// before React mounts, so an early beforeinstallprompt is not lost.
export const installStore = getInstallStore(typeof window !== 'undefined' ? window : null)

// Which install prompt, if any, may show right now. Exactly one of 'strip' | 'bar' | 'none':
//  - the homepage strip shows on the homepage only;
//  - the returning-visitor bar shows on the other pages only, and only if the browser really can
//    open the install dialog (same rule as before this batch);
//  - neither shows when installed, in standalone or in the Android app; the bar also waits while a sheet is open;
//  - /install is the help page itself, so it shows neither.
export function whichInstallSurface({ pathname, canPrompt, installed, standalone, native, sheet, stripDismissed, visits, snoozed }) {
  if (installed || standalone || native) return 'none'
  // The strip stays put while a sheet is open (hiding it would shift the page under the sheet).
  if (pathname === '/') return stripDismissed ? 'none' : 'strip'
  if (pathname === '/install' || pathname?.startsWith('/install/')) return 'none'
  if (canPrompt && visits >= 2 && !snoozed && (!sheet || sheet === 'none')) return 'bar'
  return 'none'
}
