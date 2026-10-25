// Batch 14A - the Moderation tab's panels, moved verbatim out of src/screens/Admin.jsx (same code, same data-testids).
import { useEffect, useState, useCallback } from 'react'
import {
  Field,
  TextInput,
  TextArea,
  Notice,
  Spinner,
} from '../../../components/ui'
import { CATEGORY_META } from '../../../lib/listings/catalog'
import {
  getAdminListings,
  removeListing,
  getAdminMelas,
  adminSetMelaStatus,
  adminSetMelaActive,
  adminDeleteMela,
  adminUpsertMela,
  getAdminMelaCandidates,
  adminPublishCandidate,
  getRecentMelaMerges,
  adminSplitMela,
  getListingReports,
  resolveListingReport,
  getCarbonSuggestionsAdmin,
  resolveCarbonSuggestion,
} from '../../../lib/admin/adminApi'
import { MELA_TAGS } from '../../../lib/mela/melaApi'
import AdminListingActions, { AdminStatusBadge } from '../../../components/listing/AdminListingActions'
import { retryPendingPhotoDeletions } from '../../../lib/listings/listingsApi'
import Section from '../Section'

function ListingsPanel({ actorId, t, lang }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [done, setDone] = useState(null)
  const load = useCallback(() => {
    getAdminListings(actorId, 20, 0).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])
  useEffect(() => { load() }, [load])
  // Batch 10G: photo files of an earlier admin delete that could not be removed then.
  useEffect(() => { retryPendingPhotoDeletions(actorId) }, [actorId])
  const changed = (kind) => { setErr(null); setDone(t({ disabled: 'admin_done_disabled', enabled: 'admin_done_enabled', deleted: 'admin_done_deleted' }[kind])); load() }

  async function remove(id) {
    setErr(null)
    try { await removeListing(actorId, id); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) }
  }

  return (
    <Section title={t('admin_recent_listings')}>
      {err && <Notice tone="error">{err}</Notice>}
      {done && <p role="status" data-testid="admin-done" className="mb-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">{done}</p>}
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-stone-100 text-stone-500">
                <th className="py-2 pr-3">{t('col_category')}</th>
                <th className="py-2 pr-3">{t('col_type')}</th>
                <th className="py-2 pr-3">{t('col_location')}</th>
                <th className="py-2 pr-3">{t('col_posted_by')}</th>
                <th className="py-2 pr-3">{t('col_status')}</th>
                <th className="py-2 pr-3">{t('admin_photos')}</th>
                <th className="py-2 pr-3">{t('col_action')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-stone-100" data-testid="admin-listing-row" data-listing-id={r.id}>
                  <td className="py-2 pr-3">{CATEGORY_META[r.category]?.[lang] || r.category}</td>
                  <td className="py-2 pr-3">{t(r.listing_type === 'offer' ? 'home_offer' : 'home_requirement')}</td>
                  <td className="py-2 pr-3">{[r.village_town, r.pincode].filter(Boolean).join(' · ')}</td>
                  <td className="py-2 pr-3">{r.poster_phone || r.poster_email || '—'}</td>
                  <td className="py-2 pr-3">
                    <AdminStatusBadge listing={r} />
                    {r.admin_disabled_reason && <span className="mt-1 block max-w-[220px] text-xs text-red-800" data-testid="admin-reason">{t('listing_admin_reason')}: {r.admin_disabled_reason}</span>}
                  </td>
                  <td className="py-2 pr-3">{r.photo_count ?? 0}</td>
                  <td className="py-2 pr-3">
                    <div className="flex min-w-[260px] flex-wrap gap-2">
                      {r.status !== 'removed' && r.status !== 'disabled' && (
                        <button onClick={() => remove(r.id)} className="min-h-[44px] rounded-lg bg-red-600 px-3 font-bold text-white active:bg-red-700">
                          {t('action_remove')}
                        </button>
                      )}
                      <AdminListingActions listing={r} actorId={actorId} compact onChanged={changed} onError={setErr} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}

const EMPTY_EXPERT = { name: '', name_hi: '', specialisation_en: '', specialisation_hi: '', bio_en: '', bio_hi: '', phone: '', organisation: '', is_active: true }


function ReportsPanel({ actorId, t }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [notes, setNotes] = useState({})
  const load = useCallback(() => {
    getListingReports(actorId, 'open').then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])
  useEffect(() => { load() }, [load])

  async function act(id, action) {
    setErr(null)
    try { await resolveListingReport(actorId, id, action, notes[id] || null); load() }
    catch (e) { setErr(t(e.i18nKey || 'err_unknown')) }
  }
  // Age in hours, so old complaints stand out for the admin. Internal aid only; nothing public promises a response time.
  const ageHours = (iso) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3.6e6))

  return (
    <Section title={t('admin_reports')}>
      {err && <Notice tone="error">{err}</Notice>}
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_reports_empty')}</p> : (
        <div className="space-y-3">
          {rows.map((r) => {
            const h = ageHours(r.created_at)
            const overdue = h > 168 // older than a week
            return (
              <div key={r.id} className="rounded-xl border border-stone-200 p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full bg-red-100 px-2 py-0.5 font-bold text-red-800">{t(`report_reason_${r.reason}`)}</span>
                  <span className="text-stone-500">{t('admin_report_target')}: {r.target_type} {r.listing_category ? `(${r.listing_category})` : ''}</span>
                  <span className={`ml-auto font-semibold ${overdue ? 'text-red-600' : 'text-stone-500'}`}>{t('admin_report_age')}: {h}h {overdue ? `· ${t('admin_report_overdue')}` : ''}</span>
                </div>
                {r.note && <p className="mt-1 text-sm text-stone-700">{r.note}</p>}
                {r.reporter_phone && <p className="mt-1 text-xs text-stone-500">📞 {r.reporter_phone}</p>}
                <input
                  value={notes[r.id] || ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  placeholder={t('admin_report_resolution')}
                  className="mt-2 w-full rounded-lg border border-stone-300 p-2 text-sm"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.listing_id && (
                    <button type="button" onClick={() => act(r.id, 'removed')} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-bold text-white">{t('admin_report_action_remove')}</button>
                  )}
                  {/* Batch 10G — permanent delete straight from the complaint (the report is resolved as removed). */}
                  {r.listing_id && (
                    <AdminListingActions deleteOnly compact listing={{ id: r.listing_id, category: r.listing_category, status: r.listing_status }} actorId={actorId} onChanged={() => load()} onError={setErr} />
                  )}
                  <button type="button" onClick={() => act(r.id, 'dismissed')} className="rounded-lg border-2 border-stone-300 px-3 py-1.5 text-sm font-bold text-stone-700">{t('admin_report_action_dismiss')}</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Section>
  )
}

// Batch 2 item B: the cold-storage claim queue (ColdStorageClaimsPanel) was removed
// — the claim flow is gone from the UI, replaced by the "गलत जानकारी? बताएँ" report
// link on each card (target_type='cold_storage', shown in ReportsPanel above). The
// submit_cs_claim / get_cs_claims / resolve_cs_claim RPCs stay in the DB (hidden).

// ---- Phase 8: carbon-credit suggestions moderation ----

function CarbonSuggestionsPanel({ actorId, t }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const load = useCallback(() => {
    getCarbonSuggestionsAdmin(actorId, 'pending').then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])
  useEffect(() => { load() }, [load])
  async function act(id, approve) {
    setErr(null)
    try { await resolveCarbonSuggestion(actorId, id, approve); load() }
    catch (e) { setErr(t(e.i18nKey || 'err_unknown')) }
  }
  return (
    <Section title={t('admin_carbon_sugg')}>
      {err && <Notice tone="error">{err}</Notice>}
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_carbon_sugg_empty')}</p> : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-stone-200 p-3 text-sm">
              <p className="text-stone-700">{r.body}</p>
              {(r.name || r.village) && <p className="mt-1 text-xs text-stone-500">— {[r.name, r.village].filter(Boolean).join(', ')}</p>}
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => act(r.id, true)} className="rounded-lg bg-green-700 px-3 py-1.5 font-bold text-white">{t('admin_cs_approve')}</button>
                <button type="button" onClick={() => act(r.id, false)} className="rounded-lg border-2 border-stone-300 px-3 py-1.5 font-bold text-stone-700">{t('admin_cs_reject')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

// ---- Phase 10: zero-result search queries ----

function MelaPanel({ actorId, t, lang }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [editing, setEditing] = useState(null)
  const load = useCallback(() => {
    getAdminMelas(actorId).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])
  useEffect(() => { load() }, [load])

  const act = async (fn) => { setErr(null); try { await fn(); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) } }
  async function save(form) { setErr(null); try { await adminUpsertMela(actorId, form); setEditing(null); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) } }

  const pending = (rows || []).filter((r) => r.moderation_status === 'pending')
  return (
    <Section title={t('admin_mela_h')} right={pending.length ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">{pending.length} {t('admin_mela_pending')}</span> : null}>
      {err && <Notice tone="error">{err}</Notice>}
      {editing && <MelaEditForm t={t} initial={editing} onCancel={() => setEditing(null)} onSave={save} />}
      <div className="mb-3">
        <button onClick={() => setEditing({ id: null, name_hi: '', name_en: '', organizer_name: '', venue: '', address: '', state: '', district: '', event_date_start: '', event_date_end: '', is_date_confirmed: false, expected_period: '', category_tags: [], highlights_hi: '', highlights_en: '', contact_name: '', contact_number: '', source_url: '', moderation_status: 'approved', is_active: true })} className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-bold text-white">+ {t('action_add')}</button>
      </div>
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_mela_none')}</p> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} data-testid="admin-mela-row" className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-100 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-stone-900">{(lang === 'hi' ? r.name_hi : (r.name_en || r.name_hi))}{r.submitted_by_user ? ' 👤' : ''}</div>
                <div className="text-xs text-stone-500">{[r.venue, r.state].filter(Boolean).join(', ')} · {r.is_date_confirmed ? (r.event_date_start || '—') : (r.expected_period ? `${t('mela_expected_prefix')} ${r.expected_period}` : '—')}</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.moderation_status === 'approved' ? 'bg-green-100 text-green-800' : r.moderation_status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-600'}`}>{r.moderation_status}</span>
              {!r.is_active && <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-bold text-stone-600">inactive</span>}
              <button onClick={() => setEditing({ ...r, event_date_start: r.event_date_start || '', event_date_end: r.event_date_end || '', category_tags: r.category_tags || [] })} className="rounded-lg bg-green-700 px-3 py-1 text-sm font-bold text-white" data-testid="admin-mela-edit">{t('action_edit')}</button>
              {r.moderation_status !== 'approved' && <button onClick={() => act(() => adminSetMelaStatus(actorId, r.id, 'approved'))} className="rounded-lg bg-green-600 px-3 py-1 text-sm font-bold text-white" data-testid="admin-mela-approve">{t('admin_mela_approve')}</button>}
              {r.moderation_status !== 'rejected' && <button onClick={() => act(() => adminSetMelaStatus(actorId, r.id, 'rejected'))} className="rounded-lg border-2 border-stone-300 px-3 py-1 text-sm font-bold text-stone-700">{t('admin_mela_reject')}</button>}
              <button onClick={() => act(() => adminSetMelaActive(actorId, r.id, !r.is_active))} className="rounded-lg border-2 border-stone-300 px-3 py-1 text-sm font-bold text-stone-700">{r.is_active ? t('action_unpublish') : t('action_feature')}</button>
              <button onClick={() => act(() => adminDeleteMela(actorId, r.id))} className="rounded-lg bg-red-600 px-3 py-1 text-sm font-bold text-white">{t('action_delete')}</button>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

function MelaEditForm({ t, initial, onCancel, onSave }) {
  const [f, setF] = useState(initial)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const toggleTag = (tag) => setF((s) => ({ ...s, category_tags: (s.category_tags || []).includes(tag) ? s.category_tags.filter((x) => x !== tag) : [...(s.category_tags || []), tag] }))
  return (
    <div className="mb-4 rounded-xl border-2 border-green-200 bg-green-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('mela_f_name')} htmlFor="am_hi"><TextInput id="am_hi" value={f.name_hi} onChange={set('name_hi')} /></Field>
        <Field label={`${t('mela_f_name')} (EN)`} htmlFor="am_en"><TextInput id="am_en" value={f.name_en || ''} onChange={set('name_en')} /></Field>
        <Field label={t('mela_f_organizer')} htmlFor="am_org"><TextInput id="am_org" value={f.organizer_name || ''} onChange={set('organizer_name')} /></Field>
        <Field label={t('mela_f_venue')} htmlFor="am_v"><TextInput id="am_v" value={f.venue} onChange={set('venue')} /></Field>
        <Field label={t('mela_f_state')} htmlFor="am_s"><TextInput id="am_s" value={f.state} onChange={set('state')} /></Field>
        <Field label={t('mela_f_district')} htmlFor="am_d"><TextInput id="am_d" value={f.district || ''} onChange={set('district')} /></Field>
      </div>
      <label className="mt-3 flex items-center gap-2 font-semibold text-stone-800">
        <input type="checkbox" checked={!!f.is_date_confirmed} onChange={set('is_date_confirmed')} className="h-5 w-5 accent-green-700" />
        {t('mela_f_date_start')} ({t('admin_mela_approve')})
      </label>
      {f.is_date_confirmed ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('mela_f_date_start')} htmlFor="am_ds"><TextInput id="am_ds" type="date" value={f.event_date_start || ''} onChange={set('event_date_start')} /></Field>
          <Field label={t('mela_f_date_end')} htmlFor="am_de"><TextInput id="am_de" type="date" value={f.event_date_end || ''} onChange={set('event_date_end')} /></Field>
        </div>
      ) : (
        <Field label={t('mela_f_expected')} htmlFor="am_exp"><TextInput id="am_exp" value={f.expected_period || ''} onChange={set('expected_period')} /></Field>
      )}
      <Field label={t('mela_f_offering')}>
        <div className="flex flex-wrap gap-2">
          {MELA_TAGS.map((tag) => {
            const on = (f.category_tags || []).includes(tag)
            return <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`rounded-full border-2 px-3 py-1 text-sm font-semibold ${on ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 bg-white text-stone-700'}`}>{t(`mela_tag_${tag}`)}</button>
          })}
        </div>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('mela_f_contact_name')} htmlFor="am_cn"><TextInput id="am_cn" value={f.contact_name || ''} onChange={set('contact_name')} /></Field>
        <Field label={t('mela_f_contact_number')} htmlFor="am_cnum"><TextInput id="am_cnum" value={f.contact_number || ''} onChange={set('contact_number')} /></Field>
      </div>
      <Field label={t('mela_f_source')} htmlFor="am_src"><TextInput id="am_src" value={f.source_url || ''} onChange={set('source_url')} placeholder="https://…" /></Field>
      <Field label={t('mela_f_highlights')} htmlFor="am_hl"><TextArea id="am_hl" rows={2} value={f.highlights_hi || ''} onChange={set('highlights_hi')} /></Field>
      <div className="mt-3 flex gap-2">
        <button onClick={() => onSave({ ...f, moderation_status: 'approved' })} className="rounded-lg bg-green-700 px-4 py-2 font-bold text-white" data-testid="admin-mela-save-approve">{t('admin_mela_approve')}</button>
        <button onClick={() => onSave(f)} className="rounded-lg border-2 border-green-700 px-4 py-2 font-bold text-green-700">{t('action_save')}</button>
        <button onClick={onCancel} className="rounded-lg bg-stone-200 px-4 py-2 font-bold text-stone-700">{t('action_cancel')}</button>
      </div>
    </div>
  )
}

// --- AI-discovery candidates that failed automated verification (rejected / unverifiable) ---
// Read-only review with a manual "publish anyway" escape hatch for genuine misses (Phase 7).

function MelaCandidatesPanel({ actorId, t, lang }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(null)
  const load = useCallback(() => {
    getAdminMelaCandidates(actorId).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])
  useEffect(() => { load() }, [load])

  // Only rejected/unverifiable are actionable here; verified ones already live in the public list.
  const review = (rows || []).filter((r) => r.verification_status === 'rejected' || r.verification_status === 'unverifiable')
  const publish = async (id) => {
    setErr(null); setBusy(id)
    try { await adminPublishCandidate(actorId, id); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) } finally { setBusy(null) }
  }
  return (
    <Section title={t('admin_cand_h')} right={review.length ? <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-bold text-stone-700">{review.length}</span> : null}>
      <p className="mb-3 text-xs text-stone-500">{t('admin_cand_help')}</p>
      {err && <Notice tone="error">{err}</Notice>}
      {!rows ? <Spinner /> : review.length === 0 ? <p className="text-stone-500">{t('admin_cand_none')}</p> : (
        <div className="space-y-2">
          {review.map((r) => (
            <div key={r.id} data-testid="admin-mela-candidate-row" className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-100 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-stone-900">{r.raw_name || '—'}</div>
                <div className="text-xs text-stone-500">
                  {[r.raw_venue, r.raw_district, r.raw_state].filter(Boolean).join(', ')}
                  {r.raw_date_text ? ` · ${r.raw_date_text}` : ''} · {r.source_name}
                </div>
                {r.verification_reason && <div className="mt-0.5 text-xs text-stone-400">{r.verification_reason}</div>}
                {r.source_url && /^https?:\/\//i.test(r.source_url) && (
                  <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-green-700 underline">{t('mela_source')} ↗</a>
                )}
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.verification_status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{t(`admin_cand_${r.verification_status}`)}</span>
              {r.promoted_to_kisan_mela
                ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">{t('admin_cand_published')}</span>
                : <button onClick={() => publish(r.id)} disabled={busy === r.id} data-testid="admin-mela-candidate-publish" className="rounded-lg border-2 border-green-700 px-3 py-1 text-sm font-bold text-green-700 disabled:opacity-50">{t('admin_cand_publish_anyway')}</button>}
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

// --- Recent automatic merges (dedup) with an "अलग करें" (split) undo (Phase 3f) ---

function MelaMergesPanel({ actorId, t, lang }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(null)
  const load = useCallback(() => {
    getRecentMelaMerges(actorId).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])
  useEffect(() => { load() }, [load])

  const split = async (id) => {
    setErr(null); setBusy(id)
    try { await adminSplitMela(actorId, id); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) } finally { setBusy(null) }
  }
  return (
    <Section title={t('admin_merge_h')} right={rows?.length ? <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-bold text-stone-700">{rows.length}</span> : null}>
      <p className="mb-3 text-xs text-stone-500">{t('admin_merge_help')}</p>
      {err && <Notice tone="error">{err}</Notice>}
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_merge_none')}</p> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.merged_id} data-testid="admin-mela-merge-row" className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-100 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-stone-900"><span className="font-bold">{r.merged_name || '—'}</span> → <span className="font-bold text-green-800">{r.survivor_name || '—'}</span></div>
                <div className="text-xs text-stone-500">{r.merged_state || ''}{r.reason ? ` · ${r.reason}` : ''}{r.merged_at ? ` · ${String(r.merged_at).slice(0, 10)}` : ''}</div>
              </div>
              <button onClick={() => split(r.merged_id)} disabled={busy === r.merged_id} data-testid="admin-mela-split" className="rounded-lg border-2 border-stone-300 px-3 py-1 text-sm font-bold text-stone-700 disabled:opacity-50">{t('admin_merge_split')}</button>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}


export { ListingsPanel, ReportsPanel, CarbonSuggestionsPanel, MelaPanel, MelaCandidatesPanel, MelaMergesPanel }
