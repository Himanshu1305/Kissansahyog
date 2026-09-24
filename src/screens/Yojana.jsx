// Sarkari Yojana directory. Three entry points share this component:
//   /yojana          → both groups stacked (level=null)
//   /yojana/central  → central-only (level='central')
//   /yojana/mp       → MP state-only (level='state')
// Cards link to the individual scheme page /yojana/:slug (Phase 3).
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import NavBar from '../components/NavBar'
import { Notice, Spinner } from '../components/ui'
import { fetchYojanaByLevel, yojanaName, yojanaDesc, yojanaBenefit } from '../lib/community/communityApi'

export default function Yojana({ level = null }) {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    setRows(null)
    fetchYojanaByLevel(level)
      .then((r) => alive && setRows(r))
      .catch((e) => alive && (setError(t(e.i18nKey || 'err_unknown')), setRows([])))
    return () => { alive = false }
  }, [t, level])

  const central = (rows || []).filter((r) => r.government_level !== 'state')
  const state = (rows || []).filter((r) => r.government_level === 'state')

  const Card = (r) => (
    <button key={r.id} type="button" onClick={() => navigate(`/yojana/${r.slug}`)} className="flex flex-col text-left" style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)', padding: '14px' }}>
      <span className="w-fit rounded-full px-2 py-0.5 text-[12px] font-bold" style={{ background: 'var(--ks-green-tint)', color: 'var(--ks-green-dark)' }}>{t(`ycat_${r.category}`)}</span>
      <span className="mt-1.5 text-[17px] font-bold leading-snug" style={{ color: 'var(--ks-ink)' }}>{yojanaName(r, lang)}</span>
      <span className="mt-1 line-clamp-3 text-[14px] leading-snug" style={{ color: 'var(--ks-ink-2)' }}>{yojanaBenefit(r, lang) || yojanaDesc(r, lang)}</span>
      <span className="mt-2 text-[14px] font-bold" style={{ color: 'var(--ks-green)' }}>{t('scheme_view')} →</span>
    </button>
  )

  const Group = ({ id, title, list, moreHref }) => (
    <section id={id} className="w-full scroll-mt-16" style={{ padding: 'var(--ks-gutter)' }}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-[22px] font-bold md:text-[26px]" style={{ color: 'var(--ks-ink)' }}>{title}</h2>
        {moreHref && list.length > 0 && <button type="button" onClick={() => navigate(moreHref)} className="shrink-0 text-[14px] font-bold" style={{ color: 'var(--ks-green)' }}>{t('yojana_all')} →</button>}
      </div>
      {list.length === 0
        ? <p className="text-[15px]" style={{ color: 'var(--ks-ink-3)' }}>—</p>
        : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{list.map(Card)}</div>}
    </section>
  )

  const title = level === 'central' ? t('scheme_central_group') : level === 'state' ? t('scheme_mp_group') : t('info_yojana_heading')

  return (
    <div className="min-h-screen" style={{ background: 'var(--ks-bg)' }}>
      <NavBar />
      <div style={{ padding: '16px var(--ks-gutter) 0' }}>
        <h1 className="text-[28px] font-extrabold" style={{ color: 'var(--ks-ink)' }}>{title}</h1>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {rows === null ? <Spinner /> : (
        level === null ? (
          <>
            <Group id="central" title={t('scheme_central_group')} list={central} moreHref="/yojana/central" />
            <Group id="mp" title={t('scheme_mp_group')} list={state} moreHref="/yojana/mp" />
          </>
        ) : (
          <Group id={level} title={level === 'state' ? t('scheme_mp_group') : t('scheme_central_group')} list={level === 'state' ? state : central} />
        )
      )}
    </div>
  )
}
