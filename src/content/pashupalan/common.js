// Batch 19 - shared chrome text for the Pashupalan pages (Hindi first, English second).
// Pure data: no JSX, no imports, so Node scripts (review doc, tests) can read it.
export const ASOF_DATE_LABEL = { hi: 'जानकारी की तारीख़', en: 'Information as of' }

export const STATUS = {
  planned: { hi: 'योजना बन रही है — अभी शुरू नहीं', en: 'Planned — not started yet', tone: 'amber' },
  announced: { hi: 'घोषित — नियम व शर्तें देखें', en: 'Announced — check the rules and conditions', tone: 'blue' },
  open: { hi: 'चालू — बैंक/विभाग से पुष्टि करें', en: 'Open — confirm with the bank / department', tone: 'green' },
  closed: { hi: 'बंद', en: 'Closed', tone: 'grey' },
  unknown: { hi: 'वर्तमान स्थिति की पुष्टि बाकी', en: 'Current status not confirmed', tone: 'grey' },
  info: { hi: 'सामान्य जानकारी', en: 'General information', tone: 'green' },
}

export const SCHEME_STATUSES = ['planned', 'announced', 'open', 'closed', 'unknown']

export const NOTE = {
  hi: 'यह जानकारी सरकारी पोर्टलों और समाचार रिपोर्टों से ली गई है। आवेदन करने से पहले अपने ब्लॉक के पशु चिकित्सालय या पशुपालन एवं डेयरी विभाग से पुष्टि कर लें।',
  en: 'This information is taken from government portals and news reports. Before you apply, confirm with your block veterinary hospital or the Animal Husbandry and Dairying department.',
}

export const UI = {
  home: { hi: 'पशुपालन', en: 'Animal husbandry' },
  bySource: { hi: 'स्रोत', en: 'Sources' },
  sourcesIntro: { hi: 'ये लिंक वे जगहें हैं जहाँ से जानकारी ली गई। हर लिंक के साथ उसका प्रकार और तारीख़ लिखी है।', en: 'These are the places the information came from. Each link shows its type and date.' },
  typeLabel: { OFFICIAL: { hi: 'सरकारी पोर्टल', en: 'Government portal' }, NEWS: { hi: 'समाचार', en: 'News report' }, PRIVATE: { hi: 'निजी जानकारी वेबसाइट', en: 'Private information website' } },
  statusLabel: { hi: 'स्थिति', en: 'Status' },
  more: { hi: 'और देखें', en: 'See also' },
  channelBtn: { hi: 'WhatsApp चैनल से जुड़ें — नई जानकारी सबसे पहले', en: 'Join our WhatsApp Channel — new information first' },
  channelHint: { hi: 'जैसे ही कोई सरकारी घोषणा आएगी, हम चैनल पर बताएँगे।', en: 'As soon as there is a government announcement, we will post it on the channel.' },
  askBtn: { hi: 'अपना सवाल पूछें', en: 'Ask your question' },
  tableWho: { hi: 'किसके लिए', en: 'Who it is for' },
  tableGet: { hi: 'क्या मिलता है', en: 'What it offers' },
  tableScheme: { hi: 'योजना', en: 'Scheme' },
  tableStatus: { hi: 'स्थिति', en: 'Status' },
  tablePage: { hi: 'पूरा पेज', en: 'Full page' },
  open: { hi: 'पेज खोलें', en: 'Open page' },
  guideTitle: { hi: 'मेरे लिए कौन सी योजना?', en: 'Which scheme is for me?' },
  guideHint: { hi: 'अपनी हालत चुनिए — हम सही पेज दिखाएँगे।', en: 'Pick your situation — we will show the right page.' },
  guideGo: { hi: 'यह पेज खोलें', en: 'Open this page' },
  guideAlso: { hi: 'यह भी देखें', en: 'Also see' },
  breadcrumbHome: { hi: 'मुख्य पेज', en: 'Home' },
  faqTitle: { hi: 'अक्सर पूछे जाने वाले सवाल', en: 'Frequently asked questions' },
  updated: { hi: 'अंतिम अपडेट', en: 'Last updated' },
  byline: { hi: 'किसान सहयोग टीम', en: 'Team Kissan Sahyog' },
}

export const PAGE_ORDER = ['desi-gay-anudan', 'kamdhenu-yojana', 'gaushala-anudan', 'pashu-kisan-credit-card', 'kendriya-yojanayen', 'desi-nasle']

// Pages that carry the standard NOTE and are held to the content checks.
export const BASE_PATH = '/pashupalan'
