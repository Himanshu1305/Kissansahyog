// PERMANENT tests for the Kisan Mela discovery pipeline — PURE logic against MOCKED
// extraction objects. NEVER calls the live Anthropic API or any aggregator site.
// Run: node scripts/test/p_mela_pipeline.mjs
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  validateMela, isIndiaScoped, contactAllowed, normalizeMela, normalizeDates,
  sameEvent, findDuplicate, mergeMela, lifecycleDecision, expectedPeriodEnd, MAX_SEARCHES,
} from '../mela/pipeline.mjs'

let pass = 0, fail = 0
const ok = (n, c, e = '') => { c ? (pass++, console.log('PASS ' + n)) : (fail++, console.log('FAIL ' + n + (e ? ' — ' + e : ''))) }
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const base = (o = {}) => ({
  name_hi: 'टेस्ट मेला', name_en: 'Test Mela', venue: 'KVK Ground', state: 'Madhya Pradesh', district: 'Sagar',
  country: 'India', category_tags: ['seeds'], source_url: 'https://kvk.example.gov.in/mela', source_is_primary: true,
  date_confirmed: true, event_date_start: '2027-02-10', event_date_end: '2027-02-12', contact_source: 'none', ...o,
})

// --- rule 3: no source URL → rejected (negative) ---
ok('no source_url → rejected', validateMela(base({ source_url: '' })).ok === false && validateMela(base({ source_url: '' })).reason === 'no_source_url')
ok('non-URL source → rejected', validateMela(base({ source_url: 'user-submission' })).ok === false)
ok('valid entry → accepted (positive)', validateMela(base()).ok === true)

// --- rule 2: unconfirmed date → is_date_confirmed=false + expected_period (edge) ---
const unconf = validateMela(base({ date_confirmed: false, event_date_start: null, expected_period: 'Feb 2027' }))
ok('unconfirmed date → is_date_confirmed=false + expected_period kept', unconf.ok && unconf.row.is_date_confirmed === false && unconf.row.expected_period === 'Feb 2027')
ok('unconfirmed with NO expected period → rejected', validateMela(base({ date_confirmed: false, event_date_start: null, expected_period: '' })).ok === false)
ok('a "confirmed" flag with no real start date is NOT treated as confirmed', normalizeDates(base({ date_confirmed: true, event_date_start: null })).is_date_confirmed === false)

// --- 2a: India scoping (negative — the real California risk) ---
ok('California "Kisan Mela" discarded', isIndiaScoped(base({ country: 'USA', state: 'California', venue: 'Madera Fairgrounds' })) === false)
ok('explicit non-India country discarded', validateMela(base({ country: 'Canada', state: '' })).ok === false)
ok('Indian state accepted', isIndiaScoped(base({ country: '', state: 'Punjab' })) === true)

// --- 2d-i: contact only from the event's own official source (edge) ---
ok('contact from a news mention is dropped', contactAllowed(base({ contact_source: 'news_mention' })) === false)
const newsContact = normalizeMela(base({ contact_source: 'news_mention', contact_name: 'Someone', contact_number: '9999999999' }))
ok('news-mention contact → contact fields empty', newsContact.contact_name === null && newsContact.contact_number === null)
const offContact = normalizeMela(base({ contact_source: 'official_event_page', contact_name: 'Dr. KVK', contact_number: '9876543210' }))
ok('official-page contact → contact kept', offContact.contact_name === 'Dr. KVK' && offContact.contact_number === '9876543210')

// --- category tags filtered to the allowed set ---
ok('bogus tags dropped, valid kept', JSON.stringify(normalizeMela(base({ category_tags: ['seeds', 'bogus', 'livestock'] })).category_tags) === JSON.stringify(['seeds', 'livestock']))

// --- 2e dedup: same event, differently phrased names → merged, not duplicated ---
const a = normalizeMela(base({ name_hi: 'सागर किसान मेला', venue: 'KVK Ground', state: 'Madhya Pradesh', event_date_start: '2027-02-10' }))
const b = normalizeMela(base({ name_hi: 'Krishi Mela, Sagar KVK', name_en: 'Krishi Mela Sagar', venue: 'KVK Ground', state: 'Madhya Pradesh', event_date_start: '2027-02-11' }))
ok('same venue+state, names differ, dates ~overlap → same event', sameEvent(a, b) === true)
ok('findDuplicate locates it', !!findDuplicate([a], b))
const diffVenue = normalizeMela(base({ venue: 'Other Ground' }))
ok('different venue → NOT same event', sameEvent(a, diffVenue) === false)
const merged = mergeMela({ ...a, name_en: null }, b)
ok('merge fills blanks (name_en) + unions tags', merged.name_en === 'Krishi Mela Sagar' && merged.category_tags.includes('seeds'))

// --- rule 5 lifecycle: a confirmed past end → deactivate (positive); future → keep (negative) ---
ok('confirmed past end → deactivate', lifecycleDecision({ is_date_confirmed: true, event_date_end: '2026-01-01' }, '2026-10-01').deactivate === true)
ok('confirmed future → keep', lifecycleDecision({ is_date_confirmed: true, event_date_start: '2027-02-10', event_date_end: '2027-02-12' }, '2026-10-01').deactivate === false)
ok('expired expected period → deactivate', lifecycleDecision({ is_date_confirmed: false, expected_period: 'Feb 2026' }, '2026-10-01').deactivate === true)
ok('future expected period → keep', lifecycleDecision({ is_date_confirmed: false, expected_period: 'Feb 2027' }, '2026-10-01').deactivate === false)
ok('expectedPeriodEnd parses "Feb 2027"', expectedPeriodEnd('Feb 2027') === '2027-02-28')

// --- 2a-ii: a bounded search cap exists ---
ok('MAX_SEARCHES is a sane bounded cap', Number.isInteger(MAX_SEARCHES) && MAX_SEARCHES > 0 && MAX_SEARCHES <= 25)

// --- 2c: missing ANTHROPIC_API_KEY → the runner fails fast (exit 1), touches nothing ---
const env = { ...process.env }; delete env.ANTHROPIC_API_KEY
const r = spawnSync(process.execPath, [join(ROOT, 'scripts', 'discover-melas.mjs')], { env, encoding: 'utf8', timeout: 30000 })
ok('runner fails fast (exit 1) without ANTHROPIC_API_KEY', r.status === 1)
ok('fail-fast message names the missing secret', /ANTHROPIC_API_KEY/.test((r.stderr || '') + (r.stdout || '')))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
