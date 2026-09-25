-- Kisan Sahyog — 0024 मौसम (/mausam) and MSP & मंडी भाव (/msp)
-- Location-keyed weather cache, mandi arrivals + history, alert subscriptions,
-- procurement centres, admin-editable page FAQs, site settings, Bhavantar scheme.
-- Admin writes mirror the require_admin (0012) SECURITY DEFINER pattern.

-- ===========================================================================
-- 1a. Location-keyed weather cache (replaces single-row weather_cache)
-- ===========================================================================
create table if not exists public.weather_cache_v2 (
  grid_key text primary key,               -- lat/lng rounded to 0.1° e.g. "23.8_78.7"
  latitude numeric not null, longitude numeric not null,
  current jsonb not null,
  hourly jsonb not null,
  daily jsonb not null,
  season_rain jsonb,
  fetched_at timestamptz default now()
);
alter table public.weather_cache_v2 enable row level security;
grant select on public.weather_cache_v2 to anon, authenticated;
drop policy if exists wcv2_read on public.weather_cache_v2;
create policy wcv2_read on public.weather_cache_v2 for select to anon, authenticated using (true);

-- Cells requested by the page (drives which cells the refresh script updates).
create table if not exists public.weather_grid_requests (
  grid_key text primary key, latitude numeric not null, longitude numeric not null,
  last_requested_at timestamptz not null default now()
);
alter table public.weather_grid_requests enable row level security;
grant select, insert, update on public.weather_grid_requests to anon, authenticated;
drop policy if exists wgr_read on public.weather_grid_requests;
create policy wgr_read on public.weather_grid_requests for select to anon, authenticated using (true);
drop policy if exists wgr_insert on public.weather_grid_requests;
create policy wgr_insert on public.weather_grid_requests for insert to anon, authenticated with check (true);
drop policy if exists wgr_update on public.weather_grid_requests;
create policy wgr_update on public.weather_grid_requests for update to anon, authenticated using (true) with check (true);

-- ===========================================================================
-- 1b. Mandi arrivals column (history backfilled via GitHub workflow)
-- ===========================================================================
alter table public.mandi_prices add column if not exists arrivals_tonnes numeric;

-- ===========================================================================
-- 1c. Alert subscriptions (capture only)
-- ===========================================================================
create table if not exists public.alert_subscriptions (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  pincode text not null,
  crops text[] not null default '{}',
  alert_types text[] not null default '{weather,price}',
  channel text not null default 'whatsapp',
  consent_text text not null,
  consented_at timestamptz not null default now(),
  source_page text,
  is_active boolean not null default true,
  unique (phone, channel)
);
alter table public.alert_subscriptions enable row level security;
-- No anon read. Writes go through the subscribe_alert RPC (validates phone, upserts).

