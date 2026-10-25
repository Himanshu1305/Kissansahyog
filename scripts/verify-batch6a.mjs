#!/usr/bin/env node
// Static and pure-logic verification for Batch 6A. No database or deploy calls.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { strings } from '../src/lib/i18n/strings.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (file) => readFileSync(join(root, file), 'utf8')
let pass = 0
let fail = 0
const check = (name, ok, detail = '') => {
  if (ok) { pass += 1; console.log(`PASS  ${name}`) }
  else { fail += 1; console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`) }
}
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)])

const boundary = read('src/components/ErrorBoundary.jsx')
const main = read('src/main.jsx')
const registry = read('src/lib/listings/registry.jsx')
const home = read('src/screens/Homepage.jsx')
const pwa = read('vite.config.js')
const prompts = read('src/components/PwaPrompts.jsx')
check('A1: ErrorBoundary exists and is mounted', existsSync(join(root, 'src/components/ErrorBoundary.jsx')) && main.includes('<ErrorBoundary><App /></ErrorBoundary>'))
check('A1: stale-build recovery clears SW and caches once', boundary.includes('navigator.serviceWorker') && boundary.includes('caches') && boundary.includes('ks_recovered') && boundary.includes('ChunkLoadError'))
const { categoryOrNull } = await import(pathToFileURL(join(root, 'src/lib/listings/categorySafety.js')).href)
check('A1: getCategorySafe nonexistent category returns null', registry.includes('export function getCategorySafe') && categoryOrNull({}, 'nonexistent') === null)
check('A1: collection summary calls are safe', home.includes('getCategorySafe(l.category)') && read('src/components/ListingCard.jsx').includes('getCategorySafe'))
check('A1: PWA updates activate automatically', pwa.includes("registerType: 'autoUpdate'") && pwa.includes('skipWaiting: true') && pwa.includes('clientsClaim: true') && !prompts.includes('updateServiceWorker(true)'))

const tokens = read('src/styles/tokens.css')
const shell = read('src/components/layout/PageShell.jsx')
const ui = read('src/components/ui.jsx')
check('A2: central layout tokens define content, wide, gutter, card and grid', ['--content-max: 72ch', '--wide-max: 1200px', '--page-pad: 1rem', '--ks-card-shadow', '--ks-grid-gap', '.ks-form-side'].every((needle) => tokens.includes(needle)))
check('A2: PageShell and Screen default to wide', shell.includes("width = 'wide'") && ui.includes("width = 'wide'"))
// This guard targets page-centering wrappers. Allowed files retain intentionally narrow
// alerts, success messages, or Welcome—not a second general page layout system.
const wrapperWhitelist = new Set(['Admin.jsx', 'KisanMelaSubmit.jsx', 'ListingDetail.jsx', 'NotFound.jsx', 'Post.jsx', 'Safalta.jsx', 'Welcome.jsx'])
const pageWidthWrappers = walk(join(root, 'src/screens')).filter((file) => extname(file) === '.jsx').filter((file) => /className="[^"]*mx-auto[^"]*max-w-/.test(readFileSync(file, 'utf8')) && !wrapperWhitelist.has(file.split(/[\\/]/).at(-1)))
check('A2: no unapproved hard-coded screen page-width wrappers', pageWidthWrappers.length === 0, pageWidthWrappers.join(', '))

const nav = read('src/components/NavBar.jsx')
const searchBar = read('src/components/SearchBar.jsx')
check('A3: home search reuses SearchBar and voice search', home.includes('<SearchBar variant="hero"') && searchBar.includes("variant === 'hero'") && searchBar.includes('VoiceSearchButton'))
check('A3: navigation search is hidden on homepage', nav.includes("location.pathname !== '/' && <SearchBar />"))

const melaApi = read('src/lib/mela/melaApi.js')
const melaScreen = read('src/screens/KisanMela.jsx')
const mela = await import(pathToFileURL(join(root, 'src/lib/mela/melaStatus.js')).href)
check('A4: Mela status handles fixed-date edge cases', mela.melaStatus({ event_date_start: '2026-10-09', event_date_end: '2026-10-12' }, '2026-10-11') === 'ongoing' && mela.melaStatus({ event_date_start: '2026-10-11' }, '2026-10-11') === 'ongoing' && mela.melaStatus({ event_date_start: '2026-10-01', event_date_end: '2026-10-10' }, '2026-10-11') === 'ended' && mela.melaStatus({ expected_period: 'Nov 2026' }, '2026-10-11') === 'undated')
check('A4: homepage Mela query filters active approved unmerged and hides undated', melaApi.includes(".is('merged_into', null)") && melaApi.includes("melaStatus(m, todayIso) !== 'undated'") && melaApi.includes("melaStatus(m, todayIso) !== 'ended'"))
check('A4: calendar has sort, past toggle and ongoing badge', ['mela-sort', 'mela_show_ended', 'mela-ongoing', 'sortMelasForDisplay'].every((needle) => melaScreen.includes(needle)))

const manifest = JSON.parse(read('public/images/home/manifest.json'))
const requiredImages = ['cat-rotavator.jpg', 'cat-seeds.jpg', 'cat-building-materials.jpg', 'cat-greenhouse.jpg', 'cat-jugaad.jpg', 'cat-tanker.jpg', 'cat-transport.jpg', 'cat-carbon.jpg', 'cat-cold-storage.jpg']
check('A5: each replacement image exists, is optimized and has traceability', requiredImages.every((file) => existsSync(join(root, 'public/images/home', file)) && statSync(join(root, 'public/images/home', file)).size <= 200 * 1024 && manifest.some((item) => item.file === file && item.source_url && item.needs_licence_review === true)))
check('A5: homepage tile mappings use distinct new images', requiredImages.every((file) => home.includes(`'${file}'`)) && existsSync(join(root, 'docs/review/BATCH6A_IMAGES.md')))

check('A6: three equal-height Q&A cards and answer links', home.includes('fetchFeaturedSawaal(3)') && home.includes('lg:grid-cols-3') && home.includes('line-clamp-2') && home.includes('line-clamp-3') && home.includes("t('qa_read_answer')"))
check('A7: footer credit links safely to USD Vision AI', read('src/components/layout/Footer.jsx').includes('https://usdvisionai.com') && read('src/components/layout/Footer.jsx').includes('noopener noreferrer'))
check('A8: future listing charge is absent from product code and strings', !read('src/screens/Post.jsx').includes('agri_vendor_future_charges') && !read('src/components/categories/agri_inputs.jsx').includes('agri_vendor_future_charges') && !Object.hasOwn(strings, 'agri_vendor_future_charges'))

const index = read('index.html')
const headers = read('public/_headers')
const css = read('src/index.css')
const fontFiles = [400, 600, 700, 800].flatMap((weight) => [`noto-sans-devanagari-devanagari-${weight}-normal.woff2`, `noto-sans-devanagari-latin-${weight}-normal.woff2`])
check('A9: Noto font is self-hosted in all used weights', fontFiles.every((file) => existsSync(join(root, 'public/fonts', file))) && css.includes('font-display: swap'))
check('A9: Google font links and CSP entries are removed', !/fonts\.googleapis|fonts\.gstatic/.test(index) && !/fonts\.googleapis|fonts\.gstatic/.test(headers))

const requiredKeys = ['error_page_title', 'home_search_title', 'qa_read_answer', 'mela_sort_soon', 'mela_show_ended', 'mela_ongoing', 'footer_credit_prefix']
check('i18n: all Batch 6A user-visible strings have Hindi and English', requiredKeys.every((key) => strings[key]?.hi?.trim() && strings[key]?.en?.trim()))
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
