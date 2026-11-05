// Batch 18 - the six districts of Sagar Sambhag, by district headquarters (public.places, migration 0057, kind 'district_hq').
// `key` is the weather_cache_v2 grid_key (0.1 degree cell, checked against cellCentre() in supabase/functions/_shared/weather-core.js by a test).
// No Hindi here (the repo test forbids it): the Hindi names are S.districtNames in scripts/morning/strings.hi.js.
export const DISTRICTS = Object.freeze([
  { id: 'Sagar', key: '23.8_78.7', lat: 23.84178, lon: 78.74668 },
  { id: 'Damoh', key: '23.8_79.4', lat: 23.83957, lon: 79.44444 },
  { id: 'Panna', key: '24.7_80.2', lat: 24.7196, lon: 80.18607 },
  { id: 'Tikamgarh', key: '24.7_78.8', lat: 24.74286, lon: 78.8322 },
  { id: 'Chhatarpur', key: '24.9_79.6', lat: 24.92047, lon: 79.58398 },
  { id: 'Niwari', key: '25.4_78.8', lat: 25.35124, lon: 78.79939 },
])
