// Batch 14A - Content tab: announcement cards (the home-page card the admin manages without Claude).
import { useCallback, useEffect, useState } from 'react'
import { Field, TextInput, TextArea, Select, Spinner } from '../../../components/ui'
import { adminListAnnouncements, adminUpsertAnnouncement, adminDeleteAnnouncement, adminDuplicateAnnouncement } from '../../../lib/admin/adminApi'
import { istInputToIso, isoToIstInput, formatIst, inWindow, safeLink, LIMITS } from '../../../lib/announcements/announcements'
import { uploadAnnouncementImage } from '../../../lib/announcements/upload'
import AnnouncementCard from '../../../components/AnnouncementCard'
import Section from '../Section'
import { AdminError, Chip, btnGreen, btnRed, btnPlain } from '../common'

const blank = () => {
  const start = isoToIstInput(new Date().toISOString())
  const end = isoToIstInput(new Date(Date.now() + 24 * 3600 * 1000).toISOString())
  return {
    id: null, title_hi: '', title_en: '', body_hi: '', body_en: '', small_hi: '', small_en: '', image_url: '', image_alt_hi: '', image_alt_en: '',
    link_url: '', link_label_hi: '', link_label_en: '', style: 'info', priority: 0, dismissible: true, is_active: true, start_local: start, end_local: end,
  }
}
const fromRow = (r) => ({ ...blank(), ...Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v ?? ''])), dismissible: r.dismissible !== false, is_active: !!r.is_active, start_local: isoToIstInput(r.start_at), end_local: isoToIstInput(r.end_at) })

// Pure: the form values -> { error } or { data } (what the database function takes).
export function formToPayload(f) {
  const start = istInputToIso(f.start_local)
  const end = istInputToIso(f.end_local)
  if (!f.title_hi.trim()) return { error: 'adm_ann_err_title' }
  if (!start || !end || Date.parse(end) <= Date.parse(start)) return { error: 'adm_ann_err_window' }
  if (f.image_url && !(f.image_alt_hi.trim() && f.image_alt_en.trim())) return { error: 'adm_ann_err_alt' }
  if (f.link_url && !safeLink(f.link_url.trim())) return { error: 'adm_ann_err_link' }
  return {
    data: {
      title_hi: f.title_hi.trim(), title_en: f.title_en.trim(), body_hi: f.body_hi.trim(), body_en: f.body_en.trim(), small_hi: f.small_hi.trim(), small_en: f.small_en.trim(),
      image_url: f.image_url || '', image_alt_hi: f.image_alt_hi.trim(), image_alt_en: f.image_alt_en.trim(), link_url: f.link_url.trim(),
      link_label_hi: f.link_label_hi.trim(), link_label_en: f.link_label_en.trim(), style: f.style, priority: Number(f.priority) || 0,
      dismissible: !!f.dismissible, is_active: !!f.is_active, start_at: start, end_at: end,
    },
  }
}

function Counter({ v, max }) { return <span className={`text-xs ${v.length > max ? 'text-red-700 font-bold' : 'text-stone-500'}`}>{v.length}/{max}</span> }

const IconPic = () => <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0"><path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
const IconOk = () => <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>

