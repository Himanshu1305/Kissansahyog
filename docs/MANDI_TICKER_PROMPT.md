# Kisan Sahyog — Live Mandi Price Ticker Prompt (v2)

DO NOT ask for approval. Auto-accept all actions. Read PROJECT_CONTEXT.md before starting. Update PROJECT_CONTEXT.md after completing.

**Repo:** https://github.com/Himanshu1305/Kissansahyog
**Deploy after completing:** `npx wrangler pages deploy dist --project-name kissansahyog`

---

## Overview

Add a live scrolling mandi price ticker on the homepage showing today's wholesale prices for key crops from Sagar district mandis. Data is fetched from Agmarknet via a free keyless wrapper API for MP, cached in Supabase, and auto-refreshed daily via GitHub Actions — so the ticker is always current and works even when the source API is temporarily down.

**No API key required anywhere.**

---

## Data source architecture (important — read before building)

**Primary source:** `https://mandi-api.onrender.com/v1/prices?state=Madhya Pradesh&commodity=<name>`
- Free, keyless, covers MP
- Re-syncs daily from data.gov.in at ~8:30 PM IST
- Risk: runs on Render free tier, can cold-start slowly or go offline

**Fallback source (if primary fails):** `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070`
- Official government API
- Uses the public demo key: `579b464db66ec23bdd000001c1c5e196de4b4c16e60a17fd58b04bc`  (published in data.gov.in docs — not a secret)
- Rate-limited to 10 records per request — fine for 10 commodities with filters
- Parameters: `?api-key=<key>&format=json&filters[State]=Madhya Pradesh&filters[Commodity]=<name>&limit=10`

**Priority logic in the refresh script:**
1. Try primary wrapper first
2. If primary returns empty or errors → try official API with demo key
3. If both fail → log the failure, keep existing DB data, do not wipe prices
4. Never leave the DB empty after a successful prior run

**Market priority for display (prefer in this order):**
1. Khurai market, Sagar district
2. Any Sagar district market
3. Any MP market (fallback, labelled as "MP भाव" not "सागर भाव")

---

## Phase 1 — Database table (migration 0019)

```sql
CREATE TABLE mandi_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity_en text NOT NULL,
  commodity_hi text NOT NULL,
  market text NOT NULL,
  district text NOT NULL,
  state text NOT NULL DEFAULT 'Madhya Pradesh',
  min_price numeric,
  max_price numeric,
  modal_price numeric NOT NULL,
  price_date date NOT NULL,
  is_sagar_district boolean NOT NULL DEFAULT false,
  fetched_at timestamptz DEFAULT now(),
  UNIQUE(commodity_en, market, price_date)
);
```

RLS: Public read for all rows. No public insert/update (service role key only).

**Commodity map** — API name → Hindi label:
| API name | Hindi |
|---|---|
| Wheat | गेहूं |
| Soyabean | सोयाबीन |
| Gram | चना |
| Lentil | मसूर |
| Moong | मूंग |
| Urad | उड़द |
| Paddy(Dhan)(Common) | धान |
| Maize | मक्का |
| Mustard | सरसों |
| Garlic | लहसुन |

---

## Phase 2 — Refresh script with dual-source fallback

Create `scripts/refresh-mandi-prices.mjs`:

