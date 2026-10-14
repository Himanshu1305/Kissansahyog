# Android permissions — what each one is for (DRAFT)

Source of truth: `android/app/src/main/AndroidManifest.xml:39-54` (production and staging builds
use the same manifest; only the app id / label / cleartext flag differ,
`android/app/build.gradle:18-19`). Written from branch `android-app`, HEAD `05afb36`.

| Permission | Protection level | Why the app needs it | Evidence |
|---|---|---|---|
| `INTERNET` | normal | Everything: prices, weather, listings, login | `AndroidManifest.xml:41` |
| `ACCESS_NETWORK_STATE` | normal | Know when the phone is offline, show the offline notice and the time of the saved data | `AndroidManifest.xml:42-43`; `@capacitor/network` (`package.json`), `src/lib/offline/status.js:42` |
| `ACCESS_COARSE_LOCATION` | dangerous (runtime) | Nearby listings, local mandi, weather, distances | `AndroidManifest.xml:44-45` |
| `ACCESS_FINE_LOCATION` | dangerous (runtime) | Same features; the "share my location" button asks the WebView for a high-accuracy fix | `AndroidManifest.xml:46`, `src/lib/location/userLocation.js:92-100` |
| `RECORD_AUDIO` | dangerous (runtime) | Voice search (mic button) | `AndroidManifest.xml:47-49` |
| `MODIFY_AUDIO_SETTINGS` | normal | Required together with RECORD_AUDIO by Capacitor's WebView before it grants the mic | `AndroidManifest.xml:47-50` (comment) |

NOT requested: background location (`ACCESS_BACKGROUND_LOCATION`), camera (photo picker is a file
input without capture, `AndroidManifest.xml:51`), contacts, SMS, call log, storage, notifications
(push is not implemented — `docs/review/batch9/PUSH_PLAN.md`). Hardware features location, GPS and
microphone are marked `required="false"` so phones without them can still install
(`AndroidManifest.xml:52-54`).

---------------------------------------------------------------------

## 1. Location (coarse and fine) — foreground only

**When it is asked:** only after the user presses a location button. The app first shows its own
card; the Android prompt appears only after the user agrees (`src/lib/location/userLocation.js:90-91`
"only call it after the visitor agreed"). The user can always type or pick a village/town instead.

**Two uses:**

1. **"मेरी लोकेशन / Share my location"** (location banner, Mausam, nearby):
   - asks for a high-accuracy position (`enableHighAccuracy: true`, 15 s timeout,
     `src/lib/location/userLocation.js:92-100`);
   - the place is saved **on the phone only** (`localStorage`, `userLocation.js:36-42`), with a
     "Clear my location" button (`docs/review/BATCH7L2_REPORT.md:150-156`);
   - for weather, the position is rounded to the centre of a 0.1° cell (about 10 km) before it is
     sent to our weather table or to Open-Meteo (`BATCH7L2_REPORT.md:121-134`);
   - for "offers near you", an area box is sent in the query and not stored
     (`BATCH7L2_REPORT.md:147`);
   - to show a place name, the exact position may be sent to BigDataCloud when it is not close to
     a known place (`src/lib/location/locationStore.js:17-27`, `BATCH7L2_REPORT.md:150-151`).
2. **Post form "use my current location"** (only when posting a listing):
   - low-accuracy fix (`enableHighAccuracy: false`): first a position the phone already has (up to
     10 minutes old), else a fresh network/Wi-Fi fix up to 20 s, else the user types the village
     (`src/lib/location/postPosition.js:1-40`);
   - the coordinates are saved **on the listing, which is public**, without rounding
     (`BATCH7L2_REPORT.md:144`). Open decision, backlog B9 (`docs/review/batch9/BACKLOG.md:31`):
     round to ~1 km or the village centre before saving. Recommended before release.

**Coarse vs fine:** FINE is declared because use 1 asks for high accuracy. If the founder decides
to drop FINE (coarse is enough for town-level features and weather is rounded anyway), both
location features would still work at ~1–3 km accuracy; that is a code + manifest change for a
later batch, not done tonight. On Android 12+ the user can already choose "Approximate" in the
system prompt and the app keeps working.

**Play Console declaration:** Play's location *declaration form* is only for **background**
location. This app has none, so no declaration form is needed. The Data safety form must still
list Approximate and Precise location (see `data-safety-answers.md` §2.1).

Wording if Play (or a reviewer) asks why location is used — paste as is:

> Kisan Sahyog uses your location only while the app is open and only after you press a location
> button. It is used to show nearby farm listings, your local mandi prices, the weather for your
> area and distances to cold storages and fairs. For weather, the position is rounded to about
> 10 km before it leaves the phone. If you choose "use my current location" while posting a
> listing, that position is saved with your public listing. Location is never used in the
> background, never used for ads, and you can always type your village instead.

Hindi (for an in-app explanation, if one is added):

