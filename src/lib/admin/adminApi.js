// Admin data access. Every call goes through a SECURITY DEFINER RPC that verifies
// the acting profile has is_admin = true server-side (a non-admin gets an error,
// never data). The anon key is used, but the RPCs run as owner — the anon key
// itself can never read all users' phones/emails directly.
import { supabase } from '../supabaseClient'
import { toAppError } from '../errors'

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw toAppError(error)
  return data
}

export const getAdminStats = (actorId) => rpc('get_admin_stats', { p_actor_id: actorId })
export const getAdminListings = (actorId, limit = 20, offset = 0) =>
  rpc('get_admin_listings', { p_actor_id: actorId, p_limit: limit, p_offset: offset })
export const getAdminUsers = (actorId, { limit = 25, offset = 0, search = '' } = {}) =>
  rpc('get_admin_users', { p_actor_id: actorId, p_limit: limit, p_offset: offset, p_search: search })
export const removeListing = (actorId, listingId) =>
  rpc('remove_listing', { p_actor_id: actorId, p_listing_id: listingId })

export const adminListExperts = (actorId) => rpc('admin_list_experts', { p_actor_id: actorId })
export const adminSetExpertActive = (actorId, expertId, active) =>
  rpc('admin_set_expert_active', { p_actor_id: actorId, p_expert_id: expertId, p_active: active })
export const adminUpsertExpert = (actorId, e) =>
  rpc('admin_upsert_expert', {
    p_actor_id: actorId, p_id: e.id ?? null, p_name: e.name, p_name_hi: e.name_hi ?? null,
    p_specialisation_en: e.specialisation_en ?? null, p_specialisation_hi: e.specialisation_hi ?? null,
    p_bio_en: e.bio_en ?? null, p_bio_hi: e.bio_hi ?? null, p_phone: e.phone,
    p_organisation: e.organisation ?? null, p_is_active: e.is_active ?? true,
  })

export const getAdminArticles = (actorId) => rpc('get_admin_articles', { p_actor_id: actorId })
export const adminUpsertArticle = (actorId, a) =>
  rpc('admin_upsert_article', {
    p_actor_id: actorId, p_id: a.id ?? null, p_slug: a.slug, p_title_hi: a.title_hi, p_title_en: a.title_en,
    p_summary_hi: a.summary_hi ?? null, p_summary_en: a.summary_en ?? null,
    p_content_hi: a.content_hi, p_content_en: a.content_en,
    p_author_name: a.author_name ?? 'Team Kisan Sahyog', p_cover_image_url: a.cover_image_url ?? null,
    p_is_published: a.is_published ?? false,
  })
export const adminDeleteArticle = (actorId, id) => rpc('admin_delete_article', { p_actor_id: actorId, p_id: id })

export const getAdminMsp = (actorId) => rpc('get_admin_msp', { p_actor_id: actorId })
export const adminSetMspActive = (actorId, id, active) =>
  rpc('admin_set_msp_active', { p_actor_id: actorId, p_id: id, p_active: active })
export const adminUpsertMsp = (actorId, m) =>
  rpc('admin_upsert_msp', {
    p_actor_id: actorId, p_id: m.id ?? null, p_crop_en: m.crop_en, p_crop_hi: m.crop_hi,
    p_variety: m.variety ?? null, p_season: m.season, p_marketing_year: m.marketing_year,
    p_msp_per_quintal: Number(m.msp_per_quintal) || 0, p_increase_from_previous: m.increase_from_previous === '' || m.increase_from_previous == null ? null : Number(m.increase_from_previous),
    p_is_active: m.is_active ?? true,
  })

export const getAdminSourceStats = (actorId) => rpc('get_admin_source_stats', { p_actor_id: actorId })
export const getAdminVendorListings = (actorId) => rpc('get_admin_vendor_listings', { p_actor_id: actorId })

export const getAdminResources = (actorId) => rpc('get_admin_resources', { p_actor_id: actorId })
export const adminSetResourceActive = (actorId, id, active) =>
  rpc('admin_set_resource_active', { p_actor_id: actorId, p_id: id, p_active: active })
