# Batch 19-C notes

**Picture field (admin, Content tab, Announcements form).** The bare browser file input is now a big green button
(`PictureField` in `src/screens/admin/tabs/AnnouncementsPanel.jsx`): label tied to the real input, 56 px high, full width, 17 px bold white text,
camera icon. The input stays in the page (`sr-only`, `data-testid="ann-image"`), keyboard focus shows an amber ring on the button.
States: uploading (button disabled, "Uploading…", aria-live), success (green check line, 96 px preview, remove button, button text changes),
error (red alert box right under the button). Hint is 14 px, normal ink. Alt-text labels say "required when a picture is added" only when a picture is set,
otherwise "(optional)". Validation and upload code are unchanged.

New strings (adminStrings.js): adm_ann_image_choose (तस्वीर चुनें / Choose a picture), adm_ann_image_change (दूसरी तस्वीर चुनें / Choose a different picture),
adm_ann_image_uploading (अपलोड हो रही है… / Uploading…), adm_ann_image_added (तस्वीर जुड़ गई / Picture added),
adm_ann_alt_required, adm_ann_alt_optional; adm_ann_image_hint reworded.

**mpdah.gov.in hidden.** Its certificate has expired. Entry commented out in `src/content/pashupalan/links.js` with a TODO to restore it; the buttons, text lines
and the source entry that used it were removed from desi-gay-anudan, gaushala-anudan (now an empty links list, it has noLink), kamdhenu-yojana and hub.
`CONTENT_FOR_REVIEW.md` regenerated. No test counted links by number, so none needed a count change.

Tests: `tests/unit/admin-picture-19c.test.mjs` (10 tests). Browser proof: `proof.json` (screenshots kept locally in evidence/, not committed).
