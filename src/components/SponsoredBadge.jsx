import { useLang } from '../lib/i18n/LanguageProvider'

// Phase 4 — clear, prominent "Sponsored" label for any paid placement, per the
// Consumer Protection (E-Commerce) Amendment Rules 2026 (S-JUG-31). No ads are
// live in this build; the badge only renders when is_sponsored is set.
export default function SponsoredBadge({ sponsored, className = '' }) {
  const { t } = useLang()
  if (!sponsored) return null
  return (
    <span className={`inline-block rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-900 ${className}`}>
      {t('sponsored_label')}
    </span>
  )
}
