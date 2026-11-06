// Batch 19-C - the announcement picture field: big green button, states, alt-text marks. Rendered with react-dom/server.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { rolldown } from 'rolldown'
import { adminStrings } from '../../src/lib/i18n/adminStrings.js'

let M
async function load() {
  if (M) return M
  const dir = join(process.cwd(), 'node_modules', '.cache', 'picture-19c'); mkdirSync(dir, { recursive: true })
  const b = await rolldown({ input: 'src/screens/admin/tabs/AnnouncementsPanel.jsx', external: ['react', 'react/jsx-runtime', /^react-dom/], transform: { jsx: { runtime: 'automatic' }, define: { 'import.meta.env': '({VITE_SUPABASE_URL:"https://t.supabase.co",VITE_SUPABASE_ANON_KEY:"k"})' } }, platform: 'node' })
  await b.write({ dir, format: 'esm', entryFileNames: 'panel.mjs' })
  M = await import(`file://${join(dir, 'panel.mjs').split('\\').join('/')}?v=${Date.now()}`)
  return M
}
const tFor = (lang) => (k) => (adminStrings[k] ? adminStrings[k][lang] : k)
const base = { imageUrl: '', busy: false, error: null, onPick() {}, onRemove() {} }
const html = async (props, lang = 'en') => { const { PictureField } = await load(); return renderToStaticMarkup(createElement(PictureField, { t: tFor(lang), ...base, ...props })) }
const IMG = 'https://x.supabase.co/storage/v1/object/public/listing-photos/announcements/a/0.jpg'

