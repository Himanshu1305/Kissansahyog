# MP Cold Storage seed list: README

Compiled 5 Oct 2026 for the Kisan Sahyog (kissansahyog.com) cold storage directory.
File: `mp_cold_storages.csv` (UTF-8, every field quoted). It has 179 deduplicated entries, merged from 207 source rows.

Every field comes from a public source, and the source is cited in `source_name` and `source_url` on each row. Blank means the source did not show that value. Nothing was guessed. A few inferences are labelled in `notes`, for example a district worked out from a stated tehsil or block, or a city set to the district town.

## Coverage by district

| District | Entries | | District | Entries |
|---|---|---|---|---|
| Indore | 60 | | Anuppur | 3 |
| Gwalior | 23 | | Khargone | 3 |
| Morena | 15 | | Rewa | 3 |
| Shajapur | 11 | | Shivpuri | 3 |
| Bhind | 8 | | Dhar | 2 |
| Chhindwara | 5 | | Neemuch | 2 |
| Jabalpur | 5 | | Ratlam | 2 |
| Satna | 5 | | Tikamgarh | 2 |
| Ujjain | 5 | | Niwari | 1 |
| Bhopal | 4 | | Chhatarpur | 1 |
| Dewas | 4 | | Guna, Katni, Burhanpur, Narmadapuram, Balaghat, Barwani, Betul, Jhabua | 1 each |
| District not stated in source | 4 | | | |

**Priority districts with zero entries:** Sagar (Bina included), Damoh, Vidisha, Raisen, Sehore, Mandsaur and Khandwa.

**Priority districts that are under-covered:** Chhatarpur, Bhopal, Ujjain, Katni, Guna and Burhanpur. NaPanta has pages for these districts, but they could not be fetched (see Gaps).

Other numbers:
- 31 entries have a phone number. All of these numbers came from NaPanta's Hindi-language pages.
- 102 entries have a capacity in MT.
- 127 entries have an address. Only 8 have a pincode.
- By source type: 43 are official only, 116 are directory only, and 20 are confirmed by both.

## Sources used, most useful first

1. **NaPanta cold storage directory** (napanta.com/cold-storage/madhya-pradesh/...). This source fed 105 entries.
   - It gives the name, locality, contact person and capacity.
   - The English pages mask phone numbers. The Hindi pages (`/hi/...`) print them, so that is where all 31 phones came from.
   - These district pages were fetched: Indore, Gwalior, Morena, Shajapur, Bhind, Chhindwara, Satna, Rewa, Shivpuri, Tikamgarh, Neemuch, Dhar, Betul, Ashoknagar, Balaghat, Sheopur and Hoshangabad.
   - NaPanta mixes in ordinary dry warehouses and Central/State Warehousing depots, which have entries named only after a place, such as "INDORE-I", "SATNA" or "SOHAGPUR". These were excluded. Betul, Ashoknagar and Balaghat turned out to contain only warehouses.
