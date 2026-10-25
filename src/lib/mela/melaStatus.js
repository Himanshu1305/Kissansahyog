// Date classification is intentionally pure so all Mela views agree and tests can
// pin a calendar day without depending on the machine clock.
export function indiaToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (type) => parts.find((item) => item.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function melaStatus(mela, today = indiaToday()) {
  const start = mela?.event_date_start
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start || '')) return 'undated'
  const end = /^\d{4}-\d{2}-\d{2}$/.test(mela?.event_date_end || '') ? mela.event_date_end : start
  if (end < today) return 'ended'
  if (start > today) return 'upcoming'
  return 'ongoing'
}

export function sortMelasForDisplay(melas, { today = indiaToday(), sort = 'soon' } = {}) {
  const group = { ongoing: 0, upcoming: 1, undated: 2, ended: 3 }
  const byName = (a, b) => String(a.name_en || a.name_hi || '').localeCompare(String(b.name_en || b.name_hi || ''), 'en')
  return [...(melas || [])].sort((a, b) => {
    const ga = group[melaStatus(a, today)]
    const gb = group[melaStatus(b, today)]
    if (ga !== gb) return ga - gb
    if (sort === 'name') return byName(a, b)
    if (ga === 2) return String(a.expected_period || '').localeCompare(String(b.expected_period || ''), 'en') || byName(a, b)
    const aDate = a.event_date_start || ''
    const bDate = b.event_date_start || ''
    return sort === 'late' ? bDate.localeCompare(aDate) : aDate.localeCompare(bDate)
  })
}
