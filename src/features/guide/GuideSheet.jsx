// Batch 10C Task C — a full-height bottom sheet that plays one demo ON TOP of the current page
// (Signup, Login, Post, Browse). The page underneath is never unmounted and nothing navigates,
// so whatever the person has typed is still there when the sheet closes.
//
// Loaded lazily by GuideHelpButton (this file pulls in DemoPlayer and the guide engine).
//
// Closing: ✕ button, the finish card's Close, a tap on the dark backdrop, Esc, or Back.
// Back:
//   • Website / phone browser: opening pushes ONE history entry with the SAME url (only a marker
//     is added to history.state; react-router's own state fields are kept, so the route and
//     location.state stay the same). Back pops that entry → popstate → the sheet closes and the
//     page stays. Closing any other way calls history.back() once to remove the entry, so no
//     extra entries are left behind (the next Back leaves the page as usual).
//   • Android app (Capacitor): NativeShell turns the hardware Back key into the cancelable
//     'ks-native-back' event; useNativeBack consumes it and closes the sheet — the same mechanism
//     as the menu and the other sheets. No history entry is pushed in the app.
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { isNative } from '../../lib/native'
import { useNativeBack } from '../../lib/useNativeBack'
import DemoPlayer from './DemoPlayer.jsx'

const TITLE = { register: 'guide_register_h1', post: 'guide_post_h1', find: 'guide_find_h1' }
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// A history.back() that is still travelling (it is asynchronous). A sheet reopened in that
// moment waits for it, so its own new entry is not the one that gets popped.
let backInFlight = null
function popOwnEntry() {
  backInFlight = new Promise((resolve) => {
    let timer = 0
    const done = () => { window.removeEventListener('popstate', done); clearTimeout(timer); backInFlight = null; resolve() }
    window.addEventListener('popstate', done)
    timer = setTimeout(done, 800)
  })
  window.history.back()
}

export default function GuideSheet({ demoId, onClose, returnFocusRef }) {
  const { t } = useLang()
  const panelRef = useRef(null)
  const closeBtnRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const entry = useRef({ marker: null, popped: false, timer: 0 })
  const native = isNative()

  // Android app: hardware Back closes the sheet first (NativeShell → 'ks-native-back').
  useNativeBack(true, onClose)

  // Website: one history entry while open (see the header comment).
  useEffect(() => {
    if (native) return undefined
    const e = entry.current
    let alive = true
    let onPop = null
    clearTimeout(e.timer) // React StrictMode re-runs this effect at once: keep the same entry
    const start = () => {
      if (!alive) return
      if (!e.marker || window.history.state?.ksGuideSheet !== e.marker) {
        e.marker = `${demoId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        window.history.pushState({ ...(window.history.state || {}), ksGuideSheet: e.marker }, '')
      }
      onPop = () => {
        if (window.history.state?.ksGuideSheet === e.marker) return
        e.popped = true
        onCloseRef.current()
      }
      window.addEventListener('popstate', onPop)
    }
    if (backInFlight) backInFlight.then(start)
    else start()
    return () => {
      alive = false
      if (onPop) window.removeEventListener('popstate', onPop)
      // Deferred one tick so a StrictMode re-run can take the entry over instead.
      e.timer = setTimeout(() => {
        if (!e.popped && e.marker && window.history.state?.ksGuideSheet === e.marker) popOwnEntry()
        e.marker = null
      }, 0)
    }
  }, [native, demoId])

  // Body scroll lock (restored exactly), Esc, focus in / focus back, Tab kept inside the sheet.
  useEffect(() => {
    const body = document.body
    const prevOverflow = body.style.overflow
    body.style.overflow = 'hidden'
    const opener = returnFocusRef?.current || document.activeElement
    closeBtnRef.current?.focus()

    const onKey = (ev) => {
      if (ev.key === 'Escape') { ev.preventDefault(); onCloseRef.current(); return }
      if (ev.key !== 'Tab' || !panelRef.current) return
      const list = Array.from(panelRef.current.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement)
      if (!list.length) return
      const first = list[0], last = list[list.length - 1]
      const inside = panelRef.current.contains(document.activeElement)
      if (ev.shiftKey && (document.activeElement === first || !inside)) { ev.preventDefault(); last.focus() }
      else if (!ev.shiftKey && (document.activeElement === last || !inside)) { ev.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      body.style.overflow = prevOverflow
      if (opener && typeof opener.focus === 'function' && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [returnFocusRef])

  const titleId = `guide-sheet-title-${demoId}`
  return createPortal(
    <div className="ks-overlay fixed inset-0 z-[95] flex flex-col justify-end">
      <div data-testid="guide-sheet-backdrop" aria-hidden="true" className="absolute inset-0 bg-black/50" onClick={() => onCloseRef.current()} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="guide-sheet"
        data-demo={demoId}
        className="relative mx-auto flex max-h-[calc(100%-3rem)] min-h-0 w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-[var(--ks-bg)] shadow-2xl"
        style={{ height: 'calc(100% - 3rem)' }}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-[var(--ks-border)] bg-white px-4 py-2">
          <h2 id={titleId} className="min-w-0 flex-1 text-lg font-bold leading-snug text-[var(--ks-ink)]">
            {t(TITLE[demoId] || 'guide_sheet_title')}
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            data-testid="guide-sheet-close"
            onClick={() => onCloseRef.current()}
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1 rounded-xl border-2 border-stone-300 bg-white px-3 text-base font-bold text-[var(--ks-ink)] hover:bg-stone-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ks-saffron)]"
          >
            <span aria-hidden="true" className="text-xl leading-none">✕</span>
            {t('guide_sheet_close')}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6 pt-3">
          <DemoPlayer demoId={demoId} embedded autoStart onClose={() => onCloseRef.current()} />
        </div>
      </div>
    </div>,
    document.body,
  )
}
