// PERMANENT tests for the RE-ARCHITECTED Kisan Mela discovery pipeline (scraper → scoped search →
// per-candidate verification). PURE logic against MOCKED HTML + mocked AI verdicts. NEVER calls the
// live Anthropic API or any aggregator site. Run: node scripts/test/p_mela_rearch.mjs
import {
  parseTaazaBhav, parseKisaanHelpline, leadChanged, robotsAllows, ScraperError,
} from '../mela/scraper.mjs'
import {
  candidatesMatch, groupCandidates, selectForVerification, datePassed,
  parseVerdict, interpretVerdict, buildPromotionRow, REVERIFY_UNVERIFIABLE_DAYS,
} from '../mela/verify.mjs'
import { parseBroadLeads } from '../mela/broadsearch.mjs'
import { selectDigestMelas } from '../../src/lib/mela/melaDigest.js'

let pass = 0, fail = 0
const ok = (n, c, e = '') => { c ? (pass++, console.log('PASS ' + n)) : (fail++, console.log('FAIL ' + n + (e ? ' — ' + e : ''))) }
const threw = (fn, Ctor) => { try { fn(); return false } catch (e) { return Ctor ? e instanceof Ctor : true } }

// ============================================================================================
// SCRAPER — parses mocked structures, reads ONLY upcoming (never past), fails LOUD on mismatch
// ============================================================================================

const TAAZABHAV_HTML = `
<html><head>
  <script type="application/ld+json">{"@type":"WebSite","name":"TaazaBhav"}</script>
  <script type="application/ld+json">{"@type":"ItemList","itemListElement":[
    {"name":"Bharat Agri Tech, Indore (3rd) — 10 Feb 2027","url":"https://taazabhav.com/bharat-agri-tech-indore"},
    {"name":"KVK Krishi Mela, Sagar — Mar 2027","url":"https://taazabhav.com/kvk-sagar"}
  ]}</script>
</head><body>…</body></html>`

const tb = parseTaazaBhav(TAAZABHAV_HTML)
ok('TaazaBhav: parses the JSON-LD ItemList (2 leads)', tb.length === 2, `got ${tb.length}`)
ok('TaazaBhav: name/date split on the dash', tb[0].raw_name === 'Bharat Agri Tech, Indore (3rd)' && tb[0].raw_date_text === '10 Feb 2027', JSON.stringify(tb[0]))
ok('TaazaBhav: venue from last comma segment, parens stripped', tb[0].raw_venue === 'Indore', tb[0].raw_venue)
ok('TaazaBhav: source_name + source_url captured', tb[0].source_name === 'taazabhav' && /taazabhav\.com/.test(tb[0].source_url))
ok('TaazaBhav: fails LOUD (ScraperError) when no ItemList', threw(() => parseTaazaBhav('<html>no json-ld here</html>'), ScraperError))
ok('TaazaBhav: fails LOUD when ItemList is present but empty (not a silent [])', threw(() => parseTaazaBhav('<script type="application/ld+json">{"@type":"ItemList","itemListElement":[]}</script>'), ScraperError))

const KH_HTML = `
<html><body>
  <h2>Current Events</h2>
  <a href="https://www.kisaanhelpline.com/bharat-agri-tech-2027"><img alt="Bharat Agri Tech 2027" src="a.jpg"> on 10 Feb 2027 at Indore</a>
  <h2>Upcoming Events</h2>
  <a href="https://www.kisaanhelpline.com/farm-tech-india-2027"><img alt="Farm-Tech India 2027" src="b.jpg"> 5 Mar 2027 Bhopal</a>
  <h2>Past Events</h2>
  <a href="https://www.kisaanhelpline.com/old-mela-2020"><img alt="Old Mela 2020" src="c.jpg"> 3 Jan 2020</a>
</body></html>`

const kh = parseKisaanHelpline(KH_HTML)
ok('kisaanhelpline: parses upcoming cards (2 leads)', kh.length === 2, `got ${kh.length}`)
ok('kisaanhelpline: reads ONLY upcoming — the Past Events card is NOT parsed', !kh.some((l) => /old-mela-2020/.test(l.source_url)))
ok('kisaanhelpline: captures the two real hyper-local events', kh.some((l) => l.raw_name === 'Bharat Agri Tech 2027') && kh.some((l) => l.raw_name === 'Farm-Tech India 2027'))
ok('kisaanhelpline: best-effort date parsed from card text', kh.find((l) => l.raw_name === 'Bharat Agri Tech 2027').raw_date_text === '10 Feb 2027')
ok('kisaanhelpline: fails LOUD when the events section is missing', threw(() => parseKisaanHelpline('<html><body>nothing relevant</body></html>'), ScraperError))
ok('kisaanhelpline: fails LOUD when section present but no cards parse', threw(() => parseKisaanHelpline('<h2>Upcoming Events</h2><p>no cards</p><h2>Past Events</h2>'), ScraperError))

