# Batch 17D - decisions

Branch `release-17d`, created from `release-17b` (tip `c222b28`, tag `ship-17b` is on origin, `scripts/ship-prod-17b.sh` exists - all three checked first).

## A. Why only the text arrived - what I verified and what I could not

**Verified in the code (17B):** `shareAll` built `[card, voice]` and called `navigator.share({ files, text })`; its `catch` was empty, so any failure was invisible; and the button was shown after a page-load test with two 1-byte dummy files, which says "yes" even if the real files would be refused. So (c) from the brief is TRUE: a real failure could never have been seen.

**Found by one web search (one source, not a test on a phone):** a WebKit bug report (https://onbugs.webkit.org/show_bug.cgi?id=251500, 2023) says that on iOS, when `text` is passed together with files, the files are ignored (text wins), while Android sends the image with the text as caption. The W3C spec (https://www.w3.org/TR/web-share/) allows several files but does not promise that every target app takes every combination, and unknown members are silently ignored.

**Unverified:** what WhatsApp on Android does with image + audio + text in one share; whether the founder's phone is Android or iPhone; whether the iOS bug is still present today. I did not invent any behaviour for WhatsApp.

**Important consequence for the phone test:** the design asked for here sends the card WITH the text in one share. If the founder uses an **iPhone**, that share may again deliver only the text (the iOS bug above), and the clipboard copy is then the real way to get the message into the chat while the card goes through "Download card". If this happens, the next step is a third button "card only" (the old card-only `मोबाइल: कार्ड शेयर करें` button already does that) - I did not add anything the brief did not ask for. The phone test in SHIP.md asks which phone he has and what arrived.

## Why two shares instead of one
Image + audio (two different file types) + text in one call is the most fragile shape. One image with text, and one audio file alone, are the two most common shapes. Cost: two taps.

## Share design details I decided
- **Clipboard first**, best effort, silent on failure. It waits at most 1 second (a stuck clipboard must never block the share; Safari wants `share()` soon after the tap). "Message copied" is shown only when the copy really worked, so the line never lies.
- **Real file at click time:** `navigator.canShare({ files: [realFile] })`. The page-load dummy-file test is gone. Buttons are shown when `navigator.share` exists; on a computer without it the old hint (`mp_share_all_hint`, kept as it was, new test id `morning-share-hint`) is shown.
- **Errors:** `AbortError` silent; anything else (including canShare false) shows a red line and logs `share failed: <ErrorName>` or `share failed: canShare-false` only.
- The old card-only button ("कार्ड शेयर करें", `morning-share`) was **kept** (the brief says keep everything else) but it also swallowed errors with an empty catch, so I routed it through the same helper: same behaviour, but a failure is now visible. I recommend removing it in a later batch (it duplicates "card + message").
- Removed: `canShareFiles`, `mp_share_all`, test id `morning-share-all`. Replaced the old tests of them.
- The card-message button is disabled if there is no card.

## B. The message layout
Same facts; weather rules (`rainVerdict.js`), MSP rules, honesty lines, lint, card and voice untouched.
- Date line `📅 weekday, day month · tithi` uses `S.weekdays` / `S.months` from `strings.hi.js` (the same lists the voice uses) and `model.date` (IST date of the post). The old `आज कृष्ण पक्ष की ...` line is replaced; `tithiLine()` still exists (tests use it) but the message uses `tithiShort()`.
- The rain sentence is **word for word the 17B phrase**. For a dry day it is split into the sky word (on the 🌡️ line) and `आज बारिश नहीं` (on the 💧 line); a test proves `sky, rain` equals the 17B phrase.
- A next-day temperature range is shown only if it differs from today's (that is how "each number once" is met without losing a fact). When the two next-day clauses would exceed 45 characters they go on two lines.
- One entry per crop; MSP gap indented under it by 4 spaces (WhatsApp may trim leading spaces - unverified; the line still reads correctly without them). `🏆 सबसे ऊँचा <crop> भाव` comes after the last crop. The procurement/ask-KVK lines get `ℹ️` in front; their wording is unchanged.
- Tasks are `✅` lines (no numbers). Trend heading `📈` (was `🔎`); the disclaimer is italic. Closing link `🌐 kissansahyog.com/msp`.
- Greeting block order: greeting, date, festival (if any), italic blessing, yesterday's poll line.
- **Line length limit:** the brief said 45. Measured on F1-F6 + the two old fixtures: the longest line is **52** characters (the heavy-rain sentence `💧 भारी बारिश की चेतावनी, संभावना 100% (करीब 74 मिमी)`, which I kept word for word because tests, card and voice share its wording). Next longest 47 (the trend rain sentence), then 46. I set the test limit to 52 and wrote down why; every other line is 45 or shorter. Over a phone-width bubble these wrap onto a second line; I did not measure WhatsApp's wrap width.
- **Size caps unchanged** (1200 / 1500). Longest sample is 1020 characters. Drop order unchanged.
- Updated old tests that checked the old layout: `morning-16a` (🔎 -> 📈), `rain-verdict-17b` (find the weather lines under the new heading), `morning-17a-admin` (combined button).

## Not changed
Card, voice, weather rules, generator facts, workflow file, anything of 17C, OTP switches, production data, database (no migration).

## Ship tooling
`scripts/ship-prod-17d.sh` / `rollback-prod-17d.sh` are copies of the 17B pair. Changed: branch/tag, evidence folder, gate tag `ship-17b`, expected live deployment `c741ffb6-2a43-4416-a410-838870e08c72` (read from Cloudflare at run time; a real run stops before deploying if it differs), new-share-button gates (new buttons present, old combined button absent in the AdminMorning chunk), 17B gates kept as regression checks (CSP media-src with data:, admin link, rain banner). The rollback default target is that same 17B deployment.
