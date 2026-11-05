// Batch 19 - /pashupalan/desi-gay-anudan : the planned desi cow monthly assistance (FACTS A).
// Every item: { hi, en, f:[FACTS ids] }. f:['GEN'] = general preparation text with no numbers.
// To update after the 15 Nov 2026 launch: change status/asOf, the sources, and the items below.
const NEWS = 'NEWS'
export default {
  slug: 'desi-gay-anudan',
  path: '/pashupalan/desi-gay-anudan',
  status: 'planned',
  asOf: '2026-11-05',
  seo: {
    title: { hi: 'देसी गाय 900 रुपये महीना योजना मध्य प्रदेश — अभी क्या पता है', en: 'MP desi cow Rs 900 a month plan — what is known so far' },
    description: { hi: 'मध्य प्रदेश में देसी गाय पालने पर हर महीने ₹900 तक की मदद की तैयारी: समाचारों के अनुसार क्या तय है, क्या अभी घोषित नहीं, नस्लें और अभी क्या करें।', en: 'Madhya Pradesh is preparing up to Rs 900 a month for keeping desi cows: what the news reports say, what is not announced, breeds, and what to do now.' },
  },
  h1: { hi: 'देसी गाय पालने पर ₹900 महीना — मध्य प्रदेश की योजना', en: 'Rs 900 a month for keeping desi cows — Madhya Pradesh plan' },
  answer: {
    hi: 'समाचारों के अनुसार (28 अक्टूबर 2026) मध्य प्रदेश सरकार देसी गाय पालने वालों को हर महीने ₹900 तक की मदद देने की तैयारी कर रही है और 15 नवंबर 2026 को शुरू करने की योजना है। अभी योजना का नाम, पात्रता और आवेदन का तरीका घोषित नहीं हुआ है।',
    en: 'According to news reports (28 October 2026), the Madhya Pradesh government is preparing to give up to Rs 900 a month to people who keep desi cows, with a planned start on 15 November 2026. The scheme name, who can apply and how to apply have not been announced yet.',
    f: ['F-A1', 'F-A6'],
  },
  sections: [
    {
      id: 'known', kind: 'ul',
      h: { hi: 'अभी क्या पता है (समाचारों के अनुसार)', en: 'What is known so far (according to news reports)' },
      items: [
        { hi: 'समाचारों के अनुसार (28 अक्टूबर 2026): सरकार देसी गाय पालने वालों को हर महीने ₹900 तक की मदद देने की तैयारी में है। रिपोर्टों में "तक" शब्द है, यानी पक्की रकम अभी साफ़ नहीं।', en: 'According to news reports (28 October 2026): the government is preparing to give up to Rs 900 a month to people who keep desi cows. The reports say "up to", so the fixed amount is not clear yet.', f: ['F-A1'] },
        { hi: 'शुरू करने की तारीख़ 15 नवंबर 2026 बताई गई है (बिरसा मुंडा जयंती / जनजातीय गौरव दिवस)। रिपोर्टें इसे संभावित बताती हैं, पक्की घोषणा नहीं।', en: 'The planned start date is 15 November 2026 (Birsa Munda Jayanti / Janjatiya Gaurav Divas). The reports call this possible, not a confirmed announcement.', f: ['F-A1'] },
        { hi: 'पहले चरण में 100 गाँव चुने जाने और हर गाँव से 5 पशुपालक लिए जाने की बात है, यानी लगभग 500 पशुपालक। आगे संख्या बढ़ाई जा सकती है।', en: 'In the first phase, 100 villages and 5 cattle keepers from each village are mentioned, about 500 keepers in all. The number may be increased later.', f: ['F-A2'] },
        { hi: 'एक रिपोर्ट (लल्लूराम, 28 अक्टूबर 2026) के अनुसार योजना का खाका 27 अक्टूबर की कैबिनेट बैठक में कृषि व पशुपालन विभाग ने रखा। रिपोर्ट यह नहीं कहती कि कैबिनेट ने इसे मंज़ूर कर दिया।', en: 'One report (Lalluram, 28 October 2026) says the Agriculture and Animal Husbandry departments presented the outline at the cabinet meeting of 27 October. The report does not say the cabinet approved it.', f: ['F-A4'] },
        { hi: 'सालाना ख़र्च लगभग ₹40 करोड़ बताया गया है, जिसकी व्यवस्था दूसरे अनुपूरक बजट में होने की बात एक रिपोर्ट में है।', en: 'The yearly cost is reported as about Rs 40 crore; one report says it is to be provided in the second supplementary budget.', f: ['F-A3'] },
        { hi: '₹900 महीना का मतलब साल में ₹10,800 तक होता है (हिसाब: 900 × 12)।', en: 'Rs 900 a month works out to up to Rs 10,800 a year (900 × 12).', f: ['F-A8'] },
      ],
    },
    {
      id: 'unknown', kind: 'ul',
      h: { hi: 'अभी घोषित नहीं', en: 'Not announced yet' },
      items: [
        { hi: 'योजना का सरकारी नाम — अभी घोषित नहीं।', en: 'The official name of the scheme — not announced yet.', f: ['F-A6'] },
        { hi: 'कौन सा विभाग चलाएगा और आवेदन कहाँ होगा — अभी घोषित नहीं।', en: 'Which department will run it and where to apply — not announced yet.', f: ['F-A6'] },
        { hi: 'रकम प्रति गाय है या प्रति परिवार, और कितनी गायों पर मिलेगी — अभी घोषित नहीं।', en: 'Whether the amount is per cow or per family, and for how many cows — not announced yet.', f: ['F-A6'] },
        { hi: 'गाँव और पशुपालक कैसे चुने जाएँगे, कौन से दस्तावेज़ लगेंगे, पैसा किस तरीके से आएगा — अभी घोषित नहीं।', en: 'How villages and keepers will be chosen, which documents are needed, and how the money will be paid — not announced yet.', f: ['F-A6'] },
        { hi: 'योजना कितने समय चलेगी और कोई सरकारी आदेश या अधिसूचना जारी हुई है या नहीं — अभी घोषित नहीं। हमें 5 नवंबर 2026 तक कोई सरकारी आदेश नहीं मिला।', en: 'How long the scheme will run, and whether any government order has been issued — not announced yet. We found no government order up to 5 November 2026.', f: ['F-A6'] },
      ],
    },
    {
      id: 'small', kind: 'p',
      h: { hi: 'पहला चरण छोटा है — यह ध्यान रखें', en: 'The first phase is small — keep this in mind' },
      items: [
        { hi: 'रिपोर्टों के हिसाब से शुरुआत में सिर्फ़ लगभग 500 पशुपालक इसमें होंगे। इसलिए अगर आपका गाँव पहले 100 गाँवों में नहीं है, तो हो सकता है पहले चरण में आपको जगह न मिले। आगे संख्या बढ़ाने की बात है, पर कब, यह नहीं बताया गया।', en: 'According to the reports only about 500 keepers will be included at the start. So if your village is not among the first 100, you may not be included in the first phase. The reports talk of increasing the number later, but do not say when.', f: ['F-A2'] },
        { hi: 'हमारा अपना हिसाब: 500 पशुपालकों को ₹900 महीना देने पर साल का ख़र्च लगभग ₹54 लाख बनता है, जबकि रिपोर्टों में ₹40 करोड़ लिखा है। रिपोर्टों ने इस अंतर को नहीं समझाया, इसलिए हम इसे पहले चरण का ख़र्च नहीं कहते।', en: 'Our own arithmetic: paying 500 keepers Rs 900 a month comes to about Rs 54 lakh a year, while the reports say Rs 40 crore. The reports do not explain the gap, so we do not call it the cost of the first phase.', f: ['F-A7'] },
      ],
    },
    {
      id: 'breeds', kind: 'ul',
      h: { hi: 'कौन सी देसी नस्लें गिनी गई हैं', en: 'Which desi breeds are named' },
      items: [
        { hi: 'रिपोर्टों में ये नस्लें हैं: महाकौशली, मालवी, निमाड़ी, केनकथा और गाओलाओ। लल्लूराम की रिपोर्ट इनके साथ गाड़ी-खेरी भी जोड़ती है, यानी कुल छह।', en: 'The reports name these breeds: Mahakoshali, Malvi, Nimadi, Kenkatha and Gaolao. The Lalluram report adds Gadi-Kheri, six in all.', f: ['F-A5'] },
        { hi: 'लल्लूराम के अनुसार मदद सिर्फ़ इन्हीं सूचीबद्ध देसी नस्लों को पालने पर होगी। दूसरी या मिश्रित नस्ल की गाय पर क्या होगा, यह नहीं बताया गया।', en: 'According to Lalluram the help is only for keeping these listed desi breeds. What happens for other or crossbred cows is not stated.', f: ['F-A5', 'F-A6'] },
        { hi: 'सागर संभाग के लिए ख़ास बात: केनकथा बुंदेलखंड की नस्ल है। ईटीवी भारत की रिपोर्ट इसे सागर, छतरपुर, पन्ना और टीकमगढ़ क्षेत्र में बताती है; लल्लूराम पन्ना, छतरपुर और केन नदी के इलाके का नाम लेती है। विस्तार "देसी नस्लें" पेज पर है।', en: 'Special for Sagar division: Kenkatha is a Bundelkhand breed. The ETV Bharat report places it in the Sagar, Chhatarpur, Panna and Tikamgarh area; Lalluram names Panna, Chhatarpur and the Ken river area. Details are on the "Desi breeds" page.', f: ['F-A5', 'F-H4', 'F-H6'] },
      ],
    },
    {
      id: 'now', kind: 'ol',
      h: { hi: 'अभी आप क्या कर सकते हैं (सामान्य तैयारी)', en: 'What you can do now (general preparation)' },
      items: [
        { hi: 'यह सरकारी शर्त नहीं, सिर्फ़ सामान्य तैयारी है। सबसे पहले पता करें कि आपकी गाय किस नस्ल की है — अपने ब्लॉक के पशु चिकित्सालय में पूछ सकते हैं।', en: 'These are not government conditions, only general preparation. First find out which breed your cow is — you can ask at your block veterinary hospital.', f: ['GEN'] },
        { hi: 'अपने पशुओं की गिनती, नस्ल और उम्र एक कागज़ पर लिख लें और गाय की साफ़ फ़ोटो अपने फ़ोन में रखें।', en: 'Write down the number, breed and age of your animals on a sheet of paper and keep clear photos of the cow on your phone.', f: ['GEN'] },
        { hi: 'अपना बैंक खाता चालू रखें और आधार से जुड़ा है या नहीं, यह बैंक से पूछ लें। पैसा किस तरीके से आएगा, यह अभी घोषित नहीं है — यह सिर्फ़ तैयारी की सलाह है।', en: 'Keep your bank account active and ask the bank whether it is linked to Aadhaar. How money will be paid is not announced yet — this is only preparation advice.', f: ['GEN'] },
        { hi: 'पंचायत या ब्लॉक पशु चिकित्सालय में पूछें कि आपका गाँव पहले चरण की सूची में है या नहीं। सूची अभी सार्वजनिक नहीं हुई है।', en: 'Ask at the panchayat or block veterinary hospital whether your village is on the first-phase list. The list has not been made public yet.', f: ['F-A6'] },
        { hi: 'आवेदन या पंजीकरण के नाम पर किसी को पैसे न दें। जब तक सरकार तरीका घोषित न करे, कोई "पक्की" सूची या फ़ॉर्म सरकारी नहीं माना जा सकता।', en: 'Do not pay anyone in the name of an application or registration. Until the government announces the method, no "guaranteed" list or form can be treated as official.', f: ['GEN'] },
      ],
    },
    {
      id: 'docs', kind: 'ul',
      h: { hi: 'दस्तावेज़', en: 'Documents' },
      items: [
        { hi: 'सरकारी सूची: अभी घोषित नहीं। जब तक सूची नहीं आती, किसी भी दस्तावेज़ को "ज़रूरी" न मानें।', en: 'Official list: not announced yet. Until a list is published, do not treat any document as "required".', f: ['F-A6'] },
        { hi: 'सामान्य तैयारी (शर्त नहीं): पहचान पत्र, बैंक पासबुक, पशुओं की गिनती का कागज़ और गाय की फ़ोटो एक फ़ाइल में रखें।', en: 'General preparation (not a condition): keep an identity card, bank passbook, a sheet with your animal count and photos of the cow together in one file.', f: ['GEN'] },
      ],
    },
    {
      id: 'where', kind: 'ul',
      h: { hi: 'कहाँ जाएँ', en: 'Where to go' },
      items: [
        { hi: 'अपने ब्लॉक का पशु चिकित्सालय और ज़िला पशुपालन एवं डेयरी कार्यालय — नई जानकारी सबसे पहले यहीं पहुँचती है।', en: 'Your block veterinary hospital and the district Animal Husbandry and Dairying office — new information usually reaches them first.', f: ['GEN'] },
        { hi: 'विभाग की वेबसाइट mpdah.gov.in — 5 नवंबर 2026 को इस पर देसी गाय की कोई योजना सूचीबद्ध नहीं मिली।', en: 'The department website mpdah.gov.in — on 5 November 2026 it listed no desi cow scheme.', f: ['F-G1'] },
        { hi: 'हमारे "उपयोगी संपर्क" पेज पर कृषि विभाग और हेल्पलाइन के नंबर।', en: 'Our "Useful contacts" page has agriculture department and helpline numbers.', f: ['GEN'] },
      ],
    },
    {
      id: 'mistakes', kind: 'ul',
      h: { hi: 'आम ग़लतियाँ', en: 'Common mistakes' },
      items: [
        { hi: 'खबर पढ़कर मान लेना कि योजना चालू है। अभी यह सिर्फ़ तैयारी की खबर है।', en: 'Reading a news story and assuming the scheme is running. For now it is only a report of preparation.', f: ['F-A1'] },
        { hi: '"₹900 तक" को पक्की रकम समझ लेना।', en: 'Taking "up to Rs 900" as a fixed amount.', f: ['F-A1'] },
        { hi: 'सोशल मीडिया के फ़ॉर्म या एजेंट पर भरोसा करके आधार या बैंक की जानकारी देना।', en: 'Trusting a social media form or an agent and giving away Aadhaar or bank details.', f: ['GEN'] },
        { hi: 'यह मान लेना कि सब देसी गायों पर पैसा मिलेगा। रिपोर्टों में सिर्फ़ सूचीबद्ध नस्लों की बात है।', en: 'Assuming every desi cow will get money. The reports speak only of the listed breeds.', f: ['F-A5'] },
      ],
    },
    {
      id: 'notify', kind: 'p',
      h: { hi: 'आवेदन खुलने पर हम कैसे बताएँगे', en: 'How we will tell you when applications open' },
      items: [
        { hi: 'जैसे ही सरकारी आदेश या आवेदन का तरीका आएगा, हम इस पेज की स्थिति और तारीख़ बदलेंगे और WhatsApp चैनल पर बताएँगे। आप चैनल से जुड़ सकते हैं या हमारे सवाल पेज पर अपना सवाल पूछ सकते हैं।', en: 'As soon as a government order or application method comes out, we will change the status and date on this page and post on our WhatsApp Channel. You can join the channel or ask your question on our question page.', f: ['GEN'] },
      ],
    },
  ],
  faqs: [
    { q: { hi: 'क्या देसी गाय पर ₹900 महीना योजना शुरू हो गई है?', en: 'Has the Rs 900 a month desi cow scheme started?' }, a: { hi: 'अभी नहीं। समाचारों के अनुसार (28 अक्टूबर 2026) सरकार इसकी तैयारी में है और 15 नवंबर 2026 को शुरू करना चाहती है। हमें अभी कोई सरकारी आदेश नहीं मिला।', en: 'Not yet. According to news reports (28 October 2026) the government is preparing it and wants to start on 15 November 2026. We have not found a government order.' }, f: ['F-A1', 'F-A6'] },
    { q: { hi: 'आवेदन कहाँ और कैसे करें?', en: 'Where and how do I apply?' }, a: { hi: 'आवेदन का तरीका अभी घोषित नहीं हुआ है। घोषणा होते ही हम इस पेज और WhatsApp चैनल पर बताएँगे। तब तक किसी को पैसे न दें।', en: 'The method of applying has not been announced. We will post on this page and on the WhatsApp Channel as soon as it is. Until then, do not pay anyone.' }, f: ['F-A6'] },
    { q: { hi: 'क्या ₹900 हर गाय पर मिलेगा?', en: 'Will Rs 900 be paid for every cow?' }, a: { hi: 'यह अभी साफ़ नहीं है। रिपोर्टें यह नहीं बतातीं कि रकम प्रति गाय है या प्रति परिवार, न यह कि कितनी गायों पर मिलेगी।', en: 'This is not clear yet. The reports do not say whether the amount is per cow or per family, or for how many cows.' }, f: ['F-A6'] },
    { q: { hi: 'कौन सी नस्ल की गाय पर मदद की बात है?', en: 'Which breeds are mentioned?' }, a: { hi: 'रिपोर्टों में महाकौशली, मालवी, निमाड़ी, केनकथा और गाओलाओ का नाम है; लल्लूराम इनमें गाड़ी-खेरी जोड़ता है।', en: 'The reports name Mahakoshali, Malvi, Nimadi, Kenkatha and Gaolao; Lalluram adds Gadi-Kheri.' }, f: ['F-A5'] },
    { q: { hi: 'सागर संभाग के किसान के लिए क्या ख़ास है?', en: 'What matters for a farmer in Sagar division?' }, a: { hi: 'केनकथा बुंदेलखंड की नस्ल है और रिपोर्टों में इसका नाम है। पर पहले चरण के 100 गाँवों की सूची अभी सार्वजनिक नहीं है, इसलिए ब्लॉक पशु चिकित्सालय से पूछें।', en: 'Kenkatha is a Bundelkhand breed and is named in the reports. But the list of the first 100 villages is not public, so ask your block veterinary hospital.' }, f: ['F-A5', 'F-A6'] },
    { q: { hi: 'पहले चरण में कितने किसान होंगे?', en: 'How many farmers are in the first phase?' }, a: { hi: 'रिपोर्टों के अनुसार 100 गाँव और हर गाँव से 5 पशुपालक, यानी लगभग 500। आगे संख्या बढ़ाने की बात है।', en: 'According to the reports, 100 villages and 5 keepers from each, about 500 in all. An increase later is mentioned.' }, f: ['F-A2'] },
    { q: { hi: 'क्या इसके लिए प्राकृतिक खेती या आधार लिंक खाता ज़रूरी है?', en: 'Is natural farming or an Aadhaar-linked account required?' }, a: { hi: 'यह अभी घोषित नहीं है। किसी शर्त को पक्का न मानें; सिर्फ़ तैयारी के लिए खाता चालू रखें।', en: 'This has not been announced. Do not treat any condition as certain; just keep your account active as preparation.' }, f: ['F-A6'] },
  ],
  sources: [
    { title: { hi: 'ईटीवी भारत मध्य प्रदेश', en: 'ETV Bharat Madhya Pradesh' }, url: 'https://www.etvbharat.com/hi/state/raise-desi-cow-get-grant-900rs-per-month-from-mp-govt-mohan-yadav-govt-plan-for-dairy-farmers-madhya-pradesh-mps26102801458', type: NEWS, date: '2026-10-28' },
    { title: { hi: 'लल्लूराम', en: 'Lalluram' }, url: 'https://lalluram.com/mp-desi-cow-rearing-scheme-900-rupees-monthly/', type: NEWS, date: '2026-10-28' },
    { title: { hi: 'गाँव जंक्शन', en: 'Gaon Junction' }, url: 'https://www.gaonjunction.com/pashudhan/mp-to-give-rs-900-monthly-aid-for-rearing-desi-cows-scheme-launch-on-november-15', type: NEWS, date: '2026-10-28' },
  ],
  related: ['/pashupalan/desi-nasle', '/pashupalan/pashu-kisan-credit-card', '/pashupalan', '/yojana/mp', '/sawaal', '/mausam', '/resources'],
}
