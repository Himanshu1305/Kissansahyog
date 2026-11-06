// Batch 19-B - pure helpers that read a page content module. Used by the tests, the review-doc script and the
// read-time label. No imports from the app; safe in Node.
//
// PAGE SHAPE (every text item is { hi, en, f:[FACT ids | 'GEN'] }; an "item" is any object that has an `f` array):
//   hook, answer                      one-line hook and the short direct answer (items)
//   sar[3]                            what it is / who it is for / status today (items)
//   tiles[2..4]                       { v:{hi,en}, l:{hi,en}, src:{hi,en}, f }  big-number tiles
//   links[{id, btn:{hi,en}}] | noLink the direct-links panel (ids from links.js); noLink:true shows the "no link announced" note
//   know:{ yes:{h,items}, no:{h,items} }   "what is known" / "what is not known yet"
//   steps:{h,items}  OR  wait:{h, card:item, prep:{h,items}}   numbered steps, or the calm "not started" card
//   timeline:{h, items:[{ d:{hi,en}, hi, en, f }]}
//   sections:[{ id, h, kind:'p'|'ul', items }]  extra substance
//   income:{h, items}  who:{h, yes:{h,items}, no:{h,items}}   (income effect; who can / cannot apply, only where facts allow)
//   caution:{h, items} tip:{h, items}          at most one each (amber / green callout)
//   faqs:[{ q, a, f }]  sources  related  seo  h1  slug  path  status  asOf  art
// Text may contain {{link:id}} tokens (see links.js).
import { LINKS, LINK_TOKEN, PAGE_TOKEN } from './links.js'
import { RELATED_LABELS } from './common.js'

const SKIP = new Set(['seo', 'sources', 'related', 'slug', 'path', 'status', 'asOf', 'art', 'links', 'noLink', 'calc'])
const isPair = (o) => o && typeof o === 'object' && typeof o.hi === 'string' && typeof o.en === 'string'

// Replace {{link:id}} by its label (mode 'label') or "label [url]" (mode 'url').
export function expandLinks(text, mode = 'label', lang = 'hi') {
  return String(text).replace(PAGE_TOKEN, (_, r) => RELATED_LABELS['/' + r]?.[lang] ?? `{{missing:${r}}}`).replace(LINK_TOKEN, (_, id) => {
    const l = LINKS[id]
    if (!l) return `{{missing:${id}}}`
    return mode === 'url' ? `${l.label.hi} [${l.url}]` : l.label.hi
  })
}
export const pageTokensIn = (text) => [...String(text).matchAll(PAGE_TOKEN)].map((m) => '/' + m[1])
export const linkIdsIn = (text) => [...String(text).matchAll(LINK_TOKEN)].map((m) => m[1])

function collect(node, lang, out) {
  if (typeof node?.[lang] === 'string') out.push(node[lang])
  for (const [k, v] of Object.entries(node)) {
    if (k === 'f' || typeof v !== 'object' || v === null) continue
    if (Array.isArray(v)) v.forEach((x) => x && typeof x === 'object' && collect(x, lang, out))
    else collect(v, lang, out)
  }
}

// -> { items: [{where, f, hi, en}], heads: [{where, hi, en}] }  (items carry fact ids; heads are headings/labels)
export function walkPage(page) {
  const items = []
  const heads = []
  const visit = (node, path) => {
    if (Array.isArray(node)) { node.forEach((n, i) => visit(n, `${path}[${i}]`)); return }
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node.f)) {
      const hi = []; const en = []
      collect(node, 'hi', hi); collect(node, 'en', en)
      items.push({ where: path, f: node.f, hi: hi.join(' '), en: en.join(' ') })
      return
    }
    if (isPair(node)) { heads.push({ where: path, hi: node.hi, en: node.en }); return }
    for (const [k, v] of Object.entries(node)) { if (!SKIP.has(k)) visit(v, path ? `${path}.${k}` : k) }
  }
  visit(page, '')
  // the page title is shown too (h1 sits under SKIP-free key 'h1', so it is already in heads)
  return { items, heads }
}

export const wordCount = (s) => String(s).split(/\s+/).filter(Boolean).length
export function pageWords(page, lang) {
  const { items, heads } = walkPage(page)
  const text = [...items, ...heads].map((x) => expandLinks(x[lang], 'label', lang)).join(' ')
  return wordCount(text)
}
// "पढ़ने में N मिनट": about 150 Hindi words a minute for a careful reader, at least 2.
export function readMinutes(page) { return Math.max(2, Math.ceil(pageWords(page, 'hi') / 150)) }
