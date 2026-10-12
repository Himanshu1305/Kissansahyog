#!/usr/bin/env node
// Batch 7A static verifier — footer, logo, About page + menu, Feedback & Grievance.
//   node scripts/verify-batch7a.mjs
// Reads source files and the built dist/ (run the staging build + prerender +
// sitemaps first). No network, no database, no .env. Prints PASS/FAIL lines, saves
// them to docs/review/batch7a/VERIFY_OUTPUT.txt and exits non-zero on any failure.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
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
const widths = [320, 360, 390, 768, 1280]
const bad = (shots?.header || []).filter((h) => h.overlaps.length || h.overflowRight.length || h.pageScrollsSideways)
check('2: browser check found no overlapping header items at 320/360/390/768/1280',
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
  && org.areaServed === 'IN-MP' && org.founder.name === founder.name.en && org.founder.name === strings.founder_name.en
  && org.parentOrganization.name === 'USD Vision AI LLP' && org.contactPoint.some((c) => c.email === 'grievance@kissansahyog.com') && !strings.footer_grievance_email
  && distAbout.includes('"parentOrganization"'))
const sections = ['what', 'why', 'can_do', 'pilot', 'who', 'contact', 'founder_card']
check('3: About has every required section', sections.every((k) => about[k]?.title?.hi && about[k]?.title?.en) && /सागर/.test(about.pilot.title.hi) && about.who.company === 'USD Vision AI LLP')
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
check('7E: "email us directly" uses hello@', /const GENERAL_EMAIL = 'hello@kissansahyog\.com'/.test(grievance) && /\{t\('fb_direct_email'\)\} <a href=\{`mailto:\$\{GENERAL_EMAIL\}`\}/.test(grievance)
  && /<a[^>]*href="mailto:hello@kissansahyog\.com"[^>]*data-testid="feedback-direct-email"|<a[^>]*data-testid="feedback-direct-email"[^>]*href="mailto:hello@kissansahyog\.com"/.test(distGrievance))
check('7E: grievance@ is only the destination of the form\'s e-mail fallback', !/grievance@/.test(grievance) && !/FEEDBACK_EMAIL/.test(grievance) && !/grievance@/.test(pageCopy) && !/grievance@/.test(distGrievance)
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
