#!/usr/bin/env node
// Batch 19 - generate docs/review/batch19/CONTENT_FOR_REVIEW.md from the content modules (never hand-edited).
//   node scripts/batch19/make-review-doc.mjs          -> writes the file
//   node scripts/batch19/make-review-doc.mjs --check  -> exit 1 if the file on disk is out of date
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_PAGES } from '../../src/content/pashupalan/registry.js'
import { GUIDE } from '../../src/content/pashupalan/guide.js'
import { LINKS } from '../../src/content/pashupalan/links.js'
import { expandLinks } from '../../src/content/pashupalan/walk.js'
import { STATUS, NOTE, UI } from '../../src/content/pashupalan/common.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'docs', 'review', 'batch19', 'CONTENT_FOR_REVIEW.md')
const hi = (v) => v.hi
const tag = (f) => `[${(f || []).join(', ')}]`

export function buildReviewDoc() {
  const L = []
  L.push('# पशुपालन पेज — पढ़ने के लिए पूरा हिंदी पाठ (समीक्षा हेतु)')
  L.push('')
  L.push('**एक अनुच्छेद में स्थिति:** इन पेजों में जो बातें सरकारी पोर्टल पर लिखी हैं (जैसे कामधेनु योजना का लोन, सब्सिडी और आवेदन के चरण) वे पक्की मानकर लिखी गई हैं। जो बातें केवल समाचारों में आई हैं (जैसे देसी गाय पर ₹900 तक महीना देने की तैयारी, गौशाला अनुदान ₹20 से ₹40) उन्हें "समाचारों के अनुसार" और तारीख़ के साथ लिखा गया है, उन्हें लागू योजना नहीं बताया गया। जो अभी घोषित ही नहीं हुआ (देसी गाय योजना का नाम, पात्रता, आवेदन का तरीका, दस्तावेज़; कामधेनु की पात्रता और यूनिट का आकार) उसे "अभी घोषित नहीं" लिखा गया है। हर अनुच्छेद के आगे [F-..] में उसका तथ्य-क्रमांक है जो FACTS.md में स्रोत, तारीख़ और भरोसे के स्तर के साथ मिलता है; [GEN] का मतलब सामान्य सलाह/तैयारी है जिसमें कोई संख्या नहीं और जो सरकारी शर्त नहीं है।')
  L.push('')
  L.push('यह फ़ाइल पेजों के पाठ-मॉड्यूल से स्क्रिप्ट द्वारा बनाई गई है (scripts/batch19/make-review-doc.mjs); हाथ से न बदलें।')
  L.push('')
  L.push('सामान्य टिप्पणी (हर योजना पेज पर): ' + hi(NOTE))
  L.push('')
  const X = (v) => expandLinks(v.hi, 'url', 'hi')
  const line = (it, kind, i) => (kind === 'ol' ? `${i + 1}. ${X(it)} ${tag(it.f)}` : kind === 'p' ? `${X(it)} ${tag(it.f)}
` : `- ${X(it)} ${tag(it.f)}`)
  const list = (items, kind = 'ul') => items.forEach((it, i) => L.push(line(it, kind, i)))
  const block = (h, items, kind) => { L.push(`### ${hi(h)}`); list(items, kind); L.push('') }
  for (const [n, p] of ALL_PAGES.entries()) {
    L.push('---', '', `## पेज ${n + 1}: ${p.path}`, '')
    L.push(`शीर्षक (H1): ${hi(p.h1)}`, `खोज-शीर्षक: ${hi(p.seo.title)}`, `खोज-विवरण: ${hi(p.seo.description)}`)
    L.push(p.status ? `स्थिति-पट्टी: ${hi(STATUS[p.status])} · जानकारी की तारीख़: ${p.asOf}` : `जानकारी की तारीख़: ${p.asOf}`, '')
    L.push(`**एक पंक्ति का परिचय:** ${X(p.hook)} ${tag(p.hook.f)}`, '')
    L.push(`**सीधा उत्तर:** ${X(p.answer)} ${tag(p.answer.f)}`, '')
    for (const it of p.intro || []) L.push(`${X(it)} ${tag(it.f)}
`)
    if (p.sar) { L.push(`### ${hi(UI.summary)}`); ;[UI.sarWhat, UI.sarWho, UI.sarStatus].forEach((lab, i) => L.push(`- ${hi(lab)}: ${X(p.sar[i])} ${tag(p.sar[i].f)}`)); L.push('') }
    if (p.tiles) { L.push(`### ${hi(UI.bigNumbers)}`); for (const t of p.tiles) L.push(`- ${hi(t.v)} — ${hi(t.l)} (${hi(t.src)}) ${tag(t.f)}`); L.push('') }
    if (p.links || p.noLink) {
      L.push(`### ${hi(UI.directLinks)}`)
      if (p.noLink) L.push(`- ${hi(UI.noLink)} ${tag(['GEN'])}`)
      for (const l of p.links || []) L.push(`- ${hi(l.btn)} → ${LINKS[l.id].url} (${hi(LINKS[l.id].does)})`)
      L.push('')
    }
    if (p.why) { L.push(`### ${hi(p.why.h)}`, `${X(p.why.intro)} ${tag(p.why.intro.f)}
`); for (const t of p.why.tiles) L.push(`- ${hi(t.v)} — ${hi(t.l)} (${hi(t.src)}) ${tag(t.f)}`); L.push('') }
    if (p.schemes) {
      L.push(`### ${hi(UI.seeAll)}`)
      for (const r of p.schemes) L.push(`- ${hi(r.name)} — ${hi(UI.cardWho)}: ${hi(r.who)} — ${hi(UI.keyFact)}: ${hi(r.key)} — स्थिति: ${hi(STATUS[r.status])} (${r.asOf}) — पेज: /pashupalan/${r.slug} ${tag(r.f)}`)
      L.push('', `### ${hi(UI.guideTitle)}`)
      for (const g of GUIDE) L.push(`- ${hi(g.label)} → /pashupalan/${g.primary}: ${hi(g.why)}`)
      L.push('')
    }
    if (p.know) { block({ hi: hi(UI.knownTitle) + ' — ' + hi(p.know.yes.h) }, p.know.yes.items); block({ hi: hi(UI.unknownTitle) + ' — ' + hi(p.know.no.h) }, p.know.no.items) }
    if (p.steps) block(p.steps.h, p.steps.items, 'ol')
    if (p.wait) { L.push(`### ${hi(p.wait.h)}`, `**${hi(UI.waitTitle)}.** ${X(p.wait.card)} ${tag(p.wait.card.f)}
`); L.push(`#### ${hi(p.wait.prep.h)}`); list(p.wait.prep.items); L.push('') }
    if (p.calc) { L.push(`### ${hi(p.calc.h)}`, hi(p.calc.intro), '', ...Object.values(p.calc.fields).map((f) => `- ${hi(f.l)} ${tag(['GEN'])}`), `- ${hi(p.calc.aidSwitch)} ${tag(['F-A1', 'F-A6'])}`, `- ${hi(p.calc.disclaimer)} ${tag(['GEN'])}`, '') }
    if (p.timeline) block(p.timeline.h, p.timeline.items.map((it) => ({ ...it, hi: `${hi(it.d)}: ${it.hi}` })))
    if (p.news) block(p.news.h, p.news.items.map((it) => ({ ...it, hi: `${hi(it.d)}: ${it.hi}` })))
    for (const s of p.sections || []) block(s.h, s.items, s.kind)
    if (p.sagar) block(p.sagar.h, p.sagar.items)
    for (const k of ['howto', 'checklist', 'where', 'notFound']) if (p[k]) block(p[k].h, p[k].items)
    if (p.who) { L.push(`### ${hi(p.who.h)}`); block(p.who.yes.h, p.who.yes.items); block(p.who.no.h, p.who.no.items) }
    if (p.caution) block({ hi: hi(UI.caution) + ': ' + hi(p.caution.h) }, p.caution.items)
    if (p.tip) block({ hi: hi(UI.tip) + ': ' + hi(p.tip.h) }, p.tip.items)
    if (p.safety) block({ hi: hi(UI.caution) + ': ' + hi(p.safety.h) }, p.safety.items)
    if (p.income) block(p.income.h, p.income.items)
    L.push(`### ${hi(UI.faqTitle)}`)
    p.faqs.forEach((f, i) => { L.push(`${i + 1}. **${hi(f.q)}** ${X(f.a)} ${tag(f.f)}`) })
    L.push('', `### ${hi(UI.bySource)}`)
    for (const s of p.sources) L.push(`- ${hi(s.title)} — ${hi(UI.typeLabel[s.type])} — ${s.date} — ${s.url}`)
    L.push('')
  }
  return L.join('\n') + '\n'
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const doc = buildReviewDoc()
  if (process.argv.includes('--check')) {
    const cur = existsSync(OUT) ? readFileSync(OUT, 'utf8') : ''
    if (cur.replace(/\r\n/g, '\n') !== doc) { console.error('CONTENT_FOR_REVIEW.md is out of date: run node scripts/batch19/make-review-doc.mjs'); process.exit(1) }
    console.log('CONTENT_FOR_REVIEW.md is up to date')
  } else { writeFileSync(OUT, doc); console.log('wrote', OUT, doc.length, 'chars') }
}
