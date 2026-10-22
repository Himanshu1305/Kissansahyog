import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { PageShell } from '../components/layout'
import { TextInput, Spinner } from '../components/ui'
import { adminWhoami, LOG_FAILED_EVENT } from '../lib/admin/adminApi'
import { envBadge } from '../lib/admin/consoleRules'
import { strings } from '../lib/i18n/strings'
import { TABS, DEFAULT_TAB, validTab, searchPanels } from './admin/registry'
import { AdminCtx, AdminError } from './admin/common'

// Batch 14A - the admin console shell. The 24 panels that used to be stacked on one page now live in six tabs,
// each loaded only when opened (its panels fetch their data only then). A search box finds PANELS and jumps to them.
// Route-gated to authenticated users; a non-admin sees Access Denied here. All data comes from is_admin-checked RPCs.
const TAB_VIEWS = {
  overview: lazy(() => import('./admin/tabs/OverviewTab')),
  content: lazy(() => import('./admin/tabs/ContentTab')),
  mandi: lazy(() => import('./admin/tabs/MandiTab')),
  moderation: lazy(() => import('./admin/tabs/ModerationTab')),
  people: lazy(() => import('./admin/tabs/PeopleTab')),
  security: lazy(() => import('./admin/tabs/SecurityTab')),
}
// Hindi and English names of a panel, so a search typed in either language finds it.
const panelNames = (p) => { const s = strings[p.label]; return s ? `${s.hi} ${s.en}` : '' }
const LAST_TAB_KEY = 'ks_admin_tab_v1'
const readLastTab = () => { try { const v = sessionStorage.getItem(LAST_TAB_KEY); return validTab(v) ? v : null } catch { return null } }
const writeLastTab = (v) => { try { sessionStorage.setItem(LAST_TAB_KEY, v) } catch { /* storage blocked: the tab is just not remembered */ } }

export default function Admin() {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [who, setWho] = useState({ known: false, role: 'editor', isSuper: false })
  const [whoErr, setWhoErr] = useState(null)
  const [logWarn, setLogWarn] = useState(false)
  const [query, setQuery] = useState('')
  const pending = useRef(null)

  const wanted = params.get('tab')
  const tab = validTab(wanted) ? wanted : (readLastTab() || DEFAULT_TAB)
  useEffect(() => { writeLastTab(tab) }, [tab])

  useEffect(() => {
    if (!user?.is_admin) return undefined
    let live = true
    adminWhoami(user.id).then((r) => { if (live) setWho({ known: true, role: r.role, isSuper: !!r.is_super }) }).catch((e) => { if (live) setWhoErr(e) })
    return () => { live = false }
  }, [user?.id, user?.is_admin])
  useEffect(() => {
    const on = () => setLogWarn(true)
    window.addEventListener(LOG_FAILED_EVENT, on)
    return () => window.removeEventListener(LOG_FAILED_EVENT, on)
  }, [])

  const results = useMemo(() => searchPanels(query, panelNames), [query])
  const env = envBadge(import.meta.env.VITE_SUPABASE_URL)

  // After a search hit opens a tab, wait for the lazy tab to render the panel, then open it and scroll to it.
  useEffect(() => {
    const key = pending.current
    if (!key) return undefined
    let tries = 0
    const timer = setInterval(() => {
      const el = document.getElementById(`adm-${key}`)
      tries += 1
      if (el) { el.open = true; el.scrollIntoView?.({ block: 'start' }); pending.current = null; clearInterval(timer) } else if (tries > 60) clearInterval(timer)
    }, 50)
    return () => clearInterval(timer)
  }, [tab, query])

  if (!user?.is_admin) {
    return (
      <PageShell width="content">
        {/* ks-allow-width: access-denied notice stays narrow/centred, not a full-width page */}
        <div className="py-20 text-center">
          <div className="text-5xl">🔒</div>
          <h1 className="mt-4 text-2xl font-bold text-stone-900">{t('access_denied')}</h1>
          <p className="mt-2 text-stone-600">{t('access_denied_body')}</p>
          <button onClick={() => navigate('/home')} className="mt-6 font-bold text-green-800 underline">{t('nav_home')}</button>
        </div>
      </PageShell>
    )
  }

  const go = (id) => { writeLastTab(id); setParams({ tab: id }, { replace: false }) }
  const choose = (p) => { pending.current = p.key; setQuery(''); go(p.tab) }
  const onKey = (e, i) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]
    go(next.id)
    document.getElementById(`admin-tab-${next.id}`)?.focus()
  }
  const View = TAB_VIEWS[tab]

  return (
    <PageShell width="wide">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-stone-900">{t('admin_title')}</h1>
        <span data-testid="env-badge" data-env={env} className={`rounded-full px-3 py-1 text-xs font-extrabold ${env === 'PRODUCTION' ? 'bg-red-700 text-white' : env === 'STAGING' ? 'bg-amber-300 text-stone-900' : 'bg-stone-300 text-stone-900'}`}>{env}</span>
        {who.known && <span data-testid="role-badge" className="rounded-full bg-stone-200 px-3 py-1 text-xs font-bold text-stone-800">{who.role}</span>}
      </div>
      {whoErr && <AdminError error={whoErr} t={t} />}
      {logWarn && <p data-testid="log-warning" className="mb-3 rounded-xl bg-amber-50 p-2 text-sm font-semibold text-amber-900">{t('adm_log_warn')}</p>}

      <div className="relative mb-3">
        <TextInput data-testid="panel-search" type="search" aria-label={t('adm_search_ph')} placeholder={t('adm_search_ph')} value={query} onChange={(e) => setQuery(e.target.value)} />
        {query.trim() && (
          <ul data-testid="panel-search-results" className="mt-1 rounded-xl border-2 border-stone-200 bg-white">
            {results.length === 0 ? <li className="p-3 text-stone-500">{t('adm_search_none')}</li> : results.map((p) => (
              <li key={p.key}>
                <button type="button" data-testid="panel-search-hit" data-panel={p.key} onClick={() => choose(p)} className="flex min-h-[48px] w-full items-center justify-between gap-2 px-3 text-left font-semibold hover:bg-stone-100">
                  <span>{t(p.label)}</span><span className="text-xs text-stone-500">{t(TABS.find((x) => x.id === p.tab).label)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div role="tablist" aria-label={t('admin_title')} className="mb-4 flex gap-1 overflow-x-auto border-b-2 border-stone-200">
        {TABS.map((x, i) => (
          <button key={x.id} id={`admin-tab-${x.id}`} role="tab" type="button" data-testid={`admin-tab-${x.id}`} aria-selected={tab === x.id} aria-controls="admin-tabpanel"
            tabIndex={tab === x.id ? 0 : -1} onClick={() => go(x.id)} onKeyDown={(e) => onKey(e, i)}
            className={`min-h-[48px] shrink-0 whitespace-nowrap rounded-t-xl px-4 text-base font-bold ${tab === x.id ? 'bg-green-700 text-white' : 'bg-stone-100 text-stone-800'}`}>
            {t(x.label)}
          </button>
        ))}
      </div>

      <AdminCtx.Provider value={who}>
        <div id="admin-tabpanel" role="tabpanel" aria-labelledby={`admin-tab-${tab}`} data-testid="admin-tabpanel" data-tab={tab}>
          <Suspense fallback={<Spinner />}>
            <View key={tab} actorId={user.id} t={t} lang={lang} />
          </Suspense>
        </div>
      </AdminCtx.Provider>
    </PageShell>
  )
}
