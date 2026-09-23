# Kisan Sahyog — Weather Widget + MSP Table Prompt

DO NOT ask for approval. Auto-accept all actions. Read PROJECT_CONTEXT.md before starting. Update PROJECT_CONTEXT.md after completing.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy after completing:** `npx wrangler pages deploy dist --project-name kissansahyog`

---

## Overview

Two additions to the homepage and a new /info page:

1. **Weather widget** — 5-day forecast for Khurai/Sagar showing temperature and rainfall, using Open-Meteo (free, no API key, no registration)
2. **MSP table** — current government Minimum Support Prices for all relevant crops, with a comparison to mandi prices already in the DB
3. **A new /info page** — consolidates weather, MSP, and future information features in one place, linked from the homepage

**No API key required anywhere. No registration required.**

---

## Phase 1 — Database: both new tables in one migration (0020)

Write a single migration file `supabase/migrations/0020_weather_msp.sql` containing both CREATE TABLE statements below. Do not create two separate files both numbered 0020.

### MSP table

MSP is announced twice a year by the government (Kharif in June, Rabi in October). Store it in the DB so it can be admin-updated when new rates are announced, and so it can be compared to live mandi prices.

```sql
CREATE TABLE msp_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_en text NOT NULL,
  crop_hi text NOT NULL,
  variety text,
  season text NOT NULL CHECK (season IN ('kharif', 'rabi', 'commercial')),
  marketing_year text NOT NULL,
  msp_per_quintal numeric NOT NULL,
  increase_from_previous numeric,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(crop_en, variety, marketing_year)
);
```

RLS: Public read for is_active = true. Admin-only insert/update (service role key).

**Seed with verified 2026-27 MSP data (from CACP/CCEA official announcements):**

```sql
INSERT INTO msp_prices (crop_en, crop_hi, variety, season, marketing_year, msp_per_quintal, increase_from_previous, is_active) VALUES

-- Kharif 2026-27 (announced May 2026)
('Paddy', 'धान', 'Common', 'kharif', '2026-27', 2441, 72, true),
('Paddy', 'धान', 'Grade A', 'kharif', '2026-27', 2461, 72, true),
('Jowar', 'ज्वार', 'Hybrid', 'kharif', '2026-27', 4023, 324, true),
('Bajra', 'बाजरा', NULL, 'kharif', '2026-27', 2900, 125, true),
('Maize', 'मक्का', NULL, 'kharif', '2026-27', 2410, 10, true),
('Tur (Arhar)', 'अरहर (तुअर)', NULL, 'kharif', '2026-27', 8450, 450, true),
('Moong', 'मूंग', NULL, 'kharif', '2026-27', 8780, 12, true),
('Urad', 'उड़द', NULL, 'kharif', '2026-27', 8200, 400, true),
('Soyabean', 'सोयाबीन', 'Yellow', 'kharif', '2026-27', 5708, 380, true),
('Groundnut', 'मूंगफली', NULL, 'kharif', '2026-27', 7517, 254, true),
('Sunflower Seed', 'सूरजमुखी', NULL, 'kharif', '2026-27', 8343, 622, true),
('Sesamum', 'तिल', NULL, 'kharif', '2026-27', 10346, 500, true),
('Nigerseed', 'रामतिल', NULL, 'kharif', '2026-27', 10052, 0, true),
('Cotton', 'कपास', 'Medium Staple', 'kharif', '2026-27', 8267, 557, true),
('Cotton', 'कपास', 'Long Staple', 'kharif', '2026-27', 8667, 557, true),

-- Rabi 2026-27 (announced October 2025)
('Wheat', 'गेहूं', NULL, 'rabi', '2026-27', 2585, 160, true),
('Barley', 'जौ', NULL, 'rabi', '2026-27', 2150, 170, true),
('Gram', 'चना', NULL, 'rabi', '2026-27', 5875, 225, true),
('Masur (Lentil)', 'मसूर', NULL, 'rabi', '2026-27', 7000, 300, true),
('Rapeseed & Mustard', 'सरसों', NULL, 'rabi', '2026-27', 5950, 300, true),
('Safflower', 'कुसुम', NULL, 'rabi', '2026-27', 5940, 140, true)

ON CONFLICT (crop_en, variety, marketing_year) DO NOTHING;
```

---

