import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import NavBar from '../components/NavBar'
import { Notice, Spinner, Select } from '../components/ui'
import { PageExplainer, LocationControl, ShareWhatsApp } from '../components/pages/shared'
import { initialLocation, DEFAULT_COORDS } from '../lib/location/locationStore'
import { fetchPincode } from '../lib/listings/listingsApi'
import { fetchMelas, getMyMelaInterests, setMelaInterest, resolveActiveMela, MELA_TAGS } from '../lib/mela/melaApi'
import { filterMelas, sortByDistance, statesIn, melaDateLabel, isExpectedDate, melaDistanceKm } from '../lib/mela/melaFormat'
import { stateLabel } from '../content/states.js'
import { generateMelaMessage } from '../lib/share/shareMessages'
import { MONTHS_FULL_HI, MONTHS_FULL_EN } from '../content/months'

// Public Kisan Mela calendar — no login to browse. Self-sourced, honest ("अपेक्षित" dates
// clearly marked), state + month filters, distance-sorted from the viewer's location.
export default function KisanMela() {
  const { t, lang } = useLang()
  const { user, isLoggedIn } = useAuth()
  const navigate = useNavigate()

  const [loc, setLoc] = useState(() => initialLocation(user?.pincode))
  const [center, setCenter] = useState(DEFAULT_COORDS)
  const [melas, setMelas] = useState(null)
  const [error, setError] = useState(null)
  const [stateFilter, setStateFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [interested, setInterested] = useState(new Set())
  const [highlightId, setHighlightId] = useState(null)
  const months = lang === 'hi' ? MONTHS_FULL_HI : MONTHS_FULL_EN

  useEffect(() => {
    fetchMelas().then(setMelas).catch((e) => { setError(t(e.i18nKey || 'err_unknown')); setMelas([]) })
  }, [t])

  // Shared-link redirect (3e): /kisan-mela?mela=<id> may point at a row that was merged away. Resolve
  // it to the active survivor, then scroll to + highlight that card — never a "not found" page.
  useEffect(() => {
    if (!melas || !melas.length) return
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    const want = params.get('mela')
    if (!want) return
    let alive = true
    ;(async () => {
      const target = (await resolveActiveMela(want).catch(() => null)) || want
      if (!alive) return
      setHighlightId(target)
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-mela-id="${target}"]`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    })()
    return () => { alive = false }
  }, [melas])

  useEffect(() => {
    if (isLoggedIn && user?.id) getMyMelaInterests(user.id).then((ids) => setInterested(new Set(ids))).catch(() => {})
  }, [isLoggedIn, user])

  // Distance center: the viewer's real coords (nationwide) → matched-village pincode → default.
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (loc?.rawCoords?.latitude != null) { if (alive) setCenter({ latitude: loc.rawCoords.latitude, longitude: loc.rawCoords.longitude }); return }
      if (loc?.matchedVillage?.pincode) {
        const p = await fetchPincode(loc.matchedVillage.pincode).catch(() => null)
        if (alive && p?.latitude != null) { setCenter({ latitude: Number(p.latitude), longitude: Number(p.longitude) }); return }
      }
      if (alive) setCenter(DEFAULT_COORDS)
    })()
    return () => { alive = false }
  }, [loc])

  const states = useMemo(() => statesIn(melas || []), [melas])
  const shown = useMemo(
    () => sortByDistance(filterMelas(melas || [], { state: stateFilter, month: monthFilter }), center),
    [melas, stateFilter, monthFilter, center],
  )

  async function toggleInterest(mela) {
    if (!isLoggedIn || !user?.id) { navigate('/login'); return }
    const now = new Set(interested)
    const on = !now.has(mela.id)
    on ? now.add(mela.id) : now.delete(mela.id)
    setInterested(now)
    try { await setMelaInterest(user.id, mela.id, on) } catch { /* revert on failure */ setInterested(interested) }
  }

  const tagLabel = (tag) => t(`mela_tag_${tag}`)

  return (
    <div className="min-h-screen" style={{ background: 'var(--ks-bg)' }}>
      <NavBar />
      <main className="mx-auto w-full max-w-4xl px-[14px] py-5 md:px-6">
        <h1 className="mb-1 text-[26px] font-extrabold md:text-[30px]" style={{ color: 'var(--ks-ink)' }}>{t('mela_title')}</h1>
        <p className="mb-3 text-[15px]" style={{ color: 'var(--ks-ink-3)' }}>{t('mela_subtitle')}</p>

        <PageExplainer title={t('page_explainer_title')} lines={[t('mela_explain_1'), t('mela_explain_2'), t('mela_explain_3')]} />

        <div className="my-3"><LocationControl value={loc} onChange={setLoc} showOutOfArea={false} /></div>

        {/* Filters + submit CTA */}
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <label className="flex flex-col text-xs font-semibold" style={{ color: 'var(--ks-ink-3)' }}>
            {t('mela_filter_state')}
            <Select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="mt-1 min-w-[150px]" data-testid="mela-state-filter">
              <option value="">{t('mela_filter_all_states')}</option>
              {states.map((s) => <option key={s} value={s}>{stateLabel(s, lang)}</option>)}
            </Select>
          </label>
          <label className="flex flex-col text-xs font-semibold" style={{ color: 'var(--ks-ink-3)' }}>
            {t('mela_filter_month')}
            <Select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="mt-1 min-w-[130px]" data-testid="mela-month-filter">
              <option value="">{t('mela_filter_all_months')}</option>
              {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </Select>
          </label>
          <button
            type="button"
            onClick={() => navigate('/kisan-mela/submit')}
            data-testid="mela-submit-cta"
            className="ml-auto rounded-lg px-4 py-2.5 text-[15px] font-bold text-white"
            style={{ background: 'var(--ks-primary)' }}
          >
            ➕ {t('mela_submit_cta')}
          </button>
        </div>

        {error && <Notice tone="error">{error}</Notice>}

        {melas === null ? (
          <Spinner />
        ) : shown.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed p-6 text-center" style={{ borderColor: 'var(--ks-border-strong)' }} data-testid="mela-empty">
            <p className="text-[15px]" style={{ color: 'var(--ks-ink-2)' }}>{t('mela_none')}</p>
            <button type="button" onClick={() => navigate('/kisan-mela/submit')} className="mt-3 rounded-lg px-4 py-2 text-[15px] font-bold text-white" style={{ background: 'var(--ks-primary)' }}>
              ➕ {t('mela_submit_cta')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {shown.map((m) => {
              const dateLabel = melaDateLabel(m, lang, { expectedLabel: t('mela_expected_prefix'), tbdLabel: t('mela_none') })
              const expected = isExpectedDate(m)
              const dist = melaDistanceKm(center, m)
              const nm = lang === 'hi' ? m.name_hi : (m.name_en || m.name_hi)
              const highlights = lang === 'hi' ? m.highlights_hi : (m.highlights_en || m.highlights_hi)
              const place = [m.venue, m.district, m.state].filter(Boolean).join(', ')
              const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/kisan-mela?mela=${m.id}`
              // Corroboration: all real http(s) sources across source_urls[] + the legacy source_url, deduped.
              // >=2 distinct → "found via multiple sources"; exactly 1 → shown plainly. Never worded as "verified accurate".
              const allSources = [...new Set([...(Array.isArray(m.source_urls) ? m.source_urls : []), m.source_url].filter((u) => /^https?:\/\//i.test(u || '')))]
              const multiSource = allSources.length >= 2
              const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u } }
              const disclaimerSource = multiSource ? t('mela_sources_multiple') : (allSources[0] ? hostOf(allSources[0]) : t('mela_source'))
              return (
                <div key={m.id} data-mela-id={m.id} data-testid="mela-card" className="flex flex-col rounded-xl border bg-white p-4" style={{ borderColor: highlightId === m.id ? 'var(--ks-primary)' : 'var(--ks-border)', boxShadow: highlightId === m.id ? '0 0 0 2px var(--ks-primary)' : undefined }}>
                  <div className="mb-1 flex flex-wrap items-center gap-1">
                    {(m.category_tags || []).map((tag) => (
                      <span key={tag} className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: 'var(--ks-primary-muted)', color: 'var(--ks-primary)' }}>{tagLabel(tag)}</span>
                    ))}
                    {dist != null && <span className="ml-auto text-xs font-semibold" style={{ color: 'var(--ks-ink-3)' }}>{Math.round(dist)} {t('unit_km')}</span>}
                  </div>
                  <h2 className="text-[17px] font-bold leading-snug" style={{ color: 'var(--ks-ink)' }}>{nm}</h2>
                  <p
                    data-testid={expected ? 'mela-date-expected' : 'mela-date-confirmed'}
                    className="mt-1 inline-block w-fit rounded px-2 py-0.5 text-[13px] font-bold"
                    style={expected
                      ? { background: 'var(--ks-saffron-tint)', color: 'var(--ks-orange-dark)', border: '1px solid var(--ks-orange)' }
                      : { background: 'var(--ks-primary-muted)', color: 'var(--ks-primary)' }}
                  >
                    📅 {dateLabel}
                  </p>
                  <p className="mt-1.5 text-[14px]" style={{ color: 'var(--ks-ink-2)' }}>📍 {place}</p>
                  {m.organizer_name && <p className="mt-0.5 text-[13px]" style={{ color: 'var(--ks-ink-3)' }}>{t('mela_organizer')}: {m.organizer_name}</p>}
                  {highlights && <p className="mt-1.5 text-[14px]" style={{ color: 'var(--ks-ink-2)' }}>{highlights}</p>}
                  {m.contact_number && (
                    <p className="mt-1.5 text-[13px]" style={{ color: 'var(--ks-ink-2)' }}>
                      {t('mela_contact')}: {m.contact_name ? `${m.contact_name} · ` : ''}
                      <a href={`tel:${m.contact_number}`} className="font-semibold underline" style={{ color: 'var(--ks-primary)' }}>{m.contact_number}</a>
                    </p>
                  )}
                  <div className="mt-2 flex flex-col gap-1 text-[12px]" style={{ color: 'var(--ks-ink-3)' }}>
                    {multiSource && (
                      <span data-testid="mela-multi-source" className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: 'var(--ks-primary-muted)', color: 'var(--ks-primary)' }}>✓ {t('mela_multi_source')}</span>
                    )}
                    {allSources.length > 0 && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {allSources.map((u, i) => (
                          <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="font-semibold underline" style={{ color: 'var(--ks-primary)' }}>{t('mela_source')}{allSources.length > 1 ? ` ${i + 1}` : ''} ↗</a>
                        ))}
                        {m.last_checked_date && <span>{t('mela_last_checked')}: {m.last_checked_date}</span>}
                      </div>
                    )}
                    {/* Universal verify-yourself disclaimer — on EVERY card, not buried (Phase 6b). */}
                    <p data-testid="mela-disclaimer" className="mt-0.5 text-[11px] leading-snug" style={{ color: 'var(--ks-ink-3)' }}>
                      {t('mela_disclaimer_lead')} {disclaimerSource} {t('mela_disclaimer_tail')}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-2 border-t pt-3" style={{ borderColor: 'var(--ks-border)' }}>
                    <button
                      type="button"
                      onClick={() => toggleInterest(m)}
                      data-testid="mela-interest-btn"
                      aria-pressed={interested.has(m.id)}
                      className="rounded-lg border px-3 py-2 text-[14px] font-bold"
                      style={interested.has(m.id)
                        ? { background: 'var(--ks-primary)', color: '#fff', borderColor: 'var(--ks-primary)' }
                        : { background: '#fff', color: 'var(--ks-primary)', borderColor: 'var(--ks-primary)' }}
                    >
                      {interested.has(m.id) ? `★ ${t('mela_interested_done')}` : `☆ ${t('mela_interested')}`}
                    </button>
                    <ShareWhatsApp text={generateMelaMessage(m, dateLabel, shareUrl, lang)} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
