// node docs/review/batch18/evidence/voice-counts.mjs -> voice-counts.txt (Batch 18 P3: characters before/after, estimated seconds)
import { writeFileSync } from 'node:fs'
import { run } from '../../../../tests/unit/helpers/morning18.mjs'
import { buildVoiceScript } from '../../../../scripts/morning/voice/voiceScript.mjs'
const RATE = 17 // characters per second, a conservative reading of the real 17E voice (34.7 s); ffmpeg and ElevenLabs are not available here, so seconds are an ESTIMATE
const out = ['Voice script characters, before (no district sentence) and after, F1-F6 x scenarios. Seconds = chars / 17 (estimate, not measured).']
for (const sc of ['all-dry', 'rain-two', 'one-unavailable']) for (let i = 1; i <= 6; i++) {
  const r = await run(i, sc)
  const a = buildVoiceScript({ ...r.model, districts: null }), b = buildVoiceScript(r.model)
  out.push(`F${i} ${sc}: ${a.chars} -> ${b.chars} (${b.districtAdded ? '+' + (b.chars - a.chars) + ', ' + (((b.chars / a.chars) - 1) * 100).toFixed(1) + '%' : 'sentence not added'}); est ${(a.chars / RATE).toFixed(1)} s -> ${(b.chars / RATE).toFixed(1)} s`)
}
writeFileSync('docs/review/batch18/evidence/voice-counts.txt', out.join('\n') + '\n'); console.log(out.join('\n'))
