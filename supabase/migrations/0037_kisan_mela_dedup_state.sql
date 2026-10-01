-- Kisan Mela: canonical state normalization + robust dedup support (one migration for all
-- schema/data changes in this work — spec: docs/KISAN_MELA_DEDUP_STATE_PROMPT.md).
-- Idempotent: safe to run even if parts were applied during development via `db query`.

-- ===========================================================================================
-- Phase 1 — canonical state backfill
-- The authoritative normaliser is src/content/states.js (applied at every entry point). This
-- SQL mirrors its key() (lowercase; keep only latin alphanumerics + Devanagari) and alias map so
-- EVERY existing state value in kisan_mela + kisan_mela_candidates is folded to its canonical name
-- here too (1d). The one-time cleanup script re-runs the same normaliser and logs any unmappable value.
-- ===========================================================================================

create or replace function public._mela_state_key(txt text) returns text
  language sql immutable as $$
  select regexp_replace(lower(coalesce(txt, '')), '[^a-z0-9ऀ-ॿ]', '', 'g');
$$;

with aliases(k, canonical) as (values
    ('andhrapradesh', 'Andhra Pradesh'),
    ('आंध्रप्रदेश', 'Andhra Pradesh'),
    ('ap', 'Andhra Pradesh'),
    ('आन्ध्रप्रदेश', 'Andhra Pradesh'),
    ('arunachalpradesh', 'Arunachal Pradesh'),
    ('अरुणाचलप्रदेश', 'Arunachal Pradesh'),
    ('ar', 'Arunachal Pradesh'),
    ('arunachal', 'Arunachal Pradesh'),
    ('assam', 'Assam'),
    ('असम', 'Assam'),
    ('as', 'Assam'),
    ('bihar', 'Bihar'),
    ('बिहार', 'Bihar'),
    ('br', 'Bihar'),
    ('chhattisgarh', 'Chhattisgarh'),
    ('छत्तीसगढ़', 'Chhattisgarh'),
    ('cg', 'Chhattisgarh'),
    ('chattisgarh', 'Chhattisgarh'),
    ('छत्तीसगढ', 'Chhattisgarh'),
    ('छग', 'Chhattisgarh'),
    ('goa', 'Goa'),
    ('गोवा', 'Goa'),
    ('ga', 'Goa'),
    ('gujarat', 'Gujarat'),
    ('गुजरात', 'Gujarat'),
    ('gj', 'Gujarat'),
    ('haryana', 'Haryana'),
    ('हरियाणा', 'Haryana'),
    ('hr', 'Haryana'),
    ('himachalpradesh', 'Himachal Pradesh'),
    ('हिमाचलप्रदेश', 'Himachal Pradesh'),
    ('hp', 'Himachal Pradesh'),
    ('हिप्र', 'Himachal Pradesh'),
    ('jharkhand', 'Jharkhand'),
    ('झारखंड', 'Jharkhand'),
    ('jh', 'Jharkhand'),
    ('झारखण्ड', 'Jharkhand'),
    ('karnataka', 'Karnataka'),
    ('कर्नाटक', 'Karnataka'),
    ('ka', 'Karnataka'),
    ('कर्णाटक', 'Karnataka'),
    ('kerala', 'Kerala'),
    ('केरल', 'Kerala'),
    ('kl', 'Kerala'),
    ('केरला', 'Kerala'),
    ('madhyapradesh', 'Madhya Pradesh'),
    ('मध्यप्रदेश', 'Madhya Pradesh'),
    ('mp', 'Madhya Pradesh'),
    ('मप्र', 'Madhya Pradesh'),
    ('maharashtra', 'Maharashtra'),
    ('महाराष्ट्र', 'Maharashtra'),
    ('mh', 'Maharashtra'),
    ('maharastra', 'Maharashtra'),
    ('manipur', 'Manipur'),
    ('मणिपुर', 'Manipur'),
    ('mn', 'Manipur'),
    ('meghalaya', 'Meghalaya'),
    ('मेघालय', 'Meghalaya'),
    ('ml', 'Meghalaya'),
    ('mizoram', 'Mizoram'),
    ('मिज़ोरम', 'Mizoram'),
    ('mz', 'Mizoram'),
    ('मिजोरम', 'Mizoram'),
    ('nagaland', 'Nagaland'),
    ('नागालैंड', 'Nagaland'),
    ('nl', 'Nagaland'),
    ('नागालैण्ड', 'Nagaland'),
    ('odisha', 'Odisha'),
    ('ओडिशा', 'Odisha'),
    ('or', 'Odisha'),
    ('od', 'Odisha'),
    ('orissa', 'Odisha'),
    ('ओड़िशा', 'Odisha'),
    ('उड़ीसा', 'Odisha'),
    ('punjab', 'Punjab'),
    ('पंजाब', 'Punjab'),
    ('pb', 'Punjab'),
    ('rajasthan', 'Rajasthan'),
    ('राजस्थान', 'Rajasthan'),
    ('rj', 'Rajasthan'),
    ('sikkim', 'Sikkim'),
    ('सिक्किम', 'Sikkim'),
    ('sk', 'Sikkim'),
    ('tamilnadu', 'Tamil Nadu'),
    ('तमिलनाडु', 'Tamil Nadu'),
    ('tn', 'Tamil Nadu'),
    ('तमिलनाडू', 'Tamil Nadu'),
    ('telangana', 'Telangana'),
    ('तेलंगाना', 'Telangana'),
    ('ts', 'Telangana'),
    ('tg', 'Telangana'),
    ('तेलंगाणा', 'Telangana'),
    ('तेलुगु', 'Telangana'),
    ('tripura', 'Tripura'),
    ('त्रिपुरा', 'Tripura'),
    ('tr', 'Tripura'),
    ('uttarpradesh', 'Uttar Pradesh'),
    ('उत्तरप्रदेश', 'Uttar Pradesh'),
    ('up', 'Uttar Pradesh'),
    ('उप्र', 'Uttar Pradesh'),
    ('uttarakhand', 'Uttarakhand'),
    ('उत्तराखंड', 'Uttarakhand'),
    ('uk', 'Uttarakhand'),
    ('ua', 'Uttarakhand'),
    ('uttaranchal', 'Uttarakhand'),
    ('उत्तराखण्ड', 'Uttarakhand'),
    ('उत्तरांचल', 'Uttarakhand'),
    ('westbengal', 'West Bengal'),
    ('पश्चिमबंगाल', 'West Bengal'),
    ('wb', 'West Bengal'),
    ('bengal', 'West Bengal'),
    ('पबंगाल', 'West Bengal'),
    ('andamanandnicobarislands', 'Andaman and Nicobar Islands'),
    ('अंडमानऔरनिकोबारद्वीपसमूह', 'Andaman and Nicobar Islands'),
    ('an', 'Andaman and Nicobar Islands'),
    ('andamannicobar', 'Andaman and Nicobar Islands'),
    ('andamanandnicobar', 'Andaman and Nicobar Islands'),
    ('अंडमाननिकोबार', 'Andaman and Nicobar Islands'),
    ('अंडमानऔरनिकोबार', 'Andaman and Nicobar Islands'),
    ('chandigarh', 'Chandigarh'),
    ('चंडीगढ़', 'Chandigarh'),
    ('ch', 'Chandigarh'),
    ('chandigarhut', 'Chandigarh'),
    ('चंडीगढ', 'Chandigarh'),
    ('चण्डीगढ़', 'Chandigarh'),
    ('dadraandnagarhavelianddamananddiu', 'Dadra and Nagar Haveli and Daman and Diu'),
    ('दादराऔरनगरहवेलीऔरदमनऔरदीव', 'Dadra and Nagar Haveli and Daman and Diu'),
    ('dn', 'Dadra and Nagar Haveli and Daman and Diu'),
    ('dd', 'Dadra and Nagar Haveli and Daman and Diu'),
    ('dnh', 'Dadra and Nagar Haveli and Daman and Diu'),
    ('dadraandnagarhaveli', 'Dadra and Nagar Haveli and Daman and Diu'),
    ('damananddiu', 'Dadra and Nagar Haveli and Daman and Diu'),
    ('dadranagarhaveli', 'Dadra and Nagar Haveli and Daman and Diu'),
    ('damandiu', 'Dadra and Nagar Haveli and Daman and Diu'),
    ('दादराऔरनगरहवेली', 'Dadra and Nagar Haveli and Daman and Diu'),
    ('दमनऔरदीव', 'Dadra and Nagar Haveli and Daman and Diu'),
    ('delhi', 'Delhi'),
    ('दिल्ली', 'Delhi'),
    ('dl', 'Delhi'),
    ('nctofdelhi', 'Delhi'),
    ('nct', 'Delhi'),
    ('newdelhi', 'Delhi'),
    ('nationalcapitalterritoryofdelhi', 'Delhi'),
    ('नईदिल्ली', 'Delhi'),
    ('दिल्लीएनसीटी', 'Delhi'),
    ('jammuandkashmir', 'Jammu and Kashmir'),
    ('जम्मूऔरकश्मीर', 'Jammu and Kashmir'),
    ('jk', 'Jammu and Kashmir'),
    ('jammukashmir', 'Jammu and Kashmir'),
    ('जम्मूकश्मीर', 'Jammu and Kashmir'),
    ('जम्मूवकश्मीर', 'Jammu and Kashmir'),
    ('ladakh', 'Ladakh'),
    ('लद्दाख', 'Ladakh'),
    ('la', 'Ladakh'),
    ('लदाख', 'Ladakh'),
    ('lakshadweep', 'Lakshadweep'),
    ('लक्षद्वीप', 'Lakshadweep'),
    ('ld', 'Lakshadweep'),
    ('puducherry', 'Puducherry'),
    ('पुडुचेरी', 'Puducherry'),
    ('py', 'Puducherry'),
    ('pondicherry', 'Puducherry'),
    ('pondy', 'Puducherry'),
    ('पांडिचेरी', 'Puducherry'),
    ('पॉन्डिचेरी', 'Puducherry')
)
update public.kisan_mela km set state = a.canonical
  from aliases a
  where public._mela_state_key(km.state) = a.k and km.state is distinct from a.canonical;

