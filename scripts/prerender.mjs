#!/usr/bin/env node
// Post-build prerender: serve dist/ locally, render each public route with
// Playwright, and write dist/<route>/index.html containing the full content,
// title, meta and JSON-LD. The SPA still hydrates on top of this HTML.
//   node --env-file=.env scripts/prerender.mjs
// Waits for [data-prerender-ready="1"] (set by PageShell/PrerenderReady once a
// page's data has loaded); falls back to networkidle + a short settle so legacy
// screens that don't yet set the marker are still captured.
import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { getRoutes } from './lib/prerender-routes.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const PORT = 4178
const MARKER_TIMEOUT = 3500

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain', '.xml': 'application/xml',
}

function staticServer() {
  return createServer(async (req, res) => {
    try {
      const url = decodeURIComponent(req.url.split('?')[0])
      let file = join(DIST, url)
      if (url.endsWith('/')) file = join(file, 'index.html')
      if (extname(file) && existsSync(file)) {
        const buf = await readFile(file)
        res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' })
        return res.end(buf)
      }
      if (!extname(file) && existsSync(file + '.html')) {
        const buf = await readFile(file + '.html')
        res.writeHead(200, { 'Content-Type': 'text/html' })
        return res.end(buf)
      }
      // SPA fallback
      const buf = await readFile(join(DIST, 'index.html'))
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(buf)
    } catch (e) {
      res.writeHead(500); res.end(String(e))
    }
  })
}

async function main() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('dist/index.html missing — run `vite build` first.')
    process.exit(1)
  }
  const routes = await getRoutes({ verbose: true })
  console.log(`Prerendering ${routes.length} routes…`)

  const server = staticServer()
  await new Promise((r) => server.listen(PORT, r))
  const browser = await chromium.launch()
  const page = await browser.newPage()

  let ok = 0, fallback = 0, failed = []
  for (const route of routes) {
    const url = `http://localhost:${PORT}${route}`
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      let markerHit = true
      try {
        await page.waitForSelector('[data-prerender-ready="1"]', { timeout: MARKER_TIMEOUT })
      } catch {
        markerHit = false
        fallback++
        try { await page.waitForLoadState('networkidle', { timeout: 6000 }) } catch { /* ignore */ }
        await page.waitForTimeout(800)
      }
      const html = '<!doctype html>\n' + (await page.content()).replace(/^<!doctype html>/i, '').trim()
      const outDir = route === '/' ? DIST : join(DIST, route)
      await mkdir(outDir, { recursive: true })
      await writeFile(join(outDir, 'index.html'), html)
      ok++
      if (!markerHit) console.log(`  ~ ${route} (fallback, no marker)`)
    } catch (e) {
      failed.push({ route, err: e.message.split('\n')[0] })
      console.warn(`  ✗ ${route} — ${e.message.split('\n')[0]}`)
    }
  }

  await browser.close()
  server.close()
  console.log(`\nPrerendered ${ok}/${routes.length} (${fallback} via fallback). Failed: ${failed.length}`)
  if (failed.length) for (const f of failed) console.log(`  FAILED ${f.route}: ${f.err}`)
  // Do not fail the build on a few route errors; the SPA still serves them.
  process.exit(0)
}

main()
