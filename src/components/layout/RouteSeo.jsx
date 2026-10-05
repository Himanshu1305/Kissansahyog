import { useLocation } from 'react-router-dom'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { ROUTE_SEO } from '../../content/seo.js'
import Seo from './Seo.jsx'

// Mounted once globally (App). Gives every mapped public route a unique
// title/description/canonical/hreflang/OG without editing each screen. Routes
// that render their own <Seo/> (content hubs, dynamic detail pages) are absent
// from ROUTE_SEO, so titles never duplicate.
export default function RouteSeo() {
  const { pathname } = useLocation()
  const { lang } = useLang()
  const meta = ROUTE_SEO[pathname]
  if (!meta) return null
  return (
    <Seo
      title={meta.title[lang] ?? meta.title.hi}
      description={meta.description[lang] ?? meta.description.hi}
      path={pathname}
    />
  )
}
