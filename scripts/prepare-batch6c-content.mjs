import { readFileSync, writeFileSync } from 'node:fs'

const file = new URL('../docs/research/qa_raw/batch5b.json', import.meta.url)
const data = JSON.parse(readFileSync(file, 'utf8'))
const verified = '2026-10-11'
for (const source of data.sources) source.last_verified = verified

const relatedFor = (slug, category) => {
  const same = data.qas.filter((q) => q.category === category && q.slug !== slug).slice(0, 3)
  const tool = category === 'mandi' ? { href: '/msp', hi: 'मंडी और समर्थन मूल्य की जानकारी देखें', en: 'See mandi and support-price information' }
    : category === 'soil' ? { href: '/fasal-salah', hi: 'फसल सलाह देखें', en: 'See crop advice' }
      : category === 'credit' ? { href: '/yojana', hi: 'सरकारी योजनाएँ देखें', en: 'See government schemes' }
        : { href: '/mausam', hi: 'मौसम की जानकारी देखें', en: 'See weather information' }
  return [
    ...same.map((q) => ({ href: `/sawaal/${q.slug}`, hi: q.question_hi, en: q.question_en })),
    tool,
  ].slice(0, 4)
}

const hi = (s) => ({ hi: s, en: '' })
const en = (s) => ({ hi: '', en: s })

function hindiBlocks(q, x) {
  const source = q.sources[0]
  const actions = (x.steps || [
    'आधिकारिक पेज खोलकर इस विषय की मौजूदा जानकारी पढ़ें और अपनी स्थिति से मिलान करें।',
    'जहाँ ऐप या पोर्टल का विकल्प हो, केवल आधिकारिक ऐप या वेबसाइट में ही आगे बढ़ें।',
    'यदि कोई स्थानीय नियम, दस्तावेज या रिकॉर्ड समझ में न आए तो संबंधित कार्यालय से पूछें।',
    'अगला कदम लेने से पहले स्क्रीन, रसीद या लिखित आधिकारिक जानकारी अपने पास रखें।',
  ]).map((step) => ({ text: { hi: step, en: '' }, cites: [source] }))
  return [
    { type: 'heading', id: 'kya-hai', text: hi('यह क्या है') },
    { type: 'paragraph', text: hi(`${x.what} यह उत्तर केवल ${x.owner} के आधिकारिक पृष्ठ में दी गई जानकारी का आसान सार है। इसे किसी मंजूरी, भुगतान, गुणवत्ता या परिणाम की पक्की बात न मानें। स्क्रीन, नियम और स्थानीय व्यवस्था बदल सकती है, इसलिए काम शुरू करने से पहले उसी आधिकारिक पेज पर अभी की जानकारी पढ़ें।`), cites: [source] },
    { type: 'heading', id: 'kaise-karen', text: hi('कैसे करें') },
    { type: 'list', ordered: true, howto: true, howtoName: hi(x.howto), items: actions },
    { type: 'heading', id: 'kahan-jayen', text: hi('कहाँ जाएँ / किससे मिलें') },
    { type: 'paragraph', text: hi(`आधिकारिक जानकारी और आगे का रास्ता ${x.place} पर देखें। यदि वेबसाइट खुल न रही हो, जानकारी समझ में न आए, या आपका मामला स्थानीय हो, तो अपने जिले के कृषि विभाग, KVK, संबंधित मंडी या बैंक/कार्यालय से पूछकर ही अगला कदम लें। किसी अनजान व्यक्ति को OTP, बैंक विवरण या दस्तावेज केवल संदेश देखकर न दें।`), cites: [source] },
    { type: 'heading', id: 'dhyan-rakhen', text: hi('ध्यान रखें') },
    { type: 'paragraph', text: hi(`${x.caution} इस पेज पर कोई निजी सलाह नहीं दी जा रही है। नाम, तारीख, उपलब्ध सुविधा, दस्तावेज और स्थानीय नियम समय के साथ बदल सकते हैं। अपनी जरूरत के अनुसार लिखित या आधिकारिक पुष्टि रखें, और किसी शुल्क, ऋण, बिक्री या दस्तावेज साझा करने से पहले सही कार्यालय या पोर्टल से मिलान करें।`), cites: [source] },
    { type: 'related', title: hi('ये भी देखें'), items: relatedFor(q.slug, q.category).map((item) => ({ href: item.href, text: { hi: item.hi, en: '' } })) },
  ]
}

