import { useState } from 'react'
import { Field, TextInput } from '../ui'

// Batch 10A Task E — the e-mail + password block of the signup form, on its own so a later
// OTP batch can make it optional (pass required={false}) or drop it without touching the rest
// of the form. Today both stay REQUIRED (HARD RULE 4).
//   values   = { email, password }
//   errors   = { email?, password? }   (already-translated messages)
//   onChange = (key: 'email' | 'password') => (event) => void
export default function EmailPasswordFields({ t, values, errors = {}, onChange, required = true }) {
  const [showPassword, setShowPassword] = useState(false)
  return (
    <>
      <Field label={t('email_label')} htmlFor="email" required={required} error={errors.email}>
        <TextInput id="email" type="email" value={values.email} onChange={onChange('email')} placeholder={t('email_ph')} autoComplete="email" />
      </Field>

      <Field label={t('password_label')} htmlFor="password" required={required} hint={t('password_ph')} error={errors.password}>
        <div className="flex gap-2">
          <TextInput id="password" type={showPassword ? 'text' : 'password'} value={values.password} onChange={onChange('password')} placeholder={t('password_ph')} autoComplete="new-password" className="min-w-0 flex-1" />
          <button type="button" data-testid="password-toggle" aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)} className="shrink-0 rounded-xl border-2 border-stone-300 bg-white px-3 text-[15px] font-bold text-green-800">
            {t(showPassword ? 'password_hide' : 'password_show')}
          </button>
        </div>
      </Field>
    </>
  )
}
