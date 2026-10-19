import { useEffect, useRef, useState } from 'react'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { useAuth } from '../../lib/auth/AuthProvider'
import { Field, TextInput, BigButton, Notice } from '../ui'

// Batch 11A — the 6-digit SMS code step (sign-in and sign-up). Shown after "कोड भेजें" sent a code.
//   challenge  { id, phone, purpose, resendAfter } from authService (a new one after each resend)
//   onDone(profile)  signed in / account created
//   onChallenge(next)  a new code was sent (resend)
//   onChangeNumber()   back to the number
// Mobile first: one column, big touch targets (>= 48 px), numeric keypad, autocomplete="one-time-code" so
// phones can offer the code from the SMS. No animation (the countdown is plain text, not announced every
// second); messages use role="alert" / aria-live. The button keeps its place while busy (no layout shift).
export default function OtpStep({ challenge, onDone, onChallenge, onChangeNumber, testid = 'otp' }) {
  const { t } = useLang()
  const { verifyPhoneOtp, resendOtp } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState(null) // 'verify' | 'resend' | null
  const [left, setLeft] = useState(challenge.resendAfter || 30)
  const [verified, setVerified] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { setLeft(challenge.resendAfter || 30); setCode(''); inputRef.current?.focus?.() }, [challenge.id, challenge.resendAfter])
  useEffect(() => {
    if (left <= 0) return undefined
    const id = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [left])

  const masked = `+91 ${challenge.phone.slice(0, 5)} ${challenge.phone.slice(5)}`

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setError(null); setInfo(null)
    if (!/^[0-9]{6}$/.test(code)) { setError(t('err_otp_code_format')); inputRef.current?.focus?.(); return }
    setBusy('verify')
    try {
      const res = await verifyPhoneOtp(challenge, code)
      setVerified(true)
      onDone(res.profile)
    } catch (err) {
      setError(t(err.i18nKey || 'err_unknown'))
      if (err.code === 'otp_wrong') { setCode(''); inputRef.current?.focus?.() }
    } finally {
      setBusy(null)
    }
  }

  async function resend() {
    if (busy || left > 0) return
    setError(null); setInfo(null)
    setBusy('resend')
    try {
      const next = await resendOtp(challenge)
      onChallenge(next)
      setInfo(t('otp_resent'))
    } catch (err) {
      setError(t(err.i18nKey || 'err_unknown'))
      if (err.retryAfter) setLeft(Math.min(err.retryAfter, 3600))
    } finally {
      setBusy(null)
    }
  }

  return (
    <form onSubmit={submit} noValidate data-testid={`${testid}-step`} aria-labelledby={`${testid}-sent`}>
      <p id={`${testid}-sent`} data-testid={`${testid}-sent`} aria-live="polite" className="mb-3 text-base text-stone-700">
        {t('otp_sent_to').replace('{phone}', masked)}
      </p>
      {verified && <div data-testid={`${testid}-verified`}><Notice tone="success">✓ {t('otp_verified')}</Notice></div>}
      {error && <div data-testid={`${testid}-error`}><Notice tone="error">{error}</Notice></div>}
      {info && !error && <p data-testid={`${testid}-info`} role="status" className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-[15px] text-green-900">{info}</p>}
      <Field label={t('otp_code_label')} htmlFor={`${testid}-code`} required>
        <TextInput
          id={`${testid}-code`}
          data-testid={`${testid}-code`}
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="text-center text-2xl tracking-[0.4em]"
          aria-describedby={`${testid}-sent`}
        />
      </Field>
      <BigButton type="submit" data-testid={`${testid}-submit`} disabled={!!busy || verified} className="mt-1">
        {busy === 'verify' ? t('loading') : t('otp_verify_button')}
      </BigButton>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button type="button" data-testid={`${testid}-resend`} onClick={resend} disabled={!!busy || left > 0}
          className="min-h-[48px] rounded-xl border-2 border-green-700 bg-white px-3 text-base font-bold text-green-800 disabled:border-stone-300 disabled:text-stone-500">
          {left > 0 ? t('otp_resend_in').replace('{s}', String(left)) : busy === 'resend' ? t('loading') : t('otp_resend')}
        </button>
        <button type="button" data-testid={`${testid}-change`} onClick={onChangeNumber} disabled={!!busy}
          className="min-h-[48px] rounded-xl border-2 border-stone-300 bg-white px-3 text-base font-bold text-stone-800">
          {t('otp_change_number')}
        </button>
      </div>
    </form>
  )
}
