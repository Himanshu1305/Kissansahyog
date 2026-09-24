// Public videos page — /videos. Grid of all active farming videos, filterable by
// category tab. Cards link out to YouTube (opens the app on phones); no iframes.
import { useEffect, useMemo, useState } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'
import NavBar from '../components/NavBar'
import { Spinner } from '../components/ui'
import { fetchVideos, videoTitle, videoWatchUrl, videoThumb } from '../lib/videos/videosApi'

const CATS = ['all', 'pest', 'sowing', 'irrigation', 'drone', 'scheme', 'market', 'general']

export default function Videos() {
  const { t, lang } = useLang()
  const [rows, setRows] = useState(null)
  const [cat, setCat] = useState('all')

  useEffect(() => {
    let alive = true
    fetchVideos().then((r) => alive && setRows(r)).catch(() => alive && setRows([]))
    return () => { alive = false }
  }, [])

  const present = useMemo(() => new Set((rows || []).map((r) => r.category)), [rows])
  const cats = CATS.filter((c) => c === 'all' || present.has(c))
  const shown = (rows || []).filter((r) => cat === 'all' || r.category === cat)

  return (
    <div className="min-h-screen" style={{ background: 'var(--ks-bg)' }}>
      <NavBar />
      <div style={{ padding: '16px var(--ks-gutter)' }}>
        <h1 className="text-[28px] font-extrabold" style={{ color: 'var(--ks-ink)' }}>{t('videos_page_title')}</h1>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {cats.map((c) => (
            <button key={c} type="button" onClick={() => setCat(c)}
              className="whitespace-nowrap rounded-full border px-3 py-1.5 text-[14px] font-bold"
              style={cat === c ? { background: 'var(--ks-green)', color: '#fff', borderColor: 'var(--ks-green)' } : { background: '#fff', color: 'var(--ks-ink-2)', borderColor: 'var(--ks-border-strong)' }}>
              {c === 'all' ? t('videos_all') : t(`vcat_${c}`)}
            </button>
          ))}
        </div>

        {rows === null ? <Spinner /> : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((v) => (
              <a key={v.id} href={videoWatchUrl(v)} target="_blank" rel="noopener noreferrer" className="flex flex-col overflow-hidden" style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)' }}>
                <div className="relative w-full" style={{ height: 170, background: 'var(--ks-green-dark)' }}>
                  <img src={videoThumb(v)} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(0,0,0,.55)' }} aria-hidden="true">
                      <span className="ml-1 border-y-[9px] border-l-[15px] border-y-transparent border-l-white" />
                    </span>
                  </span>
                  {v.duration && <span className="absolute bottom-2 right-2 rounded px-1.5 py-0.5 text-[13px] font-bold text-white" style={{ background: 'rgba(0,0,0,.7)' }}>{v.duration}</span>}
                  <span className="absolute left-2 top-2 rounded px-1.5 py-0.5 text-[12px] font-bold" style={{ background: 'var(--ks-saffron-tint)', color: 'var(--ks-orange-dark)' }}>{t(`vcat_${v.category}`)}</span>
                </div>
                <div className="p-3">
                  <div className="text-[16px] font-bold leading-tight" style={{ color: 'var(--ks-ink)' }}>{videoTitle(v, lang)}</div>
                  <div className="mt-1 text-[14px]" style={{ color: 'var(--ks-ink-3)' }}>▶ {v.channel_name}</div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
