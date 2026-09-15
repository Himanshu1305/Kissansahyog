-- Kisan Sahyog — 0009 (v1.1) Expert Consultation Directory (Model A)
--
-- A curated, ADMIN-managed directory of verified experts. NOT user-submitted in
-- v1.1 (credibility): only the service role (migrations / admin) may insert. The
-- anon client may READ active experts only. There is no booking and no payment —
-- the phone is revealed behind the same disclaimer + tel: pattern as listings.

create table if not exists public.experts (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  name_hi           text,
  specialisation_en text,
  specialisation_hi text,
  bio_en            text,
  bio_hi            text,
  phone             text not null,
  organisation      text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

-- RLS: public read of ACTIVE experts only; no anon writes (admin/service role only).
alter table public.experts enable row level security;
grant select on public.experts to anon;

drop policy if exists experts_read_active on public.experts;
create policy experts_read_active on public.experts
  for select to anon
  using (is_active = true);
-- No INSERT/UPDATE/DELETE policies for anon => all direct anon writes denied.

-- Placeholder seed data (idempotent by fixed id). CLEARLY marked — replace with
-- real, verified expert details before launch.
insert into public.experts (id, name, name_hi, specialisation_en, specialisation_hi, bio_en, bio_hi, phone, organisation, is_active)
values
  ('00000000-0000-4000-a000-0000000e0001',
   'PLACEHOLDER — Dr. A. Soil', 'प्लेसहोल्डर — डॉ. ए. मृदा',
   'Soil Health & Crop Nutrition', 'मृदा स्वास्थ्य और फसल पोषण',
   'PLACEHOLDER bio. Advises farmers on soil testing, balanced fertiliser use, and improving yields sustainably. Replace with a real expert before launch.',
   'प्लेसहोल्डर परिचय। किसानों को मिट्टी जाँच, संतुलित खाद उपयोग और टिकाऊ तरीके से पैदावार बढ़ाने की सलाह देते हैं। लॉन्च से पहले असली विशेषज्ञ जोड़ें।',
   '9111100001', 'PLACEHOLDER — ICAR, Jabalpur', true),
  ('00000000-0000-4000-a000-0000000e0002',
   'PLACEHOLDER — Dr. B. Fasal', 'प्लेसहोल्डर — डॉ. बी. फसल',
   'Pest & Disease Management', 'कीट एवं रोग प्रबंधन',
   'PLACEHOLDER bio. Guides on integrated pest management and safe pesticide use for common crops. Replace with a real expert before launch.',
   'प्लेसहोल्डर परिचय। सामान्य फसलों के लिए एकीकृत कीट प्रबंधन और सुरक्षित कीटनाशक उपयोग पर मार्गदर्शन देते हैं। लॉन्च से पहले असली विशेषज्ञ जोड़ें।',
   '9111100002', 'PLACEHOLDER — Retired, MPKV', true),
  ('00000000-0000-4000-a000-0000000e0003',
   'PLACEHOLDER — Ms. C. Bagwani', 'प्लेसहोल्डर — सुश्री सी. बागवानी',
   'Horticulture & Vegetable Farming', 'बागवानी एवं सब्ज़ी खेती',
   'PLACEHOLDER bio. Helps with vegetable and fruit cultivation, drip irrigation, and market linkages. Replace with a real expert before launch.',
   'प्लेसहोल्डर परिचय। सब्ज़ी व फल की खेती, ड्रिप सिंचाई और बाज़ार जुड़ाव में मदद करती हैं। लॉन्च से पहले असली विशेषज्ञ जोड़ें।',
   '9111100003', 'PLACEHOLDER — KVK, Sagar', true)
on conflict (id) do nothing;