create or replace function public.subscribe_alert(
  p_phone text, p_pincode text, p_crops text[], p_alert_types text[],
  p_channel text, p_consent_text text, p_source_page text
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_phone !~ '^[6-9][0-9]{9}$' then raise exception 'invalid_phone'; end if;
  if coalesce(p_consent_text,'') = '' then raise exception 'consent_required'; end if;
  insert into public.alert_subscriptions (phone, pincode, crops, alert_types, channel, consent_text, source_page, is_active)
  values (p_phone, coalesce(p_pincode,''), coalesce(p_crops,'{}'), coalesce(p_alert_types,'{weather,price}'),
          coalesce(p_channel,'whatsapp'), p_consent_text, p_source_page, true)
  on conflict (phone, channel) do update set
    pincode = excluded.pincode, crops = excluded.crops, alert_types = excluded.alert_types,
    consent_text = excluded.consent_text, source_page = excluded.source_page,
    consented_at = now(), is_active = true;
end $$;
grant execute on function public.subscribe_alert(text, text, text[], text[], text, text, text) to anon, authenticated;

create or replace function public.get_admin_subscriptions(p_actor_id uuid)
returns setof public.alert_subscriptions language plpgsql security definer set search_path = public, pg_temp as $$
begin perform public.require_admin(p_actor_id);
  return query select * from public.alert_subscriptions order by consented_at desc; end $$;

create or replace function public.admin_set_subscription_active(p_actor_id uuid, p_id uuid, p_active boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin perform public.require_admin(p_actor_id);
  update public.alert_subscriptions set is_active = p_active where id = p_id; end $$;
grant execute on function public.get_admin_subscriptions(uuid) to anon, authenticated;
grant execute on function public.admin_set_subscription_active(uuid, uuid, boolean) to anon, authenticated;

-- ===========================================================================
-- 1d. Procurement centres (sell-at-MSP)
-- ===========================================================================
create table if not exists public.procurement_centres (
  id uuid primary key default gen_random_uuid(),
  name_hi text not null, location text, district text default 'Sagar',
  crops text[] not null, season text check (season in ('kharif','rabi')),
  registration_open date, registration_close date, procurement_from date, procurement_to date,
  portal_url text, notes_hi text, is_active boolean default true, updated_at timestamptz default now()
);
alter table public.procurement_centres enable row level security;
grant select on public.procurement_centres to anon, authenticated;
drop policy if exists pc_read on public.procurement_centres;
create policy pc_read on public.procurement_centres for select to anon, authenticated using (is_active = true);

create or replace function public.get_admin_procurement(p_actor_id uuid)
returns setof public.procurement_centres language plpgsql security definer set search_path = public, pg_temp as $$
begin perform public.require_admin(p_actor_id);
  return query select * from public.procurement_centres order by updated_at desc; end $$;

create or replace function public.admin_upsert_procurement(
  p_actor_id uuid, p_id uuid, p_name_hi text, p_location text, p_district text, p_crops text[],
  p_season text, p_registration_open date, p_registration_close date, p_procurement_from date,
  p_procurement_to date, p_portal_url text, p_notes_hi text, p_is_active boolean
) returns public.procurement_centres language plpgsql security definer set search_path = public, pg_temp as $$
declare v public.procurement_centres%rowtype;
begin perform public.require_admin(p_actor_id);
  if p_id is null then
    insert into public.procurement_centres (name_hi,location,district,crops,season,registration_open,registration_close,procurement_from,procurement_to,portal_url,notes_hi,is_active,updated_at)
    values (p_name_hi,p_location,coalesce(p_district,'Sagar'),coalesce(p_crops,'{}'),p_season,p_registration_open,p_registration_close,p_procurement_from,p_procurement_to,p_portal_url,p_notes_hi,coalesce(p_is_active,true),now())
    returning * into v;
  else
    update public.procurement_centres set name_hi=p_name_hi,location=p_location,district=coalesce(p_district,'Sagar'),crops=coalesce(p_crops,'{}'),
      season=p_season,registration_open=p_registration_open,registration_close=p_registration_close,procurement_from=p_procurement_from,
      procurement_to=p_procurement_to,portal_url=p_portal_url,notes_hi=p_notes_hi,is_active=coalesce(p_is_active,true),updated_at=now()
    where id=p_id returning * into v;
  end if;
  return v; end $$;

create or replace function public.admin_delete_procurement(p_actor_id uuid, p_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin perform public.require_admin(p_actor_id); delete from public.procurement_centres where id=p_id; end $$;
grant execute on function public.get_admin_procurement(uuid) to anon, authenticated;
grant execute on function public.admin_upsert_procurement(uuid,uuid,text,text,text,text[],text,date,date,date,date,text,text,boolean) to anon, authenticated;
grant execute on function public.admin_delete_procurement(uuid,uuid) to anon, authenticated;

-- ===========================================================================
-- 1e. Page FAQs (admin-editable, drive FAQPage schema) + site settings
-- ===========================================================================
create table if not exists public.page_faqs (
  id uuid primary key default gen_random_uuid(),
  page_key text not null, q_hi text not null, q_en text, a_hi text not null, a_en text,
  sort_order integer default 0
);
alter table public.page_faqs enable row level security;
grant select on public.page_faqs to anon, authenticated;
drop policy if exists faq_read on public.page_faqs;
create policy faq_read on public.page_faqs for select to anon, authenticated using (true);

create or replace function public.get_admin_page_faqs(p_actor_id uuid, p_page text)
returns setof public.page_faqs language plpgsql security definer set search_path = public, pg_temp as $$
begin perform public.require_admin(p_actor_id);
  return query select * from public.page_faqs where p_page is null or page_key = p_page order by page_key, sort_order; end $$;

create or replace function public.admin_upsert_page_faq(
  p_actor_id uuid, p_id uuid, p_page_key text, p_q_hi text, p_q_en text, p_a_hi text, p_a_en text, p_sort_order integer
) returns public.page_faqs language plpgsql security definer set search_path = public, pg_temp as $$
declare v public.page_faqs%rowtype;
begin perform public.require_admin(p_actor_id);
  if p_id is null then
    insert into public.page_faqs (page_key,q_hi,q_en,a_hi,a_en,sort_order) values (p_page_key,p_q_hi,p_q_en,p_a_hi,p_a_en,coalesce(p_sort_order,0)) returning * into v;
  else
    update public.page_faqs set page_key=p_page_key,q_hi=p_q_hi,q_en=p_q_en,a_hi=p_a_hi,a_en=p_a_en,sort_order=coalesce(p_sort_order,0) where id=p_id returning * into v;
  end if;
  return v; end $$;

create or replace function public.admin_delete_page_faq(p_actor_id uuid, p_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin perform public.require_admin(p_actor_id); delete from public.page_faqs where id=p_id; end $$;
grant execute on function public.get_admin_page_faqs(uuid,text) to anon, authenticated;
grant execute on function public.admin_upsert_page_faq(uuid,uuid,text,text,text,text,text,integer) to anon, authenticated;
grant execute on function public.admin_delete_page_faq(uuid,uuid) to anon, authenticated;

-- Site settings (key/value). Public read; admin write.
create table if not exists public.site_settings (
  key text primary key, value jsonb, updated_at timestamptz default now()
);
alter table public.site_settings enable row level security;
grant select on public.site_settings to anon, authenticated;
drop policy if exists ss_read on public.site_settings;
create policy ss_read on public.site_settings for select to anon, authenticated using (true);
insert into public.site_settings (key, value) values ('mausam_msp_content_reviewed', 'false'::jsonb) on conflict (key) do nothing;

create or replace function public.admin_set_site_setting(p_actor_id uuid, p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin perform public.require_admin(p_actor_id);
  insert into public.site_settings (key, value, updated_at) values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now(); end $$;
grant execute on function public.admin_set_site_setting(uuid, text, jsonb) to anon, authenticated;

-- Data-health read (admin): last mandi price date per commodity + weather cell freshness.
create or replace function public.get_admin_data_health(p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare result jsonb;
begin perform public.require_admin(p_actor_id);
  select jsonb_build_object(
    'mandi', (select jsonb_agg(x) from (select commodity_en, max(price_date) as last_date, count(*) as rows from public.mandi_prices group by commodity_en order by commodity_en) x),
    'weather', (select jsonb_agg(x) from (select grid_key, fetched_at from public.weather_cache_v2 order by grid_key) x)
  ) into result;
  return result; end $$;
grant execute on function public.get_admin_data_health(uuid) to anon, authenticated;

-- Seed: page FAQs (mausam + msp)
insert into public.page_faqs (page_key,q_hi,q_en,a_hi,a_en,sort_order) values ('mausam','कल बारिश होगी या नहीं कैसे पता करें?','How do I know if it will rain tomorrow?','इस पेज पर ''आज'' कार्ड और 48-घंटे की पट्टी देखें — यह घंटे-दर-घंटे बारिश की संभावना और अनुमानित मिमी दिखाती है। 7-दिन की तालिका में हर दिन की बारिश और संभावना दी होती है। यह Open-Meteo मौसम मॉडल पर आधारित अनुमान है; पक्की चेतावनी के लिए IMD का ज़िला बुलेटिन देखें।','Check the ''Today'' card and the 48-hour strip on this page — it shows the hour-by-hour rain probability and expected mm. The 7-day table gives each day''s rain and probability. This is a forecast from the Open-Meteo model; for an official warning see the IMD district bulletin.',1) on conflict do nothing;
insert into public.page_faqs (page_key,q_hi,q_en,a_hi,a_en,sort_order) values ('mausam','छिड़काव के लिए सबसे अच्छा समय क्या है?','What is the best time for spraying?','आमतौर पर सुबह 7–10 बजे सबसे अच्छा रहता है, जब हवा कम और तापमान ठीक हो। छिड़काव तब टालें जब 6 घंटे में 2 मिमी से ज़्यादा बारिश का अनुमान हो या हवा 15 किमी/घंटा से तेज़ हो — दवा बह जाती है या उड़ जाती है। ''आज क्या करें'' के छिड़काव टाइल में यही नियम लगे हैं।','Usually 7–10 am is best, when wind is low and temperature moderate. Avoid spraying when more than 2 mm of rain is expected within 6 hours or wind is above 15 km/h — the spray washes off or drifts. The spraying tile in ''What to do today'' applies exactly these rules.',2) on conflict do nothing;
insert into public.page_faqs (page_key,q_hi,q_en,a_hi,a_en,sort_order) values ('mausam','IMD की पीली चेतावनी का मतलब क्या है?','What does IMD''s Yellow warning mean?','IMD 24 घंटे की बारिश के अनुसार रंग देता है: पीला = भारी बारिश (64.5–115.5 मिमी), नारंगी = बहुत भारी (115.5–204.5 मिमी), लाल = अत्यधिक (204.5 मिमी से ऊपर)। पीला मतलब सतर्क रहें। हमारा बैज इन्हीं सीमाओं से बनाया जाता है, पर यह IMD की आधिकारिक चेतावनी नहीं — पक्की जानकारी mausam.imd.gov.in पर देखें।','IMD assigns colours by 24-hour rainfall: Yellow = heavy (64.5–115.5 mm), Orange = very heavy (115.5–204.5 mm), Red = extremely heavy (above 204.5 mm). Yellow means be alert. Our badge is derived from these same thresholds but is not an official IMD warning — check mausam.imd.gov.in for the authority.',3) on conflict do nothing;
insert into public.page_faqs (page_key,q_hi,q_en,a_hi,a_en,sort_order) values ('mausam','क्या यह पूर्वानुमान पक्का है?','Is this forecast certain?','अगले 2–3 दिन का अनुमान आमतौर पर भरोसेमंद रहता है; 7 दिन से आगे का अनुमान कम पक्का होता है और बदल सकता है। 16-दिन का आउटलुक सिर्फ़ मोटा अंदाज़ा है। कोई भी बड़ा फैसला लेने से पहले सुबह ताज़ा अनुमान दोबारा देखें।','The next 2–3 days are usually reliable; beyond 7 days the forecast is less certain and can change. The 16-day outlook is only a rough idea. Before any big decision, re-check the fresh forecast in the morning.',4) on conflict do nothing;
insert into public.page_faqs (page_key,q_hi,q_en,a_hi,a_en,sort_order) values ('mausam','मेरे गाँव का मौसम कैसे देखें?','How do I see my village''s weather?','ऊपर ''पिनकोड बदलें'' पर टैप करके अपना 6-अंकों का पिनकोड डालें। पेज उसी इलाके का मौसम दिखाने लगेगा और अगली बार वही याद रखेगा। पिनकोड न पता हो तो नज़दीकी कस्बे का पिनकोड डालें।','Tap ''Change pincode'' at the top and enter your 6-digit pincode. The page will show that area''s weather and remember it next time. If you don''t know your pincode, use the nearest town''s pincode.',5) on conflict do nothing;
insert into public.page_faqs (page_key,q_hi,q_en,a_hi,a_en,sort_order) values ('mausam','बारिश में कटी फसल कैसे बचाएँ?','How do I protect a harvested crop in the rain?','अगले 48 घंटे में 5 मिमी से ज़्यादा बारिश का अनुमान हो तो कटी फसल तुरंत तिरपाल से ढकें या सुरक्षित गोदाम में रखें। मड़ाई तभी करें जब दाना सूखा हो (नमी ~12–13%)। गीला अनाज काला पड़ सकता है और भाव गिरता है। पास के गोदाम ''गोदाम/भंडारण'' श्रेणी में देखें।','If more than 5 mm of rain is expected in the next 48 hours, cover the harvested crop with a tarpaulin at once or move it to a safe warehouse. Thresh only when the grain is dry (~12–13% moisture). Wet grain can blacken and the price drops. Find nearby warehouses in the ''Warehouse/Storage'' category.',6) on conflict do nothing;
insert into public.page_faqs (page_key,q_hi,q_en,a_hi,a_en,sort_order) values ('mausam','सिंचाई कब करें?','When should I irrigate?','जब अगले 48 घंटे में अच्छी बारिश (10 मिमी+) का अनुमान हो तो सिंचाई रोकें — पानी की बचत होगी। जब मौसम सूखा हो, वाष्पन (ET0) ज़्यादा हो और मिट्टी में नमी कम हो, तब सिंचाई ठीक रहती है। ''आज क्या करें'' की सिंचाई टाइल यही देखकर सलाह देती है।','When good rain (10 mm+) is expected in the next 48 hours, hold irrigation — it saves water. When the weather is dry, evaporation (ET0) is high and soil moisture is low, irrigation is appropriate. The irrigation tile in ''What to do today'' advises based on exactly this.',7) on conflict do nothing;
insert into public.page_faqs (page_key,q_hi,q_en,a_hi,a_en,sort_order) values ('mausam','मौसम की जानकारी WhatsApp पर कैसे पाएँ?','How do I get weather updates on WhatsApp?','इस पेज पर नीचे ''रोज़ सुबह अपने गाँव का मौसम WhatsApp पर पाएँ'' फ़ॉर्म भरें — मोबाइल नंबर, पिनकोड और फसल चुनें और सहमति दें। पायलट के दौरान यह मुफ़्त है। कभी भी STOP लिखकर बंद कर सकते हैं।','Fill the ''Get your village weather on WhatsApp every morning'' form near the bottom of this page — enter your mobile number, pincode, choose crops and give consent. It is free during the pilot. You can stop anytime by sending STOP.',8) on conflict do nothing;
insert into public.page_faqs (page_key,q_hi,q_en,a_hi,a_en,sort_order) values ('msp','MSP क्या है?','What is MSP?','MSP (न्यूनतम समर्थन मूल्य) वह दाम है जो सरकार हर सीज़न घोषित करती है और जिस पर सरकारी खरीद केंद्र फसल खरीदते हैं। यह किसान के लिए एक सुरक्षा-रेखा है — अगर मंडी भाव इससे नीचे जाए तो सरकारी खरीद या भावांतर जैसे रास्ते काम आते हैं। MSP CACP की सिफ़ारिश पर तय होता है।','MSP (Minimum Support Price) is the price the government announces each season and at which government procurement centres buy the crop. It is a safety line for the farmer — if the mandi price falls below it, routes like government procurement or Bhavantar help. MSP is set on CACP''s recommendation.',1) on conflict do nothing;
insert into public.page_faqs (page_key,q_hi,q_en,a_hi,a_en,sort_order) values ('msp','MSP से कम भाव मिले तो क्या करें?','What if I get a price below MSP?','पहले सरकारी खरीद केंद्र (e-Uparjan) पर MSP पर बेचने का विकल्प देखें। भावांतर भुगतान योजना (जब लागू हो) MSP और मंडी भाव का अंतर सीधे खाते में देती है। PM-AASHA भी सहारा है। तौल या भुगतान में गड़बड़ी हो तो मंडी सचिव या 1800-180-1551 पर शिकायत करें। इस पेज पर ये सब रास्ते नीचे दिए हैं।','First check selling at MSP at a government procurement centre (e-Uparjan). Bhavantar Bhugtan Yojana (when in force) pays the difference between MSP and the mandi price directly to your account. PM-AASHA is another support. For weighing or payment problems, complain to the mandi secretary or 1800-180-1551. All these routes are listed below on this page.',2) on conflict do nothing;
insert into public.page_faqs (page_key,q_hi,q_en,a_hi,a_en,sort_order) values ('msp','भावांतर योजना में पैसा कैसे मिलता है?','How do I get money under the Bhavantar scheme?','अधिसूचित अवधि में e-Uparjan पोर्टल पर पंजीयन करें, फसल किसी अधिसूचित मंडी में बेचें; निर्धारित दर और औसत मॉडल दर का अंतर DBT से आपके आधार-लिंक्ड बैंक खाते में आता है। कवर की जाने वाली फसलें हर सत्र बदलती हैं — वर्तमान अधिसूचना देखें। विस्तार से भावांतर योजना पेज पर पढ़ें।','Register on the e-Uparjan portal during the notified window and sell the crop at a notified mandi; the difference between the set rate and the average model rate reaches your Aadhaar-linked bank account via DBT. Covered crops change each round — check the current notification. Read the full details on the Bhavantar scheme page.',3) on conflict do nothing;
insert into public.page_faqs (page_key,q_hi,q_en,a_hi,a_en,sort_order) values ('msp','e-Uparjan पर पंजीकरण कैसे करें?','How do I register on e-Uparjan?','mpeuparjan.nic.in पर समग्र आईडी और आधार से पंजीयन करें (या नज़दीकी CSC/खरीद केंद्र से)। पंजीयन के बाद पर्ची लेकर तय तारीख़ पर केंद्र जाकर फसल तौलवाएँ; भुगतान सीधे बैंक खाते में आता है। बैंक खाता आधार से लिंक और चालू होना ज़रूरी है।','Register on mpeuparjan.nic.in with your Samagra ID and Aadhaar (or via a nearby CSC/procurement centre). After registration, take your slip, go to the centre on the given date and get the crop weighed; payment comes directly to your bank account. The account must be Aadhaar-linked and active.',4) on conflict do nothing;
insert into public.page_faqs (page_key,q_hi,q_en,a_hi,a_en,sort_order) values ('msp','मंडी का मॉडल भाव क्या होता है?','What is the mandi modal price?','मॉडल भाव उस दिन मंडी में सबसे ज़्यादा जिस दाम पर सौदे हुए, वह होता है — यानी सबसे आम बिक्री-भाव, न कि सबसे ऊँचा या सबसे नीचा। तुलना के लिए यही सबसे उपयोगी है। असली भाव आपकी उपज की गुणवत्ता और नीलामी पर निर्भर करता है।','The modal price is the rate at which most trades happened in the mandi that day — the most common sale price, not the highest or lowest. It is the most useful for comparison. Your actual price depends on your produce quality and the auction.',5) on conflict do nothing;
insert into public.page_faqs (page_key,q_hi,q_en,a_hi,a_en,sort_order) values ('msp','भाव रोज़ कब अपडेट होता है?','When are prices updated each day?','मंडी भाव Agmarknet/data.gov.in से दिन में कई बार खींचे जाते हैं; आमतौर पर दोपहर बाद उस दिन के सौदों के भाव आ जाते हैं। अगर आज का भाव अभी नहीं आया, तो पेज पिछली उपलब्ध तारीख़ साफ़-साफ़ दिखाता है (''अंतिम भाव: …'')।','Mandi prices are pulled from Agmarknet/data.gov.in several times a day; the day''s trades usually arrive in the afternoon. If today''s price hasn''t arrived yet, the page clearly shows the latest available date (''Last price: …'').',6) on conflict do nothing;
insert into public.page_faqs (page_key,q_hi,q_en,a_hi,a_en,sort_order) values ('msp','क्या रोकने से फायदा होगा?','Will holding the crop pay off?','हम भाव की भविष्यवाणी नहीं करते। इस पेज का ''अभी बेचें या रोकें — गणित'' सेक्शन सिर्फ़ हिसाब दिखाता है: MSP से कितना नीचे हैं, रोकने पर गोदाम का किराया कितना लगेगा, और नुकसान से बचने के लिए भाव कितना चढ़ना ज़रूरी है। फैसला इन तथ्यों को देखकर आप खुद लें।','We do not predict prices. The ''Sell now or hold — the maths'' section on this page only shows the arithmetic: how far below MSP you are, the storage cost of holding, and how much the price must rise to break even. Make the decision yourself using these facts.',7) on conflict do nothing;
insert into public.page_faqs (page_key,q_hi,q_en,a_hi,a_en,sort_order) values ('msp','गोदाम का किराया कितना है?','How much is warehouse rent?','किराया गोदाम और इलाके के हिसाब से बदलता है। ''गणित'' सेक्शन आपके इलाके की सक्रिय गोदाम लिस्टिंग के औसत किराये का उपयोग करता है; कोई लिस्टिंग न हो तो ₹15/क्विंटल/माह का अनुमान (साफ़ लिखा हुआ) लेता है। असली किराया ''गोदाम/भंडारण'' श्रेणी में देखें।','Rent varies by warehouse and area. The ''maths'' section uses the average rent of active warehouse listings in your area; if there are none, it uses an estimate of ₹15/quintal/month (clearly labelled). See actual rents in the ''Warehouse/Storage'' category.',8) on conflict do nothing;

-- Seed: procurement centres (e-Uparjan, e-NAM)
insert into public.procurement_centres (name_hi,location,district,crops,season,portal_url,notes_hi,is_active) values ('MP e-उपार्जन — गेहूं (रबी)','मध्यप्रदेश (राज्यव्यापी खरीद केंद्र)','Sagar',array['Wheat']::text[],'rabi','https://mpeuparjan.nic.in','रबी सीज़न में गेहूं की MSP पर सरकारी खरीद। समग्र आईडी + आधार से पोर्टल पर पंजीयन करें, पर्ची लेकर तय तारीख़ पर नज़दीकी खरीद केंद्र पर बिक्री करें; भुगतान सीधे आधार-लिंक्ड बैंक खाते में। पंजीयन व खरीद की तारीख़ें हर साल शासन द्वारा घोषित होती हैं।',true) on conflict do nothing;
insert into public.procurement_centres (name_hi,location,district,crops,season,portal_url,notes_hi,is_active) values ('MP e-उपार्जन — सोयाबीन/खरीफ','मध्यप्रदेश (राज्यव्यापी खरीद केंद्र)','Sagar',array['Soyabean']::text[],'kharif','https://mpeuparjan.nic.in','खरीफ सीज़न में अधिसूचित फसलों (जैसे सोयाबीन) की खरीद/भावांतर हेतु e-उपार्जन पोर्टल पर पंजीयन। कवर की जाने वाली फसलें व तारीख़ें हर सत्र की अधिसूचना पर निर्भर हैं — वर्तमान अधिसूचना देखें।',true) on conflict do nothing;
insert into public.procurement_centres (name_hi,location,district,crops,season,portal_url,notes_hi,is_active) values ('e-NAM (राष्ट्रीय कृषि बाज़ार)','e-NAM से जुड़ी मंडियाँ','Sagar',array['Wheat','Soyabean']::text[],'rabi','https://enam.gov.in','ऑनलाइन नीलामी मंच जहाँ कई खरीदार बोली लगाते हैं, जिससे बेहतर दाम मिल सकता है और भुगतान सीधे खाते में आता है। नज़दीकी e-NAM मंडी में पंजीयन कराएँ।',true) on conflict do nothing;

-- Seed: Bhavantar Bhugtan Yojana (MP state scheme) in sarkari_yojana
insert into public.sarkari_yojana (id,scheme_name_hi,scheme_name_en,ministry_hi,ministry_en,category,description_hi,description_en,benefit_hi,benefit_en,eligibility_hi,eligibility_en,how_to_apply_hi,how_to_apply_en,official_website,helpline,is_active,is_featured,sort_order,slug,government_level,faqs,documents_required_hi,documents_required_en,source_url,last_verified_date) values ('00000000-0000-4000-c000-00000000000d','भावांतर भुगतान योजना','Bhavantar Bhugtan Yojana (Price Deficit Payment Scheme)','किसान कल्याण तथा कृषि विकास विभाग, मध्य प्रदेश शासन','Department of Farmer Welfare and Agriculture Development, Government of Madhya Pradesh','income_support','भावांतर भुगतान योजना मध्य प्रदेश सरकार की योजना है जिसमें अधिसूचित फसल का मंडी में बिक्री भाव जब न्यूनतम समर्थन मूल्य (MSP) या मॉडल रेट से कम रहता है, तो सरकार दोनों के बीच का अंतर (भावांतर) सीधे किसान के बैंक खाते में जमा करती है। किसान को अधिसूचित अवधि में पोर्टल पर पंजीयन कराना होता है और फसल किसी अधिसूचित मंडी में बेचनी होती है। यह योजना 2017 में शुरू हुई थी और 2025 में सोयाबीन के लिए फिर से लागू की गई।','Bhavantar Bhugtan Yojana is a Madhya Pradesh government scheme. When a notified crop sells in the mandi below the Minimum Support Price (MSP) or model rate, the government credits the difference (bhavantar) directly to the farmer''s bank account. The farmer must register on the portal during the notified window and sell the crop at a notified mandi. The scheme was launched in 2017 and was re-implemented for soybean in 2025.','यदि किसान की अधिसूचित फसल का मंडी बिक्री भाव न्यूनतम समर्थन मूल्य/निर्धारित दर से कम रहता है, तो निर्धारित दर और औसत मॉडल दर के बीच का अंतर सीधे किसान के आधार-लिंक्ड बैंक खाते में DBT के माध्यम से जमा किया जाता है। उदाहरण: 2025 खरीफ में सोयाबीन का MSP ₹5,328 प्रति क्विंटल निर्धारित किया गया।','If a farmer''s notified crop sells in the mandi below the MSP/set rate, the difference between the set rate and the average model rate is credited directly to the farmer''s Aadhaar-linked bank account via DBT. For example, in Kharif 2025 the soybean MSP was set at ₹5,328 per quintal.','मध्य प्रदेश का किसान जिसने अधिसूचित फसल की खेती की हो; अधिसूचित पंजीयन अवधि में पोर्टल पर पंजीयन कराया हो; भूमि अभिलेख (खसरा-खतौनी) हो; और आधार-लिंक्ड बैंक खाता व समग्र आईडी हो। फसल किसी अधिसूचित मंडी में बेचनी अनिवार्य है।','A farmer of Madhya Pradesh who has cultivated a notified crop; who has registered on the portal within the notified registration window; who holds land records (khasra-khatauni); and who has an Aadhaar-linked bank account and a Samagra ID. The crop must be sold at a notified mandi.','1. mpeuparjan.nic.in पोर्टल पर जाएँ (या MP Kisan App / नजदीकी CSC / PACS से पंजीयन कराएँ)।
2. भावांतर योजना के तहत संबंधित फसल (जैसे सोयाबीन) चुनें।
3. समग्र आईडी, आधार नंबर, बैंक खाता, मोबाइल नंबर, खसरा नंबर और बोई गई भूमि का रकबा दर्ज करें।
4. अधिसूचित अवधि के भीतर पंजीयन पूरा करें (उदाहरण: सोयाबीन 2025 हेतु 3 से 17 अक्टूबर 2025)।
5. फसल किसी अधिसूचित मंडी में बेचें।
6. निर्धारित दर और औसत मॉडल दर का अंतर DBT से खाते में प्राप्त करें।','1. Go to the mpeuparjan.nic.in portal (or register via the MP Kisan App / nearest CSC / PACS).
2. Select the relevant crop (e.g., soybean) under the Bhavantar Yojana.
3. Enter your Samagra ID, Aadhaar number, bank account, mobile number, khasra number and sown area.
4. Complete registration within the notified window (example: 3 to 17 October 2025 for soybean).
5. Sell the crop at a notified mandi.
6. Receive the difference between the set rate and the average model rate in your account via DBT.','https://mpeuparjan.nic.in','1800-180-1551',true,false,25,'bhavantar','state','[{"q_hi":"भावांतर भुगतान योजना क्या है?","q_en":"What is the Bhavantar Bhugtan Yojana?","a_hi":"यह मध्य प्रदेश सरकार की योजना है जिसमें अधिसूचित फसल MSP/मॉडल रेट से कम भाव पर बिकने पर सरकार दोनों के बीच का अंतर सीधे किसान के बैंक खाते में देती है।","a_en":"It is a Madhya Pradesh government scheme under which, if a notified crop sells below the MSP/model rate, the government pays the difference directly into the farmer''s bank account."},{"q_hi":"पंजीयन कहाँ और कैसे करें?","q_en":"Where and how do I register?","a_hi":"mpeuparjan.nic.in पोर्टल पर, या MP Kisan App / नजदीकी CSC / PACS के माध्यम से अधिसूचित अवधि में पंजीयन करें। समग्र आईडी, आधार, बैंक खाता और खसरा विवरण आवश्यक हैं।","a_en":"Register on the mpeuparjan.nic.in portal, or via the MP Kisan App / nearest CSC / PACS within the notified window. Samagra ID, Aadhaar, bank account and khasra details are required."},{"q_hi":"कौन-सी फसलें इस योजना में शामिल हैं?","q_en":"Which crops are covered under the scheme?","a_hi":"सबसे हाल के सत्यापित सत्र (2025) में मुख्यतः सोयाबीन। पहले तिलहन-दलहन फसलें भी शामिल रही हैं। सूची हर सत्र बदलती है, इसलिए वर्तमान अधिसूचना देखें।","a_en":"In the most recent verified round (2025), mainly soybean. Earlier, oilseeds and pulses were also included. The list changes each round, so check the current notification."},{"q_hi":"भुगतान कैसे मिलता है?","q_en":"How is the payment made?","a_hi":"किसान अधिसूचित मंडी में फसल बेचता है; निर्धारित दर और औसत मॉडल दर का अंतर DBT के माध्यम से आधार-लिंक्ड बैंक खाते में जमा किया जाता है।","a_en":"The farmer sells at a notified mandi; the difference between the set rate and the average model rate is credited via DBT to the Aadhaar-linked bank account."},{"q_hi":"क्या पंजीयन के लिए कोई अंतिम तिथि होती है?","q_en":"Is there a deadline to register?","a_hi":"हाँ, पंजीयन केवल अधिसूचित अवधि में होता है। उदाहरण: सोयाबीन 2025 हेतु पंजीयन 3 से 17 अक्टूबर 2025 तक था। हर सत्र की तिथियाँ अलग होती हैं।","a_en":"Yes, registration is only during the notified window. Example: for soybean 2025, registration ran from 3 to 17 October 2025. Dates differ each round."},{"q_hi":"सहायता के लिए हेल्पलाइन नंबर क्या है?","q_en":"What is the helpline number?","a_hi":"कृषि संबंधी समस्याओं के लिए किसान कॉल सेंटर हेल्पलाइन 1800-180-1551 पर संपर्क कर सकते हैं।","a_en":"For agriculture-related problems, farmers can call the Kisan Call Centre helpline at 1800-180-1551."}]'::jsonb,'समग्र आईडी; आधार कार्ड; आधार-लिंक्ड बैंक खाता (पासबुक); भूमि अभिलेख (खसरा-खतौनी); मोबाइल नंबर।','Samagra ID; Aadhaar card; Aadhaar-linked bank account (passbook); land records (khasra-khatauni); mobile number.','http://mpkrishi.mp.gov.in/hindisite_New/bhavantar_new.aspx','2026-09-25') on conflict (slug) do nothing;
