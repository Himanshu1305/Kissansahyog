// Batch 17B - reusable guard: the same word must not appear twice in a row, nor twice inside one short sentence or line.
// "Short" = up to MAX_TOKENS words. A line is cut into sentences at । ! ? and at the middle dot (·) that the message uses to
// separate two independent clauses (for example "कल: ... · परसों: ..."). Punctuation, emoji, markdown stars and digits are removed first.
// Small function words, time words, number words and unit words may repeat ("की ... की", "सौ ... सौ", "रुपये ... रुपये").
import { toHindiWords } from '../../../scripts/morning/voice/hindiNumber.mjs'

export const MAX_TOKENS = 18
const FUNCTION_WORDS = ['है', 'हैं', 'हो', 'होगा', 'की', 'का', 'के', 'में', 'से', 'को', 'और', 'पर', 'तक', 'भी', 'ने', 'ही', 'जो', 'यह', 'ये', 'वह', 'या', 'तो', 'एक', 'आज', 'कल', 'परसों', 'सागर']
const UNIT_WORDS = ['रुपये', 'डिग्री', 'प्रतिशत', 'मिलीमीटर', 'मिमी', 'क्विंटल', 'सौ', 'हज़ार', 'हजार', 'लाख']
const numberWords = () => { const s = new Set(); for (let i = 0; i <= 99; i++) for (const w of toHindiWords(i).split(/\s+/)) s.add(w); return s }
const EXEMPT = new Set([...FUNCTION_WORDS, ...UNIT_WORDS, ...numberWords()])

const tokens = (s) => s.replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w && !/^\p{N}+$/u.test(w) && [...w].length >= 2)

// -> [{ line, word, kind: 'consecutive' | 'twice' }]
export function findRepeats(text) {
  const bad = []
  for (const line of String(text ?? '').split(/\r?\n/)) {
    for (const part of line.split(/[।!?·]/)) {
      const t = tokens(part)
      for (let i = 1; i < t.length; i++) if (t[i] === t[i - 1]) bad.push({ line: part.trim(), word: t[i], kind: 'consecutive' })
      if (t.length > MAX_TOKENS) continue
      const seen = new Set()
      for (const w of t) { if (EXEMPT.has(w)) continue; if (seen.has(w)) bad.push({ line: part.trim(), word: w, kind: 'twice' }); seen.add(w) }
    }
  }
  return bad
}
export const assertNoRepeats = (assert, text, label = '') => { const r = findRepeats(text); assert.deepEqual(r, [], `${label} repeated word(s): ${JSON.stringify(r)}`) }
