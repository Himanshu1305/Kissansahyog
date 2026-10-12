// Feedback form contact field: one box that takes an e-mail address OR an Indian
// mobile number. Pure functions (no imports) so Node scripts can test them; the
// same rules are repeated in functions/api/feedback.js and in migration 0055.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// Returns the lower-cased address, or null when it is not a usable e-mail.
export function normalizeEmail(value) {
  const e = String(value ?? '').trim().toLowerCase()
  return e && e.length <= 254 && EMAIL_RE.test(e) ? e : null
}

// Returns the 10 digits of an Indian mobile number (first digit 6 to 9), or null.
// Spaces and hyphens are dropped, then a leading +91 / 91 / 0.
export function normalizeMobile(value) {
  let m = String(value ?? '').replace(/[\s-]/g, '')
  if (m.startsWith('+91')) m = m.slice(3)
  else if (/^91\d{10}$/.test(m)) m = m.slice(2)
  if (/^0\d{10}$/.test(m)) m = m.slice(1)
  return /^[6-9]\d{9}$/.test(m) ? m : null
}

// Works out which of the two the person typed.
//   { email } | { mobile } | { error: 'required' | 'email' | 'mobile' | 'unknown' }
export function parseContact(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return { error: 'required' }
  if (raw.includes('@')) {
    const email = normalizeEmail(raw)
    return email ? { email } : { error: 'email' }
  }
  if (/^[+\d][\d\s-]*$/.test(raw)) {
    const mobile = normalizeMobile(raw)
    return mobile ? { mobile } : { error: 'mobile' }
  }
  return { error: 'unknown' }
}
