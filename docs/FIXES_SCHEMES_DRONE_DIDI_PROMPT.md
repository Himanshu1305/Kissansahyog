# Kisan Sahyog — Fixes, Nav, Scheme Pages, Drone Didi, Content & New Features

DO NOT ask for approval or questions. Decide and proceed. Read PROJECT_CONTEXT.md, KNOWN_ISSUES.md and docs/review/HOMEPAGE_V4_REVIEW.md first.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy only after Phase 8 (screenshot self-review) passes:** `npm run build && npx wrangler pages deploy dist --project-name kissansahyog`

This is a fix-and-extend pass on the v4 homepage, not a redesign. Do not change anything not named below.

**One migration file for everything in this prompt:** `supabase/migrations/0023_schemes_content_features.sql`, containing every schema change from Phases 3, 5, 6 and 7 (sarkari_yojana alters + seeds, videos table + seeds, kisan_sawaal alters + seeds, farm_events table + seeds, listing_unavailable_dates table). Do not create more than one file numbered 0023. Apply it with `npm run db migrate` (the access token works).

---

## Phase 1 — Fix the visual/data bugs from the v4 review

Work through each one; do not skip verification steps.

**1a. Hero photo.** Open the actual `public/images/home/hero-farmer.jpg` file with the image viewer. If it is a tight crop of a turban/shoulder with no visible field or context: re-search and replace it with a photo of an Indian farmer standing or working in a wheat/soybean field, face and upper body both visible, with open space on the right two-thirds of the frame for text to sit on a light overlay. If the file itself is fine but CSS is cropping it wrong, fix `object-position` so the face is not obscured by the H1 or info tiles — verify by re-screenshotting after the fix.

