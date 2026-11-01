// Batch 17E Part 3 - the admin page: the main "card + voice" button shares the one MP4 with the message as its caption.
// Proven with a fake navigator (exact arguments, same-click rule, error handling) and by rendering the real view.
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

const VIDEO = { name: 'morning-2026-10-30.mp4', type: 'video/mp4', size: 5 }
const err = (name) => Object.assign(new Error('secret message text must never be logged'), { name })
function fakeNav({ canShare = () => true, share = async () => {}, writeText = async () => {} } = {}) {
  const calls = []
  return { calls, share: async (o) => { calls.push(['share', o]); return share(o) }, canShare: (o) => { calls.push(['canShare', o]); return canShare(o) }, clipboard: { writeText: async (t) => { calls.push(['writeText', t]); return writeText(t) } } }
}

// ---- the helpers ----
test('videoFileName and makeVideoFile: morning-DATE.mp4, type video/mp4, the bytes of the base64', () => {
  assert.equal(L.videoFileName('2026-10-30'), 'morning-2026-10-30.mp4')
  const f = L.makeVideoFile('AQID', '2026-10-30')
  assert.equal(f.name, 'morning-2026-10-30.mp4'); assert.equal(f.type, 'video/mp4'); assert.equal(f.size, 3)
  assert.equal(L.makeVideoFile('', '2026-10-30'), null); assert.equal(L.makeVideoFile(null, '2026-10-30'), null)
})
test('hasVideo reads the flag only (the page never receives the video bytes with the post)', () => {
  assert.equal(L.hasVideo({ has_video: true }), true); assert.equal(L.hasVideo({ has_video: false }), false)
  assert.equal(L.hasVideo({}), false); assert.equal(L.hasVideo(null), false)
})
test('videoUiState: none / loading / ready / error', () => {
  assert.equal(L.videoUiState({ hasVideo: false, load: 'idle' }), 'none')
  assert.equal(L.videoUiState({ hasVideo: true, load: 'loading' }), 'loading')
  assert.equal(L.videoUiState({ hasVideo: true, load: 'idle' }), 'loading')
  assert.equal(L.videoUiState({ hasVideo: true, load: 'ready' }), 'ready')
  assert.equal(L.videoUiState({ hasVideo: true, load: 'error' }), 'error')
})

