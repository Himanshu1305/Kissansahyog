// Dev helper: render the fixture card to a path. node scripts/morning/card/try-render.mjs <fixture> <out.png> [rows] [noscheme]
import { writeFileSync } from 'node:fs'
import { cardData, renderCard } from './render.mjs'
import { generate, loadData } from '../lib/generate.js'
import { loadFixture } from '../fixtures.js'

const [name = 'normal', out = 'out/card.png'] = process.argv.slice(2)
const fx = loadFixture(name)
const r = await generate({ date: fx.date, data: loadData(), loaders: { weather: async () => fx.weather, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) } })
const res = await renderCard(cardData(r.model))
writeFileSync(out, res.png)
console.log(out, Math.round(res.png.length / 1024), 'KB', res.overflow)
