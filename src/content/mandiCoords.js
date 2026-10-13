// Approximate town-centre coordinates for the MP mandi markets that report prices,
// used ONLY to show an informational "distance from you" per row on /msp/:crop
// (Phase 3a). Distance here is never a filter (see the 3c note in lib/mandi/mandiApi.js)
// — an approximate town centre is deliberately good enough. The list of valid mandi
// NAMES still comes from DISTINCT market in mandi_prices (Phase 3b), not from here.
//
// Keyed by the market's base town (market name with " APMC", "(F&V)" etc. stripped).
// A per-district fallback covers any market whose town isn't individually listed.
import { haversineKm } from '../lib/distance'

const TOWN_COORDS = {
  khurai: { lat: 24.045, lng: 78.33 },
  sagar: { lat: 23.84, lng: 78.74 },
  bina: { lat: 24.18, lng: 78.20 },
  gadakota: { lat: 23.78, lng: 79.14 }, // Garhakota, Sagar
  shahagarh: { lat: 24.31, lng: 79.00 }, // Shahgarh, Sagar
  rehli: { lat: 23.64, lng: 79.06 },
  rahatgarh: { lat: 23.78, lng: 78.39 },
  malthon: { lat: 24.28, lng: 78.42 },
  indore: { lat: 22.72, lng: 75.86 },
  khargone: { lat: 21.82, lng: 75.61 },
  badwaha: { lat: 22.25, lng: 76.05 }, // Barwaha, Khargone
  bhikangaon: { lat: 21.86, lng: 75.96 },
  karhi: { lat: 22.11, lng: 75.60 }, // Khargone dist.
  gadarwada: { lat: 22.92, lng: 78.78 }, // Gadarwara, Narsinghpur
  katangi: { lat: 21.77, lng: 79.80 }, // Balaghat
  mandla: { lat: 22.60, lng: 80.37 },
  satna: { lat: 24.60, lng: 80.83 },
  shamgarh: { lat: 24.19, lng: 75.64 }, // Mandsaur
  alirajpur: { lat: 22.31, lng: 74.36 },
  // Sagar Division towns (Batch 7L-1) — verified rows of supabase/seed/sagar_division_places.json,
  // keyed the way marketTownKey() reads the feed's market names.
  garhakota: { lat: 23.7797, lng: 79.1455 }, // Sagar
  deori: { lat: 23.3855, lng: 79.0157 }, // Sagar
  banda: { lat: 24.0448, lng: 78.9626 }, // Sagar
  malthone: { lat: 24.3088, lng: 78.537 }, // Sagar
  shahgarh: { lat: 24.314, lng: 79.1183 }, // Sagar
  kesli: { lat: 23.4186, lng: 78.8062 }, // Sagar
  jaisinagar: { lat: 23.6265, lng: 78.5719 }, // Sagar
  makronia: { lat: 23.9072, lng: 78.7251 }, // Sagar
  damoh: { lat: 23.8396, lng: 79.4444 }, // Damoh
  hatta: { lat: 24.1303, lng: 79.5979 }, // Damoh
  patharia: { lat: 23.9003, lng: 79.1953 }, // Damoh
  tendukheda: { lat: 23.3966, lng: 79.5408 }, // Damoh
  jabera: { lat: 23.5581, lng: 79.6781 }, // Damoh
  batiyagarh: { lat: 24.1132, lng: 79.3486 }, // Damoh
  patera: { lat: 23.9958, lng: 79.6859 }, // Damoh
  hindoria: { lat: 23.9023, lng: 79.5701 }, // Damoh
  panna: { lat: 24.7196, lng: 80.1861 }, // Panna
  ajaigarh: { lat: 24.9029, lng: 80.2579 }, // Panna
  amanganj: { lat: 24.4253, lng: 80.0348 }, // Panna
  devendranagar: { lat: 24.616, lng: 80.3786 }, // Panna
  gunnor: { lat: 24.4602, lng: 80.249 }, // Panna
  pawai: { lat: 24.2736, lng: 80.1663 }, // Panna
  raipura: { lat: 23.9002, lng: 79.9649 }, // Panna
  shahnagar: { lat: 23.9916, lng: 80.3055 }, // Panna
  simariya: { lat: 24.2715, lng: 79.8994 }, // Panna
  tikamgarh: { lat: 24.7429, lng: 78.8322 }, // Tikamgarh
  baldeogarh: { lat: 24.7558, lng: 79.07 }, // Tikamgarh
  jatara: { lat: 25.0095, lng: 79.0485 }, // Tikamgarh
  palera: { lat: 25.0205, lng: 79.2279 }, // Tikamgarh
  khargapur: { lat: 24.8222, lng: 79.1445 }, // Tikamgarh
  lidhora: { lat: 25.0728, lng: 78.8672 }, // Tikamgarh
  mohangarh: { lat: 24.9945, lng: 78.6816 }, // Tikamgarh
  badagaon: { lat: 24.5694, lng: 79.0183 }, // Tikamgarh
  chhatarpur: { lat: 24.9205, lng: 79.584 }, // Chhatarpur
  nowgong: { lat: 25.0628, lng: 79.4394 }, // Chhatarpur
  rajnagar: { lat: 24.8891, lng: 79.9113 }, // Chhatarpur
  bijawar: { lat: 24.6227, lng: 79.4893 }, // Chhatarpur
  gaurihar: { lat: 25.2702, lng: 80.195 }, // Chhatarpur
  maharajpur: { lat: 25.017, lng: 79.7265 }, // Chhatarpur
  buxwaha: { lat: 24.2495, lng: 79.2858 }, // Chhatarpur
  ghuwara: { lat: 24.5058, lng: 79.0786 }, // Chhatarpur
  chandla: { lat: 25.0679, lng: 80.1929 }, // Chhatarpur
  khajuraho: { lat: 24.8515, lng: 79.926 }, // Chhatarpur
  harpalpur: { lat: 25.2868, lng: 79.3339 }, // Chhatarpur
  niwari: { lat: 25.3512, lng: 78.7994 }, // Niwari
  prithvipur: { lat: 25.1853, lng: 78.665 }, // Niwari
  orchha: { lat: 25.3529, lng: 78.6402 }, // Niwari
  naugaon: { lat: 25.0628, lng: 79.4394 }, // Nowgong, Chhatarpur (feed spells it "Naugaon")
  badamalhera: { lat: 24.5627, lng: 79.3072 }, // Bada Malhera, Chhatarpur
}

