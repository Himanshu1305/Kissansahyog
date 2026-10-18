import { useState } from 'react'
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { isValidPhone, isValidEmail } from '../lib/auth/authService'
import { resolveNext } from '../lib/returnPath'
import { Screen, Field, TextInput, BigButton, Notice, Spinner } from '../components/ui'
import GuideHelpButton from '../features/guide/GuideHelpButton.jsx'

// Batch 7L-2 — ONE sign-in screen with both ways visible at once (no tabs):
//   A) email + password            B) mobile number (no OTP yet)
// Both end in the same session handling (AuthProvider → authService.storeSession).
// The mobile block is a small two-step machine ('number' → 'otp'); today the server signs in
// on the number alone so it never leaves 'number'. When OTP exists, authService.startPhoneLogin
// returns step 'otp' and the code box below appears — nothing here needs redesigning.
export default function Login() {
  const { t, setLang } = useLang()
  const { loginEmail, startPhoneLogin, verifyPhoneOtp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  // Where to return after login — the listing the user came from, or the dashboard.
  const next = resolveNext(params, location.state)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [phone, setPhone] = useState('')
  const [phoneStep, setPhoneStep] = useState('number') // 'number' | 'otp'
  const [challenge, setChallenge] = useState(null)
  const [otp, setOtp] = useState('')
  const [fieldError, setFieldError] = useState({}) // { email?, phone? }
  const [error, setError] = useState(null) // { where: 'email' | 'phone', text }
  const [busy, setBusy] = useState(null) // 'email' | 'phone' | null

  function finish(profile) {
    if (profile?.preferred_language) setLang(profile.preferred_language)
    navigate(next, { replace: true })
  }
  const fail = (where, err) => setError({ where, text: t(err.i18nKey || 'err_unknown') })

  async function submitEmail(e) {
    e.preventDefault()
    setError(null); setFieldError({})
    if (!isValidEmail(email)) { setFieldError({ email: t('err_invalid_email') }); return }
    setBusy('email')
    try { finish(await loginEmail(email, password)) } catch (err) { fail('email', err) } finally { setBusy(null) }
  }

  async function submitPhone(e) {
    e.preventDefault()
    setError(null); setFieldError({})
    if (!isValidPhone(phone)) { setFieldError({ phone: t('err_invalid_phone') }); return }
    setBusy('phone')
    try {
      const res = phoneStep === 'otp' ? await verifyPhoneOtp(challenge, otp) : await startPhoneLogin(phone)
      if (res.step === 'otp') { setChallenge(res.challenge); setPhoneStep('otp') } else finish(res.profile)
    } catch (err) { fail('phone', err) } finally { setBusy(null) }
  }

  const card = 'mb-4 rounded-2xl border-2 border-stone-200 bg-white p-4'

  return (
    <Screen title={t('login_title')} onBack={() => navigate('/')}>
      {/* Batch 10C: first-time visitors can watch the register demo (sheet over this page). The
          normal create-account link below is unchanged. */}
      {/* Batch 10E Phase 3A: no e-mail is needed — say so first; a tap moves to the mobile box (on
          phones it sits below the e-mail box). The e-mail box stays for existing e-mail accounts. */}
      <p className="mb-3">
        <a href="#phone" data-testid="login-no-email" onClick={(e) => { e.preventDefault(); const el = document.getElementById('phone'); el?.scrollIntoView?.({ block: 'center' }); el?.focus?.({ preventScroll: true }) }} className="inline-block rounded-full bg-[var(--ks-green-tint)] px-3 py-1 text-base font-bold text-[var(--ks-green-dark)]">
          📱 {t('login_no_email')}
        </a>
      </p>
      <div className="mb-3"><GuideHelpButton demoId="register" label="guide_login_first_time" testid="help-login" /></div>
      <div data-testid="login-screen" className="grid grid-cols-1 gap-x-4 lg:grid-cols-2">
        {/* A) Email + password */}
        <form onSubmit={submitEmail} noValidate data-testid="login-email-form" className={card}>
          <h2 className="mb-1 text-xl font-bold text-stone-900">✉️ {t('login_email_heading')}</h2>
          <p className="mb-3 text-stone-600">{t('email_login_help')}</p>
          {error?.where === 'email' && <div data-testid="login-email-error"><Notice tone="error">{error.text}</Notice></div>}
          <Field label={t('email_label')} htmlFor="email" required error={fieldError.email}>
            <TextInput id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('email_ph')} autoComplete="email" />
          </Field>
          <Field label={t('password_label')} htmlFor="password" required>
            <div className="flex gap-2">
              <TextInput id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="min-w-0 flex-1" />
              <button type="button" data-testid="password-toggle" aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)} className="shrink-0 rounded-xl border-2 border-stone-300 bg-white px-3 text-[15px] font-bold text-green-800">
                {t(showPassword ? 'password_hide' : 'password_show')}
              </button>
            </div>
          </Field>
          {busy === 'email' ? <Spinner /> : <BigButton type="submit" data-testid="login-email-submit" disabled={!!busy}>{t('login_email_button')}</BigButton>}
        </form>

        {/* B) Mobile number */}
        <form onSubmit={submitPhone} noValidate data-testid="login-phone-form" className={card}>
          <h2 className="mb-1 text-xl font-bold text-stone-900">📱 {t('login_phone_heading')}</h2>
          <p className="mb-3 text-stone-600">{t('login_help')}</p>
          {error?.where === 'phone' && <div data-testid="login-phone-error"><Notice tone="error">{error.text}</Notice></div>}
          <Field label={t('phone_number')} htmlFor="phone" required error={fieldError.phone}>
            <TextInput id="phone" type="tel" inputMode="numeric" maxLength={10} value={phone} onChange={(e) => { setPhone(e.target.value); setPhoneStep('number') }} placeholder={t('phone_ph')} autoComplete="tel" />
          </Field>
          {phoneStep === 'otp' && (
            <Field label={t('login_otp_label')} htmlFor="otp" required>
              <TextInput id="otp" data-testid="login-otp" type="tel" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} autoComplete="one-time-code" />
            </Field>
          )}
          {busy === 'phone' ? <Spinner /> : <BigButton type="submit" data-testid="login-phone-submit" disabled={!!busy}>{t('login_phone_button')}</BigButton>}
          <p data-testid="login-otp-note" className="mt-3 rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700">ℹ️ {t('login_otp_soon')}</p>
        </form>
      </div>

      <Link to={next && next !== '/home' ? `/signup?next=${encodeURIComponent(next)}` : '/signup'} className="mt-2 block text-center text-base font-semibold text-green-800 underline">
        {t('no_account_yet')}
      </Link>
    </Screen>
  )
}
