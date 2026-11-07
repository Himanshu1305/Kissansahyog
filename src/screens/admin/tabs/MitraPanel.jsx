// Batch 20 - People tab: Kissan Mitra (field people who register farmers). Admin only. Add / edit / switch off a Mitra,
// see the counts, look at each Mitra's registrations (phones masked), move a registration, record a payment, see the ledger.
// Money is paid OUTSIDE the site (UPI or cash); this panel only keeps the record. No approval step: a registration counts
// as soon as it is attributed to a Mitra (the database decides; see supabase/migrations/0075_kissan_mitra.sql).
import { useCallback, useEffect, useState } from 'react'
import { Field, TextInput, TextArea, Select, Spinner } from '../../../components/ui'
import {
  adminListMitras, adminUpsertMitra, adminListMitraRegistrations, adminReassignRegistration, adminMarkMitraPaid, adminListMitraPayments,
} from '../../../lib/mitra/mitraApi'
import {
  fill, rupees, mitraLabel, dueFor, suggestAmount, blankMitraForm, mitraToForm, mitraFormToPayload, validPaidAmount, mitraSummaryCsv, summaryOf,
} from '../../../lib/mitra/mitraRules'
import Section from '../Section'
import { AdminError, Dialog, Chip, btnGreen, btnPlain } from '../common'

const PAGE = 25
const todayIst = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())

function Tile({ label, value, testId }) {
  return (
    <div className="rounded-xl bg-stone-50 p-3">
      <div data-testid={testId} className="text-2xl font-extrabold text-stone-900">{value}</div>
      <div className="text-sm font-semibold text-stone-700">{label}</div>
    </div>
  )
}
function Num({ label, value, testId }) {
  return (
    <div className="rounded-lg bg-stone-50 px-2 py-1.5">
      <div data-testid={testId} className="text-lg font-bold text-stone-900">{value}</div>
      <div className="text-xs font-semibold text-stone-700">{label}</div>
    </div>
  )
}

