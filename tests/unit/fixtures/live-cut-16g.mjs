// Helper for weather-live-fallback-16g.test.mjs: runs fetchLiveWeatherCell once with a fixed clock and a fixed Open-Meteo
// reply, and prints the hourly list that was saved. The test runs it under different TZ values.
import { register } from 'node:module'
register('./loader-16g.mjs', import.meta.url)
const NOW = Date.parse('2026-10-29T06:47:00Z') // 12:17 IST
Date.now = () => NOW
const saved = []
globalThis.__sb = { rpc: (name, args) => { saved.push(args.p_hourly.map((h) => h.time)); return Promise.resolve({}) }, from: () => ({ upsert: () => Promise.resolve({}) }) }
const time = Array.from({ length: 72 }, (_, i) => `${new Date(Date.parse('2026-10-28T18:30:00Z') + i * 3600000 + 19800000).toISOString().slice(0, 13)}:00`)
const arr = (v) => time.map(() => v)
globalThis.fetch = async () => ({ ok: true, json: async () => ({
  current: { temperature_2m: 30, relative_humidity_2m: 40, wind_speed_10m: 8, weather_code: 1, precipitation: 0 },
  hourly: { time, temperature_2m: arr(25), precipitation: arr(0), precipitation_probability: arr(0), wind_speed_10m: arr(5), relative_humidity_2m: arr(50) },
  daily: { time: ['2026-10-29', '2026-10-30'], temperature_2m_max: [31, 31], temperature_2m_min: [16, 16], precipitation_sum: [0, 0], precipitation_probability_max: [0, 0], weather_code: [1, 1], wind_speed_10m_max: [10, 10], et0_fao_evapotranspiration: [3, 3] },
}) })
const { fetchLiveWeatherCell } = await import('../../../src/lib/weather/weatherApiV2.js')
const cell = await fetchLiveWeatherCell(23.84, 78.74)
console.log(JSON.stringify({ saved: saved[0], cellHourly: cell.hourly.map((h) => h.time), firstDaily: cell.daily[0].date }))
