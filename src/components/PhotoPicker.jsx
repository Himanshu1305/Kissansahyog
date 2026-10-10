import { useEffect, useRef, useState } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'

export default function PhotoPicker({ files = [], onChange, limit = 3, className = '' }) {
  const { t } = useLang()
  const inputRef = useRef(null)
  const [error, setError] = useState('')
  const [urls, setUrls] = useState([])
  useEffect(() => {
    const next = files.map((file) => URL.createObjectURL(file))
    setUrls(next)
    return () => next.forEach(URL.revokeObjectURL)
  }, [files])
  function pick(event) {
    const selected = Array.from(event.target.files || [])
    const supported = selected.filter((file) => /^(image\/(jpeg|png|webp))$/i.test(file.type) && !/\.hei[cf]$/i.test(file.name))
    if (supported.length !== selected.length) setError(t('photo_unsupported'))
    const room = Math.max(0, limit - files.length)
    if (selected.length > room) setError(t('photo_limit_reached'))
    if (supported.length && room) onChange([...files, ...supported.slice(0, room)])
    event.target.value = ''
  }
  return <section className={`rounded-2xl border-2 border-stone-200 bg-white p-3 ${className}`} aria-label={t('field_photos')}>
    <div className="flex items-center justify-between gap-2"><div><p className="font-bold text-stone-900">{t('field_photos')}</p><p className="text-sm text-stone-600">{files.length}/{limit} · {t('photos_help')}</p></div><button type="button" onClick={() => inputRef.current?.click()} disabled={files.length >= limit} className="min-h-[44px] rounded-xl bg-green-700 px-3 py-2 font-bold text-white disabled:opacity-50">{t('photo_add')}</button></div>
    <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" onChange={pick} />
    {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
    {files.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{files.map((file, index) => <div key={`${file.name}-${index}`} className="overflow-hidden rounded-xl border border-stone-200"><img src={urls[index]} alt={`${t('field_photos')} ${index + 1}`} className="h-24 w-full object-cover" /><div className="flex gap-1 p-1 text-xs"><button type="button" onClick={() => index && onChange([files[index], ...files.filter((_, i) => i !== index)])} className="flex-1 rounded bg-green-50 px-1 py-1 font-semibold text-green-800">{t('photo_make_cover')}</button><button type="button" onClick={() => onChange(files.filter((_, i) => i !== index))} className="rounded bg-red-50 px-2 py-1 font-semibold text-red-700" aria-label={`${t('photo_remove')} ${index + 1}`}>×</button></div></div>)}</div>}
  </section>
}
