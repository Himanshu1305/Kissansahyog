import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { isValidPhone, isValidEmail } from '../lib/auth/authService'
import { Screen, Field, TextInput, BigButton, Notice, Spinner } from '../components/ui'
import LanguageToggle from '../components/LanguageToggle'
import AuthTabs from '../components/AuthTabs'

// Returning-user login. Phone tab: number match, no OTP (MVP trust-based).
// Email tab: Supabase email + password.
export default function Login() {
  const { t, lang, setLang } = useLang()
  const { login, loginEmail } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('phone')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldError, setFieldError] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setFieldError(null)
    if (mode === 'phone' && !isValidPhone(phone)) {
      setFieldError(t('err_invalid_phone'))
      return
    }
    if (mode === 'email' && !isValidEmail(email)) {
      setFieldError(t('err_invalid_email'))
      return
    }
    setBusy(true)
    try {
      const profile = mode === 'phone' ? await login(phone) : await loginEmail(email, password)
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
        <AuthTabs mode={mode} onChange={(m) => { setMode(m); setFieldError(null); setError(null) }} />

        {mode === 'phone' ? (
          <>
            <p className="mb-4 text-stone-600">{t('login_help')}</p>
            <Field label={t('phone_number')} htmlFor="phone" required error={fieldError}>
              <TextInput id="phone" type="tel" inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('phone_ph')} autoComplete="tel" />
            </Field>
          </>
        ) : (
          <>
            <p className="mb-4 text-stone-600">{t('email_login_help')}</p>
            <Field label={t('email_label')} htmlFor="email" required error={fieldError}>
              <TextInput id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('email_ph')} autoComplete="email" />
            </Field>
            <Field label={t('password_label')} htmlFor="password" required>
              <TextInput id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('password_ph')} autoComplete="current-password" />
            </Field>
          </>
        )}

        {busy ? <Spinner /> : <BigButton type="submit">{t('login_button')}</BigButton>}

        <Link to="/signup" className="mt-5 block text-center text-base font-semibold text-green-800 underline">
          {t('no_account_yet')}
        </Link>
      </form>
    </Screen>
  )
}
