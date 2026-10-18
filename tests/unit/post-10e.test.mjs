// Batch 10E 3B/3C — extra-information validator (src/lib/listings/extraInfo.js) and the listing date
// helpers (src/lib/listings/listingDates.js).
// Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { hasPhoneNumber, cleanExtraInfo, extraInfoError, withExtraInfo, EXTRA_INFO_MAX } from '../../src/lib/listings/extraInfo.js'
import {
  todayIst, addDays, checkListingDates, withListingDates, needsDates, listingDateParts,
  formatDatesValue, datesRow, datesLine,
} from '../../src/lib/listings/listingDates.js'

// ---------- 3B: phone numbers ----------
test('phone numbers are blocked (10+ digits, spaces / dashes / +91 between them)', () => {
  for (const s of [
    '9876543210',
    'call 98765 43210',
    '+91-98765-43210',
    '+91 98765 43210',
    '+919876543210',
    '91 9876543210',
    '098765 43210',
    '98765-43210 पर बात करें',
    '987 654 3210',
    '(+91) 98765.43210',
    '९८७६५ ४३२१०', // Devanagari digits
    'नंबर: 9 8 7 6 5 4 3 2 1 0',
    '12345678901234', // any 10+ digit run
  ]) assert.equal(hasPhoneNumber(s), true, s)
})

test('ordinary numbers are fine: 9 digits, prices, years, dates, quantities', () => {
  for (const s of [
    '987654321', // 9 digits
    '98765 4321', // 9 digits with a space
    '₹1,20,000 प्रति एकड़',
    '₹ 1,20,00,000',
    'rate 1200-1500 per day',
    'साल 2024 का मॉडल, 45 HP',
    '2023 में खरीदा, 1500 घंटे चला',
    '15-10-2026 से 20-10-2026 तक',
    '15.10.2026 - 20.10.2026',
    '3 मज़दूर, 8 घंटे, ₹500 रोज़',
    'खेत 2.5 एकड़\n1200 क्विंटल\n500 रुपये',
    '',
  ]) assert.equal(hasPhoneNumber(s), false, s)
})

test('extraInfoError: empty ok, phone blocked, normal text ok', () => {
  assert.equal(extraInfoError(''), null)
  assert.equal(extraInfoError('   \n  '), null)
  assert.equal(extraInfoError(undefined), null)
  assert.equal(extraInfoError('ट्रैक्टर नया है\nड्राइवर साथ आएगा'), null)
  assert.equal(extraInfoError('मेरा नंबर 98765 43210'), 'err_extra_info_phone')
  assert.equal(extraInfoError('+91-98765-43210'), 'err_extra_info_phone')
  assert.equal(extraInfoError('a'.repeat(EXTRA_INFO_MAX)), null)
  assert.equal(extraInfoError('a'.repeat(EXTRA_INFO_MAX + 1)), 'err_extra_info_long')
})

test('cleanExtraInfo / withExtraInfo: trimmed, newlines kept, empty → key removed', () => {
  assert.equal(cleanExtraInfo('  पहली\r\nदूसरी\n\n\n\nतीसरी  '), 'पहली\nदूसरी\n\nतीसरी')
  assert.deepEqual(withExtraInfo({ a: 1 }, ' नमस्ते \n दुनिया '), { a: 1, extra_info: 'नमस्ते \n दुनिया' })
  assert.deepEqual(withExtraInfo({ a: 1, extra_info: 'x' }, '   '), { a: 1 })
  assert.deepEqual(withExtraInfo({ a: 1 }, ''), { a: 1 })
  assert.equal('extra_info' in withExtraInfo({ a: 1 }, null), false)
})

// ---------- 3C: dates ----------
test('todayIst uses the Indian day, not the UTC day', () => {
  assert.equal(todayIst(new Date('2026-10-18T10:00:00Z')), '2026-10-18')
  assert.equal(todayIst(new Date('2026-10-18T18:29:59Z')), '2026-10-18') // 23:59:59 IST
  assert.equal(todayIst(new Date('2026-10-18T18:30:00Z')), '2026-10-19') // 00:00 IST, UTC still 18th
  assert.equal(todayIst(new Date('2026-12-31T19:00:00Z')), '2027-01-01')
})

test('addDays crosses months and years', () => {
  assert.equal(addDays('2026-10-18', 0), '2026-10-18')
  assert.equal(addDays('2026-10-18', 1), '2026-10-19')
  assert.equal(addDays('2026-10-31', 1), '2026-11-01')
  assert.equal(addDays('2026-12-31', 2), '2027-01-02')
  assert.equal(addDays('2028-02-28', 1), '2028-02-29')
})

