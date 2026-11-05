import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { isNative } from '../lib/native'
import { whichInstallSurface } from '../lib/install/installStore'
import useInstall, { startInstall } from './install/useInstall'

// Batch 17F - the slim install strip on the homepage (below the nav, above the hero).
//  - ONE row at every width from 320 px: the text takes the free space (and may wrap to two lines
//    INSIDE its own column), the Install button never shrinks, the close button is a 44 px tap area.
//  - The install event is owned by src/lib/install (one module for this strip and the
//    returning-visitor bar); tapping Install uses the browser's own install box when it exists and
//    otherwise opens the step-by-step sheet (components/install/InstallSheets).
//  - Never shown in the installed app, after an install in this visit, in the Android app, or for
//    a browser that cannot install at all. The strip and the bar in PwaPrompts never show together.
//  - Dismiss (the cross) hides the strip for this visit only (sessionStorage); it comes back on a
//    later visit. The 14-day snooze belongs to the other bar (see DECISIONS.md).

const DISMISS_KEY = 'ks_install_banner_dismissed'

export default function PwaInstallBanner() {
  const { t } = useLang()
  const snap = useInstall()
  const { pathname } = useLocation()
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
  })

  const surface = whichInstallSurface({
    pathname,
    canPrompt: snap.canPrompt,
    installed: snap.installed,
    standalone: snap.standalone,
    native: isNative(),
    sheet: snap.ui.sheet,
    stripDismissed: dismissed,
    visits: 0,
    snoozed: false,
  })
  // A browser that cannot install at all has no use for an Install button; its people get the
  // /install page and the QR instead.
  if (surface !== 'strip' || snap.env === 'unsupported') return null

  function dismiss() {
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  return (
    <div
      data-testid="pwa-install-strip"
      data-env={snap.env}
      role="region"
      aria-label={t('pwa_banner_text')}
      style={{ background: 'var(--ks-green-dark)', color: '#fff' }}
    >
      <div className="flex flex-nowrap items-center gap-2 px-[var(--ks-gutter)] py-1">
        <span data-testid="pwa-install-text" className="min-w-0 flex-1 text-[14px] font-semibold leading-tight">
          <span aria-hidden="true">📲 </span>{t('pwa_banner_text')}
        </span>
        <button
          type="button"
          onClick={() => startInstall(snap)}
          data-testid="pwa-install-cta"
          className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-lg px-4 text-[14px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          style={{ background: '#fff', color: 'var(--ks-green-dark)' }}
        >
          {t('pwa_banner_install')}
        </button>
        <button
          type="button"
          onClick={dismiss}
          data-testid="pwa-install-dismiss"
          aria-label={t('pwa_banner_dismiss')}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-[18px] font-bold text-white/90 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
    </div>
  )
}
