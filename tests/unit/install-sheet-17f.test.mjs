// Batch 17F - sheet content per environment, both languages, and the share / copy helpers.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sheetModel, modelKeys } from '../../src/lib/install/sheetModel.js'
import { INSTALL_ENVS } from '../../src/lib/install/detectEnv.js'
import { installStrings } from '../../src/lib/i18n/installStrings.js'
import { strings } from '../../src/lib/i18n/strings.js'
import { copyText, shareInstallLink, INSTALL_URL, INSTALL_QR_URL } from '../../src/lib/install/link.js'

test('every environment class has a sheet model, and unknown input falls back to "unsupported"', () => {
  for (const env of INSTALL_ENVS) assert.ok(sheetModel(env).kind, env)
  assert.equal(sheetModel('nonsense').kind, 'unsupported')
  assert.equal(sheetModel(undefined).kind, 'unsupported')
})

test('android-chrome-can-prompt: native prompt; the 3 menu steps are only the fallback', () => {
  const m = sheetModel('android-chrome-can-prompt')
  assert.equal(m.native, true)
  assert.equal(m.steps.length, 3)
})

test('android without a prompt and other android browsers: 3 numbered steps with an icon each (menu dots, install item, confirm)', () => {
  for (const env of ['android-chrome-no-prompt', 'android-other-browser']) {
    const m = sheetModel(env)
    assert.equal(m.native, false)
    assert.deepEqual(m.steps.map((s) => s.icon), ['dots', 'install', 'confirm'])
  }
  assert.ok(sheetModel('android-other-browser').tipKey, 'other browsers get the "open in Chrome" tip')
  assert.equal(sheetModel('android-other-browser').copy, true)
})

test('ios-safari: Share, Add to Home Screen, Add; a note that it works only in Safari', () => {
  const m = sheetModel('ios-safari')
  assert.deepEqual(m.steps.map((s) => s.icon), ['share', 'addhome', 'add'])
  assert.equal(m.noteKey, 'inst_i_note')
  assert.match(installStrings.inst_i_note.en, /only in the Safari/i)
})

test('ios-other-browser: "open in Safari" with a Copy-link button, then the Safari steps', () => {
  const m = sheetModel('ios-other-browser')
  assert.equal(m.kind, 'ios-open-safari')
  assert.equal(m.copy, true)
  assert.deepEqual(m.steps.map((s) => s.icon), ['share', 'addhome', 'add'])
})

test('in-app browser: open-in-browser help with Copy link and the three-dot hint', () => {
  const m = sheetModel('in-app-browser')
  assert.equal(m.kind, 'in-app')
  assert.equal(m.copy, true)
  assert.deepEqual(m.steps.map((s) => s.icon), ['dots', 'browser', 'install'])
  assert.match(installStrings.inst_x2.en, /Open in browser/)
})

test('desktop: QR plus the address-bar hint (Chrome / Edge only); no QR on phones', () => {
  assert.equal(sheetModel('desktop-chrome-edge').qr, true)
  assert.ok(sheetModel('desktop-chrome-edge').pcKey)
  assert.equal(sheetModel('desktop-other').qr, true)
  assert.equal(sheetModel('desktop-other').pcKey, undefined)
  for (const env of ['android-chrome-can-prompt', 'android-chrome-no-prompt', 'android-other-browser', 'ios-safari', 'ios-other-browser', 'in-app-browser']) {
    assert.equal(sheetModel(env).qr, false, env)
  }
})

test('all install strings exist in Hindi and English, are non-empty, and reach the merged strings table once wired', () => {
  for (const [k, v] of Object.entries(installStrings)) {
    assert.ok(v.hi && v.hi.trim(), `${k}: hi is empty`)
    assert.ok(v.en && v.en.trim(), `${k}: en is empty`)
    assert.match(v.hi, /[ऀ-ॿ]/, `${k}: the Hindi text has no Devanagari`)
  }
  for (const env of INSTALL_ENVS) for (const k of modelKeys(sheetModel(env))) assert.ok(installStrings[k], `${env} uses missing key ${k}`)
  for (const k of Object.keys(installStrings)) assert.deepEqual(strings[k], installStrings[k], `${k} not merged into strings.js`)
})

