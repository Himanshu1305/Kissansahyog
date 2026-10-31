// Batch 17D Part A - the two share buttons ("card + message", "voice"). The share shape is proven with a fake navigator:
// the exact files/text passed, the clipboard step first, AbortError silent, every other failure visible, the REAL file tested at click time.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { rolldown } from 'rolldown'
import * as L from '../../src/lib/admin/morningLogic.js'
import { strings } from '../../src/lib/i18n/strings.js'
import { morningStrings } from '../../src/lib/i18n/morningStrings.js'

const CARD = { name: 'card.png', type: 'image/png' }, VOICE = { name: 'v.mp3', type: 'audio/mpeg' }
const err = (name) => Object.assign(new Error('secret message text must never be logged'), { name })
function fakeNav({ canShare = () => true, share = async () => {}, writeText = async () => {} } = {}) {
  const calls = []
  return { calls, share: async (o) => { calls.push(['share', o]); return share(o) }, canShare: (o) => { calls.push(['canShare', o]); return canShare(o) }, clipboard: { writeText: async (t) => { calls.push(['writeText', t]); return writeText(t) } } }
}

test('card + message: clipboard first, then share with exactly { files: [card], text } and nothing else', async () => {
  const nav = fakeNav()
  const r = await L.shareCardWithMessage({ nav, file: CARD, text: 'MSG' })
  assert.equal(r.status, 'shared'); assert.equal(r.copied, true)
  assert.deepEqual(nav.calls.map((c) => c[0]), ['writeText', 'canShare', 'share'])
  assert.equal(nav.calls[0][1], 'MSG')
  assert.deepEqual(nav.calls[1][1], { files: [CARD] }) // the REAL file is tested at click time
  assert.deepEqual(nav.calls[2][1], { files: [CARD], text: 'MSG' }); assert.deepEqual(Object.keys(nav.calls[2][1]).sort(), ['files', 'text'])
})
test('card + message: a clipboard failure is silent and the share still happens (copied=false)', async () => {
  const nav = fakeNav({ writeText: async () => { throw err('NotAllowedError') } })
  const r = await L.shareCardWithMessage({ nav, file: CARD, text: 'MSG' })
  assert.equal(r.status, 'shared'); assert.equal(r.copied, false)
  assert.deepEqual(nav.calls.at(-1)[1], { files: [CARD], text: 'MSG' })
})
test('card + message: a clipboard that never answers does not block the share (waits at most the given time)', async () => {
  const nav = fakeNav({ writeText: () => new Promise(() => {}) })
  const r = await L.shareCardWithMessage({ nav, file: CARD, text: 'MSG', copyWaitMs: 20 })
  assert.equal(r.status, 'shared'); assert.equal(r.copied, false)
})
test('voice: share with exactly { files: [voice] } and NO text, and no clipboard use', async () => {
  const nav = fakeNav()
  const r = await L.shareVoiceFile({ nav, file: VOICE })
  assert.equal(r.status, 'shared')
  assert.deepEqual(nav.calls.map((c) => c[0]), ['canShare', 'share'])
  assert.deepEqual(nav.calls[1][1], { files: [VOICE] }); assert.ok(!('text' in nav.calls[1][1]))
})
test('AbortError (the person closed the share sheet) is cancelled: silent, no warning', async () => {
  const warns = []; const w = console.warn; console.warn = (...a) => warns.push(a)
  try {
    for (const run of [() => L.shareCardWithMessage({ nav: fakeNav({ share: async () => { throw err('AbortError') } }), file: CARD, text: 'MSG' }), () => L.shareVoiceFile({ nav: fakeNav({ share: async () => { throw err('AbortError') } }), file: VOICE })]) {
      const r = await run(); assert.equal(r.status, 'cancelled'); assert.ok(!L.isVisibleShareFailure(r))
    }
  } finally { console.warn = w }
  assert.deepEqual(warns, [])
})
test('any other share error is a visible failure; only the error NAME is kept, never the message text', async () => {
  for (const name of ['NotAllowedError', 'DataError', 'TypeError', 'InvalidStateError']) {
    const r = await L.shareVoiceFile({ nav: fakeNav({ share: async () => { throw err(name) } }), file: VOICE })
    assert.equal(r.status, 'failed'); assert.equal(r.errorName, name); assert.ok(L.isVisibleShareFailure(r))
    assert.ok(!JSON.stringify(r).includes('secret message text'))
  }
})
test('the real file is refused by canShare -> a visible failure, share() is never called', async () => {
  const nav = fakeNav({ canShare: () => false })
  for (const r of [await L.shareCardWithMessage({ nav, file: CARD, text: 'MSG' }), await L.shareVoiceFile({ nav, file: VOICE })]) { assert.equal(r.status, 'unavailable'); assert.ok(L.isVisibleShareFailure(r)) }
  assert.ok(!nav.calls.some((c) => c[0] === 'share'))
  const thrower = fakeNav({ canShare: () => { throw err('TypeError') } })
  assert.ok(L.isVisibleShareFailure(await L.shareVoiceFile({ nav: thrower, file: VOICE })))
})
test('no navigator.share (a computer) -> unsupported, not a failure message (the Download hint is shown instead)', async () => {
  const r = await L.shareVoiceFile({ nav: {}, file: VOICE }); assert.equal(r.status, 'unsupported'); assert.ok(!L.isVisibleShareFailure(r))
  assert.equal(L.canUseShare({}), false); assert.equal(L.canUseShare(null), false); assert.equal(L.canUseShare({ share() {}, canShare() {} }), true)
})
test('the failure log line carries only the error name', () => {
  const lines = []; const w = console.warn; console.warn = (...a) => lines.push(a.join(' '))
  try { L.logShareFailure({ status: 'failed', errorName: 'NotAllowedError' }); L.logShareFailure({ status: 'unavailable' }); L.logShareFailure({ status: 'cancelled' }) } finally { console.warn = w }
  assert.deepEqual(lines, ['share failed: NotAllowedError', 'share failed: canShare-false'])
})