## Phase 2 — Weather caching (server-side, same pattern as mandi ticker)

Weather data is cached in Supabase and refreshed every 3 hours via GitHub Actions — same architecture as the mandi ticker. This ensures the homepage is instant and works even when Open-Meteo is temporarily slow or down.

### Weather cache table (also in migration 0020 — same file as MSP table above)

```sql
CREATE TABLE weather_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_name text NOT NULL DEFAULT 'Khurai/Sagar',
  latitude numeric NOT NULL DEFAULT 23.84,
  longitude numeric NOT NULL DEFAULT 78.73,
  current_temp numeric,
  current_humidity numeric,
  current_weathercode integer,
  forecast jsonb NOT NULL DEFAULT '[]',
  -- forecast is an array of 5 objects:
  -- [{date, day_hi, temp_max, temp_min, precipitation_sum, weathercode, precipitation_probability_max}]
  rain_alert_48h boolean NOT NULL DEFAULT false,
  -- true if any day in next 2 days has precipitation_sum > 3mm
  fetched_at timestamptz DEFAULT now(),
  UNIQUE(location_name)
);
```

RLS: Public read. Admin/service-role-only write.

**Add to `scripts/refresh-mandi-prices.mjs`** — extend the existing script to also refresh weather at the end of each run:

```javascript
// Append to existing refresh script after mandi price updates

async function refreshWeather() {
  const url = 'https://api.open-meteo.com/v1/forecast' +
    '?latitude=23.84&longitude=78.73' +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,precipitation_probability_max' +
    '&current=temperature_2m,relative_humidity_2m,weathercode' +
    '&timezone=Asia%2FKolkata&forecast_days=5';

  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const data = await res.json();

  const DAYS_HI = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
  const forecast = data.daily.time.map((date, i) => ({
    date,
    day_hi: DAYS_HI[new Date(date).getDay()],
    temp_max: data.daily.temperature_2m_max[i],
    temp_min: data.daily.temperature_2m_min[i],
    precipitation_sum: data.daily.precipitation_sum[i] || 0,
    weathercode: data.daily.weathercode[i],
    precipitation_probability_max: data.daily.precipitation_probability_max[i] || 0,
  }));

  const rainAlert48h = forecast.slice(0, 2).some(d => d.precipitation_sum > 3);

  const row = {
    location_name: 'Khurai/Sagar',
    latitude: 23.84,
    longitude: 78.73,
    current_temp: data.current.temperature_2m,
    current_humidity: data.current.relative_humidity_2m,
    current_weathercode: data.current.weathercode,
    forecast,
    rain_alert_48h: rainAlert48h,
    fetched_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('weather_cache')
    .upsert(row, { onConflict: 'location_name' });

  if (error) {
    console.error('Weather cache update failed:', error.message);
  } else {
    console.log(`✓ Weather cached — ${data.current.temperature_2m}°C, rain alert: ${rainAlert48h}`);
  }
}

// Add at the bottom of main():
try { await refreshWeather(); } catch (e) { console.error('Weather refresh failed:', e.message); }
```

**Update GitHub Actions cron** — change from daily to every 3 hours so weather stays current through the day. In `.github/workflows/refresh-mandi-prices.yml`, replace the existing schedule with:

```yaml
schedule:
  - cron: '0 */3 * * *'   # Every 3 hours UTC (covers 2:30 PM IST and other key times)
workflow_dispatch:         # Keep manual trigger
```

This replaces the previous single daily run. Mandi prices are idempotent so refreshing them 8 times a day is fine and cheap.

**Homepage weather widget** reads from `weather_cache` table — a single fast Supabase query, no external API call on page load.

**WMO weather code → Hindi/English description map:**
```javascript
const WEATHER_CODES = {
  0:  { hi: 'साफ आसमान', en: 'Clear sky', icon: '☀️' },
  1:  { hi: 'अधिकतर साफ', en: 'Mainly clear', icon: '🌤️' },
  2:  { hi: 'आंशिक बादल', en: 'Partly cloudy', icon: '⛅' },
  3:  { hi: 'बादल छाए', en: 'Overcast', icon: '☁️' },
  45: { hi: 'कोहरा', en: 'Foggy', icon: '🌫️' },
  48: { hi: 'घना कोहरा', en: 'Dense fog', icon: '🌫️' },
  51: { hi: 'हल्की बूंदाबांदी', en: 'Light drizzle', icon: '🌦️' },
  61: { hi: 'हल्की बारिश', en: 'Light rain', icon: '🌧️' },
  63: { hi: 'मध्यम बारिश', en: 'Moderate rain', icon: '🌧️' },
  65: { hi: 'भारी बारिश', en: 'Heavy rain', icon: '⛈️' },
  80: { hi: 'बौछार', en: 'Rain showers', icon: '🌦️' },
  95: { hi: 'आंधी-तूफान', en: 'Thunderstorm', icon: '⛈️' },
};
const DEFAULT_WEATHER = { hi: 'मौसम', en: 'Weather', icon: '🌡️' };
```

