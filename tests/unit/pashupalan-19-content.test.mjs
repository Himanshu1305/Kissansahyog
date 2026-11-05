// Batch 19 - safe-updating checks for the Pashupalan content modules (see DECISIONS.md "safe-updating checks").
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_PAGES, DETAIL_PAGES } from '../../src/content/pashupalan/registry.js'
import hub, { GUIDE, pickGuide } from '../../src/content/pashupalan/hub.js'
import { SCHEME_STATUSES, STATUS, NOTE } from '../../src/content/pashupalan/common.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const facts = await readFile(join(ROOT, 'docs/review/batch19/FACTS.md'), 'utf8')
const FACT_IDS = new Set([...facts.matchAll(/^\| (F-[A-Z]\d+) \|/gm)].map((m) => m[1]))

// every { hi, en, f } text item of a page, with where it lives
function items(page) {
  const out = []
  const add = (it, where) => out.push({ ...it, where })
  if (page.answer) add(page.answer, 'answer')
  for (const s of page.sections || []) for (const it of s.items) add(it, `section:${s.id}`)
  for (const q of page.faqs || []) add({ hi: q.q.hi + ' ' + q.a.hi, en: q.q.en + ' ' + q.a.en, f: q.f }, 'faq')
  for (const it of page.intro || []) add(it, 'intro')
  for (const r of page.table || []) add({ hi: r.name.hi + ' ' + r.who.hi + ' ' + r.get.hi, en: r.name.en + ' ' + r.who.en + ' ' + r.get.en, f: r.f }, 'table')
  for (const k of ['checklist', 'news', 'where', 'notFound', 'howto', 'safety']) if (page[k]) for (const it of page[k].items) add(it, k)
  return out
}
const DIGITS = /[0-9०-९]/

test('fact ids are parsed from FACTS.md', () => { assert.ok(FACT_IDS.size > 30, `found ${FACT_IDS.size}`) })

