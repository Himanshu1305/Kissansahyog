import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { Screen, BigButton, Notice, Spinner } from '../components/ui'
import ListingCard from '../components/ListingCard'
import AvailabilityNudge from '../components/AvailabilityNudge'
import { fetchCrops, fetchEquipmentTypes, getMyListings, closeListing, setListingAvailability, retryPendingPhotoDeletions } from '../lib/listings/listingsApi'
import OwnerListingActions, { ownerStatus, Toast } from '../components/listing/OwnerListingActions'

// My Listings: the user's own listings across all categories, incl. closed and
// expired. Active (non-expired) listings get a "Found" button to close them.
// Batch 10G: every listing also gets "अक्षम करें / चालू करें" and a red "हटाएं" (permanent, asks first);
// disabled listings stay here, greyed, with the enable button (none when an admin disabled it).
export default function MyListings() {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [rows, setRows] = useState(null)
  // A delete on the detail page comes back here with a toast message.
  const [toast, setToast] = useState(() => (location.state?.toast ? t(location.state.toast) : null))
  const clearToast = useCallback(() => setToast(null), [])
  const [extras, setExtras] = useState({})
  const [error, setError] = useState(null)
  const [closingId, setClosingId] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [crops, equipmentTypes, listings] = await Promise.all([
        fetchCrops(),
        fetchEquipmentTypes(),
        getMyListings(user.id),
      ])
      setExtras({ crops, equipmentTypes })
      setRows(listings)
    } catch (err) {
      setError(t(err.i18nKey || 'err_unknown'))
    }
  }, [user, t])

  useEffect(() => {
    load()
  }, [load])
  // Batch 10G: photo files of an earlier delete that could not be removed then (offline, tab closed).
  useEffect(() => { if (user?.id) retryPendingPhotoDeletions(user.id) }, [user])

  function ownerChanged(id, kind, row) {
    setError(null)
    if (kind === 'deleted') {
      setRows((prev) => prev.filter((x) => x.id !== id))
      setToast(t('listing_deleted_toast'))
      return
    }
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, status: row?.status ?? x.status } : x)))
    setToast(t(kind === 'disabled' ? 'listing_disabled_toast' : 'listing_enabled_toast'))
    load()
  }

  async function toggleAvailable(l) {
    // One tap, no confirmation dialog (Phase 3b).
    setRows((prev) => prev.map((x) => (x.id === l.id ? { ...x, is_available: !x.is_available } : x)))
    try {
      await setListingAvailability({ actorId: user.id, listingId: l.id, isAvailable: !l.is_available })
    } catch (err) {
      setError(t(err.i18nKey || 'err_unknown'))
      await load() // revert to server truth on failure
    }
  }

  async function markFound(id) {
    if (!window.confirm(t('found_confirm'))) return
    setClosingId(id)
    setError(null)
    try {
      await closeListing({ actorId: user.id, listingId: id })
      await load()
    } catch (err) {
      setError(t(err.i18nKey || 'err_unknown'))
    } finally {
      setClosingId(null)
    }
  }

  function badgeFor(l) {
    // Manual close is distinct from auto-expiry (see PROJECT_CONTEXT.md).
    const st = ownerStatus(l)
    if (st === 'admin_disabled') return <Badge tone="red">{t('badge_admin_disabled')}</Badge>
    if (st === 'disabled') return <Badge tone="stone">{t('badge_disabled')}</Badge>
    if (l.status === 'closed')
      return <Badge tone="green">{t('badge_found')} ✓</Badge>
    if (l.is_expired) return <Badge tone="stone">{t('badge_expired')}</Badge>
    return <Badge tone="blue">{t('badge_active')}</Badge>
  }

  return (
    <Screen title={t('my_listings_title')} onBack={() => navigate('/home')}>
      {error && <Notice tone="error">{error}</Notice>}

      {/* Phase 3d — engagement nudge for listings with recent interest. */}
      {rows && <AvailabilityNudge onChanged={load} />}

      {rows === null ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <p className="py-12 text-center text-stone-500">{t('no_my_listings')}</p>
      ) : (
        <div className="space-y-4">
          {rows.map((l) => (
            <div key={l.id} data-testid="my-listing" data-listing-id={l.id} data-status={ownerStatus(l)}>
              <div className={l.status === 'disabled' ? 'opacity-60 grayscale' : undefined}>
              <ListingCard
                listing={l}
                extras={extras}
                statusBadge={badgeFor(l)}
                onClick={() => navigate(`/listing/${l.id}`)}
              />
              </div>
              {l.status === 'active' && !l.is_expired && (
                <>
                  {/* Phase 3b — one-tap availability toggle (offer listings). */}
                  {l.listing_type === 'offer' && (
                    <div className="mt-1 flex items-center justify-between rounded-xl border-2 border-stone-200 bg-white px-3 py-2">
                      <span className="text-sm font-semibold" style={{ color: l.is_available ? '#15803d' : '#a16207' }}>
                        {l.is_available ? `✅ ${t('avail_available')}` : `🚫 ${t('avail_unavailable')}`}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={l.is_available}
                        data-testid="availability-toggle"
                        data-available={l.is_available ? '1' : '0'}
                        onClick={() => toggleAvailable(l)}
                        className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
                        style={{ background: l.is_available ? '#16a34a' : '#d6d3d1' }}
                      >
                        <span className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all" style={{ left: l.is_available ? '22px' : '2px' }} />
                      </button>
                    </div>
                  )}
                  {l.listing_type === 'offer' && !l.is_available && (
                    <p className="mt-1 text-xs text-amber-700">{t('avail_hidden_note')}</p>
                  )}
                  <div className="mt-1">
                    {closingId === l.id ? (
                      <Spinner />
                    ) : (
                      <BigButton variant="secondary" data-testid="mark-found" data-category={l.category} onClick={() => markFound(l.id)}>
                        ✅ {t('mark_found')}
                      </BigButton>
                    )}
                  </div>
                </>
              )}
              <OwnerListingActions listing={l} actorId={user.id} onChanged={(kind, row) => ownerChanged(l.id, kind, row)} onError={(m) => { setError(m); setToast(m) }} />
            </div>
          ))}
        </div>
      )}
      <Toast message={toast} onDone={clearToast} />
    </Screen>
  )
}

function Badge({ tone, children }) {
  const tones = {
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    stone: 'bg-stone-200 text-stone-600',
    red: 'bg-red-100 text-red-800',
  }
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tones[tone]}`}>{children}</span>
}