test('banner strings are short (one row): Hindi and English, button label short', () => {
  assert.equal(strings.pwa_banner_text.hi, 'किसान सहयोग ऐप इंस्टॉल करें')
  assert.equal(strings.pwa_banner_text.en, 'Install Kissan Sahyog app')
  assert.equal(strings.pwa_banner_install.hi, 'इंस्टॉल')
  assert.equal(strings.pwa_banner_install.en, 'Install')
})

test('success wording never claims the icon is on the home screen as a fact', () => {
  for (const lang of ['hi', 'en']) {
    const s = `${installStrings.inst_done_title[lang]} ${installStrings.inst_done_body[lang]}`
    assert.ok(!/has been added|added to your home|होम स्क्रीन पर जोड़ दिया|जुड़ गया/.test(s), s)
  }
  assert.match(installStrings.inst_done_body.hi, /ढूँढें/)
  assert.match(installStrings.inst_done_hint.en, /press and hold/)
  assert.equal(installStrings.inst_done_title.hi, 'ऐप इंस्टॉल हो गया')
  assert.equal(installStrings.inst_ok.hi, 'ठीक है')
})

test('no "free for farmers" promise in any install string (founder rule)', () => {
  for (const [k, v] of Object.entries(installStrings)) {
    assert.ok(!/मुफ़्त|मुफ्त|\bfree\b/i.test(`${v.hi} ${v.en}`), k)
  }
})

test('links: the QR carries the source mark, the plain link does not', () => {
  assert.equal(INSTALL_URL, 'https://kissansahyog.com/install')
  assert.equal(INSTALL_QR_URL, 'https://kissansahyog.com/install?s=qr')
})

// ---- copy and share ----
test('copyText uses the clipboard API', async () => {
  let got = null
  const win = { navigator: { clipboard: { writeText: async (t) => { got = t } } } }
  assert.equal(await copyText('abc', win), true)
  assert.equal(got, 'abc')
})
test('copyText falls back to the textarea way, and reports failure when nothing works', async () => {
  let copied = 0
  const doc = {
    body: { appendChild() {}, removeChild() {} },
    createElement: () => ({ style: {}, setAttribute() {}, select() {} }),
    execCommand: () => { copied += 1; return true },
  }
  assert.equal(await copyText('x', { navigator: {}, document: doc }), true)
  assert.equal(copied, 1)
  assert.equal(await copyText('x', { navigator: { clipboard: { writeText: async () => { throw new Error('no') } } }, document: { ...doc, execCommand: () => false } }), false)
  assert.equal(await copyText('x', null), false)
})
test('shareInstallLink: navigator.share when present', async () => {
  let shared = null
  const r = await shareInstallLink({ text: 'T', title: 'K' }, { navigator: { share: async (d) => { shared = d } } })
  assert.equal(r, 'shared')
  assert.equal(shared.url, INSTALL_URL)
})
test('shareInstallLink: falls back to copy when there is no share; cancelling the sheet is not a copy', async () => {
  let got = null
  const nav = { clipboard: { writeText: async (t) => { got = t } } }
  assert.equal(await shareInstallLink({ text: 'T' }, { navigator: nav }), 'copied')
  assert.equal(got, INSTALL_URL)
  got = null
  const abort = Object.assign(new Error('x'), { name: 'AbortError' })
  assert.equal(await shareInstallLink({ text: 'T' }, { navigator: { ...nav, share: async () => { throw abort } } }), 'cancelled')
  assert.equal(got, null)
  // a real share failure falls back to copy
  assert.equal(await shareInstallLink({ text: 'T' }, { navigator: { ...nav, share: async () => { throw new Error('boom') } } }), 'copied')
})