const DISTRICT_COORDS = {
  Sagar: { lat: 23.84, lng: 78.74 },
  // Sagar Division district HQs (Batch 7L-1) — from supabase/seed/sagar_division_places.json.
  Damoh: { lat: 23.8396, lng: 79.4444 },
  Panna: { lat: 24.7196, lng: 80.1861 },
  Tikamgarh: { lat: 24.7429, lng: 78.8322 },
  Chhatarpur: { lat: 24.9205, lng: 79.584 },
  Niwari: { lat: 25.3512, lng: 78.7994 },
  Khargone: { lat: 21.82, lng: 75.61 },
  Indore: { lat: 22.72, lng: 75.86 },
  Narsinghpur: { lat: 22.95, lng: 79.19 },
  Balaghat: { lat: 21.81, lng: 80.19 },
  Mandla: { lat: 22.60, lng: 80.37 },
  Satna: { lat: 24.60, lng: 80.83 },
  Mandsaur: { lat: 24.07, lng: 75.07 },
  Alirajpur: { lat: 22.31, lng: 74.36 },
}

// Normalise a market name to its base town key.
export function marketTownKey(market) {
  return String(market || '')
    .replace(/\(.*?\)/g, ' ') // drop "(F&V)" etc.
    .replace(/\bAPMC\b/gi, ' ')
    .replace(/[^a-zA-Z\u0900-\u097F ]/g, ' ') // keep A-Z + the Devanagari block, drop the rest
    .trim()
    .toLowerCase()
    .split(/\s+/)[0] || ''
}

// Coordinates for a market → {lat,lng} or null (town first, then district fallback).
export function marketLatLng(market, district) {
  const key = marketTownKey(market)
  if (TOWN_COORDS[key]) return TOWN_COORDS[key]
  if (district && DISTRICT_COORDS[district]) return DISTRICT_COORDS[district]
  return null
}

// Distance in km from a center {latitude,longitude} to a market, or null if unknown.
export function marketDistanceKm(center, market, district) {
  if (!center || center.latitude == null || center.longitude == null) return null
  const c = marketLatLng(market, district)
  if (!c) return null
  return haversineKm(center.latitude, center.longitude, c.lat, c.lng)
}
