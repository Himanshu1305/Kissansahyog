import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { supabase } from '../lib/supabaseClient'

// Compact हिं / EN switch. Persists to localStorage (via LanguageProvider) and,
// when a user is logged in, also to their profile (best-effort) so language
// survives a logout/login cycle.
export default function LanguageToggle({ className = '' }) {
  const { lang, setLang, t } = useLang()
  const { user, patchUser } = useAuth()

  async function choose(next) {
    if (next === lang) return
    setLang(next)
    if (user?.id) {
      patchUser({ preferred_language: next })
      // Best-effort server persistence; ignore failures (language still works locally).
      supabase
        .rpc('set_language', { p_actor_id: user.id, p_language: next })
        .then(({ error }) => {
          if (error && import.meta.env.DEV) console.warn('[lang] persist failed', error.message)
        })
    }
  }

  const btn = (code, label) =>
    `px-2.5 py-1.5 text-sm font-bold rounded-md min-h-0 ${
      lang === code ? 'bg-[var(--ks-accent)] text-[var(--ks-accent-dark)]' : 'text-[var(--ks-accent-dark)]'
    }`

  return (
    <div className={`flex items-center gap-0.5 rounded-lg bg-[var(--ks-accent-muted)] p-0.5 ${className}`} role="group" aria-label={t('language')}>
      <button type="button" className={btn('hi')} onClick={() => choose('hi')}>
        हिं
      </button>
      <button type="button" className={btn('en')} onClick={() => choose('en')}>
        EN
      </button>
    </div>
  )
}
