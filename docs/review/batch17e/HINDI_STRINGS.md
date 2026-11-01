# Batch 17E - Hindi strings (new and changed)

All strings are in `src/lib/i18n/morningStrings.js` (merged into `strings.js`), shown on the admin page `/admin/morning`
(the founder's phone). Plain farmer Hindi, short sentences.

| Key | Hindi | English | Where shown |
|---|---|---|---|
| `mp_share_video` | कार्ड + आवाज़ शेयर करें | Share card + voice | **NEW main button** (largest, first in the share block); also its `aria-label` |
| `mp_video_what` | कार्ड पर प्ले दबाने से आवाज़ चलेगी | Press play on the card and the voice plays | Line right under the main button (only when the video is ready) |
| `mp_video_getting_ready` | वीडियो तैयार हो रहा है... | Getting the video ready... | Text of the main button while it is disabled and the video is still downloading in the background |
| `mp_video_load_failed` | वीडियो खुल नहीं सका। नीचे के दो बटन से कार्ड और आवाज़ अलग भेजें। | Could not open the video. Send the card and the voice separately with the two buttons below. | Yellow line instead of the main button when the background download failed |
| `mp_video_none` | वीडियो अभी नहीं बना। नीचे के दो बटन से कार्ड और आवाज़ अलग भेजें। | The video is not made yet. Send the card and the voice separately with the two buttons below. | Yellow line instead of the main button when the post has no video (`has_video` false) |
| `mp_video_h` | कार्ड + आवाज़ (वीडियो) | Card + voice (video) | Heading of the video preview section (shown only when the video is ready) |
| `mp_video_player` | आवाज़ वाले कार्ड का वीडियो चलाएँ | Play the card with the voice | `aria-label` of the `<video>` preview |
| `mp_video_download` | वीडियो डाउनलोड करें (MP4) | Download video (MP4) | Link under the preview (file `morning-YYYY-MM-DD.mp4`); also on a computer, where there is no share sheet |
| `mp_share_card_msg` | सिर्फ़ कार्ड + संदेश | Card + message only | **CHANGED label** (was "कार्ड + संदेश शेयर करें"): backup button 1 - the 17D card + message share |
| `mp_share_voice` | सिर्फ़ आवाज़ | Voice only | **CHANGED label** (was "आवाज़ शेयर करें"): backup button 2 - the 17D voice share |
| `mp_share_help` | या कार्ड और आवाज़ अलग-अलग भेजें: पहले कार्ड, फिर आवाज़। दो बार शेयर करना होगा। | Or send them separately: the card first, then the voice - two shares. | **CHANGED text**: small line above the two backup buttons |

Unchanged but re-used: `mp_share_copied_note` (shown under the main button after the message was copied: "संदेश कॉपी हो गया। WhatsApp में कैप्शन खाली दिखे तो वहाँ दबाकर पेस्ट करें।"),
`mp_share_failed` (the red failure line), `mp_share_all_hint` (the computer hint), `mp_wa_text` ("WhatsApp: संदेश भेजें" - the text-only link; its label is unchanged,
only its look changed: plain grey instead of green, last in the block, so it is not tapped by mistake).

Layout rules checked in `tests/unit/morning-17e-share.test.mjs` and by the 360 px screenshots in `evidence/`: buttons at least 56 px high, every button has an `aria-label`,
no horizontal scroll at 360 px.
