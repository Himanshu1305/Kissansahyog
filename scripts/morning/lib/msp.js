// MSP comparison: verified entries of the right marketing season only. Never reads the msp_prices table.
export function seasonLabel(cropSeason, date) {
  const y = Number(date.slice(0, 4)), m = Number(date.slice(5, 7))
  // Kharif marketing season starts in October; rabi marketing season starts in April.
  const start = cropSeason === 'kharif' ? (m >= 10 ? y : y - 1) : (m >= 4 ? y : y - 1)
  return `${cropSeason} ${start}-${String((start + 1) % 100).padStart(2, '0')}`
}
export const seasonShort = (label) => label.split(' ')[1]

// -> { msp, label, source_url } or null
export function mspFor(cropEn, cropSeason, date, entries) {
  const label = seasonLabel(cropSeason, date)
  const e = (entries || []).find((x) => x.verified === true && x.crop === cropEn && x.season_label === label)
  return e ? { msp: e.msp, label, source_url: e.source_url } : null
}

// Active verified procurement window for a crop in Madhya Pradesh on a date. -> entry or null
export function procurementFor(cropEn, date, windows) {
  return (windows || []).find((w) => w.verified === true && w.crop === cropEn && /madhya pradesh|^mp$/i.test(w.state || '') && w.start <= date && date <= w.end) || null
}
