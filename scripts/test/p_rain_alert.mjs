#!/usr/bin/env node
// Rain-alert IMD classification (no DB).  node scripts/test/p_rain_alert.mjs
import { classifyDay, isImdAlert, getRainAlert } from '../../src/lib/weather/rainAlert.js'

let pass = 0, fail = 0
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); ok ? pass++ : fail++ }

check('0 mm → no classification', classifyDay(0) === null)
check('10 mm → light/green (no IMD alert)', classifyDay(10).level === 'light' && classifyDay(10).color === 'green' && !isImdAlert('light'))
check('30 mm → moderate/blue (no IMD alert)', classifyDay(30).level === 'moderate' && !isImdAlert('moderate'))
check('80 mm → heavy/yellow (IMD alert)', classifyDay(80).level === 'heavy' && classifyDay(80).color === 'yellow' && isImdAlert('heavy'))
check('150 mm → very_heavy/orange (IMD alert)', classifyDay(150).level === 'very_heavy' && classifyDay(150).color === 'orange' && isImdAlert('very_heavy'))
check('250 mm → extreme/red (IMD alert)', classifyDay(250).level === 'extreme' && classifyDay(250).color === 'red')

// getRainAlert over a forecast
check('no rain → null', getRainAlert([{ precipitation_sum: 0 }, { precipitation_sum: 2 }]) === null)
const a = getRainAlert([{ precipitation_sum: 12 }, { precipitation_sum: 16 }, { precipitation_sum: 0 }])
check('2 consecutive rainy days → days=2, total=28, moderate(max16)', a && a.days === 2 && a.total === 28 && a.level === 'moderate', JSON.stringify(a))
const y = getRainAlert([{ precipitation_sum: 85 }, { precipitation_sum: 0 }])
check('single 85mm day → heavy IMD yellow, days=1', y && y.level === 'heavy' && y.days === 1 && isImdAlert(y.level))
// rain only on day 2 (48h window) still triggers
const d2 = getRainAlert([{ precipitation_sum: 1 }, { precipitation_sum: 20 }])
check('rain on day 2 (within 48h) triggers', d2 && d2.days === 1 && d2.level === 'moderate')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
