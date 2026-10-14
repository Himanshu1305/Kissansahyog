// Phase 5 — PWA UX: (c) an explicit "new update available" banner wired to
// vite-plugin-pwa's onNeedRefresh (never a silent auto-swap), (d) a home-screen
// install prompt shown only to returning visitors and suppressed 14 days once
// dismissed, and (b) an offline banner so cached prices/weather are never shown
// silently as current.
import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useLang } from '../lib/i18n/LanguageProvider'
import { isNative } from '../lib/native'
import { setOfflineHint, setOfflineBannerShown } from '../lib/offline/status'

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

// Batch 8A — two components, chosen once (isNative() never changes while the page lives),
// so no hook is ever called conditionally. The website gets WebPrompts, exactly as before.
export default function PwaPrompts() {
  return isNative() ? <NativePrompts /> : <WebPrompts />
}

function lastOnlineText(lastOnline) {
  return lastOnline
    ? new Date(Number(lastOnline)).toLocaleString('hi-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—'
}

// The Android app: its files are bundled, so there is no service worker to register, no
// update banner and no "install" prompt. Only the offline banner remains — placed below the
// status bar (the app draws edge to edge). A service worker left behind by an older build is
// removed.
function NativePrompts() {
  const { t } = useLang()
  const bannerRef = useRef(null)
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine)
  const [lastOnline, setLastOnline] = useState(() => ls(true, LAST_ONLINE_KEY))

  useEffect(() => {
    navigator.serviceWorker?.getRegistrations?.()
      .then((regs) => Promise.all((regs || []).map((r) => r.unregister())))
      .catch(() => { /* nothing to remove */ })
  }, [])

  // The WebView's own online/offline events, plus @capacitor/network (the system's view of
  // connectivity), whichever reports first.
  useEffect(() => {
    let gone = false
    let handle = null
    function apply(connected, fromSystem = false) {
      if (gone) return
      // Only the system's answer feeds the data layer: at a cold start the WebView's navigator.onLine
      // says "online" even in airplane mode.
      if (fromSystem) setOfflineHint(!connected)
      if (connected) { const now = String(Date.now()); lsSet(LAST_ONLINE_KEY, now); setLastOnline(now); setOffline(false) }
      else setOffline(true)
    }
    const markOnline = () => apply(true)
    const markOffline = () => apply(false)
    if (navigator.onLine) markOnline()
    window.addEventListener('online', markOnline)
    window.addEventListener('offline', markOffline)
    import('@capacitor/network').then(async ({ Network }) => {
      if (gone) return
      const status = await Network.getStatus()
      apply(!!status.connected, true)
      const h = await Network.addListener('networkStatusChange', (s) => apply(!!s.connected, true))
      if (gone) h?.remove?.(); else handle = h
    }).catch(() => { /* plugin unavailable: the window events above still work */ })
    return () => {
      gone = true
      handle?.remove?.()
      window.removeEventListener('online', markOnline)
      window.removeEventListener('offline', markOffline)
    }
  }, [])

  // Batch 9 (1B) — tell the Home stamp that the banner (with its own time) is showing.
  useEffect(() => { setOfflineBannerShown(offline); return () => setOfflineBannerShown(false) }, [offline])

  // Batch 8B (D1) — while the banner shows, its height is published as --ks-offline-h so the
  // page and the sticky header move down below it (index.css) instead of being covered.
  useEffect(() => {
    const root = document.documentElement
    const el = bannerRef.current
    if (!offline || !el) { root.style.removeProperty('--ks-offline-h'); return undefined }
    const apply = () => root.style.setProperty('--ks-offline-h', `${Math.ceil(el.getBoundingClientRect().height)}px`)
    apply()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null
    ro?.observe(el)
    return () => { ro?.disconnect(); root.style.removeProperty('--ks-offline-h') }
  }, [offline])

  if (!offline) return null
  return (
    <div ref={bannerRef} data-testid="offline-banner" className="fixed inset-x-0 z-[60] flex flex-wrap items-center gap-2 px-4 py-2 text-[14px] shadow-lg" style={{ top: 'var(--ks-safe-top, 0px)', background: 'var(--ks-orange-dark)', color: '#fff' }} role="status">
      <span className="font-semibold">📴 {t('pwa_offline_prefix')} {lastOnlineText(lastOnline)}</span>
    </div>
  )
}

function WebPrompts() {
  const { t } = useLang()
  const { needRefresh: [needRefresh] } = useRegisterSW({
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