// Batch 19-C: the optional picture field - a big green button instead of the bare browser file input. Stateless, so it can be tested alone.
export function PictureField({ t, imageUrl, busy, error, onPick, onRemove }) {
  return (
    <div className="mb-3" data-testid="ann-picture-field">
      <p className="mb-1 text-base font-semibold text-stone-800">{t('adm_ann_image')}</p>
      <input id="ann-image" data-testid="ann-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} disabled={busy} className="peer sr-only" />
      <label htmlFor="ann-image" data-testid="ann-image-button" aria-disabled={busy ? 'true' : undefined}
        className={`flex min-h-[56px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-[17px] font-bold text-white peer-focus-visible:ring-4 peer-focus-visible:ring-amber-400 peer-focus-visible:ring-offset-2 ${busy ? 'opacity-60' : ''}`}
        style={{ background: 'var(--ks-green-dark)' }}>
        <IconPic />
        <span aria-live="polite">{busy ? t('adm_ann_image_uploading') : t(imageUrl ? 'adm_ann_image_change' : 'adm_ann_image_choose')}</span>
      </label>
      {error && <p role="alert" data-testid="ann-image-error" className="mt-2 rounded-lg border-2 border-red-300 bg-red-50 p-2 text-base font-semibold text-red-800">{error}</p>}
      {imageUrl && !busy && (
        <div className="mt-2 flex items-center gap-3" data-testid="ann-image-ok">
          <img src={imageUrl} alt="" width="96" height="96" data-testid="ann-image-thumb" className="h-24 w-24 shrink-0 rounded-xl border border-stone-300 object-cover" />
          <div className="min-w-0">
            <p className="mb-1 flex items-center gap-1 text-base font-bold text-green-800"><IconOk /><span>{t('adm_ann_image_added')}</span></p>
            <button type="button" data-testid="ann-image-remove" className={btnPlain} onClick={onRemove}>{t('adm_ann_image_remove')}</button>
          </div>
        </div>
      )}
      <p className="mt-2 text-[14px] text-stone-800" data-testid="ann-image-hint">{t('adm_ann_image_hint')}</p>
    </div>
  )
}

export const AltMark = ({ t, on }) => <span className={`text-sm ${on ? 'font-bold text-red-700' : 'font-normal text-stone-600'}`} data-testid={on ? 'ann-alt-required' : 'ann-alt-optional'}>{t(on ? 'adm_ann_alt_required' : 'adm_ann_alt_optional')}</span>