function MitraCard({ m, t, busy, onEdit, onRegs, onPay, onLedger, onToggle }) {
  const due = dueFor(m)
  const unpaidAll = (m.counted_unpaid_farmers || 0) + (m.counted_unpaid_businesses || 0)
  return (
    <li data-testid="mitra-card" data-active={m.is_active ? 'yes' : 'no'} className={`mb-3 rounded-2xl border-2 p-3 ${m.is_active ? 'border-stone-200 bg-white' : 'border-stone-200 bg-stone-100 opacity-80'}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 data-testid="mitra-name" className="break-words text-lg font-bold text-stone-900">{m.display_name}</h3>
          <p className="break-words text-sm text-stone-700">{m.area || '—'}</p>
        </div>
        <button type="button" role="switch" aria-checked={m.is_active} aria-label={`${m.display_name} — ${t('mitra_switch_label')}`} data-testid="mitra-switch" disabled={busy}
          onClick={() => onToggle(m)} className={`inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-xl px-3 text-base font-bold ${m.is_active ? 'bg-green-100 text-green-900' : 'bg-stone-300 text-stone-800'}`}>
          <span aria-hidden="true" className={`inline-block h-5 w-9 rounded-full p-0.5 ${m.is_active ? 'bg-green-700' : 'bg-stone-500'}`}><span className={`block h-4 w-4 rounded-full bg-white transition-transform ${m.is_active ? 'translate-x-4' : ''}`} /></span>
          {m.is_active ? t('mitra_active') : t('mitra_inactive')}
        </button>
      </div>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <Num label={t('mitra_c_today')} value={m.today} testId="mitra-today" />
        <Num label={t('mitra_c_last7')} value={m.last7} testId="mitra-last7" />
        <Num label={t('mitra_c_farmers')} value={m.farmers_total} testId="mitra-farmers" />
        <Num label={t('mitra_c_businesses')} value={m.businesses_total} testId="mitra-businesses" />
        <Num label={t('mitra_c_unpaid_f')} value={m.counted_unpaid_farmers} testId="mitra-unpaid-f" />
        <Num label={t('mitra_c_unpaid_b')} value={m.counted_unpaid_businesses} testId="mitra-unpaid-b" />
      </div>
      <p className="mb-1 text-base font-bold text-stone-900">
        {t('mitra_c_due')}:{' '}
        {unpaidAll === 0 ? <span data-testid="mitra-due">₹0</span>
          : due.rateNotSet ? <span data-testid="mitra-due" className="text-amber-800">{t('mitra_rate_not_set')}</span>
            : <span data-testid="mitra-due" className="text-green-800">₹{rupees(due.amount)}</span>}
      </p>
      <p className="mb-3 text-sm text-stone-700">{t('mitra_c_paid_total')}: ₹{rupees(m.payments_total_rupees)}</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" data-testid="mitra-edit" className={btnPlain} onClick={() => onEdit(m)}>{t('mitra_btn_edit')}</button>
        <button type="button" data-testid="mitra-regs" className={btnPlain} onClick={() => onRegs(m)}>{t('mitra_btn_regs')}</button>
        <button type="button" data-testid="mitra-pay" className={btnGreen} onClick={() => onPay(m)} disabled={unpaidAll === 0}>{t('mitra_btn_pay')}</button>
        <button type="button" data-testid="mitra-ledger" className={btnPlain} onClick={() => onLedger(m)}>{t('mitra_btn_payments')}</button>
      </div>
    </li>
  )
}

function MitraForm({ t, initial, onCancel, onSaved, actorId }) {
  const [f, setF] = useState(initial)
  const [msg, setMsg] = useState(null) // string key of a validation problem
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })); setMsg(null) }
  const submit = async (e) => {
    e.preventDefault()
    const r = mitraFormToPayload(f)
    if (r.error) { setMsg(r.error); return }
    setBusy(true); setErr(null)
    try { await adminUpsertMitra(actorId, f.id, r.data); onSaved() } catch (x) { setErr(x) } finally { setBusy(false) }
  }
  return (
    <form data-testid="mitra-form" onSubmit={submit} noValidate>
      <h3 className="mb-2 text-lg font-bold text-stone-900">{t(f.id ? 'mitra_form_edit' : 'mitra_form_add')}</h3>
      <AdminError error={err} t={t} />
      {msg && <p role="alert" data-testid="mitra-form-error" className="mb-3 rounded-xl border-2 border-red-300 bg-red-50 p-2 text-base font-semibold text-red-800">{t(msg)}</p>}
      <Field label={t('mitra_f_name')} htmlFor="mitra_name" required><TextInput id="mitra_name" data-testid="mitra-f-name" value={f.display_name} onChange={set('display_name')} maxLength={80} /></Field>
      <Field label={t('mitra_f_area')} htmlFor="mitra_area"><TextInput id="mitra_area" data-testid="mitra-f-area" value={f.area} onChange={set('area')} maxLength={80} /></Field>
      <Field label={t('mitra_f_phone')} htmlFor="mitra_phone"><TextInput id="mitra_phone" data-testid="mitra-f-phone" type="tel" inputMode="tel" value={f.private_phone} onChange={set('private_phone')} maxLength={20} autoComplete="off" /></Field>
      <Field label={t('mitra_f_rate_farmer')} htmlFor="mitra_rf"><TextInput id="mitra_rf" data-testid="mitra-f-rate-farmer" inputMode="numeric" value={f.rate_farmer_rupees} onChange={set('rate_farmer_rupees')} /></Field>
      <Field label={t('mitra_f_rate_business')} htmlFor="mitra_rb"><TextInput id="mitra_rb" data-testid="mitra-f-rate-business" inputMode="numeric" value={f.rate_business_rupees} onChange={set('rate_business_rupees')} /></Field>
      <label className="mb-3 flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border-2 border-stone-300 bg-white px-3 py-2">
        <input type="checkbox" data-testid="mitra-f-active" checked={f.is_active} onChange={set('is_active')} className="h-6 w-6 shrink-0 accent-green-700" />
        <span className="text-base font-medium text-stone-800">{t('mitra_f_active')}</span>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button type="submit" data-testid="mitra-save" disabled={busy} className={btnGreen}>{t('mitra_save')}</button>
        <button type="button" className={btnPlain} onClick={onCancel}>{t('cancel')}</button>
      </div>
    </form>
  )
}

function MoveDialog({ t, reg, mitras, fromId, onClose, onMove, busy, err }) {
  const [to, setTo] = useState('')
  return (
    <Dialog title={t('mitra_move_title')} onClose={onClose} testId="mitra-move-dialog">
      <p className="mb-2 font-semibold text-stone-800">{reg.full_name}</p>
      <AdminError error={err} t={t} />
      <Select data-testid="mitra-move-select" value={to} onChange={(e) => setTo(e.target.value)} className="mb-3 min-h-[48px] !text-[17px]">
        <option value="">{t('mitra_move_none')}</option>
        {mitras.filter((x) => x.id !== fromId).map((x) => <option key={x.id} value={x.id}>{mitraLabel(x)}</option>)}
      </Select>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" data-testid="mitra-move-confirm" disabled={busy} className={btnGreen} onClick={() => onMove(to || null)}>{t('mitra_move_confirm')}</button>
        <button type="button" className={btnPlain} onClick={onClose}>{t('cancel')}</button>
      </div>
    </Dialog>
  )
}

function RegistrationsView({ t, lang, mitra, mitras, actorId, onBack, onChanged }) {
  const [page, setPage] = useState(0)
  const [res, setRes] = useState(null)
  const [err, setErr] = useState(null)
  const [moving, setMoving] = useState(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const load = useCallback(() => {
    adminListMitraRegistrations(actorId, mitra.id, PAGE, page * PAGE).then((r) => { setRes(r); setErr(null) }).catch((e) => { setErr(e); setRes({ total: 0, rows: [] }) })
  }, [actorId, mitra.id, page])
  useEffect(() => { load() }, [load])
  const move = async (to) => {
    setBusy(true)
    try { await adminReassignRegistration(actorId, moving.id, to); setMoving(null); setDone(true); load(); onChanged() } catch (e) { setErr(e); setMoving(null) } finally { setBusy(false) }
  }
  const pages = res ? Math.max(1, Math.ceil(res.total / PAGE)) : 1
  const date = (iso) => { try { return new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso)) } catch { return '' } }
  return (
    <div data-testid="mitra-regs-view">
      <button type="button" className={`${btnPlain} mb-3`} onClick={onBack}>‹ {t('mitra_back')}</button>
      <h3 className="mb-1 text-lg font-bold text-stone-900">{fill(t('mitra_regs_title'), { name: mitra.display_name })}</h3>
      {res && <p className="mb-2 text-sm font-semibold text-stone-700">{fill(t('mitra_regs_count'), { n: res.total })}</p>}
      <AdminError error={err} t={t} />
      {done && <p role="status" data-testid="mitra-moved" className="mb-2 rounded-xl bg-green-50 p-2 text-sm font-semibold text-green-900">{t('mitra_moved')}</p>}
      {!res ? <Spinner /> : res.rows.length === 0 ? <p className="text-stone-600">{t('mitra_regs_none')}</p> : (
        <ul>
          {res.rows.map((r) => (
            <li key={r.id} data-testid="mitra-reg" className="mb-2 rounded-xl border-2 border-stone-200 bg-white p-3">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="break-words text-base font-bold text-stone-900">{r.full_name}</span>
                <Chip tone={r.kind === 'business' ? 'blue' : 'green'}>{t(r.kind === 'business' ? 'mitra_kind_business' : 'mitra_kind_farmer')}</Chip>
                <Chip tone={r.paid ? 'stone' : 'amber'} testId="mitra-reg-paid">{t(r.paid ? 'mitra_reg_paid' : 'mitra_reg_unpaid')}</Chip>
              </div>
              <p className="text-sm text-stone-700">{r.village_town || '—'} · <span data-testid="mitra-reg-phone">{r.masked_phone || '—'}</span> · {date(r.registered_at)}</p>
              {r.blocked && <p className="mt-1 text-sm font-semibold text-red-800">{t('mitra_reg_blocked')}</p>}
              {r.same_name_village && <p data-testid="mitra-same-note" className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-900">{t('mitra_same_note')}</p>}
              <button type="button" data-testid="mitra-move" className={`${btnPlain} mt-2 w-full`} onClick={() => { setDone(false); setErr(null); setMoving(r) }}>{t('mitra_move')}</button>
            </li>
          ))}
        </ul>
      )}
      {res && pages > 1 && (
        <div className="mt-2 grid grid-cols-3 items-center gap-2">
          <button type="button" className={btnPlain} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹ {t('mitra_prev')}</button>
          <span className="text-center text-sm font-semibold text-stone-700">{fill(t('mitra_page'), { a: page + 1, b: pages })}</span>
          <button type="button" className={btnPlain} disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>{t('mitra_next')} ›</button>
        </div>
      )}
      {moving && <MoveDialog t={t} reg={moving} mitras={mitras} fromId={mitra.id} onClose={() => setMoving(null)} onMove={move} busy={busy} err={null} />}
    </div>
  )
}

function PayDialog({ t, mitra, actorId, onClose, onPaid }) {
  const f = mitra.counted_unpaid_farmers || 0
  const b = mitra.counted_unpaid_businesses || 0
  const sug = suggestAmount({ farmers: f, businesses: b }, mitra)
  const [amount, setAmount] = useState(sug.rateNotSet ? '' : String(sug.amount))
  const [paidOn, setPaidOn] = useState(todayIst())
  const [note, setNote] = useState('')
  const [err, setErr] = useState(null)
  const [bad, setBad] = useState(false)
  const [busy, setBusy] = useState(false)
  const ok = validPaidAmount(amount)
  const submit = async () => {
    if (!ok) { setBad(true); return }
    setBusy(true); setErr(null)
    try { await adminMarkMitraPaid(actorId, mitra.id, Number(amount), paidOn, note.trim()); onPaid() } catch (x) { setErr(x) } finally { setBusy(false) }
  }
  return (
    <Dialog title={fill(t('mitra_pay_title'), { name: mitra.display_name })} onClose={onClose} testId="mitra-pay-dialog">
      <AdminError error={err} t={t} />
      <p data-testid="mitra-pay-counts" className="mb-1 text-base font-bold text-stone-900">{fill(t('mitra_pay_counts'), { f, b })}</p>
      <p data-testid="mitra-pay-suggest" className="mb-3 text-sm font-semibold text-stone-700">{sug.rateNotSet ? t('mitra_pay_suggest_unset') : fill(t('mitra_pay_suggest'), { a: rupees(sug.amount) })}</p>
      <Field label={t('mitra_pay_amount')} htmlFor="mitra_pay_amount" error={bad && !ok ? t('mitra_pay_err_amount') : undefined}>
        <TextInput id="mitra_pay_amount" data-testid="mitra-pay-amount" inputMode="numeric" value={amount} onChange={(e) => { setAmount(e.target.value); setBad(false) }} />
      </Field>
      <Field label={t('mitra_pay_date')} htmlFor="mitra_pay_date"><TextInput id="mitra_pay_date" data-testid="mitra-pay-date" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></Field>
      <Field label={t('mitra_pay_note')} htmlFor="mitra_pay_note"><TextArea id="mitra_pay_note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <div className="grid gap-2">
        <button type="button" data-testid="mitra-pay-confirm" disabled={busy} className={btnGreen} onClick={submit}>{fill(t('mitra_pay_confirm'), { n: f + b, a: rupees(ok ? Number(amount) : 0) })}</button>
        <button type="button" className={btnPlain} onClick={onClose}>{t('cancel')}</button>
      </div>
    </Dialog>
  )
}

function LedgerDialog({ t, lang, mitra, actorId, onClose }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => { adminListMitraPayments(actorId, mitra.id).then(setRows).catch((e) => { setErr(e); setRows([]) }) }, [actorId, mitra.id])
  const d = (s) => { try { return new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${s}T00:00:00`)) } catch { return s } }
  return (
    <Dialog title={fill(t('mitra_ledger_title'), { name: mitra.display_name })} onClose={onClose} testId="mitra-ledger-dialog">
      <AdminError error={err} t={t} />
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="mb-3 text-stone-600">{t('mitra_ledger_none')}</p> : (
        <ul className="mb-3">
          {rows.map((r) => (
            <li key={r.id} data-testid="mitra-ledger-row" className="mb-2 rounded-xl border-2 border-stone-200 p-2">
              <p className="font-semibold text-stone-900">{fill(t('mitra_ledger_row'), { d: d(r.paid_on), a: rupees(r.amount_rupees), f: r.farmer_count, b: r.business_count })}</p>
              {r.note && <p className="break-words text-sm text-stone-700">{r.note}</p>}
            </li>
          ))}
        </ul>
      )}
      <button type="button" className={`${btnPlain} w-full`} onClick={onClose}>{t('mitra_close')}</button>
    </Dialog>
  )
}

