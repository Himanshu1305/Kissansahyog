// Batch 8A — shared helpers for the Android test runner: adb, evidence files, screenshots,
// and the Chrome DevTools (CDP) connection to the app's WebView.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { _android } from 'playwright-core'
import { findJdk21, findSdk } from './find-jdk.mjs'
import { PKG, ACTIVITY, APP_URL } from './expected.mjs'

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const OUT_DIR = path.join(ROOT, 'docs', 'review', 'batch8a')
export const LOG_DIR = path.join(OUT_DIR, 'logs')
export const APK = path.join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
export const WIN = process.platform === 'win32'
export const SDK = findSdk()
export const JDK = findJdk21()
export const ADB = SDK ? path.join(SDK, 'platform-tools', WIN ? 'adb.exe' : 'adb') : 'adb'

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export const rel = (p) => path.relative(ROOT, p).replaceAll('\\', '/')

// ---------- adb ----------
// ANDROID_SERIAL (set by scripts/test-android.sh, or by the person for a real phone) picks the
// device; adb reads it from the environment by itself.
export function adb(args, { timeout = 60000, buffer = false } = {}) {
  const res = spawnSync(ADB, args, { encoding: buffer ? 'buffer' : 'utf8', timeout, maxBuffer: 256 * 1024 * 1024 })
  return { ok: res.status === 0, status: res.status, out: buffer ? res.stdout : (res.stdout || '').replace(/\r\n/g, '\n'), err: buffer ? '' : (res.stderr || '').replace(/\r\n/g, '\n') }
}
export const sh = (cmd, opts) => adb(['shell', cmd], opts)

export function deviceState() {
  const r = adb(['get-state'], { timeout: 15000 })
  return r.ok && r.out.trim() === 'device' ? { ok: true } : { ok: false, reason: (r.err || r.out || 'adb get-state failed').trim().split('\n')[0] }
}
export const appPid = () => sh(`pidof ${PKG}`).out.trim()
export const forceStop = () => sh(`am force-stop ${PKG}`)
export function launchApp() { return sh(`am start -W -n ${ACTIVITY}`, { timeout: 60000 }) }
export function resumedActivity() {
  const out = sh('dumpsys activity activities').out
  const line = out.split('\n').find((l) => /topResumedActivity=|mTopResumedActivity=|ResumedActivity:/.test(l)) || ''
  const m = line.match(/\{[^}]*\s([\w.]+)\/([\w.$]+)/)
  return { line: line.trim(), pkg: m ? m[1] : null, activity: m ? m[2] : null }
}
export async function waitFor(fn, { timeout = 10000, interval = 400 } = {}) {
  const end = Date.now() + timeout
  let last
  for (;;) {
    last = await fn()
    if (last) return last
    if (Date.now() >= end) return last
    await sleep(interval)
  }
}
export function uiDump() {
  sh('uiautomator dump /sdcard/ks-ui.xml', { timeout: 30000 })
  return sh('cat /sdcard/ks-ui.xml').out
}
// Centre of the first UI node whose text / content-desc matches `re`, in screen pixels.
export function uiFind(xml, re) {
  for (const m of xml.matchAll(/<node [^>]*>/g)) {
    const text = (m[0].match(/ text="([^"]*)"/) || [])[1] || ''
    const desc = (m[0].match(/ content-desc="([^"]*)"/) || [])[1] || ''
    if (!re.test(text) && !re.test(desc)) continue
    const b = m[0].match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)
    if (!b) continue
    const [x1, y1, x2, y2] = b.slice(1).map(Number)
    return { text: text || desc, x: Math.round((x1 + x2) / 2), y: Math.round((y1 + y2) / 2), bounds: [x1, y1, x2, y2] }
  }
  return null
}
export const tap = (x, y) => sh(`input tap ${Math.round(x)} ${Math.round(y)}`)
export const key = (code) => sh(`input keyevent ${code}`)

