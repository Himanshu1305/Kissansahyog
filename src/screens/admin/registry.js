// Batch 14A - which panel lives in which tab, and the words the panel search matches (Hindi + English).
// Search finds PANELS, not records. `keys` are matched case-insensitively as substrings, so a few stems are enough.
export const TABS = [
  { id: 'overview', label: 'adm_tab_overview' },
  { id: 'content', label: 'adm_tab_content' },
  { id: 'mandi', label: 'adm_tab_mandi' },
  { id: 'moderation', label: 'adm_tab_moderation' },
  { id: 'people', label: 'adm_tab_people' },
  { id: 'security', label: 'adm_tab_security' },
]

export const PANELS = [
  { key: 'stats', tab: 'overview', label: 'adm_p_stats', keys: 'stats numbers total users listings आंकड़े कुल गिनती' },
  { key: 'availability', tab: 'overview', label: 'adm_p_availability', keys: 'availability dashboard resources उपलब्धता डैशबोर्ड' },
  { key: 'datahealth', tab: 'overview', label: 'adm_p_datahealth', keys: 'data health mandi weather fresh डेटा हेल्थ ताज़ा' },
  { key: 'experts', tab: 'content', label: 'adm_p_experts', keys: 'expert experts specialist विशेषज्ञ' },
  { key: 'articles', tab: 'content', label: 'adm_p_articles', keys: 'article articles blog guide लेख' },
  { key: 'resources', tab: 'content', label: 'adm_p_resources', keys: 'resource lab soil veterinary office संसाधन लैब कार्यालय' },
  { key: 'yojana', tab: 'content', label: 'adm_p_yojana', keys: 'yojana scheme schemes government sarkari योजना सरकारी' },
  { key: 'safalta', tab: 'content', label: 'adm_p_safalta', keys: 'safalta success story stories सफलता कहानी' },
  { key: 'sawaal', tab: 'content', label: 'adm_p_sawaal', keys: 'sawaal question answer q&a सवाल जवाब' },
  { key: 'pagefaqs', tab: 'content', label: 'adm_p_pagefaqs', keys: 'faq faqs page questions पेज प्रश्न' },
  { key: 'announcements', tab: 'content', label: 'adm_p_announcements', keys: 'announcement card banner notice festival home घोषणा कार्ड सूचना त्योहार होम' },
  { key: 'msp', tab: 'mandi', label: 'adm_p_msp', keys: 'msp minimum support price एमएसपी समर्थन मूल्य' },
  { key: 'inputprices', tab: 'mandi', label: 'adm_p_inputprices', keys: 'input prices seed fertiliser khad कृषि सामग्री भाव खाद बीज' },
  { key: 'procurement', tab: 'mandi', label: 'adm_p_procurement', keys: 'procurement centre centres purchase खरीद केंद्र' },
  { key: 'listings', tab: 'moderation', label: 'adm_p_listings', keys: 'listing listings remove disable delete sponsor लिस्टिंग हटाएँ' },
  { key: 'reports', tab: 'moderation', label: 'adm_p_reports', keys: 'report reports complaint complaints शिकायत' },
  { key: 'carbon', tab: 'moderation', label: 'adm_p_carbon', keys: 'carbon suggestion suggestions कार्बन सुझाव' },
  { key: 'mela', tab: 'moderation', label: 'adm_p_mela', keys: 'mela fair event kisan mela मेला' },
  { key: 'melacand', tab: 'moderation', label: 'adm_p_melacand', keys: 'mela candidates discovery rejected मेला उम्मीदवार' },
  { key: 'melamerges', tab: 'moderation', label: 'adm_p_melamerges', keys: 'mela merges duplicate split विलय' },
  { key: 'userstatus', tab: 'people', label: 'adm_p_userstatus', keys: 'users block unblock suspend ban role admin editor उपयोगकर्ता रोकें खाता' },
  { key: 'users', tab: 'people', label: 'adm_p_users', keys: 'users contact phone email list उपयोगकर्ता संपर्क' },
  { key: 'farmers', tab: 'people', label: 'adm_p_farmers', keys: 'farmer profiles land crops किसान प्रोफाइल' },
  { key: 'vendors', tab: 'people', label: 'adm_p_vendors', keys: 'vendor report vendors dealers व्यापारी' },
  { key: 'whatsapp', tab: 'people', label: 'adm_p_whatsapp', keys: 'whatsapp channel opt-in post today व्हाट्सऐप चैनल आज की पोस्ट' },
  { key: 'subscriptions', tab: 'people', label: 'adm_p_subscriptions', keys: 'alert subscriptions sms weather अलर्ट सदस्यता' },
  { key: 'searchmisses', tab: 'people', label: 'adm_p_searchmisses', keys: 'search misses zero result searches बिना परिणाम खोज' },
  { key: 'security', tab: 'security', label: 'adm_p_security', keys: 'security otp session switch login सुरक्षा स्विच लॉग इन' },
  { key: 'smsusage', tab: 'security', label: 'adm_p_smsusage', keys: 'sms otp usage balance 2factor एसएमएस उपयोग बैलेंस' },
  { key: 'actionlog', tab: 'security', label: 'adm_p_actionlog', keys: 'action log audit history who changed एडमिन लॉग इतिहास किसने बदला' },
  { key: 'roles', tab: 'security', label: 'adm_p_roles', keys: 'roles super editor admin permissions भूमिका एडिटर सुपर' },
]

export const tabOf = (key) => PANELS.find((p) => p.key === key)?.tab || null

// Pure: which panels match what was typed. `labelOf(p)` gives the panel's Hindi and English names joined.
export function searchPanels(query, labelOf) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return []
  return PANELS.filter((p) => `${labelOf(p)} ${p.keys}`.toLowerCase().includes(q))
}

export const SUPER_ONLY = new Set(['security', 'smsusage', 'roles'])
export const DEFAULT_TAB = 'overview'
export const validTab = (id) => TABS.some((t) => t.id === id)
