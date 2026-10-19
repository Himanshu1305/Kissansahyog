// Batch 10G — the seller's own actions on a listing: disable / enable and PERMANENT delete.
// Used on My Listings (/my) and on the seller's own listing detail page. Buttons are visible (not in a
// menu), at least 44 px tall. Delete always asks first (modal, "नहीं" focused) and waits for the server
// (no optimistic removal). An admin-disabled listing shows the reason and no enable button; delete stays.
// Errors are plain sentences (listingErrorKey), never raw codes.
import { useEffect, useRef, useState } from 'react'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { useNativeBack } from '../../lib/useNativeBack'
import { setMyListingDisabled, deleteMyListing, listingErrorKey } from '../../lib/listings/listingsApi'

// Status of a listing as the seller sees it: 'active' | 'disabled' | 'admin_disabled' | 'closed' | 'expired' | 'removed'
export function ownerStatus(l) {
  if (l.status === 'disabled') return l.admin_disabled ? 'admin_disabled' : 'disabled'
  if (l.status === 'closed') return 'closed'
  if (l.status === 'removed') return 'removed'
  if (l.is_expired) return 'expired'
  return 'active'
}

export function ConfirmDeleteDialog({ open, title, body, yesLabel, noLabel, busy, onYes, onNo, children, yesDisabled = false, testId = 'delete-dialog' }) {
  const noRef = useRef(null)
  const lastFocus = useRef(null)
  const latest = useRef({ busy, onNo })
  latest.current = { busy, onNo }
  useNativeBack(open, () => { if (!latest.current.busy) latest.current.onNo() })
  useEffect(() => {
    if (!open) return undefined
    lastFocus.current = document.activeElement
    noRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape' && !latest.current.busy) latest.current.onNo() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      try { if (lastFocus.current?.isConnected) lastFocus.current.focus() } catch { /* ignore */ }
    }
  }, [open])
  if (!open) return null
  return (
    <div className="ks-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => !busy && onNo()}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${testId}-title`}
        aria-describedby={`${testId}-body`}
        data-testid={testId}
        className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={`${testId}-title`} className="text-xl font-bold text-stone-900">{title}</h2>
        <p id={`${testId}-body`} className="mt-2 text-base leading-relaxed text-stone-700">{body}</p>
        {children}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button ref={noRef} type="button" disabled={busy} onClick={onNo} data-testid={`${testId}-no`}
            className="min-h-[48px] rounded-xl border-2 border-stone-300 bg-white px-4 text-lg font-bold text-stone-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-saffron)] disabled:opacity-50">
            {noLabel}
          </button>
          <button type="button" disabled={busy || yesDisabled} onClick={onYes} data-testid={`${testId}-yes`}
            className="min-h-[48px] rounded-xl bg-red-600 px-4 text-lg font-bold text-white active:bg-red-700 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-saffron)] disabled:opacity-50">
            {yesLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// A short message at the bottom of the screen; screen readers hear it (role="status"). No animation.
export function Toast({ message, onDone, ms = 3500 }) {
  useEffect(() => {
    if (!message) return undefined
    const id = setTimeout(onDone, ms)
    return () => clearTimeout(id)
  }, [message, onDone, ms])
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4">
      {message && <span data-testid="toast" className="rounded-xl bg-stone-900 px-4 py-3 text-base font-semibold text-white shadow-lg">{message}</span>}
    </div>
  )
}

/**
 * listing   — a get_my_listings row (status, is_expired, admin_disabled, admin_disabled_reason, category)
 * actorId   — the signed-in seller's profile id
 * onChanged — (kind, row) after success: kind 'disabled' | 'enabled' (row = updated listing) | 'deleted'
 * onError   — (message) plain sentence
 */
export default function OwnerListingActions({ listing, actorId, onChanged, onError }) {
  const { t } = useLang()
  const [busy, setBusy] = useState(null) // 'toggle' | 'delete' | null
  const [confirm, setConfirm] = useState(false)
  const st = ownerStatus(listing)
  const canToggle = st === 'active' || st === 'disabled'
  const fail = (err) => onError?.(t(listingErrorKey(err)))

  async function toggle() {
    setBusy('toggle')
    try {
      const row = await setMyListingDisabled({ actorId, listingId: listing.id, disabled: st === 'active' })
      onChanged?.(st === 'active' ? 'disabled' : 'enabled', row)
    } catch (err) { fail(err) } finally { setBusy(null) }
  }
  async function remove() {
    setBusy('delete')
    try {
      await deleteMyListing({ actorId, listingId: listing.id })
      setConfirm(false)
      onChanged?.('deleted', null)
    } catch (err) {
      setConfirm(false)
      fail(err)
    } finally { setBusy(null) }
  }

  if (st === 'removed') return null
  return (
    <div data-testid="owner-actions" data-status={st}>
      {st === 'disabled' && <p data-testid="owner-disabled-note" className="mt-1 text-sm font-semibold text-stone-600">{t('listing_disabled_note')}</p>}
      {st === 'admin_disabled' && (
        <div data-testid="owner-admin-disabled-note" className="mt-1 rounded-xl border-2 border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          <p className="font-semibold">{t('listing_admin_disabled_note')}</p>
          {listing.admin_disabled_reason && <p className="mt-0.5">{t('listing_admin_reason')}: <span data-testid="owner-admin-reason">{listing.admin_disabled_reason}</span></p>}
        </div>
      )}
      <div role="group" aria-label={t('listing_actions_label')} className="mt-2 grid grid-cols-2 gap-2">
        {canToggle ? (
          <button type="button" data-testid={st === 'active' ? 'listing-disable' : 'listing-enable'} disabled={!!busy} onClick={toggle}
            className={`min-h-[48px] rounded-xl border-2 px-3 text-base font-bold disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-saffron)] ${st === 'active' ? 'border-stone-400 bg-white text-stone-800' : 'border-green-700 bg-green-700 text-white'}`}>
            {busy === 'toggle' ? '…' : st === 'active' ? `⏸ ${t('listing_disable')}` : `▶ ${t('listing_enable')}`}
          </button>
        ) : <span />}
        <button type="button" data-testid="listing-delete" disabled={!!busy} onClick={() => setConfirm(true)}
          className="min-h-[48px] rounded-xl border-2 border-red-600 bg-white px-3 text-base font-bold text-red-700 active:bg-red-50 disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-saffron)]">
          🗑 {t('listing_delete')}
        </button>
      </div>
      <ConfirmDeleteDialog
        open={confirm}
        title={t('listing_delete_title')}
        body={t('listing_delete_body')}
        yesLabel={busy === 'delete' ? t('listing_deleting') : t('listing_delete_yes')}
        noLabel={t('listing_delete_no')}
        busy={busy === 'delete'}
        onYes={remove}
        onNo={() => setConfirm(false)}
      />
    </div>
  )
}
