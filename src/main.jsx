import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { isNative } from './lib/native.js'

// Batch 8A — Android app only: the page draws under the status / navigation bars, so the
// safe-area rules in index.css (html.native-app …) apply. The website never gets this class.
if (isNative()) document.documentElement.classList.add('native-app')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </StrictMode>,
)