test('strings: the old combined-button string is gone; the new ones have Hindi and English', () => {
  assert.ok(!('mp_share_all' in morningStrings)); assert.ok(!('mp_share_all' in strings))
  for (const k of ['mp_share_card_msg', 'mp_share_voice', 'mp_share_help', 'mp_share_copied_note', 'mp_share_failed', 'mp_share_all_hint']) {
    assert.ok(morningStrings[k].hi && morningStrings[k].en, k); assert.equal(strings[k].hi, morningStrings[k].hi)
  }
  assert.equal(morningStrings.mp_share_card_msg.hi, 'कार्ड + संदेश शेयर करें'); assert.equal(morningStrings.mp_share_voice.hi, 'आवाज़ शेयर करें')
})
test('the container no longer builds a combined files array or decides sharing with dummy files, and has no empty catch around a share', () => {
  const cont = readFileSync('src/screens/AdminMorning.jsx', 'utf8')
  const src = cont + readFileSync('src/screens/admin/MorningView.jsx', 'utf8')
  assert.ok(!/shareAll|canShareAll|mp_share_all\b|morning-share-all"/.test(src))
  assert.ok(!/files\.push/.test(cont))
  assert.ok(!/closed the share sheet/.test(cont))
})

let View
async function loadView() {
  if (View) return View
  const dir = join(process.cwd(), 'node_modules', '.cache', 'morning-17d'); mkdirSync(dir, { recursive: true })
  const b = await rolldown({ input: 'src/screens/admin/MorningView.jsx', external: ['react', 'react/jsx-runtime', /^react-dom/], transform: { jsx: { runtime: 'automatic' } }, platform: 'node' })
  await b.write({ dir, format: 'esm', entryFileNames: 'view.mjs' })
  View = await import(`file://${join(dir, 'view.mjs').split('\\').join('/')}?v=${Date.now()}`)
  return View
}
const noop = () => {}
const t = (k) => (strings[k] ? strings[k].en : k)
const base = { t, date: '2026-10-30', dateText: 'Friday', today: '2026-10-30', history: { state: 'ready', error: null }, historyRows: [], nextDisabled: false, prevDisabled: false, copied: false, copyFailed: false, pollCopied: false, canShare: false, canShareApi: true, shareNote: false, shareError: false, busy: false, pctValue: '', pctMsg: null, pctError: null, resultDateText: '2026-10-29', postedText: '', generatedText: '', refs: { msg: { current: null } }, on: { cardName: 'c.png', pct: noop, prev: noop, next: noop, today: noop, open: noop, copyMsg: noop, selectAll: noop, copyPoll: noop, share: noop, shareCard: noop, shareVoice: noop, mark: noop, savePct: noop } }
const post = { message_text: 'MSG', poll_text: 'POLL', card_png_b64: 'AQID', report_text: 'R', posted_at: null, generated_at: '2026-10-30T00:00:00Z', voice_script: 'x', voice_mp3_b64: 'QUJD' }

test('page: both new buttons, the help line, 56 px height, aria-labels; the old combined button is gone', async () => {
  const { default: V } = await loadView()
  const html = renderToStaticMarkup(createElement(V, { ...base, post }))
  for (const s of ['data-testid="morning-share-card-msg"', 'aria-label="Share card + message"', 'data-testid="morning-share-voice"', 'aria-label="Share voice"', 'Send the card first, then the voice', 'min-h-[56px]']) assert.ok(html.includes(s), s)
  assert.ok(!html.includes('morning-share-all"') && !html.includes('Share card + voice'))
  assert.ok(html.indexOf('morning-share-card-msg') < html.indexOf('morning-share-voice'))
  for (const s of ['Copy message', 'Select all', 'Download card', 'Download voice (MP3)', 'WhatsApp: send text', 'Copy poll', 'Mark as posted']) assert.ok(html.includes(s), s)
})
test('page: no voice -> no voice share button, the voice-missing notice stays', async () => {
  const { default: V } = await loadView()
  const html = renderToStaticMarkup(createElement(V, { ...base, post: { ...post, voice_mp3_b64: null, voice_script: null } }))
  assert.ok(!html.includes('morning-share-voice') && html.includes('morning-share-card-msg') && html.includes('Voice not ready - run the workflow again.'))
})
test('page: the copied note shows only after a copy, the error line only after a failure', async () => {
  const { default: V } = await loadView()
  const none = renderToStaticMarkup(createElement(V, { ...base, post }))
  assert.ok(!none.includes('morning-share-note') && !none.includes('morning-share-error'))
  const note = renderToStaticMarkup(createElement(V, { ...base, post, shareNote: true }))
  assert.ok(note.includes('data-testid="morning-share-note"') && note.includes('Message copied.'))
  const bad = renderToStaticMarkup(createElement(V, { ...base, post, shareError: true }))
  assert.ok(bad.includes('data-testid="morning-share-error"') && bad.includes('role="alert"') && bad.includes('Could not share.'))
})
test('page: a computer (no navigator.share) shows the Download hint and no share buttons', async () => {
  const { default: V } = await loadView()
  const html = renderToStaticMarkup(createElement(V, { ...base, post, canShareApi: false }))
  assert.ok(html.includes('On a phone this opens the share sheet; on a computer use Download.') && !html.includes('morning-share-card-msg') && !html.includes('morning-share-voice'))
  assert.ok(html.includes('Download card') && html.includes('Download voice (MP3)'))
})
test('page: Hindi labels', async () => {
  const { default: V } = await loadView()
  const hi = renderToStaticMarkup(createElement(V, { ...base, t: (k) => strings[k]?.hi || k, post, shareNote: true, shareError: true }))
  for (const s of ['कार्ड + संदेश शेयर करें', 'आवाज़ शेयर करें', 'संदेश कॉपी हो गया।', 'शेयर नहीं हो सका।']) assert.ok(hi.includes(s), s)
})
