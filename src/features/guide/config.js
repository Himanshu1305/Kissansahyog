// Batch 10C — guide demos. Plain JS (no React, no JSX) so plain Node can import it.

// OTP gate (HARD RULE 6). Flip to true ONLY when OTP signup is live in production
// (batch 10B). While false, the register demo shows today's real signup (no OTP).
export const GUIDE_OTP_LIVE = false

// The four demos, in hub order. `real` = the real page each demo teaches.
// /post is login-only (Protected), so its link goes through /login?next=/post:
// a logged-in visitor is sent straight on to /post by PublicOnly.
export const GUIDE_ORDER = ['register', 'post', 'find', 'tour']
export const GUIDE_REAL = {
  register: '/signup',
  post: '/login?next=%2Fpost',
  find: '/browse',
  tour: '/',
}
export const isGuideId = (id) => GUIDE_ORDER.includes(id)
