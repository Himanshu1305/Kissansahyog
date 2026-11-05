// Batch 17F - what the install sheet (and the /install page) shows for each environment class.
// Pure data: no React, so it is tested in node. Strings live in i18n/installStrings.js.

const ANDROID_STEPS = [
  { icon: 'dots', key: 'inst_a1' },
  { icon: 'install', key: 'inst_a2' },
  { icon: 'confirm', key: 'inst_a3' },
]
const IOS_STEPS = [
  { icon: 'share', key: 'inst_i1' },
  { icon: 'addhome', key: 'inst_i2' },
  { icon: 'add', key: 'inst_i3' },
]
const INAPP_STEPS = [
  { icon: 'dots', key: 'inst_x1' },
  { icon: 'browser', key: 'inst_x2' },
  { icon: 'install', key: 'inst_x3' },
]

export const STEP_SETS = { android: ANDROID_STEPS, ios: IOS_STEPS, inapp: INAPP_STEPS }

// kind: native | menu | ios | ios-open-safari | in-app | desktop | unsupported | installed
export function sheetModel(env) {
  switch (env) {
    case 'android-chrome-can-prompt':
      // Normally the tap opens the browser's own install box at once; the steps are the fallback.
      return { env, kind: 'native', titleKey: 'inst_a_title', steps: ANDROID_STEPS, hintKey: 'inst_a_hint', native: true, copy: false, qr: false }
    case 'android-chrome-no-prompt':
      return { env, kind: 'menu', titleKey: 'inst_a_title', steps: ANDROID_STEPS, hintKey: 'inst_a_hint', native: false, copy: false, qr: false }
    case 'android-other-browser':
      return { env, kind: 'menu', titleKey: 'inst_a_title', steps: ANDROID_STEPS, hintKey: 'inst_a_hint', tipKey: 'inst_a_chrome_tip', native: false, copy: true, qr: false }
    case 'ios-safari':
      return { env, kind: 'ios', titleKey: 'inst_i_title', steps: IOS_STEPS, noteKey: 'inst_i_note', native: false, copy: false, qr: false }
    case 'ios-other-browser':
      return { env, kind: 'ios-open-safari', titleKey: 'inst_io_title', bodyKey: 'inst_io_body', thenKey: 'inst_io_then', steps: IOS_STEPS, noteKey: 'inst_i_note', native: false, copy: true, qr: false }
    case 'in-app-browser':
      return { env, kind: 'in-app', titleKey: 'inst_x_title', bodyKey: 'inst_x_body', steps: INAPP_STEPS, orKey: 'inst_x_or', native: false, copy: true, qr: false }
    case 'desktop-chrome-edge':
      return { env, kind: 'desktop', titleKey: 'inst_d_title', bodyKey: 'inst_d_body', pcKey: 'inst_d_pc', steps: [], native: false, copy: true, qr: true }
    case 'desktop-other':
      return { env, kind: 'desktop', titleKey: 'inst_d_title', bodyKey: 'inst_d_body', steps: [], native: false, copy: true, qr: true }
    case 'installed':
      return { env, kind: 'installed', titleKey: 'inst_done_title', steps: [], native: false, copy: false, qr: false }
    default:
      return { env: 'unsupported', kind: 'unsupported', titleKey: 'inst_u_title', bodyKey: 'inst_u_body', steps: [], native: false, copy: true, qr: true }
  }
}

// Every string key a model uses (for the "both languages exist" test).
export function modelKeys(m) {
  return [m.titleKey, m.bodyKey, m.hintKey, m.tipKey, m.noteKey, m.thenKey, m.orKey, m.pcKey, ...m.steps.map((s) => s.key)].filter(Boolean)
}