// robots.txt (pure)
ok('robots: empty Disallow → allowed', robotsAllows('User-agent: *\nDisallow:', '/agriculture-events') === true)
ok('robots: matching Disallow path → blocked', robotsAllows('User-agent: *\nDisallow: /agriculture-events', '/agriculture-events') === false)
ok('robots: no robots.txt → allowed', robotsAllows('', '/kisan-mela') === true)

// 2b-i re-verify trigger
ok('leadChanged: date text change → changed', leadChanged({ raw_name: 'X', raw_venue: 'A', raw_date_text: 'Feb 2027' }, { raw_name: 'X', raw_venue: 'A', raw_date_text: 'Mar 2027' }) === true)
ok('leadChanged: identical (whitespace/case only) → unchanged', leadChanged({ raw_name: 'X Mela', raw_venue: 'A', raw_date_text: 'Feb 2027' }, { raw_name: 'x  mela', raw_venue: 'a', raw_date_text: 'feb 2027' }) === false)

// ============================================================================================
// DEDUP / CORROBORATION — same event found by two sources → one group, both sources recorded
// ============================================================================================

const fromTB = { source_name: 'taazabhav', source_url: 'https://taazabhav.com/bharat-agri-tech-indore', raw_name: 'Bharat Agri Tech, Indore', raw_state: 'Madhya Pradesh' }
const fromKH = { source_name: 'kisaanhelpline', source_url: 'https://www.kisaanhelpline.com/bharat-agri-tech-2027', raw_name: 'Bharat Agri Tech 2027', raw_state: '' }
const unrelated = { source_name: 'ai_broad_search', source_url: 'https://kvk.example.gov.in/x', raw_name: 'Horticulture Kisan Mela, Nashik', raw_state: 'Maharashtra' }

ok('dedup: same event across two sources matches', candidatesMatch(fromTB, fromKH) === true)
ok('dedup: unrelated event does NOT match', candidatesMatch(fromTB, unrelated) === false)
ok('dedup: identical source_url always matches', candidatesMatch({ source_url: 'https://x/a', raw_name: 'Totally Different' }, { source_url: 'https://x/a', raw_name: 'Also Different' }) === true)
const groups = groupCandidates([fromTB, fromKH, unrelated])
ok('dedup: 3 candidates → 2 groups (the duplicate pair merges)', groups.length === 2, `got ${groups.length}`)
ok('dedup: the merged group holds both sources', groups.find((g) => g.length === 2)?.map((c) => c.source_name).sort().join(',') === 'kisaanhelpline,taazabhav')

// ============================================================================================
// VERIFICATION — the four outcomes, each with the right status + reason
// ============================================================================================
const lead = { raw_name: 'Pusa Mela (stale aggregator wording)', raw_venue: 'IARI', raw_state: 'Delhi', raw_date_text: '2025-02-20', raw_highlights: 'aggregator blurb — must NOT be published', source_url: 'https://aggregator.example/pusa' }

// 1) confirmed exactly as claimed
const vConfirmed = { verdict: 'confirmed', primary_source_url: 'https://iari.res.in/pusa-mela', country: 'India', confirmed_state: 'Delhi', confirmed_venue: 'IARI Pusa', confirmed_date_start: '2027-02-20', is_date_confirmed: true, reason: 'official IARI page confirms' }
const iConfirmed = interpretVerdict(vConfirmed, lead)
ok('verify #1 confirmed-exact → status verified', iConfirmed.status === 'verified', iConfirmed.status)
ok('verify #1 records the primary source url', iConfirmed.primary_source_url === 'https://iari.res.in/pusa-mela')

