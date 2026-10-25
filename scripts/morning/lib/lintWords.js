// Words and phrases message.txt must never contain (section 6 of the batch prompt plus a few close relatives). Lint config, not message text.
export const BANNED = [
  'बेचें', 'बेच दें', 'बेचना', 'बेचिए', 'बेचो', 'खरीदें', 'खरीदना', 'खरीदिए', 'खरीदो', 'रोककर रखें', 'रोक कर रखें', 'रोक लें', 'रुकें',
  'बढ़ेगा', 'घटेगा', 'गिरेगा', 'चढ़ेगा', 'बढ़ेंगे', 'घटेंगे', 'गिरेंगे', 'बढ़ सकता', 'घट सकता', 'गिर सकता', 'गारंटी',
  'अंदाज़ा', 'अंदाजा', 'भविष्यवाणी', 'मुफ़्त', 'मुफ्त', 'समीक्षाधीन',
]
export const BANNED_EN = [/pilot/i, /under review/i, /USD Vision/i, /\bfree for farmers\b/i]
// the word जी on its own (a respectful tag after a name), not inside words like जीवन or जीरा
export const RE_JI = /(^|[\s,।!?(*_])जी($|[\s,।!?)*_])/u
