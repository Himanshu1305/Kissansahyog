// Batch 22D - the reference model of admin_mitra_statement (scripts/batch20/mitra-model.mjs, statementFor).
// Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { statementFor, markPaid, countsFor } from '../../scripts/batch20/mitra-model.mjs'

const NOW = Date.parse('2026-11-18T10:00:00Z')
const DAY = 24 * 3600 * 1000
const ago = (d) => new Date(NOW - d * DAY).toISOString()
const P = (id, o = {}) => ({ id, full_name: `Farmer ${id}`, village_town: `Village ${id}`, phone: `9000000${String(id).padStart(3, '0')}`, created_at: ago(40), is_blocked: false, mitra_id: null, mitra_paid_id: null, ...o })
let lid = 0
const L = (uid, o = {}) => ({ id: `L${String(++lid).padStart(3, '0')}`, user_id: uid, listing_type: 'offer', status: 'active', admin_disabled_at: null, category: 'equipment', created_at: ago(1), ...o })
const A = (id, o = {}) => ({ id, title_hi: `Ad ${id}`, mitra_id: null, mitra_paid_id: null, created_at: ago(1), ...o })
const mitra = (o = {}) => ({ id: 'A', display_name: 'Asha', area: 'Khurai', is_active: true, rate_farmer_rupees: 1, rate_business_rupees: 5, ...o })
const S = (o = {}) => ({ mitras: [mitra()], profiles: [], payments: [], listings: [], announcements: [], ...o })

function twoFarmersOneAd() {
  return S({
    profiles: [P(1, { mitra_id: 'A' }), P(2, { mitra_id: 'A', mitra_paid_id: 'pay-1' })],
    listings: [L(1, { category: 'labor', created_at: ago(2) }), L(2, { category: 'drone_didi', created_at: ago(10) })],
    announcements: [A('ad-1', { mitra_id: 'A', created_at: ago(5) })],
    payments: [{ id: 'pay-1', mitra_id: 'A', amount_rupees: 1, paid_on: '2026-11-09', farmer_count: 1, business_count: 0 }],
  })
}

test('two farmers and one ad: dates, kinds, amounts at Rs 1 and Rs 5, one paid and one unpaid, newest first', () => {
  const r = statementFor(twoFarmersOneAd(), 'A')
  assert.deepEqual(r.rows.map((x) => [x.kind, x.ref_id]), [['farmer', 1], ['ad', 'ad-1'], ['farmer', 2]])
  assert.deepEqual(r.rows.map((x) => x.on_date), [ago(2), ago(5), ago(10)])
  assert.deepEqual(r.rows.map((x) => x.amount_rupees), [1, 5, 1])
  assert.deepEqual(r.rows.map((x) => x.paid), [false, false, true])
  assert.equal(r.rows[2].paid_on, '2026-11-09')
  assert.equal(r.rows[2].payment_id, 'pay-1')
  assert.equal(r.rows[0].paid_on, null)
  assert.deepEqual(r.rows.map((x) => x.category), ['labor', null, 'drone_didi'])
  assert.equal(r.rows[1].name, 'Ad ad-1')
  assert.equal(r.rows[1].village, null)
  assert.equal(r.rows[1].masked_phone, null)
  assert.equal(r.rows[0].name, 'Farmer 1')
  assert.equal(r.rows[0].village, 'Village 1')
  assert.ok(r.rows.every((x) => x.blocked === false))
  assert.deepEqual(r.totals, { farmers: 2, ads: 1, waiting_first_offer: 0, earned_rupees: 7, paid_rupees: 1, due_rupees: 6, rate_missing: false })
  assert.deepEqual(r.mitra, { id: 'A', display_name: 'Asha', area: 'Khurai', is_active: true, rate_farmer_rupees: 1, rate_business_rupees: 5 })
})

test('it agrees with the Mitra list counts (same rule)', () => {
  const s = twoFarmersOneAd()
  const c = countsFor(s, 'A', NOW)
  const r = statementFor(s, 'A')
  assert.equal(r.totals.farmers, c.farmers_total)
  assert.equal(r.totals.ads, c.businesses_total)
  assert.equal(r.rows.filter((x) => !x.paid).length, c.counted_unpaid_farmers + c.counted_unpaid_businesses)
})

test('the paid date follows mark paid (the covering payment); amounts are at the current rate', () => {
  let s = twoFarmersOneAd()
  s = markPaid(s, 'A', 6, '2026-11-18')
  const r = statementFor(s, 'A')
  assert.ok(r.rows.every((x) => x.paid))
  assert.equal(r.rows.find((x) => x.ref_id === 1).paid_on, '2026-11-18')
  assert.equal(r.rows.find((x) => x.ref_id === 2).paid_on, '2026-11-09', 'the older payment keeps its own date')
  assert.deepEqual([r.totals.paid_rupees, r.totals.due_rupees], [7, 0])
  // the rate changes later: every row shows the NEW rate (payments are one lump sum)
  const s2 = { ...s, mitras: [mitra({ rate_farmer_rupees: 3 })] }
  assert.deepEqual(statementFor(s2, 'A').rows.map((x) => x.amount_rupees), [3, 5, 3])
})

