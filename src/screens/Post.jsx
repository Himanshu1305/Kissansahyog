import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { Screen, BigButton } from '../components/ui'
import LanguageToggle from '../components/LanguageToggle'
import { CATEGORIES, CATEGORY_META, LISTING_TYPE_META } from '../lib/listings/catalog'
import { CatIcon } from '../components/CatIcon'
import { isEnabled } from '../lib/listings/registry'
import ListingForm from '../components/ListingForm'

// Post flow: (1) Offering or Looking For? (2) which category? (3) the form,
// (4) success. Kept as one screen with an in-screen back arrow (simplest for
// low-literacy users).
export default function Post() {
  const { t, lang } = useLang()
  const navigate = useNavigate()

  const [listingType, setListingType] = useState(null)
  const [category, setCategory] = useState(null)
  const [created, setCreated] = useState(null)

  const step = created ? 'done' : !listingType ? 'type' : !category ? 'category' : 'form'

  function back() {
    if (step === 'form') setCategory(null)
    else if (step === 'category') setListingType(null)
    else navigate('/home')
  }

  const title =
    step === 'done'
      ? t('post_success')
      : `${t('post_listing')}${listingType ? ' · ' + LISTING_TYPE_META[listingType][lang] : ''}`

  return (
    <Screen title={title} onBack={step === 'done' ? undefined : back} right={<LanguageToggle />}>
      {step === 'type' && (
        <div>
          <h2 className="mb-4 text-xl font-bold text-stone-800">{t('post_q_type')}</h2>
          <div className="space-y-3">
            <BigButton onClick={() => setListingType('offer')}>
              🤝 {LISTING_TYPE_META.offer[lang]}
            </BigButton>
            <BigButton variant="secondary" onClick={() => setListingType('requirement')}>
              🔎 {LISTING_TYPE_META.requirement[lang]}
            </BigButton>
          </div>
        </div>
      )}

      {step === 'category' && (
        <div>
          <h2 className="mb-4 text-xl font-bold text-stone-800">{t('post_q_category')}</h2>
          <div className="space-y-2">
            {CATEGORIES.map((c) => {
              const enabled = isEnabled(c)
              return (
                <BigButton
                  key={c}
                  variant={enabled ? 'primary' : 'plain'}
                  disabled={!enabled}
                  onClick={() => enabled && setCategory(c)}
                >
                  <CatIcon category={c} /> {CATEGORY_META[c][lang]}
                  {!enabled && <span className="ml-2 text-sm">({t('coming_soon')})</span>}
                </BigButton>
              )
            })}
          </div>
        </div>
      )}

      {step === 'form' && (
        <ListingForm listingType={listingType} category={category} onCreated={setCreated} />
      )}

      {step === 'done' && (
        <div className="py-6 text-center">
          <div className="text-6xl">✅</div>
          <p className="mt-4 text-xl font-bold text-green-800">{t('post_success')}</p>
          <div className="mt-8 space-y-3">
            <BigButton onClick={() => navigate(`/listing/${created.id}`)}>
              {t('view_listing')}
            </BigButton>
            <BigButton
              variant="secondary"
              onClick={() => {
                setCreated(null)
                setListingType(null)
                setCategory(null)
              }}
            >
              {t('post_another')}
            </BigButton>
            <BigButton variant="plain" onClick={() => navigate('/home')}>
              {t('back')}
            </BigButton>
          </div>
        </div>
      )}
    </Screen>
  )
}
