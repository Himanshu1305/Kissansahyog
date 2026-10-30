// Dev helper: renders the 30 Oct reference sample (5 rows, scheme, tip) with the real template, for comparing with
// docs/review/batch17a/reference/sample-card-30-oct.png.  node scripts/morning/card/reference-sample.mjs <out.png>
import { writeFileSync } from 'node:fs'
import { cardData, renderCard } from './render.mjs'
import { generate, loadData } from '../lib/generate.js'
import { loadFixture } from '../fixtures.js'

const fx = loadFixture('normal')
const r = await generate({ date: fx.date, data: loadData(), loaders: { weather: async () => fx.weather, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) } })
const m = r.model
const it = (n, p, d, mk) => ({ crop: {}, name: n, price: p, delta: d, best: { market: mk, price: p }, series: [] })
m.mandi = { ...m.mandi, shown: [it('गेहूं', 2700, 0, 'अजयगढ़'), it('चना', 6950, 150, 'अजयगढ़'), it('सरसों', 8050, -450, 'अजयगढ़'), it('सोयाबीन', 6539, -11, 'बड़ामलहरा'), it('लहसुन', 7000, 1000, 'दमोह')], extra: [] }
m.slot = { kind: 'scheme', lines: [], scheme: { title_hi: 'पीएम-किसान', who_hi: 'साल में ₹6,000, तीन किस्तों में सीधे बैंक खाते में। ई-केवाईसी और आधार-लिंक खाता ज़रूरी।' } }
m.tasks = ['बुवाई से पहले बीज का उपचार ज़रूर करें']
const res = await renderCard(cardData(m))
writeFileSync(process.argv[2] || 'out/card-sample.png', res.png)
console.log(Math.round(res.png.length / 1024), 'KB', res.overflow)
