// Location-keyed weather read from weather_cache_v2 (populated by the refresh cron;
// the browser never calls Open-Meteo). Returns a normalized object that keeps the
// old homepage Today-card shape (current_temp/current_weathercode/forecast) AND
// exposes the raw hourly/daily/season_rain for the /mausam page.
import { supabase } from '../supabaseClient'
import { haversineKm } from '../distance'
import { wdayKey } from './weatherApi'

export const gridKey = (lat, lon) => `${(Math.round(lat * 10) / 10).toFixed(1)}_${(Math.round(lon * 10) / 10).toFixed(1)}`

function normalize(row) {
  if (!row) return null
  const cur = row.current || {}
  const daily = Array.isArray(row.daily) ? row.daily : []
  // Back-compat forecast array for getRainAlert + homepage InfoTile.
  const forecast = daily.map((d) => ({
    date: d.date, day_hi: null, temp_max: d.tmax, temp_min: d.tmin,
    precipitation_sum: d.precip_mm, weathercode: d.weathercode,
    precipitation_probability_max: d.precip_prob,
  }))
  return {
    grid_key: row.grid_key, latitude: Number(row.latitude), longitude: Number(row.longitude),
    fetched_at: row.fetched_at,
    current_temp: cur.temp, current_humidity: cur.humidity, current_weathercode: cur.weathercode,
    current_wind: cur.wind_kmh, current_precip: cur.precipitation,
    current: cur, hourly: Array.isArray(row.hourly) ? row.hourly : [],
    daily, forecast, season_rain: row.season_rain || null,
  }
}

// Fetch the cell for lat/lon; if that exact grid is absent, fall back to the nearest
// cached cell (so any pincode still renders). Returns null only if the cache is empty.
export async function fetchWeatherCell(lat, lon) {
  const key = gridKey(lat, lon)
  const { data: exact } = await supabase.from('weather_cache_v2').select('*').eq('grid_key', key).maybeSingle()
  if (exact) return normalize(exact)
  const { data: cells } = await supabase.from('weather_cache_v2').select('grid_key,latitude,longitude')
  if (!cells || !cells.length) return null
  let best = cells[0], bestD = Infinity
  for (const c of cells) {
    const d = haversineKm(lat, lon, Number(c.latitude), Number(c.longitude))
    if (d < bestD) { bestD = d; best = c }
  }
  const { data: row } = await supabase.from('weather_cache_v2').select('*').eq('grid_key', best.grid_key).maybeSingle()
  return normalize(row)
}

// Record that this cell was requested so the refresh cron keeps it fresh. Best-effort.
export async function requestGridCell(lat, lon) {
  try {
    await supabase.from('weather_grid_requests').upsert(
      { grid_key: gridKey(lat, lon), latitude: lat, longitude: lon, last_requested_at: new Date().toISOString() },
      { onConflict: 'grid_key' },
    )
  } catch { /* ignore */ }
}

export { wdayKey }
