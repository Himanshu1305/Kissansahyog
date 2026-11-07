// Batch 20 - the screen rules, the best-effort save, the CSV, both languages, and "nothing else changed".
// Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { saveMyMitra } from '../../src/lib/mitra/saveMyMitra.js'
import {
  mitraLabel, fill, dueFor, mitraFormToPayload, blankMitraForm, mitraToForm, validPaidAmount, mitraSummaryCsv, CSV_COLUMNS, summaryOf, rupees,
} from '../../src/lib/mitra/mitraRules.js'
import { mitraStrings } from '../../src/lib/i18n/mitraStrings.js'
import { strings } from '../../src/lib/i18n/strings.js'
import { toAppError } from '../../src/lib/errors.js'
import { PANELS, searchPanels, tabOf } from '../../src/screens/admin/registry.js'

// ---------- the best-effort save after registering ----------
const quiet = { warn: () => {} }
test('saveMyMitra: never called for "None" or without a profile', async () => {
  let calls = 0
  const rpc = async () => { calls++; return { data: { status: 'set' } } }
  assert.equal(await saveMyMitra(rpc, 'p1', null, quiet), 'skipped')
  assert.equal(await saveMyMitra(rpc, 'p1', '', quiet), 'skipped')
  assert.equal(await saveMyMitra(rpc, null, 'm1', quiet), 'skipped')
  assert.equal(calls, 0)
})

test('saveMyMitra: one call with the actor and the Mitra', async () => {
  const seen = []
  const rpc = async (name, args) => { seen.push([name, args]); return { data: { status: 'set' }, error: null } }
  assert.equal(await saveMyMitra(rpc, 'p1', 'm1', quiet), 'set')
  assert.deepEqual(seen, [['set_my_mitra', { p_actor_id: 'p1', p_mitra_id: 'm1' }]])
})

test('saveMyMitra: one retry on a network error, none on a database answer', async () => {
  let n = 0
  const flaky = async () => { n++; if (n === 1) throw new TypeError('Failed to fetch'); return { data: { status: 'set' } } }
  assert.equal(await saveMyMitra(flaky, 'p1', 'm1', quiet), 'set')
  assert.equal(n, 2)
  let m = 0
  const refused = async () => { m++; return { error: { code: '42501', message: 'permission denied' } } }
  assert.equal(await saveMyMitra(refused, 'p1', 'm1', quiet), 'failed')
  assert.equal(m, 1, 'a database refusal is final')
  let k = 0
  const down = async () => { k++; throw new TypeError('Failed to fetch') }
  assert.equal(await saveMyMitra(down, 'p1', 'm1', quiet), 'failed')
  assert.equal(k, 2, 'exactly one retry')
})

test('saveMyMitra: never throws; the warning has no personal data; a slow answer is not waited for', async () => {
  const warnings = []
  const boom = async () => { throw new Error('exploded for 9876543210') }
  assert.equal(await saveMyMitra(boom, 'profile-123', 'mitra-9', { warn: (...a) => warnings.push(a.join(' ')) }), 'failed')
  assert.equal(warnings.length, 1)
  assert.ok(!/9876543210|profile-123|mitra-9/.test(warnings[0]))
  const slow = () => new Promise((r) => setTimeout(() => r({ data: { status: 'set' } }), 400))
  const t0 = Date.now()
  assert.equal(await saveMyMitra(slow, 'p1', 'm1', { ...quiet, waitMs: 50 }), 'pending')
  assert.ok(Date.now() - t0 < 300)
})

// ---------- the sign-up wiring (read from the source: the registration functions are not changed) ----------
test('authService saves the Mitra after BOTH registration paths, and the payload (not a global) carries it', () => {
  const src = readFileSync('src/lib/auth/authService.js', 'utf8')
  assert.match(src, /applyMitra\(data\.profile, p\.mitra_id\)/, 'OTP path reads the id from the challenge payload')
  assert.match(src, /applyMitra\(profile, payload\.mitra_id\)/, 'no-OTP path reads it from the payload')
  assert.match(src, /startPhoneRegister[\s\S]*sendOtp\(payload\.phone, 'register', payload\)/, 'the payload travels in the challenge')
  // the registration RPC arguments are unchanged (no mitra in them)
  const args = src.slice(src.indexOf('function registerPhoneArgs'), src.indexOf('export async function registerPhone'))
  assert.ok(!/mitra/i.test(args))
  assert.ok(!/localStorage[^\n]*mitra|mitra[^\n]*localStorage/i.test(src))
})

