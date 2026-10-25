# Batch 10A — G2 screenshots (what I saw)

20 screenshots in `screens/`: Post top (step 1), equipment offer form (Tractor, Thresher), Browse equipment with
chips, Signup — Hindi and English, 360 px and 412 px. Local preview of the release-10a build (`vite build --mode staging`,
port 4185), staging database, persona P7 logged in (Signup logged out). Phone / e-mail / password boxes are painted
dark. The script also measured "no sideways scroll" on every page: true for all 20 (`results-g1.json`, `G2|*`).

Opened and looked at (6): `post-top-hi-360`, `equipment-tractor-offer-hi-412`, `equipment-thresher-offer-hi-360`,
`browse-equipment-hi-360`, `signup-hi-412`, `equipment-tractor-offer-en-360`.

| Screenshot | Overflow | Clipped Hindi | Overlap | Notes |
|---|---|---|---|---|
| post-top-hi-360 | none | none | none | "कौन डाल रहा है?" is the first question; two equal buttons, "किसान / Farmer" selected (solid green + ✓) — both labels wrap to 2 lines inside the button, fully readable. Category tiles follow. |
| equipment-tractor-offer-hi-412 | none | none | none | Tags directly under "मशीन का प्रकार" (nothing ticked for Tractor). Brand\|Model, Year\|HP, Output\|Unit and Rental basis\|Rate each share a row. The HP label wraps to 2 lines ("…(HP)" then "*" alone on line 2) and the Output label wraps; both inputs of each row still start on the same line. Grey examples visible (जैसे 575 DI / 2023 / 45 / 1.5, जैसे: ₹800). |
| equipment-thresher-offer-hi-360 | none | none | none | Everything one per row at 360 (stacked as designed). Brand and फसल are free text with no example (by design, not in Task C); मॉडल का नाम / जैसे 2023 / जैसे 35 / जैसे 20 shown, unit क्विंटल/घंटा pre-selected. |
| equipment-tractor-offer-en-360 | none | n/a | none | Same order in English; "Machine details (brand, model, year, power)" wraps to 2 lines, fine. |
| browse-equipment-hi-360 | none | none | none | Tag block ("यंत्र के टैग", ✓ सभी first, two big chips; the long rare-tag label fits one line) sits under the category chips and above the location line and the Offer/Requirement + sort row. At 360 px the 11 category chips use ~60 % of the first screen, so the sort row is at the fold and results start below it (layout fact, not a defect). |
| signup-hi-412 | none | none | none | One page: name, mobile, e-mail, password (+ दिखाएँ), village, visibility line + explanation, ज़रूरी सूचना (unchanged text), acknowledgment box, "स्वीकार करें और आगे बढ़ें" last. No language dropdown, no farmer block. |

Capture artefact (not an app bug): in FULL-page screenshots the fixed header and bottom nav are painted once at the
viewport position, so they appear in the middle of the long image (e.g. over the visibility checkbox on signup-hi-412,
over the "How posting works" card on the equipment forms). On a real phone they stay pinned to the screen edges.

Observation outside 10A scope (reported, not changed): on Browse the "popular listings" teaser strip (4 cards, per
category) is not filtered by the tag chip; the result list is (T3 counts result cards only). Same as before 10A.
