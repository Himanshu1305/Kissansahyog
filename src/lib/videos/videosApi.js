// Public read of the admin-managed farming video library (migration 0023).
// RLS exposes only is_active rows. Thumbnails are self-hosted.
import { supabase } from '../supabaseClient'

export async function fetchVideos() {
  const { data, error } = await supabase
    .from('videos').select('*').eq('is_active', true).order('sort_order', { ascending: true })
  if (error) return []
  return data || []
}

export async function fetchFeaturedVideos(limit = 3) {
  const { data, error } = await supabase
    .from('videos').select('*').eq('is_active', true).eq('is_featured', true)
    .order('sort_order', { ascending: true }).limit(limit)
  if (error) return []
  return data || []
}

export async function fetchVideoById(id) {
  if (!id) return null
  const { data, error } = await supabase.from('videos').select('*').eq('id', id).maybeSingle()
  if (error) return null
  return data
}

export const videoTitle = (v, lang) => (lang === 'hi' ? (v.title_hi || v.title_en) : (v.title_en || v.title_hi)) || ''
export const videoWatchUrl = (v) => `https://www.youtube.com/watch?v=${v.youtube_id}`
export const videoThumb = (v) => v.thumbnail_url || `/images/videos/${v.youtube_id}.jpg`
