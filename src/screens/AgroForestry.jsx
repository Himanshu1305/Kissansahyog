// Agro Forestry & Horticulture hub — /agro-forestry. Public, no login.
// Sections (Phase 2d): PageExplainer → hero → "आपके क्षेत्र में" (South Sagar FDA) →
// government schemes (2 cards) → article link → WhatsApp share → FAQ (FAQPage JSON-LD).
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../lib/i18n/LanguageProvider'
import NavBar from '../components/NavBar'
import { PageExplainer, FaqAccordion, ShareWhatsApp } from '../components/pages/shared'
import { fetchYojanaBySlug, yojanaName, yojanaBenefit, yojanaDesc } from '../lib/community/communityApi'

const SCHEME_SLUGS = ['fal-podharopan-yojana', 'aushadhi-sugandhit-fasal-vistar']
const ARTICLE_SLUG = 'intercropping-madhya-pradesh'

// FAQ sourced strictly from the two seeded schemes' verified facts (2b).
const FAQS = [
  {
    q_hi: 'एग्रो फॉरेस्ट्री क्या है?',
    q_en: 'What is agroforestry?',
    a_hi: 'खेत में पेड़ों को फसलों के साथ लगाना एग्रो फॉरेस्ट्री कहलाता है। इससे लकड़ी, चारा, फल और छाया मिलती है, मिट्टी सुरक्षित रहती है और आय बढ़ती है।',
    a_en: 'Growing trees together with crops on a field is called agroforestry. It gives timber, fodder, fruit and shade, protects the soil, and raises income.',
  },
  {
    q_hi: 'फल पौधरोपण योजना में कितना अनुदान मिलता है?',
    q_en: 'How much subsidy does Fal Podharopan Yojana give?',
    a_hi: 'फल के पौधे लगाने की लागत पर 40 से 50 प्रतिशत तक अनुदान, जो तीन वर्षों में 60:20:20 के अनुपात में मिलता है (0.25 से 4 हेक्टेयर क्षेत्र के लिए)।',
    a_en: 'A 40–50% subsidy on the cost of planting fruit saplings, paid over three years in a 60:20:20 ratio (for 0.25 to 4 hectares).',
  },
  {
    q_hi: 'औषधीय और सुगंधित फसलों पर कौन सी योजना है?',
    q_en: 'Which scheme covers medicinal and aromatic crops?',
    a_hi: '“औषधि एवं सुगंधित फसल क्षेत्र विस्तार” योजना में आँवला, अश्वगंधा, सफेद मूसली, तुलसी जैसी फसलों के विस्तार पर 20 से 50 प्रतिशत तक अनुदान मिलता है।',
    a_en: 'The “Aushadhi Avam Sugandhit Fasal Shetra Vistar” scheme gives a 20–50% subsidy to expand crops such as Amla, Ashwagandha, Safed Musli and Tulsi.',
  },
  {
    q_hi: 'इन योजनाओं के लिए आवेदन कहां करें?',
    q_en: 'Where do I apply for these schemes?',
    a_hi: 'मध्यप्रदेश उद्यानिकी एवं खाद्य प्रसंस्करण विभाग के किसान पोर्टल पर ऑनलाइन आवेदन करें। सटीक प्रक्रिया व तिथियों के लिए विभागीय पोर्टल और योजना पेज देखें।',
    a_en: 'Apply online on the MP Horticulture & Food Processing Department farmer portal. Check the department portal and the scheme page for the exact process and dates.',
  },
  {
    q_hi: 'क्या इंटरक्रॉपिंग मध्यप्रदेश के लिए उपयुक्त है?',
    q_en: 'Is intercropping suitable for Madhya Pradesh?',
    a_hi: 'हाँ। सोयाबीन + अरहर जैसे संयोजन मध्यप्रदेश में परखे गए हैं और अकेली फसल की तुलना में अधिक कुल उपज व आय देते हैं। विस्तार से लेख पढ़ें।',
    a_en: 'Yes. Combinations like soybean + pigeonpea are well tested in Madhya Pradesh and give higher total yield and income than the sole crop. Read the article for details.',
  },
]

