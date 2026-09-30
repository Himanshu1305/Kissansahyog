// PERMANENT unit test for the honest "कल का भाव (dd/mm)" mandi labeling (Phase 4c / 7b).
// Run: node scripts/test/p_mandi_labeling.mjs  (no DB needed)
import { priceStaleness, stalenessLabelKey, ddmm } from '../../src/lib/mandi/staleness.js'
import { strings } from '../../src/lib/i18n/strings.js'

let pass = 0, fail = 0
const ok = (n, c, extra = '') => { if (c) { pass++; console.log(`PASS  ${n}`) } else { fail++; console.log(`FAIL  ${n} ${extra}`) } }
// Local calendar date (Y-M-D) — matches priceStaleness, which parses `<date>T00:00:00` in
// local time. (Slicing toISOString() would use UTC and can be off by a day near midnight.)
const iso = (offset) => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// POSITIVE: today's price is plain (no tag).
ok('today → no staleness tag', priceStaleness(iso(0)) === 'today' && stalenessLabelKey('today') === null)

// POSITIVE: a stale-but-existing price one day old → "कल का भाव (dd/mm)".
ok('yesterday → कल का भाव', priceStaleness(iso(-1)) === 'yesterday' && stalenessLabelKey('yesterday') === 'mandi_price_yesterday')
ok('कल का भाव string is bilingual', strings.mandi_price_yesterday.hi === 'कल का भाव' && !!strings.mandi_price_yesterday.en)

// EDGE: older than yesterday → "पिछला भाव (dd/mm)" (honest elapsed time, not always "कल").
ok('2 days old → पिछला भाव', priceStaleness(iso(-2)) === 'older' && stalenessLabelKey('older') === 'mandi_price_older')
ok('7 days old → पिछला भाव', priceStaleness(iso(-7)) === 'older')
ok('पिछला भाव string is bilingual', strings.mandi_price_older.hi === 'पिछला भाव' && !!strings.mandi_price_older.en)

// EDGE: a genuinely never-reported commodity (no date) → null → the honest "—" treatment.
ok('null date → null (→ the "—" treatment, never a fake "कल का भाव")', priceStaleness(null) === null && priceStaleness('') === null && priceStaleness('not-a-date') === null)

// The date is ALWAYS renderable next to a non-today price (dd/mm), never hidden in a tooltip.
ok('ddmm formats the date visibly', ddmm('2026-09-22') === '22/09' && ddmm('2026-01-05') === '05/01')
ok('ddmm is safe on empty input', ddmm(null) === '' && ddmm('') === '')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
