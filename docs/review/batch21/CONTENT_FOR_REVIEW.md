# Batch 21 - content for review

Every item below was seeded as **not reviewed**. Nothing here goes out on the live post until a person says "approve" and the flag is flipped to `true` (by Cowork, on your word). `npm run morning -- --draft ...` shows them with a WARNING so you can read how they look.

How to answer: for each item, tell Cowork **approve**, **change to: ...**, or **drop**. One line per item id is enough.

## A. KVK Sagar - wheat calendar and sowing/irrigation lines

Source for all of these: Krishisewa (https://krishisewa.com/improved-wheat-cultivation-practices-in-central-india). Question for every line: **is this right for Sagar this season?** "Derived" lines are arithmetic on the sourced numbers (the working is in the file). All are worded for "if you sowed between X and Y".

| id | shown on (IST) | text | derived? | status | question |
|---|---|---|---|---|---|
| w01 | 2026-11-01 (रवि) to 2026-11-09 (सोम) | बुवाई से पहले खेत में खाद या गोबर की खाद डालना याद रखें. | no | not reviewed | Right for Sagar? |
| w02 | 2026-11-10 (मंगल) to 2026-11-25 (बुध) | सिंचित गेहूं की बुवाई का समय आज से (10–25 नवंबर); बोने की तारीख़ लिख लें, पहली सिंचाई 20–25 दिन बाद | no | not reviewed | Right for Sagar? |
| w03 | 2026-11-10 (मंगल) to 2026-11-25 (बुध) | गेहूं का बीज: 100 किलो प्रति हेक्टेयर (करीब 40 किलो प्रति एकड़); कतार से कतार 20 सेमी | no | not reviewed | Right for Sagar? |
| w04 | 2026-11-10 (मंगल) to 2026-11-25 (बुध) | तीन सिंचाइयों की योजना: बुवाई के 20–25, 50–55 और 80–85 दिन बाद | no | not reviewed | Right for Sagar? |
| w05 | 2026-11-10 (मंगल) to 2026-11-30 (सोम) | सिंचित, समय पर बुवाई की किस्में (मध्य प्रदेश के लिए): HI 1544 (पूर्णा), HI 1636 (पूसा वकुला), HI 1650 (पूसा ओजस्वी), GW 513. चुनने से पहले KVK से पूछें | no | not reviewed, **blocked: too long** | Too long (151 characters). Please shorten, then approve. |
| w06 | 2026-11-20 (शुक्र) to 2026-12-05 (शनि) | समय पर बुवाई 25 नवंबर तक; उसके बाद देर से बुवाई (1 दिसंबर–5 जनवरी) में बीज 25% ज़्यादा लगता है | no | not reviewed | Right for Sagar? |
| w07 | 2026-11-30 (सोम) to 2026-12-20 (रवि) | जिन्होंने 10–25 नवंबर में बुवाई की, उनकी पहली सिंचाई का समय 30 नवंबर से 20 दिसंबर (बुवाई के 20–25 दिन बाद) | yes | not reviewed | Right time for the first irrigation? (hidden when 48-hour rain is light or more) |
| w08 | 2026-12-21 (सोम) to 2027-01-30 (शनि) | जिन्होंने 1 दिसंबर–5 जनवरी की देर से बुवाई की, उनकी पहली सिंचाई इसी बीच आती है (बुवाई के 20–25 दिन बाद: 21 दिसंबर से 30 जनवरी) | yes | not reviewed | Right time for the first irrigation? (hidden when 48-hour rain is light or more) |
| w09 | 2026-12-30 (बुध) to 2027-01-19 (मंगल) | 10–25 नवंबर की बुवाई वालों के लिए दूसरी सिंचाई का समय (बुवाई के 50–55 दिन बाद) | yes | not reviewed | Right time for the second irrigation? (hidden when 48-hour rain is light or more) |
| w10 | 2027-01-29 (शुक्र) to 2027-02-18 (गुरु) | 10–25 नवंबर की बुवाई वालों के लिए तीसरी सिंचाई का समय (बुवाई के 80–85 दिन बाद) | yes | not reviewed | Right time for the third irrigation? (hidden when 48-hour rain is light or more) |
| rain_hold | any day an irrigation line would show, when 48-hour rain is light or more | बारिश आने वाली है: सिंचाई का फ़ैसला खेत की नमी देखकर करें | no (new wording) | not reviewed | This replaces the irrigation line on rainy days. Is this wording right, or what should it say? |
| win-wheat-timely (events) | 2026-11-10 (मंगल) to 2026-11-25 (बुध) | समय पर गेहूं बुवाई (सिंचित) | no | not reviewed | Confirm the irrigated timely-sowing window for Sagar (late sowing 1 Dec - 5 Jan). |

## B. Core team - schemes, MSP, events

### Schemes (Monday news, Friday how-to)

| id | text | source | status | question |
|---|---|---|---|---|
| pm-kisan-24 | PM-किसान - 24वीं किस्त 30 अक्तूबर को जारी हुई: ₹18,680 करोड़, 9.34 करोड़ किसान परिवारों को. पैसा न आया हो तो pmkisan.gov.in पर अपनी स्थिति देखें. (shown 2026-11-01 (रवि) to 2026-11-30 (सोम)) | समाचार रिपोर्ट https://morungexpress.com/pm-modi-releases-24th-pm-kisan-instalment-of-rs-18680-crore-to-934-crore-farmer-families (2026-10-30) | not reviewed | One news report only. Is the 24th instalment (30 Oct, Rs 18,680 crore, 9.34 crore families) confirmed on pmkisan.gov.in? |
| pmfby-rabi (Monday) | प्रधानमंत्री फसल बीमा योजना - फसल बीमा चाहने वाले किसान | Kshema (pmfby.gov.in) https://pmfby.gov.in | not reviewed | Is this one-line description fine for Monday? |
| pmfby-rabi (Friday how-to) | PM फसल बीमा (रबी): किसान का प्रीमियम बीमा राशि का 1.5%. साथ ले जाएँ: आधार, ज़मीन का रिकॉर्ड, बैंक पासबुक, बुवाई की घोषणा. जहाँ: बैंक या CSC. | Kshema (pmfby.gov.in) (single source) | not reviewed, **will not show** | **The Madhya Pradesh rabi 2026-27 last date is unknown.** Please send the date and its source. Until then Friday has no how-to, even if approved. |

### MSP (Wednesday money fact, Thursday know)

| id | text | source | status | question |
|---|---|---|---|---|
| m01 | नई MSP (रबी 2027-28), ₹ प्रति क्विंटल: / गेहूं 2,610 · चना 5,958 · मसूर 7,390 · सरसों 6,613 / यह इस बोई जा रही फसल के लिए है, आज के भाव से तुलना न करें (shown 2026-10-01 (गुरु) to 2026-12-31 (गुरु)) | केंद्रीय मंत्रिमंडल का फ़ैसला (1 अक्तूबर 2026), Global Agriculture https://www.global-agriculture.com/india-region/cabinet-approves-msp-hike-for-all-six-rabi-crops-for-marketing-season-2027-28/ (2026-10-01) | not reviewed | Do the four MSP figures match the Cabinet decision of 1 Oct 2026? |
| k01 | इस बार MSP में सरसों सबसे ज़्यादा बढ़ी (+₹413), गेहूं सबसे कम (+₹25). चना +₹83, मसूर +₹390 | केंद्रीय मंत्रिमंडल का फ़ैसला (1 अक्तूबर 2026), Global Agriculture (2026-10-01) | not reviewed | The rises were recomputed from our MSP file and agree. Approve? |

### Events (Tuesday "अब आगे क्या?")

`near` events can show; `far` events are stored but NOT shown by default.

| id | what | date | where | scope | source | status | question |
|---|---|---|---|---|---|---|---|
| ev-diwali | दीपावली | 2026-11-08 (रवि) | - | near | HinduTone / Drik Panchang | not reviewed | Date right for MP? (calendars can differ by a day) |
| ev-govardhan | गोवर्धन पूजा | 2026-11-10 (मंगल) | - | near | HinduTone / Drik Panchang | not reviewed | Date right for MP? (calendars can differ by a day) |
| ev-bhaidooj | भाई दूज | 2026-11-11 (बुध) | - | near | HinduTone / Drik Panchang | not reviewed | Date right for MP? (calendars can differ by a day) |
| ev-chhath | छठ पूजा | 2026-11-15 (रवि) | - | far | HinduTone / Drik Panchang | not reviewed | Date right for MP? (calendars can differ by a day) |
| ev-devuthani | देवउठनी एकादशी | 2026-11-20 (शुक्र) | - | near | HinduTone / Drik Panchang | not reviewed | Date right for MP? (calendars can differ by a day) |
| ev-tulsi | तुलसी विवाह | 2026-11-21 (शनि) | - | near | HinduTone / Drik Panchang | not reviewed | Date right for MP? (calendars can differ by a day) |
| ev-kartik-purnima | कार्तिक पूर्णिमा | 2026-11-24 (मंगल) | - | near | HinduTone / Drik Panchang | not reviewed | Date right for MP? (calendars can differ by a day) |
| fair-bharat-agri-tech | Bharat Agri Tech | 2027-01-08 (शुक्र) to 2027-01-11 (सोम) | इंदौर | near | Tractor Gyan (agri events listing) | not reviewed | Dates right? Worth showing to Sagar farmers? Note: our own mela research says 9-11 Jan. |
| fair-global-agrotech | Global AgroTech | 2026-12-03 (गुरु) to 2026-12-05 (शनि) | लखनऊ | far | Tractor Gyan (agri events listing) | not reviewed | Dates right? Far away: show it at all? |
| fair-agri-agro-agra | Agri Agro Grand Expo | 2026-12-07 (सोम) to 2026-12-09 (बुध) | आगरा | far | Tractor Gyan (agri events listing) | not reviewed | Dates right? Far away: show it at all? |
| fair-kisan-agri-pune | Kisan Agri Show | 2026-12-09 (बुध) to 2026-12-13 (रवि) | पुणे | far | Tractor Gyan (agri events listing) | not reviewed | Dates right? Far away: show it at all? |
| fair-farmtech-bhopal | Farm-Tech India | 2027-02-14 (रवि) to 2027-02-16 (मंगल) | भोपाल | near | Tractor Gyan (agri events listing) | not reviewed | Dates right? Worth showing to Sagar farmers? |

## C. Shri A.K. Dixit and team - kahawats (Saturday)

Shown as: the saying, then "मतलब: ...", then the source in brackets. Questions for every one: **is the wording exactly right, and is the meaning right?** `wording_checked` stays false until you say yes.

| id | saying | meaning | source | status | question |
|---|---|---|---|---|---|
| k01 | उत्तम खेती मध्यम बान, निकृष्ट चाकरी, भीख निदान। | खेती सबसे अच्छा काम, व्यापार बीच का, नौकरी उससे नीचे, भीख आख़िरी सहारा। | हिंदी विकिपीडिया (घाघ) | not reviewed | Wording and meaning right? |
| k02 | खाद पड़े तो खेत, नहीं तो कूड़ा रेत। | खाद डालोगे तो खेत काम आएगा, वरना वह केवल रेत है। | हिंदी विकिपीडिया (घाघ) | not reviewed | Wording and meaning right? |
| k03 | गोबर, मैला, नीम की खली, या से खेती दुनी फली। | गोबर की खाद, कम्पोस्ट और नीम की खली से फसल दुगनी होती है। | हिंदी विकिपीडिया (घाघ) | not reviewed | Wording and meaning right? |
| k04 | जब सैल खटाखट बाजै, तब चना खूब ही गाजै। | जब ढेले टूटकर पाटा खटखटाता है, तब चने की फसल अच्छी होती है। | India Water Portal | not reviewed | Wording and meaning right? |
| k05 | छप्पर छाने के लिए चार मनुष्य चाहिए। खेत निराने के लिए छह मनुष्य चाहिए। | छप्पर छाने में चार लोग लगते हैं, खेत की निराई में छह। | हिन्द्वी (घाघ) | not reviewed | Wording and meaning right? |
| k06 | उत्तर चमकै बीजुरी, पूरब बहे बाउ, घाघ कहै सुन भड्डरी, बरधा भीतर लाउ। | उत्तर में बिजली और पूरब की हवा: तेज़ बारिश आ रही है, बैलों को अंदर ले आओ। | OCR स्कैन (दूसरी पंक्ति पक्की करना बाकी) | not reviewed | source is an OCR scan; the second line is to be confirmed against a printed copy Second line to confirm against a printed copy. |
| k07 | अब पछताए होत क्या जब चिड़िया चुग गई खेत। | समय निकल जाने के बाद पछताने से कोई फ़ायदा नहीं। | प्रचलित कहावत | not reviewed | Wording and meaning right? |
| k08 | बोया पेड़ बबूल का तो आम कहाँ से होय। | जैसा काम करोगे, वैसा ही फल मिलेगा। | प्रचलित कहावत | not reviewed | Wording and meaning right? |
| k09 | जैसा बोओगे वैसा काटोगे। | जो बीज और मेहनत लगाओगे, वही फसल मिलेगी। | प्रचलित कहावत | not reviewed | Wording and meaning right? |
| k10 | बूँद-बूँद से घड़ा भरता है। | थोड़ा-थोड़ा जमा करने से बड़ी चीज़ बन जाती है। | प्रचलित कहावत | not reviewed | Wording and meaning right? |
| k11 | एक और एक ग्यारह। | मिलकर काम करने से ताक़त कई गुना बढ़ जाती है। | प्रचलित कहावत | not reviewed | Wording and meaning right? |
| k12 | नौ नकद, न तेरह उधार। | हाथ में आया थोड़ा नकद, उधार के ज़्यादा से बेहतर माना जाता है। | प्रचलित कहावत | not reviewed | reviewer to decide: may read as advice |

## D. Already in the files before this batch (still not reviewed)

The 12 general "मंडी का ज्ञान" lines (g01-g12, no source), the 4 tips, and the 3 schemes pm-kisan, pmfby, kcc are as they were. They were never reviewed, so they are blocked on the live post. Thursday's slot is drawn from g01-g12 and k01 together, so approving only k01 means Thursday shows k01 about once a month. Ask Cowork to list their text if you want to review them.

