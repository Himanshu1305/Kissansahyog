// Batch 17F - detectInstallEnv: one pure function that says what kind of phone/browser is installing.
// Run: node --test "tests/unit/*.test.mjs"
// SOURCE of each user-agent string: see docs/review/batch17f/DECISIONS.md section "User-agent table".
// 'doc' = copied from the browser vendor's / MDN public documentation or a public UA list;
// 'cap' = captured by this repo's own Playwright browser.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectInstallEnv, INSTALL_ENVS } from '../../src/lib/install/detectEnv.js'
import { UA } from './helpers/install-user-agents.mjs'


// [name, ua, flags, expected class]
const TABLE = [
  ['Pixel Chrome, event captured', UA.pixelChrome, { canPrompt: true }, 'android-chrome-can-prompt'],
  ['Pixel Chrome, no event', UA.pixelChrome, {}, 'android-chrome-no-prompt'],
  ['Redmi Chrome, no event', UA.redmiChrome, { canPrompt: false }, 'android-chrome-no-prompt'],
  ['Android tablet Chrome (no "Mobile")', UA.androidTabletChrome, {}, 'android-chrome-no-prompt'],
  ['Samsung Internet, no event', UA.samsung, {}, 'android-other-browser'],
  ['Samsung Internet, event captured -> native prompt', UA.samsung, { canPrompt: true }, 'android-chrome-can-prompt'],
  ['Firefox Android', UA.firefoxAndroid, {}, 'android-other-browser'],
  ['Opera Android (OPR)', UA.operaAndroid, {}, 'android-other-browser'],
  ['Mi Browser (MiuiBrowser)', UA.miui, {}, 'android-other-browser'],
  ['UC Browser', UA.uc, {}, 'android-other-browser'],
  ['Edge Android (EdgA)', UA.edgeAndroid, {}, 'android-other-browser'],
  ['Facebook in-app Android', UA.fbAndroid, {}, 'in-app-browser'],
  ['Instagram in-app Android', UA.instaAndroid, {}, 'in-app-browser'],
  ['Android WebView (wv) generic', UA.genericWebview, {}, 'in-app-browser'],
  ['Line in-app Android', UA.lineAndroid, {}, 'in-app-browser'],
  ['TikTok in-app Android', UA.tiktokAndroid, {}, 'in-app-browser'],
  ['in-app WebView even if an install event somehow exists', UA.fbAndroid, { canPrompt: true }, 'in-app-browser'],
  ['iPhone Safari', UA.iphoneSafari, {}, 'ios-safari'],
  ['iPad Safari', UA.ipadSafari, {}, 'ios-safari'],
  ['iPadOS in desktop mode (Macintosh + touch)', UA.ipadOsDesktopMode, { touchPoints: 5 }, 'ios-safari'],
  ['iOS Chrome (CriOS)', UA.iosChrome, {}, 'ios-other-browser'],
  ['iOS Firefox (FxiOS)', UA.iosFirefox, {}, 'ios-other-browser'],
  ['iOS Edge (EdgiOS)', UA.iosEdge, {}, 'ios-other-browser'],
  ['Facebook in-app iOS', UA.fbIos, {}, 'in-app-browser'],
  ['Instagram in-app iOS', UA.instaIos, {}, 'in-app-browser'],
  ['iOS WKWebView with no Safari token', UA.iosWkWebview, {}, 'in-app-browser'],
  ['Windows Chrome', UA.winChrome, {}, 'desktop-chrome-edge'],
  ['Windows Edge', UA.winEdge, {}, 'desktop-chrome-edge'],
  ['Mac Chrome', UA.macChrome, {}, 'desktop-chrome-edge'],
  ['Linux Chrome', UA.linuxChrome, {}, 'desktop-chrome-edge'],
  ['Windows Firefox', UA.winFirefox, {}, 'desktop-other'],
  ['Mac Safari (no touch)', UA.macSafari, { touchPoints: 0 }, 'desktop-other'],
  ['Windows Opera', UA.winOpera, {}, 'desktop-other'],
  ['IE 11', UA.ie11, {}, 'unsupported'],
  ['Googlebot', UA.googlebot, {}, 'unsupported'],
  ['empty user agent', '', {}, 'unsupported'],
  ['missing user agent', undefined, {}, 'unsupported'],
  ['no service worker support', UA.winChrome, { swSupported: false }, 'unsupported'],
  ['standalone Android', UA.pixelChrome, { standalone: true }, 'installed'],
  ['standalone iPhone (navigator.standalone)', UA.iphoneSafari, { standalone: true }, 'installed'],
  ['installed in this session', UA.pixelChrome, { installed: true, canPrompt: false }, 'installed'],
  ['installed beats in-app', UA.fbAndroid, { standalone: true }, 'installed'],
]

for (const [name, ua, flags, want] of TABLE) {
  test(`detectInstallEnv: ${name} -> ${want}`, () => {
    assert.equal(detectInstallEnv(ua, flags), want)
  })
}

test('the table has at least 20 user agents and covers every class', () => {
  assert.ok(Object.keys(UA).length >= 20, `only ${Object.keys(UA).length} user agents`)
  const seen = new Set(TABLE.map((r) => r[3]))
  for (const env of INSTALL_ENVS) assert.ok(seen.has(env), `class not covered: ${env}`)
  assert.equal(INSTALL_ENVS.length, 10)
})

test('WhatsApp links are NOT in-app unless the user agent proves it (a Custom Tab sends a plain Chrome UA)', () => {
  assert.equal(detectInstallEnv(UA.pixelChrome, {}), 'android-chrome-no-prompt')
  // the word WhatsApp alone (e.g. a link-preview fetcher) is not a WebView proof
  assert.notEqual(detectInstallEnv(`${UA.pixelChrome} WhatsApp/2.24.5.76 A`, {}), 'in-app-browser')
})

test('the result is always one of the ten classes, whatever the input', () => {
  const odd = [null, undefined, '', 'x', 'Android', 'iPhone', 'Mobile Safari', 123, {}, 'Mozilla/5.0 (Linux; Android 14)']
  for (const ua of odd) {
    for (const f of [undefined, null, {}, { canPrompt: true }, { standalone: true }]) {
      assert.ok(INSTALL_ENVS.includes(detectInstallEnv(ua, f)), `${ua} ${JSON.stringify(f)}`)
    }
  }
})
