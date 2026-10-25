# Batch 9C — decisions (equipment spec fields)

Started 2026-10-15 on branch `release-9` (HEAD `46e2d14`). Each decision: what I chose and why it is the
safest option. The founder does not need to read this to test.

## Phase 0 — preflight

1. **Uncommitted files at the start** are the same earlier build outputs Batch 9B found
   (`docs/review/batch7{a,b,d,l1,l2}/VERIFY_OUTPUT.txt`, `public/search-index.json`) plus the founder's two
   prompt files. Not the founder's own work (DECISIONS_FIX9B #1). **Continue; never stage or edit them.**
2. **9B is finished**: `FIX9B_REPORT.md` exists and its commits (up to `46e2d14`) are on `origin/release-9`.
   So `Post.jsx` / `listingsApi.js` can be touched without clashing.
3. **Free memory: about 1.8 GB** (Windows `FreePhysicalMemory` 1,804,312 KB; `wmic` is not installed on this
   PC, the same value was read through PowerShell). The emulator rule needs 4 GB → **emulator step will be
   skipped: low memory**, unless memory frees up by Phase 4 (checked again there).
4. **Server today**: no table constraint, no trigger and no key whitelist on `listings.details`;
   `create_listing` only checks `equipment_type_id` and the tanker's capacity. New keys are therefore
   accepted as they are. The new rule goes into `create_listing_with_location` (the wrapper 9B already
   changed), keeping every 9B line.

## Phase 1 — design (founder's rules implemented as given)

5. **One table** `EQUIPMENT_SPECS` in `src/lib/listings/catalog.js`, keyed by the type's English name
   (`equipment_types.name_en`), exactly like the tanker code. Ids are not hard-coded. A type that is NOT in
   the table (Trolley, Water tanker, or any type added to the database later) gets no spec fields and no
   server check — the safe default: a new type can never be blocked by a rule nobody wrote for it.
6. **Keys stored in `details`** (existing keys untouched):

   | key | what | kind |
   |---|---|---|
   | `brand` | brand (tractor types: the English brand name from the list, or `other`) | text |
   | `brand_other` | brand typed by hand when `brand = other` | text |
   | `model` | model | text |
   | `year` | year of manufacture | whole number 1990 … current year + 1 |
   | `power_hp` | HP (meaning depends on the type, see table) | number > 0 and ≤ 500 (Other: ≥ 0) |
   | `spec_auger_size`, `spec_lifting_capacity`, `spec_crop`, `spec_cutting_width`, `spec_working_width`, `spec_bucket_size`, `spec_machine_name` | type-specific | text |
   | `spec_rows` | number of rows | whole number 1 … 100 |
   | `spec_tank_litres` | drone tank | number > 0 and ≤ 1000 |
   | `spec_flight_minutes` | drone flight time | number > 0 and ≤ 600 |
   | `output_per_hour`, `output_unit`, `output_unit_other` | optional output | number > 0; unit from list |
   | `min_hp` | requirement: minimum HP (optional) | number > 0 and ≤ 500 |
   | `spec_version` | `1` on every new equipment offer | number |

   The upper limits for rows (100), tank (1000 L) and flight time (600 min) were not given by the founder;
   they are generous "obviously wrong" guards only, and easy to change in one place (catalog + migration).
7. **Per type, as built** (all mandatory on offers; output per hour always optional):

   | Type | Brand | Extra mandatory | Power field | Default unit |
   |---|---|---|---|---|
   | Tractor | dropdown | — | Tractor HP | acre/hour |
   | Pit Digging Tractor | dropdown | auger size | Tractor HP | pits/hour |
   | Crane Tractor | dropdown | lifting capacity | Tractor HP | other |
   | Thresher | text | crop | Tractor HP needed | quintal/hour |
   | Harvester | text | cutting width, crop | Engine HP | acre/hour |
   | Rotavator | text | working width | Tractor HP needed | acre/hour |
   | Seed Drill | text | number of rows | Tractor HP needed | acre/hour |
   | Reaper | text | working width | Power HP | acre/hour |
   | Paddy Planting Machine | text | number of rows | Power HP | acre/hour |
   | Blower | text | — | Power HP | quintal/hour |
   | LCB (Straw Machine) | text | — | Power HP | quintal/hour |
   | JCB / Excavator | text | bucket size | Engine HP | cubic metre/hour |
   | Drone | text | tank litres, flight minutes | **no HP field** | acre/hour |
   | Other | text | machine name | Power HP (0 allowed, hint "0 if it has no engine") | other |
   | Trolley, Water tanker | — | unchanged forms | — | — |