---

## Phase 3 — Homepage additions

### 3a. Weather + MSP highlight section

Add a compact 2-column section on the homepage between the mandi price ticker and the category strip (or wherever it flows best after the ticker from the previous prompt):

**Left card — Weather (compact):**
- Shows current temp + condition + location
- "5 दिन का पूर्वानुमान / 5-day forecast →" link to /info#weather

**Right card — MSP highlight:**
- Title: "सरकारी समर्थन मूल्य (MSP) 2026-27"
- Show 3-4 most relevant Sagar crops: Wheat ₹2,585 | Soyabean ₹5,708 | Gram ₹5,875 | Lentil ₹7,000
- "पूरी सूची / Full list →" link to /info#msp
- Small note: "MSP वह न्यूनतम मूल्य है जो सरकार आपकी फसल के लिए देती है"

### 3b. Rainfall alert (conditional)

If the weather API shows rain in the next 48 hours (precipitation_sum > 3mm on day 1 or 2), show a subtle alert strip above the category scroll strip — same style as the mandi ticker but amber/yellow:
> "🌧️ अगले 48 घंटों में बारिश की संभावना — खुरई / सागर"
> "Rain likely in next 48 hours — Khurai / Sagar"

This disappears automatically when no rain is forecast. Do NOT show if precipitation is 0.

---

## Phase 4 — /info page

Create a dedicated information page at `/info` — public, no login required.

This page consolidates all non-listing information. Think of it as a "farmer's daily reference" page. Structure:

**Page heading:** "किसान की जानकारी / Farmer's Info Centre"

**Mobile layout rules for this page (375px viewport):**
- Each section is a full-width card with a coloured left border to distinguish them visually
- Sections stack vertically with `gap-3` between them — no large padding between sections
- The MSP table scrolls horizontally inside its own container (`overflow-x: auto`) — never truncates the crop names
- The weather forecast 5-day row scrolls horizontally on mobile if needed — do not stack the days vertically
- The Kharif/Rabi tab switcher is a compact pill toggle (full width, 2 options), not tabs that could overflow
- Max page content width: 100% on mobile, `max-w-2xl` on desktop — centred

