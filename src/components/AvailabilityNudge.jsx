import { useEffect, useState, useCallback } from 'react'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import { getAvailabilityNudges, setListingAvailability } from '../lib/listings/listingsApi'
import { CATEGORY_META } from '../lib/listings/catalog'

// Phase 3d — in-app engagement nudge shown to the OWNER (logged in) on My Listings and the
// homepage. When a listing crosses the click threshold (get_availability_nudges), the owner
// sees a one-tap "still available?" prompt: [हाँ, है] keeps it (and resets the counter),
// [नहीं, छुपाएं] hides it.
//
// WhatsApp-READY BY DESIGN: the trigger (which listings qualify) is the reusable data source
// `getAvailabilityNudges`, and the action is the reusable `setListingAvailability` RPC. When
// the WhatsApp Business API is available, a server job can call the SAME `get_availability_nudges`
// query and send a message with the SAME two actions — no restructuring of this UI needed.
const DISMISS_KEY = 'ks_nudge_dismissed_v1'

function dismissedSet() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(DISMISS_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

export default function AvailabilityNudge({ onChanged }) {
  const { t, lang } = useLang()
  const { user, isLoggedIn } = useAuth()
  const [nudges, setNudges] = useState([])
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    if (!isLoggedIn || !user?.id) return
    const rows = await getAvailabilityNudges(user.id)
    const dismissed = dismissedSet()
    setNudges(rows.filter((r) => !dismissed.has(r.id)))
  }, [isLoggedIn, user])

  useEffect(() => { load() }, [load])

  async function respond(n, isAvailable) {
    setBusyId(n.id)
    try {
      await setListingAvailability({ actorId: user.id, listingId: n.id, isAvailable })
      // Whichever way they answer, this nudge is resolved (counter reset / listing hidden).
      setNudges((prev) => prev.filter((x) => x.id !== n.id))
      onChanged && onChanged()
    } catch {
      /* leave the nudge in place on failure */
    } finally {
      setBusyId(null)
    }
  }

  function dismiss(n) {
    const d = dismissedSet()
    d.add(n.id)
    try { sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...d])) } catch { /* ignore */ }
    setNudges((prev) => prev.filter((x) => x.id !== n.id))
  }

  if (!nudges.length) return null

  return (
    <div className="space-y-2" data-testid="availability-nudge">
      {nudges.map((n) => {
        const cat = CATEGORY_META[n.category]?.[lang] || n.category
        return (
          <div key={n.id} className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-amber-900">{t('nudge_recent_interest').replace('{cat}', cat)}</p>
              <button type="button" aria-label="✕" onClick={() => dismiss(n)} className="shrink-0 px-1 text-amber-700">✕</button>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={busyId === n.id}
                onClick={() => respond(n, true)}
                data-testid="nudge-yes"
                className="flex-1 rounded-lg bg-green-700 px-3 py-2 text-sm font-bold text-white active:bg-green-800 disabled:opacity-50"
              >
                {t('nudge_yes')}
              </button>
              <button
                type="button"
                disabled={busyId === n.id}
                onClick={() => respond(n, false)}
                data-testid="nudge-hide"
                className="flex-1 rounded-lg border-2 border-amber-500 px-3 py-2 text-sm font-bold text-amber-800 active:bg-amber-100 disabled:opacity-50"
              >
                {t('nudge_hide')}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
