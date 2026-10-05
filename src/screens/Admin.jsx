import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import NavBar from '../components/NavBar'
import { Field, TextInput, TextArea, Select, Notice, Spinner, BigButton } from '../components/ui'
import { CATEGORY_META } from '../lib/listings/catalog'
import {
  getAdminStats, getAdminListings, getAdminUsers, removeListing,
  adminListExperts, adminSetExpertActive, adminUpsertExpert,
  getAdminArticles, adminUpsertArticle, adminDeleteArticle, slugify,
  getAdminResources, adminSetResourceActive, adminUpsertResource,
  getAdminSourceStats, getAdminVendorListings,
  getAdminMsp, adminSetMspActive, adminUpsertMsp,
  getAdminSawaal, adminAnswerSawaal, adminSetSawaalFeatured, adminSetSawaalPublished, adminDeleteSawaal,
  getAdminSafalta, adminUpsertSafalta, adminSetSafaltaPublished, adminSetSafaltaFeatured, adminDeleteSafalta,
  getAdminYojana, adminSetYojanaActive, adminSetYojanaFeatured, adminUpsertYojana,
  getAdminSubscriptions, adminSetSubscriptionActive,
  getAdminProcurement, adminUpsertProcurement, adminDeleteProcurement,
  getAdminPageFaqs, adminUpsertPageFaq, adminDeletePageFaq,
  getAdminDataHealth, adminSetSiteSetting,
  getAdminAvailability, getAdminAvailabilityListings, getAdminFarmerProfiles,
  getAdminMelas, adminSetMelaStatus, adminSetMelaActive, adminDeleteMela, adminUpsertMela,
  getAdminMelaCandidates, adminPublishCandidate,
  getRecentMelaMerges, adminSplitMela,
  getListingReports, resolveListingReport,
} from '../lib/admin/adminApi'
import { MELA_TAGS } from '../lib/mela/melaApi'
import { getAdminInputPrices, adminSetInputPriceActive, adminUpsertInputPrice } from '../lib/inputs/inputsApi'
import { fetchSiteSetting } from '../lib/pages/pagesApi'
import { sawaalQuestion } from '../lib/community/communityApi'
import { CATEGORIES } from '../lib/listings/catalog'

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
        <AvailabilityPanel actorId={user.id} t={t} lang={lang} />
        <FarmerProfilesPanel actorId={user.id} t={t} />
        <VendorReportPanel actorId={user.id} t={t} lang={lang} />
        <ListingsPanel actorId={user.id} t={t} lang={lang} />
        <ExpertsPanel actorId={user.id} t={t} />
        <ArticlesPanel actorId={user.id} t={t} lang={lang} />
        <ResourcesPanel actorId={user.id} t={t} lang={lang} />
        <MspPanel actorId={user.id} t={t} lang={lang} />
        <InputPricesPanel actorId={user.id} t={t} lang={lang} />
        <MelaPanel actorId={user.id} t={t} lang={lang} />
        <MelaCandidatesPanel actorId={user.id} t={t} lang={lang} />
        <MelaMergesPanel actorId={user.id} t={t} lang={lang} />
        <SawaalPanel actorId={user.id} t={t} lang={lang} />
        <SafaltaPanel actorId={user.id} t={t} lang={lang} />
        <YojanaPanel actorId={user.id} t={t} lang={lang} />
        <ReportsPanel actorId={user.id} t={t} />
        <SubscriptionsPanel actorId={user.id} t={t} />
        <ProcurementPanel actorId={user.id} t={t} />
        <PageFaqsPanel actorId={user.id} t={t} />
        <DataHealthPanel actorId={user.id} t={t} />
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

// Best-effort short "key detail" for a vendor row from its details JSONB.
function vendorKeyDetail(d = {}) {
  return d.business_name || d.operator_name || d.item_name || d.warehouse_type || d.residue_type || d.crop_type || d.item_name || '—'
}