with aliases(k, canonical) as (values
    ('andhrapradesh', 'Andhra Pradesh'),
    ('आंध्रप्रदेश', 'Andhra Pradesh'),
    ('ap', 'Andhra Pradesh'),
    ('आन्ध्रप्रदेश', 'Andhra Pradesh'),
    ('arunachalpradesh', 'Arunachal Pradesh'),
    ('अरुणाचलप्रदेश', 'Arunachal Pradesh'),
    ('ar', 'Arunachal Pradesh'),
    ('arunachal', 'Arunachal Pradesh'),
    ('assam', 'Assam'),
    ('असम', 'Assam'),
    ('as', 'Assam'),
    ('bihar', 'Bihar'),
    ('बिहार', 'Bihar'),
    ('br', 'Bihar'),
    ('chhattisgarh', 'Chhattisgarh'),
    ('छत्तीसगढ़', 'Chhattisgarh'),
    ('cg', 'Chhattisgarh'),
    ('chattisgarh', 'Chhattisgarh'),
    ('छत्तीसगढ', 'Chhattisgarh'),
    ('छग', 'Chhattisgarh'),
    ('goa', 'Goa'),
    ('गोवा', 'Goa'),
    ('ga', 'Goa'),
    ('gujarat', 'Gujarat'),
    ('गुजरात', 'Gujarat'),
    ('gj', 'Gujarat'),
    ('haryana', 'Haryana'),
    ('हरियाणा', 'Haryana'),
    ('hr', 'Haryana'),
    ('himachalpradesh', 'Himachal Pradesh'),
    ('हिमाचलप्रदेश', 'Himachal Pradesh'),
    ('hp', 'Himachal Pradesh'),
    ('हिप्र', 'Himachal Pradesh'),
    ('jharkhand', 'Jharkhand'),
    ('झारखंड', 'Jharkhand'),
    ('jh', 'Jharkhand'),
    ('झारखण्ड', 'Jharkhand'),
    ('karnataka', 'Karnataka'),
    ('कर्नाटक', 'Karnataka'),
    ('ka', 'Karnataka'),
    ('कर्णाटक', 'Karnataka'),
    ('kerala', 'Kerala'),
    ('केरल', 'Kerala'),
    ('kl', 'Kerala'),
    ('केरला', 'Kerala'),
    ('madhyapradesh', 'Madhya Pradesh'),
    ('मध्यप्रदेश', 'Madhya Pradesh'),
    ('mp', 'Madhya Pradesh'),
    ('मप्र', 'Madhya Pradesh'),
    ('maharashtra', 'Maharashtra'),
    ('महाराष्ट्र', 'Maharashtra'),
    ('mh', 'Maharashtra'),
    ('maharastra', 'Maharashtra'),
    ('manipur', 'Manipur'),
    ('मणिपुर', 'Manipur'),
    ('mn', 'Manipur'),
    ('meghalaya', 'Meghalaya'),
    ('मेघालय', 'Meghalaya'),
    ('ml', 'Meghalaya'),
    ('mizoram', 'Mizoram'),
    ('मिज़ोरम', 'Mizoram'),
    ('mz', 'Mizoram'),
    ('मिजोरम', 'Mizoram'),
    ('nagaland', 'Nagaland'),
    ('नागालैंड', 'Nagaland'),
    ('nl', 'Nagaland'),
    ('नागालैण्ड', 'Nagaland'),
    ('odisha', 'Odisha'),
    ('ओडिशा', 'Odisha'),
    ('or', 'Odisha'),
    ('od', 'Odisha'),
    ('orissa', 'Odisha'),
    ('ओड़िशा', 'Odisha'),
    ('उड़ीसा', 'Odisha'),
    ('punjab', 'Punjab'),
    ('पंजाब', 'Punjab'),
    ('pb', 'Punjab'),
    ('rajasthan', 'Rajasthan'),
    ('राजस्थान', 'Rajasthan'),
    ('rj', 'Rajasthan'),
    ('sikkim', 'Sikkim'),
    ('सिक्किम', 'Sikkim'),
    ('sk', 'Sikkim'),
    ('tamilnadu', 'Tamil Nadu'),
    ('तमिलनाडु', 'Tamil Nadu'),
    ('tn', 'Tamil Nadu'),
    ('तमिलनाडू', 'Tamil Nadu'),
    ('telangana', 'Telangana'),
    ('तेलंगाना', 'Telangana'),
    ('ts', 'Telangana'),
    ('tg', 'Telangana'),
    ('तेलंगाणा', 'Telangana'),
    ('तेलुगु', 'Telangana'),
    ('tripura', 'Tripura'),
    ('त्रिपुरा', 'Tripura'),
    ('tr', 'Tripura'),
    ('uttarpradesh', 'Uttar Pradesh'),
    ('उत्तरप्रदेश', 'Uttar Pradesh'),
    ('up', 'Uttar Pradesh'),
    ('उप्र', 'Uttar Pradesh'),
    ('uttarakhand', 'Uttarakhand'),
    ('उत्तराखंड', 'Uttarakhand'),
    ('uk', 'Uttarakhand'),
    ('ua', 'Uttarakhand'),
    ('uttaranchal', 'Uttarakhand'),
    ('उत्तराखण्ड', 'Uttarakhand'),
    ('उत्तरांचल', 'Uttarakhand'),
    ('westbengal', 'West Bengal'),
    ('पश्चिमबंगाल', 'West Bengal'),
    ('wb', 'West Bengal'),
    ('bengal', 'West Bengal'),
    ('पबंगाल', 'West Bengal'),
    ('andamanandnicobarislands', 'Andaman and Nicobar Islands'),
    ('अंडमानऔरनिकोबारद्वीपसमूह', 'Andaman and Nicobar Islands'),
    ('an', 'Andaman and Nicobar Islands'),
    ('andamannicobar', 'Andaman and Nicobar Islands'),
    ('andamanandnicobar', 'Andaman and Nicobar Islands'),
    ('अंडमाननिकोबार', 'Andaman and Nicobar Islands'),
    ('अंडमानऔरनिकोबार', 'Andaman and Nicobar Islands'),
    ('chandigarh', 'Chandigarh'),
    ('चंडीगढ़', 'Chandigarh'),
    ('ch', 'Chandigarh'),
    ('chandigarhut', 'Chandigarh'),
    ('चंडीगढ', 'Chandigarh'),
    ('चण्डीगढ़', 'Chandigarh'),
    ('dadraandnagarhavelianddamananddiu', 'Dadra and Nagar Haveli and Daman and Diu'),
    ('दादराऔरनगरहवेलीऔरदमनऔरदीव', 'Dadra and Nagar Haveli and Daman and Diu'),
    ('dn', 'Dadra and Nagar Haveli and Daman and Diu'),
    ('dd', 'Dadra and Nagar Haveli and Daman and Diu'),
    ('dnh', 'Dadra and Nagar Haveli and Daman and Diu'),
    ('dadraandnagarhaveli', 'Dadra and Nagar Haveli and Daman and Diu'),
    ('damananddiu', 'Dadra and Nagar Haveli and Daman and Diu'),
    ('dadranagarhaveli', 'Dadra and Nagar Haveli and Daman and Diu'),
    ('damandiu', 'Dadra and Nagar Haveli and Daman and Diu'),
    ('दादराऔरनगरहवेली', 'Dadra and Nagar Haveli and Daman and Diu'),
    ('दमनऔरदीव', 'Dadra and Nagar Haveli and Daman and Diu'),
    ('delhi', 'Delhi'),
    ('दिल्ली', 'Delhi'),
    ('dl', 'Delhi'),
    ('nctofdelhi', 'Delhi'),
    ('nct', 'Delhi'),
    ('newdelhi', 'Delhi'),
    ('nationalcapitalterritoryofdelhi', 'Delhi'),
    ('नईदिल्ली', 'Delhi'),
    ('दिल्लीएनसीटी', 'Delhi'),
    ('jammuandkashmir', 'Jammu and Kashmir'),
    ('जम्मूऔरकश्मीर', 'Jammu and Kashmir'),
    ('jk', 'Jammu and Kashmir'),
    ('jammukashmir', 'Jammu and Kashmir'),
    ('जम्मूकश्मीर', 'Jammu and Kashmir'),
    ('जम्मूवकश्मीर', 'Jammu and Kashmir'),
    ('ladakh', 'Ladakh'),
    ('लद्दाख', 'Ladakh'),
    ('la', 'Ladakh'),
    ('लदाख', 'Ladakh'),
    ('lakshadweep', 'Lakshadweep'),
    ('लक्षद्वीप', 'Lakshadweep'),
    ('ld', 'Lakshadweep'),
    ('puducherry', 'Puducherry'),
    ('पुडुचेरी', 'Puducherry'),
    ('py', 'Puducherry'),
    ('pondicherry', 'Puducherry'),
    ('pondy', 'Puducherry'),
    ('पांडिचेरी', 'Puducherry'),
    ('पॉन्डिचेरी', 'Puducherry')
)
update public.kisan_mela_candidates kc set raw_state = a.canonical
  from aliases a
  where kc.raw_state is not null
    and public._mela_state_key(kc.raw_state) = a.k and kc.raw_state is distinct from a.canonical;

