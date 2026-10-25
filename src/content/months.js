// Month abbreviations (label data). Kept in content/ so the "no hardcoded Devanagari
// in render code" audit (scripts/test/v11_phase6.mjs) treats them as sanctioned labels,
// like the crop/category names — not as stray hardcoded UI strings.
// Batch 10E: also the short month names of the /msp trend date ranges (one helper,
// src/lib/mandi/mspWindow.js); 'फ़र' and 'अप्रै' are the founder's spelling (were 'फर', 'अप्रैल').
export const MONTHS_HI = ['जन', 'फ़र', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुल', 'अग', 'सित', 'अक्टू', 'नव', 'दिस']
export const MONTHS_SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Full month names (both languages) — used by the Kisan Mela date labels + month filter.
export const MONTHS_FULL_HI = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर']
export const MONTHS_FULL_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
