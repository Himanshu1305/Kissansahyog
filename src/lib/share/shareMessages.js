// Pre-written WhatsApp share messages (bilingual — picks the current language).
// This is an i18n content source (like disclaimers.js) so it may hold Devanagari.
// NOTE: Drone Didi uses a satellite/tech glyph, never a helicopter.
import { CATEGORY_META } from '../listings/catalog'

const EMOJI = {
  land: '🌾', equipment: '🚜', labor: '👷', drone_didi: '🛰️',
  bhusa: '🌿', agri_inputs: '🌱', warehouse: '🏬',
}

const offerReqWord = (type, lang) =>
  lang === 'hi' ? (type === 'offer' ? 'उपलब्ध' : 'चाहिए') : (type === 'offer' ? 'available' : 'wanted')

// A short, best-effort key detail from the category's details JSONB.
function keyDetail(listing, lang) {
  const d = listing.details || {}
  const acre = lang === 'hi' ? 'एकड़' : 'acre'
  const qtl = lang === 'hi' ? 'क्विंटल' : 'qtl'
  switch (listing.category) {
    case 'land': return d.size_range ? `${d.size_range} ${acre}` : ''
    case 'equipment': return d.rate_amount || ''
    case 'labor': return d.worker_count ? `${d.worker_count}` : ''
    case 'drone_didi': return d.rate_per_acre || ''
    case 'bhusa': return d.asking_price || ''
    case 'agri_inputs': return d.item_name || d.business_name || ''
    case 'warehouse': return d.capacity_quintals ? `${d.capacity_quintals} ${qtl}` : ''
    default: return ''
  }
}

export function generateListingMessage(listing, url, lang) {
  const emoji = EMOJI[listing.category] || '📍'
  const cat = CATEGORY_META[listing.category]?.[lang] || listing.category
  const oreq = offerReqWord(listing.listing_type, lang)
  const detail = keyDetail(listing, lang)
  const suffix = lang === 'hi' ? 'किसान सहयोग पर देखें' : 'View on Kisan Sahyog'
  const parts = [`${emoji} ${cat} ${oreq}`, detail, listing.pincode].filter(Boolean).join(' — ')
  return `${parts} | ${suffix}: ${url}`
}

export function generatePlatformMessage(lang) {
  return lang === 'hi'
    ? 'किसान सहयोग — ज़मीन, उपकरण, मज़दूर, ड्रोन दीदी और कृषि सामग्री के लिए सीधा संपर्क। kissansahyog.com पर जोड़ें।'
    : 'Kisan Sahyog — direct connections for land, equipment, labor, drone services and farm supplies. Join at kissansahyog.com'
}

export function generateArticleMessage(title, url, lang) {
  const read = lang === 'hi' ? 'किसान सहयोग पर पढ़ें' : 'Read on Kisan Sahyog'
  return `${title} — ${read}: ${url}`
}

// Direct wa.me URL for a listing card's share button (simple fixed-format message).
export function whatsappListingUrl(listing) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kissansahyog.com'
  const url = `${origin}/listing/${listing.id}`
  const msg = `किसान सहयोग पर देखें — ${listing.title || listing.category}: ${url}`
  return `https://wa.me/?text=${encodeURIComponent(msg)}`
}
