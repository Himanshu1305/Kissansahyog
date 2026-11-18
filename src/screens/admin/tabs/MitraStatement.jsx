// Batch 22D - the statement of ONE Kissan Mitra: what he brought (each farmer who offered a service, each ad), the date of each,
// and the money against each. Admin only (it lives inside the admin Mitra panel). Read only: it changes nothing.
// The database builds it (supabase/migrations/0077_mitra_statement.sql); the amounts are the Mitra's CURRENT rate.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Spinner } from '../../../components/ui'
import { adminMitraStatement } from '../../../lib/mitra/mitraApi'
import { fill, rupees } from '../../../lib/mitra/mitraRules'
import {
  STATEMENT_PAGE, istDate, istIso, categoryName, filterRows, statementCsv, statementFileName, fetchAllRows,
} from '../../../lib/mitra/statementRules'
import { AdminError, Chip, btnPlain } from '../common'

const BOM = String.fromCharCode(0xFEFF) // UTF-8 byte-order mark, so a spreadsheet opens the Hindi names correctly

function Strip({ label, value, testId, tone }) {
  return (
    <div className="rounded-lg bg-stone-50 px-2 py-1.5">
      <div data-testid={testId} className={`text-lg font-bold ${tone || 'text-stone-900'}`}>{value}</div>
      <div className="text-xs font-semibold text-stone-700">{label}</div>
    </div>
  )
}

