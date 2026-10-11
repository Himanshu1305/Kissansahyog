#!/usr/bin/env node
// Batch 6G static verifier — founder page, homepage trust band, footer link.
//   node scripts/verify-batch6g.mjs
// Prints PASS/FAIL lines, saves the same output (UTF-8) to
// docs/review/BATCH6G_VERIFY_OUTPUT.txt and exits non-zero on any failure.
// Reads source files only: no network, no database, no .env.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
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
const read = (relative) => readFileSync(join(ROOT, relative), 'utf8')
const walk = (dir) => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : []).flatMap((entry) => {
  const path = join(dir, entry.name)
  return entry.isDirectory() ? walk(path) : [path]
})
const rel = (full) => full.slice(ROOT.length + 1).replaceAll('\\', '/')
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
const DEV = /[ऀ-ॿ]/
const load = (relative) => import(pathToFileURL(join(ROOT, relative)).href)

const { founder, buildFounderJsonLd } = await load('src/content/founder.js')
const { strings } = await load('src/lib/i18n/strings.js')
const founderSrc = read('src/content/founder.js')
const screen = read('src/screens/Founder.jsx')
const app = read('src/App.jsx')
const home = read('src/screens/Homepage.jsx')
const footer = read('src/components/layout/Footer.jsx')
const agro = read('src/screens/AgroForestry.jsx')

// Every string value in the data object, by language.
const collect = (node, out = { hi: [], en: [], pairs: [] }, path = 'founder') => {
  if (Array.isArray(node)) node.forEach((n, i) => collect(n, out, `${path}[${i}]`))
  else if (node && typeof node === 'object') {
    if ('hi' in node || 'en' in node) {
      out.pairs.push({ path, hi: node.hi, en: node.en })
      if (typeof node.hi === 'string') out.hi.push(node.hi)
      if (typeof node.en === 'string') out.en.push(node.en)
    } else for (const [k, v] of Object.entries(node)) collect(v, out, `${path}.${k}`)
  }
  return out
}
const copy = collect(founder)
const hiText = copy.hi.join('\n')
const allText = [...copy.hi, ...copy.en].join('\n')
// Founder-related short labels in strings.js.
const founderKeys = Object.keys(strings).filter((k) => /^founder_|^footer_founder$|^agro_author_/.test(k))
const stringsText = founderKeys.flatMap((k) => [strings[k].hi, strings[k].en]).join('\n')

// ---- 1. route, shell, single h1 ------------------------------------------------
check('1: /founder route is registered (lazy) in App.jsx',
  /const Founder = lazy\(\(\) => import\('\.\/screens\/Founder'\)\)/.test(app) && /<Route path="\/founder" element=\{<Founder \/>\} \/>/.test(app))
check('1: Founder screen uses PageShell with the wide width', /<PageShell width="wide"/.test(screen))
check('1: Founder screen has exactly one <h1>', (stripComments(screen).match(/<h1[\s>]/g) || []).length === 1)
// Rendered order: the page body, with each <SectionBlock> counted as the <h2> it renders.
const pageBody = stripComments(screen).slice(stripComments(screen).indexOf('export default function Founder')).replaceAll('<SectionBlock ', '<h2 ')
const headingOrder = [...pageBody.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]))
check('1: heading levels never skip (h1 → h2 → h3 → h4)',
  headingOrder[0] === 1 && headingOrder.every((h, i) => i === 0 || h <= Math.max(...headingOrder.slice(0, i)) + 1), headingOrder.join(','))

// ---- 2. required copy ----------------------------------------------------------
const MISSION_1 = 'किसान की आय बढ़ाना'
const MISSION_2 = 'रोज़गार के अवसर बनाना'
for (const needle of ['42 वर्ष', 'ब्राह्मण परिवार', 'ॐ सीताराम', 'WE WILL DO IT', MISSION_1, MISSION_2]) {
  check(`2: founder copy contains "${needle}"`, hiText.includes(needle))
}
check('2: mission pull-quotes reuse the site strings hero_h1_l1 / hero_h1_l2 unchanged',
  strings.hero_h1_l1?.hi === MISSION_1 && strings.hero_h1_l2?.hi === MISSION_2
  && strings.hero_h1_l1?.en === 'Increasing Farmer Income' && strings.hero_h1_l2?.en === 'Creating Employment Opportunities'
  && /t\('hero_h1_l1'\)/.test(screen) && /t\('hero_h1_l2'\)/.test(screen))
