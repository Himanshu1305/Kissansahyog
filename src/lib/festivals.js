// Batch 12B — one-day festival greetings. Dates are India calendar dates (Asia/Kolkata), inclusive,
// never the device's own timezone. To add a festival, add one entry; an old entry is simply never active.
export const FESTIVALS = [
  { id: 'dussehra-2026', fromDate: '2026-10-20', toDate: '2026-10-20' },
]

const IST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })

// 'YYYY-MM-DD' of `now` in India.
export function indiaDate(now = new Date()) {
  return IST.format(now)
}

// The festival active on `now` (India date), or null. `now` is injectable for tests.
export function activeFestival(now = new Date()) {
  const d = indiaDate(now)
  return FESTIVALS.find((f) => d >= f.fromDate && d <= f.toDate) || null
}
