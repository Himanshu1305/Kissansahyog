#!/usr/bin/env node
// Batch 7D static verifier — "free" wording, the one Free Registration promotion,
// the open-to-all strip, favicon, and the content fixes (terms, consent, mela place,
// bento/home tiles, Soil Health Card English).
//   node scripts/verify-batch7d.mjs
// Reads source files and the built dist/ (run the staging build + prerender first).
// No network, no database, no .env. Prints PASS/FAIL lines, saves them to
// docs/review/batch7d/VERIFY_OUTPUT.txt and exits non-zero on any failure.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import sharp from 'sharp'

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
const has = (rel) => existsSync(join(ROOT, rel))
const read = (rel) => (has(rel) ? readFileSync(join(ROOT, rel), 'utf8') : '')
const stripComments = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
const unescape = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'")
const text = (html) => unescape(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ')
const load = (rel) => import(pathToFileURL(join(ROOT, rel)).href)
const count = (s, needle) => s.split(needle).length - 1
const walk = (dir, exts, out = []) => {
  if (!has(dir)) return out
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, exts, out)
    else if (exts.some((e) => name.endsWith(e))) out.push(rel)
  }
  return out
}

const { strings } = await load('src/lib/i18n/strings.js')
const { termsOfUse, termsNote } = await load('src/lib/i18n/legal.js')
const { disclaimers } = await load('src/lib/i18n/disclaimers.js')
const { melaPlace } = await load('src/lib/mela/melaFormat.js')
const pipeline = await load('scripts/mela/pipeline.mjs')
const home = read('src/screens/Homepage.jsx')
const signup = read('src/screens/Signup.jsx')
const post = read('src/screens/Post.jsx')
const app = read('src/App.jsx')
const distHome = read('dist/index.html')

