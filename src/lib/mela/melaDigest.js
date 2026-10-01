// Phase 6 — "interested" digest-readiness. PURE prioritization logic (no network, no React),
// so it is unit-testable with mocked dates.
//
// INTEGRATION POINT (6b): there is deliberately NO separate reminder-sending system here. When
// the planned daily WhatsApp digest (weather + mandi prices) is eventually built and WhatsApp is
// wired up, it should surface a farmer's interested Melas near the top of that single message —
// NOT run its own scheduler. Two ready pieces exist for that moment:
//   • SERVER side: the `get_mela_interest_digest(p_as_of)` RPC (migration 0035, service-role only)
//     returns every interest row joined to its Mela for Melas happening today..today+3 (confirmed
//     dates only), with a `days_until` field — the digest job calls this once and folds the result
//     into each user's message. It groups rows by `user_id`.
//   • CLIENT/shared side: `selectDigestMelas()` + `daysUntil()` below are the same window logic in
//     pure JS, for any in-app surfacing or for tests, so the window rule lives in exactly one place.
// Nothing in this file sends anything.

const ISO = /^\d{4}-\d{2}-\d{2}$/
const dayNum = (d) => (ISO.test(String(d || '')) ? Math.floor(new Date(`${d}T00:00:00Z`).getTime() / 86400000) : null)

// Accepts a mela-like object with either flat fields or a nested `.mela`.
function fields(m) {
  const src = m?.mela || m || {}
  return {
    confirmed: src.is_date_confirmed === true,
    start: src.event_date_start ?? null,
    end: src.event_date_end ?? src.event_date_start ?? null,
  }
}

// Whole days from `asOf` until the Mela's start (negative if it already started). null if unknown.
export function daysUntil(mela, asOf) {
  const { start } = fields(mela)
  const s = dayNum(start)
  const base = dayNum(asOf)
  return s == null || base == null ? null : s - base
}

// The subset of `melas` a daily digest on date `asOf` should surface: CONFIRMED-date Melas that
// are happening today or start within the next `windowDays` (default 3) and haven't ended yet.
export function selectDigestMelas(melas, asOf, { windowDays = 3 } = {}) {
  const base = dayNum(asOf)
  if (base == null) return []
  return (melas || []).filter((m) => {
    const { confirmed, start, end } = fields(m)
    if (!confirmed) return false // can't reliably remind on an "अपेक्षित" (unconfirmed) date
    const s = dayNum(start)
    if (s == null) return false
    const e = dayNum(end) ?? s
    return s <= base + windowDays && e >= base // starts within the window AND hasn't ended
  })
}

// Group selected rows by user_id (what the future per-user digest message needs).
export function groupDigestByUser(interestRows, asOf, opts) {
  const selected = selectDigestMelas(interestRows, asOf, opts)
  const byUser = {}
  for (const r of selected) {
    const uid = r.user_id
    if (!uid) continue
    ;(byUser[uid] = byUser[uid] || []).push(r)
  }
  return byUser
}
