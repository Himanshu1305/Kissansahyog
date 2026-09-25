// Data access for the /mausam and /msp pages: admin-editable FAQs, alert-subscription
// capture (via SECURITY DEFINER RPC), procurement centres, and site settings (review flag).
import { supabase } from '../supabaseClient'

export async function fetchPageFaqs(pageKey) {
  const { data, error } = await supabase
    .from('page_faqs').select('*').eq('page_key', pageKey).order('sort_order', { ascending: true })
  if (error) return []
  return data || []
}
export const faqQ = (f, lang) => (lang === 'hi' ? (f.q_hi || f.q_en) : (f.q_en || f.q_hi)) || ''
export const faqA = (f, lang) => (lang === 'hi' ? (f.a_hi || f.a_en) : (f.a_en || f.a_hi)) || ''

export async function subscribeAlert({ phone, pincode, crops, alertTypes, consentText, sourcePage }) {
  const { error } = await supabase.rpc('subscribe_alert', {
    p_phone: phone, p_pincode: pincode || '', p_crops: crops || [],
    p_alert_types: alertTypes || ['weather', 'price'], p_channel: 'whatsapp',
    p_consent_text: consentText, p_source_page: sourcePage || null,
  })
  if (error) throw error
  return true
}

export async function fetchProcurement() {
  const { data, error } = await supabase
    .from('procurement_centres').select('*').eq('is_active', true).order('updated_at', { ascending: false })
  if (error) return []
  return data || []
}

export async function fetchSiteSetting(key) {
  const { data, error } = await supabase.from('site_settings').select('value').eq('key', key).maybeSingle()
  if (error || !data) return null
  return data.value
}
