import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { PageShell } from '../components/layout'
import { termsOfUse, termsNote } from '../lib/i18n/legal'

export default function Terms() {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  return (
    <PageShell width="wide">
      <button type="button" onClick={() => navigate('/')} className="mb-4 text-sm font-semibold text-green-800 underline">
        ‹ {t('back_to_home')}
      </button>
      <h1 className="text-2xl font-bold text-stone-900">{t('terms_title')}</h1>
      <p className="mt-2 text-sm text-stone-600">{t('terms_updated')}</p>
      {/* General note — shown once here instead of being repeated under every clause. */}
      <div data-testid="terms-note" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="leading-relaxed text-stone-900">{termsNote.hi}</p>
        <p className="mt-1 leading-relaxed text-stone-600">{termsNote.en}</p>
      </div>
      <div className="mt-6 grid gap-8 lg:grid-cols-[15rem_minmax(0,46rem)] lg:justify-center">
        <nav className="h-fit rounded-2xl border border-stone-200 bg-stone-50 p-4 lg:sticky lg:top-24" aria-label={t('terms_contents')}>
          <p className="mb-2 font-bold text-stone-900">{t('terms_contents')}</p>
          <ol className="space-y-1 text-sm">
            {termsOfUse.map((p, i) => <li key={p.id}><a className="text-green-800 hover:underline" href={`#${p.id}`}>{i + 1}. {lang === 'en' ? p.title_en : p.title_hi}</a></li>)}
          </ol>
        </nav>
        <ol className="space-y-6">
          {termsOfUse.map((p, i) => (
            <li id={p.id} key={p.id} className="scroll-mt-24 rounded-2xl border-2 border-stone-100 bg-white p-5">
              <h2 className="text-lg font-bold text-stone-900">{i + 1}. {p.title_hi}</h2>
              <p className="mt-2 leading-relaxed text-stone-900">{p.hi}</p>
              <h3 className="mt-4 font-semibold text-stone-800">{p.title_en}</h3>
              <p className="mt-1 leading-relaxed text-stone-600">{p.en}</p>
            </li>
          ))}
        </ol>
      </div>
    </PageShell>
  )
}
