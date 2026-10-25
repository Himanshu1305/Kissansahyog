#!/usr/bin/env node
// Batch 7A static verifier — footer, logo, About page + menu, Feedback & Grievance.
// Also asserts Batch 7H (one-row desktop header) and Batch 7I (ownership wording).
//   node scripts/verify-batch7a.mjs
// Reads source files and the built dist/ (run the staging build + prerender +
// sitemaps first). No network, no database, no .env. Prints PASS/FAIL lines, saves
// them to docs/review/batch7a/VERIFY_OUTPUT.txt and exits non-zero on any failure.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lines = []
const say = (s) => { console.log(s); lines.push(s) }
let pass = 0
let fail = 0
const check = (name, ok, detail = '') => {
  say(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? ` — ${detail}` : ''}`)
  if (ok) pass += 1
  else fail += 1
}
const has = (relative) => existsSync(join(ROOT, relative))
const read = (relative) => (has(relative) ? readFileSync(join(ROOT, relative), 'utf8') : '')
const size = (relative) => (has(relative) ? statSync(join(ROOT, relative)).size : 0)
const count = (text, needle) => text.split(needle).length - 1
const stripComments = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, '')
const DEV = /[ऀ-ॿ]/
const load = (relative) => import(pathToFileURL(join(ROOT, relative)).href)

const { strings } = await load('src/lib/i18n/strings.js')
const { about, buildAboutJsonLd } = await load('src/content/about.js')
const { grievancePage } = await load('src/content/pages/grievance.js')
const { founder } = await load('src/content/founder.js')
const footer = read('src/components/layout/Footer.jsx')
const nav = read('src/components/NavBar.jsx')
const app = read('src/App.jsx')
const logo = read('src/components/Logo.jsx')
const aboutScreen = read('src/screens/About.jsx')
const grievance = read('src/screens/Grievance.jsx')
const api = read('src/lib/feedback/feedbackApi.js')
const migration = read('supabase/migrations/0055_feedback.sql')
const distAbout = read('dist/about/index.html')
const distGrievance = read('dist/grievance/index.html')
const distHome = read('dist/index.html')
const footerOf = (html) => (html.match(/<footer[\s\S]*?<\/footer>/) || [''])[0]

// ---- 1. footer -----------------------------------------------------------------
const COMPANY = 'USD Vision AI LLP · Madhya Pradesh, India'
check('1: footer source names "USD Vision AI LLP" once, in the bottom strip',
  count(stripComments(footer), 'USD Vision AI LLP') === 1 && !/footer_company'\)/.test(footer)
  && footer.indexOf('USD Vision AI LLP') > footer.indexOf("t('footer_copyright')") && /USD Vision AI LLP<\/a>\{t\('footer_company_place'\)\}/.test(footer))
check('1: strings give exactly that text in English and Hindi',
  `USD Vision AI LLP${strings.footer_company_place?.en}` === COMPANY && strings.footer_company_place?.hi === ' · मध्यप्रदेश, भारत' && !strings.footer_company)
for (const [name, html] of [['dist/about', distAbout], ['dist/grievance', distGrievance]]) {
  const f = text(footerOf(html))
  check(`1: prerendered ${name} footer shows the company line once`, count(f, 'USD Vision AI LLP') === 1 && count(f, 'USD Vision AI LLP · मध्यप्रदेश, भारत') === 1, `found ${count(f, 'USD Vision AI LLP')}`)
}
check('1: one shared Footer component serves mobile and desktop (mounted once in App)', count(app, '<Footer />') === 1 && count(distAbout, '<footer') === 1)

// ---- 2. logo -------------------------------------------------------------------
const brandFiles = [48, 96, 192, 512].flatMap((w) => [`public/brand/logo-${w}.webp`, `public/brand/logo-${w}.png`])
const missingBrand = brandFiles.filter((f) => size(f) < 500)
check(`2: logo files exist under public/brand (${brandFiles.length} files)`, missingBrand.length === 0, missingBrand.join(', '))
check('2: source logo is kept and the generator reads it', has('design/kissansahyog-logo-source.jpg') && /kissansahyog-logo-source\.jpg/.test(read('scripts/gen-icons.mjs')))
check('2: Logo component serves webp with a png fallback and fixed dimensions',
  /type="image\/webp"/.test(logo) && /logo-96\.png/.test(logo) && /width=\{1280\}/.test(logo) && /height=\{1189\}/.test(logo) && /clamp\(36px/.test(logo) && /48px\)/.test(logo))
const users = ['src/components/NavBar.jsx', 'src/components/layout/Footer.jsx', 'src/screens/Welcome.jsx', 'src/screens/About.jsx'].filter((f) => !/<Logo[\s/>]/.test(read(f)))
check('2: Logo component is used in the header, footer, welcome and about screens', users.length === 0, users.join(', '))
const oldMark = ['src/components/NavBar.jsx', 'src/components/layout/Footer.jsx', 'src/screens/Welcome.jsx'].filter((f) => stripComments(read(f)).includes('🌾'))
check('2: the old emoji brand mark is gone from header, footer and welcome', oldMark.length === 0, oldMark.join(', '))
check('2: header brand can shrink (min-w-0 + truncate) and the right cluster cannot', /data-testid="nav-brand" className="flex min-w-0 shrink/.test(nav) && /block truncate text-\[15px\]/.test(nav) && /ml-auto flex shrink-0/.test(nav))
const icons = ['favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'maskable-512.png']
const missingIcons = icons.filter((f) => size(`public/icons/${f}`) < 1000)
check('2: favicon, apple-touch-icon and PWA icons exist in public/icons', missingIcons.length === 0, missingIcons.join(', '))
const indexHtml = read('index.html')
check('2: index.html links the favicon and apple-touch-icon', /rel="icon"[^>]*icons\/favicon-32\.png/.test(indexHtml) && /rel="apple-touch-icon"[^>]*icons\/apple-touch-icon\.png/.test(indexHtml))
let manifest = null
try { manifest = JSON.parse(read('dist/manifest.webmanifest')) } catch { /* reported below */ }
const mIcons = manifest?.icons || []
const missingManifest = mIcons.filter((i) => !has(`dist/${i.src}`)).map((i) => i.src)
check('2: built manifest lists 192, 512 and a maskable icon, and every file exists in dist',
  mIcons.some((i) => i.sizes === '192x192') && mIcons.some((i) => i.sizes === '512x512' && !i.purpose) && mIcons.some((i) => i.purpose === 'maskable') && missingManifest.length === 0,
  manifest ? missingManifest.join(', ') : 'dist/manifest.webmanifest missing')
check('2: social share image left alone (default OG path unchanged)', /og\/default\.png/.test(read('src/components/layout/Seo.jsx')) && has('public/og/default.png'))
let shots = null
try { shots = JSON.parse(read('docs/review/batch7a/header-check.json')) } catch { /* reported below */ }
const widths = [320, 360, 390, 768, 1024, 1280]
const bad = (shots?.header || []).filter((h) => h.overlaps.length || h.overflowRight.length || h.pageScrollsSideways)
check('2: browser check found no overlapping header items at 320/360/390/768/1024/1280',
  !!shots && widths.every((w) => shots.header.some((h) => h.width === w)) && bad.length === 0 && shots.behaviour.every((b) => b.ok),
  shots ? bad.map((h) => `${h.width}${h.path}`).join(', ') : 'run node scripts/shots-batch7a.mjs')
const missingShots = widths.filter((w) => !has(`docs/review/batch7a/header-${w}-home.png`))
check('2: header screenshots saved in docs/review/batch7a', missingShots.length === 0, missingShots.join(', '))

// ---- 3. about page + menu ------------------------------------------------------
check('3: /about route is registered (lazy) in App.jsx', /const About = lazy\(\(\) => import\('\.\/screens\/About'\)\)/.test(app) && /<Route path="\/about" element=\{<About \/>\} \/>/.test(app))
const { STATIC_ROUTES } = await load('scripts/lib/prerender-routes.mjs')
// Batch 7C built /how-to-use: it is a real, prerendered page now (see verify-batch7c.mjs).
check('3: /about is in the shared prerender + sitemap route list', STATIC_ROUTES.includes('/about'))
check('3: /about is prerendered with its heading', distAbout.includes('<h1') && text(distAbout).includes(about.h1.hi))
const sitemap = read('dist/sitemap-pages.xml')
check('3: /about is in the built sitemap', sitemap.includes('<loc>https://kissansahyog.com/about</loc>'))
const index = JSON.parse(read('public/search-index.json') || '[]')
check('3: search index has /about (builder + committed file)', /url: '\/about'/.test(read('scripts/build-search-index.mjs')) && index.some((it) => it.url === '/about' && it.title_hi.includes('हमारे बारे में')))
check('3: page title, description and canonical', /<title>हमारे बारे में — किसान सहयोग<\/title>/.test(distAbout) && /<link rel="canonical" href="https:\/\/kissansahyog\.com\/about"/.test(distAbout)
  && about.seo.title.en === 'About Us — Kissan Sahyog' && about.seo.title.hi.length <= 60 && about.seo.description.hi.length <= 160 && about.seo.description.en.length <= 160)
const org = buildAboutJsonLd(about, 'en')[0]
check('3: Organization JSON-LD uses the facts used elsewhere on the site',
  org['@type'] === 'Organization' && org.name === 'Kissan Sahyog' && org.url === 'https://kissansahyog.com' && org.email === strings.footer_general_email.en
  && org.areaServed?.name === 'Sagar Division' && org.areaServed?.containedInPlace?.identifier === 'IN-MP' /* Batch 7L-1: was 'IN-MP' */ && org.founder.name === founder.name.en && org.founder.name === strings.founder_name.en
  && org.contactPoint.some((c) => c.email === 'grievance@kissansahyog.com') && !strings.footer_grievance_email)
const sections = ['what', 'why', 'can_do', 'sagar', 'who', 'contact', 'founder_card']
check('3: About has every required section', sections.every((k) => about[k]?.title?.hi && about[k]?.title?.en) && /सागर/.test(about.sagar.title.hi) && about.who.id === 'kaun-chalata-hai')
const wanted = ['/bazaar', '/sawaal', '/msp', '/cold-storage', '/kisan-mela', '/yojana']
const got = about.can_do.items.map((i) => i.to)
check('3: "what you can do" covers listings, Q&A, mandi prices, cold storage, melas, schemes', wanted.every((w) => got.includes(w)) && got.every((to) => app.includes(`path="${to}"`)), got.join(','))
check('3: About links to /how-to-use, /founder, /grievance and the contact e-mail',
  /<Link to="\/how-to-use"/.test(aboutScreen) && /<Link to="\/founder"/.test(aboutScreen) && /<Link to="\/grievance"/.test(aboutScreen) && about.contact.email === 'hello@kissansahyog.com')
check('3: the /how-to-use link target is a real route (built in Batch 7C)', /<Route path="\/how-to-use" element=\{<HowToUse \/>\} \/>/.test(app) && about.can_do.id === 'kya-kar-sakte-hain')
check('3: About.jsx has one <h1> and no Devanagari literals', (stripComments(aboutScreen).match(/<h1[\s>]/g) || []).length === 1 && !DEV.test(stripComments(aboutScreen)))
const pairs = []
const collect = (node, path) => {
  if (Array.isArray(node)) node.forEach((n, i) => collect(n, `${path}[${i}]`))
  else if (node && typeof node === 'object') {
    if ('hi' in node || 'en' in node) pairs.push({ path, ...node })
    else for (const [k, v] of Object.entries(node)) collect(v, `${path}.${k}`)
  }
}
collect(about, 'about')
const unpaired = pairs.filter((p) => !(p.hi?.trim() && p.en?.trim())).map((p) => p.path)
check(`3: every About field has Hindi and English (${pairs.length} fields)`, pairs.length > 30 && unpaired.length === 0, unpaired.join(', '))
check('3: About copy has no numbers or statistics', !/[0-9०-९]/.test(pairs.filter((p) => !p.path.includes('jsonld')).map((p) => p.hi + p.en).join(' ')))
const aboutMenu = (nav.match(/const ABOUT_MENU = \[[\s\S]*?\]/) || [''])[0]
check('3: About dropdown has both links (/about and /founder)', /path: '\/about'/.test(aboutMenu) && /path: '\/founder'/.test(aboutMenu) && strings.nav_about.hi === 'हमारे बारे में' && strings.nav_about.en === 'About' && strings.nav_about_us.en === 'About Us')
check('3: desktop dropdown and mobile expandable section both render ABOUT_MENU as links', count(nav, 'ABOUT_MENU.map') === 2 && /data-testid="nav-about"/.test(nav) && /data-testid="nav-about-mobile"/.test(nav) && /aria-expanded=\{abM\}/.test(nav))
check('3: dropdown closes on outside click, Escape and route change', /pointerdown/.test(nav) && /e\.key !== 'Escape'/.test(nav) && /\}, \[location\.pathname\]\)/.test(nav))
const navHtml = (distAbout.match(/<nav data-testid="nav-desktop"[\s\S]*?<\/nav>/) || [''])[0]
check('3: prerendered header carries both About links', /href="\/about"/.test(navHtml) && /href="\/founder"/.test(navHtml))
// Outside ABOUT_MENU, the only mention allowed is the active-state helper (inAbout).
const topLevel = stripComments(nav).replace(aboutMenu, '').replace(/const inAbout = [^\n]*/, '')
check('3: no separate top-level Founder link in the header; footer keeps it', !/'\/founder'|"\/founder"/.test(topLevel) && /<Link to="\/founder"/.test(footer) && /<Route path="\/founder" element=\{<Founder \/>\} \/>/.test(app))

// ---- 7H. one-row desktop header -------------------------------------------------
const barSrc = (nav.match(/<div className="flex w-full items-center gap-2 px-3 py-1\.5">[\s\S]*?\{\/\* Mobile collapsible menu/) || [''])[0]
const deskNavSrc = (nav.match(/<nav data-testid="nav-desktop"[\s\S]*?<\/nav>/) || [''])[0]
check('7H: the desktop nav sits inside the top bar, between the brand and the right cluster (no second row)',
  barSrc.indexOf('data-testid="nav-brand"') > 0 && barSrc.indexOf('data-testid="nav-brand"') < barSrc.indexOf('data-testid="nav-desktop"') && barSrc.indexOf('data-testid="nav-desktop"') < barSrc.indexOf('ml-auto flex shrink-0')
  && /<nav data-testid="nav-desktop" className="[^"]*\bhidden\b[^"]*\bflex-nowrap\b[^"]*\blg:flex\b[^"]*"/.test(nav) && !/<nav data-testid="nav-desktop" className="[^"]*(flex-wrap|border-t)/.test(nav))
check('7H: header is still sticky and the mobile hamburger is still below lg only', /<header className="sticky top-0 z-30/.test(nav) && /nav-hamburger"[\s\S]{0,120}lg:hidden/.test(nav) && /<nav className="border-t border-stone-100 px-4 py-3 lg:hidden">/.test(nav))
const order = ["t('nav_bazaar')", "goPath('/msp')", "goPath('/mausam')", "t('nav_schemes')", "goPath('/agro-forestry')", "goPath('/sawaal')", "goPath('/videos')", "t('resources_nav')", 'data-testid="nav-how-to-use"', 'data-testid="nav-about"', 'data-testid="nav-more"']
const pos = order.map((n) => deskNavSrc.indexOf(n))
check('7H: the ten nav items keep their order, with और / More last', pos.every((p, i) => p > 0 && (i === 0 || p > pos[i - 1])), pos.join(','))
const moreMenu = (nav.match(/const MORE_MENU = \[[\s\S]*?\n\]/) || [''])[0]
check('7H: More holds Agro-forestry, Video, How to use and About us; those four leave the row below 1280px',
  ['/agro-forestry', '/videos', '/how-to-use'].every((p) => moreMenu.includes(`path: '${p}'`)) && /\.\.\.ABOUT_MENU/.test(moreMenu)
  && /navBtn\(location\.pathname\.startsWith\('\/agro-forestry'\), true\)/.test(deskNavSrc) && /navBtn\(location\.pathname\.startsWith\('\/videos'\), true\)/.test(deskNavSrc) && /navBtn\(location\.pathname === '\/how-to-use', true\)/.test(deskNavSrc)
  && /className="relative hidden xl:block" ref=\{abRef\} data-testid="nav-about"/.test(deskNavSrc) && /className="relative xl:hidden" ref=\{moreRef\} data-testid="nav-more"/.test(deskNavSrc) && /'hidden xl:inline-flex'/.test(nav)
  && strings.nav_more?.hi === 'और' && strings.nav_more?.en === 'More')
check('7H: More menu is keyboard-friendly (aria-expanded, aria-controls, real links) and closes on outside click, Esc and route change',
  /aria-expanded=\{more\} aria-controls="nav-more-menu"/.test(deskNavSrc) && /<div id="nav-more-menu" hidden=\{!more\}/.test(deskNavSrc) && count(deskNavSrc, 'MORE_MENU.map') === 1
  && /more && moreRef\.current && !moreRef\.current\.contains\(e\.target\)/.test(nav) && /e\.key !== 'Escape' \|\| \(!ab && !more\)/.test(nav) && /setAb\(false\); setMore\(false\); setAbM\(false\); setOpen\(false\)/.test(nav))
const searchBar = read('src/components/SearchBar.jsx')
check('7H: desktop search is a compact button that expands into the field; mic, tablet and mobile search kept',
  /data-testid="nav-search" className="relative hidden items-center gap-1 lg:flex"/.test(searchBar) && /<div id="nav-search-field" hidden=\{!wide\}/.test(searchBar) && /aria-expanded=\{wide\}/.test(searchBar) && /aria-controls="nav-search-field"/.test(searchBar)
  && count(searchBar, '<VoiceSearchButton') === 4 && /hidden md:flex lg:hidden/.test(searchBar) && /fixed inset-0 z-50 flex flex-col bg-white md:hidden/.test(searchBar) && count(searchBar, 'navigate(`/search?q=') === 1 && /e\.key !== 'Escape'/.test(searchBar))
let h7 = null
try { h7 = JSON.parse(read('docs/review/batch7h/header-check.json')) } catch { /* reported below */ }
const deskWidths = [1920, 1440, 1280, 1279, 1100, 1024]
const desk = (h7?.header || []).filter((h) => h.width >= 1024)
const notOneRow = desk.filter((h) => h.rows !== 1 || h.visibleHeaderChildren !== 1 || h.bandBelowBar > 1.5 || h.overlaps.length || h.wrapped.length || h.outside.length || h.sideways || h.navOverflow > 0)
check('7H: browser check — exactly one header row, nothing wraps or overlaps, at 1920/1440/1280/1279/1100/1024 in Hindi and English',
  !!h7 && deskWidths.every((w) => ['hi', 'en'].every((l) => ['/', '/about'].every((p) => desk.some((h) => h.width === w && h.lang === l && h.path === p)))) && notOneRow.length === 0 && h7.behaviour.length > 100 && h7.behaviour.every((b) => b.ok),
  h7 ? [...notOneRow.map((h) => `${h.width}${h.path} ${h.lang}`), ...h7.behaviour.filter((b) => !b.ok).map((b) => b.name)].join(', ') : 'run node scripts/shots-batch7h.mjs')
const mob = (h7?.header || []).filter((h) => h.width < 1024)
check('7H: browser check — below 1024px the mobile header is unchanged (hamburger, no desktop nav)', mob.length >= 8 && mob.every((h) => !h.navShown && h.items.some((it) => it.label === 'hamburger') && !h.overlaps.length && !h.outside.length))
const shots7h = [1920, 1440, 1280, 1100, 390].flatMap((w) => ['hi', 'en'].flatMap((l) => ['home', 'about'].map((t) => `docs/review/batch7h/header-${w}-${t}-${l}.png`)))
const missing7h = shots7h.filter((f) => size(f) < 500)
check(`7H: screenshots saved in docs/review/batch7h (${shots7h.length} files: 1920, 1440, 1280, 1100, 390 × Hindi, English)`, missing7h.length === 0, missing7h.join(', '))
const distNav = (distAbout.match(/<nav data-testid="nav-desktop"[\s\S]*?<\/nav>/) || [''])[0]
const distHeader = (distAbout.match(/<header class="sticky[\s\S]*?<\/header>/) || [''])[0]
check('7H: prerendered header is one bar with the nav inside it', count(distHeader, '<nav') === 1 && /^<header class="sticky[^"]*"><div class="flex w-full items-center gap-2 px-3 py-1\.5">/.test(distHeader) && /<\/div><\/header>$/.test(distHeader) && /flex-nowrap/.test(distNav) && !/flex-wrap|border-t/.test((distNav.match(/^<nav[^>]*>/) || [''])[0]))

// ---- 7I. ownership wording ------------------------------------------------------
const OWNER_EN = 'Kissan Sahyog is owned and run by Shri Abhinandan Dixit, Madhya Pradesh, India.'
const OWNER_HI = 'किसान सहयोग के स्वामी और संचालक श्री अभिनन्दन दीक्षित हैं, मध्य प्रदेश, भारत।'
const COMPANY_RE = /USD\s*Vision|usdvision|parentOrganization/i
check('7I: About "who" section states the owner in both languages, with the anchor id unchanged',
  about.who.text?.en === OWNER_EN && about.who.text?.hi === OWNER_HI && about.who.id === 'kaun-chalata-hai' && about.who.title.hi === 'स्वामित्व और संचालन' && about.who.title.en === 'Ownership and operation')
check('7I: About content and screen never name USD Vision AI LLP (no text, link or constant)',
  !COMPANY_RE.test(read('src/content/about.js')) && !COMPANY_RE.test(aboutScreen) && !about.who.company && !about.who.company_url && !about.jsonld.parent && /<Para>\{p\(about\.who\.text\)\}<\/Para>/.test(aboutScreen))
check('7I: About JSON-LD has no parentOrganization and keeps the founder', !('parentOrganization' in org) && !COMPANY_RE.test(JSON.stringify(buildAboutJsonLd(about, 'hi')) + JSON.stringify(org)) && org.founder.name === 'Shri Abhinandan Dixit' && buildAboutJsonLd(about, 'hi')[0].founder.name === 'श्री अभिनन्दन दीक्षित')
const distAboutBody = distAbout.replace(/<footer[\s\S]*?<\/footer>/, '')
check('7I: prerendered /about shows the owner sentence and names the company only in the footer credit',
  text(distAbout).includes(OWNER_HI) && !COMPANY_RE.test(distAboutBody) && count(distAbout, 'USD Vision AI LLP') === 1 && /id="kaun-chalata-hai"/.test(distAbout))
check('7I: footer keeps the designer / maintainer credit (not "run by" / "a product of")',
  strings.footer_credit_prefix.en === 'Designed, developed and maintained by' && strings.footer_credit_prefix.hi === 'डिज़ाइन, विकास और रखरखाव:' && /\{t\('footer_credit_prefix'\)\} <a href="https:\/\/usdvisionai\.com"/.test(footer))
// The company may be named only in the footer credit (Batch 7J removed it from the Terms
// too). Everything else on the public site must not name it.
const walk = (dir) => readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]))
const ALLOWED = ['src/components/layout/Footer.jsx']
const namers = [...walk('src'), ...walk('functions'), 'index.html', 'public/llms.txt', 'public/robots.txt', 'scripts/build-search-index.mjs', 'scripts/prerender.mjs']
  .filter((f) => /\.(jsx?|mjs|html|txt|json|css)$/.test(f) && !ALLOWED.includes(f) && /USD\s+Vision\s+AI/i.test(read(f)))
