import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { Screen, Notice, Spinner } from '../components/ui'
import { Seo } from '../components/layout'
import ListingCard from '../components/ListingCard'
import { LocationControl } from '../components/pages/shared'
import { CatIcon } from '../components/CatIcon'
import { CATEGORY_META, EQUIPMENT_TAGS } from '../lib/listings/catalog'
import { ENABLED_CATEGORIES } from '../lib/listings/registry'
import { loadExtras } from '../lib/listings/extras'
import { fetchNearbyRows, fetchTopViewed } from '../lib/listings/listingsApi'
import { parseTypeParam, splitByType, typeCount, filterPopular } from '../lib/listings/browseSplit'
import { useUserLocation } from '../lib/location/LocationProvider'
import OfflineStamp from '../components/OfflineStamp'
import OfflineNotice from '../components/OfflineNotice'
import { useOfflineInfo } from '../lib/offline/useOffline'
import GuideHelpButton from '../features/guide/GuideHelpButton.jsx'

// Browse nearby active listings. Public — no login needed to look (Batch1 item 3A);
// the phone number stays behind login (reveal flow in ListingCard/ListingDetail).
// All 10 category chips wrap (no hidden horizontal scroll). Location comes from the
// shared LocationControl for logged-out visitors; logged-in users seed from profile.
// Batch 8B — resource behind the listing grid (app offline stamp / notice).
const LISTING_RES = ['listings']

// Batch 13A — a block that opens and closes with an arrow. No animation: closed = hidden. The choice is
// remembered for the session (sessionStorage inside try/catch; the page works with storage blocked).
// Default: phones (< 640 px) use `phoneOpen`, wider screens use `wideOpen`.
const SS_KEY = 'ks_browse_blocks_v1'
function readBlock(id) {
  try { const v = JSON.parse(sessionStorage.getItem(SS_KEY) || '{}')[id]; return v === 1 ? true : v === 0 ? false : null } catch { return null }
}
function saveBlock(id, open) {
  try { const all = JSON.parse(sessionStorage.getItem(SS_KEY) || '{}'); all[id] = open ? 1 : 0; sessionStorage.setItem(SS_KEY, JSON.stringify(all)) } catch { /* blocked: lasts until the page is left */ }
}
function isPhone() {
  try { return window.matchMedia('(max-width: 639px)').matches } catch { return false }
}
function useBlockOpen(id, phoneOpen, wideOpen) {
  const [open, setOpen] = useState(() => readBlock(id) ?? (isPhone() ? phoneOpen : wideOpen))
  const toggle = () => setOpen((o) => { saveBlock(id, !o); return !o })
  return [open, toggle]
}

function BlockHeader({ id, open, onToggle, label, heading, summary, testid, barClass = '' }) {
  const { t } = useLang()
  const bodyId = `blk-${id}`
  return (
    <div className={`flex min-h-[48px] items-center gap-2 ${barClass}`}>
      <button
        type="button"
        data-testid={`${testid}-toggle`}
        aria-expanded={open}
        aria-controls={bodyId}
        aria-label={`${t(open ? 'bt_close_label' : 'bt_open_label')}: ${label}`}
        onClick={onToggle}
        className="flex min-h-[48px] min-w-[48px] items-center justify-center text-lg font-bold"
      >
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      <div className="min-w-0 flex-1">{heading}{!open && summary}</div>
    </div>
  )
}

