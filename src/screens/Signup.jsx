import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { isValidPhone, isValidPincode } from '../lib/auth/authService'
import { Screen, Field, TextInput, Select, BigButton, Notice, Spinner } from '../components/ui'
import DisclaimerBanner from '../components/DisclaimerBanner'
import LanguageToggle from '../components/LanguageToggle'

// Two-step signup: (1) details form, (2) one-time disclaimer acknowledgment.
export default function Signup() {
  const { t, lang, setLang } = useLang()
  const { signup } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState('form') // 'form' | 'disclaimer'
  const [form, setForm] = useState({ full_name: '', phone: '', village_town: '', pincode: '' })
  const [accepted, setAccepted] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  function validateForm() {
    const errs = {}
    if (!form.full_name.trim()) errs.full_name = t('err_name_required')
    if (!isValidPhone(form.phone)) errs.phone = t('err_invalid_phone')
    if (!isValidPincode(form.pincode)) errs.pincode = t('err_invalid_pincode')
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  function goToDisclaimer(e) {
    e.preventDefault()
    setError(null)
    if (validateForm()) setStep('disclaimer')
  }

  async function submit() {
    setError(null)
    if (!accepted) {
      setError(t('err_disclaimer_not_accepted'))
      return
    }
    setBusy(true)
    try {
      await signup({
        full_name: form.full_name,
        phone: form.phone,
        village_town: form.village_town,
        pincode: form.pincode,
        language: lang,
        disclaimer_accepted: true,
      })
      navigate('/home', { replace: true })
    } catch (err) {
      // Server-side failures (e.g. pincode_not_found, phone_exists) land here.
      setError(t(err.i18nKey || 'err_unknown'))
      setStep('form') // send them back to fix the field
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen
      title={t('signup_title')}
      onBack={() => (step === 'disclaimer' ? setStep('form') : navigate('/'))}
      right={<LanguageToggle />}
    >
      {error && <Notice tone="error">{error}</Notice>}

      {step === 'form' && (
        <form onSubmit={goToDisclaimer} noValidate>
          <Field label={t('full_name')} htmlFor="full_name" required error={fieldErrors.full_name}>
            <TextInput
              id="full_name"
              value={form.full_name}
              onChange={set('full_name')}
              placeholder={t('full_name_ph')}
              autoComplete="name"
            />
          </Field>

          <Field label={t('phone_number')} htmlFor="phone" required error={fieldErrors.phone}>
            <TextInput
              id="phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={form.phone}
              onChange={set('phone')}
              placeholder={t('phone_ph')}
              autoComplete="tel"
            />
          </Field>

          <Field label={t('village_town')} htmlFor="village_town" hint={t('optional')}>
            <TextInput
              id="village_town"
              value={form.village_town}
              onChange={set('village_town')}
              placeholder={t('village_ph')}
            />
          </Field>

          <Field
            label={t('pincode')}
            htmlFor="pincode"
            required
            hint={t('pincode_help')}
            error={fieldErrors.pincode}
          >
            <TextInput
              id="pincode"
              type="tel"
              inputMode="numeric"
              maxLength={6}
              value={form.pincode}
              onChange={set('pincode')}
              placeholder={t('pincode_ph')}
            />
          </Field>

          <Field label={t('language')} htmlFor="language">
            <Select id="language" value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="hi">{t('hindi')}</option>
              <option value="en">{t('english')}</option>
            </Select>
          </Field>

          <BigButton type="submit" className="mt-2">
            {t('continue')}
          </BigButton>
        </form>
      )}

      {step === 'disclaimer' && (
        <div>
          <h2 className="mb-3 text-xl font-bold text-stone-800">{t('disclaimer_title')}</h2>
          <DisclaimerBanner which="signup" className="mb-5" />

          <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-stone-300 bg-white p-4">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 h-6 w-6 shrink-0 accent-green-700"
            />
            <span className="text-base font-medium text-stone-800">
              {t('disclaimer_accept_label')}
            </span>
          </label>

          {busy ? (
            <Spinner />
          ) : (
            <BigButton onClick={submit} disabled={!accepted}>
              {t('accept_and_continue')}
            </BigButton>
          )}
        </div>
      )}
    </Screen>
  )
}
