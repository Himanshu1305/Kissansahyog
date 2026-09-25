// Farmer's Info Centre — after the /mausam and /msp split this page keeps events,
// featured schemes and contacts, and links out to the two dedicated pages. Legacy
// hash links are client-redirected: #weather → /mausam, #msp / #mandi → /msp.
import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import NavBar from '../components/NavBar'
import { fetchFeaturedYojana, yojanaName, yojanaBenefit } from '../lib/community/communityApi'
import { fetchUpcomingEvents, eventTitle } from '../lib/events/eventsApi'

export default function Info() {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const location = useLocation()
  const [schemes, setSchemes] = useState([])
  const [events, setEvents] = useState([])

  // Legacy hash links can't be redirected server-side — do it on mount.
  useEffect(() => {
    const h = (location.hash || '').replace('#', '')
    if (h === 'weather') { navigate('/mausam', { replace: true }); return }
    if (h === 'msp' || h === 'mandi') { navigate('/msp', { replace: true }) }
  }, [location.hash, navigate])

  useEffect(() => {
    let alive = true
    fetchFeaturedYojana(3).then((y) => alive && setSchemes(y)).catch(() => alive && setSchemes([]))
    fetchUpcomingEvents(30).then((e) => alive && setEvents(e)).catch(() => alive && setEvents([]))
    return () => { alive = false }
  }, [])

  return (
    <div className="min-h-screen bg-stone-50">
      <NavBar />
      <main className="mx-auto max-w-2xl px-2 py-3">
        <h1 className="mb-3 px-1 text-xl font-bold text-stone-900">{t('info_title')}</h1>

        {/* Link-outs to the two daily pages */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => navigate('/mausam')} className="rounded-xl border border-sky-200 bg-white p-3 text-left active:bg-sky-50">
            <div className="text-[22px]" aria-hidden="true">🌤️</div>
            <div className="mt-1 font-bold text-stone-900">{t('nav_weather')}</div>
            <div className="text-[13px] font-semibold text-sky-700">{t('info_open_mausam')} →</div>
          </button>
          <button type="button" onClick={() => navigate('/msp')} className="rounded-xl border border-green-200 bg-white p-3 text-left active:bg-green-50">
            <div className="text-[22px]" aria-hidden="true">🏷️</div>
            <div className="mt-1 font-bold text-stone-900">{t('nav_mandi')}</div>
            <div className="text-[13px] font-semibold text-green-700">{t('info_open_msp')} →</div>
          </button>
        </div>

        {/* Upcoming KVK / agriculture events */}
        <section id="events" className="mb-3 scroll-mt-16 rounded-xl border border-stone-200 border-l-4 border-l-amber-400 bg-white p-3">
          <h2 className="mb-2 font-bold text-stone-800">📅 {t('events_title')}</h2>
          {events.length === 0 ? (
            <p className="text-sm text-stone-500">{t('events_none')}</p>
          ) : (
            <ul className="space-y-2">
              {events.map((e) => (
                <li key={e.id} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 shrink-0 rounded-md bg-amber-100 px-2 py-0.5 text-[13px] font-bold text-amber-800">{e.event_date}</span>
                  <span>
                    <span className="block font-bold text-stone-800">{eventTitle(e, lang)}</span>
                    <span className="block text-[13px] text-stone-500">{[e.location, e.organizer].filter(Boolean).join(' · ')}{e.contact ? ` · ☎ ${e.contact}` : ''}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Government schemes (featured) */}
        {schemes.length > 0 && (
          <section id="schemes" className="mb-3 scroll-mt-16 rounded-xl border border-stone-200 border-l-4 border-l-emerald-500 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-bold text-stone-800">🏛️ {t('info_yojana_heading')}</h2>
              <button type="button" onClick={() => navigate('/yojana')} className="text-sm font-bold text-green-700">{t('info_yojana_link')} →</button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {schemes.map((s) => (
                <button key={s.id} type="button" onClick={() => navigate(s.slug ? `/yojana/${s.slug}` : '/yojana')} className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-left active:bg-emerald-100">
                  <div className="text-sm font-bold leading-snug text-stone-900">{yojanaName(s, lang)}</div>
                  <div className="mt-1 text-xs font-semibold text-emerald-800">{yojanaBenefit(s, lang)}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Contacts */}
        <section id="contacts" className="scroll-mt-16 rounded-xl border border-stone-200 border-l-4 border-l-amber-400 bg-white p-3">
          <h2 className="mb-2 font-bold text-stone-800">📞 {t('info_contacts_section')}</h2>
          <button type="button" onClick={() => navigate('/resources')} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-bold text-white active:bg-green-800">
            {t('info_contacts_link')}
          </button>
        </section>
      </main>
    </div>
  )
}