const NAMES_HI = [
  'श्रीमती नीलम दीक्षित', 'श्रीमती त्रिवेणी बाई दीक्षित', 'पंडित शालिग राम दीक्षित',
  'अनुपम', 'अमन', 'वेदिका (अनुपम की पत्नी)', 'अंकिता (अमन की पत्नी)',
  'स्व. पंडित उमाशंकर दीक्षित एवं भाभी जी डॉ. कमलेश दीक्षित',
  'रविशंकर दीक्षित एवं स्व. डॉ. छाया दीक्षित (भाभी जी)', 'डॉ. छाया दीक्षित', 'एडवोकेट संतोष दीक्षित',
  'राहुल-सुप्रिया', 'हिमाँशु-सुरभि', 'रिचा', 'श्रुति दीक्षित',
]
const missingHi = NAMES_HI.filter((n) => !hiText.includes(n))
check('2: every family name from the brief is present (Hindi)', missingHi.length === 0, missingHi.join(' | '))
const NAMES_EN = [
  'Smt. Neelam Dixit', 'Smt. Triveni Bai Dixit', 'Pt. Shalig Ram Dixit', 'Anupam', 'Aman', 'Vedica', 'Ankita',
  'Late Pt. Umashankar Dixit and Bhabhi ji Dr. Kamlesh Dixit', 'Ravishankar Dixit and late Dr. Chhaya Dixit',
  'Advocate Santosh Dixit', 'Rahul–Supriya', 'Himanshu–Surbhi', 'Richa', 'Shruti Dixit',
]
const missingEn = NAMES_EN.filter((n) => !copy.en.join('\n').includes(n))
check('2: every family name is transliterated as specified (English)', missingEn.length === 0, missingEn.join(' | '))
check('2: glance has 11 tiles, 4 education steps, 4 service steps, 2 innovations, 2 awards, 3 promises, 3 FAQs',
  founder.glance.length === 11 && founder.education_timeline.length === 4 && founder.service_timeline.length === 4
  && founder.innovations.length === 2 && founder.awards.length === 2 && founder.promises.length === 3 && founder.faqs.length === 3)

// ---- 3. forbidden copy ---------------------------------------------------------
const FORBIDDEN = ['40 वर्ष', 'चालीस', '40 years', 'Shubh Tech', 'शुभ टेक', 'गुरुग्राम', 'Gurugram', 'मुफ़्त', 'मुफ्त', 'free of cost', 'free for farmers']
const lower = (s) => s.toLowerCase()
const badCopy = FORBIDDEN.filter((w) => lower(founderSrc).includes(lower(w)))
check('3: founder data file has no forbidden wording', badCopy.length === 0, badCopy.join(', '))
const badStrings = FORBIDDEN.filter((w) => lower(stringsText).includes(lower(w)))
check('3: founder strings have no forbidden wording', badStrings.length === 0, badStrings.join(', '))
check('3: no "coming soon" / "under review" label', !/coming soon|under review|समीक्षाधीन|जल्द आ रहा/i.test(allText + stringsText))

// ---- 4. hi/en parity and no Devanagari in the batch .jsx files ------------------
const unpaired = copy.pairs.filter((p) => !(typeof p.hi === 'string' && p.hi.trim() && typeof p.en === 'string' && p.en.trim())).map((p) => p.path)
check(`4: every founder field has Hindi and English (${copy.pairs.length} fields)`, copy.pairs.length > 60 && unpaired.length === 0, unpaired.join(', '))
const unpairedKeys = founderKeys.filter((k) => !(strings[k].hi?.trim() && strings[k].en?.trim()))
check(`4: every founder string key has Hindi and English (${founderKeys.length} keys)`, founderKeys.length >= 14 && unpairedKeys.length === 0, unpairedKeys.join(', '))
const usedKeys = [...new Set([...screen.matchAll(/\bt\('([a-z0-9_]+)'\)/g)].map((m) => m[1]))]
const missingKeys = usedKeys.filter((k) => !strings[k])
check('4: every t() key used by Founder.jsx exists in strings.js', missingKeys.length === 0, missingKeys.join(', '))
check('4: Founder.jsx and Footer.jsx contain no Devanagari literals', !DEV.test(stripComments(screen)) && !DEV.test(stripComments(footer)))
// Homepage.jsx and AgroForestry.jsx carried Devanagari before this batch (tracked i18n debt);
// the rule here is that the lines this batch added contain none.
const bandSrc = home.slice(home.indexOf('data-testid="home-founder-band"'), home.indexOf('data-testid="home-founder-link"') + 400)
const authorLine = agro.slice(agro.indexOf('data-testid="agro-author-line"'), agro.indexOf('data-testid="agro-author-line"') + 400)
check('4: homepage band and agro-forestry author line contain no Devanagari literals', bandSrc.length > 400 && authorLine.length > 100 && !DEV.test(stripComments(bandSrc)) && !DEV.test(stripComments(authorLine)))

