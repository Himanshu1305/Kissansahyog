// Admin data access. Every call goes through a SECURITY DEFINER RPC that verifies
// the acting profile has is_admin = true server-side (a non-admin gets an error,
// never data). The anon key is used, but the RPCs run as owner — the anon key
// itself can never read all users' phones/emails directly.
import { supabase } from '../supabaseClient'
import { toAppError } from '../errors'
import { removeListingPhotos } from '../listings/listingsApi'
import { makeWithLog, LOG_FAILED_EVENT } from './withLog'

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw toAppError(error)
  return data
}


// withLog(action, targetType, fn, describe): see ./withLog.js. Bound here to the real database call.
export { LOG_FAILED_EVENT }
export const withLog = (action, targetType, fn, describe) => makeWithLog(action, targetType, fn, describe, rpc)

export const getAdminStats = (actorId) => rpc('get_admin_stats', { p_actor_id: actorId })
export const getAdminListings = (actorId, limit = 20, offset = 0) =>
  rpc('get_admin_listings', { p_actor_id: actorId, p_limit: limit, p_offset: offset })
export const getAdminUsers = (actorId, { limit = 25, offset = 0, search = '' } = {}) =>
  rpc('get_admin_users', { p_actor_id: actorId, p_limit: limit, p_offset: offset, p_search: search })
const removeListingRaw = (actorId, listingId) =>
  rpc('remove_listing', { p_actor_id: actorId, p_listing_id: listingId })

// Batch 10G — admin disable / enable (reason required to disable) and PERMANENT delete (reason required;
// writes the admin action log; the photo files are removed right after, see listingsApi).
// Errors keep the RPC's code (not_admin, not_found, invalid_state, reason_required, reason_too_long).
async function listingAdminRpc(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) {
    const m = String(error.message || '').match(/not_admin|not_found|invalid_state|reason_required|reason_too_long/)
    throw Object.assign(new Error(m ? m[0] : 'unknown'), { code: m ? m[0] : 'unknown' })
  }
  return data
}
export const adminSetListingDisabled = (actorId, listingId, disabled, reason) =>
  listingAdminRpc('admin_set_listing_disabled', { p_actor_id: actorId, p_listing_id: listingId, p_disabled: !!disabled, p_reason: reason ?? null })
export async function adminDeleteListing(actorId, listingId, reason) {
  const paths = await listingAdminRpc('admin_delete_listing', { p_actor_id: actorId, p_listing_id: listingId, p_reason: reason })
  const photos = await removeListingPhotos(paths)
  return { paths: paths || [], photosRemoved: photos.removed }
}

// Phase 4 — complaints queue + sponsored toggle.
export const getListingReports = (actorId, status = 'open') =>
  rpc('get_listing_reports', { p_actor_id: actorId, p_status: status, p_limit: 100 })
const resolveListingReportRaw = (actorId, reportId, action, resolutionNote = null) =>
  rpc('resolve_listing_report', { p_actor_id: actorId, p_report_id: reportId, p_action: action, p_resolution_note: resolutionNote })
const adminSetListingSponsoredRaw = (actorId, listingId, sponsored) =>
  rpc('admin_set_listing_sponsored', { p_actor_id: actorId, p_listing_id: listingId, p_sponsored: sponsored })

// Phase 6 — cold storage directory claims.
export const getCsClaims = (actorId, status = 'pending') =>
  rpc('get_cs_claims', { p_actor_id: actorId, p_status: status })
export const resolveCsClaim = (actorId, claimId, approve) =>
  rpc('resolve_cs_claim', { p_actor_id: actorId, p_claim_id: claimId, p_approve: approve })

// Phase 10 — zero-result search log.
export const getSearchMisses = (actorId) => rpc('get_search_misses', { p_actor_id: actorId, p_limit: 100 })

// Phase 8 — carbon suggestions moderation.
export const getCarbonSuggestionsAdmin = (actorId, status = 'pending') =>
  rpc('get_carbon_suggestions_admin', { p_actor_id: actorId, p_status: status })
export const resolveCarbonSuggestion = (actorId, id, approve) =>
  rpc('resolve_carbon_suggestion', { p_actor_id: actorId, p_id: id, p_approve: approve })

