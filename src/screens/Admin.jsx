import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import NavBar from '../components/NavBar'
import { Field, TextInput, TextArea, Notice, Spinner, BigButton } from '../components/ui'
import { CATEGORY_META } from '../lib/listings/catalog'
import {
  getAdminStats, getAdminListings, getAdminUsers, removeListing,
  adminListExperts, adminSetExpertActive, adminUpsertExpert,
  getAdminArticles, adminUpsertArticle, adminDeleteArticle, slugify,
} from '../lib/admin/adminApi'

// Admin dashboard. Route-gated to authenticated users; a non-admin sees Access
// Denied here (not a 404/crash). All data comes from is_admin-checked RPCs.
export default function Admin() {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const navigate = useNavigate()

  if (!user?.is_admin) {
    return (
      <div className="min-h-screen bg-stone-50">
        <NavBar />
        <main className="mx-auto max-w-md px-5 py-20 text-center">
          <div className="text-5xl">🔒</div>
          <h1 className="mt-4 text-2xl font-bold text-stone-900">{t('access_denied')}</h1>
          <p className="mt-2 text-stone-600">{t('access_denied_body')}</p>
          <button onClick={() => navigate('/home')} className="mt-6 font-bold text-green-800 underline">{t('nav_home')}</button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold text-stone-900">{t('admin_title')}</h1>
        <StatsBar actorId={user.id} t={t} />
        <ListingsPanel actorId={user.id} t={t} lang={lang} />
        <ExpertsPanel actorId={user.id} t={t} />
        <ArticlesPanel actorId={user.id} t={t} lang={lang} />
        <UsersPanel actorId={user.id} t={t} />
      </main>
    </div>
  )
}

function Section({ title, children, right }) {
  return (
    <section className="mb-8 rounded-2xl border-2 border-stone-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-800">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

function StatsBar({ actorId, t }) {
  const [stats, setStats] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => {
    getAdminStats(actorId).then(setStats).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])
  if (err) return <Notice tone="error">{err}</Notice>
  if (!stats) return <Spinner />
  const cards = [
    ['stat_users', stats.users],
    ['stat_active_listings', stats.active_total],
    ['stat_closed', stats.closed],
    ['stat_removed', stats.removed],
    ['stat_experts', stats.experts],
    ['stat_articles', stats.articles_published],
  ]
  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map(([k, v]) => (
        <div key={k} className="rounded-2xl border-2 border-stone-100 bg-white p-4 text-center">
          <div className="text-3xl font-extrabold text-green-800">{v ?? 0}</div>
          <div className="mt-1 text-xs font-semibold text-stone-500">{t(k)}</div>
        </div>
      ))}
    </div>
  )
}

function ListingsPanel({ actorId, t, lang }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const load = useCallback(() => {
    getAdminListings(actorId, 20, 0).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])
  useEffect(() => { load() }, [load])

  async function remove(id) {
    setErr(null)
    try { await removeListing(actorId, id); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) }
  }

  return (
    <Section title={t('admin_recent_listings')}>
      {err && <Notice tone="error">{err}</Notice>}
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
                <th className="py-2 pr-3">{t('col_action')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-stone-100">
                  <td className="py-2 pr-3">{CATEGORY_META[r.category]?.[lang] || r.category}</td>
                  <td className="py-2 pr-3">{t(r.listing_type === 'offer' ? 'home_offer' : 'home_requirement')}</td>
                  <td className="py-2 pr-3">{[r.village_town, r.pincode].filter(Boolean).join(' · ')}</td>
                  <td className="py-2 pr-3">{r.poster_phone || r.poster_email || '—'}</td>
                  <td className="py-2 pr-3">
                    {r.status === 'removed' ? t('status_removed') : r.status === 'closed' ? t('badge_found') : t('badge_active')}
                  </td>
                  <td className="py-2 pr-3">
                    {r.status !== 'removed' && (
                      <button onClick={() => remove(r.id)} className="rounded-lg bg-red-600 px-3 py-1 font-bold text-white active:bg-red-700">
                        {t('action_remove')}
                      </button>
                    )}
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

const EMPTY_ARTICLE = { slug: '', title_hi: '', title_en: '', summary_hi: '', summary_en: '', content_hi: '', content_en: '', author_name: 'Team Kisan Sahyog', is_published: false }

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

function UsersPanel({ actorId, t }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [search, setSearch] = useState('')
  const load = useCallback((q) => {
    getAdminUsers(actorId, { search: q ?? '' }).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])
  useEffect(() => { load('') }, [load])

  return (
    <Section title={t('admin_users')}>
      {err && <Notice tone="error">{err}</Notice>}
      <div className="mb-3 flex gap-2">
        <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('user_search_ph')} />
        <BigButton className="!w-auto !py-2" onClick={() => load(search)}>{t('browse')}</BigButton>
      </div>
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-stone-100 text-stone-500">
                <th className="py-2 pr-3">{t('col_name')}</th>
                <th className="py-2 pr-3">{t('col_contact')}</th>
                <th className="py-2 pr-3">{t('col_village')}</th>
                <th className="py-2 pr-3">{t('col_pincode')}</th>
                <th className="py-2 pr-3">{t('col_listings')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-b border-stone-100">
                  <td className="py-2 pr-3">{u.full_name}</td>
                  <td className="py-2 pr-3">{u.phone || u.email || '—'}</td>
                  <td className="py-2 pr-3">{u.village_town || '—'}</td>
                  <td className="py-2 pr-3">{u.pincode}</td>
                  <td className="py-2 pr-3">{u.listing_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}
