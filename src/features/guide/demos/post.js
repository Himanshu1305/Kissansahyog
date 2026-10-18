// Post demo — mirrors src/screens/Post.jsx (3 steps) for a farmer's equipment OFFER, the most
// common case, using the app's own labels: strings.js keys, catalog.js options and placeholders
// (equipmentSpecFields / specPlaceholder for 'Tractor'), disclaimers.js consent items.
// Format: see ../engine.js. /post needs login; the hub card text says so.
// Batch 10E Phase 4: step 2 now follows the real form after Phase 3 — category fields, then the
// shared date block (DateBlock: "कब से उपलब्ध *" with आज / कल / परसों / 📅 तारीख़ चुनें, and
// "कब तक (वैकल्पिक)" with "जब तक चाहें"), the optional extra-info box (shown, no step of its
// own), then the photo picker. The old "उपलब्धता: अभी उपलब्ध / तय तारीख़ों में" chips are gone.
// The sample photo is drawn in code (MockScreen 'thumb'); nothing is picked or uploaded.
import { CATEGORY_META, EQUIPMENT_TAGS, RENTAL_BASIS, TRACTOR_BRANDS, equipmentSpecFields, specPlaceholder } from '../../../lib/listings/catalog.js'
import { disclaimers } from '../../../lib/i18n/disclaimers.js'

const raw = (s) => ({ raw: s })
const spec = Object.fromEntries(equipmentSpecFields('Tractor').map((f) => [f.key, f.label]))
const ph = (key) => specPlaceholder(key, 'Tractor')
const cat = (c) => [raw(`${CATEGORY_META[c].icon} `), CATEGORY_META[c]]
const mahindra = TRACTOR_BRANDS.find((b) => b.value === 'Mahindra')
const perHour = RENTAL_BASIS.find((r) => r.value === 'per_hour')
const title = (n) => ['post_listing', raw(` · ${n}/3`)]

const screens = [
  {
    id: 's1',
    title: title(1),
    nodes: [
      { type: 'h', id: 'who', text: 'post_who_posting', big: true },
      { type: 'tiles', id: 'who_g', items: [
        { id: 'farmer', text: [raw('👨‍🌾 '), 'source_farmer'], sel: true },
        { id: 'vendor', text: [raw('🏪 '), 'source_vendor'] },
      ] },
      { type: 'h', text: 'post_step_what', big: true },
      { type: 'tiles', id: 'cat_g', items: [
        { id: 'cat_equipment', text: cat('equipment') },
        { id: 'cat_labor', text: cat('labor') },
        { id: 'cat_bhusa', text: cat('bhusa') },
        { id: 'cat_agri', text: cat('agri_inputs') },
      ] },
      { type: 'h', text: 'post_q_type', big: true },
      { type: 'tiles', id: 'type_g', items: [
        { id: 'offer', text: [raw('🤝 '), 'post_offer_toggle'] },
        { id: 'requirement', text: [raw('🔎 '), 'post_req_toggle'] },
      ] },
      { type: 'button', id: 'next1', text: 'continue' },
    ],
  },
  {
    id: 's2',
    title: title(2),
    nodes: [
      { type: 'h', text: cat('equipment'), big: true },
      { type: 'field', id: 'etype', label: 'field_equipment_type', ph: 'select_placeholder', req: true, select: true },
      { type: 'chips', id: 'tags_g', label: 'field_equipment_tags', multi: true, items: EQUIPMENT_TAGS.map((tag) => ({ id: `tag_${tag.value}`, text: tag })) },
      { type: 'h', text: [raw('🔧 '), 'spec_section_title'], small: true },
      { type: 'row', children: [
        { type: 'field', id: 'brand', label: spec.brand, ph: 'select_placeholder', req: true, select: true },
        { type: 'field', id: 'model', label: spec.model, ph: ph('model'), req: true },
      ] },
      { type: 'row', children: [
        { type: 'field', id: 'year', label: spec.year, ph: ph('year'), req: true },
        { type: 'field', id: 'hp', label: spec.power_hp, ph: ph('power_hp'), req: true },
      ] },
      { type: 'row', children: [
        { type: 'field', id: 'basis', label: 'field_rental_basis', ph: 'select_placeholder', select: true },
        { type: 'field', id: 'rate', label: 'field_equipment_rate', ph: 'ph_equipment_rate', req: true },
      ] },
      { type: 'group', id: 'dates', children: [
        { type: 'chips', id: 'from_q', label: 'field_available_from', req: true, big: true, items: [
          { id: 'dq_0', text: 'date_today' },
          { id: 'dq_1', text: 'date_tomorrow' },
          { id: 'dq_2', text: 'date_day_after' },
          { id: 'dq_pick', text: [raw('📅 '), 'date_pick'] },
        ] },
        { type: 'field', id: 'from', ph: raw('__ / __ / ____'), sample: true },
        { type: 'chips', id: 'to_q', label: 'date_to_optional', big: true, items: [
          { id: 'open_end', text: 'date_open_ended', sel: true },
        ] },
        { type: 'field', id: 'to', ph: raw('__ / __ / ____') },
      ] },
      { type: 'field', id: 'extra', label: 'extra_info_label', ph: 'extra_info_ph', hint: [raw('📵 '), 'extra_info_help'], multiline: true },
      { type: 'photos', id: 'photos', label: 'field_photos', hint: 'photos_help', limit: 3, children: [
        { type: 'button', id: 'photo_add', text: 'photo_add', small: true },
        { type: 'thumb', id: 'photo_thumb', hidden: true, text: 'guide_example_photo' },
      ] },
      { type: 'button', id: 'next2', text: 'continue' },
    ],
  },
  {
    id: 's3',
    title: title(3),
    nodes: [
      { type: 'h', text: 'post_step_location', big: true },
      { type: 'field', id: 'village', label: 'field_asset_village', ph: 'village_ph', req: true, value: 'guide_s_village', hint: 'asset_village_hint', boxed: true },
      { type: 'button', id: 'loc', text: 'location_current', variant: 'secondary', small: true },
      { type: 'kv', id: 'phone', rows: [[[raw('📞 '), 'post_phone_check'], [raw('98765 43210 · '), 'guide_sample']]] },
      { type: 'check', id: 'declare', text: 'post_declare_provider', box: true },
      { type: 'check', id: 'consent_no', text: [raw('📞 '), 'contact_consent_text', raw(' — '), 'contact_consent_agree'], box: true, tone: 'warn' },
      { type: 'checks', id: 'consents', label: 'consent_title', children: disclaimers.listingConsents.map((c) => ({ type: 'check', id: `c_${c.id}`, text: { hi: c.hi, en: c.en } })) },
      { type: 'button', id: 'submit', text: 'submit' },
    ],
  },
  { id: 's4', title: 'post_success', nodes: [{ type: 'done', title: 'post_success', text: 'guide_samples_note' }] },
]

