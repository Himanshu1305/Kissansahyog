#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0
let fail = 0
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  if (ok) pass += 1
  else fail += 1
}
const read = (relative) => readFileSync(join(ROOT, relative), 'utf8')
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = join(dir, entry.name)
  return entry.isDirectory() ? walk(path) : [path]
})

// This is the single, deliberately narrow exception list for the page-width scan.
// The values are a fixed image thumbnail and a hero text proportion, not page wrappers.
const WIDTH_WHITELIST = new Map([
  ['src/screens/Homepage.jsx', new Map([
    ['w-[96px]', 'article-card image thumbnail'],
    ['md:max-w-[58%]', 'desktop hero text proportion inside a full-width hero'],
  ])],
])
const widthPattern = /(?:[a-z]+:)?max-w-[^\s"'`}]+|(?<![-\w])(?:[a-z]+:)?w-\[[^\]]+\]|\bmx-auto\b/g
const widthOffenders = []
for (const relativeRoot of ['src/screens', 'src/components/pages']) {
  for (const full of walk(join(ROOT, relativeRoot)).filter((file) => file.endsWith('.jsx'))) {
    const relative = full.slice(ROOT.length + 1).replaceAll('\\', '/')
    const source = readFileSync(full, 'utf8')
    for (const token of source.match(widthPattern) || []) {
      if (!WIDTH_WHITELIST.get(relative)?.has(token)) widthOffenders.push(`${relative}: ${token}`)
    }
  }
}
check('D1: no undocumented hard-coded page-width wrappers', widthOffenders.length === 0, widthOffenders.join(', '))

const screens = walk(join(ROOT, 'src/screens')).filter((file) => file.endsWith('.jsx'))
const unframed = screens.filter((file) => {
  const source = readFileSync(file, 'utf8')
  return !/(PageShell|\bScreen\b|components\/home\/kit)/.test(source)
}).map((file) => file.slice(ROOT.length + 1))
check('D1: every screen uses a shared frame primitive', unframed.length === 0, unframed.join(', '))
check('D1: inventory covers every screen', read('docs/review/BATCH6D_LAYOUT_INVENTORY.md').match(/^\| [^|]+\.jsx \|/gm)?.length === screens.length + 1)

const home = read('src/screens/Homepage.jsx')
check('D2: homepage renders the 3/2/1 equal-height Q&A grid', /grid items-stretch gap-3 md:grid-cols-2 lg:grid-cols-3/.test(home) && /flex h-full flex-col text-left/.test(home))
check('D2: Q&A copy is clamped and answer link is pinned', /line-clamp-2/.test(home) && /line-clamp-3/.test(home) && /mt-auto pt-3/.test(home) && /qa_read_answer/.test(home))
check('D2: homepage no longer renders the oversized question tile', !/h-14 w-14[\s\S]{0,180}❓/.test(home))
check('D2: photo-question CTA and all-questions route remain', /qa_photo_ask/.test(home) && /qa_all_link/.test(home) && /navigate\('\/sawaal'\)/.test(home))
const community = await import(pathToFileURL(join(ROOT, 'src/lib/community/sawaalSelection.js')).href)
const featured = [{ id: 'featured', answer_hi: 'उत्तर' }]
const recent = [{ id: 'featured', answer_hi: 'duplicate' }, { id: 'blank', answer_hi: '  ' }, { id: 'recent-a', answer_en: 'Answer' }, { id: 'recent-b', answer_hi: 'उत्तर दो' }]
check('D2: featured helper tops up with answered recent rows', community.topUpFeaturedSawaal(featured, recent, 3).map((row) => row.id).join(',') === 'featured,recent-a,recent-b')

const events = read('src/lib/events/eventsApi.js')
check('D3: events query starts at today in India time', /indiaDateString/.test(events) && /\.gte\('event_date', today\)/.test(events))
check('D3: homepage has no event-strip query or markup', !/fetchUpcomingEvents|eventWeekdayKey|eventLine|\bin7\b/.test(home))
check('D4: homepage has no most-viewed state, fetch, or heading', !/fetchTopViewed|most_viewed_heading|topViewed/.test(home))
check('D4: removed most-viewed string is absent from product source', !walk(join(ROOT, 'src')).some((file) => /\.(?:js|jsx)$/.test(file) && readFileSync(file, 'utf8').includes('most_viewed_heading')))

const footer = read('src/components/layout/Footer.jsx')
check('D5: future-charge copy has no product render', !walk(join(ROOT, 'src')).some((file) => /\.(?:js|jsx)$/.test(file) && readFileSync(file, 'utf8').includes('agri_vendor_future_charges')))
check('D5: shared footer credit is mounted globally', footer.includes('USD Vision AI LLP') && read('src/App.jsx').includes('<Footer />'))
check('D6: footer has one linked Open-Meteo attribution', (footer.match(/https:\/\/open-meteo\.com/g) || []).length === 1 && footer.includes('footer_data_sources_suffix'))

const vite = read('vite.config.js')
check('D7: PWA comments and config describe auto-update', /registerType: 'autoUpdate'/.test(vite) && /skipWaiting: true/.test(vite) && !/registerType 'prompt'/.test(vite))
check('D7: phase8 expects auto-update', /autoUpdate/.test(read('scripts/test/phase8.mjs')) && !/registerType is 'prompt'/.test(read('scripts/test/phase8.mjs')))
check('D7: v11 no longer expects the removed future-charge key', !/agri_vendor_future_charges/.test(read('scripts/test/v11_phase6.mjs')))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