-- ===========================================================================================
-- Phase 2 — geocode precision (2a-i): trust coordinates for a merge ONLY at venue-level precision.
-- Existing rows are left null (precision unknown → they fall back to the text match, never a
-- coordinate-only merge); new promotions record 'venue' | 'area' from Nominatim's result class/type.
-- ===========================================================================================
alter table public.kisan_mela add column if not exists geocode_precision text;

-- ===========================================================================================
-- Phase 3 — merge support: survivor links, interest ownership tracking, do-not-merge exclusions,
-- and admin RPCs (recent merges, split, link redirect). Merges are reversible + auditable (3d/3f).
-- ===========================================================================================
alter table public.kisan_mela add column if not exists merged_into uuid references public.kisan_mela(id);
alter table public.kisan_mela add column if not exists merge_reason text;
alter table public.kisan_mela add column if not exists merged_at timestamptz;
create index if not exists kisan_mela_merged_into_idx on public.kisan_mela(merged_into) where merged_into is not null;

-- Track which Mela an interest mark ORIGINALLY belonged to, so an admin split can move it back (3f).
alter table public.kisan_mela_interest add column if not exists original_mela_id uuid;

-- Pairs an admin split apart — the pipeline must never re-merge them (3f).
create table if not exists public.mela_merge_exclusions (
  pair_key text primary key,
  id_a uuid not null,
  id_b uuid not null,
  created_at timestamptz not null default now()
);
alter table public.mela_merge_exclusions enable row level security; -- default-deny to anon; service role bypasses

