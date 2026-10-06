import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PageShell, Seo } from '../components/layout'
import { useLang } from '../lib/i18n/LanguageProvider'
import RelatedBoxes from '../components/RelatedBoxes'
import { fetchKbSawaal, sawaalQuestion, sawaalAnswer } from '../lib/community/communityApi'

// Crop hub  /fasal/:crop/samasya   (mode="crop")
// Category hub  /sawaal/vishay/:category   (mode="category")
// Lists the published knowledge-base Q&As for the filter, as cards → /sawaal/<slug>.
export default function SawaalHub({ mode = 'crop' }) {
  const params = useParams()
  const key = mode === 'crop' ? params.crop : params.category
  const { t, lang } = useLang()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])

  useEffect(() => {
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const all = await fetchKbSawaal()
        if (!alive) return
        setRows(all.filter((r) => (mode === 'crop' ? r.crop === key : r.category === key)))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [key, mode])

  const label = mode === 'crop' ? t(`kbcrop_${key}`) : t(`scat_${key}`)
  const h1 = mode === 'crop' ? `${label} ${t('fasal_samasya_title')}` : `${label} — ${t('sawaal_kb_heading')}`
  const path = mode === 'crop' ? `/fasal/${key}/samasya` : `/sawaal/vishay/${key}`

  const jsonLd = useMemo(() => ([{
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: rows.map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: sawaalQuestion(r, 'hi'), url: `https://kissansahyog.com/sawaal/${r.slug}` })),
  }]), [rows])

  return (
    <PageShell width="content" crumbs={[{ label: t('sawaal_title'), to: '/sawaal' }, { label }]} ready={!loading}>
      <Seo
        title={h1.slice(0, 60)}
        description={`${label}: ${t('fasal_samasya_intro')}`.slice(0, 155)}
        path={path}
        type="article"
        hindiOnly
        jsonLd={jsonLd}
      />
      <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">{h1}</h1>
      <p className="mt-2 text-stone-700">{t('fasal_samasya_intro')}</p>
      <p className="mt-2 text-sm font-semibold text-stone-600">{rows.length}</p>

      {rows.length === 0 && !loading ? (
        <p className="mt-6 rounded-lg bg-stone-100 px-4 py-6 text-center text-sm text-stone-600">{t('sawaal_empty')}</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <Link key={r.slug} to={`/sawaal/${r.slug}`} className="flex flex-col rounded-xl border border-stone-200 bg-white p-3.5 hover:bg-green-50">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500">
                {r.crop && mode !== 'crop' && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-800">{t(`kbcrop_${r.crop}`)}</span>}
                {r.category && mode !== 'category' && <span className="rounded-full bg-green-50 px-1.5 py-0.5 font-semibold text-green-800">{t(`scat_${r.category}`)}</span>}
              </div>
              <h2 className="mt-1.5 flex items-start gap-1.5 font-bold leading-snug text-stone-900">
                <span aria-hidden>❓</span><span>{sawaalQuestion(r, 'hi')}</span>
              </h2>
              <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-stone-700">{sawaalAnswer(r, 'hi')}</p>
            </Link>
          ))}
        </div>
      )}

      <RelatedBoxes page={mode === 'crop' ? 'crop' : 'sawaal'} />
    </PageShell>
  )
}
