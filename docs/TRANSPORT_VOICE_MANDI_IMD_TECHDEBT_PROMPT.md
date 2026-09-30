# Kisan Sahyog — Legacy Test Cleanup, Transport Category, Voice Search, Mandi Data Reliability, IMD Research, Tech Debt

DO NOT ask for approval or questions. Decide and proceed. Read PROJECT_CONTEXT.md, KNOWN_ISSUES.md, and `docs/review/LEGACY_E2E_AUDIT.md` first — Phase 1 executes that audit's findings directly, it does not re-investigate from scratch.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy only after the final Phase passes:** `npm run build && npx wrangler pages deploy dist --project-name kissansahyog`

**One migration file for any schema changes in this prompt** — use the next available number, check the migrations folder first.

**Commit after every phase.** This is a large, multi-part prompt. If interrupted (session limit, crash), a fresh session must run `git log --oneline -20` and check for each phase's review-doc artifact before resuming — continue from the first phase with no commit, do not restart from Phase 1.

**Explicitly excluded from this prompt:**
- Actual WhatsApp message sending — API still not obtained.
- Vegetable category — still waiting on the owner's list.

---

## Phase 1 — Rewrite the 22 legacy E2E tests (establish a clean baseline first)

Execute `docs/review/LEGACY_E2E_AUDIT.md`'s findings directly:
- **22 tests marked "Rewrite"** — update selectors/assertions to match current reality per the audit's specific finding for each one, organized around its 6 identified root causes (homepage-as-landing; the vendor source step before Offering/Looking-for; Land's numeric `size_acres`; the mandatory rules-compliance checkbox gating Submit; `chip-<cat>` testids replacing `tab-<cat>` with Land last; integer `"N km away"` distance format). Do not re-derive these from scratch — the audit already did that work; apply its conclusions.
- **1 test marked "Merge"** (phase8 offline-shell) — remove it, already covered by the passing `phase10_location_pwa` offline test.
- Before starting, run a fresh build (`npm run build`, delete any existing `dist/` first) and confirm the failure count matches the audit's baseline (23 failing) — if it doesn't match, something changed since the audit; investigate before proceeding rather than assuming the audit is still accurate.
- After rewriting, run the full suite and confirm all 22 rewritten tests pass, the 1 merged test is cleanly removed with no orphaned references, and this doesn't reduce the total meaningful test count (rewriting ≠ deleting coverage).

This establishes a genuinely clean baseline before any new feature work in this prompt — the remaining phases must not reduce the pass count below what Phase 1 achieves.

---

## Phase 2 — Transport/logistics as a new category

**2a. Design — anchored like every other category, not a route model.** This category works exactly like Equipment or Labour: a transporter lists themselves at their own location, the 30km/50km-fallback radius applies identically to every other category (no wide-visibility opt-in for this one), and a farmer contacts a nearby transporter via WhatsApp/Call to negotiate the actual route and price — the listing starts the conversation, same as everywhere else on this platform. Do not build origin/destination route modeling.

**2a-i. Check for a CHECK constraint before assuming `category` is open-ended.** Nearly every category-like column in this codebase has turned out to be constrained to an exact enumerated list (`sarkari_yojana.category`, and likely `listings.category` itself). Inspect the actual schema first — if a CHECK constraint enumerates allowed category values, extend it via the migration to include the new Transport category value. Do not assume a listing can simply be inserted with a new category string without checking this.

