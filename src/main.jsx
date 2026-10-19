import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Batch 10D E — the shared 10C phone frame and field scene ship in the main stylesheet, not with
// the lazy guide chunks (no unstyled flash, no shift when a chunk arrives). The components still
// import them (deduplicated by Vite). Batch 10F removed the homepage live hero and field band
// (and their two stylesheets); these two are kept so /guide loads exactly as before.
import './features/guide/phone.css'
import './features/guide/fieldScene.css'
import App, { preloadHomepage } from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { isNative } from './lib/native.js'

// Batch 8A — Android app only: the page draws under the status / navigation bars, so the
// safe-area rules in index.css (html.native-app …) apply. The website never gets this class.
if (isNative()) document.documentElement.classList.add('native-app')

// Batch 10D E — layout-shift fix (CLS). createRoot replaces the prerendered HTML on its first
// commit; on "/" the lazy Homepage chunk was not there yet, so the page was swapped for the
// loading spinner (footer jumping up) and back. On "/" we first wait for that chunk (it is fetched
// now instead of a moment later), keeping the prerendered page on screen; the first commit then
// draws the real homepage (App.jsx renders the preloaded module without suspending). Other
// routes start exactly as before. A failed fetch renders as before (the usual lazy route).
const firstRoute = window.location.pathname === '/' ? preloadHomepage().catch(() => null) : null

function start() {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ErrorBoundary><App /></ErrorBoundary>
    </StrictMode>,
  )
}

if (firstRoute) firstRoute.then(start)
else start()