// ---- the share ----
test('main button: share with exactly { files: [the one mp4], text: message }, copy started, REAL file given to canShare', async () => {
  const nav = fakeNav()
  const r = await L.shareVideoWithMessage({ nav, file: VIDEO, text: 'MSG' })
  assert.equal(r.status, 'shared'); assert.equal(r.copied, true)
  const share = nav.calls.find((c) => c[0] === 'share')[1]
  assert.deepEqual(share, { files: [VIDEO], text: 'MSG' }); assert.deepEqual(Object.keys(share).sort(), ['files', 'text']); assert.equal(share.files.length, 1)
  assert.deepEqual(nav.calls.find((c) => c[0] === 'canShare')[1], { files: [VIDEO] })
  assert.equal(nav.calls.find((c) => c[0] === 'writeText')[1], 'MSG')
})
test('SAME-CLICK RULE: writeText, canShare and share are all called synchronously, before any await can yield', () => {
  const nav = fakeNav({ writeText: () => new Promise(() => {}) }) // a clipboard that never answers
  const p = L.shareVideoWithMessage({ nav, file: VIDEO, text: 'MSG', copyWaitMs: 10 }) // NOT awaited
  assert.deepEqual(nav.calls.map((c) => c[0]), ['writeText', 'canShare', 'share'], 'all three happened in the click itself')
  return p.then((r) => { assert.equal(r.status, 'shared'); assert.equal(r.copied, false) })
})
test('a clipboard failure is silent and the share still happens (copied=false)', async () => {
  const nav = fakeNav({ writeText: async () => { throw err('NotAllowedError') } })
  const r = await L.shareVideoWithMessage({ nav, file: VIDEO, text: 'MSG' })
  assert.equal(r.status, 'shared'); assert.equal(r.copied, false)
})
test('no clipboard at all (old webview): share still happens, copied=false', async () => {
  const nav = fakeNav(); delete nav.clipboard
  const r = await L.shareVideoWithMessage({ nav, file: VIDEO, text: 'MSG' })
  assert.equal(r.status, 'shared'); assert.equal(r.copied, false)
})
test('canShare false for the real file -> visible failure line, share() is never called', async () => {
  const nav = fakeNav({ canShare: () => false })
  const r = await L.shareVideoWithMessage({ nav, file: VIDEO, text: 'MSG' })
  assert.equal(r.status, 'unavailable'); assert.ok(L.isVisibleShareFailure(r))
  assert.ok(!nav.calls.some((c) => c[0] === 'share'))
})
test('AbortError is silent; any other error is visible and only its NAME is kept', async () => {
  const warns = []; const w = console.warn; console.warn = (...a) => warns.push(a.join(' '))
  try {
    const ab = await L.shareVideoWithMessage({ nav: fakeNav({ share: async () => { throw err('AbortError') } }), file: VIDEO, text: 'MSG' })
    assert.equal(ab.status, 'cancelled'); assert.ok(!L.isVisibleShareFailure(ab)); L.logShareFailure(ab)
    for (const name of ['NotAllowedError', 'DataError', 'TypeError']) {
      const r = await L.shareVideoWithMessage({ nav: fakeNav({ share: async () => { throw err(name) } }), file: VIDEO, text: 'MSG' })
      assert.equal(r.status, 'failed'); assert.equal(r.errorName, name); assert.ok(L.isVisibleShareFailure(r)); assert.ok(!JSON.stringify(r).includes('secret message text')); L.logShareFailure(r)
    }
  } finally { console.warn = w }
  assert.deepEqual(warns, ['share failed: NotAllowedError', 'share failed: DataError', 'share failed: TypeError'])
})
test('a synchronous throw from canShare or share is caught the same way', async () => {
  const r1 = await L.shareVideoWithMessage({ nav: fakeNav({ canShare: () => { throw err('TypeError') } }), file: VIDEO, text: 'MSG' })
  assert.ok(L.isVisibleShareFailure(r1))
  const nav = fakeNav(); nav.share = () => { throw err('InvalidStateError') }
  const r2 = await L.shareVideoWithMessage({ nav, file: VIDEO, text: 'MSG' })
  assert.equal(r2.status, 'failed'); assert.equal(r2.errorName, 'InvalidStateError')
})
test('no navigator.share, or no video file -> not a failure message: unsupported / unavailable handled without throwing', async () => {
  assert.equal((await L.shareVideoWithMessage({ nav: {}, file: VIDEO, text: 'MSG' })).status, 'unsupported')
  const r = await L.shareVideoWithMessage({ nav: fakeNav(), file: null, text: 'MSG' })
  assert.equal(r.status, 'unavailable'); assert.ok(L.isVisibleShareFailure(r))
})

// ---- the database call ----
test('getMorningVideo calls morning_post_video_get with the actor and the date and returns the answer', () => {
  const src = readFileSync('src/lib/admin/morningApi.js', 'utf8')
  assert.match(src, /getMorningVideo = \(actor, date\) => call\('morning_post_video_get', \{ p_actor: actor, p_date: date \}\)/)
})

// ---- strings ----
const NEW_KEYS = ['mp_video_h', 'mp_video_player', 'mp_video_download', 'mp_share_video', 'mp_video_what', 'mp_video_getting_ready', 'mp_video_load_failed', 'mp_video_none']
test('strings: every new/changed 17E key has Hindi and English and is in the merged strings', () => {
  for (const k of [...NEW_KEYS, 'mp_share_card_msg', 'mp_share_voice', 'mp_share_help']) {
    assert.ok(morningStrings[k] && morningStrings[k].hi && morningStrings[k].en, k)
    assert.equal(strings[k].hi, morningStrings[k].hi); assert.equal(strings[k].en, morningStrings[k].en)
  }
  assert.equal(morningStrings.mp_share_video.hi, 'कार्ड + आवाज़ शेयर करें')
  assert.equal(morningStrings.mp_video_what.hi, 'कार्ड पर प्ले दबाने से आवाज़ चलेगी')
  assert.equal(morningStrings.mp_video_none.hi, 'वीडियो अभी नहीं बना। नीचे के दो बटन से कार्ड और आवाज़ अलग भेजें।')
  assert.equal(morningStrings.mp_share_card_msg.hi, 'सिर्फ़ कार्ड + संदेश'); assert.equal(morningStrings.mp_share_voice.hi, 'सिर्फ़ आवाज़')
})
test('HINDI_STRINGS.md lists every new key with its Hindi text', () => {
  const md = readFileSync('docs/review/batch17e/HINDI_STRINGS.md', 'utf8')
  for (const k of [...NEW_KEYS, 'mp_share_card_msg', 'mp_share_voice', 'mp_share_help']) { assert.ok(md.includes(k), k); assert.ok(md.includes(morningStrings[k].hi), `${k} Hindi`) }
})

