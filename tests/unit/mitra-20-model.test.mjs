// Batch 20 - the reference model of the SQL rules (scripts/batch20/mitra-model.mjs). This is the proof of the counting,
// mark-paid and reassign rules WITHOUT a database. Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { countsFor, setMyMitra, reassign, markPaid, sameNameVillage, suggestAmount, maskPhone, isDuplicateMitra, FIFTEEN_MIN_MS } from '../../scripts/batch20/mitra-model.mjs'
import { suggestAmount as uiSuggest, maskPhone as uiMask } from '../../src/lib/mitra/mitraRules.js'

const NOW = Date.parse('2026-11-07T10:00:00Z')
const ago = (ms) => new Date(NOW - ms).toISOString()
const P = (id, o = {}) => ({ id, full_name: `Farmer ${id}`, village_town: `Village ${id}`, phone: `9000000${String(id).padStart(3, '0')}`, created_at: ago(1000), is_blocked: false, mitra_id: null, mitra_paid_id: null, ...o })
const base = () => ({
  mitras: [{ id: 'A', display_name: 'Asha', area: 'Khurai', is_active: true }, { id: 'B', display_name: 'Bholu', area: 'Bina', is_active: true }, { id: 'Z', display_name: 'Old', area: null, is_active: false }],
  profiles: [P(1, { mitra_id: 'A' }), P(2, { mitra_id: 'A' }), P(3, { mitra_id: 'A', is_blocked: true }), P(4, { mitra_id: 'B' }), P(5)],
  payments: [],
})

test('counted-and-unpaid: attributed to the Mitra, not blocked, no payment stamped', () => {
  const c = countsFor(base(), 'A', NOW)
  assert.equal(c.farmers_total, 2) // the blocked one is not counted
  assert.equal(c.counted_unpaid_farmers, 2)
  assert.equal(c.counted_unpaid_businesses, 0)
  assert.equal(c.paid_total_registrations, 0)
  assert.equal(countsFor(base(), 'B', NOW).farmers_total, 1)
})

test('today and last 7 days use the registration time', () => {
  const s = base()
  s.profiles = [P(1, { mitra_id: 'A', created_at: ago(2 * 3600 * 1000) }), P(2, { mitra_id: 'A', created_at: ago(3 * 24 * 3600 * 1000) }), P(3, { mitra_id: 'A', created_at: ago(30 * 24 * 3600 * 1000) })]
  const c = countsFor(s, 'A', NOW)
  assert.equal(c.today, 1)
  assert.equal(c.last7, 2)
  assert.equal(c.farmers_total, 3)
})

test('businesses are counted separately (when a business profile exists)', () => {
  const s = base()
  s.profiles.push(P(6, { mitra_id: 'A', kind: 'business' }))
  const c = countsFor(s, 'A', NOW)
  assert.equal(c.farmers_total, 2)
  assert.equal(c.businesses_total, 1)
  assert.equal(c.counted_unpaid_businesses, 1)
})

test('mark paid stamps only the unpaid, unblocked rows of THAT Mitra and stores the counts', () => {
  const s0 = base()
  const s1 = markPaid(s0, 'A', 2, '2026-11-07', 'UPI')
  const stamped = s1.profiles.filter((p) => p.mitra_paid_id).map((p) => p.id).sort((a, b) => a - b)
  assert.deepEqual(stamped, [1, 2])
  assert.equal(s1.profiles.find((p) => p.id === 3).mitra_paid_id, null, 'the blocked row is not paid')
  assert.equal(s1.profiles.find((p) => p.id === 4).mitra_paid_id, null, 'another Mitra is untouched')
  assert.deepEqual(s1.payments.map((p) => [p.mitra_id, p.amount_rupees, p.farmer_count, p.business_count]), [['A', 2, 2, 0]])
  // the original state is not changed (pure)
  assert.equal(s0.payments.length, 0)
  const c = countsFor(s1, 'A', NOW)
  assert.equal(c.counted_unpaid_farmers, 0)
  assert.equal(c.paid_total_registrations, 2)
})

test('mark paid twice: the second time there is nothing unpaid; a new registration is paid next time only', () => {
  const s1 = markPaid(base(), 'A', 2, '2026-11-07')
  assert.throws(() => markPaid(s1, 'A', 2, '2026-11-08'), /nothing_unpaid/)
  const s2 = { ...s1, profiles: [...s1.profiles, P(7, { mitra_id: 'A' })] }
  const s3 = markPaid(s2, 'A', 1, '2026-11-09')
  assert.equal(s3.payments.length, 2)
  assert.deepEqual(s3.payments[1].farmer_count, 1)
  assert.equal(s3.profiles.find((p) => p.id === 1).mitra_paid_id, 'pay-1', 'the first payment stamp is not overwritten')
})

test('mark paid refuses a bad amount or an unknown Mitra; any amount (even 0) is allowed', () => {
  assert.throws(() => markPaid(base(), 'A', -1, 'd'), /invalid_input/)
  assert.throws(() => markPaid(base(), 'A', 1.5, 'd'), /invalid_input/)
  assert.throws(() => markPaid(base(), 'nope', 1, 'd'), /not_found/)
  assert.doesNotThrow(() => markPaid(base(), 'A', 0, 'd'))
})

test('a paid registration cannot be reassigned', () => {
  const s1 = markPaid(base(), 'A', 2, 'd')
  assert.throws(() => reassign(s1, 1, 'B'), /already_paid/)
  assert.throws(() => reassign(s1, 1, null), /already_paid/)
})

