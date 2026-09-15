#!/usr/bin/env node
// v1.1 Phase 2 — data + catalog additions.
//   node --env-file=.env scripts/test/v11_phase2.mjs
import { anonClient } from '../../e2e/support.js'
import {
  WORK_TYPE, PRICE_TYPE, RENTAL_BASIS, CATEGORY_META,
} from '../../src/lib/listings/catalog.js'

const sb = anonClient()
let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }

async function main() {
  // 2a — new equipment types seeded, in both languages.
  const eq = (await sb.from('equipment_types').select('*')).data || []
  const byEn = Object.fromEntries(eq.map((r) => [r.name_en, r]))
  for (const [en, hi] of [
    ['Drone', 'ड्रोन'], ['Seed Drill', 'सीड ड्रिल'], ['Reaper', 'रीपर'],
    ['Blower', 'ब्लोअर'], ['LCB (Straw Machine)', 'एल.सी.बी. (भूसा मशीन)'],
  ]) {
    check(`equipment type "${en}" seeded (hi+en)`, !!byEn[en] && byEn[en].name_hi === hi, byEn[en]?.name_hi)
  }

  // 2b — masoor crop seeded in the sagar_mp set.
  const crops = (await sb.from('crops').select('*').eq('region', 'sagar_mp')).data || []
  const masoor = crops.find((c) => c.name_en.startsWith('Masoor'))
  check('crop Masoor/मसूर seeded', !!masoor && masoor.name_hi === 'मसूर', masoor?.name_en)

  // 2c — land price-type enum has the three required options.
  const priceVals = PRICE_TYPE.map((p) => p.value).sort()
  check('land PRICE_TYPE has fixed/sharecropping/negotiable',
    priceVals.join(',') === 'fixed,negotiable,sharecropping', priceVals.join(','))
  check('rental basis has per_hour/per_acre/per_day',
    RENTAL_BASIS.map((r) => r.value).sort().join(',') === 'per_acre,per_day,per_hour')

  // 2d — terminology: labor category is now "कृषि सहयोगी" in Hindi (Krishi Sahyogi).
  check('labor category Hindi is कृषि सहयोगी', CATEGORY_META.labor.hi === 'कृषि सहयोगी', CATEGORY_META.labor.hi)
  check('labor category English unchanged (Labor)', CATEGORY_META.labor.en === 'Labor')

  // 2e — Drone Didi option present in the work_type dropdown.
  const drone = WORK_TYPE.find((w) => w.value === 'drone_operator')
  check('Drone Didi work_type present', !!drone && /ड्रोन दीदी/.test(drone.hi) && /Drone Didi/.test(drone.en),
    drone && `${drone.hi} / ${drone.en}`)

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}
main().catch((e) => { console.error('ERROR', e); process.exit(1) })
