// Find-a-number demo — mirrors src/screens/Browse.jsx → ListingDetail.jsx → ContactActions.jsx:
// category chips (Equipment first and pre-picked), equipment tag chips, a listing card, the
// detail page with Call / WhatsApp, then the reveal sheet (caution banner, name · number,
// Call / WhatsApp). Logged-out visitors are sent to login first (said in the caption).
// Format: see ../engine.js.
import { CATEGORY_META, EQUIPMENT_TAGS, LISTING_TYPE_META, RENTAL_BASIS, TRACTOR_BRANDS } from '../../../lib/listings/catalog.js'
import { disclaimers } from '../../../lib/i18n/disclaimers.js'

const raw = (s) => ({ raw: s })
const cat = (c) => [raw(`${CATEGORY_META[c].icon} `), CATEGORY_META[c]]
const mahindra = TRACTOR_BRANDS.find((b) => b.value === 'Mahindra')
const perHour = RENTAL_BASIS.find((r) => r.value === 'per_hour')
const rare = EQUIPMENT_TAGS.find((t) => t.value === 'rare_emergency')
const veg = EQUIPMENT_TAGS.find((t) => t.value === 'vegetable_farming')
const place = [raw('📍 '), 'guide_s_village']

const screens = [
  {
    id: 's1',
    title: 'browse_title',
    nodes: [
      { type: 'chips', id: 'cats', items: [
        { id: 'cat_equipment', text: cat('equipment'), sel: true },
        { id: 'cat_labor', text: cat('labor') },
        { id: 'cat_bhusa', text: cat('bhusa') },
        { id: 'cat_agri', text: cat('agri_inputs') },
      ] },
      { type: 'chips', id: 'tags', label: 'field_equipment_tags', big: true, items: [
        { id: 'tag_all', text: 'filter_all', sel: true },
        { id: 'tag_veg', text: veg },
        { id: 'tag_rare', text: rare },
      ] },
      { type: 'chosen', text: [raw('📍 '), 'guide_s_village', raw(', '), 'guide_s_district'], action: 'loc_change_short', small: true },
      { type: 'card', id: 'card_tractor', pills: [LISTING_TYPE_META.offer], title: [mahindra, raw(' 575 DI · 2021 · 45 HP')], line: ['guide_s_tractor', raw(' · '), perHour, raw(' · ₹600')], place, contact: true },
      { type: 'card', id: 'card_crane', pills: [LISTING_TYPE_META.offer, rare], title: [mahindra, raw(' 275 DI · 2019 · 39 HP')], line: ['guide_s_crane', raw(' · '), perHour, raw(' · ₹1,200')], place, contact: true },
    ],
  },
  {
    id: 's2',
    title: 'detail_title',
    nodes: [
      { type: 'h', text: cat('equipment'), big: true, pills: [LISTING_TYPE_META.offer] },
      { type: 'buttons', children: [
        { type: 'button', id: 'call', text: [raw('📞 '), 'contact_call'] },
        { type: 'button', id: 'wa', text: [raw('🟢 '), 'contact_whatsapp'], variant: 'wa' },
      ] },
      { type: 'kv', id: 'details', rows: [
        ['field_equipment_type', 'guide_s_crane'],
        ['field_equipment_rate', [perHour, raw(' · ₹1,200')]],
        ['field_equipment_tags', rare],
        [raw('📍'), 'guide_s_village'],
      ] },
    ],
  },
  {
    id: 's3',
    title: 'detail_title',
    sheet: true,
    nodes: [
      { type: 'banner', id: 'caution', copy: disclaimers.phoneReveal },
      { type: 'big', id: 'number', text: ['guide_s_name', raw(' · 98765 43210')], sample: true },
      { type: 'buttons', children: [
        { type: 'button', id: 'sheet_call', text: [raw('📞 '), 'contact_call'] },
        { type: 'button', id: 'sheet_wa', text: [raw('🟢 '), 'contact_whatsapp'], variant: 'wa' },
      ] },
      { type: 'button', id: 'cancel', text: 'cancel', variant: 'plain', small: true },
    ],
  },
]

const steps = [
  { do: 'look', target: 'cats', say: 'guide_find_1' },
  { do: 'pick', target: 'tag_rare', hide: ['card_tractor'], say: 'guide_find_2' },
  { do: 'tap', target: 'card_crane', go: 's2', say: 'guide_find_3' },
  { do: 'look', target: 'details', say: 'guide_find_4' },
  { do: 'tap', target: 'call', go: 's3', say: 'guide_find_5' },
  { do: 'look', target: 'caution', say: 'guide_find_6' },
  { do: 'look', target: 'number', say: 'guide_find_7' },
  { do: 'look', target: 'sheet_call', say: 'guide_find_hidden' },
]

export default { id: 'find', first: 's1', screens, steps }
