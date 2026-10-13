# Batch 7L-1 report — Sagar Division wording, new location flow, places list, division mandis

Date: 2026-10-13 · Branch: `staging` · Start tag: `pre-7l1` · **Nothing committed, nothing deployed.**

Not done, as instructed: no migration applied, no deploy, no ingestion run, `.env` / `main` /
live data untouched. Stage B has not started.

## Result

| Check | Result |
|---|---|
| `npm run build:prod` | passes — 263/263 routes prerendered, 0 failed, production guard OK (`docs/review/batch7l1/BUILD_PROD_OUTPUT.txt`) |
| `scripts/verify-batch7l1.mjs` (new) | 54 passed, 0 failed |
| `scripts/shots-batch7l1.mjs` (new, Playwright, mocked Supabase) | 140/140 — five location steps × HI/EN × 390/1440, plus nearest-mandi |
| verify 7a / 7b / 7c / 7d | 76 / 88 / 58 / 78 passed, 0 failed |
| verify 6a / 6b / 6c / 6d / 6g | all pass |
| verify 5a | 47 passed, **1 failed**: it asserts the newest migration is 0053. That already fails with 0054–0056; not touched. |
| verify 5b-citations | **0 of 17 pass** ("no evidence for block…"). It checks Q&A citation evidence, which this batch does not touch. I did not re-run it at `pre-7l1` to prove it failed before. |

The home page prerenders "via fallback, no marker" as before (the home screen has never set
the ready marker; unchanged by this batch).

## Decisions I made that you should confirm

1. **Kept ", Madhya Pradesh" after the first mention in the definition sentence**
   ("…for Sagar Division (Sagar Sambhag), Madhya Pradesh, where…"). The brief said to replace
   "Sagar, Madhya Pradesh" with "Sagar Division"; I kept the state because that sentence is also
   the search/JSON-LD description. Removing it is a five-line change.
2. **Terms clause 1 changed without a version bump.** Only the area name changed (two mentions,
   Hindi and English). The page still says Version 1.2, effective 12 October 2026.
3. **Automatic device position on load** happens only when the browser has *already* granted
   permission (so no prompt can appear) and the visitor has not deliberately typed or picked a
   different place on this device. Otherwise the saved place is used.
4. **"Not now" is remembered on the device**, so the card is not shown again on every page.
   "Change → Share my location" stays available.
5. **Rows marked `verified=false` are never offered to visitors** (one row, see Places).
6. **The cold-storage finder now uses the same location control** (it had its own
   "city, village or pincode" box and its own direct device call).
7. **The pincode field in the daily-update sign-up box on /mausam and /msp is removed.**
   New `alert_subscriptions` rows are saved with an empty pincode (the RPC already allowed that).

## Part 1 — every wording replacement

"SD" = Sagar Division. First mention on a page carries "(Sagar Sambhag)" in English.

