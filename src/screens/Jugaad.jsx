import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageShell, Seo } from '../components/layout'
import { ContentPage, buildContentJsonLd } from '../components/content'
import { useLang } from '../lib/i18n/LanguageProvider'
import { jugaadPage } from '../content/pages/jugaad.js'
import ListingCard from '../components/ListingCard'
import { fetchHomeFeed } from '../lib/listings/listingsApi'

// /jugaad — Jugaad / grassroots-innovation information hub (Phase 9). Authored
// accuracy content (ContentPage) + a marketplace teaser for jugaad listings.
// No hardcoded Devanagari here — all UI strings come through t().
export default function Jugaad() {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [listings, setListings] = useState([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const feed = await fetchHomeFeed({ category: 'jugaad', limit: 4 })
        if (!alive) return
        setListings(Array.isArray(feed) ? feed : [])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  return (
    <PageShell width="content" crumbs={[{ label: t('jugaad_nav') }]} ready={!loading}>
      <Seo
        title={jugaadPage.title[lang].slice(0, 60)}
        description={jugaadPage.blocks[0].text[lang].slice(0, 155)}
        path="/jugaad" image="/og/jugaad.png"
        type="article"
        jsonLd={buildContentJsonLd(jugaadPage.blocks, lang)}
      />

      <ContentPage page={jugaadPage} />

      <section className="mt-8">
        <h2 className="text-xl font-bold text-stone-900">{t('home_cat_jugaad')}</h2>

        {listings.length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {listings.slice(0, 4).map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                extras={{}}
                onClick={() => navigate('/listing/' + l.id)}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate('/post')}
          className="mt-4 rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white hover:bg-green-800"
        >
          {t('post_listing')}
        </button>
      </section>
    </PageShell>
  )
}
