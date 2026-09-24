// Dedicated Drone Didi page — /drone-didi. Public. Hero + scheme explainer (from
// the drone-didi sarkari_yojana row) + live local drone_didi listings + official
// info (no unverified photo → text only) + WhatsApp share.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import { useAuth } from '../lib/auth/AuthProvider'
import NavBar from '../components/NavBar'
import { HomeListingCard, WhatsAppIcon } from '../components/home/kit'
import { getCategory } from '../lib/listings/registry'
import { fetchHomeFeed, fetchCrops } from '../lib/listings/listingsApi'
import { fetchYojanaBySlug, yojanaName, yojanaDesc, yojanaBenefit, yojanaEligibility } from '../lib/community/communityApi'
import { whatsappListingUrl } from '../lib/share/shareMessages'

export default function DroneDidi() {
  const { t, lang } = useLang()
  const { isLoggedIn } = useAuth()
  const navigate = useNavigate()
  const [scheme, setScheme] = useState(null)
  const [listings, setListings] = useState([])
  const [extras, setExtras] = useState({})

  useEffect(() => {
    let alive = true
    fetchYojanaBySlug('drone-didi').then((r) => alive && setScheme(r)).catch(() => {})
    fetchHomeFeed({ category: 'drone_didi', limit: 8 }).then((r) => alive && setListings(r)).catch(() => alive && setListings([]))
    fetchCrops().then((c) => alive && setExtras({ crops: c })).catch(() => {})
    return () => { alive = false }
  }, [])

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const waHref = `https://wa.me/?text=${encodeURIComponent(`${t('dd_title')}\n${shareUrl}`)}`
  const H2 = ({ children }) => <h2 className="mt-6 mb-2 text-[22px] font-bold md:text-[26px]" style={{ color: 'var(--ks-ink)' }}>{children}</h2>

  return (
    <div className="min-h-screen" style={{ background: 'var(--ks-bg)' }}>
      <NavBar />

      {/* 1 — Hero band */}
      <section className="w-full" style={{ padding: 'var(--ks-gutter)' }}>
        <div className="overflow-hidden" style={{ borderRadius: 'var(--ks-radius-lg)', border: '1px solid var(--ks-border)' }}>
          <div className="relative w-full" style={{ height: 240, background: 'var(--ks-green-dark)' }}>
            <img src="/images/home/cat-drone.jpg" alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(23,51,35,.85) 0%, rgba(23,51,35,.35) 100%)' }} />
            <div className="absolute inset-0 flex flex-col justify-center p-4" style={{ maxWidth: 640 }}>
              <h1 className="text-[26px] font-extrabold leading-tight text-white md:text-[34px]">{t('dd_title')}</h1>
              <p className="mt-2 text-[15px] text-white/90 md:text-[17px]">{t('dd_intro')}</p>
            </div>
          </div>
        </div>
      </section>

      <div style={{ padding: '0 var(--ks-gutter)', maxWidth: 900 }}>
        {/* 2 — Scheme explainer (from drone-didi row) */}
        {scheme && (
          <section>
            <H2>{t('dd_scheme_h')}</H2>
            {yojanaDesc(scheme, lang) && <p className="text-[16px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{yojanaDesc(scheme, lang)}</p>}
            {yojanaBenefit(scheme, lang) && (<><h3 className="mt-3 text-[17px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('scheme_benefits')}</h3><p className="text-[16px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{yojanaBenefit(scheme, lang)}</p></>)}
            {yojanaEligibility(scheme, lang) && (<><h3 className="mt-3 text-[17px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('scheme_eligibility_q')}</h3><p className="text-[16px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{yojanaEligibility(scheme, lang)}</p></>)}
            <button type="button" onClick={() => navigate('/yojana/drone-didi')} className="mt-3 rounded-lg px-4 py-2 text-[15px] font-bold" style={{ background: 'var(--ks-green-tint)', color: 'var(--ks-green-dark)' }}>{t('scheme_view')} →</button>
          </section>
        )}

        {/* 3 — Local listings */}
        <H2>{t('dd_local_h')}</H2>
        {listings.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {listings.map((l) => {
              const rows = getCategory(l.category).summarize(l, lang, extras).slice(0, 2)
              const place = [l.village_town || l.district].filter(Boolean).join(' · ')
              return <HomeListingCard key={l.id} image="/images/home/list-drone.jpg" badge={t('cat_drone_label')} badgeTone="offer" title={rows[0]?.value || t('cat_drone_label')} price={rows[1]?.value} place={place} waHref={whatsappListingUrl(l)} tel={null} />
            })}
          </div>
        ) : (
          <p className="text-[15px]" style={{ color: 'var(--ks-ink-3)' }}>{t('dd_no_listings')}</p>
        )}

        {/* 4 — Official info (no verified PIB photo available → text only) */}
        <H2>{t('dd_official_h')}</H2>
        <p className="text-[15px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>
          {lang === 'hi'
            ? 'नमो ड्रोन दीदी भारत सरकार की केंद्रीय योजना है (कृषि एवं किसान कल्याण मंत्रालय)। यहाँ दी गई जानकारी केवल किसानों की सुविधा के लिए है; किसान सहयोग किसी सौदे या समर्थन का हिस्सा नहीं है।'
            : 'Namo Drone Didi is a Central Government scheme (Ministry of Agriculture & Farmers Welfare). The information here is for farmers’ convenience only; Kisan Sahyog is not a party to any deal or endorsement.'}
          {scheme?.source_url && (<> <a href={scheme.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ks-green)', fontWeight: 700 }}>{t('scheme_sources')} ↗</a></>)}
        </p>

        {/* 5 — WhatsApp share */}
        <a href={waHref} target="_blank" rel="noopener noreferrer" className="my-6 inline-flex items-center gap-2 rounded-lg px-4 py-3 text-[16px] font-bold text-white" style={{ background: 'var(--ks-whatsapp)' }}>
          <WhatsAppIcon size={20} /> {t('scheme_share')}
        </a>
      </div>
    </div>
  )
}
