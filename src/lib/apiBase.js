import { isNative, PUBLIC_ORIGIN } from './native.js'

// Address of one of the site's own server functions (/api/feedback, /geocode, /transcribe).
// On the website these are same-origin, so the path is returned unchanged. The app is served
// from https://localhost and has no server of its own: there the call goes to the live site
// (functions/_middleware.js answers the CORS check for the app's origin).
// Files bundled with the app (/search-index.json, /images/…) are NOT server functions and
// stay relative.
export function apiUrl(path) {
  return isNative() ? PUBLIC_ORIGIN + path : path
}