check('7I: no other public source file names USD Vision AI (only the footer credit does)', namers.length === 0, namers.join(', '))
const distNamers = ['dist/index.html', 'dist/founder/index.html', 'dist/grievance/index.html', 'dist/how-to-use/index.html', 'dist/privacy/index.html', 'dist/terms/index.html', 'dist/llms.txt']
  .filter((f) => !has(f) || COMPANY_RE.test(read(f).replace(/<footer[\s\S]*?<\/footer>/, '')))
check('7I: built home, founder, grievance, how-to-use, privacy, terms and llms.txt name the company nowhere outside the footer', distNamers.length === 0, distNamers.join(', '))

// ---- 4. feedback & grievance ---------------------------------------------------
check('4: footer label is "सुझाव और शिकायत / Feedback & Grievance" and the URL is unchanged',
  strings.footer_grievance.hi === 'सुझाव और शिकायत' && strings.footer_grievance.en === 'Feedback & Grievance' && /<Link to="\/grievance" className=\{link\}>\{t\('footer_grievance'\)\}<\/Link>/.test(footer)
  && text(footerOf(distHome)).includes('सुझाव और शिकायत') && !text(footerOf(distAbout)).includes('शिकायत अधिकारी'))
check('4: heading and intro match the brief', grievancePage.h1.hi === 'सुझाव और शिकायत' && grievancePage.h1.en === 'Feedback & Grievance'
  && grievancePage.intro.hi === 'आपकी बात हमारे लिए महत्वपूर्ण है। सुझाव दें या समस्या बताएँ, हम सुधार करेंगे।' && text(distGrievance).includes(grievancePage.intro.hi))