**2b. Fields:** vehicle type (ट्रैक्टर-ट्रॉली, पिकअप, ट्रक, टेम्पो — dropdown, confirm exact options against what's realistic for the pilot area before finalizing), capacity (optional, e.g. tonnage or "क्विंटल" capacity), rate basis (प्रति किमी / प्रति ट्रिप / बातचीत से — dropdown), same offer/requirement structure as every existing category.

**2c. Placement:** add as a full category — nav dropdown entry, homepage category tile (the grid grows to accommodate it), category browse page, and **the new category's routes added to `public/sitemap.xml`**. Seed 3-4 realistic dummy listings (same `is_test_data = true` pattern used for every other category) so it doesn't launch looking empty.

**2d. Check for hardcoded category counts.** Grep the codebase for anywhere the number of categories is hardcoded (e.g. "9 categories," "बाज़ार की 9 श्रेणियां," a homepage stat, sitemap generation assuming a fixed list) and update it to reflect the new count — this is exactly the kind of thing a category addition silently breaks if not checked.

**2e. Re-verify Phase 1's rewritten tests after this phase.** Several of Phase 1's 22 rewritten tests specifically assert category count and ordering (e.g. "Land is last," `chip-<cat>` totals). Adding a 10th category is exactly the kind of change that could silently re-break a test Phase 1 just fixed. After this phase is complete, explicitly re-run every Phase 1 test that touches category count or ordering and confirm it still passes with Transport included — do not assume Phase 1's fix is stable just because it passed before this phase ran.

---

## Phase 3 — Voice search: Web Speech API primary, Gemini fallback for unsupported browsers

**3a. Primary path — Web Speech API (free, client-side, no key needed).** Add a mic icon to the existing search input(s) — at minimum `/sawaal`'s search box; extend to other search inputs if any exist. On tap, request microphone permission, then use the browser's native `SpeechRecognition` with `lang = 'hi-IN'`. Transcribed text populates the search field live as the user speaks; the existing search behavior runs unchanged on the result.

**3a-i. Handle permission and recognition failures gracefully — do not leave the UI stuck.** If the user denies microphone permission: show a brief, non-blocking message ("माइक की अनुमति नहीं मिली — टाइप करके खोजें") and fall back to the normal text input, same principle as the existing LocationControl's permission-denied handling. If `SpeechRecognition` fires an `onerror` or `onnomatch` event mid-listening (no speech detected, network error, ambient noise in a real field/market environment): stop the listening state immediately, show "सुन नहीं पाया, दोबारा कोशिश करें," and return the mic button to its normal tappable state — never leave it stuck showing "listening" indefinitely.

**3b. Detect support before offering the feature.** If `SpeechRecognition`/`webkitSpeechRecognition` is not available (Safari, Firefox, unsupported browsers): do not show a broken mic icon. Instead, show the mic icon in a state that triggers the fallback path (3c) if the `GEMINI_API_KEY` secret is available, or hide the mic icon entirely and leave just the normal text input if it is not.

**3c. Fallback path — Gemini 3.5 Transcribe, only when Web Speech API is unavailable.** Before writing this integration, verify the exact current model name and required audio input format against Google's live API documentation — do not hardcode a model name from this prompt's text without confirming it's still current, given how quickly Gemini model versions have been iterating. **Also verify `MediaRecorder` support and its produced audio mimetype specifically on the browsers this fallback is meant to serve (Safari in particular)** — Safari has historically had inconsistent `MediaRecorder` support, which would mean the fallback built for exactly the browsers lacking `SpeechRecognition` runs into its own unsupported-browser problem. If `MediaRecorder` is not reliably available on a target browser, document this plainly rather than assuming the fallback works there, and consider whether the mic icon should simply not appear at all on that specific browser rather than offering a broken recording flow. Build a Cloudflare Pages Function (same pattern as the existing `/geocode` function) that receives a recorded audio clip (captured client-side via `MediaRecorder`, converted to whatever format the confirmed API actually requires) and calls the transcription model with `hi-IN` context, returning the transcribed text. **Never call Gemini directly from the browser with an exposed key** — the key lives server-side in the function only. UI for this path: tap mic → record → tap again to stop (or auto-stop after a pause in speech) → brief "सुन रहे हैं..." loading state → transcribed text populates the search field, same as the primary path's end state.

**3c-i. Basic abuse protection on the fallback endpoint — with real persistent state, not an in-memory counter.** Since this Cloudflare Function is public, unauthenticated, and each call costs real money against a billed API, add a lightweight rate limit. A naive in-memory counter inside a serverless function resets on every invocation and provides zero actual protection — it must use real persistence: a small DB-backed table tracking requester IP and timestamp (same pattern as the Nominatim serialized-queue's `last_nominatim_call_at` approach), or Cloudflare KV if available in this project's plan. This does not need to be sophisticated — just a basic, functioning guard, not full authentication, but it must actually persist across invocations to do anything at all.

**3d. Missing API key — graceful, not broken.** If `GEMINI_API_KEY` is not present as a secret when this is built: implement the full fallback code path, but have it fail gracefully (mic icon hidden on unsupported browsers, normal text search still works) rather than erroring. State plainly and prominently in the final summary and in `docs/review/` that the owner needs to (1) obtain a Gemini API key, (2) add it as the `GEMINI_API_KEY` repository secret, for the fallback to activate for Safari/Firefox users. Do not block the rest of this phase or prompt on this key being present.

**3e. CSP.** If the fallback path requires any new external domain in `connect-src` (check Gemini API's actual endpoint requirements), add it to `_headers` first and verify with a real request before building on top of it — same lesson as every prior external-API addition this session.

---

## Phase 4 — Mandi data: investigate before fixing, then apply the "yesterday's rate" labeling

**4a. Diagnose first — do not assume.** Check the actual current behavior of the mandi refresh cron and its data coverage: what is its real success rate over the last 2 weeks of runs? Is MP-wide mandi coverage (beyond Sagar-named mandis) already happening as the default daily pull, or only as an emergency fallback when Sagar-specific data is missing for a commodity? Which commodities/mandis have genuine daily data vs. sporadic gaps? Write these findings plainly in the review doc before writing any fix code.

**4b. If daily collection is already reliable and MP-wide**, this phase may need little to no code change — document that finding and move to 4c. **If genuine gaps exist** (the cron isn't running daily, or MP-wide pull only triggers as a rare fallback rather than the everyday behavior), fix the refresh script so MP-wide collection runs as standard daily behavior, not just an edge-case fallback.

**4c. Labeling — apply everywhere, including the raw ticker.** Grep for any existing "बासी," "स्टेल," or similar stale-data wording and replace with the neutral, already-established pattern from the MSP page: **"कल का भाव (dd/mm)"** (or "पिछला भाव" if the gap is more than one day — reflect the actual elapsed time honestly, don't always say "कल" if the last data is older than yesterday). Confirm this labeling is applied consistently on the raw homepage mandi ticker, not just the MSP comparison page where it may already exist — this is a consumer-audit check, verify both locations directly rather than assuming one implies the other. The specific date must always be visible next to any non-today price, never hidden in a tooltip. Genuinely never-reported commodities (zero rows ever, not just missing today) keep the existing honest "—" treatment — do not apply "yesterday's rate" wording where there is no prior data to reference.

---

## Phase 5 — IMD data feed: research first, integrate only if genuinely viable

**5a. Research, do not assume prior notes are complete.** Investigate the actual IMD API surface: confirm the real endpoint(s), whether registration/an API key is required and how to obtain one, what granularity is offered (does it cover Sagar district specifically, or only state/city level — check this precisely, since state-level data would not meaningfully improve on what's already built), uptime/reliability signals, and CORS/CSP implications for calling it from this app.

**5b. Decision gate.** If research confirms a genuinely usable, sufficiently granular, freely-accessible (or cheaply/easily registrable) feed: integrate it as an additional, clearly-sourced data point on `/mausam` (e.g., an official IMD badge alongside the existing derived classification, linking to or displaying the real IMD warning level where available) — following the same CSP-first, cache-appropriately discipline as every prior external API in this project. If research does NOT confirm this (no district-level granularity, requires paid/enterprise access, unreliable, or CORS-blocked with no viable proxy): **do not force a broken or low-value integration.** Document the finding plainly in the review doc — what was checked, what was found, why it is or isn't being integrated now — and leave the existing "derived classification + link to official IMD site" behavior unchanged.

---

## Phase 6 — Tech debt: the 4 hardcoded Hindi strings

Move the previously-flagged hardcoded strings into the i18n system: `DroneDidi.jsx`'s full paragraph, `Homepage.jsx`'s "किमी" unit label and "अ.दी." founder initials, `shared.jsx`'s "जानकारी"/"बंद करें" aria-labels, `Admin.jsx`'s "(हिं)" field label. Confirm the `v11_phase6` Devanagari-check test's remaining failure count decreases correspondingly (it should now only be failing on `mausam_h1_a` or be fully green, depending on what was already resolved in earlier sessions — check its current state first, don't assume).

---

## Phase 7 — Mandatory testing, bug-fixing, and retesting (not a formality — this is the gate for everything above)

**7a. Baseline.** After Phase 1 establishes the clean legacy-test baseline, record the exact pass count. Every subsequent phase must not reduce it — only add to it.

**7b. New permanent tests per phase, each with positive, negative, and edge cases**, committed into the existing test suite directory (not throwaway scripts):

- *Transport category:* a listing appears within 30km, does not appear beyond 50km with no fallback triggered incorrectly (positive/negative); the category-count grep fix from 2d doesn't leave any other hardcoded count stale (edge — check the actual rendered category count matches the real total everywhere it's displayed).
- *Voice search:* Web Speech API populates the search field on a mocked recognition result (positive); the mic icon is correctly hidden or shows the Gemini-fallback state when `SpeechRecognition` is undefined (positive, simulate an unsupported browser); a missing `GEMINI_API_KEY` does not crash the fallback path, it degrades gracefully (negative — this is the most important test in this phase, given the key won't exist immediately). **Any test that would call the real Gemini API must be mocked** — do not let the permanent suite hit a live, billed API on every future run; one real manual call during this session's verification is enough to prove the integration works end to end.
- *Mandi data:* the "कल का भाव (dd/mm)" label renders correctly on both the ticker and the MSP page for a stale-but-existing price, and the honest "—" still renders for genuinely never-reported commodities (positive/edge, matching Phase 4c exactly).
- *Tech debt:* the four specific strings identified no longer appear as raw Devanagari outside the i18n system (a direct regression test for Phase 6).

**7c. Downstream consumer sweep.** Explicitly re-test every existing page/feature that could be touched by this prompt's changes even indirectly: homepage (new category tile, ticker labeling), `/browse` and category navigation (new category present, existing categories unaffected), `/sawaal` (voice search added, existing search/filter/grid behavior unchanged), `/mausam` and `/msp` (labeling changes, possible IMD addition), sitemap generation (new category and any new routes present), and the admin dashboard (new category shows correctly in any admin listing/count views). Also explicitly confirm the mandi ticker still shows live prices — this exact regression has happened silently before in this project and must not recur.

**7d. Bug-fix loop.** Any failure found in 7b or 7c is fixed immediately. After any fix, re-run the ENTIRE suite from the Phase 7a baseline — not just the one failing test — since a fix can introduce a new regression elsewhere. Repeat until the full suite is green (accounting for any phases correctly left unfinished per their own decision gates, e.g. Phase 5 if IMD integration was correctly skipped) and the total test count has only increased relative to baseline.

**7e. Bilingual audit.** Every new or changed user-facing string introduced across all phases (Transport category fields and labels, voice search UI states and error messages, mandi labeling changes) goes through the existing i18n system — no hardcoded single-language text. Run the existing bilingual audit tooling and confirm it passes on the new strings.

**7f. Write `docs/review/TRANSPORT_VOICE_MANDI_IMD_TECHDEBT_REVIEW.md`** covering every phase's outcome: Phase 1's before/after test counts, Phase 4a's actual diagnosis findings, Phase 5's research findings and decision (integrated or not, and why), and confirmation that the Gemini key dependency is clearly flagged if still missing.

---

## Phase 8 — Screenshot self-review (mandatory, after Phase 7 passes, before deploy)

Screenshots at 1280×800 and 375×812 of: the new Transport category's browse page and a sample listing card; the voice search mic icon on `/sawaal` in both its Web-Speech-available state and its unsupported-browser state; the homepage ticker and the MSP page both showing the corrected "कल का भाव (dd/mm)" labeling on a stale-price example; `/mausam` (with the IMD addition if Phase 5's gate was passed, or unchanged if not — either is correct depending on 5b's finding). **View every one.**

Fix → re-screenshot → re-view until clean. Deploy, then repeat the screenshot check against the live staging URL, and re-confirm the homepage mandi ticker shows live prices on the live site specifically.

Commit message: "Legacy E2E cleanup (22 rewritten, 1 merged, clean baseline); Transport/logistics category (30km-anchored, same pattern as existing categories); voice search (Web Speech API primary, Gemini 3.5 Transcribe fallback, graceful without API key); mandi data reliability investigation + honest 'कल का भाव' labeling across ticker and MSP; IMD feed research (integrated or documented as not viable); 4 hardcoded strings moved to i18n; full test/bug-fix/retest loop; screenshot-reviewed"