// Phase 4 — resource/booking dashboard: per-category availability counts + a
// category-filterable table of every active listing's availability status.
function AvailabilityPanel({ actorId, t, lang }) {
  const [counts, setCounts] = useState(null)
  const [rows, setRows] = useState(null)
  const [cat, setCat] = useState('all')
  const [err, setErr] = useState(null)

  useEffect(() => {
    getAdminAvailability(actorId).then(setCounts).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])
  useEffect(() => {
    setRows(null)
    getAdminAvailabilityListings(actorId, cat === 'all' ? null : cat).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, cat, t])

  return (
    <Section title={`📊 ${t('admin_availability_title')}`}>
      <p id="availability" className="scroll-mt-16" />
      {err && <Notice tone="error">{err}</Notice>}
      {!counts ? <Spinner /> : (
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {counts.map((c) => (
            <div key={c.category} className="rounded-xl border-2 border-stone-100 bg-stone-50 p-3">
              <div className="font-bold text-stone-800">{CATEGORY_META[c.category]?.[lang] || c.category}</div>
              <div className="mt-1 text-sm text-stone-600">
                {t('avail_col_total')}: <span className="font-bold text-stone-900">{c.total}</span>
                <span className="mx-1.5 text-stone-300">·</span>
                <span className="font-bold text-green-700">{c.available}</span> {t('avail_available')}
                <span className="mx-1.5 text-stone-300">·</span>
                <span className="font-bold text-amber-700">{c.unavailable}</span> {t('avail_unavailable')}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <Field label={t('col_category')} htmlFor="av_cat">
          <Select id="av_cat" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="all">{t('vendor_filter_all_cat')}</option>
            {CATEGORIES.map((c) => (<option key={c} value={c}>{CATEGORY_META[c][lang]}</option>))}
          </Select>
        </Field>
      </div>
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-stone-100 text-stone-500">
                <th className="py-2 pr-3">{t('col_category')}</th>
                <th className="py-2 pr-3">{t('col_type')}</th>
                <th className="py-2 pr-3">{t('avail_col_village')}</th>
                <th className="py-2 pr-3">{t('avail_col_clicks')}</th>
                <th className="py-2 pr-3">{t('avail_col_status')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-stone-100">
                  <td className="py-2 pr-3">{CATEGORY_META[r.category]?.[lang] || r.category}</td>
                  <td className="py-2 pr-3">{r.listing_type === 'offer' ? t('home_offer') : t('home_requirement')}</td>
                  <td className="py-2 pr-3">{r.village_name || '—'}</td>
                  <td className="py-2 pr-3">{r.contact_click_count}</td>
                  <td className="py-2 pr-3">
                    {r.is_available
                      ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">{t('avail_available')}</span>
                      : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">{t('avail_unavailable')}</span>}
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

// Phase 6 — sortable/filterable admin table of किसान profiles (campaign planning).
// A separate section from the availability panel, per the prompt.
function FarmerProfilesPanel({ actorId, t }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [q, setQ] = useState('')
  const [interest, setInterest] = useState('all') // all | lease | equipment
  const [sort, setSort] = useState({ key: 'created_at', dir: 'desc' })

  useEffect(() => {
    getAdminFarmerProfiles(actorId).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  }

  const filtered = (rows || [])
    .filter((r) => {
      if (q && !String(r.village_town || '').toLowerCase().includes(q.toLowerCase())) return false
      if (interest === 'lease' && !r.interest_lease) return false
      if (interest === 'equipment' && !r.interest_equipment) return false
      return true
    })
    .sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      const av = a[sort.key], bv = b[sort.key]
      if (sort.key === 'land_acres') return ((Number(av) || 0) - (Number(bv) || 0)) * dir
      return String(av || '').localeCompare(String(bv || '')) * dir
    })

  const arrow = (key) => (sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '')
  const Th = ({ k, children }) => (
    <th className="cursor-pointer py-2 pr-3 select-none" onClick={() => toggleSort(k)}>{children}{arrow(k)}</th>
  )

  return (
    <Section title={`👨‍🌾 ${t('admin_farmers_title')}`}>
      <p id="farmers" className="scroll-mt-16" />
      {err && <Notice tone="error">{err}</Notice>}
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <Field label={t('farmer_col_village')} htmlFor="fp_q"><TextInput id="fp_q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('farmer_search_ph')} /></Field>
        <Field label={t('farmer_filter_all')} htmlFor="fp_int">
          <Select id="fp_int" value={interest} onChange={(e) => setInterest(e.target.value)}>
            <option value="all">{t('farmer_filter_all')}</option>
            <option value="lease">{t('farmer_filter_lease')}</option>
            <option value="equipment">{t('farmer_filter_equipment')}</option>
          </Select>
        </Field>
      </div>
      {!rows ? <Spinner /> : (
        <>
          <p className="mb-2 text-sm font-semibold text-stone-700">{t('farmer_count')}: <span className="text-green-800">{filtered.length}</span></p>
          {filtered.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-stone-100 text-stone-500">
                    <Th k="full_name">{t('farmer_col_name')}</Th>
                    <Th k="village_town">{t('farmer_col_village')}</Th>
                    <Th k="land_acres">{t('farmer_col_land')}</Th>
                    <th className="py-2 pr-3">{t('farmer_col_crops')}</th>
                    <th className="py-2 pr-3">{t('farmer_col_lease')}</th>
                    <th className="py-2 pr-3">{t('farmer_col_equipment')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-stone-100">
                      <td className="py-2 pr-3">{r.full_name || '—'}</td>
                      <td className="py-2 pr-3">{r.village_town || '—'}</td>
                      <td className="py-2 pr-3">{r.land_acres != null ? r.land_acres : '—'}</td>
                      <td className="py-2 pr-3">{r.main_crops || '—'}</td>
                      <td className="py-2 pr-3">{r.interest_lease ? '✅' : '—'}</td>
                      <td className="py-2 pr-3">{r.interest_equipment ? '✅' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Section>
  )
}

function VendorReportPanel({ actorId, t, lang }) {
  const [stats, setStats] = useState(null)
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [cat, setCat] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    getAdminSourceStats(actorId).then(setStats).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
    getAdminVendorListings(actorId).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])

  const filtered = (rows || []).filter((r) => {
    if (cat !== 'all' && r.category !== cat) return false
    const d = r.created_at ? r.created_at.slice(0, 10) : ''
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  })

  function exportCsv() {
    const head = ['Category', 'Type', 'Detail', 'Vendor', 'Phone', 'Email', 'Pincode', 'Village', 'Created', 'Status']
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = [head.join(',')]
    for (const r of filtered) {
      lines.push([r.category, r.listing_type, vendorKeyDetail(r.details), r.poster_name, r.poster_phone, r.poster_email, r.pincode, r.village_town, r.created_at?.slice(0, 10), r.status].map(esc).join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'vendor-listings.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Section title={t('admin_vendor_report')}>
      {err && <Notice tone="error">{err}</Notice>}
      {stats && (
        <p className="mb-3 text-sm font-semibold text-stone-700">
          {t('stat_farmer_listings')}: <span className="text-green-800">{stats.farmer_total}</span>
          <span className="mx-2 text-stone-300">|</span>
          {t('stat_vendor_listings')}: <span className="text-amber-700">{stats.vendor_total}</span>
        </p>
      )}
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <Field label={t('col_category')} htmlFor="vr_cat">
          <Select id="vr_cat" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="all">{t('vendor_filter_all_cat')}</option>
            {CATEGORIES.map((c) => (<option key={c} value={c}>{CATEGORY_META[c][lang]}</option>))}
          </Select>
        </Field>
        <Field label={t('vendor_from')} htmlFor="vr_from"><TextInput id="vr_from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label={t('vendor_to')} htmlFor="vr_to"><TextInput id="vr_to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        <button onClick={exportCsv} className="mb-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white">⬇ {t('vendor_export_csv')}</button>
      </div>
      {!rows ? <Spinner /> : filtered.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-stone-100 text-stone-500">
                <th className="py-2 pr-3">{t('col_category')}</th>
                <th className="py-2 pr-3">{t('col_detail')}</th>
                <th className="py-2 pr-3">{t('col_vendor')}</th>
                <th className="py-2 pr-3">{t('col_contact')}</th>
                <th className="py-2 pr-3">{t('col_location')}</th>
                <th className="py-2 pr-3">{t('col_status')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-stone-100">
                  <td className="py-2 pr-3">{CATEGORY_META[r.category]?.[lang] || r.category}</td>
                  <td className="py-2 pr-3">{vendorKeyDetail(r.details)}</td>
                  <td className="py-2 pr-3">{r.poster_name}</td>
                  <td className="py-2 pr-3">{r.poster_phone || r.poster_email || '—'}</td>
                  <td className="py-2 pr-3">{[r.village_town, r.pincode].filter(Boolean).join(' · ')}</td>
                  <td className="py-2 pr-3">{r.status === 'removed' ? t('status_removed') : r.status === 'closed' ? t('badge_found') : t('badge_active')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
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

function MspPanel({ actorId, t, lang }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [editing, setEditing] = useState(null)
  const load = useCallback(() => {
    getAdminMsp(actorId).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])
  useEffect(() => { load() }, [load])

  async function toggle(m) {
    try { await adminSetMspActive(actorId, m.id, !m.is_active); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) }
  }
  async function save(form) {
    setErr(null)
    try { await adminUpsertMsp(actorId, form); setEditing(null); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) }
  }
  const seasonLabel = (s) => t(s === 'kharif' ? 'tab_kharif' : s === 'rabi' ? 'tab_rabi' : 'season_commercial')

  return (
    <Section
      title={t('admin_msp')}
      right={<button onClick={() => setEditing({ ...EMPTY_MSP })} className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-bold text-white">+ {t('msp_add')}</button>}
    >
      {err && <Notice tone="error">{err}</Notice>}
      {editing && <MspForm t={t} initial={editing} onCancel={() => setEditing(null)} onSave={save} seasonLabel={seasonLabel} />}
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-stone-100 text-stone-500">
                <th className="py-2 pr-3">{t('msp_col_crop')}</th>
                <th className="py-2 pr-3">{t('f_season')}</th>
                <th className="py-2 pr-3">{t('f_marketing_year')}</th>
                <th className="py-2 pr-3">{t('msp_col_price')}</th>
                <th className="py-2 pr-3">{t('col_status')}</th>
                <th className="py-2 pr-3">{t('col_action')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b border-stone-100">
                  <td className="py-2 pr-3">{(lang === 'hi' ? m.crop_hi : m.crop_en)}{m.variety ? ` (${m.variety})` : ''}</td>
                  <td className="py-2 pr-3">{seasonLabel(m.season)}</td>
                  <td className="py-2 pr-3">{m.marketing_year}</td>
                  <td className="py-2 pr-3">₹{Number(m.msp_per_quintal).toLocaleString('en-IN')}</td>
                  <td className="py-2 pr-3">{m.is_active ? t('expert_active') : t('expert_inactive')}</td>
                  <td className="py-2 pr-3">
                    <button onClick={() => toggle(m)} className="mr-1 rounded-lg border-2 border-stone-300 px-2 py-1 text-xs font-bold text-stone-700">{m.is_active ? t('expert_make_inactive') : t('expert_make_active')}</button>
                    <button onClick={() => setEditing(m)} className="rounded-lg border-2 border-green-700 px-2 py-1 text-xs font-bold text-green-800">{t('action_edit')}</button>
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

function MspForm({ t, initial, onCancel, onSave, seasonLabel }) {
  const [f, setF] = useState(initial)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  return (
    <div className="mb-4 rounded-xl border-2 border-green-200 bg-green-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('f_crop_en')} htmlFor="msp_ce"><TextInput id="msp_ce" value={f.crop_en} onChange={set('crop_en')} /></Field>
        <Field label={t('f_crop_hi')} htmlFor="msp_ch"><TextInput id="msp_ch" value={f.crop_hi} onChange={set('crop_hi')} /></Field>
        <Field label={t('f_variety')} htmlFor="msp_v"><TextInput id="msp_v" value={f.variety || ''} onChange={set('variety')} /></Field>
        <Field label={t('f_season')} htmlFor="msp_s">
          <Select id="msp_s" value={f.season} onChange={set('season')}>
            <option value="kharif">{seasonLabel('kharif')}</option>
            <option value="rabi">{seasonLabel('rabi')}</option>
            <option value="commercial">{seasonLabel('commercial')}</option>
          </Select>
        </Field>
        <Field label={t('f_marketing_year')} htmlFor="msp_y"><TextInput id="msp_y" value={f.marketing_year} onChange={set('marketing_year')} /></Field>
        <Field label={t('f_msp_price')} htmlFor="msp_p"><TextInput id="msp_p" type="number" value={f.msp_per_quintal} onChange={set('msp_per_quintal')} /></Field>
        <Field label={t('f_increase')} htmlFor="msp_i"><TextInput id="msp_i" type="number" value={f.increase_from_previous ?? ''} onChange={set('increase_from_previous')} /></Field>
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

// --- Phase 6: input price tracker management ------------------------------
const EMPTY_INPUT = { item_hi: '', item_en: '', shop_name: '', location: 'Khurai', price: '', unit: '', is_active: true }

function InputPricesPanel({ actorId, t, lang }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [editing, setEditing] = useState(null)
  const load = useCallback(() => {
    getAdminInputPrices(actorId).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown')))
  }, [actorId, t])
  useEffect(() => { load() }, [load])

  async function toggle(m) {
    try { await adminSetInputPriceActive(actorId, m.id, !m.is_active); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) }
  }
  async function save(form) {
    setErr(null)
    try { await adminUpsertInputPrice(actorId, form); setEditing(null); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) }
  }

  return (
    <Section
      title={t('admin_inputs_h')}
      right={<button onClick={() => setEditing({ ...EMPTY_INPUT })} className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-bold text-white">+ {t('msp_add')}</button>}
    >
      {err && <Notice tone="error">{err}</Notice>}
      {editing && <InputPriceForm t={t} initial={editing} onCancel={() => setEditing(null)} onSave={save} />}
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-stone-100 text-stone-500">
                <th className="py-2 pr-3">{t('inputs_col_item')}</th>
                <th className="py-2 pr-3">{t('inputs_col_shop')}</th>
                <th className="py-2 pr-3">{t('inputs_col_price')}</th>
                <th className="py-2 pr-3">{t('col_status')}</th>
                <th className="py-2 pr-3">{t('col_action')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b border-stone-100">
                  <td className="py-2 pr-3">{(lang === 'en' && m.item_en) ? m.item_en : m.item_hi}</td>
                  <td className="py-2 pr-3">{m.shop_name}{m.location ? ` · ${m.location}` : ''}</td>
                  <td className="py-2 pr-3">₹{Number(m.price).toLocaleString('en-IN')}/{m.unit}</td>
                  <td className="py-2 pr-3">{m.is_active ? t('expert_active') : t('expert_inactive')}</td>
                  <td className="py-2 pr-3">
                    <button onClick={() => toggle(m)} className="mr-1 rounded-lg border-2 border-stone-300 px-2 py-1 text-xs font-bold text-stone-700">{m.is_active ? t('expert_make_inactive') : t('expert_make_active')}</button>
                    <button onClick={() => setEditing(m)} className="rounded-lg border-2 border-green-700 px-2 py-1 text-xs font-bold text-green-800">{t('action_edit')}</button>
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

function InputPriceForm({ t, initial, onCancel, onSave }) {
  const [f, setF] = useState(initial)
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  return (
    <div className="mb-4 rounded-xl border-2 border-green-200 bg-green-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`${t('inputs_col_item')} (${t('label_suffix_hi')})`} htmlFor="ip_hi"><TextInput id="ip_hi" value={f.item_hi} onChange={set('item_hi')} /></Field>
        <Field label={`${t('inputs_col_item')} (EN)`} htmlFor="ip_en"><TextInput id="ip_en" value={f.item_en || ''} onChange={set('item_en')} /></Field>
        <Field label={t('inputs_col_shop')} htmlFor="ip_shop"><TextInput id="ip_shop" value={f.shop_name} onChange={set('shop_name')} /></Field>
        <Field label={t('loc_current')} htmlFor="ip_loc"><TextInput id="ip_loc" value={f.location || ''} onChange={set('location')} /></Field>
        <Field label={t('inputs_col_price')} htmlFor="ip_price"><TextInput id="ip_price" type="number" value={f.price} onChange={set('price')} /></Field>
        <Field label="unit" htmlFor="ip_unit"><TextInput id="ip_unit" value={f.unit} onChange={set('unit')} /></Field>
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

// --- Community: Kisan Sawaal (Q&A) management -----------------------------
// --- Kisan Mela moderation (pending submissions first) + management -------
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

// ---- Phase 4: complaints queue (age vs 24h/7-day targets; remove / dismiss) ----
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
  // Age in hours; flag overdue against the 24h acknowledgement / 7-day resolution targets.
  const ageHours = (iso) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3.6e6))

  return (
    <Section title={t('admin_reports')}>
      {err && <Notice tone="error">{err}</Notice>}
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_reports_empty')}</p> : (
        <div className="space-y-3">
          {rows.map((r) => {
            const h = ageHours(r.created_at)
            const overdue = h > 168 // 7 days
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
                <div className="mt-2 flex gap-2">
                  {r.listing_id && (
                    <button type="button" onClick={() => act(r.id, 'removed')} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-bold text-white">{t('admin_report_action_remove')}</button>
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

// ---- 0024: alert subscriptions (list, CSV, deactivate) ----
function SubscriptionsPanel({ actorId, t }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const load = useCallback(() => { getAdminSubscriptions(actorId).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown'))) }, [actorId, t])
  useEffect(() => { load() }, [load])
  function exportCsv() {
    const head = ['phone', 'pincode', 'crops', 'alert_types', 'source_page', 'consented_at', 'is_active']
    const lines = [head.join(',')].concat((rows || []).map((r) => head.map((k) => `"${String(Array.isArray(r[k]) ? r[k].join('|') : (r[k] ?? '')).replace(/"/g, '""')}"`).join(',')))
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'subscriptions.csv'; a.click()
  }
  return (
    <Section title={t('admin_subscriptions')} right={<button onClick={exportCsv} className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-bold text-white">CSV</button>}>
      {err && <Notice tone="error">{err}</Notice>}
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-left text-stone-500"><th className="p-1">phone</th><th className="p-1">pincode</th><th className="p-1">crops</th><th className="p-1">page</th><th className="p-1"> </th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className="border-t border-stone-100">
              <td className="p-1 font-semibold">{r.phone}</td><td className="p-1">{r.pincode}</td>
              <td className="p-1 text-stone-500">{(r.crops || []).join(', ')}</td><td className="p-1">{r.source_page}</td>
              <td className="p-1"><button onClick={() => adminSetSubscriptionActive(actorId, r.id, !r.is_active).then(load)} className="rounded border px-2 py-0.5 text-xs font-bold">{r.is_active ? t('expert_make_inactive') : t('expert_make_active')}</button></td>
            </tr>))}</tbody>
        </table></div>
      )}
    </Section>
  )
}

// ---- 0024: procurement centres CRUD ----
const EMPTY_PROC = { name_hi: '', location: '', district: 'Sagar', crops: [], season: 'rabi', portal_url: '', notes_hi: '', registration_open: '', is_active: true }
function ProcurementPanel({ actorId, t }) {
  const [rows, setRows] = useState(null); const [err, setErr] = useState(null); const [editing, setEditing] = useState(null)
  const load = useCallback(() => { getAdminProcurement(actorId).then(setRows).catch((e) => setErr(t(e.i18nKey || 'err_unknown'))) }, [actorId, t])
  useEffect(() => { load() }, [load])
  async function save(f) { setErr(null); try { await adminUpsertProcurement(actorId, { ...f, crops: typeof f.crops === 'string' ? f.crops.split(',').map((s) => s.trim()).filter(Boolean) : f.crops }); setEditing(null); load() } catch (e) { setErr(t(e.i18nKey || 'err_unknown')) } }
  return (
    <Section title={t('admin_procurement')} right={<button onClick={() => setEditing({ ...EMPTY_PROC })} className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-bold text-white">+</button>}>
      {err && <Notice tone="error">{err}</Notice>}
      {editing && (
        <div className="mb-3 rounded-xl border-2 border-green-200 bg-green-50 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="name_hi" htmlFor="pc_n"><TextInput id="pc_n" value={editing.name_hi} onChange={(e) => setEditing((s) => ({ ...s, name_hi: e.target.value }))} /></Field>
            <Field label="location" htmlFor="pc_l"><TextInput id="pc_l" value={editing.location} onChange={(e) => setEditing((s) => ({ ...s, location: e.target.value }))} /></Field>
            <Field label="crops (comma)" htmlFor="pc_c"><TextInput id="pc_c" value={Array.isArray(editing.crops) ? editing.crops.join(', ') : editing.crops} onChange={(e) => setEditing((s) => ({ ...s, crops: e.target.value }))} /></Field>
            <Field label="season" htmlFor="pc_s"><Select id="pc_s" value={editing.season} onChange={(e) => setEditing((s) => ({ ...s, season: e.target.value }))}><option value="rabi">rabi</option><option value="kharif">kharif</option></Select></Field>
            <Field label="portal_url" htmlFor="pc_u"><TextInput id="pc_u" value={editing.portal_url} onChange={(e) => setEditing((s) => ({ ...s, portal_url: e.target.value }))} /></Field>
            <Field label="registration_open" htmlFor="pc_r"><TextInput id="pc_r" type="date" value={editing.registration_open || ''} onChange={(e) => setEditing((s) => ({ ...s, registration_open: e.target.value }))} /></Field>
          </div>
          <Field label="notes_hi" htmlFor="pc_no"><TextArea id="pc_no" value={editing.notes_hi} onChange={(e) => setEditing((s) => ({ ...s, notes_hi: e.target.value }))} /></Field>
          <div className="mt-2 flex gap-2"><button onClick={() => save(editing)} className="rounded-lg bg-green-700 px-4 py-2 font-bold text-white">{t('save')}</button><button onClick={() => setEditing(null)} className="rounded-lg bg-stone-200 px-4 py-2 font-bold">{t('cancel')}</button></div>
        </div>
      )}
      {!rows ? <Spinner /> : rows.length === 0 ? <p className="text-stone-500">{t('admin_none')}</p> : (
        <div className="space-y-2">{rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-100 p-2">
            <div className="min-w-0 flex-1"><div className="font-bold text-stone-900">{r.name_hi}</div><div className="text-xs text-stone-500">{(r.crops || []).join(', ')} · {r.season}</div></div>
            <button onClick={() => setEditing(r)} className="rounded border-2 border-green-700 px-2 py-0.5 text-xs font-bold text-green-800">{t('action_edit')}</button>
            <button onClick={() => adminDeleteProcurement(actorId, r.id).then(load)} className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">✕</button>
          </div>))}</div>
      )}
    </Section>
  )
}

// ---- 0024: page FAQs CRUD ----
const EMPTY_FAQ = { page_key: 'mausam', q_hi: '', q_en: '', a_hi: '', a_en: '', sort_order: 0 }
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
function DataHealthPanel({ actorId, t }) {
  const [data, setData] = useState(null); const [err, setErr] = useState(null)
  useEffect(() => { getAdminDataHealth(actorId).then(setData).catch((e) => setErr(t(e.i18nKey || 'err_unknown'))) }, [actorId, t])
  return (
    <Section title={t('admin_data_health')}>
      {err && <Notice tone="error">{err}</Notice>}
      {!data ? <Spinner /> : (
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div><div className="mb-1 font-bold text-stone-700">mandi (last date · rows)</div>
            {(data.mandi || []).map((m) => <div key={m.commodity_en} className="flex justify-between border-t border-stone-100 py-0.5"><span>{m.commodity_en}</span><span className="text-stone-500">{m.last_date} · {m.rows}</span></div>)}</div>
          <div><div className="mb-1 font-bold text-stone-700">weather cells (fetched_at)</div>
            {(data.weather || []).map((w) => <div key={w.grid_key} className="flex justify-between border-t border-stone-100 py-0.5"><span>{w.grid_key}</span><span className="text-stone-500">{String(w.fetched_at).slice(0, 16).replace('T', ' ')}</span></div>)}</div>
        </div>
      )}
    </Section>
  )
}
