// Coarse, bilingual "time posted" label for the public homepage feed. Kept
// deliberately fuzzy (no exact timestamps) and translated via t(). Listings expire
// in 30 days, so day-granularity is enough.
export function timeAgo(dateStr, t) {
  const then = new Date(dateStr).getTime()
  if (!then) return ''
  const days = Math.floor((Date.now() - then) / 86_400_000)
  if (days <= 0) return t('ago_just_now')
  if (days === 1) return t('ago_yesterday')
  return `${days} ${t('ago_days')}`
}
