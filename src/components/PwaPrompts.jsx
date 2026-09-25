// Phase 5 — PWA UX: (c) an explicit "new update available" banner wired to
// vite-plugin-pwa's onNeedRefresh (never a silent auto-swap), (d) a home-screen
// install prompt shown only to returning visitors and suppressed 14 days once
// dismissed, and (b) an offline banner so cached prices/weather are never shown
// silently as current.
import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useLang } from '../lib/i18n/LanguageProvider'

const DAY = 24 * 60 * 60 * 1000
const INSTALL_DISMISS_KEY = 'ks_install_dismissed_at'
const VISIT_KEY = 'ks_visit_count'
const LAST_ONLINE_KEY = 'ks_last_online_at'

function ls(get, key, fallback = null) {
  try { return get ? localStorage.getItem(key) : fallback } catch { return fallback }
}
function lsSet(key, val) { try { localStorage.setItem(key, val) } catch { /* ignore */ } }

// Count this load as a visit; the returning-visitor signal is count >= 2.
function bumpVisit() {
  const n = Number(ls(true, VISIT_KEY, '0')) || 0
  const next = n + 1
  lsSet(VISIT_KEY, String(next))
  return next
}

export default function PwaPrompts() {
  const { t } = useLang()
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW() { /* registered */ },
    onRegisterError() { /* ignore — app works without the SW */ },
  })

  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine)
  const [lastOnline, setLastOnline] = useState(() => ls(true, LAST_ONLINE_KEY))
  const [installEvt, setInstallEvt] = useState(null)
  const [showInstall, setShowInstall] = useState(false)

  // Online/offline tracking → offline banner with a "last updated" time.
  useEffect(() => {
    function markOnline() {
      const now = String(Date.now())
      lsSet(LAST_ONLINE_KEY, now); setLastOnline(now); setOffline(false)
    }
    function markOffline() { setOffline(true) }
    if (navigator.onLine) markOnline()
    window.addEventListener('online', markOnline)
    window.addEventListener('offline', markOffline)
    return () => { window.removeEventListener('online', markOnline); window.removeEventListener('offline', markOffline) }
  }, [])

  // Install prompt — capture the browser event; show only to returning visitors
  // (visit count >= 2) and not within 14 days of a dismissal.
  useEffect(() => {
    const visits = bumpVisit()
    const dismissedAt = Number(ls(true, INSTALL_DISMISS_KEY, '0')) || 0
    const suppressed = dismissedAt && (Date.now() - dismissedAt) < 14 * DAY
    function onBeforeInstall(e) {
      e.preventDefault()
      setInstallEvt(e)
      if (visits >= 2 && !suppressed) setShowInstall(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  async function doInstall() {
    if (!installEvt) { setShowInstall(false); return }
    installEvt.prompt()
    try { await installEvt.userChoice } catch { /* ignore */ }
    setShowInstall(false); setInstallEvt(null)
  }
  function dismissInstall() { lsSet(INSTALL_DISMISS_KEY, String(Date.now())); setShowInstall(false) }

  const lastOnlineLabel = lastOnline
    ? new Date(Number(lastOnline)).toLocaleString('hi-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—'

  const bar = 'fixed inset-x-0 z-[60] flex flex-wrap items-center gap-2 px-4 py-2 text-[14px] shadow-lg'
  return (
    <>
      {/* Offline banner — cached data is never presented silently as current. */}
      {offline && (
        <div data-testid="offline-banner" className={`${bar} top-0`} style={{ background: 'var(--ks-orange-dark)', color: '#fff' }} role="status">
          <span className="font-semibold">📴 {t('pwa_offline_prefix')} {lastOnlineLabel}</span>
        </div>
      )}

      {/* Update-available banner (onNeedRefresh) — explicit, non-blocking. */}
      {needRefresh && (
        <div data-testid="pwa-update-banner" className={`${bar} bottom-0`} style={{ background: 'var(--ks-green-dark)', color: '#fff' }} role="status">
          <span className="font-semibold">🔄 {t('pwa_update_available')}</span>
          <button type="button" onClick={() => updateServiceWorker(true)} className="ml-auto rounded-lg px-3 py-1 text-[13px] font-bold" style={{ background: '#fff', color: 'var(--ks-green-dark)' }}>{t('pwa_reload')}</button>
        </div>
      )}

      {/* Install prompt — returning visitors only, dismiss suppresses 14 days. */}
      {showInstall && (
        <div data-testid="pwa-install-banner" className={`${bar} bottom-0`} style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', color: 'var(--ks-ink)' }} role="dialog">
          <span className="font-semibold">📲 {t('pwa_install_prompt')}</span>
          <span className="ml-auto flex gap-2">
            <button type="button" onClick={doInstall} className="rounded-lg px-3 py-1 text-[13px] font-bold text-white" style={{ background: 'var(--ks-green)' }}>{t('pwa_install')}</button>
            <button type="button" onClick={dismissInstall} className="rounded-lg px-3 py-1 text-[13px] font-bold" style={{ background: 'var(--ks-bg-soft)', color: 'var(--ks-ink-2)' }}>{t('pwa_later')}</button>
          </span>
        </div>
      )}
    </>
  )
}
