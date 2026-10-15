// Batch 9 Phase 5B.7 FINAL GATE (run last): every KEEP persona signs in with e-mail + password AND
// with the mobile alone on the staging WEBSITE. The in-app gate is NOT-RUN (no emulator).
import * as L from './lib.mjs'
const state = L.loadState(); const pw = L.password()
L.heartbeat('5B.7 final web login gate (9 personas, both ways)')
const only = (() => { const i = process.argv.indexOf("--only"); return i > 0 ? process.argv[i + 1].split(",") : null })()
for (const p of L.personas().filter((x) => !only || only.includes(x.id))) {
  const { ctx, page } = await L.newPhone({ lang: p.lang })
  try {
    const e = await L.loginEmail(page, p.email, pw)
    const eOk = e.ok && e.id === state.personas[p.id]?.profileId
    if (e.ok) await L.logout(page)
    const m = await L.loginPhone(page, p.mobile)
    const mOk = m.ok && m.id === state.personas[p.id]?.profileId
    await L.shot(page, `gate`, `${p.id}-after-mobile-login`)
    if (m.ok) await L.logout(page)
    state.personas[p.id].gate = { email: eOk, mobile: mOk, at: new Date().toISOString(), emailError: e.error, mobileError: m.error }
    L.result(state, { area: '5B.7', id: `GATE-${p.id}`, title: `${p.id} web login: e-mail+password and mobile only`, status: eOk && mOk ? 'RAN-PASSED' : 'RAN-FAILED', detail: { email: eOk, mobile: mOk, emailError: e.error, mobileError: m.error } })
    L.result(state, { area: '5B.7', id: `APPGATE-${p.id}`, title: `${p.id} in-app login gate`, status: 'NOT-RUN', detail: 'no emulator this session (low memory)' })
  } finally { L.saveState(state); await ctx.close().catch(() => {}) }
}
await L.closeBrowser()