8. **Tractor brand list (draft, founder to review)** — stored value = English name, label Hindi-first:
   Mahindra / महिंद्रा, Swaraj / स्वराज, Massey Ferguson / मैसी फर्ग्यूसन, John Deere / जॉन डियर,
   Sonalika / सोनालिका, New Holland / न्यू हॉलैंड, Eicher / आयशर, Farmtrac / फार्मट्रैक, Kubota / कुबोटा,
   Powertrac / पावरट्रैक, Preet / प्रीत, Indo Farm / इंडो फार्म, Other brand / अन्य ब्रांड (reveals a required
   text box). Stored as the English name so listings stay comparable and searchable in both languages.
9. **Output units**: acre/hour (एकड़/घंटा), quintal/hour (क्विंटल/घंटा), pits/hour (गड्ढे/घंटा),
   cubic metre/hour (घन मीटर/घंटा), other (अन्य → a text box). The unit is pre-selected when the type is
   chosen; the seller may change it. Output may be left empty; if it is filled it must be a number > 0, and
   with "other" the unit text is then needed (form only — the server never requires anything about output).
10. **Number fields are text boxes with `inputMode="decimal"`** (the phone shows the number keyboard), not
    `type="number"`: a `type="number"` box silently turns "4O" or "abc" into an empty value, so the farmer
    would see "required" instead of "wrong number". With a text box the exact entry is checked and the
    message says what is wrong. Saved as real numbers.
11. **Messages** name the field (the type's own label, e.g. "ट्रैक्टर की अश्वशक्ति (HP) ज़रूरी है।") and are
    written Hindi-first, shown in the app's language like every other message. One function builds them
    (`equipmentSpecMessage` in catalog.js) for both the form and the server's answer, so both say the same.
12. **Requirements** force nothing new. Types that have HP show one optional field "न्यूनतम अश्वशक्ति (HP)"
    (`min_hp`); if filled it must be a number > 0 and ≤ 500. Drone, Trolley, Water tanker: no min HP field.
13. **Clean save**: before saving, keys that do not belong to the chosen type / listing type are dropped
    (e.g. the farmer picked Harvester, typed a crop, then switched to Tractor). Old keys that are not spec
    keys are never touched.
14. **Display**: listing card gets one extra line under today's two (e.g. "Massey Ferguson 245 · 2022 ·
    45 HP · 1.5 acre/hour"; today's "type · rate" line is kept, so nothing a buyer sees today goes away).
    Detail page: one row per spec field, output only when filled, and the note
    "विक्रेता द्वारा दी गई जानकारी / Details given by the seller" (only on listings that have specs). Old
    listings (no specs) look exactly as before. The homepage strip keeps its two-row summary (not a browse
    card; out of scope).
15. **Server rule** (new migration `0063_equipment_specs.sql`, `CREATE OR REPLACE` of
    `create_listing_with_location` with the same 14 parameters, so grants and old callers are unchanged):
    when category = equipment, type = offer, `details.spec_version = 1` and the type is one of the 14, every
    mandatory field must be present, non-empty and in range, otherwise the call is refused with
    `equipment_spec_invalid:<field>:<required|range>`. The check runs after 9B's "same request id → same
    listing" lookup, so a retry of an already-saved Post still lands on it. No helper function is added
    (a new function would be one more public-key-callable function in the advisors).
    Rollback `rollback/0063_equipment_specs_rollback.sql` = the exact definition read from staging before
    the change (= 0062's).
16. **Old apps**: a call without `spec_version` (older APK, cached website) is not checked. BACKLOG line
    added: "once old app versions are retired, require specs for all equipment offers".
17. **Applying on staging** follows 9B decision 3: never `db.mjs migrate`; my own file only, through the
    staging-only helper (`scripts/fix9b/apply-staging.mjs`, refuses any other project), rollback round-trip
    checked by comparing the function definition before/after.
18. **Keyboard**: Batch 9 (DECISIONS #70–76) showed the app's WebView already shrinks to the keyboard and
    Chromium scrolls the focused box into view; nothing to change natively. Phase 3 checks it in the browser
    with a short (keyboard-sized) screen: the lowest spec box, when focused, must be fully visible.