// ---------- evidence ----------
export function makeEvidence(root) {
  return {
    dir(id) { const d = path.join(root, id); fs.mkdirSync(d, { recursive: true }); return d },
    text(id, name, content) { const f = path.join(this.dir(id), name); fs.writeFileSync(f, typeof content === 'string' ? content : JSON.stringify(content, null, 2)); return rel(f) },
    // Device screenshot → JPEG, 540px wide, kept under 120 KB.
    async shot(id, name) {
      const png = adb(['exec-out', 'screencap', '-p'], { buffer: true, timeout: 30000 }).out
      if (!png || png.length < 1000) throw new Error('screencap returned no image')
      const f = path.join(this.dir(id), `${name}.jpg`)
      let quality = 62
      let jpg = await sharp(png).resize({ width: 540 }).jpeg({ quality, mozjpeg: true }).toBuffer()
      while (jpg.length > 118 * 1024 && quality > 25) { quality -= 8; jpg = await sharp(png).resize({ width: 540 }).jpeg({ quality, mozjpeg: true }).toBuffer() }
      fs.writeFileSync(f, jpg)
      const stats = await sharp(png).stats()
      return { file: rel(f), bytes: jpg.length, stdev: Math.max(...stats.channels.slice(0, 3).map((c) => c.stdev)) }
    },
  }
}

// A list of named yes/no checks; a test passes only when every check passed.
export class Checks {
  constructor() { this.items = [] }
  check(name, pass, detail = '') { this.items.push({ name, pass: !!pass, detail: detail === '' ? undefined : detail }); return !!pass }
  get passed() { return this.items.length > 0 && this.items.every((i) => i.pass) }
  get failed() { return this.items.filter((i) => !i.pass) }
  summary() { return this.failed.map((i) => `${i.name}${i.detail !== undefined ? ` (${typeof i.detail === 'string' ? i.detail : JSON.stringify(i.detail)})` : ''}`).join('; ') }
}

// ---------- CDP (the app's WebView) ----------
// A debug build exposes a DevTools socket named webview_devtools_remote_<pid>. Playwright's
// Android API finds that socket over adb and attaches to it (a plain connectOverCDP fails on a
// WebView: "Browser context management is not supported").
export class AppSession {
  constructor() {
    this.device = null; this._page = null; this.consoleErrors = []; this.pageErrors = []; this.responses = []; this.reconnects = 0
    // Playwright's Android device closes itself (and the page) when one of its background adb
    // polls fails, which happens now and then while the tests also use adb. `page` is therefore a
    // proxy: a call that fails with "has been closed" while the app is still running re-attaches
    // to the same WebView and is retried once. The app is not restarted.
    const self = this
    this._proxy = new Proxy({}, {
      get(_, prop) {
        const real = self._page
        if (!real) return undefined
        const v = real[prop]
        if (typeof v !== 'function') return v
        if (prop === 'on' || prop === 'off' || prop === 'isClosed' || prop === 'url') return v.bind(real)
        return (...args) => {
          const out = self._page[prop](...args)
          if (!out || typeof out.then !== 'function') return out
          return out.catch(async (e) => {
            const pid = appPid()
            if (!/has been closed|Target closed|Browser closed/i.test(String(e?.message || e)) || !pid) { if (e && e.message) e.message += ` [no re-attach: app pid '${pid}']`; throw e }
            self.reconnects++
            await self.connect({ launch: false })
            return self._page[prop](...args)
          })
        }
      },
    })
  }
  get page() { return this._page ? this._proxy : null }