| # | File / key | Before | After |
|---|---|---|---|
| 1 | `src/content/about.js` `seo.description` EN | our start in Sagar, Madhya Pradesh | our start in Sagar Division (Sagar Sambhag) |
| 2 | same, HI | सागर (मध्य प्रदेश) से शुरुआत | सागर संभाग से शुरुआत |
| 3 | `about.lead` EN (About intro, site JSON-LD description, og text) | …website for Sagar, Madhya Pradesh, where… | …website for Sagar Division (Sagar Sambhag), Madhya Pradesh, where… |
| 4 | `about.lead` HI | सागर, मध्य प्रदेश के लिए | सागर संभाग, मध्य प्रदेश के लिए |
| 5 | `about.what` ("Your village's farm bazaar") EN | a farm marketplace for Sagar, Madhya Pradesh: | a farm marketplace for Sagar Division: |
| 6 | same, EN | We are starting in Sagar and growing district by district, so your area could be next. | We are starting in Sagar Division and growing from here. |
| 7 | same, HI | सागर, मध्य प्रदेश के लिए खेती का बाज़ार है: | सागर संभाग के लिए खेती का बाज़ार है: |
| 8 | same, HI | हमारी शुरुआत सागर से हुई है, और हम ज़िले-ज़िले आगे बढ़ रहे हैं, हो सकता है अगला नंबर आपके इलाके का हो। | हमारी शुरुआत सागर संभाग से हो रही है, और हम यहीं से आगे बढ़ रहे हैं। |
| 9 | `about.sagar.title` EN / HI | Starting in Sagar, Madhya Pradesh / सागर, मध्य प्रदेश से शुरुआत | Our area: Sagar Division / हमारा क्षेत्र: सागर संभाग |
| 10 | `about.sagar` body EN | …starting in Sagar district, Madhya Pradesh, and may expand to other places over time. So for now most of the information here is for Sagar and the nearby area. | …starting in Sagar Division, Madhya Pradesh, and may expand to other places over time. **Sagar Division covers six districts: Sagar, Damoh, Panna, Tikamgarh, Chhatarpur and Niwari.** So for now most of the information here is for Sagar Division. |
| 11 | `about.sagar` body HI | …सागर ज़िले (मध्य प्रदेश) से हो रही है… सागर और आस-पास के इलाके की मिलेगी। | …सागर संभाग (मध्य प्रदेश) से हो रही है… **सागर संभाग में छह ज़िले आते हैं: सागर, दमोह, पन्ना, टीकमगढ़, छतरपुर और निवाड़ी।** …सागर संभाग की मिलेगी। |
| 12 | `about.jsonld.area_served` (used by /about and the sitewide Organization JSON-LD in `Seo.jsx`) | `'IN-MP'` | AdministrativeArea "Sagar Division" (alt "Sagar Sambhag", "सागर संभाग"), inside Madhya Pradesh (IN-MP), containing the six districts |
| 13 | `src/lib/i18n/termsContent.js` clause 1 EN, mention 1 | …website for Sagar, Madhya Pradesh, where… | …website for Sagar Division (Sagar Sambhag), Madhya Pradesh, where… |
| 14 | clause 1 EN, mention 2 | It is starting in Sagar and may expand… | It is starting in Sagar Division and may expand… |
| 15 | clause 1 HI, mention 1 | सागर, मध्य प्रदेश के लिए | सागर संभाग, मध्य प्रदेश के लिए |
| 16 | clause 1 HI, mention 2 | इसकी शुरुआत सागर से हो रही है | इसकी शुरुआत सागर संभाग से हो रही है |
| 17 | `public/llms.txt` line 3 (EN) and line 4 (HI) | for Sagar, Madhya Pradesh / सागर, मध्य प्रदेश के लिए | as rows 3 and 4 |
| 18 | `public/llms.txt` route list | MSP + Sagar mandi prices | MSP + Sagar Division mandi prices |
| 19 | `src/content/seo.js` `/` description EN (home meta) | An information platform for Sagar & MP farmers: … | For farmers of Sagar Division (Sagar Sambhag), MP: … |
| 20 | same, HI | सागर व मध्य प्रदेश के किसानों के लिए जानकारी मंच: … | सागर संभाग (मध्य प्रदेश) के किसानों के लिए जानकारी मंच: … |
| 21 | `seo.js` `/mausam` title EN / HI | Weather — Sagar & MP forecast / मौसम — सागर व मध्य प्रदेश का पूर्वानुमान | Weather — Sagar Division forecast / मौसम — सागर संभाग का पूर्वानुमान |
| 22 | `seo.js` `/mausam` description EN / HI | Weather forecast for Sagar and nearby, … / सागर और आस-पास का … | Weather forecast for your place in Sagar Division (Sagar Sambhag), … / सागर संभाग में आपकी जगह का … |
| 23 | `seo.js` `/fasal-salah` description EN / HI | …for Sagar & MP major crops. / सागर व मध्य प्रदेश की मुख्य फसलों… | …for the main crops of Sagar Division (Sagar Sambhag), MP. / सागर संभाग (मध्य प्रदेश) की मुख्य फसलों… |
| 24 | `strings.js` `msp_seo_hub_desc` EN / HI | Today's Sagar & MP mandi prices, … / सागर व मध्य प्रदेश की मंडियों… | Today's mandi prices in Sagar Division (Sagar Sambhag) & MP, … / सागर संभाग व मध्य प्रदेश की मंडियों… |
| 25 | `strings.js` `msp_seo_crop_desc` EN / HI | … — Sagar & MP. / — सागर व मध्य प्रदेश। | … — Sagar Division (Sagar Sambhag) & MP. / — सागर संभाग व मध्य प्रदेश। |
| 26 | `strings.js` `msp_sagar` (MSP article headline) | Sagar / सागर | Sagar Division / सागर संभाग |
| 27 | `strings.js` `safalta_sub` | Real stories of farmers from Sagar district / सागर जिले के किसानों की असली कहानियां | …from Sagar Division / सागर संभाग के किसानों की… |
| 28 | `strings.js` `car_khurai_caption` | Farmers of Sagar district — pride of Madhya Pradesh / सागर जिले के किसान — … | Farmers of Sagar Division — … / सागर संभाग के किसान — … |
| 29 | `strings.js` `listings_empty` (home) | Listings are being added in Sagar — … / अभी Sagar में लिस्टिंग जुड़ रही हैं — … | …in Sagar Division — … / अभी सागर संभाग में … |
| 30 | `src/screens/Msp.jsx` Dataset JSON-LD | "… mandi prices — Sagar, MP", "… in Sagar district vs MSP." | "… — Sagar Division, MP", "… in Sagar Division (Sagar Sambhag) vs MSP." |