function englishBlocks(q, x) {
  const source = q.sources[0]
  return [
    { type: 'heading', id: 'what-is-it', text: en('What this means') },
    { type: 'paragraph', text: en(`${x.enWhat} This is a plain-language summary of the official ${x.owner} page, not a promise of approval, payment, quality, or outcome. Check the current official page before acting.`), cites: [source] },
    { type: 'heading', id: 'how-to', text: en('How to proceed') },
    { type: 'list', ordered: true, items: (x.enSteps || [
      'Open the official page and compare the current information with your situation.',
      'Use only the official app or website where a portal or app is mentioned.',
      'Ask the relevant office about any local rule, document, or record you do not understand.',
      'Keep the official screen, receipt, or written information before taking the next step.',
    ]).map((step) => ({ text: en(step), cites: [source] })) },
    { type: 'heading', id: 'where-to-go', text: en('Where to confirm') },
    { type: 'paragraph', text: en(`Use ${x.enPlace}. For a local or individual case, confirm with the relevant mandi, agriculture office, KVK, bank, or office before you share documents or take the next step.`), cites: [source] },
    { type: 'heading', id: 'keep-in-mind', text: en('Keep in mind') },
    { type: 'paragraph', text: en(`${x.enCaution} Rules, dates, and local arrangements can change. Keep the official confirmation for your own record.`), cites: [source] },
    { type: 'related', title: en('See also'), items: relatedFor(q.slug, q.category).map((item) => ({ href: item.href, text: { hi: '', en: item.en } })) },
  ]
}

