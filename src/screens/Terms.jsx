import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import NavBar from '../components/NavBar'
import { termsOfUse } from '../lib/i18n/legal'

// Minimal, bilingual Terms of Use placeholder (Hindi first). LEGAL REVIEW PENDING
// before public launch — see src/lib/i18n/legal.js.
export default function Terms() {
  const { t } = useLang()
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-stone-50">
      <NavBar />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <button type="button" onClick={() => navigate('/')} className="mb-4 text-sm font-semibold text-green-800 underline">
          ‹ {t('back_to_home')}
        </button>
        <h1 className="text-2xl font-bold text-stone-900">{t('terms_title')}</h1>
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{t('legal_review_pending')}</p>
        <ol className="mt-6 space-y-6">
          {termsOfUse.map((p, i) => (
            <li key={i} className="rounded-2xl border-2 border-stone-100 bg-white p-4">
              <p className="font-semibold leading-relaxed text-stone-900">{p.hi}</p>
              <p className="mt-1 leading-relaxed text-stone-600">{p.en}</p>
            </li>
          ))}
        </ol>
      </main>
    </div>
  )
}
