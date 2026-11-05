import { useEffect, useRef } from 'react'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { installStore } from '../../lib/install/installStore'
import useInstall from './useInstall'
import InstallHelp from './InstallHelp'
import { BigTick } from './InstallIcons'

// Batch 17F - ONE place that shows every install sheet, mounted once in App (website only):
//   guide   - the steps for this phone / browser (opened by the Install buttons)
//   later   - the person closed the browser's own install box: "no problem, later"
//   success - the browser said the app is installed (appinstalled)
//   welcome - first launch from the home-screen icon (also covers iPhone, which has no event)
// A bottom sheet: role="dialog", aria-modal, focus goes in and comes back, Escape closes, Tab
// stays inside, buttons are 56 px high, text readable at 320 px.

const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'

function Sheet({ labelId, onClose, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const prev = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return }
      if (e.key !== 'Tab' || !ref.current) return
      const items = [...ref.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement)
      if (items.length === 0) { e.preventDefault(); return }
      const first = items[0]; const last = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = prevOverflow
      try { prev?.focus?.() } catch { /* ignore */ }
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center md:items-center" data-testid="install-sheet-root">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        tabIndex={-1}
        data-testid="install-sheet"
        className="relative max-h-[92vh] w-full max-w-[480px] overflow-y-auto rounded-t-2xl p-5 shadow-2xl outline-none md:rounded-2xl"
        style={{ background: 'var(--ks-card)', color: 'var(--ks-ink)', paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
      >
        {children}
      </div>
    </div>
  )
}

function BigButton({ onClick, children, testid, tone = 'primary' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      className="mt-4 inline-flex min-h-[56px] w-full items-center justify-center rounded-xl border-2 px-4 text-[18px] font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-green-dark)]"
      style={tone === 'primary' ? { background: 'var(--ks-green-dark)', borderColor: 'var(--ks-green-dark)', color: '#fff' } : { background: 'var(--ks-card)', borderColor: 'var(--ks-border)', color: 'var(--ks-ink)' }}
    >
      {children}
    </button>
  )
}

export default function InstallSheets() {
  const { t } = useLang()
  const snap = useInstall()
  const close = () => installStore.closeSheet()

  // A person who opens the app from the icon sees the one-time welcome (a no-op in a browser tab).
  useEffect(() => { installStore.maybeWelcome() }, [])

  const { sheet } = snap.ui
  if (sheet === 'none') return null

  if (sheet === 'success') {
    return (
      <Sheet labelId="inst-done-h" onClose={close}>
        <div className="flex flex-col items-center text-center" data-testid="install-success">
          <BigTick />
          <h2 id="inst-done-h" className="mt-3 text-[24px] font-extrabold leading-snug">{t('inst_done_title')}</h2>
          <p className="mt-2 text-[17px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{t('inst_done_body')}</p>
          <p className="mt-2 text-[16px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{t('inst_done_hint')}</p>
        </div>
        <BigButton onClick={close} testid="install-success-ok">{t('inst_ok')}</BigButton>
      </Sheet>
    )
  }

  if (sheet === 'welcome') {
    return (
      <Sheet labelId="inst-welcome-h" onClose={close}>
        <div className="text-center" data-testid="install-welcome">
          <h2 id="inst-welcome-h" className="text-[22px] font-extrabold leading-snug">{t('inst_welcome_title')}</h2>
          <p className="mt-2 text-[17px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{t('inst_welcome_body')}</p>
        </div>
        <BigButton onClick={close} testid="install-welcome-ok">{t('inst_ok')}</BigButton>
      </Sheet>
    )
  }

  if (sheet === 'later') {
    return (
      <Sheet labelId="inst-later-h" onClose={close}>
        <h2 id="inst-later-h" className="text-[21px] font-extrabold leading-snug">{t('inst_sheet_title')}</h2>
        <p className="mt-2 text-[17px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }} data-testid="install-later">{t('inst_later')}</p>
        <BigButton onClick={close} testid="install-later-ok">{t('inst_ok')}</BigButton>
      </Sheet>
    )
  }

  // sheet === 'guide'
  return (
    <Sheet labelId="inst-guide-h" onClose={close}>
      <InstallHelp env={snap.env} titleTag="h2" titleId="inst-guide-h" />
      {snap.canPrompt && (
        <BigButton onClick={() => installStore.promptInstall()} testid="install-native-btn">{t('inst_native_btn')}</BigButton>
      )}
      <BigButton onClick={close} testid="install-sheet-close" tone="plain">{t('inst_close')}</BigButton>
    </Sheet>
  )
}