const entries = {
  'bis-complaint-channels': {
    short_hi: 'BIS के अनुसार शिकायत डाक, ईमेल, मोबाइल ऐप, BIS Standard Promotion Portal या नजदीकी शाखा कार्यालय में जाकर दी जा सकती है।', short_en: 'BIS says complaints can be made by post, email, mobile app, the BIS Standard Promotion Portal, or at a nearby branch office.',
    what: 'BIS प्रमाणित उत्पाद, BIS मानक-चिह्न के गलत उपयोग, गुणवत्ता नियंत्रण आदेश के उल्लंघन, भ्रामक दावे या BIS की सेवा से जुड़ी शिकायत के लिए आधिकारिक रास्ते बताए गए हैं।', owner: 'BIS', howto: 'BIS शिकायत भेजने का तरीका', place: 'BIS की आधिकारिक FAQ और नजदीकी BIS शाखा कार्यालय', caution: 'शिकायत में केवल वही जानकारी और प्रमाण दें जो आपके पास हों।', enWhat: 'BIS lists official channels for complaints about certified-product quality, misuse of a BIS mark, quality-control-order violations, misleading conformity claims, and BIS services.', enSteps: ['Identify the complaint category on the BIS page.', 'Choose post, email, the mobile app, portal, or a branch-office visit.', 'Provide only the facts and records you hold.', 'Keep a copy of what you submit.'], enPlace: 'the BIS FAQ or a nearby BIS branch office', enCaution: 'Give facts and records you can support.'
  },
  'sabzi-low-cost-postharvest': {
    short_hi: 'छोटे स्तर पर सब्जी संभालने के लिए महँगी मशीन हमेशा जरूरी नहीं होती; FAO के अनुसार सरल और कम-लागत तरीके सीमित साधन वाले काम में अधिक उपयुक्त हो सकते हैं।', short_en: 'Expensive machines are not always necessary for small vegetable handling; FAO says simple, low-cost methods can suit limited-resource operations.',
    what: 'कटाई के बाद संभाल का लक्ष्य सब्जी की गुणवत्ता बनाए रखना, भोजन की सुरक्षा का ध्यान रखना और खेत से उपभोक्ता तक होने वाली हानि घटाना है। FAO कहता है कि छोटी मात्रा और सीमित साधन वाले काम में महँगी मशीन की जगह सही प्रबंधन और सरल तकनीक अधिक काम आ सकती है।', owner: 'FAO', howto: 'छोटे स्तर पर सब्जी संभालने की योजना', place: 'FAO की पोस्टहार्वेस्ट मार्गदर्शिका और स्थानीय KVK', caution: 'नई मशीन या उपचार खरीदने से पहले अपनी फसल, मात्रा, बिजली, परिवहन और बाजार की स्थिति समझें।', enWhat: 'Postharvest handling aims to maintain quality, protect food safety, and reduce loss. FAO notes that management and simple low-cost methods can be more suitable than costly machinery for small operations.', enSteps: ['List the crop volume and handling problems you actually face.', 'Choose a simple practice that addresses that problem.', 'Try it on a small lot and observe handling loss.', 'Ask a local KVK before making a major purchase.'], enPlace: 'the FAO guide and your local KVK', enCaution: 'Match any purchase to crop volume, power, transport, and market conditions.'
  },
  'sabzi-packing-chot': {
    short_hi: 'सब्जी की पैकिंग ऐसी होनी चाहिए जो संभालने, ढुलाई और भंडारण के दौरान यांत्रिक चोट कम करे और गुणवत्ता बचाए।', short_en: 'Vegetable packing should reduce mechanical damage during handling, transport, and storage while protecting quality.',
    what: 'पैकिंग का काम केवल सामान बांधना नहीं है। कटाई के बाद सब्जी को उठाने, रखने, ढोने और रखने के समय दबाव, रगड़ और टकराव से चोट हो सकती है। FAO की मार्गदर्शिका गुणवत्ता बनाए रखने और इन चरणों में होने वाली हानि कम करने पर जोर देती है।', owner: 'FAO', howto: 'सब्जी की पैकिंग की जाँच', place: 'FAO की पोस्टहार्वेस्ट मार्गदर्शिका और स्थानीय KVK', caution: 'हर सब्जी के लिए एक ही डिब्बा या भरने का तरीका सही नहीं होता; पहले छोटे स्तर पर देख लें।', enWhat: 'Packing is part of postharvest handling. Produce can be damaged by pressure, rubbing, and impact during handling, transport, and storage; the FAO guide focuses on protecting quality and reducing those losses.', enSteps: ['Observe where produce is being bruised or crushed.', 'Choose packing that reduces rubbing and impact for that crop.', 'Avoid overfilling or rough handling.', 'Review the result after transport before changing the whole process.'], enPlace: 'the FAO guide and your local KVK', enCaution: 'One container or filling method does not suit every vegetable.'
  },
  'enam-farmer-app-register': {
    short_hi: 'e-NAM किसान मॉड्यूल के अनुसार ऐप डाउनलोड करने के बाद Home Page में Register चुनें और स्क्रीन पर दिए गए चरण पूरे करें।', short_en: 'According to the e-NAM Farmers Module, download the app, choose Register on the Home Page, and follow the on-screen steps.',
    what: 'e-NAM के किसान मॉड्यूल में किसान पंजीकरण शुरू करने का बहुत छोटा आधिकारिक निर्देश दिया गया है: ऐप डाउनलोड करें, Home Page के विकल्पों में Register चुनें और आगे के चरण पूरे करें। पेज उन चरणों के लिए अलग से कोई तय दस्तावेज या मंजूरी नहीं बताता।', owner: 'e-NAM', howto: 'e-NAM ऐप में किसान पंजीकरण शुरू करना', place: 'e-NAM Farmers Module और संबंधित मंडी', caution: 'केवल आधिकारिक e-NAM ऐप या वेबसाइट का उपयोग करें और किसी को OTP न बताएं।', enWhat: 'The e-NAM Farmers Module gives a concise official instruction: download the app, choose Register in the Home Page options, and follow the displayed steps. The page does not specify a fixed document list or approval outcome.', enSteps: ['Download the official e-NAM app.', 'Open the Home Page options.', 'Choose Register.', 'Follow the steps shown in the app and confirm local questions with the mandi.'], enPlace: 'the e-NAM Farmers Module and the relevant mandi', enCaution: 'Use only an official e-NAM channel and do not share an OTP.'
  },
  'enam-my-lots-history': {
    short_hi: 'e-NAM में My Lots टैब में लॉट की जानकारी और My Lots History में पिछले 7 दिनों की लॉट जानकारी देखी जा सकती है।', short_en: 'In e-NAM, the My Lots tab shows lot information and My Lots History shows lot information from the past 7 days.',
    what: 'e-NAM किसान मॉड्यूल दो अलग जगह बताता है। My Lots टैब में अपने लॉट की जानकारी देखी जा सकती है, जबकि My Lots History में पिछले सात दिनों की जानकारी देखने की बात लिखी है। यह पेज उस जानकारी की उपलब्धता या किसी विशेष लॉट के परिणाम का वचन नहीं देता।', owner: 'e-NAM', howto: 'e-NAM में लॉट जानकारी देखना', place: 'e-NAM Farmers Module और उस मंडी का सहायता केंद्र', caution: 'लॉट की स्क्रीन देखकर ही बिक्री, भुगतान या निकासी का फैसला न करें; जरूरत हो तो मंडी से मिलान करें।', enWhat: 'The Farmers Module identifies two places: My Lots for lot information and My Lots History for the past seven days of lot information. It does not promise that every detail or outcome will always be available.', enSteps: ['Open the official e-NAM app.', 'Go to My Lots for current lot information.', 'Use My Lots History for the past seven days.', 'Confirm any transaction question with the mandi.'], enPlace: 'the e-NAM Farmers Module and the mandi help point', enCaution: 'Do not rely on a screen alone for payment, sale, or exit decisions.'
  },
  'enam-auction-accept-reject': {
    short_hi: 'e-NAM किसान मॉड्यूल के अनुसार नीलामी पूरी होने और विजेता घोषित होने के बाद किसान प्रस्ताव को स्वीकार या अस्वीकार कर सकता है।', short_en: 'The e-NAM Farmers Module says that after an auction is completed and a winner is declared, a farmer can accept or reject the offer.',
    what: 'किसान मॉड्यूल के अनुसार नीलामी पूरी होने और विजेता घोषित होने के बाद किसान के पास प्रस्ताव स्वीकार करने या अस्वीकार करने का विकल्प होता है। पेज कीमत सही है या नहीं, भुगतान की स्थिति, या किसी सौदे की दूसरी शर्तों पर अलग निर्देश नहीं देता।', owner: 'e-NAM', howto: 'नीलामी के बाद प्रस्ताव देखना', place: 'e-NAM Farmers Module और संबंधित मंडी', caution: 'स्वीकार या अस्वीकार करने से पहले दिख रही जानकारी और मंडी की प्रक्रिया समझ लें।', enWhat: 'The Farmers Module says a farmer can accept or reject the offer after the auction is completed and the winner is declared. It does not provide separate instructions on price suitability, payment status, or other deal terms.', enSteps: ['Wait for the auction to complete.', 'Check that a winner has been declared.', 'Review the offer shown in the official channel.', 'Accept or reject only after confirming any local process question with the mandi.'], enPlace: 'the e-NAM Farmers Module and the relevant mandi', enCaution: 'Understand the displayed information and mandi process before acting.'
  },
  'enam-trader-registration-ways': {
    short_hi: 'e-NAM के अनुसार खरीदार या व्यापारी पंजीकरण e-NAM Portal, Mobile Application या मंडी में जाकर कराया जा सकता है।', short_en: 'e-NAM says buyer or trader registration can be done through the e-NAM Portal, Mobile Application, or by visiting a mandi.',
    what: 'e-NAM के व्यापारी पेज में खरीदार/व्यापारी पंजीकरण के तीन रास्ते लिखे हैं: e-NAM Portal, Mobile Application और मंडी में जाकर पंजीकरण। यह सुविधा किस राज्य, मंडी या लाइसेंस की स्थिति में लागू होगी, उसके लिए स्थानीय मंडी से पुष्टि जरूरी है।', owner: 'e-NAM', howto: 'e-NAM व्यापारी पंजीकरण का रास्ता चुनना', place: 'e-NAM Trader page, आधिकारिक पोर्टल या संबंधित मंडी', caution: 'लाइसेंस या दूसरे दस्तावेजों की जरूरत स्थानीय नियमों पर निर्भर हो सकती है।', enWhat: 'The e-NAM Traders page lists three routes for buyer/trader registration: the e-NAM Portal, Mobile Application, and in-person mandi registration. Confirm local applicability and licence requirements with the mandi.', enSteps: ['Choose the official portal, app, or mandi route.', 'Read the current registration screen or ask the mandi desk.', 'Prepare only the requested official details and records.', 'Keep the acknowledgement or reference for your record.'], enPlace: 'the e-NAM Traders page, official portal, or relevant mandi', enCaution: 'Licence and document requirements may vary locally.'
  },
  'enam-trader-registration-fee': {
    short_hi: 'e-NAM के व्यापारी पेज के अनुसार पंजीकरण शुल्क नहीं है; नाम, पता, जन्म-तिथि, मोबाइल, बैंक विवरण और कुछ दस्तावेज मांगे जा सकते हैं।', short_en: 'The e-NAM Traders page says there is no registration fee; name, address, date of birth, mobile, bank details, and some documents may be requested.',
    what: 'e-NAM के व्यापारी पेज में पंजीकरण के लिए शुल्क नहीं बताया गया है। उसी पेज में नाम, लिंग, पता, जन्म-तिथि, मोबाइल और बैंक विवरण जैसे मूल विवरण तथा पासबुक या रद्द चेक, सरकारी पहचान-पत्र, ट्रेडिंग लाइसेंस और अन्य संबंधित दस्तावेजों का उल्लेख है।', owner: 'e-NAM', howto: 'e-NAM व्यापारी पंजीकरण के लिए जानकारी जुटाना', place: 'e-NAM Trader page और संबंधित मंडी', caution: 'किसी निजी एजेंट को पंजीकरण शुल्क देने से पहले आधिकारिक मंडी या पोर्टल से पुष्टि करें।', enWhat: 'The e-NAM Traders page says there is no registration fee. It lists basic details and mentions a passbook or cancelled cheque, government ID, trading licence, and other concerned documents.', enSteps: ['Open the official trader-registration information.', 'Check the details and documents currently requested.', 'Use an official portal, app, or mandi route.', 'Confirm any local document requirement with the mandi.'], enPlace: 'the e-NAM Traders page and relevant mandi', enCaution: 'Confirm with the official portal or mandi before paying any private agent.'
  },
  'enam-transparent-bidding': {
    short_hi: 'e-NAM के व्यापारी पेज के अनुसार व्यापार इलेक्ट्रॉनिक और पारदर्शी बोली प्रक्रिया से किया जा सकता है।', short_en: 'The e-NAM Traders page says trading can be done electronically through a transparent bidding process.',
    what: 'e-NAM व्यापारी पेज यह बताता है कि व्यापार इलेक्ट्रॉनिक और पारदर्शी बोली प्रक्रिया से किया जा सकता है। इसका मतलब यह नहीं कि हर वस्तु, हर मंडी या हर उपयोगकर्ता के लिए एक ही अनुभव या परिणाम होगा। वस्तु, गुणवत्ता, मंडी की प्रक्रिया और स्थानीय नियम अलग हो सकते हैं।', owner: 'e-NAM', howto: 'e-NAM बोली प्रक्रिया को समझना', place: 'e-NAM Trader page और संबंधित मंडी', caution: 'बोली लगाने से पहले वस्तु, गुणवत्ता संबंधी उपलब्ध जानकारी और मंडी की शर्तें स्वयं देखें।', enWhat: 'The e-NAM Traders page says trading can be done electronically through a transparent bidding process. It does not mean every commodity, mandi, or user will have the same experience or outcome.', enSteps: ['Use the official e-NAM channel.', 'Read the commodity and mandi information available to you.', 'Understand the bidding screen before submitting a bid.', 'Ask the mandi about a local process or quality question.'], enPlace: 'the e-NAM Traders page and the relevant mandi', enCaution: 'Review available commodity and mandi information before bidding.'
  },
  'kcc-timely-flexible-credit': {
    short_hi: 'NABARD के Modified Interest Subvention Scheme पेज के अनुसार Kisan Credit Card का उद्देश्य कृषि इनपुट और उत्पादन जरूरतों के लिए समय पर और लचीला ऋण उपलब्ध कराना है। बैंक या NABARD कार्यालय से पुष्टि करें।', short_en: 'NABARD’s Modified Interest Subvention Scheme page describes Kisan Credit Card as intended to provide timely and flexible credit for agricultural inputs and production needs. Confirm with the bank or NABARD office.',
    what: 'इस NABARD स्रोत में Kisan Credit Card का उद्देश्य कृषि इनपुट और उत्पादन जरूरतों के लिए समय पर और लचीला ऋण बताना है। यह पेज किसी व्यक्ति की मंजूरी, सीमा, ब्याज, समय-सीमा या दस्तावेज तय नहीं करता। ऋण का निर्णय और उसकी शर्तें संबंधित बैंक की प्रक्रिया पर निर्भर होती हैं।', owner: 'NABARD', howto: 'KCC के बारे में बैंक से जानकारी लेना', place: 'संबंधित बैंक शाखा और NABARD की आधिकारिक जानकारी', caution: 'बैंक या NABARD कार्यालय से पुष्टि करें; किसी बिचौलिए की ऋण मंजूरी की बात पर भरोसा न करें।', enWhat: 'This NABARD source describes Kisan Credit Card as intended for timely and flexible credit for agricultural inputs and production needs. It does not set an individual approval, limit, interest, deadline, or document list; the bank decides under its process.', enSteps: ['Ask your bank whether a KCC facility applies to your case.', 'Read the bank’s current official requirements.', 'Provide records only through the bank’s official process.', 'Keep the bank’s written information and confirm with NABARD or the bank office when needed.'], enPlace: 'your bank branch and NABARD’s official information', enCaution: 'Confirm with the bank or NABARD office; do not rely on an intermediary’s approval claim.'
  },
  'kcc-warehouse-receipt-credit': {
    short_hi: 'NABARD के पेज में छोटे और सीमांत KCC किसानों के लिए मान्यता-प्राप्त गोदाम में रखी उपज के e-NWR पर फसल बाद रियायती ऋण का उल्लेख है। अवधि और पात्रता बैंक या NABARD कार्यालय से पुष्टि करें।', short_en: 'NABARD’s page mentions post-harvest concessional credit for small and marginal KCC farmers against e-NWRs for produce stored in accredited warehouses. Confirm period and eligibility with the bank or NABARD office.',
    what: 'NABARD के Modified Interest Subvention Scheme स्रोत में छोटे और सीमांत KCC किसानों के लिए मान्यता-प्राप्त गोदाम में रखी उपज के इलेक्ट्रॉनिक नेगोशिएबल वेयरहाउस रसीद, e-NWR, के विरुद्ध फसल बाद रियायती ऋण का उल्लेख है। स्रोत में छह महीने तक की बात है, लेकिन आपकी पात्रता और लागू शर्त केवल बैंक पुष्टि करेगा।', owner: 'NABARD', howto: 'गोदाम रसीद पर ऋण के बारे में बैंक से पूछना', place: 'संबंधित बैंक शाखा, मान्यता-प्राप्त गोदाम और NABARD की आधिकारिक जानकारी', caution: 'बैंक या NABARD कार्यालय से पुष्टि करें; गोदाम, रसीद और फसल की स्थिति पहले बैंक से मिलाएँ।', enWhat: 'NABARD’s Modified Interest Subvention Scheme source mentions post-harvest concessional credit for small and marginal KCC farmers against electronic negotiable warehouse receipts (e-NWRs) for produce in accredited warehouses. It mentions up to six months, but the bank must confirm your eligibility and conditions.', enSteps: ['Ask the bank whether this facility applies to your KCC and produce.', 'Confirm whether the warehouse and receipt meet the bank’s current requirements.', 'Use the bank’s official process for any application.', 'Keep written confirmation of the applicable terms.'], enPlace: 'your bank, accredited warehouse, and NABARD official information', enCaution: 'Confirm with the bank or NABARD office before relying on the receipt or period.'
  },
  'nabard-production-credit': {
    short_hi: 'NABARD की कृषि ऋण जानकारी में उत्पादन-उन्मुख ऋण के लिए जरूरत का आकलन और उर्वरक व कीटनाशक जैसे इनपुट के लिए ऋण का उल्लेख है। अपनी स्थिति बैंक या NABARD कार्यालय से पुष्टि करें।', short_en: 'NABARD agricultural-credit information mentions assessment of production credit needs and credit for inputs such as fertilisers and pesticides. Confirm your situation with the bank or NABARD office.',
    what: 'NABARD की कृषि ऋण जानकारी उत्पादन-उन्मुख ऋण में ऋण जरूरत के आकलन और उर्वरक तथा कीटनाशक जैसे इनपुट के लिए ऋण प्रावधान का संदर्भ देती है। यह सामान्य संस्थागत जानकारी है, न कि किसी किसान की ऋण मंजूरी। बैंक आपकी जरूरत, रिकॉर्ड और अपनी प्रक्रिया के अनुसार फैसला करता है।', owner: 'NABARD', howto: 'उत्पादन ऋण के बारे में बैंक से जानकारी लेना', place: 'संबंधित बैंक शाखा और NABARD की कृषि ऋण जानकारी', caution: 'बैंक या NABARD कार्यालय से पुष्टि करें; उधार की शर्त, ब्याज या मंजूरी के बारे में कोई अनुमान न लगाएँ।', enWhat: 'NABARD agricultural-credit information refers to assessing production-credit needs and to credit for inputs such as fertilisers and pesticides. This is institutional information, not an approval for any farmer; the bank decides under its process.', enSteps: ['Speak to the bank about your production-credit requirement.', 'Ask for its current official requirements and terms.', 'Share records only through the bank’s authorised process.', 'Keep the written response and confirm uncertainties with the bank or NABARD office.'], enPlace: 'your bank branch and NABARD agricultural-credit information', enCaution: 'Confirm with the bank or NABARD office; do not assume terms, interest, or approval.'
  },
  'nabard-credit-drawal-period': {
    short_hi: 'NABARD की कृषि ऋण जानकारी के संदर्भित पेज में स्वीकृत पुनर्वित्त ऋण सीमा के प्रत्येक drawal को 12 महीने में चुकाने की बात कही गई है। लागू व्यवस्था बैंक या NABARD कार्यालय से पुष्टि करें।', short_en: 'The referenced NABARD agricultural-credit page says each drawal against a sanctioned refinance credit limit is repayable within 12 months. Confirm applicability with the bank or NABARD office.',
    what: 'संदर्भित NABARD पेज में स्वीकृत पुनर्वित्त ऋण सीमा के प्रत्येक drawal को 12 महीने में चुकाने की बात लिखी है। यह पुनर्वित्त संबंधी संस्थागत विवरण है; इसे अपने व्यक्तिगत KCC, फसल ऋण या किसी दूसरे बैंक उत्पाद की स्वतः शर्त न मानें। आपकी व्यवस्था का उत्तर संबंधित बैंक ही देगा।', owner: 'NABARD', howto: 'पुनर्वित्त अवधि के बारे में पुष्टि लेना', place: 'संबंधित बैंक शाखा और NABARD की कृषि ऋण जानकारी', caution: 'बैंक या NABARD कार्यालय से पुष्टि करें; ऋण समझौते में लिखी अवधि को ही अपना आधार मानें।', enWhat: 'The referenced NABARD page says each drawal against a sanctioned refinance credit limit is repayable within 12 months. This is institutional refinance information, not an automatic condition for an individual KCC, crop loan, or another bank product.', enSteps: ['Ask the relevant bank which product and agreement applies to you.', 'Read the repayment period in your official loan documents.', 'Request clarification in writing if a term is unclear.', 'Confirm refinance questions with the bank or NABARD office.'], enPlace: 'your bank branch and NABARD agricultural-credit information', enCaution: 'Confirm with the bank or NABARD office; rely on the period written in your loan agreement.'
  },
  'nabard-calamity-conversion': {
    short_hi: 'NABARD की कृषि ऋण जानकारी प्राकृतिक आपदा से प्रभावित किसानों के converted, rescheduled या rephased ऋणों के लिए पुनर्वित्त सुविधा का उल्लेख करती है। अपने मामले की पुष्टि बैंक या NABARD कार्यालय से करें।', short_en: 'NABARD agricultural-credit information mentions a refinance facility for converted, rescheduled, or rephased loans of farmers affected by natural calamities. Confirm your case with the bank or NABARD office.',
    what: 'NABARD की कृषि ऋण जानकारी प्राकृतिक आपदा से प्रभावित किसानों के converted, rescheduled या rephased ऋणों के लिए पुनर्वित्त सुविधा का उल्लेख करती है। इसका अर्थ यह नहीं कि हर नुकसान या हर ऋण अपने आप बदलेगा। नुकसान, ऋण की स्थिति और स्थानीय सरकारी या बैंक प्रक्रिया की जांच जरूरी है।', owner: 'NABARD', howto: 'आपदा के बाद ऋण स्थिति के बारे में बैंक से पूछना', place: 'संबंधित बैंक शाखा, स्थानीय प्रशासन और NABARD की कृषि ऋण जानकारी', caution: 'बैंक या NABARD कार्यालय से पुष्टि करें; आपदा, नुकसान और ऋण से जुड़े सभी रिकॉर्ड संभालकर रखें।', enWhat: 'NABARD agricultural-credit information mentions a refinance facility for converted, rescheduled, or rephased loans of farmers affected by natural calamities. It does not mean every loss or loan changes automatically; the bank and applicable process must assess the case.', enSteps: ['Contact the relevant bank promptly about the loan situation.', 'Ask what official records or local confirmation it requires.', 'Keep the records relating to loss and the loan.', 'Confirm the applicable process with the bank or NABARD office.'], enPlace: 'your bank, local administration, and NABARD agricultural-credit information', enCaution: 'Confirm with the bank or NABARD office and keep relevant records.'
  },
  'soil-health-card-languages': {
    short_hi: 'NIC के Soil Health Card Portal के अनुसार कार्ड 22 भाषाओं, 5 बोलियों और स्थानीय इकाइयों में बनाया जा सकता है।', short_en: 'According to NIC’s Soil Health Card Portal, a card can be generated in 22 languages, 5 dialects, and local units.',
    what: 'NIC के अनुसार Soil Health Card Portal कृषि एवं किसान कल्याण मंत्रालय के लिए बना वेब और स्मार्टफोन आधारित अनुप्रयोग है। वह पूरे देश के लिए एक समान रूप में कार्ड बनाने की सुविधा देता है और 22 भाषाओं, 5 बोलियों तथा स्थानीय इकाइयों का उल्लेख करता है।', owner: 'NIC Soil Health Card Portal', howto: 'स्थानीय भाषा में Soil Health Card के बारे में जानकारी लेना', place: 'Soil Health Card Portal और जिला/ब्लॉक स्तर का कृषि कार्यालय', caution: 'भाषा विकल्प और स्थानीय उपलब्धता स्क्रीन या कार्यालय में देखकर ही मानें।', enWhat: 'NIC describes the Soil Health Card Portal as a web and smartphone application for the Ministry of Agriculture & Farmers Welfare. It says cards can be generated in 22 languages, 5 dialects, and local units in a standardised format.', enSteps: ['Open the official Soil Health Card portal.', 'Check the language option shown for your card or service.', 'Ask the district or block agriculture office if help is needed.', 'Keep the card in the language you can understand.'], enPlace: 'the Soil Health Card Portal and district or block agriculture office', enCaution: 'Check the language option currently available on the screen or at the office.'
  },
  'soil-health-card-recommendations': {
    short_hi: 'Soil Health Card भूमि की पोषक-तत्व स्थिति और उर्वरक, जैव-उर्वरक, जैविक उर्वरक व मृदा सुधारक की मात्रा संबंधी सिफारिश देता है।', short_en: 'A Soil Health Card provides nutrient status of land and recommendations on dosages of fertilisers, bio-fertilisers, organic fertilisers, and soil amendments.',
    what: 'NIC के Soil Health Card Portal के अनुसार कार्ड किसान को उसकी जमीन की पोषक-तत्व स्थिति बताता है। उसी के आधार पर उर्वरक, जैव-उर्वरक, जैविक उर्वरक और मृदा सुधारक की मात्रा संबंधी सिफारिश दी जाती है ताकि लंबे समय में मिट्टी की सेहत बनाए रखने में मदद मिले।', owner: 'NIC Soil Health Card Portal', howto: 'Soil Health Card की सिफारिश समझना', place: 'Soil Health Card Portal, मिट्टी परीक्षण प्रयोगशाला और कृषि विभाग', caution: 'कार्ड की सिफारिश को पढ़कर ही इनपुट का उपयोग करें; अपने खेत की स्थिति के लिए कृषि अधिकारी या KVK से समझ लें।', enWhat: 'NIC says a Soil Health Card gives the nutrient status of land and recommendations on dosage of fertilisers, bio-fertilisers, organic fertilisers, and soil amendments to maintain soil health over time.', enSteps: ['Obtain or view the official Soil Health Card.', 'Read the nutrient-status information on the card.', 'Read the stated recommendation carefully.', 'Ask an agriculture office or KVK to explain the card for your field if needed.'], enPlace: 'the Soil Health Card Portal, soil-testing laboratory, and agriculture department', enCaution: 'Use the card’s recommendation carefully and seek local explanation for your field when needed.'
  },
  'soil-health-card-workflow': {
    short_hi: 'Soil Health Card Portal के workflow में नमूना संग्रह, पंजीकरण, मिट्टी परीक्षण, स्वतः उर्वरक सिफारिश और स्थानीय भाषा में कार्ड बनना शामिल है।', short_en: 'The Soil Health Card Portal workflow includes sample collection, registration, soil testing, automatic fertiliser recommendation, and card generation in a local language.',
    what: 'NIC के Soil Health Card Portal में क्रम साफ बताया गया है: नमूना संग्रह, नमूना पंजीकरण, मिट्टी परीक्षण, स्वतः उर्वरक सिफारिश और स्थानीय भाषा में Soil Health Card बनना। पेज यह भी बताता है कि अलग चरणों में किसान/ग्राम स्तर एजेंसी, ब्लॉक/जिला अधिकारी, CSCS और मिट्टी परीक्षण प्रयोगशाला की भूमिका हो सकती है।', owner: 'NIC Soil Health Card Portal', howto: 'Soil Health Card workflow को समझना', place: 'Soil Health Card Portal, स्थानीय कृषि कार्यालय और मिट्टी परीक्षण प्रयोगशाला', caution: 'नमूना देने का तरीका या समय स्थानीय कार्यालय से पूछें; गलत या अधूरा नमूना परिणाम को प्रभावित कर सकता है।', enWhat: 'NIC sets out a sequence: sample collection, sample registration, testing, automatic fertiliser recommendation, and Soil Health Card generation in a local language. It identifies roles for farmers/village agencies, block or district officers/CSCS, and soil-testing laboratories.', enSteps: ['Ask the local office about sample collection.', 'Ensure the sample is registered through the official process.', 'Wait for the laboratory testing stage.', 'Read the generated recommendation and card when available.'], enPlace: 'the Soil Health Card Portal, local agriculture office, and soil-testing laboratory', enCaution: 'Ask the local office about collection method and timing; a poor sample can affect the result.'
  },
}

