# Overnight report — Batches 7H and 7I, shipped with 7A–7I

Date: 13 October 2026

## 1. Did the ship happen?

**Yes.** Everything (7A–7I) is live on https://kissansahyog.com.

- Deployment URL: https://a9d302c2.kissansahyog-prod.pages.dev
- Git: commit `c4a136f` on the `staging` branch, pushed. Nothing was pushed to `main`.
- No database migration was applied or touched. No `.env` file was committed.

## 2. What changed

**7H — one-row header.** On desktop the menu now sits in the top row, between the logo and the search / language / Login / Join buttons. The second row and the band under it are gone.

- 1280px and wider: all ten menu items in one line.
- 1024px to 1279px: six items (Bazaar, Mandi bhav, Weather, Schemes, Kisan Sawaal, Useful contacts) plus one "और / More" menu holding Agro-forestry, Video, How to use, About us and Founder.
- Search is now a small button. Clicking it opens the search box; the mic button, voice search and results work as before.
- Below 1024px the mobile header and hamburger are unchanged.

**7I — ownership wording.** The About page now says Shri Abhinandan Dixit owns and runs Kissan Sahyog. USD Vision AI LLP is no longer mentioned in the About text or in the page's hidden search-engine data. The footer credit is unchanged: "Designed, developed and maintained by USD Vision AI LLP".

Exact new About wording (heading: "स्वामित्व और संचालन / Ownership and operation"):

- English: "Kissan Sahyog is owned and run by Shri Abhinandan Dixit, Madhya Pradesh, India."
- Hindi: "किसान सहयोग के स्वामी और संचालक श्री अभिनन्दन दीक्षित हैं, मध्य प्रदेश, भारत।"

The link to that section (`/about#kaun-chalata-hai`) still works.

## 3. Legal text that still names USD Vision AI LLP (for the lawyer)

Not edited, as instructed. Both are in the Terms page, file `src/lib/i18n/termsContent.js`. Privacy does not name the company.

| Line | Clause | Hindi | English |
|---|---|---|---|
| 5 | First clause of the Terms | "किसान सहयोग USD Vision AI LLP की सूचना और नोटिस-बोर्ड सेवा है।" | "Kissan Sahyog is an information and notice-board service of USD Vision AI LLP." |
| 19 | Limit of responsibility | "कानून जहां अनुमति देता है, किसान सहयोग और USD Vision AI LLP उपयोगकर्ताओं के बीच हुए व्यवहार, नुकसान, देरी, गलत सूचना, भुगतान, कमाई, फसल परिणाम या तीसरे पक्ष के काम के लिए जिम्मेदार नहीं होंगे।" | "Where law permits, Kissan Sahyog and USD Vision AI LLP are not responsible for dealings between users, loss, delay, incorrect information, payment, earnings, crop result, or third-party conduct." |

Line 5 now contradicts the About page (it says the service belongs to USD Vision AI LLP). The lawyer should decide the wording.

## 4. Check results

**Ship gate (all passed)**

| Check | Result |
|---|---|
| Production build | Succeeded — 263/263 pages prerendered, 0 failed |
| Production guard | OK |
| verify-batch7a (now also covers 7H and 7I) | 75 passed, 0 failed |
| verify-batch7b | 88 passed, 0 failed |
| verify-batch7c | 58 passed, 0 failed |
| verify-batch7d | 64 passed, 0 failed |

**Header browser check (new, `scripts/shots-batch7h.mjs`)** — 296 passed, 0 failed.
At 1920, 1440, 1280, 1279, 1100 and 1024px, in Hindi and English, on the home page and the About page, there is **exactly one header row, and nothing wraps or overlaps**. The More menu and the search button work with the keyboard and close on outside click and Esc. Screenshots are in `docs/review/batch7h/` (1920, 1440, 1280, 1100, 1024 and 390px, both languages).

The older browser checks were re-run too: 7a 99/99, 7b 62/62, 7c 207/207, 7d 80/80.

**Live site (checked with curl after the deploy)**

| Check | Result |
|---|---|
| `/`, `/about/`, `/how-to-use/`, `/founder/`, `/grievance/`, `/terms/`, `/privacy/`, `/sawaal/` | All 200 |
| `/about/` shows the new owner sentence | Yes |
| `/about/` names USD Vision AI LLP | Only once, in the footer credit — see section 5 |
| `/grievance/` contains "Grievance Officer" or "24 hours" (English or Hindi) | No |
| `/terms/` contains "Draft 1.2" | Yes |
| Live header is one row | Yes — the live HTML has one menu, inside the top bar, set to never wrap |

The feedback form was not submitted and no data was changed.

## 5. Things to know / where I was unsure

1. **"USD Vision AI LLP" still appears once on `/about/` — in the footer.** The brief said the About page must not contain it, and also said to keep the footer credit, which is on every page. I kept the footer. The About content itself has no mention. Tell me if you want the footer credit hidden on the About page.
2. **One article byline says "USD Vision AI Team".** It is on the live article `/articles/intercropping-madhya-pradesh/`. It is stored in the database, so I did not change it. An earlier batch set it on purpose. Decide whether it should read "Team Kissan Sahyog".
3. **English at exactly 1024px is tight.** It fits on one row with no overlap, but the gaps between menu items are small. Hindi has more room.
4. **Logged-in view not tested in the browser.** For signed-in users at 1024–1535px I hide the name next to the avatar, and the admin button shows only its ⚙️ icon, so the row still fits. The checks ran signed-out only.
5. **More menu includes Founder.** The brief listed four items; I added Founder as a fifth because it lives under About us and would otherwise be unreachable from the header at that width.
6. **Search keyword.** I removed "usd vision ai" from the About page's site-search keywords.
7. **This report is not in the commit.** It was written after the ship. `public/search-index.json` also shows as changed locally; the ship script leaves it out on purpose.
8. Known failures (verify-batch5a, verify-batch5b-citations, eslint not installed) were not run and are unchanged.
