// node docs/review/batch18/evidence/make-cards.mjs -> card-*.png in this folder + a size/overflow table (Batch 18 P2)
import { writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'
import { run } from '../../../../tests/unit/helpers/morning18.mjs'
import { cardData, renderCard } from '../../../../scripts/morning/card/render.mjs'
const CASES = [
  ['all-dry', 1, 'all-dry'], ['mixed-heavy', 4, 'heavy'], ['rain-two', 3, 'rain-two'], ['one-unavailable', 1, 'one-unavailable'], ['all-unavailable', 1, 'all-unavailable'], ['none-off', 1, null],
]
const browser = await chromium.launch()
const lines = []
for (const [name, f, sc] of CASES) {
  const r = await run(f, sc)
  const { png, overflow } = await renderCard(cardData(r.model), { browser })
  writeFileSync(`docs/review/batch18/evidence/card-${name}.png`, png)
  lines.push(`${name}: ${Math.round(png.length / 1024)} KB, overflow: ${overflow.length ? overflow.join(' | ') : 'none'}`)
}
await browser.close()
console.log(lines.join('\n')); writeFileSync('docs/review/batch18/evidence/card-report.txt', lines.join('\n') + '\n')