export default function Browse() {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [searchParams, setSearchParams] = useSearchParams()
  // Deep-link support: /browse?cat=land selects that tab (from the global nav).
  const initialCat = ENABLED_CATEGORIES.includes(searchParams.get('cat'))
    ? searchParams.get('cat')
    : ENABLED_CATEGORIES[0]
  const [category, setCategory] = useState(initialCat)
  // Equipment sub-type deep-link (Phase 5): /browse?cat=equipment&etype=water_tanker.
  const etype = searchParams.get('etype')
  // Batch 10C: the equipment tag lives in the web address (?etag=, same values as the Bazaar link) so a
  // refresh or shared link keeps it. Unknown values are ignored. REPLACE, not push: Back leaves Browse in one step.
  const urlEtag = searchParams.get('etag')
  const equipmentTag = EQUIPMENT_TAGS.some((tag) => tag.value === urlEtag) ? urlEtag : null
  const setEquipmentTag = (value) => setSearchParams((prev) => {
    const next = new URLSearchParams(prev)
    if (value) next.set('etag', value)
    else next.delete('etag')
    return next
  }, { replace: true })
  // Batch 13A: the Offering / Looking for choice lives in the web address too (?type=offer|requirement),
  // replace not push; unknown values are ignored.
  const typeFilter = parseTypeParam(searchParams.get('type'))
  const setTypeFilter = (value) => setSearchParams((prev) => {
    const next = new URLSearchParams(prev)
    if (value) next.set('type', value)
    else next.delete('type')
    return next
  }, { replace: true })
  const [sort, setSort] = useState('nearest')
  const [extras, setExtras] = useState({})
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const listOffline = useOfflineInfo(LISTING_RES)
  const [error, setError] = useState(null)
  const [topViewed, setTopViewed] = useState([])
  // Batch 7L-1 — the search centre is the shared location object (device / saved / typed /
  // picked). A logged-in user's stored profile coordinates arrive as a 'saved' location. With
  // no location the prompt card is shown instead of results — never a default place.
  const { location, center } = useUserLocation()
  const lat = center?.latitude ?? null, lon = center?.longitude ?? null

  // Popular teasers, filtered to the selected category (Batch1 item 3).
  useEffect(() => {
    let alive = true
    fetchTopViewed({ limit: 12, category }).then((v) => alive && setTopViewed(v)).catch(() => {})
    return () => { alive = false }
  }, [category])

  const load = useCallback(async () => {
    if (lat == null || lon == null) { setRows([]); setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const [ex, res] = await Promise.all([
        loadExtras(category),
        fetchNearbyRows({ category, center: { latitude: lat, longitude: lon } }),
      ])
      setExtras(ex)
      setRows(res)
    } catch (err) {
      setError(t(err.i18nKey || 'err_unknown'))
    } finally {
      setLoading(false)
    }
  }, [category, lat, lon, t])

  useEffect(() => {
    load()
  }, [load])

  const chip = (active) =>
    `rounded-full px-3 py-1 text-sm font-semibold border ${
      active ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 bg-white text-stone-700'
    }`
  const catChip = (active) =>
    `flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${
      active ? 'border-[var(--ks-green)] bg-[var(--ks-green)] text-white' : 'border-stone-300 bg-white text-stone-700'
    }`
  // Batch 10A: equipment tag chips — at least 44 px high, long labels wrap, selected = filled + ✓.
  const tagChip = (active) =>
    `flex min-h-[44px] items-center gap-1.5 whitespace-normal rounded-2xl border-2 px-4 py-2 text-left text-base font-semibold leading-snug ${
      active ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 bg-white text-stone-700'
    }`
  // Land shows full-width single-column cards on mobile (more detail); the rest use a
  // responsive grid: 2 (mobile) · 3 (tablet) · 4 (desktop).
  const gridClass = category === 'land' ? 'grid grid-cols-1 gap-2 md:grid-cols-2' : 'grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4'

  // Optional equipment sub-type filter (water tanker): keep only tanker listings.
  const tankerId = (extras.equipmentTypes || []).find((e) => e.name_en === 'Water tanker')?.id ?? null
  const matchesEtype = (l) => etype !== 'water_tanker' ? true : (l.details?.is_tanker === true || l.details?.equipment_type_id === tankerId)
  const matchesEquipmentTag = (l) => !equipmentTag || category !== 'equipment' || (l.details?.equipment_tags || []).includes(equipmentTag)
  const keep = (l) => matchesEtype(l) && matchesEquipmentTag(l)
  const split = useMemo(() => splitByType(rows, sort), [rows, sort])
  const sections = [
    { type: 'offer', label: t('bt_offer'), bar: 'border-green-700 bg-green-50 text-green-900', icon: '🤝' },
    { type: 'requirement', label: t('bt_req'), bar: 'border-sky-700 bg-sky-50 text-sky-900', icon: '🔎' },
  ]
  const counts = { offer: typeCount(split.offer, keep), requirement: typeCount(split.requirement, keep) }
  const popular = filterPopular(topViewed, typeFilter).slice(0, 4)
  const tagLabel = EQUIPMENT_TAGS.find((x) => x.value === equipmentTag)?.[lang]
  const [tagOpen, toggleTag] = useBlockOpen('etag', !!equipmentTag, true)
  const [popOpen, togglePop] = useBlockOpen('popular', false, true)

  return (
    <Screen
      title={t('browse_title')}
      onBack={() => navigate(user ? '/home' : '/')}
      width="wide"
      // Batch 10C: "how do I get the number?" sits in the existing title row, right above the filters,
      // so it adds no height and the results do not move down.
      right={<GuideHelpButton demoId="find" label="guide_browse_find_number" size="sm" testid="help-browse" />}
    >
      {/* Browse + listings are noindex for now (SEO for listings is a later batch). */}
      <Seo noindex path="/browse" />
      {/* Category chips — all 10 wrap into rows (no hidden horizontal scroll). */}
      <div className="mb-3 flex flex-wrap gap-2" data-testid="browse-cats">
        {ENABLED_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            data-testid={`chip-${c}`}
            aria-pressed={category === c}
            className={catChip(category === c)}
            onClick={() => setCategory(c)}
          >
            <CatIcon category={c} /> {CATEGORY_META[c][lang]}
          </button>
        ))}
      </div>

      {/* Batch 10A: equipment tag filter sits right under the category chips (above location, sort and
          results). Large chips that wrap to two lines; "All" first; tapping the selected chip clears it. */}
      {category === 'equipment' && (
        <div className="mb-3" data-testid="equipment-tag-filters">
          <BlockHeader
            id="etag" testid="etag-block" open={tagOpen} onToggle={toggleTag} label={t('field_equipment_tags')}
            heading={<p className="text-sm font-semibold text-stone-600">{t('field_equipment_tags')}</p>}
            summary={equipmentTag && (
              <button type="button" data-testid="etag-summary" onClick={() => setEquipmentTag(null)} className="mt-0.5 min-h-[44px] rounded-full border border-green-700 bg-green-50 px-3 text-sm font-semibold text-green-900">
                {t('bt_tag_prefix')} {tagLabel} ✕
              </button>
            )}
          />
          <div id="blk-etag" hidden={!tagOpen} className="flex flex-wrap gap-2">
            <button type="button" data-testid="etag-chip-all" aria-pressed={equipmentTag === null} className={tagChip(equipmentTag === null)} onClick={() => setEquipmentTag(null)}>
              {equipmentTag === null && <span aria-hidden="true">✓</span>}{t('filter_all')}
            </button>
            {EQUIPMENT_TAGS.map((tag) => {
              const on = equipmentTag === tag.value
              return (
                <button key={tag.value} type="button" data-testid={`etag-chip-${tag.value}`} aria-pressed={on} className={tagChip(on)} onClick={() => setEquipmentTag(on ? null : tag.value)}>
                  {on && <span aria-hidden="true">✓</span>}{tag[lang]}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Location (device / saved / typed / picked) — works without a profile. */}
      <div className="mb-3">
        <LocationControl />
      </div>

      {/* Batch 13A: one 48 px row — All / Offering / Looking for, each with its live count. */}
      <div role="group" aria-label={t('bt_label')} data-testid="browse-type" className="mb-2 grid grid-cols-3 gap-1.5">
        {[[null, t('bt_all'), counts.offer + counts.requirement, 'all'], ['offer', t('bt_offer'), counts.offer, 'offer'], ['requirement', t('bt_req'), counts.requirement, 'requirement']].map(([val, label, n, key]) => (
          <button
            key={key}
            type="button"
            data-testid={`type-${key}`}
            aria-pressed={typeFilter === val}
            onClick={() => setTypeFilter(val)}
            className={`min-h-[48px] rounded-xl border-2 px-1 text-sm font-bold leading-tight ${typeFilter === val ? 'border-green-700 bg-green-700 text-white' : 'border-stone-300 bg-white text-stone-800'}`}
          >
            {label}{location && !loading ? ` (${n})` : ''}
          </button>
        ))}
      </div>

      {/* Applied filters, removable. */}
      {(typeFilter || equipmentTag) && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5" data-testid="applied-chips">
          <span className="text-xs font-semibold text-stone-600">{t('bt_applied')}:</span>
          {typeFilter && (
            <button type="button" data-testid="applied-type" aria-label={`${t('bt_chip_remove')}: ${t(typeFilter === 'offer' ? 'bt_offer' : 'bt_req')}`} onClick={() => setTypeFilter(null)} className="min-h-[44px] rounded-full border border-green-700 bg-green-50 px-3 text-sm font-semibold text-green-900">
              {t(typeFilter === 'offer' ? 'bt_offer' : 'bt_req')} ✕
            </button>
          )}
          {equipmentTag && category === 'equipment' && (
            <button type="button" data-testid="applied-tag" aria-label={`${t('bt_chip_remove')}: ${tagLabel}`} onClick={() => setEquipmentTag(null)} className="min-h-[44px] rounded-full border border-green-700 bg-green-50 px-3 text-sm font-semibold text-green-900">
              {t('bt_tag_prefix')} {tagLabel} ✕
            </button>
          )}
        </div>
      )}

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <button className={chip(sort === 'nearest')} onClick={() => setSort('nearest')}>{t('sort_nearest')}</button>
        <button className={chip(sort === 'newest')} onClick={() => setSort('newest')}>{t('sort_newest')}</button>
      </div>

      {/* Drone Didi → govt-scheme banner (with the scheme badge + learn-more). */}
      {category === 'drone_didi' && (
        <div className="mb-2 flex min-h-[80px] items-center gap-3 rounded-xl bg-gradient-to-r from-sky-700 to-indigo-600 px-3 py-2 text-white">
          <CatIcon category="drone_didi" className="shrink-0 text-4xl" />
          <div className="flex-1">
            <p className="text-sm font-semibold leading-snug">{t('drone_banner_text')}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold">{t('drone_scheme_badge')}</span>
              <button type="button" onClick={() => navigate('/resources')} className="text-[11px] font-bold underline">{t('learn_more')} →</button>
            </div>
          </div>
        </div>
      )}

      {/* Bhusa/Parali → link to the residue-burning article. */}
      {category === 'bhusa' && (
        <button
          type="button"
          onClick={() => navigate('/articles/parali-pollution-kisaan-ki-majboori')}
          className="mb-2 block w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-left text-sm font-semibold text-amber-900"
        >
          📖 {t('read_about_this')} →
        </button>
      )}

      {/* Popular listings — current category only, hidden when empty. */}
      {popular.length > 0 && (
        <section className="mb-3" aria-label={t('popular_listings_heading')} data-testid="popular-section">
          <BlockHeader id="popular" testid="popular" open={popOpen} onToggle={togglePop} label={t('popular_listings_heading')} heading={<h2 className="text-sm font-bold text-stone-900">{t('popular_listings_heading')}</h2>} />
          <div id="blk-popular" hidden={!popOpen} className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {popular.map((l) => (
              <ListingCard key={l.id} listing={l} extras={extras} onClick={() => navigate(`/listing/${l.id}`)} />
            ))}
          </div>
        </section>
      )}

      {error && <Notice tone="error">{error}</Notice>}

      {/* No location → the prompt card above stands in for results (no default place). */}
      {location && <OfflineStamp resources={LISTING_RES} className="mb-2" />}
      {!location ? null : loading ? (
        <Spinner />
      ) : counts.offer + counts.requirement === 0 && listOffline.failed ? (
        <OfflineNotice ageMs={listOffline.tooOld ? listOffline.ageMs : null} />
      ) : (
        <div className="space-y-3" data-testid="browse-sections">
          {sections.filter((x) => !typeFilter || typeFilter === x.type).map((x) => (
            <ResultSection
              key={x.type}
              def={x}
              data={split[x.type]}
              count={counts[x.type]}
              keep={keep}
              single={!!typeFilter}
              gridClass={gridClass}
              extras={extras}
              onOpen={(id) => navigate(`/listing/${id}`)}
            />
          ))}
        </div>
      )}
    </Screen>
  )
}

// One headed result section (Offering or Looking for) with its own count, arrow, empty message and soft
// 30-50 km fallback block (only when that type has none within 30 km — decided by splitByType).
function ResultSection({ def, data, count, keep, single, gridClass, extras, onOpen }) {
  const { t } = useLang()
  const [open, toggle] = useBlockOpen(`sec-${def.type}`, true, true)
  const shown = single || open
  const primary = data.primary.filter(keep)
  const fallback = data.fallback.filter(keep)
  const cards = (list) => (
    <div className={gridClass}>
      {list.map((l) => <ListingCard key={l.id} listing={l} extras={extras} onClick={() => onOpen(l.id)} />)}
    </div>
  )
  const heading = <h2 className="text-base font-bold leading-snug">{def.icon} {def.label} ({count})</h2>
  return (
    <section data-testid={`section-${def.type}`} aria-label={def.label}>
      {single ? (
        <div className={`flex min-h-[48px] items-center rounded-xl border-l-4 px-3 ${def.bar}`}>{heading}</div>
      ) : (
        <BlockHeader id={`sec-${def.type}`} testid={`sec-${def.type}`} open={open} onToggle={toggle} label={def.label} heading={heading} barClass={`rounded-xl border-l-4 pr-3 ${def.bar}`} />
      )}
      <div id={`blk-sec-${def.type}`} hidden={!shown} className="mt-2">
        {count === 0 ? (
          <p data-testid={`section-empty-${def.type}`} className="rounded-xl bg-stone-50 px-3 py-4 text-center text-sm text-stone-600">{t('bt_none')}</p>
        ) : (
          <>
            {primary.length > 0 && cards(primary)}
            {fallback.length > 0 && (
              <div data-testid="fallback-section">
                <div className="my-2 flex items-center gap-2">
                  <span className="h-px flex-1 bg-stone-200" />
                  <span className="text-xs font-semibold text-stone-500">{t('radius_fallback')}</span>
                  <span className="h-px flex-1 bg-stone-200" />
                </div>
                {cards(fallback)}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
