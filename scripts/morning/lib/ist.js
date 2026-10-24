// IST (Asia/Kolkata, UTC+5:30, no daylight saving) date helpers. All morning logic runs on IST calendar dates.
const IST_MS = 330 * 60 * 1000
export const istDate = (now = new Date()) => new Date(now.getTime() + IST_MS).toISOString().slice(0, 10)
export const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10)
export const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000)
// 0 = Sunday ... 6 = Saturday for an ISO date
export const weekday = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay()
export const isIsoDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s)) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`))
// the instant IST midnight of an ISO date starts
export const istMidnight = (iso) => new Date(Date.parse(`${iso}T00:00:00Z`) - IST_MS)
