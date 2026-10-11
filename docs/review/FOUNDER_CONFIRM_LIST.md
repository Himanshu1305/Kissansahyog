# Founder page — sentences to confirm before going live

The founder, Shri Abhinandan Dixit, must confirm each item below before `/founder` goes live.
All of this text lives in `src/content/founder.js`.

| # | To confirm | Where it appears | Confirmed? |
|---|---|---|---|
| a | The sentence "खेत, बीज, बारिश का इंतज़ार और फसल की चिंता मेरे लिए किताबी बातें नहीं, घर की रोज़ की बातें थीं।" | `roots_p2` | ☐ |
| b | The sentence "शिक्षा और ईमानदारी का महत्व मैंने अपने घर से सीखा।" | `roots_p2` | ☐ |
| c | The exact wording of the Guinness record and the founder's role in it, taken from the certificate. The page now says: "वर्ष 2014-15 में कृषि क्षेत्र में सफल रोपण का गिनीज वर्ल्ड रिकॉर्ड दर्ज हुआ।" | `awards[1]`, `glance`, homepage badge `founder_badge_guinness` | ☐ |
| d | Whether the Baihar rope was sabai grass (सबई घास) or bamboo. The page now says "सबई घास की रस्सी और बाँस के फर्नीचर". | `innovations[0]`, `glance` | ☐ |
| e | The start year and the exact names of the Bijawar awards. The page now says only "सेवा के अंतिम वर्ष में ... प्रदेश स्तर पर कई पुरस्कार". | `innovations[1]`, `glance` | ☐ |
| f | The spelling of Dr. Chhaya / Chaya. The page now uses "डॉ. छाया दीक्षित" / "Dr. Chhaya Dixit". | `family` | ☐ |

If any wording changes, edit `src/content/founder.js` (Hindi and English together) and run
`node scripts/verify-batch6g.mjs`.