```javascript
// scripts/refresh-mandi-prices.mjs
// Fetches today's mandi prices for Sagar/MP and upserts into Supabase.
// No API key required for primary source.
// Falls back to official data.gov.in API with public demo key if primary fails.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DATA_GOV_DEMO_KEY = '579b464db66ec23bdd000001c1c5e196de4b4c16e60a17fd58b04bc';

const COMMODITIES = [
  { api: 'Wheat', hi: 'गेहूं' },
  { api: 'Soyabean', hi: 'सोयाबीन' },
  { api: 'Gram', hi: 'चना' },
  { api: 'Lentil', hi: 'मसूर' },
  { api: 'Moong', hi: 'मूंग' },
  { api: 'Urad', hi: 'उड़द' },
  { api: 'Paddy(Dhan)(Common)', hi: 'धान' },
  { api: 'Maize', hi: 'मक्का' },
  { api: 'Mustard', hi: 'सरसों' },
  { api: 'Garlic', hi: 'लहसुन' },
];

const MARKET_PRIORITY = ['Khurai', 'Sagar', 'Rehli', 'Banda', 'Deori'];

async function fetchFromWrapper(commodity) {
  const url = `https://mandi-api.onrender.com/v1/prices?state=Madhya Pradesh&commodity=${encodeURIComponent(commodity)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Wrapper HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.records || data.data || []);
}

async function fetchFromOfficial(commodity) {
  const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${DATA_GOV_DEMO_KEY}&format=json&filters[State]=Madhya Pradesh&filters[Commodity]=${encodeURIComponent(commodity)}&limit=10`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Official API HTTP ${res.status}`);
  const data = await res.json();
  return data.records || [];
}

function pickBestRecord(records) {
  // Prefer Sagar district, then Khurai market within that
  const sagarRecords = records.filter(r =>
    (r.district || r.District || '').toLowerCase() === 'sagar'
  );
  const pool = sagarRecords.length > 0 ? sagarRecords : records;

  for (const preferred of MARKET_PRIORITY) {
    const match = pool.find(r =>
      (r.market || r.Market || '').toLowerCase() === preferred.toLowerCase()
    );
    if (match) return { record: match, isSagar: sagarRecords.length > 0 };
  }
  return pool.length > 0
    ? { record: pool[0], isSagar: sagarRecords.length > 0 }
    : null;
}

function normalizeRecord(raw) {
  return {
    market: raw.market || raw.Market || 'Unknown',
    district: raw.district || raw.District || 'Unknown',
    min_price: parseFloat(raw.min_price || raw.Min_Price || 0) || null,
    max_price: parseFloat(raw.max_price || raw.Max_Price || 0) || null,
    modal_price: parseFloat(raw.modal_price || raw.Modal_Price || 0),
  };
}

