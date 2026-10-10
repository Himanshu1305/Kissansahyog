import { supabase } from '../supabaseClient'

const BUCKET = 'listing-photos'
export const MAX_PHOTOS = 3

function photoError(i18nKey) { const error = new Error(i18nKey); error.i18nKey = i18nKey; return error }

async function compressPhoto(file) {
  if (!/^(image\/(jpeg|png|webp))$/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) throw photoError('photo_unsupported')
  const source = await createImageBitmap(file).catch(() => { throw photoError('photo_unsupported') })
  const scale = Math.min(1, 1600 / Math.max(source.width, source.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(source.width * scale)); canvas.height = Math.max(1, Math.round(source.height * scale))
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height); source.close?.()
  const encode = (quality) => new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  let blob = await encode(0.8)
  for (let quality = 0.7; blob && blob.size > 300 * 1024 && quality >= 0.5; quality -= 0.1) blob = await encode(quality)
  if (!blob) throw photoError('photo_unsupported')
  return blob
}

// Upload compressed JPEGs before listing creation. A failure throws so callers
// keep their form intact; paths are isolated under one random listing batch id.
export async function uploadPhotos(files, actorId, limit = MAX_PHOTOS, pathPrefix = 'listings') {
  const list = Array.from(files || []).slice(0, limit)
  const urls = []
  const batchId = crypto.randomUUID()
  for (let index = 0; index < list.length; index += 1) {
    const file = await compressPhoto(list[index])
    const path = `${pathPrefix}/${batchId}/${index}.jpg`
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