> किसान सहयोग आपकी लोकेशन सिर्फ़ तब लेता है जब ऐप खुला हो और आप लोकेशन वाला बटन दबाएँ। इससे पास की
> लिस्टिंग, आपकी मंडी के भाव, आपके इलाके का मौसम और कोल्ड स्टोरेज/मेले की दूरी दिखाई जाती है। मौसम के
> लिए लोकेशन फ़ोन से भेजने से पहले लगभग 10 किमी तक गोल कर दी जाती है। लिस्टिंग डालते समय "मेरी अभी की
> लोकेशन" चुनें तो वह लोकेशन आपकी सार्वजनिक लिस्टिंग के साथ सेव होती है। लोकेशन कभी बैकग्राउंड में या
> विज्ञापन के लिए इस्तेमाल नहीं होती; आप चाहें तो गाँव का नाम लिख सकते हैं।

---------------------------------------------------------------------

## 2. Microphone (`RECORD_AUDIO`) — voice search

**When it is asked:** only when the user taps the mic button, and the mic is shown in the app only
if the server says transcription is configured (`src/lib/voice/voiceSearch.js:31-35` comment,
`:68-90` `transcribeConfigured()` → `GET /transcribe` → `{ configured }`,
`functions/transcribe.js:81-83`).

**Exactly what happens to the audio (verified in `functions/transcribe.js`):**

1. In the Android app the phone's built-in speech recognition is not used (the WebView has no
   speech service, `src/lib/voice/voiceSearch.js:31-35`), so the app records a short clip with
   `MediaRecorder` (Android: `audio/webm`, `voiceSearch.js:38-52`).
   Recording stops automatically after 15 seconds (`src/components/VoiceSearchButton.jsx:140`).
2. The clip is POSTed as form field `audio` (`src/components/VoiceSearchButton.jsx:122-123`) to our Cloudflare Pages Function
   `https://kissansahyog.com/transcribe` (staging build: `https://staging.kissansahyog.com`)
   (`src/lib/apiBase.js:9-15`).
3. The function rejects other websites (`transcribe.js:54-79,88`), refuses if no key is set
   (`:89-92`), applies a rate limit of 20 calls per IP per hour (`:22-23,94-95`). The rate limit
   stores **only the caller's IP address and the time** in table `voice_transcribe_calls`; rows
   older than one day are deleted on the next call
   (`supabase/migrations/0034_voice_transcribe_rate_limit.sql:6-10,33-34`). If the database is
   not reachable the check is skipped (fail-open, `transcribe.js:34-52`).
4. The audio (max 18 MB, `:106`) is base64-encoded **in memory** (`:112-118`) and sent over HTTPS
   to **Google's Gemini API** — `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`,
   default model `gemini-3.5-transcribe` (overridable by the `GEMINI_MODEL` env var), with a
   prompt asking for a Hindi transcription only (`:21,120-139`).
5. Only the text is returned to the phone (`:144-147`). On an error, up to 200 characters of
   Google's error message (not the audio) are returned (`:140-142,148-149`).
6. **Our code never writes the audio anywhere** — no database insert, no storage upload, no log of
   the audio. Not under our control: Google's own handling under the Gemini API terms
   (HUMAN-REVIEW: confirm the key is on a paid tier, where Google does not use prompts to improve
   its products; on the free tier it may), and Cloudflare's standard request logs.

**Play Console:** there is no declaration form for the microphone. Data safety: "Voice or sound
recordings — collected, processed ephemerally, optional, App functionality"
(`data-safety-answers.md` §2.5).

Wording if asked — paste as is:

> Kisan Sahyog uses the microphone only when you tap the mic button to search by voice. The short
> recording is sent over a secure connection to our server, which passes it to Google's Gemini
> speech service to turn it into text, and the text is used for your search. We do not store the
> recording. The microphone is never used in the background.

Hindi:

> किसान सहयोग माइक का इस्तेमाल सिर्फ़ तब करता है जब आप बोलकर खोजने के लिए माइक बटन दबाते हैं। छोटी
> रिकॉर्डिंग सुरक्षित कनेक्शन से हमारे सर्वर पर जाती है, जो उसे लिखित शब्दों में बदलने के लिए Google
> की Gemini सेवा को भेजता है; उन शब्दों से आपकी खोज होती है। हम रिकॉर्डिंग सेव नहीं करते। माइक कभी
> बैकग्राउंड में इस्तेमाल नहीं होता।

---------------------------------------------------------------------

## 3. Network state (`ACCESS_NETWORK_STATE`)

Lets the app know when the phone has no connection so it can show the offline notice and the
last-saved public data with its time, instead of an endless spinner
(`AndroidManifest.xml:42-43`; `src/lib/offline/status.js:42`; `src/lib/offline/policy.js:8,11`).
Normal permission — no prompt, no declaration.

---------------------------------------------------------------------

## Open items for a human

- B9: round the Post-form position before saving (public listing). `BACKLOG.md:31`.
- Gemini API tier (free vs paid) decides the Data-safety "shared" answer for audio.
- Optional: drop `ACCESS_FINE_LOCATION` and use low accuracy everywhere (code + manifest change).
