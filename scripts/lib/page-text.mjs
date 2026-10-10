import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

const entities = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
  hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»',
  copy: '©', reg: '®', trade: '™', times: '×', divide: '÷', deg: '°', euro: '€', pound: '£',
}
const decode = (value) => value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_, key) => {
  if (key[0] === '#') {
    const n = key[1].toLowerCase() === 'x' ? Number.parseInt(key.slice(2), 16) : Number.parseInt(key.slice(1), 10)
    return Number.isFinite(n) ? String.fromCodePoint(n) : _
  }
  return entities[key.toLowerCase()] ?? _
})

export function htmlToText(html) {
  return decode(String(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')).trim()
}

function decodeBody(body, contentType) {
  const headerCharset = String(contentType).match(/charset\s*=\s*["']?([^\s;"'>]+)/i)?.[1]
  const asciiHead = Buffer.from(body).subarray(0, 8192).toString('latin1')
  const metaCharset = asciiHead.match(/<meta\b[^>]*charset\s*=\s*["']?([^\s;"'>]+)/i)?.[1]
    || asciiHead.match(/<meta\b[^>]*content\s*=\s*["'][^"']*charset=([^\s;"'>]+)/i)?.[1]
  let charset = (headerCharset || metaCharset || 'utf-8').toLowerCase()
  if (charset === 'iso-8859-1') charset = 'windows-1252'
  try { return new TextDecoder(charset).decode(body) } catch { return new TextDecoder('utf-8').decode(body) }
}

export function pageTitle(html) {
  const match = String(html).match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)
  return match ? htmlToText(match[1]).slice(0, 300) : ''
}

async function pdfToText(body) {
  const dir = await mkdtemp(join(tmpdir(), 'ks-page-text-'))
  const pdf = join(dir, 'source.pdf')
  const out = join(dir, 'source.txt')
  try {
    await writeFile(pdf, body)
    await run('pdftotext', ['-layout', pdf, out], { windowsHide: true, timeout: 120000 })
    const { readFile } = await import('node:fs/promises')
    return await readFile(out, 'utf8')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

export async function extractPageText(body, contentType = '') {
  const isPdf = /application\/pdf/i.test(contentType) || Buffer.from(body).subarray(0, 5).toString() === '%PDF-'
  if (isPdf) return { text: (await pdfToText(body)).replace(/\s+/g, ' ').trim(), title: '' }
  const html = decodeBody(body, contentType)
  return { text: htmlToText(html), title: pageTitle(html) }
}
