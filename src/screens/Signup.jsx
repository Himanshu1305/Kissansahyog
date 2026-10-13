import { useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { resolveNext } from '../lib/returnPath'
import { isValidPhone, isValidEmail, MIN_PASSWORD } from '../lib/auth/authService'
import { Screen, Field, TextInput, Select, BigButton, Notice, Spinner } from '../components/ui'
import DisclaimerBanner from '../components/DisclaimerBanner'
import KisanFields from '../components/KisanFields'
import PlaceField from '../components/location/PlaceField'

// Batch 7L-2 — ONE registration form (no phone/email tabs): name, email, password, mobile
// number, village/town from the places list (no pincode), the "show my details / keep hidden"
// choice and the optional किसान profile. Step 2 is the existing one-time acknowledgment.
export default function Signup() {
  const { t, lang, setLang } = useLang()
  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const next = resolveNext(params, location.state)

  const [step, setStep] = useState('form') // 'form' | 'disclaimer'
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '' })
  const [place, setPlace] = useState(null) // { label, lat, lng, district }
  const [showPassword, setShowPassword] = useState(false)
  // "Show my details" is the recommended choice and starts selected; either can be picked.
  const [showDetails, setShowDetails] = useState(true)
  // Optional किसान profile captured at registration (never blocks signup).
  const [kisan, setKisan] = useState({ land_acres: '', main_crops: '', interest_lease: false, interest_equipment: false, whatsapp_opt_in: false, preferred_mandi: '' })
  const setK = (k) => (e) => setKisan((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const [accepted, setAccepted] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  // Typing in a field clears the message shown under it.
  const clearErr = (k) => setFieldErrors((fe) => (fe[k] ? { ...fe, [k]: undefined } : fe))
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); clearErr(k) }

  function validateForm() {
    const errs = {}
    if (!form.full_name.trim()) errs.full_name = t('err_name_required')
    if (!isValidEmail(form.email)) errs.email = t('err_invalid_email')
    if (!form.password || form.password.length < MIN_PASSWORD) errs.password = t('err_password_short')
    if (!isValidPhone(form.phone)) errs.phone = t('err_invalid_phone')
    if (!place) errs.place = t('err_place_required')
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  function goToDisclaimer(e) {
    e.preventDefault()
    setError(null)
    if (validateForm()) { setStep('disclaimer'); window.scrollTo?.(0, 0) }
  }

  async function submit() {
    setError(null)
    if (!accepted) {
      setError(t('err_disclaimer_not_accepted'))
      return
    }
    setBusy(true)
    try {
      await register({
        full_name: form.full_name, email: form.email, password: form.password, phone: form.phone,
        place, language: lang, disclaimer_accepted: true, show_details: showDetails, kisan,
      })
      navigate(next, { replace: true })
    } catch (err) {
      const key = err.i18nKey || 'err_unknown'
      // Put the message next to the field it is about, and at the top of the form.
      const field = { err_email_exists: 'email', err_invalid_email: 'email', err_password_short: 'password', err_phone_exists: 'phone', err_invalid_phone: 'phone' }[key]
      if (field) setFieldErrors({ [field]: t(key) })
      setError(t(key))
      setStep('form')
    } finally {
      setBusy(false)
    }
  }

  const choice = (on) => `flex min-h-[64px] w-full flex-col items-center justify-center rounded-2xl border-2 px-3 py-3 text-center text-lg font-bold ${on ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 bg-white text-stone-800'}`

  return (
    <Screen
      title={t('signup_title')}
      onBack={() => (step === 'disclaimer' ? setStep('form') : navigate('/'))}
    >
      {/* Batch 7D: one line of text under the heading. */}
      <p data-testid="signup-free-registration" className="mb-3 inline-block rounded-full bg-[var(--ks-green-tint)] px-3 py-1 text-sm font-bold text-[var(--ks-green-dark)]">✓ {t('free_registration')}</p>

      {error && <div data-testid="signup-error"><Notice tone="error">{error}</Notice></div>}

      {step === 'form' && (
        <form onSubmit={goToDisclaimer} noValidate data-testid="signup-form">
          <Field label={t('full_name')} htmlFor="full_name" required error={fieldErrors.full_name}>
            <TextInput id="full_name" value={form.full_name} onChange={set('full_name')} placeholder={t('full_name_ph')} autoComplete="name" />
          </Field>

          <Field label={t('email_label')} htmlFor="email" required error={fieldErrors.email}>
            <TextInput id="email" type="email" value={form.email} onChange={set('email')} placeholder={t('email_ph')} autoComplete="email" />
          </Field>

          <Field label={t('password_label')} htmlFor="password" required hint={t('password_ph')} error={fieldErrors.password}>
            <div className="flex gap-2">
              <TextInput id="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder={t('password_ph')} autoComplete="new-password" className="min-w-0 flex-1" />
              <button type="button" data-testid="password-toggle" aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)} className="shrink-0 rounded-xl border-2 border-stone-300 bg-white px-3 text-[15px] font-bold text-green-800">
                {t(showPassword ? 'password_hide' : 'password_show')}
              </button>
            </div>
          </Field>

          <Field label={t('phone_number')} htmlFor="phone" required error={fieldErrors.phone}>
            <TextInput id="phone" type="tel" inputMode="numeric" maxLength={10} value={form.phone} onChange={set('phone')} placeholder={t('phone_ph')} autoComplete="tel" />
          </Field>

          <PlaceField id="village_town" value={place} onChange={(p) => { setPlace(p); clearErr('place') }} error={fieldErrors.place} />

          <Field label={t('language')} htmlFor="language">
            <Select id="language" value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="hi">{t('hindi')}</option>
              <option value="en">{t('english')}</option>
            </Select>
          </Field>

          {/* Visibility choice — both always selectable; "show" is recommended. */}
          <fieldset data-testid="visibility-choice" data-choice={showDetails ? 'show' : 'hidden'} className="mt-4 rounded-2xl border-2 border-green-200 bg-green-50/60 p-4">
            <legend className="px-1 text-lg font-bold text-stone-900">{t('vis_title')}</legend>
            <p className="mb-3 text-[15px] leading-relaxed text-stone-800">{t('vis_explain')}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button type="button" data-testid="visibility-show" aria-pressed={showDetails} onClick={() => setShowDetails(true)} className={choice(showDetails)}>
                <span>{showDetails ? '✓ ' : ''}{t('vis_show')}</span>
              </button>
              <button type="button" data-testid="visibility-hidden" aria-pressed={!showDetails} onClick={() => setShowDetails(false)} className={choice(!showDetails)}>
                <span>{!showDetails ? '✓ ' : ''}{t('vis_hidden')}</span>
              </button>
            </div>
            {!showDetails && <p data-testid="visibility-warning" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[15px] font-semibold text-amber-900">{t('vis_hidden_warning')}</p>}
          </fieldset>

          {/* Optional किसान profile (never blocks account creation). */}
          <div className="mt-4 rounded-2xl border-2 border-green-100 bg-green-50/40 p-4">
            <h3 className="mb-1 font-bold text-stone-800">{t('kisan_profile_title')}</h3>
            <p className="mb-3 text-xs font-semibold text-green-800">🔒 {t('kisan_privacy')}</p>
            <KisanFields kisan={kisan} setK={setK} t={t} />
          </div>

          <BigButton type="submit" className="mt-2">{t('continue')}</BigButton>
        </form>
      )}

      {step === 'disclaimer' && (
        <div>
          <h2 className="mb-3 text-xl font-bold text-stone-800">{t('disclaimer_title')}</h2>
          <DisclaimerBanner which="signup" className="mb-5" />

          <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-stone-300 bg-white p-4">
            <input type="checkbox" data-testid="disclaimer-accept" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 h-6 w-6 shrink-0 accent-green-700" />
            <span className="text-base font-medium text-stone-800">{t('disclaimer_accept_label')}</span>
          </label>

          {busy ? (
            <Spinner />
          ) : (
            <BigButton onClick={submit} disabled={!accepted}>{t('accept_and_continue')}</BigButton>
          )}
        </div>
      )}
    </Screen>
  )
}
