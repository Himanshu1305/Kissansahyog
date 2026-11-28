import { useRef, useState } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { resolveNext } from '../lib/returnPath'
import { isValidEmail } from '../lib/auth/authService'
import { Screen, Field, TextInput, BigButton, Notice, Spinner } from '../components/ui'
import DisclaimerBanner from '../components/DisclaimerBanner'
import EmailPasswordFields from '../components/auth/EmailPasswordFields'
import PlaceField from '../components/location/PlaceField'

// Batch 30 - register with e-mail + password and no mobile number. Any e-mail address works (it need not be Gmail).
// The farmer sign-up (name + mobile, Signup.jsx) is unchanged; this is the second way in. Only an e-mail login can
// be made an admin, so a person who will help run the site registers here.
export default function SignupEmail() {
  const { t, lang } = useLang()
  const { registerEmail } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const next = resolveNext(params, location.state)

  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [place, setPlace] = useState(null)
  const [showDetails, setShowDetails] = useState(true)
  const [accepted, setAccepted] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)

  const clearErr = (k) => setFieldErrors((fe) => (fe[k] ? { ...fe, [k]: undefined } : fe))
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); clearErr(k) }

  function validateForm() {
    const errs = {}
    if (!form.full_name.trim()) errs.full_name = t('err_name_required')
    if (!isValidEmail(form.email)) errs.email = t('err_invalid_email')
    if (String(form.password).length < 8) errs.password = t('err_password_short')
    if (!place) errs.place = t('err_place_required')
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function submit(e) {
    e?.preventDefault()
    if (busy || inFlight.current) return
    setError(null)
    const ok = validateForm()
    if (!accepted) setError(t('err_disclaimer_not_accepted'))
    if (!ok || !accepted) { window.scrollTo?.(0, 0); return }
    inFlight.current = true
    setBusy(true)
    try {
      await registerEmail({ full_name: form.full_name, email: form.email, password: form.password, place, language: lang, disclaimer_accepted: true, show_details: showDetails })
      navigate(next, { replace: true })
    } catch (err) {
      const key = err.i18nKey || 'err_unknown'
      const field = { err_name_required: 'full_name', err_invalid_email: 'email', err_email_exists: 'email', err_password_short: 'password', err_place_required: 'place' }[key]
      if (field) setFieldErrors({ [field]: t(key) })
      setError(t(key))
      window.scrollTo?.(0, 0)
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return (
    <Screen title={t('signup_email_title')} onBack={() => navigate('/signup')}>
      <p className="mb-3 text-stone-600">{t('signup_email_help')}</p>
      {error && <div data-testid="signup-email-error"><Notice tone="error">{error}</Notice></div>}
      <form onSubmit={submit} noValidate data-testid="signup-email-form">
        <Field label={t('full_name')} htmlFor="full_name" required error={fieldErrors.full_name}>
          <TextInput id="full_name" value={form.full_name} onChange={set('full_name')} placeholder={t('full_name_ph')} autoComplete="name" />
        </Field>

        <EmailPasswordFields t={t} values={{ email: form.email, password: form.password }} errors={{ email: fieldErrors.email, password: fieldErrors.password }} onChange={(k) => set(k)} />

        <PlaceField id="village_town" value={place} onChange={(p) => { setPlace(p); clearErr('place') }} error={fieldErrors.place} />

        <div data-testid="visibility-choice" data-choice={showDetails ? 'show' : 'hidden'} className="mt-3">
          <p className="mb-1 text-base font-semibold text-stone-800">{t('vis_title')}</p>
          <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border-2 border-stone-300 bg-white px-3 py-2">
            <input type="checkbox" data-testid="visibility-show" checked={showDetails} onChange={(e) => setShowDetails(e.target.checked)} className="h-6 w-6 shrink-0 accent-green-700" />
            <span className="text-base font-medium text-stone-800">{t('vis_show')}</span>
          </label>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">{t('vis_explain')}</p>
          {!showDetails && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[15px] font-semibold text-amber-900">{t('vis_hidden_warning')}</p>}
        </div>

        <h2 className="mb-3 mt-5 text-xl font-bold text-stone-800">{t('disclaimer_title')}</h2>
        <DisclaimerBanner which="signup" className="mb-4" />
        <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-stone-300 bg-white p-4">
          <input type="checkbox" data-testid="disclaimer-accept" checked={accepted} onChange={(e) => { setAccepted(e.target.checked); if (e.target.checked) setError((m) => (m === t('err_disclaimer_not_accepted') ? null : m)) }} className="mt-1 h-6 w-6 shrink-0 accent-green-700" />
          <span className="text-base font-medium text-stone-800">{t('disclaimer_accept_label')}</span>
        </label>

        {busy ? <Spinner /> : <BigButton type="submit" data-testid="signup-email-submit">{t('accept_and_continue')}</BigButton>}
      </form>
      <Link to="/signup" className="mt-4 block text-center text-base font-semibold text-green-800 underline">{t('signup_with_mobile')}</Link>
    </Screen>
  )
}