export const adminListExperts = (actorId) => rpc('admin_list_experts', { p_actor_id: actorId })
const adminSetExpertActiveRaw = (actorId, expertId, active) =>
  rpc('admin_set_expert_active', { p_actor_id: actorId, p_expert_id: expertId, p_active: active })
const adminUpsertExpertRaw = (actorId, e) =>
  rpc('admin_upsert_expert', {
    p_actor_id: actorId, p_id: e.id ?? null, p_name: e.name, p_name_hi: e.name_hi ?? null,
    p_specialisation_en: e.specialisation_en ?? null, p_specialisation_hi: e.specialisation_hi ?? null,
    p_bio_en: e.bio_en ?? null, p_bio_hi: e.bio_hi ?? null, p_phone: e.phone,
    p_organisation: e.organisation ?? null, p_is_active: e.is_active ?? true,
  })

export const getAdminArticles = (actorId) => rpc('get_admin_articles', { p_actor_id: actorId })
const adminUpsertArticleRaw = (actorId, a) =>
  rpc('admin_upsert_article', {
    p_actor_id: actorId, p_id: a.id ?? null, p_slug: a.slug, p_title_hi: a.title_hi, p_title_en: a.title_en,
    p_summary_hi: a.summary_hi ?? null, p_summary_en: a.summary_en ?? null,
    p_content_hi: a.content_hi, p_content_en: a.content_en,
    p_author_name: a.author_name ?? 'Team Kissan Sahyog', p_cover_image_url: a.cover_image_url ?? null,
    p_is_published: a.is_published ?? false,
  })
const adminDeleteArticleRaw = (actorId, id) => rpc('admin_delete_article', { p_actor_id: actorId, p_id: id })

export const getAdminMsp = (actorId) => rpc('get_admin_msp', { p_actor_id: actorId })
export const adminSetMspActive = (actorId, id, active) =>
  rpc('admin_set_msp_active', { p_actor_id: actorId, p_id: id, p_active: active })
const adminUpsertMspRaw = (actorId, m) =>
  rpc('admin_upsert_msp', {
    p_actor_id: actorId, p_id: m.id ?? null, p_crop_en: m.crop_en, p_crop_hi: m.crop_hi,
    p_variety: m.variety ?? null, p_season: m.season, p_marketing_year: m.marketing_year,
    p_msp_per_quintal: Number(m.msp_per_quintal) || 0, p_increase_from_previous: m.increase_from_previous === '' || m.increase_from_previous == null ? null : Number(m.increase_from_previous),
    p_is_active: m.is_active ?? true,
  })

// --- Phase 4: availability dashboard / Phase 6: farmer profiles ---
export const getAdminAvailability = (actorId) => rpc('get_admin_availability', { p_actor_id: actorId })
export const getAdminAvailabilityListings = (actorId, category = null) =>
  rpc('get_admin_availability_listings', { p_actor_id: actorId, p_category: category })
export const getAdminFarmerProfiles = (actorId) => rpc('get_admin_farmer_profiles', { p_actor_id: actorId })

export const getAdminSourceStats = (actorId) => rpc('get_admin_source_stats', { p_actor_id: actorId })
export const getAdminVendorListings = (actorId) => rpc('get_admin_vendor_listings', { p_actor_id: actorId })

export const getAdminResources = (actorId) => rpc('get_admin_resources', { p_actor_id: actorId })
export const adminSetResourceActive = (actorId, id, active) =>
  rpc('admin_set_resource_active', { p_actor_id: actorId, p_id: id, p_active: active })
const adminUpsertResourceRaw = (actorId, r) =>
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
const adminAnswerSawaalRaw = (actorId, s) =>
  rpc('admin_answer_sawaal', {
    p_actor_id: actorId, p_id: s.id, p_answer_hi: s.answer_hi ?? null, p_answer_en: s.answer_en ?? null,
    p_answered_by: s.answered_by ?? 'Team Kissan Sahyog', p_is_published: s.is_published ?? false,
  })
export const adminSetSawaalFeatured = (actorId, id, featured) =>
  rpc('admin_set_sawaal_featured', { p_actor_id: actorId, p_id: id, p_featured: featured })
export const adminSetSawaalPublished = (actorId, id, published) =>
  rpc('admin_set_sawaal_published', { p_actor_id: actorId, p_id: id, p_published: published })
export const adminDeleteSawaal = (actorId, id) => rpc('admin_delete_sawaal', { p_actor_id: actorId, p_id: id })