export default function AgroForestry() {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const [schemes, setSchemes] = useState([])

  useEffect(() => {
    let alive = true
    Promise.all(SCHEME_SLUGS.map((s) => fetchYojanaBySlug(s).catch(() => null)))
      .then((rows) => alive && setSchemes(rows.filter(Boolean)))
    return () => { alive = false }
  }, [])

  const shareText = `${t('agro_share_text')} ${typeof window !== 'undefined' ? window.location.href : ''}`

  return (
    <div className="min-h-screen" style={{ background: 'var(--ks-bg)' }}>
      <NavBar />
      <div className="w-full space-y-5" style={{ padding: '16px var(--ks-gutter)', maxWidth: 1000 }}>
        <h1 className="text-[28px] font-extrabold leading-tight md:text-[34px]" style={{ color: 'var(--ks-ink)' }}>{t('agro_title')}</h1>

        {/* 1 — Page explainer */}
        <PageExplainer title={t('agro_explain_title')} lines={[t('agro_explain_1'), t('agro_explain_2')]} />

        {/* 2 — Hero band */}
        <section className="overflow-hidden" style={{ borderRadius: 'var(--ks-radius-lg)', border: '1px solid var(--ks-border)', background: 'var(--ks-card)' }}>
          <img
            src="/images/agroforestry/agroforestry-turmeric.jpg"
            alt={t('agro_hero_h')}
            loading="lazy"
            className="h-52 w-full object-cover sm:h-64"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <div style={{ padding: '14px' }}>
            <h2 className="text-[20px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('agro_hero_h')}</h2>
            <p className="mt-1 text-[15px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{t('agro_hero_body')}</p>
          </div>
        </section>

        {/* 3 — Your area (South Sagar FDA) */}
        <section style={{ background: 'var(--ks-bg-soft)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius-lg)', padding: '14px' }}>
          <h2 className="text-[20px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('agro_region_h')}</h2>
          <p className="mt-1 text-[15px] leading-relaxed" style={{ color: 'var(--ks-ink-2)' }}>{t('agro_region_body')}</p>
        </section>

        {/* 4 — Government schemes */}
        <section>
          <h2 className="mb-3 text-[22px] font-bold md:text-[24px]" style={{ color: 'var(--ks-ink)' }}>{t('agro_schemes_h')}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {schemes.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => navigate(`/yojana/${r.slug}`)}
                className="flex flex-col text-left"
                style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius)', padding: '14px' }}
              >
                <span className="w-fit rounded-full px-2 py-0.5 text-[12px] font-bold" style={{ background: 'var(--ks-green-tint)', color: 'var(--ks-green-dark)' }}>{t('ycat_horticulture')}</span>
                <span className="mt-1.5 text-[17px] font-bold leading-snug" style={{ color: 'var(--ks-ink)' }}>{yojanaName(r, lang)}</span>
                <span className="mt-1 line-clamp-3 text-[14px] leading-snug" style={{ color: 'var(--ks-ink-2)' }}>{yojanaBenefit(r, lang) || yojanaDesc(r, lang)}</span>
                <span className="mt-2 text-[14px] font-bold" style={{ color: 'var(--ks-green)' }}>{t('scheme_view')} →</span>
              </button>
            ))}
          </div>
        </section>

        {/* 5 — Full article link */}
        <section style={{ background: 'var(--ks-card)', border: '1px solid var(--ks-border)', borderRadius: 'var(--ks-radius-lg)', padding: '14px' }}>
          <h2 className="text-[20px] font-bold" style={{ color: 'var(--ks-ink)' }}>{t('agro_article_h')}</h2>
          <button
            type="button"
            onClick={() => navigate(`/articles/${ARTICLE_SLUG}`)}
            data-testid="agro-article-link"
            className="mt-2 inline-block text-left text-[16px] font-bold"
            style={{ color: 'var(--ks-green)' }}
          >
            📖 {t('agro_article_cta')} →
          </button>
        </section>

        {/* 6 — WhatsApp share */}
        <ShareWhatsApp text={shareText} />

        {/* 7 — FAQ + FAQPage JSON-LD */}
        <FaqAccordion faqs={FAQS} />
      </div>
    </div>
  )
}
