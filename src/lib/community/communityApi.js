// Public data access for the community features (Kisan Sawaal Q&A, Kisan Safalta
// success stories, Sarkari Yojana schemes). Anon reads published/active rows only
// (RLS). Question + story submissions INSERT via the anon client but RLS forces
// is_published = false, so they are invisible until an admin publishes them. Admin
// writes go through the is_admin-checked RPCs in src/lib/admin/adminApi.js.
import { supabase } from '../supabaseClient'
import { toAppError, AppError } from '../errors'

// --- Kisan Sawaal (Q&A) ----------------------------------------------------
export async function fetchPublishedSawaal() {
  const { data, error } = await supabase
    .from('kisan_sawaal')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
  if (error) throw toAppError(error)
  return data || []
}

export async function fetchFeaturedSawaal(limit = 2) {
  const { data, error } = await supabase
    .from('kisan_sawaal')
    .select('id,question_hi,question_en,answer_hi,answer_en,category,asked_by_village,answered_by')
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('answered_at', { ascending: false })
    .limit(limit)
  if (error) throw toAppError(error)
  return data || []
}

// Submit a question for admin review. Never published on insert (RLS enforces).
export async function submitSawaal({ question_hi, asked_by_name, asked_by_village, category, photo_url }) {
  if (!question_hi || !question_hi.trim()) throw new AppError('question_required')
  // When no name is given, omit the column so the DB default (a Hindi "Kisan")
  // applies — keeps this file free of hardcoded Devanagari (bilingual audit).
  const row = {
    question_hi: question_hi.trim(),
    asked_by_village: asked_by_village?.trim() || null,
    category: category || 'general',
    is_published: false,
  }
  if (asked_by_name && asked_by_name.trim()) row.asked_by_name = asked_by_name.trim()
  if (photo_url) row.photo_url = photo_url // Phase 4 §8 — optional attached photo
  const { error } = await supabase.from('kisan_sawaal').insert(row)
  if (error) throw toAppError(error)
  return true
}

// --- Kisan Safalta (success stories) --------------------------------------
export async function fetchPublishedSafalta() {
  const { data, error } = await supabase
    .from('kisan_safalta')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
  if (error) throw toAppError(error)
  return data || []
}

export async function fetchFeaturedSafalta(limit = 3) {
  const { data, error } = await supabase
    .from('kisan_safalta')
    .select('*')
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('published_at', { ascending: false })
    .limit(limit)
  if (error) throw toAppError(error)
  return data || []
}

// Submit a success story for admin review. Never published/featured on insert.
export async function submitSafalta({ farmer_name, village, crop_or_activity, story_hi, contact_phone }) {
  if (!farmer_name || !farmer_name.trim()) throw new AppError('name_required')
  if (!story_hi || !story_hi.trim()) throw new AppError('story_required')
  const { error } = await supabase.from('kisan_safalta').insert({
    farmer_name: farmer_name.trim(),
    village: village?.trim() || '—',
    crop_or_activity: crop_or_activity?.trim() || '—',
    story_hi: story_hi.trim(),
    how_helped_hi: '—', // required NOT NULL; admin fills the real value on review
    contact_phone: contact_phone?.trim() || null,
    is_published: false,
    is_featured: false,
  })
  if (error) throw toAppError(error)
  return true
}

// --- Sarkari Yojana (schemes) ---------------------------------------------
export async function fetchActiveYojana() {
  const { data, error } = await supabase
    .from('sarkari_yojana')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) throw toAppError(error)
  return data || []
}

export async function fetchFeaturedYojana(limit = 3) {
  const { data, error } = await supabase
    .from('sarkari_yojana')
    .select('*')
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('sort_order', { ascending: true })
    .limit(limit)
  if (error) throw toAppError(error)
  return data || []
}

// --- Bilingual field pickers (Hindi default, English fallback) -------------
const pick = (hi, en) => hi || en || ''
export const sawaalQuestion = (r, lang) => (lang === 'hi' ? pick(r.question_hi, r.question_en) : pick(r.question_en, r.question_hi))
export const sawaalAnswer = (r, lang) => (lang === 'hi' ? pick(r.answer_hi, r.answer_en) : pick(r.answer_en, r.answer_hi))
export const safaltaStory = (r, lang) => (lang === 'hi' ? pick(r.story_hi, r.story_en) : pick(r.story_en, r.story_hi))
export const safaltaHelped = (r, lang) => (lang === 'hi' ? pick(r.how_helped_hi, r.how_helped_en) : pick(r.how_helped_en, r.how_helped_hi))
export const yojanaName = (r, lang) => (lang === 'hi' ? pick(r.scheme_name_hi, r.scheme_name_en) : pick(r.scheme_name_en, r.scheme_name_hi))
export const yojanaMinistry = (r, lang) => (lang === 'hi' ? pick(r.ministry_hi, r.ministry_en) : pick(r.ministry_en, r.ministry_hi))
export const yojanaDesc = (r, lang) => (lang === 'hi' ? pick(r.description_hi, r.description_en) : pick(r.description_en, r.description_hi))
export const yojanaBenefit = (r, lang) => (lang === 'hi' ? pick(r.benefit_hi, r.benefit_en) : pick(r.benefit_en, r.benefit_hi))
export const yojanaEligibility = (r, lang) => (lang === 'hi' ? pick(r.eligibility_hi, r.eligibility_en) : pick(r.eligibility_en, r.eligibility_hi))
export const yojanaHowTo = (r, lang) => (lang === 'hi' ? pick(r.how_to_apply_hi, r.how_to_apply_en) : pick(r.how_to_apply_en, r.how_to_apply_hi))
export const yojanaDeadline = (r, lang) => (lang === 'hi' ? pick(r.deadline_note_hi, r.deadline_note_en) : pick(r.deadline_note_en, r.deadline_note_hi))