export default function MitraStatement({ actorId, t, lang, mitra, onBack }) {
  const [data, setData] = useState(null) // { mitra, totals } of the first answer
  const [rows, setRows] = useState([])
  const [err, setErr] = useState(null)
  const [filter, setFilter] = useState('all')
  const [moreBusy, setMoreBusy] = useState(false)
  const [csvBusy, setCsvBusy] = useState(false)
  const [csvErr, setCsvErr] = useState(false)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  useEffect(() => {
    adminMitraStatement(actorId, mitra.id, STATEMENT_PAGE, 0)
      .then((r) => { if (!alive.current) return; setData({ mitra: r.mitra, totals: r.totals }); setRows(Array.isArray(r.rows) ? r.rows : []); setErr(null) })
      .catch((e) => { if (!alive.current) return; setErr(e); setData({ mitra, totals: null }) })
  }, [actorId, mitra])

  const total = data?.totals ? (Number(data.totals.farmers) || 0) + (Number(data.totals.ads) || 0) : 0
  const loadMore = useCallback(async () => {
    setMoreBusy(true)
    try {
      const r = await adminMitraStatement(actorId, mitra.id, STATEMENT_PAGE, rows.length)
      if (!alive.current) return
      setRows((x) => [...x, ...(Array.isArray(r.rows) ? r.rows : [])]); setErr(null)
    } catch (e) { if (alive.current) setErr(e) } finally { if (alive.current) setMoreBusy(false) }
  }, [actorId, mitra.id, rows.length])

  const downloadCsv = async () => {
    setCsvBusy(true); setCsvErr(false)
    try {
      const all = await fetchAllRows((limit, offset) => adminMitraStatement(actorId, mitra.id, limit, offset))
      const blob = new Blob([`${BOM}${statementCsv(all, lang)}`], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = statementFileName(data?.mitra?.display_name || mitra.display_name, istIso(new Date()))
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { if (alive.current) setCsvErr(true) } finally { if (alive.current) setCsvBusy(false) }
  }

  const m = data?.mitra || mitra
  const tt = data?.totals
  const shown = filterRows(rows, filter)
  const money = (a) => fill(t('mitra_st_amount'), { a: rupees(a) })
  const rate = (v, testId) => (v == null
    ? <span data-testid={testId} className="font-bold text-amber-800">{t('mitra_rate_not_set')}</span>
    : <span data-testid={testId} className="font-bold text-stone-900">{money(v)}</span>)

  return (
    <div data-testid="mitra-statement-view">
      <button type="button" data-testid="st-back" className={`${btnPlain} mb-3`} onClick={onBack}>‹ {t('mitra_back')}</button>
      <h3 data-testid="st-name" className="break-words text-lg font-bold text-stone-900">{fill(t('mitra_st_title'), { name: m.display_name })}</h3>
      <p className="mb-1 break-words text-sm text-stone-700">{m.area || '—'}</p>
      <p data-testid="st-rates" className="mb-1 text-base text-stone-800">
        {fill(t('mitra_st_rate_farmer'), { v: '' })}{rate(m.rate_farmer_rupees, 'st-rate-farmer')}
        {' · '}
        {fill(t('mitra_st_rate_ad'), { v: '' })}{rate(m.rate_business_rupees, 'st-rate-ad')}
      </p>
      <p className="mb-3 text-xs text-stone-600">{t('mitra_st_rate_note')}</p>
      <AdminError error={err} t={t} />
      {!data ? <Spinner /> : !tt ? null : (
        <>
          <div className="mb-2 grid grid-cols-3 gap-2">
            <Strip label={t('mitra_st_farmers')} value={tt.farmers} testId="st-farmers" />
            <Strip label={t('mitra_c_businesses')} value={tt.ads} testId="st-ads" />
            <Strip label={t('mitra_st_earned')} value={tt.rate_missing ? `${money(tt.earned_rupees)}+` : money(tt.earned_rupees)} testId="st-earned" tone={tt.rate_missing ? 'text-amber-800' : undefined} />
            <Strip label={t('mitra_st_paid')} value={money(tt.paid_rupees)} testId="st-paid" tone="text-green-800" />
            <Strip label={t('mitra_st_due')} value={money(tt.due_rupees)} testId="st-due" tone={tt.due_rupees > 0 ? 'text-amber-900' : undefined} />
          </div>
          {tt.rate_missing && <p data-testid="st-rate-missing" className="mb-2 rounded-lg bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-900">{t('mitra_rate_not_set')}</p>}
          {tt.waiting_first_offer > 0 && <p data-testid="st-waiting" className="mb-3 text-sm text-stone-600">{fill(t('mitra_st_waiting'), { n: tt.waiting_first_offer })}</p>}

          <button type="button" data-testid="st-csv" className={`${btnPlain} mb-3 w-full`} onClick={downloadCsv} disabled={csvBusy || total === 0}>{csvBusy ? t('mitra_st_csv_busy') : t('mitra_st_csv')}</button>
          {csvErr && <p role="alert" data-testid="st-csv-error" className="mb-3 rounded-xl border-2 border-red-300 bg-red-50 p-2 text-base font-semibold text-red-800">{t('mitra_st_csv_error')}</p>}

          {total === 0 ? <p data-testid="st-empty" className="text-stone-600">{t('mitra_st_empty')}</p> : (
            <>
              <div role="group" className="mb-3 flex flex-wrap gap-2">
                {[['all', t('mitra_st_f_all')], ['unpaid', t('mitra_reg_unpaid')], ['paid', t('mitra_reg_paid')]].map(([k, label]) => (
                  <button key={k} type="button" data-testid={`st-filter-${k}`} aria-pressed={filter === k} onClick={() => setFilter(k)}
                    className={`inline-flex min-h-[48px] items-center rounded-xl px-4 text-base font-bold ${filter === k ? 'bg-green-700 text-white' : 'bg-stone-200 text-stone-800'}`}>{label}</button>
                ))}
              </div>
              {shown.length === 0 ? <p data-testid="st-filter-empty" className="text-stone-600">{t('mitra_st_filter_empty')}</p> : (
                <ul data-testid="st-rows">
                  {shown.map((r) => (
                    <li key={`${r.kind}-${r.ref_id}`} data-testid="st-row" data-kind={r.kind} data-paid={r.paid ? 'yes' : 'no'} className="mb-2 rounded-xl border-2 border-stone-200 bg-white p-3">
                      <p className="break-words text-base font-bold text-stone-900">{r.name}{r.kind === 'farmer' && r.village ? <span className="font-normal text-stone-700"> · {r.village}</span> : null}</p>
                      <p data-testid="st-row-what" className="text-base text-stone-800">
                        {r.kind === 'ad' ? t('mitra_kind_business') : (categoryName(r.category, lang) ? fill(t('mitra_st_offer'), { c: categoryName(r.category, lang) }) : t('mitra_st_offer_plain'))}
                      </p>
                      <p className="text-base text-stone-800">
                        <span data-testid="st-row-date">{istDate(r.on_date, lang)}</span>
                        {' · '}
                        {r.amount_rupees == null
                          ? <span data-testid="st-row-amount" className="font-bold text-amber-800">{t('mitra_rate_not_set')}</span>
                          : <span data-testid="st-row-amount" className="font-bold text-stone-900">{money(r.amount_rupees)}</span>}
                      </p>
                      <div className="mt-1">
                        <Chip tone={r.paid ? 'green' : 'amber'} testId="st-row-status">{r.paid ? (r.paid_on ? fill(t('mitra_st_paid_on'), { d: istDate(r.paid_on, lang) }) : t('mitra_reg_paid')) : t('mitra_reg_unpaid')}</Chip>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {rows.length < total && <button type="button" data-testid="st-more" className={`${btnPlain} mt-2 w-full`} disabled={moreBusy} onClick={loadMore}>{t('mitra_st_more')}</button>}
            </>
          )}
        </>
      )}
    </div>
  )
}
