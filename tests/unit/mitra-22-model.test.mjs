// Batch 22 - the reference model of the SQL rules of 0076 (scripts/batch20/mitra-model.mjs): a person counts for a Mitra only
// after offering a service, an ad counts as one business, mark-paid stamps both, the Mitra is saved only on a FIRST offer.
// Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  countsFor, markPaid, setMyMitraOnOffer, choiceOpen, setAnnouncementMitra, reassign, unattributedTotal, notCountedYet, offersCount, firstOfferAt, THIRTY_MIN_MS,
} from '../../scripts/batch20/mitra-model.mjs'

const NOW = Date.parse('2026-11-17T10:00:00Z')
const ago = (ms) => new Date(NOW - ms).toISOString()
const DAY = 24 * 3600 * 1000
const P = (id, o = {}) => ({ id, full_name: `Farmer ${id}`, village_town: `Village ${id}`, phone: `9000000${String(id).padStart(3, '0')}`, created_at: ago(40 * DAY), is_blocked: false, mitra_id: null, mitra_paid_id: null, ...o })
let lid = 0
const L = (uid, o = {}) => ({ id: `L${++lid}`, user_id: uid, listing_type: 'offer', status: 'active', admin_disabled_at: null, created_at: ago(1000), ...o })
const A = (id, o = {}) => ({ id, mitra_id: null, mitra_paid_id: null, created_at: ago(1000), ...o })
const mitras = [{ id: 'A', display_name: 'Asha', area: 'Khurai', is_active: true }, { id: 'B', display_name: 'Bholu', area: 'Bina', is_active: true }, { id: 'Z', display_name: 'Old', area: null, is_active: false }]
const S = (o = {}) => ({ mitras, profiles: [], payments: [], listings: [], announcements: [], ...o })

test('a person attributed at registration who never offered is NOT counted (and not paid); the attribution stays', () => {
  const s = S({ profiles: [P(1, { mitra_id: 'A' })] })
  const c = countsFor(s, 'A', NOW)
  assert.equal(c.farmers_total, 0)
  assert.equal(c.counted_unpaid_farmers, 0)
  assert.equal(s.profiles[0].mitra_id, 'A', 'the attribution is still stored')
  assert.equal(notCountedYet(s, s.profiles[0]), true)
  assert.throws(() => markPaid(s, 'A', 5, '2026-11-17'), /nothing_unpaid/)
})

test('the day the person offers, they count - once, however many offers', () => {
  const s = S({ profiles: [P(1, { mitra_id: 'A' })], listings: [L(1), L(1, { created_at: ago(5000) }), L(1, { created_at: ago(9000) })] })
  const c = countsFor(s, 'A', NOW)
  assert.equal(c.farmers_total, 1)
  assert.equal(c.counted_unpaid_farmers, 1)
  assert.equal(offersCount(s, s.profiles[0]), 3, 'offers_count shows all live offers')
  assert.equal(notCountedYet(s, s.profiles[0]), false)
})

test('a requirement is not an offer; a removed or admin-disabled offer does not count', () => {
  const p = P(1, { mitra_id: 'A' })
  assert.equal(countsFor(S({ profiles: [p], listings: [L(1, { listing_type: 'requirement' })] }), 'A', NOW).farmers_total, 0)
  assert.equal(countsFor(S({ profiles: [p], listings: [L(1, { status: 'removed' })] }), 'A', NOW).farmers_total, 0)
  assert.equal(countsFor(S({ profiles: [p], listings: [L(1, { status: 'disabled', admin_disabled_at: ago(10) })] }), 'A', NOW).farmers_total, 0)
  // a closed offer (the farmer finished it) still counts
  assert.equal(countsFor(S({ profiles: [p], listings: [L(1, { status: 'closed' })] }), 'A', NOW).farmers_total, 1)
  // one removed + one live = counted once
  assert.equal(countsFor(S({ profiles: [p], listings: [L(1, { status: 'removed' }), L(1)] }), 'A', NOW).farmers_total, 1)
})

test('a blocked person who offered is still not counted', () => {
  assert.equal(countsFor(S({ profiles: [P(1, { mitra_id: 'A', is_blocked: true })], listings: [L(1)] }), 'A', NOW).farmers_total, 0)
})

test('"today" and "last 7 days" follow the first-offer date for farmers and the creation date for ads', () => {
  const s = S({
    profiles: [P(1, { mitra_id: 'A' }), P(2, { mitra_id: 'A' }), P(3, { mitra_id: 'A' })],
    listings: [L(1, { created_at: ago(2 * 3600 * 1000) }), L(2, { created_at: ago(3 * DAY) }), L(3, { created_at: ago(30 * DAY) })],
    announcements: [A('ad1', { mitra_id: 'A', created_at: ago(3600 * 1000) })],
  })
  const c = countsFor(s, 'A', NOW)
  assert.equal(c.today, 2)
  assert.equal(c.last7, 3)
  assert.equal(c.farmers_total, 3)
  assert.equal(c.businesses_total, 1)
})

