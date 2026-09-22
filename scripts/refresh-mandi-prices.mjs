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
