import { useState } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'
import { submitListingReport } from '../lib/reports/reportsApi'

const REASONS = ['fraud', 'wrong_info', 'unsafe_equipment', 'wrong_rate', 'illegal_item', 'duplicate', 'harassment', 'other']

// "शिकायत करें" button + modal. Works on listings, vendors, cold-storage and
// jugaad pages (pass targetType/targetId). Anonymous-capable.
export default function ReportButton({ targetType = 'listing', targetId, listingId = null, className = '' }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [done, setDone] = useState(false)

  async function submit() {
    setErr(null)
    if (!reason) { setErr(t('err_report_reason_required')); return }
    setBusy(true)
    try {
      await submitListingReport({ targetType, targetId, listingId, reason, note, phone })
      setDone(true)
    } catch (e) {
      setErr(t(e.i18nKey || 'err_report_failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 text-sm font-semibold text-stone-500 hover:text-red-600 ${className}`}
      >
        ⚠️ {t('report_button')}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            {done ? (
              <div className="py-4 text-center">
                <p className="text-base font-semibold text-green-800">{t('report_success')}</p>
                <button type="button" onClick={() => setOpen(false)} className="mt-4 rounded-lg bg-green-700 px-4 py-2 font-bold text-white">{t('report_cancel')}</button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-stone-900">{t('report_title')}</h2>
                <p className="mt-1 text-sm text-stone-600">{t('report_intro')}</p>
                {err && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</p>}

                <label className="mt-3 block text-sm font-semibold text-stone-700">{t('report_reason_label')}</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium ${reason === r ? 'border-green-700 bg-green-50 text-green-800' : 'border-stone-300 text-stone-700'}`}
                    >
                      {t(`report_reason_${r}`)}
                    </button>
                  ))}
                </div>

                <label className="mt-3 block text-sm font-semibold text-stone-700">{t('report_note_label')}</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-stone-300 p-2 text-sm" />

                <label className="mt-3 block text-sm font-semibold text-stone-700">{t('report_phone_label')}</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="mt-1 w-full rounded-lg border border-stone-300 p-2 text-sm" />

                <div className="mt-4 flex gap-2">
                  <button type="button" disabled={busy} onClick={submit} className="flex-1 rounded-lg bg-green-700 px-4 py-2.5 font-bold text-white disabled:opacity-60">{t('report_submit')}</button>
                  <button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded-lg border border-stone-300 px-4 py-2.5 font-semibold text-stone-700">{t('report_cancel')}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