// 2) confirmed BUT with corrected date/venue → still verified, with updated details (4d-i)
const vCorrected = { verdict: 'confirmed', primary_source_url: 'https://iari.res.in/pusa-mela', country: 'India', confirmed_state: 'Delhi', confirmed_venue: 'IARI New Campus', confirmed_date_start: '2027-03-01', confirmed_date_end: '2027-03-03', is_date_confirmed: true, confirmed_name_hi: 'पूसा कृषि मेला', highlights_hi: 'प्राथमिक स्रोत से विवरण', category_tags: ['seeds', 'nonsense_tag'], reason: 'date moved per official page' }
const iCorrected = interpretVerdict(vCorrected, lead)
ok('verify #2 confirmed-with-corrections → NOT rejected, still verified', iCorrected.status === 'verified', iCorrected.status)
const rowCorrected = buildPromotionRow(vCorrected, lead, [lead.source_url], '2026-10-01')
ok('verify #2 promotion uses the CORRECTED primary-source date, not the stale lead date', rowCorrected.event_date_start === '2027-03-01')
ok('verify #2 promotion uses the CORRECTED venue', rowCorrected.venue === 'IARI New Campus')
ok('verify #2 drops non-allowlisted tags', rowCorrected.category_tags.includes('seeds') && !rowCorrected.category_tags.includes('nonsense_tag'))

// 3) actively contradicted → rejected
const vContra = { verdict: 'contradicted', primary_source_url: 'https://iari.res.in/notice', reason: 'official source says event cancelled' }
const iContra = interpretVerdict(vContra, lead)
ok('verify #3 contradicted → status rejected', iContra.status === 'rejected', iContra.status)
ok('verify #3 rejected carries a reason', /cancel/i.test(iContra.reason))

// 4) nothing found → unverifiable
const iNotFound = interpretVerdict({ verdict: 'not_found', primary_source_url: null, reason: 'no official page found' }, lead)
ok('verify #4 not_found → status unverifiable', iNotFound.status === 'unverifiable', iNotFound.status)
ok('verify #4 confirmed-but-no-primary-source → unverifiable (not verified)', interpretVerdict({ verdict: 'confirmed', primary_source_url: null }, lead).status === 'unverifiable')
ok('verify: unparseable verdict → unverifiable (fail safe)', interpretVerdict(null, lead).status === 'unverifiable')
ok('verify: non-India confirmed → NOT verified', interpretVerdict({ verdict: 'confirmed', primary_source_url: 'https://x/y', country: 'USA', confirmed_state: 'California', confirmed_venue: 'Madera' }, lead).status !== 'verified')

// parseVerdict (pure JSON extraction, tolerant of fences/prose)
ok('parseVerdict: strips ```json fences', parseVerdict('```json\n{"verdict":"confirmed"}\n```')?.verdict === 'confirmed')
ok('parseVerdict: extracts object from surrounding prose', parseVerdict('Here is the result: {"verdict":"not_found"} done')?.verdict === 'not_found')
ok('parseVerdict: garbage → null', parseVerdict('no json at all') === null)

// ============================================================================================
// PUBLIC DESCRIPTION comes from the PRIMARY SOURCE, not the aggregator lead's wording
// ============================================================================================
ok('promotion name_hi comes from primary source, NOT the stale aggregator lead', rowCorrected.name_hi === 'पूसा कृषि मेला' && rowCorrected.name_hi !== lead.raw_name)
ok('promotion highlights come from primary source, NOT the aggregator blurb', rowCorrected.highlights_hi === 'प्राथमिक स्रोत से विवरण' && rowCorrected.highlights_hi !== lead.raw_highlights)

