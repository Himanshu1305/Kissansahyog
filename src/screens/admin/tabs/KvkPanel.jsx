// Batch 29 - admin "KVK questions" panel. Facts the morning post needs but nobody has confirmed (days of the 2nd and 3rd wheat irrigation,
// the late-sowing date, the crop-insurance last date). An admin phones KVK / the agriculture office and types the answer here; the next morning
// post uses it by itself (scripts/morning/lib/kvk.js). Typed fields only, so there is no free text that could end up in a post.
import { useCallback, useEffect, useState } from 'react'
import { Field, TextInput, Notice, Spinner } from '../../../components/ui'
import { adminKvkList, adminKvkAnswer, adminKvkReopen } from '../../../lib/admin/adminApi'
import { LIMITS, formToAnswer, addDaysIso } from '../../../lib/kvk/kvkRules'
import { fill } from '../../../lib/mitra/mitraRules'
import Section from '../Section'
import { AdminError, Chip, btnGreen, btnPlain } from '../common'

const istToday = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)
const STATE_TONE = { open: 'amber', answered: 'green', expired: 'red' }

// "27 Nov 2026" in the reader's language (the date is a plain India calendar day, so it is read at noon UTC to stay on that day)
export function dayText(iso, lang) {
  if (!iso) return ''
  try { return new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${iso}T12:00:00Z`)) } catch { return iso }
}

// Pure: the one-line summary of a saved answer (also used by the test)
export function answerText(q, t, lang) {
  const a = q.answer || {}
  if (q.kind === 'stage_days') return fill(t('adm_kvk_a_stage'), { from: a.das_from, to: a.das_to })
  if (q.kind === 'date') return fill(t('adm_kvk_a_date'), { date: dayText(a.date, lang) })
  const main = fill(t('adm_kvk_a_late'), { date: dayText(a.last_date, lang) })
  return a.seed_extra_pct != null ? `${main}, ${fill(t('adm_kvk_a_late_seed'), { pct: a.seed_extra_pct })}` : main
}

// the form's starting values: today / today + 120 days, and the saved answer when it is being changed
export function startForm(q, today = istToday()) {
  const a = q.answer || {}
  return {
    das_from: a.das_from ?? '', das_to: a.das_to ?? '', date: a.date ?? '', last_date: a.last_date ?? '', seed_extra_pct: a.seed_extra_pct ?? '',
    source_name: q.source_name ?? '', source_date: today, valid_until: addDaysIso(today, LIMITS.validDefaultDays),
  }
}

export function AnswerForm({ q, t, onSave, onCancel, busy, error }) {
  const [f, setF] = useState(() => startForm(q))
  const [localErr, setLocalErr] = useState(null)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const submit = (e) => {
    e.preventDefault()
    const r = formToAnswer(q.kind, q.target, f, istToday())
    if (r.error) { setLocalErr(r.error); return }
    setLocalErr(null); onSave(r.answer, r.meta)
  }
  const id = (k) => `kvk-${q.slug}-${k}`
  const num = { type: 'number', inputMode: 'numeric', min: 0, max: 150, step: 1 }
  return (
    <form onSubmit={submit} data-testid="kvk-form" className="mt-3 rounded-2xl border-2 border-green-200 bg-green-50/40 p-3">
      {localErr && <Notice tone="error">{t(localErr)}</Notice>}
      {error && <AdminError error={error} t={t} />}
      {q.kind === 'stage_days' && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label={t('adm_kvk_f_from')} htmlFor={id('from')} required><TextInput id={id('from')} data-testid="kvk-from" {...num} value={f.das_from} onChange={set('das_from')} /></Field>
          <Field label={t('adm_kvk_f_to')} htmlFor={id('to')} required><TextInput id={id('to')} data-testid="kvk-to" {...num} value={f.das_to} onChange={set('das_to')} /></Field>
        </div>
      )}
      {q.kind === 'date' && (
        <Field label={t('adm_kvk_f_date')} htmlFor={id('date')} required><TextInput id={id('date')} data-testid="kvk-date" type="date" value={f.date} onChange={set('date')} /></Field>
      )}
      {q.kind === 'late_sowing' && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label={t('adm_kvk_f_last_sow')} htmlFor={id('last')} required><TextInput id={id('last')} data-testid="kvk-last" type="date" value={f.last_date} onChange={set('last_date')} /></Field>
          <Field label={t('adm_kvk_f_seed')} htmlFor={id('seed')}><TextInput id={id('seed')} data-testid="kvk-seed" {...num} max={LIMITS.seedPctMax} value={f.seed_extra_pct} onChange={set('seed_extra_pct')} /></Field>
        </div>
      )}
      <Field label={t('adm_kvk_f_source')} htmlFor={id('who')} required><TextInput id={id('who')} data-testid="kvk-who" maxLength={LIMITS.sourceMax} value={f.source_name} onChange={set('source_name')} /></Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label={t('adm_kvk_f_told')} htmlFor={id('told')} required><TextInput id={id('told')} data-testid="kvk-told" type="date" value={f.source_date} onChange={set('source_date')} /></Field>
        <Field label={t('adm_kvk_f_valid')} htmlFor={id('valid')} hint={t('adm_kvk_f_valid_hint')} required><TextInput id={id('valid')} data-testid="kvk-valid" type="date" value={f.valid_until} onChange={set('valid_until')} /></Field>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="submit" disabled={busy} data-testid="kvk-save" className={btnGreen}>{t('adm_kvk_save')}</button>
        <button type="button" onClick={onCancel} className={btnPlain}>{t('adm_kvk_cancel')}</button>
      </div>
    </form>
  )
}

export function QuestionCard({ q, t, lang, editing, onEdit, onCancel, onSave, onRemove, busy, error }) {
  const hi = lang === 'hi'
  const answered = q.state === 'answered'
  return (
    <li data-testid="kvk-q" data-slug={q.slug} data-state={q.state} className="mb-3 rounded-2xl border-2 border-stone-200 bg-white p-3">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <Chip tone={STATE_TONE[q.state] || 'stone'} testId="kvk-state">{t(`adm_kvk_state_${q.state}`)}</Chip>
      </div>
      <p className="text-base font-bold text-stone-900">{hi ? q.question_hi : q.question_en}</p>
      <p className="mt-1 text-sm text-stone-700">{hi ? q.help_hi : q.help_en}</p>
      <p className="mt-1 text-sm text-stone-800">
        <span className="font-semibold">{t('adm_kvk_ask')}</span> {q.ask_who}
        {q.ask_phone && <> · <a href={`tel:${q.ask_phone.replace(/[^\d+]/g, '')}`} data-testid="kvk-call" className="font-bold text-green-800 underline">{t('adm_kvk_call')} {q.ask_phone}</a></>}
      </p>
      {q.answer && (
        <div data-testid="kvk-answer" className="mt-2 rounded-xl bg-stone-50 p-2 text-sm text-stone-900">
          <p className="text-base font-bold">{answerText(q, t, lang)}</p>
          <p className="text-stone-700">{fill(t('adm_kvk_a_by'), { who: q.source_name, told: dayText(q.source_date, lang), until: dayText(q.valid_until, lang) })}</p>
        </div>
      )}
      {!editing && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" data-testid="kvk-enter" onClick={onEdit} className={answered ? btnPlain : btnGreen}>{t(answered ? 'adm_kvk_change' : 'adm_kvk_enter')}</button>
          {q.answer && <button type="button" data-testid="kvk-remove" onClick={onRemove} disabled={busy} className={btnPlain}>{t('adm_kvk_remove')}</button>}
        </div>
      )}
      {editing && <AnswerForm q={q} t={t} onSave={onSave} onCancel={onCancel} busy={busy} error={error} />}
    </li>
  )
}

export default function KvkPanel({ actorId, t, lang }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [editing, setEditing] = useState(null) // slug
  const [busy, setBusy] = useState(false)
  const [saveErr, setSaveErr] = useState(null)
  const [msg, setMsg] = useState(null)

  const load = useCallback(() => adminKvkList(actorId).then((r) => { setRows(Array.isArray(r) ? r : []); setErr(null) }).catch((e) => { setErr(e); setRows([]) }), [actorId])
  useEffect(() => { load() }, [load])

  const save = async (q, answer, meta) => {
    setBusy(true); setSaveErr(null); setMsg(null)
    try { await adminKvkAnswer(actorId, q.id, answer, meta); setEditing(null); setMsg('adm_kvk_saved'); await load() } catch (e) { setSaveErr(e) } finally { setBusy(false) }
  }
  const remove = async (q) => {
    setBusy(true); setMsg(null); setErr(null)
    try { await adminKvkReopen(actorId, q.id); setEditing(null); setMsg('adm_kvk_removed'); await load() } catch (e) { setErr(e) } finally { setBusy(false) }
  }

  const waiting = (rows || []).filter((q) => q.state !== 'answered').length
  return (
    <Section title={t('adm_p_kvk')}>
      <AdminError error={err} t={t} />
      <p className="mb-2 text-base text-stone-800" data-testid="kvk-intro">{t('adm_kvk_intro')}</p>
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('adm_kvk_none')}</p> : (
        <>
          {waiting > 0 && <p data-testid="kvk-waiting" className="mb-2 text-base font-bold text-amber-900">{fill(t('adm_kvk_waiting'), { n: waiting })}</p>}
          {msg && <Notice tone="success">{t(msg)}</Notice>}
          <ul>
            {rows.map((q) => (
              <QuestionCard key={q.id} q={q} t={t} lang={lang} busy={busy} editing={editing === q.slug} error={editing === q.slug ? saveErr : null}
                onEdit={() => { setEditing(q.slug); setSaveErr(null); setMsg(null) }} onCancel={() => { setEditing(null); setSaveErr(null) }}
                onSave={(a, m) => save(q, a, m)} onRemove={() => remove(q)} />
            ))}
          </ul>
        </>
      )}
    </Section>
  )
}