// ---- 5. links and one name spelling --------------------------------------------
check('5: homepage band links to /founder', /<Link to="\/founder" data-testid="home-founder-link"/.test(home))
check('5: homepage band shows name, role, three badges and the motto',
  ['founder_name', 'founder_role', 'founder_badge_service', 'founder_badge_medal', 'founder_badge_guinness', 'founder_quote', 'founder_read_full'].every((k) => bandSrc.includes(k))
  && strings.founder_quote.hi === 'WE WILL DO IT' && strings.founder_badge_service.hi === '42 वर्ष की सेवा'
  && strings.founder_badge_medal.hi === 'स्वर्ण पदक, 2011' && strings.founder_badge_guinness.hi === 'गिनीज वर्ल्ड रिकॉर्ड, 2014-15'
  && strings.founder_role.hi === 'संस्थापक · सेवानिवृत्त उप वन संरक्षक (DCF)')
check('5: footer links to /founder', /<Link to="\/founder"[^>]*>\{t\('footer_founder'\)\}<\/Link>/.test(footer) && strings.footer_founder.hi === 'संस्थापक' && strings.footer_founder.en === 'Founder')
check('5: agro-forestry author line links to /founder with the shared name string', /<Link to="\/founder"[^>]*>\{t\('founder_name'\)\}<\/Link>/.test(authorLine))
check('5: founder_name uses the one agreed spelling', strings.founder_name.hi === 'श्री अभिनन्दन दीक्षित' && strings.founder_name.en === 'Shri Abhinandan Dixit'
  && founder.name.hi === strings.founder_name.hi && founder.name.en === strings.founder_name.en)
// Shipped source = src/, public/ and the non-test scripts. Comments are ignored
// (historical notes may keep the old initials).
const shipped = [
  ...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'public')),
  ...walk(join(ROOT, 'scripts')).filter((f) => !/[\\/]scripts[\\/]test[\\/]|verify-batch/.test(f)),
].filter((f) => /\.(js|jsx|mjs|json|html|md|txt)$/.test(f))
const scan = (re) => shipped.filter((f) => re.test(/\.(js|jsx|mjs)$/.test(f) ? stripComments(readFileSync(f, 'utf8')) : readFileSync(f, 'utf8'))).map(rel)
const oldRole = scan(/कृषि विशेषज्ञ, किसान परिवार से|Agriculture expert, from a farming family/)
check('5: old role string "कृषि विशेषज्ञ, किसान परिवार से" is gone', oldRole.length === 0, oldRole.join(', '))
const oldName = scan(/ए\.के\.\s*दीक्षित|A\.K\.\s*Dixit/)
check('5: no "ए.के. दीक्षित" / "A.K. Dixit" outside historical docs and comments', oldName.length === 0, oldName.join(', '))
const altSpelling = scan(/अभिनंदन/)
check('5: no second Hindi spelling "अभिनंदन" in shipped source', altSpelling.length === 0, altSpelling.join(', '))

// ---- 6. sitemap, prerender, search index ---------------------------------------
const { STATIC_ROUTES, getRoutes } = await load('scripts/lib/prerender-routes.mjs')
const routes = await getRoutes()
check('6: /founder is in the shared static route list', STATIC_ROUTES.includes('/founder') && routes.includes('/founder'))
check('6: sitemap generator and prerender both read that list',
  /getRoutes/.test(read('scripts/gen-sitemaps.mjs')) && /getRoutes/.test(read('scripts/prerender.mjs')))
check('6: search-index builder registers /founder', /url: '\/founder'/.test(read('scripts/build-search-index.mjs')))
const index = JSON.parse(read('public/search-index.json'))
check('6: committed public/search-index.json has the /founder entry', index.some((it) => it.url === '/founder' && it.title_hi.includes('अभिनन्दन दीक्षित')))
check('6: page title and description match the brief',
  founder.seo.title.hi === 'श्री अभिनन्दन दीक्षित — संस्थापक, किसान सहयोग'
  && founder.seo.description.hi === 'सेवानिवृत्त उप वन संरक्षक श्री अभिनन्दन दीक्षित का परिचय: किसान परिवार से 42 वर्ष की सेवा तक, और किसान की आय बढ़ाने का संकल्प।'
  && founder.seo.title.en.length <= 60 && founder.seo.description.en.length <= 160
  && /<Seo[\s\S]*?path="\/founder"/.test(screen))
check('6: /founder is not also in ROUTE_SEO (no duplicate title)', !/'\/founder'/.test(read('src/content/seo.js')))
check('6: Open Graph image exists', /image="\/og\/founder\.png"/.test(screen) && existsSync(join(ROOT, 'public/og/founder.png')))

