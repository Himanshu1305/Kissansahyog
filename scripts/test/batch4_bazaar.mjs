#!/usr/bin/env node
// Batch 4 item D — /bazaar category landing pages. Content + structure checks.
//   node scripts/test/batch4_bazaar.mjs
// (The "returns 200 / exactly one <h1> / unique title+meta in the HTML" guarantee is
// enforced on the prerendered output by scripts/test/v2_seo_audit.mjs after build:full.)
import { readFileSync } from 'node:fs'
import { BAZAAR_CATS, BAZAAR_DEDICATED } from '../../src/content/pages/bazaar.js'
const read = (p) => { try { return readFileSync(p, 'utf8') } catch { return '' } }
// registry.jsx can't be imported by node (JSX); read the enabled-category list as text.
const regLine = (read('src/lib/listings/registry.jsx').match(/ENABLED_CATEGORIES\s*=\s*\[([^\]]*)\]/) || [, ''])[1]
const ENABLED_CATEGORIES = [...regLine.matchAll(/'([^']+)'/g)].map((m) => m[1])
let pass = 0, fail = 0
const ok = (n, c, d = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${d}`) } }

const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length
const catWords = (d) => words([d.intro, (d.find || []).join(' '), d.body, (d.faqs || []).map((f) => `${f.q} ${f.a}`).join(' ')].join(' '))

const hiTitles = new Set(), enTitles = new Set()
for (const c of BAZAAR_CATS) {
  ok(`${c.slug}: cat is an enabled listings category`, ENABLED_CATEGORIES.includes(c.cat), c.cat)
  ok(`${c.slug}: hi + en names present`, !!c.hi?.name && !!c.en?.name)
  ok(`${c.slug}: >=250 words of Hindi`, catWords(c.hi) >= 250, `got ${catWords(c.hi)}`)
  ok(`${c.slug}: >=250 words of English`, catWords(c.en) >= 250, `got ${catWords(c.en)}`)
  ok(`${c.slug}: 3-5 FAQs (hi)`, c.hi.faqs.length >= 3 && c.hi.faqs.length <= 5, `${c.hi.faqs.length}`)
  ok(`${c.slug}: 3-5 FAQs (en)`, c.en.faqs.length >= 3 && c.en.faqs.length <= 5)
  ok(`${c.slug}: unique hi title`, !hiTitles.has(c.hi.title), c.hi.title)
  ok(`${c.slug}: unique en title`, !enTitles.has(c.en.title))
  hiTitles.add(c.hi.title); enTitles.add(c.en.title)
}
// Land is listed last (owner requirement).
ok('land is the last bazaar category', BAZAAR_CATS[BAZAAR_CATS.length - 1].slug === 'land')
// Dedicated pages are linked, not duplicated.
ok('dedicated pages link out (cold-storage, greenhouse, jugaad, drone-didi)',
  ['/cold-storage', '/greenhouse', '/jugaad', '/drone-didi'].every((to) => BAZAAR_DEDICATED.some((d) => d.to === to)))
ok('no dedicated-page category is duplicated as a /bazaar landing',
  !BAZAAR_CATS.some((c) => ['warehouse', 'greenhouse', 'jugaad', 'drone_didi'].includes(c.cat)))

// Screen wiring.
const scr = read('src/screens/Bazaar.jsx')
ok('screen: Browse + Post buttons with ?cat=', scr.includes('/browse?cat=${c.cat}') && scr.includes('/post?cat=${c.cat}&type=${c.type}'))
ok('screen: BreadcrumbList + FAQPage JSON-LD', scr.includes("'BreadcrumbList'") && scr.includes("'FAQPage'"))
ok('screen: uses Seo (title/description/canonical via <Seo>)', scr.includes('<Seo'))
ok('screen: exactly one <h1> per view (hub + landing each render one)', (scr.match(/<h1/g) || []).length === 2)

// Routing + prerender + footer wiring.
ok('route /bazaar and /bazaar/:slug registered', read('src/App.jsx').includes('path="/bazaar"') && read('src/App.jsx').includes('path="/bazaar/:slug"'))
const pr = read('scripts/lib/prerender-routes.mjs')
ok('prerender: /bazaar hub + per-category routes added', pr.includes("'/bazaar'") && pr.includes('/bazaar/${c.slug}'))
ok('footer links to /bazaar', read('src/components/layout/Footer.jsx').includes('to="/bazaar"'))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
