// Batch 17F - the single install module: event capture, dedupe, standalone, appinstalled,
// sheet states, and the rule that the homepage strip and the returning-visitor bar never show together.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getInstallStore, whichInstallSurface, KEYS } from '../../src/lib/install/installStore.js'
import { UA } from './helpers/install-user-agents.mjs'

function fakeWin({ ua = UA.pixelChrome, standalone = false, navStandalone, ls = {}, lsThrows = false, touch = 0 } = {}) {
  const handlers = {}
  const mem = new Map(Object.entries(ls))
  const win = {
    handlers,
    addEventListener(type, fn) { (handlers[type] ||= []).push(fn) },
    fire(type, evt = {}) { for (const fn of handlers[type] || []) fn(evt) },
    navigator: { userAgent: ua, maxTouchPoints: touch, serviceWorker: {}, ...(navStandalone === undefined ? {} : { standalone: navStandalone }) },
    matchMedia: (q) => ({ matches: standalone && q.includes('standalone') }),
    localStorage: lsThrows
      ? { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } }
      : { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) },
    mem,
  }
  return win
}
function bip(outcome = 'accepted') {
  const e = { prevented: false, prompted: 0, preventDefault() { this.prevented = true }, prompt() { this.prompted += 1 }, userChoice: Promise.resolve({ outcome }) }
  return e
}

test('beforeinstallprompt is captured once at load: preventDefault, canPrompt, env becomes can-prompt', () => {
  const w = fakeWin()
  const s = getInstallStore(w)
  assert.equal(s.getSnapshot().canPrompt, false)
  assert.equal(s.getSnapshot().env, 'android-chrome-no-prompt')
  const e = bip()
  w.fire('beforeinstallprompt', e)
  assert.equal(e.prevented, true)
  assert.equal(s.getSnapshot().canPrompt, true)
  assert.equal(s.getSnapshot().env, 'android-chrome-can-prompt')
})

test('dedupe: asking for the store again on the same window gives the same store and adds no second listener', () => {
  const w = fakeWin()
  const a = getInstallStore(w)
  const b = getInstallStore(w)
  assert.equal(a, b)
  assert.equal(w.handlers.beforeinstallprompt.length, 1)
  assert.equal(w.handlers.appinstalled.length, 1)
})

test('a later beforeinstallprompt replaces the earlier one (only the newest can be prompted)', async () => {
  const w = fakeWin()
  const s = getInstallStore(w)
  const e1 = bip(); const e2 = bip()
  w.fire('beforeinstallprompt', e1)
  w.fire('beforeinstallprompt', e2)
  await s.promptInstall()
  assert.equal(e1.prompted, 0)
  assert.equal(e2.prompted, 1)
})

test('promptInstall calls prompt() synchronously in the same click (before any await)', () => {
  const w = fakeWin()
  const s = getInstallStore(w)
  const e = bip()
  w.fire('beforeinstallprompt', e)
  const p = s.promptInstall() // no await here
  assert.equal(e.prompted, 1, 'prompt() must already have been called')
  return p
})

test('accepted: outcome accepted, the event is used up, no sheet is opened by us (appinstalled does that)', async () => {
  const w = fakeWin(); const s = getInstallStore(w)
  w.fire('beforeinstallprompt', bip('accepted'))
  const r = await s.promptInstall()
  assert.equal(r.outcome, 'accepted')
  assert.equal(s.getSnapshot().canPrompt, false)
  assert.equal(s.getSnapshot().ui.sheet, 'none')
})

test('dismissed: shows the short "no problem, install later" sheet', async () => {
  const w = fakeWin(); const s = getInstallStore(w)
  w.fire('beforeinstallprompt', bip('dismissed'))
  const r = await s.promptInstall()
  assert.equal(r.outcome, 'dismissed')
  assert.equal(s.getSnapshot().ui.sheet, 'later')
  assert.equal(s.getSnapshot().canPrompt, false)
})

test('promptInstall with no captured event returns unavailable and does not throw', async () => {
  const s = getInstallStore(fakeWin())
  const r = await s.promptInstall()
  assert.equal(r.outcome, 'unavailable')
})

test('appinstalled: installed in this session, stored time, success sheet, event cleared, env installed', () => {
  const w = fakeWin(); const s = getInstallStore(w)
  w.fire('beforeinstallprompt', bip())
  w.fire('appinstalled')
  const snap = s.getSnapshot()
  assert.equal(snap.installed, true)
  assert.equal(snap.canPrompt, false)
  assert.equal(snap.env, 'installed')
  assert.equal(snap.ui.sheet, 'success')
  assert.match(w.mem.get(KEYS.installedAt), /^\d{4}-\d{2}-\d{2}T/)
})

test('appinstalled still works when localStorage is blocked', () => {
  const w = fakeWin({ lsThrows: true }); const s = getInstallStore(w)
  assert.doesNotThrow(() => w.fire('appinstalled'))
  assert.equal(s.getSnapshot().ui.sheet, 'success')
  assert.equal(s.getSnapshot().installed, true)
})

test('standalone (display-mode) is detected: env installed, no prompt possible', () => {
  const s = getInstallStore(fakeWin({ standalone: true }))
  assert.equal(s.getSnapshot().standalone, true)
  assert.equal(s.getSnapshot().env, 'installed')
})

