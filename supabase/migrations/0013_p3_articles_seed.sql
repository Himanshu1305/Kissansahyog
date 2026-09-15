-- Kisan Sahyog — 0013 (Phase 3 / Phase 5) articles public read + seed content
--
-- The `articles` table was created in 0012 (admin management). Here we open public
-- read of PUBLISHED articles only and seed the two launch articles. Admin writes
-- continue via the SECURITY DEFINER admin RPCs (0012); there are no anon write
-- policies. Idempotent seed (on conflict (slug) do nothing).

alter table public.articles enable row level security;
grant select on public.articles to anon;

drop policy if exists articles_read_published on public.articles;
create policy articles_read_published on public.articles
  for select to anon
  using (is_published = true);

-- ---------------------------------------------------------------------------
-- Seed: Article 1 — Parali burning
-- ---------------------------------------------------------------------------
insert into public.articles (slug, title_hi, title_en, author_name, is_published, published_at, content_hi, content_en)
values (
  'parali-pollution-kisaan-ki-majboori',
  $t$पराली जलाना — किसान की मजबूरी या हमारी गलत सोच?$t$,
  $t$Burning Crop Residue — A Farmer's Compulsion or Our Wrong Thinking?$t$,
  'Team Kisan Sahyog', true, now(),
$hi$हर साल अक्टूबर-नवंबर में जब उत्तर भारत में धुंध छाती है, तो सबसे पहले किसानों की तरफ उंगली उठती है। "पराली जला रहे हैं किसान" — यह वाक्य समाचारों में, सोशल मीडिया पर और सरकारी बयानों में बार-बार दोहराया जाता है। लेकिन क्या हम एक बार किसान की नज़र से भी देखने की कोशिश करते हैं?

एक किसान पराली इसलिए नहीं जलाता क्योंकि वो पर्यावरण का दुश्मन है। वो इसलिए जलाता है क्योंकि उसके पास कोई और रास्ता नहीं है। धान की कटाई के बाद खेत में बचा पैरा हटाने का खर्च उसकी कमाई से ज़्यादा होता है। मशीनें महंगी हैं, मज़दूर मिलते नहीं, और अगली फसल की बुवाई का वक्त आ जाता है।

अब ज़रा दूसरा पहलू देखिए। यही किसान, जिस पर हम प्रदूषण फैलाने का आरोप लगाते हैं — वो साल भर करोड़ों टन अनाज उगाता है। उसके खेत सूरज की रोशनी को भोजन में बदलते हैं, कार्बन को ज़मीन में दबाते हैं, और वातावरण में ऑक्सीजन छोड़ते हैं। क्या कोई कारखाना यह काम करता है? क्या कोई शहरी उद्योग हवा को शुद्ध करता है? नहीं।

किसान इस देश का सबसे बड़ा पर्यावरण उत्पादक है। वो अन्नदाता ही नहीं, ऑक्सीजन दाता भी है। फिर भी जब प्रदूषण की बात आती है तो सारा दोष उसी पर?

असली सवाल यह है: क्या हम उस किसान को पराली न जलाने का विकल्प दे रहे हैं? क्या उसकी पराली को खरीदने वाले उद्योग हैं? क्या उसे उचित दाम मिल रहे हैं? अगर नहीं, तो समाधान कानून से नहीं, बाज़ार से आएगा।

किसान सहयोग का भूसा-पराली मंच इसी सोच से बना है — ताकि किसान अपनी पराली बेच सके, जला नहीं।$hi$,
$en$Every October and November, when haze descends on North India, farmers are the first to be blamed. "Farmers are burning stubble" — this phrase echoes through news channels, social media, and government statements. But do we ever try to see it from the farmer's perspective?

A farmer doesn't burn crop residue because he is an enemy of the environment. He burns it because he has no other choice. The cost of clearing the straw left after paddy harvest often exceeds what he earned from the crop. Machines are expensive, labour is scarce, and the window for sowing the next crop is closing fast.

Now consider the other side. This same farmer — accused of polluting the air — grows hundreds of millions of tonnes of food every year. His fields convert sunlight into food, absorb carbon into the soil, and release oxygen into the atmosphere. Does any factory do this? Does any urban industry purify the air? No.

The farmer is this country's largest environmental producer. He is not just the provider of food — he is a provider of oxygen. Yet when pollution is discussed, all blame falls on him?

The real question is: are we giving farmers an alternative to burning? Are there industries ready to buy their stubble? Are they being paid a fair price? If not, the solution will not come from laws — it will come from markets.

Kisan Sahyog's Bhusa-Parali marketplace was built on exactly this idea — so that farmers can sell their residue, not burn it.$en$
) on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Seed: Article 2 — Carbon credits
-- ---------------------------------------------------------------------------
insert into public.articles (slug, title_hi, title_en, author_name, is_published, published_at, content_hi, content_en)
values (
  'kisaan-carbon-credit-kya-hai',
  $t$क्या किसान कार्बन क्रेडिट से कमाई कर सकते हैं? — एक खुला सवाल$t$,
  $t$Can Farmers Earn from Carbon Credits? — An Open Question$t$,
  'Team Kisan Sahyog', true, now(),
$hi$यह लेख किसी दावे के साथ नहीं, एक सवाल के साथ शुरू होता है।

दुनिया के कई देशों में किसान अब सिर्फ अनाज नहीं बेचते — वे हवा भी बेचते हैं। सटीक रूप से कहें तो वे "कार्बन क्रेडिट" बेचते हैं। जब एक किसान जैविक खेती अपनाता है, पेड़ लगाता है, या पराली नहीं जलाता — तो वो वातावरण से कार्बन को कम करने में मदद करता है। इस काम के लिए दुनिया के कई बाज़ारों में उसे पैसे मिलते हैं।

अमेरिका में Indigo Ag जैसी कंपनियां किसानों को कार्बन क्रेडिट के बदले प्रति एकड़ भुगतान करती हैं। ऑस्ट्रेलिया में सरकार का Carbon Farming Initiative किसानों को सीधे कार्बन बाज़ार से जोड़ता है। केन्या और घाना में छोटे किसान भी इस व्यवस्था से जुड़ने लगे हैं।

भारत में क्या स्थिति है?

भारत में कार्बन क्रेडिट बाज़ार अभी शुरुआती अवस्था में है। SEBI ने 2023 में Carbon Credit Trading Scheme की रूपरेखा तैयार की। कुछ राज्यों में पायलट प्रोजेक्ट चल रहे हैं। लेकिन छोटे किसानों तक यह व्यवस्था अभी नहीं पहुंची।

तो सवाल यह है — क्या Sagar के किसान, जो हर साल लाखों एकड़ में गेहूं, चना और सोयाबीन उगाते हैं, भविष्य में कार्बन क्रेडिट से कमाई कर सकते हैं? क्या पराली न जलाने के एवज में उन्हें कोई बाज़ार मूल्य मिल सकता है?

हम इसका जवाब नहीं जानते। लेकिन हम यह ज़रूर मानते हैं कि यह सवाल पूछना ज़रूरी है।

अगर आप इस विषय के जानकार हैं — कृषि वैज्ञानिक, पर्यावरण विशेषज्ञ, या नीति निर्माता — तो हमसे संपर्क करें। किसान सहयोग इस चर्चा को आगे बढ़ाना चाहता है।$hi$,
$en$This article begins not with an answer, but with a question.

In many countries around the world, farmers no longer sell only grain — they sell air. More precisely, they sell "carbon credits." When a farmer adopts organic farming, plants trees, or avoids burning stubble — they help reduce carbon in the atmosphere. In many global markets, they are paid for doing so.

In the United States, companies like Indigo Ag pay farmers per acre for generating carbon credits. In Australia, the government's Carbon Farming Initiative directly connects farmers to carbon markets. In Kenya and Ghana, smallholder farmers are beginning to participate in these systems.

What is the situation in India?

India's carbon credit market is still in its early stages. SEBI outlined a Carbon Credit Trading Scheme framework in 2023. Some states have pilot projects underway. But this system has not yet reached small farmers.

So the question is — could farmers in Sagar district, who grow wheat, gram, and soybean across lakhs of acres every year, earn from carbon credits in the future? Could there be a market value for not burning their stubble?

We don't know the answer. But we believe the question is worth asking.

If you are a subject matter expert — an agricultural scientist, environment specialist, or policy maker — please reach out to us. Kisan Sahyog wants to take this conversation forward.$en$
) on conflict (slug) do nothing;
