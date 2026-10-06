import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { Screen, BigButton, Notice, Spinner } from '../components/ui'
import ListingCard from '../components/ListingCard'
import AvailabilityNudge from '../components/AvailabilityNudge'
import { fetchCrops, fetchEquipmentTypes, getMyListings, closeListing, setListingAvailability } from '../lib/listings/listingsApi'

// My Listings: the user's own listings across all categories, incl. closed and
// expired. Active (non-expired) listings get a "Found" button to close them.
export default function MyListings() {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [rows, setRows] = useState(null)
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
            <div key={l.id}>
              <ListingCard
                listing={l}
                extras={extras}
                statusBadge={badgeFor(l)}
                onClick={() => navigate(`/listing/${l.id}`)}
              />
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
            </div>
          ))}
        </div>
      )}
    </Screen>
  )
}

function Badge({ tone, children }) {
  const tones = {
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    stone: 'bg-stone-200 text-stone-600',
  }
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tones[tone]}`}>{children}</span>
}