**1b. Listing card images are duplicated/wrong.** Open every file in `public/images/home/` named `list-*.jpg` one at a time and write down what each actually shows. Then:
   - Fix `list-thresher.jpg` — currently a duplicate of `list-tractor.jpg`. Search for and download a distinct thresher photo.
   - Fix whichever file is duplicated between two land/contract-farming categories — search for and download a distinct photo for one of them.
   - After downloading, run a byte-size and pixel-dimension comparison across ALL `list-*.jpg` and `cat-*.jpg` files; any two files with identical size or matching hash must be treated as a duplicate and one replaced, even if not explicitly named above.
   - Fix the category→file mapping in the component: verify godown listings use `list-godown.jpg`, land listings use `list-land.jpg`, tractor/trolley listings use `list-tractor.jpg`, harvester listings use a harvester-specific photo (search for one if it doesn't exist as its own file), not a shared generic tractor photo.

**1c. Every listing shows "0 किमी".** Check the pincode→latitude/longitude lookup first: it most likely has an entry only for Khurai (470117), so Bina, Rehli, Malthon, Deori, Banda, Rahatgarh and Sagar all resolve to the same point and every distance is 0. Add real coordinates for every village/pincode used by the dummy listings (web-search each; they are all in Sagar district, MP). Then confirm the nearby query computes distance from the viewer's resolved pincode to each listing's asset coordinates and that the card renders that value. After the fix, the same 8 cards must show varying distances (Khurai-area viewer → Bina ≈ 25–35 km, Rehli ≈ 60+ km, etc.), never a column of zeros.

**1d. आपके आसपास count chips are mislabelled.** The six numbers and their labels are offset by one position. Open the `nearby_counts` RPC result and the chip-rendering component together; verify the array/object keys used for rendering match the RPC's actual column names exactly (this is almost always a zip/index mismatch between two arrays built separately — fix by keying on the category name, not array position).

**1e. Nav overflow.** Remove the `max-w-7xl` (or any) container and its `mx-auto` from the nav bar entirely — the nav must be `width: 100%` with padding only, per the same edge-to-edge rule as the rest of the homepage. This also gets addressed structurally in Phase 2 since the nav item list itself is being cut down.

**1f. Bad video thumbnail.** The wheat-sowing video's thumbnail is illegible (overlapping red/black text). Either fetch that same video's proper `hqdefault.jpg`/`maxresdefault.jpg` directly from `img.youtube.com/vi/<id>/`, or if the channel's own thumbnail is genuinely unusable, replace that video entry with a different real Hindi wheat-sowing video and re-verify its thumbnail before use.

**1g. Broken article image.** The second article card renders a dark/black square. Find its `cover_image_url` — if the URL is dead or was never set correctly, fix it (reuse the carbon-credit Pexels URL already used elsewhere if that's the intended image, or find and self-host a proper one). Confirm the `onerror` fallback (solid `--ks-green` background) fires correctly for genuinely broken URLs so this can never render as a black box again.

**Verification for all of Phase 1:** re-screenshot desktop and mobile, view both, confirm every item above is visually fixed before moving to Phase 2.

---

## Phase 2 — Nav redesign

Replace the current nav item list entirely with:

```
बाज़ार ▾          (dropdown: सभी 9 categories, each linking to its filtered browse view)
मंडी भाव          → /info#mandi (or existing mandi section)
मौसम              → /info#weather
सरकारी योजनाएं ▾   (dropdown, two groups — see Phase 3)
                     केंद्र सरकार की योजनाएं  →  /yojana/central
                     मध्यप्रदेश सरकार की योजनाएं  →  /yojana/mp
किसान सवाल        → /sawaal
वीडियो            → /videos
संपर्क            → /resources
```

Remove: the flat list of all 9 category links as separate top-level items, "लेख" as a top-level nav item (keep it reachable from the homepage and footer only), "जानकारी" as a label (it no longer exists — मंडी भाव, मौसम, संपर्क are now direct), "समुदाय" dropdown (सवाल is now direct; सफलता stays reachable from footer/homepage).

Dropdowns: simple CSS/JS hover-or-click menus, no external library. On mobile, dropdowns expand inline in the hamburger menu (same pattern already used for the existing समुदाय dropdown — reuse that component's mechanics for the two new dropdowns).

All new nav strings through i18n.

---

## Phase 3 — Individual government scheme pages

### 3a. Schema change (migration 0023)

Add to `sarkari_yojana`:
```sql
ALTER TABLE sarkari_yojana ADD COLUMN slug text UNIQUE;
ALTER TABLE sarkari_yojana ADD COLUMN government_level text NOT NULL DEFAULT 'central' CHECK (government_level IN ('central', 'state'));
ALTER TABLE sarkari_yojana ADD COLUMN faqs jsonb NOT NULL DEFAULT '[]';
-- faqs shape: [{"q_hi": "...", "q_en": "...", "a_hi": "...", "a_en": "..."}]
ALTER TABLE sarkari_yojana ADD COLUMN documents_required_hi text;
ALTER TABLE sarkari_yojana ADD COLUMN documents_required_en text;
ALTER TABLE sarkari_yojana ADD COLUMN source_url text;
ALTER TABLE sarkari_yojana ADD COLUMN last_verified_date date;
```
Backfill `slug` for the 8 existing schemes (e.g. `pm-kisan`, `pmfby`, `pm-kusum`, `kcc`, `drone-didi`, `soil-health-card`, `e-nam`, `pm-aasha`) and set `government_level = 'central'` for all 8 (they are all central schemes; no MP-specific schemes are seeded yet — see 3d).

### 3b. Page structure — `/yojana/:slug`

Public, no login. Structure, in this exact order, following the pattern used by India's own myScheme.gov.in:

1. H1 = scheme name (Hindi), English name as a subtitle
2. One-sentence direct-answer summary immediately below H1 (40–100 words) — this is the text that answer engines extract; write it to stand alone without needing the rest of the page
3. **लाभ (Benefits)** — H2, the benefit_hi/en value, expanded to 2-3 sentences if the existing field is terse
4. **पात्रता (Eligibility)** — H2 phrased as a question: "कौन आवेदन कर सकता है?" — existing eligibility_hi content
5. **आवेदन कैसे करें? (Application Process)** — H2, existing how_to_apply_hi content as a numbered list
6. **ज़रूरी दस्तावेज़ (Documents Required)** — H2, new documents_required_hi field, bulleted
7. **अक्सर पूछे जाने वाले सवाल (FAQs)** — H2, render the faqs jsonb array as visible Q&A pairs (accordion), AND emit matching `FAQPage` JSON-LD schema in the page head — the schema text must exactly match the visible text, do not mark up anything not rendered on the page
8. **स्रोत (Sources)** — H2, link to source_url (the actual pib.gov.in / ministry page), plus "अंतिम सत्यापन: {last_verified_date}"
9. WhatsApp share button for the scheme page (reuse existing share pattern)

Also emit `Article` schema (headline, datePublished from created_at, dateModified from updated_at) on every scheme page.

Write 4-6 FAQ entries per scheme now, in the migration seed, for all 8 existing schemes — real questions a farmer would ask (pulled from the scheme's own eligibility/benefit text, not invented details), each answer 50-100 words matching what's rendered elsewhere on the page.

### 3c. Listing pages — `/yojana`, `/yojana/central`, `/yojana/mp`

- `/yojana` shows both groups stacked on one page: "केंद्र सरकार की योजनाएं" first, then "मध्यप्रदेश सरकार की योजनाएं", each with an anchor and a "सभी देखें →" link.
- `/yojana/central` and `/yojana/mp` are the filtered views (same card component).
- **Router order:** register `/yojana`, `/yojana/central` and `/yojana/mp` BEFORE `/yojana/:slug`, otherwise the dynamic route captures the two static ones. Reject `central` and `mp` as scheme slugs at the admin form level.

### 3d. MP-specific state schemes

Research and seed at least 3 real, currently active Madhya Pradesh state agricultural schemes with `government_level = 'state'`. Start by verifying these candidates via web search — seed only those confirmed real and active, with the source URL recorded: **मुख्यमंत्री किसान कल्याण योजना** (MP top-up to PM-Kisan), **ई-कृषि यंत्र अनुदान** (MP farm-machinery subsidy portal), **बलराम तालाब योजना** (farm ponds), **मुख्यमंत्री कृषक ब्याज माफी योजना**. If a candidate cannot be verified, replace it with another verified MP scheme; never invent a scheme name, amount, or deadline.

### 3e. Admin

Extend the existing MSP-style admin management pattern to sarkari_yojana: add slug, government_level, faqs (simple repeatable q/a input pairs), documents_required, source_url, last_verified_date fields to the existing add/edit form.

---

## Phase 4 — Dedicated Drone Didi page

### 4a. Route `/drone-didi`

Public, no login. Sections:
1. Hero band: heading "ड्रोन दीदी — महिला उद्यमी, आधुनिक तकनीक", one photo (self-hosted, already-verified cat-drone.jpg or a better dedicated one if found), short intro paragraph
2. **यह योजना क्या है?** — explain the government Drone Didi scheme in the same Details→Benefits→Eligibility→Apply structure as Phase 3 (this can literally reuse the scheme page component, rendering the existing `drone-didi` row from `sarkari_yojana`)
3. **खुरई/सागर क्षेत्र में उपलब्ध ड्रोन दीदी सेवाएं** — live-pulled listings from the drone_didi category (reuse existing listing card component)
4. **आधिकारिक जानकारी** section: if a verified PIB press photo for the Drone Didi scheme can be found and confirmed (search pib.gov.in), show it with "फोटो: PIB, भारत सरकार" caption. If the owner has separately supplied or approved PM/CM photos for this page specifically, they may appear here captioned "फोटो: PIB / आधिकारिक स्रोत" — framed strictly as illustrating the scheme, never as an endorsement of Kisan Sahyog. If no verified photo is available, omit the image and keep the text.
5. WhatsApp share button

### 4b. Nav/homepage link

Add "ड्रोन दीदी" as a linked destination from the बाज़ार dropdown (Phase 2) pointing to `/drone-didi` instead of a generic filtered browse view, since this page is richer.

---

## Phase 5 — More videos and Q&A, moved to admin-manageable tables

### 5a. Videos table (migration 0023, same file as Phase 3a)

```sql
CREATE TABLE videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id text NOT NULL,
  title_hi text NOT NULL,
  title_en text,
  channel_name text,
  duration text,
  category text CHECK (category IN ('pest', 'sowing', 'irrigation', 'drone', 'scheme', 'market', 'general')),
  thumbnail_url text,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```
RLS: public read where is_active = true. Admin write via SECURITY DEFINER RPC, same require_admin pattern as msp_prices.

Migrate the 3 existing videos from `src/content/videos.js` into this table. Then find and add at least 10 more real, verified Hindi-language farming videos (search for and confirm each one plays and its thumbnail is legible before adding) covering a spread of the category values above — pest identification, sowing timing for different crops, irrigation, drone spraying, scheme explainers, market/selling advice. Sources: ICAR channels, DD Kisan, KVK channels, Annadata, or other verified agricultural extension channels. Self-host each thumbnail the same way as the existing 3 (download from `img.youtube.com/vi/<id>/hqdefault.jpg`, verify by viewing, store in `public/images/videos/`).

`/videos` page: public, grid of all active videos, filterable by category tab.

**Switch the homepage's "आज की 2 मिनट की वीडियो सलाह" section to read from this table** (3 rows where `is_featured = true`, ordered by sort_order) and delete `src/content/videos.js` once nothing imports it.

### 5b. More Kisan Sawaal entries

Add at least 15 more Q&A entries to `kisan_sawaal`, `is_published = true`, `answered_by = 'Team Kisan Sahyog'`, spread across the existing category values (land, equipment, crop, pest, weather, market, scheme, drone_didi, general). Write real, useful, specific answers (agronomic facts must be accurate — if unsure of a specific detail, phrase the answer to direct the farmer to KVK Sagar for field-specific confirmation, consistent with the two existing seeded answers).

### 5c. Cross-linking

Where a video and a Q&A cover the same topic (e.g. the soybean yellow mosaic video and the existing soybean yellow-leaves Q&A), add a `related_video_id` field to `kisan_sawaal` (nullable, references videos.id) and show a "संबंधित वीडियो" link on that Q&A's detail/expanded view when set. Populate it for at least 3 genuinely matching pairs.

---

## Phase 6 — Pest/disease alert banner (new feature)

### 6a. Schema addition

Add to `kisan_sawaal`:
```sql
ALTER TABLE kisan_sawaal ADD COLUMN crop text;
ALTER TABLE kisan_sawaal ADD COLUMN symptom_tag text;
-- symptom_tag examples: 'yellow_leaves', 'wilting', 'pest_visible', 'fungal_spots', 'stunted_growth', 'other'
```
Add these as optional fields on the existing "ask a question" form (crop as free text or a dropdown of common Sagar-area crops; symptom_tag as a simple dropdown, both optional, defaulting to null if the question isn't about a crop problem).

### 6b. Alert banner logic

A Supabase RPC or client-side query: count published `kisan_sawaal` rows where `crop` and `symptom_tag` are both set, `created_at` within the last 14 days, grouped by crop+symptom_tag, where count >= 2. If any group qualifies, show a banner on the homepage (placed just below the आज किसान के लिए hero, above आपके आसपास):

```
⚠️ हाल में देखा गया — सागर क्षेत्र में सोयाबीन पर 4 पीली पत्तियों की शिकायतें (पिछले 14 दिन)
अपनी फसल जांचें → किसान सवाल में विस्तार से पढ़ें
```

Framing rule: this is presented as "हाल में पूछे गए सवाल" (recently asked questions), never as an official pest warning or diagnosis. If no group meets the threshold, the banner does not render — no empty or placeholder state needed, it simply doesn't show.

Seed enough of the new Q&A entries from Phase 5b with matching crop+symptom_tag values (at least one group of 2+) so this banner is visibly demonstrable on staging.

---

## Phase 7 — Two small utility additions

### 7a. Equipment availability calendar

Storage — a separate table, so the existing listings schema is untouched:
```sql
CREATE TABLE listing_unavailable_dates (
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  unavailable_date date NOT NULL,
  PRIMARY KEY (listing_id, unavailable_date)
);
```
RLS: public SELECT; INSERT/DELETE only where the listing's owner is the authenticated user (join to listings.owner/profile as the existing owner checks do). On the listing detail page for **equipment offers only**: a simple month-view calendar. The owner (logged in, viewing their own listing) toggles dates busy/free; everyone else sees busy dates greyed with a "बुक्ड" label. Deliberately no booking-request or approval flow — an owner-maintained busy/free view so callers know before they call.

### 7b. KVK/agriculture events

```sql
CREATE TABLE farm_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_hi text NOT NULL,
  title_en text,
  description_hi text,
  location text,
  event_date date NOT NULL,
  organizer text,
  contact text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```
RLS: public read where is_active = true and event_date >= current_date. Admin write via RPC. Show upcoming events (next 30 days) on `/info` and, when one falls within the next 7 days, as a small line in the आज किसान के लिए hero area (below the three info tiles, above the two giant buttons) — e.g. "📅 सोमवार को KVK सागर में मिट्टी जांच शिविर". Seed 2-3 real or clearly-plausible upcoming KVK Sagar events as a starting point; note in PROJECT_CONTEXT.md that these need ongoing admin maintenance.

---

## Phase 8 — Screenshot self-review (mandatory, before deploy)

Same discipline as the v4 build: `npm run build && npm run preview`, Playwright full-page screenshots at 1280×800 and 375×812, **view both with the image viewer**, check against this list:
- All Phase 1 fixes visually confirmed (hero photo, no duplicate images, real distances, correct count labels, no nav overflow, legible video thumbnail, no broken article image)
- New nav shows exactly the 7 items from Phase 2, both dropdowns open and show correct content
- `/yojana/pm-kisan` (or any seeded slug) renders all 7 sections in order with FAQ schema validating (spot-check the JSON-LD in page source)
- `/yojana/central` and `/yojana/mp` both show scheme cards, MP page shows the newly-seeded state schemes
- `/drone-didi` renders with photo, scheme explainer, live local listings, and either a verified official photo or a clean omission
- `/videos` shows 13+ videos with legible thumbnails, filterable by category
- Pest alert banner renders on staging (since seed data guarantees a qualifying group) with the correct framing text
- Equipment listing detail shows the availability calendar
- Upcoming event line appears in the hero area if a seeded event falls within 7 days
- No horizontal scroll on mobile at any of the new pages

Then the standard closing checks:
- Bilingual audit passes — every new string (nav, scheme pages, Drone Didi, videos, banner, calendar, events) through i18n
- Every existing route still loads: /, /browse, /post, /listing/:id, /info, /resources, /sawaal, /yojana, /safalta, /articles, /admin; all backend test suites green
- `public/sitemap.xml` (create it if it does not exist, and reference it from `robots.txt`) lists every `/yojana/:slug` page, `/yojana/central`, `/yojana/mp`, `/drone-didi`, `/videos`, plus the existing public pages — these new pages exist for search and answer engines, so they must be discoverable
- JSON-LD on a scheme page parses as valid JSON and its FAQ text matches the rendered text word for word

Fix anything failing, re-screenshot, re-view, repeat until clean. Only then commit, push, deploy, and repeat the same screenshot-and-view check against the live staging URL.

Write findings into `docs/review/FIXES_AND_SCHEMES_REVIEW.md`.

---

## Backlog (do not build now — record in PROJECT_CONTEXT.md backlog section)

- Rating/trust layer on listings and transactions (needs real usage volume first)
- Digital lease/sharecropping agreement PDF template generator
- Weekly input price tracker (Urea, DAP, diesel at named local shops)
- WhatsApp Business API opt-in for personalised rain/weather threshold alerts (needs a paid, approved WhatsApp Business API account)
- Group/bulk input buying coordination
- Produce transport/logistics as a 10th marketplace category
- Migrant/seasonal labour coordination across districts
- Voice search ("बोलकर खोजें") via Web Speech API
- Crop Doctor / AI photo diagnosis (previously logged — potential separate product)

---

## Commit and deploy

Single commit: "Fixes (hero/listing images, distances, count labels, nav overflow, video thumbnail, article image) + new nav with बाज़ार/सरकारी योजनाएं dropdowns + individual scheme pages with FAQ schema (central + MP state) + Drone Didi page + 13+ videos & 17+ Q&A in admin-managed tables + pest-report banner + equipment availability calendar + KVK events; screenshot-reviewed"

Deploy: `npm run build && npx wrangler pages deploy dist --project-name kissansahyog`