const formHtml = (distGrievance.match(/<form[^>]*data-testid="feedback-form"[\s\S]*?<\/form>/) || [''])[0]
const fields = [...formHtml.matchAll(/<(input|textarea|select)\b[^>]*>/g)].map((m) => `${(m[0].match(/type="([^"]+)"/) || [])[1] || m[1]}:${(m[0].match(/name="([^"]+)"/) || [])[1]}`)
// Batch 7B: the e-mail-only box became one "email or mobile number" box, plus an
// opt-in public-display checkbox (shown for suggestion / other).
const contactTag = (formHtml.match(/<input[^>]*name="contact"[^>]*>/) || [''])[0]
check('4: grievance page has a required contact input (e-mail or mobile)', /type="text"/.test(contactTag) && /\brequired\b/.test(contactTag), fields.join(' '))
const real = fields.filter((f) => f !== 'text:ks_leave_empty')
check('4: no name field and no phone field', real.length === 6 && real.filter((f) => f === 'radio:kind').length === 3 && real.includes('text:contact') && real.includes('checkbox:public_ok') && real.includes('textarea:message')
  && !/type="tel"|name="[^"]*(name|phone)[^"]*"/i.test(formHtml), fields.join(' '))
check('4: type is suggestion / problem / other', /FEEDBACK_KINDS = \['suggestion', 'problem', 'other'\]/.test(api) && ['suggestion', 'problem', 'other'].every((k) => strings[`fb_type_${k}`]?.hi && strings[`fb_type_${k}`]?.en))
check('4: nothing in the request or the table asks for a name or phone',
  !/p_name|p_phone|full_name/.test(api) && !/\bname\b|phone/i.test(migration.replace(/--[^\n]*/g, '')) && /contact_email\s+text,/.test(migration) && /contact_mobile\s+text/.test(migration) && /message\s+text not null/.test(migration))