export default function MitraPanel({ actorId, t, lang }) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [view, setView] = useState({ name: 'list' }) // list | form | regs
  const [dlg, setDlg] = useState(null) // { kind: 'pay' | 'ledger', mitra }
  const [note, setNote] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    adminListMitras(actorId).then((d) => { setData(d); setErr(null) }).catch((e) => { setErr(e); setData((x) => x || { mitras: [], unattributed_total: 0 }) })
  }, [actorId])
  useEffect(() => { load() }, [load])

  const toggle = async (m) => {
    setBusy(true); setNote(null)
    try { await adminUpsertMitra(actorId, m.id, { ...mitraFormToPayload({ ...mitraToForm(m), is_active: !m.is_active }).data }); load() } catch (e) { setErr(e) } finally { setBusy(false) }
  }
  const downloadCsv = () => {
    const blob = new Blob([`﻿${mitraSummaryCsv(data.mitras)}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `kissan-mitra-${todayIst()}.csv`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const sum = summaryOf(data)

  return (
    <Section title={`🤝 ${t('adm_p_mitra')}`}>
      <p data-testid="mitra-reminder" className="mb-3 rounded-xl bg-amber-50 p-3 text-base font-semibold text-amber-900">{t('mitra_pay_outside')}</p>
      <AdminError error={err} t={t} />
      {!data ? <Spinner /> : view.name === 'form' ? (
        <MitraForm t={t} actorId={actorId} initial={view.mitra ? mitraToForm(view.mitra) : blankMitraForm()} onCancel={() => setView({ name: 'list' })}
          onSaved={() => { setView({ name: 'list' }); setNote(t('mitra_saved')); load() }} />
      ) : view.name === 'regs' ? (
        <RegistrationsView t={t} lang={lang} actorId={actorId} mitra={view.mitra} mitras={data.mitras} onBack={() => { setView({ name: 'list' }); load() }} onChanged={load} />
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Tile label={t('mitra_sum_mitras')} value={sum.mitras} testId="mitra-sum-mitras" />
            <Tile label={t('mitra_sum_attributed')} value={sum.attributed} testId="mitra-sum-attributed" />
            <Tile label={t('mitra_sum_unpaid')} value={sum.unpaid} testId="mitra-sum-unpaid" />
            <Tile label={t('mitra_sum_unattributed')} value={sum.unattributed} testId="mitra-sum-unattributed" />
          </div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button type="button" data-testid="mitra-add" className={btnGreen} onClick={() => { setNote(null); setView({ name: 'form', mitra: null }) }}>{t('mitra_add')}</button>
            <button type="button" data-testid="mitra-csv" className={btnPlain} onClick={downloadCsv} disabled={data.mitras.length === 0}>{t('mitra_csv')}</button>
          </div>
          {note && <p role="status" data-testid="mitra-note" className="mb-3 rounded-xl bg-green-50 p-2 text-sm font-semibold text-green-900">{note}</p>}
          {data.mitras.length === 0 ? <p data-testid="mitra-empty" className="text-stone-600">{t('mitra_empty')}</p> : (
            <ul>
              {data.mitras.map((m) => (
                <MitraCard key={m.id} m={m} t={t} busy={busy} onToggle={toggle}
                  onEdit={(x) => { setNote(null); setView({ name: 'form', mitra: x }) }}
                  onRegs={(x) => setView({ name: 'regs', mitra: x })}
                  onPay={(x) => setDlg({ kind: 'pay', mitra: x })}
                  onLedger={(x) => setDlg({ kind: 'ledger', mitra: x })} />
              ))}
            </ul>
          )}
        </>
      )}
      {dlg?.kind === 'pay' && <PayDialog t={t} actorId={actorId} mitra={dlg.mitra} onClose={() => setDlg(null)} onPaid={() => { setDlg(null); setNote(t('mitra_pay_done')); load() }} />}
      {dlg?.kind === 'ledger' && <LedgerDialog t={t} lang={lang} actorId={actorId} mitra={dlg.mitra} onClose={() => setDlg(null)} />}
    </Section>
  )
}
