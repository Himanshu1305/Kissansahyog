// Batch 17F - /install page wiring: FAQ + FAQPage JSON-LD, prerender route, search index entry, footer link, no-"free" rule.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildInstallJsonLd, installFaq } from '../../src/lib/install/faq.js'
import { STATIC_ROUTES } from '../../scripts/lib/prerender-routes.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (p) => readFile(join(ROOT, p), 'utf8')

test('FAQ: three questions, in both languages, with the founder-approved wording', () => {
  for (const lang of ['hi', 'en']) {
    const faq = installFaq(lang)
    assert.equal(faq.length, 3)
    for (const f of faq) { assert.ok(f.q.trim() && f.a.trim()) }
  }
  const hi = installFaq('hi').map((f) => f.q)
  assert.deepEqual(hi, ['ऐप कैसे इंस्टॉल करें?', 'इंस्टॉल का बटन क्यों नहीं दिख रहा या क्यों नहीं चल रहा?', 'क्या इंस्टॉल करने के लिए पैसे लगते हैं?'])
})

test('FAQPage JSON-LD mirrors the visible FAQ exactly', () => {
  for (const lang of ['hi', 'en']) {
    const [ld] = buildInstallJsonLd(lang)
    assert.equal(ld['@type'], 'FAQPage')
    assert.equal(ld.url, 'https://kissansahyog.com/install')
    const faq = installFaq(lang)
    assert.equal(ld.mainEntity.length, faq.length)
    ld.mainEntity.forEach((q, i) => {
      assert.equal(q['@type'], 'Question')
      assert.equal(q.name, faq[i].q)
      assert.equal(q.acceptedAnswer.text, faq[i].a)
    })
  }
})

test('the install FAQ makes no "free for farmers" promise (founder rule); only "no charge for installing"', () => {
  for (const lang of ['hi', 'en']) {
    const text = installFaq(lang).map((f) => `${f.q} ${f.a}`).join(' ')
    assert.ok(!/मुफ़्त|मुफ्त|\bfree\b|for farmers|किसानों के लिए/i.test(text), text)
  }
  assert.match(installFaq('en')[2].a, /charges nothing for installing/)
})

test('/install is in the prerender / sitemap route list (sitemaps are generated from the same list)', () => {
  assert.ok(STATIC_ROUTES.includes('/install'))
})

test('/install is in the site search index builder, App routes, and the footer', async () => {
  assert.match(await read('scripts/build-search-index.mjs'), /url: '\/install'/)
  assert.match(await read('src/App.jsx'), /path="\/install"/)
  assert.match(await read('src/components/layout/Footer.jsx'), /to="\/install"/)
})

test('the homepage mounts the QR block and the strip; PwaPrompts no longer owns its own install listener', async () => {
  const home = await read('src/screens/Homepage.jsx')
  assert.match(home, /<InstallQrBlock \/>/)
  assert.match(home, /<PwaInstallBanner \/>/)
  const prompts = await read('src/components/PwaPrompts.jsx')
  assert.ok(!/addEventListener\('beforeinstallprompt'/.test(prompts), 'PwaPrompts must use the shared store')
  const banner = await read('src/components/PwaInstallBanner.jsx')
  assert.ok(!/addEventListener\('beforeinstallprompt'/.test(banner), 'the strip must use the shared store')
})

test('only the install store listens for beforeinstallprompt in the whole site code', async () => {
  const { execSync } = await import('node:child_process')
  const out = execSync('git grep -l "beforeinstallprompt" -- src', { cwd: ROOT }).toString().trim().split('\n').sort()
  // installStore.js owns the listener; detectEnv.js and the comments mention the name only.
  const owners = []
  for (const f of out) if (/addEventListener\(\s*'beforeinstallprompt'/.test(await read(f))) owners.push(f)
  assert.deepEqual(owners, ['src/lib/install/installStore.js'])
})

test('the banner layout rules are in the component: one row, no wrap, text flex-1 min-w-0, button shrink-0, 44 px close', async () => {
  const b = await read('src/components/PwaInstallBanner.jsx')
  assert.match(b, /flex-nowrap/)
  assert.ok(!/flex-wrap/.test(b))
  assert.match(b, /min-w-0 flex-1/)
  assert.match(b, /leading-tight/)
  assert.match(b, /shrink-0/)
  assert.match(b, /h-11 w-11/)
})
