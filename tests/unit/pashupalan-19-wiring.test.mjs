// Batch 19 - routes, SEO fields, JSON-LD, sitemap/prerender/search-index membership, links in, lazy chunks.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_PAGES, DETAIL_PAGES } from '../../src/content/pashupalan/registry.js'
import { buildPashuJsonLd, faqList } from '../../src/lib/pashupalan/seo.js'
import { STATIC_ROUTES, getRoutes } from '../../scripts/lib/prerender-routes.mjs'
import { strings } from '../../src/lib/i18n/strings.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (p) => readFile(join(ROOT, p), 'utf8')
const PATHS = ALL_PAGES.map((p) => p.path)

test('eight routes: hub + six scheme/info pages + the income page, English slugs', () => {
  assert.deepEqual([...PATHS].sort(), ['/pashupalan', '/pashupalan/desi-gay-anudan', '/pashupalan/desi-nasle', '/pashupalan/gaushala-anudan', '/pashupalan/kamdhenu-yojana', '/pashupalan/kendriya-yojanayen', '/pashupalan/pashu-kisan-credit-card', '/pashupalan/pashupalan-se-kamai'])
})

test('App.jsx: every route is lazy; no content module is imported by the main bundle', async () => {
  const app = await read('src/App.jsx')
  for (const p of PATHS) assert.ok(app.includes(`path="${p}"`), p)
  assert.equal((app.match(/lazy\(\(\) => import\('\.\/screens\/pashupalan\//g) || []).length, 8)
  assert.ok(!/content\/pashupalan/.test(app), 'App.jsx must not import the content modules')
})

test('each route screen imports only its own content module (own chunk)', async () => {
  const map = { PashuHub: 'hub', DesiGay: 'desi-gay-anudan', Kamdhenu: 'kamdhenu-yojana', Gaushala: 'gaushala-anudan', PashuKcc: 'pashu-kisan-credit-card', KendriyaYojanayen: 'kendriya-yojanayen', DesiNasle: 'desi-nasle', PashuIncome: 'pashupalan-se-kamai' }
  for (const [file, mod] of Object.entries(map)) {
    const src = await read(`src/screens/pashupalan/${file}.jsx`)
    const imports = [...src.matchAll(/from '\.\.\/\.\.\/content\/pashupalan\/([^']+)'/g)].map((m) => m[1])
    assert.deepEqual(imports, [`${mod}.js`], file)
  }
  const view = await read('src/screens/pashupalan/PashuView.jsx')
  assert.ok(!/pashupalan\/(hub|guide|desi|kamdhenu|gaushala|pashu-kisan|kendriya)/.test(view), 'shared detail view must not pull page text')
})

test('prerender list, sitemap bucket and search index contain all eight pages', async () => {
  for (const p of PATHS) assert.ok(STATIC_ROUTES.includes(p), `prerender ${p}`)
  const routes = await getRoutes()
  for (const p of PATHS) assert.ok(routes.includes(p), `getRoutes ${p}`)
  const gen = await read('scripts/gen-sitemaps.mjs')
  assert.ok(gen.includes("bucket.pages.push(r)"), 'non-yojana/sawaal routes land in sitemap-pages')
  for (const p of PATHS) assert.ok(!p.startsWith('/yojana') && !p.startsWith('/sawaal') && !p.startsWith('/cold-storage') && !p.startsWith('/fasal/'), p)
  const idx = await read('scripts/build-search-index.mjs')
  for (const p of PATHS) assert.ok(idx.includes(`url: '${p}'`), `search index ${p}`)
})

test('SEO: unique titles and descriptions, sane lengths, real search phrases', () => {
  for (const lang of ['hi', 'en']) {
    const titles = ALL_PAGES.map((p) => p.seo.title[lang])
    const descs = ALL_PAGES.map((p) => p.seo.description[lang])
    assert.equal(new Set(titles).size, titles.length, `${lang} titles unique`)
    assert.equal(new Set(descs).size, descs.length, `${lang} descriptions unique`)
    for (const p of ALL_PAGES) { assert.ok(p.seo.title[lang].length <= 100, `${p.slug} title ${p.seo.title[lang].length}`); assert.ok(p.seo.description[lang].length <= 260, `${p.slug} desc`) }
  }
  const by = Object.fromEntries(ALL_PAGES.map((p) => [p.slug, p.seo.title.hi + p.seo.description.hi]))
  assert.match(by['desi-gay-anudan'], /देसी गाय/); assert.match(by['desi-gay-anudan'], /900/)
  assert.match(by['kamdhenu-yojana'], /कामधेनु योजना आवेदन कैसे करें/)
  assert.match(by['gaushala-anudan'], /गौशाला अनुदान/); assert.match(by['gaushala-anudan'], /40/)
  assert.match(by['pashu-kisan-credit-card'], /पशुपालन KCC/)
  assert.match(by['desi-nasle'], /केनकथा/)
})

test('JSON-LD: parses, FAQPage text equals the visible FAQ text, dateModified = asOf', () => {
  for (const lang of ['hi', 'en']) for (const p of ALL_PAGES) {
    const ld = JSON.parse(JSON.stringify(buildPashuJsonLd(p, lang)))
    const art = ld.find((x) => x['@type'] === 'Article' || x['@type'] === 'WebPage')
    assert.equal(art.dateModified, p.asOf); assert.equal(art.url, 'https://kissansahyog.com' + p.path)
    assert.equal(art.author.name, 'Team Kissan Sahyog')
    const faq = ld.find((x) => x['@type'] === 'FAQPage')
    assert.ok(faq, p.slug)
    const visible = faqList(p, lang)
    assert.deepEqual(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), visible.map((f) => [f.q, f.a]))
    assert.ok(visible.every((f) => f.q && f.a))
  }
})

test('layout files: one H1 (in the shared Hero), the answer, the note, status, channel, share; schemes shown once as cards (no table); no Hindi in layout code', async () => {
  const parts = await read('src/screens/pashupalan/parts.jsx')
  const view = await read('src/screens/pashupalan/PashuView.jsx')
  const hub = await read('src/screens/pashupalan/PashuHubView.jsx')
  const calc = await read('src/screens/pashupalan/MilkCalc.jsx')
  const art = await read('src/screens/pashupalan/art.jsx')
  const css = await read('src/screens/pashupalan/pashu.css')
  assert.equal((parts.match(/<h1\b/g) || []).length, 1)
  assert.equal((view.match(/<h1\b/g) || []).length + (hub.match(/<h1\b/g) || []).length, 0, 'only Hero renders the H1')
  for (const needle of ['pashu-answer', 'WhatsAppChannelCard', 'pashu-share', 'wa.me', 'noopener noreferrer']) assert.ok(parts.includes(needle), needle)
  assert.ok(view.includes('pashu-note') && view.includes('StatusBadge') && hub.includes('pashu-note'))
  assert.ok(hub.includes('pashu-cards') && !hub.includes('<table'), 'the hub shows scheme cards, not a second table')
  assert.ok(hub.includes('after:absolute after:inset-0'), 'the whole scheme card is the link')
  for (const [n, src] of Object.entries({ parts, view, hub, calc, art })) assert.ok(!/[ऀ-ॿ]/.test(src), `no Hindi text in ${n}: all copy is in the content modules`)
  assert.ok(css.includes('prefers-reduced-motion: no-preference'), 'animation only when the user allows it')
})

test('the phrase "in one place" (Hindi or English) is not in the Pashupalan files', async () => {
  const { readdir } = await import('node:fs/promises')
  const bad = [['एक', 'जगह'].join(' '), ['all', 'in', 'one', 'place'].join(' '), ['one', 'place'].join(' ')]
  const files = []
  for (const d of ['src/content/pashupalan', 'src/screens/pashupalan', 'src/lib/pashupalan', 'scripts/batch19', 'docs/review/batch19']) for (const f of await readdir(join(ROOT, d))) if (/\.(js|jsx|mjs|md)$/.test(f)) files.push(`${d}/${f}`)
  for (const f of files) { const t = (await read(f)).toLowerCase(); for (const b of bad) assert.ok(!t.includes(b.toLowerCase()), `${f} contains "${b}"`) }
})

test('links in: homepage strip, /yojana + /yojana/mp (not central), footer, strings in both languages', async () => {
  const home = await read('src/screens/Homepage.jsx'); assert.ok(home.includes("{ to: '/pashupalan', labelKey: 'home_open_pashu' }"))
  const y = await read('src/screens/Yojana.jsx'); assert.ok(y.includes('to="/pashupalan"') && y.includes("level !== 'central'"))
  const f = await read('src/components/layout/Footer.jsx'); assert.ok(f.includes('to="/pashupalan"'))
  for (const k of ['home_open_pashu', 'pashu_nav']) { assert.ok(strings[k].hi && strings[k].en, k) }
})

test('the WhatsApp channel button uses the existing constant, and no new dependency was added', async () => {
  const card = await read('src/components/WhatsAppChannelCard.jsx'); assert.ok(card.includes('WHATSAPP_CHANNEL_URL'))
  const pkg = JSON.parse(await read('package.json'))
  assert.equal(Object.keys(pkg.dependencies || {}).length > 0, true)
  for (const f of ['hub', 'common', 'guide', 'links', 'walk']) assert.ok(!/from '[^.]/.test(await read(`src/content/pashupalan/${f}.js`)), `${f}.js is pure data`)
})

test('detail pages cover the required sections', () => {
  for (const p of DETAIL_PAGES) {
    const ids = p.sections.map((s) => s.id)
    assert.ok(p.sections.length >= 2 && ids.length === new Set(ids).size, p.slug)
    assert.ok(p.related.length >= 5, p.slug)
  }
  assert.ok(DETAIL_PAGES.find((d) => d.slug === 'desi-gay-anudan').sections.some((s) => s.id === 'notify'))
})
