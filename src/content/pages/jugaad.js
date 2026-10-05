// /jugaad — Kissan Sahyog Jugaad / grassroots-innovation information page
// (Phase 9). Bilingual, authored as structured content so every number/date
// carries a citation (§0.2). This is an information page only: it offers NO
// help with patents or awards (§9.3) and makes no commitments. Hindi literals
// are allowed here because this is a data/content file.
export const jugaadPage = {
  slug: 'jugaad',
  title: {
    hi: 'जुगाड़ व ग्रामीण नवाचार — जानकारी गाइड | किसान सहयोग',
    en: 'Jugaad & Rural Innovation — Information Guide | Kissan Sahyog',
  },
  h1: {
    hi: 'जुगाड़ और ग्रामीण नवाचार: पूरी जानकारी गाइड',
    en: 'Jugaad and rural innovation: a complete information guide',
  },
  updated: '2026-10-06',
  blocks: [
    // 1. Summary (first block) ------------------------------------------------
    {
      type: 'summary',
      text: {
        hi: 'जुगाड़ यानी गाँव-देहात में कम खर्च में बनी जुगत और देसी नवाचार। यह पेज सिर्फ जानकारी के लिए है — यह बताता है कि नवाचार क्या है, कुछ प्रेरक उदाहरण, सरकारी व संस्थागत सहायता की जानकारी, आसान हिंदी में कानून व सुरक्षा गाइड, बनाने व खरीदने वालों के लिए सुरक्षा सूची, और किसान सहयोग पर जुगाड़ कैसे सूचीबद्ध करें।',
        en: 'Jugaad means low-cost rural improvisation and grassroots innovation. This page is for information only — it explains what innovation is, a few inspiring examples, information about government and institutional support, a plain-Hindi law and safety guide, a safety checklist for makers and buyers, and how to list a jugaad on Kissan Sahyog.',
      },
    },

    // 2. What is jugaad / rural innovation -----------------------------------
    {
      type: 'heading', level: 2,
      text: { hi: 'जुगाड़ / ग्रामीण नवाचार क्या है', en: 'What is jugaad / rural innovation' },
    },
    {
      type: 'paragraph',
      text: {
        hi: '"जुगाड़" हमारी गाँव-देहात की वह परंपरा है जिसमें किसान, कारीगर और आम लोग अपने रोज़मर्रा के काम की किसी मुश्किल को कम से कम खर्च में, आसपास उपलब्ध चीज़ों से हल कर लेते हैं। किसी पुराने पंप से पानी खींचने की तरकीब, खेत में छिड़काव का सस्ता तरीका, या किसी मशीन में छोटा-सा बदलाव — ये सब जुगाड़ की मिसालें हैं। जुगाड़ का असली मतलब है "कम में ज़्यादा": सीमित साधनों में समझदारी से काम निकालना।',
        en: '"Jugaad" is our rural tradition in which farmers, artisans and ordinary people solve an everyday problem at the lowest possible cost, using whatever is at hand. A trick to draw water from an old pump, a cheap way to spray a field, or a small modification to a machine — these are all examples of jugaad. The real meaning of jugaad is "more from less": using limited means wisely to get the job done.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'जुगाड़ की सबसे बड़ी खूबी यह है कि यह आम आदमी की सोच से निकलता है। इसमें न कोई किताबी नियम ज़रूरी है, न कोई बड़ा बजट। जो सामने की समस्या है, उसी को हल करने की धुन इंसान को नई-नई तरकीबें सुझाती है। यही वजह है कि गाँव-गाँव में छोटे-छोटे जुगाड़ हर रोज़ बनते रहते हैं — कहीं खेत में, कहीं डेयरी में, कहीं घर के आँगन में। इनमें से ज़्यादातर कभी किसी रिकॉर्ड में नहीं आते, पर उनका उपयोग उस परिवार या गाँव के लिए बहुत काम का होता है। जब हम इन्हें आदर के साथ देखते हैं, तो असल में हम अपनी ही मेहनत और समझदारी को आदर देते हैं।',
        en: 'The greatest strength of jugaad is that it springs from the common person\'s thinking. It needs no bookish rule and no big budget. The urge to solve the problem right in front prompts fresh tricks. That is why small jugaads are created every day in village after village — in a field, in a dairy, in a home courtyard. Most of them never make it into any record, yet their use is of great value to that family or village. When we view them with respect, we are really honouring our own effort and ingenuity.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'ग्रामीण नवाचार (rural innovation) जुगाड़ का ही बड़ा और व्यवस्थित रूप है। जब कोई देसी तरकीब एक बार के समाधान से आगे बढ़कर दोबारा-दोबारा काम आने लगे, उसे सुधारा जाए, जाँचा जाए और दूसरों तक पहुँचाया जाए, तो वह एक नवाचार बन जाती है। ऐसे नवाचार अक्सर किसी महँगी प्रयोगशाला से नहीं, बल्कि खेत, खलिहान और छोटी वर्कशॉप से निकलते हैं। इनमें ज़मीनी अनुभव और व्यावहारिक समझ छिपी होती है।',
        en: 'Rural innovation is simply the larger, more systematic form of jugaad. When a local trick grows beyond a one-time fix, is used again and again, improved, tested and shared with others, it becomes an innovation. Such innovations often come not from an expensive laboratory but from the field, the farmyard and small workshops. They carry real ground experience and practical understanding.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'हमारे देश में जुगाड़ की जड़ें बहुत गहरी हैं। जब पैसा कम हो, बाज़ार दूर हो, और सही औज़ार या पुर्ज़ा आसानी से न मिले, तब गाँव का किसान या कारीगर अपनी सूझबूझ से कोई रास्ता निकाल ही लेता है। कभी वह टूटे पंप को किसी और तरीके से चला लेता है, कभी बैलगाड़ी के पहिये से कोई नया काम ले लेता है, तो कभी बेकार पड़े डिब्बे और पाइप से सिंचाई का सस्ता इंतज़ाम कर लेता है। यही व्यावहारिक सोच पीढ़ी-दर-पीढ़ी आगे बढ़ती रहती है और धीरे-धीरे गाँव के ज्ञान का हिस्सा बन जाती है।',
        en: 'In our country the roots of jugaad run deep. When money is short, the market is far, and the right tool or part is hard to find, the village farmer or artisan finds a way through sheer ingenuity. Sometimes a broken pump is kept running by another method, sometimes a cart wheel is put to a new use, and sometimes cheap irrigation is arranged from discarded cans and pipes. This practical thinking passes from one generation to the next and slowly becomes part of the village\'s collective knowledge.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'जुगाड़ और नवाचार में एक बारीक फ़र्क है। जुगाड़ अक्सर उसी वक़्त की ज़रूरत का तुरंत हल होता है — जो काम चला दे, वही काफ़ी। लेकिन नवाचार तब बनता है जब उस हल को सोच-समझकर बेहतर बनाया जाए, उसकी कमियाँ दूर की जाएँ, उसे सुरक्षित बनाया जाए और उसे इस तरह ढाला जाए कि वह और लोगों के भी काम आ सके। इसलिए अच्छा जुगाड़ अगर सही दिशा में बढ़े, तो वह एक उपयोगी उत्पाद या छोटी-सी तकनीक बन सकता है। इस सफ़र में सबसे ज़रूरी है धैर्य, बार-बार आज़माना, और सुरक्षा का पूरा ध्यान रखना।',
        en: 'There is a subtle difference between jugaad and innovation. Jugaad is often an instant fix for a need of the moment — if it does the job, that is enough. But innovation happens when that fix is thoughtfully improved, its flaws removed, made safe, and shaped so that it can serve others too. So a good jugaad, if taken in the right direction, can become a useful product or a small technology. On this journey, patience, repeated trials and full attention to safety matter most.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'इस पेज का मकसद किसी को जल्दबाज़ी में कोई कदम उठाने के लिए उकसाना नहीं है। हम चाहते हैं कि गाँव के मेहनती और समझदार लोग यह जान सकें कि उनके आसपास कौन-कौन सी सरकारी और संस्थागत मदद मौजूद है, कौन-से कानून और सुरक्षा की बातें ध्यान में रखनी चाहिए, और अपनी बनाई चीज़ को वे ईमानदारी व सुरक्षा के साथ दूसरों तक कैसे पहुँचा सकते हैं। सही जानकारी हाथ में हो, तो फ़ैसले भी बेहतर होते हैं।',
        en: 'The purpose of this page is not to push anyone into a hasty step. We want the hardworking and thoughtful people of our villages to know what government and institutional help exists around them, which laws and safety points to keep in mind, and how they can share what they make with others honestly and safely. With the right information in hand, decisions turn out better.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'यह पेज किसी भी नवाचार की सच्चाई, गुणवत्ता, सुरक्षा या मुनाफ़े की गारंटी नहीं देता। यहाँ दी गई हर बात सामान्य जानकारी है। कोई भी कदम उठाने, कुछ बनाने, बेचने या खरीदने से पहले आप अपनी ओर से जाँच-पड़ताल ज़रूर करें और ज़रूरत हो तो किसी जानकार या विशेषज्ञ की सलाह लें।',
        en: 'This page does not guarantee the truth, quality, safety or profitability of any innovation. Everything here is general information. Before taking any step — making, selling or buying — please do your own checks and, if needed, consult a knowledgeable person or expert.',
      },
    },

    // 3. Inspiring examples (4 verified) -------------------------------------
    {
      type: 'heading', level: 2,
      text: { hi: 'प्रेरक उदाहरण', en: 'Inspiring examples' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'नीचे कुछ ऐसे ग्रामीण नवाचार हैं जिन्हें पहचान और सम्मान मिला है। इनका मकसद सिर्फ़ प्रेरणा देना है — यह बताना कि गाँव की मेहनत और समझदारी भी बड़ी पहचान पा सकती है।',
        en: 'Below are some rural innovations that have earned recognition and respect. Their purpose here is only to inspire — to show that rural effort and ingenuity can also win wide recognition.',
      },
    },
    {
      type: 'list',
      items: [
        { text: { hi: 'मिट्टी कूल (Mitti Cool) — मिट्टी से बना बिना बिजली वाला फ्रिज, जो फल-सब्ज़ी और दूध को कुछ समय ठंडा रखने में मदद करता है।', en: 'Mitti Cool — a clay refrigerator that works without electricity and helps keep fruit, vegetables and milk cool for a while.' }, cites: ['S-JUG-37'] },
        { text: { hi: 'साइकिल से चलने वाला छिड़काव यंत्र (bicycle sprayer), जिसे वर्ष 2005 का तीसरा राष्ट्रीय पुरस्कार (3rd National Award) मिला।', en: 'A bicycle-mounted sprayer, which received the 3rd National Award (2005).' }, cites: ['S-JUG-36'] },
        { text: { hi: 'बुलेट से चलने वाला हल "संती" (Santi) — भारतीय पेटेंट संख्या 205097 और अमेरिकी पेटेंट US 6854404B2।', en: 'The bullet-driven tiller "Santi" — Indian Patent No. 205097 and US Patent US 6854404B2.' }, cites: ['S-JUG-35'] },
        { text: { hi: 'कई तरह की कृषि मशीनें बनाने वाले नवाचारक को वर्ष 2012 का छठा राष्ट्रीय पुरस्कार (6th National Award) मिला; एक नवाचार का पेटेंट संख्या 194420 है।', en: 'An innovator of multiple agricultural machineries received the 6th National Award (2012); one innovation holds Patent No. 194420.' }, cites: ['S-JUG-38'] },
      ],
    },

    {
      type: 'paragraph',
      text: {
        hi: 'इन उदाहरणों से एक बात साफ़ है — पहचान और सम्मान किसी बड़ी डिग्री या महँगी प्रयोगशाला का मोहताज नहीं है। ज़मीन से जुड़ी समझ, लगातार कोशिश और लोगों की असली ज़रूरत को पहचानने की नज़र, ये तीनों मिलकर किसी देसी तरकीब को एक सराही जाने वाली चीज़ बना सकते हैं। फिर भी याद रहे कि हर नवाचार का सफ़र अलग होता है; जो किसी एक के लिए काम कर गया, ज़रूरी नहीं कि वह हर किसी के लिए वैसा ही नतीजा दे। इसलिए इन कहानियों को प्रेरणा की तरह लें, किसी वादे की तरह नहीं।',
        en: 'One thing is clear from these examples — recognition and respect do not depend on a big degree or an expensive laboratory. Ground-level understanding, continuous effort, and an eye for people\'s real needs, together, can turn a local trick into something widely appreciated. Still, remember that every innovation\'s journey is different; what worked for one need not give the same result for everyone. So take these stories as inspiration, not as a promise.',
      },
    },

    // 4. Available support (information only) ---------------------------------
    {
      type: 'heading', level: 2,
      text: { hi: 'उपलब्ध सहायता (सिर्फ जानकारी)', en: 'Available support (information only)' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'इन सेवाओं की जानकारी नीचे दी गई है। किसान सहयोग इनमें से किसी भी संस्था या योजना का हिस्सा नहीं है और न ही इनमें आवेदन, मंज़ूरी या धन दिलाने का कोई वादा करता है। सभी नियम, पात्रता और समय-सीमा सम्बंधित संस्था की आधिकारिक वेबसाइट पर स्वयं जाँच लें, क्योंकि ये बदल सकते हैं।',
        en: 'Information about these services is given below. Kissan Sahyog is not part of any of these institutions or schemes, nor does it promise any application, approval or funding. Please verify all rules, eligibility and deadlines yourself on the relevant institution\'s official website, as these may change.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'इन संस्थाओं और योजनाओं का मकसद अलग-अलग है। कुछ आपके नवाचार को दर्ज करने और पहचान दिलाने में मदद करती हैं, कुछ नमूना (प्रोटोटाइप) बनाने के लिए सहायता देती हैं, कुछ आपके काम की जाँच और परीक्षण में साथ देती हैं, और कुछ स्टार्टअप शुरू करने में सहारा बनती हैं। किसी भी योजना में जाने से पहले यह ज़रूर समझें कि वह किस चरण के लिए है और उसकी शर्तें क्या हैं। सही योजना सही समय पर चुनी जाए, तो मेहनत का फल अच्छा मिलता है। किसी भी तरह के "जल्दी पैसा दिलाने" या "गारंटीड मंज़ूरी" के दावे से सावधान रहें; असली सरकारी योजनाएँ अपनी तय प्रक्रिया से ही चलती हैं।',
        en: 'These institutions and schemes serve different purposes. Some help document your innovation and win it recognition, some give support to build a prototype, some help with checking and testing your work, and some support starting a start-up. Before entering any scheme, understand which stage it is meant for and what its conditions are. When the right scheme is chosen at the right time, hard work pays off well. Be wary of any claim of "quick money" or "guaranteed approval"; genuine government schemes run only through their set process.',
      },
    },
    {
      type: 'heading', level: 3,
      text: { hi: 'NIF-India और राष्ट्रीय द्विवार्षिक प्रतियोगिता', en: 'NIF-India and the National Biennial Competition' },
    },
    {
      type: 'list',
      items: [
        { text: { hi: 'राष्ट्रीय नवप्रवर्तन प्रतिष्ठान (National Innovation Foundation, NIF-India) विज्ञान एवं प्रौद्योगिकी विभाग (DST) का एक स्वायत्त संस्थान है, जिसकी स्थापना मार्च 2000 में हुई।', en: 'The National Innovation Foundation (NIF-India) is an autonomous institute of the Department of Science & Technology (DST), established in March 2000.' }, cites: ['S-JUG-01'] },
        { text: { hi: 'DST की वेबसाइट पर भी NIF को उसका स्वायत्त संस्थान बताया गया है।', en: 'The DST website also describes NIF as its autonomous institute.' }, cites: ['S-JUG-02'] },
        { text: { hi: 'NIF के नवाचार डेटाबेस में 139,584 नवाचार दर्ज हैं; यह "पूरी तरह एक सूचनात्मक वेबसाइट" है।', en: 'NIF\'s innovations database lists 139,584 innovations; it is "purely an informative website".' }, cites: ['S-JUG-05'] },
        { text: { hi: 'NIF की 15वीं राष्ट्रीय द्विवार्षिक प्रतियोगिता 31 मार्च 2027 तक खुली है।', en: 'NIF\'s 15th National Biennial Competition is open till 31 March 2027.' }, cites: ['S-JUG-03'] },
        { text: { hi: 'अपना विचार या नवाचार भेजने के लिए NIF के "submit idea" ऑनलाइन फ़ॉर्म का उपयोग किया जा सकता है।', en: 'To submit your idea or innovation, you can use NIF\'s "submit idea" online form.' }, cites: ['S-JUG-06'] },
      ],
    },
    {
      type: 'heading', level: 3,
      text: { hi: 'हनी बी नेटवर्क / SRISTI / GIAN', en: 'Honey Bee Network / SRISTI / GIAN' },
    },
    {
      type: 'list',
      items: [
        { text: { hi: 'हनी बी नेटवर्क, SRISTI और GIAN ज़मीनी नवाचार से जुड़े संगठन हैं। इनका मूल सिद्धांत है — रचनात्मक लोगों का सम्मान करना, उन्हें पहचानना और पुरस्कृत करना, तथा उनके बौद्धिक संपदा अधिकारों की रक्षा करना।', en: 'The Honey Bee Network, SRISTI and GIAN are grassroots-innovation organisations. Their core principle is to respect, recognize and reward creative people, and to protect their intellectual property rights.' }, cites: ['S-JUG-08'] },
        { text: { hi: 'एक ज़रूरी नियम यह है कि किसी भी जानकारी या नवाचार को दर्ज (document) करने से पहले उस ज्ञान-धारक की सहमति ली जाए।', en: 'An important rule is to obtain the knowledge-holder\'s consent before documenting any information or innovation.' }, cites: ['S-JUG-08'] },
        { text: { hi: 'SRISTI से भी संपर्क किया जा सकता है।', en: 'SRISTI can also be contacted.' }, cites: ['S-JUG-10'] },
      ],
    },
    {
      type: 'heading', level: 3,
      text: { hi: 'DST NIDHI-PRAYAS (प्रोटोटाइप सहायता)', en: 'DST NIDHI-PRAYAS (prototype support)' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'DST की NIDHI-PRAYAS योजना के तहत प्रोटोटाइप (नमूना) बनाने के लिए ₹10 लाख तक की सहायता दी जाती है।',
        en: 'Under DST\'s NIDHI-PRAYAS scheme, support of up to ₹10 lakh is given for building a prototype.',
      },
      cites: ['S-JUG-13'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'सूक्ष्म उद्यम नवाचार कोष (Micro Venture Innovation Fund, MVIF) बिना किसी ज़मानत (collateral) या गारंटर के सहायता देता है।',
        en: 'The Micro Venture Innovation Fund (MVIF) provides support without any collateral or guarantor.',
      },
      cites: ['S-JUG-14'],
    },
    {
      type: 'heading', level: 3,
      text: { hi: 'स्टार्टअप इंडिया सीड फंड', en: 'Startup India Seed Fund' },
    },
    {
      type: 'list',
      items: [
        { text: { hi: 'स्टार्टअप इंडिया सीड फंड योजना में प्रमाण-संकल्पना (PoC) या प्रोटोटाइप के लिए ₹20 लाख तक का अनुदान और ₹50 लाख तक का निवेश मिल सकता है।', en: 'Under the Startup India Seed Fund Scheme, a grant of up to ₹20 lakh (for PoC/prototype) and investment of up to ₹50 lakh may be available.' }, cites: ['S-JUG-16'] },
        { text: { hi: 'पात्रता के लिए स्टार्टअप 2 साल या उससे कम पुराना और DPIIT-मान्यता प्राप्त होना चाहिए।', en: 'To be eligible, the start-up must be 2 years old or less and DPIIT-recognised.' }, cites: ['S-JUG-17'] },
      ],
    },
    {
      type: 'heading', level: 3,
      text: { hi: 'मध्य प्रदेश स्टार्टअप नीति', en: 'MP Startup Policy' },
    },
    {
      type: 'list',
      items: [
        { text: { hi: 'मध्य प्रदेश स्टार्टअप नीति एवं क्रियान्वयन योजना 2025 (MP Startup Policy & Implementation Scheme 2025) राज्य में स्टार्टअप को बढ़ावा देने के लिए है।', en: 'The MP Startup Policy & Implementation Scheme 2025 is aimed at promoting start-ups in the state.' }, cites: ['S-JUG-19'] },
        { text: { hi: 'इसमें एकल-खिड़की (single-window) सहायता दी जाती है, जिसमें ₹5 लाख तक की पेटेंट सहायता भी शामिल है।', en: 'It offers single-window support, which also includes patent support of up to ₹5 lakh.' }, cites: ['S-JUG-20'] },
      ],
    },
    {
      type: 'heading', level: 3,
      text: { hi: 'CFMTTI, बुदनी (कृषि मशीन परीक्षण)', en: 'CFMTTI, Budni (farm-machinery testing)' },
    },
    {
      type: 'list',
      items: [
        { text: { hi: 'केंद्रीय कृषि मशीनरी प्रशिक्षण एवं परीक्षण संस्थान (CFMTTI), बुदनी (सीहोर, मध्य प्रदेश) एक सरकारी संस्थान है।', en: 'The Central Farm Machinery Training & Testing Institute (CFMTTI), Budni (Sehore, Madhya Pradesh) is a government institute.' }, cites: ['S-JUG-21'] },
        { text: { hi: 'यहाँ कृषि मशीनों की जाँच (testing) की सेवाएँ उपलब्ध हैं।', en: 'Farm-machinery testing services are available here.' }, cites: ['S-JUG-22'] },
      ],
    },

    // 5. Law & safety guide (plain Hindi) ------------------------------------
    {
      type: 'heading', level: 2,
      text: { hi: 'कानून व सुरक्षा गाइड (आसान हिंदी)', en: 'Law and safety guide (plain Hindi)' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'नीचे कुछ ज़रूरी कानूनी व सुरक्षा बातें आसान भाषा में बताई गई हैं। यह कानूनी सलाह नहीं है, सिर्फ़ सामान्य जानकारी है। अपने मामले के लिए किसी योग्य वकील या विशेषज्ञ से सलाह ज़रूर लें।',
        en: 'Below are some important legal and safety points in simple language. This is not legal advice, only general information. For your own case, do consult a qualified lawyer or expert.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'कानून की बातें सुनने में भारी लग सकती हैं, पर इन्हें जानना अपने ही फ़ायदे में है। एक तरफ़ ये बातें आपकी मेहनत और आपके हक़ की रक्षा करती हैं, और दूसरी तरफ़ ये यह भी तय करती हैं कि दूसरों की सुरक्षा और हक़ पर आँच न आए। जब आप कुछ बनाते या बेचते हैं, तो उसका असर सिर्फ़ आप तक सीमित नहीं रहता — उसका सीधा असर उस पर पड़ता है जो उसे इस्तेमाल करेगा। इसलिए नीचे दी गई हर बात को इत्मीनान से पढ़ें और सही समझें।',
        en: 'Legal matters may sound heavy, but knowing them is in your own interest. On one hand these points protect your effort and your rights, and on the other they ensure that the safety and rights of others are not harmed. When you make or sell something, its effect is not limited to you — it directly affects whoever will use it. So read each point below calmly and understand it well.',
      },
    },
    {
      type: 'heading', level: 3,
      text: { hi: 'पेटेंट और सार्वजनिक प्रदर्शन', en: 'Patents and public disclosure' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'पेटेंट कानून (Patents Act) में "आविष्कार" (invention) का मतलब एक नया उत्पाद या प्रक्रिया है जिसमें नवीनता (inventive step) हो और जो उद्योग में इस्तेमाल लायक हो।',
        en: 'Under the Patents Act, an "invention" means a new product or process involving an inventive step and capable of industrial use.',
      },
      cites: ['S-JUG-44'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'ध्यान रहे: किसी नवाचार को पेटेंट मिलने से पहले सार्वजनिक रूप से दिखा देना या बता देना उसकी पेटेंट-योग्यता (patentability) पर असर डाल सकता है। हालाँकि, Patents Act की धारा 31 एक अधिसूचित प्रदर्शनी (notified exhibition) में प्रदर्शन को सुरक्षा देती है — बशर्ते उसके बाद बारह महीने के भीतर पेटेंट आवेदन दाखिल कर दिया जाए। किसान सहयोग पेटेंट से जुड़ी कोई सहायता नहीं देता; यह सिर्फ़ सामान्य जानकारी है।',
        en: 'Note: disclosing an innovation publicly before it is patented can affect its patentability. However, section 31 of the Patents Act protects display at a notified exhibition — provided a patent application follows within twelve months. Kissan Sahyog provides no patent-related help; this is only general information.',
      },
      cites: ['S-JUG-45'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'डिज़ाइन और ट्रेडमार्क की मूल बातें: किसी वस्तु की बनावट या रूप-रंग की रक्षा के लिए "डिज़ाइन" का पंजीकरण किया जा सकता है, और किसी नाम, लोगो या ब्रांड की पहचान की रक्षा के लिए "ट्रेडमार्क" का। ये पेटेंट से अलग चीज़ें हैं। विस्तार और प्रक्रिया के लिए किसी जानकार से सलाह लें।',
        en: 'Design and trademark basics: a "design" registration can protect the shape or appearance of an article, and a "trademark" can protect the identity of a name, logo or brand. These are different from a patent. For details and the process, consult a knowledgeable person.',
      },
    },
    {
      type: 'heading', level: 3,
      text: { hi: 'खतरनाक मशीनों पर कानून', en: 'Law on dangerous machines' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'खतरनाक मशीन (विनियमन) अधिनियम, 1983 (Dangerous Machines (Regulation) Act, 1983) कुछ खतरनाक मशीनों के बनाने और बेचने पर नियम लगाता है। ऐसी मशीनें बनाते या बेचते समय इन नियमों का ध्यान रखें।',
        en: 'The Dangerous Machines (Regulation) Act, 1983 places rules on making and selling certain dangerous machines. Keep these rules in mind when making or selling such machines.',
      },
      cites: ['S-JUG-51'],
    },
    {
      type: 'heading', level: 3,
      text: { hi: 'उपभोक्ता संरक्षण', en: 'Consumer protection' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'उपभोक्ता संरक्षण अधिनियम, 2019 (Consumer Protection Act, 2019) के अनुसार "इलेक्ट्रॉनिक सेवा प्रदाता" में कोई भी ऑनलाइन बाज़ार (online marketplace) शामिल है, और उत्पाद-दायित्व (product liability) खराब/दोषपूर्ण उत्पादों पर लागू होता है। यानी अगर आप कुछ बनाकर बेचते हैं, तो उसकी गुणवत्ता और सुरक्षा की ज़िम्मेदारी भी आती है।',
        en: 'Under the Consumer Protection Act, 2019, an "electronic service provider" includes any online marketplace, and product liability applies to defective products. This means if you make and sell something, responsibility for its quality and safety also follows.',
      },
      cites: ['S-JUG-52'],
    },
    {
      type: 'heading', level: 3,
      text: { hi: 'सड़क पर चलने वाले जुगाड़ वाहन', en: 'Road-going jugaad vehicles' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'मोटर वाहन अधिनियम (Motor Vehicles Act) के तहत सुप्रीम कोर्ट ने RSRTC बनाम संतोष (2013) मामले में माना कि एक "जुगाड़" वाहन, धारा 2(28) के अनुसार एक मोटर वाहन है।',
        en: 'Under the Motor Vehicles Act, the Supreme Court in RSRTC v. Santosh (2013) held that a "jugaad" vehicle is a motor vehicle under section 2(28).',
      },
      cites: ['S-JUG-23'],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'इसके अलावा, RTO बनाम के. जयचंद्र (9 जनवरी 2019) मामले में सुप्रीम कोर्ट ने माना कि किसी वाहन को उसके निर्माता की तय बनावट (manufacturer\'s specification) से बदला नहीं जा सकता (धारा 52)। इन्हीं कारणों से किसान सहयोग पर सड़क पर चलने वाले जुगाड़ वाहन स्वीकार नहीं किए जाते।',
        en: 'Further, in RTO v. K. Jayachandra (9 January 2019) the Supreme Court held that a vehicle cannot be altered from the manufacturer\'s specification (section 52). For these reasons, road-going jugaad vehicles are not accepted on Kissan Sahyog.',
      },
      cites: ['S-JUG-24'],
    },
    {
      type: 'heading', level: 3,
      text: { hi: 'बिजली व मशीन सुरक्षा', en: 'Electrical and machine safety' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'बिजली से चलने वाले किसी भी जुगाड़ में सुरक्षा का विशेष ध्यान रखें — सही तार, अर्थिंग और फ्यूज़/MCB का उपयोग करें, और गीले हाथों या जगह पर बिजली के उपकरण न छुएँ। जानकारी के लिए: मशीनरी एवं विद्युत उपकरण सुरक्षा आदेश (OTR 2024) को टाल दिया गया था (S.O. 2579(E), 12 जून 2025)।',
        en: 'Take special care of safety in any electric-powered jugaad — use correct wiring, earthing and a fuse/MCB, and do not touch electrical equipment with wet hands or in wet places. For information: the Machinery & Electrical Equipment Safety order (OTR 2024) was deferred (S.O. 2579(E), 12 June 2025).',
      },
      cites: ['S-JUG-41'],
    },
    {
      type: 'heading', level: 3,
      text: { hi: 'ऑनलाइन मंच (प्लेटफॉर्म) के साथ कैसा बर्ताव होता है', en: 'How online platforms are treated' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'सूचना प्रौद्योगिकी अधिनियम (IT Act) की धारा 79 को सुप्रीम कोर्ट ने श्रेया सिंघल बनाम भारत संघ (24 मार्च 2015) मामले में सीमित (read down) किया — इसमें माना गया कि "वास्तविक जानकारी" (actual knowledge) का अर्थ है किसी अदालत का आदेश या सरकार की अधिसूचना। यानी किसान सहयोग जैसा मंच किसी सामग्री को तभी हटाने के लिए बाध्य होता है जब उसे अदालती आदेश या सरकारी अधिसूचना मिले।',
        en: 'Section 79 of the IT Act was read down by the Supreme Court in Shreya Singhal v. Union of India (24 March 2015) — it held that "actual knowledge" means a court order or a government notification. That is, a platform like Kissan Sahyog is obliged to remove content only when it receives a court order or a government notification.',
      },
      cites: ['S-JUG-26'],
    },

    // 6. Safety checklist for makers & buyers --------------------------------
    {
      type: 'heading', level: 2,
      text: { hi: 'बनाने वालों व खरीदारों के लिए सुरक्षा सूची', en: 'Safety checklist for makers and buyers' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'किसी भी जुगाड़ या देसी मशीन में सबसे पहली चीज़ सुरक्षा होनी चाहिए — न खुद को नुकसान, न किसी और को। नीचे दी गई सूची एक आसान याददाश्त की तरह है, ताकि बनाते और खरीदते समय कोई ज़रूरी बात छूट न जाए। यह सूची पूरी नहीं है; अपने काम की ज़रूरत के हिसाब से और भी सावधानियाँ जोड़ें, और कोई शक हो तो किसी जानकार से पूछ लें।',
        en: 'In any jugaad or local machine, safety must come first — no harm to yourself, no harm to anyone else. The checklist below is a simple reminder so that no important point is missed while making or buying. This list is not exhaustive; add further precautions as your work demands, and if in doubt, ask a knowledgeable person.',
      },
    },
    {
      type: 'checklist',
      title: { hi: 'बनाने वालों के लिए', en: 'For makers' },
      items: [
        { text: { hi: 'घूमने वाले पुर्ज़ों (बेल्ट, ब्लेड, गियर) पर गार्ड/ढक्कन लगाएँ ताकि हाथ-कपड़ा न फँसे।', en: 'Fit a guard/cover over rotating parts (belts, blades, gears) so hands or clothing cannot get caught.' } },
        { text: { hi: 'बिजली वाले हिस्से में सही तार, अर्थिंग और फ्यूज़/MCB ज़रूर लगाएँ।', en: 'In any electrical part, always use correct wiring, earthing and a fuse/MCB.' } },
        { text: { hi: 'तेज़ धार, गर्म सतह और नुकीले किनारों पर चेतावनी का निशान या ढक्कन रखें।', en: 'Mark or cover sharp edges, hot surfaces and pointed parts with a warning.' } },
        { text: { hi: 'इस्तेमाल का आसान तरीका और सावधानियाँ लिखकर या बताकर दें।', en: 'Provide simple usage instructions and precautions, written or explained.' } },
        { text: { hi: 'जो कुछ आप सचमुच जानते हों वही दावा करें; झूठा या बढ़ा-चढ़ा वादा न करें।', en: 'Claim only what you truly know; do not make false or exaggerated promises.' } },
      ],
    },
    {
      type: 'checklist',
      title: { hi: 'खरीदारों के लिए', en: 'For buyers' },
      items: [
        { text: { hi: 'खरीदने से पहले खुद जाँचें या किसी जानकार को दिखाएँ; चालू करके देखें।', en: 'Before buying, check it yourself or show it to a knowledgeable person; see it running.' } },
        { text: { hi: 'सुरक्षा गार्ड, स्विच और तारों की हालत ध्यान से देखें।', en: 'Carefully inspect safety guards, switches and the condition of wiring.' } },
        { text: { hi: 'बेचने वाले की पहचान और संपर्क की जानकारी स्वयं पक्की करें।', en: 'Verify the seller\'s identity and contact details yourself.' } },
        { text: { hi: 'कोई भी भुगतान सोच-समझकर करें; अग्रिम (एडवांस) देने में सावधानी रखें।', en: 'Make any payment thoughtfully; be careful about paying any advance.' } },
        { text: { hi: 'अगर कोई चीज़ असुरक्षित लगे तो न खरीदें और "शिकायत करें" का उपयोग करें।', en: 'If something seems unsafe, do not buy it and use the "Report" option.' } },
      ],
    },

    // 7. How to list a jugaad ------------------------------------------------
    {
      type: 'heading', level: 2,
      text: { hi: 'जुगाड़ कैसे सूचीबद्ध करें', en: 'How to list a jugaad' },
    },
    {
      type: 'list', ordered: true,
      items: [
        { text: { hi: '"नई लिस्टिंग डालें" पर जाएँ और श्रेणी में "जुगाड़ / ग्रामीण नवाचार" चुनें।', en: 'Go to "Post a listing" and choose the "Jugaad / Rural Innovation" category.' } },
        { text: { hi: 'अपने जुगाड़ का साफ़-सुथरा नाम, काम और उसकी खूबियाँ सच्चाई से लिखें।', en: 'Write a clear name, its use and its features honestly for your jugaad.' } },
        { text: { hi: 'अच्छी, असली तस्वीरें लगाएँ; बनावटी या किसी और की तस्वीर न लगाएँ।', en: 'Add good, genuine photos; do not use fake or someone else\'s photos.' } },
        { text: { hi: 'सुरक्षा से जुड़ी सावधानियाँ और सीमाएँ भी साफ़-साफ़ बताएँ।', en: 'Also clearly state the safety precautions and limitations.' } },
        { text: { hi: 'अपना सही संपर्क विवरण दें ताकि रुचि रखने वाले आप तक पहुँच सकें।', en: 'Give your correct contact details so interested people can reach you.' } },
        { text: { hi: 'ध्यान दें: सड़क पर चलने वाले जुगाड़ वाहन इस मंच पर स्वीकार नहीं किए जाते।', en: 'Note: road-going jugaad vehicles are not accepted on this platform.' } },
      ],
    },
    {
      type: 'paragraph',
      text: {
        hi: 'लिस्टिंग डालते समय सबसे बड़ी बात है सच्चाई। जो चीज़ जैसी है, उसे वैसा ही बताएँ — उसकी खूबियाँ भी और उसकी सीमाएँ भी। बढ़ा-चढ़ाकर दावा करने से शुरुआत में भले ही किसी का ध्यान खिंच जाए, पर आगे चलकर भरोसा टूटता है और शिकायत आती है। साफ़ भाषा, असली तस्वीरें और ईमानदार जानकारी से आपकी बनाई चीज़ पर लोगों का भरोसा बनता है, और यही भरोसा लंबे समय में सबसे बड़ी पूँजी है।',
        en: 'When posting a listing, honesty matters most. Describe a thing exactly as it is — its strengths as well as its limits. Exaggerated claims may draw attention at first, but later trust breaks and complaints follow. Clear language, genuine photos and honest information build people\'s trust in what you make, and that trust is the greatest asset in the long run.',
      },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'किसान सहयोग एक मुफ़्त सूचना मंच (मध्यस्थ) है — हम किसी लेन-देन, भुगतान या भाव तय करने में शामिल नहीं होते। किसी भी सौदे की ज़िम्मेदारी बनाने और खरीदने वाले की अपनी होती है। किसी भी तरह की धोखाधड़ी, असुरक्षित सामान या गलत जानकारी दिखे तो हर पेज पर मौजूद "शिकायत करें" का उपयोग करें, ताकि हम ज़रूरी कदम उठा सकें।',
        en: 'Kissan Sahyog is a free information platform (intermediary) — we are not part of any transaction, payment or price-setting. Responsibility for any deal rests with the maker and the buyer themselves. If you see any fraud, unsafe goods or wrong information, use the "Report" option available on every page so that we can take the necessary steps.',
      },
    },

    // 8. How Kissan Sahyog may try to help (EXACT soft text, no cite) --------
    {
      type: 'heading', level: 2,
      text: { hi: 'किसान सहयोग कैसे मदद करने की कोशिश करेगा', en: 'How Kissan Sahyog may try to help' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'हम कोशिश करेंगे कि अच्छे नवाचारों को इंजीनियरिंग कॉलेजों, पॉलिटेक्निक, ITI, मेडिकल व फार्मा क्षेत्र और कंपनियों के सामने प्रस्तुत/प्रस्तावित करें; रुचि हो तो हमसे hello@kissansahyog.com पर संपर्क करें।',
        en: 'We will try to present/propose good innovations to engineering colleges, polytechnics, ITIs, the medical and pharma sector, and companies; if interested, contact us at hello@kissansahyog.com.',
      },
    },

    {
      type: 'heading', level: 2,
      text: { hi: 'अक्सर पूछे जाने वाले सवाल', en: 'Frequently asked questions' },
    },
    {
      type: 'paragraph',
      text: {
        hi: 'नीचे कुछ आम सवालों के जवाब दिए गए हैं। अगर आपका सवाल यहाँ न मिले, तो आप हमसे hello@kissansahyog.com पर संपर्क कर सकते हैं। ध्यान रहे, ये जवाब सामान्य जानकारी हैं और इन्हें कानूनी या पक्की सलाह की तरह न लें; अपने मामले की जाँच स्वयं या किसी जानकार से करा लें।',
        en: 'Answers to some common questions are given below. If you do not find your question here, you can contact us at hello@kissansahyog.com. Please note these answers are general information and should not be taken as legal or definitive advice; verify your own case yourself or with a knowledgeable person.',
      },
    },
    // 9. FAQ (≥15) -----------------------------------------------------------
    {
      type: 'faq',
      faqs: [
        {
          q: { hi: 'जुगाड़ का मतलब क्या है?', en: 'What does jugaad mean?' },
          a: { hi: 'जुगाड़ गाँव-देहात की वह तरकीब है जिसमें कम खर्च में, आसपास की चीज़ों से किसी मुश्किल का हल निकाला जाता है। यह "कम में ज़्यादा" की सोच है।', en: 'Jugaad is the rural knack of solving a problem at low cost using whatever is at hand — a "more from less" mindset.' },
        },
        {
          q: { hi: 'क्या यह पेज मुझे पेटेंट या पुरस्कार दिला सकता है?', en: 'Can this page get me a patent or an award?' },
          a: { hi: 'नहीं। यह सिर्फ़ जानकारी का पेज है। हम पेटेंट या पुरस्कार दिलाने में कोई सहायता या वादा नहीं करते। पेटेंट के लिए किसी योग्य विशेषज्ञ से सलाह लें।', en: 'No. This is only an information page. We provide no help or promise regarding patents or awards. For a patent, consult a qualified expert.' },
        },
        {
          q: { hi: 'NIF क्या है और वह कब बनी?', en: 'What is NIF and when was it set up?' },
          a: { hi: 'राष्ट्रीय नवप्रवर्तन प्रतिष्ठान (NIF-India) विज्ञान एवं प्रौद्योगिकी विभाग (DST) का एक स्वायत्त संस्थान है, जिसकी स्थापना मार्च 2000 में हुई।', en: 'The National Innovation Foundation (NIF-India) is an autonomous institute of the DST, established in March 2000.' }, cites: ['S-JUG-01'],
        },
        {
          q: { hi: 'NIF के डेटाबेस में कितने नवाचार हैं?', en: 'How many innovations are in NIF\'s database?' },
          a: { hi: 'NIF के नवाचार डेटाबेस में 139,584 नवाचार दर्ज हैं; यह "पूरी तरह एक सूचनात्मक वेबसाइट" है।', en: 'NIF\'s innovations database lists 139,584 innovations; it is "purely an informative website".' }, cites: ['S-JUG-05'],
        },
        {
          q: { hi: 'NIF की द्विवार्षिक प्रतियोगिता कब तक खुली है?', en: 'Until when is NIF\'s biennial competition open?' },
          a: { hi: 'NIF की 15वीं राष्ट्रीय द्विवार्षिक प्रतियोगिता 31 मार्च 2027 तक खुली है। विचार NIF के ऑनलाइन फ़ॉर्म से भेजा जा सकता है।', en: 'NIF\'s 15th National Biennial Competition is open till 31 March 2027. Ideas can be submitted via NIF\'s online form.' }, cites: ['S-JUG-03', 'S-JUG-06'],
        },
        {
          q: { hi: 'NIDHI-PRAYAS में कितनी सहायता मिलती है?', en: 'How much support does NIDHI-PRAYAS give?' },
          a: { hi: 'DST की NIDHI-PRAYAS योजना में प्रोटोटाइप बनाने के लिए ₹10 लाख तक की सहायता दी जाती है।', en: 'DST\'s NIDHI-PRAYAS scheme gives support of up to ₹10 lakh for building a prototype.' }, cites: ['S-JUG-13'],
        },
        {
          q: { hi: 'क्या MVIF के लिए ज़मानत चाहिए?', en: 'Does MVIF require collateral?' },
          a: { hi: 'नहीं। सूक्ष्म उद्यम नवाचार कोष (MVIF) बिना किसी ज़मानत या गारंटर के सहायता देता है।', en: 'No. The Micro Venture Innovation Fund (MVIF) provides support without any collateral or guarantor.' }, cites: ['S-JUG-14'],
        },
        {
          q: { hi: 'स्टार्टअप इंडिया सीड फंड में कितना पैसा मिल सकता है?', en: 'How much can the Startup India Seed Fund give?' },
          a: { hi: 'इसमें PoC/प्रोटोटाइप के लिए ₹20 लाख तक का अनुदान और ₹50 लाख तक का निवेश मिल सकता है।', en: 'It can provide a grant of up to ₹20 lakh for PoC/prototype and investment of up to ₹50 lakh.' }, cites: ['S-JUG-16'],
        },
        {
          q: { hi: 'स्टार्टअप इंडिया सीड फंड के लिए पात्रता क्या है?', en: 'What is the eligibility for the Startup India Seed Fund?' },
          a: { hi: 'स्टार्टअप 2 साल या उससे कम पुराना और DPIIT-मान्यता प्राप्त होना चाहिए।', en: 'The start-up must be 2 years old or less and DPIIT-recognised.' }, cites: ['S-JUG-17'],
        },
        {
          q: { hi: 'मध्य प्रदेश में स्टार्टअप के लिए क्या सहायता है?', en: 'What support is there for start-ups in Madhya Pradesh?' },
          a: { hi: 'MP स्टार्टअप नीति एवं क्रियान्वयन योजना 2025 में एकल-खिड़की सहायता दी जाती है, जिसमें ₹5 लाख तक की पेटेंट सहायता भी शामिल है।', en: 'The MP Startup Policy & Implementation Scheme 2025 offers single-window support, including patent support of up to ₹5 lakh.' }, cites: ['S-JUG-19', 'S-JUG-20'],
        },
        {
          q: { hi: 'अपनी कृषि मशीन की जाँच कहाँ करा सकता हूँ?', en: 'Where can I get my farm machine tested?' },
          a: { hi: 'केंद्रीय कृषि मशीनरी प्रशिक्षण एवं परीक्षण संस्थान (CFMTTI), बुदनी (सीहोर, मध्य प्रदेश) में कृषि मशीनों की जाँच की सेवाएँ उपलब्ध हैं।', en: 'The Central Farm Machinery Training & Testing Institute (CFMTTI), Budni (Sehore, MP) offers farm-machinery testing services.' }, cites: ['S-JUG-21', 'S-JUG-22'],
        },
        {
          q: { hi: 'अपना नवाचार दिखाने से पहले क्या ध्यान रखूँ?', en: 'What should I keep in mind before showing my innovation?' },
          a: { hi: 'किसी नवाचार को सार्वजनिक रूप से दिखाने से उसकी पेटेंट-योग्यता पर असर पड़ सकता है। धारा 31 किसी अधिसूचित प्रदर्शनी में प्रदर्शन को सुरक्षा देती है, बशर्ते बारह महीने के भीतर पेटेंट आवेदन कर दिया जाए।', en: 'Showing an innovation publicly can affect its patentability. Section 31 protects display at a notified exhibition, provided a patent application follows within twelve months.' }, cites: ['S-JUG-45'],
        },
        {
          q: { hi: 'क्या किसी का नवाचार बिना पूछे दर्ज कर सकते हैं?', en: 'Can someone\'s innovation be documented without asking?' },
          a: { hi: 'नहीं। हनी बी नेटवर्क का सिद्धांत है कि रचनात्मक लोगों का सम्मान और उनके बौद्धिक संपदा अधिकारों की रक्षा हो, और दर्ज करने से पहले ज्ञान-धारक की सहमति ली जाए।', en: 'No. The Honey Bee Network\'s principle is to respect creative people and protect their IP, and to get the knowledge-holder\'s consent before documentation.' }, cites: ['S-JUG-08'],
        },
        {
          q: { hi: 'क्या मैं सड़क पर चलने वाला जुगाड़ वाहन यहाँ बेच सकता हूँ?', en: 'Can I sell a road-going jugaad vehicle here?' },
          a: { hi: 'नहीं। सुप्रीम कोर्ट ने माना है कि जुगाड़ एक मोटर वाहन है (RSRTC बनाम संतोष, 2013) और वाहन को निर्माता की बनावट से बदला नहीं जा सकता (RTO बनाम के. जयचंद्र, 9 जनवरी 2019)। इसलिए ऐसे वाहन इस मंच पर स्वीकार नहीं किए जाते।', en: 'No. The Supreme Court held that a jugaad is a motor vehicle (RSRTC v. Santosh, 2013) and a vehicle cannot be altered from the manufacturer\'s specification (RTO v. K. Jayachandra, 9 January 2019). Such vehicles are therefore not accepted on this platform.' }, cites: ['S-JUG-23', 'S-JUG-24'],
        },
        {
          q: { hi: 'अगर मैं कुछ बनाकर बेचूँ तो ज़िम्मेदारी किसकी?', en: 'If I make and sell something, whose responsibility is it?' },
          a: { hi: 'उपभोक्ता संरक्षण अधिनियम, 2019 के अनुसार उत्पाद-दायित्व खराब/दोषपूर्ण उत्पादों पर लागू होता है, और "इलेक्ट्रॉनिक सेवा प्रदाता" में कोई भी ऑनलाइन बाज़ार शामिल है। यानी गुणवत्ता और सुरक्षा की ज़िम्मेदारी बनाने-बेचने वाले की है।', en: 'Under the Consumer Protection Act, 2019, product liability applies to defective products, and an "electronic service provider" includes any online marketplace. So responsibility for quality and safety lies with the maker/seller.' }, cites: ['S-JUG-52'],
        },
        {
          q: { hi: 'खतरनाक मशीन बनाने-बेचने पर कोई कानून है?', en: 'Is there a law on making/selling dangerous machines?' },
          a: { hi: 'हाँ, खतरनाक मशीन (विनियमन) अधिनियम, 1983 कुछ खतरनाक मशीनों पर नियम लगाता है। ऐसी मशीनों के साथ इन नियमों का ध्यान रखें।', en: 'Yes, the Dangerous Machines (Regulation) Act, 1983 places rules on certain dangerous machines. Keep these in mind with such machines.' }, cites: ['S-JUG-51'],
        },
        {
          q: { hi: 'किसान सहयोग किसी सामग्री को कब हटाता है?', en: 'When does Kissan Sahyog remove content?' },
          a: { hi: 'सुप्रीम कोर्ट ने श्रेया सिंघल बनाम भारत संघ (24 मार्च 2015) में IT अधिनियम की धारा 79 को सीमित किया — "वास्तविक जानकारी" का अर्थ है अदालती आदेश या सरकारी अधिसूचना। ऐसा मिलने पर ही मंच हटाने को बाध्य होता है।', en: 'In Shreya Singhal v. Union of India (24 March 2015) the Supreme Court read down section 79 of the IT Act — "actual knowledge" means a court order or government notification. Only then is the platform obliged to remove content.' }, cites: ['S-JUG-26'],
        },
        {
          q: { hi: 'क्या किसान सहयोग इस जानकारी की गारंटी देता है?', en: 'Does Kissan Sahyog guarantee this information?' },
          a: { hi: 'नहीं। यह सामान्य जानकारी है, कानूनी सलाह नहीं। योजनाओं के नियम और समय-सीमा बदल सकती हैं; कृपया आधिकारिक वेबसाइट पर स्वयं जाँच लें।', en: 'No. This is general information, not legal advice. Scheme rules and deadlines can change; please verify yourself on the official website.' },
        },
      ],
    },

    // Closing disclaimers ----------------------------------------------------
    {
      type: 'paragraph',
      text: {
        hi: 'अस्वीकरण: इस पेज की सभी बातें केवल सामान्य जानकारी के लिए हैं — यह कानूनी, वित्तीय या तकनीकी सलाह नहीं है। कोई भी निर्णय लेने से पहले सम्बंधित संस्था की आधिकारिक वेबसाइट पर जानकारी स्वयं जाँचें और ज़रूरत हो तो किसी योग्य विशेषज्ञ या वकील से सलाह लें। योजनाओं के नियम, पात्रता और समय-सीमा समय-समय पर बदल सकते हैं, इसलिए उपयोग से पहले नवीनतम जानकारी ज़रूर देख लें। सुरक्षा से कभी समझौता न करें — अपनी और दूसरों की सुरक्षा को हमेशा पहले रखें। किसान सहयोग एक मुफ़्त सूचना मंच है और यहाँ दी गई किसी भी जानकारी, योजना या नवाचार की सटीकता, उपलब्धता या परिणाम की गारंटी नहीं देता।',
        en: 'Disclaimer: everything on this page is for general information only — it is not legal, financial or technical advice. Before making any decision, verify the information yourself on the relevant institution\'s official website and, if needed, consult a qualified expert or lawyer. Kissan Sahyog is a free information platform and does not guarantee the accuracy, availability or outcome of any information, scheme or innovation given here.',
      },
    },
  ],
}

export default jugaadPage