test('reassign to another Mitra moves the count; to none removes it from every count', () => {
  const s1 = reassign(base(), 1, 'B')
  assert.equal(countsFor(s1, 'A', NOW).farmers_total, 1)
  assert.equal(countsFor(s1, 'B', NOW).farmers_total, 2)
  const s2 = reassign(s1, 1, null)
  assert.equal(countsFor(s2, 'B', NOW).farmers_total, 1)
  assert.equal(s2.profiles.find((p) => p.id === 1).mitra_id, null)
  assert.throws(() => reassign(base(), 99, 'A'), /not_found/)
  assert.throws(() => reassign(base(), 1, 'nope'), /not_found/)
})

test('a blocked account is not counted, and counts again when unblocked', () => {
  const s = base()
  const un = { ...s, profiles: s.profiles.map((p) => (p.id === 3 ? { ...p, is_blocked: false } : p)) }
  assert.equal(countsFor(un, 'A', NOW).counted_unpaid_farmers, 3)
})

test('set_my_mitra: once, within 15 minutes, active Mitra only, never an error', () => {
  const s = { ...base(), profiles: [P(10, { created_at: ago(60 * 1000) }), P(11, { created_at: ago(FIFTEEN_MIN_MS + 1000) }), P(12, { created_at: ago(1000), mitra_id: 'B' })] }
  const ok = setMyMitra(s, 10, 'A', NOW)
  assert.equal(ok.status, 'set')
  assert.equal(ok.state.profiles.find((p) => p.id === 10).mitra_id, 'A')
  assert.equal(setMyMitra(ok.state, 10, 'B', NOW).status, 'already_set', 'the second attempt is ignored')
  assert.equal(setMyMitra(ok.state, 10, 'B', NOW).state.profiles.find((p) => p.id === 10).mitra_id, 'A')
  assert.equal(setMyMitra(s, 11, 'A', NOW).status, 'too_late')
  assert.equal(setMyMitra(s, 12, 'A', NOW).status, 'already_set')
  assert.equal(setMyMitra(s, 10, 'Z', NOW).status, 'no_such_mitra', 'an inactive Mitra cannot be chosen')
  assert.equal(setMyMitra(s, 10, 'nope', NOW).status, 'no_such_mitra')
  assert.equal(setMyMitra(s, 10, null, NOW).status, 'none')
  assert.equal(setMyMitra(s, 999, 'A', NOW).status, 'no_profile')
})

test('same name and village: lower-cased, trimmed, both non-empty, another profile', () => {
  const s = { ...base(), profiles: [P(1, { full_name: ' Ram Lal ', village_town: 'Khurai' }), P(2, { full_name: 'ram lal', village_town: 'KHURAI ' }), P(3, { full_name: 'Ram Lal', village_town: 'Bina' }), P(4, { full_name: 'Sita', village_town: '' }), P(5, { full_name: 'Sita', village_town: '' })] }
  assert.equal(sameNameVillage(s, s.profiles[0]), true)
  assert.equal(sameNameVillage(s, s.profiles[1]), true)
  assert.equal(sameNameVillage(s, s.profiles[2]), false, 'same name, other village')
  assert.equal(sameNameVillage(s, s.profiles[3]), false, 'an empty village never matches')
  assert.equal(sameNameVillage({ ...s, profiles: [s.profiles[0]] }, s.profiles[0]), false, 'not itself')
})

test('amount suggestion: farmers x rate + businesses x rate; a blank rate = rate not set', () => {
  assert.deepEqual(suggestAmount({ farmers: 10, businesses: 0 }, { rate_farmer_rupees: 1, rate_business_rupees: null }), { amount: 10, rateNotSet: false })
  assert.deepEqual(suggestAmount({ farmers: 10, businesses: 2 }, { rate_farmer_rupees: 1, rate_business_rupees: 5 }), { amount: 20, rateNotSet: false })
  assert.deepEqual(suggestAmount({ farmers: 10, businesses: 0 }, { rate_farmer_rupees: null, rate_business_rupees: 5 }), { amount: 0, rateNotSet: true })
  assert.deepEqual(suggestAmount({ farmers: 0, businesses: 3 }, { rate_farmer_rupees: null, rate_business_rupees: null }), { amount: 0, rateNotSet: true })
  assert.deepEqual(suggestAmount({ farmers: 0, businesses: 0 }, { rate_farmer_rupees: null, rate_business_rupees: null }), { amount: 0, rateNotSet: false })
  // the screen's rule gives the same answers as the model
  for (const [c, r] of [[{ farmers: 10, businesses: 2 }, { rate_farmer_rupees: 1, rate_business_rupees: 5 }], [{ farmers: 4, businesses: 0 }, { rate_farmer_rupees: null, rate_business_rupees: 9 }], [{ farmers: 0, businesses: 3 }, { rate_farmer_rupees: 2, rate_business_rupees: null }], [{ farmers: 3, businesses: 0 }, { rate_farmer_rupees: 0, rate_business_rupees: null }]]) {
    assert.deepEqual(uiSuggest(c, r), suggestAmount(c, r))
  }
})

test('phone masking: last 4 digits only; the screen rule agrees with the model', () => {
  assert.equal(maskPhone('9876543210'), '******3210')
  assert.equal(uiMask('9876543210'), '******3210')
  assert.equal(uiMask('98765'), '******8765')
  assert.equal(uiMask(null), '')
  assert.equal(maskPhone(null), null)
})

test('a Mitra with the same name in the same area is refused; another area or the same row is fine', () => {
  const s = base()
  assert.equal(isDuplicateMitra(s, ' asha ', 'KHURAI'), true)
  assert.equal(isDuplicateMitra(s, 'Asha', 'Bina'), false)
  assert.equal(isDuplicateMitra(s, 'Asha', 'Khurai', 'A'), false, 'editing the same Mitra')
  assert.equal(isDuplicateMitra(s, 'Old', ''), true)
  assert.equal(isDuplicateMitra(s, 'Old', null), true)
})
