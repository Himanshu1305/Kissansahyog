-- Kisan Sahyog — 0016 Useful Resources directory (soil labs / veterinary / govt offices)
--
-- Static, admin-managed reference contacts (NOT user listings). Public read of
-- active rows; writes only via is_admin-checked SECURITY DEFINER RPCs. These are
-- public government contacts, so phone/email are readable directly (no RPC gate,
-- unlike listing poster contacts). Real Sagar/Khurai data is seeded below.

create table if not exists public.resources (
  id              uuid primary key default gen_random_uuid(),
  resource_type   text not null check (resource_type in ('soil_lab', 'veterinary', 'govt_office')),
  name_hi         text not null,
  name_en         text not null,
  description_hi  text,
  description_en  text,
  address_hi      text,
  address_en      text,
  district        text not null default 'Sagar',
  area            text,
  phone_primary   text,
  phone_secondary text,
  phone_tollfree  text,
  email           text,
  website         text,
  timings_hi      text,
  timings_en      text,
  is_active       boolean not null default true,
  sort_order      integer default 0,
  created_at      timestamptz not null default now()
);

alter table public.resources enable row level security;
grant select on public.resources to anon;

drop policy if exists resources_read_active on public.resources;
create policy resources_read_active on public.resources
  for select to anon
  using (is_active = true);
-- No anon write policies => writes only via admin RPCs / service role.

-- ---------------------------------------------------------------------------
-- Admin RPCs (require_admin from 0012 enforces is_admin server-side).
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_resources(p_actor_id uuid)
returns setof public.resources
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.require_admin(p_actor_id);
  return query select * from public.resources order by resource_type, sort_order, name_en;
end;
$$;

create or replace function public.admin_set_resource_active(p_actor_id uuid, p_id uuid, p_active boolean)
returns public.resources
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.resources%rowtype;
begin
  perform public.require_admin(p_actor_id);
  update public.resources set is_active = p_active where id = p_id returning * into v;
  if not found then raise exception 'not_found'; end if;
  return v;
end;
$$;

create or replace function public.admin_upsert_resource(
  p_actor_id uuid, p_id uuid, p_resource_type text, p_name_hi text, p_name_en text,
  p_description_hi text, p_description_en text, p_address_hi text, p_address_en text,
  p_district text, p_area text, p_phone_primary text, p_phone_secondary text,
  p_phone_tollfree text, p_email text, p_website text, p_timings_hi text, p_timings_en text,
  p_is_active boolean, p_sort_order integer
) returns public.resources
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v public.resources%rowtype;
begin
  perform public.require_admin(p_actor_id);
  if p_resource_type not in ('soil_lab', 'veterinary', 'govt_office') then raise exception 'invalid_resource_type'; end if;
  if coalesce(trim(p_name_hi), '') = '' or coalesce(trim(p_name_en), '') = '' then raise exception 'name_required'; end if;
  if p_id is null then
    insert into public.resources (resource_type, name_hi, name_en, description_hi, description_en, address_hi, address_en,
      district, area, phone_primary, phone_secondary, phone_tollfree, email, website, timings_hi, timings_en, is_active, sort_order)
    values (p_resource_type, p_name_hi, p_name_en, p_description_hi, p_description_en, p_address_hi, p_address_en,
      coalesce(nullif(trim(p_district),''),'Sagar'), p_area, p_phone_primary, p_phone_secondary, p_phone_tollfree, p_email, p_website,
      p_timings_hi, p_timings_en, coalesce(p_is_active, true), coalesce(p_sort_order, 0))
    returning * into v;
  else
    update public.resources set
      resource_type = p_resource_type, name_hi = p_name_hi, name_en = p_name_en,
      description_hi = p_description_hi, description_en = p_description_en, address_hi = p_address_hi, address_en = p_address_en,
      district = coalesce(nullif(trim(p_district),''),'Sagar'), area = p_area,
      phone_primary = p_phone_primary, phone_secondary = p_phone_secondary, phone_tollfree = p_phone_tollfree,
      email = p_email, website = p_website, timings_hi = p_timings_hi, timings_en = p_timings_en,
      is_active = coalesce(p_is_active, true), sort_order = coalesce(p_sort_order, 0)
    where id = p_id returning * into v;
    if not found then raise exception 'not_found'; end if;
  end if;
  return v;
