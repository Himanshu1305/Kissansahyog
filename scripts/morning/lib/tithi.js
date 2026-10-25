// Tithi at local sunrise in Sagar (astronomy-engine). tithi = floor(Moon-Sun elongation / 12 deg) + 1, 1..30.
import * as Astronomy from 'astronomy-engine'
import { istMidnight } from './ist.js'

export const SAGAR = { lat: 23.8388, lon: 78.7378, elev: 520 }

export function sunriseSagar(iso) {
  const obs = new Astronomy.Observer(SAGAR.lat, SAGAR.lon, SAGAR.elev)
  const t = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, +1, istMidnight(iso), 1)
  return t ? t.date : new Date(istMidnight(iso).getTime() + 6.5 * 3600000)
}

// -> { n: 1..30, paksha: 'shukla'|'krishna', index: 0..14 (name index), name_idx, elongation }
export function tithiAt(iso) {
  const when = sunriseSagar(iso)
  const e = Astronomy.MoonPhase(when) // 0..360 degrees, Moon ecliptic longitude minus Sun's
  const n = Math.min(30, Math.floor(e / 12) + 1)
  const paksha = n <= 15 ? 'shukla' : 'krishna'
  const idx = n <= 15 ? n - 1 : n - 16 // 0..14; n=15 -> poornima (idx 14), n=30 -> amavasya (idx 14 in krishna)
  return { n, paksha, idx, elongation: e, sunrise: when }
}