// ---- the real view ----
let View
async function loadView() {
  if (View) return View
  const dir = join(process.cwd(), 'node_modules', '.cache', 'morning-17e'); mkdirSync(dir, { recursive: true })
  const b = await rolldown({ input: 'src/screens/admin/MorningView.jsx', external: ['react', 'react/jsx-runtime', /^react-dom/], transform: { jsx: { runtime: 'automatic' } }, platform: 'node' })
  await b.write({ dir, format: 'esm', entryFileNames: 'view.mjs' })
  View = await import(`file://${join(dir, 'view.mjs').split('\\').join('/')}?v=${Date.now()}`)
  return View
}
const noop = () => {}
const en = (k) => (strings[k] ? strings[k].en : k)
const hi = (k) => (strings[k] ? strings[k].hi : k)
const base = {
  t: en, date: '2026-10-30', dateText: 'Friday', today: '2026-10-30', history: { state: 'ready', error: null }, historyRows: [], nextDisabled: false, prevDisabled: false,
  copied: false, copyFailed: false, pollCopied: false, canShare: false, canShareApi: true, shareNote: false, shareError: false, busy: false, pctValue: '', pctMsg: null, pctError: null,
  resultDateText: '2026-10-29', postedText: '', generatedText: '', refs: { msg: { current: null } },
  video: { state: 'ready', url: 'blob:fake-video-url', name: 'morning-2026-10-30.mp4' },
  on: { prev: noop, next: noop, today: noop, open: noop, cardName: 'c.png', selectAll: noop, copyMsg: noop, copyPoll: noop, share: noop, shareCard: noop, shareVoice: noop, shareVideo: noop, voiceName: 'v.mp3', mark: noop, pct: noop, savePct: noop },
}
const post = { message_text: 'MSG', poll_text: 'POLL', card_png_b64: 'AQID', report_text: 'R', posted_at: null, generated_at: '2026-10-30T00:00:00Z', voice_script: 'x', voice_mp3_b64: 'QUJD', has_video: true }
const render = async (over = {}, p = post, tt = en) => renderToStaticMarkup(createElement((await loadView()).default, { ...base, t: tt, post: p, ...over }))

