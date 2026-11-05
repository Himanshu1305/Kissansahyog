// Batch 19 - /pashupalan : the hub (FACTS A-H). Status and asOf of each table row are checked
// against the detail-page modules by tests/unit/pashupalan-19-content.test.mjs.
export { GUIDE, pickGuide } from './guide.js'

export default {
  slug: 'hub',
  path: '/pashupalan',
  asOf: '2026-11-05',
  seo: {
    title: { hi: 'पशुपालन योजनाएँ मध्य प्रदेश — देसी गाय, कामधेनु, गौशाला, KCC', en: 'Animal husbandry schemes in Madhya Pradesh — desi cow, Kamdhenu, gaushala, KCC' },
    description: { hi: 'मध्य प्रदेश के पशुपालकों के लिए एक जगह: देसी गाय पर ₹900 महीना (योजना), कामधेनु डेयरी लोन, गौशाला अनुदान, पशुपालन KCC और केंद्रीय योजनाएँ — हर बात स्रोत और तारीख़ के साथ।', en: 'One place for cattle keepers in Madhya Pradesh: Rs 900 a month for desi cows (planned), Kamdhenu dairy loan, gaushala grant, animal husbandry KCC and central schemes — every point with source and date.' },
  },
  h1: { hi: 'मध्य प्रदेश के पशुपालकों के लिए सरकारी मदद — एक जगह', en: 'Government help for cattle keepers in Madhya Pradesh — in one place' },
  answer: {
    hi: 'मध्य प्रदेश में पशुपालकों के लिए अभी पाँच तरह की सरकारी मदद की चर्चा है: देसी गाय पर ₹900 तक महीना (अभी योजना), डेयरी यूनिट के लिए कामधेनु लोन-सब्सिडी, गौशाला अनुदान, पशुपालन के लिए किसान क्रेडिट कार्ड और केंद्र की योजनाएँ। हर एक की स्थिति और तारीख़ नीचे साफ़ लिखी है।',
    en: 'Five kinds of government help for cattle keepers are being discussed in Madhya Pradesh right now: up to Rs 900 a month for desi cows (still a plan), the Kamdhenu dairy-unit loan with subsidy, the gaushala grant, the Kisan Credit Card for animal husbandry and central schemes. The status and date of each is written clearly below.',
    f: ['F-A1', 'F-B1', 'F-C1', 'F-D1', 'F-F1'],
  },
  intro: [
    { hi: 'सरकार पशुपालन को बढ़ावा दे रही है और खेती के साथ पशु आय का एक अच्छा ज़रिया हैं। लेकिन खबरों में बहुत कुछ चलता है और हर बात पक्की नहीं होती। इस पेज का काम है आपको सीधे बताना कि क्या पक्का है, क्या सिर्फ़ खबर है और क्या अभी घोषित ही नहीं हुआ।', en: 'The government is promoting animal husbandry, and animals are a good source of income alongside farming. But a lot goes around in the news and not everything is firm. The job of this page is to tell you plainly what is firm, what is only a report and what is not announced at all.', f: ['GEN'] },
    { hi: 'हम हर बात के साथ स्रोत और तारीख़ लिखते हैं। जो सरकारी पोर्टल पर है, उसे सीधे लिखा है। जो सिर्फ़ एक समाचार में है, उसे "समाचारों के अनुसार" लिखा है। जो पता नहीं, उसे "अभी घोषित नहीं" लिखा है।', en: 'We write the source and date with every point. What is on a government portal is stated directly. What is in only one news report is written as "according to news reports". What is not known is written as "not announced yet".', f: ['GEN'] },
  ],
  howto: {
    h: { hi: 'इस पेज को कैसे पढ़ें', en: 'How to read this page' },
    items: [
      { hi: 'हर योजना के आगे एक रंगीन स्थिति-पट्टी है। "योजना बन रही है" का मतलब है कि सरकार तैयारी में है, अभी कुछ मिल नहीं रहा। "घोषित" का मतलब है कि फ़ैसला हो चुका है, पर नियम और शर्तें विभाग से पूछनी हैं। "चालू" का मतलब है कि सुविधा उपलब्ध है, पर रकम और शर्तें अपने बैंक या विभाग से पक्की करें। "पुष्टि बाकी" का मतलब है कि हम पक्का नहीं कर सके।', en: 'Each scheme has a coloured status strip. "Planned" means the government is preparing it and nothing is being paid yet. "Announced" means a decision is made but you must ask the department for rules and conditions. "Open" means the facility is available, but confirm the amount and conditions with your bank or department. "Not confirmed" means we could not make it certain.', f: ['GEN'] },
      { hi: 'हर पेज पर "जानकारी की तारीख़" लिखी है। अगर वह तारीख़ पुरानी लगे तो समझें कि हो सकता है बात बदल गई हो।', en: 'Every page carries an "information as of" date. If that date looks old, assume things may have changed.', f: ['GEN'] },
      { hi: 'पेज के नीचे "स्रोत" में हर लिंक का प्रकार लिखा है: सरकारी पोर्टल, समाचार, या निजी जानकारी वेबसाइट। निजी वेबसाइट की बात को हम तभी लिखते हैं जब साफ़ बता दें कि सरकारी पुष्टि बाकी है।', en: 'In "Sources" at the bottom, each link has its type: government portal, news report or private information website. We include a private website’s point only when we say plainly that government confirmation is pending.', f: ['GEN'] },
      { hi: 'कोई भी पेज आपको कुछ मिलने का वादा नहीं करता। मिलना या न मिलना योजना की शर्तों पर निर्भर है, जो सरकार तय करती है।', en: 'No page promises that you will get anything. Whether you get it depends on the scheme’s conditions, which the government sets.', f: ['GEN'] },
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
  tableTitle: { hi: 'सब योजनाएँ एक नज़र में', en: 'All schemes at a glance' },
  table: [
    { slug: 'desi-gay-anudan', status: 'planned', asOf: '2026-11-05', name: { hi: 'देसी गाय पर मासिक मदद', en: 'Desi cow monthly assistance' }, who: { hi: 'सूचीबद्ध देसी नस्ल की गाय पालने वाले (पहला चरण: लगभग 500 पशुपालक, 100 गाँव)', en: 'People keeping the listed desi breeds (first phase: about 500 keepers in 100 villages)' }, get: { hi: 'समाचारों के अनुसार हर महीने ₹900 तक; नियम घोषित नहीं', en: 'According to news reports up to Rs 900 a month; rules not announced' }, f: ['F-A1', 'F-A2'] },
    { slug: 'kamdhenu-yojana', status: 'unknown', asOf: '2026-11-05', name: { hi: 'डॉ. अंबेडकर कामधेनु योजना', en: 'Dr Ambedkar Kamdhenu Yojana' }, who: { hi: 'डेयरी यूनिट लगाने वाले (पात्रता पोर्टल के पात्रता पेज पर)', en: 'People setting up a dairy unit (eligibility is on the portal’s eligibility page)' }, get: { hi: 'पोर्टल के अनुसार 7 साल का टर्म लोन और 25% या 33% सब्सिडी', en: 'According to the portal, a 7-year term loan and 25% or 33% subsidy' }, f: ['F-B1', 'F-B2'] },
    { slug: 'gaushala-anudan', status: 'announced', asOf: '2026-11-05', name: { hi: 'गौशाला अनुदान', en: 'Gaushala grant' }, who: { hi: 'गौशाला चलाने वाली समितियाँ व संस्थाएँ', en: 'Committees and bodies that run a gaushala' }, get: { hi: 'समाचारों के अनुसार ₹40 प्रति गाय प्रतिदिन (अप्रैल 2025)', en: 'According to news reports Rs 40 per cow per day (April 2025)' }, f: ['F-C1'] },
    { slug: 'pashu-kisan-credit-card', status: 'open', asOf: '2026-11-05', name: { hi: 'पशुपालन किसान क्रेडिट कार्ड', en: 'Animal husbandry Kisan Credit Card' }, who: { hi: 'पशुपालक व डेयरी किसान', en: 'Cattle keepers and dairy farmers' }, get: { hi: 'बैंक कर्ज़; पुस्तिका (2023) के अनुसार बिना गारंटी ₹1.6 लाख तक', en: 'Bank loan; according to the leaflet (2023) up to Rs 1.6 lakh without collateral' }, f: ['F-D1'] },
    { slug: 'kendriya-yojanayen', status: 'unknown', asOf: '2026-11-05', name: { hi: 'केंद्रीय योजनाएँ', en: 'Central schemes' }, who: { hi: 'पशुपालक, डेयरी उद्यमी', en: 'Cattle keepers, dairy entrepreneurs' }, get: { hi: 'गोकुल मिशन ₹3,400 करोड़ (2025-26 तक); बाकी पुष्ट नहीं', en: 'Gokul Mission Rs 3,400 crore (up to 2025-26); the rest not confirmed' }, f: ['F-F1'] },
    { slug: 'desi-nasle', status: 'info', asOf: '2026-11-05', name: { hi: 'देसी नस्लें', en: 'Desi breeds' }, who: { hi: 'सभी पशुपालक', en: 'All cattle keepers' }, get: { hi: 'मध्य प्रदेश व बुंदेलखंड की नस्लों की जानकारी', en: 'Information on the breeds of Madhya Pradesh and Bundelkhand' }, f: ['F-A5', 'F-H1'] },
  ],
  checklist: {
    h: { hi: 'तैयार रखने की सूची (सामान्य तैयारी — सरकारी शर्त नहीं)', en: 'What to keep ready (general preparation — not an official requirement)' },
    items: [
      { hi: 'आधार कार्ड और मोबाइल नंबर जो चालू हो।', en: 'Aadhaar card and a working mobile number.', f: ['GEN'] },
      { hi: 'बैंक खाते की पासबुक और खाता चालू है या नहीं, इसकी जानकारी।', en: 'Bank passbook and knowing whether the account is active.', f: ['GEN'] },
      { hi: 'अपने पशुओं की गिनती, नस्ल और उम्र एक कागज़ पर, और गाय की साफ़ फ़ोटो।', en: 'The number, breed and age of your animals on a sheet, and clear photos of the cow.', f: ['GEN'] },
      { hi: 'ज़मीन के कागज़ अगर हैं, और निवास का प्रमाण।', en: 'Land papers if you have any, and proof of residence.', f: ['GEN'] },
      { hi: 'अपने ब्लॉक के पशु चिकित्सालय का पता और फ़ोन नंबर।', en: 'The address and phone number of your block veterinary hospital.', f: ['GEN'] },
    ],
  },
  news: {
    h: { hi: 'क्या बदला — ताज़ा खबरें (तारीख़ के साथ)', en: 'What changed — latest news (with dates)' },
    items: [
      { hi: '28 अक्टूबर 2026: समाचारों के अनुसार सरकार देसी गाय पर ₹900 तक महीना देने की तैयारी में है; 15 नवंबर 2026 से शुरू करने की योजना।', en: '28 October 2026: according to news reports the government is preparing to give up to Rs 900 a month for desi cows; plan to start on 15 November 2026.', f: ['F-A1'] },
      { hi: '5 नवंबर 2026: हमने सरकारी आदेश या शुरुआत की खबर ढूँढी, कुछ नहीं मिला। स्थिति "योजना बन रही है" ही है। 15 नवंबर के बाद यह पेज बदला जाएगा।', en: '5 November 2026: we looked for a government order or a launch report and found none. The status stays "planned". This page will be updated after 15 November.', f: ['F-A6'] },
      { hi: '8 अप्रैल 2025: समाचारों के अनुसार कैबिनेट ने आत्मनिर्भर गौशाला नीति 2025 को मंज़ूरी दी और गौशाला अनुदान ₹20 से ₹40 प्रति गाय प्रतिदिन किया।', en: '8 April 2025: according to news reports the cabinet approved the Self-Reliant Gaushala Policy 2025 and raised the gaushala grant from Rs 20 to Rs 40 per cow per day.', f: ['F-C1'] },
      { hi: '19 मार्च 2025: केंद्रीय कैबिनेट ने संशोधित राष्ट्रीय गोकुल मिशन को मंज़ूरी दी।', en: '19 March 2025: the Union Cabinet approved the revised Rashtriya Gokul Mission.', f: ['F-F1'] },
    ],
  },
  where: {
    h: { hi: 'सही जानकारी कहाँ से लें', en: 'Where to get correct information' },
    items: [
      { hi: 'अपने ब्लॉक का पशु चिकित्सालय और ज़िला पशुपालन एवं डेयरी कार्यालय — नई योजना की जानकारी सबसे पहले यहीं पहुँचती है।', en: 'Your block veterinary hospital and district Animal Husbandry and Dairying office — information on a new scheme usually reaches them first.', f: ['GEN'] },
      { hi: 'विभाग की वेबसाइट mpdah.gov.in — 5 नवंबर 2026 को इस पर कोई योजना सूचीबद्ध नहीं थी, पर यह गौपालन बोर्ड, राज्य पशुधन एवं कुक्कुट विकास निगम और राज्य सहकारी डेयरी संघ से जोड़ती है।', en: 'The department website mpdah.gov.in — on 5 November 2026 it listed no scheme, but it links to the Gaupalan Board, the State Livestock and Poultry Development Corporation and the State Co-operative Dairy Federation.', f: ['F-G1'] },
      { hi: 'हमारा "उपयोगी संपर्क" पेज और "किसान सवाल" पेज, जहाँ आप सीधे पूछ सकते हैं।', en: 'Our "Useful contacts" page and "Kisan Sawaal" page, where you can ask directly.', f: ['GEN'] },
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
  faqs: [
    { q: { hi: 'मध्य प्रदेश में पशुपालकों के लिए कौन सी सरकारी योजनाएँ हैं?', en: 'Which government schemes exist for cattle keepers in Madhya Pradesh?' }, a: { hi: 'हमने पाँच की जानकारी जुटाई है: देसी गाय पर मासिक मदद (अभी योजना), कामधेनु डेयरी लोन-सब्सिडी, गौशाला अनुदान, पशुपालन KCC और केंद्रीय योजनाएँ। हर एक का पेज स्थिति और तारीख़ के साथ है।', en: 'We have gathered five: the desi cow monthly assistance (still a plan), the Kamdhenu dairy loan and subsidy, the gaushala grant, the animal husbandry KCC and central schemes. Each has a page with status and date.' }, f: ['F-A1', 'F-B1', 'F-C1', 'F-D1', 'F-F1'] },
    { q: { hi: 'क्या देसी गाय पर ₹900 अभी मिल रहा है?', en: 'Is the Rs 900 for desi cows being paid now?' }, a: { hi: 'नहीं। यह अभी तैयारी में है; समाचारों के अनुसार 15 नवंबर 2026 को शुरू करने की योजना है। आवेदन का तरीका घोषित नहीं हुआ।', en: 'No. It is still being prepared; according to news reports the plan is to start on 15 November 2026. The way to apply is not announced.' }, f: ['F-A1', 'F-A6'] },
    { q: { hi: 'डेयरी शुरू करने के लिए लोन कहाँ मिलेगा?', en: 'Where can I get a loan to start a dairy?' }, a: { hi: 'कामधेनु योजना के पोर्टल dbaky.mp.gov.in पर आवेदन के चरण बताए गए हैं; विभाग जाँचकर बैंक को भेजता है। पात्रता पोर्टल के पात्रता पेज पर देखें।', en: 'The Kamdhenu scheme portal dbaky.mp.gov.in describes the application steps; the department reviews and forwards to a bank. See eligibility on the portal’s eligibility page.' }, f: ['F-B3', 'F-B4'] },
    { q: { hi: 'चारे के लिए पैसे कहाँ से मिलेंगे?', en: 'Where can I get money for fodder?' }, a: { hi: 'किसान क्रेडिट कार्ड (पशुपालन) बैंक से कर्ज़ का रास्ता है। यह कर्ज़ है, मदद राशि नहीं।', en: 'The Kisan Credit Card (animal husbandry) is a way to take a bank loan. It is a loan, not an assistance grant.' }, f: ['F-D1'] },
    { q: { hi: 'सही जानकारी का क्या भरोसा?', en: 'How reliable is this information?' }, a: { hi: 'हर बात के साथ स्रोत, उसका प्रकार (सरकारी पोर्टल, समाचार या निजी वेबसाइट) और तारीख़ लिखी है। जो पुष्ट नहीं, उसे "पुष्टि बाकी" या "अभी घोषित नहीं" लिखा है।', en: 'Every point carries its source, its type (government portal, news report or private website) and date. What is not confirmed is written as "not confirmed" or "not announced yet".' }, f: ['GEN'] },
    { q: { hi: 'नई घोषणा की जानकारी कैसे मिलेगी?', en: 'How will I learn of a new announcement?' }, a: { hi: 'हमारे WhatsApp चैनल से जुड़ें। हम पेज की स्थिति और तारीख़ भी बदलते रहेंगे।', en: 'Join our WhatsApp Channel. We will also keep changing the status and date on the pages.' }, f: ['GEN'] },
  ],
  sources: [
    { title: { hi: 'ईटीवी भारत मध्य प्रदेश', en: 'ETV Bharat Madhya Pradesh' }, url: 'https://www.etvbharat.com/hi/state/raise-desi-cow-get-grant-900rs-per-month-from-mp-govt-mohan-yadav-govt-plan-for-dairy-farmers-madhya-pradesh-mps26102801458', type: 'NEWS', date: '2026-10-28' },
    { title: { hi: 'डॉ. भीमराव अंबेडकर कामधेनु योजना पोर्टल', en: 'Dr Bhimrao Ambedkar Kamdhenu Yojana portal' }, url: 'https://dbaky.mp.gov.in', type: 'OFFICIAL', date: '2026-11-05' },
    { title: { hi: 'मिलेनियम पोस्ट', en: 'Millennium Post' }, url: 'https://www.millenniumpost.in/nation/mp-cabinet-nod-to-self-reliant-gaushalas-renames-livestock-scheme-after-ambedkar-605736', type: 'NEWS', date: '2025-04-08' },
    { title: { hi: 'पशुपालन एवं डेयरी विभाग, मध्य प्रदेश', en: 'Animal Husbandry and Dairying Department, Madhya Pradesh' }, url: 'https://mpdah.gov.in', type: 'OFFICIAL', date: '2026-11-05' },
  ],
  related: ['/yojana', '/yojana/mp', '/sawaal', '/mausam', '/agro-forestry', '/bazaar', '/experts', '/resources'],
}
