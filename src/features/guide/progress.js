// Finished demos + the optional badge name. Stays in this browser only (HARD RULE 7):
// localStorage wrapped in try/catch, with an in-memory copy when storage throws.
import { GUIDE_ORDER } from './config.js'

const DONE_KEY = 'ks_guide_done_v1'
const NAME_KEY = 'ks_guide_name_v1'
const mem = { done: {}, name: '' }

function read(key) {
  try { return localStorage.getItem(key) } catch { return null }
}
function write(key, value) {
  try { localStorage.setItem(key, value) } catch { /* private mode / blocked: memory copy only */ }
}

export function getDone() {
  let saved = {}
  try { saved = JSON.parse(read(DONE_KEY) || '{}') || {} } catch { saved = {} }
  const out = {}
  for (const id of GUIDE_ORDER) if (saved[id] || mem.done[id]) out[id] = 1
  return out
}

export function markDone(id) {
  if (!GUIDE_ORDER.includes(id)) return getDone()
  mem.done[id] = 1
  const d = { ...getDone(), [id]: 1 }
  write(DONE_KEY, JSON.stringify(d))
  try { window.dispatchEvent(new Event('ks-guide-progress')) } catch { /* ignore */ }
  return d
}

export const doneCount = (d = getDone()) => GUIDE_ORDER.filter((id) => d[id]).length

export function getBadgeName() {
  const v = read(NAME_KEY)
  return v == null ? mem.name : v
}
export function setBadgeName(name) {
  mem.name = String(name || '').slice(0, 30)
  write(NAME_KEY, mem.name)
}
