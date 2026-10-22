// Batch 14A - small pure rules of the admin console (also checked again by the server).
export const SECURITY_KEYS = ['otp_required', 'session_enforced']
export const REASON_MIN = 10
export const BLOCK_REASON_MIN = 5

// The phrase the admin must type for a risky change; null when only a reason is needed.
export function requiredPhrase(key, value) {
  if (key === 'otp_required' && value === false) return 'OTP OFF'
  if (key === 'session_enforced' && value === true) return 'SESSIONS ON'
  return null
}
export function securityChangeOk({ key, value, reason, phrase }) {
  if (!SECURITY_KEYS.includes(key) || typeof value !== 'boolean') return false
  if (String(reason || '').trim().length < REASON_MIN) return false
  const need = requiredPhrase(key, value)
  return need == null || phrase === need
}
export const blockReasonOk = (reason) => String(reason || '').trim().length >= BLOCK_REASON_MIN

// Which actions an admin of a role may use in the console (the server is the real gate).
export function can(role, what) {
  const superOnly = ['security', 'sms', 'block', 'roles']
  if (superOnly.includes(what)) return role === 'super'
  return true
}

// The action names the console writes to the log, in the order the filter shows them.
export const LOG_ACTIONS = [
  'announcement_create', 'announcement_update', 'announcement_delete', 'announcement_duplicate',
  'security_flag', 'user_block', 'user_unblock', 'admin_role',
  'listing_remove', 'listing_sponsor', 'report_resolve', 'article_save', 'article_delete', 'expert_save', 'expert_active',
  'yojana_save', 'yojana_active', 'msp_save', 'resource_save', 'sawaal_answer', 'safalta_save', 'site_setting',
  'procurement_save', 'mela_save',
]

// Short, safe text for the "detail" column of the log: key: value pairs, long values cut.
export function shortDetails(details, max = 90) {
  if (!details || typeof details !== 'object') return ''
  const s = Object.entries(details).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(', ')
  return s.length > max ? `${s.slice(0, max - 3)}...` : s
}

// Which database this page talks to, from the project address only (never a key).
export function envBadge(url) {
  const u = String(url || '')
  if (u.includes('eltmcznjcqiahqhjvpjg')) return 'PRODUCTION'
  if (u.includes('wzxtqbqlahyahsnoqqva')) return 'STAGING'
  return 'LOCAL'
}

// Client-side mirror of the database scrub (ks_scrub_details): drops keys that look like phone / mobile / key / token /
// secret / password at any depth and masks runs of 10+ digits. The database does it again; this keeps them out of the request.
export function scrubDetails(v) {
  if (Array.isArray(v)) return v.map(scrubDetails)
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).filter(([k]) => !/(phone|mobile|key|token|secret|password)/i.test(k)).map(([k, x]) => [k, scrubDetails(x)]))
  }
  if (typeof v === 'string') return v.slice(0, 200).replace(/[0-9]{10,}/g, '[number]')
  return v
}
