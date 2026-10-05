import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageShell, Seo } from '../components/layout'
import { ContentPage, buildContentJsonLd } from '../components/content'
import { useLang } from '../lib/i18n/LanguageProvider'
import { greenhousePage } from '../content/pages/greenhouse.js'
import GreenhouseCalculators from '../components/GreenhouseCalculators'
import ListingCard from '../components/ListingCard'
import SponsoredBadge from '../components/SponsoredBadge'
import { fetchHomeFeed } from '../lib/listings/listingsApi'

// /greenhouse hub: authored subsidy/accuracy content (ContentPage) + interactive
// cost/subsidy calculators + a marketplace teaser for greenhouse listings.
export default function Greenhouse() {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [listings, setListings] = useState([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const feed = await fetchHomeFeed({ category: 'greenhouse', limit: 4 })
        if (!alive) return
        setListings(Array.isArray(feed) ? feed : [])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  return (
    <PageShell width="content" crumbs={[{ label: t('home_cat_greenhouse') }]} ready={!loading}>
      <Seo
        title={greenhousePage.title[lang].slice(0, 60)}
        description={greenhousePage.blocks[0].text[lang].slice(0, 155)}
        path="/greenhouse"
        type="article"
        jsonLd={buildContentJsonLd(greenhousePage.blocks, lang)}
      />

      <ContentPage page={greenhousePage} />

      <GreenhouseCalculators />

      {/* Ad slot — no ads live in this build. */}
      {false && <SponsoredBadge sponsored />}

      <section className="mt-8">
        <h2 className="text-xl font-bold text-stone-900">{t('home_cat_greenhouse')}</h2>
        <p className="mt-1 text-sm font-semibold text-stone-600">{listings.length}</p>

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
