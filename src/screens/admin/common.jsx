import { createContext, useContext, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Notice } from '../../components/ui'

// Batch 14A - small pieces shared by the console panels: who the admin is, a dialog, and the error line.
export const AdminCtx = createContext({ role: 'editor', isSuper: false, known: false })
export const useAdmin = () => useContext(AdminCtx)

// India time for the action log and "last changed" lines.
export function istText(iso, lang) {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return ''
  try {
    return new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(ms))
  } catch { return iso }
}

// An error line. A session_required error also offers the way to the login screen.
export function AdminError({ error, t }) {
  if (!error) return null
  const code = error.code
  return (
    <div data-testid="admin-error" data-code={code || ''}>
      <Notice tone="error">{t(error.i18nKey || 'err_unknown')}</Notice>
      {code === 'session_required' && (
        <p className="mb-3"><Link to="/login" data-testid="admin-relogin" className="inline-flex min-h-[48px] items-center rounded-xl bg-green-700 px-4 font-bold text-white">{t('adm_relogin')}</Link></p>
      )}
    </div>
  )
}

// A plain modal dialog: Esc closes, focus starts inside, buttons are 48 px.
export function Dialog({ title, onClose, children, testId }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    el?.querySelector('textarea, input, select, button')?.focus?.()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} data-testid={testId} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
        <h3 className="mb-3 text-lg font-bold text-stone-900">{title}</h3>
        {children}
      </div>
    </div>
  )
}

export const btn = 'inline-flex min-h-[48px] items-center justify-center rounded-xl px-4 text-base font-bold'
export const btnGreen = `${btn} bg-green-700 text-white disabled:opacity-50`
export const btnRed = `${btn} bg-red-700 text-white disabled:opacity-50`
export const btnPlain = `${btn} bg-stone-200 text-stone-800`

export function Chip({ tone = 'stone', children, testId }) {
  const tones = {
    stone: 'bg-stone-200 text-stone-800', green: 'bg-green-100 text-green-900', red: 'bg-red-100 text-red-900', amber: 'bg-amber-100 text-amber-900', blue: 'bg-blue-100 text-blue-900',
  }
  return <span data-testid={testId} className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${tones[tone]}`}>{children}</span>
}

// "Only the super admin can use this" - shown in place of a super-only panel's controls.
export function SuperOnlyNote({ t }) {
  return <p data-testid="super-only-note" className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">{t('adm_super_only')}</p>
}
