// Batch 10G — admin actions on ANY listing: disable (reason required, the seller sees it), enable
// (when an admin disabled it) and DELETE PERMANENTLY (reason + typing "DELETE"; repeats the category).
// Rendered only for user.is_admin (Admin page, reports list, and lazily on the listing detail page);
// the server refuses every one of these calls for a non-admin (require_admin).
import { useState } from 'react'
import { useLang } from '../../lib/i18n/LanguageProvider'
import { CATEGORY_META } from '../../lib/listings/catalog'
import { adminSetListingDisabled, adminDeleteListing } from '../../lib/admin/adminApi'
import { listingErrorKey } from '../../lib/listings/listingsApi'
import { ConfirmDeleteDialog } from './OwnerListingActions'

const MAX_REASON = 300
const errKey = (err) => (err?.code === 'reason_required' || err?.code === 'reason_too_long' ? 'admin_reason_required' : listingErrorKey(err))

// 'active' | 'disabled_admin' | 'disabled_seller' | 'closed' | 'removed'
export function adminStatus(l) {
  if (l.status === 'disabled') return l.admin_disabled_at ? 'disabled_admin' : 'disabled_seller'
  return l.status
}

export function AdminStatusBadge({ listing }) {
  const { t } = useLang()
  const st = adminStatus(listing)
  const label = { active: t('badge_active'), closed: t('badge_found'), removed: t('status_removed'), disabled_admin: t('badge_admin_disabled'), disabled_seller: t('admin_status_disabled_seller') }[st] || st
  const tone = st === 'active' ? 'bg-blue-100 text-blue-800' : st === 'disabled_admin' ? 'bg-red-100 text-red-800' : 'bg-stone-200 text-stone-700'
  return <span data-testid="admin-status" data-status={st} className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${tone}`}>{label}</span>
}

/**
 * listing   — { id, category, status, admin_disabled_at?, admin_disabled_reason? }
 * actorId   — the admin's profile id
 * onChanged — (kind) after success: 'disabled' | 'enabled' | 'deleted'
 * deleteOnly — only the "Delete permanently" button (reports list shortcut)
 */
export default function AdminListingActions({ listing, actorId, onChanged, onError, deleteOnly = false, compact = false }) {
  const { t, lang } = useLang()
  const [dialog, setDialog] = useState(null) // 'disable' | 'delete' | null
  const [reason, setReason] = useState('')
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [localErr, setLocalErr] = useState(null)
  const st = adminStatus(listing)
  const category = CATEGORY_META[listing.category]?.[lang] || listing.category || ''
  const trimmed = reason.trim()
  const reasonOk = trimmed.length > 0 && trimmed.length <= MAX_REASON
  const close = () => { if (!busy) { setDialog(null); setReason(''); setTyped(''); setLocalErr(null) } }

  async function run(fn, kind) {
    setBusy(true)
    setLocalErr(null)
    try {
      await fn()
      setBusy(false)
      setDialog(null); setReason(''); setTyped('')
      onChanged?.(kind)
    } catch (err) {
      setBusy(false)
      const msg = t(errKey(err))
      if (dialog) setLocalErr(msg)
      else onError?.(msg)
    }
  }
  const enable = () => run(() => adminSetListingDisabled(actorId, listing.id, false, null), 'enabled')

  const btn = `min-h-[44px] rounded-lg px-3 ${compact ? 'text-sm' : 'text-base'} font-bold disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--ks-saffron)]`
  return (
    <div role="group" aria-label={t('admin_listing_actions_label')} data-testid="admin-actions" className="flex flex-wrap gap-2">
      {!deleteOnly && st === 'active' && (
        <button type="button" data-testid="admin-disable" disabled={busy} onClick={() => setDialog('disable')} className={`${btn} border-2 border-stone-400 bg-white text-stone-800`}>⏸ {t('listing_disable')}</button>
      )}
      {!deleteOnly && st === 'disabled_admin' && (
        <button type="button" data-testid="admin-enable" disabled={busy} onClick={enable} className={`${btn} bg-green-700 text-white`}>▶ {t('listing_enable')}</button>
      )}
      <button type="button" data-testid="admin-delete" disabled={busy} onClick={() => setDialog('delete')} className={`${btn} bg-red-700 text-white active:bg-red-800`}>🗑 {t('admin_delete_perm')}</button>

      <ConfirmDeleteDialog
        open={dialog === 'disable'}
        testId="admin-disable-dialog"
        title={t('admin_disable_title')}
        body={t('admin_disable_body')}
        yesLabel={busy ? '…' : t('listing_disable')}
        noLabel={t('listing_delete_no')}
        busy={busy}
        yesDisabled={!reasonOk}
        onYes={() => run(() => adminSetListingDisabled(actorId, listing.id, true, trimmed), 'disabled')}
        onNo={close}
      >
        <ReasonBox t={t} value={reason} onChange={setReason} note={t('admin_reason_seller_note')} testId="admin-disable-reason" />
        {localErr && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{localErr}</p>}
      </ConfirmDeleteDialog>

      <ConfirmDeleteDialog
        open={dialog === 'delete'}
        testId="admin-delete-dialog"
        title={t('admin_delete_title')}
        body={t('admin_delete_body').replace('{category}', category)}
        yesLabel={busy ? t('listing_deleting') : t('admin_delete_perm')}
        noLabel={t('listing_delete_no')}
        busy={busy}
        yesDisabled={!reasonOk || typed.trim().toUpperCase() !== 'DELETE'}
        onYes={() => run(() => adminDeleteListing(actorId, listing.id, trimmed), 'deleted')}
        onNo={close}
      >
        <ReasonBox t={t} value={reason} onChange={setReason} note={t('admin_reason_log_note')} testId="admin-delete-reason" />
        <label className="mt-3 block text-sm font-semibold text-stone-700">
          {t('admin_delete_type_label')}
          <input data-testid="admin-delete-type" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false}
            className="mt-1 block min-h-[44px] w-full rounded-lg border-2 border-stone-300 px-3 text-base tracking-widest" />
        </label>
        {localErr && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{localErr}</p>}
      </ConfirmDeleteDialog>
    </div>
  )
}

function ReasonBox({ t, value, onChange, note, testId }) {
  return (
    <label className="mt-3 block text-sm font-semibold text-stone-700">
      {t('admin_reason_label')}
      <textarea data-testid={testId} value={value} onChange={(e) => onChange(e.target.value.slice(0, MAX_REASON))} rows={3} maxLength={MAX_REASON}
        className="mt-1 block w-full rounded-lg border-2 border-stone-300 p-2 text-base" />
      <span className="mt-0.5 flex justify-between text-xs font-normal text-stone-500"><span>{note}</span><span>{value.trim().length}/{MAX_REASON}</span></span>
    </label>
  )
}