export const adminUpsertResource = (actorId, r) =>
  rpc('admin_upsert_resource', {
    p_actor_id: actorId, p_id: r.id ?? null, p_resource_type: r.resource_type,
    p_name_hi: r.name_hi, p_name_en: r.name_en, p_description_hi: r.description_hi ?? null, p_description_en: r.description_en ?? null,
    p_address_hi: r.address_hi ?? null, p_address_en: r.address_en ?? null, p_district: r.district ?? 'Sagar', p_area: r.area ?? null,
    p_phone_primary: r.phone_primary ?? null, p_phone_secondary: r.phone_secondary ?? null, p_phone_tollfree: r.phone_tollfree ?? null,
    p_email: r.email ?? null, p_website: r.website ?? null, p_timings_hi: r.timings_hi ?? null, p_timings_en: r.timings_en ?? null,
    p_is_active: r.is_active ?? true, p_sort_order: r.sort_order ?? 0,
  })

// --- Community: Kisan Sawaal (Q&A) ----------------------------------------
export const getAdminSawaal = (actorId) => rpc('get_admin_sawaal', { p_actor_id: actorId })
export const adminAnswerSawaal = (actorId, s) =>
  rpc('admin_answer_sawaal', {
    p_actor_id: actorId, p_id: s.id, p_answer_hi: s.answer_hi ?? null, p_answer_en: s.answer_en ?? null,
    p_answered_by: s.answered_by ?? 'Team Kisan Sahyog', p_is_published: s.is_published ?? false,
  })
export const adminSetSawaalFeatured = (actorId, id, featured) =>
  rpc('admin_set_sawaal_featured', { p_actor_id: actorId, p_id: id, p_featured: featured })
export const adminSetSawaalPublished = (actorId, id, published) =>
  rpc('admin_set_sawaal_published', { p_actor_id: actorId, p_id: id, p_published: published })
export const adminDeleteSawaal = (actorId, id) => rpc('admin_delete_sawaal', { p_actor_id: actorId, p_id: id })

// --- Community: Kisan Safalta (success stories) ---------------------------
export const getAdminSafalta = (actorId) => rpc('get_admin_safalta', { p_actor_id: actorId })
export const adminUpsertSafalta = (actorId, s) =>
  rpc('admin_upsert_safalta', {
    p_actor_id: actorId, p_id: s.id ?? null, p_farmer_name: s.farmer_name, p_village: s.village ?? '',
    p_district: s.district ?? 'Sagar', p_crop_or_activity: s.crop_or_activity ?? '', p_story_hi: s.story_hi,
    p_story_en: s.story_en ?? null, p_income_before: s.income_before ?? null, p_income_after: s.income_after ?? null,
    p_how_helped_hi: s.how_helped_hi, p_how_helped_en: s.how_helped_en ?? null, p_photo_url: s.photo_url ?? null,
    p_is_published: s.is_published ?? false, p_is_featured: s.is_featured ?? false,
  })
export const adminSetSafaltaPublished = (actorId, id, published) =>
  rpc('admin_set_safalta_published', { p_actor_id: actorId, p_id: id, p_published: published })
export const adminSetSafaltaFeatured = (actorId, id, featured) =>
  rpc('admin_set_safalta_featured', { p_actor_id: actorId, p_id: id, p_featured: featured })
export const adminDeleteSafalta = (actorId, id) => rpc('admin_delete_safalta', { p_actor_id: actorId, p_id: id })

// --- Community: Sarkari Yojana (schemes) ----------------------------------
export const getAdminYojana = (actorId) => rpc('get_admin_yojana', { p_actor_id: actorId })
export const adminSetYojanaActive = (actorId, id, active) =>
  rpc('admin_set_yojana_active', { p_actor_id: actorId, p_id: id, p_active: active })
export const adminSetYojanaFeatured = (actorId, id, featured) =>
  rpc('admin_set_yojana_featured', { p_actor_id: actorId, p_id: id, p_featured: featured })