test('the label is tied to the real file input (htmlFor = id) and the input is still reachable by test id', async () => {
  const h = await html({})
  assert.match(h, /<input id="ann-image" data-testid="ann-image" type="file"/)
  assert.match(h, /<label for="ann-image"/)
  assert.ok(/accept="image\/jpeg,image\/png,image\/webp"/.test(h))
  assert.ok(!/capture=/.test(h), 'no capture attribute: the phone picker must offer the gallery too')
})
test('the input is visually hidden with sr-only (not display:none) so it keeps keyboard focus; label shows a focus ring', async () => {
  const h = await html({})
  assert.match(h, /class="peer sr-only"/)
  assert.ok(!/display:\s*none/.test(h))
  assert.match(h, /peer-focus-visible:ring-4/)
})
test('empty state: big green button (56px, full width, 17px bold white) with an icon and the choose text, in both languages', async () => {
  for (const [lang, txt] of [['en', 'Choose a picture'], ['hi', 'तस्वीर चुनें']]) {
    const h = await html({}, lang)
    assert.ok(h.includes(txt), lang)
    assert.match(h, /min-h-\[56px\] w-full/); assert.match(h, /text-\[17px\] font-bold text-white/); assert.match(h, /var\(--ks-green-dark\)/)
    assert.match(h, /<svg[^>]*aria-hidden="true"/)
    assert.ok(!h.includes('ann-image-ok') && !h.includes('ann-image-error'))
  }
})
test('uploading: label shows the uploading text in an aria-live region, the input is disabled, button looks disabled', async () => {
  for (const [lang, txt] of [['en', 'Uploading…'], ['hi', 'अपलोड हो रही है…']]) {
    const h = await html({ busy: true }, lang)
    assert.ok(h.includes(`<span aria-live="polite">${txt}</span>`), lang)
    assert.match(h, /<input[^>]*disabled/); assert.match(h, /aria-disabled="true"/)
  }
})
test('success: success line, 96px preview, remove button, and the label becomes "choose a different picture"', async () => {
  for (const [lang, ok, remove, change] of [['en', 'Picture added', 'Remove picture', 'Choose a different picture'], ['hi', 'तस्वीर जुड़ गई', 'तस्वीर हटाएँ', 'दूसरी तस्वीर चुनें']]) {
    const h = await html({ imageUrl: IMG }, lang)
    assert.ok(h.includes(ok) && h.includes(remove) && h.includes(change), lang)
    assert.match(h, /width="96" height="96"/); assert.match(h, /h-24 w-24/)
    assert.match(h, /data-testid="ann-image-remove"/)
  }
})
test('failure: the error shows as a red alert right under the button', async () => {
  const h = await html({ error: 'This picture could not be uploaded.' })
  assert.match(h, /<p role="alert" data-testid="ann-image-error"[^>]*bg-red-50[^>]*>This picture could not be uploaded\.<\/p>/)
  assert.ok(h.indexOf('</label>') < h.indexOf('ann-image-error'))
})
test('hint is at least 14px, normal ink colour, and has the new wording in both languages', async () => {
  const en = await html({}, 'en'); const hi = await html({}, 'hi')
  assert.match(en, /text-\[14px\] text-stone-800" data-testid="ann-image-hint">JPG, PNG or WebP\. It is shrunk automatically\. A square picture looks best — it shows as a small picture beside the text\./)
  assert.ok(hi.includes('JPG, PNG या WebP। यह अपने आप छोटी हो जाती है। वर्गाकार तस्वीर सबसे अच्छी दिखती है — यह टेक्स्ट के पास एक छोटी तस्वीर की तरह दिखेगी।'))
  assert.ok(!/text-stone-500/.test(en))
})
test('alt boxes are marked required only when a picture is set, optional otherwise', async () => {
  const { AltMark } = await load()
  for (const lang of ['en', 'hi']) {
    const on = renderToStaticMarkup(createElement(AltMark, { t: tFor(lang), on: true })); const off = renderToStaticMarkup(createElement(AltMark, { t: tFor(lang), on: false }))
    assert.ok(on.includes('ann-alt-required') && !on.includes('ann-alt-optional'))
    assert.ok(off.includes('ann-alt-optional') && !off.includes('ann-alt-required'))
    assert.ok(on.includes(adminStrings.adm_ann_alt_required[lang]) && off.includes(adminStrings.adm_ann_alt_optional[lang]))
  }
})
test('saving with a picture but no description is still refused; with descriptions or no picture it passes', async () => {
  const { formToPayload } = await load()
  const f = { title_hi: 'x', title_en: '', body_hi: '', body_en: '', small_hi: '', small_en: '', image_url: 'https://x/y.jpg', image_alt_hi: '', image_alt_en: '', link_url: '', link_label_hi: '', link_label_en: '', style: 'info', priority: 0, dismissible: true, is_active: true, start_local: '2026-11-07T08:00', end_local: '2026-11-08T08:00' }
  assert.equal(formToPayload(f).error, 'adm_ann_err_alt')
  assert.equal(formToPayload({ ...f, image_alt_hi: 'a' }).error, 'adm_ann_err_alt')
  assert.ok(formToPayload({ ...f, image_alt_hi: 'a', image_alt_en: 'b' }).data)
  assert.ok(formToPayload({ ...f, image_url: '' }).data)
})
test('new strings exist in Hindi and English; the form wires the field and keeps the other test ids and the preview', () => {
  for (const k of ['adm_ann_image_choose', 'adm_ann_image_change', 'adm_ann_image_uploading', 'adm_ann_image_added', 'adm_ann_alt_required', 'adm_ann_alt_optional', 'adm_ann_image_hint', 'adm_ann_image_remove']) assert.ok(adminStrings[k].hi && adminStrings[k].en, k)
  const src = readFileSync('src/screens/admin/tabs/AnnouncementsPanel.jsx', 'utf8')
  for (const id of ['ann-title-hi', 'ann-alt-hi', 'ann-alt-en', 'ann-link', 'ann-start', 'ann-save', 'ann-preview', 'ann-msg']) assert.ok(src.includes(`data-testid="${id}"`), id)
  assert.ok(src.includes('<PictureField') && src.includes('<AnnouncementCard a={preview} preview />'))
})
