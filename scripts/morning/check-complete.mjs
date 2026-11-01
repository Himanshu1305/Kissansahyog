// Batch 17C - "Is today's morning post already complete?" Runs as the FIRST step of the Morning post workflow, before npm ci,
// so a try that has nothing to do costs seconds. Dependency-free: needs Node 18 or newer (built-in fetch); setup-node runs after this step.
//
// Complete = the database holds a voice AND a video for today's IST date (migrations 0073 and 0074: morning_post_context returns
// today.voice_sha256 and today.has_video; both are stored only after the message and card exist). Batch 17E added the video:
// a post with a voice but no video is NOT complete, so the early tries keep trying. Anything unclear (error, timeout, no voice key,
// wrong answer, an old database that does not return has_video) means "not complete": fail OPEN, so a broken check can never
// stop the post being made.
// It only asks the database when the run is a scheduled try, or a manual run started with check_first ON.
// It never prints the secret, the keys, request headers or the database's answer.
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { istDate } from './lib/ist.js'

export const CHECK_TIMEOUT_MS = 15000

// The workflow passes `${{ inputs.check_first }}`: 'true', 'false', or empty (scheduled runs have no inputs).
export const parseCheckFirst = (v) => String(v ?? '').trim().toLowerCase() === 'true'

// -> { complete: boolean, summary: string }
export async function decide({ eventName, checkFirst = false, env = {}, now = new Date(), fetchImpl = fetch, timeoutMs = CHECK_TIMEOUT_MS }) {
  const date = istDate(now)
  const run = (why) => ({ complete: false, summary: `Running: ${why}` })
  if (eventName !== 'schedule' && !checkFirst) return run('this is a manual run, so the full job always runs.')
  const url = String(env.SUPABASE_URL || '').trim().replace(/\/+$/, '')
  const key = String(env.SUPABASE_ANON_KEY || '').trim()
  const secret = String(env.MORNING_POST_SECRET || '').trim()
  if (!String(env.ELEVENLABS_API_KEY || '').trim()) return run('the voice is not set up (no ElevenLabs key), so the post cannot be complete.')
  if (!url || !key || !secret) return run('the database settings are missing, so the check was not possible.')

  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const r = await fetchImpl(`${url}/rest/v1/rpc/morning_post_context`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_secret: secret, p_date: date }),
      signal: ctl.signal,
    })
    const text = await r.text()
    let body = null
    try { body = JSON.parse(text) } catch { return run(`the check could not read the database answer (http ${r.status}).`) }
    if (!r.ok) return run(`the check got http ${r.status} from the database.`)
    if (!body || body.ok !== true) return run('the database did not accept the check.')
    const sha = body.today && body.today.voice_sha256
    const hasVoice = typeof sha === 'string' && sha.length > 0
    if (hasVoice && body.today.has_video === true) return { complete: true, summary: `Skipped: today's post (${date}) is already complete (voice and video present).` }
    if (hasVoice) return run(`the voice is stored for ${date} but the video is not (yet).`)
    return run(`no voice stored for ${date} yet.`)
  } catch (e) {
    return run(ctl.signal.aborted ? 'the check timed out.' : 'the check could not reach the database.')
  } finally { clearTimeout(timer) }
}

async function main() {
  const env = process.env
  let r
  try {
    r = await decide({ eventName: env.GITHUB_EVENT_NAME, checkFirst: parseCheckFirst(env.CHECK_FIRST), env })
  } catch { r = { complete: false, summary: 'Running: the check failed unexpectedly.' } }
  console.log(r.summary)
  try { if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `complete=${r.complete}\n`) } catch { /* never block the post */ }
  try { if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${r.summary}\n`) } catch { /* ignore */ }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().then(() => process.exit(0), () => process.exit(0))
