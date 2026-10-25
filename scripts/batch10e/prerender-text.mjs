// Batch 10E — text snapshot of EVERY prerendered page (Phase 0 baseline; later SEO diffs).
//
// Usage: node scripts/batch10e/prerender-text.mjs <distDir> <outDir>
//   For every *.html under <distDir> (index.html, every */index.html, and any other *.html):
//     dist/index.html          -> <outDir>/index.txt
//     dist/msp/gehun/index.html -> <outDir>/msp/gehun.txt
//     dist/404.html            -> <outDir>/404.html.txt
//   Each file has a header block, then the body text:
//     ### HEAD
//     title: …            meta description, canonical, robots, html lang
//     h1: …               one line per <h1>
//     --- jsonld 1 ---    every <script type="application/ld+json"> verbatim, then "--- end jsonld ---"
//     ### BODY
//     one visible text node per line (same rules as scripts/batch10d/seo-text.mjs: whitespace collapsed,
//     script/style/noscript/template and svg <title> excluded; CSS is not applied, so hidden
//     duplicates are included).
//   Also writes <outDir>/_index.json (route -> file, line counts, title).
// Parses with Chromium (JavaScript disabled, every subresource blocked), so no parser dependency.
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const [distDir, outDir] = process.argv.slice(2)
if (!distDir || !outDir) { console.error('usage: node scripts/batch10e/prerender-text.mjs <distDir> <outDir>'); process.exit(2) }
if (!fs.existsSync(path.join(distDir, 'index.html'))) { console.error(`no index.html in ${distDir}`); process.exit(2) }

const htmlFiles = fs.readdirSync(distDir, { recursive: true })
  .map((f) => String(f).replace(/\\/g, '/'))
  .filter((f) => f.endsWith('.html') && fs.statSync(path.join(distDir, f)).isFile())
  .sort()

const outName = (rel) => {
  if (rel === 'index.html') return 'index.txt'
  if (rel.endsWith('/index.html')) return rel.slice(0, -'/index.html'.length) + '.txt'
  return rel + '.txt'
}
const routeOf = (rel) => rel === 'index.html' ? '/' : rel.endsWith('/index.html') ? '/' + rel.slice(0, -'/index.html'.length) : '/' + rel

fs.mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch()
const index = {}
try {
  const ctx = await browser.newContext({ javaScriptEnabled: false })
  const page = await ctx.newPage()
  await page.route('**/*', (r) => r.abort())
  for (const rel of htmlFiles) {
    const html = fs.readFileSync(path.join(distDir, rel), 'utf8')
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    const r = await page.evaluate(() => {
      const clean = (s) => (s || '').replace(/\s+/g, ' ').trim()
      const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'])
      const lines = []
      const walk = (node) => {
        for (const c of node.childNodes) {
          if (c.nodeType === 3) { const v = clean(c.nodeValue); if (v) lines.push(v) }
          else if (c.nodeType === 1) {
            if (SKIP.has(c.tagName) || (c.tagName.toLowerCase() === 'title' && c.closest('svg'))) continue
            walk(c)
          }
        }
      }
      if (document.body) walk(document.body)
      const meta = (sel, attr) => { const e = document.querySelector(sel); return e ? e.getAttribute(attr) : null }
      return {
        lines,
        title: document.title,
        description: meta('meta[name="description"]', 'content'),
        canonical: meta('link[rel="canonical"]', 'href'),
        robots: meta('meta[name="robots"]', 'content'),
        lang: document.documentElement.getAttribute('lang'),
        h1: [...document.querySelectorAll('h1')].map((h) => clean(h.textContent)),
        jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
      }
    })
    const head = ['### HEAD',
      `title: ${r.title ?? ''}`,
      `description: ${r.description ?? ''}`,
      `canonical: ${r.canonical ?? ''}`,
      `robots: ${r.robots ?? ''}`,
      `lang: ${r.lang ?? ''}`,
      ...r.h1.map((h) => `h1: ${h}`)]
    r.jsonld.forEach((j, i) => { head.push(`--- jsonld ${i + 1} ---`, j, '--- end jsonld ---') })
    const file = outName(rel)
    fs.mkdirSync(path.dirname(path.join(outDir, file)), { recursive: true })
    fs.writeFileSync(path.join(outDir, file), [...head, '### BODY', ...r.lines].join('\n') + '\n')
    index[routeOf(rel)] = { file, bodyLines: r.lines.length, h1: r.h1.length, jsonld: r.jsonld.length, title: r.title }
  }
} finally {
  await browser.close()
}
fs.writeFileSync(path.join(outDir, '_index.json'), JSON.stringify(index, null, 2) + '\n')
const total = Object.values(index).reduce((a, x) => a + x.bodyLines, 0)
console.log(`pages ${htmlFiles.length}; body lines ${total}; no-h1 pages ${Object.values(index).filter((x) => x.h1 === 0).length}; out ${outDir}`)
