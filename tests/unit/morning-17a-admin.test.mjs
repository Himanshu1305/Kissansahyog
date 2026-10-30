// Batch 17A Part D - /admin/morning voice player, WhatsApp text, share card + voice. Stateless view rendered with react-dom/server.
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

const read = (p) => readFileSync(p, 'utf8')

test('helpers: voice file name, data url, hasVoice, WhatsApp url', () => {
  assert.equal(L.voiceFileName('2026-10-30'), 'morning-2026-10-30.mp3')
  assert.equal(L.voiceDataUrl('AAA'), 'data:audio/mpeg;base64,AAA'); assert.equal(L.voiceDataUrl(null), null)
  assert.ok(L.hasVoice({ voice_mp3_b64: 'x' })); assert.ok(!L.hasVoice({ voice_mp3_b64: null })); assert.ok(!L.hasVoice(null))
  const u = L.whatsappTextUrl('नमस्ते & 100%\nok')
  assert.ok(u.startsWith('https://wa.me/?text=')); assert.equal(decodeURIComponent(u.slice('https://wa.me/?text='.length)), 'नमस्ते & 100%\nok')
})
test('helpers: canShareFiles needs share + canShare(files) and at least one file; never throws', () => {
  const ok = { share() {}, canShare: (o) => o.files.length === 2 }
  assert.ok(L.canShareFiles(ok, [1, 2])); assert.ok(!L.canShareFiles(ok, [1])); assert.ok(!L.canShareFiles(ok, []))
  assert.ok(!L.canShareFiles({}, [1])); assert.ok(!L.canShareFiles(null, [1]))
  assert.ok(!L.canShareFiles({ share() {}, canShare() { throw new Error('x') } }, [1]))
})
test('strings: every new key has Hindi and English, and is reachable through strings.js', () => {
  const keys = Object.keys(morningStrings).filter((k) => /^mp_(voice|wa_text|share_all)/.test(k))
  assert.ok(keys.length >= 8)
  for (const k of keys) { assert.ok(morningStrings[k].hi && morningStrings[k].en, k); assert.equal(strings[k].en, morningStrings[k].en) }
})

let View
async function loadView() {
  if (View) return View
  const dir = join(process.cwd(), 'node_modules', '.cache', 'morning-17a'); mkdirSync(dir, { recursive: true })
  const b = await rolldown({ input: 'src/screens/admin/MorningView.jsx', external: ['react', 'react/jsx-runtime', /^react-dom/], transform: { jsx: { runtime: 'automatic' } }, platform: 'node' })
  await b.write({ dir, format: 'esm', entryFileNames: 'view.mjs' })
  View = await import(`file://${join(dir, 'view.mjs').split('\\').join('/')}?v=${Date.now()}`)
  return View
}
const t = (k) => (strings[k] ? strings[k].en : k)
const noop = () => {}
const base = { t, date: '2026-10-30', dateText: 'Friday', today: '2026-10-30', history: { state: 'ready', error: null }, historyRows: [], nextDisabled: false, prevDisabled: false, copied: false, copyFailed: false, pollCopied: false, canShare: false, canShareAll: false, busy: false, pctValue: '', pctMsg: null, pctError: null, resultDateText: '2026-10-29', postedText: '', generatedText: '', refs: { msg: { current: null } }, on: { cardName: 'c.png', pct: noop, prev: noop, next: noop, today: noop, open: noop, copyMsg: noop, selectAll: noop, copyPoll: noop, share: noop, shareAll: noop, mark: noop, savePct: noop } }
const post = { message_text: 'MSG & TEXT', poll_text: 'POLL', card_png_b64: 'AQID', report_text: 'R', posted_at: null, generated_at: '2026-10-30T00:00:00Z', voice_script: 'सीताराम किसान भाइयो!', voice_mp3_b64: 'QUJD' }

test('page: voice present -> player, download with the dated file name, collapsible script, WhatsApp text, accessible labels', async () => {
  const { default: V } = await loadView()
  const html = renderToStaticMarkup(createElement(V, { ...base, post }))
  for (const s of ['<audio', 'controls', 'src="data:audio/mpeg;base64,QUJD"', 'aria-label="Play the voice note"', 'download="morning-2026-10-30.mp3"', 'Download voice (MP3)', 'aria-label="Download voice (MP3)"',
    '<details', 'Voice script', 'सीताराम किसान भाइयो!', 'https://wa.me/?text=MSG%20%26%20TEXT', 'WhatsApp: send text', 'rel="noopener noreferrer"', 'min-h-[48px]']) assert.ok(html.includes(s), s)
  assert.ok(!html.includes('morning-voice-missing'))
})
test('page: voice missing -> a clear line, no player; message, card and poll still shown', async () => {
  const { default: V } = await loadView()
  const html = renderToStaticMarkup(createElement(V, { ...base, post: { ...post, voice_script: null, voice_mp3_b64: null } }))
  assert.ok(html.includes('Voice not ready - run the workflow again.') && !html.includes('<audio') && !html.includes('morning-voice-script'))
  for (const s of ['Copy message', 'Download card', 'Copy poll', 'Mark as posted']) assert.ok(html.includes(s), s)
})
test('page: share card + voice button only when the browser can share files; else the hint', async () => {
  const { default: V } = await loadView()
  const no = renderToStaticMarkup(createElement(V, { ...base, post }))
  assert.ok(!no.includes('data-testid="morning-share-all"') && no.includes('On a phone this opens the share sheet; on a computer use Download.'))
  const yes = renderToStaticMarkup(createElement(V, { ...base, post, canShareAll: true }))
  assert.ok(yes.includes('data-testid="morning-share-all"') && yes.includes('aria-label="Share card + voice"') && !yes.includes('morning-share-all-hint'))
})
test('page: posted day still shows the voice and the old buttons; Hindi labels exist', async () => {
  const { default: V } = await loadView()
  const html = renderToStaticMarkup(createElement(V, { ...base, post: { ...post, posted_at: '2026-10-30T01:00:00Z' }, postedText: 'x' }))
  assert.ok(html.includes('<audio') && html.includes('Remove the posted mark'))
  const hi = renderToStaticMarkup(createElement(V, { ...base, t: (k) => strings[k]?.hi || k, post }))
  assert.ok(hi.includes('आवाज़ डाउनलोड करें (MP3)') && hi.includes('WhatsApp: संदेश भेजें'))
})
test('page stays admin-only, no analytics, not in sitemap/prerender/search index', () => {
  const src = read('src/screens/AdminMorning.jsx') + read('src/screens/admin/MorningView.jsx')
  assert.ok(src.includes('noindex') && src.includes('user?.is_admin') && !/gtag\(|posthog|plausible/i.test(src))
  for (const f of ['scripts/gen-sitemaps.mjs', 'scripts/prerender.mjs', 'scripts/build-search-index.mjs']) assert.ok(!/admin/i.test(read(f)), f)
  assert.match(read('public/robots.txt'), /Disallow: \/admin/)
})
