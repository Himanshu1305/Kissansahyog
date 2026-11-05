// Batch 17F - the install links, and copy / share helpers. No React.
export const INSTALL_ORIGIN = 'https://kissansahyog.com'
export const INSTALL_URL = `${INSTALL_ORIGIN}/install`
// What the printed / on-screen QR points to. "?s=qr" only marks where the visit came from.
export const INSTALL_QR_URL = `${INSTALL_ORIGIN}/install?s=qr`

// Copy text. Returns true if it was copied. Tries the clipboard API, then the old textarea way.
export async function copyText(text, win = typeof window !== 'undefined' ? window : null) {
  try {
    if (win?.navigator?.clipboard?.writeText) {
      await win.navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* fall through to the old way */ }
  try {
    const doc = win?.document
    if (!doc?.body || !doc.execCommand) return false
    const ta = doc.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    doc.body.appendChild(ta)
    ta.select()
    const ok = doc.execCommand('copy')
    doc.body.removeChild(ta)
    return !!ok
  } catch { return false }
}

// Share the install link with the phone's share sheet; if there is none, copy it.
// Returns 'shared' | 'copied' | 'cancelled' | 'failed'.
export async function shareInstallLink({ text, url = INSTALL_URL, title }, win = typeof window !== 'undefined' ? window : null) {
  const nav = win?.navigator
  if (nav?.share) {
    try {
      await nav.share({ title, text, url })
      return 'shared'
    } catch (e) {
      // The person closed the share sheet: not an error, and no copy behind their back.
      if (e && e.name === 'AbortError') return 'cancelled'
      // Any other failure: fall back to copying.
    }
  }
  return (await copyText(url, win)) ? 'copied' : 'failed'
}
