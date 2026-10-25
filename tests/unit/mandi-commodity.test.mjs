// Batch 10E — refresh-data's commodity matching: Arhar/Tur/Red gram must never be stored as चना (Gram).
// Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { matchCommodity } from '../../scripts/lib/mandi-commodity.mjs'

test('Arhar / Tur / Red gram is NOT Gram', () => {
  for (const n of ['Red gram/Arhar/Tur(whole)', 'Arhar (Tur/Red Gram)(Whole)', 'Arhar Dal(Tur Dal)', 'red gram', 'Tur', 'Toor Dal'])
    assert.equal(matchCommodity(n, 'Gram'), false, n)
})

test('real Gram (Bengal gram / chana) still is Gram', () => {
  for (const n of ['Bengal Gram(Gram)(Whole)', 'Gram', 'gram raw(chholia)'])
    assert.equal(matchCommodity(n, 'Gram'), true, n)
})

test('green gram (moong) and black gram (urad) stay out of Gram and in their own crops', () => {
  assert.equal(matchCommodity('Green Gram(Moong)(Whole)', 'Gram'), false)
  assert.equal(matchCommodity('Black Gram(Urd Beans)(Whole)', 'Gram'), false)
  assert.equal(matchCommodity('Green Gram(Moong)(Whole)', 'Moong'), true)
  assert.equal(matchCommodity('Black Gram(Urd Beans)(Whole)', 'Urad'), true)
})

test('other crops unchanged', () => {
  assert.equal(matchCommodity('Wheat', 'Wheat'), true)
  assert.equal(matchCommodity('Soyabean', 'Soyabean'), true)
  assert.equal(matchCommodity('Paddy(Common)', 'Paddy(Dhan)(Common)'), true)
  assert.equal(matchCommodity('Mustard', 'Wheat'), false)
})
