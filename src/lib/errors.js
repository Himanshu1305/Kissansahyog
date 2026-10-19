// Maps stable error codes (raised by the SQL RPCs, or thrown client-side) to
// i18n string keys defined in src/lib/i18n/strings.js. Keeping this mapping in
// one place means new RPC error codes only need a string entry + a line here.

// code -> i18n key
const CODE_TO_KEY = {
  name_required: 'err_name_required',
  invalid_phone: 'err_invalid_phone',
  invalid_pincode: 'err_invalid_pincode',
  invalid_email: 'err_invalid_email',
  password_too_short: 'err_password_short',
  email_exists: 'err_email_exists',
  wrong_password: 'err_wrong_password',
  disclaimer_not_accepted: 'err_disclaimer_not_accepted',
  pincode_not_found: 'err_pincode_not_found',
  phone_exists: 'err_phone_exists',
  not_found: 'err_not_found',
  too_many_attempts: 'err_too_many_attempts',
  place_required: 'err_place_required',
  registration_incomplete: 'err_registration_incomplete',
  contact_hidden: 'err_contact_hidden',
  self_declaration_required: 'err_self_declaration_required',
  equipment_type_required: 'err_equipment_type_required',
  vehicle_type_required: 'err_vehicle_type_required',
  transport_rate_basis_required: 'err_transport_rate_basis_required',
  invalid_worker_count: 'err_invalid_worker_count',
  invalid_date_range: 'err_invalid_date_range',
  residue_type_required: 'err_residue_type_required',
  quantity_required: 'err_quantity_required',
  pickup_required: 'err_pickup_required',
  buyer_type_required: 'err_buyer_type_required',
  asking_price_required: 'err_asking_price_required',
  subtype_required: 'err_agri_subtype_required',
  input_type_required: 'err_input_type_required',
  item_name_required: 'err_item_name_required',
  material_address_required: 'err_material_address_required',
  business_name_required: 'err_business_name_required',
  input_types_required: 'err_input_types_required',
  items_description_required: 'err_items_description_required',
  shop_address_required: 'err_shop_address_required',
  operator_name_required: 'err_operator_name_required',
  drone_type_required: 'err_drone_type_required',
  service_type_required: 'err_service_type_required',
  rate_per_acre_required: 'err_rate_per_acre_required',
  asset_village_required: 'err_asset_village_required',
  crop_type_required: 'err_crop_type_required',
  acreage_required: 'err_acreage_required',
  service_needed_required: 'err_service_needed_required',
  warehouse_type_required: 'err_warehouse_type_required',
  capacity_required: 'err_capacity_required',
  warehouse_rate_required: 'err_warehouse_rate_required',
  warehouse_address_required: 'err_warehouse_address_required',
  quantity_quintals_required: 'err_quantity_quintals_required',
  duration_required: 'err_duration_required',
  not_owner: 'err_not_owner',
  not_available: 'err_not_available',
  not_authorized: 'err_not_authorized',
  not_admin: 'err_not_admin',
  article_fields_required: 'err_article_fields',
  question_required: 'err_question_required',
  story_required: 'err_story_required',
  story_fields_required: 'err_story_fields_required',
  scheme_fields_required: 'err_scheme_fields_required',
  invalid_scheme_category: 'err_invalid_scheme_category',
  wide_visibility_not_allowed: 'err_wide_visibility_not_allowed',
  rules_not_agreed: 'err_rules_agreement_required',
  provider_declaration_required: 'err_provider_declaration_required',
  tanker_capacity_required: 'err_tanker_capacity_required',
  claim_fields_required: 'err_claim_fields_required',
  invalid_choice: 'err_poll_choice',
  suggestion_body_required: 'err_suggestion_body',
  vendor_subtype_required: 'err_gh_vendor_subtype_required',
  gh_structure_required: 'err_gh_structure_required',
  gh_area_required: 'err_gh_area_required',
  jugaad_offer_type_required: 'err_jugaad_offer_type_required',
  jugaad_name_required: 'err_jugaad_name_required',
  road_vehicle_not_allowed: 'err_road_vehicle_not_allowed',
  invalid_report_reason: 'err_report_reason_required',
  invalid_target_type: 'err_report_failed',
  target_id_required: 'err_report_failed',
  rate_limited: 'err_report_rate_limited',
  invalid_action: 'err_report_failed',
  equipment_spec_invalid: 'err_equipment_spec_invalid',
  // Batch 11A — OTP and session (our own codes; provider messages never reach the app)
  otp_wrong: 'err_otp_wrong',
  otp_expired: 'err_otp_expired',
  otp_invalid: 'err_otp_expired',
  otp_too_many: 'err_otp_too_many',
  otp_cooldown: 'err_otp_cooldown',
  otp_service_busy: 'err_otp_service_busy',
  otp_code_format: 'err_otp_code_format',
  otp_required: 'err_otp_required',
  phone_not_registered: 'err_phone_not_registered', // 11B: login with a number that has no account
  not_authenticated: 'err_not_authenticated',
}

export class AppError extends Error {
  constructor(code) {
    super(code)
    this.code = code
    this.i18nKey = CODE_TO_KEY[code] || 'err_unknown'
  }
}

// Turn a Supabase/PostgREST error (or any thrown value) into an AppError with a
// known code. RPC exceptions surface their raised message in error.message.
export function toAppError(error) {
  if (error instanceof AppError) return error
  const raw = String(error?.message || error || '').toLowerCase()
  // Batch 9C (migration 0063): "equipment_spec_invalid:<field>:<required|range>" names the field, so the
  // equipment form can show the same message as its own check.
  const spec = raw.match(/equipment_spec_invalid:([a-z_]+):([a-z_]+)/)
  if (spec) return Object.assign(new AppError('equipment_spec_invalid'), { field: spec[1], reason: spec[2] })
  for (const code of Object.keys(CODE_TO_KEY)) {
    if (raw.includes(code)) return new AppError(code)
  }
  return new AppError('unknown')
}
