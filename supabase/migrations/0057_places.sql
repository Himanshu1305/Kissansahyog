-- Batch 7L-1 — public.places: the Sagar Division places list used by the location flow.
-- NOT APPLIED by the batch that wrote it: apply to staging first, then production.
--
-- What it does: creates a small read-only table of places (the six district HQs, the
-- tehsil HQs and the main towns of Sagar Division) with English and Hindi names and
-- coordinates, and loads it from supabase/seed/sagar_division_places.json (the rows below
-- mirror that file row for row; regenerate both together, do not hand-edit one).
-- The browser reads the whole list once and matches typed village/town names locally.
--
-- Access: Row Level Security is on with ONE policy, public read. There is no insert /
-- update / delete policy and no write grant, so anon and authenticated cannot change it;
-- only the service role (migrations) can.
--
-- verified = true  : the point was fetched from a public source AND lies inside its
--                    district's OpenStreetMap boundary.
-- verified = false : fetched but not confirmed — kept for review, never offered to visitors
--                    (the client ignores these rows).
--
-- Until this is applied the site keeps working: the client falls back to the same rows
-- bundled from the seed file.
--
-- Rollback note:
--   drop table if exists public.places;

create table if not exists public.places (
  id        bigint generated always as identity primary key,
  name_en   text not null,
  name_hi   text not null,
  district  text not null check (district in ('Sagar', 'Damoh', 'Panna', 'Tikamgarh', 'Chhatarpur', 'Niwari')),
  kind      text not null check (kind in ('district_hq', 'tehsil', 'town')),
  lat       double precision not null check (lat between -90 and 90),
  lng       double precision not null check (lng between -180 and 180),
  source    text not null,
  verified  boolean not null default false,
  unique (name_en, district)
);

comment on table public.places is 'Sagar Division places (district HQ / tehsil / town) for the location flow. Public read only.';

alter table public.places enable row level security;

revoke all on table public.places from public, anon, authenticated;
grant select on table public.places to anon, authenticated;

drop policy if exists places_read on public.places;
create policy places_read on public.places for select to anon, authenticated using (true);

