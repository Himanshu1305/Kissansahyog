import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { isValidPhone } from '../lib/auth/authService'
import { Screen, Field, TextInput, BigButton, Notice, Spinner } from '../components/ui'
import LanguageToggle from '../components/LanguageToggle'

// Returning-user login: phone number match, no OTP (MVP trust-based).
export default function Login() {
  const { t, lang, setLang } = useLang()
  const { login } = useAuth()
  const navigate = useNavigate()

  const [phone, setPhone] = useState('')
  const [fieldError, setFieldError] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setFieldError(null)
    if (!isValidPhone(phone)) {
      setFieldError(t('err_invalid_phone'))
      return
    }
    setBusy(true)
    try {
      const profile = await login(phone)
      // Adopt the account's saved language on login.
      if (profile?.preferred_language) setLang(profile.preferred_language)
      navigate('/home', { replace: true })
    } catch (err) {
      setError(t(err.i18nKey || 'err_unknown'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen title={t('login_title')} onBack={() => navigate('/')} right={<LanguageToggle />}>
      {error && <Notice tone="error">{error}</Notice>}
      <form onSubmit={submit} noValidate>
        <p className="mb-4 text-stone-600">{t('login_help')}</p>
        <Field label={t('phone_number')} htmlFor="phone" required error={fieldError}>
          <TextInput
            id="phone"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('phone_ph')}
            autoComplete="tel"
          />
        </Field>

        {busy ? (
          <Spinner />
        ) : (
          <BigButton type="submit">{t('login_button')}</BigButton>
        )}

        <Link
          to="/signup"
          className="mt-5 block text-center text-base font-semibold text-green-800 underline"
        >
          {t('no_account_yet')}
        </Link>
      </form>
    </Screen>
  )
}
