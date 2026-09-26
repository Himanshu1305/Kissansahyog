import { useEffect, useState } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'

// Phase 7 — slim, dismissible install banner on the homepage (below nav, above hero).
// Complements (does not replace) the returning-visitor prompt in PwaPrompts.
//  - Android/Chrome: uses the captured beforeinstallprompt to trigger the native install.
//  - iOS/Safari (no install API): shows Add-to-Home-Screen instructions instead of a broken button.
//  - Never rendered in installed/standalone mode.
//  - Dismiss hides it for the SESSION only (reappears on a later visit) — unlike PwaPrompts'
//    14-day cooldown.

// Capture beforeinstallprompt at module load so an early event isn't missed before mount.
let deferredPrompt = null
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    window.dispatchEvent(new Event('ks-install-available'))
  })
  window.addEventListener('appinstalled', () => { deferredPrompt = null })
}

const DISMISS_KEY = 'ks_install_banner_dismissed' // sessionStorage → per-visit

function isStandalone() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  } catch {
    return false
  }
}
function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent || '') && !window.navigator.standalone
}

export default function PwaInstallBanner() {
  const { t } = useLang()
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
  })
  const [hasPrompt, setHasPrompt] = useState(!!deferredPrompt)
  const [iosHelp, setIosHelp] = useState(false)
  const ios = typeof navigator !== 'undefined' && isIos()

  useEffect(() => {
    function onAvail() { setHasPrompt(true) }
    window.addEventListener('ks-install-available', onAvail)
    return () => window.removeEventListener('ks-install-available', onAvail)
  }, [])

  // Never in standalone; never once dismissed this session; only when installable
  // (Android event captured) or on iOS (instructions path).
  if (isStandalone() || dismissed) return null
  if (!hasPrompt && !ios) return null

  function dismiss() {
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  async function install() {
    if (ios) { setIosHelp((v) => !v); return }
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    try { await deferredPrompt.userChoice } catch { /* ignore */ }
    deferredPrompt = null
    setHasPrompt(false)
  }

  return (
    <div
      data-testid="pwa-install-strip"
      className="flex flex-wrap items-center gap-2 px-[var(--ks-gutter)] py-2 text-[14px]"
      style={{ background: 'var(--ks-green-dark)', color: '#fff' }}
      role="region"
    >
      <span className="font-semibold">📲 {t('pwa_banner_text')}</span>
      <span className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={install}
          data-testid="pwa-install-cta"
          className="rounded-lg px-3 py-1 text-[13px] font-bold"
          style={{ background: '#fff', color: 'var(--ks-green-dark)' }}
        >
          {t('pwa_banner_install')}
        </button>
        <button type="button" onClick={dismiss} aria-label={t('pwa_banner_dismiss')} className="px-1 text-[18px] font-bold text-white/90">✕</button>
      </span>
      {ios && iosHelp && (
        <p className="mt-1 w-full text-[13px] text-white/95" data-testid="pwa-ios-help">{t('pwa_ios_help')}</p>
      )}
    </div>
  )
}
