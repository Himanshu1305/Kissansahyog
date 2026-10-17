import { useRef, useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { resolveNext } from '../lib/returnPath'
import { isValidPhone, isValidEmail, MIN_PASSWORD } from '../lib/auth/authService'
import { Screen, Field, TextInput, BigButton, Notice, Spinner } from '../components/ui'
import DisclaimerBanner from '../components/DisclaimerBanner'
import PlaceField from '../components/location/PlaceField'
import EmailPasswordFields from '../components/auth/EmailPasswordFields'

// Batch 10A Task E — ONE short page: name, mobile, e-mail + password, village/town, one
// "show my details" checkbox, the one-time acknowledgment (unchanged text) and Register.
// No language dropdown (the app's active language is used) and no किसान block (it lives on
// Profile). Signup sends the same "empty" kisan object the old untouched block sent, so
// applyKisan / app_register behave exactly as before.
const EMPTY_KISAN = Object.freeze({ land_acres: '', main_crops: '', interest_lease: false, interest_equipment: false, whatsapp_opt_in: false, preferred_mandi: '' })

export default function Signup() {
  const { t, lang } = useLang()
  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const next = resolveNext(params, location.state)

  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '' })
  const [place, setPlace] = useState(null) // { label, lat, lng, district }
  // "Show my details" is the recommended choice and starts ticked.
  const [showDetails, setShowDetails] = useState(true)
  const [accepted, setAccepted] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false) // a fast double tap must not register twice

  // Typing in a field clears the message shown under it.
  const clearErr = (k) => setFieldErrors((fe) => (fe[k] ? { ...fe, [k]: undefined } : fe))
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); clearErr(k) }

  function validateForm() {
    const errs = {}
    if (!form.full_name.trim()) errs.full_name = t('err_name_required')
    if (!isValidPhone(form.phone)) errs.phone = t('err_invalid_phone')
    if (!isValidEmail(form.email)) errs.email = t('err_invalid_email')
    if (!form.password || form.password.length < MIN_PASSWORD) errs.password = t('err_password_short')
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
    if (!ok || !accepted) {
      window.scrollTo?.(0, 0)
      return
    }
    inFlight.current = true
    setBusy(true)
    try {
      await register({
        full_name: form.full_name, email: form.email, password: form.password, phone: form.phone,
        place, language: lang, disclaimer_accepted: true, show_details: showDetails, kisan: { ...EMPTY_KISAN },
      })
      navigate(next, { replace: true })
    } catch (err) {
      const key = err.i18nKey || 'err_unknown'
      // Put the message next to the field it is about, and at the top of the form.
      const field = { err_email_exists: 'email', err_invalid_email: 'email', err_password_short: 'password', err_phone_exists: 'phone', err_invalid_phone: 'phone' }[key]
      if (field) setFieldErrors({ [field]: t(key) })
      setError(t(key))
      window.scrollTo?.(0, 0)
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return (
    <Screen title={t('signup_title')} onBack={() => navigate('/')}>
      {/* Batch 7D: one line of text under the heading. */}
      <p data-testid="signup-free-registration" className="mb-3 inline-block rounded-full bg-[var(--ks-green-tint)] px-3 py-1 text-sm font-bold text-[var(--ks-green-dark)]">✓ {t('free_registration')}</p>

      {error && <div data-testid="signup-error"><Notice tone="error">{error}</Notice></div>}

      <form onSubmit={submit} noValidate data-testid="signup-form">
        <Field label={t('full_name')} htmlFor="full_name" required error={fieldErrors.full_name}>
          <TextInput id="full_name" value={form.full_name} onChange={set('full_name')} placeholder={t('full_name_ph')} autoComplete="name" />
        </Field>

        <Field label={t('phone_number')} htmlFor="phone" required error={fieldErrors.phone}>
          <TextInput id="phone" type="tel" inputMode="numeric" maxLength={10} value={form.phone} onChange={set('phone')} placeholder={t('phone_ph')} autoComplete="tel" />
        </Field>

        <EmailPasswordFields t={t} values={form} errors={fieldErrors} onChange={set} />

        <PlaceField id="village_town" value={place} onChange={(p) => { setPlace(p); clearErr('place') }} error={fieldErrors.place} />

        {/* Visibility — one line + checkbox (ticked = show, the recommended choice). */}
        <div data-testid="visibility-choice" data-choice={showDetails ? 'show' : 'hidden'} className="mt-3">
          <p className="mb-1 text-base font-semibold text-stone-800">{t('vis_title')}</p>
          <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border-2 border-stone-300 bg-white px-3 py-2">
            <input type="checkbox" data-testid="visibility-show" checked={showDetails} onChange={(e) => setShowDetails(e.target.checked)} className="h-6 w-6 shrink-0 accent-green-700" />
            <span className="text-base font-medium text-stone-800">{t('vis_show')}</span>
          </label>
          {/* The explanation text is kept (moved, not removed — consent wording awaits lawyer review). */}
          <p data-testid="visibility-explain" className="mt-1 text-sm leading-relaxed text-stone-600">{t('vis_explain')}</p>
          {!showDetails && <p data-testid="visibility-warning" className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[15px] font-semibold text-amber-900">{t('vis_hidden_warning')}</p>}
        </div>

        {/* The one-time acknowledgment — title and text unchanged, now on the same page. */}
        <h2 className="mb-3 mt-5 text-xl font-bold text-stone-800">{t('disclaimer_title')}</h2>
        <DisclaimerBanner which="signup" className="mb-4" />

        <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-stone-300 bg-white p-4">
          <input type="checkbox" data-testid="disclaimer-accept" checked={accepted} onChange={(e) => { setAccepted(e.target.checked); if (e.target.checked) setError((m) => (m === t('err_disclaimer_not_accepted') ? null : m)) }} className="mt-1 h-6 w-6 shrink-0 accent-green-700" />
          <span className="text-base font-medium text-stone-800">{t('disclaimer_accept_label')}</span>
        </label>

        {busy ? <Spinner /> : <BigButton type="submit">{t('accept_and_continue')}</BigButton>}
      </form>
    </Screen>
  )
}
