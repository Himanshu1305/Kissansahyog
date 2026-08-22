import { disclaimers } from '../lib/i18n/disclaimers'

// Visible, colored disclaimer banner. Always shows Hindi (primary) + English
// (secondary) together — never small print. `which` picks the exact spec copy.
export default function DisclaimerBanner({ which, className = '' }) {
  const copy = disclaimers[which]
  if (!copy) return null
  return (
    <div
      className={`rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 text-amber-900 ${className}`}
      role="note"
    >
      <p className="flex gap-2 text-base font-semibold leading-snug">
        <span aria-hidden="true">⚠️</span>
        <span>{copy.hi}</span>
      </p>
      <p className="mt-1 pl-6 text-sm leading-snug text-amber-800">{copy.en}</p>
    </div>
  )
}
