import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageShell, Seo } from '../components/layout'
import { ContentPage, buildContentJsonLd } from '../components/content'
import { useLang } from '../lib/i18n/LanguageProvider'
import { fetchColdStorageAll, fetchColdStorageDistricts } from '../lib/coldStorage/coldStorageApi'
import { coldStoragePage } from '../content/pages/cold-storage.js'
import ColdStorageCard from '../components/ColdStorageCard'

// /cold-storage hub: authored intro (ContentPage) + the live directory with
// district/type filters and a browse-by-district index.
export default function ColdStorage() {
  const { t, lang } = useLang()
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState([])
  const [districts, setDistricts] = useState([])
  const [districtFilter, setDistrictFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [all, dists] = await Promise.all([fetchColdStorageAll(), fetchColdStorageDistricts()])
        if (!alive) return
        setEntries(all)
        setDistricts(dists)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const types = useMemo(
    () => [...new Set(entries.map((e) => e.type).filter(Boolean))].sort(),
    [entries],
  )

  const filtered = useMemo(
    () => entries.filter((e) => {
      if (districtFilter && e.district !== districtFilter) return false
      if (typeFilter && e.type !== typeFilter) return false
      return true
    }),
    [entries, districtFilter, typeFilter],
  )

  return (
    <PageShell width="wide" crumbs={[{ label: t('cs_hub_nav') }]} ready={!loading}>
      <Seo
        title={coldStoragePage.title[lang].slice(0, 60)}
        description={coldStoragePage.blocks[0].text[lang].slice(0, 155)}
        path="/cold-storage" image="/og/cold-storage.png"
        type="article"
        jsonLd={buildContentJsonLd(coldStoragePage.blocks, lang)}
      />

      <ContentPage page={coldStoragePage} />

      <section className="mt-8">
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="block text-sm font-semibold text-stone-700">{t('cs_filter_district')}</label>
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="mt-1 rounded-lg border border-stone-300 bg-white p-2 text-sm"
            >
              <option value="">{t('cs_filter_all_districts')}</option>
              {districts.map((d) => (
                <option key={d.slug} value={d.district}>{d.district} ({d.count})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700">{t('cs_filter_type')}</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="mt-1 rounded-lg border border-stone-300 bg-white p-2 text-sm"
            >
              <option value="">{t('cs_filter_all_types')}</option>
              {types.map((ty) => (
                <option key={ty} value={ty}>{ty}</option>
              ))}
            </select>
          </div>
        </div>

        <p className="mt-4 text-sm font-semibold text-stone-600">{filtered.length} {t('cs_entries_count')}</p>

        {filtered.length === 0 ? (
          <p className="mt-3 rounded-lg bg-stone-100 px-4 py-6 text-center text-sm text-stone-600">{t('cs_no_entries')}</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e) => (
              <ColdStorageCard key={e.id} entry={e} />
            ))}
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-xl font-bold text-stone-900">{t('cs_all_districts_h')}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {districts.map((d) => (
              <Link
                key={d.slug}
                to={`/cold-storage/${d.slug}`}
                className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:border-green-600 hover:text-green-700"
              >
                {d.district} ({d.count})
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  )
}
