import { Component } from 'react'
import { strings } from '../lib/i18n/strings'

const RECOVERY_KEY = 'ks_recovered'
const STALE_BUILD_MARKERS = ['Failed to fetch dynamically imported module', 'Unknown or not-yet-enabled category', 'Importing a module script failed', 'ChunkLoadError']

function isStaleBuild(error) {
  return STALE_BUILD_MARKERS.some((marker) => String(error?.message || error || '').includes(marker))
}

async function recoverStaleBuild() {
  try { sessionStorage.setItem(RECOVERY_KEY, '1') } catch { /* storage can be unavailable */ }
  try {
    const registrations = await navigator.serviceWorker?.getRegistrations?.()
    await Promise.all((registrations || []).map((registration) => registration.unregister()))
  } catch { /* recovery should still continue */ }
  try {
    const keys = await caches?.keys?.()
    await Promise.all((keys || []).map((key) => caches.delete(key)))
  } catch { /* Cache Storage is optional */ }
  window.location.reload()
}

export default class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error) {
    let recovered = false
    try { recovered = sessionStorage.getItem(RECOVERY_KEY) === '1' } catch { /* ignore */ }
    if (isStaleBuild(error) && !recovered) void recoverStaleBuild()
  }
  render() {
    if (!this.state.error) return this.props.children
    return <main className="grid min-h-screen place-items-center bg-[var(--ks-bg)] px-4 text-center"><section className="w-full max-w-lg rounded-2xl border border-[var(--ks-border)] bg-white p-6 shadow-sm"><h1 className="text-xl font-extrabold text-[var(--ks-ink)]">{strings.error_page_title.hi} / {strings.error_page_title.en}</h1><p className="mt-2 text-sm text-[var(--ks-ink-2)]">{strings.error_page_body.hi} / {strings.error_page_body.en}</p><div className="mt-5 flex flex-wrap justify-center gap-3"><button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-[var(--ks-primary)] px-4 py-2 font-bold text-white">{strings.error_page_reload.hi} / {strings.error_page_reload.en}</button><a href="/" className="rounded-lg border border-[var(--ks-primary)] px-4 py-2 font-bold text-[var(--ks-primary)]">{strings.error_page_home.hi} / {strings.error_page_home.en}</a></div></section></main>
  }
}
