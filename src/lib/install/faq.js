// Batch 17F - the /install page FAQ and its FAQPage JSON-LD. The page shows exactly these answers.
import { installStrings as S } from '../i18n/installStrings.js'

const ORIGIN = 'https://kissansahyog.com'
export const FAQ_KEYS = [['inst_faq1_q', 'inst_faq1_a'], ['inst_faq2_q', 'inst_faq2_a'], ['inst_faq3_q', 'inst_faq3_a']]

export function installFaq(lang = 'hi') {
  return FAQ_KEYS.map(([q, a]) => ({ q: S[q][lang] ?? S[q].hi, a: S[a][lang] ?? S[a].hi }))
}

export function buildInstallJsonLd(lang = 'hi') {
  return [{
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: `${ORIGIN}/install`,
    inLanguage: lang,
    mainEntity: installFaq(lang).map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }]
}
