// Batch 19 / 19-B - safe-updating checks for the Pashupalan content modules (see DECISIONS.md "safe-updating checks").
// Run one page only:  PASHU_PAGE=kamdhenu-yojana node --test tests/unit/pashupalan-19-content.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_PAGES as ALL, DETAIL_PAGES as DETAIL } from '../../src/content/pashupalan/registry.js'
import hub, { GUIDE, pickGuide } from '../../src/content/pashupalan/hub.js'
import { SCHEME_STATUSES, STATUS, NOTE, UI } from '../../src/content/pashupalan/common.js'
import { LINKS, LINK_IDS } from '../../src/content/pashupalan/links.js'
import { RELATED_LABELS } from '../../src/content/pashupalan/common.js'
import { walkPage, pageWords, wordCount, linkIdsIn, pageTokensIn, expandLinks } from '../../src/content/pashupalan/walk.js'

const ONLY = process.env.PASHU_PAGE
const ALL_PAGES = ONLY ? ALL.filter((p) => p.slug === ONLY) : ALL
const DETAIL_PAGES = ONLY ? DETAIL.filter((p) => p.slug === ONLY) : DETAIL
const INFO_PAGES = ['desi-nasle', 'pashupalan-se-kamai']

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const facts = await readFile(join(ROOT, 'docs/review/batch19/FACTS.md'), 'utf8')
const FACT_IDS = new Set([...facts.matchAll(/^\| (F-[A-Z]\d+) \|/gm)].map((m) => m[1]))
const DIGITS = /[0-9०-९]/
const items = (p) => walkPage(p).items

test('fact ids are parsed from FACTS.md', () => { assert.ok(FACT_IDS.size > 30, `found ${FACT_IDS.size}`) })