  async connect({ launch = true, timeout = 30000 } = {}) {
    await this.close()
    // Not running, or running behind another app (a background WebView does not paint): bring it
    // to the front. singleTask + am start resumes the existing activity, it does not restart it.
    if (launch && (!appPid() || resumedActivity().pkg !== PKG)) launchApp()
    const pid = await waitFor(() => appPid(), { timeout })
    if (!pid) throw new Error('the app process is not running')
    const serial = process.env.ANDROID_SERIAL || adb(['get-serialno']).out.trim()
    const devices = await _android.devices({ omitDriverInstall: true })
    this.device = devices.find((d) => d.serial() === serial) || null
    devices.filter((d) => d !== this.device).forEach((d) => d.close().catch(() => {}))
    if (!this.device) throw new Error(`device ${serial} is not visible to Playwright`)
    // Find the WebView by the app's process id, not by package: Playwright derives the package
    // from `ps -A | grep <pid>` and keeps the LAST matching line, so another process line that
    // contains the same digits can mislabel the app's WebView (seen in run #2: T15 timed out).
    let page = null, lastErr
    for (let i = 0; i < 3 && !page; i++) {
      try {
        const want = String(appPid())
        const wv = await waitFor(() => this.device.webViews().find((w) => String(w.pid()) === want) || null, { timeout, interval: 500 })
        if (!wv) throw new Error(`no WebView socket for pid ${want} within ${timeout} ms`)
        page = await wv.page()
      } catch (e) { lastErr = e; await sleep(1500) }
    }
    if (!page) throw new Error(`could not attach to the WebView over CDP: ${String(lastErr?.message || lastErr).split('\n')[0]}`)
    this._page = page
    this.pid = String(appPid())
    page.on('console', (m) => { if (m.type() === 'error') this.consoleErrors.push({ text: m.text(), url: m.location()?.url || '', at: Date.now() }) })
    page.on('pageerror', (e) => this.pageErrors.push({ text: String(e?.message || e), at: Date.now() }))
    page.on('response', (r) => { try { const u = new URL(r.url()); this.responses.push({ host: u.host, path: u.pathname, status: r.status(), at: Date.now() }) } catch { /* ignore */ } })
    page.on('requestfailed', (r) => { try { const u = new URL(r.url()); this.responses.push({ host: u.host, path: u.pathname, status: 0, failure: r.failure()?.errorText || 'failed', at: Date.now() }) } catch { /* ignore */ } })
    return this.page
  }

  async close() {
    try { await this.device?.close() } catch { /* already gone */ }
    this.device = null; this._page = null
  }

  mark() { return Date.now() }
  since(t) { return { consoleErrors: this.consoleErrors.filter((e) => e.at >= t), pageErrors: this.pageErrors.filter((e) => e.at >= t), responses: this.responses.filter((e) => e.at >= t) } }

  // Full navigation (a real page load of the bundled index.html at that path).
  async goto(route, { settle = 1200 } = {}) {
    await this.page.goto(APP_URL + route, { waitUntil: 'load', timeout: 45000 })
    await this.waitContent()
    if (settle) await sleep(settle)
  }

  // Wait until the route's (lazy-loaded) screen has rendered — a <main> or <h1> exists, so it
  // is not just the Suspense spinner plus the global footer / tab bar — and the amount of text
  // stopped changing.
  async waitContent({ timeout = 30000, min = 80 } = {}) {
    const end = Date.now() + timeout
    let prev = -1
    while (Date.now() < end) {
      const s = await this.page.evaluate(() => ({ len: (document.querySelector('#root')?.innerText || '').trim().length, screen: !!document.querySelector('#root main, #root h1') })).catch(() => ({ len: -1, screen: false }))
      if (s.screen && s.len >= min && s.len === prev) return s.len
      prev = s.len
      await sleep(700)
    }
    return prev
  }

  state() {
    return this.page.evaluate(() => ({
      href: location.href,
      path: location.pathname,
      title: document.title,
      textLength: (document.querySelector('#root')?.innerText || '').trim().length,
      text: (document.querySelector('#root')?.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 400),
      h1: (document.querySelector('h1')?.innerText || '').trim().slice(0, 160),
      hasMain: !!document.querySelector('main, h1, h2'),
      notFound: [...document.querySelectorAll('div')].some((d) => d.children.length === 0 && d.textContent.trim() === '404'),
      nativeClass: document.documentElement.classList.contains('native-app'),
    }))
  }
}