function AnnouncementForm({ t, initial, onCancel, onSave, lang }) {
  const [f, setF] = useState(initial)
  const [err, setErr] = useState(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [picMsg, setPicMsg] = useState(null)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const preview = { ...f, id: 'preview', start_at: istInputToIso(f.start_local), end_at: istInputToIso(f.end_local) }

  const pick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setPicMsg(null); setMsg(null)
    try { const url = await uploadAnnouncementImage(file); setF((x) => ({ ...x, image_url: url })) } catch (er) { setPicMsg(t(er.i18nKey || 'err_unknown')) } finally { setUploading(false); e.target.value = '' }
  }
  const save = async () => {
    const r = formToPayload(f)
    if (r.error) { setMsg(t(r.error)); return }
    setBusy(true); setMsg(null); setErr(null)
    try { await onSave(f.id, r.data) } catch (er) { setErr(er) } finally { setBusy(false) }
  }
  const row = 'grid gap-2 sm:grid-cols-2'
  return (
    <div data-testid="ann-form" className="mb-4 rounded-2xl border-2 border-green-200 bg-green-50/40 p-3">
      <div className={row}>
        <Field label={<>{t('adm_ann_title_hi')} <Counter v={f.title_hi} max={LIMITS.title} /></>} htmlFor="ann-title-hi" required><TextInput id="ann-title-hi" data-testid="ann-title-hi" maxLength={LIMITS.title} value={f.title_hi} onChange={set('title_hi')} /></Field>
        <Field label={<>{t('adm_ann_title_en')} <Counter v={f.title_en} max={LIMITS.title} /></>} htmlFor="ann-title-en"><TextInput id="ann-title-en" data-testid="ann-title-en" maxLength={LIMITS.title} value={f.title_en} onChange={set('title_en')} /></Field>
        <Field label={<>{t('adm_ann_body_hi')} <Counter v={f.body_hi} max={LIMITS.body} /></>} htmlFor="ann-body-hi"><TextArea id="ann-body-hi" data-testid="ann-body-hi" maxLength={LIMITS.body} value={f.body_hi} onChange={set('body_hi')} /></Field>
        <Field label={<>{t('adm_ann_body_en')} <Counter v={f.body_en} max={LIMITS.body} /></>} htmlFor="ann-body-en"><TextArea id="ann-body-en" data-testid="ann-body-en" maxLength={LIMITS.body} value={f.body_en} onChange={set('body_en')} /></Field>
        <Field label={<>{t('adm_ann_small_hi')} <Counter v={f.small_hi} max={LIMITS.small} /></>} htmlFor="ann-small-hi"><TextInput id="ann-small-hi" maxLength={LIMITS.small} value={f.small_hi} onChange={set('small_hi')} /></Field>
        <Field label={<>{t('adm_ann_small_en')} <Counter v={f.small_en} max={LIMITS.small} /></>} htmlFor="ann-small-en"><TextInput id="ann-small-en" maxLength={LIMITS.small} value={f.small_en} onChange={set('small_en')} /></Field>
      </div>
      <PictureField t={t} imageUrl={f.image_url} busy={uploading} error={picMsg} onPick={pick} onRemove={() => setF((x) => ({ ...x, image_url: '' }))} />
      <div className={row}>
        <Field label={<>{t('adm_ann_alt_hi')} <AltMark t={t} on={!!f.image_url} /></>} htmlFor="ann-alt-hi"><TextInput id="ann-alt-hi" data-testid="ann-alt-hi" maxLength={LIMITS.alt} value={f.image_alt_hi} onChange={set('image_alt_hi')} /></Field>
        <Field label={<>{t('adm_ann_alt_en')} <AltMark t={t} on={!!f.image_url} /></>} htmlFor="ann-alt-en"><TextInput id="ann-alt-en" data-testid="ann-alt-en" maxLength={LIMITS.alt} value={f.image_alt_en} onChange={set('image_alt_en')} /></Field>
        <Field label={t('adm_ann_link')} htmlFor="ann-link" hint={t('adm_ann_link_hint')}><TextInput id="ann-link" data-testid="ann-link" value={f.link_url} onChange={set('link_url')} placeholder="/msp" /></Field>
        <div className={row}>
          <Field label={t('adm_ann_label_hi')} htmlFor="ann-label-hi"><TextInput id="ann-label-hi" maxLength={LIMITS.label} value={f.link_label_hi} onChange={set('link_label_hi')} /></Field>
          <Field label={t('adm_ann_label_en')} htmlFor="ann-label-en"><TextInput id="ann-label-en" maxLength={LIMITS.label} value={f.link_label_en} onChange={set('link_label_en')} /></Field>
        </div>
        <Field label={t('adm_ann_start')} htmlFor="ann-start" hint={t('adm_ann_ist_hint')}><TextInput id="ann-start" data-testid="ann-start" type="datetime-local" value={f.start_local} onChange={set('start_local')} /></Field>
        <Field label={t('adm_ann_end')} htmlFor="ann-end" hint={t('adm_ann_ist_hint')}><TextInput id="ann-end" data-testid="ann-end" type="datetime-local" value={f.end_local} onChange={set('end_local')} /></Field>
        <Field label={t('adm_ann_style')} htmlFor="ann-style">
          <Select id="ann-style" data-testid="ann-style" value={f.style} onChange={set('style')}>
            <option value="festival">{t('adm_ann_style_festival')}</option><option value="info">{t('adm_ann_style_info')}</option><option value="alert">{t('adm_ann_style_alert')}</option>
          </Select>
        </Field>
        <Field label={t('adm_ann_priority')} htmlFor="ann-priority" hint={t('adm_ann_priority_hint')}><TextInput id="ann-priority" type="number" value={f.priority} onChange={set('priority')} /></Field>
      </div>
      <div className="mb-3 flex flex-wrap gap-4">
        <label className="flex min-h-[48px] items-center gap-2 font-semibold"><input type="checkbox" data-testid="ann-dismissible" checked={f.dismissible} onChange={set('dismissible')} className="h-5 w-5" />{t('adm_ann_dismissible')}</label>
        <label className="flex min-h-[48px] items-center gap-2 font-semibold"><input type="checkbox" data-testid="ann-active" checked={f.is_active} onChange={set('is_active')} className="h-5 w-5" />{t('adm_ann_active')}</label>
      </div>
      <div className="mb-3" data-testid="ann-preview">
        <p className="mb-1 text-sm font-bold text-stone-700">{t('adm_ann_preview')}</p>
        <div className="mb-2 rounded-xl border border-dashed border-stone-300 p-2" style={{ maxWidth: 360 }} data-testid="ann-preview-phone"><AnnouncementCard a={preview} preview /></div>
        <div className="hidden rounded-xl border border-dashed border-stone-300 p-2 md:block" data-testid="ann-preview-desktop"><AnnouncementCard a={preview} preview /></div>
      </div>
      {msg && <p role="alert" data-testid="ann-msg" className="mb-2 rounded-lg bg-red-50 p-2 text-sm font-semibold text-red-800">{msg}</p>}
      <AdminError error={err} t={t} />
      <div className="flex gap-2">
        <button type="button" data-testid="ann-save" disabled={busy} onClick={save} className={btnGreen}>{t('adm_ann_save')}</button>
        <button type="button" onClick={onCancel} className={btnPlain}>{t('adm_cancel')}</button>
      </div>
      <span className="sr-only">{lang}</span>
    </div>
  )
}