check('4: migration file written (not applied here) and client works without it', has('supabase/migrations/0055_feedback.sql') && /err\.canEmail = true/.test(api) && /feedbackMailto/.test(grievance) && /data-testid="feedback-mailto"/.test(grievance))
check('4: validation and spam protection (client check, honeypot, server rate limit)', /validateFeedback/.test(grievance) && /ks_leave_empty/.test(grievance) && /feedback_too_many/.test(migration) && /feedback_email_invalid/.test(migration))
check('4: warm confirmation says we contact them on the e-mail or mobile given', /धन्यवाद/.test(strings.fb_done_title.hi) && /ईमेल या मोबाइल नंबर पर/.test(strings.fb_done_body.hi) && /email or mobile number/.test(strings.fb_done_body.en) && /data-testid="feedback-done"/.test(grievance))
const legal = (distGrievance.match(/<details[\s\S]*?<\/details>/) || [''])[0]
check('4: the extra information is collapsed (a closed <details>) and titled correctly', /^<details(?![^>]*\bopen\b)/.test(legal) && text(legal).includes('और जानकारी') && strings.fb_legal_summary.en === 'More information')
// Batch 7E: the page was simplified on purpose — form + plain e-mail + a short "how
// complaints work" section. The checks below assert the new state.
const keptNeedles = ['शिकायत कैसे करें', 'शिकायत सही पाए जाने पर', 'इस फ़ॉर्म की जानकारी का क्या होता है']
const lost = keptNeedles.filter((n) => !text(legal).includes(n))
check('4: the kept sections are on the page, inside the collapsed section', lost.length === 0 && grievancePage.blocks.length === 7, lost.join(', '))
const pageCopy = JSON.stringify(grievancePage)
const pageText = text(distGrievance)
const OFFICER = /grievance officer|शिकायत अधिकारी|अभिनन्दन|Abhinandan/i
check('7E: no Grievance Officer section (copy, prerendered page, About JSON-LD)', !OFFICER.test(pageCopy) && !OFFICER.test(text(legal)) && !/grievance officer|शिकायत अधिकारी/i.test(pageText)
  && !org.contactPoint.some((c) => /officer/i.test(c.contactType)) && !/grievance officer/i.test(distAbout))
