// node docs/review/batch18/evidence/make-compare.mjs  -> message-compare.txt and message-new-*.txt (Batch 18 regression proof)
import { writeFileSync } from 'node:fs'
import { run, baseline, withoutSection, sectionOf, crlf } from '../../../../tests/unit/helpers/morning18.mjs'
const out = ['Batch 18 - message regression proof (baseline = origin/main code, saved before any change: baseline-F1..F6.txt)', '']
for (let i = 1; i <= 6; i++) {
  const dry = await run(i, 'all-dry'), off = await run(i, 'all-dry', { env: { MORNING_DISTRICTS: 'off' } }), none = await run(i, null)
  const b = baseline(i)
  const added = crlf(dry.message).split('\n').length - b.split('\n').length
  out.push(`F${i}: baseline ${b.length} chars | new (all six available) ${dry.message.length} chars, +${added} lines (8 section lines + 1 blank)`)
  out.push(`    new message minus the section == baseline byte for byte: ${withoutSection(dry.message) === b}`)
  out.push(`    MORNING_DISTRICTS=off == baseline byte for byte: ${crlf(off.message) === b}`)
  out.push(`    no district loader == baseline byte for byte: ${crlf(none.message) === b}`)
  out.push(`    dropped to fit: ${dry.compose.dropped.join(',') || 'nothing'}; lint violations: ${dry.violations.length}`)
  writeFileSync(`docs/review/batch18/evidence/message-new-F${i}-all-dry.txt`, dry.message + '\n')
}
const rain = await run(3, 'rain-two'), heavy = await run(4, 'heavy'), un = await run(1, 'one-unavailable')
out.push('', 'SECTION, all dry (F1):', sectionOf((await run(1, 'all-dry')).message), '', 'SECTION, rain in Panna and Chhatarpur (F3 Sagar):', sectionOf(rain.message), '', 'SECTION, heavy rain in Tikamgarh (F4 Sagar):', sectionOf(heavy.message), '', 'SECTION, Niwari unavailable (F1):', sectionOf(un.message))
writeFileSync('docs/review/batch18/evidence/message-compare.txt', out.join('\n') + '\n')
console.log(out.join('\n'))
