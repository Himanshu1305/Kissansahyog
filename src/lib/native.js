// Batch 8A — is this the Capacitor (Android) app, or the normal website?
//
// No static import of @capacitor/core: the native shell injects window.Capacitor before the
// page's scripts run, so the website's bundle carries nothing from Capacitor. Plugins are
// imported dynamically, and only inside native branches.
export const PUBLIC_ORIGIN = 'https://kissansahyog.com'

export function isNative() {
  return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() === true
}

// The origin / address to put in share text, QR codes and copied links. In the app the page
// runs on https://localhost, which is meaningless to anyone the link is sent to.
// Batch 10E (B17): the prerender snapshot runs on http://localhost:4178 — it must never bake that
// origin into share links in the static HTML, so it uses the public origin too.
const sharePublicOrigin = () => isNative() || window.__KS_PRERENDER === true
export function publicOrigin() {
  return sharePublicOrigin() ? PUBLIC_ORIGIN : window.location.origin
}
export function publicHref() {
  if (!sharePublicOrigin()) return window.location.href
  const { pathname, search, hash } = window.location
  return `${PUBLIC_ORIGIN}${pathname}${search}${hash}`
}
