// Batch 19 - /pashupalan/pashu-kisan-credit-card : KCC for animal husbandry and dairy (FACTS D).
export default {
  slug: 'pashu-kisan-credit-card',
  path: '/pashupalan/pashu-kisan-credit-card',
  status: 'open',
  asOf: '2026-11-05',
  seo: {
    title: { hi: 'पशुपालन KCC मध्य प्रदेश — पशुपालकों के लिए किसान क्रेडिट कार्ड', en: 'Animal husbandry KCC in Madhya Pradesh — Kisan Credit Card for cattle keepers' },
    description: { hi: 'पशुपालक और डेयरी किसान किसान क्रेडिट कार्ड कैसे बनवाएँ: पात्र कौन, सीमा, आवेदन के चरण, दस्तावेज़ और आम ग़लतियाँ — सरकारी पुस्तिका के अनुसार।', en: 'How cattle keepers and dairy farmers can get a Kisan Credit Card: who can apply, limits, application steps, documents and common mistakes — as the government leaflet states.' },
  },
  h1: { hi: 'पशुपालन के लिए किसान क्रेडिट कार्ड (KCC)', en: 'Kisan Credit Card (KCC) for animal husbandry' },
  answer: {
    hi: 'पशुपालक और डेयरी किसान चारे, दवा और रोज़ के ख़र्च के लिए पशुपालन KCC के ज़रिए बैंक से कर्ज़ ले सकते हैं। पशुपालन विभाग की पुस्तिका (2023) के अनुसार बिना गारंटी ₹1.6 लाख तक की सीमा है और दूध कंपनी से जुड़े होने पर ₹3 लाख तक; सीमा बदली भी है, इसलिए बैंक से पुष्टि करें।',
    en: 'Cattle keepers and dairy farmers can take a bank loan through an animal husbandry KCC for feed, medicines and day-to-day costs. According to the department leaflet (2023), the limit without collateral is up to Rs 1.6 lakh, and up to Rs 3 lakh when tied to a milk processor; limits have changed since, so confirm with the bank.',
    f: ['F-D1', 'F-D2'],
  },
  sections: [
    {
      id: 'who', kind: 'ul',
      h: { hi: 'किसके लिए', en: 'Who it is for' },
      items: [
        { hi: 'पशुपालन विभाग की पुस्तिका के अनुसार (2023, सारांश के माध्यम से पढ़ी): डेयरी किसान — अकेले, संयुक्त उधारकर्ता, जेएलजी, स्वयं सहायता समूह और किरायेदार किसान — जिनके पास अपना, किराए का या पट्टे का शेड है।', en: 'According to the department leaflet (2023, read through a summary): dairy farmers — individuals, joint borrowers, JLGs, self-help groups and tenant farmers — who have their own, rented or leased shed.', f: ['F-D1'] },
        { hi: 'एक अन्य जानकारी वेबसाइट के अनुसार मध्य प्रदेश के पशुपालक/डेयरी किसान और सहकारी समिति के सदस्य भी आवेदन कर सकते हैं (सरकारी पुष्टि बाकी)।', en: 'According to another information website, cattle keepers / dairy farmers of Madhya Pradesh and members of cooperative societies can also apply (government confirmation pending).', f: ['F-D3'] },
      ],
    },
    {
      id: 'limits', kind: 'ul',
      h: { hi: 'सीमा और ब्याज', en: 'Limits and interest' },
      items: [
        { hi: 'पुस्तिका (2023) के अनुसार: बिना गारंटी (कोलैटरल) ₹1.6 लाख तक; दूध प्रसंस्करण कंपनी/संघ से जुड़ाव (टाई-अप) होने पर ₹3 लाख तक।', en: 'According to the leaflet (2023): up to Rs 1.6 lakh without collateral; up to Rs 3 lakh with a tie-up with a milk processor / union.', f: ['F-D1'] },
        { hi: 'पुस्तिका के अनुसार ब्याज में छूट (इंटरेस्ट सबवेंशन) सिर्फ़ पशुपालन-डेयरी-मत्स्य KCC पर है और ₹2 लाख तक के कर्ज़ पर लागू होती है।', en: 'According to the leaflet, interest subvention applies only to the animal husbandry-dairy-fisheries KCC and for loans up to Rs 2 lakh.', f: ['F-D1'] },
        { hi: 'बाद की जानकारी: फरवरी 2025 के एक सरकारी संसद जवाब के अनुसार (इसका सटीक लिंक हम सत्यापित नहीं कर सके), आरबीआई के 6 दिसंबर 2024 के निर्देशों के तहत पशुपालक किसान ₹2 लाख तक का कर्ज़ बिना गारंटी ले सकते हैं।', en: 'Later information: according to a February 2025 government reply in Parliament (we could not verify its exact link), under RBI guidelines of 6 December 2024 animal husbandry farmers can get loans up to Rs 2 lakh without collateral.', f: ['F-D2'] },
        { hi: 'इसलिए सीमा के आँकड़े अलग-अलग तारीख़ों के हैं। असली सीमा आपका बैंक बताएगा। ब्याज दर हमें पुस्तिका या सारांश में नहीं मिली, इसलिए नहीं लिख रहे।', en: 'The limit figures are therefore from different dates. Your bank will tell you the real limit. We did not find an interest rate in the leaflet or summary, so we do not state one.', f: ['F-D1', 'F-D2'] },
      ],
    },
    {
      id: 'steps', kind: 'ol',
      h: { hi: 'आवेदन के चरण', en: 'Application steps' },
      items: [
        { hi: 'अपने उस बैंक की शाखा में जाएँ जहाँ आपका खाता है (या सहकारी बैंक/समिति में) और "पशुपालन KCC" माँगें। सामान्यतः आवेदन इसी तरह बैंक में होता है।', en: 'Go to the branch of the bank where you hold your account (or a cooperative bank / society) and ask for an "animal husbandry KCC". Applications are generally made at the bank this way.', f: ['GEN'] },
        { hi: 'आवेदन फ़ॉर्म भरें और पहचान पत्र, फ़ोटो तथा पशुओं की जानकारी जमा करें — सूची बैंक देगा।', en: 'Fill the application form and submit an identity card, photograph and details of your animals — the bank will give the list.', f: ['F-D1'] },
        { hi: 'अगर आप किसी दूध समिति/संघ को दूध देते हैं, तो बैंक को बताएँ — टाई-अप से सीमा बढ़ सकती है।', en: 'If you supply milk to a society / union, tell the bank — a tie-up can raise the limit.', f: ['F-D1'] },
        { hi: 'बैंक जाँच के बाद कार्ड जारी करता है। पुस्तिका के अनुसार बैंक को पूरा आवेदन मिलने के बाद तय समय में कार्ड देना होता है; समय बैंक से पूछ लें।', en: 'The bank issues the card after verification. According to the leaflet, the bank must issue it within a set time after a complete application; ask the bank for the time.', f: ['F-D1'] },
        { hi: 'एक अन्य जानकारी वेबसाइट बताती है कि मध्य प्रदेश में समग्र पोर्टल से ऑनलाइन आवेदन की सुविधा भी बताई गई है (samast.mponline.gov.in); शुल्क और चरण हम सत्यापित नहीं कर सके, इसलिए पोर्टल पर ख़ुद देखें।', en: 'Another information website says an online application route via the Samast portal exists in Madhya Pradesh (samast.mponline.gov.in); we could not verify the fee and steps, so check the portal yourself.', f: ['F-D3'] },
      ],
    },
    {
      id: 'docs', kind: 'ul',
      h: { hi: 'दस्तावेज़', en: 'Documents' },
      items: [
        { hi: 'पुस्तिका के अनुसार: पहचान पत्र, फ़ोटो और आवेदन फ़ॉर्म।', en: 'According to the leaflet: identity proof, photograph and the application form.', f: ['F-D1'] },
        { hi: 'सामान्य तैयारी (शर्त नहीं): निवास का प्रमाण, बैंक खाते की जानकारी, ज़मीन के कागज़ अगर हों, शेड और पशुओं की गिनती का कागज़।', en: 'General preparation (not a condition): proof of residence, bank account details, land papers if you have any, a note of your shed and animal count.', f: ['GEN'] },
      ],
    },
    {
      id: 'mistakes', kind: 'ul',
      h: { hi: 'आम ग़लतियाँ', en: 'Common mistakes' },
      items: [
        { hi: 'KCC को ऐसा पैसा समझ लेना जो लौटाना नहीं है। यह कर्ज़ है और चुकाना पड़ता है।', en: 'Thinking KCC is money you never have to give back. It is a loan and must be repaid.', f: ['GEN'] },
        { hi: 'पुरानी सीमा (₹1.6 लाख) को आज की पक्की सीमा मान लेना।', en: 'Treating the older limit (Rs 1.6 lakh) as today’s fixed limit.', f: ['F-D1', 'F-D2'] },
        { hi: 'आवेदन के लिए किसी एजेंट को अलग से पैसे देना।', en: 'Paying an agent separately for the application.', f: ['GEN'] },
        { hi: 'कर्ज़ का इस्तेमाल उसी काम में न करके दूसरे ख़र्च में कर देना।', en: 'Using the loan for other expenses instead of the purpose it was taken for.', f: ['GEN'] },
      ],
    },
    {
      id: 'ask', kind: 'ul',
      h: { hi: 'बैंक में ये सवाल पूछें', en: 'Questions to ask at the bank' },
      items: [
        { hi: 'पशुपालन KCC की मेरे लिए मौजूदा सीमा कितनी होगी और वह किस आधार पर तय होती है?', en: 'What will my current limit on the animal husbandry KCC be, and on what basis is it fixed?', f: ['GEN'] },
        { hi: 'ब्याज की दर क्या है, और ब्याज में छूट मेरे कर्ज़ पर लागू होगी या नहीं?', en: 'What is the interest rate, and will the interest concession apply to my loan?', f: ['GEN'] },
        { hi: 'कर्ज़ चुकाने की अवधि और भुगतान का तरीका क्या है — एक साथ या किस्तों में?', en: 'What is the repayment period and method — in one go or in instalments?', f: ['GEN'] },
        { hi: 'कोई शुल्क, बीमा या प्रोसेसिंग ख़र्च लगेगा या नहीं, और उसकी रसीद मिलेगी या नहीं?', en: 'Will there be any charge, insurance or processing cost, and will I get a receipt for it?', f: ['GEN'] },
        { hi: 'अगर मैं दूध समिति या संघ को दूध देता/देती हूँ तो क्या मेरी सीमा बढ़ सकती है?', en: 'If I supply milk to a society or union, can my limit go up?', f: ['GEN'] },
      ],
    },
    {
      id: 'use', kind: 'ul',
      h: { hi: 'कार्ड का समझदारी से इस्तेमाल', en: 'Using the card sensibly' },
      items: [
        { hi: 'उतना ही कर्ज़ निकालें जितनी ज़रूरत हो। सीमा पूरी होने का मतलब पूरा पैसा निकालना नहीं है।', en: 'Draw only as much as you need. A limit being available does not mean you should draw all of it.', f: ['GEN'] },
        { hi: 'चारे, दवा और रोज़ के ख़र्च के बिल संभालकर रखें, ताकि हिसाब साफ़ रहे।', en: 'Keep the bills for fodder, medicines and daily costs so your accounts stay clear.', f: ['GEN'] },
        { hi: 'दूध बेचने की कमाई आने पर कर्ज़ चुकाने की तारीख़ याद रखें। देर से चुकाने पर आगे कर्ज़ मिलना मुश्किल हो सकता है।', en: 'When milk sale income comes, remember the repayment date. Paying late can make it harder to borrow later.', f: ['GEN'] },
        { hi: 'कार्ड, पिन या ओटीपी किसी को न दें।', en: 'Do not share your card, PIN or OTP with anyone.', f: ['GEN'] },
      ],
    },
  ],
  faqs: [
    { q: { hi: 'पशुपालन KCC क्या है?', en: 'What is an animal husbandry KCC?' }, a: { hi: 'पशुपालकों और डेयरी किसानों के लिए बैंक का कर्ज़-कार्ड, जिससे चारे, दवा और रोज़ के ख़र्च के लिए पैसा लिया जा सकता है। यह कर्ज़ है।', en: 'A bank credit card for cattle keepers and dairy farmers, from which money can be drawn for feed, medicines and daily costs. It is a loan.' }, f: ['F-D1'] },
    { q: { hi: 'कितना कर्ज़ मिल सकता है?', en: 'How much loan can I get?' }, a: { hi: 'पुस्तिका (2023) में बिना गारंटी ₹1.6 लाख और दूध कंपनी से जुड़ाव पर ₹3 लाख तक लिखा है; 2025 के संसद जवाब में ₹2 लाख तक बिना गारंटी। बैंक से पुष्टि करें।', en: 'The leaflet (2023) says Rs 1.6 lakh without collateral and up to Rs 3 lakh with a milk-company tie-up; a 2025 reply in Parliament says up to Rs 2 lakh without collateral. Confirm with the bank.' }, f: ['F-D1', 'F-D2'] },
    { q: { hi: 'क्या ब्याज में छूट मिलती है?', en: 'Is there an interest concession?' }, a: { hi: 'पुस्तिका के अनुसार पशुपालन-डेयरी-मत्स्य KCC पर ₹2 लाख तक के कर्ज़ पर ब्याज में छूट का प्रावधान है। ब्याज दर हम नहीं बता रहे; बैंक से पूछें।', en: 'According to the leaflet there is an interest subvention on the animal husbandry-dairy-fisheries KCC for loans up to Rs 2 lakh. We do not state a rate; ask the bank.' }, f: ['F-D1'] },
    { q: { hi: 'आवेदन कहाँ करें?', en: 'Where do I apply?' }, a: { hi: 'सामान्यतः अपने बैंक की शाखा या सहकारी बैंक/समिति में। ऑनलाइन का रास्ता एक जानकारी वेबसाइट बताती है; उसे पोर्टल पर ख़ुद जाँचें।', en: 'Generally at your bank branch or a cooperative bank / society. One information website mentions an online route; check it yourself on the portal.' }, f: ['GEN', 'F-D3'] },
    { q: { hi: 'कौन से कागज़ चाहिए?', en: 'Which papers are needed?' }, a: { hi: 'पुस्तिका के अनुसार पहचान पत्र, फ़ोटो और आवेदन फ़ॉर्म। बैंक और कागज़ माँग सकता है।', en: 'According to the leaflet: identity proof, photograph and application form. The bank may ask for more.' }, f: ['F-D1'] },
    { q: { hi: 'क्या बटाई/किराये पर पशु पालने वाला किसान आवेदन कर सकता है?', en: 'Can a tenant farmer apply?' }, a: { hi: 'पुस्तिका में किरायेदार किसान और अपना, किराए या पट्टे का शेड रखने वाले डेयरी किसान गिनाए गए हैं। बैंक से पूछ लें।', en: 'The leaflet lists tenant farmers and dairy farmers with own, rented or leased sheds. Ask the bank.' }, f: ['F-D1'] },
    { q: { hi: 'KCC लेने के बाद कर्ज़ कब चुकाना होता है?', en: 'When must the KCC loan be repaid?' }, a: { hi: 'चुकाने की अवधि और तरीका बैंक की शर्तों पर निर्भर है। हमें इसकी सरकारी अवधि नहीं मिली, इसलिए बैंक से लिखित में पूछकर अपनी कॉपी में नोट कर लें।', en: 'The repayment period and method depend on the bank’s terms. We did not find an official period, so ask the bank in writing and note it in your notebook.' }, f: ['GEN'] },
    { q: { hi: 'अगर बैंक आवेदन लेने से मना कर दे तो क्या करें?', en: 'What if the bank refuses to take my application?' }, a: { hi: 'कारण लिखित में माँगें, फिर बैंक के क्षेत्रीय कार्यालय या ज़िला पशुपालन एवं डेयरी कार्यालय को बताएँ। हमारे किसान सवाल पेज पर भी पूछ सकते हैं।', en: 'Ask for the reason in writing, then tell the bank’s regional office or the district Animal Husbandry and Dairying office. You can also ask on our Kisan Sawaal page.' }, f: ['GEN'] },
  ],
  sources: [
    { title: { hi: 'पशुपालन एवं डेयरी विभाग (भारत सरकार) की KCC पुस्तिका', en: 'Department of Animal Husbandry and Dairying (Govt of India) KCC leaflet' }, url: 'https://dahd.gov.in/sites/default/files/2023-07/KCC-Leaflet-E.pdf', type: 'OFFICIAL', date: '2023-07-01' },
    { title: { hi: 'सार्वजनिक सेवा मानचित्र (निजी जानकारी वेबसाइट)', en: 'Public Services Map (private information website)' }, url: 'https://www.publicservicesmap.in/schemes/kisan-credit-card-pashupalan--kccp', type: 'PRIVATE', date: '2026-11-05' },
  ],
  related: ['/pashupalan', '/pashupalan/kamdhenu-yojana', '/pashupalan/desi-gay-anudan', '/yojana/central', '/yojana/mp', '/sawaal', '/resources'],
}
