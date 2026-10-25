import { Link, useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { BigButton } from '../components/ui'
import { PageShell } from '../components/layout'
import Logo from '../components/Logo'

// First-launch screen: pick language (Hindi default, big obvious choice), then
// go to signup or login.
export default function Welcome() {
  const { t, lang, setLang } = useLang()
  const navigate = useNavigate()

  const langBtn = (code, label) =>
    `flex-1 rounded-xl border-2 px-4 py-4 text-lg font-bold ${
      lang === code
        ? 'border-green-700 bg-green-700 text-white'
        : 'border-stone-300 bg-white text-stone-800'
    }`

  return (
    <PageShell width="content" readingAside={false}>
      <div className="flex min-h-[70vh] flex-col py-4 sm:py-6">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="self-start text-sm font-semibold text-green-800 underline"
        >
          ‹ {t('back_to_home')}
        </button>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          {/* Below sm the logo is a bit smaller so the guide card and the create-account
              button both fit above the fold at 360x640 (Batch 10C task D). */}
          <Logo size="xl" decorative className="max-sm:[&_img]:h-14!" />
          <h1 className="mt-2 text-3xl font-extrabold text-green-800 sm:mt-3">{t('app_name')}</h1>
          <p className="mt-3 text-stone-600 sm:mt-6">{t('welcome_intro')}</p>
        </div>

        <div className="mt-4 sm:mt-8">
          <p className="mb-2 text-center text-base font-semibold text-stone-700">
            {t('choose_language')}
          </p>
          <div className="mb-4 flex gap-3 sm:mb-6">
            <button type="button" className={langBtn('hi')} onClick={() => setLang('hi')}>
              {t('hindi')}
            </button>
            <button type="button" className={langBtn('en')} onClick={() => setLang('en')}>
              English
            </button>
          </div>

          <div className="space-y-3">
            {/* Batch 10C: 1-minute register demo — the primary help card, right above
                the create-account button. */}
            <Link
              to="/guide/register"
              data-testid="entry-welcome-guide"
              className="flex min-h-[64px] w-full items-center gap-3 rounded-xl border-2 px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-green-dark)]"
              style={{ background: 'var(--ks-saffron-tint)', borderColor: 'var(--ks-saffron)' }}
            >
              <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--ks-accent)] text-[var(--ks-ink)]">
                <svg width="16" height="18" viewBox="0 0 9 10" focusable="false"><path d="M1 0.5L8.5 5L1 9.5Z" fill="currentColor" /></svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-extrabold leading-snug" style={{ color: 'var(--ks-ink)' }}>{t('guide_welcome_card_title')}</span>
                <span className="block text-[14px] leading-snug" style={{ color: 'var(--ks-ink-2)' }}>{t('guide_welcome_card_sub')}</span>
              </span>
              <span aria-hidden="true" className="shrink-0 text-xl font-bold" style={{ color: 'var(--ks-orange-dark)' }}>›</span>
            </Link>
            <BigButton onClick={() => navigate('/signup')}>{t('new_user')}</BigButton>
            <BigButton variant="secondary" onClick={() => navigate('/login')}>
              {t('returning_user')}
            </BigButton>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
