// Batch 12A — WhatsApp channel: single source of truth, hi/en strings, the component's three variants.
// Run: node --test "tests/unit/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { WHATSAPP_CHANNEL_URL, WHATSAPP_CHANNEL_NAME } from '../../src/lib/social.js'
import { strings } from '../../src/lib/i18n/strings.js'

const ID = '0029VbDtjiJBqbr1a2Nv1F3I'
const KEYS = ['wa_ch_title', 'wa_ch_line', 'wa_ch_btn', 'wa_ch_line_prices', 'wa_ch_link']

test('the channel URL and name', () => {
  assert.equal(WHATSAPP_CHANNEL_URL, `https://whatsapp.com/channel/${ID}`)
  assert.equal(WHATSAPP_CHANNEL_NAME, 'किसान सहयोग (Kissansahyog.Com)')
})

test('the channel id appears in src/ only in src/lib/social.js', () => {
  const hits = []
  const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (readFileSync(p, 'utf8').includes(ID)) hits.push(relative('src', p).split(sep).join('/')) } }
  walk('src')
  assert.deepEqual(hits, ['lib/social.js'])
})

test('every new string has hi and en', () => {
  for (const k of KEYS) { assert.ok(strings[k]?.hi?.length > 0, `${k} hi`); assert.ok(strings[k]?.en?.length > 0, `${k} en`) }
  assert.equal(strings.wa_ch_btn.hi, 'WhatsApp चैनल से जुड़ें')
})

// The component itself runs in the browser (JSX); node cannot load it, so its rendered output is checked by
// e2e/whatsapp-channel-12a.spec.js. Here: the source has the safe attributes and the three variants.
test('component source: variants, safe link attributes, AA button colour', () => {
  const src = readFileSync('src/components/WhatsAppChannelCard.jsx', 'utf8')
  for (const v of ['hero', 'link']) assert.ok(src.includes("variant === '" + v + "'"), v)
  assert.ok(src.includes('data-variant="inline"'))
  assert.ok(src.includes("target: '_blank'") && src.includes("rel: 'noopener noreferrer'"))
  assert.ok(src.includes('WHATSAPP_CHANNEL_URL') && src.includes('WHATSAPP_CHANNEL_NAME'))
  assert.ok(src.includes('#0F7A5F') && !src.includes('#25D366'))
  assert.ok(src.includes('min-h-[48px]') && src.includes('min-h-[52px]'))
})
