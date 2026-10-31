// Batch 17B follow-up - lists every /mausam output that changed between the 17A and 17B logic, each tied to a decision number in
// docs/review/batch17b/DECISIONS.md (R = threshold row, D = builder decision, T = task rule). An output with no decision is printed as
// "NO DECISION" and makes the script exit 1 (that would be a defect to restore).
//   node scripts/batch17b/rain-behaviour-diff.mjs <before.json> <after.json> <out.md>
import { readFileSync, writeFileSync } from 'node:fs'

const [bp, ap, outp] = process.argv.slice(2)
const B = JSON.parse(readFileSync(bp, 'utf8')), A = JSON.parse(readFileSync(ap, 'utf8'))
const status = (v) => v.split(' / ')[0]

// -> decision ids (string) or null
function decide(id, field, o, n) {
  if (field === 'irrigation') {
    if (status(o) === 'caution' && n === 'ok / aw_irrig_none') return 'D6 (soil adequate or wet and not hot-dry is green "No irrigation needed now")'
    return null
  }
  if (field === 'spray') {
    if (id === 'light-8mm-no-hourly' && status(n) === 'stop') return 'D5 (only a day total known: 8 mm or more stops spraying)'
    if (id === 'dry-no-hourly' && status(n) === 'caution') return 'D5 (only a day total known: the day\'s highest wind, 10 km/h, is read as wind 10-15, rule R8)'
    if (status(o) === 'caution' && status(n) === 'ok') return 'R8 + R9 (caution needs 2.5 mm in 24 h; a trace or drizzle under that is OK)'
    return null
  }
  if (field === 'harvest') {
    if (status(o) === 'caution' && status(n) === 'ok') return 'R11 + R1 (caution needs 2.5 mm in 72 h; a trace is not rain)'
    return null
  }
  if (field === 'badge') {
    if (o.startsWith('badge shown') && n === 'no badge') return 'R1 + D2 (a day total under 1 mm is a trace: no badge)'
    if (o.startsWith('badge shown') && n.startsWith("badge shown: Today's total")) return 'D2 (the badge now says it is the day total and uses the same class names)'
    return null
  }
  if (field === 'banner') {
    if (n.startsWith('Only a light drizzle')) return 'R2 + D3 (48 hours that only reach drizzle say so instead of "next rain")'
    if (n.startsWith('No more rain expected')) return 'D2 (rain already fell today and none is coming: say so)'
    if (id === 'light-8mm-no-hourly' && n.startsWith('Next rain')) return 'D5 (only a day total known: it is used, 17A said "no rain" because it had no hourly series)'
    return null
  }
  return null
}

const FIELDS = ['spray', 'irrigation', 'harvest', 'sowing', 'rain_strip', 'banner', 'badge']
const rows = []; let bad = 0; let total = 0
for (const id of Object.keys(B.results)) {
  for (const f of FIELDS) {
    total++
    const o = B.results[id][f], n = A.results[id][f]
    if (o === n) continue
    const d = decide(id, f, o, n)
    if (!d) bad++
    rows.push({ id, f, o, n, d })
  }
}
const lines = [
  '# Batch 17A vs 17B - what changed on the public /mausam rules',
  '',
  `${Object.keys(B.results).length} fixed inputs x ${FIELDS.length} outputs = ${total} outputs compared. **${rows.length} changed**, ${total - rows.length} unchanged. Changes with no decision: **${bad}**.`,
  'Old = release-17a (`weatherRules.js`, `rainAlert.js`, the banner and badge decision of `Mausam.jsx`). New = release-17b. Same inputs in `scripts/batch17b/rain-behaviour.mjs`; raw results in `rain-behaviour-before.json` and `rain-behaviour-after.json`.',
  'Decision numbers are those of `docs/review/batch17b/DECISIONS.md` (R = threshold row, D = builder decision, T = task rule).',
  '',
  'Restored in this follow-up because no decision covered them: irrigation with dry or unknown soil (17B had turned the 17A caution into a green "No irrigation needed now", which is untrue for dry soil) and the spray-caution sentence (17B had added two new wordings; 17A\'s "Possible rain/wind" is back).',
  '',
  '| Input | Output | 17A (old) | 17B (new) | Decision |',
  '|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.id} | ${r.f} | ${r.o} | ${r.n} | ${r.d || '**NO DECISION**'} |`),
  '',
  `Unchanged for every input: sowing, rain strip (Homepage), and all outputs not listed above.`,
  '',
]
writeFileSync(outp, lines.join('\n'), 'utf8')
console.log(`${Object.keys(B.results).length} inputs, ${total} outputs, ${rows.length} changed, ${bad} without a decision -> ${outp}`)
process.exit(bad ? 1 : 0)
