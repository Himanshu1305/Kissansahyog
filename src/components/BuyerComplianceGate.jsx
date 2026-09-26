import { useEffect, useRef, useState } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'

// Phase 1b — one-time rules-compliance modal shown the FIRST time any user (logged in
// or anonymous) taps a WhatsApp or Call contact action ANYWHERE on the platform.
//
// Rather than editing every tap-site (current and future), this mounts a single
// document-level capture-phase click interceptor. It catches any <a> whose href is a
// `tel:` or WhatsApp link (or any element marked `data-contact-action`). If the browser
// hasn't accepted yet, it blocks the tap, shows the modal, and — on acceptance — sets a
// localStorage flag (never shown again for this browser) and immediately performs the
// original action so the tap is not lost.
const FLAG = 'ks_buyer_agreed_v1'

function hasAgreed() {
  try {
    return localStorage.getItem(FLAG) === '1'
  } catch {
    return false
  }
}

function isContactLink(el) {
  const a = el.closest && el.closest('a[href]')
  if (a) {
    const href = a.getAttribute('href') || ''
    if (href.startsWith('tel:')) return { el: a, href, target: a.getAttribute('target') }
    if (/wa\.me|api\.whatsapp\.com|whatsapp\.com\/send/i.test(href)) return { el: a, href, target: a.getAttribute('target') }
  }
  const marked = el.closest && el.closest('[data-contact-action]')
  if (marked) return { el: marked, href: null, target: null }
  return null
}

export default function BuyerComplianceGate() {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const pending = useRef(null) // the intercepted { el, href, target }

  useEffect(() => {
    function onClick(e) {
      if (hasAgreed()) return
      const hit = isContactLink(e.target)
      if (!hit) return
      // Block the tap and remember it so we can resume after acceptance.
      e.preventDefault()
      e.stopPropagation()
      pending.current = hit
      setOpen(true)
    }
    // Capture phase so we run before React/anchor default navigation.
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  function accept() {
    try {
      localStorage.setItem(FLAG, '1')
    } catch {
      /* private mode — proceed anyway */
    }
    setOpen(false)
    const p = pending.current
    pending.current = null
    if (!p) return
    // Resume the original action the user intended.
    if (p.href) {
      if (p.target === '_blank') window.open(p.href, '_blank', 'noopener,noreferrer')
      else window.location.assign(p.href)
    } else if (p.el && typeof p.el.click === 'function') {
      // Marked non-anchor action: replay the click (flag now set, so it passes through).
      p.el.click()
    }
  }

  function cancel() {
    pending.current = null
    setOpen(false)
  }

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      data-testid="buyer-compliance-modal"
      onClick={cancel}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-stone-900">{t('rules_modal_title')}</h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-700">{t('rules_agreement_buyer')}</p>
        <a
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm font-semibold text-green-800 underline"
        >
          {t('terms_title')}
        </a>
        <button
          type="button"
          onClick={accept}
          data-testid="buyer-compliance-accept"
          className="mt-5 w-full rounded-xl bg-green-700 px-4 py-3 text-base font-bold text-white active:bg-green-800"
        >
          {t('rules_agreement_accept')}
        </button>
      </div>
    </div>
  )
}
