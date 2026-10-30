// npm run morning:voice-try - hear the same short sample in each model of ELEVENLABS_TRY_MODELS (comma list).
// At most 3 API calls, only when you run this command. Files: out/morning/try-<model>.mp3
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { synthesize, DEFAULT_VOICE_ID, DEFAULT_MODEL } from './elevenlabs.mjs'

export const SAMPLE = 'सीताराम किसान भाइयो! आज शुक्रवार, तीस अक्टूबर है। सागर में आज मौसम साफ़ रहेगा, और बारिश की संभावना नहीं है। चना, छह हज़ार नौ सौ पचास रुपये क्विंटल रहा, एक सौ पचास रुपये की तेज़ी के साथ।'
export const MAX_CALLS = 3

export async function tryModels({ env = process.env, outDir = join('out', 'morning'), fetchImpl = fetch, log = console.log, backoffMs } = {}) {
  const models = String(env.ELEVENLABS_TRY_MODELS || DEFAULT_MODEL).split(',').map((s) => s.trim()).filter(Boolean).slice(0, MAX_CALLS)
  if (!env.ELEVENLABS_API_KEY) { log('No ELEVENLABS_API_KEY in the environment (.env). Nothing was sent.'); return 1 }
  mkdirSync(outDir, { recursive: true })
  let bad = 0
  for (const model of models) {
    const r = await synthesize({ text: SAMPLE, apiKey: env.ELEVENLABS_API_KEY, voiceId: env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID, model, fetchImpl, backoffMs })
    if (r.ok) { writeFileSync(join(outDir, `try-${model}.mp3`), r.mp3); log(`${model}: saved ${join(outDir, `try-${model}.mp3`)} (${SAMPLE.length} characters used)`) } else { bad++; log(`${model}: failed - ${r.reason}`) }
  }
  log(`${models.length} call(s) made, ${SAMPLE.length} characters each.`)
  return bad ? 1 : 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) tryModels().then((c) => process.exit(c))
