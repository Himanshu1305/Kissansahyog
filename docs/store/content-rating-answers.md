# Content rating (IARC questionnaire) — suggested answers (DRAFT)

Play Console → Policy → App content → Content rating → Start questionnaire. The IARC wording
changes from time to time; match each answer below to the closest question on screen. Answers
are based on what the app really contains (branch `android-app`, HEAD `05afb36`). Final
submission: founder. Nothing has been submitted.

## Step 1 — Contact and category

| Field | Answer |
|---|---|
| E-mail for IARC | usdvisionai@gmail.com |
| Category | **"All other app types"** (on older forms: "Utility, Productivity, Communication, or Other"). Reason: the app is a farming information + classifieds/contact app, not a game, not a store selling digital goods, not primarily news. HUMAN-REVIEW if the form offers "Reference, News, or Educational" — that also fits the information part; pick one and keep the same answers below. |

## Step 2 — Content questions

| Question (paraphrased) | Answer | Why / evidence |
|---|---|---|
| Violence, blood, gore | **No** | Farming information and listings only |
| Fear / horror | No | — |
| Sexual content, nudity | No | — |
| Crude humour / profanity | **No** (in our content). User-generated text is moderated (see below) | — |
| Controlled substances (drugs, alcohol, tobacco) — references or use | **No** | Agri inputs are seeds/fertiliser/pesticide listings, not drugs (`src/lib/listings/catalog.js:7`). HUMAN-REVIEW: if a listed crop is tobacco in mandi prices, that is a crop price, not promotion — still "No" |
| Gambling, simulated gambling, real-money betting | **No** | — |
| Discriminatory content | No | — |
| Promotes purchase of digital goods / in-app purchases | **No** — no payments at all | `src/lib/i18n/legal.js:23` |
| Does the app contain ads | **No** | `docs/store/data-safety-answers.md` §4 |

## Step 3 — Interactive elements

| Question | Answer | Why / evidence |
|---|---|---|
| Can users interact with or exchange content with each other (user-generated content, messaging)? | **Yes** | Users post public listings, Q&A questions, success stories, Kisan Mela entries; a viewer can see a seller's name and number after tapping "show number" (`src/lib/listings/listingsApi.js:257-262`). There is **no chat** inside the app. |
| Is user-generated content moderated / can users report it? | **Yes** — Q&A questions, success stories and mela entries are saved unpublished until an admin approves; listings have a "Report" button and a grievance route | `src/lib/community/communityApi.js:96,141` (`is_published: false`), `src/lib/mela/melaApi.js:69` (`moderation_status: 'pending'`), `src/lib/reports/reportsApi.js:9`, `src/lib/i18n/legal.js:80-81` |
| Does the app share the user's **physical location** with other users? | **Yes (conservative)** — if a seller uses "use my current location" on the Post form, that position is saved on the public listing and others can see distance/location | `src/lib/location/postPosition.js`, `docs/review/BATCH7L2_REPORT.md:144`. If backlog B9 rounds it to the village centre, the answer can stay "Yes" (village-level) |
| Does the app share personal information with third parties / other users? | **Yes** — name and mobile number are shown to another user who taps "show number" (user-chosen at registration: "show my details", `supabase/migrations/0060_one_registration.sql:45,103`) | — |
| Unrestricted internet access (in-app browser to any site)? | **No** — external links (YouTube, WhatsApp, Google Maps, scheme sources) open outside the app | `src/lib/videos/videosApi.js:28`, `src/lib/share/shareMessages.js:73`, `src/lib/coldStorage/coldStorageApi.js:66` |
| Digital purchases | No | — |

## Expected result (not guaranteed — IARC decides)

Generally "Everyone / 3+" for content, with interactive-element notices such as
**"Users Interact", "Shares Location"** (and possibly "Shares Info"). India uses the IARC generic
rating. The exact output is unknown until the form is submitted — record it in
`store-checklist.md` when done.

## Related: Target audience and content (separate Play form)

| Field | Suggested answer | Why |
|---|---|---|
| Target age groups | **18 and over** only | Farmers dealing in land, equipment and labour offline. HUMAN-REVIEW: the current Terms do not state a minimum age (searched `src/lib/i18n/legal.js` and `docs/legal/TERMS_DRAFT_FOR_LAWYER.md`) — ask the lawyer to add "18 or older". Choosing under-13 groups would pull in the Families policy, which the app is not built for. |
| Could the app unintentionally appeal to children? | No | No characters, games, or child-directed content |
| Store presence for kids ("Teacher approved" etc.) | Not applicable | — |
