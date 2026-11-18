// Batch 22D - the statement rules (filter, dates, category names, CSV, paging), the strings, and the wiring of the screen.
// The screen itself is exercised in the browser (tests/e2e20/mitra-statement.spec.js). Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  STATEMENT_PAGE, STATEMENT_CSV_PAGE, STATEMENT_CSV_COLUMNS, istDate, istIso, categoryName, filterRows, slugName, statementFileName, statementCsv, fetchAllRows,
} from '../../src/lib/mitra/statementRules.js'
import { statementFor } from '../../scripts/batch20/mitra-model.mjs'
import { mitraStrings } from '../../src/lib/i18n/mitraStrings.js'
import { strings } from '../../src/lib/i18n/strings.js'
import { CATEGORIES, CATEGORY_META } from '../../src/lib/listings/catalog.js'

const src = (f) => readFileSync(f, 'utf8')
const noComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

const row = (o = {}) => ({ kind: 'farmer', ref_id: 'p1', name: 'TEST Ram Lal', village: 'Khurai', masked_phone: '******0001', category: 'equipment', on_date: '2026-11-18T10:00:00Z', amount_rupees: 1, paid: false, paid_on: null, payment_id: null, blocked: false, ...o })

test('dates are India time and read like "18 Nov 2026"; a date-only value is that calendar day; bad input gives an empty string', () => {
  assert.equal(istDate('2026-11-18T10:00:00Z', 'en'), '18 Nov 2026')
  assert.equal(istDate('2026-11-17T20:00:00Z', 'en'), '18 Nov 2026', '01:30 on the 18th in India')
  assert.equal(istDate('2026-11-09', 'en'), '9 Nov 2026')
  assert.equal(istIso('2026-11-17T20:00:00Z'), '2026-11-18')
  assert.equal(istDate(null), '')
  assert.equal(istDate('not a date'), '')
  assert.ok(/[ऀ-ॿ]/.test(istDate('2026-11-18T10:00:00Z', 'hi')))
})

test('category names come from the catalog in both languages and an unknown or missing key is never shown raw', () => {
  for (const c of CATEGORIES) {
    assert.equal(categoryName(c, 'en'), CATEGORY_META[c].en)
    assert.equal(categoryName(c, 'hi'), CATEGORY_META[c].hi)
  }
  assert.equal(categoryName('drone_didi', 'en'), 'Drone Didi')
  assert.equal(categoryName('mystery_key', 'en'), '')
  assert.equal(categoryName(null, 'hi'), '')
})

test('filter chips: all, unpaid, paid (client side)', () => {
  const rows = [row({ ref_id: 1, paid: true }), row({ ref_id: 2 }), row({ ref_id: 3, kind: 'ad', paid: true })]
  assert.equal(filterRows(rows, 'all').length, 3)
  assert.deepEqual(filterRows(rows, 'paid').map((r) => r.ref_id), [1, 3])
  assert.deepEqual(filterRows(rows, 'unpaid').map((r) => r.ref_id), [2])
})

test('file name: kissan-mitra-<name-slug>-<date>.csv, with a safe fallback for a Hindi-only name', () => {
  assert.equal(slugName('Asha Devi'), 'asha-devi')
  assert.equal(slugName('  Bholu  Ram!! (Bina) '), 'bholu-ram-bina')
  assert.equal(slugName('आशा देवी'), 'mitra')
  assert.equal(statementFileName('Asha Devi', '2026-11-18'), 'kissan-mitra-asha-devi-2026-11-18.csv')
})

test('CSV: the eight columns, one row per line, India-time dates, readable category, paid_on, NO phone numbers', () => {
  const csv = statementCsv([
    row({ paid: true, paid_on: '2026-11-10' }),
    row({ kind: 'ad', ref_id: 'ad-1', name: 'TEST ad one', village: null, masked_phone: null, category: null, amount_rupees: 5, on_date: '2026-11-15T05:00:00Z' }),
    row({ ref_id: 'p3', name: 'TEST Sita', village: 'Rahatgarh', category: 'drone_didi', amount_rupees: null, on_date: '2026-11-01T05:00:00Z' }),
  ], 'en')
  const lines = csv.trimEnd().split('\n')
  assert.equal(lines[0], 'date,kind,name,village,category,amount_rupees,status,paid_on')
  assert.deepEqual(STATEMENT_CSV_COLUMNS, lines[0].split(','))
  assert.equal(lines[1], '2026-11-18,farmer,TEST Ram Lal,Khurai,Equipment,1,paid,2026-11-10')
  assert.equal(lines[2], '2026-11-15,ad,TEST ad one,,,5,unpaid,')
  assert.equal(lines[3], '2026-11-01,farmer,TEST Sita,Rahatgarh,Drone Didi,,unpaid,', 'a blank amount means the rate was not set')
  assert.ok(csv.endsWith('\n'))
  assert.ok(!/\d{10}/.test(csv) && !/\*{3}/.test(csv) && !/phone/i.test(csv), 'no phone numbers, masked or full')
})

