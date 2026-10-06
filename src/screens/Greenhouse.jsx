import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { PageShell, Seo } from '../components/layout'
import { useLang } from '../lib/i18n/LanguageProvider'
import { GH_VENDOR_SUBTYPE, optionLabel } from '../lib/listings/catalog'
import { fetchHomeFeed } from '../lib/listings/listingsApi'
import ListingCard from '../components/ListingCard'
import RelatedBoxes from '../components/RelatedBoxes'

// /greenhouse (Batch 2 item C) — the greenhouse MARKETPLACE (listings first).
// Two CTAs deep-link into /post with the Greenhouse category + offer/requirement
// preselected; the subsidy/cost guide moved to /greenhouse/subsidy.
export default function Greenhouse() {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [listings, setListings] = useState([])
  const [typeFilter, setTypeFilter] = useState('')       // '' | 'offer' | 'requirement'
  const [subtypeFilter, setSubtypeFilter] = useState('')
  const [districtFilter, setDistrictFilter] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const feed = await fetchHomeFeed({ category: 'greenhouse', limit: 60, pool: 120 })
        if (alive) setListings(Array.isArray(feed) ? feed : [])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const districts = useMemo(() => [...new Set(listings.map((l) => l.district).filter(Boolean))].sort(), [listings])

  const filtered = useMemo(() => listings.filter((l) => {
    if (typeFilter && l.listing_type !== typeFilter) return false
    if (subtypeFilter && (l.details?.vendor_subtype || '') !== subtypeFilter) return false
    if (districtFilter && l.district !== districtFilter) return false
    return true
  }), [listings, typeFilter, subtypeFilter, districtFilter])

  const selCls = 'mt-1 min-h-[44px] rounded-lg border border-stone-300 bg-white p-2 text-sm'
  const bigBtn = 'flex min-h-[56px] flex-1 items-center justify-center rounded-2xl px-4 py-3 text-center text-base font-bold'

  return (
    <PageShell width="wide" crumbs={[{ label: t('nav_greenhouse') }]} ready={!loading}>
      <Seo
        title={t('gh_mkt_seo_title').slice(0, 60)}
        description={t('gh_mkt_intro').slice(0, 155)}
        path="/greenhouse" image="/og/greenhouse.png"
      />

      <h1 className="text-3xl font-bold text-stone-900">{t('nav_greenhouse')}</h1>
      {/* ks-allow-width: readable one-line intro above the full-width marketplace */}
      <p className="mt-2 max-w-3xl text-stone-700">{t('gh_mkt_intro')}</p>

      {/* Two big CTAs — preselect the Greenhouse category + offer/requirement in /post. */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => navigate('/post?cat=greenhouse&type=offer')} className={`${bigBtn} bg-green-700 text-white active:bg-green-800`}>
          🏪 {t('gh_btn_vendor')}
        </button>
        <button type="button" onClick={() => navigate('/post?cat=greenhouse&type=requirement')} className={`${bigBtn} border-2 border-green-700 bg-white text-green-800 active:bg-green-50`}>
          🌱 {t('gh_btn_requirement')}
        </button>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap gap-3">
        <label className="flex flex-col text-sm font-semibold text-stone-700">
          {t('gh_filter_type')}
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selCls}>
            <option value="">{t('gh_type_all')}</option>
            <option value="offer">{t('gh_type_vendor')}</option>
            <option value="requirement">{t('gh_type_requirement')}</option>
          </select>
        </label>
        <label className="flex flex-col text-sm font-semibold text-stone-700">
          {t('gh_filter_subtype')}
          <select value={subtypeFilter} onChange={(e) => setSubtypeFilter(e.target.value)} className={selCls}>
            <option value="">{t('gh_filter_all_subtypes')}</option>
            {GH_VENDOR_SUBTYPE.map((o) => <option key={o.value} value={o.value}>{optionLabel(GH_VENDOR_SUBTYPE, o.value, lang)}</option>)}
          </select>
        </label>
        {districts.length > 0 && (
          <label className="flex flex-col text-sm font-semibold text-stone-700">
            {t('cs_filter_district')}
            <select value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)} className={selCls}>
              <option value="">{t('cs_filter_all_districts')}</option>
              {districts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
        )}
      </div>

      <p className="mt-4 text-sm font-semibold text-stone-600">{filtered.length} {t('gh_results')}</p>
      {filtered.length === 0 ? (
        <p className="mt-3 rounded-lg bg-stone-100 px-4 py-6 text-center text-sm text-stone-600">{t('gh_mkt_empty')}</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((l) => (
            <ListingCard key={l.id} listing={l} extras={{}} onClick={() => navigate('/listing/' + l.id)} />
          ))}
        </div>
      )}

      {/* Link box to the subsidy / cost guide. */}
      <Link to="/greenhouse/subsidy" className="mt-8 flex items-center justify-between gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 active:bg-green-100">
        <span className="font-bold text-green-900">📘 {t('gh_guide_box')}</span>
        <span className="shrink-0 font-bold text-green-700">→</span>
      </Link>

      <RelatedBoxes page="greenhouse" />
    </PageShell>
  )
}
