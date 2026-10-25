import { supabase } from '../supabaseClient'

// Batch 14A - announcement picture upload. Same bucket and rules as listing photos (jpeg / png / webp in, a JPEG out),
// under the announcements/ prefix, resized to about 640 px wide and 300 KB or less.
const BUCKET = 'listing-photos'
export const MAX_BYTES = 300 * 1024
export const MAX_WIDTH = 640

function uploadError(i18nKey) { const e = new Error(i18nKey); e.i18nKey = i18nKey; return e }

export async function compressAnnouncementImage(file) {
  if (!/^(image\/(jpeg|png|webp))$/i.test(file.type)) throw uploadError('photo_unsupported')
  const source = await createImageBitmap(file).catch(() => { throw uploadError('photo_unsupported') })
  const scale = Math.min(1, MAX_WIDTH / source.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(source.width * scale)); canvas.height = Math.max(1, Math.round(source.height * scale))
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height); source.close?.()
  const encode = (q) => new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', q))
  let blob = await encode(0.82)
  for (let q = 0.72; blob && blob.size > MAX_BYTES && q >= 0.4; q -= 0.1) blob = await encode(q)
  if (!blob || blob.size > MAX_BYTES) throw uploadError('photo_unsupported')
  return blob
}

export async function uploadAnnouncementImage(file) {
  const blob = await compressAnnouncementImage(file)
  const path = `announcements/${crypto.randomUUID()}/0.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