// ============================================================================================
// CORROBORATION — promotion records every contributing source; badge logic (>=2 sources)
// ============================================================================================
const multi = buildPromotionRow(vConfirmed, fromTB, [fromTB.source_url, fromKH.source_url], '2026-10-01')
ok('promotion source_urls records BOTH corroborating sources + the primary', multi.source_urls.length >= 3 && multi.source_urls.includes(fromTB.source_url) && multi.source_urls.includes(fromKH.source_url) && multi.source_urls.includes(vConfirmed.primary_source_url))
// Badge logic mirrors KisanMela.jsx: distinct real http(s) sources across source_urls[] + source_url.
const badgeSources = (m) => [...new Set([...(Array.isArray(m.source_urls) ? m.source_urls : []), m.source_url].filter((u) => /^https?:\/\//i.test(u || '')))]
ok('badge: >=2 distinct sources → multi-source true', badgeSources(multi).length >= 2)
// Single-source row (e.g. a user submission, or where source_url IS the only source) → no badge.
ok('badge: single source → multi-source false', badgeSources({ source_url: 'https://pau.edu/', source_urls: [] }).length < 2, `got ${badgeSources({ source_url: 'https://pau.edu/', source_urls: [] }).length}`)
ok('badge: dedups a source repeated across source_url + source_urls', badgeSources({ source_url: 'https://x/a', source_urls: ['https://x/a'] }).length === 1)

// ============================================================================================
// 4f LIFECYCLE SELECTION — pending always; verified/rejected never; unverifiable on a schedule
// ============================================================================================
const asOf = '2026-10-01'
ok('select: pending is always due', selectForVerification([{ verification_status: 'pending' }], asOf).length === 1)
ok('select: verified is never re-verified', selectForVerification([{ verification_status: 'verified' }], asOf).length === 0)
ok('select: rejected is never re-verified', selectForVerification([{ verification_status: 'rejected' }], asOf).length === 0)
ok('select: unverifiable w/ no prior attempt → due', selectForVerification([{ verification_status: 'unverifiable', last_verification_attempt_at: null, raw_date_text: 'Feb 2027' }], asOf).length === 1)
ok('select: unverifiable attempted yesterday → NOT due (within window)', selectForVerification([{ verification_status: 'unverifiable', last_verification_attempt_at: '2026-09-30', raw_date_text: 'Feb 2027' }], asOf).length === 0)
ok(`select: unverifiable last tried >${REVERIFY_UNVERIFIABLE_DAYS}d ago → due again`, selectForVerification([{ verification_status: 'unverifiable', last_verification_attempt_at: '2026-09-01', raw_date_text: 'Feb 2027' }], asOf).length === 1)
ok('select: unverifiable whose claimed date has passed → given up', selectForVerification([{ verification_status: 'unverifiable', last_verification_attempt_at: null, raw_date_text: '10 Feb 2026' }], asOf).length === 0)
ok('datePassed: past month/year window → true', datePassed({ raw_date_text: 'Feb 2026' }, asOf) === true)
ok('datePassed: future window → false', datePassed({ raw_date_text: 'Feb 2027' }, asOf) === false)

// ============================================================================================
// SCOPED broad-search parsing — India-only, every lead needs a source_url
// ============================================================================================
const bl = parseBroadLeads(JSON.stringify([
  { name: 'KVK Kisan Mela, Nashik', venue: 'KVK Nashik', state: 'Maharashtra', country: 'India', source_url: 'https://kvknashik.gov.in/mela' },
  { name: 'California Kisan Mela', venue: 'Madera Fairgrounds', state: 'California', country: 'USA', source_url: 'https://x.us/mela' },
  { name: 'No-URL Mela', venue: 'Some Ground', state: 'Bihar', country: 'India', source_url: '' },
]))
ok('broad search: keeps the India KVK lead', bl.some((l) => /Nashik/.test(l.raw_name)))
ok('broad search: drops the non-India (California) lead', !bl.some((l) => /California/.test(l.raw_name)))
ok('broad search: drops the lead with no source_url', !bl.some((l) => /No-URL/.test(l.raw_name)))
ok('broad search: tags leads with source_name=ai_broad_search', bl.every((l) => l.source_name === 'ai_broad_search'))

// ============================================================================================
// DIGEST REGRESSION — a row that arrived via the NEW verification-promotion pathway is still
// correctly windowed by the (original build's) digest selector. Direct check, not an assumption.
// ============================================================================================
const vWithin = { verdict: 'confirmed', primary_source_url: 'https://iari.res.in/x', country: 'India', confirmed_state: 'Delhi', confirmed_venue: 'IARI', confirmed_date_start: '2026-10-03', confirmed_date_end: '2026-10-03', is_date_confirmed: true }
const promotedRow = buildPromotionRow(vWithin, lead, [lead.source_url], asOf)
ok('promotion row shape: is_date_confirmed=true + ISO start (digest prerequisites)', promotedRow.is_date_confirmed === true && /^\d{4}-\d{2}-\d{2}$/.test(promotedRow.event_date_start))
ok('digest: promotion-pathway row within the 3-day window IS selected', selectDigestMelas([promotedRow], asOf).length === 1)
const vFar = { ...vWithin, confirmed_date_start: '2026-11-01', confirmed_date_end: '2026-11-01' }
ok('digest: promotion-pathway row outside the window is NOT selected', selectDigestMelas([buildPromotionRow(vFar, lead, [lead.source_url], asOf)], asOf).length === 0)
const vUnconf = { verdict: 'confirmed', primary_source_url: 'https://iari.res.in/x', country: 'India', confirmed_state: 'Delhi', confirmed_venue: 'IARI', is_date_confirmed: false, expected_period: 'Oct 2026' }
ok('digest: promotion-pathway "अपेक्षित" (unconfirmed) row is excluded', selectDigestMelas([buildPromotionRow(vUnconf, lead, [lead.source_url], asOf)], asOf).length === 0)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
