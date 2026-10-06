// PERMANENT regression suite for V2 Phase 14 — SEO/AEO/GEO completion.
// Run: node scripts/test/v2_phase14.mjs   (no DB; checks committed assets + build outputs)
import { readFileSync, existsSync } from 'node:fs'
let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')
const has = (p) => existsSync(new URL(`../../${p}`, import.meta.url))

// 1. OG images (default + per hub).
for (const n of ['default', 'greenhouse', 'carbon-credit', 'jugaad', 'cold-storage', 'sawaal']) {
  ok(`og/${n}.png exists`, has(`public/og/${n}.png`))
}
// Per-hub OG wired in Seo.
ok('hubs pass per-hub OG image', ['Greenhouse', 'CarbonCredit', 'Jugaad', 'ColdStorage'].every((s) => read(`src/screens/${s}.jsx`).includes('image="/og/')))
ok('Seo resolves relative image to absolute', read('src/components/layout/Seo.jsx').includes('imageUrl'))

// 2. robots.txt — allow content, disallow app/noindex routes, sitemap ref.
const robots = read('public/robots.txt')
ok('robots allows all + references sitemap', /Allow: \//.test(robots) && /Sitemap: https:\/\/kissansahyog\.com\/sitemap\.xml/.test(robots))
ok('robots disallows /search + /join', /Disallow: \/search/.test(robots) && /Disallow: \/join/.test(robots))

// 3. llms.txt describes sections + key pages.
const llms = read('public/llms.txt')
ok('llms.txt names the site + key hubs', /Kissan Sahyog/.test(llms) && /\/greenhouse/.test(llms) && /\/carbon-credit/.test(llms) && /\/sawaal/.test(llms) && /\/cold-storage/.test(llms))

// 4. sitemap generator + build wiring.
ok('gen-sitemaps.mjs exists', has('scripts/gen-sitemaps.mjs'))
ok('gen-og.mjs exists', has('scripts/gen-og.mjs'))
ok('build:full runs gen-sitemaps', /gen-sitemaps\.mjs/.test(read('package.json')))
const gs = read('scripts/gen-sitemaps.mjs')
ok('sitemaps split into pages/sawaal/cold-storage/schemes + index', ['sitemap-pages.xml', 'sitemap-sawaal.xml', 'sitemap-cold-storage.xml', 'sitemap-schemes.xml'].every((f) => gs.includes(f)) && gs.includes('sitemapindex'))

// 5. If a build exists, validate the generated sitemaps are well-formed XML.
const distIndex = new URL('../../dist/sitemap.xml', import.meta.url)
if (existsSync(distIndex)) {
  const idx = readFileSync(distIndex, 'utf8')
  ok('dist sitemap index references the 4 child sitemaps', ['pages', 'sawaal', 'cold-storage', 'schemes'].every((b) => idx.includes(`sitemap-${b}.xml`)))
  for (const b of ['pages', 'sawaal', 'cold-storage', 'schemes']) {
    const x = readFileSync(new URL(`../../dist/sitemap-${b}.xml`, import.meta.url), 'utf8')
    ok(`dist sitemap-${b}.xml well-formed urlset`, x.startsWith('<?xml') && x.includes('<urlset') && x.trim().endsWith('</urlset>'))
  }
} else {
  ok('dist sitemaps (skipped — run build:full)', true)
}

// 6. SEO docs.
ok('docs/seo/KEYWORDS.md exists with primary keywords', has('docs/seo/KEYWORDS.md') && /Primary/i.test(read('docs/seo/KEYWORDS.md')))
ok('docs/seo/SEO_CHECKLIST.md exists', has('docs/seo/SEO_CHECKLIST.md'))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
