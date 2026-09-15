// Public article data access. Anon may read PUBLISHED articles only (RLS). Admin
// writes go through the admin RPCs (see src/lib/admin/adminApi.js).
import { supabase } from '../supabaseClient'
import { toAppError } from '../errors'

export async function fetchPublishedArticles() {
  const { data, error } = await supabase
    .from('articles')
    .select('id,slug,title_hi,title_en,summary_hi,summary_en,author_name,cover_image_url,published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
  if (error) throw toAppError(error)
  return data || []
}

export async function fetchArticleBySlug(slug) {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()
  if (error) throw toAppError(error)
  return data
}

export const articleTitle = (a, lang) => (lang === 'hi' ? a.title_hi : a.title_en) || a.title_en || a.title_hi
export const articleSummary = (a, lang) => (lang === 'hi' ? a.summary_hi : a.summary_en) || ''
export const articleContent = (a, lang) => (lang === 'hi' ? a.content_hi : a.content_en) || a.content_en || a.content_hi || ''