**Contact, How to use, Grievance:** none of them named Sagar as the service area, so there was
nothing to replace. (How to use had two "pincode" instructions; those were reworded for the new
location flow — see Part 2.)

**Left unchanged on purpose** (real data labels or legal wording, per rule 4):

- Terms #law: "courts at Sagar, Madhya Pradesh" / "सागर, मध्य प्रदेश के न्यायालयों" (jurisdiction, not service area).
- `resources_subtitle`, `res_home_sub`: "…government contacts for Sagar district farmers". The list
  really is Sagar-district offices (KVK Sagar etc.); "Sagar Division" would misdescribe it.
- The agro-forestry line naming the forest agency "for Sagar district".
- `cs_sagar_note` and the cold-storage FAQ "Why so few entries in Sagar district?" (statements about that district's data).
- Q&A content, e.g. "Which wheat seed variety is best for Sagar district?" (a farmer's question; also shown on the home page).
- "KVK Sagar", "Sagar mandi", "Sagar APMC", "Khurai/Sagar area", "in the Sagar area" (pest banner), district names on listings and mandis.
- About → "See the cold-storage directory, district by district." (describes the directory, not growth).
- `README.md`, `PROJECT_CONTEXT.md` and old batch prompts (internal documents, not site copy).

Earlier verifiers that asserted the old wording were updated to the new wording:
`verify-batch7a.mjs` (areaServed) and `verify-batch7d.mjs` (definition sentence, About line, and
its "no new migration" check now allows 0057/0058).

## Part 2 — location flow

One object everywhere: `{ lat, lng, label, source }`, source = `device | saved | typed | picked`
(`src/lib/location/userLocation.js`). One provider (`LocationProvider.jsx`, wrapped around the app)
and one control (`src/components/location/LocationControl.jsx`). It is used by: home (nearby
counts, listings near you, weather tile), /browse, /mausam, /fasal-salah, /msp (nearest mandi),
/kisan-mela (distance), /search (listing distance) and the cold-storage finder.

Order implemented:

- (a) device position after "Share my location" (the card is shown before any browser prompt);
- (b) refused/unavailable → the place saved on this device, else the coordinates the logged-in
  profile already has, with the banner "Showing results for {place}. Change";
- (c) none → open box "Type your village or town" with live suggestions;
- (d) no match → "Did you mean…?" with the closest spellings from the places list;
- (e) still nothing → picker, district (6) then town.

With no location set, the prompt card is shown **instead of** the home counts, the browse
results and the weather. There is no default place any more (the old Khurai default is gone
from every visitor-facing screen).

Pincode removed from: the home location box, the "Pincode: …" display, the "or enter a pincode"
box, weather, browse, MSP, crop advice, mela, the cold-storage finder, the daily-update box, and
the nearby-count query (it called `nearby_counts(p_pincode)`; counts are now computed from
`lat/lng` in the browser — the RPC is left in the database, unused). The optional pincode field
on the registration form is untouched and is used for nothing in the location flow.

**Still uses pincode, not changed (not part of the visitor's location):** posting a listing
(the listing's own place), the Profile edit form, and the WhatsApp share text of a listing.
Say if you want these in a later batch.

**Saved location:** `localStorage` key `ks_location_v1` on the device. No profile write was added.

**External calls — nothing new, CSP unchanged** (`public/_headers` and `functions/` are untouched):

- Typed text with no local match → only when the visitor presses "Look up … on the map" → the
  site's own `/geocode` Pages Function (Nominatim, already restricted to "…, Madhya Pradesh,
  India"; the same function the cold-storage finder used). The answer is accepted only inside
  Madhya Pradesh's bounding box and the visitor must confirm it.
- A device position that is more than 12 km from every listed place is named through
  BigDataCloud reverse geocoding — the same call the old control made (already in the CSP).
- No longer called: the `/geo` IP-city guess (the function file is still there, unused).

### Privacy wording — conflicts (legal text NOT edited)

1. `privacyPolicy` "What we collect: your mobile number, pincode, village/town, and your listing
   details" does not mention **device location** at all, although the site now asks for it
   (it also did before this batch).
2. "How it is used: to show relevant matches within 30km of you…" covers offers but not
   **weather** or **mandi prices**, which the new card names.
3. The card says "only for these three things" (offers, mandi prices, weather). The location is
   also used to show **distance to Kisan Melas, to cold storages and on search results**. Either
   the card text or those three uses should change; I left both as briefed.
4. Not mentioned in the policy: the position (rounded to a ~10 km grid cell) is stored in
   `weather_grid_requests` so the weather cache can be refreshed, and coordinates/typed names
   can be sent to BigDataCloud and OpenStreetMap Nominatim as described above.
5. The policy lists "pincode" as collected; it is now collected only on registration, posting
   and profile.

## Places list

- Seed: `supabase/seed/sagar_division_places.json` — **54 places** (Sagar 13, Damoh 8, Panna 9,
  Tikamgarh 8, Chhatarpur 13, Niwari 3): 6 district HQs, 44 tehsil HQs, 4 towns.
  Built by `scripts/build-places-seed.mjs` (re-runnable; no secrets, no database).
- Source per row: OpenStreetMap via Nominatim (52 rows, each with its OSM node/relation id) or
  Wikidata P625 (2 rows). Each point was tested against its district's OSM boundary polygon
  (six relations, recorded in the file). **53 verified, 1 unverified.**
- **Unverified (`verified=false`, hidden from visitors):**
  - **Lavkush Nagar / लवकुशनगर (Laundi), Chhatarpur** — OSM has no town point, and the Wikidata
    coordinate (25.00833, 80.34194) falls **outside** Chhatarpur district. Needs a correct point.
- Corrections made while building: plain "Bina" matched a village near Deori, so the row uses
  OSM "Bina Etawa" (24.18456, 78.20579); "Prithvipur" on OSM is only a hamlet, so the row uses
  Wikidata Q2548354 (inside Niwari district).
- **Please check locally:** (1) the list of tehsil HQs is from my own knowledge, not from an
  official list, so a tehsil may be missing or renamed; (2) the Hindi names are mine — OSM
  carries a Hindi name for 27 rows and they all agree except Jaisinagar (ours जैसीनगर,
  OSM जयसिंहनगर); the other 27 Hindi spellings have no second source.
- The client loads the whole list once and matches locally. If `public.places` does not exist
  yet it reads the same rows from the bundled seed file, so the flow works before 0057 is applied.

## Part 3 — mandi ingestion findings

- Ingestion = `scripts/refresh-data.mjs`, run every 3 hours by the GitHub Action
  `.github/workflows/refresh-mandi-prices.yml` (plus `scripts/backfill-mandi-history.mjs`, manual
  workflow). The workflow files are unchanged. Scheduled workflows run from the default branch
  (`main`), so this change does nothing until it is merged there.
- Before: it asked data.gov.in for `district=Sagar`, preferred Sagar rows, and wrote **one row
  per commodity**. Now: it asks for the six districts, and for each commodity writes **every
  division mandi that reports** (one row per market, `in_sagar_division=true`,
  `is_sagar_district` still set as before). If no division mandi reports, it writes the single
  best MP record as before (both flags false). Expect more rows per day and a longer ticker.
- If `in_sagar_division` is missing (0058 not applied) the scripts write the rows without it
  instead of failing.
- **Dry run:** added `node scripts/refresh-data.mjs --dry-run` (no database connection, no
  secret, weather skipped) and ran it once. The public wrapper API returned division rows for
  maize, mustard and garlic — e.g. mustard at Sagar, Bina, Khurai, Garhakota, Damoh, Patharia,
  Panna, Tikamgarh, Chhatarpur, Nowgong, Rajnagar, Bijawar, Bada Malhera and Lavkush Nagar. The
  other five commodities found no rows because data.gov.in answered 403/429 to the keyless
  sample key, so the official-API path with the six-district filter is **untested**; it needs
  the real key in the Action.
- Client: the "local mandi" queries read `in_sagar_division` (shown to the code as `is_local`).
  Until 0058 is applied they fall back to `is_sagar_district` automatically.
- Nearest mandi uses the location object. Town coordinates for 49 division towns were added
  from the verified seed. "LavKush Nagar(Laundi) APMC" has no verified point, so its distance is
  measured to Chhatarpur town (approximate).

## Part 4 — migrations (files only, NOT applied). Apply in this order, staging first, then production

1. `supabase/migrations/0057_places.sql` — creates `public.places`, RLS on, public read only, no
   write policy or grant, loads the 54 rows. Rollback: `drop table if exists public.places;`
2. `supabase/migrations/0058_mandi_in_sagar_division.sql` — adds
   `mandi_prices.in_sagar_division boolean not null default false`, backfills the six districts,
   adds an index. `is_sagar_district` untouched. Rollback note in the file header.

Apply 0058 before the ingestion change reaches `main`.

## Which tests need the migrations applied

- **Need nothing applied:** `verify-batch7l1.mjs`, `shots-batch7l1.mjs` (all Supabase calls are
  mocked), `build:prod`, verifiers 7a–7d.
- **Need 0057 applied (Stage B):** reading the place list from the real table instead of the
  bundled fallback.
- **Need 0058 applied (Stage B):** the "local mandi" preference and nearest-mandi test against
  real rows for all six districts; any real ingestion run that should set the flag.
- **Now out of date (they drive the removed pincode control; not run, not edited):**
  `e2e/phase10_location_pwa.spec.js`, `e2e/phase12_weather_split.spec.js`,
  `e2e/phase13_location_naming.spec.js`, `scripts/test/p_0026_location_compare.mjs`,
  `scripts/test/p_0028_location_naming.mjs`, `scripts/shots_0026/0027/0028.mjs`. Other older
  e2e specs that open the home or browse page may also expect a default location.

## Other things to know

- The admin "today's post" builder still reads weather for a fixed point (Khurai). It is an
  admin tool, not a visitor's location; left as is.
- `public/search-index.json` was already modified before this batch; it is regenerated by every
  build and is left with the staging-built content.
- `docs/review/batch7b/VERIFY_OUTPUT.txt` and `batch7d/VERIFY_OUTPUT.txt` were rewritten by
  re-running those verifiers.
- Screenshots (36) and `browser-check.json`, `VERIFY_OUTPUT.txt`, `BUILD_PROD_OUTPUT.txt` are in
  `docs/review/batch7l1/`.

## Stage B (waiting)

When you confirm 0057 and 0058 are applied on staging and production: run the location and
nearest-mandi tests against the staging database, then `bash ~/preview-prod.sh` and print the
preview URL. `ship-prod.sh` will not be run.

---

# Stage B — checked against the real databases, leftovers fixed, preview deployed

Date: 2026-10-13 · Branch: `staging` · **Nothing committed. `ship-prod.sh` not run. `main` not
touched. No migration applied or edited.** Preview: https://preview.kissansahyog-prod.pages.dev
(this deployment: https://e0228ad3.kissansahyog-prod.pages.dev). The preview reads the real
production database.

## Result

| Check | Result |
|---|---|
| Real database, staging (`scripts/verify-batch7l1-db.mjs staging`) | 14 passed, 0 failed |
| Real database, production (same script, `production`) | 14 passed, 0 failed |
| `npm run build:prod` | 263/263 routes, 0 failed, production guard OK (twice: once by hand, once inside `preview-prod.sh`) |
| Verifiers 5a / 6a / 6b / 6c / 6d / 6g | 48 / 21 / pass / pass / 18 / 49, 0 failed (there is no 6e or 6f verifier in the repo) |
| Verifiers 7a / 7b / 7c / 7d / 7l1 | 76 / 88 / 58 / 78 / 54, 0 failed |
| Playwright 7l1 suite (`shots-batch7l1.mjs`, mocked) | 140/140 |
| Three old e2e specs (phase10, phase12, phase13) | 17/17 |
| Old test scripts p_0026 / p_0027 / p_0028 | 20 / 22 / 21, 0 failed (p_0027 run with its one write check skipped) |
| Old screenshot scripts shots_0026 / 0027 / 0028 | all run to the end (output sent to a scratch folder, old screenshots not overwritten) |
| Preview curl check | `/`, `/mausam/`, `/msp/`, `/privacy/`, `/browse/`, `/kisan-mela/`, `/about/`, `/terms/`, `/how-to-use/`, `/founder/`, `/grievance/`, `/sawaal/` all 200; `/geocode` function answers |
| Location flow on the preview, live data (`shots-batch7l1-preview.mjs`) | 44 passed, 0 failed |
| 5b-citations | 0 of 17, **already failing before this batch** (see section 4). Not fixed. |

## 1. Location card wording

`loc_card_text` (`src/lib/i18n/strings.js`):

- EN: "Share your location to see offers, mandi prices and weather near you, and how far melas,
  cold storages and search results are. We use your location only for this."
- HI: "अपने पास के ऑफ़र, मंडी भाव और मौसम देखने के लिए, और मेला, कोल्ड स्टोरेज व खोज के नतीजे
  कितनी दूर हैं यह जानने के लिए अपनी लोकेशन साझा करें। हम आपकी लोकेशन सिर्फ़ इसी काम के लिए
  इस्तेमाल करते हैं।"

The expectations in `verify-batch7l1.mjs` and `shots-batch7l1.mjs` were updated to match.

## 2. Privacy: "Your location"

What the code does with the location (read from `userLocation.js`, `LocationProvider.jsx`,
`weatherApiV2.js`, `locationStore.js`, `places.js`, `listingsApi.js`, `nearbyCounts.js`):

| Question | Answer from the code |
|---|---|
| Where is it kept? | In the browser on the device (`localStorage`, key `ks_location_v1`). |
| Saved to the account or profile? | No. Nothing writes it to the profile. A logged-in visitor with no saved place gets the village coordinates the profile already has (read only). |
| Sent to our servers? | Yes, in two ways. (1) Offers near you: the database is asked for listings inside a box around the position (a query filter; nothing is stored by our code). (2) Weather: the position is written to `weather_grid_requests` and `weather_cache_v2`. |
| Sent to anyone else? | Open-Meteo (weather, straight from the browser, when the cell is not cached). BigDataCloud (only to name a device position that is more than 12 km from every listed place). OpenStreetMap Nominatim through our `/geocode` function (only a typed name, only when the visitor presses "Look up on the map"). |
| Mela, cold storage, search, mandi distances | Worked out in the browser. Nothing sent. |
| Change / clear | "Change" link beside the place name. There is **no clear button**; removal is by clearing the site's data in the browser. |

A paragraph saying exactly this, in Hindi and English, was added to `privacyPolicy` in
`src/lib/i18n/legal.js` and is on the preview's `/privacy` page. No version was changed
(Terms still 1.2). A lawyer-review note was added to `docs/legal/TERMS_DRAFT_FOR_LAWYER.md`.

**Correction to Stage A.** Stage A said the weather tables store the position "rounded to a
~10 km grid cell". That is not accurate: the row is *keyed* by the ~10 km cell, but the
latitude/longitude columns hold the exact coordinates the browser sent, and both tables are
readable by anyone with the public key. The row carries no name, number, account or device id,
and the next visitor in the same cell overwrites it. The privacy text says "kept against a map
square of about 10 km", which is true, and the point is flagged for the lawyer. Sending the cell
centre instead of the exact position is a two-line client change; I did not make it because you
asked for the text to describe the code as it is.

## 3. Real-database verification (read-only, public anon key, no key printed)

Same result on staging (`wzxtqbqlahyahsnoqqva`) and production (`eltmcznjcqiahqhjvpjg`).
Output: `docs/review/batch7l1/DB_VERIFY_STAGING.txt`, `DB_VERIFY_PRODUCTION.txt`.

- a. Anon can read `places`. The table returns **54** rows to anon (53 verified + Lavkush
  Nagar). The client filter (`p.verified !== false`) offers **53**; Lavkush Nagar is never
  offered. On the preview, Chhatarpur's picker lists 12 towns, without it.
- b. Anon INSERT, UPDATE and DELETE on `places` are all **rejected**:
  `42501 permission denied for table places`. Row count 54 before and after.
- c. `mandi_prices.in_sagar_division` exists. The ticker, `/msp` snapshot and per-crop queries
  all return local rows through the new flag.
- d. **The `is_sagar_district` fallback was not used**, in the script or in the browser (on the
  preview: 40 mandi requests with `in_sagar_division`, 0 with `is_sagar_district`). The
  fallback code is still in `mandiApi.js`, untouched.

Worth knowing: today every flagged row in both databases is from **Sagar district** (8 mandis).
The other five districts will appear only after the new ingestion runs from `main` with the
real key. So the flag works, but it does not yet show anything the old flag did not.

## 4. Outdated tests

- **Three e2e specs** rewritten for the new flow: `phase10_location_pwa` (location block only;
  mandi search and PWA tests untouched), `phase12_weather_split`, `phase13_location_naming`.
  Cases that tested removed features were replaced by the nearest equivalent: out-of-area
  message → "no out-of-area message anywhere"; recent-place chips → "chosen place is saved and
  restored after a reload"; IP-city guess → "fresh visit shows the card and makes no `/geo`
  call"; pincode fallback → text box and district → town picker.
- **Old scripts** updated: `scripts/test/p_0026_location_compare.mjs`,
  `p_0028_location_naming.mjs`, `scripts/shots_0026/0027/0028.mjs`, and also
  `p_0027_weather_split.mjs` (not on your list, but 10 of its checks asserted the removed code).
- **5a verifier**: no longer hard-codes 0053 as newest; it requires 0053 to exist and the
  numbering to be gap-free up to whatever is highest (now 0058). 48/48.
- **5b-citations**: run at the `pre-7l1` tag in a temporary worktree (removed afterwards):
  **0 passed, 17 failed there too.** It was already failing before this batch. Not fixed.
- New helper `blockVisitorWrites` in `e2e/support.js` and `playwright.nowrite.config.js` (the
  normal config without the teardown that deletes test profiles), so these page-visit tests
  write nothing to the shared database.

## 5. Ingestion dry run

`node scripts/refresh-data.mjs --dry-run` (no database, no secrets), output in
`docs/review/batch7l1/INGEST_DRY_RUN_STAGE_B.txt`. Division mandis are still returned from
**Damoh** (Damoh), **Panna** (Panna, Pawai, Ajaygarh, Devandranagar), **Chhatarpur**
(Chhatarpur, Naugaon, Rajnagar, Badamalhera, LavKush Nagar) and **Tikamgarh** (Tikamgarh), as
well as Sagar district. All of these came through the public wrapper API.

**The six-district official data.gov.in path is untested.** No key was available; every
official request answered 403 or 429. It needs the real key in the GitHub Action.

## 6. Preview

Screenshots (44 PNG) and `preview-check.json` are in `docs/review/batch7l1/stageB/`:
`before-live-*` is the current live site (old flow), `after-1…9-*` is the preview, each in
Hindi and English at 390 and 1440. On the preview, with nothing mocked: places came from the
live table (54 rows, bundled fallback file never loaded), the card shows the new wording, no
place is assumed before the visitor answers, refused → text box, "Chatarpu" → "Did you mean
Chhatarpur", picker → town → banner, weather and mandi pages follow the saved place, and a
device position near Khurai is named from the places list with no outside call.

## Unexpected, and things I changed that you did not ask for

1. **I wrote to the staging database once, by mistake.** I ran the old
   `p_0027_weather_split.mjs` before reading it. It inserts one test weather row (`9.9_9.9`)
   and deletes it again, using the service-role key. It ran twice. I checked afterwards: no row
   is left. Staging only; production was not touched. The script now skips that check when
   `KS_NO_DB_WRITES=1`.
2. **Bug fixed in `LocationProvider.jsx`.** When the browser had already granted location, the
   position was read before the places list had loaded, so a position inside the division was
   sent to BigDataCloud for a name even though the list could name it. It now waits for the
   list. The rewritten phase13 spec caught this.
3. **Leftover wording fixed:** the weather page explainer said "weather for your pincode"; now
   "for your place" / "आपकी जगह के लिए".
4. **Exact position in the weather tables** (see section 2). Not changed.
5. **Not changed, your call:** the registration form helper still says "Your pincode is used to
   show nearby listings" (`pincode_help`), which is no longer true.
6. During all browser checks the two visitor writes a page normally makes
   (`weather_grid_requests`, `cache_weather_cell`) were answered locally and never sent, so the
   preview run wrote nothing to production. A real visitor on the preview will write them.

New files this stage: `scripts/verify-batch7l1-db.mjs`, `scripts/shots-batch7l1-preview.mjs`,
`playwright.nowrite.config.js`, and the outputs under `docs/review/batch7l1/`.
