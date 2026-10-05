import { useState } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'
import { submitColdStorageClaim } from '../lib/coldStorage/coldStorageApi'
import ReportButton from './ReportButton'

// One directory entry card for the cold-storage finder. Shows the compiled
// public details, a provenance footer, and an actions row (claim + report).
export default function ColdStorageCard({ entry }) {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [proof, setProof] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [done, setDone] = useState(false)

  async function submit() {
    setErr(null)
    if (!name.trim() || !phone.trim()) { setErr(t('err_claim_fields_required')); return }
    setBusy(true)
    try {
      await submitColdStorageClaim({ dirId: entry.id, name, phone, proof: proof || null })
      setDone(true)
    } catch (e) {
      setErr(t(e.i18nKey || 'err_unknown'))
    } finally {
      setBusy(false)
    }
  }

  function closeModal() {
    setOpen(false)
  }

  const place = [entry.city, entry.district].filter(Boolean).join(', ')

  return (
    <div className="flex flex-col rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-base font-bold text-stone-900">{entry.name}</p>
      {place && <p className="mt-0.5 text-sm text-stone-600">{place}</p>}

      <div className="mt-2 space-y-1 text-sm text-stone-700">
        {entry.capacity && (
          <p><span className="font-semibold">{t('cs_capacity_label')}:</span> {entry.capacity}</p>
        )}
        {entry.space_available && (
          <p>
            <span className="font-semibold">{t('cs_space_label')}:</span> {entry.space_available}
            {entry.space_updated && <span className="text-stone-500"> ({entry.space_updated})</span>}
          </p>
        )}
        {entry.phone && (
          <p>
            <span className="font-semibold">{t('cs_phone_label')}:</span>{' '}
            <a href={`tel:${entry.phone}`} className="text-green-700 underline">{entry.phone}</a>
          </p>
        )}
        {entry.rating && <p>{entry.rating}</p>}
      </div>

      {entry.is_old_list && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          {t('cs_old_list_note')}
        </p>
      )}

      <p className="mt-3 text-xs text-stone-500">
        {t('cs_source_label')}
        {entry.source_name ? `: ${entry.source_name}` : ''}
        {entry.source_url && (
          <>
            {' '}
            <a href={entry.source_url} target="_blank" rel="noopener noreferrer" className="text-green-700 underline">
              {t('cs_source_link')}
            </a>
          </>
        )}
      </p>

      <div className="mt-3 border-t border-stone-100 pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{t('cs_claim_actions')}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-800"
          >
            {t('cs_claim_title')}
          </button>
          <ReportButton targetType="cold_storage" targetId={entry.id} />
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => !busy && closeModal()}>
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            {done ? (
              <div className="py-4 text-center">
                <p className="text-base font-semibold text-green-800">{t('cs_claim_success')}</p>
                <button type="button" onClick={closeModal} className="mt-4 rounded-lg bg-green-700 px-4 py-2 font-bold text-white">{t('report_cancel')}</button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-stone-900">{t('cs_claim_title')}</h2>
                <p className="mt-1 text-sm text-stone-600">{t('cs_claim_intro')}</p>
                {err && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</p>}

                <label className="mt-3 block text-sm font-semibold text-stone-700">{t('cs_claim_name')}</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 p-2 text-sm" />

                <label className="mt-3 block text-sm font-semibold text-stone-700">{t('cs_claim_phone')}</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="mt-1 w-full rounded-lg border border-stone-300 p-2 text-sm" />

                <label className="mt-3 block text-sm font-semibold text-stone-700">{t('cs_claim_proof')}</label>
                <textarea value={proof} onChange={(e) => setProof(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-stone-300 p-2 text-sm" />

                <div className="mt-4 flex gap-2">
                  <button type="button" disabled={busy} onClick={submit} className="flex-1 rounded-lg bg-green-700 px-4 py-2.5 font-bold text-white disabled:opacity-60">{t('cs_claim_submit')}</button>
                  <button type="button" disabled={busy} onClick={closeModal} className="rounded-lg border border-stone-300 px-4 py-2.5 font-semibold text-stone-700">{t('report_cancel')}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
