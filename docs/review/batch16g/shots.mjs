// Screenshots of /mausam and the homepage weather tile for cells of different age (mocked weather_cache_v2 rows).
// Needs `npx vite preview --port 4173` running.   node --env-file=.env docs/review/batch16g/shots.mjs
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const out = new URL('./evidence/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
mkdirSync(out, { recursive: true })
const H = 3600000; const IST = 19800000
const AGES = { fresh: 1, h7: 7, h14: 14, h26: 26 }

function rowFetchedHoursAgo(hAgo) {
  const fetched = Date.now() - hAgo * H
  const start = Math.floor((fetched + IST) / H) * H - IST - H // the cron keeps entries from one hour before the fetch
  const hourly = Array.from({ length: 48 }, (_, i) => {
    const ist = new Date(start + i * H + IST)
    const hr = ist.getUTCHours()
    return { time: `${ist.toISOString().slice(0, 13)}:00`, temp: 24 + Math.round(6 * Math.sin(((hr - 9) / 24) * 2 * Math.PI)), precip_mm: i >= 5 && i < 8 ? 1.2 : 0, precip_prob: 20, wind_kmh: 9, humidity: 50, soil_moisture: 0.25 }
  })
  const d0 = new Date(fetched + IST).toISOString().slice(0, 10)
  const daily = Array.from({ length: 16 }, (_, i) => ({ date: new Date(Date.parse(`${d0}T00:00:00Z`) + i * 86400000).toISOString().slice(0, 10), tmax: 31, tmin: 16, precip_mm: i === 1 ? 6 : 0, precip_prob: 20, wind_max: 12, weathercode: 2, et0: 3, soil_moisture: 0.25 }))
  return { grid_key: '23.8_78.7', latitude: 23.8, longitude: 78.7, current: { temp: 29, humidity: 40, wind_kmh: 16, weathercode: 1, precipitation: 0 }, hourly, daily, season_rain: { season_start: '2026-10-01', to_date_mm: 10, normal_mm: 12 }, fetched_at: new Date(fetched).toISOString() }
}

const b = await chromium.launch()
for (const [name, hAgo] of Object.entries(AGES)) for (const lang of ['hi', 'en']) for (const w of [320, 360, 1366]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, timezoneId: 'America/Los_Angeles' }) // a phone in another zone must show IST
  await ctx.addInitScript(([l]) => { try { localStorage.setItem('ks_lang_v1', l); localStorage.setItem('ks_location_v1', JSON.stringify({ lat: 23.84, lng: 78.74, label: 'Sagar', from: 'saved' })) } catch {} }, [lang])
  const row = rowFetchedHoursAgo(hAgo)
  await ctx.route(/\/rest\/v1\/weather_cache_v2/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(/pgrst\.object/.test(r.request().headers().accept || '') ? row : [row]) }))
  const p = await ctx.newPage()
  await p.goto('http://localhost:4173/mausam'); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(1500)
  const upd = await p.getByTestId('wx-updated').innerText().catch(() => '(none)')
  const notice = await p.getByTestId('wx-old-notice').count()
  const over = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  const week = await p.locator('table tbody tr').first().innerText().catch(() => '(no table)')
  console.log(`/mausam ${name} ${lang} ${w}: "${upd}" notice=${notice} overflow=${over} firstDayRow="${week.replace(/\s+/g, ' ').slice(0, 30)}"`)
  if (w !== 320) await p.screenshot({ path: `${out}mausam-${name}-${lang}-${w}.png`, clip: { x: 0, y: 0, width: w, height: 900 } })
  await p.goto('http://localhost:4173/'); await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(1500)
  const cards = p.getByTestId('home-hero-cards')
  const clipped = await cards.evaluate((el) => [...el.querySelectorAll('*')].filter((n) => n.scrollWidth > n.clientWidth + 1 && getComputedStyle(n).overflow !== 'visible').length)
  const tile = (await cards.innerText()).replace(/\s+/g, ' ').slice(0, 90)
  console.log(`  home tile ${name} ${lang} ${w}: "${tile}" clipped=${clipped}`)
  if (w !== 320) await cards.screenshot({ path: `${out}tile-${name}-${lang}-${w}.png` })
  await ctx.close()
}
await b.close()
