// Batch 10C Task C — the "help" pill on Signup / Login / Post / Browse. Kept tiny on purpose:
// pages import it, so it must not pull the guide engine into their chunks. The sheet (and the
// DemoPlayer inside it) is loaded with import() only when the pill is tapped.
// The sheet opens over the page — the page and its form are never remounted, nothing navigates.
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useLang } from '../../lib/i18n/LanguageProvider'

const load = () => import('./GuideSheet.jsx')
// If the chunk cannot load (offline), close quietly and let the next tap try again — a failed
// import must never reach the app's ErrorBoundary and wipe a half-filled form.
function makeSheet() {
  return lazy(() => load().catch(() => ({
    default: function SheetFailed({ onClose }) {
      useEffect(() => { Sheet = makeSheet(); onClose() }, [onClose])
      return null
    },
  })))
}
let Sheet = makeSheet()

export default function GuideHelpButton({ demoId, label, size = 'md', testid, className = '' }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)
  const close = useRef(() => setOpen(false)).current
  const sm = size === 'sm'
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        data-testid={testid}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        onPointerEnter={load}
        onFocus={load}
        className={`inline-flex min-h-[44px] shrink-0 items-center rounded-full border-2 border-[var(--ks-green)] bg-[var(--ks-green-tint)] font-bold text-[var(--ks-green-dark)] hover:bg-white active:bg-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ks-saffron)] ${sm ? 'max-w-[8.25rem] gap-1.5 py-0.5 pl-1 pr-2 text-left text-[13px] leading-[1.15]' : 'gap-2 py-1.5 pl-1.5 pr-4 text-base leading-snug'} ${className}`}
      >
        <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full bg-[var(--ks-green)] text-white ${sm ? 'h-6 w-6' : 'h-8 w-8'}`}>
          <svg viewBox="0 0 24 24" className={sm ? 'ml-0.5 h-3 w-3' : 'ml-0.5 h-4 w-4'} fill="currentColor" focusable="false"><path d="M7 4.5v15l13-7.5z" /></svg>
        </span>
        <span>{t(label)}</span>
      </button>
      {open && (
        <Suspense fallback={<span className="ks-overlay fixed inset-0 z-[95] block bg-black/50" aria-hidden="true" />}>
          <Sheet demoId={demoId} onClose={close} returnFocusRef={btnRef} />
        </Suspense>
      )}
    </>
  )
}
