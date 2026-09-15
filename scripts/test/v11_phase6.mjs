#!/usr/bin/env node
// v1.1 Phase 6 — bilingual audit of every v1.1 addition.
//   node scripts/test/v11_phase6.mjs   (no DB needed)
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { strings } from '../../src/lib/i18n/strings.js'
import { disclaimers } from '../../src/lib/i18n/disclaimers.js'
import { privacyPolicy, termsOfUse } from '../../src/lib/i18n/legal.js'
import * as catalog from '../../src/lib/listings/catalog.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..', '..')
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }
const bi = (o) => o && typeof o.hi === 'string' && o.hi.trim() && typeof o.en === 'string' && o.en.trim()

// 1. Every string in the table is bilingual (hi + en both non-empty).
const badStrings = Object.entries(strings).filter(([, v]) => !bi(v)).map(([k]) => k)
check('every strings.js entry has non-empty hi + en', badStrings.length === 0, badStrings.join(', '))

// 2. Every disclaimer is bilingual, including the new Bhusa environmental note.
const badDisc = Object.entries(disclaimers).filter(([, v]) => !bi(v)).map(([k]) => k)
check('every disclaimer has hi + en', badDisc.length === 0, badDisc.join(', '))
check('Bhusa environmental disclaimer wired through i18n (not hardcoded)',
  bi(disclaimers.bhusa) && /पराली/.test(disclaimers.bhusa.hi) && /environment/i.test(disclaimers.bhusa.en))

// 2b. Legal pages (Privacy/Terms) content is bilingual, Hindi first.
check('privacy policy points all bilingual', privacyPolicy.length >= 3 && privacyPolicy.every(bi))
check('terms of use points all bilingual', termsOfUse.length >= 4 && termsOfUse.every(bi))

// 3. Catalog: category meta + every option list is bilingual.
const badCat = Object.entries(catalog.CATEGORY_META).filter(([, v]) => !bi(v)).map(([k]) => k)
check('CATEGORY_META bilingual (incl. bhusa, agri_inputs)', badCat.length === 0, badCat.join(', '))
const OPTION_LISTS = [
  'PRICE_TYPE', 'SIZE_RANGE', 'ARRANGEMENT', 'WATER_SOURCE', 'SEASON', 'RENTAL_BASIS',
  'WORK_TYPE', 'RATE_BASIS', 'RESIDUE_TYPE', 'PICKUP_ARRANGEMENT', 'BUYER_TYPE_PREFERENCE',
  'AGRI_SUBTYPE', 'INPUT_TYPE', 'INPUT_CONDITION',
]
for (const name of OPTION_LISTS) {
  const list = catalog[name]
  const ok = Array.isArray(list) && list.length > 0 && list.every((o) => bi(o) && o.value)
  check(`catalog.${name} options bilingual`, ok, ok ? '' : 'missing hi/en')
}

// 4. Required v1.1 keys exist (and are therefore bilingual by check #1).
const REQUIRED_KEYS = [
  'radius_fallback', 'asset_pincode_hint', 'err_asset_pincode_required',
  'field_land_pincode', 'field_equipment_pincode', 'field_labor_pincode',
  'field_bhusa_pincode', 'field_agri_pincode',
  'field_price_type', 'field_price_amount', 'field_equipment_rate',
  'field_residue_type', 'field_quantity', 'field_pickup', 'field_buyer_type', 'field_buyer_type_self',
  'field_asking_price', 'field_available_from',
  'field_agri_subtype', 'agri_subtype_farmer_surplus', 'agri_subtype_vendor',
  'field_input_type', 'field_input_types', 'field_item_name', 'field_material_address',
  'field_condition', 'field_business_name', 'field_items_description', 'field_price_range',
  'field_shop_address', 'field_contact_phone', 'agri_vendor_future_charges',
  'experts_nav', 'experts_title', 'experts_filter_label', 'experts_filter_ph',
  'experts_none', 'expert_not_found',
  // Phase 3 (dual auth, profile, admin, articles):
  'nav_login', 'nav_signup', 'my_profile', 'tab_phone', 'tab_email',
  'email_label', 'password_label', 'err_invalid_email', 'err_password_short',
  'err_email_exists', 'err_wrong_password',
  'save_changes', 'change_password', 'delete_account', 'member_since',
  'admin_title', 'access_denied', 'stat_users', 'admin_recent_listings',
  'admin_experts', 'admin_articles', 'admin_users', 'err_not_admin',
  'articles_nav', 'articles_title', 'read_more', 'share_article', 'copy_link',
  'back_to_articles', 'article_not_found', 'related_bhusa_cta', 'read_about_this',
]
const missing = REQUIRED_KEYS.filter((k) => !strings[k])
check('all v1.1 string keys present', missing.length === 0, missing.join(', '))

// 5. Structural parity in category modules: every inline `hi:` has a paired `en:`
//    (guards the bilingual LABELS maps in the .jsx modules).
for (const f of ['land', 'equipment', 'labor', 'bhusa', 'agri_inputs']) {
  const src = readFileSync(join(ROOT, 'src', 'components', 'categories', `${f}.jsx`), 'utf8')
  const hi = (src.match(/\bhi:/g) || []).length
  const en = (src.match(/\ben:/g) || []).length
  check(`${f}.jsx hi/en label parity`, hi === en, `hi=${hi} en=${en}`)
}

// 6. No NEW hardcoded Devanagari in component/screen render code. The only files
//    allowed to contain Devanagari are the i18n sources, the category modules
//    (bilingual LABELS), and the pre-existing language picker (endonyms).
const dev = /[ऀ-ॿ]/
const ALLOWED = new Set([
  'src/lib/i18n/strings.js', 'src/lib/i18n/disclaimers.js', 'src/lib/i18n/legal.js',
  'src/lib/listings/catalog.js',
  'src/components/categories/land.jsx', 'src/components/categories/equipment.jsx',
  'src/components/categories/labor.jsx', 'src/components/categories/bhusa.jsx',
  'src/components/categories/agri_inputs.jsx',
  'src/components/LanguageToggle.jsx', 'src/screens/Welcome.jsx',
])
import { readdirSync, statSync } from 'node:fs'
const offenders = []
;(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(jsx|js)$/.test(f)) {
      const rel = p.slice(ROOT.length + 1)
      if (!ALLOWED.has(rel) && dev.test(readFileSync(p, 'utf8'))) offenders.push(rel)
    }
  }
})(join(ROOT, 'src'))
check('no hardcoded Devanagari outside sanctioned i18n/label files', offenders.length === 0, offenders.join(', '))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
