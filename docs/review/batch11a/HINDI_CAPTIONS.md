# Batch 11A — new Hindi wording (HUMAN-REVIEW)

All new farmer-facing text is in `src/lib/i18n/strings.js` (hi + en). Please read the Hindi column; change only the Hindi there if needed (keys stay). `{phone}` / `{s}` are filled in by the app.

| key | Hindi | English | where |
|---|---|---|---|
| otp_send_code | कोड भेजें | Send code | login: mobile button when OTP is on |
| otp_sent_to | {phone} पर 6 अंकों का कोड SMS से भेजा गया है। | We sent a 6-digit code by SMS to {phone}. | code step, top line |
| otp_code_label | 6 अंकों का कोड | 6-digit code | code box label (screen readers too) |
| otp_verify_button | कोड जाँचें | Check code | code step button |
| otp_resend | कोड दोबारा भेजें | Send the code again | resend button |
| otp_resend_in | {s} सेकंड बाद दोबारा भेज सकते हैं | You can ask again in {s} seconds | resend button during the 30 s countdown |
| otp_change_number | नंबर बदलें | Change number | back to the number |
| otp_verified | नंबर की पुष्टि हो गई | Number verified | after a right code |
| otp_resent | नया कोड भेज दिया गया है। | A new code has been sent. | after a resend |
| otp_signup_title | अपना मोबाइल नंबर पक्का करें | Confirm your mobile number | sign-up code card heading |
| err_otp_wrong | कोड सही नहीं है। SMS में आया कोड देखकर दोबारा लिखें। | That code is not right. Check the SMS and type it again. | wrong code |
| err_otp_expired | यह कोड अब काम नहीं करेगा। "कोड दोबारा भेजें" दबाएँ। | This code no longer works. Tap "Send the code again". | expired / used code |
| err_otp_too_many | बहुत बार कोशिश हो गई। कुछ देर बाद फिर कोशिश करें। | Too many tries. Please try again after some time. | too many tries or sends |
| err_otp_cooldown | कोड अभी-अभी भेजा गया है। थोड़ा रुककर दोबारा माँगें। | A code was just sent. Please wait a little before asking again. | asked again too soon |
| err_otp_service_busy | SMS सेवा अभी व्यस्त है। थोड़ी देर बाद फिर कोशिश करें। | The SMS service is busy right now. Please try again in a little while. | SMS provider down / not set up |
| err_otp_code_format | SMS में आया 6 अंकों का कोड लिखें। | Type the 6-digit code from the SMS. | not 6 digits |
| err_otp_required | अब मोबाइल नंबर SMS कोड से पक्का होता है। कृपया दोबारा कोशिश करें। | Mobile numbers are now confirmed with an SMS code. Please try again. | old app path refused while OTP is on |
| err_not_authenticated | आपका लॉग इन खत्म हो गया है। कृपया फिर से लॉग इन करें। | You have been logged out. Please log in again. | signed out because the session ended (login screen notice) |

Status: **HUMAN-REVIEW** (written by Claude; not yet read by a native speaker). Unchanged: the 6-digit example `482159` in the guide demo is shown only when GUIDE_OTP_LIVE is true (still false).