async function main() {
  const today = new Date().toISOString().split('T')[0];
  let totalFetched = 0;
  let totalFailed = 0;

  for (const { api, hi } of COMMODITIES) {
    let records = [];
    let source = 'wrapper';

    try {
      records = await fetchFromWrapper(api);
      if (records.length === 0) throw new Error('Empty from wrapper');
    } catch (e) {
      console.log(`Wrapper failed for ${api}: ${e.message}. Trying official API...`);
      source = 'official';
      try {
        records = await fetchFromOfficial(api);
      } catch (e2) {
        console.error(`Both sources failed for ${api}: ${e2.message}`);
        totalFailed++;
        continue;
      }
    }

    const best = pickBestRecord(records);
    if (!best) {
      console.log(`No records found for ${api} in MP`);
      totalFailed++;
      continue;
    }

    const norm = normalizeRecord(best.record);
    if (!norm.modal_price || norm.modal_price === 0) {
      console.log(`Invalid price for ${api}, skipping`);
      continue;
    }

    const row = {
      commodity_en: api,
      commodity_hi: hi,
      market: norm.market,
      district: norm.district,
      state: 'Madhya Pradesh',
      min_price: norm.min_price,
      max_price: norm.max_price,
      modal_price: norm.modal_price,
      price_date: today,
      is_sagar_district: best.isSagar,
      fetched_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('mandi_prices')
      .upsert(row, { onConflict: 'commodity_en,market,price_date' });

    if (error) {
      console.error(`DB upsert failed for ${api}:`, error.message);
      totalFailed++;
    } else {
      console.log(`✓ ${hi} (${api}) — ₹${norm.modal_price}/qtl from ${norm.market} [${source}]`);
      totalFetched++;
    }
  }

  console.log(`\nDone: ${totalFetched} prices fetched, ${totalFailed} failed.`);
  if (totalFetched === 0 && totalFailed > 0) {
    console.log('All fetches failed — existing DB prices preserved.');
    process.exit(0); // Exit 0 so GitHub Actions does not fail the workflow
  }
}

main().catch(e => { console.error(e); process.exit(0); });
```

Add to `package.json`:
```json
"refresh-prices": "node scripts/refresh-mandi-prices.mjs"
```

---

## Phase 3 — GitHub Actions daily cron

Create `.github/workflows/refresh-mandi-prices.yml`:

```yaml
name: Refresh Mandi Prices

on:
  schedule:
    - cron: '0 9 * * *'  # 2:30 PM IST = 09:00 UTC
  workflow_dispatch:       # Allow manual trigger from GitHub Actions UI

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Refresh mandi prices
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: npm run refresh-prices
```

**Add GitHub repository secrets** — document in PROJECT_CONTEXT.md that the following secrets must be set in the GitHub repo (Settings → Secrets → Actions):
- `VITE_SUPABASE_URL` — the Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — the service role key

These are already in the local `.env` — they just need to be added to GitHub secrets separately (Claude Code cannot do this — it must be done manually in the GitHub UI). Add a clear note in PROJECT_CONTEXT.md:
> "**MANUAL STEP REQUIRED:** Add VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as GitHub Actions secrets at https://github.com/Himanshu1305/Kissansahyog/settings/secrets/actions — this enables the daily price refresh cron to run automatically."

---

## Phase 4 — Seed initial prices

Run the refresh script immediately as part of this build:
```bash
npm run refresh-prices
```

If the script fetches real data — great, the ticker will show today's actual prices.

If both sources fail or return empty (possible if run before 2 PM IST), insert static seed prices as fallback — clearly commented as approximate recent Sagar district prices:

```sql
INSERT INTO mandi_prices (commodity_en, commodity_hi, market, district, state, min_price, max_price, modal_price, price_date, is_sagar_district)
VALUES
  ('Wheat', 'गेहूं', 'Khurai', 'Sagar', 'Madhya Pradesh', 2200, 2450, 2318, CURRENT_DATE - 1, true),
  ('Soyabean', 'सोयाबीन', 'Sagar', 'Sagar', 'Madhya Pradesh', 4200, 4700, 4450, CURRENT_DATE - 1, true),
  ('Gram', 'चना', 'Sagar', 'Sagar', 'Madhya Pradesh', 4800, 5400, 5100, CURRENT_DATE - 1, true),
  ('Lentil', 'मसूर', 'Khurai', 'Sagar', 'Madhya Pradesh', 5500, 6200, 5800, CURRENT_DATE - 1, true),
  ('Moong', 'मूंग', 'Sagar', 'Sagar', 'Madhya Pradesh', 6800, 7500, 7100, CURRENT_DATE - 1, true),
  ('Paddy(Dhan)(Common)', 'धान', 'Sagar', 'Sagar', 'Madhya Pradesh', 1500, 1750, 1617, CURRENT_DATE - 1, true),
  ('Garlic', 'लहसुन', 'Khurai', 'Sagar', 'Madhya Pradesh', 3000, 4500, 3800, CURRENT_DATE - 1, true)
ON CONFLICT (commodity_en, market, price_date) DO NOTHING;
```

Note: seeded with CURRENT_DATE - 1 so the UI correctly shows "कल के भाव / Yesterday's prices" rather than falsely claiming these are today's prices.

---

## Phase 5 — Homepage ticker UI

### Placement
Immediately below the compact hero, above the category scroll strip.

### Design
Horizontal auto-scrolling ticker:
- Background: `#1a4731` (deep dark green)
- Text: white (`#ffffff`)
- Height: 38px exactly — reserve this height in CSS even before data loads to prevent layout shift
- Left section (fixed, non-scrolling, ~140px wide): "📊 आज के मंडी भाव" (Hindi) / "Today's Mandi Prices" (English) — switches with language toggle
- Right section: scrolling prices

### Each ticker item
```
गेहूं  ₹2,318/क्विंटल  ·  खुरई मंडी     |     सोयाबीन  ₹4,450/क्विंटल  ·  सागर मंडी     |
```
- Show `modal_price` only (not min/max — cleaner for a ticker)
- Show `commodity_hi` (Hindi name, always, regardless of language toggle)
- Show market name in Hindi (see map below)
- Separator between items: ` | ` with padding

### Market name Hindi map
```javascript
const MARKET_NAME_HI = {
  'Khurai': 'खुरई मंडी',
  'Sagar': 'सागर मंडी',
  'Rehli': 'रेहली मंडी',
  'Banda': 'बांदा मंडी',
  'Deori': 'देवरी मंडी',
  'Malthone': 'मालथोन मंडी',
};
// Fallback: if market not in map, show as-is
```

### Data logic
```javascript
// Fetch from Supabase (public read, no auth needed)
// 1. Try today's prices (price_date = today)
// 2. If none: try yesterday (price_date = yesterday), show "कल के भाव / Yesterday's prices" note
// 3. If none at all: show "मंडी भाव जल्द उपलब्ध होंगे / Prices coming soon"
// Prefer is_sagar_district = true rows first
```

### Scroll animation (CSS only, no JS library)
```css
@keyframes ticker-scroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.ticker-content {
  display: flex;
  width: max-content;
  animation: ticker-scroll 80s linear infinite;
}
.ticker-content:hover,
.ticker-content:focus-within {
  animation-play-state: paused;
}
/* Duplicate the content once so the loop is seamless */
```

### Yesterday's prices note
If showing yesterday's data, show a small pill badge on the fixed left section:
- Hindi: "कल के / Yesterday's"
- Color: amber/orange to indicate it's not today's data

### Loading state
While fetching from Supabase, show a shimmer placeholder in the ticker area (same 38px height, subtle animated gradient) — prevents layout shift.

### Accessibility
```html
<div role="marquee" aria-label="Today's mandi prices" aria-live="off">
```

---

## Phase 6 — Verification

**Run refresh script:**
```bash
npm run refresh-prices
```
Check output — should show prices fetched or a clean failure message (never a crash).

**Staging checks:**
- Ticker visible on homepage immediately below hero
- At least 5 commodity prices scrolling
- Scroll pauses on hover/tap
- "Yesterday's prices" note shows if using seed data
- Language toggle switches ticker label correctly
- On 375px mobile: ticker does not overflow, text is readable
- No console errors
- GitHub Actions workflow file exists at `.github/workflows/refresh-mandi-prices.yml`

**Test checklist:**
- Positive: Ticker shows commodity prices with market names in Hindi
- Positive: Modal price displayed (not min/max)
- Positive: Scroll pauses on hover
- Positive: Refresh script completes without crash even if both APIs fail
- Positive: Existing DB prices preserved when both APIs fail
- Negative: Empty mandi_prices table → "coming soon" message, not broken layout
- Edge: Before 2 PM IST — yesterday's prices shown with amber "Yesterday's" badge
- Edge: Khurai market data preferred over generic Sagar market data
- Regression: Homepage hero, category strip, live listings, resources, articles all unaffected

---

## Commit and deploy

Single commit: "Mandi price ticker: homepage scrolling prices from Agmarknet/data.gov.in; dual-source fallback; daily GitHub Actions cron; cached in Supabase"

Deploy: `npx wrangler pages deploy dist --project-name kissansahyog`

---

## Manual step after deploy (document prominently in PROJECT_CONTEXT.md)

Add these two GitHub Actions secrets at:
https://github.com/Himanshu1305/Kissansahyog/settings/secrets/actions

- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Without these, the daily cron will fail silently. The ticker will still show the last cached prices from the DB — it won't break — but prices will stop updating daily.
