// Weather code → icon/label map + weekday helper. The location-keyed data read now
// lives in weatherApiV2.js (weather_cache_v2); the old single-row weather_cache and
// its fetchWeather() were removed in migration 0024.

// WMO weather code → { i18n key, icon }. Description text lives in strings.js
// (wcode_*) so nothing bilingual is hardcoded here.
export const WEATHER_CODES = {
  0: { key: 'wcode_0', icon: '☀️' },
  1: { key: 'wcode_1', icon: '🌤️' },
  2: { key: 'wcode_2', icon: '⛅' },
  3: { key: 'wcode_3', icon: '☁️' },
  45: { key: 'wcode_45', icon: '🌫️' },
  48: { key: 'wcode_48', icon: '🌫️' },
  51: { key: 'wcode_51', icon: '🌦️' },
  61: { key: 'wcode_61', icon: '🌧️' },
  63: { key: 'wcode_63', icon: '🌧️' },
  65: { key: 'wcode_65', icon: '⛈️' },
  80: { key: 'wcode_80', icon: '🌦️' },
  95: { key: 'wcode_95', icon: '⛈️' },
}
export const DEFAULT_WEATHER = { key: 'wcode_default', icon: '🌡️' }
export const weatherInfo = (code) => WEATHER_CODES[code] || DEFAULT_WEATHER

// Weekday i18n key from an ISO date (0=Sun … 6=Sat).
export const wdayKey = (dateStr) => `wday_${new Date(dateStr).getDay()}`
