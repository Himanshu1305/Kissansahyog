// Small hand-built Tailwind component kit — no heavy UI library (perf budget).
// Designed for low digital-literacy users: large tap targets, clear labels,
// generous spacing, obvious primary actions.
import { useLang } from '../lib/i18n/LanguageProvider'
import PageShell from './layout/PageShell.jsx'

// Page shell: the global NavBar (via PageShell) + a slim title row with an
// optional back button. Every Screen-based route therefore gets the same NavBar
// and (on mobile) the global bottom tab bar. `width` picks the inner measure:
// 'content' (~70ch readable column, default) for forms/prose, 'wide' for grids.
export function Screen({ title, onBack, right, children, contentClassName = '', width = 'wide' }) {
  const { t } = useLang()
  return (
    <PageShell width={width} mainClassName={contentClassName}>
      {(title || onBack || right) && (
        <div className="mb-3 flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label={t('back')}
              className="grid h-11 w-11 place-items-center rounded-lg text-2xl text-[var(--ks-ink)] hover:bg-[var(--ks-bg-soft)] active:bg-[var(--ks-border)]"
            >
              ‹
            </button>
          )}
          {title && <h1 className="flex-1 truncate text-xl font-bold text-[var(--ks-ink)]">{title}</h1>}
          {right}
        </div>
      )}
      {children}
    </PageShell>
  )
}

// Large primary/secondary/danger button.
export function BigButton({ variant = 'primary', className = '', disabled, children, ...props }) {
  const base =
    'w-full rounded-xl px-5 py-3 text-lg font-bold transition select-none disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-green-700 text-white active:bg-green-800 hover:bg-green-600',
    secondary: 'bg-white text-green-800 border-2 border-green-700 active:bg-green-50',
    danger: 'bg-red-600 text-white active:bg-red-700 hover:bg-red-500',
    plain: 'bg-stone-200 text-stone-800 active:bg-stone-300',
  }
  return (
    <button disabled={disabled} className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

// Labelled field wrapper.
export function Field({ label, htmlFor, required, hint, error, children }) {
  return (
    <div className="mb-2">
      <label htmlFor={htmlFor} className="mb-0.5 block text-base font-semibold text-stone-800">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-0.5 text-sm text-stone-500">{hint}</p>}
      {error && <p className="mt-0.5 text-sm font-medium text-red-600">{error}</p>}
    </div>
  )
}

const controlClass =
  'w-full rounded-xl border-2 border-stone-300 bg-white px-4 py-3 text-lg text-stone-900 outline-none focus:border-green-600'

export function TextInput({ className = '', ...props }) {
  return <input className={`${controlClass} ${className}`} {...props} />
}

export function Select({ className = '', children, ...props }) {
  return (
    <select className={`${controlClass} ${className}`} {...props}>
      {children}
    </select>
  )
}

export function TextArea({ className = '', rows = 3, ...props }) {
  return <textarea rows={rows} className={`${controlClass} ${className}`} {...props} />
}

// Inline error / info message block.
export function Notice({ tone = 'error', children }) {
  if (!children) return null
  const tones = {
    error: 'bg-red-50 text-red-800 border-red-300',
    info: 'bg-blue-50 text-blue-800 border-blue-300',
    success: 'bg-green-50 text-green-800 border-green-300',
  }
  return (
    <div role="alert" className={`mb-4 rounded-xl border-2 px-4 py-3 text-base ${tones[tone]}`}>
      {children}
    </div>
  )
}

export function Spinner({ label }) {
  const { t } = useLang()
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-stone-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-green-700" />
      <span>{label || t('loading')}</span>
    </div>
  )
}