const APPEAL = /appeal|escalat|अपील|एस्केलेशन|gac\.gov\.in|Appellate/i
check('7E: no "Further appeal (escalation)" section', !APPEAL.test(pageCopy) && !APPEAL.test(pageText))
const TIME_PROMISE = /[0-9०-९]+\s*(घंटे|घंटा|दिन|hours?|days?)|acknowledg|पावती|G\.S\.R/i
check('7E: no promised time to acknowledge or resolve, and no citation left behind', !TIME_PROMISE.test(pageCopy) && !TIME_PROMISE.test(pageText) && !/cites/.test(pageCopy) && !/src-S-JUG/.test(distGrievance), (pageCopy.match(TIME_PROMISE) || pageText.match(TIME_PROMISE) || [''])[0])
check('7E/7J: the general e-mail line uses hello@', /const GENERAL_EMAIL = 'hello@kissansahyog\.com'/.test(grievance) && /\{t\('fb_email_general'\)\} <a href=\{`mailto:\$\{GENERAL_EMAIL\}`\}/.test(grievance)
  && /<a[^>]*href="mailto:hello@kissansahyog\.com"[^>]*data-testid="feedback-direct-email"|<a[^>]*data-testid="feedback-direct-email"[^>]*href="mailto:hello@kissansahyog\.com"/.test(distGrievance))
