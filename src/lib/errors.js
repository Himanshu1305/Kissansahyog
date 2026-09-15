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
  self_declaration_required: 'err_self_declaration_required',
  equipment_type_required: 'err_equipment_type_required',
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
  not_owner: 'err_not_owner',
  not_available: 'err_not_available',
  not_authorized: 'err_not_authorized',
  not_admin: 'err_not_admin',
  article_fields_required: 'err_article_fields',
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
  for (const code of Object.keys(CODE_TO_KEY)) {
    if (raw.includes(code)) return new AppError(code)
  }
  return new AppError('unknown')
}