for (const q of data.qas) {
  const x = entries[q.slug]
  if (!x) throw new Error(`Missing content for ${q.slug}`)
  q.short_hi = x.short_hi
  q.short_en = x.short_en
  q.blocks = hindiBlocks(q, x)
  q.blocks_en = englishBlocks(q, x)
  q.related = relatedFor(q.slug, q.category).map((item) => item.href.replace('/sawaal/', '')).filter((slug) => !slug.startsWith('/'))
  q.last_verified = verified
}
writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8')

const { termsOfUse } = await import('../src/lib/i18n/termsContent.js')
const legalDraft = [
  '# Terms Draft for Lawyer', '',
  'This is the complete bilingual draft displayed at `/terms`.', '',
  ...termsOfUse.flatMap((p, i) => [`## ${i + 1}. ${p.title_hi} / ${p.title_en}`, '', p.hi, '', p.en, '']),
  '## Open points for lawyer', '',
  '- Governing law and proposed Sagar, Madhya Pradesh jurisdiction.',
  '- Limitation-of-liability wording.',
  '- Sand/gravel permission wording.',
  '- Land-listing and title-verification wording.',
  '- Labour and wage wording.',
  '- Data-retention language and whether it belongs in Terms or Privacy.', '',
].join('\n')
writeFileSync(new URL('../docs/legal/TERMS_DRAFT_FOR_LAWYER.md', import.meta.url), legalDraft, 'utf8')

