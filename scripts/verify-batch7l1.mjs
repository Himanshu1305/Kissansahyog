#!/usr/bin/env node
// Batch 7L-1 static verifier — "Sagar Division" wording, the one location flow (no pincode),
// the places list, division mandis and the two migration files.
//   node scripts/verify-batch7l1.mjs
// Reads source files and the built dist/ (run the full build + prerender first) and, if it is
// there, docs/review/batch7l1/browser-check.json (written by scripts/shots-batch7l1.mjs).
// No network, no database, no .env. Prints PASS/FAIL lines, saves them to
// docs/review/batch7l1/VERIFY_OUTPUT.txt and exits non-zero on any failure.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const lines = []
const say = (s) => { console.log(s); lines.push(s) }
let pass = 0, fail = 0
const check = (name, ok, detail = '') => { say(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? ` — ${detail}` : ''}`); ok ? (pass += 1) : (fail += 1) }
const has = (rel) => existsSync(join(ROOT, rel))
const read = (rel) => (has(rel) ? readFileSync(join(ROOT, rel), 'utf8') : '')
const stripComments = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
const unescape = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'")
const text = (html) => unescape(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ')
const meta = (html) => unescape((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '')
const jsonLd = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => { try { return [JSON.parse(m[1])].flat() } catch { return [] } })
const load = (rel) => import(pathToFileURL(join(ROOT, rel)).href)
const count = (s, needle) => s.split(needle).length - 1

const { strings } = await load('src/lib/i18n/strings.js')
const { about, buildAboutJsonLd } = await load('src/content/about.js')
const { ROUTE_SEO } = await load('src/content/seo.js')
const termsSrc = read('src/lib/i18n/termsContent.js')
const { termsOfUse } = await load('src/lib/i18n/termsContent.js')
const llms = read('public/llms.txt')

// ---- 1. Wording: "Sagar Division", not "Sagar district" --------------------------------------
const OLD = /Sagar district|Sagar District|सागर\s*ज़िल[ाे]|सागर\s*जिल[ाे]/
// Kept on purpose — these are statements about Sagar DISTRICT itself (a real data label), not
// a description of the service area. Each one is listed in BATCH7L1_REPORT.md.
const KEPT_KEYS = {
  resources_subtitle: 'heading of the list of Sagar-district government offices',
  res_home_sub: 'same list, home card',
  agro_fda_body: 'names the forest agency for Sagar district',
  cs_sagar_note: 'says how few cold-storage entries Sagar district has',
}
const oldInStrings = Object.entries(strings).filter(([, v]) => OLD.test(`${v.hi} ${v.en}`)).map(([k]) => k)
const fdaKey = oldInStrings.find((k) => /South Sagar Forest Development Agency/.test(strings[k].en))
const unexpected = oldInStrings.filter((k) => !(k in KEPT_KEYS) && k !== fdaKey)
check(`1: no "Sagar district" / "सागर ज़िला" left in the shared strings (kept as data labels: ${oldInStrings.filter((k) => !unexpected.includes(k)).join(', ')})`, unexpected.length === 0, unexpected.join(', '))
const descriptive = ['src/content/about.js', 'src/content/seo.js', 'src/content/howToUse.js', 'src/content/founder.js', 'src/content/pages/grievance.js', 'src/lib/i18n/termsContent.js', 'src/lib/i18n/legal.js', 'public/llms.txt', 'src/screens/Msp.jsx', 'src/screens/Contact.jsx', 'src/screens/About.jsx', 'src/screens/Homepage.jsx', 'src/components/layout/Seo.jsx', 'index.html']
const oldFiles = descriptive.filter((f) => OLD.test(stripComments(read(f))))
check('1: no "Sagar district" / "सागर ज़िला" in the About, Terms, home, contact, how-to, grievance, llms.txt or SEO sources', oldFiles.length === 0, oldFiles.join(', '))
const PAGES = ['index.html', 'about/index.html', 'terms/index.html', 'contact/index.html', 'how-to-use/index.html', 'grievance/index.html', 'privacy/index.html', 'mausam/index.html', 'msp/index.html']
// Visible text only. Two things are left out on purpose: the JSON-LD (it names the real districts)
// and the farmer's question about wheat seed "for Sagar district", which is Q&A content, not site copy.
const QA_WHEAT = /सागर जिले के लिए गेहूं के बीज की सबसे अच्छी किस्म[^?]*\?|Which wheat seed variety is best for Sagar district\?/g
const builtOld = PAGES.filter((p) => has(`dist/${p}`) && OLD.test(text(read(`dist/${p}`)).replace(QA_WHEAT, ' ')))
check(`1: none of the built pages says "Sagar district" / "सागर ज़िला" (${PAGES.filter((p) => has(`dist/${p}`)).length} pages)`, PAGES.every((p) => has(`dist/${p}`)) && builtOld.length === 0, builtOld.join(', ') || 'dist page missing — run the full build')
check('1: "Sagar, Madhya Pradesh" is left only where it names the courts (Terms #law), not the service area',
  !/Sagar, Madhya Pradesh/.test(about.lead.en + about.seo.description.en + about.what.paras[0].en + about.sagar.title.en + about.sagar.paras[0].en + llms + termsOfUse.find((c) => c.id === 'service').en)
  && /courts at Sagar, Madhya Pradesh/.test(termsOfUse.find((c) => c.id === 'law').en) && /सागर, मध्य प्रदेश के न्यायालयों/.test(termsOfUse.find((c) => c.id === 'law').hi))

const service = termsOfUse.find((c) => c.id === 'service')
check('1: Terms clause 1 — both mentions say Sagar Division / सागर संभाग, the first with "(Sagar Sambhag)"',
  count(service.en, 'Sagar Division') === 2 && service.en.indexOf('Sagar Division (Sagar Sambhag)') === service.en.indexOf('Sagar Division') && count(service.hi, 'सागर संभाग') === 2
  && !/(?<!संभाग)\s*सागर से हो रही/.test(service.hi) && service.en.includes('It is starting in Sagar Division and may expand to other places over time.'))
check('1: Terms — nothing but the area name changed in clause 1 (owner, not-a-party and check-yourself sentences intact)',
  service.en.includes('Kissan Sahyog is owned and run by Shri Abhinandan Dixit.') && service.en.includes('is not a party to any sale, rental, job, wage, transport, land or other agreement, and does not handle payments.')
  && service.en.endsWith("Please check the other person's details yourself before you go ahead.") && /Effective date 12 October 2026, Version 1\.2\./.test(termsSrc))
const distTerms = read('dist/terms/index.html')
check('1: built /terms has "Sagar Division" and "सागर संभाग", no "Draft", no "USD Vision AI"',
  text(distTerms).includes('Sagar Division (Sagar Sambhag)') && text(distTerms).includes('सागर संभाग')
  && !/Draft|ड्राफ्ट|ड्राफ़्ट/.test(text(distTerms)) && !/USD\s*Vision/i.test(distTerms.replace(/<footer[\s\S]*?<\/footer>/, '')) && !/Draft|ड्राफ्ट|ड्राफ़्ट|USD\s*Vision/i.test(termsSrc))

const SIX_EN = 'Sagar Division covers six districts: Sagar, Damoh, Panna, Tikamgarh, Chhatarpur and Niwari.'
const SIX_HI = 'सागर संभाग में छह ज़िले आते हैं: सागर, दमोह, पन्ना, टीकमगढ़, छतरपुर और निवाड़ी।'
check('1: About "Our area" names the six districts, in the briefed sentence (Hindi + English)', about.sagar.title.en === 'Our area: Sagar Division' && about.sagar.title.hi === 'हमारा क्षेत्र: सागर संभाग' && about.sagar.paras[0].en.includes(SIX_EN) && about.sagar.paras[0].hi.includes(SIX_HI) && about.sagar.id === 'sagar-se-shuruaat')
const copySources = ['src/content/about.js', 'src/content/seo.js', 'src/content/howToUse.js', 'src/lib/i18n/termsContent.js', 'src/lib/i18n/legal.js', 'src/lib/i18n/strings.js', 'public/llms.txt'].map((f) => stripComments(read(f))).join('\n')
check('1: the six districts are listed in ONE place in the copy (About "Our area"); elsewhere only JSON-LD and the picker', count(copySources, 'Damoh, Panna, Tikamgarh') === 1 && count(copySources, 'दमोह, पन्ना, टीकमगढ़') === 1)
check('1: About intro and "farm bazaar" block use the new wording; "growing district by district" is gone',
  about.lead.en.includes('for Sagar Division (Sagar Sambhag), Madhya Pradesh,') && about.lead.hi.includes('सागर संभाग, मध्य प्रदेश के लिए')
  && about.what.paras[0].en.includes('Kissan Sahyog is a farm marketplace for Sagar Division:') && about.what.paras[0].en.includes('We are starting in Sagar Division and growing from here.')
  && about.what.paras[0].hi.includes('हमारी शुरुआत सागर संभाग से हो रही है, और हम यहीं से आगे बढ़ रहे हैं।')
  && !/growing district by district|ज़िले-ज़िले आगे|your area could be next|अगला नंबर/.test(JSON.stringify(about)))
const distAbout = read('dist/about/index.html')
check('1: built /about shows the heading, the six-district sentence and the new line', text(distAbout).includes('हमारा क्षेत्र: सागर संभाग') && text(distAbout).includes(SIX_HI) && text(distAbout).includes('हम यहीं से आगे बढ़ रहे हैं'))
const distHome = read('dist/index.html')
check('1: home meta description says Sagar Division (source: Hindi + English; built page)', ROUTE_SEO['/'].description.en.includes('Sagar Division (Sagar Sambhag)') && ROUTE_SEO['/'].description.hi.includes('सागर संभाग') && /सागर संभाग|Sagar Division/.test(meta(distHome))
  && ROUTE_SEO['/'].description.en.length <= 160 && ROUTE_SEO['/'].description.hi.length <= 160, meta(distHome))
const og = unescape((distHome.match(/<meta property="og:description" content="([^"]*)"/) || [])[1] || '')
check('1: home og:description carries the same text as the description', og === '' ? !/og:description/.test(distHome) : /सागर संभाग|Sagar Division/.test(og), og)
check('1: llms.txt says Sagar Division (English + Hindi), no "Sagar, Madhya Pradesh"', llms.includes('for Sagar Division (Sagar Sambhag), Madhya Pradesh,') && llms.includes('सागर संभाग, मध्य प्रदेश के लिए') && llms.includes('Sagar Division mandi prices') && !/for Sagar, Madhya Pradesh/.test(llms))
const org = jsonLd(distHome).find((o) => o['@type'] === 'Organization')
const area = org?.areaServed
check('1: site JSON-LD areaServed = Sagar Division with its six districts (built home page + /about builder)',
  area?.name === 'Sagar Division' && area?.alternateName?.includes('सागर संभाग') && area?.containsPlace?.length === 6
  && ['Sagar', 'Damoh', 'Panna', 'Tikamgarh', 'Chhatarpur', 'Niwari'].every((d) => area.containsPlace.some((p) => p.name === `${d} district`))
  && buildAboutJsonLd(about, 'en')[0].areaServed.name === 'Sagar Division' && org.description === about.lead.hi, JSON.stringify(area || null).slice(0, 200))
check('1: weather / crop-advice / MSP descriptions and the stories + empty-listings lines follow the same wording',
  ROUTE_SEO['/mausam'].title.en === 'Weather — Sagar Division forecast' && ROUTE_SEO['/fasal-salah'].description.en.includes('Sagar Division (Sagar Sambhag)') && strings.msp_seo_hub_desc.en.includes('Sagar Division (Sagar Sambhag)')
  && strings.msp_sagar.en === 'Sagar Division' && strings.safalta_sub.en.endsWith('Sagar Division') && strings.listings_empty.en.includes('in Sagar Division') && strings.listings_empty.hi.includes('सागर संभाग'))

// ---- 2. One location object, no pincode -------------------------------------------------------
const ul = read('src/lib/location/userLocation.js')
const provider = read('src/lib/location/LocationProvider.jsx')
const control = read('src/components/location/LocationControl.jsx')
const shared = read('src/components/pages/shared.jsx')
check('2: one location object { lat, lng, label, source } with source = device | saved | typed | picked', /SOURCES = \['device', 'saved', 'typed', 'picked'\]/.test(ul) && /return \{ lat: la, lng: ln, label: String\(label \|\| ''\)\.trim\(\), source:/.test(ul))
const consumers = ['src/screens/Homepage.jsx', 'src/screens/Mausam.jsx', 'src/screens/Browse.jsx', 'src/screens/Msp.jsx', 'src/screens/FasalSalah.jsx', 'src/screens/KisanMela.jsx', 'src/screens/Search.jsx', 'src/components/coldStorage/ColdStorageFinder.jsx']
const notShared = consumers.filter((f) => !/useUserLocation\(\)/.test(read(f)))
check('2: home, weather, browse, MSP, crop advice, mela, search and the cold-storage finder all read the shared location', notShared.length === 0, notShared.join(', '))
const legacy = consumers.concat(['src/components/location/LocationControl.jsx', 'src/lib/location/LocationProvider.jsx', 'src/lib/location/userLocation.js', 'src/lib/location/places.js', 'src/lib/listings/nearbyCounts.js'])
  .filter((f) => /fetchPincode|initialLocation|DEFAULT_COORDS|DEFAULT_PINCODE|resolvePincode|savePincode|matchedVillage|rawCoords|nearby_counts|p_pincode|ks_pincode|navigator\.geolocation\.getCurrentPosition/.test(stripComments(read(f))) && f !== 'src/lib/location/userLocation.js')
check('2: none of them uses a pincode, a default place or its own device call any more', legacy.length === 0 && /navigator\.geolocation\.getCurrentPosition/.test(ul), legacy.join(', '))
const pinUi = ['src/screens/Homepage.jsx', 'src/screens/Mausam.jsx', 'src/screens/Browse.jsx', 'src/components/location/LocationControl.jsx', 'src/components/coldStorage/ColdStorageFinder.jsx'].filter((f) => /pincode|पिनकोड/i.test(stripComments(read(f))))
const signupBox = shared.slice(shared.indexOf('export function DailyUpdateSignup'), shared.indexOf('// ---- Inline SVG charts'))
check('2: no pincode input or "Pincode:" display on home / weather / browse / cold storage, nor in the daily-update box', pinUi.length === 0 && !/pincode_label|maxLength=\{6\}/.test(signupBox) && !/pincode-input|loc_enter_pincode|loc_or_pincode/.test(shared + control), pinUi.join(', '))
const pinStrings = ['loc_enter_pincode', 'loc_or_pincode', 'loc_use_pincode', 'loc_denied_hint', 'cs_search_ph'].filter((k) => strings[k])
check('2: the old "enter a pincode" strings are gone', pinStrings.length === 0, pinStrings.join(', '))
check('2: the OPTIONAL pincode field on the registration form is still there', /pincode/i.test(read('src/screens/Signup.jsx')))
check('2: pre-permission card text and buttons are the briefed wording (Hindi + English)',
  strings.loc_card_text.en === 'Share your location to see offers, mandi prices and weather near you, and how far melas, cold storages and search results are. We use your location only for this.'
  && strings.loc_card_text.hi === 'अपने पास के ऑफ़र, मंडी भाव और मौसम देखने के लिए, और मेला, कोल्ड स्टोरेज व खोज के नतीजे कितनी दूर हैं यह जानने के लिए अपनी लोकेशन साझा करें। हम आपकी लोकेशन सिर्फ़ इसी काम के लिए इस्तेमाल करते हैं।'
  && strings.loc_share.en === 'Share my location' && strings.loc_not_now.en === 'Not now')
check('2: banner and text-box wording are the briefed wording (Hindi + English)',
  `${strings.loc_showing.en} ${strings.loc_change_short.en}` === 'Showing results for {place}. Change' && `${strings.loc_showing.hi} ${strings.loc_change_short.hi}` === '{place} के नतीजे दिख रहे हैं। बदलें'
  && strings.loc_type_label.en === 'Type your village or town' && strings.loc_type_label.hi === 'अपना गाँव या कस्बा लिखें' && /^Did you mean/.test(strings.loc_did_you_mean.en))
const usedKeys = [...new Set([...(control + read('src/screens/Homepage.jsx')).matchAll(/t\(\s*(?:[a-z]+ === '[a-z]+' \? )?'([a-z_]+)'(?: : '([a-z_]+)')?/g)].flatMap((m) => [m[1], m[2]]).filter(Boolean))]
const missing = usedKeys.filter((k) => !strings[k] || !strings[k].hi || !strings[k].en)
check(`2: every string the control uses exists in Hindi and English (${usedKeys.filter((k) => k.startsWith('loc_')).length} location keys)`, missing.length === 0, missing.join(', '))
check('2: no Devanagari literal in the control or the provider (copy comes from the i18n file)', !/[ऀ-ॿ]/.test(stripComments(control) + stripComments(provider)))
check('2: the device is asked only from the "Share my location" action; the saved place lives in localStorage; no profile write', /getDevicePosition\(\)/.test(provider) && !/getDevicePosition|getCurrentPosition/.test(control) && /localStorage\.setItem\(KEY/.test(ul) && !/supabase|rpc\(|update_profile|updateProfile/.test(stripComments(ul) + stripComments(provider).replace(/from '\.\/places'/, '')))
check('2: with no location the home counts, browse results and weather are not rendered (prompt card instead)', /\{location && \(\s*<div data-testid="home-nearby-counts"/.test(read('src/screens/Homepage.jsx')) && /\{!location \? null : loading \?/.test(read('src/screens/Browse.jsx')) && /\{!location \? null : wx === undefined/.test(read('src/screens/Mausam.jsx')))
const headersChanged = (() => { try { return execSync('git diff --name-only pre-7l1 -- public/_headers functions', { cwd: ROOT, encoding: 'utf8' }).trim() } catch { return 'git unavailable' } })()
check('2: no new external host — CSP (public/_headers) and the Pages Functions are unchanged; the lookup uses the site\'s own /geocode', headersChanged === '' && /fetch\(`\/geocode\?q=/.test(read('src/lib/location/places.js')) && !/https?:\/\//.test(stripComments(read('src/lib/location/places.js')) + stripComments(control) + stripComments(provider) + stripComments(ul)), headersChanged)

// ---- 3. Places list ---------------------------------------------------------------------------
const seed = JSON.parse(read('supabase/seed/sagar_division_places.json') || '{"places":[]}')
const places = seed.places
const D6 = ['Sagar', 'Damoh', 'Panna', 'Tikamgarh', 'Chhatarpur', 'Niwari']
check(`3: seed has about 50 places (${places.length}) across all six districts, each with EN + HI name, kind, coordinates and a source`, places.length >= 48 && places.length <= 60 && D6.every((d) => places.some((p) => p.district === d))
  && places.every((p) => p.name_en && /[ऀ-ॿ]/.test(p.name_hi) && ['district_hq', 'tehsil', 'town'].includes(p.kind) && Number.isFinite(p.lat) && Number.isFinite(p.lng) && /OpenStreetMap|Wikidata/.test(p.source) && typeof p.verified === 'boolean'))
check('3: all six district HQs are present and verified', D6.every((d) => places.some((p) => p.district === d && p.kind === 'district_hq' && p.name_en === d && p.verified)))
const outside = places.filter((p) => p.verified && (p.lat < 23.0 || p.lat > 25.5 || p.lng < 78.0 || p.lng > 80.7)).map((p) => p.name_en)
check('3: every verified point is inside the division\'s bounding box (the per-district polygon test ran when the seed was built)', outside.length === 0 && Object.values(seed.district_boundaries || {}).filter(Boolean).length === 6, outside.join(', '))
const unverified = places.filter((p) => !p.verified)
check(`3: unverified rows carry verified=false and a note (${unverified.map((p) => p.name_en).join(', ') || 'none'}) and the client never offers them`, unverified.every((p) => p.note) && /p\.verified !== false/.test(read('src/lib/location/places.js')))
const m57 = read('supabase/migrations/0057_places.sql')
check('3: migration 0057 creates public.places with the briefed columns', /create table if not exists public\.places/.test(m57) && ['name_en', 'name_hi', 'district', 'kind', 'lat', 'lng', 'source', 'verified'].every((c) => new RegExp(`\\n\\s+${c}\\s`).test(m57)))
check('3: migration 0057 — RLS on, public read only, no write policy or grant', /enable row level security/.test(m57) && /create policy places_read on public\.places for select/.test(m57) && count(m57, 'create policy') === 1 && /grant select on table public\.places to anon, authenticated/.test(m57) && !/grant (insert|update|delete|all)/i.test(m57) && !/for (insert|update|delete|all)\b/i.test(m57))
const notInSql = places.filter((p) => !m57.includes(`('${p.name_en.replace(/'/g, "''")}', '${p.name_hi}', '${p.district}', '${p.kind}', ${p.lat}, ${p.lng},`)).map((p) => p.name_en)
check(`3: migration 0057 loads the same ${places.length} rows as the seed file`, notInSql.length === 0, notInSql.join(', '))
check('3: migrations 0057 and 0058 have a header, a "not applied" line and a rollback note', [m57, read('supabase/migrations/0058_mandi_in_sagar_division.sql')].every((m) => /^-- Batch 7L-1/.test(m) && /NOT APPLIED by the batch that wrote it/.test(m) && /Rollback note:/.test(m)))

// ---- 4. Mandis for the whole division --------------------------------------------------------
const m58 = read('supabase/migrations/0058_mandi_in_sagar_division.sql')
const m58sql = m58.split('\n').filter((l) => !l.startsWith('--')).join('\n')
check('4: migration 0058 adds in_sagar_division (boolean, not null, default false), backfills the six districts and indexes it',
  /add column if not exists in_sagar_division boolean not null default false/.test(m58sql) && D6.every((d) => m58sql.includes(`'${d.toLowerCase()}'`)) && /create index if not exists mandi_prices_division_date_idx/.test(m58sql))
check('4: migration 0058 leaves is_sagar_district untouched', !/is_sagar_district/.test(m58sql))
const nextNums = readdirSync(join(ROOT, 'supabase/migrations')).map((f) => f.slice(0, 4)).sort()
check('4: the new migrations are the next numbers after 0056 (0057, 0058), nothing else added', nextNums.slice(-3).join(',') === '0056,0057,0058')
const mandiApi = read('src/lib/mandi/mandiApi.js')
check('4: the "local mandis" queries use in_sagar_division (falling back to is_sagar_district only if the column is missing)', /let localCol = 'in_sagar_division'/.test(mandiApi) && count(mandiApi, 'withLocalFlag((col)') === 3 && !/\.select\('[^']*is_sagar_district/.test(mandiApi) && !/r\.is_sagar_district|c\.is_sagar_district/.test(mandiApi))
const refresh = read('scripts/refresh-data.mjs'), backfill = read('scripts/backfill-mandi-history.mjs')
check('4: the ingestion covers the six districts and sets the flag (refresh + backfill), still setting is_sagar_district', D6.every((d) => refresh.includes(`'${d}'`)) && /in_sagar_division: p\.inDivision/.test(refresh) && /is_sagar_district: p\.isSagar/.test(refresh) && /in_sagar_division: DIVISION\.has/.test(backfill) && D6.every((d) => backfill.includes(`'${d.toLowerCase()}'`)))
check('4: the ingestion has a dry run that opens no database connection', /--dry-run/.test(refresh) && /if \(DRY_RUN\) \{ for \(const r of rows\) console\.log/.test(refresh) && /let _supabase = null/.test(refresh))
check('4: the workflow file is unchanged (nothing was scheduled or run)', (() => { try { return execSync('git diff --name-only pre-7l1 -- .github', { cwd: ROOT, encoding: 'utf8' }).trim() === '' } catch { return false } })())
check('4: nearest-mandi ranking takes its centre from the location object', /const \{ center \} = useUserLocation\(\)/.test(read('src/screens/Msp.jsx')) && /marketDistanceKm\(center, r\.market, r\.district\)/.test(read('src/screens/Msp.jsx')))
const coords = read('src/content/mandiCoords.js')
check('4: mandi distance knows the other five district HQs', ['Damoh', 'Panna', 'Tikamgarh', 'Chhatarpur', 'Niwari'].every((d) => new RegExp(`\\n  ${d}: \\{ lat:`).test(coords)))

// ---- 5. Browser run --------------------------------------------------------------------------
const bc = has('docs/review/batch7l1/browser-check.json') ? JSON.parse(read('docs/review/batch7l1/browser-check.json')) : null
if (!bc) say('NOTE  5: docs/review/batch7l1/browser-check.json not found — run `node scripts/shots-batch7l1.mjs`')
else {
  check(`5: browser run — ${bc.results.length} checks, all passed`, bc.failures === 0 && bc.results.length >= 100, bc.results.filter((r) => !r.ok).map((r) => r.name).slice(0, 5).join('; '))
  for (const step of ['1 granted', '2 saved', '3 typed', '4 did-you-mean', '5 picker']) {
    const rs = bc.results.filter((r) => r.name.includes(` ${step}:`))
    const combos = new Set(rs.map((r) => r.name.split(' ')[0]))
    check(`5: step "${step}" ran in Hindi and English at 390 and 1440`, ['hi-390', 'en-390', 'hi-1440', 'en-1440'].every((c) => combos.has(c)) && rs.every((r) => r.ok))
  }
  check('5: no pincode box on home / weather / browse in the browser', bc.results.filter((r) => /no pincode box/.test(r.name)).length === 12 && bc.results.filter((r) => /no pincode box/.test(r.name)).every((r) => r.ok))
  const shots = readdirSync(join(ROOT, 'docs/review/batch7l1')).filter((f) => f.endsWith('.png'))
  check(`5: screenshots saved (${shots.length})`, shots.length >= 36)
}

say(`\n${pass} passed, ${fail} failed`)
mkdirSync(join(ROOT, 'docs/review/batch7l1'), { recursive: true })
writeFileSync(join(ROOT, 'docs/review/batch7l1/VERIFY_OUTPUT.txt'), lines.join('\n') + '\n')
process.exit(fail ? 1 : 0)