**Section 1 — मौसम / Weather** (anchor: #weather)
- Full weather widget with 5-day forecast
- Location: खुरई / सागर (lat 23.84, long 78.73)
- The rainfall alert if applicable
- A note: "स्रोत: Open-Meteo (विश्वसनीय मौसम पूर्वानुमान सेवा) / Source: Open-Meteo (reliable weather forecast service)"

**Section 2 — सरकारी समर्थन मूल्य / MSP** (anchor: #msp)
- Heading: "न्यूनतम समर्थन मूल्य (MSP) 2026-27 / Minimum Support Price (MSP) 2026-27"
- Brief explanation (bilingual):
  > Hindi: "सरकार हर साल किसानों की फसलों के लिए न्यूनतम समर्थन मूल्य (MSP) तय करती है। अगर मंडी में आपकी फसल का दाम MSP से कम है, तो सरकार उसे MSP पर खरीदती है।"
  > English: "The government sets a Minimum Support Price (MSP) for crops every year. If the mandi price falls below MSP, the government buys your crop at MSP."

- Two tabs: खरीफ / Kharif | रबी / Rabi

- Each tab shows a compact table:
  | फसल / Crop | MSP (₹/क्विंटल) | पिछले साल से वृद्धि |
  |---|---|---|
  | गेहूं / Wheat | ₹2,585 | +₹160 ↑ |
  | चना / Gram | ₹5,875 | +₹225 ↑ |

- **MSP vs Mandi Price comparison** (the most valuable feature):

  The mandi_prices table uses API commodity names (e.g. "Soyabean", "Paddy(Dhan)(Common)", "Lentil") while the msp_prices table uses CACP names (e.g. "Soyabean", "Paddy", "Masur (Lentil)"). A normalisation map is required — without it, most comparisons will silently show "—" even when data exists for both.

  **Crop name normalisation map** (mandi API name → msp_prices crop_en):
  ```javascript
  const MANDI_TO_MSP = {
    'Wheat': 'Wheat',
    'Soyabean': 'Soyabean',
    'Gram': 'Gram',
    'Lentil': 'Masur (Lentil)',
    'Moong': 'Moong',
    'Urad': 'Urad',
    'Paddy(Dhan)(Common)': 'Paddy',
    'Maize': 'Maize',
    'Mustard': 'Rapeseed & Mustard',
    'Garlic': null,  // No MSP for garlic — don't show comparison
  };
  ```

  Using this map, fetch the matching MSP row for each commodity in the mandi_prices table and show:
  - If mandi modal_price > msp_per_quintal: green chip "MSP से ऊपर ✓ / Above MSP ✓"
  - If mandi modal_price < msp_per_quintal: amber chip "MSP से नीचे ⚠️ / Below MSP ⚠️"
  - If mandi modal_price === null or crop not in map: show "—"
  - If msp entry not found for that crop/season: show "—"

- Source attribution: "स्रोत: CACP / CCEA, भारत सरकार | Source: CACP/CCEA, Government of India"
- Marketing year and "अगला MSP अपडेट / Next MSP update: अक्टूबर 2026 (रबी) / October 2026 (Rabi)"

**Section 3 — उपयोगी संपर्क / Useful Contacts** (anchor: #contacts)
- Same as the existing /resources page content
- Show as a compact link/embed: "पूरी जानकारी के लिए देखें → /resources"
- Or embed the 3 resource category cards directly here

**Nav link:** Add "जानकारी / Info" to the global nav bar linking to /info. Place it between "Resources" and "Articles" in the nav order.

---

## Phase 5 — Admin dashboard: MSP management

Add an MSP management section in the admin dashboard:
- Table of all MSP entries (crop, season, year, price, increase, active status)
- Edit button per row (to update price when new MSP is announced)
- Toggle active/inactive
- "Add new MSP" button (for when next year's rates are announced)
- No CSV export needed (MSP data is public and small)

---

## Phase 6 — Bilingual audit + verification

All new strings through i18n:
- Weather widget labels (day names in Hindi: सोम/Mon, मंगल/Tue, बुध/Wed, गुरु/Thu, शुक्र/Fri, शनि/Sat, रवि/Sun)
- Weather condition descriptions
- Rainfall alert text
- MSP table headings and explanation text
- /info page headings and section labels
- MSP vs mandi comparison labels

**Test checklist:**
- Positive: Weather widget loads on homepage with current temp and 5-day forecast for Khurai/Sagar
- Positive: Rainfall alert shows when rain is forecast (test by checking a rainy day or mocking the API response)
- Positive: Rainfall alert does NOT show when no rain forecast
- Positive: /info page loads with weather, MSP tabs, contacts section
- Positive: Kharif/Rabi tabs switch correctly showing correct crops
- Positive: MSP vs mandi comparison shows green/amber correctly for crops with mandi data
- Positive: Language toggle switches all text on weather widget and /info page
- Positive: Admin can edit an MSP price and the change is reflected immediately on /info
- Negative: Open-Meteo API unavailable → weather shows "temporarily unavailable", page doesn't crash
- Negative: No mandi price for a crop → comparison shows "—" cleanly, not an error
- Edge: Current time before mandi prices are fetched today → yesterday's mandi price used in MSP comparison, labelled as such
- Regression: Mandi ticker (from previous prompt), homepage, all categories unaffected

---

## Commit and deploy

Single commit: "Weather widget + MSP table: 5-day Khurai forecast via Open-Meteo; MSP 2026-27 seeded; /info page; MSP vs mandi comparison; rainfall alert"

Deploy: `npx wrangler pages deploy dist --project-name kissansahyog`

Confirm staging.kissansahyog.com shows:
- Weather widget on homepage with temperature and forecast
- Compact MSP highlight card on homepage
- /info page loads correctly with all three sections
- /resources page unchanged and still working
