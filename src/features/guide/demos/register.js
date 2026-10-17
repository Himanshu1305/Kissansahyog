// Register demo — mirrors src/screens/Signup.jsx (Batch 10A form) field by field, with the
// app's own labels and placeholders (string keys / disclaimers.js). Format: see ../engine.js.
// OTP steps (Send OTP → 6-digit code → number verified) exist ONLY when otpLive is true
// (GUIDE_OTP_LIVE, HARD RULE 6). They are marked otp: true (steps and nodes).
import { disclaimers } from '../../../lib/i18n/disclaimers.js'
import { GUIDE_OTP_LIVE } from '../config.js'

const raw = (s) => ({ raw: s })

export function buildRegisterDemo({ otpLive = false } = {}) {
  const otp = otpLive === true
  const screens = [
    {
      id: 's1',
      title: 'signup_title',
      nodes: [
        { type: 'pill', text: [raw('✓ '), 'free_registration'] },
        { type: 'field', id: 'name', label: 'full_name', ph: 'full_name_ph', req: true, sample: true },
        { type: 'field', id: 'mobile', label: 'phone_number', ph: 'phone_ph', req: true, sample: true },
        ...(otp ? [
          { type: 'button', id: 'otp_send', text: 'guide_otp_send', variant: 'secondary', otp: true },
          { type: 'field', id: 'otp_code', label: 'guide_otp_label', ph: raw('_ _ _ _ _ _'), req: true, otp: true, hidden: true },
          { type: 'p', id: 'otp_ok', text: [raw('✓ '), 'guide_otp_ok'], tone: 'ok', otp: true, hidden: true },
        ] : []),
        { type: 'field', id: 'email', label: 'email_label', ph: 'email_ph', req: true },
        { type: 'field', id: 'password', label: 'password_label', ph: 'password_ph', req: true, hint: 'password_ph', button: 'password_show', buttonStyle: 'outline' },
        { type: 'field', id: 'place', label: 'village_town', ph: 'village_ph', req: true, button: 'loc_find', hint: 'place_field_hint' },
        { type: 'list', id: 'place_list', hidden: true, items: [{ id: 'place_pick', text: 'guide_s_village', aside: 'guide_s_district' }] },
        { type: 'chosen', id: 'place_chosen', label: 'village_town', hidden: true, text: [raw('📍 '), 'guide_s_village', raw(', '), 'guide_s_district'], action: 'loc_change_short' },
        { type: 'h', text: 'vis_title' },
        { type: 'check', id: 'vis', text: 'vis_show', on: true, box: true },
        { type: 'p', text: 'vis_explain' },
        { type: 'h', id: 'notice', text: 'disclaimer_title', big: true },
        { type: 'banner', id: 'notice_box', copy: disclaimers.signup },
        { type: 'check', id: 'accept', text: 'disclaimer_accept_label', box: true },
        { type: 'button', id: 'register', text: 'accept_and_continue' },
      ],
    },
    { id: 's2', title: 'app_name', nodes: [{ type: 'done', title: 'guide_reg_done_t', text: 'guide_reg_done_d' }] },
  ]

  const steps = [
    { do: 'type', target: 'name', text: 'guide_s_name', say: 'guide_reg_1' },
    { do: 'type', target: 'mobile', text: raw('9876543210'), say: 'guide_reg_2' },
    ...(otp ? [
      { do: 'tap', target: 'otp_send', reveal: ['otp_code'], say: 'guide_reg_otp_1', otp: true },
      { do: 'type', target: 'otp_code', text: raw('482159'), reveal: ['otp_ok'], say: 'guide_reg_otp_2', otp: true },
    ] : []),
    { do: 'type', items: [{ target: 'email', text: raw('ram@example.com') }, { target: 'password', text: raw('••••••••') }], say: 'guide_reg_3' },
    { do: 'type', target: 'place', text: 'guide_s_village', reveal: ['place_list'], say: 'guide_reg_4' },
    { do: 'tap', target: 'place_pick', hide: ['place', 'place_list'], reveal: ['place_chosen'], say: 'guide_reg_5' },
    { do: 'look', target: 'vis', say: 'guide_reg_6' },
    { do: 'look', target: 'notice_box', say: 'guide_reg_7' },
    { do: 'check', target: 'accept', say: 'guide_reg_8' },
    { do: 'tap', target: 'register', go: 's2', fx: true, say: 'guide_reg_9' },
  ]

  return { id: 'register', first: 's1', screens, steps }
}

export default buildRegisterDemo({ otpLive: GUIDE_OTP_LIVE })
