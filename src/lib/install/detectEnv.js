// Batch 17F - what kind of phone / browser is trying to install the app?
// A PURE function (no window, no navigator): the caller passes the user agent and a few facts.
// The class decides which help the install sheet shows. It never decides whether an install
// "worked": a website cannot know that.

export const INSTALL_ENVS = [
  'installed',
  'android-chrome-can-prompt',
  'android-chrome-no-prompt',
  'android-other-browser',
  'ios-safari',
  'ios-other-browser',
  'in-app-browser',
  'desktop-chrome-edge',
  'desktop-other',
  'unsupported',
]

// In-app browsers named in their own user agent. WhatsApp is NOT here on purpose: its links
// normally open in the phone's browser / a Chrome Custom Tab, which sends a plain Chrome UA.
const IN_APP_TOKEN = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|\bLine\/|MicroMessenger|Snapchat|TikTok|musical_ly|BytedanceWebview|LinkedInApp|Pinterest|Twitter/i
// Other Android browsers (they carry a Chrome token but their menu / install steps differ).
const ANDROID_OTHER = /SamsungBrowser|Firefox|OPR\/|OPT\/|Opera|MiuiBrowser|UCBrowser|UBrowser|EdgA|HeyTap|OppoBrowser|VivoBrowser|Vivo Browser|Puffin|DuckDuckGo|Brave\//i
const BOT = /bot\b|bot\/|crawler|spider|slurp|Lighthouse/i

export function detectInstallEnv(userAgent, flags = {}) {
  const f = flags || {}
  const ua = typeof userAgent === 'string' ? userAgent : ''

  if (f.standalone || f.installed) return 'installed'
  if (!ua) return 'unsupported'
  if (f.swSupported === false) return 'unsupported'
  if (BOT.test(ua)) return 'unsupported'
  if (/MSIE |Trident\//.test(ua)) return 'unsupported'

  const isAndroid = /Android/i.test(ua)
  const isIphoneIpad = /iPhone|iPad|iPod/i.test(ua)
  // iPadOS 13+ asks for the desktop site by default: it says "Macintosh" but has a touch screen.
  const isIpadDesktopMode = !isIphoneIpad && /Macintosh/i.test(ua) && Number(f.touchPoints) > 1

  if (isIphoneIpad || isIpadDesktopMode) {
    if (IN_APP_TOKEN.test(ua)) return 'in-app-browser'
    if (/CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|DuckDuckGo|GSA\//i.test(ua)) return 'ios-other-browser'
    // A WebView inside another app has no "Safari/" token; real Safari always does.
    if (isIphoneIpad && !/Safari\//.test(ua)) return 'in-app-browser'
    return 'ios-safari'
  }

  if (isAndroid) {
    if (IN_APP_TOKEN.test(ua)) return 'in-app-browser'
    // "; wv)" is the Android System WebView marker (an app showing a web page inside itself).
    if (/;\s*wv\)/.test(ua)) return 'in-app-browser'
    // The browser fired beforeinstallprompt: we can open the real install dialog.
    if (f.canPrompt) return 'android-chrome-can-prompt'
    if (ANDROID_OTHER.test(ua)) return 'android-other-browser'
    if (/Chrome\//.test(ua)) return 'android-chrome-no-prompt'
    return 'android-other-browser'
  }

  // Desktop
  if (/OPR\/|Opera|Firefox/i.test(ua)) return 'desktop-other'
  if (/Edg\/|Chrome\/|Chromium\//.test(ua)) return 'desktop-chrome-edge'
  return 'desktop-other'
}

export default detectInstallEnv
