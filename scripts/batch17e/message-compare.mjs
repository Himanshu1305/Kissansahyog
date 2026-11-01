// Batch 17E fix - the message must be unchanged: regenerate F1-F6 and compare byte for byte with docs/review/batch17d/evidence/message-after-*.txt.
// Usage: node scripts/batch17e/message-compare.mjs  (nothing is written except the printed result)
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { generate, loadData } from '../morning/lib/generate.js'
import { loadFixture } from '../morning/fixtures.js'

const SAMPLES = [['rain-f1', 'f1-dry'], ['rain-f2', 'f2-real-30oct'], ['rain-f3', 'f3-rain-soon'], ['rain-f4', 'f4-heavy'], ['rain-f5', 'f5'], ['rain-f6', 'f6']]
const DATA = loadData()
let bad = 0
for (const [fixture, label] of SAMPLES) {
  const fx = loadFixture(fixture)
  const res = await generate({ date: fx.date, data: DATA, nowIso: fx.nowIso, loaders: { weather: fx.weatherLoader, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) } })
  const want = readFileSync(resolve(`docs/review/batch17d/evidence/message-after-${label}.txt`), 'utf8')
  const same = res.message === want
  if (!same) bad++
  console.log(`${label}: ${same ? 'IDENTICAL' : 'DIFFERENT'} (${[...res.message].length} characters, ${[...want].length} in the 17D file)`)
}
console.log(bad ? `RESULT: ${bad} DIFFERENT` : 'RESULT: all six IDENTICAL')
process.exitCode = bad ? 1 : 0