// Batch 7J: the page now also shows grievance@ on its own line, as the complaints address.
const mailtoLink = (html, addr, id) => html.includes(`href="mailto:${addr}" data-testid="${id}"`) || html.includes(`data-testid="${id}" href="mailto:${addr}"`)
check('7J: /grievance shows both e-mail addresses as mailto links, each with its own label (Hindi + English)',
  /const GRIEVANCE_EMAIL = 'grievance@kissansahyog\.com'/.test(grievance) && /\{t\('fb_email_grievance'\)\} <a href=\{`mailto:\$\{GRIEVANCE_EMAIL\}`\}/.test(grievance) && /<br \/>/.test(grievance)
  && strings.fb_email_general.en === 'General questions:' && strings.fb_email_general.hi === 'सामान्य प्रश्न:' && strings.fb_email_grievance.en === 'Complaints and grievances:' && strings.fb_email_grievance.hi === 'शिकायतें:' && !strings.fb_direct_email
  && mailtoLink(distGrievance, 'hello@kissansahyog.com', 'feedback-direct-email') && mailtoLink(distGrievance, 'grievance@kissansahyog.com', 'feedback-grievance-email')
  && text(distGrievance).includes('सामान्य प्रश्न:') && text(distGrievance).includes('शिकायतें:'))
