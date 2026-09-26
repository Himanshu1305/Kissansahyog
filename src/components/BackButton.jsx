import { useNavigate, useLocation } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'

// Shared "← वापस" control for detail/sub-pages (Phase 3). Critical in PWA standalone mode,
// where there is no browser chrome / back button.
//
// Behaviour:
//   • If the user arrived by navigating WITHIN the app, React Router stamps a non-'default'
//     location.key. In that case call real browser history (navigate(-1) === history.back()),
//     NOT a route push — pushing a parent route would create a confusing double-back.
//   • If they arrived via a direct/shared link opened fresh (location.key === 'default'),
//     there is no in-app history to go back to, so navigate to a sensible `fallback` route.
export function goBack(navigate, location, fallback = '/') {
  if (location.key && location.key !== 'default') navigate(-1)
  else navigate(fallback, { replace: true })
}

export default function BackButton({ fallback = '/', className = '' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLang()
  return (
    <button
      type="button"
      data-testid="back-button"
      onClick={() => goBack(navigate, location, fallback)}
      className={`inline-flex min-h-0 items-center gap-1 py-1 text-[15px] font-bold text-[var(--ks-green,#1b5e20)] ${className}`}
      style={{ color: 'var(--ks-green)' }}
    >
      ← {t('nav_back')}
    </button>
  )
}
