import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageShell, Seo } from '../components/layout'
import { CiteProvider, ContentBlocks, SourcesList, LastUpdated, buildContentJsonLd, collectCiteIds, pick } from '../components/content'
import { useLang } from '../lib/i18n/LanguageProvider'
import { fetchColdStorageAll, fetchColdStorageDistricts } from '../lib/coldStorage/coldStorageApi'
import { coldStoragePage } from '../content/pages/cold-storage.js'
import ColdStorageFinder from '../components/coldStorage/ColdStorageFinder'

// /cold-storage finder (Batch 2 item B): listings come FIRST — location search +
// distance-sorted directory + a "list your unit" CTA — then the short info
// sections (MP capacity fact with citation, how-to-choose, FAQ) and district links.
export default function ColdStorage() {
  const { t, lang } = useLang()
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState([])
  const [districts, setDistricts] = useState([])

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

  // Short info blocks below the listings: MP capacity fact (cited), how-to-choose, FAQ.
  const infoBlocks = useMemo(
    () => coldStoragePage.blocks.filter((b) => ['fact', 'heading', 'checklist', 'faq'].includes(b.type)),
    [],
  )
  const orderedIds = useMemo(() => collectCiteIds(coldStoragePage.blocks), [])

  return (
    <PageShell width="wide" crumbs={[{ label: t('cs_hub_nav') }]} ready={!loading}>
      <Seo
        title={coldStoragePage.title[lang].slice(0, 60)}
        description={coldStoragePage.blocks[0].text[lang].slice(0, 155)}
        path="/cold-storage" image="/og/cold-storage.png"
        type="article"
        jsonLd={buildContentJsonLd(coldStoragePage.blocks, lang)}
      />

      <h1 className="text-3xl font-bold text-stone-900">{pick(coldStoragePage.h1, lang)}</h1>
      {/* ks-allow-width: readable one-line intro above the full-width finder */}
      <p className="mt-2 max-w-3xl text-stone-700">{pick(coldStoragePage.blocks[0].text, lang)}</p>
      {coldStoragePage.updated && <LastUpdated date={coldStoragePage.updated} className="mt-2" />}

      <div className="mt-5">
        <ColdStorageFinder entries={entries} districts={districts} />
      </div>

      {/* Short info sections (below the listings). */}
      <CiteProvider orderedIds={orderedIds}>
        <section className="content-page mt-10 border-t border-stone-200 pt-6">
          <ContentBlocks blocks={infoBlocks} />
          <SourcesList />
        </section>
      </CiteProvider>

      {/* District index */}
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
    </PageShell>
  )
}
