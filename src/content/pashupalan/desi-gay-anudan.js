// Batch 19-B - /pashupalan/desi-gay-anudan : the planned desi cow monthly assistance (FACTS A, G).
// Every text item: { hi, en, f:[FACTS ids] }. f:['GEN'] = general preparation text with no numbers.
// Page shape: see walk.js. To update after the 15 Nov 2026 launch: change status/asOf, the items, the sources.
const NEWS = 'NEWS'
export default {
  slug: 'desi-gay-anudan',
  path: '/pashupalan/desi-gay-anudan',
  art: 'cow',
  status: 'planned',
  asOf: '2026-11-05',
  seo: {
    title: { hi: 'देसी गाय 900 रुपये महीना योजना मध्य प्रदेश — अभी क्या पता है', en: 'MP desi cow Rs 900 a month plan — what is known so far' },
    description: { hi: 'मध्य प्रदेश में देसी गाय पालने पर हर महीने ₹900 तक की मदद की तैयारी: समाचारों के अनुसार क्या तय है, क्या अभी घोषित नहीं, नस्लें और अभी क्या करें।', en: 'Madhya Pradesh is preparing up to Rs 900 a month for keeping desi cows: what the news reports say, what is not announced, breeds, and what to do now.' },
  },
  h1: { hi: 'देसी गाय पालने पर ₹900 महीना — मध्य प्रदेश की योजना', en: 'Rs 900 a month for keeping desi cows — Madhya Pradesh plan' },
  hook: { hi: 'आपके पास देसी गाय है? तो यह ख़बर आपके लिए है — पर पहले देखिए कि अभी क्या पक्का है और क्या नहीं।', en: 'Do you keep a desi cow? Then this news is for you — but first see what is firm and what is not.', f: ['F-A1', 'F-A6'] },
  answer: {
    hi: 'समाचारों के अनुसार (28 अक्टूबर 2026) मध्य प्रदेश सरकार देसी गाय पालने वालों को हर महीने ₹900 तक की मदद देने की तैयारी कर रही है और 15 नवंबर 2026 को शुरू करने की योजना है। अभी योजना का नाम, पात्रता और आवेदन का तरीका घोषित नहीं हुआ है।',
    en: 'According to news reports (28 October 2026), the Madhya Pradesh government is preparing to give up to Rs 900 a month to people who keep desi cows, with a planned start on 15 November 2026. The scheme name, who can apply and how to apply have not been announced yet.',
    f: ['F-A1', 'F-A6'],
  },
  sar: [
    { hi: 'देसी गाय पालने वालों को हर महीने ₹900 तक देने की सरकारी तैयारी। अभी यह सिर्फ़ योजना है।', en: 'A government plan to give up to Rs 900 a month to people who keep desi cows. For now it is only a plan.', f: ['F-A1'] },
    { hi: 'सूचीबद्ध देसी नस्लों की गाय पालने वाले। पहले चरण में लगभग 500 पशुपालक, 100 गाँव।', en: 'People who keep the listed desi breeds. First phase: about 500 keepers in 100 villages.', f: ['F-A2', 'F-A5'] },
    { hi: 'सरकारी आदेश नहीं मिला, आवेदन शुरू नहीं हुआ। 15 नवंबर 2026 सिर्फ़ संभावित तारीख़ है।', en: 'No government order found, applications have not started. 15 November 2026 is only a planned date.', f: ['F-A1', 'F-A6'] },
  ],
  tiles: [
    { v: { hi: '₹900/माह तक', en: 'Up to Rs 900/month' }, l: { hi: 'हर महीने की मदद, "तक" यानी पक्की रकम नहीं', en: 'monthly help — "up to", not a fixed sum' }, src: { hi: 'समाचारों के अनुसार · 28 अक्टूबर 2026', en: 'According to news · 28 Oct 2026' }, f: ['F-A1'] },
    { v: { hi: '500 पशुपालक · 100 गाँव', en: '500 keepers · 100 villages' }, l: { hi: 'पहला चरण, बाद में बढ़ सकता है', en: 'first phase, may grow later' }, src: { hi: 'समाचारों के अनुसार · 28 अक्टूबर 2026', en: 'According to news · 28 Oct 2026' }, f: ['F-A2'] },
    { v: { hi: '15 नवंबर 2026', en: '15 November 2026' }, l: { hi: 'शुरू करने की योजना, पक्की घोषणा नहीं', en: 'planned start, not a firm announcement' }, src: { hi: 'समाचारों के अनुसार · 28 अक्टूबर 2026', en: 'According to news · 28 Oct 2026' }, f: ['F-A1'] },
    { v: { hi: '₹10,800/वर्ष तक', en: 'Up to Rs 10,800/year' }, l: { hi: '₹900 को 12 महीनों से गुणा करने पर', en: 'Rs 900 multiplied by 12 months' }, src: { hi: 'हमारा हिसाब · 28 अक्टूबर की ख़बर पर', en: 'Our sum · from the 28 Oct reports' }, f: ['F-A8'] },
  ],
  links: [
    { id: 'myscheme', btn: { hi: 'सरकारी योजनाएँ खोजने का पोर्टल', en: 'Portal to search government schemes' } },
  ],
  noLink: true,
  know: {
    yes: {
      h: { hi: 'ख़बरों में क्या आया है', en: 'What the news reports say' },
      items: [
        { hi: 'सरकार देसी गाय पालने वालों को हर महीने ₹900 तक की मदद देने की तैयारी में है। ख़बरों में "तक" लिखा है, यानी पक्की रकम अभी साफ़ नहीं।', en: 'The government is preparing to give up to Rs 900 a month to people who keep desi cows. The reports say "up to", so the fixed amount is not clear yet.', f: ['F-A1'] },
        { hi: 'शुरुआत की तारीख़ 15 नवंबर 2026 बताई गई है — बिरसा मुंडा जयंती, यानी जनजातीय गौरव दिवस। रिपोर्टें इसे संभावित कहती हैं।', en: 'The start date is given as 15 November 2026 — Birsa Munda Jayanti, Janjatiya Gaurav Divas. The reports call it possible.', f: ['F-A1'] },
        { hi: 'पहले चरण में 100 गाँव और हर गाँव से 5 पशुपालक, यानी लगभग 500। आगे संख्या बढ़ाने की बात है।', en: 'The first phase has 100 villages and 5 keepers from each, about 500 in all. An increase later is mentioned.', f: ['F-A2'] },
        { hi: 'सालाना ख़र्च लगभग ₹40 करोड़ बताया गया है। एक रिपोर्ट के अनुसार इसका इंतज़ाम दूसरे अनुपूरक बजट में होगा।', en: 'The yearly cost is reported as about Rs 40 crore. One report says it will be arranged in the second supplementary budget.', f: ['F-A3'] },
      ],
    },
    no: {
      h: { hi: 'जो अभी घोषित नहीं हुआ', en: 'What is not announced yet' },
      items: [
        { hi: 'योजना का सरकारी नाम और कौन सा विभाग चलाएगा — अभी घोषित नहीं।', en: 'The official name and which department will run it — not announced yet.', f: ['F-A6'] },
        { hi: 'रकम प्रति गाय है या प्रति परिवार, और कितनी गायों पर — अभी घोषित नहीं।', en: 'Whether the amount is per cow or per family, and for how many cows — not announced yet.', f: ['F-A6'] },
        { hi: 'गाँव और पशुपालक कैसे चुने जाएँगे, कौन से दस्तावेज़ लगेंगे — अभी घोषित नहीं।', en: 'How villages and keepers will be chosen and which documents are needed — not announced yet.', f: ['F-A6'] },
        { hi: 'आवेदन कहाँ होगा, पैसा कैसे आएगा, योजना कितने समय चलेगी — अभी घोषित नहीं।', en: 'Where to apply, how the money will be paid and how long the scheme will run — not announced yet.', f: ['F-A6'] },
        { hi: 'कोई सरकारी आदेश निकला है या नहीं — हमें 5 नवंबर 2026 तक नहीं मिला।', en: 'Whether any government order has been issued — we found none up to 5 November 2026.', f: ['F-A6'] },
      ],
    },
  },
  wait: {
    h: { hi: 'आवेदन कैसे करें?', en: 'How do I apply?' },
    card: { hi: 'अभी आवेदन शुरू नहीं हुआ। सरकार ने आवेदन का कोई तरीका घोषित नहीं किया है, इसलिए हम कोई "चरण" नहीं बना रहे। जैसे ही तरीका आएगा, इसी जगह चरण-दर-चरण लिखेंगे।', en: 'Applications have not started. The government has announced no way to apply, so we are not making up "steps". As soon as a method comes out, we will write it step by step in this very place.', f: ['F-A6'] },
    prep: {
      h: { hi: 'तब तक की तैयारी', en: 'Preparation until then' },
      items: [
        { hi: 'पता करें कि आपकी गाय किस नस्ल की है। ब्लॉक के पशु चिकित्सालय में पूछ सकते हैं।', en: 'Find out which breed your cow is. You can ask at the block veterinary hospital.', f: ['GEN'] },
        { hi: 'अपने पशुओं की गिनती, नस्ल और उम्र कागज़ पर लिखें। गाय की साफ़ फ़ोटो फ़ोन में रखें।', en: 'Write down the number, breed and age of your animals. Keep a clear photo of the cow on your phone.', f: ['GEN'] },
        { hi: 'बैंक खाता चालू रखें और बैंक से पूछ लें कि वह आधार से जुड़ा है या नहीं।', en: 'Keep your bank account active and ask the bank whether it is linked to Aadhaar.', f: ['GEN'] },
        { hi: 'पंचायत या पशु चिकित्सालय में पूछें कि आपका गाँव पहले चरण की सूची में है या नहीं। सूची अभी सार्वजनिक नहीं है।', en: 'Ask at the panchayat or veterinary hospital whether your village is on the first-phase list. The list is not public yet.', f: ['F-A6'] },
      ],
    },
  },
  timeline: {
    h: { hi: 'अब तक क्या हुआ', en: 'What has happened so far' },
    items: [
      { d: { hi: '27 अक्टूबर 2026', en: '27 Oct 2026' }, hi: 'कैबिनेट बैठक में कृषि और पशुपालन विभाग ने योजना का खाका रखा। एक रिपोर्ट (लल्लूराम) के अनुसार यही हुआ; रिपोर्ट यह नहीं कहती कि मंज़ूरी मिल गई।', en: 'At the cabinet meeting the Agriculture and Animal Husbandry departments presented the outline. One report (Lalluram) says so; it does not say it was approved.', f: ['F-A4'] },
      { d: { hi: '28 अक्टूबर 2026', en: '28 Oct 2026' }, hi: 'तीन समाचार वेबसाइटों ने ₹900 तक महीने की मदद और 15 नवंबर की संभावित शुरुआत की ख़बर दी।', en: 'Three news websites reported the Rs 900 a month plan and the possible 15 November start.', f: ['F-A1'] },
      { d: { hi: '5 नवंबर 2026', en: '5 Nov 2026' }, hi: 'हमने सरकारी आदेश या शुरुआत की ख़बर ढूँढी। कुछ नहीं मिला। स्थिति "योजना बन रही है" ही है।', en: 'We looked for a government order or launch report. Nothing found. The status stays "planned".', f: ['F-A6'] },
      { d: { hi: '15 नवंबर 2026', en: '15 Nov 2026' }, hi: 'संभावित शुरुआत। इसके बाद हम इस पेज को फिर देखेंगे और बदलेंगे।', en: 'Possible start. After that date we will check this page again and update it.', f: ['F-A1'] },
    ],
  },
  sections: [
    {
      id: 'small', kind: 'p',
      h: { hi: 'पहला चरण छोटा है — यह ध्यान रखें', en: 'The first phase is small — keep this in mind' },
      items: [
        { hi: 'रिपोर्टों के हिसाब से शुरुआत में सिर्फ़ लगभग 500 पशुपालक इसमें होंगे। इसलिए अगर आपका गाँव पहले 100 गाँवों में नहीं है, तो हो सकता है पहले चरण में आपको जगह न मिले। आगे संख्या बढ़ाने की बात है, पर कब, यह नहीं बताया गया।', en: 'According to the reports only about 500 keepers will be included at the start. So if your village is not among the first 100, you may not be included in the first phase. The reports talk of increasing the number later, but do not say when.', f: ['F-A2'] },
        { hi: 'हमारा अपना हिसाब: 500 पशुपालकों को ₹900 महीना देने पर साल का ख़र्च लगभग ₹54 लाख बनता है, जबकि रिपोर्टों में ₹40 करोड़ लिखा है। रिपोर्टों ने इस अंतर को नहीं समझाया, इसलिए हम ₹40 करोड़ को पहले चरण का ख़र्च नहीं कहते।', en: 'Our own arithmetic: paying 500 keepers Rs 900 a month comes to about Rs 54 lakh a year, while the reports say Rs 40 crore. The reports do not explain the gap, so we do not call Rs 40 crore the cost of the first phase.', f: ['F-A7'] },
      ],
    },
    {
      id: 'breeds', kind: 'ul',
      h: { hi: 'कौन सी देसी नस्लें गिनी गई हैं?', en: 'Which desi breeds are named?' },
      items: [
        { hi: 'रिपोर्टों में ये नस्लें हैं: महाकौशली, मालवी, निमाड़ी, केनकथा और गाओलाओ। लल्लूराम की रिपोर्ट इनके साथ गाड़ी-खेरी भी जोड़ती है, यानी कुल छह।', en: 'The reports name these breeds: Mahakoshali, Malvi, Nimadi, Kenkatha and Gaolao. The Lalluram report adds Gadi-Kheri, six in all.', f: ['F-A5'] },
        { hi: 'लल्लूराम के अनुसार मदद सिर्फ़ इन्हीं सूचीबद्ध नस्लों को पालने पर होगी। दूसरी या मिश्रित नस्ल की गाय पर क्या होगा, यह नहीं बताया गया।', en: 'According to Lalluram the help is only for keeping these listed breeds. What happens for other or crossbred cows is not stated.', f: ['F-A5', 'F-A6'] },
        { hi: 'सागर संभाग के लिए ख़ास: केनकथा बुंदेलखंड की नस्ल है। ईटीवी भारत इसे सागर, छतरपुर, पन्ना और टीकमगढ़ क्षेत्र में बताता है; लल्लूराम पन्ना, छतरपुर और केन नदी के इलाके का नाम लेता है। पूरी जानकारी "देसी नस्लें" पेज पर है।', en: 'Special for Sagar division: Kenkatha is a Bundelkhand breed. ETV Bharat places it in the Sagar, Chhatarpur, Panna and Tikamgarh area; Lalluram names Panna, Chhatarpur and the Ken river area. Full details are on the "Desi breeds" page.', f: ['F-A5', 'F-H4', 'F-H6'] },
      ],
    },
    {
      id: 'docs', kind: 'ul',
      h: { hi: 'दस्तावेज़: क्या रखें, क्या न मानें', en: 'Documents: what to keep, what not to assume' },
      items: [
        { hi: 'सरकारी सूची: अभी घोषित नहीं। जब तक सूची नहीं आती, किसी दस्तावेज़ को "ज़रूरी" न मानें।', en: 'Official list: not announced yet. Until a list is published, do not treat any document as "required".', f: ['F-A6'] },
        { hi: 'सामान्य तैयारी (शर्त नहीं): पहचान पत्र, बैंक पासबुक, पशुओं की गिनती का कागज़ और गाय की फ़ोटो एक फ़ाइल में रखें।', en: 'General preparation (not a condition): keep an identity card, bank passbook, a sheet with your animal count and photos of the cow together in one file.', f: ['GEN'] },
      ],
    },
    {
      id: 'where', kind: 'ul',
      h: { hi: 'सही जानकारी कहाँ मिलेगी', en: 'Where correct information will appear' },
      items: [
        { hi: 'अपने ब्लॉक का पशु चिकित्सालय और ज़िला पशुपालन एवं डेयरी कार्यालय — नई जानकारी सबसे पहले यहीं पहुँचती है।', en: 'Your block veterinary hospital and the district Animal Husbandry and Dairying office — new information usually reaches them first.', f: ['GEN'] },
        { hi: 'हमारे "उपयोगी संपर्क" पेज पर कृषि विभाग और हेल्पलाइन के नंबर।', en: 'Our "Useful contacts" page has agriculture department and helpline numbers.', f: ['GEN'] },
      ],
    },
    {
      id: 'mistakes', kind: 'ul',
      h: { hi: 'आम ग़लतियाँ', en: 'Common mistakes' },
      items: [
        { hi: 'ख़बर पढ़कर मान लेना कि योजना चालू है। अभी यह सिर्फ़ तैयारी की ख़बर है।', en: 'Reading a news story and assuming the scheme is running. For now it is only a report of preparation.', f: ['F-A1'] },
        { hi: '"₹900 तक" को पक्की रकम समझ लेना।', en: 'Taking "up to Rs 900" as a fixed amount.', f: ['F-A1'] },
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
  income: {
    h: { hi: 'आपकी कमाई पर असर', en: 'What it means for your income' },
    items: [
      { hi: 'अगर योजना ख़बरों के रूप में ही लागू होती है, तो ₹900 महीना साल में ₹10,800 तक बनता है। यह एक गाय के लिए है या पूरे परिवार के लिए, यह पता नहीं। इसलिए अपनी कमाई में इसे जोड़कर हिसाब न लगाएँ।', en: 'If the plan is carried out as reported, Rs 900 a month comes to up to Rs 10,800 a year. We do not know whether it is for one cow or the whole family. So do not build your own budget on it yet.', f: ['F-A8', 'F-A6'] },
      { hi: 'पहले चरण में सिर्फ़ लगभग 500 पशुपालक हैं। यानी बहुत से किसानों को शुरू में यह मदद शायद न मिले।', en: 'The first phase has only about 500 keepers. So many farmers may not get this help at the start.', f: ['F-A2'] },
      { hi: 'यह मदद आपकी असली कमाई, यानी दूध बेचने से होने वाली आमदनी, की जगह नहीं ले सकती। देसी गाय का असली फ़ायदा तब है जब चारे का ख़र्च और दूध की बिक्री का हिसाब ठीक बैठे। इसके लिए "पशुपालन से कमाई" पेज का दूध-हिसाब देखें।', en: 'This help cannot replace your real income, which is what you earn by selling milk. The real gain from a desi cow comes when feed cost and milk sales add up well. For that, see the milk calculator on the "Income from animals" page.', f: ['GEN'] },
    ],
  },
  who: {
    h: { hi: 'किसके लिए बताई गई है', en: 'Who it is reported to be for' },
    yes: {
      h: { hi: 'ख़बरों के अनुसार', en: 'According to the reports' },
      items: [
        { hi: 'सूचीबद्ध देसी नस्लों की गाय पालने वाले पशुपालक।', en: 'Cattle keepers with the listed desi breeds.', f: ['F-A5'] },
        { hi: 'पहले चरण के 100 गाँवों में से हर एक के 5 पशुपालक।', en: '5 keepers from each of the 100 first-phase villages.', f: ['F-A2'] },
      ],
    },
    no: {
      h: { hi: 'शायद शुरू में नहीं', en: 'Probably not at the start' },
      items: [
        { hi: 'जिनका गाँव पहले 100 गाँवों में नहीं है। आगे बढ़ाने की बात है, पर तारीख़ नहीं बताई गई।', en: 'Those whose village is not among the first 100. An increase later is mentioned, but no date is given.', f: ['F-A2'] },
        { hi: 'जिनके पास सूचीबद्ध नस्ल की गाय नहीं है। मिश्रित नस्ल पर क्या होगा, यह नहीं बताया गया।', en: 'Those who do not have a listed breed. What happens for crossbreds is not stated.', f: ['F-A5', 'F-A6'] },
      ],
    },
  },
  caution: {
    h: { hi: 'ठगों से सावधान', en: 'Beware of cheats' },
    items: [
      { hi: 'आवेदन या पंजीकरण के नाम पर किसी को पैसे न दें। ओटीपी, आधार की फ़ोटो या बैंक की जानकारी किसी अनजान लिंक या एजेंट को न दें। जब तक सरकार तरीका घोषित न करे, कोई फ़ॉर्म सरकारी नहीं माना जा सकता।', en: 'Do not pay anyone in the name of an application or registration. Do not give an OTP, Aadhaar photo or bank details to an unknown link or agent. Until the government announces the method, no form can be treated as official.', f: ['GEN'] },
    ],
  },
  faqs: [
    { q: { hi: 'क्या देसी गाय पर ₹900 महीना योजना शुरू हो गई है?', en: 'Has the Rs 900 a month desi cow scheme started?' }, a: { hi: 'अभी नहीं। समाचारों के अनुसार (28 अक्टूबर 2026) सरकार इसकी तैयारी में है और 15 नवंबर 2026 को शुरू करना चाहती है। हमें अभी कोई सरकारी आदेश नहीं मिला।', en: 'Not yet. According to news reports (28 October 2026) the government is preparing it and wants to start on 15 November 2026. We have not found a government order.' }, f: ['F-A1', 'F-A6'] },
    { q: { hi: 'आवेदन कहाँ और कैसे करें?', en: 'Where and how do I apply?' }, a: { hi: 'आवेदन का तरीका अभी घोषित नहीं हुआ है। घोषणा होते ही हम इस पेज और WhatsApp चैनल पर बताएँगे। तब तक किसी को पैसे न दें।', en: 'The method of applying has not been announced. We will post on this page and on the WhatsApp Channel as soon as it is. Until then, do not pay anyone.' }, f: ['F-A6'] },
    { q: { hi: 'क्या ₹900 हर गाय पर मिलेगा?', en: 'Will Rs 900 be paid for every cow?' }, a: { hi: 'यह अभी साफ़ नहीं है। रिपोर्टें यह नहीं बतातीं कि रकम प्रति गाय है या प्रति परिवार, न यह कि कितनी गायों पर मिलेगी।', en: 'This is not clear yet. The reports do not say whether the amount is per cow or per family, or for how many cows.' }, f: ['F-A6'] },
    { q: { hi: 'कौन सी नस्ल की गाय पर मदद की बात है?', en: 'Which breeds are mentioned?' }, a: { hi: 'रिपोर्टों में महाकौशली, मालवी, निमाड़ी, केनकथा और गाओलाओ का नाम है; लल्लूराम इनमें गाड़ी-खेरी जोड़ता है।', en: 'The reports name Mahakoshali, Malvi, Nimadi, Kenkatha and Gaolao; Lalluram adds Gadi-Kheri.' }, f: ['F-A5'] },
    { q: { hi: 'सागर संभाग के किसान के लिए क्या ख़ास है?', en: 'What matters for a farmer in Sagar division?' }, a: { hi: 'केनकथा बुंदेलखंड की नस्ल है और रिपोर्टों में इसका नाम है। पर पहले चरण के 100 गाँवों की सूची अभी सार्वजनिक नहीं है, इसलिए ब्लॉक पशु चिकित्सालय से पूछें।', en: 'Kenkatha is a Bundelkhand breed and is named in the reports. But the list of the first 100 villages is not public, so ask your block veterinary hospital.' }, f: ['F-A5', 'F-A6'] },
    { q: { hi: 'पहले चरण में कितने किसान होंगे?', en: 'How many farmers are in the first phase?' }, a: { hi: 'रिपोर्टों के अनुसार 100 गाँव और हर गाँव से 5 पशुपालक, यानी लगभग 500। आगे संख्या बढ़ाने की बात है।', en: 'According to the reports, 100 villages and 5 keepers from each, about 500 in all. An increase later is mentioned.' }, f: ['F-A2'] },
    { q: { hi: 'क्या इसके लिए आधार लिंक खाता ज़रूरी है?', en: 'Is an Aadhaar-linked account required?' }, a: { hi: 'यह अभी घोषित नहीं है। किसी शर्त को पक्का न मानें; सिर्फ़ तैयारी के लिए खाता चालू रखें।', en: 'This has not been announced. Do not treat any condition as certain; just keep your account active as preparation.' }, f: ['F-A6'] },
  ],
  sources: [
    { title: { hi: 'ईटीवी भारत मध्य प्रदेश', en: 'ETV Bharat Madhya Pradesh' }, url: 'https://www.etvbharat.com/hi/state/raise-desi-cow-get-grant-900rs-per-month-from-mp-govt-mohan-yadav-govt-plan-for-dairy-farmers-madhya-pradesh-mps26102801458', type: NEWS, date: '2026-10-28' },
    { title: { hi: 'लल्लूराम', en: 'Lalluram' }, url: 'https://lalluram.com/mp-desi-cow-rearing-scheme-900-rupees-monthly/', type: NEWS, date: '2026-10-28' },
    { title: { hi: 'गाँव जंक्शन', en: 'Gaon Junction' }, url: 'https://www.gaonjunction.com/pashudhan/mp-to-give-rs-900-monthly-aid-for-rearing-desi-cows-scheme-launch-on-november-15', type: NEWS, date: '2026-10-28' },
  ],
  related: ['/pashupalan/pashupalan-se-kamai', '/pashupalan/desi-nasle', '/pashupalan/pashu-kisan-credit-card', '/pashupalan', '/yojana/mp', '/sawaal', '/mausam', '/resources'],
}
