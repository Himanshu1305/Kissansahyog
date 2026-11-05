// Batch 19-B - registry of direct links to official sites. Pure data (no imports).
// Rule: only home or section pages that opened on 5 Nov 2026 (HTTP 200 after redirects, fetched with a normal browser
// User-Agent). No deep URL is invented. A site that blocks automated checks is kept with ok:false and a note.
// Text modules write {{link:id}} where a portal is named; the page renders it as a tappable link.
// type: OFFICIAL | NEWS | PRIVATE. checkedOn: the day we opened it.
export const LINKS = {
  dbaky: {
    id: 'dbaky', url: 'https://dbaky.mp.gov.in', type: 'OFFICIAL', checkedOn: '2026-11-05', ok: true,
    label: { hi: 'dbaky.mp.gov.in', en: 'dbaky.mp.gov.in' },
    does: { hi: 'कामधेनु योजना का पोर्टल — डेयरी लोन का पंजीकरण व आवेदन', en: 'Kamdhenu scheme portal — sign-up and application for a dairy loan' },
  },
  mpdah: {
    id: 'mpdah', url: 'https://mpdah.gov.in', type: 'OFFICIAL', checkedOn: '2026-11-05', ok: false,
    note: 'blocks automated checks (403); on 5 Nov 2026 the site certificate had expired, so a command-line client refuses it and a browser may show a warning. The architect opened it in a browser the same day',
    label: { hi: 'mpdah.gov.in', en: 'mpdah.gov.in' },
    does: { hi: 'मध्य प्रदेश के पशुपालन एवं डेयरी विभाग की वेबसाइट', en: 'Website of the Madhya Pradesh Animal Husbandry and Dairying department' },
  },
  samast: {
    id: 'samast', url: 'https://samast.mponline.gov.in', type: 'OFFICIAL', checkedOn: '2026-11-05', ok: true,
    label: { hi: 'samast.mponline.gov.in', en: 'samast.mponline.gov.in' },
    does: { hi: 'मध्य प्रदेश सरकार का SAMAST सेवा पोर्टल', en: 'Madhya Pradesh government SAMAST services portal' },
  },
  dahd: {
    id: 'dahd', url: 'https://www.dahd.gov.in', type: 'OFFICIAL', checkedOn: '2026-11-05', ok: true,
    label: { hi: 'dahd.gov.in', en: 'dahd.gov.in' },
    does: { hi: 'केंद्र सरकार के पशुपालन एवं डेयरी विभाग की वेबसाइट', en: 'Website of the central Department of Animal Husbandry and Dairying' },
  },
  nlm: {
    id: 'nlm', url: 'https://nlm.udyamimitra.in', type: 'OFFICIAL', checkedOn: '2026-11-05', ok: true,
    label: { hi: 'nlm.udyamimitra.in', en: 'nlm.udyamimitra.in' },
    does: { hi: 'राष्ट्रीय पशुधन मिशन का ऑनलाइन पोर्टल', en: 'National Livestock Mission online portal' },
  },
  nbagr: {
    id: 'nbagr', url: 'https://nbagr.res.in', type: 'OFFICIAL', checkedOn: '2026-11-05', ok: true,
    label: { hi: 'nbagr.res.in', en: 'nbagr.res.in' },
    does: { hi: 'ICAR-राष्ट्रीय पशु आनुवंशिक संसाधन ब्यूरो, जहाँ देसी नस्लें दर्ज होती हैं', en: 'ICAR-National Bureau of Animal Genetic Resources, where indigenous breeds are registered' },
  },
  nddb: {
    id: 'nddb', url: 'https://www.nddb.coop', type: 'OFFICIAL', checkedOn: '2026-11-05', ok: true,
    label: { hi: 'nddb.coop', en: 'nddb.coop' },
    does: { hi: 'राष्ट्रीय डेयरी विकास बोर्ड की वेबसाइट', en: 'Website of the National Dairy Development Board' },
  },
  myscheme: {
    id: 'myscheme', url: 'https://www.myscheme.gov.in', type: 'OFFICIAL', checkedOn: '2026-11-05', ok: true,
    label: { hi: 'myscheme.gov.in', en: 'myscheme.gov.in' },
    does: { hi: 'सरकारी योजनाएँ खोजने का राष्ट्रीय पोर्टल', en: 'National portal to search government schemes' },
  },
}

export const LINK_IDS = Object.keys(LINKS)
export const LINK_TOKEN = /\{\{link:([a-z0-9-]+)\}\}/g
export const PAGE_TOKEN = /{{page:([a-z0-9-/]+)}}/g
