# संस्थापक पेज की तस्वीरें / Founder page images

यह फ़ोल्डर `/founder` पेज की तस्वीरों के लिए है। अभी यहाँ कोई तस्वीर नहीं है, और पेज बिना तस्वीरों के भी ठीक चलता है (चित्र की जगह "अ.दी." वाला गोला दिखता है, बाकी जगहें खाली रहती हैं)।

This folder holds the images for the `/founder` page. It is empty for now and the page works without them (the portrait shows the initials avatar; the other slots show nothing).

## कैसे जोड़ें / How to add an image

1. तस्वीर को नीचे लिखे **ठीक उसी नाम** से इस फ़ोल्डर (`public/founder/`) में रखें।
   Put the file in this folder (`public/founder/`) with **exactly** the filename below.
2. `src/content/founder.js` खोलें और उस तस्वीर की लाइन में `null` की जगह पथ लिखें।
   Open `src/content/founder.js` and replace `null` with the path on the matching field.
3. `node scripts/verify-batch6g.mjs` चलाएँ। अगर पथ ग़लत है या फ़ाइल नहीं है तो यह FAIL बताएगा।
   Run `node scripts/verify-batch6g.mjs`. It fails if a path points to a missing file.

पहले फ़ाइल रखें, फिर पथ लिखें। जो फ़ाइल मौजूद नहीं है उसका पथ कभी न लिखें।
Add the file first, then set the path. Never set a path to a file that does not exist.

## फ़ाइलें / Files

| फ़ाइल / File | `src/content/founder.js` में फ़ील्ड / Field | मान / Value to set | आकार / Size |
|---|---|---|---|
| `portrait.jpg` | `portrait.src` | `'/founder/portrait.jpg'` | 1200×1500 |
| `medal-certificate.jpg` | `awards[0].proof_src` (स्वर्ण पदक / Gold Medal) | `'/founder/medal-certificate.jpg'` | 1600 चौड़ी / wide |
| `guinness-certificate.jpg` | `awards[1].proof_src` (गिनीज / Guinness) | `'/founder/guinness-certificate.jpg'` | 1600 चौड़ी / wide |
| `baihar-1.jpg` | `innovations[0].src` (बैहर / Baihar) | `'/founder/baihar-1.jpg'` | 1600 चौड़ी / wide |
| `bijawar-1.jpg` | `innovations[1].src` (बिजावर / Bijawar) | `'/founder/bijawar-1.jpg'` | 1600 चौड़ी / wide |
| `parents.jpg` (वैकल्पिक / optional) | `parents_image.src` | `'/founder/parents.jpg'` | 1600 चौड़ी / wide |

- सभी तस्वीरें JPEG हों और हर फ़ाइल 300 KB से छोटी हो।
  All images are JPEG, each under 300 KB.
- अगर तस्वीर का अनुपात अलग है तो उसी जगह `width` और `height` भी असली पिक्सेल के अनुसार बदल दें।
  If the image has a different shape, update `width` and `height` next to it to the real pixel size.

## प्रमाणपत्र के बारे में / About certificates

- `proof_src` भरने पर उस सम्मान के कार्ड में "प्रमाणपत्र देखें" लिंक दिखेगा।
  Setting `proof_src` shows a "View certificate" link on that award card.
- तभी वह सम्मान सर्च इंजन के लिए बने डेटा (JSON-LD `award`) में भी जुड़ेगा। `proof_src` खाली रहने पर सम्मान सिर्फ़ पेज पर दिखता है।
  Only then is the award added to the structured data (JSON-LD `award`). While `proof_src` is null the award appears on the page only.

## वीडियो / Video

वीडियो के लिए कोई फ़ाइल नहीं चाहिए। `src/content/founder.js` में `video.youtube_id` में YouTube की 11 अक्षरों वाली id लिखें। तब पेज पर एक कार्ड दिखेगा जो वीडियो को YouTube पर खोलता है।

No file is needed for the video. Set `video.youtube_id` in `src/content/founder.js` to the 11-character YouTube id. The page then shows a card that opens the video on YouTube.
