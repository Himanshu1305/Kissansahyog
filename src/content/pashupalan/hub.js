// Batch 19-B - /pashupalan : the hub (FACTS A-I). Status and asOf of each scheme card are checked
// against the detail-page modules by tests/unit/pashupalan-19-content.test.mjs.
export { GUIDE, pickGuide } from './guide.js'

export default {
  slug: 'hub',
  path: '/pashupalan',
  art: 'hub',
  asOf: '2026-11-05',
  seo: {
    title: { hi: 'पशुपालन योजनाएँ मध्य प्रदेश — देसी गाय, कामधेनु, गौशाला, KCC', en: 'Animal husbandry schemes in Madhya Pradesh — desi cow, Kamdhenu, gaushala, KCC' },
    description: { hi: 'मध्य प्रदेश के पशुपालकों के लिए सरकारी मदद: देसी गाय पर ₹900 महीना (योजना), कामधेनु डेयरी लोन, गौशाला अनुदान, पशुपालन KCC और केंद्रीय योजनाएँ — हर बात स्रोत और तारीख़ के साथ।', en: 'Government help for livestock keepers in Madhya Pradesh: Rs 900 a month for desi cows (planned), Kamdhenu dairy loan, gaushala grant, animal husbandry KCC and central schemes — every point with source and date.' },
  },
  h1: { hi: 'मध्य प्रदेश के पशुपालकों के लिए सरकारी मदद', en: 'Government help for livestock keepers in Madhya Pradesh' },
  hook: { hi: 'गाय है, पर पता नहीं कौन सी मदद मिलेगी? पहले यह देखिए।', en: 'You have a cow, but do not know which help applies? Look here first.', f: ['GEN'] },
  answer: {
    hi: 'मध्य प्रदेश में पशुपालकों के लिए अभी पाँच तरह की सरकारी मदद की चर्चा है: देसी गाय पर ₹900 तक महीना (अभी योजना), डेयरी यूनिट के लिए कामधेनु लोन-सब्सिडी, गौशाला अनुदान, पशुपालन के लिए किसान क्रेडिट कार्ड और केंद्र की योजनाएँ। हर एक की स्थिति और तारीख़ साफ़ लिखी है।',
    en: 'Five kinds of government help for livestock keepers are being discussed in Madhya Pradesh right now: up to Rs 900 a month for desi cows (still a plan), the Kamdhenu dairy-unit loan with subsidy, the gaushala grant, the Kisan Credit Card for animal husbandry and central schemes. The status and date of each is written clearly.',
    f: ['F-A1', 'F-B1', 'F-C1', 'F-D1', 'F-F1'],
  },
  intro: [
    { hi: 'खबरों में बहुत कुछ चलता है, और हर बात पक्की नहीं होती। इस पेज का काम है आपको सीधे बताना कि क्या पक्का है, क्या सिर्फ़ खबर है और क्या अभी घोषित ही नहीं हुआ।', en: 'A lot goes around in the news, and not everything is firm. This page tells you plainly what is firm, what is only a report and what is not announced at all.', f: ['GEN'] },
    { hi: 'हर योजना का अपना पेज है। उसमें सीधे लिंक, तारीख़ें, आपकी कमाई पर असर और सवाल-जवाब हैं।', en: 'Each scheme has its own page with direct links, dates, what it means for your income, and questions and answers.', f: ['GEN'] },
  ],
  why: {
    h: { hi: 'पशुपालन क्यों?', en: 'Why animals?' },
    intro: { hi: 'सरकारी सर्वे बताता है कि खेतिहर परिवार की कमाई में पशुओं का हिस्सा कितना है। नीचे तीन आँकड़े हैं। पूरी बात कमाई वाले पेज पर है।', en: 'A government survey shows how much animals add to a farm family’s income. Three figures are below. The full story is on the income page.', f: ['F-I1'] },
    tiles: [
      { v: { hi: '15.5%', en: '15.5%' }, l: { hi: 'देश के खेतिहर परिवार की कमाई में पशुपालन का हिस्सा', en: 'share of animals in a farm family’s income, India' }, src: { hi: 'सरकारी सर्वे · 2018-19', en: 'Government survey · 2018-19' }, f: ['F-I1'] },
      { v: { hi: 'पशु ₹2,084 · फ़सल ₹1,660', en: 'Animals Rs 2,084 · crops Rs 1,660' }, l: { hi: 'बहुत कम ज़मीन वाले परिवार की महीने की कमाई', en: 'monthly income of a family with very little land' }, src: { hi: 'सरकारी सर्वे · 2018-19', en: 'Government survey · 2018-19' }, f: ['F-I3'] },
      { v: { hi: '9.12% · तीसरा स्थान', en: '9.12% · third place' }, l: { hi: 'देश के दूध में मध्य प्रदेश का हिस्सा', en: 'Madhya Pradesh’s share of the country’s milk' }, src: { hi: 'पशुपालन आँकड़े 2025 (PIB) · 2024-25', en: 'Animal husbandry statistics 2025 (PIB) · 2024-25' }, f: ['F-I4'] },
    ],
  },
  schemes: [
    { slug: 'desi-gay-anudan', status: 'planned', asOf: '2026-11-05', name: { hi: 'देसी गाय पर मासिक मदद', en: 'Desi cow monthly assistance' }, who: { hi: 'सूचीबद्ध देसी नस्ल की गाय पालने वाले', en: 'People keeping the listed desi breeds' }, key: { hi: 'समाचारों के अनुसार हर महीने ₹900 तक · पहला चरण लगभग 500 पशुपालक', en: 'According to news up to Rs 900 a month · first phase about 500 keepers' }, f: ['F-A1', 'F-A2'] },
    { slug: 'kamdhenu-yojana', status: 'unknown', asOf: '2026-11-05', name: { hi: 'डॉ. अंबेडकर कामधेनु योजना', en: 'Dr Ambedkar Kamdhenu Yojana' }, who: { hi: 'डेयरी यूनिट लगाने वाले', en: 'People setting up a dairy unit' }, key: { hi: 'पोर्टल के अनुसार 7 साल का टर्म लोन और 25% या 33% सब्सिडी', en: 'According to the portal a 7-year term loan and 25% or 33% subsidy' }, f: ['F-B1', 'F-B2'] },
    { slug: 'gaushala-anudan', status: 'announced', asOf: '2026-11-05', name: { hi: 'गौशाला अनुदान', en: 'Gaushala grant' }, who: { hi: 'गौशाला चलाने वाली समितियाँ व संस्थाएँ', en: 'Committees and bodies that run a gaushala' }, key: { hi: 'समाचारों के अनुसार ₹40 प्रति गाय प्रतिदिन (अप्रैल 2025)', en: 'According to news Rs 40 per cow per day (April 2025)' }, f: ['F-C1'] },
    { slug: 'pashu-kisan-credit-card', status: 'open', asOf: '2026-11-05', name: { hi: 'पशुपालन किसान क्रेडिट कार्ड', en: 'Animal husbandry Kisan Credit Card' }, who: { hi: 'पशुपालक व डेयरी किसान', en: 'Livestock keepers and dairy farmers' }, key: { hi: 'बैंक कर्ज़ · पुस्तिका (2023) के अनुसार बिना गारंटी ₹1.6 लाख तक', en: 'Bank loan · per the leaflet (2023) up to Rs 1.6 lakh without collateral' }, f: ['F-D1'] },
    { slug: 'kendriya-yojanayen', status: 'unknown', asOf: '2026-11-05', name: { hi: 'केंद्रीय योजनाएँ', en: 'Central schemes' }, who: { hi: 'पशुपालक, डेयरी उद्यमी', en: 'Livestock keepers, dairy entrepreneurs' }, key: { hi: 'गोकुल मिशन ₹3,400 करोड़ (2025-26 तक) · बाकी पुष्ट नहीं', en: 'Gokul Mission Rs 3,400 crore (to 2025-26) · the rest not confirmed' }, f: ['F-F1'] },
    { slug: 'desi-nasle', status: 'info', asOf: '2026-11-05', name: { hi: 'देसी नस्लें और केनकथा', en: 'Desi breeds and Kenkatha' }, who: { hi: 'सभी पशुपालक', en: 'All livestock keepers' }, key: { hi: 'मध्य प्रदेश और बुंदेलखंड की नस्लों की जानकारी', en: 'Information on the breeds of Madhya Pradesh and Bundelkhand' }, f: ['F-A5', 'F-H1'] },
  ],
  sagar: {
    h: { hi: 'सागर संभाग के लिए', en: 'For Sagar division' },
    items: [
      { hi: 'आपके यहाँ की अपनी नस्ल केनकथा है। यह बुंदेलखंड की सख़्तजान नस्ल है, कम चारे में भी चल जाती है। इसका नाम देसी गाय की सूची में आया है। {{page:pashupalan/desi-nasle}}', en: 'Your own breed here is Kenkatha. It is a hardy Bundelkhand breed that manages on poor fodder. Its name has come up in the desi cow list. {{page:pashupalan/desi-nasle}}', f: ['F-A5', 'F-H1'] },
      { hi: 'बारिश भरोसे की नहीं है, इसलिए पशु आपकी कमाई का दूसरा सहारा बन सकते हैं। {{page:pashupalan/pashupalan-se-kamai}}', en: 'Rain cannot be trusted, so animals can become a second support for your income. {{page:pashupalan/pashupalan-se-kamai}}', f: ['GEN'] },
      { hi: 'चारा और भूसा खरीदना या बेचना हो तो {{page:bazaar}}। पशु-डॉक्टर या कृषि विभाग के नंबर चाहिए तो {{page:resources}}। मौसम देखना हो तो {{page:mausam}}।', en: 'To buy or sell fodder and straw, see {{page:bazaar}}. For a vet or agriculture department numbers, see {{page:resources}}. For the weather, see {{page:mausam}}.', f: ['GEN'] },
    ],
  },
  howto: {
    h: { hi: 'ख़बर को कैसे पढ़ें: पक्का, ख़बर, या पता नहीं', en: 'How to read a news story: firm, reported, or unknown' },
    items: [
      { hi: 'हर योजना के आगे रंगीन पट्टी है। "योजना बन रही है" यानी सरकार तैयारी में है और अभी कुछ नहीं मिल रहा। "घोषित" यानी फ़ैसला हुआ, पर नियम विभाग से पूछें।', en: 'Each scheme has a coloured strip. “Planned” means the government is preparing and nothing is being paid yet. “Announced” means a decision is made, but ask the department for the rules.', f: ['GEN'] },
      { hi: '"चालू" यानी सुविधा है, पर रकम और शर्तें बैंक या विभाग से पक्की करें। "पुष्टि बाकी" यानी हम पक्का नहीं कर सके।', en: '“Open” means the facility exists, but confirm the amount and conditions with the bank or department. “Not confirmed” means we could not make it certain.', f: ['GEN'] },
      { hi: 'जो बात सरकारी पोर्टल पर लिखी है, हम सीधे लिखते हैं। जो सिर्फ़ एक समाचार में है, वहाँ "समाचारों के अनुसार" और तारीख़ लिखते हैं। जो पता नहीं, वहाँ "अभी घोषित नहीं"।', en: 'What is on a government portal, we state directly. What is in only one news report, we mark “according to news” with the date. What is unknown, we write “not announced yet”.', f: ['GEN'] },
      { hi: 'हर पेज पर "जानकारी की तारीख़" है। तारीख़ पुरानी लगे तो समझें कि बात बदल गई होगी।', en: 'Every page shows an “information as of” date. If it looks old, assume things may have changed.', f: ['GEN'] },
      { hi: 'कोई पेज आपको कुछ मिलने का वादा नहीं करता। मिलना या न मिलना योजना की शर्तों पर है।', en: 'No page promises that you will get anything. Whether you do depends on the scheme’s conditions.', f: ['GEN'] },
    ],
  },
  checklist: {
    h: { hi: 'तैयार रखने की सूची (सरकारी शर्त नहीं)', en: 'What to keep ready (not an official requirement)' },
    items: [
      { hi: 'आधार कार्ड और चालू मोबाइल नंबर।', en: 'Aadhaar card and a working mobile number.', f: ['GEN'] },
      { hi: 'बैंक पासबुक, और पता कि खाता चालू है या नहीं।', en: 'Bank passbook, and whether the account is active.', f: ['GEN'] },
      { hi: 'पशुओं की गिनती, नस्ल और उम्र एक कागज़ पर, और गाय की साफ़ फ़ोटो।', en: 'The number, breed and age of your animals on a sheet, and clear photos of the cow.', f: ['GEN'] },
      { hi: 'ज़मीन के कागज़ अगर हैं, और निवास का प्रमाण।', en: 'Land papers if you have any, and proof of residence.', f: ['GEN'] },
      { hi: 'ब्लॉक के पशु चिकित्सालय का पता और फ़ोन नंबर।', en: 'The address and phone number of your block veterinary hospital.', f: ['GEN'] },
    ],
  },
  news: {
    h: { hi: 'क्या बदला — ताज़ा खबरें', en: 'What changed — latest news' },
    items: [
      { d: { hi: '28 अक्टूबर 2026', en: '28 Oct 2026' }, hi: 'समाचारों के अनुसार सरकार देसी गाय पर ₹900 तक महीना देने की तैयारी में है। शुरुआत की संभावित तारीख़ 15 नवंबर 2026।', en: 'According to news the government is preparing up to Rs 900 a month for desi cows. Possible start: 15 November 2026.', f: ['F-A1'] },
      { d: { hi: '5 नवंबर 2026', en: '5 Nov 2026' }, hi: 'हमने सरकारी आदेश या शुरुआत की खबर ढूँढी, कुछ नहीं मिला। स्थिति "योजना बन रही है" ही है। 15 नवंबर के बाद यह पेज फिर देखा जाएगा।', en: 'We looked for a government order or launch report and found none. The status stays “planned”. After 15 November this page will be checked again.', f: ['F-A6'] },
      { d: { hi: '8 अप्रैल 2025', en: '8 Apr 2025' }, hi: 'समाचारों के अनुसार कैबिनेट ने आत्मनिर्भर गौशाला नीति 2025 को मंज़ूरी दी और गौशाला अनुदान ₹20 से ₹40 प्रति गाय प्रतिदिन किया।', en: 'According to news the cabinet approved the Self-Reliant Gaushala Policy 2025 and raised the gaushala grant from Rs 20 to Rs 40 per cow per day.', f: ['F-C1'] },
      { d: { hi: '19 मार्च 2025', en: '19 Mar 2025' }, hi: 'केंद्रीय कैबिनेट ने संशोधित राष्ट्रीय गोकुल मिशन को मंज़ूरी दी।', en: 'The Union Cabinet approved the revised Rashtriya Gokul Mission.', f: ['F-F1'] },
    ],
  },
  where: {
    h: { hi: 'सही जानकारी कहाँ से लें', en: 'Where to get correct information' },
    items: [
      { hi: 'ब्लॉक का पशु चिकित्सालय और ज़िला पशुपालन एवं डेयरी कार्यालय — नई योजना की जानकारी सबसे पहले यहीं पहुँचती है।', en: 'Your block veterinary hospital and district Animal Husbandry and Dairying office — news of a new scheme reaches them first.', f: ['GEN'] },
      { hi: 'राज्य विभाग की वेबसाइट {{link:mpdah}}। 5 नवंबर 2026 को इस पर कोई योजना सूचीबद्ध नहीं थी, पर यह गौपालन बोर्ड, राज्य पशुधन एवं कुक्कुट विकास निगम और राज्य सहकारी डेयरी संघ से जोड़ती है।', en: 'The state department website {{link:mpdah}}. On 5 November 2026 it listed no scheme, but it links to the Gaupalan Board, the State Livestock and Poultry Development Corporation and the State Co-operative Dairy Federation.', f: ['F-G1'] },
      { hi: 'केंद्र की वेबसाइट {{link:dahd}}, और सरकारी योजनाएँ खोजने के लिए {{link:myscheme}}।', en: 'The central website {{link:dahd}}, and to search government schemes {{link:myscheme}}.', f: ['GEN'] },
      { hi: 'हमारे {{page:resources}} और {{page:sawaal}} पेज, जहाँ आप सीधे पूछ सकते हैं।', en: 'Our {{page:resources}} and {{page:sawaal}} pages, where you can ask directly.', f: ['GEN'] },
    ],
  },
  notFound: {
    h: { hi: 'जो हम पुष्ट नहीं कर सके', en: 'What we could not confirm' },
    items: [
      { hi: 'देसी गाय योजना का सरकारी नाम, विभाग, पात्रता और आवेदन का तरीका।', en: 'The official name, department, eligibility and way to apply of the desi cow scheme.', f: ['F-A6'] },
      { hi: 'कामधेनु योजना के यूनिट का आकार, दस्तावेज़ और लोन की रकम।', en: 'The unit size, documents and loan amount of the Kamdhenu scheme.', f: ['F-B4'] },
      { hi: 'गोपाल प्रोत्साहन जैसे पुरस्कार — अभी चल रहे हैं या नहीं।', en: 'Prizes such as Gopal Protsahan — whether they are running now.', f: ['F-E1'] },
    ],
  },
  safety: {
    h: { hi: 'ठगी से बचने की सीधी बातें', en: 'Plain rules to avoid being cheated' },
    items: [
      { hi: 'सरकारी योजना के आवेदन के लिए किसी एजेंट या व्हाट्सऐप संदेश भेजने वाले को पैसे न दें।', en: 'Do not pay an agent or a WhatsApp message sender for a government scheme application.', f: ['GEN'] },
      { hi: 'ओटीपी, आधार की फ़ोटो या बैंक की जानकारी किसी अनजान लिंक पर न डालें।', en: 'Do not put an OTP, Aadhaar photo or bank details on an unknown link.', f: ['GEN'] },
      { hi: 'जब तक सरकार आवेदन का तरीका घोषित न करे, कोई भी फ़ॉर्म "सरकारी" नहीं माना जा सकता।', en: 'Until the government announces the application method, no form can be treated as official.', f: ['GEN'] },
      { hi: 'शक हो तो अपने ब्लॉक के पशु चिकित्सालय या ज़िला पशुपालन कार्यालय जाकर ख़ुद पूछ लें।', en: 'If in doubt, go and ask your block veterinary hospital or district animal husbandry office yourself.', f: ['GEN'] },
    ],
  },
  faqs: [
    { q: { hi: 'मध्य प्रदेश में पशुपालकों के लिए कौन सी सरकारी योजनाएँ हैं?', en: 'Which government schemes exist for livestock keepers in Madhya Pradesh?' }, a: { hi: 'हमने पाँच की जानकारी जुटाई है: देसी गाय पर मासिक मदद (अभी योजना), कामधेनु डेयरी लोन-सब्सिडी, गौशाला अनुदान, पशुपालन KCC और केंद्रीय योजनाएँ। हर एक का पेज स्थिति और तारीख़ के साथ है।', en: 'We have gathered five: the desi cow monthly assistance (still a plan), the Kamdhenu dairy loan and subsidy, the gaushala grant, the animal husbandry KCC and central schemes. Each has a page with status and date.' }, f: ['F-A1', 'F-B1', 'F-C1', 'F-D1', 'F-F1'] },
    { q: { hi: 'क्या देसी गाय पर ₹900 अभी मिल रहा है?', en: 'Is the Rs 900 for desi cows being paid now?' }, a: { hi: 'नहीं। यह अभी तैयारी में है; समाचारों के अनुसार 15 नवंबर 2026 को शुरू करने की योजना है। आवेदन का तरीका घोषित नहीं हुआ।', en: 'No. It is still being prepared; according to news reports the plan is to start on 15 November 2026. The way to apply is not announced.' }, f: ['F-A1', 'F-A6'] },
    { q: { hi: 'डेयरी शुरू करने के लिए लोन कहाँ मिलेगा?', en: 'Where can I get a loan to start a dairy?' }, a: { hi: 'कामधेनु योजना के पोर्टल पर आवेदन के चरण बताए गए हैं; विभाग जाँचकर बैंक को भेजता है। पात्रता पोर्टल के पात्रता पेज पर देखें।', en: 'The Kamdhenu scheme portal describes the application steps; the department reviews and forwards to a bank. See eligibility on the portal’s eligibility page.' }, f: ['F-B3', 'F-B4'] },
    { q: { hi: 'चारे के लिए पैसे कहाँ से मिलेंगे?', en: 'Where can I get money for fodder?' }, a: { hi: 'किसान क्रेडिट कार्ड (पशुपालन) बैंक से कर्ज़ का रास्ता है। यह कर्ज़ है, मदद राशि नहीं।', en: 'The Kisan Credit Card (animal husbandry) is a way to take a bank loan. It is a loan, not an assistance grant.' }, f: ['F-D1'] },
    { q: { hi: 'पशुपालन से कितनी कमाई जुड़ती है?', en: 'How much income do animals add?' }, a: { hi: 'सरकारी सर्वे (2018-19) में देश के खेतिहर परिवार की कमाई का 15.5 प्रतिशत पशुओं से आया। विस्तार कमाई वाले पेज पर है, जहाँ दूध का हिसाब लगाने वाला कैलकुलेटर भी है।', en: 'In the government survey (2018-19), 15.5 percent of an agricultural household’s income in India came from animals. Details are on the income page, which also has a milk calculator.' }, f: ['F-I1'] },
    { q: { hi: 'नई घोषणा की जानकारी कैसे मिलेगी?', en: 'How will I learn of a new announcement?' }, a: { hi: 'हमारे WhatsApp चैनल से जुड़ें। हम पेज की स्थिति और तारीख़ भी बदलते रहेंगे।', en: 'Join our WhatsApp Channel. We will also keep changing the status and date on the pages.' }, f: ['GEN'] },
  ],
  sources: [
    { title: { hi: 'ईटीवी भारत मध्य प्रदेश', en: 'ETV Bharat Madhya Pradesh' }, url: 'https://www.etvbharat.com/hi/state/raise-desi-cow-get-grant-900rs-per-month-from-mp-govt-mohan-yadav-govt-plan-for-dairy-farmers-madhya-pradesh-mps26102801458', type: 'NEWS', date: '2026-10-28' },
    { title: { hi: 'डॉ. भीमराव अंबेडकर कामधेनु योजना पोर्टल', en: 'Dr Bhimrao Ambedkar Kamdhenu Yojana portal' }, url: 'https://dbaky.mp.gov.in', type: 'OFFICIAL', date: '2026-11-05' },
    { title: { hi: 'मिलेनियम पोस्ट', en: 'Millennium Post' }, url: 'https://www.millenniumpost.in/nation/mp-cabinet-nod-to-self-reliant-gaushalas-renames-livestock-scheme-after-ambedkar-605736', type: 'NEWS', date: '2025-04-08' },
    { title: { hi: 'पशुपालन एवं डेयरी विभाग, मध्य प्रदेश', en: 'Animal Husbandry and Dairying Department, Madhya Pradesh' }, url: 'https://mpdah.gov.in', type: 'OFFICIAL', date: '2026-11-05' },
    { title: { hi: 'राष्ट्रीय सांख्यिकी कार्यालय — खेतिहर परिवारों का सर्वे 2019', en: 'National Statistical Office — Situation Assessment of Agricultural Households 2019' }, url: 'https://www.mospi.gov.in/sites/default/files/publication_reports/Report_587m_0.pdf', type: 'OFFICIAL', date: '2021-09' },
    { title: { hi: 'पीआईबी — बुनियादी पशुपालन आँकड़े 2025', en: 'PIB — Basic Animal Husbandry Statistics 2025' }, url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2195049&reg=3&lang=2', type: 'OFFICIAL', date: '2025-11-26' },
  ],
  related: ['/pashupalan/pashupalan-se-kamai', '/yojana', '/yojana/mp', '/sawaal', '/mausam', '/agro-forestry', '/bazaar', '/resources'],
}
