// npm run morning -- [--date YYYY-MM-DD] [--draft] [--fixtures normal|rainy|missing-mandi|no-weather] [--out dir] [--no-image] [--save] [--voice] [--no-voice]
// Makes the daily "सुबह की खबर" message, card and poll text. Read-only on the database (anon key); see docs/review/batch16a/HOWTO.md.
import { pathToFileURL } from 'node:url'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { istDate, isIsoDate, addDays } from './lib/ist.js'
import { generate, loadData, makeDefaultLoaders } from './lib/generate.js'
import { fetchMandiRows } from './lib/supa.js'
import { loadFixture } from './fixtures.js'
import { saveToDatabase } from './lib/save.js'
import { makeVoice } from './voice/make.mjs'

export function parseArgs(argv) {
  const a = { date: null, draft: false, fixtures: null, out: null, image: true, save: false, voice: false, noVoice: false }
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]
    if (k === '--date') a.date = argv[++i]
    else if (k === '--draft') a.draft = true
    else if (k === '--fixtures') a.fixtures = argv[++i]
    else if (k === '--out') a.out = argv[++i]
    else if (k === '--no-image') a.image = false
    else if (k === '--save') a.save = true
    else if (k === '--voice') a.voice = true
    else if (k === '--no-voice') a.noVoice = true
    else throw new Error(`unknown option ${k}`)
  }
  return a
}

const envUrl = () => process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const envKey = () => process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv)
  const fx = args.fixtures ? loadFixture(args.fixtures, args.date || undefined) : null
  const date = args.date || (fx ? fx.date : istDate())
  if (!isIsoDate(date)) throw new Error(`bad --date "${date}", use YYYY-MM-DD`)
  const data = loadData()
  const url = envUrl(), key = envKey()

  const loaders = fx
    ? { weather: fx.weatherLoader || (async () => fx.weather), mandi: async () => ({ rows: fx.rows, flag: 'fixture' }) }
    : {
        ...makeDefaultLoaders({ url, key }),
        mandi: async () => {
          if (!url || !key) throw new Error('no SUPABASE_URL / SUPABASE_ANON_KEY (or VITE_ equivalents) in the environment')
          return fetchMandiRows({ url, key, endDate: addDays(date, -1) })
        },
      }

  let saveCtx = null
  if (args.save) {
    saveCtx = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY, secret: process.env.MORNING_POST_SECRET }
    if (!saveCtx.url || !saveCtx.key || !saveCtx.secret) {
      console.error('--save needs SUPABASE_URL, SUPABASE_ANON_KEY and MORNING_POST_SECRET in the environment. Nothing was generated.')
      return 1
    }
    const { yesterdayFromContext } = await import('./lib/save.js')
    loaders.yesterdayPoll = (d) => yesterdayFromContext({ ...saveCtx, date: d })
  }

  const res = await generate({ date, draft: args.draft, data, loaders, nowIso: fx && fx.nowIso ? fx.nowIso : undefined })
  const outDir = resolve(args.out || join('out', 'morning', date))
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'message.txt'), res.message + '\n', 'utf8')
  writeFileSync(join(outDir, 'poll.txt'), res.poll + '\n', 'utf8')

  let cardNote = 'card.png not made (--no-image)'
  let png = null
  if (args.image) {
    const { cardData, renderCard } = await import('./card/render.mjs')
    const r = await renderCard(cardData(res.model))
    png = r.png
    writeFileSync(join(outDir, 'card.png'), png)
    cardNote = `card.png made (${Math.round(png.length / 1024)} KB)${r.overflow.length ? `; LAYOUT WARNING: ${r.overflow.join(' | ')}` : ''}`
  }
  const report = `${res.report}\n${cardNote}\n`
  writeFileSync(join(outDir, 'report.txt'), report, 'utf8')

  if (!res.haveWeather && !res.haveMandi) {
    console.error('Neither weather nor mandi data could be loaded. Files were written but there is little in them.')
    console.error(`See ${join(outDir, 'report.txt')}`)
    return 2
  }

  let saveLine = null
  if (args.save) {
    const s = await saveToDatabase({ ...saveCtx, date, message: res.message, poll: res.poll, pollQuestionId: res.pollQuestionId, png, report })
    saveLine = s.line
    if (s.exit) { console.log(s.line); return s.exit }
  }

  // The voice note never blocks the post: it runs after the message is saved; any problem is only a line in report.txt.
  let voiceLine = ''
  try {
    const v = await makeVoice({ model: res.model, outDir, noVoice: args.noVoice, callApi: args.save || args.voice, save: args.save ? { ...saveCtx, date } : null })
    voiceLine = v.line
  } catch (e) { voiceLine = `voice skipped: ${String(e && e.message).slice(0, 120)}` }
  console.log(voiceLine)
  writeFileSync(join(outDir, 'report.txt'), `${report}${voiceLine}\n`, 'utf8')

  console.log('')
  console.log(`1. Today's message is ready for ${date}${args.draft ? ' (DRAFT mode)' : ''}.`)
  console.log(`2. Folder: ${outDir}`)
  console.log(`3. Files: message.txt (paste), card.png (post), poll.txt (make the poll), report.txt (details). ${res.message.length} characters.`)
  console.log(`4. ${saveLine || (res.violations.length ? `PROBLEM: ${res.violations.join('; ')}` : res.warn || (!res.haveWeather ? 'Note: weather was not available today, so the weather part is missing.' : !res.haveMandi ? 'Note: fresh mandi prices were not available, so the price part says so.' : 'No warnings.'))}`)
  console.log('5. Please read message.txt once before posting.')
  return res.violations.length ? 3 : 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((c) => process.exit(c ?? 0)).catch((e) => { console.error(`Stopped: ${e.message}`); process.exit(1) })
}
