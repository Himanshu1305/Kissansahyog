// Batch 10E (3B) — the optional "additional information" box on every post form.
// Stored as `details.extra_info` (no column; the create RPCs keep unknown details keys — proven on
// staging, docs/review/batch10e/evidence/phase3bc/details-keys-proof.txt). Pure: no React, no network
// (tests/unit/post-10e.test.mjs).
//
// Phone numbers are blocked here: a buyer sees the seller's number only after logging in (fraud
// prevention), and this free-text box must not become a way around that.

export const EXTRA_INFO_MAX = 300

const DEVANAGARI_ZERO = 0x0966
// Devanagari digits (U+0966–U+096F) count as digits too: a number typed in Hindi digits is still a phone number.
const asciiDigits = (s) => String(s ?? '').replace(/[\u0966-\u096F]/g, (c) => String(c.charCodeAt(0) - DEVANAGARI_ZERO))

// A run of digits where only spaces, dashes, dots, brackets or a "+" stand between them
// ("98765 43210", "+91-98765-43210", "(0)98765.43210"). Commas break a run, so Indian-style
// prices ("₹1,20,000", "1,20,00,000") never join up. Newlines break a run too.
const RUN = /\+?[0-9](?:[ \t\u00a0\-\u2013.()+]*[0-9])*/g

// True when the text holds a run of 10 or more digits (a phone number, with or without +91 / 0).
// Written dates with a 4-digit year ("15-10-2026", "1.11.2026") are taken out first, so a range like
// "15-10-2026 - 20-10-2026" is not mistaken for a phone number.
const DATE = /(?<![0-9])(?:0?[1-9]|[12][0-9]|3[01])[./-](?:0?[1-9]|1[0-2])[./-](?:19|20)[0-9]{2}(?![0-9])/g

export function hasPhoneNumber(text) {
  const s = asciiDigits(text).replace(DATE, ' | ')
  for (const m of s.match(RUN) || []) {
    if (m.replace(/[^0-9]/g, '').length >= 10) return true
  }
  return false
}

// What is saved: trimmed, Windows newlines unified, at most two blank lines in a row, max 300.
export function cleanExtraInfo(text) {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, EXTRA_INFO_MAX)
}

// The strings.js key of the problem, or null. Empty is always fine.
export function extraInfoError(text) {
  const s = cleanExtraInfo(text)
  if (!s) return null
  if (String(text ?? '').replace(/\r\n?/g, '\n').trim().length > EXTRA_INFO_MAX) return 'err_extra_info_long'
  if (hasPhoneNumber(s)) return 'err_extra_info_phone'
  return null
}

// The details to save: `extra_info` set when there is text, the key removed when empty
// (never an empty string).
export function withExtraInfo(details, text) {
  const out = { ...details }
  const s = cleanExtraInfo(text)
  if (s) out.extra_info = s
  else delete out.extra_info
  return out
}
