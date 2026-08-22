// Maps stable error codes (raised by the SQL RPCs, or thrown client-side) to
// i18n string keys defined in src/lib/i18n/strings.js. Keeping this mapping in
// one place means new RPC error codes only need a string entry + a line here.

// code -> i18n key
const CODE_TO_KEY = {
  name_required: 'err_name_required',
  invalid_phone: 'err_invalid_phone',
  invalid_pincode: 'err_invalid_pincode',
  disclaimer_not_accepted: 'err_disclaimer_not_accepted',
  pincode_not_found: 'err_pincode_not_found',
  phone_exists: 'err_phone_exists',
  not_found: 'err_not_found',
  self_declaration_required: 'err_self_declaration_required',
  equipment_type_required: 'err_equipment_type_required',
  invalid_worker_count: 'err_invalid_worker_count',
  invalid_date_range: 'err_invalid_date_range',
  not_owner: 'err_not_owner',
  not_available: 'err_not_available',
  not_authorized: 'err_not_authorized',
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