const steps = [
  { do: 'look', target: 'who_g', say: 'guide_post_1' },
  { do: 'pick', target: 'cat_equipment', say: 'guide_post_2' },
  { do: 'pick', target: 'offer', say: 'guide_post_3' },
  { do: 'tap', target: 'next1', go: 's2', say: 'guide_post_next' },
  { do: 'type', target: 'etype', text: 'guide_s_tractor', say: 'guide_post_5' },
  { do: 'type', items: [{ target: 'brand', text: mahindra }, { target: 'model', text: raw('575 DI') }], say: 'guide_post_6' },
  { do: 'type', items: [{ target: 'year', text: raw('2021') }, { target: 'hp', text: raw('45') }], say: 'guide_post_7' },
  { do: 'type', items: [{ target: 'basis', text: perHour }, { target: 'rate', text: raw('₹600') }], say: 'guide_post_8' },
  // Batch 10E Phase 4: the two new steps, in the real form's order (date block, then photos).
  { do: 'pick', items: [{ target: 'dq_0', set: { from: 'guide_s_today_date' } }, { target: 'open_end', do: 'look' }], say: 'guide_post_dates' },
  { do: 'tap', target: 'photo_add', reveal: ['photo_thumb'], say: 'guide_post_photo' },
  { do: 'tap', target: 'next2', go: 's3', say: 'guide_post_next' },
  { do: 'look', target: 'village', say: 'guide_post_10' },
  { do: 'look', target: 'phone', say: 'guide_post_11' },
  { do: 'check', items: [{ target: 'declare' }, { target: 'consent_no' }], say: 'guide_post_12' },
  { do: 'check', items: disclaimers.listingConsents.map((c) => ({ target: `c_${c.id}` })), say: 'guide_post_13' },
  { do: 'tap', target: 'submit', go: 's4', fx: true, say: 'guide_post_14' },
]

export default { id: 'post', first: 's1', screens, steps }
