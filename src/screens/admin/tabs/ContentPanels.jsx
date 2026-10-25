// Batch 14A - the Content tab's panels, moved verbatim out of src/screens/Admin.jsx (same code, same data-testids).
import { useEffect, useState, useCallback } from 'react'
import {
  Field,
  TextInput,
  TextArea,
  Select,
  Notice,
  Spinner,
} from '../../../components/ui'
import {
  adminListExperts,
  adminSetExpertActive,
  adminUpsertExpert,
  getAdminArticles,
  adminUpsertArticle,
  adminDeleteArticle,
  slugify,
  getAdminResources,
  adminSetResourceActive,
  adminUpsertResource,
  getAdminSawaal,
  adminAnswerSawaal,
  adminSetSawaalFeatured,
  adminSetSawaalPublished,
  adminDeleteSawaal,
  getAdminSafalta,
  adminUpsertSafalta,
  adminSetSafaltaPublished,
  adminSetSafaltaFeatured,
  adminDeleteSafalta,
  getAdminYojana,
  adminSetYojanaActive,
  adminSetYojanaFeatured,
  adminUpsertYojana,
  getAdminPageFaqs,
  adminUpsertPageFaq,
  adminDeletePageFaq,
} from '../../../lib/admin/adminApi'
import { sawaalQuestion } from '../../../lib/community/communityApi'
import Section from '../Section'

