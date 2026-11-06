// Batch 19 - SEO helpers for the Pashupalan pages. Pure functions: tested without a browser.
// The FAQPage JSON-LD is built from the SAME faq data the page shows, so text is identical.
const ORIGIN = 'https://kissansahyog.com'

export function faqList(page, lang) {
  return (page.faqs || []).map((f) => ({ q: f.q[lang] ?? f.q.hi, a: f.a[lang] ?? f.a.hi }))
}

export function buildPashuJsonLd(page, lang = 'hi') {
  const url = ORIGIN + page.path
  const ld = [{
    '@context': 'https://schema.org',
    '@type': page.slug === 'hub' ? 'WebPage' : 'Article',
    headline: page.h1[lang] ?? page.h1.hi,
    description: page.seo.description[lang] ?? page.seo.description.hi,
    url,
    mainEntityOfPage: url,
    inLanguage: lang === 'en' ? 'en-IN' : 'hi-IN',
    dateModified: page.asOf,
    author: { '@type': 'Organization', name: 'Team Kissan Sahyog' },
    publisher: { '@type': 'Organization', name: 'Kissan Sahyog', url: ORIGIN },
  }]
  const faq = faqList(page, lang)
  if (faq.length) {
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      url,
      inLanguage: lang === 'en' ? 'en-IN' : 'hi-IN',
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    })
  }
  return ld
}
