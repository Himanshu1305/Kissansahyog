import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { Screen, BigButton, Notice, Spinner } from '../components/ui'
import DisclaimerBanner from '../components/DisclaimerBanner'
import LanguageToggle from '../components/LanguageToggle'
import { fetchExpertById } from '../lib/experts/expertsApi'
import { expertName, expertSpec, expertBio } from './Experts'

// Expert detail — full bio + phone revealed behind the same disclaimer + tel:
// pattern as listings (no booking, no payment).
export default function ExpertDetail() {
  const { id } = useParams()
  const { t, lang } = useLang()
  const navigate = useNavigate()

  const [expert, setExpert] = useState(null)
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const row = await fetchExpertById(id)
        if (alive) setExpert(row)
      } catch (err) {
        if (alive) setError(t(err.i18nKey || 'err_unknown'))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [id, t])

  if (loading) return <Screen title={t('experts_title')} onBack={() => navigate(-1)}><Spinner /></Screen>
  if (!expert)
    return (
      <Screen title={t('experts_title')} onBack={() => navigate(-1)}>
        <p className="py-12 text-center text-stone-500">{t('expert_not_found')}</p>
      </Screen>
    )

  return (
    <Screen title={t('experts_title')} onBack={() => navigate(-1)} right={<LanguageToggle />}>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-4xl" aria-hidden="true">👨‍🌾</span>
        <div>
          <h2 className="text-xl font-bold text-stone-900">{expertName(expert, lang)}</h2>
          {expert.organisation && <p className="text-sm text-stone-500">{expert.organisation}</p>}
        </div>
      </div>

      {expertSpec(expert, lang) && (
        <div className="mb-3 inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-800">
          {expertSpec(expert, lang)}
        </div>
      )}

      {expertBio(expert, lang) && (
        <p className="mb-4 whitespace-pre-line leading-relaxed text-stone-800">{expertBio(expert, lang)}</p>
      )}

      {error && <Notice tone="error">{error}</Notice>}

      <DisclaimerBanner which="phoneReveal" className="mb-3" />

      {!revealed ? (
        <BigButton onClick={() => setRevealed(true)}>📞 {t('show_number')}</BigButton>
      ) : (
        <div>
          <p className="mb-2 text-center text-lg font-bold text-stone-900">
            {expertName(expert, lang)} · {expert.phone}
          </p>
          <a href={`tel:${expert.phone}`} className="block">
            <BigButton>📞 {t('call_now')} — {expert.phone}</BigButton>
          </a>
        </div>
      )}
    </Screen>
  )
}
