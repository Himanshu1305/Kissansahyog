import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useLang } from '../lib/i18n/LanguageProvider'
import AnnouncementCard from './AnnouncementCard'
import { pickCards, readDismissed, writeDismissed } from '../lib/announcements/announcements'

// Batch 14A - home-page announcement cards (replaces the hard-coded Dussehra card). Client-only: fetched after mount
// from get_active_announcements(), so it is never part of the prerendered HTML. A failed fetch shows nothing.
// At most 2 cards by priority; closing a card hides it for the rest of the India day (remembered per card).
export default function AnnouncementCards() {
  const { t } = useLang()
  const [cards, setCards] = useState([])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.__KS_PRERENDER) return undefined
    let live = true
    Promise.resolve(supabase.rpc('get_active_announcements')).then(({ data, error }) => {
      if (!live || error || !Array.isArray(data)) return
      setCards(pickCards(data, new Date(), readDismissed(), 2))
    }).catch(() => {})
    return () => { live = false }
  }, [])

  if (!cards.length) return null
  const close = (id) => { writeDismissed(id); setCards((c) => c.filter((x) => x.id !== id)) }
  return (
    <section data-testid="announcements" role="region" aria-label={t('adm_card_region')} className="ks-section-inner pt-2">
      <div className="flex flex-col gap-2">
        {cards.map((a) => <AnnouncementCard key={a.id} a={a} onClose={() => close(a.id)} />)}
      </div>
    </section>
  )
}