test('a rate that is not set: amounts are null, rate_missing is true, earned counts only the set rate', () => {
  const s = { ...twoFarmersOneAd(), mitras: [mitra({ rate_farmer_rupees: null, rate_business_rupees: null })] }
  const r = statementFor(s, 'A')
  assert.ok(r.rows.every((x) => x.amount_rupees === null))
  assert.equal(r.totals.rate_missing, true)
  assert.deepEqual([r.totals.earned_rupees, r.totals.paid_rupees, r.totals.due_rupees], [0, 0, 0])
  assert.equal(r.mitra.rate_farmer_rupees, null)
  const half = { ...twoFarmersOneAd(), mitras: [mitra({ rate_business_rupees: null })] }
  const h = statementFor(half, 'A')
  assert.deepEqual(h.rows.map((x) => x.amount_rupees), [1, null, 1])
  assert.equal(h.totals.rate_missing, true)
  assert.equal(h.totals.earned_rupees, 2)
})

test('a blocked person, a person who never offered, and a person of another Mitra are not rows; waiting_first_offer counts the never-offered', () => {
  const s = S({
    mitras: [mitra(), mitra({ id: 'B', display_name: 'Bholu', area: 'Bina' })],
    profiles: [P(1, { mitra_id: 'A' }), P(2, { mitra_id: 'A', is_blocked: true }), P(3, { mitra_id: 'A' }), P(4, { mitra_id: 'A', is_blocked: true }), P(5, { mitra_id: 'B' }), P(6)],
    listings: [L(1), L(2), L(5), L(6)], // 3 and 4 never offered; 2 is blocked
  })
  const r = statementFor(s, 'A')
  assert.deepEqual(r.rows.map((x) => x.ref_id), [1])
  assert.equal(r.totals.farmers, 1)
  assert.equal(r.totals.waiting_first_offer, 1, 'person 3 waits; blocked person 4 is not counted as waiting')
  assert.equal(statementFor(s, 'B').rows.length, 1)
})

test('a removed or admin-disabled offer does not count; the category and date come from the first LIVE offer', () => {
  const s = S({
    profiles: [P(1, { mitra_id: 'A' }), P(2, { mitra_id: 'A' }), P(3, { mitra_id: 'A' })],
    listings: [
      L(1, { status: 'removed', category: 'land', created_at: ago(9) }), // only offer removed -> not counted
      L(2, { admin_disabled_at: ago(1), category: 'bhusa', created_at: ago(8) }), // only offer disabled -> not counted
      L(3, { status: 'removed', category: 'land', created_at: ago(20) }), L(3, { category: 'warehouse', created_at: ago(7) }), L(3, { category: 'transport', created_at: ago(3) }),
    ],
  })
  const r = statementFor(s, 'A')
  assert.deepEqual(r.rows.map((x) => x.ref_id), [3])
  assert.equal(r.rows[0].category, 'warehouse')
  assert.equal(r.rows[0].on_date, ago(7), 'the date is the first LIVE offer, not the removed one')
  assert.equal(r.totals.waiting_first_offer, 2)
})

test('the phone is masked to the last 4 digits; no full number or private phone appears anywhere in the answer', () => {
  const s = twoFarmersOneAd()
  s.mitras[0].private_phone = '9111122222'
  const ans = statementFor(s, 'A')
  const text = JSON.stringify(ans)
  assert.equal(ans.rows[0].masked_phone, '******0001')
  assert.ok(!/90000000\d\d/.test(text) && !text.includes('9111122222') && !/private_phone/.test(text))
})

test('totals cover ALL rows even when the page is small; limit is clamped to 1..500; offset pages in order', () => {
  const profiles = []
  const listings = []
  for (let i = 1; i <= 7; i++) { profiles.push(P(i, { mitra_id: 'A' })); listings.push(L(i, { created_at: ago(i) })) }
  const s = S({ profiles, listings })
  const first = statementFor(s, 'A', { limit: 3, offset: 0 })
  const second = statementFor(s, 'A', { limit: 3, offset: 3 })
  const third = statementFor(s, 'A', { limit: 3, offset: 6 })
  assert.deepEqual(first.rows.map((x) => x.ref_id), [1, 2, 3])
  assert.deepEqual(second.rows.map((x) => x.ref_id), [4, 5, 6])
  assert.deepEqual(third.rows.map((x) => x.ref_id), [7])
  for (const r of [first, second, third]) assert.deepEqual([r.totals.farmers, r.totals.earned_rupees], [7, 7])
  assert.equal(statementFor(s, 'A', { limit: 0 }).rows.length, 1)
  assert.equal(statementFor(s, 'A', { limit: 100000 }).rows.length, 7)
  assert.equal(statementFor(s, 'A', { limit: null, offset: null }).rows.length, 7)
  assert.equal(statementFor(s, 'A', { limit: 5, offset: -4 }).rows.length, 5)
})

test('same-date rows are ordered by id; an unknown Mitra is not_found; a Mitra with nothing has empty rows and zero totals', () => {
  const same = ago(2)
  const s = S({ profiles: [P(9, { mitra_id: 'A' }), P(3, { mitra_id: 'A' })], listings: [L(9, { created_at: same }), L(3, { created_at: same })] })
  assert.deepEqual(statementFor(s, 'A').rows.map((x) => x.ref_id), [3, 9])
  assert.throws(() => statementFor(s, 'nope'), /not_found/)
  const empty = statementFor(S(), 'A')
  assert.deepEqual(empty.rows, [])
  assert.deepEqual(empty.totals, { farmers: 0, ads: 0, waiting_first_offer: 0, earned_rupees: 0, paid_rupees: 0, due_rupees: 0, rate_missing: false })
})