test('an ad with a Mitra adds one business count; a second ad adds another; an ad without a Mitra adds nothing', () => {
  const s = S({ announcements: [A('a1', { mitra_id: 'A' }), A('a2', { mitra_id: 'A' }), A('a3'), A('a4', { mitra_id: 'B' })] })
  assert.equal(countsFor(s, 'A', NOW).businesses_total, 2)
  assert.equal(countsFor(s, 'A', NOW).counted_unpaid_businesses, 2)
  assert.equal(countsFor(s, 'B', NOW).businesses_total, 1)
})

test('mark paid stamps the counted farmers AND the unpaid ads in one step and stores both counts', () => {
  const s0 = S({
    profiles: [P(1, { mitra_id: 'A' }), P(2, { mitra_id: 'A' }), P(3, { mitra_id: 'A' }), P(4, { mitra_id: 'B' })],
    listings: [L(1), L(2), L(4)], // person 3 never offered
    announcements: [A('a1', { mitra_id: 'A' }), A('a2', { mitra_id: 'B' })],
  })
  const s1 = markPaid(s0, 'A', 25, '2026-11-17', 'UPI')
  assert.deepEqual(s1.payments.map((p) => [p.mitra_id, p.farmer_count, p.business_count]), [['A', 2, 1]])
  assert.deepEqual(s1.profiles.filter((p) => p.mitra_paid_id).map((p) => p.id), [1, 2])
  assert.equal(s1.profiles.find((p) => p.id === 3).mitra_paid_id, null, 'the person who has not offered is not paid')
  assert.equal(s1.announcements.find((a) => a.id === 'a1').mitra_paid_id, 'pay-1')
  assert.equal(s1.announcements.find((a) => a.id === 'a2').mitra_paid_id, null, 'another Mitra is untouched')
  assert.equal(s0.payments.length, 0, 'pure')
  // nothing unpaid any more
  assert.throws(() => markPaid(s1, 'A', 1, 'd'), /nothing_unpaid/)
  // person 3 offers later: counts and is paid next time, once
  const s2 = { ...s1, listings: [...s1.listings, L(3)] }
  const s3 = markPaid(s2, 'A', 1, '2026-11-18')
  assert.deepEqual(s3.payments[1], { ...s3.payments[1], farmer_count: 1, business_count: 0 })
})

test('mark paid with only an ad (no farmer) works; with neither it refuses and stamps nothing', () => {
  const adOnly = S({ announcements: [A('a1', { mitra_id: 'A' })] })
  assert.equal(markPaid(adOnly, 'A', 5, 'd').payments[0].business_count, 1)
  assert.throws(() => markPaid(S(), 'A', 5, 'd'), /nothing_unpaid/)
  assert.throws(() => markPaid(S(), 'nope', 5, 'd'), /not_found/)
})

test('a paid ad cannot be re-attributed; an unpaid one can, or be cleared; unknown ad or Mitra = not_found', () => {
  const s = S({ announcements: [A('a1', { mitra_id: 'A' })] })
  const paid = markPaid(s, 'A', 5, 'd')
  assert.throws(() => setAnnouncementMitra(paid, 'a1', 'B'), /already_paid/)
  assert.throws(() => setAnnouncementMitra(paid, 'a1', null), /already_paid/)
  assert.equal(setAnnouncementMitra(s, 'a1', 'B').announcements[0].mitra_id, 'B')
  assert.equal(setAnnouncementMitra(s, 'a1', null).announcements[0].mitra_id, null)
  assert.equal(setAnnouncementMitra(s, 'a1', 'Z').announcements[0].mitra_id, 'Z', 'an inactive Mitra may keep an old ad')
  assert.throws(() => setAnnouncementMitra(s, 'nope', 'A'), /not_found/)
  assert.throws(() => setAnnouncementMitra(s, 'a1', 'nope'), /not_found/)
})

test('a deleted ad leaves the unpaid count; a paid ad keeps its payment row', () => {
  const s = S({ announcements: [A('a1', { mitra_id: 'A' }), A('a2', { mitra_id: 'A' })] })
  const noA1 = { ...s, announcements: s.announcements.filter((a) => a.id !== 'a1') }
  assert.equal(countsFor(noA1, 'A', NOW).counted_unpaid_businesses, 1)
  const paid = markPaid(s, 'A', 10, 'd')
  const deleted = { ...paid, announcements: paid.announcements.filter((a) => a.id !== 'a1') }
  assert.equal(deleted.payments.length, 1)
  assert.equal(deleted.payments[0].business_count, 2)
})

test('unattributed_total = people who offered a service and have no Mitra', () => {
  const s = S({ profiles: [P(1), P(2), P(3, { mitra_id: 'A' }), P(4)], listings: [L(1), L(3)] })
  assert.equal(unattributedTotal(s), 1)
})

