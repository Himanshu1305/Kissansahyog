# Batch 10C — screenshots (Task F)

100 PNGs in `screens/` (`_list.txt`), made by `node scripts/batch10c/shots.mjs` against `vite preview` (staging build),
360 and 412 px wide, Hindi and English, 2x pixel density. Guide pages: hub (full page and top), each demo mid-play,
finished and top; tour mid-play and finished; hub at 4 / 4. Entry points (viewport-sized): welcome, home, top bar on
`/` and `/browse`, footer, how-to-use, signup with the help pill, signup with the sheet open, login, post step 1
(FAKE local session, nothing submitted), browse. Page errors during the run: 0.

## Looked at (Read tool), one line each

| File | What I saw |
|---|---|
| guide-hub-360-hi.png (full page) | Hero, 0 / 4 ring, four cards, tip, locked badge, footer with "गाइड" link: no overlap, no clipped Hindi, no sideways scroll. The fixed bottom tab bar shows across card 2 only because it is a full-page capture (not on a real screen). |
| guide-register-midplay-360-hi.png | Caption "सूची में से अपना गाँव चुनिए।", finger dot on the "खुरई / सागर" suggestion, real labels and the "कम से कम 8 अक्षर" hint; text fits; the half-hidden label at the top of the mock screen is the mock screen scrolled, as intended. |
| entry-signup-sheet-360-hi.png | Sheet over Signup: title "रजिस्टर कैसे करें", "✕ बंद करें", sample name/number with "नमूना" tags, no OTP step; nothing clipped. |
| guide-post-finished-412-en.png | Finish card "You have learned how to post." with Next demo / Watch again / Try it in the real app; buttons wrap cleanly to two lines; steps list ticked. |
| guide-find-finished-360-hi.png | Hindi finish card and three buttons fit at 360; long step captions wrap to two lines, no ellipsis. |
| guide-tour-midplay-412-hi.png | Weather sample: 7 day chips (रवि…शनि) fit the phone width, chosen day "बुध 25°" highlighted, "नमूना" tag. Large empty area under the chips inside the phone (cosmetic, not a defect). |
| entry-welcome-360-hi.png | Saffron "रजिस्टर कैसे करें? 1 मिनट का डेमो" card above "नया खाता बनाएं"; both above the bottom bar; "गाइड" pill in the top bar. |
| entry-home-412-en.png | "First time? Learn in 1 minute" card right under the open-info strip, first screen; top bar "▶ Guide" pill fits. |
| entry-post-step1-360-en.png | Logged-in (fake) top bar: logo picture hidden as decided (D3), name, Guide pill, हिं/EN, avatar, menu all fit; help pill "Need help? Watch the demo" sits under the how-to link, above the category tiles; label wraps to 3 lines inside the pill (readable). |
| entry-nav-browse-360-en.png | Top bar fine; the Browse title shows "Browse nea…" next to the "How do I get the number?" pill — the known English truncation at <= 360 px (DECISIONS C6, HUMAN-REVIEW). |

No new problem found. Known, already-recorded item: Browse English title truncation at 320/360 px (C6).
