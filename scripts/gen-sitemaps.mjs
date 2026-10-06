#!/usr/bin/env node
// Generate split sitemaps + an index into dist/ (§14.2). Run AFTER prerender in
// build:full so the data-driven routes (Q&A, cold-storage districts, schemes) are
// current. Buckets: pages / sawaal / cold-storage / schemes.
//   node --env-file=.env scripts/gen-sitemaps.mjs
import { writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { getRoutes } from './lib/prerender-routes.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const ORIGIN = 'https://kissansahyog.com'
const today = new Date().toISOString().slice(0, 10)

const routes = await getRoutes()
const bucket = { sawaal: [], 'cold-storage': [], schemes: [], pages: [] }
for (const r of routes) {
  if (r.startsWith('/sawaal') || r.startsWith('/fasal/')) bucket.sawaal.push(r)
  else if (r.startsWith('/cold-storage')) bucket['cold-storage'].push(r)
  else if (r.startsWith('/yojana')) bucket.schemes.push(r)
  else bucket.pages.push(r)
}

const freq = (r) => (r === '/mausam' || r === '/msp' || r.startsWith('/msp/')) ? 'daily' : (r.startsWith('/sawaal') || r.startsWith('/fasal/') || r.startsWith('/yojana')) ? 'monthly' : 'weekly'
const urlset = (routes) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  routes.sort().map((r) => `  <url><loc>${ORIGIN}${r === '/' ? '/' : r}</loc><lastmod>${today}</lastmod><changefreq>${freq(r)}</changefreq></url>`).join('\n') +
  `\n</urlset>\n`

const files = {
  'sitemap-pages.xml': bucket.pages,
  'sitemap-sawaal.xml': bucket.sawaal,
  'sitemap-cold-storage.xml': bucket['cold-storage'],
  'sitemap-schemes.xml': bucket.schemes,
}
const out = existsSync(DIST) ? DIST : join(ROOT, 'public')
for (const [name, rs] of Object.entries(files)) writeFileSync(join(out, name), urlset(rs))

const index = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  Object.keys(files).map((n) => `  <sitemap><loc>${ORIGIN}/${n}</loc><lastmod>${today}</lastmod></sitemap>`).join('\n') +
  `\n</sitemapindex>\n`
writeFileSync(join(out, 'sitemap.xml'), index)

console.log(`Sitemaps written to ${out}: pages ${bucket.pages.length}, sawaal ${bucket.sawaal.length}, cold-storage ${bucket['cold-storage'].length}, schemes ${bucket.schemes.length}.`)