// ---- 7. JSON-LD ----------------------------------------------------------------
const [person, organization, faq] = buildFounderJsonLd(founder, 'en')
check('7: Person JSON-LD carries only name, jobTitle, birthPlace, worksFor',
  person['@type'] === 'Person' && person.name === 'Shri Abhinandan Dixit'
  && person.jobTitle === 'Retired Deputy Conservator of Forests, Madhya Pradesh'
  && person.birthPlace?.name === 'Khurai' && person.worksFor?.name === 'Kissan Sahyog'
  && Object.keys(person).sort().join(',') === ['@context', '@type', 'birthPlace', 'jobTitle', 'name', 'worksFor'].sort().join(','),
  Object.keys(person).join(','))
check('7: Organization JSON-LD names him as founder', organization['@type'] === 'Organization' && organization.founder?.name === 'Shri Abhinandan Dixit')
check('7: real data (proof_src null) emits no award', founder.awards.every((a) => a.proof_src === null) ? !('award' in person) : true)
const fake = { ...founder, awards: [{ ...founder.awards[0], proof_src: '/founder/fake.jpg' }, { ...founder.awards[1], proof_src: null }] }
const fakePerson = buildFounderJsonLd(fake, 'en')[0]
check('7: a fake proven award is emitted, the unproven one is not',
  Array.isArray(fakePerson.award) && fakePerson.award.length === 1 && fakePerson.award[0].includes('Gold Medal') && !JSON.stringify(fakePerson).includes('Guinness'))
check('7: FAQPage JSON-LD has the 3 visible questions',
  faq['@type'] === 'FAQPage' && faq.mainEntity.length === 3 && faq.mainEntity.every((q) => q.name && q.acceptedAnswer?.text)
  && /founder\.faqs\.map/.test(screen) && /buildFounderJsonLd\(founder, lang\)/.test(screen))

// ---- 8. image slots, storage ---------------------------------------------------
const slots = []
const findSlots = (node, path = 'founder') => {
  if (Array.isArray(node)) node.forEach((n, i) => findSlots(n, `${path}[${i}]`))
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) {
    if (k === 'src' || k === 'proof_src') slots.push({ path: `${path}.${k}`, value: v })
    else findSlots(v, `${path}.${k}`)
  }
}
findSlots(founder)
const broken = slots.filter((s) => s.value !== null && !(typeof s.value === 'string' && s.value.startsWith('/') && existsSync(join(ROOT, 'public', s.value)))).map((s) => `${s.path}=${s.value}`)
check(`8: no image path points to a missing file (${slots.length} slots, ${slots.filter((s) => s.value).length} set)`, slots.length === 6 && broken.length === 0, broken.join(', '))
check('8: video id is null or an 11-character YouTube id', founder.video.youtube_id === null || /^[\w-]{11}$/.test(founder.video.youtube_id))
const readme = existsSync(join(ROOT, 'public/founder/README.md')) ? read('public/founder/README.md') : ''
check('8: public/founder/README.md lists every image file',
  ['portrait.jpg', 'medal-certificate.jpg', 'guinness-certificate.jpg', 'baihar-1.jpg', 'bijawar-1.jpg', 'parents.jpg'].every((f) => readme.includes(f)))
const storage = ['src/content/founder.js', 'src/screens/Founder.jsx'].filter((f) => /localStorage|sessionStorage/.test(read(f)))
check('8: no localStorage / sessionStorage in the new files', storage.length === 0, storage.join(', '))
check('8: no iframe on the founder page and no CSP change needed', !/<iframe/.test(screen) && !/youtube|frame-src/.test(read('public/_headers')))

// ---- 9. carbon-credit pages ----------------------------------------------------
const carbonFiles = [
  'src/screens/CarbonCredit.jsx', 'src/screens/CarbonBrief.jsx', 'src/content/pages/carbon-credit.js', 'src/content/pages/carbon-brief.js',
  ...walk(join(ROOT, 'src/components')).map(rel).filter((f) => /Carbon/.test(f)),
  ...walk(join(ROOT, 'src/lib/carbon')).map(rel),
]
const named = carbonFiles.filter((f) => /दीक्षित|Dixit|founder/i.test(read(f)))
check(`9: carbon-credit screens do not mention the founder (${carbonFiles.length} files)`, carbonFiles.length >= 4 && named.length === 0, named.join(', '))

// ---- review documents ----------------------------------------------------------
check('G7: confirm list and video script exist',
  existsSync(join(ROOT, 'docs/review/FOUNDER_CONFIRM_LIST.md')) && read('docs/review/FOUNDER_VIDEO_SCRIPT.md').includes('इसी विश्वास के साथ: WE WILL DO IT।'))

say(`\n${pass} passed, ${fail} failed`)
writeFileSync(join(ROOT, 'docs/review/BATCH6G_VERIFY_OUTPUT.txt'), lines.join('\n') + '\n', 'utf8')
process.exit(fail ? 1 : 0)
