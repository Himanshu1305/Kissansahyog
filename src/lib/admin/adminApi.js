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

// Slugify an English title for the article slug field.
export const slugify = (s) =>
  String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
