// Batch 17A - numbers as Hindi words for the spoken morning script. 0-99 is a full table (Hindi numbers are irregular,
// so nothing is computed there). Used only by the voice script; the written message keeps digits.
import { S } from '../strings.hi.js'

const W = [
  'शून्य', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ',
  'दस', 'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस',
  'बीस', 'इक्कीस', 'बाईस', 'तेईस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताईस', 'अट्ठाईस', 'उनतीस',
  'तीस', 'इकतीस', 'बत्तीस', 'तैंतीस', 'चौंतीस', 'पैंतीस', 'छत्तीस', 'सैंतीस', 'अड़तीस', 'उनतालीस',
  'चालीस', 'इकतालीस', 'बयालीस', 'तैंतालीस', 'चौवालीस', 'पैंतालीस', 'छियालीस', 'सैंतालीस', 'अड़तालीस', 'उनचास',
  'पचास', 'इक्यावन', 'बावन', 'तिरेपन', 'चौवन', 'पचपन', 'छप्पन', 'सत्तावन', 'अट्ठावन', 'उनसठ',
  'साठ', 'इकसठ', 'बासठ', 'तिरेसठ', 'चौंसठ', 'पैंसठ', 'छियासठ', 'सड़सठ', 'अड़सठ', 'उनहत्तर',
  'सत्तर', 'इकहत्तर', 'बहत्तर', 'तिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छिहत्तर', 'सतहत्तर', 'अठहत्तर', 'उनासी',
  'अस्सी', 'इक्यासी', 'बयासी', 'तिरासी', 'चौरासी', 'पचासी', 'छियासी', 'सत्तासी', 'अट्ठासी', 'नवासी',
  'नब्बे', 'इक्यानवे', 'बानवे', 'तिरानवे', 'चौरानवे', 'पचानवे', 'छियानवे', 'सत्तानवे', 'अट्ठानवे', 'निन्यानवे',
]
export const WORDS_0_99 = W.map((x) => x.normalize('NFC'))
const HAZAR = 'हज़ार'.normalize('NFC')
const SAU = 'सौ'

// 0..99999 -> words. Anything else throws (the caller decides what to leave out).
export function toHindiWords(n) {
  if (!Number.isInteger(n) || n < 0 || n > 99999) throw new RangeError(`toHindiWords: ${n} is outside 0..99999`)
  if (n < 100) return WORDS_0_99[n]
  const parts = []
  const th = Math.floor(n / 1000), h = Math.floor((n % 1000) / 100), r = n % 100
  if (th) parts.push(`${WORDS_0_99[th]} ${HAZAR}`)
  if (h) parts.push(`${WORDS_0_99[h]} ${SAU}`)
  if (r) parts.push(WORDS_0_99[r])
  return parts.join(' ')
}

export const rupeesPerQuintal = (n) => `${toHindiWords(Math.round(n))} रुपये क्विंटल`
export const rupees = (n) => `${toHindiWords(Math.round(n))} रुपये`
export const degrees = (n) => { const r = Math.round(n); return `${r < 0 ? 'माइनस ' : ''}${toHindiWords(Math.abs(r))} डिग्री` }
export const percent = (n) => `${toHindiWords(Math.round(n))} प्रतिशत`
export const dayMonth = (iso) => `${toHindiWords(Number(iso.slice(8)))} ${S.months[Number(iso.slice(5, 7)) - 1]}`
export const weekdayDate = (iso) => `${S.weekdays[new Date(`${iso}T00:00:00Z`).getUTCDay()]}, ${dayMonth(iso)}`
