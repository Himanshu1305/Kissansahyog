import { supabase } from '../supabaseClient'

const BUCKET = 'listing-photos'
export const MAX_PHOTOS = 3

// Upload up to MAX_PHOTOS image files, return their public URLs. Best-effort:
// a failed upload throws so the caller can surface it. Files are namespaced by
// actor id + timestamp to avoid collisions.
export async function uploadPhotos(files, actorId) {
  const list = Array.from(files || []).slice(0, MAX_PHOTOS)
  const urls = []
  for (const file of list) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${actorId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/jpeg',
    })
    if (error) throw error
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    urls.push(data.publicUrl)
  }
  return urls
}