test('the sign-up screen keeps the choice in state only (no URL, no storage, no analytics)', () => {
  const screen = readFileSync('src/screens/Signup.jsx', 'utf8')
  const field = readFileSync('src/components/auth/MitraField.jsx', 'utf8')
  assert.match(screen, /mitra_id: mitraId \|\| null/)
  const mitraLines = screen.split('\n').filter((l) => /mitra/i.test(l)).join('\n')
  for (const s of [mitraLines, field]) assert.ok(!/localStorage|sessionStorage|searchParams|setParams|navigate\(|track\(|gtag|analytics/i.test(s.replace(/\/\/.*$/gm, '')), 'no storage / URL / analytics')
  assert.match(field, /if \(!list \|\| list\.length === 0\) return null/, 'hidden when empty or failed')
  assert.match(field, /min-h-\[48px\]/)
  assert.match(field, /text-\[17px\]/)
})

// ---------- the admin form and the numbers ----------
test('mitra form: name required, rates optional whole numbers, phone shape, length', () => {
  const f = { ...blankMitraForm(), display_name: '  Asha  ', area: ' Khurai ' }
  assert.deepEqual(mitraFormToPayload(f).data, { display_name: 'Asha', area: 'Khurai', private_phone: '', rate_farmer_rupees: '', rate_business_rupees: '', is_active: true })
  assert.equal(mitraFormToPayload({ ...f, display_name: '   ' }).error, 'mitra_err_name')
  assert.equal(mitraFormToPayload({ ...f, display_name: 'x'.repeat(81) }).error, 'mitra_err_long')
  assert.equal(mitraFormToPayload({ ...f, private_phone: 'call me' }).error, 'mitra_err_phone')
  assert.equal(mitraFormToPayload({ ...f, private_phone: '+91 90000 00001' }).data.private_phone, '+91 90000 00001')
  assert.equal(mitraFormToPayload({ ...f, rate_farmer_rupees: '-1' }).error, 'mitra_err_rate')
  assert.equal(mitraFormToPayload({ ...f, rate_farmer_rupees: '1.5' }).error, 'mitra_err_rate')
  assert.equal(mitraFormToPayload({ ...f, rate_business_rupees: '100001' }).error, 'mitra_err_rate')
  assert.equal(mitraFormToPayload({ ...f, rate_farmer_rupees: '1', rate_business_rupees: '05' }).data.rate_business_rupees, '5')
  const m = { id: 'x', display_name: 'A', area: null, private_phone: null, rate_farmer_rupees: 1, rate_business_rupees: null, is_active: false }
  assert.deepEqual(mitraToForm(m), { id: 'x', display_name: 'A', area: '', private_phone: '', rate_farmer_rupees: '1', rate_business_rupees: '', is_active: false })
})

test('mark-paid numbers: the dialog suggestion, due on the card, and the amount check', () => {
  const m = { counted_unpaid_farmers: 12, counted_unpaid_businesses: 2, rate_farmer_rupees: 1, rate_business_rupees: 10 }
  assert.deepEqual(dueFor(m), { amount: 32, rateNotSet: false })
  assert.equal(dueFor({ ...m, rate_business_rupees: null }).rateNotSet, true)
  assert.equal(dueFor({ counted_unpaid_farmers: 0, counted_unpaid_businesses: 0 }).rateNotSet, false)
  assert.equal(validPaidAmount('0'), true)
  assert.equal(validPaidAmount('250'), true)
  assert.equal(validPaidAmount(''), false)
  assert.equal(validPaidAmount('-5'), false)
  assert.equal(validPaidAmount('2.5'), false)
  assert.equal(rupees(123456), '1,23,456')
  assert.equal(fill('{f} farmers + {b} businesses', { f: 3, b: 0 }), '3 farmers + 0 businesses')
  assert.equal(mitraLabel({ display_name: 'Asha', area: 'Khurai' }), 'Asha — Khurai')
  assert.equal(mitraLabel({ display_name: 'Asha', area: null }), 'Asha')
})

test('CSV: one row per Mitra, the right columns, no phone number anywhere, formulas are defused', () => {
  const mitras = [
    { id: 'a', display_name: 'Asha, "the" first', area: 'Khurai', private_phone: '9000000001', is_active: true, farmers_total: 5, businesses_total: 1, today: 1, last7: 3, counted_unpaid_farmers: 4, counted_unpaid_businesses: 1, rate_farmer_rupees: 1, rate_business_rupees: 5, payments_total_rupees: 20 },
    { id: 'b', display_name: '=SUM(A1)', area: '', private_phone: '9000000002', is_active: false, farmers_total: 2, businesses_total: 0, today: 0, last7: 0, counted_unpaid_farmers: 2, counted_unpaid_businesses: 0, rate_farmer_rupees: null, rate_business_rupees: null, payments_total_rupees: 0 },
  ]
  const csv = mitraSummaryCsv(mitras)
  const lines = csv.trim().split('\n')
  assert.equal(lines.length, 3)
  assert.equal(lines[0], CSV_COLUMNS.join(','))
  assert.equal(lines[1], '"Asha, ""the"" first",Khurai,yes,5,1,1,3,4,1,9,20')
  assert.match(lines[2], /^'=SUM\(A1\),,no,2,0,0,0,2,0,rate not set,0$/)
  assert.ok(!/9000000001|9000000002|phone/i.test(csv), 'no phone numbers in the CSV')
  assert.ok(!/\d{10}/.test(csv))
})

test('the top strip adds up the cards', () => {
  const d = { mitras: [{ farmers_total: 3, businesses_total: 1, counted_unpaid_farmers: 2, counted_unpaid_businesses: 1 }, { farmers_total: 4, businesses_total: 0, counted_unpaid_farmers: 4, counted_unpaid_businesses: 0 }], unattributed_total: 9 }
  assert.deepEqual(summaryOf(d), { mitras: 2, attributed: 8, unpaid: 7, unattributed: 9 })
  assert.deepEqual(summaryOf(null), { mitras: 0, attributed: 0, unpaid: 0, unattributed: 0 })
})

// ---------- both languages, spelling, panel, errors ----------
test('every Batch 20 string has Hindi and English; the placeholders match; the spelling is right', () => {
  for (const [k, v] of Object.entries(mitraStrings)) {
    assert.ok(v.hi && v.en, `${k} needs hi and en`)
    assert.deepEqual((v.hi.match(/\{\w+\}/g) || []).sort(), (v.en.match(/\{\w+\}/g) || []).sort(), `${k} placeholders differ`)
    assert.ok(strings[k], `${k} is merged into strings.js`)
    assert.ok(!/Kisan Mitra|Kissan Mitr\b|Kisaan/.test(v.en), `${k}: English must say Kissan Mitra`)
    assert.ok(!/किसान मित्र/.test(v.en), `${k}: Hindi text in the English string`)
  }
  assert.equal(mitraStrings.adm_p_mitra.hi, 'किसान मित्र')
  assert.equal(mitraStrings.adm_p_mitra.en, 'Kissan Mitra')
  assert.equal(mitraStrings.mitra_field_label.hi, 'आपको किसने जोड़ा? (किसान मित्र)')
  assert.equal(mitraStrings.mitra_field_label.en, 'Who helped you join? (Kissan Mitra)')
  assert.equal(mitraStrings.mitra_none.hi, 'कोई नहीं / None')
  assert.equal(mitraStrings.mitra_pay_outside.hi, 'भुगतान सिर्फ़ साइट के बाहर करें (UPI/नकद); यहाँ सिर्फ़ रिकॉर्ड रखा जाता है।')
  assert.equal(mitraStrings.mitra_pay_outside.en, 'Pay outside the site (UPI or cash); this screen only keeps the record.')
})

test('the admin panel is registered in the People tab and found by the search words', () => {
  const p = PANELS.find((x) => x.key === 'mitra')
  assert.equal(p.tab, 'people')
  assert.equal(tabOf('mitra'), 'people')
  const label = (x) => `${strings[x.label].hi} ${strings[x.label].en}`
  for (const q of ['mitra', 'mitr', 'field', 'agent', 'किसान मित्र', 'एजेंट']) assert.ok(searchPanels(q, label).some((x) => x.key === 'mitra'), q)
  const tab = readFileSync('src/screens/admin/tabs/PeopleTab.jsx', 'utf8')
  assert.match(tab, /<PanelBox k="mitra"><MitraPanel/)
})

test('database error codes become messages', () => {
  assert.equal(toAppError({ message: 'mitra_duplicate' }).i18nKey, 'err_mitra_duplicate')
  assert.equal(toAppError({ message: 'already_paid' }).i18nKey, 'err_mitra_already_paid')
  assert.equal(toAppError({ message: 'nothing_unpaid' }).i18nKey, 'err_mitra_nothing_unpaid')
  assert.equal(toAppError({ message: 'invalid_input' }).i18nKey, 'err_mitra_invalid')
  assert.equal(toAppError({ message: 'session_required' }).i18nKey, 'err_admin_session')
  for (const k of ['err_mitra_duplicate', 'err_mitra_already_paid', 'err_mitra_nothing_unpaid', 'err_mitra_invalid']) assert.ok(strings[k])
})

test('no approval layer anywhere in the screens or strings', () => {
  const panel = readFileSync('src/screens/admin/tabs/MitraPanel.jsx', 'utf8')
  assert.ok(!/approve|reject|pending|waiting/i.test(panel))
  assert.ok(!/approve|reject|मंज़ूर|अस्वीकार/i.test(JSON.stringify(mitraStrings)))
})

test('no new dependency and no secret or real phone number in the Batch 20 code', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'))
  assert.ok(lock.packages[''].dependencies && pkg.dependencies)
  for (const f of ['src/lib/mitra/mitraApi.js', 'src/lib/mitra/mitraRules.js', 'src/lib/mitra/saveMyMitra.js', 'src/screens/admin/tabs/MitraPanel.jsx', 'src/components/auth/MitraField.jsx', 'src/lib/i18n/mitraStrings.js', 'scripts/batch20/mitra-model.mjs']) {
    const s = readFileSync(f, 'utf8')
    assert.ok(!/\b[6-9]\d{9}\b/.test(s), `${f} has a phone-like number`)
    assert.ok(!/(secret|api[_-]?key|service_role)\s*[:=]/i.test(s), `${f} looks like a secret`)
  }
})
