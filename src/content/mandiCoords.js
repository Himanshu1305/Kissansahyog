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
}

const DISTRICT_COORDS = {
  Sagar: { lat: 23.84, lng: 78.74 },
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
