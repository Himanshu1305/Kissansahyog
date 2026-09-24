// Photo credits — renders public/images/home/manifest.json (fetched at runtime).
// Linked from the homepage footer ("फोटो श्रेय").
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import NavBar from '../components/NavBar'

export default function Credits() {
  const { t } = useLang()
  const navigate = useNavigate()
  const [items, setItems] = useState([])

  useEffect(() => {
    let alive = true
    fetch('/images/home/manifest.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => alive && setItems(Array.isArray(d) ? d : []))
      .catch(() => alive && setItems([]))
    return () => { alive = false }
  }, [])

  return (
    <div className="min-h-screen" style={{ background: 'var(--ks-bg)' }}>
      <NavBar />
      <div style={{ padding: '20px var(--ks-gutter)' }}>
        <h1 className="text-[28px] font-extrabold" style={{ color: 'var(--ks-ink)' }}>{t('credits_title')}</h1>
        <p className="mt-1 text-[15px]" style={{ color: 'var(--ks-ink-2)' }}>{t('credits_intro')}</p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {items.map((im) => (
            <div key={im.file} className="flex gap-3" style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)', padding: '10px' }}>
              <img src={`/images/home/${im.file}`} alt="" loading="lazy" className="h-16 w-20 shrink-0 rounded-md object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
              <div className="min-w-0 text-[13px]">
                <div className="font-bold" style={{ color: 'var(--ks-ink)' }}>{im.file}</div>
                <div style={{ color: 'var(--ks-ink-2)' }}>{im.description}</div>
                <div className="mt-1" style={{ color: 'var(--ks-ink-3)' }}>
                  {im.author}{im.author ? ' · ' : ''}{im.license}
                  {im.page && (<> · <a href={im.page} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ks-green)' }}>source</a></>)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={() => navigate('/')} className="mt-6 rounded-lg px-4 py-2 text-[15px] font-bold text-white" style={{ background: 'var(--ks-green)' }}>← {t('back')}</button>
      </div>
    </div>
  )
}
