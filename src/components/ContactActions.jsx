import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import DisclaimerBanner from './DisclaimerBanner'
import { Spinner, Notice } from './ui'
import { getListingContact, incrementContactClick } from '../lib/listings/listingsApi'
import { generateListingMessage } from '../lib/share/shareMessages'

// Batch1 item 4 — Call + WhatsApp on every listing (card + detail), in one or two
// taps. Reuses the existing reveal RPC (getListingContact), the phoneReveal
// disclaimer, incrementContactClick logging, and the global BuyerComplianceGate
// (it intercepts the tel:/wa.me links on the first platform-wide tap).
//
// Flow: first tap opens a small bottom sheet with the one-line disclaimer; the
// number is revealed there, then Call (tel:) and WhatsApp (wa.me) actions appear.
// Logged-out users are sent to login with a return path back to this listing.
// Hidden on the viewer's own listing.
function waLink(phone, message) {
  const digits = String(phone || '').replace(/\D/g, '').slice(-10)
  return `https://wa.me/91${digits}?text=${encodeURIComponent(message)}`
}

export default function ContactActions({ listing, size = 'card', className = '' }) {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [contact, setContact] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Never show on the viewer's own listing.
  if (user && listing?.user_id && user.id === listing.user_id) return null

  function start(e) {
    e?.stopPropagation?.()
    e?.preventDefault?.()
    // Logged-out: go to login, then return to this same listing to continue the reveal.
    if (!user) {
      navigate(`/login?next=/listing/${listing.id}`)
      return
    }
    setOpen(true)
    if (!contact && !busy) {
      setBusy(true)
      setError(null)
      incrementContactClick(listing.id)
      getListingContact(listing.id)
        .then((c) => setContact(c))
        .catch((err) => setError(t(err.i18nKey || 'err_unknown')))
        .finally(() => setBusy(false))
    }
  }

  const close = (e) => { e?.stopPropagation?.(); setOpen(false) }

  const big = size === 'detail'
  const btnBase = big
    ? 'flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-base font-bold'
    : 'flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[13px] font-bold'

  const message = typeof window !== 'undefined'
    ? generateListingMessage(listing, `${window.location.origin}/listing/${listing.id}`, lang)
    : generateListingMessage(listing, '', lang)

  return (
    <>
      <div className={`flex gap-2 ${className}`} data-testid="contact-actions">
        <button type="button" onClick={start} data-testid="contact-call" className={`${btnBase} bg-[var(--ks-green)] text-white active:bg-[var(--ks-green-dark)]`}>
          📞 {t('contact_call')}
        </button>
        <button type="button" onClick={start} data-testid="contact-whatsapp" className={`${btnBase} bg-[var(--ks-whatsapp)] text-white active:brightness-95`}>
          <span aria-hidden="true">🟢</span> {t('contact_whatsapp')}
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          data-testid="contact-sheet"
          onClick={close}
        >
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <DisclaimerBanner which="phoneReveal" className="mb-3" />
            {error && <Notice tone="error">{error}</Notice>}
            {busy ? (
              <Spinner />
            ) : contact ? (
              <div>
                <p className="mb-3 text-center text-lg font-bold text-stone-900">
                  {contact.full_name} · {contact.phone}
                </p>
                <div className="flex gap-2">
                  <a href={`tel:${contact.phone}`} className="flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--ks-green)] px-4 py-3 text-base font-bold text-white">
                    📞 {t('contact_call')}
                  </a>
                  <a
                    href={waLink(contact.phone, message)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[48px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--ks-whatsapp)] px-4 py-3 text-base font-bold text-white"
                  >
                    <span aria-hidden="true">🟢</span> {t('contact_whatsapp')}
                  </a>
                </div>
              </div>
            ) : null}
            <button type="button" onClick={close} className="mt-4 w-full rounded-xl bg-stone-200 px-4 py-2.5 text-sm font-bold text-stone-700">
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