-- Seed (54 rows; generated 2026-10-13 from supabase/seed/sagar_division_places.json).
-- Re-running is safe: an existing (name_en, district) row is refreshed, not duplicated.
insert into public.places (name_en, name_hi, district, kind, lat, lng, source, verified) values
  ('Sagar', 'सागर', 'Sagar', 'district_hq', 23.84178, 78.74668, 'OpenStreetMap (Nominatim) node/2058906658', true),
  ('Khurai', 'खुरई', 'Sagar', 'tehsil', 24.04222, 78.32963, 'OpenStreetMap (Nominatim) node/3419313293', true),
  ('Bina', 'बीना', 'Sagar', 'tehsil', 24.18456, 78.20579, 'OpenStreetMap (Nominatim) node/5439325441', true),
  ('Rehli', 'रहली', 'Sagar', 'tehsil', 23.63689, 79.06433, 'OpenStreetMap (Nominatim) node/2669259263', true),
  ('Garhakota', 'गढ़ाकोटा', 'Sagar', 'tehsil', 23.77965, 79.14549, 'OpenStreetMap (Nominatim) node/2163915593', true),
  ('Deori', 'देवरी', 'Sagar', 'tehsil', 23.38553, 79.01572, 'OpenStreetMap (Nominatim) relation/16474534', true),
  ('Banda', 'बंडा', 'Sagar', 'tehsil', 24.04475, 78.96258, 'OpenStreetMap (Nominatim) node/913349688', true),
  ('Rahatgarh', 'राहतगढ़', 'Sagar', 'tehsil', 23.78965, 78.3978, 'OpenStreetMap (Nominatim) node/2160874904', true),
  ('Malthone', 'मालथौन', 'Sagar', 'tehsil', 24.3088, 78.53702, 'OpenStreetMap (Nominatim) relation/16470934', true),
  ('Shahgarh', 'शाहगढ़', 'Sagar', 'tehsil', 24.31396, 79.11833, 'OpenStreetMap (Nominatim) node/1348472761', true),
  ('Kesli', 'केसली', 'Sagar', 'tehsil', 23.41856, 78.80615, 'OpenStreetMap (Nominatim) node/7098629258', true),
  ('Jaisinagar', 'जैसीनगर', 'Sagar', 'tehsil', 23.62647, 78.57187, 'OpenStreetMap (Nominatim) node/2164369692', true),
  ('Makronia', 'मकरोनिया', 'Sagar', 'town', 23.90723, 78.72512, 'OpenStreetMap (Nominatim) relation/16472597', true),
  ('Damoh', 'दमोह', 'Damoh', 'district_hq', 23.83957, 79.44444, 'OpenStreetMap (Nominatim) node/2058888106', true),
  ('Hatta', 'हटा', 'Damoh', 'tehsil', 24.13026, 79.59786, 'OpenStreetMap (Nominatim) node/1858666349', true),
  ('Patharia', 'पथरिया', 'Damoh', 'tehsil', 23.90032, 79.19525, 'OpenStreetMap (Nominatim) node/7096124434', true),
  ('Tendukheda', 'तेंदूखेड़ा', 'Damoh', 'tehsil', 23.39663, 79.54081, 'OpenStreetMap (Nominatim) node/2157235788', true),
  ('Jabera', 'जबेरा', 'Damoh', 'tehsil', 23.55805, 79.67811, 'OpenStreetMap (Nominatim) node/7096124433', true),
  ('Batiyagarh', 'बटियागढ़', 'Damoh', 'tehsil', 24.11321, 79.3486, 'OpenStreetMap (Nominatim) node/4833326020', true),
  ('Patera', 'पटेरा', 'Damoh', 'tehsil', 23.99584, 79.68594, 'OpenStreetMap (Nominatim) node/7096124436', true),
  ('Hindoria', 'हिंडोरिया', 'Damoh', 'town', 23.90232, 79.57006, 'OpenStreetMap (Nominatim) node/11399790962', true),
  ('Panna', 'पन्ना', 'Panna', 'district_hq', 24.7196, 80.18607, 'OpenStreetMap (Nominatim) node/4910487293', true),
  ('Ajaigarh', 'अजयगढ़', 'Panna', 'tehsil', 24.90291, 80.25787, 'OpenStreetMap (Nominatim) node/5342685753', true),
  ('Amanganj', 'अमानगंज', 'Panna', 'tehsil', 24.42531, 80.03484, 'OpenStreetMap (Nominatim) node/2162612029', true),
  ('Devendranagar', 'देवेन्द्रनगर', 'Panna', 'tehsil', 24.61598, 80.37857, 'OpenStreetMap (Nominatim) node/7098742544', true),
  ('Gunnor', 'गुनौर', 'Panna', 'tehsil', 24.4602, 80.24901, 'OpenStreetMap (Nominatim) node/7097776981', true),
  ('Pawai', 'पवई', 'Panna', 'tehsil', 24.2736, 80.16626, 'OpenStreetMap (Nominatim) node/2162612044', true),
  ('Raipura', 'रैपुरा', 'Panna', 'tehsil', 23.90023, 79.96488, 'OpenStreetMap (Nominatim) node/2019719939', true),
  ('Shahnagar', 'शाहनगर', 'Panna', 'tehsil', 23.99163, 80.30549, 'OpenStreetMap (Nominatim) node/2019710931', true),
  ('Simariya', 'सिमरिया', 'Panna', 'tehsil', 24.27149, 79.8994, 'OpenStreetMap (Nominatim) relation/16493824', true),
  ('Tikamgarh', 'टीकमगढ़', 'Tikamgarh', 'district_hq', 24.74286, 78.8322, 'OpenStreetMap (Nominatim) node/245725805', true),
  ('Baldeogarh', 'बल्देवगढ़', 'Tikamgarh', 'tehsil', 24.75577, 79.07001, 'OpenStreetMap (Nominatim) node/7096539264', true),
  ('Jatara', 'जतारा', 'Tikamgarh', 'tehsil', 25.00945, 79.04851, 'OpenStreetMap (Nominatim) node/4708095227', true),
  ('Palera', 'पलेरा', 'Tikamgarh', 'tehsil', 25.02052, 79.22793, 'OpenStreetMap (Nominatim) node/7096539265', true),
  ('Khargapur', 'खरगापुर', 'Tikamgarh', 'tehsil', 24.82215, 79.14452, 'OpenStreetMap (Nominatim) node/7096539266', true),
  ('Lidhora', 'लिधौरा', 'Tikamgarh', 'tehsil', 25.07285, 78.86724, 'OpenStreetMap (Nominatim) node/9579965606', true),
  ('Mohangarh', 'मोहनगढ़', 'Tikamgarh', 'tehsil', 24.99452, 78.68161, 'OpenStreetMap (Nominatim) node/7096539263', true),
  ('Badagaon', 'बड़ागाँव', 'Tikamgarh', 'tehsil', 24.56939, 79.01833, 'OpenStreetMap (Nominatim) node/6747052699', true),
  ('Chhatarpur', 'छतरपुर', 'Chhatarpur', 'district_hq', 24.92047, 79.58398, 'OpenStreetMap (Nominatim) node/245727323', true),
  ('Nowgong', 'नौगाँव', 'Chhatarpur', 'tehsil', 25.06284, 79.43939, 'OpenStreetMap (Nominatim) node/1268159908', true),
  ('Rajnagar', 'राजनगर', 'Chhatarpur', 'tehsil', 24.88908, 79.91129, 'OpenStreetMap (Nominatim) node/245727188', true),
  ('Bijawar', 'बिजावर', 'Chhatarpur', 'tehsil', 24.6227, 79.48928, 'OpenStreetMap (Nominatim) node/2058888101', true),
  ('Bada Malhera', 'बड़ा मलहरा', 'Chhatarpur', 'tehsil', 24.56269, 79.30718, 'OpenStreetMap (Nominatim) node/7096405506', true),
  ('Lavkush Nagar', 'लवकुशनगर', 'Chhatarpur', 'tehsil', 25.00833, 80.34194, 'Wikidata Q2241583 (P625 coordinate)', false),
  ('Gaurihar', 'गौरिहार', 'Chhatarpur', 'tehsil', 25.27016, 80.19496, 'OpenStreetMap (Nominatim) node/7098742545', true),
  ('Maharajpur', 'महाराजपुर', 'Chhatarpur', 'tehsil', 25.01696, 79.72652, 'OpenStreetMap (Nominatim) node/245728395', true),
  ('Buxwaha', 'बकस्वाहा', 'Chhatarpur', 'tehsil', 24.24953, 79.28584, 'OpenStreetMap (Nominatim) node/1471781030', true),
  ('Ghuwara', 'घुवारा', 'Chhatarpur', 'tehsil', 24.50579, 79.07855, 'OpenStreetMap (Nominatim) node/6747052858', true),
  ('Chandla', 'चंदला', 'Chhatarpur', 'tehsil', 25.06794, 80.19289, 'OpenStreetMap (Nominatim) node/245728947', true),
  ('Khajuraho', 'खजुराहो', 'Chhatarpur', 'town', 24.85151, 79.92598, 'OpenStreetMap (Nominatim) node/568438817', true),
  ('Harpalpur', 'हरपालपुर', 'Chhatarpur', 'town', 25.28683, 79.33386, 'OpenStreetMap (Nominatim) node/729857051', true),
  ('Niwari', 'निवाड़ी', 'Niwari', 'district_hq', 25.35124, 78.79939, 'OpenStreetMap (Nominatim) node/4648945997', true),
  ('Prithvipur', 'पृथ्वीपुर', 'Niwari', 'tehsil', 25.18528, 78.665, 'Wikidata Q2548354 (P625 coordinate)', true),
  ('Orchha', 'ओरछा', 'Niwari', 'tehsil', 25.35287, 78.64025, 'OpenStreetMap (Nominatim) node/82799649', true)
on conflict (name_en, district) do update set
  name_hi = excluded.name_hi, kind = excluded.kind, lat = excluded.lat, lng = excluded.lng,
  source = excluded.source, verified = excluded.verified;