test('checkListingDates: start required, not in the past; end optional, not before start', () => {
  const T = '2026-10-18'
  assert.deepEqual(checkListingDates(null, null, T), { field: 'available_from', key: 'err_date_required' })
  assert.deepEqual(checkListingDates('', '2026-10-20', T), { field: 'available_from', key: 'err_date_required' })
  assert.deepEqual(checkListingDates('2026-02-30', null, T), { field: 'available_from', key: 'err_date_required' })
  assert.deepEqual(checkListingDates('2026-10-17', null, T), { field: 'available_from', key: 'err_date_past' })
  assert.equal(checkListingDates('2026-10-18', null, T), null) // today is fine
  assert.equal(checkListingDates('2026-10-19', null, T), null)
  assert.equal(checkListingDates('2026-10-18', '2026-10-18', T), null) // one day
  assert.equal(checkListingDates('2026-10-18', '2027-03-31', T), null)
  assert.deepEqual(checkListingDates('2026-10-20', '2026-10-19', T), { field: 'available_to', key: 'err_date_end_before_start' })
  assert.deepEqual(checkListingDates('2026-10-20', 'garbage', T), { field: 'available_to', key: 'err_date_required' })
})

test('needsDates: only equipment, land, labor, drone didi', () => {
  for (const c of ['equipment', 'land', 'labor', 'drone_didi']) assert.equal(needsDates(c), true, c)
  for (const c of ['bhusa', 'agri_inputs', 'building_materials', 'warehouse', 'greenhouse', 'jugaad', 'transport']) assert.equal(needsDates(c), false, c)
})

test('withListingDates: saves the two keys; equipment flag off; drone preferred_date replaced; others untouched', () => {
  const form = { available_from: '2026-10-20', available_to: '' }
  assert.deepEqual(withListingDates({ x: 1 }, 'land', form), { x: 1, available_from: '2026-10-20', available_to: null })
  assert.deepEqual(withListingDates({ available_now: true, available_from: '2026-01-01', available_to: '2026-01-05' }, 'equipment', form),
    { available_now: false, available_from: '2026-10-20', available_to: null })
  assert.deepEqual(withListingDates({ crop_type: 'x', preferred_date: null }, 'drone_didi', form), { crop_type: 'x', available_from: '2026-10-20', available_to: null })
  const bhusa = { available_from: '2026-11-01' }
  assert.equal(withListingDates(bhusa, 'bhusa', form), bhusa)
})

const NOW = new Date('2026-10-18T10:00:00Z')
const L = (category, listing_type, details) => ({ category, listing_type, details })

test('display: words, not raw dates', () => {
  assert.equal(datesLine(L('labor', 'offer', { available_from: '2026-10-20' }), 'hi', NOW), 'उपलब्ध: 20 अक्टू से')
  assert.equal(datesLine(L('labor', 'requirement', { available_to: '2026-10-22' }), 'hi', NOW), 'चाहिए: 22 अक्टू तक')
  assert.equal(datesLine(L('land', 'offer', { available_from: '2026-10-20', available_to: '2027-03-31' }), 'hi', NOW), 'उपलब्ध: 20 अक्टू से 31 मार्च 2027 तक')
  assert.equal(datesLine(L('drone_didi', 'requirement', { available_from: '2026-10-22', available_to: '2026-10-22' }), 'hi', NOW), 'चाहिए: 22 अक्टू')
  assert.equal(datesLine(L('equipment', 'offer', { available_now: false, available_from: '2026-10-18' }), 'en', NOW), 'Available: from 18 Oct')
  assert.equal(datesLine(L('labor', 'requirement', { available_from: '2026-10-20', available_to: '2026-10-25' }), 'en', NOW), 'Needed: 20 Oct to 25 Oct')
})

test('display: old rows — equipment "available now" kept (stale dates ignored), drone preferred_date read, no dates → nothing', () => {
  const oldNow = L('equipment', 'offer', { available_now: true, available_from: '2025-01-01', available_to: '2025-01-09' })
  assert.deepEqual(listingDateParts(oldNow), { kind: 'offer', now: true })
  assert.equal(datesLine(oldNow, 'hi', NOW), 'अभी उपलब्ध')
  assert.deepEqual(datesRow(oldNow, 'hi', NOW), { label: 'उपलब्धता', value: 'अभी उपलब्ध', dates: true })
  assert.equal(datesLine(L('drone_didi', 'requirement', { preferred_date: '2026-10-25' }), 'hi', NOW), 'चाहिए: 25 अक्टू से')
  assert.equal(datesLine(L('land', 'offer', { size_acres: 2 }), 'hi', NOW), null)
  assert.equal(datesLine(L('labor', 'offer', { available_from: null, available_to: null }), 'hi', NOW), null)
  // out-of-scope categories never get a date line (bhusa keeps its own row)
  assert.equal(datesLine(L('bhusa', 'offer', { available_from: '2026-10-20' }), 'hi', NOW), null)
  assert.equal(formatDatesValue(null), '')
})
