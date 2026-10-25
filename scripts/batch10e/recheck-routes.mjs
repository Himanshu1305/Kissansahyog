// Batch 10E — re-render a few routes live from a served dist and report whether the data
// marker appears and the h1 text (used to tell a loading-state snapshot from a real loss).
//   node scripts/batch10e/recheck-routes.mjs <baseURL> <route> [route…]
import { chromium } from 'playwright'
const [base, ...routes] = process.argv.slice(2)
const b = await chromium.launch()
try {
  for (const r of routes) {
    const p = await b.newPage()
    await p.route(/\/rest\/v1\/rpc\/(cache_weather_cell|increment_|log_|subscribe_|submit_|vote_|set_|update_|delete_|create_|app_)/, (x) => x.fulfill({ status: 200, contentType: 'application/json', body: 'null' }))
    await p.goto(base + r)
    const marker = await p.waitForSelector('[data-prerender-ready="1"]', { timeout: 15000 }).then(() => true, () => false)
    const h1 = await p.locator('h1').first().innerText().catch(() => '(none)')
    console.log(JSON.stringify({ route: r, marker, h1, loading: (await p.getByText('थोड़ा रुकें').count()) > 0, entries: await p.getByText(/प्रविष्टियाँ/).first().innerText().catch(() => null) }))
    await p.close()
  }
} finally { await b.close() }
