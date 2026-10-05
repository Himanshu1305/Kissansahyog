import { useEffect } from 'react'
import { useLang } from '../../lib/i18n/LanguageProvider'

export const ORIGIN = 'https://kissansahyog.com'
const DEFAULT_IMAGE = `${ORIGIN}/og/default.png`

// Sets the prerender-ready marker once a page's data has loaded. scripts/
// prerender.mjs waits for [data-prerender-ready="1"] before snapshotting.
export function PrerenderReady({ when = true }) {
  useEffect(() => {
    if (when) document.documentElement.setAttribute('data-prerender-ready', '1')
    return () => {}
  }, [when])
  return null
}

// React 19 native document metadata — rendering <title>/<meta>/<link>/<script>
// anywhere hoists them into <head>. No react-helmet. Every route renders one.
//   <Seo title=… description=… path="/greenhouse" image=… jsonLd={[…]}
//        hindiOnly noindex />
export default function Seo({
  title,
  description,
  path = '/',
  image = DEFAULT_IMAGE,
  type = 'website',
  jsonLd = [],
  noindex = false,
  hindiOnly = false,
}) {
  const { lang } = useLang()
  const url = ORIGIN + (path === '/' ? '' : path)
  const ld = Array.isArray(jsonLd) ? jsonLd : [jsonLd]
  return (
    <>
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url || ORIGIN} />
      {noindex && <meta name="robots" content="noindex,follow" />}
      {/* hreflang: the site is bilingual at the SAME URL via the language toggle. */}
      <link rel="alternate" hrefLang="hi-IN" href={url || ORIGIN} />
      {!hindiOnly && <link rel="alternate" hrefLang="en-IN" href={url || ORIGIN} />}
      <link rel="alternate" hrefLang="x-default" href={url || ORIGIN} />
      {/* Open Graph */}
      <meta property="og:type" content={type} />
      {title && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={url || ORIGIN} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="Kissan Sahyog" />
      <meta property="og:locale" content={lang === 'en' ? 'en_IN' : 'hi_IN'} />
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      {title && <meta name="twitter:title" content={title} />}
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={image} />
      {ld.filter(Boolean).map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />
      ))}
    </>
  )
}

// Sitewide Organization + WebSite (with SearchAction) JSON-LD — rendered once by
// PageShell on every page.
export function SiteJsonLd() {
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Kissan Sahyog',
    url: ORIGIN,
    logo: `${ORIGIN}/icons/icon-512.png`,
    email: 'hello@kissansahyog.com',
    areaServed: 'IN-MP',
  }
  const site = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Kissan Sahyog',
    url: ORIGIN,
    inLanguage: ['hi-IN', 'en-IN'],
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${ORIGIN}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(site) }} />
    </>
  )
}