check('7E: the form\'s e-mail fallback still goes to grievance@, and the page copy data does not repeat the address', !/FEEDBACK_EMAIL/.test(grievance) && !/grievance@/.test(pageCopy)
  && /export const FEEDBACK_EMAIL = 'grievance@kissansahyog\.com'/.test(api) && count(api, 'FEEDBACK_EMAIL') === 2 && /return `mailto:\$\{FEEDBACK_EMAIL\}\?subject=/.test(api))
check('7E: FAQ still has more than one item', grievancePage.blocks.find((b) => b.type === 'faq').faqs.length >= 2)
check('4: FAQPage JSON-LD is still emitted', distGrievance.includes('"FAQPage"'))
check('4: Grievance.jsx has one <h1> and no Devanagari literals', (stripComments(grievance).match(/<h1[\s>]/g) || []).length === 1 && !DEV.test(stripComments(grievance)))

// ---- 5. wording ----------------------------------------------------------------
const FREE = /मुफ़्त|मुफ्त|निःशुल्क|नि:शुल्क|\bfree\b/i
const newKeys = Object.keys(strings).filter((k) => /^fb_|^nav_about|^footer_company_place$|^footer_grievance$/.test(k))
const newCopy = [
  ...newKeys.flatMap((k) => [strings[k].hi, strings[k].en]),
  ...pairs.flatMap((p) => [p.hi, p.en]),
  grievancePage.title.hi, grievancePage.title.en, grievancePage.h1.hi, grievancePage.h1.en,
  grievancePage.intro.hi, grievancePage.intro.en, grievancePage.description.hi, grievancePage.description.en,
  stripComments(aboutScreen), stripComments(grievance), stripComments(logo),
].join('\n')
check(`5: no "मुफ़्त" / "free" in the content added by this batch (${newKeys.length} strings + About + grievance intro)`, newKeys.length >= 24 && !FREE.test(newCopy), (newCopy.match(FREE) || [''])[0])
const unpairedKeys = newKeys.filter((k) => !(strings[k].hi?.trim() && strings[k].en?.trim()))
check('5: every new string has Hindi and English', unpairedKeys.length === 0, unpairedKeys.join(', '))
const used = [...new Set([nav, footer, aboutScreen, grievance, logo].flatMap((s) => [...s.matchAll(/\bt\('([a-z0-9_]+)'\)/g)].map((m) => m[1])))]
const missingKeys = used.filter((k) => !strings[k])
check('5: every t() key used by the touched components exists', missingKeys.length === 0, missingKeys.join(', '))

say(`\n${pass} passed, ${fail} failed`)
mkdirSync(join(ROOT, 'docs/review/batch7a'), { recursive: true })
writeFileSync(join(ROOT, 'docs/review/batch7a/VERIFY_OUTPUT.txt'), lines.join('\n') + '\n', 'utf8')
process.exit(fail ? 1 : 0)