// ---- 1. "free" wording --------------------------------------------------------------
const FREE = /\bfree\b|मुफ़्त|मुफ्त|निःशुल्क|नि:शुल्क|निशुल्क|no charge|without charge|\b0 rupees|बिना पैसे/i
const PROMO = /निःशुल्क रजिस्ट्रेशन|Free Registration/
// The kept list: a hit is fine only when one of these says why (same reasons as FREE_WORDING.md).
const KEPT = [
  ['the one promotion string', (f, l) => f === 'src/lib/i18n/strings.js' && /^\s*free_registration: \{ hi: 'निःशुल्क रजिस्ट्रेशन', en: 'Free Registration' \},$/.test(l)],
  ['code comment', (f, l) => /^\s*(\/\/|\*|\/\*|\{\/\*|--|#|>)/.test(l) && !f.endsWith('.txt') || /(^|[^:])\/\/.*\bfree\b/i.test(l) && !FREE.test(l.replace(/(^|[^:])\/\/.*$/, '$1'))],
  ['variable name in functions/geocode.js', (f) => f === 'functions/geocode.js'],
  ['toll-free helpline', (f, l) => /toll-?free|टोल/i.test(l) && !/toll_free_badge: \{ hi: 'निःशुल्क'/.test(l)],
  ['collateral-free loan', (f, l) => /collateral-free/i.test(l)],
  ['farming term', (f, l) => /disease-free|weed-free/i.test(l)],
  ['government scheme, from the cited source', (f) => f.startsWith('src/content/qa/')],
  ['source name or title', (f) => f === 'src/content/sources.js'],
  ['photo licence text', (f) => f === 'public/images/home/manifest.json'],
  ['machine/vehicle not busy', (f, l) => f === 'src/content/pages/bazaar.js' && /when it is free|free times/.test(l)],
  ['seed text: government scheme / SQL comment / DB row with SQL in DB_FIXES.sql', (f) => f.startsWith('supabase/migrations/')],
  ['generated copy of a scheme answer', (f) => f === 'public/search-index.json'],
  ['share-image text, flagged for a decision (image left alone)', (f) => f === 'scripts/gen-og.mjs'],
]
const scanFiles = [
  ...walk('src', ['.js', '.jsx', '.css']), ...walk('functions', ['.js']), ...walk('supabase/migrations', ['.sql']),
  'index.html', 'vite.config.js', 'public/llms.txt', 'public/robots.txt', 'public/search-index.json', 'public/images/home/manifest.json', 'scripts/gen-og.mjs', 'scripts/build-search-index.mjs',
].filter(has)
const unexplained = []
let kept = 0
for (const f of scanFiles) {
  read(f).split(/\r?\n/).forEach((line, i) => {
    // Identifiers of the promotion (testids, the string key) are not wording.
    if (!FREE.test(line.replace(/[a-z]+-free-registration|free_registration(?=['"])/g, ' '))) return
    if (KEPT.some(([, rule]) => rule(f, line))) { kept += 1; return }
    unexplained.push(`${f}:${i + 1} ${line.trim().slice(0, 90)}`)
  })
}
check(`1: no unconditional "free" claim left outside the kept list (${scanFiles.length} files, ${kept} kept hits)`, unexplained.length === 0, unexplained.slice(0, 6).join(' | '))
const claimKeys = ['wa_join_title', 'pwa_banner_text', 'hero_listings_sub', 'hero_subline2', 'stat_free_label', 'stat_free_value', 'bazaar_hub_intro', 'mausam_signup_h', 'msp_signup_h', 'cs_post_cta', 'toll_free_badge']
const stillClaim = claimKeys.filter((k) => FREE.test(`${strings[k].hi} ${strings[k].en}`.replace(/toll-free/i, '')))
check(`1: the ${claimKeys.length} strings that made the claim are reworded (install banner, WhatsApp banner, bazaar intro, sign-up prompts, cold-storage CTA…)`, stillClaim.length === 0, stillClaim.join(','))
const { ROUTE_SEO } = await load('src/content/seo.js').catch(() => ({}))
const seoSrc = read('src/content/seo.js')
check('1: homepage / search meta description no longer says "free"', !FREE.test(seoSrc) && (!ROUTE_SEO || !FREE.test(JSON.stringify(ROUTE_SEO))))
check('1: terms, grievance FAQ and llms.txt no longer say "free"', !FREE.test(read('src/lib/i18n/termsContent.js')) && !FREE.test(read('src/content/pages/grievance.js')) && !FREE.test(read('public/llms.txt')))
// Prerendered pages: the only allowed wording is the promotion on the homepage, scheme
// answers, toll-free numbers, and the one database FAQ row waiting for DB_FIXES.sql.
const DB_PENDING = /पायलट के दौरान यह मुफ़्त है।|It is free during the pilot\./g
const pagesToScan = ['index.html', 'bazaar/index.html', 'grievance/index.html', 'terms/index.html', 'privacy/index.html', 'about/index.html', 'how-to-use/index.html', 'founder/index.html', 'msp/index.html', 'mausam/index.html', 'cold-storage/index.html', 'kisan-mela/index.html', 'contact/index.html', 'greenhouse/index.html', 'jugaad/index.html']
const pageHits = []
let dbPending = 0
for (const p of pagesToScan) {
  const html = read(`dist/${p}`)
  if (!html) { pageHits.push(`${p}: not built`); continue }
  let t = text(html)
  dbPending += (t.match(DB_PENDING) || []).length
  t = t.replace(DB_PENDING, ' ').replace(new RegExp(PROMO.source, 'g'), ' ').replace(/toll-?free/gi, ' ')
  const m = t.match(new RegExp(`.{0,40}(${FREE.source}).{0,40}`, 'i'))
  if (m && !(p.startsWith('index.html') === false && /Soil Health|सॉयल हेल्थ|मिट्टी/.test(m[0]))) pageHits.push(`${p}: ${m[0].trim()}`)
}
check(`1: ${pagesToScan.length} prerendered pages carry no "free" claim${dbPending ? ` (${dbPending} database FAQ sentence(s) still there until DB_FIXES.sql is run)` : ''}`, pageHits.length === 0, pageHits.slice(0, 4).join(' | '))
const freeDoc = read('docs/review/batch7d/FREE_WORDING.md')
check('1: FREE_WORDING.md lists file, line and old text, with CHANGED and KEPT (with reasons) sections', /## CHANGED \(\d+\)/.test(freeDoc) && /## KEPT \(\d+\)/.test(freeDoc) && /\| File \| Line \| Old text \| Reason \|/.test(freeDoc) && /strings\.js` \| 635 \|/.test(freeDoc) && /pwa_banner|nner_text/.test(freeDoc))

// ---- 2. the one promotion ---------------------------------------------------------------
check('2: string is exactly "निःशुल्क रजिस्ट्रेशन / Free Registration"', strings.free_registration?.hi === 'निःशुल्क रजिस्ट्रेशन' && strings.free_registration?.en === 'Free Registration')
const promoStrings = Object.entries(strings).filter(([, v]) => PROMO.test(`${v.hi} ${v.en}`)).map(([k]) => k)
check('2: no other string carries the phrase', promoStrings.join(',') === 'free_registration', promoStrings.join(','))
const users = walk('src', ['.js', '.jsx']).filter((f) => /free_registration/.test(read(f)) && f !== 'src/lib/i18n/strings.js')
const uses = Object.fromEntries(users.map((f) => [f, count(read(f), "t('free_registration')")]))
check('2: used only in the three allowed places — hero badge, next to the post button (both on the homepage), sign-up heading area', users.sort().join(',') === 'src/screens/Homepage.jsx,src/screens/Signup.jsx' && uses['src/screens/Homepage.jsx'] === 2 && uses['src/screens/Signup.jsx'] === 1, JSON.stringify(uses))
check('2: the three placements are the tagged ones', /data-testid="hero-free-registration"[\s\S]{0,260}t\('free_registration'\)/.test(home) && /data-testid="post-free-registration"[^>]*>✓ \{t\('free_registration'\)\}/.test(home) && /data-testid="signup-free-registration"[^>]*>✓ \{t\('free_registration'\)\}/.test(signup))
const heroIdx = home.indexOf('function HeroInner')
check('2: both homepage placements are inside the hero, the second right after the post-listing button', home.indexOf('hero-free-registration') > heroIdx && home.indexOf('post-free-registration') > home.indexOf("{t('cta_have')}</Button>") && home.indexOf('post-free-registration') - home.indexOf("{t('cta_have')}</Button>") < 260)
const NOW = /अभी|\bnow\b|launch|लॉन्च|limited|सीमित समय|today only|आज ही|offer|ऑफ़र/i
const around = [home, signup].flatMap((s) => [...s.matchAll(/.*free_registration.*/g)].map((m) => m[0]))
check('2: never paired with "now / अभी / during launch"', !NOW.test(`${strings.free_registration.hi} ${strings.free_registration.en}`) && around.every((l) => !NOW.test(stripComments(l))), around.find((l) => NOW.test(stripComments(l))) || '')
check('2: sign-up change is one line of text — no form field, handler or auth call touched', count(signup, 'free_registration') === 1 && /<p data-testid="signup-free-registration"/.test(signup) && !/free_registration[\s\S]{0,80}(onClick|onChange|onSubmit)/.test(signup))
const allHtml = walk('dist', ['index.html'])
const promoPages = allHtml.filter((f) => PROMO.test(text(read(f)))).map((f) => relative(join(ROOT, 'dist'), join(ROOT, f)).replaceAll('\\', '/'))
check(`2: across all ${allHtml.length} prerendered pages the phrase appears only on the homepage`, promoPages.join(',') === 'index.html', promoPages.slice(0, 5).join(','))
check('2: prerendered homepage shows it in the hero badge and by the post button (hero is rendered for desktop and mobile)', count(distHome, 'data-testid="hero-free-registration"') === 2 && count(distHome, 'data-testid="post-free-registration"') === 2 && count(text(distHome), 'निःशुल्क रजिस्ट्रेशन') === 4)

// ---- 3. open-to-all strip ------------------------------------------------------------------
check('3: strip title is "बिना लॉगिन के सारी जानकारी देखें / See all information without logging in"', strings.home_open_title.hi === 'बिना लॉगिन के सारी जानकारी देखें' && strings.home_open_title.en === 'See all information without logging in')
const openLinks = [...(home.match(/const OPEN_LINKS = \[([\s\S]*?)\n\]/) || ['', ''])[1].matchAll(/to: '([^']+)', labelKey: '([^']+)'/g)].map((m) => ({ to: m[1], key: m[2] }))
check('3: strip names mandi prices, schemes, Kisan Sawaal, cold storage and melas', openLinks.map((o) => o.to).join(',') === '/msp,/yojana,/sawaal,/cold-storage,/kisan-mela' && openLinks.map((o) => strings[o.key]?.hi).join(',') === 'मंडी भाव,योजनाएँ,किसान सवाल,कोल्ड स्टोरेज,मेले')
const gated = openLinks.filter((o) => !new RegExp(`<Route path="${o.to}" element=\\{<(?!Protected|AdminOnly|PublicOnly)[A-Z]`).test(app)).map((o) => o.to)
check('3: every item named is a public route today (no login gate in App.jsx)', openLinks.length === 5 && gated.length === 0, gated.join(','))
check('3: strip sits above the hero and links to /how-to-use', home.indexOf('data-testid="home-open-strip"') > 0 && home.indexOf('data-testid="home-open-strip"') < home.indexOf('<HeroContent') && /<Link to="\/how-to-use" data-testid="home-how-to-use"/.test(home) && /<Route path="\/how-to-use" element=\{<HowToUse \/>\} \/>/.test(app))
const strip = (distHome.match(/<section[^>]*data-testid="home-open-strip"[\s\S]*?<\/section>/) || [''])[0]
const stripHrefs = [...strip.matchAll(/href="([^"]+)"/g)].map((m) => m[1])
check('3: prerendered homepage has the strip with its five links and the how-to link', text(strip).includes('बिना लॉगिन के सारी जानकारी देखें') && stripHrefs.join(',') === '/msp,/yojana,/sawaal,/cold-storage,/kisan-mela,/how-to-use', stripHrefs.join(','))
check('3: strip is light (tint background, no heavy banner)', /home-open-strip"[^>]*style=\{\{ background: 'var\(--ks-green-tint\)'/.test(home))

// ---- 4. favicon ------------------------------------------------------------------------------
const icons = ['public/icons/favicon-32.png', 'public/icons/favicon-48.png', 'public/icons/favicon.svg', 'public/icons/icon-192.png', 'public/icons/icon-512.png', 'public/icons/maskable-512.png', 'public/icons/apple-touch-icon.png']
check('4: favicon files exist (32, 48, svg) alongside the unchanged-purpose PWA icons', icons.every(has), icons.filter((f) => !has(f)).join(','))
const m32 = await sharp(join(ROOT, 'public/icons/favicon-32.png')).metadata()
const m48 = await sharp(join(ROOT, 'public/icons/favicon-48.png')).metadata()
check('4: favicon PNGs are 32×32 and 48×48', m32.width === 32 && m32.height === 32 && m48.width === 48 && m48.height === 48)
const gen = read('scripts/gen-icons.mjs')
check('4: generated by `npm run icons` from a drawn turban-and-wheat mark on the brown tile', /"icons": "node scripts\/gen-icons\.mjs"/.test(read('package.json')) && /const MARK_SVG = /.test(gen) && /fill="#421F03"/.test(gen) && /await favicon\(32\)\s+await favicon\(48\)/.test(gen))
check('4: 192/512/maskable/apple-touch icons and the header logo are still made from the photo logo', /await icon\('icon-192\.png', 192, \{ round: true \}\)/.test(gen) && /await icon\('icon-512\.png', 512, \{ round: true \}\)/.test(gen) && /await icon\('maskable-512\.png'/.test(gen) && /logo-\$\{width\}\.webp/.test(gen))
// A simple mark has few colours; the photo logo squeezed to 32px had hundreds.
const { data: px } = await sharp(join(ROOT, 'public/icons/favicon-32.png')).raw().toBuffer({ resolveWithObject: true })
const bucket = new Set()
for (let i = 0; i < px.length; i += m32.channels) bucket.add(`${px[i] >> 5},${px[i + 1] >> 5},${px[i + 2] >> 5}`)
check(`4: the 32px icon is a simple mark (${bucket.size} coarse colours)`, bucket.size <= 24)
const idx = read('index.html')
check('4: index.html links the svg, 48px and 32px tab icons', /rel="icon" type="image\/svg\+xml" href="\/icons\/favicon\.svg"/.test(idx) && /sizes="48x48" href="\/icons\/favicon-48\.png"/.test(idx) && /sizes="32x32" href="\/icons\/favicon-32\.png"/.test(idx) && has('dist/icons/favicon-48.png'))
check('4: before/after at 32px saved in docs/review/batch7d', has('docs/review/batch7d/favicon-32-before.png') && has('docs/review/batch7d/favicon-32-after.png') && has('docs/review/batch7d/favicon-before-after.png'))

// ---- 5. terms (4a) -----------------------------------------------------------------------------
const termsAll = termsOfUse.map((c) => `${c.hi} ${c.en}`).join(' ')
check('5a: 16 clauses, bilingual, none saying "free"', termsOfUse.length === 16 && termsOfUse.every((c) => c.hi && c.en && c.title_hi && c.title_en) && !FREE.test(termsAll))
check('5a: the general note is shown once, not appended to every clause', termsNote.hi.length > 80 && count(termsAll, termsNote.hi.slice(0, 40)) === 0 && count(termsAll, termsNote.en.slice(0, 40)) === 0 && count(read('src/screens/Terms.jsx'), 'termsNote.hi') === 1)
check('5a: grievance route in the terms matches the grievance page (grievance@ or the /grievance form)', /grievance@kissansahyog\.com/.test(termsOfUse.find((c) => c.id === 'reporting').en) && /grievance@kissansahyog\.com/.test(termsOfUse.find((c) => c.id === 'law').en)
  && /form on the Feedback & Grievance page \(\/grievance\)/.test(termsOfUse.find((c) => c.id === 'reporting').en) && /सुझाव और शिकायत पेज \(\/grievance\) के फ़ॉर्म/.test(termsOfUse.find((c) => c.id === 'reporting').hi))
// Batch 7F: Terms, Privacy, the Report button, /contact and llms.txt follow the simplified
// /grievance page — no officer, no promised response time, hello@ for general and data
// requests, grievance@ for complaints only.
const { privacyPolicy: privacy7f, legacyTermsOfUse: legacy7f } = await load('src/lib/i18n/legal.js')
const privacyAll7f = privacy7f.map((c) => `${c.hi} ${c.en}`).join(' ')
const legacyAll7f = legacy7f.map((c) => `${c.hi} ${c.en}`).join(' ')
const reportCopy7f = Object.entries(strings).filter(([k]) => /^report_|^contact_/.test(k)).map(([, v]) => `${v.hi} ${v.en}`).join(' ')
const llms7f = read('public/llms.txt')
const OFFICER_7F = /grievance officer|शिकायत अधिकारी/i
const PROMISE_7F = /[0-9०-९]+\s*(घंटे|घंटा|दिन|hours?|days?)|acknowledg|पावती|resolves? within|निपटारा करते/i
const legalCopy7f = [termsAll, termsNote.hi, termsNote.en, privacyAll7f, legacyAll7f, reportCopy7f, llms7f].join(' ')
check('7F: no Grievance Officer in terms, privacy, report button, contact page or llms.txt', !OFFICER_7F.test(legalCopy7f), (legalCopy7f.match(OFFICER_7F) || [''])[0])
const promiseCopy7f = [termsOfUse.find((c) => c.id === 'reporting').hi, termsOfUse.find((c) => c.id === 'reporting').en, privacyAll7f, legacyAll7f, reportCopy7f, llms7f].join(' ')
check('7F: no promised time to acknowledge or resolve a complaint', !PROMISE_7F.test(promiseCopy7f), (promiseCopy7f.match(PROMISE_7F) || [''])[0])
const withdraw7f = privacy7f.find((c) => /withdraw your WhatsApp consent/.test(c.en))
const data7f = privacy7f.find((c) => /^For data queries/.test(c.en))
check('7F: privacy — consent withdrawal, account deletion and data requests go to hello@', !!withdraw7f && /hello@kissansahyog\.com/.test(withdraw7f.en) && /hello@kissansahyog\.com/.test(withdraw7f.hi) && !/grievance@/.test(withdraw7f.hi + withdraw7f.en)
  && !!data7f && /data rights or deletion requests, write to hello@kissansahyog\.com\./.test(data7f.en) && /hello@kissansahyog\.com पर लिखें। शिकायत के लिए grievance@kissansahyog\.com/.test(data7f.hi))
check('7F: privacy — grievance@ appears only as the complaints address', count(privacyAll7f, 'grievance@kissansahyog.com') === 2 && /For complaints, write to grievance@kissansahyog\.com or use the form on the Feedback & Grievance page \(\/grievance\)/.test(data7f.en))
check('7F: report button says the complaint goes to our team, with no time promise', strings.report_intro.en === 'Choose a reason. Your complaint goes to our team.' && strings.report_intro.hi === 'कारण चुनें। आपकी शिकायत हमारी टीम के पास जाएगी।'
  && strings.report_success.en === 'Thank you — your complaint was received.' && strings.report_success.hi === 'धन्यवाद — आपकी शिकायत मिल गई।')
const distContact7f = text(read('dist/contact/index.html'))
check('7F: /contact shows hello@ for general questions and grievance@ only for complaints', /mailto:hello@kissansahyog\.com/.test(read('src/screens/Contact.jsx')) && /write to grievance@kissansahyog\.com/.test(strings.contact_grievance_tail.en) && /grievance@kissansahyog\.com पर लिखें/.test(strings.contact_grievance_tail.hi)
  && distContact7f.includes('hello@kissansahyog.com') && distContact7f.includes(strings.contact_grievance_tail.hi.trim()))
check('7F: llms.txt labels grievance@ as the complaints address', /Contact: hello@kissansahyog\.com\. Complaints: grievance@kissansahyog\.com\./.test(llms7f) && count(llms7f, 'grievance@') === 1)
check('7F: unused footer_grievance_email string is gone', !strings.footer_grievance_email && !/footer_grievance_email/.test(read('src/components/layout/Footer.jsx')))
const distLegal7f = text(read('dist/terms/index.html')) + text(read('dist/privacy/index.html'))
check('7F: prerendered /terms and /privacy carry no officer and no response-time promise', !OFFICER_7F.test(distLegal7f) && !/24 घंटे|24 hours|acknowledges within|resolves within|पावती/.test(distLegal7f))
check('5a: terms do not name a sign-in method in a heading', !/OTP|ओटीपी|password|पासवर्ड/i.test(termsOfUse.map((c) => `${c.title_hi} ${c.title_en}`).join(' ')))
const termsScreen = stripComments(read('src/screens/Terms.jsx'))
check('5a: Terms page labels come from i18n (no hard-coded "Last updated" / "Contents")', !/>Last updated|>Contents<|aria-label="Terms/.test(termsScreen) && strings.terms_updated.hi && strings.terms_contents.hi && /t\('terms_updated'\)/.test(termsScreen))
const distTerms = text(read('dist/terms/index.html'))
check('5a: prerendered /terms shows the note once and no "free"', count(distTerms, termsNote.hi.slice(0, 40)) === 1 && !FREE.test(distTerms))

// ---- 6. consent (4b) ------------------------------------------------------------------------------
const postCode = stripComments(post)
check('6b: post screen no longer asks "I accept the rules and my information is correct" twice', !/post_confirm_(simple|provider|owner)/.test(postCode) && count(postCode, '<ConsentChecklist') === 1)
check('6b: the itemised checklist is intact (4 items, rules + accuracy with the Terms link)', disclaimers.listingConsents.length === 4 && disclaimers.listingConsents.map((c) => c.id).join(',') === 'connect_only,no_verification,no_payments,posting_rules' && disclaimers.listingConsents[3].terms === true)
check('6b: the extra box appears only for a real extra declaration (provider / land ownership)', /const declarationKey = needsSelfDecl \? 'post_declare_owner' : needsProviderDecl \? 'post_declare_provider' : null/.test(postCode) && /\{declarationKey && \(/.test(postCode)
  && !/नियम|rules/i.test(`${strings.post_declare_owner.hi} ${strings.post_declare_owner.en} ${strings.post_declare_provider.hi} ${strings.post_declare_provider.en}`))
check('6b: consent is not weakened — submit still needs every checklist item, and the declaration when one applies', /if \(!declarationOk \|\| !allConsentsAccepted\) \{ setError\(t\('consent_required'\)\); return \}/.test(postCode) && /disabled=\{!declarationOk \|\| !allConsentsAccepted\}/.test(postCode) && /const declarationOk = !declarationKey \|\| confirmChecked/.test(postCode)
  && /const allConsentsAccepted = CONSENT_ITEM_IDS\.every\(\(id\) => consents\[id\]\)/.test(postCode))
check('6b: the server still receives rules agreement, the self-declaration and the stored consents', /rulesAgreed: !!consents\.posting_rules/.test(postCode) && /selfDeclared: needsSelfDecl/.test(postCode) && /await acceptListingConsents\(consents\)/.test(postCode) && /provider_declared: true/.test(postCode))

// ---- 7. mela place (4d) ------------------------------------------------------------------------------
check('7d: a country-only venue or state is dropped from the card', melaPlace({ venue: 'India', district: 'Gorakhpur', state: 'Uttar Pradesh' }) === 'Gorakhpur, Uttar Pradesh' && melaPlace({ venue: 'Raipur', state: 'India' }) === 'Raipur' && melaPlace({ venue: 'भारत', state: 'Madhya Pradesh' }) === 'Madhya Pradesh')
check('7d: normal rows are unchanged, repeats collapse, empty is empty', melaPlace({ venue: 'JNKVV Campus', district: 'Jabalpur', state: 'Madhya Pradesh' }) === 'JNKVV Campus, Jabalpur, Madhya Pradesh' && melaPlace({ venue: 'Sagar', district: 'Sagar', state: 'Madhya Pradesh' }) === 'Sagar, Madhya Pradesh' && melaPlace({}) === '' && melaPlace(null) === '')
check('7d: the homepage card and the mela page both use it', /📍 \{melaPlace\(m\)\}/.test(home) && /const place = melaPlace\(m\)/.test(read('src/screens/KisanMela.jsx')) && !/\[m\.venue, m\.(state|district)/.test(home + read('src/screens/KisanMela.jsx')))
const okRow = { source_url: 'https://example.org/mela', venue: 'Campus', state: 'Madhya Pradesh', country: 'India', is_date_confirmed: true, event_date_start: '2026-12-01' }
check('7d: the discovery job now refuses a row whose venue or state is just the country', pipeline.validateMela(okRow).ok === true && pipeline.validateMela({ ...okRow, venue: 'India' }).reason === 'venue_or_state_is_country' && pipeline.validateMela({ ...okRow, state: 'India' }).reason === 'venue_or_state_is_country')
check('7d: no "India," place line on the prerendered homepage', !/📍\s*India,/.test(text(distHome)))

// ---- 8. tiles (4e) -------------------------------------------------------------------------------------
const bento = read('src/components/PromoBento.jsx')
check('8e: post-screen bento leaves out a tile with nothing in it (WhatsApp without a channel link, KVK without a row) before slicing', /const hasContent = \(tile\) => \(tile\.type === 'whatsapp' \? !!whatsappUrl : tile\.type === 'kvk' \? !!kvk : true\)/.test(bento) && /\.filter\(hasContent\)\.slice\(0, limit\)/.test(bento))
check('8e: homepage price tile is rendered only when there is a price (no "—" tile)', /\{today\.priceLine && \(\s*<InfoTile/.test(home) && !/: '—'\}/.test(home))
check('8e: category grid has no blank cell (2 / 3 / 5 columns; an odd last tile spans the row on phones)', /data-testid="home-cat-grid" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 \[&>\*:last-child:nth-child\(odd\)\]:col-span-2 md:\[&>\*:last-child:nth-child\(odd\)\]:col-span-1"/.test(home) && (home.match(/\{ img: 'cat-[a-z-]+\.jpg'/g) || []).length % 15 === 0)
const tileImgs = [...home.matchAll(/img: '([a-z-]+\.jpg)'/g)].map((m) => m[1])
const missingImgs = tileImgs.filter((f) => !has(`public/images/home/${f}`))
check(`8e: every category tile image exists (${tileImgs.length}), and a tile whose image fails still has a solid background`, missingImgs.length === 0 && /minHeight: 0, background: 'var\(--ks-green-dark\)' \}\}>/.test(read('src/components/home/kit.jsx')), missingImgs.join(','))

// ---- 9. Soil Health Card English (4c) and the SQL file --------------------------------------------------
const qa = read('src/content/qa/schemes.js') + read('src/content/qa/legacy.js')
const OLD = ['Add fertiliser as per that', 'given to farmers free every two years', 'How to get soil tested and read', "tells your soil's status", 'It is free, every two years', 'at the nearby agriculture office']
const leftover = OLD.filter((o) => qa.includes(o))
check('9c: the English slips are fixed in the Q&A content files', leftover.length === 0 && qa.includes('How do I get my soil tested and read the Soil Health Card?') && qa.includes('Apply fertiliser as the card advises.'), leftover.join(' | '))
const sql = read('docs/review/batch7d/DB_FIXES.sql')
check('9: DB_FIXES.sql covers the Q&A English, the mela rows, the article byline and the database "free" row', /update public\.kisan_sawaal/.test(sql) && /update public\.kisan_mela set venue = 'Gorakhpur'/.test(sql) && /update public\.articles set author_name = 'USD Vision AI Team'\s+where slug = 'intercropping-madhya-pradesh'/.test(sql) && /update public\.page_faqs/.test(sql))
check('9: DB_FIXES.sql is review-only: wrapped in a transaction, matches on slug/text, no deletes or schema changes', /^begin;/m.test(sql) && /^commit;/m.test(sql) && !/\b(delete|drop|truncate|alter|insert)\b/i.test(sql.replace(/--[^\n]*/g, '')) && OLD.slice(0, 2).every((o) => sql.includes(o)))
// 0056_feedback_server_only.sql was added later, by Batch 7G; nothing else may follow 0055.
check('9: nothing in this batch adds a migration (0056 is Batch 7G)', !readdirSync(join(ROOT, 'supabase/migrations')).some((f) => /^00(5[6-9]|[6-9]\d)/.test(f) && f !== '0056_feedback_server_only.sql'))

// ---- 10. strings ----------------------------------------------------------------------------------------
const newKeys = ['free_registration', 'home_open_title', 'home_open_mandi', 'home_open_schemes', 'home_open_sawaal', 'home_open_cold', 'home_open_mela', 'terms_updated', 'terms_contents', 'post_declare_provider', 'post_declare_owner']
const unpaired = newKeys.filter((k) => !(strings[k]?.hi?.trim() && strings[k]?.en?.trim()))
check(`10: every new string has Hindi and English (${newKeys.length})`, unpaired.length === 0, unpaired.join(','))
const used = [...new Set([home, signup, post, read('src/screens/Terms.jsx'), bento].flatMap((s) => [...s.matchAll(/\bt\((?:o\.labelKey|'([a-z0-9_]+)')\)/g)].map((m) => m[1]).filter(Boolean)))]
const undefinedKeys = used.filter((k) => !strings[k])
check('10: every t() key used by the touched screens exists', undefinedKeys.length === 0, undefinedKeys.join(','))
check('10: no Devanagari literals added to the touched components', ![home, signup, post, bento.replace('/krishi vigyan|kvk|कृषि विज्ञान/i', ''), read('src/screens/Terms.jsx')].some((s) => /[ऀ-ॿ]/.test(stripComments(s))))

say(`\n${pass} passed, ${fail} failed`)
mkdirSync(join(ROOT, 'docs/review/batch7d'), { recursive: true })
writeFileSync(join(ROOT, 'docs/review/batch7d/VERIFY_OUTPUT.txt'), lines.join('\n') + '\n', 'utf8')
process.exit(fail ? 1 : 0)
