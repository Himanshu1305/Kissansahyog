// `npm run morning -- --save` (Part B): store the day's post in the database through the two narrow functions
// morning_post_context / morning_post_upsert. Only the public anon key plus the shared secret are used; neither is ever printed.
import { rpc } from './supa.js'

export const MAX_MESSAGE = 4000
export const MAX_CARD_B64 = 900000

// -> { question_id, pct } | null. Throws Error('forbidden') when the secret is wrong.
export async function yesterdayFromContext({ url, key, secret, date, fetchImpl = fetch }) {
  const r = await rpc({ url, key, fetchImpl, name: 'morning_post_context', args: { p_secret: secret, p_date: date } })
  const b = r.body
  if (b && b.ok === true) {
    const y = b.yesterday || {}
    return y.poll_result_pct == null ? null : { question_id: y.poll_question_id ?? null, pct: y.poll_result_pct }
  }
  if (b && b.error === 'forbidden') throw new Error('forbidden')
  throw new Error(`context call failed (http ${r.status})`)
}

// -> { exit: 0|1|undefined, line } ; exit undefined = saved fine, carry on with the normal summary.
export async function saveToDatabase({ url, key, secret, date, message, poll, pollQuestionId, png, report, fetchImpl = fetch }) {
  const card = png ? Buffer.from(png).toString('base64') : null
  if (message.length > MAX_MESSAGE) return { exit: 1, line: `Not saved: the message is ${message.length} characters (the database limit is ${MAX_MESSAGE}).` }
  if (card && card.length > MAX_CARD_B64) return { exit: 1, line: `Not saved: the card image is too large (${Math.round(png.length / 1024)} KB; the limit is about ${Math.round(MAX_CARD_B64 * 0.75 / 1024)} KB).` }
  let r
  try {
    r = await rpc({ url, key, fetchImpl, name: 'morning_post_upsert', args: { p_secret: secret, p_date: date, p_message: message, p_poll: poll, p_poll_question_id: pollQuestionId, p_card_b64: card, p_report: report } })
  } catch (e) { return { exit: 1, line: `Not saved: could not reach the database (${e.message}).` } }
  const b = r.body
  if (b && b.ok === true) return { line: `Saved to the database for ${date}${card ? ` (card ${Math.round(png.length / 1024)} KB)` : ''}. Open the admin page /admin/morning.` }
  if (b && b.error === 'already_posted') return { exit: 0, line: `Not changed: the post for ${date} is already marked as posted, so it was left as it is.` }
  if (b && b.error === 'forbidden') return { exit: 1, line: 'Not saved: the database refused the secret. The MORNING_POST_SECRET does not match the one stored in the database. Run scripts/morning/make-secret.mjs again and update both places (see docs/review/batch16b/SECURITY.md).' }
  if (b && (b.error === 'bad_date' || b.error === 'too_large')) return { exit: 1, line: `Not saved: the database said "${b.error}".` }
  return { exit: 1, line: `Not saved: unexpected answer from the database (http ${r.status}).` }
}
