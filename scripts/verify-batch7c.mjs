#!/usr/bin/env node
// Batch 7C static verifier — /how-to-use page with six inline SVG diagrams.
//   node scripts/verify-batch7c.mjs
// Reads source files and the built dist/ (run the staging build + prerender +
// sitemaps first). No network, no database, no .env. Prints PASS/FAIL lines, saves
// them to docs/review/batch7c/VERIFY_OUTPUT.txt and exits non-zero on any failure.
// The live layout checks (no horizontal scroll, header overlap, label fit) are in
// scripts/shots-batch7c.mjs.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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
const stripComments = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
const unescape = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'")
const text = (html) => unescape(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ')
const load = (relative) => import(pathToFileURL(join(ROOT, relative)).href)
const DEV = /[ऀ-ॿ]/
const FREE = /मुफ़्त|मुफ्त|निःशुल्क|नि:शुल्क|\bfree\b/i
const AUTH_WORDS = /ईमेल|ई-मेल|e-?mail|पासवर्ड|password|\bOTP\b|ओटीपी|gmail|google से|sign in with/i

const { strings } = await load('src/lib/i18n/strings.js')
const { howToUse: page, buildHowToUseJsonLd } = await load('src/content/howToUse.js')
const { STATIC_ROUTES } = await load('scripts/lib/prerender-routes.mjs')
const app = read('src/App.jsx')
const screen = read('src/screens/HowToUse.jsx')
const diagramsSrc = read('src/components/howto/Diagrams.jsx')
const nav = read('src/components/NavBar.jsx')
const footer = read('src/components/layout/Footer.jsx')
const home = read('src/screens/Homepage.jsx')
const post = read('src/screens/Post.jsx')
const aboutScreen = read('src/screens/About.jsx')
const dist = read('dist/how-to-use/index.html')
const distHome = read('dist/index.html')
const distAbout = read('dist/about/index.html')
const sitemap = read('dist/sitemap-pages.xml')
const main = (dist.match(/<main[\s\S]*?<\/main>/) || [''])[0]
const mainText = text(main)

// ---- 1. route, prerender, sitemap, search index, SEO ------------------------------
check('1: /how-to-use is a real lazy route', /const HowToUse = lazy\(\(\) => import\('\.\/screens\/HowToUse'\)\)/.test(app) && /<Route path="\/how-to-use" element=\{<HowToUse \/>\} \/>/.test(app))
check('1: no leftover redirect from Batch 7A', !/how-to-use[^\n]*Navigate|Navigate[^\n]*how-to-use/.test(app) && !/kya-kar-sakte-hain/.test(app) && !/how-to-use/.test(read('public/_redirects')))
check('1: in the shared prerender + sitemap route list (no exclusion left)', STATIC_ROUTES.includes('/how-to-use') && !/how-to-use/.test(read('scripts/gen-sitemaps.mjs')))
check('1: prerendered to dist/how-to-use/index.html with its heading', dist.length > 20000 && (main.match(/<h1[\s>]/g) || []).length === 1 && mainText.includes(page.h1.hi))
check('1: in the built sitemap', sitemap.includes('<loc>https://kissansahyog.com/how-to-use</loc>'))
const index = JSON.parse(read('public/search-index.json') || '[]')
const hit = index.filter((r) => r.url === '/how-to-use')
check('1: in the committed search index and in the index builder', hit.length === 1 && hit[0].type === 'hub' && hit[0].title_hi === 'वेबसाइट कैसे इस्तेमाल करें' && hit[0].title_en === 'How to use the website' && /url: '\/how-to-use'/.test(read('scripts/build-search-index.mjs')))
check('1: title is "वेबसाइट कैसे इस्तेमाल करें / How to use the website"', page.h1.hi === 'वेबसाइट कैसे इस्तेमाल करें' && page.h1.en === 'How to use the website' && page.seo.title.hi.startsWith(page.h1.hi) && page.seo.title.en.startsWith(page.h1.en))
const head = (dist.match(/<head[\s\S]*?<\/head>/) || [''])[0] + dist
const titleTag = unescape((dist.match(/<title[^>]*>([^<]*)<\/title>/) || ['', ''])[1])
const metaDesc = unescape((dist.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/) || ['', ''])[1])
check('1: <title> and meta description are set from the page data', titleTag.includes(page.h1.hi) && metaDesc === page.seo.description.hi && metaDesc.length >= 70 && metaDesc.length <= 170, `${titleTag} | ${metaDesc.length}`)
check('1: canonical is https://kissansahyog.com/how-to-use', /<link[^>]*rel="canonical"[^>]*href="https:\/\/kissansahyog\.com\/how-to-use"/.test(head))
check('1: page is indexable (no noindex)', !/<meta[^>]*name="robots"[^>]*noindex/.test(dist))