-- Resolve a (possibly merged-away) Mela id to its ACTIVE survivor by following merged_into (3e).
-- SECURITY DEFINER so a public shared link can resolve even though the merged-away row is not
-- anon-readable under RLS. Returns the active survivor's id, or null if none.
create or replace function public.resolve_active_mela(p_id uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp stable as $$
declare cur uuid := p_id; nxt uuid; act boolean; guard int := 0;
begin
  loop
    guard := guard + 1; if guard > 10 then return null; end if;
    select is_active, merged_into into act, nxt from public.kisan_mela where id = cur;
    if not found then return null; end if;
    if act then return cur; end if;
    if nxt is null then return null; end if; -- inactive and not merged → gone
    cur := nxt;
  end loop;
end; $$;
grant execute on function public.resolve_active_mela(uuid) to anon, authenticated;

-- Recent merges for the admin "हाल के विलय" panel — merged-away rows with their survivor + reason.
create or replace function public.get_recent_mela_merges(p_actor_id uuid)
returns table (
  merged_id uuid, merged_name text, merged_state text, survivor_id uuid, survivor_name text,
  reason text, merged_at timestamptz
) language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.require_admin(p_actor_id);
  return query
    select m.id, coalesce(m.name_en, m.name_hi), m.state, s.id, coalesce(s.name_en, s.name_hi),
           m.merge_reason, m.merged_at
    from public.kisan_mela m
    join public.kisan_mela s on s.id = m.merged_into
    where m.merged_into is not null
    order by m.merged_at desc nulls last
    limit 100;
end; $$;
grant execute on function public.get_recent_mela_merges(uuid) to anon, authenticated;

-- Split a merged-away row back out (3f): reactivate it, drop its merged_into link, move its original
-- interest marks back from the survivor, and record a do-not-merge exclusion so the next run won't
-- re-merge the pair. Its own source_urls were never removed, so they are intact on reactivation.
create or replace function public.admin_split_mela(p_actor_id uuid, p_id uuid)
returns public.kisan_mela language plpgsql security definer set search_path = public, pg_temp as $$
declare m public.kisan_mela%rowtype; surv uuid; v public.kisan_mela%rowtype;
begin
  perform public.require_admin(p_actor_id);
  select * into m from public.kisan_mela where id = p_id;
  if not found then raise exception 'not_found'; end if;
  if m.merged_into is null then return m; end if; -- not merged; nothing to do
  surv := m.merged_into;
  -- Move interest marks that originally belonged to p_id back to it, skipping any that would collide.
  update public.kisan_mela_interest ki set mela_id = p_id, original_mela_id = null
    where ki.mela_id = surv and ki.original_mela_id = p_id
      and not exists (select 1 from public.kisan_mela_interest x where x.mela_id = p_id and x.user_id = ki.user_id);
  update public.kisan_mela set is_active = true, merged_into = null, merge_reason = null, merged_at = null where id = p_id
    returning * into v;
  insert into public.mela_merge_exclusions (pair_key, id_a, id_b)
    values ((select string_agg(x, '::' order by x) from unnest(array[p_id::text, surv::text]) x), p_id, surv)
    on conflict (pair_key) do nothing;
  return v;
end; $$;
grant execute on function public.admin_split_mela(uuid, uuid) to anon, authenticated;