test('standalone on iPhone via navigator.standalone', () => {
  const s = getInstallStore(fakeWin({ ua: UA.iphoneSafari, navStandalone: true }))
  assert.equal(s.getSnapshot().standalone, true)
  assert.equal(s.getSnapshot().env, 'installed')
})

test('first launch from the icon: welcome once, then never again (flag survives a reload)', () => {
  const w1 = fakeWin({ standalone: true }); const s1 = getInstallStore(w1)
  s1.maybeWelcome()
  assert.equal(s1.getSnapshot().ui.sheet, 'welcome')
  assert.equal(w1.mem.get(KEYS.welcomed), '1')
  // a second launch: new window object, same stored flag
  const w2 = fakeWin({ standalone: true, ls: { [KEYS.welcomed]: '1' } }); const s2 = getInstallStore(w2)
  s2.maybeWelcome()
  assert.equal(s2.getSnapshot().ui.sheet, 'none')
})

test('welcome is not shown in a normal browser tab', () => {
  const s = getInstallStore(fakeWin({ standalone: false }))
  s.maybeWelcome()
  assert.equal(s.getSnapshot().ui.sheet, 'none')
})

test('welcome with blocked storage still shows once per page load (never loops within a load)', () => {
  const s = getInstallStore(fakeWin({ standalone: true, lsThrows: true }))
  s.maybeWelcome(); s.closeSheet(); s.maybeWelcome()
  assert.equal(s.getSnapshot().ui.sheet, 'none')
})

test('openGuide and closeSheet change the sheet; the snapshot is stable while nothing changes', () => {
  const s = getInstallStore(fakeWin())
  const a = s.getSnapshot(); const b = s.getSnapshot()
  assert.equal(a, b)
  s.openGuide()
  assert.equal(s.getSnapshot().ui.sheet, 'guide')
  assert.notEqual(s.getSnapshot(), a)
  s.closeSheet()
  assert.equal(s.getSnapshot().ui.sheet, 'none')
})

test('subscribe notifies on change and stops after unsubscribe', () => {
  const w = fakeWin(); const s = getInstallStore(w)
  let n = 0
  const off = s.subscribe(() => { n += 1 })
  w.fire('beforeinstallprompt', bip())
  assert.equal(n, 1)
  off()
  w.fire('appinstalled')
  assert.equal(n, 1)
})

test('no window at all (server / prerender): a harmless empty store', () => {
  const s = getInstallStore(null)
  assert.equal(s.getSnapshot().env, 'unsupported')
  assert.equal(s.getSnapshot().canPrompt, false)
  assert.doesNotThrow(() => { s.openGuide(); s.closeSheet(); s.maybeWelcome() })
})

// ---- the strip (homepage) and the bar (other pages) never show together ----
const base = { pathname: '/', canPrompt: true, installed: false, standalone: false, native: false, sheet: 'none', stripDismissed: false, visits: 5, snoozed: false }

test('surface: strip on the homepage, bar never on the homepage', () => {
  assert.equal(whichInstallSurface({ ...base }), 'strip')
  assert.equal(whichInstallSurface({ ...base, canPrompt: false }), 'strip')
})
test('surface: bar on other pages only for a returning visitor who can prompt and is not snoozed; the strip never there', () => {
  assert.equal(whichInstallSurface({ ...base, pathname: '/msp' }), 'bar')
  assert.equal(whichInstallSurface({ ...base, pathname: '/msp', visits: 1 }), 'none')
  assert.equal(whichInstallSurface({ ...base, pathname: '/msp', snoozed: true }), 'none')
  assert.equal(whichInstallSurface({ ...base, pathname: '/msp', canPrompt: false }), 'none')
})
test('surface: nothing after install, in standalone or in the Android app', () => {
  for (const pathname of ['/', '/msp']) {
    assert.equal(whichInstallSurface({ ...base, pathname, installed: true }), 'none')
    assert.equal(whichInstallSurface({ ...base, pathname, standalone: true }), 'none')
    assert.equal(whichInstallSurface({ ...base, pathname, native: true }), 'none')
  }
})
test('surface: an open sheet hides the bar but the strip stays (no page jump under the sheet)', () => {
  assert.equal(whichInstallSurface({ ...base, pathname: '/msp', sheet: 'guide' }), 'none')
  assert.equal(whichInstallSurface({ ...base, pathname: '/', sheet: 'guide' }), 'strip')
})
test('promptInstall closes our own guide sheet (the browser box takes over)', async () => {
  const w = fakeWin(); const s = getInstallStore(w)
  w.fire('beforeinstallprompt', bip('accepted'))
  s.openGuide()
  const p = s.promptInstall()
  assert.equal(s.getSnapshot().ui.sheet, 'none')
  await p
})
test('surface: the strip dismiss lasts for the session; it does not bring the bar on the homepage', () => {
  assert.equal(whichInstallSurface({ ...base, stripDismissed: true }), 'none')
})
test('surface: for every combination the strip and the bar are never both chosen', () => {
  const paths = ['/', '/msp', '/install', '/browse']
  for (const pathname of paths) for (const canPrompt of [true, false]) for (const visits of [0, 1, 2, 9]) {
    const r = whichInstallSurface({ ...base, pathname, canPrompt, visits })
    assert.ok(['strip', 'bar', 'none'].includes(r))
  }
})
test('surface: /install page itself shows no bar (the page is the install help)', () => {
  assert.equal(whichInstallSurface({ ...base, pathname: '/install' }), 'none')
})