test('CSV is spreadsheet-safe: a name that starts with = + - @ gets an apostrophe; commas and quotes are quoted', () => {
  const csv = statementCsv([
    row({ name: '=HYPERLINK("http://x")' }), row({ name: '+91 98', village: '-bad' }), row({ name: '@sum', village: 'A, B' }), row({ name: 'He said "hi"' }),
  ], 'en')
  const lines = csv.trimEnd().split('\n')
  assert.ok(lines[1].includes(`"'=HYPERLINK(""http://x"")"`))
  assert.ok(lines[2].startsWith("2026-11-18,farmer,'+91 98,'-bad,"))
  assert.ok(lines[3].includes(",'@sum,") && lines[3].includes('"A, B"'))
  assert.ok(lines[4].includes('"He said ""hi"""'))
  for (const l of lines.slice(1)) for (const cellText of l.split(',')) assert.ok(!/^[=+\-@]/.test(cellText), `an unprefixed formula cell: ${cellText}`)
})

test('CSV in Hindi uses the Hindi category names; the file is written with a BOM and as UTF-8 by the screen', () => {
  assert.ok(statementCsv([row({ category: 'labor' })], 'hi').includes(CATEGORY_META.labor.hi))
  const s = src('src/screens/admin/tabs/MitraStatement.jsx')
  assert.match(s, /new Blob\(\[`\$\{BOM\}\$\{statementCsv\(all, lang\)\}`\], \{ type: 'text\/csv;charset=utf-8' \}\)/)
  assert.match(s, /const BOM = String\.fromCharCode\(0xFEFF\)/)
  assert.match(s, /statementFileName\(/)
})

test('fetchAllRows reads every page (500 at a time), and always stops: at the total, at a short page, at an empty page', async () => {
  const s = { mitras: [{ id: 'A', display_name: 'A', is_active: true, rate_farmer_rupees: 1, rate_business_rupees: 1 }], profiles: [], payments: [], listings: [], announcements: [] }
  for (let i = 1; i <= 1203; i++) {
    s.profiles.push({ id: `p${i}`, full_name: `F${i}`, village_town: 'V', phone: '9000000000', created_at: '2026-01-01T00:00:00Z', is_blocked: false, mitra_id: 'A', mitra_paid_id: null })
    s.listings.push({ id: `l${i}`, user_id: `p${i}`, listing_type: 'offer', status: 'active', admin_disabled_at: null, category: 'labor', created_at: new Date(Date.parse('2026-06-01T00:00:00Z') + i * 1000).toISOString() })
  }
  const calls = []
  const all = await fetchAllRows(async (limit, offset) => { calls.push([limit, offset]); return statementFor(s, 'A', { limit, offset }) })
  assert.equal(all.length, 1203)
  assert.equal(new Set(all.map((r) => r.ref_id)).size, 1203, 'no row twice, none missed')
  assert.deepEqual(calls, [[500, 0], [500, 500], [500, 1000]])
  assert.equal(STATEMENT_CSV_PAGE, 500)
  // exactly one full page: stops because the total is reached (no extra empty call)
  const one = { ...s, profiles: s.profiles.slice(0, 500), listings: s.listings.slice(0, 500) }
  let n = 0
  assert.equal((await fetchAllRows(async (l, o) => { n++; return statementFor(one, 'A', { limit: l, offset: o }) })).length, 500)
  assert.equal(n, 1)
  // a server that keeps answering the same full page without a total cannot loop for ever
  let m = 0
  const stuck = await fetchAllRows(async () => { m++; return { rows: [row()], totals: { farmers: 1e9, ads: 0 } } }, 1)
  assert.ok(m <= 1000 && stuck.length === m)
  // an empty answer ends it
  assert.deepEqual(await fetchAllRows(async () => ({ rows: [], totals: { farmers: 5, ads: 0 } })), [])
  // an error is not swallowed here (the screen shows its own message)
  await assert.rejects(fetchAllRows(async () => { throw new Error('boom') }), /boom/)
})

test('the screen asks for 50 rows at a time; the function allows 500', () => {
  assert.equal(STATEMENT_PAGE, 50)
})

// ---------- strings ----------
const NEW_KEYS = ['mitra_btn_statement', 'mitra_st_title', 'mitra_st_rate_farmer', 'mitra_st_rate_ad', 'mitra_st_farmers', 'mitra_st_earned', 'mitra_st_paid', 'mitra_st_due', 'mitra_st_waiting',
  'mitra_st_f_all', 'mitra_st_offer', 'mitra_st_offer_plain', 'mitra_st_amount', 'mitra_st_paid_on', 'mitra_st_more', 'mitra_st_csv', 'mitra_st_csv_busy', 'mitra_st_csv_error', 'mitra_st_empty',
  'mitra_st_filter_empty', 'mitra_st_rate_note']

test('every new string has Hindi and English, the same {placeholders}, Devanagari only in Hindi, and is merged into strings.js', () => {
  for (const k of NEW_KEYS) {
    const v = mitraStrings[k]
    assert.ok(v && v.hi && v.en, k)
    assert.deepEqual((v.hi.match(/\{\w+\}/g) || []).sort(), (v.en.match(/\{\w+\}/g) || []).sort(), k)
    assert.ok(k === 'mitra_st_amount' ? true : /[ऀ-ॿ]/.test(v.hi), `${k} Hindi is Devanagari`)
    assert.ok(!/[ऀ-ॿ]/.test(v.en), `${k} English has no Devanagari`)
    assert.ok(strings[k], `${k} is merged into strings.js`)
  }
  assert.equal(mitraStrings.mitra_btn_statement.hi, 'विवरण')
  assert.equal(mitraStrings.mitra_btn_statement.en, 'Statement')
  assert.equal(mitraStrings.mitra_st_csv.en, 'Download statement (CSV)')
  assert.equal(mitraStrings.mitra_st_more.en, 'Load more')
  assert.equal(mitraStrings.mitra_st_amount.en, 'Rs {a}')
  assert.equal(mitraStrings.mitra_st_paid_on.en, 'Paid on {d}')
  assert.equal(mitraStrings.mitra_st_offer.en, 'Service offer: {c}')
  assert.ok(/किसान मित्र/.test(mitraStrings.mitra_st_empty.hi) && /Kissan Mitra/.test(mitraStrings.mitra_st_empty.en))
})

test('every string key used by the statement screen exists, and the screen has no Hindi text of its own', () => {
  const s = src('src/screens/admin/tabs/MitraStatement.jsx')
  const used = [...new Set([...s.matchAll(/\bt\('(\w+)'\)/g)].map((m) => m[1]))]
  assert.ok(used.length >= 15)
  for (const k of used) assert.ok(strings[k] && strings[k].hi && strings[k].en, `${k} has both languages`)
  assert.ok(!/[ऀ-ॿ]/.test(noComments(s)), 'Hindi lives only in the string files')
  assert.ok(!/[ऀ-ॿ]/.test(noComments(src('src/lib/mitra/statementRules.js'))))
})

// ---------- wiring ----------
test('the Statement button is on each Mitra card next to the old "Service offers and ads" button, which is unchanged; no new route', () => {
  const p = src('src/screens/admin/tabs/MitraPanel.jsx')
  assert.match(p, /data-testid="mitra-regs" className=\{btnPlain\} onClick=\{\(\) => onRegs\(m\)\}>\{t\('mitra_btn_regs'\)\}/)
  assert.match(p, /data-testid="mitra-statement" className=\{btnPlain\} onClick=\{\(\) => onStatement\(m\)\}>\{t\('mitra_btn_statement'\)\}/)
  assert.ok(p.indexOf('data-testid="mitra-regs"') < p.indexOf('data-testid="mitra-statement"') && p.indexOf('data-testid="mitra-statement"') < p.indexOf('data-testid="mitra-pay"'))
  assert.match(p, /view\.name === 'statement' \? \(\s*<MitraStatement/)
  assert.match(p, /onBack=\{\(\) => \{ setView\(\{ name: 'list' \}\); load\(\) \}\}/)
  for (const f of ['src/App.jsx', 'src/main.jsx']) {
    try { assert.ok(!/statement/i.test(src(f)), `${f}: no public route for the statement`) } catch (e) { if (e.code !== 'ENOENT') throw e }
  }
})

test('the API call is one admin function with the actor, the Mitra, a limit and an offset; nothing else is read by the screen', () => {
  const a = src('src/lib/mitra/mitraApi.js')
  assert.match(a, /adminMitraStatement = \(actor, mitraId, limit = 50, offset = 0\) =>\s*rpc\('admin_mitra_statement', \{ p_actor: actor, p_mitra_id: mitraId, p_limit: limit, p_offset: offset \}\)/)
  const s = src('src/screens/admin/tabs/MitraStatement.jsx')
  assert.deepEqual([...new Set([...s.matchAll(/\b(admin\w+)\(/g)].map((m) => m[1]))], ['adminMitraStatement'])
  assert.ok(!/supabase|localStorage|private_phone|masked_phone/.test(noComments(s)), 'the screen never reads or shows a phone')
})