test('choice open: no Mitra AND no offer ever (any status, removed and closed included); never for a person with a Mitra', () => {
  const p = (o) => S({ profiles: [P(1, o)] })
  assert.equal(choiceOpen(p({}), 1), true)
  assert.equal(choiceOpen(p({ mitra_id: 'A' }), 1), false)
  for (const status of ['active', 'closed', 'removed', 'disabled']) {
    assert.equal(choiceOpen({ ...p({}), listings: [L(1, { status })] }, 1), false, `an earlier ${status} offer closes the choice`)
  }
  assert.equal(choiceOpen({ ...p({}), listings: [L(1, { listing_type: 'requirement' })] }, 1), true, 'a requirement is not an offer')
  assert.equal(choiceOpen(p({}), 99), false)
})

test('an older registered farmer who never offered DOES get the choice (it is about offers, not account age)', () => {
  const s = S({ profiles: [P(1, { created_at: ago(400 * DAY) })] })
  assert.equal(choiceOpen(s, 1), true)
  const r = setMyMitraOnOffer({ ...s, listings: [L(1, { id: 'first' })] }, 1, 'A', 'first', NOW)
  assert.equal(r.status, 'set')
})

test('set_my_mitra_on_offer: saves once for the first offer; a second offer in the same 30 minutes does not qualify', () => {
  const first = L(1, { id: 'o1', created_at: ago(120000) })
  const second = L(1, { id: 'o2', created_at: ago(60000) })
  const s = S({ profiles: [P(1)], listings: [first, second] })
  const no = setMyMitraOnOffer(s, 1, 'A', 'o2', NOW)
  assert.equal(no.status, 'not_first_offer')
  assert.equal(no.state.profiles[0].mitra_id, null)
  const ok = setMyMitraOnOffer(s, 1, 'A', 'o1', NOW)
  assert.equal(ok.status, 'set')
  assert.equal(ok.state.profiles[0].mitra_id, 'A')
  assert.equal(setMyMitraOnOffer(ok.state, 1, 'B', 'o1', NOW).status, 'already_set', 're-submitting the same form saves no second Mitra')
  assert.equal(setMyMitraOnOffer(ok.state, 1, 'B', 'o1', NOW).state.profiles[0].mitra_id, 'A')
})

test('set_my_mitra_on_offer: an earlier REMOVED offer also means "not first" (deleting cannot re-open the choice)', () => {
  const s = S({ profiles: [P(1)], listings: [L(1, { id: 'old', status: 'removed', created_at: ago(5 * DAY) }), L(1, { id: 'new', created_at: ago(1000) })] })
  assert.equal(setMyMitraOnOffer(s, 1, 'A', 'new', NOW).status, 'not_first_offer')
})

test('set_my_mitra_on_offer: every other quiet "no"', () => {
  const base = S({ profiles: [P(1), P(2)], listings: [L(1, { id: 'mine' }), L(2, { id: 'theirs' }), L(1, { id: 'req', listing_type: 'requirement', created_at: ago(500000) }), L(1, { id: 'late', created_at: ago(THIRTY_MIN_MS + 5000) })] })
  assert.equal(setMyMitraOnOffer(base, 1, null, 'mine', NOW).status, 'none')
  assert.equal(setMyMitraOnOffer(base, 99, 'A', 'mine', NOW).status, 'no_profile')
  assert.equal(setMyMitraOnOffer(base, 1, 'A', 'theirs', NOW).status, 'not_your_offer')
  assert.equal(setMyMitraOnOffer(base, 1, 'A', 'req', NOW).status, 'not_your_offer', 'a requirement is not an offer')
  assert.equal(setMyMitraOnOffer(base, 1, 'A', 'missing', NOW).status, 'not_your_offer')
  assert.equal(setMyMitraOnOffer(base, 1, 'A', 'late', NOW).status, 'too_late')
  assert.equal(setMyMitraOnOffer({ ...base, listings: base.listings.filter((l) => l.id === 'mine') }, 1, 'Z', 'mine', NOW).status, 'no_such_mitra', 'inactive')
  assert.equal(setMyMitraOnOffer({ ...base, listings: base.listings.filter((l) => l.id === 'mine') }, 1, 'nope', 'mine', NOW).status, 'no_such_mitra')
  assert.equal(setMyMitraOnOffer({ ...base, profiles: [P(1, { mitra_id: 'B' }), P(2)] }, 1, 'A', 'mine', NOW).status, 'already_set')
})

test('first_offer_at is the earliest LIVE offer; a person with only a removed offer has none', () => {
  const s = S({ profiles: [P(1), P(2)], listings: [L(1, { created_at: ago(9000) }), L(1, { created_at: ago(3000) }), L(2, { status: 'removed' })] })
  assert.equal(firstOfferAt(s, s.profiles[0]), NOW - 9000)
  assert.equal(firstOfferAt(s, s.profiles[1]), null)
})

test('reassign still works the same way: a paid person cannot be moved', () => {
  const s = S({ profiles: [P(1, { mitra_id: 'A' })], listings: [L(1)] })
  const paid = markPaid(s, 'A', 1, 'd')
  assert.throws(() => reassign(paid, 1, 'B'), /already_paid/)
  assert.equal(reassign(s, 1, 'B').profiles[0].mitra_id, 'B')
})