2. **NHB list of NHB-assisted cold storages, Madhya Pradesh** (https://nhb.gov.in/doc/Madhya%20Pradesh.pdf). This is an official source and fed 44 entries. The list has 67 rows: 48 cold storage rows, some of them repeats for expansions, and 19 onion godowns. The onion godowns were excluded because they are not cold storage.
3. **NHB cold storage GIS layer** (https://www.nhb.gov.in/Handlers/GeoIndiaHandlerGis.ashx). This is official and fed 10 entries, each with a name, district and lat/long. One entry named only a person ("PRATIK JAIN", Ujjain) and was left out.
4. **NHB beneficiary list for 2021-22**, Capital Investment Subsidy. This official source added Kalyan Cold Storage in Indore. The lists for 2018-19, 2019-20, 2020-21, 2022-23 and 2023-24 had no cold storage projects in MP.
5. **MoFPI consolidated list of approved cold chain projects, as on 11-03-2025.** This is official and fed 8 integrated cold chain projects for fruits and vegetables. These are processing units and may not rent space to farmers.
6. **IndiaMART city pages for "cold storage services"**, plus company pages. This fed 30 entries. Only businesses that offer storage were kept. Equipment, installation and repair vendors were excluded, and so were IndiaMART's virtual call-tracking phone numbers.
7. **Smaller sources:** Mappls place listings (6 entries, mainly addresses and pincodes), infoisinfo (4 entries, uneven quality), Zaubacorp/MCA (1 company status check) and a piceapp GST lookup (1 entry).

These sources were tried and were blocked or gave nothing usable:
- Justdial (403 errors)
- WDRA's registered warehouse list (the form cannot be scripted, and the PDF timed out)
- NHB's Cold Storage Registry search (needs an interactive form)
- MP Horticulture department (no published list of units found)
- Sulekha, Grotal and Facebook (blocked or irrelevant)
- D&B (permission prompt timed out)

## Data caveats

- **The NHB list is old.** Its sanctions run from 2000 to 2009. Each of its 44 entries says "OLD LIST" in `notes`, with the sanction date. Whether a unit still operates, who owns it and how much it holds have not been verified. Some units have probably closed or changed names.
- **The phone numbers are a privacy risk.** All 31 were printed on NaPanta next to a named manager, so many are probably personal mobiles, and some may be out of date. One example: Yadunath Cold Storage in Bhind has a number in a non-MP mobile series. **Recommendation:** don't show these numbers publicly until the owner claims the listing. Until then, use a "Request contact / संपर्क का अनुरोध करें" button that goes through Kisan Sahyog. The contact person names are in `notes` only, so they can help verify claims; don't put them on the public page.
- **Capacity can disagree between sources.** For example, Kajal Cold Storage is 1650 MT in NHB and 3608 MT in NaPanta. Where that happens, both values are kept, separated by ";".
- **Possible duplicates were flagged, not merged.** Examples: Vrindavan, Maa Umiya and Gangotri appear in both NHB and NaPanta with different villages. Shanti Cold Storage in Chhindwara also appears as NHB's "Unit-2".
- **District boundaries have changed.** Niwari was split from Tikamgarh in 2018, and Anuppur from Shahdol. Malanpur is listed by NHB under Gwalior but sits in Bhind district. These cases are noted on the rows.
- **Some names keep the source's spelling.** Where a name was cleaned up, the original is kept in `notes` (for example "Listed as 'Seeri Ganesh Colad Store'"). The `type` and `products` fields are mostly empty because the sources rarely state them.
- **Some city values are inferred.** For NaPanta rows that show only a locality, `city` was set to the district town and the note says "verify". 38 rows have no city at all.

## Gaps and next steps (manual, about 1 hour)

1. **Open the NaPanta Hindi pages by hand** in a normal browser for Chhatarpur (NaPanta lists 70 rows, many of them probably warehouses), Bhopal (22), Ujjain (15), Burhanpur (12), Katni (3), Guna (2), Barwani, Anuppur, Narsinghpur and Seoni. The page pattern is `https://www.napanta.com/hi/cold-storage/madhya-pradesh/<district>`. Also open the Hindi pages for Indore, Gwalior and Morena to get phone numbers. NaPanta rate-limited the automated fetches.
2. **Search the NHB Cold Storage Registry** at https://www.nhb.gov.in/ColdStorageRegistry/csrProjectStatusNew.aspx with State = Madhya Pradesh and District = Sagar, Damoh, Vidisha and so on. This is the best official way to check the zero-count districts.
3. **For Sagar and Bina:** no public online listing was found. Ask the district horticulture office (उद्यानिकी विभाग, सागर) and the Sagar and Bina mandi secretaries. Or let operators self-register through a WhatsApp or field drive. Sagar should not show seeded data until real entries exist.
4. Check Justdial by hand for Sagar, Damoh, Vidisha, Mandsaur and Khandwa. It blocks automated access.

## Recommended "claim this listing" approach

- **Badge every seeded listing:** "सार्वजनिक स्रोतों से संकलित · मालिक द्वारा सत्यापित नहीं" ("Compiled from public sources · not verified by owner"). Show the source name and the date it was compiled.
- **Put two actions on each listing:**
  - **"यह आपका कोल्ड स्टोरेज है? दावा करें / Claim this listing."** Verify with an OTP to the phone on file. If there is no phone, ask for a GST certificate, a mandi licence or a photo of the signboard, then let the owner edit capacity, products, rates and contact details.
  - **"सुधार या हटाने के लिए संपर्क करें / Request correction or removal."** This should be a simple form or WhatsApp link that needs no login. Act on removal requests within 7 days, and log them.
- **Default visibility:** show the name, town, district and capacity. Hide phone numbers until the listing is claimed. Never show the contact person's name.
- **Freshness:** listings that haven't been claimed for 12 months should show "जानकारी पुरानी हो सकती है" ("Information may be out of date"). Official entries flagged "OLD LIST" should show this from the start.
- **Self-registration** for new units should ask for name, village/town, district, capacity (MT), products (आलू/प्याज/लहसुन/फल/बीज: potato, onion, garlic, fruit, seed), type, rate per bag per month, and a phone number checked by OTP.

---

## Update — 5 Oct 2026: Google Maps / Google Search pass

A second pass was run through a real browser (Google Maps and Google Search, which the first pass could not access).

- **62 new entries added, 25 existing entries enriched** (phone/rating/Google link). **Total now: 241.**
- **Entries with a phone number: 65** (Google business listings show the business's own published number).
- **Sagar district now has 4 entries:** Shiv Shankar Cold Storage (Khurai bypass / near New Galla Mandi, 099937 39544), Janta Cold Storage and Ice Factory (IndiaMART), Mahalaxmi Cold Store (Justdial snippet — verify), ShriRam Warehouse, Bina (096693 13999, verify cold vs dry storage).
- Public listings for Sagar district are genuinely thin — Google Maps shows only one cold storage pin for the whole Sagar area. Field collection (district horticulture office, mandi, field agents) and self-registration are still needed.
- Google results for "Sagar" include unrelated places named "Sagar" in Maharashtra (Sangli) and "Sagar Cold Store" in Maksi (Shajapur) — these were excluded or assigned to their real district.
- Equipment dealers (refrigeration/HVAC/cold-room installers), kirana and cold-drink shops, and a Coca-Cola distributor that Google tags as "cold storage facility" were excluded.
- Where the district was inferred from the map pin rather than the address, the `notes` column says "verify".
- `source_url` for Google entries is a Google Maps search link for that business (name + district).