end;
$$;

grant execute on function public.get_admin_resources(uuid) to anon, authenticated;
grant execute on function public.admin_set_resource_active(uuid, uuid, boolean) to anon, authenticated;
grant execute on function public.admin_upsert_resource(uuid, uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, boolean, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed: verified public Sagar/Khurai contacts (idempotent by fixed id).
-- ---------------------------------------------------------------------------
insert into public.resources (id, resource_type, name_hi, name_en, description_hi, description_en, address_hi, address_en, district, area, phone_primary, phone_secondary, phone_tollfree, email, website, timings_hi, timings_en, sort_order) values
('00000000-0000-4000-b000-000000000101','soil_lab',
 $r$मृदा परीक्षण प्रयोगशाला, सागर$r$, $r$Soil Testing Laboratory, Sagar$r$,
 $r$सरकारी मृदा परीक्षण प्रयोगशाला — मिट्टी के 14 पैरामीटर की जांच, खाद की सही मात्रा की जानकारी$r$,
 $r$Government soil testing laboratory — tests 14 soil parameters, provides fertilizer dosage recommendations$r$,
 $r$जिला कृषि कार्यालय परिसर, सागर, म.प्र.$r$, $r$District Agriculture Office Campus, Sagar, M.P.$r$,
 'Sagar', 'Sagar City', NULL, NULL, '1800-180-1551', NULL, 'https://mpstl.mponline.gov.in',
 $r$सोमवार-शनिवार, सुबह 10 बजे से शाम 5 बजे तक$r$, $r$Monday–Saturday, 10 AM to 5 PM$r$, 1),
('00000000-0000-4000-b000-000000000102','soil_lab',
 $r$मृदा सर्वेक्षण प्रयोगशाला, सागर$r$, $r$Soil Survey Laboratory, Sagar$r$,
 $r$JNKVV के अंतर्गत मृदा सर्वेक्षण और परीक्षण सुविधा$r$,
 $r$Soil survey and testing facility under JNKVV (Jawaharlal Nehru Krishi Vishwa Vidyalaya)$r$,
 $r$JNKVV परिसर, सागर, म.प्र.$r$, $r$JNKVV Campus, Sagar, M.P.$r$,
 'Sagar', 'Sagar City', '07582-288228', NULL, NULL, 'kvk_sagar@rediff.com', NULL, NULL, NULL, 2),
('00000000-0000-4000-b000-000000000103','soil_lab',
 $r$ऑनलाइन मिट्टी परीक्षण आवेदन (MP Online)$r$, $r$Online Soil Testing Application (MP Online)$r$,
 $r$घर बैठे ऑनलाइन मृदा परीक्षण के लिए आवेदन करें। नमूना जमा करने की प्रक्रिया और निकटतम प्रयोगशाला खोजें।$r$,
 $r$Apply online for soil testing from home. Find nearest lab and learn sample submission process.$r$,
 NULL, NULL, 'Sagar', 'All areas', NULL, NULL, NULL, NULL, 'https://mpstl.mponline.gov.in',
 $r$24 घंटे उपलब्ध$r$, $r$Available 24 hours$r$, 3),
('00000000-0000-4000-b000-000000000201','veterinary',
 $r$मोबाइल पशु चिकित्सा सेवा (घर पर इलाज)$r$, $r$Mobile Veterinary Service (Treatment at Home)$r$,
 $r$पशु बीमार हो तो घर पर डॉक्टर बुलाएं। सुबह 7 बजे से शाम 5 बजे तक 1962 पर कॉल करें — एंबुलेंस आपके घर आएगी।$r$,
 $r$If your animal is sick, call a doctor home. Call 1962 from 7 AM to 5 PM — ambulance will come to your location.$r$,
 NULL, NULL, 'Sagar', 'All areas', NULL, NULL, '1962', NULL, NULL,
 $r$सोमवार-रविवार, सुबह 7 बजे से शाम 5 बजे तक$r$, $r$Monday–Sunday, 7 AM to 5 PM$r$, 1),
('00000000-0000-4000-b000-000000000202','veterinary',
 $r$पशुपालन एवं डेयरी विभाग, म.प्र.$r$, $r$Directorate of Animal Husbandry & Dairying, M.P.$r$,
 $r$पशुपालन योजनाओं, बीमा, नस्ल सुधार और पशु चिकित्सा सेवाओं के लिए संपर्क करें$r$,
 $r$Contact for animal husbandry schemes, insurance, breed improvement and veterinary services$r$,
 NULL, NULL, 'Sagar', 'Madhya Pradesh', '07552-772262', NULL, NULL, 'dirveterinary@mp.gov.in', 'https://mpdah.gov.in',
 $r$सोमवार-शनिवार, सुबह 10 बजे से शाम 5 बजे तक$r$, $r$Monday–Saturday, 10 AM to 5 PM$r$, 2),
('00000000-0000-4000-b000-000000000203','veterinary',
 $r$पशु चिकित्सालय, खुरई$r$, $r$Veterinary Hospital, Khurai$r$,
 $r$खुरई क्षेत्र के पशुपालकों के लिए नज़दीकी पशु चिकित्सा सुविधा$r$,
 $r$Nearest veterinary facility for animal keepers in the Khurai area$r$,
 $r$बड़ोदिया नैनागीर, जिला सागर, खुरई, म.प्र. 470117$r$, $r$Barodiya Nainagir, District Sagar, Khurai, M.P. 470117$r$,
 'Sagar', 'Khurai', NULL, NULL, NULL, NULL, NULL,
 $r$सोमवार-शनिवार, सुबह 9 बजे से शाम 5 बजे तक$r$, $r$Monday–Saturday, 9 AM to 5 PM$r$, 3),
('00000000-0000-4000-b000-000000000204','veterinary',
 $r$डॉ. रोहित कुमार सिटोल, पशु चिकित्सक$r$, $r$Dr. Rohit Kumar Sitole, Veterinary Surgeon$r$,
 $r$V.A.S. बड़धा ब्लॉक, खुरई — पशु चिकित्सा सहायक शल्यज्ञ$r$,
 $r$V.A.S. Bardha Block, Khurai — Veterinary Assistant Surgeon$r$,
 $r$V.A.S. बड़धा ब्लॉक, खुरई, जिला सागर, म.प्र.$r$, $r$V.A.S. Bardha Block, Khurai, Distt. Sagar, M.P.$r$,
 'Sagar', 'Khurai', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4),
('00000000-0000-4000-b000-000000000301','govt_office',
 $r$कृषि विज्ञान केन्द्र, सागर-I$r$, $r$Krishi Vigyan Kendra (KVK), Sagar-I$r$,
 $r$किसानों को कृषि प्रशिक्षण, नई तकनीक की जानकारी, मिट्टी परीक्षण और कृषि विशेषज्ञों से परामर्श के लिए संपर्क करें$r$,
 $r$Contact for agricultural training, new technology guidance, soil testing, and consultation with agricultural scientists$r$,
 $r$बामहोरी सीड फार्म, जिला सागर, म.प्र. - 470002$r$, $r$Bamhori Seed Farm, Distt. Sagar, M.P. - 470002$r$,
 'Sagar', 'Sagar City', '07582-288228', '09425854876', NULL, 'kvk_sagar@rediff.com', NULL,
 $r$सोमवार-शनिवार, सुबह 9 बजे से शाम 5 बजे तक$r$, $r$Monday–Saturday, 9 AM to 5 PM$r$, 1),
('00000000-0000-4000-b000-000000000302','govt_office',
 $r$कृषि विज्ञान केन्द्र, सागर-II (देवरी)$r$, $r$Krishi Vigyan Kendra (KVK), Sagar-II (Deori)$r$,
 $r$देवरी और आसपास के किसानों के लिए नज़दीकी कृषि विज्ञान केन्द्र$r$,
 $r$Nearest KVK for farmers in Deori and surrounding areas$r$,
 $r$पोस्ट एवं ग्राम बिजोरा, देवरी, जिला सागर - 470226$r$, $r$Post & Village Bijora, Deori, Distt. Sagar - 470226$r$,
 'Sagar', 'Deori', NULL, NULL, NULL, 'kvkbijora@jnkvv.org', NULL, NULL, NULL, 2),
('00000000-0000-4000-b000-000000000303','govt_office',
 $r$कृषि महाविद्यालय, खुरई (JNKVV)$r$, $r$College of Agriculture, Khurai (JNKVV)$r$,
 $r$खुरई में जवाहरलाल नेहरू कृषि विश्वविद्यालय का कृषि महाविद्यालय — किसानों को कृषि संबंधी तकनीकी जानकारी$r$,
 $r$JNKVV College of Agriculture in Khurai — technical agricultural guidance for farmers$r$,
 $r$कृषि महाविद्यालय परिसर, खुरई, जिला सागर, म.प्र.$r$, $r$College of Agriculture Campus, Khurai, Distt. Sagar, M.P.$r$,
 'Sagar', 'Khurai', '0761-2681235', '9340004878', NULL, 'deankhurai@rediffmail.com', NULL,
 $r$सोमवार-शनिवार, सुबह 9 बजे से शाम 5 बजे तक$r$, $r$Monday–Saturday, 9 AM to 5 PM$r$, 3),
('00000000-0000-4000-b000-000000000304','govt_office',
 $r$संयुक्त संचालक कृषि, सागर संभाग$r$, $r$Joint Director Agriculture, Sagar Division$r$,
 $r$कृषि विभाग की सरकारी योजनाओं, अनुदान और किसान कल्याण कार्यक्रमों की जानकारी के लिए संपर्क करें$r$,
 $r$Contact for government agricultural schemes, subsidies, and farmer welfare programs$r$,
 $r$कृषि संभागीय कार्यालय, सागर, म.प्र.$r$, $r$Agriculture Divisional Office, Sagar, M.P.$r$,
 'Sagar', 'Sagar City', '07582-222810', '9406904009', NULL, 'zmagrisag@mp.gov.in', NULL,
 $r$सोमवार-शनिवार, सुबह 10 बजे से शाम 5 बजे तक$r$, $r$Monday–Saturday, 10 AM to 5 PM$r$, 4),
('00000000-0000-4000-b000-000000000305','govt_office',
 $r$किसान हेल्पलाइन — कृषि विभाग म.प्र.$r$, $r$Farmer Helpline — Agriculture Dept. M.P.$r$,
 $r$कृषि से जुड़ी किसी भी समस्या या जानकारी के लिए टोल-फ्री नंबर पर कॉल करें$r$,
 $r$Call the toll-free number for any agriculture-related query or problem$r$,
 NULL, NULL, 'Sagar', 'All areas', NULL, NULL, '1800-180-1551', NULL, NULL,
 $r$सोमवार-शनिवार, सुबह 9 बजे से शाम 5 बजे तक$r$, $r$Monday–Saturday, 9 AM to 5 PM$r$, 5),
('00000000-0000-4000-b000-000000000306','govt_office',
 $r$कलेक्टर कार्यालय, सागर$r$, $r$Collector's Office, Sagar$r$,
 $r$जिला प्रशासन, भूमि विवाद, सरकारी योजनाओं और आपात स्थिति के लिए संपर्क करें$r$,
 $r$District administration, land disputes, government schemes, and emergencies$r$,
 $r$कलेक्टर कार्यालय, सागर, म.प्र.$r$, $r$Collector Office, Sagar, M.P.$r$,
 'Sagar', 'Sagar City', '07582-222199', NULL, NULL, 'mpsag@nic.in', 'https://sagar.nic.in',
 $r$सोमवार-शनिवार, सुबह 10 बजे से शाम 5 बजे तक$r$, $r$Monday–Saturday, 10 AM to 5 PM$r$, 6)
on conflict (id) do nothing;