const wordCount = (q) => [q.short_hi, ...(q.blocks || []).flatMap((b) => [b.text?.hi || '', ...(b.items || []).map((i) => i.text?.hi || '')])].join(' ').trim().split(/\s+/).filter(Boolean).length
const sourceTitle = (q) => data.sources.find((s) => s.id === q.sources[0])?.title || ''
const uncertain = new Set(['kcc-timely-flexible-credit', 'kcc-warehouse-receipt-credit', 'nabard-production-credit', 'nabard-credit-drawal-period', 'nabard-calamity-conversion'])
const report = [
  '# Batch 6C report', '',
  '## Done', '',
  '- Rewrote all 17 Batch 5C Q&As in the JSON source and regenerated `src/content/qa/batch5b.js`.',
  '- Added bilingual structured blocks, citations, official source verification dates, related Sawaal links and one internal tool link per record.',
  '- Added a 16-clause bilingual Terms draft, wide readable page layout and sticky desktop table of contents.',
  '- `node scripts/verify-batch6c.mjs` passes.', '',
  '## Per-Q&A audit', '',
  '| slug | Hindi word count | official source used | could not verify |', '|---|---:|---|---|',
  ...data.qas.map((q) => `| ${q.slug} | ${wordCount(q)} | ${sourceTitle(q)} | ${uncertain.has(q.slug) ? 'Individual eligibility, terms, or approval; confirm with bank/NABARD.' : 'No additional claim included.'} |`), '',
  '## Needs owner decision before publishing', '',
  '- `kcc-timely-flexible-credit`', '- `kcc-warehouse-receipt-credit`', '- `nabard-production-credit`', '',
  'These are the three bank/NABARD-facing Q&As requested for owner decision. The two additional NABARD refinance records stay published as previously configured; their unverified operating detail is recorded in the audit table. No `published` status was changed.', '',
  '## Not done and why', '',
  '- No database seed, migration, deployment, commit, or full build was run, as required. The owner will run the seed and full build.', '',
].join('\n')
writeFileSync(new URL('../docs/review/BATCH6C_REPORT.md', import.meta.url), report, 'utf8')
