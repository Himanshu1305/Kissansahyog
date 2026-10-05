import { Link } from 'react-router-dom'
import { useLang } from '../../lib/i18n/LanguageProvider'

// Breadcrumbs for content/hub pages. `items` = [{label:{hi,en}|string, to?}].
// The home crumb is prepended automatically. Also emits BreadcrumbList JSON-LD
// (absolute URLs) via React 19 native <script>.
const ORIGIN = 'https://kissansahyog.com'

export default function Breadcrumbs({ items = [], className = '' }) {
  const { t, lang } = useLang()
  const pick = (v) => (typeof v === 'string' ? v : v?.[lang] ?? v?.hi ?? '')
  const full = [{ label: t('breadcrumb_home'), to: '/' }, ...items]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: full.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: pick(c.label),
      ...(c.to ? { item: ORIGIN + c.to } : {}),
    })),
  }

  return (
    <nav aria-label="breadcrumb" className={`text-sm text-stone-500 ${className}`}>
      <ol className="flex flex-wrap items-center gap-1">
        {full.map((c, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden className="text-stone-300">/</span>}
            {c.to && i < full.length - 1 ? (
              <Link to={c.to} className="hover:text-green-700 hover:underline">{pick(c.label)}</Link>
            ) : (
              <span className="text-stone-700" aria-current={i === full.length - 1 ? 'page' : undefined}>{pick(c.label)}</span>
            )}
          </li>
        ))}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </nav>
  )
}