test('every page has asOf, seo, h1, answer and sources; detail status is valid', () => {
  for (const p of ALL_PAGES) {
    assert.match(p.asOf, /^\d{4}-\d{2}-\d{2}$/, p.slug)
    assert.ok(p.seo.title.hi && p.seo.title.en && p.seo.description.hi && p.seo.description.en, p.slug)
    assert.ok(p.h1.hi && p.h1.en && p.answer.hi && p.answer.en, p.slug)
    assert.ok(Array.isArray(p.sources) && p.sources.length > 0, `${p.slug} has no sources`)
    for (const s of p.sources) {
      assert.match(s.url, /^https:\/\//)
      assert.ok(['OFFICIAL', 'NEWS', 'PRIVATE'].includes(s.type), s.url)
      assert.match(s.date, /^\d{4}(-\d{2}-\d{2})?$/)
      assert.ok(s.title.hi && s.title.en)
    }
  }
  for (const p of DETAIL_PAGES) {
    if (p.slug === 'desi-nasle') assert.equal(p.status, 'info')
    else assert.ok(SCHEME_STATUSES.includes(p.status), `${p.slug}: ${p.status}`)
  }
})

test('every text item has a fact id that exists in FACTS.md; GEN only where there are no numbers', () => {
  for (const p of ALL_PAGES) for (const it of items(p)) {
    assert.ok(Array.isArray(it.f) && it.f.length > 0, `${p.slug} ${it.where}: item without f: ${it.hi.slice(0, 40)}`)
    for (const id of it.f) assert.ok(id === 'GEN' || FACT_IDS.has(id), `${p.slug}: unknown fact id ${id}`)
    if (it.f.every((x) => x === 'GEN')) assert.ok(!DIGITS.test(it.hi) && !DIGITS.test(it.en), `${p.slug}: GEN item has a number: ${it.hi.slice(0, 50)}`)
  }
})

test('numbers: every item that contains a number has a real FACTS id (not only GEN)', () => {
  for (const p of ALL_PAGES) for (const it of items(p)) {
    if (DIGITS.test(it.hi) || DIGITS.test(it.en)) assert.ok(it.f.some((x) => FACT_IDS.has(x)), `${p.slug} ${it.where}: number without fact id: ${it.hi.slice(0, 50)}`)
  }
})

const CLAIM_RUNNING = /(शुरू हो चुकी|शुरू हो गई|मिल रहा है|मिल रहे हैं|has started|is being paid|already started)/g
test('planned/announced pages never claim the scheme is running (except inside a question or a negation)', () => {
  for (const p of DETAIL_PAGES.filter((x) => x.status === 'planned' || x.status === 'announced')) {
    const text = items(p).map((i) => i.hi + ' ' + i.en).join(' ')
    for (const m of text.matchAll(CLAIM_RUNNING)) {
      const around = text.slice(Math.max(0, m.index - 40), m.index + 40)
      assert.ok(/\?|नहीं|\bnot\b|\bNo\b/.test(around), `${p.slug}: running-claim "${m[0]}" near "${around}"`)
    }
  }
})

const FORBIDDEN = [/\bfree\b/i, /निःशुल्क/, /नि:शुल्क/, /मुफ़्त/, /मुफ्त/, /फ्री/, /पायलट/, /\bpilot\b/i, /under review/i, /समीक्षाधीन/, /आपको मिलेगा/]
test('no forbidden words (free / pilot / under review / promises)', () => {
  for (const p of ALL_PAGES) {
    const text = (JSON.stringify(p) + JSON.stringify(NOTE)).replace(/Free Press Journal/g, '').replace(/फ्री प्रेस जर्नल/g, '')
    for (const re of FORBIDDEN) assert.ok(!re.test(text), `${p.slug}: forbidden ${re}`)
  }
})

test('no politician named as the source of a benefit', () => {
  for (const p of ALL_PAGES) {
    const t = JSON.stringify(p)
    for (const name of ['शिवराज', 'Shivraj']) assert.ok(!t.includes(name), `${p.slug}: ${name}`)
  }
})

test('hub table status/asOf equals the detail page; every detail page is in the table once', () => {
  for (const row of hub.table) {
    const page = DETAIL_PAGES.find((d) => d.slug === row.slug)
    assert.ok(page, row.slug)
    assert.equal(row.status, page.status, `${row.slug} status`)
    assert.equal(row.asOf, page.asOf, `${row.slug} asOf`)
  }
  assert.deepEqual(hub.table.map((r) => r.slug).sort(), DETAIL_PAGES.map((d) => d.slug).sort())
  for (const s of new Set(hub.table.map((r) => r.status))) assert.ok(STATUS[s], s)
})

test('decision guide: five choices, each resolves to a real page', () => {
  assert.equal(GUIDE.length, 5)
  for (const g of GUIDE) {
    const r = pickGuide(g.id)
    assert.ok(DETAIL_PAGES.some((d) => d.slug === r.primary), g.id)
    for (const a of r.also) assert.ok(DETAIL_PAGES.some((d) => d.slug === a), a)
    assert.ok(!r.also.includes(r.primary))
  }
  assert.equal(pickGuide('few').primary, 'desi-gay-anudan')
  assert.equal(pickGuide('dairy').primary, 'kamdhenu-yojana')
  assert.equal(pickGuide('gaushala').primary, 'gaushala-anudan')
  assert.equal(pickGuide('money').primary, 'pashu-kisan-credit-card')
  assert.equal(pickGuide('breed').primary, 'desi-nasle')
  assert.equal(pickGuide('zzz'), null)
})

const words = (s) => s.split(/\s+/).filter(Boolean).length
// Visible text of a page: items + section headings; the hub also shows the guide choices and block headings.
const pageText = (p, lang) => items(p).map((i) => i[lang]).join(' ') + ' ' + (p.sections || []).map((s) => s.h[lang]).join(' ') +
  (p.slug === 'hub' ? ' ' + GUIDE.map((g) => g.label[lang] + ' ' + g.why[lang]).join(' ') + ' ' + ['checklist', 'news', 'where', 'notFound', 'howto', 'safety'].map((k) => p[k].h[lang]).join(' ') : '')
test('detail pages: >= 800 Hindi words (hub >= 1000); English >= 40% of Hindi', () => {
  const counts = {}
  for (const p of ALL_PAGES) {
    counts[p.slug] = { hi: words(pageText(p, 'hi')), en: words(pageText(p, 'en')) }
    if (process.env.PASHU_COUNTS) console.log('WORDS', p.slug, counts[p.slug].hi, counts[p.slug].en)
    assert.ok(counts[p.slug].en >= 0.4 * counts[p.slug].hi, `${p.slug}: en ${counts[p.slug].en} < 40% of hi ${counts[p.slug].hi}`)
  }
  for (const p of DETAIL_PAGES) assert.ok(counts[p.slug].hi >= 800, `${p.slug}: Hindi words ${counts[p.slug].hi}`)
  assert.ok(counts.hub.hi >= 1000, `hub ${counts.hub.hi}`)
})

test('related links point to real routes; 5-8 FAQs on detail pages', async () => {
  const { STATIC_ROUTES } = await import('../../scripts/lib/prerender-routes.mjs')
  const known = new Set([...STATIC_ROUTES, '/experts', ...ALL_PAGES.map((p) => p.path)])
  for (const p of ALL_PAGES) for (const r of p.related) assert.ok(known.has(r), `${p.slug}: related ${r}`)
  for (const p of DETAIL_PAGES) assert.ok(p.faqs.length >= 5 && p.faqs.length <= 8, `${p.slug} faqs ${p.faqs.length}`)
})

test('the direct answer is short enough to sit in the first 60 words', () => {
  for (const p of ALL_PAGES) assert.ok(words(p.answer.hi) <= 62, `${p.slug} answer ${words(p.answer.hi)}`)
})
