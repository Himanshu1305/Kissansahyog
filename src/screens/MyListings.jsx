import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { Screen, BigButton, Notice, Spinner } from '../components/ui'
import LanguageToggle from '../components/LanguageToggle'
import ListingCard from '../components/ListingCard'
import { fetchCrops, fetchEquipmentTypes, getMyListings, closeListing } from '../lib/listings/listingsApi'

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
    <Screen title={t('my_listings_title')} onBack={() => navigate('/home')} right={<LanguageToggle />}>
      {error && <Notice tone="error">{error}</Notice>}

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
                <div className="mt-1">
                  {closingId === l.id ? (
                    <Spinner />
                  ) : (
                    <BigButton variant="secondary" data-testid="mark-found" data-category={l.category} onClick={() => markFound(l.id)}>
                      ✅ {t('mark_found')}
                    </BigButton>
                  )}
                </div>
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
