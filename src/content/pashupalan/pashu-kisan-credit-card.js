// Batch 19-B - /pashupalan/pashu-kisan-credit-card : KCC for animal husbandry and dairy (FACTS D). Shape: see walk.js.
export default {
  slug: 'pashu-kisan-credit-card',
  path: '/pashupalan/pashu-kisan-credit-card',
  art: 'rupee',
  status: 'open',
  asOf: '2026-11-05',
  seo: {
    title: { hi: 'पशुपालन KCC मध्य प्रदेश — पशुपालकों के लिए किसान क्रेडिट कार्ड', en: 'Animal husbandry KCC in Madhya Pradesh — Kisan Credit Card for cattle keepers' },
    description: { hi: 'पशुपालक और डेयरी किसान किसान क्रेडिट कार्ड कैसे बनवाएँ: पात्र कौन, सीमा, आवेदन के आम चरण, दस्तावेज़ और आम ग़लतियाँ — सरकारी पुस्तिका के अनुसार।', en: 'How cattle keepers and dairy farmers can get a Kisan Credit Card: who can apply, limits, the usual application steps, documents and common mistakes — as the government leaflet states.' },
  },
  h1: { hi: 'पशुपालन के लिए किसान क्रेडिट कार्ड (KCC)', en: 'Kisan Credit Card (KCC) for animal husbandry' },
  hook: { hi: 'चारे और दवा के लिए पैसे कम पड़ रहे हैं? बैंक का यह कार्ड एक रास्ता है — पर यह कर्ज़ है, मदद नहीं।', en: 'Short of money for feed and medicines? This bank card is one way — but it is a loan, not a grant.', f: ['F-D1'] },
  answer: {
    hi: 'पशुपालक और डेयरी किसान चारे, दवा और रोज़ के ख़र्च के लिए पशुपालन KCC से बैंक का कर्ज़ ले सकते हैं। पशुपालन विभाग की पुस्तिका (2023) के अनुसार बिना गारंटी ₹1.6 लाख तक की सीमा है और दूध कंपनी से जुड़े होने पर ₹3 लाख तक। सीमा बदली भी है, इसलिए बैंक से पुष्टि करें।',
    en: 'Cattle keepers and dairy farmers can take a bank loan through an animal husbandry KCC for feed, medicines and day-to-day costs. According to the department leaflet (2023), the limit without collateral is up to Rs 1.6 lakh, and up to Rs 3 lakh when tied to a milk processor. Limits have changed since, so confirm with the bank.',
    f: ['F-D1', 'F-D2'],
  },
  sar: [
    { hi: 'पशुपालन के लिए बैंक का कर्ज़-कार्ड। चारे, दवा और रोज़ के ख़र्च के लिए पैसा निकाल सकते हैं। यह कर्ज़ है, चुकाना पड़ता है।', en: 'A bank credit card for animal husbandry. You can draw money for feed, medicines and daily costs. It is a loan and must be repaid.', f: ['F-D1'] },
    { hi: 'पुस्तिका के अनुसार डेयरी किसान, समूह और किरायेदार किसान, जिनके पास अपना, किराए का या पट्टे का शेड है।', en: 'As per the leaflet: dairy farmers, groups and tenant farmers who have their own, rented or leased shed.', f: ['F-D1'] },
    { hi: 'सुविधा चालू है, पर सीमा अलग-अलग तारीख़ों में अलग लिखी है। असली सीमा आपका बैंक बताएगा।', en: 'The facility is running, but the limit is written differently on different dates. Your bank will tell you the real limit.', f: ['F-D1', 'F-D2'] },
  ],
  tiles: [
    { v: { hi: '₹1.6 लाख तक', en: 'Up to Rs 1.6 lakh' }, l: { hi: 'बिना गारंटी (कोलैटरल)', en: 'without collateral' }, src: { hi: 'पशुपालन विभाग की पुस्तिका · 2023 (सारांश से पढ़ी)', en: 'Department leaflet · 2023 (read via summary)' }, f: ['F-D1'] },
    { v: { hi: '₹2 लाख तक', en: 'Up to Rs 2 lakh' }, l: { hi: 'बिना गारंटी, आरबीआई निर्देश के तहत', en: 'without collateral, under the RBI guideline' }, src: { hi: 'सरकारी संसद जवाब · फरवरी 2025 (सारांश से)', en: 'Government reply in Parliament · Feb 2025 (via summary)' }, f: ['F-D2'] },
    { v: { hi: '₹3 लाख तक', en: 'Up to Rs 3 lakh' }, l: { hi: 'दूध कंपनी/संघ से जुड़ाव होने पर', en: 'with a milk processor / union tie-up' }, src: { hi: 'पशुपालन विभाग की पुस्तिका · 2023 (सारांश से पढ़ी)', en: 'Department leaflet · 2023 (read via summary)' }, f: ['F-D1'] },
  ],
  links: [
    { id: 'dahd', btn: { hi: 'केंद्र के पशुपालन विभाग की साइट खोलें', en: 'Open the central animal husbandry department site' } },
    { id: 'samast', btn: { hi: 'मध्य प्रदेश का SAMAST सेवा पोर्टल', en: 'Madhya Pradesh SAMAST services portal' } },
  ],
  know: {
    yes: {
      h: { hi: 'क्या पता है', en: 'What we know' },
      items: [
        { hi: 'पुस्तिका (2023) के अनुसार बिना गारंटी ₹1.6 लाख तक, और दूध प्रसंस्करण कंपनी या संघ से जुड़ाव होने पर ₹3 लाख तक का कर्ज़।', en: 'According to the leaflet (2023): up to Rs 1.6 lakh without collateral, and up to Rs 3 lakh with a tie-up with a milk processor or union.', f: ['F-D1'] },
        { hi: 'पुस्तिका के अनुसार ब्याज में छूट सिर्फ़ पशुपालन-डेयरी-मत्स्य KCC पर है और ₹2 लाख तक के कर्ज़ पर लागू होती है।', en: 'According to the leaflet, interest subvention applies only to the animal husbandry-dairy-fisheries KCC and for loans up to Rs 2 lakh.', f: ['F-D1'] },
        { hi: 'फरवरी 2025 के एक सरकारी संसद जवाब के अनुसार, आरबीआई के 6 दिसंबर 2024 के निर्देशों में पशुपालक किसान ₹2 लाख तक का कर्ज़ बिना गारंटी ले सकते हैं।', en: 'According to a February 2025 government reply in Parliament, under RBI guidelines of 6 December 2024 animal husbandry farmers can get loans up to Rs 2 lakh without collateral.', f: ['F-D2'] },
        { hi: 'आवेदन के लिए पुस्तिका में पहचान पत्र, फ़ोटो और आवेदन फ़ॉर्म गिनाए गए हैं।', en: 'For the application the leaflet lists an identity proof, a photograph and the application form.', f: ['F-D1'] },
      ],
    },
    no: {
      h: { hi: 'क्या अभी पता नहीं', en: 'What we do not know yet' },
      items: [
        { hi: 'ब्याज की दर। हमें पुस्तिका या सारांश में नहीं मिली, इसलिए नहीं लिख रहे।', en: 'The interest rate. We did not find it in the leaflet or summary, so we do not state one.', f: ['F-D1'] },
        { hi: 'आज की पक्की सीमा। दो तारीख़ों के आँकड़े अलग हैं, बैंक से पूछना होगा।', en: 'Today’s fixed limit. The figures of two dates differ, so you must ask the bank.', f: ['F-D1', 'F-D2'] },
        { hi: 'कर्ज़ चुकाने की सरकारी अवधि। यह बैंक की शर्तों पर निर्भर है।', en: 'An official repayment period. It depends on the bank’s terms.', f: ['GEN'] },
        { hi: 'ऑनलाइन आवेदन के शुल्क और चरण। हम इन्हें जाँच नहीं सके।', en: 'The fee and steps of an online application. We could not verify them.', f: ['F-D3'] },
      ],
    },
  },
  steps: {
    h: { hi: 'आवेदन आम तौर पर कैसे होता है? (सामान्य तरीका, सरकारी चरण नहीं)', en: 'How does an application usually go? (general practice, not official steps)' },
    items: [
      { hi: 'अपने बैंक की शाखा में जाएँ, जहाँ आपका खाता है। सहकारी बैंक या समिति में भी पूछ सकते हैं। "पशुपालन KCC" माँगें। आम तौर पर आवेदन बैंक में ही होता है।', en: 'Go to the branch of the bank where you hold your account. You can also ask at a cooperative bank or society. Ask for an "animal husbandry KCC". Applications are usually made at the bank.', f: ['F-D4'] },
      { hi: 'फ़ॉर्म भरें। पहचान पत्र, फ़ोटो और पशुओं की जानकारी जमा करें। सूची बैंक ही देगा।', en: 'Fill in the form. Submit an identity card, a photograph and details of your animals. The bank itself will give the list.', f: ['F-D4', 'F-D1'] },
      { hi: 'अगर आप दूध समिति या संघ को दूध देते हैं, तो बैंक को बताइए। जुड़ाव से सीमा बढ़ सकती है।', en: 'If you supply milk to a society or union, tell the bank. A tie-up can raise the limit.', f: ['F-D1'] },
      { hi: 'बैंक जाँच के बाद कार्ड जारी करता है। पुस्तिका के अनुसार पूरा आवेदन मिलने पर तय समय में कार्ड देना होता है। समय बैंक से पूछ लें।', en: 'The bank issues the card after checking. According to the leaflet, it must issue it in a set time after a complete application. Ask the bank for the time.', f: ['F-D1'] },
      { hi: 'एक निजी जानकारी वेबसाइट के अनुसार मध्य प्रदेश में SAMAST पोर्टल से ऑनलाइन आवेदन का रास्ता भी है ({{link:samast}})। सरकारी पुष्टि बाकी है, शुल्क और चरण हमने जाँचे नहीं। पोर्टल पर ख़ुद देखें।', en: 'According to a private information website there is also an online route through the SAMAST portal in Madhya Pradesh ({{link:samast}}). Government confirmation is pending and we did not verify the fee and steps. Check the portal yourself.', f: ['F-D3'] },
    ],
  },
  timeline: {
    h: { hi: 'सीमा की बात कब क्या आई', en: 'When the limit figures appeared' },
    items: [
      { d: { hi: '2023', en: '2023' }, hi: 'पशुपालन विभाग की पुस्तिका में बिना गारंटी ₹1.6 लाख और जुड़ाव पर ₹3 लाख तक लिखा है। हमने इसे एक खोज-सारांश से पढ़ा, पूरी फ़ाइल खुली नहीं।', en: 'The department leaflet says up to Rs 1.6 lakh without collateral and Rs 3 lakh with a tie-up. We read it from a search summary; the file itself did not open.', f: ['F-D1'] },
      { d: { hi: '6 दिसंबर 2024', en: '6 Dec 2024' }, hi: 'आरबीआई के निर्देश आए, जिनके तहत पशुपालक किसान ₹2 लाख तक का कर्ज़ बिना गारंटी ले सकते हैं।', en: 'RBI guidelines came out, under which animal husbandry farmers can get loans up to Rs 2 lakh without collateral.', f: ['F-D2'] },
      { d: { hi: 'फरवरी 2025', en: 'Feb 2025' }, hi: 'एक सरकारी संसद जवाब में यही बात दोहराई गई। इसका सीधा लिंक हम जाँच नहीं सके।', en: 'A government reply in Parliament repeated this. We could not verify its direct link.', f: ['F-D2'] },
    ],
  },
  sections: [
    {
      id: 'loan', kind: 'p',
      h: { hi: 'कर्ज़ और मदद में फ़र्क़ क्या है?', en: 'What is the difference between a loan and a grant?' },
      items: [
        { hi: 'KCC का पैसा बैंक देता है और आपको लौटाना होता है। सरकार की "मदद" या "अनुदान" वह पैसा है जो लौटाना नहीं होता। दोनों अलग चीज़ें हैं। इस पेज पर जो भी KCC की बात है, वह कर्ज़ की बात है।', en: 'KCC money comes from a bank and you must pay it back. A government "help" or "grant" is money you do not pay back. They are two different things. Everything on this page about KCC is about a loan.', f: ['GEN'] },
        { hi: 'पुस्तिका के अनुसार ब्याज में छूट मिल सकती है, पर सिर्फ़ ₹2 लाख तक के कर्ज़ पर। यानी छूट के बाद भी आपको मूल रकम चुकानी है।', en: 'According to the leaflet an interest concession is possible, but only on loans up to Rs 2 lakh. So even after the concession you still repay the principal.', f: ['F-D1'] },
      ],
    },
    {
      id: 'who', kind: 'ul',
      h: { hi: 'कौन आवेदन कर सकता है?', en: 'Who can apply?' },
      items: [
        { hi: 'पुस्तिका के अनुसार (2023, सारांश से पढ़ी): अकेले डेयरी किसान, संयुक्त उधारकर्ता, जेएलजी, स्वयं सहायता समूह और किरायेदार किसान, जिनके पास अपना, किराए का या पट्टे का शेड है।', en: 'According to the leaflet (2023, read through a summary): individual dairy farmers, joint borrowers, JLGs, self-help groups and tenant farmers who have their own, rented or leased shed.', f: ['F-D1'] },
        { hi: 'एक अन्य जानकारी वेबसाइट के अनुसार मध्य प्रदेश के पशुपालक और सहकारी समिति के सदस्य भी आवेदन कर सकते हैं। यह सरकारी पुष्टि के बिना है।', en: 'According to another information website, cattle keepers of Madhya Pradesh and members of cooperative societies can also apply. This is without government confirmation.', f: ['F-D3'] },
      ],
    },
    {
      id: 'ask', kind: 'ul',
      h: { hi: 'बैंक में कौन से सवाल पूछें?', en: 'Which questions should I ask at the bank?' },
      items: [
        { hi: 'पशुपालन KCC पर मेरी मौजूदा सीमा कितनी होगी, और वह किस आधार पर तय होती है?', en: 'What will my current limit on the animal husbandry KCC be, and on what basis is it fixed?', f: ['GEN'] },
        { hi: 'ब्याज की दर क्या है? ब्याज में छूट मेरे कर्ज़ पर लगेगी या नहीं?', en: 'What is the interest rate? Will the interest concession apply to my loan?', f: ['GEN'] },
        { hi: 'कर्ज़ चुकाने की अवधि क्या है? एक साथ चुकाना है या किस्तों में?', en: 'What is the repayment period? Do I pay in one go or in instalments?', f: ['GEN'] },
        { hi: 'कोई शुल्क, बीमा या प्रोसेसिंग ख़र्च लगेगा? उसकी रसीद मिलेगी?', en: 'Will there be any charge, insurance or processing cost? Will I get a receipt?', f: ['GEN'] },
        { hi: 'दूध समिति या संघ को दूध देने से क्या मेरी सीमा बढ़ सकती है?', en: 'If I supply milk to a society or union, can my limit go up?', f: ['GEN'] },
      ],
    },
    {
      id: 'use', kind: 'ul',
      h: { hi: 'कार्ड को समझदारी से कैसे चलाएँ?', en: 'How do I use the card sensibly?' },
      items: [
        { hi: 'उतना ही पैसा निकालें जितनी ज़रूरत हो। सीमा है, इसका मतलब पूरा निकालना नहीं है।', en: 'Draw only as much as you need. Having a limit does not mean you should draw all of it.', f: ['GEN'] },
        { hi: 'चारे, दवा और रोज़ के ख़र्च के बिल संभालकर रखें। हिसाब साफ़ रहेगा।', en: 'Keep the bills for fodder, medicines and daily costs. Your accounts will stay clear.', f: ['GEN'] },
        { hi: 'दूध की कमाई आते ही चुकाने की तारीख़ याद रखें। देर से चुकाने पर आगे कर्ज़ मिलना कठिन हो सकता है।', en: 'When milk income comes, remember the repayment date. Paying late can make it harder to borrow later.', f: ['GEN'] },
        { hi: 'कर्ज़ उसी काम में लगाएँ जिसके लिए लिया है, यानी पशुओं के चारे, दवा और देखभाल में।', en: 'Use the loan for what it was taken for, that is feed, medicines and care of the animals.', f: ['GEN'] },
      ],
    },
    {
      id: 'mistakes', kind: 'ul',
      h: { hi: 'आम ग़लतियाँ कौन सी हैं?', en: 'Which mistakes are common?' },
      items: [
        { hi: 'KCC को ऐसा पैसा समझ लेना जो लौटाना नहीं है। यह कर्ज़ है।', en: 'Thinking KCC is money you never have to give back. It is a loan.', f: ['GEN'] },
        { hi: 'पुरानी सीमा ₹1.6 लाख को आज की पक्की सीमा मान लेना।', en: 'Treating the older limit of Rs 1.6 lakh as today’s fixed limit.', f: ['F-D1', 'F-D2'] },
        { hi: 'आवेदन के लिए किसी एजेंट को अलग से पैसे देना।', en: 'Paying an agent separately for the application.', f: ['GEN'] },
        { hi: 'कर्ज़ का पैसा दूसरे ख़र्चों में लगा देना।', en: 'Spending the loan money on other expenses.', f: ['GEN'] },
      ],
    },
  ],
  income: {
    h: { hi: 'आपकी कमाई पर असर', en: 'What it means for your income' },
    items: [
      { hi: 'KCC आपकी कमाई नहीं बढ़ाता। वह बैंक से पैसा उधार देता है, जो ब्याज के साथ चुकाना है। इसलिए इसे आमदनी की तरह न गिनें।', en: 'KCC does not raise your income by itself. It lends you money from a bank, to be repaid with interest. So do not count it as earnings.', f: ['GEN'] },
      { hi: 'इसका फ़ायदा यह है कि चारा और दवा ख़रीदने के लिए आपको समय पर पैसा मिल सकता है। चारे की कमी में दूध घटता है, और घटा दूध कमाई घटाता है।', en: 'Its benefit is that you can get money on time to buy fodder and medicines. When fodder runs short, milk falls, and less milk means less income.', f: ['GEN'] },
      { hi: 'बैंक का कर्ज़ अक्सर साहूकार से सस्ता पड़ता है। यह हर मामले में सही नहीं, इसलिए ब्याज की दर लिखित में पूछिए और अपने हिसाब से तुलना कीजिए।', en: 'A bank loan is often cheaper than a moneylender’s. This is not true in every case, so ask the rate in writing and compare it with your own sums.', f: ['GEN'] },
      { hi: 'कर्ज़ तभी फ़ायदे का है जब दूध की कमाई से चुकाना आसान हो। इसका हिसाब लगाने के लिए "पशुपालन से कमाई" पेज का दूध-हिसाब देखें।', en: 'A loan pays off only when it is easy to repay from milk income. To work this out, see the milk calculator on the "Income from animals" page.', f: ['GEN'] },
    ],
  },
  caution: {
    h: { hi: 'सावधान रहें', en: 'Be careful' },
    items: [
      { hi: 'KCC के नाम पर किसी एजेंट को पैसे न दें। कार्ड, पिन या ओटीपी किसी को न बताएँ। आधार या बैंक की जानकारी अनजान लिंक पर न डालें।', en: 'Do not pay any agent in the name of KCC. Do not share your card, PIN or OTP with anyone. Do not put Aadhaar or bank details on an unknown link.', f: ['GEN'] },
    ],
  },
  tip: {
    h: { hi: 'बैंक जाने से पहले', en: 'Before you go to the bank' },
    items: [
      { hi: 'एक कागज़ पर पशुओं की गिनती, शेड का हाल और रोज़ के ख़र्च लिख लें। निवास का प्रमाण, पासबुक और ज़मीन के कागज़ (अगर हैं) साथ रखें। यह सिर्फ़ तैयारी है, शर्त नहीं।', en: 'Write down on a sheet your animal count, the state of your shed and daily costs. Take proof of residence, your passbook and land papers if you have them. This is only preparation, not a condition.', f: ['GEN'] },
    ],
  },
  faqs: [
    { q: { hi: 'पशुपालन KCC क्या है?', en: 'What is an animal husbandry KCC?' }, a: { hi: 'पशुपालकों और डेयरी किसानों के लिए बैंक का कर्ज़-कार्ड, जिससे चारे, दवा और रोज़ के ख़र्च के लिए पैसा लिया जा सकता है। यह कर्ज़ है।', en: 'A bank credit card for cattle keepers and dairy farmers, from which money can be drawn for feed, medicines and daily costs. It is a loan.' }, f: ['F-D1'] },
    { q: { hi: 'कितना कर्ज़ मिल सकता है?', en: 'How much loan can I get?' }, a: { hi: 'पुस्तिका (2023) में बिना गारंटी ₹1.6 लाख और दूध कंपनी से जुड़ाव पर ₹3 लाख तक लिखा है। 2025 के संसद जवाब में ₹2 लाख तक बिना गारंटी लिखा है। बैंक से पुष्टि करें।', en: 'The leaflet (2023) says Rs 1.6 lakh without collateral and up to Rs 3 lakh with a milk-company tie-up. A 2025 reply in Parliament says up to Rs 2 lakh without collateral. Confirm with the bank.' }, f: ['F-D1', 'F-D2'] },
    { q: { hi: 'क्या ब्याज में छूट मिलती है?', en: 'Is there an interest concession?' }, a: { hi: 'पुस्तिका के अनुसार पशुपालन-डेयरी-मत्स्य KCC पर ₹2 लाख तक के कर्ज़ पर ब्याज में छूट है। ब्याज दर हम नहीं बता रहे। बैंक से पूछें।', en: 'According to the leaflet there is an interest subvention on the animal husbandry-dairy-fisheries KCC for loans up to Rs 2 lakh. We do not state a rate. Ask the bank.' }, f: ['F-D1'] },
    { q: { hi: 'आवेदन कहाँ करें?', en: 'Where do I apply?' }, a: { hi: 'आम तौर पर अपने बैंक की शाखा या सहकारी बैंक या समिति में। ऑनलाइन का रास्ता एक निजी जानकारी वेबसाइट बताती है। उसे पोर्टल पर ख़ुद जाँचें।', en: 'Usually at your bank branch or a cooperative bank or society. One private information website mentions an online route. Check it yourself on the portal.' }, f: ['F-D4', 'F-D3'] },
    { q: { hi: 'कौन से कागज़ चाहिए?', en: 'Which papers are needed?' }, a: { hi: 'पुस्तिका के अनुसार पहचान पत्र, फ़ोटो और आवेदन फ़ॉर्म। बैंक और कागज़ माँग सकता है।', en: 'According to the leaflet: identity proof, photograph and application form. The bank may ask for more.' }, f: ['F-D1'] },
    { q: { hi: 'क्या किरायेदार किसान आवेदन कर सकता है?', en: 'Can a tenant farmer apply?' }, a: { hi: 'पुस्तिका में किरायेदार किसान और अपना, किराए या पट्टे का शेड रखने वाले डेयरी किसान गिनाए गए हैं। बैंक से पूछ लें।', en: 'The leaflet lists tenant farmers and dairy farmers with own, rented or leased sheds. Ask the bank.' }, f: ['F-D1'] },
    { q: { hi: 'कर्ज़ कब चुकाना होता है?', en: 'When must the loan be repaid?' }, a: { hi: 'अवधि और तरीका बैंक की शर्तों पर निर्भर है। हमें सरकारी अवधि नहीं मिली। बैंक से लिखित में पूछकर अपनी कॉपी में नोट कर लें।', en: 'The period and method depend on the bank’s terms. We did not find an official period. Ask the bank in writing and note it in your notebook.' }, f: ['GEN'] },
    { q: { hi: 'अगर बैंक आवेदन लेने से मना कर दे तो क्या करें?', en: 'What if the bank refuses to take my application?' }, a: { hi: 'कारण लिखित में माँगें। फिर बैंक के क्षेत्रीय कार्यालय या ज़िला पशुपालन एवं डेयरी कार्यालय को बताएँ। हमारे किसान सवाल पेज पर भी पूछ सकते हैं।', en: 'Ask for the reason in writing. Then tell the bank’s regional office or the district Animal Husbandry and Dairying office. You can also ask on our Kisan Sawaal page.' }, f: ['GEN'] },
  ],
  sources: [
    { title: { hi: 'पशुपालन एवं डेयरी विभाग (भारत सरकार) की KCC पुस्तिका', en: 'Department of Animal Husbandry and Dairying (Govt of India) KCC leaflet' }, url: 'https://dahd.gov.in/sites/default/files/2023-07/KCC-Leaflet-E.pdf', type: 'OFFICIAL', date: '2023-07-01' },
    { title: { hi: 'सार्वजनिक सेवा मानचित्र (निजी जानकारी वेबसाइट)', en: 'Public Services Map (private information website)' }, url: 'https://www.publicservicesmap.in/schemes/kisan-credit-card-pashupalan--kccp', type: 'PRIVATE', date: '2026-11-05' },
  ],
  related: ['/pashupalan/pashupalan-se-kamai', '/pashupalan', '/pashupalan/kamdhenu-yojana', '/pashupalan/desi-gay-anudan', '/yojana/central', '/yojana/mp', '/sawaal', '/resources'],
}