export const adminUpsertYojana = (actorId, y) =>
  rpc('admin_upsert_yojana', {
    p_actor_id: actorId, p_id: y.id ?? null, p_scheme_name_hi: y.scheme_name_hi, p_scheme_name_en: y.scheme_name_en,
    p_ministry_hi: y.ministry_hi ?? null, p_ministry_en: y.ministry_en ?? null, p_category: y.category,
    p_description_hi: y.description_hi, p_description_en: y.description_en, p_benefit_hi: y.benefit_hi, p_benefit_en: y.benefit_en,
    p_eligibility_hi: y.eligibility_hi, p_eligibility_en: y.eligibility_en, p_how_to_apply_hi: y.how_to_apply_hi ?? null,
    p_how_to_apply_en: y.how_to_apply_en ?? null, p_official_website: y.official_website ?? null, p_helpline: y.helpline ?? null,
    p_deadline_note_hi: y.deadline_note_hi ?? null, p_deadline_note_en: y.deadline_note_en ?? null,
    p_is_active: y.is_active ?? true, p_is_featured: y.is_featured ?? false, p_sort_order: Number(y.sort_order) || 0,
    // Phase 3e — individual-scheme-page fields
    p_slug: y.slug ?? null, p_government_level: y.government_level ?? 'central',
    p_faqs: Array.isArray(y.faqs) ? y.faqs : [],
    p_documents_required_hi: y.documents_required_hi ?? null, p_documents_required_en: y.documents_required_en ?? null,
    p_source_url: y.source_url ?? null, p_last_verified_date: y.last_verified_date || null,
  })

// Slugify an English title for the article slug field.
export const slugify = (s) =>
  String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// --- 0024: mausam/msp admin (subscriptions, procurement, page FAQs, data health) ---
export const getAdminSubscriptions = (actorId) => rpc('get_admin_subscriptions', { p_actor_id: actorId })
export const adminSetSubscriptionActive = (actorId, id, active) => rpc('admin_set_subscription_active', { p_actor_id: actorId, p_id: id, p_active: active })

export const getAdminProcurement = (actorId) => rpc('get_admin_procurement', { p_actor_id: actorId })
export const adminUpsertProcurement = (actorId, p) => rpc('admin_upsert_procurement', {
  p_actor_id: actorId, p_id: p.id ?? null, p_name_hi: p.name_hi, p_location: p.location ?? null,
  p_district: p.district ?? 'Sagar', p_crops: p.crops ?? [], p_season: p.season ?? null,
  p_registration_open: p.registration_open || null, p_registration_close: p.registration_close || null,
  p_procurement_from: p.procurement_from || null, p_procurement_to: p.procurement_to || null,
  p_portal_url: p.portal_url ?? null, p_notes_hi: p.notes_hi ?? null, p_is_active: p.is_active ?? true,
})
export const adminDeleteProcurement = (actorId, id) => rpc('admin_delete_procurement', { p_actor_id: actorId, p_id: id })

export const getAdminPageFaqs = (actorId, page = null) => rpc('get_admin_page_faqs', { p_actor_id: actorId, p_page: page })
export const adminUpsertPageFaq = (actorId, f) => rpc('admin_upsert_page_faq', {
  p_actor_id: actorId, p_id: f.id ?? null, p_page_key: f.page_key, p_q_hi: f.q_hi, p_q_en: f.q_en ?? null,
  p_a_hi: f.a_hi, p_a_en: f.a_en ?? null, p_sort_order: Number(f.sort_order) || 0,
})
export const adminDeletePageFaq = (actorId, id) => rpc('admin_delete_page_faq', { p_actor_id: actorId, p_id: id })

export const getAdminDataHealth = (actorId) => rpc('get_admin_data_health', { p_actor_id: actorId })
export const adminSetSiteSetting = (actorId, key, value) => rpc('admin_set_site_setting', { p_actor_id: actorId, p_key: key, p_value: value })
