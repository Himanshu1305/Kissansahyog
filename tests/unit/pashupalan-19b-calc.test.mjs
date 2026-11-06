// Batch 19-B - the milk income calculator is pure arithmetic: blank, zero and decimal inputs.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { milkMath, parseNum, AID_PER_COW } from '../../src/lib/pashupalan/milk-calc.js'

test('parseNum: blank, junk and negatives are null; zero and decimals are numbers; comma decimals work', () => {
  for (const v of ['', '   ', null, undefined, 'abc', '-1', 'NaN', 'Infinity']) assert.equal(parseNum(v), null, String(v))
  assert.equal(parseNum('0'), 0); assert.equal(parseNum('2.5'), 2.5); assert.equal(parseNum('2,5'), 2.5); assert.equal(parseNum(4), 4)
})

test('milkMath: any blank box gives null (nothing is shown)', () => {
  assert.equal(milkMath({ animals: '', litres: '5', price: '40', cost: '100' }), null)
  assert.equal(milkMath({ animals: '2', litres: '5', price: '', cost: '100' }), null)
  assert.equal(milkMath({}), null)
})

test('milkMath: monthly income, cost and difference over 30 days', () => {
  const r = milkMath({ animals: '2', litres: '5', price: '40', cost: '100' })
  assert.deepEqual(r, { income: 12000, spend: 6000, diff: 6000, aidAmount: 0, diffWithAid: 6000 })
})

test('milkMath: zero is valid, a loss is negative, decimals are exact to the paisa', () => {
  assert.equal(milkMath({ animals: '0', litres: '5', price: '40', cost: '100' }).income, 0)
  assert.equal(milkMath({ animals: '1', litres: '0', price: '40', cost: '100' }).diff, -3000)
  const d = milkMath({ animals: '1.5', litres: '3.3', price: '37.5', cost: '10.1' })
  assert.equal(d.income, 5568.75); assert.equal(d.spend, 454.5); assert.equal(d.diff, 5114.25)
})

test('milkMath: the Rs 900 switch adds animals x 900 as an illustration only', () => {
  assert.equal(AID_PER_COW, 900)
  const r = milkMath({ animals: '3', litres: '4', price: '30', cost: '60', aid: true })
  assert.equal(r.aidAmount, 2700); assert.equal(r.diffWithAid, r.diff + 2700)
  assert.equal(milkMath({ animals: '3', litres: '4', price: '30', cost: '60', aid: false }).aidAmount, 0)
})

test('the calculator file stores and sends nothing', async () => {
  const { readFile } = await import('node:fs/promises')
  for (const f of ['src/lib/pashupalan/milk-calc.js', 'src/screens/pashupalan/MilkCalc.jsx']) {
    const t = await readFile(f, 'utf8')
    assert.ok(!/localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|sendBeacon|supabase|axios|cookie/i.test(t), f)
  }
})
