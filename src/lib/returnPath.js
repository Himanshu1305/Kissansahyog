// Batch1 item 3A — resolve where to send a user after login/signup.
// Priority: an explicit ?next= query param, then the router state.from set by the
// Protected gate, then a fallback (the dashboard). Only same-origin absolute paths
// ("/…", never "//host") are honoured, so an open-redirect can't be smuggled in.
export function isSafePath(p) {
  return typeof p === 'string' && p.startsWith('/') && !p.startsWith('//')
}

export function resolveNext(params, locationState, fallback = '/home') {
  const fromState = locationState?.from?.pathname
    ? locationState.from.pathname + (locationState.from.search || '')
    : null
  const raw = params?.get?.('next') || fromState
  return isSafePath(raw) ? raw : fallback
}