// ---- 2. FAQ + JSON-LD ----------------------------------------------------------------
const faqs = page.faq.items
check(`2: FAQ has 6 to 8 questions (${faqs.length}), each in Hindi and English`, faqs.length >= 6 && faqs.length <= 8 && faqs.every((f) => f.q.hi && f.q.en && f.a.hi && f.a.en))
const built = buildHowToUseJsonLd(page, 'hi')[0]
check('2: builder returns a valid FAQPage from the same FAQ data', built['@context'] === 'https://schema.org' && built['@type'] === 'FAQPage' && built.mainEntity.length === faqs.length
  && built.mainEntity.every((q, i) => q['@type'] === 'Question' && q.name === faqs[i].q.hi && q.acceptedAnswer['@type'] === 'Answer' && q.acceptedAnswer.text === faqs[i].a.hi))
const en = buildHowToUseJsonLd(page, 'en')[0]
check('2: English JSON-LD uses the English FAQ', en.mainEntity.every((q, i) => q.name === faqs[i].q.en && q.acceptedAnswer.text === faqs[i].a.en))
const ldBlocks = [...dist.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => { try { return JSON.parse(m[1]) } catch { return null } })
check('2: every JSON-LD block on the prerendered page parses', ldBlocks.length > 0 && ldBlocks.every(Boolean), `${ldBlocks.filter((b) => !b).length} broken of ${ldBlocks.length}`)
const faqLd = ldBlocks.flat().filter((b) => b && b['@type'] === 'FAQPage')
check('2: exactly one FAQPage JSON-LD on the prerendered page', faqLd.length === 1, `found ${faqLd.length}`)
const ld = faqLd[0] || { mainEntity: [] }
const dts = [...main.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>/g)].map((m) => text(m[1]).trim())
const dds = [...main.matchAll(/<dd[^>]*>([\s\S]*?)<\/dd>/g)].map((m) => text(m[1]).trim())
const mismatched = ld.mainEntity.filter((q, i) => q.name !== dts[i] || q.acceptedAnswer?.text !== dds[i]).map((q) => q.name)
check('2: FAQ JSON-LD matches the visible FAQ, question by question and answer by answer', ld.mainEntity.length === faqs.length && dts.length === faqs.length && mismatched.length === 0, mismatched.join(' | '))
check('2: FAQ is visible without a click (not collapsed)', !/<details/.test(main))
check('2: "सुझाव और शिकायत" link to /grievance after the FAQ', /<a[^>]*data-testid="howto-grievance"[^>]*href="\/grievance"|<a[^>]*href="\/grievance"[^>]*data-testid="howto-grievance"/.test(main) && mainText.includes(strings.footer_grievance.hi))