export default function AnnouncementsPanel({ actorId, t, lang }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [editing, setEditing] = useState(null)
  const load = useCallback(() => { adminListAnnouncements(actorId).then((r) => { setRows(r); setErr(null) }).catch((e) => { setErr(e); setRows([]) }) }, [actorId])
  useEffect(() => { load() }, [load])

  const save = async (id, data) => { await adminUpsertAnnouncement(actorId, id, data); setEditing(null); load() }
  const toggle = async (r) => { try { await adminUpsertAnnouncement(actorId, r.id, { ...r, image_url: r.image_url || '', link_url: r.link_url || '', is_active: !r.is_active }); load() } catch (e) { setErr(e) } }
  const remove = async (r) => { if (!window.confirm(t('adm_ann_delete_confirm'))) return; try { await adminDeleteAnnouncement(actorId, r.id); load() } catch (e) { setErr(e) } }
  const dup = async (r) => { try { await adminDuplicateAnnouncement(actorId, r.id); load() } catch (e) { setErr(e) } }
  const now = new Date()

  return (
    <Section title={t('adm_p_announcements')} right={!editing && <button type="button" data-testid="ann-new" onClick={() => setEditing(blank())} className={btnGreen}>{t('adm_ann_new')}</button>}>
      <AdminError error={err} t={t} />
      {editing && <AnnouncementForm key={editing.id || 'new'} t={t} lang={lang} initial={editing} onCancel={() => setEditing(null)} onSave={save} />}
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500" data-testid="ann-empty">{t('adm_ann_none')}</p> : rows.map((r) => {
        const live = inWindow(r, now)
        return (
          <div key={r.id} data-testid="ann-row" data-live={live ? '1' : '0'} className="mb-2 rounded-xl border-2 border-stone-200 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-stone-900">{r.title_hi}</span>
              <Chip tone={r.is_active ? (live ? 'green' : 'amber') : 'stone'}>{!r.is_active ? t('adm_off') : live ? t('adm_ann_live') : t('adm_ann_scheduled')}</Chip>
              <Chip tone="blue">{t(`adm_ann_style_${r.style}`)}</Chip>
            </div>
            <p className="mt-1 text-sm text-stone-600">{formatIst(r.start_at, lang)} - {formatIst(r.end_at, lang)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" data-testid="ann-edit" onClick={() => setEditing(fromRow(r))} className={btnPlain}>{t('adm_edit')}</button>
              <button type="button" data-testid="ann-toggle" onClick={() => toggle(r)} className={btnPlain}>{r.is_active ? t('adm_turn_off') : t('adm_turn_on')}</button>
              <button type="button" data-testid="ann-dup" onClick={() => dup(r)} className={btnPlain}>{t('adm_ann_duplicate')}</button>
              <button type="button" data-testid="ann-delete" onClick={() => remove(r)} className={btnRed}>{t('adm_delete')}</button>
            </div>
          </div>
        )
      })}
    </Section>
  )
}
