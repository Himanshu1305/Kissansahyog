#!/usr/bin/env node
// Batch 17F - writes docs/review/batch17f/HINDI_STRINGS.md from the real strings, so the table cannot drift.
import fs from 'node:fs'
import { installStrings as S } from '../../src/lib/i18n/installStrings.js'
import { strings } from '../../src/lib/i18n/strings.js'

const where = (k) => {
  if (k.startsWith('inst_page_') || k.startsWith('inst_sec_') || k.startsWith('inst_faq') || k === 'inst_icon_note') return '/install page'
  if (k.startsWith('inst_block_')) return 'homepage install block (QR on 768 px+, buttons on phones)'
  if (k.startsWith('inst_done_')) return 'success sheet (after the browser says the app is installed)'
  if (k.startsWith('inst_welcome_')) return 'one-time welcome (first launch from the icon)'
  if (k === 'inst_later') return '"later" sheet (person closed the browser\'s install box)'
  if (k.startsWith('inst_a')) return 'install sheet and /install page: Android steps'
  if (k.startsWith('inst_i')) return 'install sheet and /install page: iPhone steps'
  if (k.startsWith('inst_x')) return 'install sheet and /install page: inside Facebook / Instagram'
  if (k.startsWith('inst_d_') || k === 'inst_qr_alt') return 'install sheet / QR (computer)'
  if (k.startsWith('inst_u_')) return 'install sheet: browser that cannot install'
  if (k === 'inst_nav') return 'footer link'
  return 'install sheet (all kinds)'
}
const esc = (t) => String(t).replace(/\|/g, '\\|').replace(/\n/g, ' ')
const rows = [
  ['pwa_banner_text', strings.pwa_banner_text, 'homepage strip (CHANGED: was "किसान सहयोग को फ़ोन की होम स्क्रीन पर जोड़ें")'],
  ['pwa_banner_install', strings.pwa_banner_install, 'homepage strip button (CHANGED: was "इंस्टॉल करें")'],
  ...Object.entries(S).map(([k, v]) => [k, v, where(k)]),
]
const out = [
  '# Batch 17F - Hindi strings (key, Hindi, English, where shown)',
  '',
  'Generated from `src/lib/i18n/installStrings.js` and `strings.js` by `scripts/batch17f/make-hindi-table.mjs`. Farmer-simple Hindi; the founder should read the Hindi once.',
  'Removed (no longer used): `pwa_ios_help`, `pwa_install_help` (the one vague help line; replaced by the step-by-step sheet). Unchanged: `pwa_banner_dismiss`, and the returning-visitor bar strings `pwa_install_prompt`, `pwa_install`, `pwa_later`.',
  '',
  '| Key | Hindi | English | Where shown |',
  '|---|---|---|---|',
  ...rows.map(([k, v, w]) => `| \`${k}\` | ${esc(v.hi)} | ${esc(v.en)} | ${w} |`),
  '',
  `${rows.length} strings.`,
  '',
].join('\n')
fs.writeFileSync('docs/review/batch17f/HINDI_STRINGS.md', out)
console.log(`${rows.length} strings written`)
