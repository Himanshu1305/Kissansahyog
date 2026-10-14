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
export function publicOrigin() {
  return isNative() ? PUBLIC_ORIGIN : window.location.origin
}
export function publicHref() {
  if (!isNative()) return window.location.href
  const { pathname, search, hash } = window.location
  return `${PUBLIC_ORIGIN}${pathname}${search}${hash}`
}
