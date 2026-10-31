// Batch 17D - makes the six "after" messages (same fixtures F1-F6 as docs/review/batch17b/evidence), the before/after file and
// WhatsApp-style preview pictures. Usage: node scripts/batch17d/message-preview.mjs
// The pictures are PREVIEWS drawn by this script (bold/italic turned into HTML, green bubble, 360 px wide). They are not real WhatsApp.
import { mkdirSync, writeFileSync, readFileSync, copyFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'
import { generate, loadData } from '../morning/lib/generate.js'
import { loadFixture } from '../morning/fixtures.js'

const OUT = resolve('docs/review/batch17d/evidence')
const BEFORE = resolve('docs/review/batch17b/evidence')
mkdirSync(OUT, { recursive: true })
const SAMPLES = [['rain-f1', 'f1-dry'], ['rain-f2', 'f2-real-30oct'], ['rain-f3', 'f3-rain-soon'], ['rain-f4', 'f4-heavy'], ['rain-f5', 'f5'], ['rain-f6', 'f6']]
const DATA = loadData()
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// WhatsApp rule (simplified): *x* bold and _x_ italic when the marks touch the text and sit at a word edge
const wa = (s) => esc(s).replace(/(^|[\s(])\*([^*\n]+?)\*(?=$|[\s.,!?:;)])/gm, '$1<b>$2</b>').replace(/(^|[\s(])_([^_\n]+?)_(?=$|[\s.,!?:;)])/gm, '$1<i>$2</i>')
const page = (text, title) => `<!doctype html><html lang="hi"><meta charset="utf-8"><title>${esc(title)}</title><style>
body{margin:0;background:#e5ddd5;font-family:"Noto Sans Devanagari","Nirmala UI","Segoe UI",system-ui,sans-serif}
.wrap{width:360px;padding:12px;box-sizing:border-box}
.cap{font:12px system-ui;color:#555;margin:0 0 6px}
.bubble{background:#dcf8c6;border-radius:8px;padding:8px 10px 6px;box-shadow:0 1px 1px rgba(0,0,0,.2);font-size:14.5px;line-height:1.4;color:#111;white-space:pre-wrap;word-wrap:break-word}
.time{display:block;text-align:right;font-size:11px;color:#667;margin-top:2px}
</style><div class="wrap"><p class="cap">Preview only - not real WhatsApp (${esc(title)})</p><div class="bubble" id="b">${wa(text)}<span class="time">6:00 am ✓✓</span></div></div></html>`

const shots = []
for (const [fixture, label] of SAMPLES) {
  const fx = loadFixture(fixture)
  const res = await generate({ date: fx.date, data: DATA, nowIso: fx.nowIso, loaders: { weather: fx.weatherLoader, mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) } })
  writeFileSync(join(OUT, `message-after-${label}.txt`), res.message, 'utf8')
  copyFileSync(join(BEFORE, `message-${label}.txt`), join(OUT, `message-before-${label}.txt`))
  const html = join(OUT, `message-preview-${label}.html`)
  writeFileSync(html, page(res.message, `${label} (after, ${res.message.length} characters)`), 'utf8')
  shots.push([html, join(OUT, `message-preview-${label}.png`)])
}
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 2 })
const pg = await ctx.newPage()
for (const [html, png] of shots) { await pg.goto(pathToFileURL(html).href); await pg.locator('.wrap').screenshot({ path: png }) }
await browser.close()

const read = (p) => readFileSync(p, 'utf8').replace(/\r/g, '')
const md = ['# Message before and after (Batch 17B -> 17D)', '',
  'Same facts, new layout. Six samples, same inputs as `docs/review/batch17b/evidence/` (fixtures `rain-f1` ... `rain-f6`). Before = the 17B file, After = this batch. Preview pictures `message-preview-*.png` are drawn by `scripts/batch17d/message-preview.mjs` (bold and italic turned into HTML); they are **not real WhatsApp**.', '',
  '## What moved', '',
  '| Part | 17B | 17D |', '|---|---|---|',
  '| Date | none | `📅 weekday, day month · tithi` on one line (IST date of the post) |',
  '| Tithi | `आज कृष्ण पक्ष की पंचमी` own line | on the date line: `कृष्ण पक्ष पंचमी` (bold only for एकादशी, पूर्णिमा, अमावस्या) |',
  '| Blessing | plain line | italic line `_..._` under the date |',
  '| Weather | one heading line with temperature + sky + rain, then a next-days line repeating the temperatures | heading, then `🌡️` temperature (+ sky on a dry day), then `💧` rain sentence (word for word as 17B), then next days; a next-day temperature is shown only if it differs from today\'s |',
  '| Tasks | `1.` `2.` `3.` | `✅` lines |',
  '| Mandi | 4 price lines, then 4 "crop: MSP ..." lines, the "highest price" line stuck under the first crop | one entry per crop (`▪️ *crop* price change`) with its MSP gap indented under it; `🏆 सबसे ऊँचा <crop> भाव` after the last crop |',
  '| Procurement / ask KVK line | plain | `ℹ️` in front, wording unchanged |',
  '| Trend heading | `🔎` | `📈`; the disclaimer is italic, wording unchanged |',
  '| Closing | `भाव और जानकारी: kissansahyog.com/msp` | `🌐 kissansahyog.com/msp` |',
  '| Not changed | facts, numbers, MSP and trend wording, KVK line, disclaimer, poll pointer, rain wording, size caps (1200 / 1500), drop order, lint | |', '']
for (const [, label] of SAMPLES) {
  const b = read(join(BEFORE, `message-${label}.txt`)), a = read(join(OUT, `message-after-${label}.txt`))
  md.push(`## ${label}`, '', `Before: ${[...b].length} characters. After: ${[...a].length} characters.`, '', '**Before (17B)**', '', '```', b, '```', '', '**After (17D)**', '', '```', a, '```', '', `Preview: \`message-preview-${label}.png\``, '')
}
writeFileSync(join(OUT, 'message-before-after.md'), md.join('\n'), 'utf8')
console.log('done', shots.length)