// --- Community: Kisan Safalta (success stories) ---------------------------
export const getAdminSafalta = (actorId) => rpc('get_admin_safalta', { p_actor_id: actorId })
const adminUpsertSafaltaRaw = (actorId, s) =>
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
const adminSetYojanaActiveRaw = (actorId, id, active) =>
  rpc('admin_set_yojana_active', { p_actor_id: actorId, p_id: id, p_active: active })
export const adminSetYojanaFeatured = (actorId, id, featured) =>
  rpc('admin_set_yojana_featured', { p_actor_id: actorId, p_id: id, p_featured: featured })
const adminUpsertYojanaRaw = (actorId, y) =>
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
const adminUpsertProcurementRaw = (actorId, p) => rpc('admin_upsert_procurement', {
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
const adminSetSiteSettingRaw = (actorId, key, value) => rpc('admin_set_site_setting', { p_actor_id: actorId, p_key: key, p_value: value })

// --- Kisan Mela moderation + management ---
export const getAdminMelas = (actorId) => rpc('get_admin_melas', { p_actor_id: actorId })
export const adminSetMelaStatus = (actorId, id, status) => rpc('admin_set_mela_status', { p_actor_id: actorId, p_id: id, p_status: status })
export const adminSetMelaActive = (actorId, id, active) => rpc('admin_set_mela_active', { p_actor_id: actorId, p_id: id, p_active: active })
export const adminDeleteMela = (actorId, id) => rpc('admin_delete_mela', { p_actor_id: actorId, p_id: id })
const adminUpsertMelaRaw = (actorId, m) => rpc('admin_upsert_mela', {
  p_actor_id: actorId, p_id: m.id ?? null,
  p_name_hi: m.name_hi, p_name_en: m.name_en ?? null, p_organizer_name: m.organizer_name ?? null,
  p_venue: m.venue, p_address: m.address ?? null, p_state: m.state, p_district: m.district ?? null,
  p_latitude: m.latitude ?? null, p_longitude: m.longitude ?? null,
  p_event_date_start: m.event_date_start || null, p_event_date_end: m.event_date_end || null,
  p_is_date_confirmed: !!m.is_date_confirmed, p_expected_period: m.expected_period ?? null,
  p_category_tags: m.category_tags ?? [], p_highlights_hi: m.highlights_hi ?? null, p_highlights_en: m.highlights_en ?? null,
  p_contact_name: m.contact_name ?? null, p_contact_number: m.contact_number ?? null, p_source_url: m.source_url,
  p_moderation_status: m.moderation_status ?? 'approved', p_is_active: m.is_active ?? true,
})

// --- Kisan Mela AI-discovery candidates (rejected/unverifiable review + manual publish-anyway) ---
export const getAdminMelaCandidates = (actorId) => rpc('get_admin_mela_candidates', { p_actor_id: actorId })
export const adminPublishCandidate = (actorId, id) => rpc('admin_publish_candidate', { p_actor_id: actorId, p_id: id })

// --- Kisan Mela recent merges (auto-dedup audit) + split (undo a wrong merge) ---
export const getRecentMelaMerges = (actorId) => rpc('get_recent_mela_merges', { p_actor_id: actorId })
export const adminSplitMela = (actorId, id) => rpc('admin_split_mela', { p_actor_id: actorId, p_id: id })

// --- Phase 13: WhatsApp groundwork (adminSetSiteSetting already defined above) ---
export const getWhatsappOptins = (actorId) => rpc('get_whatsapp_optins', { p_actor_id: actorId })

// --- Batch 14A: admin console log. The write wrappers above are wrapped here so each successful write is
// recorded in the admin action log by the console (not by a database trigger). A logging failure never fails the write.
export const removeListing = withLog('listing_remove', 'listing', removeListingRaw, a=>({id:a[0]}))
export const adminSetListingSponsored = withLog('listing_sponsor', 'listing', adminSetListingSponsoredRaw, a=>({id:a[0],details:{sponsored:!!a[1]}}))
export const resolveListingReport = withLog('report_resolve', 'report', resolveListingReportRaw, a=>({id:a[0],details:{action:a[1]}}))
export const adminUpsertArticle = withLog('article_save', 'article', adminUpsertArticleRaw, (a,r)=>({id:a[0]?.id??a[0]?.slug,details:{slug:a[0]?.slug,published:!!a[0]?.is_published}}))
export const adminDeleteArticle = withLog('article_delete', 'article', adminDeleteArticleRaw, a=>({id:a[0]}))
export const adminUpsertExpert = withLog('expert_save', 'expert', adminUpsertExpertRaw, a=>({id:a[0]?.id??null,details:{active:a[0]?.is_active??true}}))
export const adminSetExpertActive = withLog('expert_active', 'expert', adminSetExpertActiveRaw, a=>({id:a[0],details:{active:!!a[1]}}))
export const adminUpsertYojana = withLog('yojana_save', 'yojana', adminUpsertYojanaRaw, a=>({id:a[0]?.id??a[0]?.slug,details:{slug:a[0]?.slug}}))
export const adminSetYojanaActive = withLog('yojana_active', 'yojana', adminSetYojanaActiveRaw, a=>({id:a[0],details:{active:!!a[1]}}))
export const adminUpsertMsp = withLog('msp_save', 'msp', adminUpsertMspRaw, a=>({id:a[0]?.id??null,details:{crop:a[0]?.crop_en}}))
export const adminUpsertResource = withLog('resource_save', 'resource', adminUpsertResourceRaw, a=>({id:a[0]?.id??null,details:{type:a[0]?.resource_type}}))
export const adminAnswerSawaal = withLog('sawaal_answer', 'sawaal', adminAnswerSawaalRaw, a=>({id:a[0]?.id,details:{published:!!a[0]?.is_published}}))
export const adminUpsertSafalta = withLog('safalta_save', 'safalta', adminUpsertSafaltaRaw, a=>({id:a[0]?.id??null,details:{published:!!a[0]?.is_published}}))
export const adminSetSiteSetting = withLog('site_setting', 'setting', adminSetSiteSettingRaw, a=>({id:a[0]}))
export const adminUpsertProcurement = withLog('procurement_save', 'procurement', adminUpsertProcurementRaw, a=>({id:a[0]?.id??null}))
export const adminUpsertMela = withLog('mela_save', 'mela', adminUpsertMelaRaw, a=>({id:a[0]?.id??null,details:{name:a[0]?.name_en||a[0]?.name_hi}}))

// --- Batch 14A: console RPCs (new in migration 0067; every one needs a live session) -----------------------------
export const adminWhoami = (actor) => rpc('admin_whoami', { p_actor: actor })
export const adminListAnnouncements = (actor) => rpc('admin_list_announcements', { p_actor: actor })
export const adminUpsertAnnouncement = (actor, id, data) => rpc('admin_upsert_announcement', { p_actor: actor, p_id: id ?? null, p_data: data })
export const adminDeleteAnnouncement = (actor, id) => rpc('admin_delete_announcement', { p_actor: actor, p_id: id })
export const adminDuplicateAnnouncement = (actor, id) => rpc('admin_duplicate_announcement', { p_actor: actor, p_id: id })
export const adminGetSecurityStatus = (actor) => rpc('admin_get_security_status', { p_actor: actor })
export const adminSetSecurityFlag = (actor, key, value, reason, confirm) =>
  rpc('admin_set_security_flag', { p_actor: actor, p_key: key, p_value: !!value, p_reason: reason, p_confirm: confirm ?? null })
export const adminGetOtpUsage = (actor) => rpc('admin_get_otp_usage', { p_actor: actor })
export const adminListUserStatus = (actor, { search = '', status = 'all', limit = 25, offset = 0 } = {}) =>
  rpc('admin_list_user_status', { p_actor: actor, p_search: search, p_status: status, p_limit: limit, p_offset: offset })
export const adminSetUserBlocked = (actor, userId, blocked, reason) =>
  rpc('admin_set_user_blocked', { p_actor: actor, p_user_id: userId, p_blocked: !!blocked, p_reason: reason })
export const adminSetAdminRole = (actor, userId, role) => rpc('admin_set_admin_role', { p_actor: actor, p_user_id: userId, p_role: role })
export const adminListActions = (actor, { limit = 50, offset = 0, action = null, admin = null } = {}) =>
  rpc('admin_list_actions', { p_actor: actor, p_limit: limit, p_offset: offset, p_action_filter: action || null, p_admin_filter: admin || null })
