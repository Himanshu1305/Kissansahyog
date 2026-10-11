import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { PageShell, Seo } from '../components/layout'
import { useLang } from '../lib/i18n/LanguageProvider'
import { JUGAAD_OFFER_TYPE, optionLabel } from '../lib/listings/catalog'
import { fetchHomeFeed } from '../lib/listings/listingsApi'
import ListingCard from '../components/ListingCard'

// /jugaad (Batch 2 item D) — the jugaad MARKETPLACE (listings first). A big
// "अपना जुगाड़ डालें" CTA deep-links into /post; filter chips map to the 5 offer
// types; the info/legal guide moved to /jugaad/jankari.
export default function Jugaad() {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [listings, setListings] = useState([])
  const [chip, setChip] = useState('') // '' | JUGAAD_OFFER_TYPE value

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const feed = await fetchHomeFeed({ category: 'jugaad', limit: 60, pool: 120 })
        if (alive) setListings(Array.isArray(feed) ? feed : [])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const filtered = useMemo(
    () => (chip ? listings.filter((l) => (l.details?.offer_type || '') === chip) : listings),
    [listings, chip],
  )

  const chipCls = (active) =>
    `min-h-[40px] rounded-full border-2 px-4 py-1.5 text-sm font-bold ${active ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 bg-white text-stone-700'}`

  return (
    <PageShell width="wide" crumbs={[{ label: t('jugaad_nav') }]} ready={!loading}>
      <Seo
        title={t('jugaad_mkt_seo_title').slice(0, 60)}
        description={t('jugaad_mkt_intro').slice(0, 155)}
        path="/jugaad" image="/og/jugaad.png"
      />

      <h1 className="text-3xl font-bold text-stone-900">{t('home_cat_jugaad')}</h1>
      {/* ks-allow-width: readable one-line intro above the full-width marketplace */}
      <p className="mt-2 text-stone-700">{t('jugaad_mkt_intro')}</p>

      <button
        type="button"
        onClick={() => navigate('/post?cat=jugaad&type=offer')}
        className="mt-4 inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-green-700 px-6 py-3 text-base font-bold text-white active:bg-green-800"
      >
        🛠️ {t('jugaad_add_btn')}
      </button>

      {/* Filter chips — the 5 offer types. */}
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => setChip('')} className={chipCls(chip === '')}>{t('jugaad_filter_all')}</button>
        {JUGAAD_OFFER_TYPE.map((o) => (
          <button key={o.value} type="button" onClick={() => setChip(o.value)} className={chipCls(chip === o.value)}>
            {optionLabel(JUGAAD_OFFER_TYPE, o.value, lang)}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm font-semibold text-stone-600">{filtered.length} {t('jugaad_results')}</p>
      {filtered.length === 0 ? (
        <p className="mt-3 rounded-lg bg-stone-100 px-4 py-6 text-center text-sm text-stone-600">{t('jugaad_mkt_empty')}</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((l) => (
            <ListingCard key={l.id} listing={l} extras={{}} onClick={() => navigate('/listing/' + l.id)} />
          ))}
        </div>
      )}

      {/* Link box to the info / legal guide. */}
      <Link to="/jugaad/jankari" className="mt-8 flex items-center justify-between gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 active:bg-green-100">
        <span className="font-bold text-green-900">📘 {t('jugaad_guide_box')}</span>
        <span className="shrink-0 font-bold text-green-700">→</span>
      </Link>
    </PageShell>
  )
}
