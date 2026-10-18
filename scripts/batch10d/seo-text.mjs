// Batch 10D — extract the SEO-relevant text of a prerendered page (baseline in Task A, diff in Task D).
//
// Usage: node scripts/batch10d/seo-text.mjs <htmlFile> <outDir> [--sitemaps <distDir>]
//   <outDir>/home-text.txt  visible text of <body>: every non-empty text node in document order,
//                           whitespace collapsed, one per line; text inside script/style/noscript/
//                           template/svg <title> excluded. Both hero instances (mobile + desktop) are
//                           in the prerendered DOM, so both are included (CSS is not applied).
//   <outDir>/home-seo.json  <title>, meta description, canonical, every JSON-LD block (verbatim string
//                           + parsed), h1 text(s), all h2/h3 texts (document order), the FAQ block text
//                           if present (element whose id/class/data-testid contains "faq", or
//                           <details>/<summary> pairs, or FAQPage JSON-LD), and the text of the
//                           <section> around each h2. With --sitemaps (default: the html file's
//                           directory), sha256 of every sitemap*.xml there.
// Parses with Chromium (JavaScript disabled) so no parser dependency is needed.
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const args = process.argv.slice(2)
const [htmlFile, outDir] = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--sitemaps')
if (!htmlFile || !outDir) { console.error('usage: node scripts/batch10d/seo-text.mjs <htmlFile> <outDir> [--sitemaps <distDir>]'); process.exit(2) }
const si = args.indexOf('--sitemaps')
const sitemapDir = si >= 0 ? args[si + 1] : path.dirname(htmlFile)

const html = fs.readFileSync(htmlFile, 'utf8')
const browser = await chromium.launch()
let res
try {
  const ctx = await browser.newContext({ javaScriptEnabled: false })
  const page = await ctx.newPage()
  // Block every subresource: we only need the parsed DOM.
  await page.route('**/*', (r) => r.abort())
  await page.setContent(html, { waitUntil: 'domcontentloaded' })
  res = await page.evaluate(() => {
    const clean = (s) => (s || '').replace(/\s+/g, ' ').trim()
    const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'])
    const lines = []
    // Plain recursive walk (TreeWalker filter callbacks do not run with JavaScript disabled).
    const walk = (node) => {
      for (const c of node.childNodes) {
        if (c.nodeType === 3) { const v = clean(c.nodeValue); if (v) lines.push(v) }
        else if (c.nodeType === 1) {
          if (SKIP.has(c.tagName) || (c.tagName.toLowerCase() === 'title' && c.closest('svg'))) continue
          walk(c)
        }
      }
    }
    walk(document.body)

    const meta = (sel, attr) => { const e = document.querySelector(sel); return e ? e.getAttribute(attr) : null }
    const jsonld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
      let parsed = null
      try { parsed = JSON.parse(s.textContent) } catch { /* keep verbatim */ }
      return { verbatim: s.textContent, parsed }
    })
    const faqEls = [...document.querySelectorAll('[id*="faq" i], [class*="faq" i], [data-testid*="faq" i]')]
    const details = [...document.querySelectorAll('details')].map((d) => clean(d.textContent))
    const faqLd = jsonld.filter((j) => JSON.stringify(j.parsed || '').includes('FAQPage'))
    const sections = [...document.querySelectorAll('h2')].map((h) => {
      const s = h.closest('section')
      return { h2: clean(h.textContent), sectionText: s ? clean(s.textContent) : null }
    })
    return {
      lines,
      seo: {
        title: document.title,
        metaDescription: meta('meta[name="description"]', 'content'),
        canonical: meta('link[rel="canonical"]', 'href'),
        htmlLang: document.documentElement.getAttribute('lang'),
        robots: meta('meta[name="robots"]', 'content'),
        ogTitle: meta('meta[property="og:title"]', 'content'),
        ogDescription: meta('meta[property="og:description"]', 'content'),
        hreflang: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => ({ hreflang: l.getAttribute('hreflang'), href: l.getAttribute('href') })),
        jsonld,
        h1: [...document.querySelectorAll('h1')].map((h) => clean(h.textContent)),
        h2: [...document.querySelectorAll('h2')].map((h) => clean(h.textContent)),
        h3: [...document.querySelectorAll('h3')].map((h) => clean(h.textContent)),
        headingsInOrder: [...document.querySelectorAll('h1,h2,h3')].map((h) => `${h.tagName.toLowerCase()}: ${clean(h.textContent)}`),
        faq: faqEls.length || details.length || faqLd.length
          ? { elements: faqEls.map((e) => clean(e.textContent)), details, jsonLdFAQPage: faqLd.length }
          : null,
        sections,
        links: [...document.querySelectorAll('body a[href]')].map((a) => a.getAttribute('href')),
      },
    }
  })
} finally {
  await browser.close()
}

// <lastmod> is the build date, so the raw hash changes from day to day; the "noLastmod" hash
// (every <lastmod>…</lastmod> removed) is the one to compare across builds on different days.
const sitemaps = {}
const sitemapsNoLastmod = {}
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex')
if (fs.existsSync(sitemapDir)) {
  for (const f of fs.readdirSync(sitemapDir).filter((f) => /^sitemap.*\.xml$/.test(f)).sort()) {
    const buf = fs.readFileSync(path.join(sitemapDir, f))
    sitemaps[f] = sha(buf)
    sitemapsNoLastmod[f] = sha(buf.toString('utf8').replace(/<lastmod>[^<]*<\/lastmod>/g, ''))
  }
}
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'home-text.txt'), res.lines.join('\n') + '\n')
fs.writeFileSync(path.join(outDir, 'home-seo.json'), JSON.stringify({ source: htmlFile, ...res.seo, sitemapsSha256: sitemaps, sitemapsSha256NoLastmod: sitemapsNoLastmod }, null, 2))
console.log(`text lines ${res.lines.length}; title "${res.seo.title}"; h1 ${res.seo.h1.length}; h2 ${res.seo.h2.length}; h3 ${res.seo.h3.length}; json-ld ${res.seo.jsonld.length}; faq ${res.seo.faq ? 'yes' : 'none'}; sitemaps ${Object.keys(sitemaps).length}`)
