// Batch 16G — the GitHub job must go RED when the Sagar town weather is not fresh (pure logic, unit-tested in
// tests/unit/weather-freshness-16g.test.mjs). rows: [{ grid_key, fetched_at }] read from weather_cache_v2 AFTER the refresh step.
export const SAGAR_CELL = '23.8_78.7'      // PILOT 23.8388, 78.7378 rounded to the 0.1 degree cell
export const WEATHER_MAX_AGE_MS = 2 * 3600000

export function weatherFreshnessCheck(rows, nowMs = Date.now(), cell = SAGAR_CELL, maxAgeMs = WEATHER_MAX_AGE_MS) {
  const row = (rows || []).find((r) => r && r.grid_key === cell)
  if (!row) return { ok: false, text: `Sagar weather (${cell}): missing (RED: no cached forecast for the Sagar cell)` }
  const t = Date.parse(row.fetched_at || '')
  if (Number.isNaN(t)) return { ok: false, text: `Sagar weather (${cell}): fetched_at unreadable (RED)` }
  const mins = Math.round(Math.max(0, nowMs - t) / 60000)
  const ok = nowMs - t <= maxAgeMs
  return { ok, text: `Sagar weather (${cell}): fetched ${mins} min ago${ok ? '' : ` - RED: older than ${Math.round(maxAgeMs / 60000)} min after the refresh step`}` }
}