test('every page has asOf, seo, h1, hook, answer, art and sources; detail status is valid', () => {
  for (const p of ALL_PAGES) {
    assert.match(p.asOf, /^\d{4}-\d{2}-\d{2}$/, p.slug)
    assert.ok(p.seo.title.hi && p.seo.title.en && p.seo.description.hi && p.seo.description.en, p.slug)
    assert.ok(p.h1.hi && p.h1.en && p.answer.hi && p.answer.en && p.hook.hi && p.hook.en, p.slug)
    assert.ok(p.art, `${p.slug} needs an illustration name`)
    assert.ok(Array.isArray(p.sources) && p.sources.length > 0, `${p.slug} has no sources`)
    for (const s of p.sources) {
      assert.match(s.url, /^https:\/\//)
      assert.ok(['OFFICIAL', 'NEWS', 'PRIVATE'].includes(s.type), s.url)
      assert.match(s.date, /^\d{4}(-\d{2}(-\d{2})?)?$/)
      assert.ok(s.title.hi && s.title.en)
    }
  }
  for (const p of DETAIL_PAGES) {
    if (INFO_PAGES.includes(p.slug)) assert.equal(p.status, 'info')
    else assert.ok(SCHEME_STATUSES.includes(p.status), `${p.slug}: ${p.status}`)
  }
})

test('detail pages have the 19-B anatomy: sar(3), 2-4 tiles, income block, links or noLink, a numbered-steps or wait card, FAQs', () => {
  for (const p of DETAIL_PAGES) {
    assert.equal(p.sar.length, 3, `${p.slug} sar`)
    assert.ok(p.tiles.length >= 2 && p.tiles.length <= 4, `${p.slug} tiles ${p.tiles.length}`)
    for (const t of p.tiles) assert.ok(t.v.hi && t.v.en && t.l.hi && t.l.en && t.src.hi && t.src.en, `${p.slug} tile`)
    assert.ok(p.income && p.income.items.length >= 2, `${p.slug} needs the income block`)
    assert.ok((p.links && p.links.length > 0) || p.noLink, `${p.slug} needs links or noLink`)
    assert.ok((p.links || []).length <= 4, `${p.slug}: at most 4 direct-link buttons`)
    assert.ok(p.know && p.know.yes.items.length && p.know.no.items.length, `${p.slug} know`)
    assert.ok(p.steps || p.wait, `${p.slug} needs steps or a wait card`)
    assert.ok(!(p.steps && p.wait), `${p.slug}: steps and wait are exclusive`)
    if (p.steps) assert.ok(p.steps.items.length >= 3, `${p.slug} steps`)
    if (p.noLink) assert.ok(!p.links || p.links.every((l) => LINKS[l.id]), p.slug)
    assert.ok(p.caution && !Array.isArray(p.caution) && p.caution.items.length, `${p.slug} caution`)
    assert.ok(!p.cautions && !p.tips, 'one caution and at most one tip')
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

test('Hindi and English parity: every text object has both languages; item counts match; no fact id leaks into visible text', () => {
  for (const p of ALL_PAGES) {
    const { items: its, heads } = walkPage(p)
    for (const x of [...its, ...heads]) {
      assert.ok(x.hi.trim() && x.en.trim(), `${p.slug} ${x.where}: empty hi or en`)
      assert.ok(!/F-[A-Z]\d+/.test(x.hi + x.en), `${p.slug} ${x.where}: fact id in visible text`)
      assert.equal([...x.hi.matchAll(/\{\{link:/g)].length, [...x.en.matchAll(/\{\{link:/g)].length, `${p.slug} ${x.where}: link tokens differ between hi and en`)
      assert.deepEqual(linkIdsIn(x.hi), linkIdsIn(x.en), `${p.slug} ${x.where}: different link ids`)
      assert.deepEqual(pageTokensIn(x.hi), pageTokensIn(x.en), `${p.slug} ${x.where}: different page tokens`)
      for (const r of pageTokensIn(x.hi)) assert.ok(RELATED_LABELS[r], `${p.slug}: page token ${r} has no label`)
    }
  }
})

test('every {{link:id}} resolves and every direct-link id is in the registry; registry entries are well formed', () => {
  for (const p of ALL_PAGES) {
    const { items: its, heads } = walkPage(p)
    for (const x of [...its, ...heads]) for (const id of linkIdsIn(x.hi + ' ' + x.en)) assert.ok(LINKS[id], `${p.slug}: unknown link {{link:${id}}}`)
    assert.ok(!/\{\{missing/.test(its.map((i) => expandLinks(i.hi)).join(' ')), p.slug)
    for (const l of p.links || []) { assert.ok(LINKS[l.id], `${p.slug}: unknown direct link ${l.id}`); assert.ok(l.btn.hi && l.btn.en) }
  }
  for (const id of LINK_IDS) {
    const l = LINKS[id]
    assert.equal(l.id, id)
    assert.match(l.url, /^https:\/\/[a-z0-9.-]+$/, `${id}: home page URLs only, no deep link`)
    assert.ok(['OFFICIAL', 'NEWS', 'PRIVATE'].includes(l.type) && l.label.hi && l.label.en && l.does.hi && l.does.en)
    assert.match(l.checkedOn, /^\d{4}-\d{2}-\d{2}$/)
    assert.equal(typeof l.ok, 'boolean')
    if (!l.ok) assert.ok(l.note, `${id}: a link that blocks automated checks needs a note`)
  }
})

test('portals are never written as plain text: use {{link:id}} so they are tappable', () => {
  const BARE = /[a-z0-9-]+.(gov.in|nic.in|res.in|mponline.gov.in|coop)/i
  for (const p of ALL_PAGES) for (const it of items(p)) assert.ok(!BARE.test(it.hi) && !BARE.test(it.en), `${p.slug} ${it.where}: bare web address in text: ${String(it.hi.match(BARE) || it.en.match(BARE))}`)
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

const FORBIDDEN = [/\bfree\b/i, /निःशुल्क/, /नि:शुल्क/, /मुफ़्त/, /मुफ्त/, /फ्री/, /पायलट/, /\bpilot\b/i, /under review/i, /समीक्षाधीन/, /आपको मिलेगा/, /एक जगह/, /all in one place/i, /\bone place\b/i, /USD Vision/i, /Dixit|दीक्षित/]
test('no forbidden words (free / pilot / under review / promises / "in one place" / company or author names)', () => {
  for (const p of ALL_PAGES) {
    const text = (JSON.stringify(p) + JSON.stringify(NOTE) + JSON.stringify(UI)).replace(/Free Press Journal/g, '').replace(/फ्री प्रेस जर्नल/g, '')
    for (const re of FORBIDDEN) assert.ok(!re.test(text), `${p.slug}: forbidden ${re}`)
  }
})

test('no politician named as the source of a benefit', () => {
  for (const p of ALL_PAGES) {
    const t = JSON.stringify(p)
    for (const name of ['शिवराज', 'Shivraj']) assert.ok(!t.includes(name), `${p.slug}: ${name}`)
  }
})

test('hub scheme cards: status/asOf equal the detail page; every scheme page is on the hub once', () => {
  for (const row of hub.schemes) {
    const page = DETAIL.find((d) => d.slug === row.slug)
    assert.ok(page, row.slug)
    assert.equal(row.status, page.status, `${row.slug} status`)
    assert.equal(row.asOf, page.asOf, `${row.slug} asOf`)
    assert.ok(row.name.hi && row.who.hi && row.key.hi && row.key.en, row.slug)
  }
  assert.deepEqual(hub.schemes.map((r) => r.slug).sort(), DETAIL.filter((d) => d.slug !== 'pashupalan-se-kamai').map((d) => d.slug).sort())
  for (const s of new Set(hub.schemes.map((r) => r.status))) assert.ok(STATUS[s], s)
  assert.ok(hub.why && hub.why.tiles.length === 3, 'hub has the 3 benefit tiles')
  assert.ok(hub.sagar && hub.sagar.items.length, 'hub has the Sagar block')
})

test('decision guide: five choices, each resolves to a real page', () => {
  assert.equal(GUIDE.length, 5)
  for (const g of GUIDE) {
    const r = pickGuide(g.id)
    assert.ok(DETAIL.some((d) => d.slug === r.primary), g.id)
    for (const a of r.also) assert.ok(DETAIL.some((d) => d.slug === a), a)
    assert.ok(!r.also.includes(r.primary))
  }
  assert.equal(pickGuide('few').primary, 'desi-gay-anudan')
  assert.equal(pickGuide('dairy').primary, 'kamdhenu-yojana')
  assert.equal(pickGuide('gaushala').primary, 'gaushala-anudan')
  assert.equal(pickGuide('money').primary, 'pashu-kisan-credit-card')
  assert.equal(pickGuide('breed').primary, 'desi-nasle')
  assert.equal(pickGuide('zzz'), null)
})

test('word counts: every detail page and the hub >= 1000 Hindi words; English >= 60% of Hindi', () => {
  for (const p of ALL_PAGES) {
    const hi = pageWords(p, 'hi'); const en = pageWords(p, 'en')
    if (process.env.PASHU_COUNTS) console.log('WORDS', p.slug, hi, en)
    assert.ok(hi >= 1000, `${p.slug}: Hindi words ${hi}`)
    assert.ok(en >= 0.6 * hi, `${p.slug}: en ${en} < 60% of hi ${hi}`)
  }
})

test('plain voice: average Hindi sentence is short (<= 18 words) on every page', () => {
  for (const p of ALL_PAGES) {
    const text = items(p).map((i) => expandLinks(i.hi)).join(' ')
    const sentences = text.split(/[।?!]|\.\s/).map((s) => s.trim()).filter((s) => wordCount(s) > 0)
    const avg = wordCount(text) / sentences.length
    if (process.env.PASHU_COUNTS) console.log('AVG', p.slug, avg.toFixed(1))
    assert.ok(avg <= 18, `${p.slug}: average sentence ${avg.toFixed(1)} words`)
  }
})

test('office words are not used', () => {
  for (const p of ALL_PAGES) {
    const t = items(p).map((i) => i.hi).join(' ')
    for (const w of ['उक्त', 'तदनुसार', 'प्रावधान', 'अधिसूचित']) assert.ok(!t.includes(w), `${p.slug}: office word ${w}`)
  }
})

test('related links point to real routes; 5-8 FAQs; one direct answer short enough for the first 60 words', async () => {
  const { STATIC_ROUTES } = await import('../../scripts/lib/prerender-routes.mjs')
  const known = new Set([...STATIC_ROUTES, ...ALL.map((p) => p.path)])
  for (const p of ALL_PAGES) {
    for (const r of p.related) assert.ok(known.has(r), `${p.slug}: related ${r}`)
    assert.ok(!JSON.stringify(p).includes('experts'), `${p.slug}: /experts needs a login and sends signed-out visitors to the homepage`)
    assert.ok(words(p.answer.hi) <= 62, `${p.slug} answer ${words(p.answer.hi)}`)
  }
  for (const p of DETAIL_PAGES) assert.ok(p.faqs.length >= 5 && p.faqs.length <= 8, `${p.slug} faqs ${p.faqs.length}`)
  for (const p of DETAIL_PAGES) if (p.slug !== 'pashupalan-se-kamai') assert.ok(p.related.includes('/pashupalan/pashupalan-se-kamai'), `${p.slug} links to the income page`)
})
function words(s) { return wordCount(s) }