function ExpertsPanel({ actorId, t }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [editing, setEditing] = useState(null) // expert object or EMPTY_EXPERT
  const load = useCallback(() => {
    adminListExperts(actorId).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])
  useEffect(() => { load() }, [load])

  async function toggle(e) {
    try { await adminSetExpertActive(actorId, e.id, !e.is_active); load() } catch (er) { setErr(t(er.i18nKey || 'err_unknown')) }
  }
  async function save(form) {
    setErr(null)
    try { await adminUpsertExpert(actorId, form); setEditing(null); load() } catch (er) { setErr(t(er.i18nKey || 'err_unknown')) }
  }

  return (
    <Section
      title={t('admin_experts')}
      right={<button onClick={() => setEditing({ ...EMPTY_EXPERT })} className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-bold text-white">+ {t('expert_add')}</button>}
    >
      {err && <Notice tone="error">{err}</Notice>}
      {editing && (
        <ExpertForm t={t} initial={editing} onCancel={() => setEditing(null)} onSave={save} />
      )}
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
        <div className="space-y-2">
          {rows.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-100 p-3">
              <div className="flex-1">
                <div className="font-bold text-stone-900">{e.name} {e.is_active ? '' : `(${t('expert_inactive')})`}</div>
                <div className="text-sm text-stone-500">{e.specialisation_en} · {e.organisation} · {e.phone}</div>
              </div>
              <button onClick={() => toggle(e)} className="rounded-lg border-2 border-stone-300 px-3 py-1 text-sm font-bold text-stone-700">
                {e.is_active ? t('expert_make_inactive') : t('expert_make_active')}
              </button>
              <button onClick={() => setEditing(e)} className="rounded-lg border-2 border-green-700 px-3 py-1 text-sm font-bold text-green-800">{t('action_edit')}</button>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

function ExpertForm({ t, initial, onCancel, onSave }) {
  const [f, setF] = useState(initial)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  return (
    <div className="mb-4 rounded-xl border-2 border-green-200 bg-green-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('f_name_en')} htmlFor="ex_name"><TextInput id="ex_name" value={f.name} onChange={set('name')} /></Field>
        <Field label={t('f_name_hi')} htmlFor="ex_name_hi"><TextInput id="ex_name_hi" value={f.name_hi || ''} onChange={set('name_hi')} /></Field>
        <Field label={t('f_spec_en')} htmlFor="ex_spec_en"><TextInput id="ex_spec_en" value={f.specialisation_en || ''} onChange={set('specialisation_en')} /></Field>
        <Field label={t('f_spec_hi')} htmlFor="ex_spec_hi"><TextInput id="ex_spec_hi" value={f.specialisation_hi || ''} onChange={set('specialisation_hi')} /></Field>
        <Field label={t('f_bio_en')} htmlFor="ex_bio_en"><TextArea id="ex_bio_en" value={f.bio_en || ''} onChange={set('bio_en')} /></Field>
        <Field label={t('f_bio_hi')} htmlFor="ex_bio_hi"><TextArea id="ex_bio_hi" value={f.bio_hi || ''} onChange={set('bio_hi')} /></Field>
        <Field label={t('f_phone')} htmlFor="ex_phone"><TextInput id="ex_phone" value={f.phone} onChange={set('phone')} /></Field>
        <Field label={t('f_org')} htmlFor="ex_org"><TextInput id="ex_org" value={f.organisation || ''} onChange={set('organisation')} /></Field>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={() => onSave(f)} className="rounded-lg bg-green-700 px-4 py-2 font-bold text-white">{t('action_save')}</button>
        <button onClick={onCancel} className="rounded-lg bg-stone-200 px-4 py-2 font-bold text-stone-700">{t('action_cancel')}</button>
      </div>
    </div>
  )
}

const EMPTY_ARTICLE = { slug: '', title_hi: '', title_en: '', summary_hi: '', summary_en: '', content_hi: '', content_en: '', author_name: 'Team Kissan Sahyog', is_published: false }


function ArticlesPanel({ actorId, t, lang }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [editing, setEditing] = useState(null)
  const load = useCallback(() => {
    getAdminArticles(actorId).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])
  useEffect(() => { load() }, [load])

  async function togglePublish(a) {
    try { await adminUpsertArticle(actorId, { ...a, is_published: !a.is_published }); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) }
  }
  async function del(a) {
    try { await adminDeleteArticle(actorId, a.id); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) }
  }
  async function save(form) {
    setErr(null)
    try { await adminUpsertArticle(actorId, form); setEditing(null); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) }
  }

  return (
    <Section
      title={t('admin_articles')}
      right={<button onClick={() => setEditing({ ...EMPTY_ARTICLE })} className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-bold text-white">+ {t('article_new')}</button>}
    >
      {err && <Notice tone="error">{err}</Notice>}
      {editing && <ArticleForm t={t} initial={editing} onCancel={() => setEditing(null)} onSave={save} />}
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
        <div className="space-y-2">
          {rows.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-100 p-3">
              <div className="flex-1">
                <div className="font-bold text-stone-900">{lang === 'hi' ? a.title_hi : a.title_en}</div>
                <div className="text-sm text-stone-500">{a.author_name}</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${a.is_published ? 'bg-green-100 text-green-800' : 'bg-stone-200 text-stone-600'}`}>
                {a.is_published ? t('article_published_badge') : t('article_draft_badge')}
              </span>
              <button onClick={() => togglePublish(a)} className="rounded-lg border-2 border-stone-300 px-3 py-1 text-sm font-bold text-stone-700">
                {a.is_published ? t('action_unpublish') : t('action_publish')}
              </button>
              <button onClick={() => setEditing(a)} className="rounded-lg border-2 border-green-700 px-3 py-1 text-sm font-bold text-green-800">{t('action_edit')}</button>
              <button onClick={() => del(a)} className="rounded-lg bg-red-600 px-3 py-1 text-sm font-bold text-white">{t('action_delete')}</button>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

function ArticleForm({ t, initial, onCancel, onSave }) {
  const [f, setF] = useState(initial)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  // Auto-fill slug from the English title when creating (empty slug).
  const onTitleEn = (e) => setF((s) => ({ ...s, title_en: e.target.value, slug: s.slug || slugify(e.target.value) }))
  return (
    <div className="mb-4 rounded-xl border-2 border-green-200 bg-green-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('f_title_hi')} htmlFor="ar_th"><TextInput id="ar_th" value={f.title_hi} onChange={set('title_hi')} /></Field>
        <Field label={t('f_title_en')} htmlFor="ar_te"><TextInput id="ar_te" value={f.title_en} onChange={onTitleEn} /></Field>
        <Field label={t('f_slug')} htmlFor="ar_slug"><TextInput id="ar_slug" value={f.slug} onChange={set('slug')} /></Field>
        <Field label={t('f_author')} htmlFor="ar_au"><TextInput id="ar_au" value={f.author_name} onChange={set('author_name')} /></Field>
        <Field label={t('f_summary_hi')} htmlFor="ar_sh"><TextArea id="ar_sh" value={f.summary_hi || ''} onChange={set('summary_hi')} /></Field>
        <Field label={t('f_summary_en')} htmlFor="ar_se"><TextArea id="ar_se" value={f.summary_en || ''} onChange={set('summary_en')} /></Field>
        <Field label={t('f_content_hi')} htmlFor="ar_ch"><TextArea id="ar_ch" rows={6} value={f.content_hi} onChange={set('content_hi')} /></Field>
        <Field label={t('f_content_en')} htmlFor="ar_ce"><TextArea id="ar_ce" rows={6} value={f.content_en} onChange={set('content_en')} /></Field>
      </div>
      <label className="mt-3 flex items-center gap-2 font-semibold text-stone-800">
        <input type="checkbox" checked={!!f.is_published} onChange={(e) => setF((s) => ({ ...s, is_published: e.target.checked }))} className="h-5 w-5 accent-green-700" />
        {t('article_published_badge')}
      </label>
      <div className="mt-3 flex gap-2">
        <button onClick={() => onSave(f)} className="rounded-lg bg-green-700 px-4 py-2 font-bold text-white">{t('action_save')}</button>
        <button onClick={onCancel} className="rounded-lg bg-stone-200 px-4 py-2 font-bold text-stone-700">{t('action_cancel')}</button>
      </div>
    </div>
  )
}

const RES_TYPE_LABEL = { soil_lab: 'tab_soil', veterinary: 'tab_veterinary', govt_office: 'tab_offices' }
const EMPTY_RESOURCE = {
  resource_type: 'soil_lab', name_hi: '', name_en: '', description_hi: '', description_en: '',
  address_hi: '', address_en: '', district: 'Sagar', area: '', phone_primary: '', phone_secondary: '',
  phone_tollfree: '', email: '', website: '', timings_hi: '', timings_en: '', is_active: true, sort_order: 0,
}


function ResourcesPanel({ actorId, t, lang }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [editing, setEditing] = useState(null)
  const load = useCallback(() => {
    getAdminResources(actorId).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])
  useEffect(() => { load() }, [load])

  async function toggle(r) {
    try { await adminSetResourceActive(actorId, r.id, !r.is_active); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) }
  }
  async function save(form) {
    setErr(null)
    try { await adminUpsertResource(actorId, form); setEditing(null); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) }
  }

  return (
    <Section
      title={t('admin_resources')}
      right={<button onClick={() => setEditing({ ...EMPTY_RESOURCE })} className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-bold text-white">+ {t('resource_add')}</button>}
    >
      {err && <Notice tone="error">{err}</Notice>}
      {editing && <ResourceForm t={t} initial={editing} onCancel={() => setEditing(null)} onSave={save} />}
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-100 p-3">
              <div className="flex-1">
                <div className="font-bold text-stone-900">{lang === 'hi' ? r.name_hi : r.name_en} {r.is_active ? '' : `(${t('expert_inactive')})`}</div>
                <div className="text-sm text-stone-500">{t(RES_TYPE_LABEL[r.resource_type])} · {r.area || '—'} · {r.phone_tollfree || r.phone_primary || '—'}</div>
              </div>
              <button onClick={() => toggle(r)} className="rounded-lg border-2 border-stone-300 px-3 py-1 text-sm font-bold text-stone-700">
                {r.is_active ? t('expert_make_inactive') : t('expert_make_active')}
              </button>
              <button onClick={() => setEditing(r)} className="rounded-lg border-2 border-green-700 px-3 py-1 text-sm font-bold text-green-800">{t('action_edit')}</button>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

function ResourceForm({ t, initial, onCancel, onSave }) {
  const [f, setF] = useState(initial)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  return (
    <div className="mb-4 rounded-xl border-2 border-green-200 bg-green-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('f_resource_type')} htmlFor="rs_type">
          <Select id="rs_type" value={f.resource_type} onChange={set('resource_type')}>
            <option value="soil_lab">{t('tab_soil')}</option>
            <option value="veterinary">{t('tab_veterinary')}</option>
            <option value="govt_office">{t('tab_offices')}</option>
          </Select>
        </Field>
        <Field label={t('f_area')} htmlFor="rs_area"><TextInput id="rs_area" value={f.area || ''} onChange={set('area')} /></Field>
        <Field label={t('f_name_hi')} htmlFor="rs_nh"><TextInput id="rs_nh" value={f.name_hi} onChange={set('name_hi')} /></Field>
        <Field label={t('f_name_en')} htmlFor="rs_ne"><TextInput id="rs_ne" value={f.name_en} onChange={set('name_en')} /></Field>
        <Field label={t('f_desc_hi')} htmlFor="rs_dh"><TextArea id="rs_dh" value={f.description_hi || ''} onChange={set('description_hi')} /></Field>
        <Field label={t('f_desc_en')} htmlFor="rs_de"><TextArea id="rs_de" value={f.description_en || ''} onChange={set('description_en')} /></Field>
        <Field label={t('f_address_hi')} htmlFor="rs_ah"><TextInput id="rs_ah" value={f.address_hi || ''} onChange={set('address_hi')} /></Field>
        <Field label={t('f_address_en')} htmlFor="rs_ae"><TextInput id="rs_ae" value={f.address_en || ''} onChange={set('address_en')} /></Field>
        <Field label={t('f_phone_primary')} htmlFor="rs_pp"><TextInput id="rs_pp" value={f.phone_primary || ''} onChange={set('phone_primary')} /></Field>
        <Field label={t('f_phone_secondary')} htmlFor="rs_ps"><TextInput id="rs_ps" value={f.phone_secondary || ''} onChange={set('phone_secondary')} /></Field>
        <Field label={t('f_phone_tollfree')} htmlFor="rs_pt"><TextInput id="rs_pt" value={f.phone_tollfree || ''} onChange={set('phone_tollfree')} /></Field>
        <Field label={t('f_email')} htmlFor="rs_em"><TextInput id="rs_em" value={f.email || ''} onChange={set('email')} /></Field>
        <Field label={t('f_website')} htmlFor="rs_web"><TextInput id="rs_web" value={f.website || ''} onChange={set('website')} /></Field>
        <Field label={t('f_district')} htmlFor="rs_dist"><TextInput id="rs_dist" value={f.district || ''} onChange={set('district')} /></Field>
        <Field label={t('f_timings_hi')} htmlFor="rs_th"><TextInput id="rs_th" value={f.timings_hi || ''} onChange={set('timings_hi')} /></Field>
        <Field label={t('f_timings_en')} htmlFor="rs_te"><TextInput id="rs_te" value={f.timings_en || ''} onChange={set('timings_en')} /></Field>
        <Field label={t('f_sort_order')} htmlFor="rs_so"><TextInput id="rs_so" type="number" value={f.sort_order ?? 0} onChange={(e) => setF((s) => ({ ...s, sort_order: Number(e.target.value) }))} /></Field>
      </div>
      <label className="mt-3 flex items-center gap-2 font-semibold text-stone-800">
        <input type="checkbox" checked={!!f.is_active} onChange={(e) => setF((s) => ({ ...s, is_active: e.target.checked }))} className="h-5 w-5 accent-green-700" />
        {t('expert_active')}
      </label>
      <div className="mt-3 flex gap-2">
        <button onClick={() => onSave(f)} className="rounded-lg bg-green-700 px-4 py-2 font-bold text-white">{t('action_save')}</button>
        <button onClick={onCancel} className="rounded-lg bg-stone-200 px-4 py-2 font-bold text-stone-700">{t('action_cancel')}</button>
      </div>
    </div>
  )
}

const EMPTY_MSP = { crop_en: '', crop_hi: '', variety: '', season: 'rabi', marketing_year: '2026-27', msp_per_quintal: '', increase_from_previous: '', is_active: true }


function FaqEditor({ t, faqs, onChange }) {
  const upd = (i, k, v) => onChange(faqs.map((f, j) => (j === i ? { ...f, [k]: v } : f)))
  return (
    <div className="mt-3 rounded-lg border border-green-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-bold text-stone-800">{t('scheme_faqs')}</span>
        <button type="button" onClick={() => onChange([...faqs, { q_hi: '', q_en: '', a_hi: '', a_en: '' }])} className="rounded bg-green-700 px-2 py-1 text-xs font-bold text-white">+ FAQ</button>
      </div>
      {faqs.map((f, i) => (
        <div key={i} className="mb-2 grid gap-2 rounded border border-stone-100 p-2 sm:grid-cols-2">
          <TextInput placeholder="Q (HI)" value={f.q_hi || ''} onChange={(e) => upd(i, 'q_hi', e.target.value)} />
          <TextInput placeholder="Q (EN)" value={f.q_en || ''} onChange={(e) => upd(i, 'q_en', e.target.value)} />
          <TextArea placeholder="A (HI)" value={f.a_hi || ''} onChange={(e) => upd(i, 'a_hi', e.target.value)} />
          <TextArea placeholder="A (EN)" value={f.a_en || ''} onChange={(e) => upd(i, 'a_en', e.target.value)} />
          <button type="button" onClick={() => onChange(faqs.filter((_, j) => j !== i))} className="w-fit rounded bg-red-100 px-2 py-1 text-xs font-bold text-red-700">✕ remove</button>
        </div>
      ))}
    </div>
  )
}
const EMPTY_YOJANA = {
  scheme_name_hi: '', scheme_name_en: '', ministry_hi: '', ministry_en: '', category: 'income_support',
  description_hi: '', description_en: '', benefit_hi: '', benefit_en: '', eligibility_hi: '', eligibility_en: '',
  how_to_apply_hi: '', how_to_apply_en: '', official_website: '', helpline: '', deadline_note_hi: '', deadline_note_en: '',
  is_active: true, is_featured: false, sort_order: 0,
  slug: '', government_level: 'central', documents_required_hi: '', documents_required_en: '',
  source_url: '', last_verified_date: '', faqs: [],
}

function YojanaPanel({ actorId, t, lang }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [editing, setEditing] = useState(null)
  const load = useCallback(() => {
    getAdminYojana(actorId).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])
  useEffect(() => { load() }, [load])

  const act = async (fn) => { setErr(null); try { await fn(); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) } }
  async function save(form) { setErr(null); try { await adminUpsertYojana(actorId, form); setEditing(null); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) } }

  return (
    <Section
      title={t('admin_yojana')}
      right={<button onClick={() => setEditing({ ...EMPTY_YOJANA })} className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-bold text-white">+ {t('yojana_nav')}</button>}
    >
      {err && <Notice tone="error">{err}</Notice>}
      {editing && <YojanaForm t={t} initial={editing} onCancel={() => setEditing(null)} onSave={save} />}
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-100 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-stone-900">{lang === 'hi' ? r.scheme_name_hi : r.scheme_name_en}</div>
                <div className="text-xs text-stone-500">{t(`ycat_${r.category}`)} · #{r.sort_order}</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.is_active ? 'bg-green-100 text-green-800' : 'bg-stone-200 text-stone-600'}`}>
                {r.is_active ? t('expert_active') : t('expert_inactive')}
              </span>
              {r.is_featured && <span className="rounded-full bg-green-700 px-2 py-0.5 text-xs font-bold text-white">{t('featured_badge')}</span>}
              <button onClick={() => act(() => adminSetYojanaActive(actorId, r.id, !r.is_active))} className="rounded-lg border-2 border-stone-300 px-3 py-1 text-sm font-bold text-stone-700">{r.is_active ? t('expert_make_inactive') : t('expert_make_active')}</button>
              <button onClick={() => act(() => adminSetYojanaFeatured(actorId, r.id, !r.is_featured))} className="rounded-lg border-2 border-stone-300 px-3 py-1 text-sm font-bold text-stone-700">{r.is_featured ? t('action_unfeature') : t('action_feature')}</button>
              <button onClick={() => setEditing(r)} className="rounded-lg border-2 border-green-700 px-3 py-1 text-sm font-bold text-green-800">{t('action_edit')}</button>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

function YojanaForm({ t, initial, onCancel, onSave }) {
  const [f, setF] = useState(initial)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  return (
    <div className="mb-4 rounded-xl border-2 border-green-200 bg-green-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('f_scheme_name_hi')} htmlFor="yo_nh"><TextInput id="yo_nh" value={f.scheme_name_hi} onChange={set('scheme_name_hi')} /></Field>
        <Field label={t('f_scheme_name_en')} htmlFor="yo_ne"><TextInput id="yo_ne" value={f.scheme_name_en} onChange={set('scheme_name_en')} /></Field>
        <Field label={t('f_ministry_hi')} htmlFor="yo_mh"><TextInput id="yo_mh" value={f.ministry_hi || ''} onChange={set('ministry_hi')} /></Field>
        <Field label={t('f_ministry_en')} htmlFor="yo_me"><TextInput id="yo_me" value={f.ministry_en || ''} onChange={set('ministry_en')} /></Field>
        <Field label={t('f_scheme_category')} htmlFor="yo_cat">
          <Select id="yo_cat" value={f.category} onChange={set('category')}>
            {YOJANA_CATS.map((c) => (<option key={c} value={c}>{t(`ycat_${c}`)}</option>))}
          </Select>
        </Field>
        <Field label={t('f_sort_order')} htmlFor="yo_so"><TextInput id="yo_so" type="number" value={f.sort_order ?? 0} onChange={(e) => setF((s) => ({ ...s, sort_order: Number(e.target.value) }))} /></Field>
        <Field label={t('f_benefit_hi')} htmlFor="yo_bh"><TextInput id="yo_bh" value={f.benefit_hi} onChange={set('benefit_hi')} /></Field>
        <Field label={t('f_benefit_en')} htmlFor="yo_be"><TextInput id="yo_be" value={f.benefit_en} onChange={set('benefit_en')} /></Field>
        <Field label={t('f_desc_hi')} htmlFor="yo_dh"><TextArea id="yo_dh" value={f.description_hi} onChange={set('description_hi')} /></Field>
        <Field label={t('f_desc_en')} htmlFor="yo_de"><TextArea id="yo_de" value={f.description_en} onChange={set('description_en')} /></Field>
        <Field label={t('f_eligibility_hi')} htmlFor="yo_eh"><TextArea id="yo_eh" value={f.eligibility_hi} onChange={set('eligibility_hi')} /></Field>
        <Field label={t('f_eligibility_en')} htmlFor="yo_ee"><TextArea id="yo_ee" value={f.eligibility_en} onChange={set('eligibility_en')} /></Field>
        <Field label={t('f_howto_hi')} htmlFor="yo_hh"><TextArea id="yo_hh" value={f.how_to_apply_hi || ''} onChange={set('how_to_apply_hi')} /></Field>
        <Field label={t('f_howto_en')} htmlFor="yo_he"><TextArea id="yo_he" value={f.how_to_apply_en || ''} onChange={set('how_to_apply_en')} /></Field>
        <Field label={t('yojana_website')} htmlFor="yo_w"><TextInput id="yo_w" value={f.official_website || ''} onChange={set('official_website')} /></Field>
        <Field label={t('f_helpline')} htmlFor="yo_hp"><TextInput id="yo_hp" value={f.helpline || ''} onChange={set('helpline')} /></Field>
        <Field label={t('f_deadline_hi')} htmlFor="yo_ddh"><TextInput id="yo_ddh" value={f.deadline_note_hi || ''} onChange={set('deadline_note_hi')} /></Field>
        <Field label={t('f_deadline_en')} htmlFor="yo_dde"><TextInput id="yo_dde" value={f.deadline_note_en || ''} onChange={set('deadline_note_en')} /></Field>
        {/* Phase 3e — individual scheme page fields */}
        <Field label="slug" htmlFor="yo_slug"><TextInput id="yo_slug" value={f.slug || ''} onChange={set('slug')} /></Field>
        <Field label="government_level" htmlFor="yo_lvl">
          <Select id="yo_lvl" value={f.government_level || 'central'} onChange={set('government_level')}>
            <option value="central">{t('scheme_central_group')}</option>
            <option value="state">{t('scheme_mp_group')}</option>
          </Select>
        </Field>
        <Field label={t('scheme_docs') + ' (HI)'} htmlFor="yo_dqh"><TextArea id="yo_dqh" value={f.documents_required_hi || ''} onChange={set('documents_required_hi')} /></Field>
        <Field label={t('scheme_docs') + ' (EN)'} htmlFor="yo_dqe"><TextArea id="yo_dqe" value={f.documents_required_en || ''} onChange={set('documents_required_en')} /></Field>
        <Field label="source_url" htmlFor="yo_src"><TextInput id="yo_src" value={f.source_url || ''} onChange={set('source_url')} /></Field>
        <Field label={t('scheme_verified')} htmlFor="yo_lvd"><TextInput id="yo_lvd" type="date" value={f.last_verified_date || ''} onChange={set('last_verified_date')} /></Field>
      </div>
      {/* FAQ repeatable editor */}
      <FaqEditor t={t} faqs={Array.isArray(f.faqs) ? f.faqs : []} onChange={(faqs) => setF((s) => ({ ...s, faqs }))} />
      <div className="mt-3 flex flex-wrap gap-4">
        <label className="flex items-center gap-2 font-semibold text-stone-800">
          <input type="checkbox" checked={!!f.is_active} onChange={(e) => setF((s) => ({ ...s, is_active: e.target.checked }))} className="h-5 w-5 accent-green-700" />
          {t('expert_active')}
        </label>
        <label className="flex items-center gap-2 font-semibold text-stone-800">
          <input type="checkbox" checked={!!f.is_featured} onChange={(e) => setF((s) => ({ ...s, is_featured: e.target.checked }))} className="h-5 w-5 accent-green-700" />
          {t('featured_badge')}
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={() => onSave(f)} className="rounded-lg bg-green-700 px-4 py-2 font-bold text-white">{t('action_save')}</button>
        <button onClick={onCancel} className="rounded-lg bg-stone-200 px-4 py-2 font-bold text-stone-700">{t('action_cancel')}</button>
      </div>
    </div>
  )
}


function SafaltaPanel({ actorId, t, lang }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [editing, setEditing] = useState(null)
  const load = useCallback(() => {
    getAdminSafalta(actorId).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])
  useEffect(() => { load() }, [load])

  const act = async (fn) => { setErr(null); try { await fn(); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) } }
  async function save(form) { setErr(null); try { await adminUpsertSafalta(actorId, form); setEditing(null); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) } }

  return (
    <Section
      title={t('admin_safalta')}
      right={<button onClick={() => setEditing({ ...EMPTY_STORY })} className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-bold text-white">+ {t('story_add')}</button>}
    >
      {err && <Notice tone="error">{err}</Notice>}
      {editing && <StoryForm t={t} initial={editing} onCancel={() => setEditing(null)} onSave={save} />}
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-100 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-stone-900">{r.farmer_name} <span className="font-normal text-stone-500">· {r.crop_or_activity}</span></div>
                <div className="text-xs text-stone-500">{[r.village, r.district].filter(Boolean).join(', ')}{r.contact_phone ? ` · ${r.contact_phone}` : ''}</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.is_published ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                {r.is_published ? t('article_published_badge') : t('admin_pending_badge')}
              </span>
              {r.is_featured && <span className="rounded-full bg-green-700 px-2 py-0.5 text-xs font-bold text-white">{t('featured_badge')}</span>}
              <button onClick={() => setEditing(r)} className="rounded-lg bg-green-700 px-3 py-1 text-sm font-bold text-white">{r.is_published ? t('action_edit') : t('admin_review_publish')}</button>
              {r.is_published && (
                <>
                  <button onClick={() => act(() => adminSetSafaltaFeatured(actorId, r.id, !r.is_featured))} className="rounded-lg border-2 border-stone-300 px-3 py-1 text-sm font-bold text-stone-700">{r.is_featured ? t('action_unfeature') : t('action_feature')}</button>
                  <button onClick={() => act(() => adminSetSafaltaPublished(actorId, r.id, false))} className="rounded-lg border-2 border-stone-300 px-3 py-1 text-sm font-bold text-stone-700">{t('action_unpublish')}</button>
                </>
              )}
              <button onClick={() => act(() => adminDeleteSafalta(actorId, r.id))} className="rounded-lg bg-red-600 px-3 py-1 text-sm font-bold text-white">{t('action_delete')}</button>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

function StoryForm({ t, initial, onCancel, onSave }) {
  const [f, setF] = useState(initial)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  return (
    <div className="mb-4 rounded-xl border-2 border-green-200 bg-green-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('f_farmer_name')} htmlFor="st_n"><TextInput id="st_n" value={f.farmer_name} onChange={set('farmer_name')} /></Field>
        <Field label={t('safalta_f_village')} htmlFor="st_v"><TextInput id="st_v" value={f.village} onChange={set('village')} /></Field>
        <Field label={t('f_crop_activity')} htmlFor="st_c"><TextInput id="st_c" value={f.crop_or_activity} onChange={set('crop_or_activity')} /></Field>
        <Field label={t('f_district')} htmlFor="st_d"><TextInput id="st_d" value={f.district} onChange={set('district')} /></Field>
        <Field label={t('f_income_before')} htmlFor="st_ib"><TextInput id="st_ib" value={f.income_before || ''} onChange={set('income_before')} /></Field>
        <Field label={t('f_income_after')} htmlFor="st_ia"><TextInput id="st_ia" value={f.income_after || ''} onChange={set('income_after')} /></Field>
        <Field label={t('f_story_hi')} htmlFor="st_sh"><TextArea id="st_sh" rows={5} value={f.story_hi} onChange={set('story_hi')} /></Field>
        <Field label={t('f_story_en')} htmlFor="st_se"><TextArea id="st_se" rows={5} value={f.story_en || ''} onChange={set('story_en')} /></Field>
        <Field label={t('f_how_helped_hi')} htmlFor="st_hh"><TextArea id="st_hh" value={f.how_helped_hi} onChange={set('how_helped_hi')} /></Field>
        <Field label={t('f_how_helped_en')} htmlFor="st_he"><TextArea id="st_he" value={f.how_helped_en || ''} onChange={set('how_helped_en')} /></Field>
        <Field label={t('f_photo_url')} htmlFor="st_p"><TextInput id="st_p" value={f.photo_url || ''} onChange={set('photo_url')} /></Field>
      </div>
      <div className="mt-3 flex flex-wrap gap-4">
        <label className="flex items-center gap-2 font-semibold text-stone-800">
          <input type="checkbox" checked={!!f.is_published} onChange={(e) => setF((s) => ({ ...s, is_published: e.target.checked }))} className="h-5 w-5 accent-green-700" />
          {t('article_published_badge')}
        </label>
        <label className="flex items-center gap-2 font-semibold text-stone-800">
          <input type="checkbox" checked={!!f.is_featured} onChange={(e) => setF((s) => ({ ...s, is_featured: e.target.checked }))} className="h-5 w-5 accent-green-700" />
          {t('featured_badge')}
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={() => onSave(f)} className="rounded-lg bg-green-700 px-4 py-2 font-bold text-white">{t('action_save')}</button>
        <button onClick={onCancel} className="rounded-lg bg-stone-200 px-4 py-2 font-bold text-stone-700">{t('action_cancel')}</button>
      </div>
    </div>
  )
}

// --- Community: Sarkari Yojana (schemes) management -----------------------
const YOJANA_CATS = ['income_support', 'crop_insurance', 'credit', 'equipment', 'solar', 'storage', 'women', 'market', 'general', 'machinery', 'irrigation']

// Repeatable FAQ editor for the scheme form (Phase 3e). Each row = {q_hi,q_en,a_hi,a_en}.

function SawaalPanel({ actorId, t, lang }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [answering, setAnswering] = useState(null)
  const load = useCallback(() => {
    getAdminSawaal(actorId).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])
  useEffect(() => { load() }, [load])

  const act = async (fn) => { setErr(null); try { await fn(); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) } }
  async function saveAnswer(form) { setErr(null); try { await adminAnswerSawaal(actorId, form); setAnswering(null); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) } }

  return (
    <Section title={t('admin_sawaal')}>
      {err && <Notice tone="error">{err}</Notice>}
      {answering && <SawaalAnswerForm t={t} initial={answering} onCancel={() => setAnswering(null)} onSave={saveAnswer} />}
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-100 p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-stone-900">{sawaalQuestion(r, lang)}</div>
                <div className="text-xs text-stone-500">{t(`scat_${r.category || 'general'}`)} · {r.asked_by_village || '—'} · {r.created_at?.slice(0, 10)}</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.is_published ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                {r.is_published ? t('article_published_badge') : t('admin_pending_badge')}
              </span>
              {r.is_featured && <span className="rounded-full bg-green-700 px-2 py-0.5 text-xs font-bold text-white">{t('featured_badge')}</span>}
              <button onClick={() => setAnswering({ id: r.id, answer_hi: r.answer_hi || '', answer_en: r.answer_en || '', answered_by: r.answered_by || 'Team Kissan Sahyog', is_published: true })} className="rounded-lg bg-green-700 px-3 py-1 text-sm font-bold text-white">
                {r.is_published ? t('action_edit') : t('admin_answer_publish')}
              </button>
              {r.is_published && (
                <>
                  <button onClick={() => act(() => adminSetSawaalFeatured(actorId, r.id, !r.is_featured))} className="rounded-lg border-2 border-stone-300 px-3 py-1 text-sm font-bold text-stone-700">{r.is_featured ? t('action_unfeature') : t('action_feature')}</button>
                  <button onClick={() => act(() => adminSetSawaalPublished(actorId, r.id, false))} className="rounded-lg border-2 border-stone-300 px-3 py-1 text-sm font-bold text-stone-700">{t('action_unpublish')}</button>
                </>
              )}
              <button onClick={() => act(() => adminDeleteSawaal(actorId, r.id))} className="rounded-lg bg-red-600 px-3 py-1 text-sm font-bold text-white">{t('action_delete')}</button>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

function SawaalAnswerForm({ t, initial, onCancel, onSave }) {
  const [f, setF] = useState(initial)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  return (
    <div className="mb-4 rounded-xl border-2 border-green-200 bg-green-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('f_answer_hi')} htmlFor="sw_ah"><TextArea id="sw_ah" rows={5} value={f.answer_hi} onChange={set('answer_hi')} /></Field>
        <Field label={t('f_answer_en')} htmlFor="sw_ae"><TextArea id="sw_ae" rows={5} value={f.answer_en} onChange={set('answer_en')} /></Field>
        <Field label={t('f_answered_by')} htmlFor="sw_by"><TextInput id="sw_by" value={f.answered_by} onChange={set('answered_by')} /></Field>
      </div>
      <label className="mt-3 flex items-center gap-2 font-semibold text-stone-800">
        <input type="checkbox" checked={!!f.is_published} onChange={(e) => setF((s) => ({ ...s, is_published: e.target.checked }))} className="h-5 w-5 accent-green-700" />
        {t('article_published_badge')}
      </label>
      <div className="mt-3 flex gap-2">
        <button onClick={() => onSave(f)} className="rounded-lg bg-green-700 px-4 py-2 font-bold text-white">{t('action_save')}</button>
        <button onClick={onCancel} className="rounded-lg bg-stone-200 px-4 py-2 font-bold text-stone-700">{t('action_cancel')}</button>
      </div>
    </div>
  )
}

// --- Community: Kisan Safalta (success stories) management ----------------
const EMPTY_STORY = {
  farmer_name: '', village: '', district: 'Sagar', crop_or_activity: '', story_hi: '', story_en: '',
  income_before: '', income_after: '', how_helped_hi: '', how_helped_en: '', photo_url: '', is_published: false, is_featured: false,
}


function PageFaqsPanel({ actorId, t }) {
  const [rows, setRows] = useState(null); const [err, setErr] = useState(null); const [editing, setEditing] = useState(null)
  const load = useCallback(() => { getAdminPageFaqs(actorId, null).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown'))) }, [actorId, t])
  useEffect(() => { load() }, [load])
  async function save(f) { setErr(null); try { await adminUpsertPageFaq(actorId, f); setEditing(null); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) } }
  return (
    <Section title={t('admin_page_faqs')} right={<button onClick={() => setEditing({ ...EMPTY_FAQ })} className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-bold text-white">+</button>}>
      {err && <Notice tone="error">{err}</Notice>}
      {editing && (
        <div className="mb-3 rounded-xl border-2 border-green-200 bg-green-50 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="page" htmlFor="f_pg"><Select id="f_pg" value={editing.page_key} onChange={(e) => setEditing((s) => ({ ...s, page_key: e.target.value }))}><option value="mausam">mausam</option><option value="msp">msp</option></Select></Field>
            <Field label="sort_order" htmlFor="f_so"><TextInput id="f_so" type="number" value={editing.sort_order} onChange={(e) => setEditing((s) => ({ ...s, sort_order: Number(e.target.value) }))} /></Field>
            <Field label="q_hi" htmlFor="f_qh"><TextInput id="f_qh" value={editing.q_hi} onChange={(e) => setEditing((s) => ({ ...s, q_hi: e.target.value }))} /></Field>
            <Field label="q_en" htmlFor="f_qe"><TextInput id="f_qe" value={editing.q_en || ''} onChange={(e) => setEditing((s) => ({ ...s, q_en: e.target.value }))} /></Field>
          </div>
          <Field label="a_hi" htmlFor="f_ah"><TextArea id="f_ah" value={editing.a_hi} onChange={(e) => setEditing((s) => ({ ...s, a_hi: e.target.value }))} /></Field>
          <Field label="a_en" htmlFor="f_ae"><TextArea id="f_ae" value={editing.a_en || ''} onChange={(e) => setEditing((s) => ({ ...s, a_en: e.target.value }))} /></Field>
          <div className="mt-2 flex gap-2"><button onClick={() => save(editing)} className="rounded-lg bg-green-700 px-4 py-2 font-bold text-white">{t('save')}</button><button onClick={() => setEditing(null)} className="rounded-lg bg-stone-200 px-4 py-2 font-bold">{t('cancel')}</button></div>
        </div>
      )}
      {!rows ? <Spinner /> : (
        <div className="space-y-1">{rows.map((r) => (
          <div key={r.id} className="flex items-center gap-2 rounded border border-stone-100 p-2 text-sm">
            <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs font-bold">{r.page_key}</span>
            <span className="min-w-0 flex-1 truncate">{r.q_hi}</span>
            <button onClick={() => setEditing(r)} className="rounded border-2 border-green-700 px-2 py-0.5 text-xs font-bold text-green-800">{t('action_edit')}</button>
            <button onClick={() => adminDeletePageFaq(actorId, r.id).then(load)} className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">✕</button>
          </div>))}</div>
      )}
    </Section>
  )
}

// ---- 0024: data-health (read-only) ----

export { ExpertsPanel, ArticlesPanel, ResourcesPanel, YojanaPanel, SafaltaPanel, SawaalPanel, PageFaqsPanel }