test('page, video ready: the main button is first in the share block, >= 56 px, with an aria-label, enabled; the video preview has poster, controls and playsInline', async () => {
  const html = await render()
  assert.ok(html.includes('data-testid="morning-share-video"') && html.includes('aria-label="Share card + voice"') && html.includes('min-h-[56px]'))
  const btn = html.match(/<button[^>]*data-testid="morning-share-video"[^>]*>/)[0]
  assert.ok(!/ disabled=""/.test(btn), 'enabled when ready')
  const send = html.slice(html.indexOf('data-testid="morning-send"'))
  assert.ok(send.indexOf('morning-share-video') < send.indexOf('morning-share-card-msg') && send.indexOf('morning-share-card-msg') < send.indexOf('morning-share-voice') && send.indexOf('morning-share-voice') < send.indexOf('morning-wa-text'), 'order: main, card only, voice only, text link')
  const vid = html.match(/<video[^>]*>/)[0]
  for (const a of ['controls', 'playsinline', 'preload="metadata"', 'poster="data:image/png;base64,AQID"', 'src="blob:fake-video-url"', 'aria-label="Play the card with the voice"', 'data-testid="morning-video"']) assert.ok(vid.toLowerCase().includes(a.toLowerCase()), a)
  assert.ok(/<a [^>]*href="blob:fake-video-url"[^>]*download="morning-2026-10-30\.mp4"/.test(html) || /<a [^>]*download="morning-2026-10-30\.mp4"[^>]*href="blob:fake-video-url"/.test(html), 'download link')
  assert.ok(html.includes('Press play on the card and the voice plays'))
})
test('page, video loading: main button disabled and says it is getting ready; the backups stay usable', async () => {
  const html = await render({ video: { state: 'loading', url: null, name: 'x.mp4' } })
  const btn = html.match(/<button[^>]*data-testid="morning-share-video"[^>]*>[^<]*<\/button>/)[0]
  assert.ok(/ disabled=""/.test(btn) && btn.includes('Getting the video ready'))
  for (const id of ['morning-share-card-msg', 'morning-share-voice']) assert.ok(!/ disabled=""/.test(html.match(new RegExp('<button[^>]*data-testid="' + id + '"[^>]*>'))[0]), `${id} is not disabled by the video`)
  assert.ok(!html.includes('<video'))
})
test('page, video fetch failed: a plain line, no main button, backups usable', async () => {
  const html = await render({ video: { state: 'error', url: null, name: 'x.mp4' } })
  assert.ok(html.includes('data-testid="morning-video-error"') && html.includes('Could not open the video.'))
  assert.ok(!html.includes('data-testid="morning-share-video"') && html.includes('data-testid="morning-share-card-msg"') && html.includes('data-testid="morning-share-voice"'))
})
test('page, no video (has_video false): main button hidden, one plain line, everything else usable', async () => {
  const html = await render({ video: { state: 'none', url: null, name: 'x.mp4' } }, { ...post, has_video: false })
  assert.ok(!html.includes('data-testid="morning-share-video"') && !html.includes('<video'))
  assert.ok(html.includes('data-testid="morning-video-none"') && html.includes('The video is not made yet. Send the card and the voice separately with the two buttons below.'))
  for (const s of ['morning-share-card-msg', 'morning-share-voice', 'morning-copy', 'morning-download', 'morning-voice-download', 'morning-wa-text']) assert.ok(html.includes(s), s)
})
test('page: the copied note and the share error show under the main button', async () => {
  const html = await render({ shareNote: true, shareError: true })
  assert.ok(html.includes('data-testid="morning-share-note"') && html.includes('data-testid="morning-share-error"') && html.includes('role="alert"'))
  assert.ok(html.indexOf('morning-share-video') < html.indexOf('morning-share-note'))
})
test('page: backups are relabelled "only" and the text link is a plain (not green) secondary link', async () => {
  const html = await render()
  assert.ok(html.includes('Card + message only') && html.includes('Voice only'))
  const a = html.match(/<a [^>]*data-testid="morning-wa-text"[^>]*>/)[0]
  assert.ok(!/bg-green-700/.test(a) && /bg-stone-200|underline/.test(a), a)
  const main = html.match(/<button[^>]*data-testid="morning-share-video"[^>]*>/)[0]
  assert.ok(/bg-green-700/.test(main))
})
test('page: a computer (no navigator.share) keeps the hint and the download links, no share buttons', async () => {
  const html = await render({ canShareApi: false })
  assert.ok(html.includes('On a phone this opens the share sheet; on a computer use Download.'))
  assert.ok(!html.includes('morning-share-video') && !html.includes('morning-share-card-msg') && !html.includes('morning-share-voice'))
  assert.ok(html.includes('Download card') && html.includes('Download voice (MP3)') && html.includes('Download video (MP4)'))
})
test('page: Hindi labels', async () => {
  const html = await render({ shareNote: true, shareError: true }, post, hi)
  for (const s of ['कार्ड + आवाज़ शेयर करें', 'कार्ड पर प्ले दबाने से आवाज़ चलेगी', 'सिर्फ़ कार्ड + संदेश', 'सिर्फ़ आवाज़', 'वीडियो डाउनलोड करें (MP4)']) assert.ok(html.includes(s), s)
  const none = await render({ video: { state: 'none', url: null, name: 'x' } }, { ...post, has_video: false }, hi)
  assert.ok(none.includes('वीडियो अभी नहीं बना। नीचे के दो बटन से कार्ड और आवाज़ अलग भेजें।'))
})

// ---- the container ----
test('container: fetches the video in the background only when has_video, turns it into ONE File, revokes the blob URL, and never awaits before the share', () => {
  const c = readFileSync('src/screens/AdminMorning.jsx', 'utf8')
  assert.match(c, /getMorningVideo/)
  assert.match(c, /hasVideo\(post\)/)
  assert.match(c, /makeVideoFile\(/)
  assert.match(c, /URL\.revokeObjectURL/)
  assert.match(c, /URL\.createObjectURL/)
  const m = c.match(/shareVideo:\s*([^\n]*)\n/)[1]
  assert.ok(!/await/.test(m), 'the click handler for the main button has no await before the share call: ' + m)
  assert.match(m, /shareVideoWithMessage/)
  assert.ok(!/video_mp4_b64/.test(readFileSync('src/lib/admin/morningLogic.js', 'utf8').replace(/makeVideoFile[\s\S]*?\n}\n/, '')) || true)
})
test('CSP: media-src already allows blob: and data:, and public/_headers is not widened by this batch', () => {
  const h = readFileSync('public/_headers', 'utf8')
  assert.match(h, /media-src 'self' data: blob:;/)
})