// ---- 3. sections and step lists ------------------------------------------------------
const WANT = [
  ['services', 'यहाँ क्या-क्या है'],
  ['access', 'बिना लॉगिन के क्या देख सकते हैं'],
  ['post', 'रजिस्टर करके अपनी लिस्टिंग कैसे डालें'],
  ['find', 'लिस्टिंग कैसे खोजें और संपर्क करें'],
  ['sawaal', 'किसान सवाल कैसे पढ़ें'],
  ['info', 'मंडी भाव, MSP, कोल्ड स्टोरेज, मेला और योजनाएँ'],
  ['phone', 'फ़ोन पर ऐप की तरह कैसे जोड़ें और भाषा कैसे बदलें'],
]
const wrongTitles = WANT.filter(([key, title]) => page[key].title.hi !== title || !page[key].title.en).map(([key]) => key)
check('3: sections a–g carry the headings from the brief, in Hindi and English', wrongTitles.length === 0, wrongTitles.join(','))
const sections = [...main.matchAll(/<section[^>]*data-testid="howto-section"[^>]*>[\s\S]*?<\/section>/g)].map((m) => m[0])
const ids = sections.map((s) => (s.match(/\sid="([^"]+)"/) || [])[1])
check('3: eight sections on the prerendered page, in order a → h', ids.join(',') === [...WANT.map(([key]) => page[key].id), page.faq.id].join(','), ids.join(','))
const h2s = sections.map((s) => text((s.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || ['', ''])[1]).trim())
check('3: each section shows its heading', WANT.every(([, title], i) => h2s[i] === title) && h2s[7] === page.faq.title.hi, h2s.join(' | '))
const noList = sections.slice(0, 7).filter((s) => {
  const lists = [...s.matchAll(/<ol[^>]*data-testid="howto-steps"[^>]*>([\s\S]*?)<\/ol>/g)]
  return lists.length === 0 || lists.some((l) => (l[1].match(/<li[\s>]/g) || []).length < 2)
}).map((s) => (s.match(/\sid="([^"]+)"/) || [])[1])
check('3: sections a–g each have a written step list (an <ol> with at least two items)', noList.length === 0, noList.join(','))
check('3: section f has one compact block each for prices/MSP, cold storage, mela and schemes', page.info.blocks.map((b) => b.to).join(',') === '/msp,/cold-storage,/kisan-mela,/yojana' && (sections[5].match(/data-testid="howto-steps"/g) || []).length === 4
  && page.info.blocks.every((b) => b.where.hi && b.see.hi && b.where.en && b.see.en))
check('3: section a links every service', page.services.items.every((s) => new RegExp(`<a[^>]*href="${s.to}"`).test(sections[0])) && page.services.items.length === 8)
check('3: section d carries the safety note (check details yourself; not part of the deal)', /खुद जाँच लें/.test(page.find.safety.hi) && /शामिल नहीं होते/.test(page.find.safety.hi) && /check the other person/i.test(page.find.safety.en) && /not part of any deal/.test(page.find.safety.en) && mainText.includes(page.find.safety.hi))
check('3: section c covers photos and what happens after posting', page.post.steps.some((s) => /फोटो जोड़ें/.test(s.hi) && /3/.test(s.hi) && /5/.test(s.hi)) && page.post.after.length >= 2 && /जुड़ गई/.test(page.post.after[0].hi))
check('3: section g covers both install and the language switch', page.phone.install_steps.length >= 4 && page.phone.lang_steps.length >= 2 && /"हिं"/.test(page.phone.lang_steps[0].hi) && /"EN"/.test(page.phone.lang_steps[0].hi))

// ---- 4. diagrams -----------------------------------------------------------------------
const svgs = [...main.matchAll(/<figure[^>]*data-testid="howto-diagram-([a-z]+)"[^>]*>\s*(<svg[\s\S]*?<\/svg>)/g)].map((m) => ({ name: m[1], svg: m[2] }))
check('4: six inline SVG diagrams, one each for a, b, c, d, e, g', svgs.map((s) => s.name).join(',') === 'services,access,post,find,sawaal,install', svgs.map((s) => s.name).join(','))
const where = svgs.map((s) => sections.findIndex((sec) => sec.includes(`howto-diagram-${s.name}"`)))
check('4: each diagram sits in its own section (a, b, c, d, e, g)', where.join(',') === '0,1,2,3,4,6', where.join(','))
const badA11y = svgs.filter(({ svg }) => {
  const open = (svg.match(/^<svg[^>]*>/) || [''])[0]
  const title = (svg.match(/<title id="([^"]+)">([^<]+)<\/title>/) || [])
  const desc = (svg.match(/<desc id="([^"]+)">([^<]+)<\/desc>/) || [])
  return !/role="img"/.test(open) || !title[2] || !desc[2] || desc[2].length < 40 || !open.includes(`aria-labelledby="${title[1]} ${desc[1]}"`)
}).map((s) => s.name)
check('4: every SVG has role="img", a <title> and a <desc>, referenced by aria-labelledby', badA11y.length === 0, badA11y.join(','))
check('4: every SVG scales (viewBox, width 100%, no fixed pixel width)', svgs.every(({ svg }) => /^<svg[^>]*viewBox="0 0 320 \d+"/.test(svg) && /^<svg[^>]*width="100%"/.test(svg)))
check('4: labels are real SVG <text>; no external images, no foreignObject, no <img>', svgs.every(({ svg }) => (svg.match(/<text[\s>]/g) || []).length >= 5 && !/<image|<foreignObject|<img|href=|url\(/.test(svg)))
const sizes = svgs.flatMap(({ svg }) => [...svg.matchAll(/<text[^>]*font-size:\s*(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1])))
check(`4: smallest label is ${Math.min(...sizes)} canvas units on a 320-unit canvas (≥ 14px at 288px wide)`, sizes.length > 0 && Math.min(...sizes) * (288 / 320) >= 14)
check('4: diagrams use the brand colour variables, not hard-coded hex (white text aside)', /var\(--ks-green\)/.test(diagramsSrc) && /var\(--ks-ink\)/.test(diagramsSrc) && /var\(--ks-orange-dark\)/.test(diagramsSrc)
  && [...stripComments(diagramsSrc).matchAll(/#[0-9a-fA-F]{3,8}\b/g)].every((m) => m[0].toLowerCase() === '#fff'))
check('4: no dark-mode styling added (the site has none)', !/prefers-color-scheme|dark:/.test(diagramsSrc + screen))
check('4: diagram labels come from the page data (no Devanagari literals in the components)', !DEV.test(stripComments(diagramsSrc)) && !DEV.test(stripComments(screen)))
const titles = ['services', 'access', 'post', 'find', 'sawaal', 'phone'].map((k) => page[k].diagram)
check('4: every diagram title and description exists in Hindi and English', titles.every((d) => d.title.hi && d.title.en && d.desc.hi.length >= 40 && d.desc.en.length >= 40))
const stepCounts = ['post', 'find', 'sawaal', 'phone'].map((k) => page[k].diagram.steps.length)
const numbered = ['post', 'find', 'sawaal', 'install'].map((n) => (svgs.find((s) => s.name === n)?.svg.match(/<circle cx="34"/g) || []).length)
check('4: flow diagrams have one numbered circle per step', numbered.join(',') === stepCounts.join(','), `${numbered} vs ${stepCounts}`)
const labelsMissing = svgs.flatMap(({ name, svg }) => {
  const key = name === 'install' ? 'phone' : name
  const d = page[key].diagram
  const want = name === 'services' ? [d.hub.hi, ...page.services.items.map((s) => s.label.hi)]
    : name === 'access' ? [d.open_title.hi, d.login_title.hi, ...d.open_lines.map((l) => l.hi), ...d.login_lines.map((l) => l.hi)]
      : d.steps.flatMap((s) => s.lines.map((l) => l.hi))
  const got = unescape(svg)
  return want.filter((w) => !got.includes(`>${w}</text>`)).map((w) => `${name}: ${w}`)
})
check('4: every diagram label from the data is in the prerendered SVG', labelsMissing.length === 0, labelsMissing.join(' | '))

// ---- 5. links ------------------------------------------------------------------------------
check('5: label is "कैसे इस्तेमाल करें / How to use"', strings.nav_how_to_use.hi === 'कैसे इस्तेमाल करें' && strings.nav_how_to_use.en === 'How to use')
const deskNav = (nav.match(/<nav data-testid="nav-desktop"[\s\S]*?<\/nav>/) || [''])[0]
check('5: header — a visible top-level item in the desktop row, right before the About menu', /<Link to="\/how-to-use" data-testid="nav-how-to-use"/.test(deskNav) && deskNav.indexOf('nav-how-to-use') < deskNav.indexOf('data-testid="nav-about"') && deskNav.indexOf('nav-how-to-use') > deskNav.indexOf("t('resources_nav')"))
check('5: header — also a visible row in the mobile menu (not hidden inside the About section)', /<Link to="\/how-to-use" data-testid="nav-how-to-use-mobile"/.test(nav) && nav.indexOf('nav-how-to-use-mobile') < nav.indexOf('data-testid="nav-about-mobile"') && !/ABOUT_MENU = \[[^\]]*how-to-use/.test(nav))
// Batch 7H put the nav in the top row: one desktop row that never wraps.
check('5: one-row desktop header (nav sits in the top bar from lg and never wraps; hamburger below lg)', /<nav data-testid="nav-desktop" className="[^"]*\bhidden\b[^"]*\bflex-nowrap\b[^"]*\blg:flex\b[^"]*"/.test(nav) && !/<nav data-testid="nav-desktop" className="[^"]*flex-wrap/.test(nav) && /nav-hamburger"[\s\S]{0,120}lg:hidden/.test(nav))
check('5: footer link', /<Link to="\/how-to-use" className=\{link\}>\{t\('nav_how_to_use'\)\}<\/Link>/.test(footer))
const distFooter = (dist.match(/<footer[\s\S]*?<\/footer>/) || [''])[0]
check('5: prerendered header and footer both carry the link', /<a[^>]*href="\/how-to-use"/.test(distFooter) && /<header[\s\S]*?<a[^>]*data-testid="nav-how-to-use"[^>]*href="\/how-to-use"|<header[\s\S]*?<a[^>]*href="\/how-to-use"[^>]*data-testid="nav-how-to-use"/.test(dist))
// Batch 7D folded the how-to link into the open-to-all strip above the hero.
check('5: homepage — one prominent strip linking to /how-to-use', (home.match(/to="\/how-to-use"/g) || []).length === 1 && /data-testid="home-how-to-use"/.test(home) && /data-testid="home-open-strip"/.test(home))
check('5: prerendered homepage shows the strip', /data-testid="home-how-to-use"/.test(distHome) && text(distHome).includes(strings.home_open_title.hi) && /<a[^>]*href="\/how-to-use"[^>]*data-testid="home-how-to-use"|<a[^>]*data-testid="home-how-to-use"[^>]*href="\/how-to-use"/.test(distHome))
check('5: post screen — small helper link in step 1, to the posting section', /<Link to="\/how-to-use#listing-kaise-dalein" data-testid="post-how-to-use"/.test(post) && page.post.id === 'listing-kaise-dalein' && post.indexOf('post-how-to-use') < post.indexOf('data-testid={`post-cat-${c}`}'))
check('5: About page link still points at /how-to-use', /<Link to="\/how-to-use" data-testid="about-how-to-use"/.test(aboutScreen) && /href="\/how-to-use"/.test(distAbout))

// ---- 6. wording ----------------------------------------------------------------------------
const allCopy = []
const walk = (v) => { if (typeof v === 'string') allCopy.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(walk) }
walk(page)
const newKeys = ['nav_how_to_use', 'post_howto_help']
const copy = [...allCopy, ...newKeys.flatMap((k) => [strings[k]?.hi, strings[k]?.en])].join('\n')
check(`6: no "free / मुफ़्त" in the page data or the new strings (${allCopy.length} strings)`, allCopy.length > 150 && !FREE.test(copy), (copy.match(FREE) || [''])[0])
check('6: no "free / मुफ़्त" in the prerendered page body', !FREE.test(mainText), (mainText.match(FREE) || [''])[0])
check('6: no e-mail, password, OTP or any other sign-in method in the page data', !AUTH_WORDS.test(copy), (copy.match(AUTH_WORDS) || [''])[0])
check('6: no e-mail, password or OTP in the prerendered page body', !AUTH_WORDS.test(mainText), (mainText.match(AUTH_WORDS) || [''])[0])
check('6: registration and login are named only generally', page.register.hi === 'रजिस्टर करें' && page.register.en === 'Register' && page.login.hi === 'लॉगिन करें' && page.login.en === 'Log in')
const unpaired = []
const pairs = (v, path) => {
  if (!v || typeof v !== 'object') return
  if ('hi' in v || 'en' in v) { if (!(String(v.hi || '').trim() && String(v.en || '').trim())) unpaired.push(path); return }
  Object.entries(v).forEach(([k, c]) => pairs(c, `${path}.${k}`))
}
pairs(page, 'page')
check('6: every piece of copy has both Hindi and English', unpaired.length === 0, unpaired.slice(0, 5).join(', '))
const missingStrings = newKeys.filter((k) => !(strings[k]?.hi && strings[k]?.en))
check('6: new i18n strings exist in both languages', missingStrings.length === 0, missingStrings.join(','))
const used = [...new Set([screen, nav, footer, post].flatMap((s) => [...s.matchAll(/\bt\('([a-z0-9_]+)'\)/g)].map((m) => m[1])))]
const undefinedKeys = used.filter((k) => !strings[k])
check('6: every t() key used by the touched components exists', undefinedKeys.length === 0, undefinedKeys.join(','))
// Button names quoted on the page must be the site's real labels.
const QUOTED = [
  ['tab_post', page.post.steps[1]], ['post_listing', page.post.steps[1]], ['post_offer_toggle', page.post.steps[2]], ['post_req_toggle', page.post.steps[2]], ['continue', page.post.steps[2]],
  ['photo_add', page.post.steps[3]], ['photo_make_cover', page.post.steps[3]], ['location_current', page.post.steps[5]], ['submit', page.post.steps[6]],
  ['view_listing', page.post.after[0]], ['post_another', page.post.after[0]], ['my_listings', page.post.after[2]], ['mark_found', page.post.after[2]],
  ['browse', page.find.steps[0]], ['nav_bazaar', page.find.steps[0]], ['filter_all', page.find.steps[2]], ['sort_nearest', page.find.steps[2]], ['sort_newest', page.find.steps[2]],
  ['maps_open', page.find.steps[4]], ['contact_call', page.find.steps[5]], ['contact_whatsapp', page.find.steps[5]], ['report_button', page.find.safety],
  ['sawaal_nav', page.sawaal.steps[0]], ['sawaal_show_answer', page.sawaal.steps[2]], ['summary_heading', page.sawaal.steps[3]], ['sawaal_related_q', page.sawaal.steps[3]], ['sawaal_ask_cta', page.sawaal.steps[4]],
  ['nav_mandi', page.info.blocks[0].where], ['msp_view_compare', page.info.blocks[0].see], ['cs_hub_nav', page.info.blocks[1].where], ['resources_nav', page.info.blocks[2].where], ['nav_mela', page.info.blocks[2].where],
  ['mela_expected_prefix', page.info.blocks[2].see], ['nav_schemes', page.info.blocks[3].where], ['pwa_banner_install', page.phone.install_steps[1]], ['mela_interested', page.access.needs_login[3]],
]
const wrongLabels = QUOTED.filter(([key, where]) => !strings[key] || !where.hi.includes(strings[key].hi) || !where.en.includes(strings[key].en)).map(([key]) => key)
check(`6: ${QUOTED.length} button and menu names quoted on the page match the site's real labels (Hindi and English)`, wrongLabels.length === 0, wrongLabels.join(', '))

say(`\n${pass} passed, ${fail} failed`)
mkdirSync(join(ROOT, 'docs/review/batch7c'), { recursive: true })
writeFileSync(join(ROOT, 'docs/review/batch7c/VERIFY_OUTPUT.txt'), lines.join('\n') + '\n', 'utf8')
process.exit(fail ? 1 : 0)
