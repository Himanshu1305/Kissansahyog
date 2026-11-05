#!/usr/bin/env node
// Batch 19 - generate docs/review/batch19/CONTENT_FOR_REVIEW.md from the content modules (never hand-edited).
//   node scripts/batch19/make-review-doc.mjs          -> writes the file
//   node scripts/batch19/make-review-doc.mjs --check  -> exit 1 if the file on disk is out of date
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_PAGES } from '../../src/content/pashupalan/registry.js'
import { GUIDE } from '../../src/content/pashupalan/guide.js'
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
  for (const [n, p] of ALL_PAGES.entries()) {
    L.push('---')
    L.push('')
    L.push(`## पेज ${n + 1}: ${p.path}`)
    L.push('')
    L.push(`शीर्षक (H1): ${hi(p.h1)}`)
    L.push(`खोज-शीर्षक: ${hi(p.seo.title)}`)
    L.push(`खोज-विवरण: ${hi(p.seo.description)}`)
    if (p.status) L.push(`स्थिति-पट्टी: ${hi(STATUS[p.status])} · जानकारी की तारीख़: ${p.asOf}`)
    else L.push(`जानकारी की तारीख़: ${p.asOf}`)
    L.push('')
    L.push(`**सीधा उत्तर:** ${hi(p.answer)} ${tag(p.answer.f)}`)
    L.push('')
    const list = (items, kind) => items.forEach((it, i) => L.push(kind === 'ol' ? `${i + 1}. ${hi(it)} ${tag(it.f)}` : kind === 'p' ? `${hi(it)} ${tag(it.f)}\n` : `- ${hi(it)} ${tag(it.f)}`))
    for (const it of p.intro || []) L.push(`${hi(it)} ${tag(it.f)}\n`)
    if (p.table) {
      L.push(`### ${hi(p.tableTitle)}`)
      for (const r of p.table) L.push(`- ${hi(r.name)} — किसके लिए: ${hi(r.who)} — क्या: ${hi(r.get)} — स्थिति: ${hi(STATUS[r.status])} (${r.asOf}) — पेज: /pashupalan/${r.slug} ${tag(r.f)}`)
      L.push('')
      L.push(`### ${hi(UI.guideTitle)}`)
      for (const g of GUIDE) L.push(`- ${hi(g.label)} → /pashupalan/${g.primary}: ${hi(g.why)}`)
      L.push('')
    }
    for (const s of p.sections || []) { L.push(`### ${hi(s.h)}`); list(s.items, s.kind); L.push('') }
    for (const k of ['howto', 'checklist', 'news', 'where', 'notFound', 'safety']) if (p[k]) { L.push(`### ${hi(p[k].h)}`); list(p[k].items, 'ul'); L.push('') }
    L.push(`### ${hi(UI.faqTitle)}`)
    p.faqs.forEach((f, i) => { L.push(`${i + 1}. **${hi(f.q)}** ${hi(f.a)} ${tag(f.f)}`) })
    L.push('')
    L.push(`### ${hi(UI.bySource)}`)
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
