-- 0075_kissan_mitra.sql - Batch 20: Kissan Mitra (field people who register farmers), who registered whom, a count,
-- and a payment ledger. STRICTLY ADDITIVE and IDEMPOTENT. Pure ASCII. NOT applied anywhere by the batch (the founder
-- pastes it: staging first, then production).
--
-- What this file does
--   * NEW tables kissan_mitras and kissan_mitra_payments (RLS on, no table privileges for anon / authenticated).
--   * Three NEW columns on profiles: mitra_id, mitra_set_at, mitra_paid_id (nullable; nothing is rewritten).
--   * list_active_mitras()          anon, authenticated   the ONE public function: id, display_name, area of ACTIVE Mitras.
--   * set_my_mitra(actor, mitra)    anon, authenticated   guarded by require_actor (0066). Saves the choice ONCE, within
--                                                         15 minutes of the account being created, only if none is saved.
--   * admin_* functions             anon, authenticated   (the admin console uses the anon key and a custom session, exactly
--                                                         like the 0067 functions) guarded INSIDE by require_admin_session,
--                                                         which needs an admin profile AND a live session token.
-- What this file does NOT do
--   * It does not re-create, alter or call app_register_phone_otp / app_register_phone / app_signup or any existing
--     function. The registration functions are untouched: the Mitra choice is saved by set_my_mitra right AFTER registering.
--   * It does not touch otp_required / session_enforced.
--   * No approval, status, reject or waiting period. A registration counts as soon as it is attributed to a Mitra.
--     "Counted" = attributed to the Mitra and the profile is not blocked. "Unpaid" = mitra_paid_id is null.
--   * Business accounts do not exist yet (no account type, no business sign-up), so every counted registration is a
--     farmer today. ks_mitra_kind() is the ONE place that decides farmer or business; when a business account type is
--     added, only that function changes. The business rate column is ready.
-- Error codes the UI maps: not_admin, session_required, invalid_input, mitra_duplicate, not_found, already_paid, nothing_unpaid.

-- 1. tables ---------------------------------------------------------------------------------------------------
create table if not exists public.kissan_mitras (
  id                    uuid primary key default gen_random_uuid(),
  display_name          text not null check (char_length(display_name) between 1 and 80),
  area                  text check (area is null or char_length(area) <= 80),
  private_phone         text check (private_phone is null or char_length(private_phone) <= 20),
  rate_farmer_rupees    integer check (rate_farmer_rupees is null or (rate_farmer_rupees >= 0 and rate_farmer_rupees <= 100000)),
  rate_business_rupees  integer check (rate_business_rupees is null or (rate_business_rupees >= 0 and rate_business_rupees <= 100000)),
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid
);
-- The same name in the same area is refused (case-insensitive); the same name in another area is fine.
create unique index if not exists kissan_mitras_name_area_uidx
  on public.kissan_mitras (lower(display_name), lower(coalesce(area, '')));
alter table public.kissan_mitras enable row level security;
revoke all on table public.kissan_mitras from public, anon, authenticated;

create table if not exists public.kissan_mitra_payments (
  id              uuid primary key default gen_random_uuid(),
  mitra_id        uuid not null references public.kissan_mitras (id),
  amount_rupees   integer not null check (amount_rupees >= 0 and amount_rupees <= 100000000),
  farmer_count    integer not null check (farmer_count >= 0),
  business_count  integer not null check (business_count >= 0),
  paid_on         date not null,
  note            text check (note is null or char_length(note) <= 300),
  created_by      uuid,
  created_at      timestamptz not null default now()
);
create index if not exists kissan_mitra_payments_mitra_idx on public.kissan_mitra_payments (mitra_id, created_at desc);
alter table public.kissan_mitra_payments enable row level security;
revoke all on table public.kissan_mitra_payments from public, anon, authenticated;

-- 2. profiles: who registered this person, when it was saved, and which payment covered it ---------------------
alter table public.profiles add column if not exists mitra_id uuid references public.kissan_mitras (id);
alter table public.profiles add column if not exists mitra_set_at timestamptz;
alter table public.profiles add column if not exists mitra_paid_id uuid references public.kissan_mitra_payments (id);
create index if not exists profiles_mitra_idx on public.profiles (mitra_id) where mitra_id is not null;

-- 3. farmer or business (the only place that decides) ---------------------------------------------------------
create or replace function public.ks_mitra_kind(p public.profiles)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$ select 'farmer'::text $$;
revoke all on function public.ks_mitra_kind(public.profiles) from public, anon, authenticated;

-- 4. the public dropdown --------------------------------------------------------------------------------------
create or replace function public.list_active_mitras()
returns table (id uuid, display_name text, area text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.id, m.display_name, m.area
    from public.kissan_mitras m
   where m.is_active
   order by lower(m.display_name), lower(coalesce(m.area, ''))
$$;
revoke all on function public.list_active_mitras() from public;
grant execute on function public.list_active_mitras() to anon, authenticated;

-- 5. the person's own choice, saved once right after registering ---------------------------------------------
-- Never raises for a normal "no": it answers a small status. (require_actor may raise not_authenticated when the
-- session rules are enforced and the token is missing; the app treats every answer as best effort.)
create or replace function public.set_my_mitra(p_actor_id uuid, p_mitra_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_created timestamptz;
  v_current uuid;
  v_rows    integer;
begin
  perform public.require_actor(p_actor_id);
  if p_mitra_id is null then return jsonb_build_object('status', 'none'); end if;
  select created_at, mitra_id into v_created, v_current from public.profiles where id = p_actor_id;
  if not found then return jsonb_build_object('status', 'no_profile'); end if;
  if v_current is not null then return jsonb_build_object('status', 'already_set'); end if;
  if v_created is null or v_created < now() - interval '15 minutes' then return jsonb_build_object('status', 'too_late'); end if;
  if not exists (select 1 from public.kissan_mitras where id = p_mitra_id and is_active) then
    return jsonb_build_object('status', 'no_such_mitra');
  end if;
  update public.profiles set mitra_id = p_mitra_id, mitra_set_at = now()
   where id = p_actor_id and mitra_id is null;
  get diagnostics v_rows = row_count;
  return jsonb_build_object('status', case when v_rows = 1 then 'set' else 'already_set' end);
end;
$$;
revoke all on function public.set_my_mitra(uuid, uuid) from public;
grant execute on function public.set_my_mitra(uuid, uuid) to anon, authenticated;

-- 6. admin: the list with every count computed here -----------------------------------------------------------
create or replace function public.admin_list_mitras(p_actor uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_rows  jsonb;
  v_first timestamptz;
begin
  perform public.require_admin_session(p_actor, false);
  select min(created_at) into v_first from public.kissan_mitras;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.is_active desc, lower(x.display_name), lower(coalesce(x.area, ''))), '[]'::jsonb) into v_rows
  from (
    select m.id, m.display_name, m.area, m.private_phone, m.rate_farmer_rupees, m.rate_business_rupees, m.is_active, m.created_at,
      coalesce(c.farmers_total, 0)               as farmers_total,
      coalesce(c.businesses_total, 0)            as businesses_total,
      coalesce(c.today, 0)                       as today,
      coalesce(c.last7, 0)                       as last7,
      coalesce(c.unpaid_farmers, 0)              as counted_unpaid_farmers,
      coalesce(c.unpaid_businesses, 0)           as counted_unpaid_businesses,
      coalesce(c.paid_total, 0)                  as paid_total_registrations,
      coalesce(pay.total, 0)                     as payments_total_rupees
    from public.kissan_mitras m
    left join (
      select p.mitra_id,
        count(*) filter (where k = 'farmer')                                         as farmers_total,
        count(*) filter (where k = 'business')                                       as businesses_total,
        count(*) filter (where (p.created_at at time zone 'Asia/Kolkata')::date = v_today) as today,
        count(*) filter (where p.created_at >= now() - interval '7 days')           as last7,
        count(*) filter (where k = 'farmer' and p.mitra_paid_id is null)             as unpaid_farmers,
        count(*) filter (where k = 'business' and p.mitra_paid_id is null)           as unpaid_businesses,
        count(*) filter (where p.mitra_paid_id is not null)                          as paid_total
      from (select pp.*, public.ks_mitra_kind(pp) as k from public.profiles pp where pp.mitra_id is not null and not pp.is_blocked) p
      group by p.mitra_id
    ) c on c.mitra_id = m.id
    left join (select mitra_id, sum(amount_rupees)::bigint as total from public.kissan_mitra_payments group by mitra_id) pay on pay.mitra_id = m.id
  ) x;

  return jsonb_build_object(
    'mitras', v_rows,
    'unattributed_total', (select count(*) from public.profiles p where p.mitra_id is null and v_first is not null and p.created_at >= v_first)
  );
end;
$$;

-- 7. admin: add or edit ---------------------------------------------------------------------------------------
create or replace function public.admin_upsert_mitra(p_actor uuid, p_id uuid, p_data jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  d        jsonb := coalesce(p_data, '{}'::jsonb);
  v_name   text := nullif(btrim(d ->> 'display_name'), '');
  v_area   text := nullif(btrim(d ->> 'area'), '');
  v_phone  text := nullif(btrim(d ->> 'private_phone'), '');
  v_rf     integer;
  v_rb     integer;
  v_active boolean := coalesce((d ->> 'is_active')::boolean, true);
  r        public.kissan_mitras;
begin
  perform public.require_admin_session(p_actor, false);
  begin
    v_rf := nullif(btrim(d ->> 'rate_farmer_rupees'), '')::integer;
    v_rb := nullif(btrim(d ->> 'rate_business_rupees'), '')::integer;
  exception when others then
    raise exception 'invalid_input';
  end;
  if v_name is null or char_length(v_name) > 80 then raise exception 'invalid_input'; end if;
  if v_area is not null and char_length(v_area) > 80 then raise exception 'invalid_input'; end if;
  if v_phone is not null and (char_length(v_phone) > 20 or v_phone !~ '^[0-9+ -]+$') then raise exception 'invalid_input'; end if;
  if v_rf is not null and (v_rf < 0 or v_rf > 100000) then raise exception 'invalid_input'; end if;
  if v_rb is not null and (v_rb < 0 or v_rb > 100000) then raise exception 'invalid_input'; end if;
  if exists (select 1 from public.kissan_mitras m
              where lower(m.display_name) = lower(v_name) and lower(coalesce(m.area, '')) = lower(coalesce(v_area, ''))
                and (p_id is null or m.id <> p_id)) then
    raise exception 'mitra_duplicate';
  end if;
  begin
    if p_id is null then
      insert into public.kissan_mitras (display_name, area, private_phone, rate_farmer_rupees, rate_business_rupees, is_active, created_by)
      values (v_name, v_area, v_phone, v_rf, v_rb, v_active, p_actor)
      returning * into r;
      perform public.log_admin_action(p_actor, 'mitra_create', 'kissan_mitra', r.id::text, jsonb_build_object('active', r.is_active));
    else
      update public.kissan_mitras
         set display_name = v_name, area = v_area, private_phone = v_phone, rate_farmer_rupees = v_rf, rate_business_rupees = v_rb,
             is_active = v_active, updated_at = now()
       where id = p_id
       returning * into r;
      if not found then raise exception 'not_found'; end if;
      perform public.log_admin_action(p_actor, 'mitra_update', 'kissan_mitra', r.id::text, jsonb_build_object('active', r.is_active));
    end if;
  exception when unique_violation then
    raise exception 'mitra_duplicate';
  end;
  return to_jsonb(r);
end;
$$;

-- 8. admin: one Mitra's registrations (phones masked to the last 4 digits) ------------------------------------
create or replace function public.admin_list_mitra_registrations(p_actor uuid, p_mitra_id uuid, p_limit integer default 25, p_offset integer default 0)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit  integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_total  integer;
  v_rows   jsonb;
begin
  perform public.require_admin_session(p_actor, false);
  select count(*) into v_total from public.profiles where mitra_id = p_mitra_id;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.registered_at desc, x.id), '[]'::jsonb) into v_rows
  from (
    select p.id, p.full_name, p.village_town,
           public.ks_mitra_kind(p) as kind,
           case when p.phone is null then null else '******' || right(p.phone, 4) end as masked_phone,
           p.created_at as registered_at,
           (p.mitra_paid_id is not null) as paid,
           p.is_blocked as blocked,
           (nullif(btrim(p.full_name), '') is not null and nullif(btrim(p.village_town), '') is not null and exists (
              select 1 from public.profiles o
               where o.id <> p.id
                 and lower(btrim(o.full_name)) = lower(btrim(p.full_name))
                 and lower(btrim(o.village_town)) = lower(btrim(p.village_town)))) as same_name_village
      from public.profiles p
     where p.mitra_id = p_mitra_id
     order by p.created_at desc, p.id
     limit v_limit offset v_offset
  ) x;
  return jsonb_build_object('total', v_total, 'rows', v_rows);
end;
$$;

-- 9. admin: move one registration to another Mitra, or to none -----------------------------------------------
create or replace function public.admin_reassign_registration(p_actor uuid, p_profile_id uuid, p_new_mitra_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_old  uuid;
  v_paid uuid;
begin
  perform public.require_admin_session(p_actor, false);
  select mitra_id, mitra_paid_id into v_old, v_paid from public.profiles where id = p_profile_id for update;
  if not found then raise exception 'not_found'; end if;
  if v_paid is not null then raise exception 'already_paid'; end if;
  if p_new_mitra_id is not null and not exists (select 1 from public.kissan_mitras where id = p_new_mitra_id) then
    raise exception 'not_found';
  end if;
  if v_old is not distinct from p_new_mitra_id then
    return jsonb_build_object('ok', true, 'mitra_id', p_new_mitra_id, 'changed', false);
  end if;
  update public.profiles set mitra_id = p_new_mitra_id, mitra_set_at = case when p_new_mitra_id is null then null else now() end
   where id = p_profile_id;
  perform public.log_admin_action(p_actor, 'mitra_reassign', 'profile', p_profile_id::text,
    jsonb_build_object('from', v_old::text, 'to', p_new_mitra_id::text));
  return jsonb_build_object('ok', true, 'mitra_id', p_new_mitra_id, 'changed', true);
end;
$$;

-- 10. admin: mark paid - one transaction ----------------------------------------------------------------------
create or replace function public.admin_mark_mitra_paid(p_actor uuid, p_mitra_id uuid, p_amount_rupees integer, p_paid_on date, p_note text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_pay   uuid;
  v_f     integer := 0;
  v_b     integer := 0;
  v_paid  date := coalesce(p_paid_on, (now() at time zone 'Asia/Kolkata')::date);
  v_note  text := nullif(btrim(p_note), '');
begin
  perform public.require_admin_session(p_actor, false);
  if p_amount_rupees is null or p_amount_rupees < 0 or p_amount_rupees > 100000000 then raise exception 'invalid_input'; end if;
  if v_note is not null and char_length(v_note) > 300 then raise exception 'invalid_input'; end if;
  perform 1 from public.kissan_mitras where id = p_mitra_id for update;
  if not found then raise exception 'not_found'; end if;

  insert into public.kissan_mitra_payments (mitra_id, amount_rupees, farmer_count, business_count, paid_on, note, created_by)
  values (p_mitra_id, p_amount_rupees, 0, 0, v_paid, v_note, p_actor)
  returning id into v_pay;

  -- Stamp exactly the counted-and-unpaid rows of THIS Mitra and count them from the same statement.
  with stamped as (
    update public.profiles p set mitra_paid_id = v_pay
     where p.mitra_id = p_mitra_id and p.mitra_paid_id is null and not p.is_blocked
     returning public.ks_mitra_kind(p) as k
  )
  select count(*) filter (where k = 'farmer'), count(*) filter (where k = 'business') into v_f, v_b from stamped;

  if coalesce(v_f, 0) + coalesce(v_b, 0) = 0 then raise exception 'nothing_unpaid'; end if; -- rolls the payment row back too
  update public.kissan_mitra_payments set farmer_count = v_f, business_count = v_b where id = v_pay;
  perform public.log_admin_action(p_actor, 'mitra_paid', 'kissan_mitra', p_mitra_id::text,
    jsonb_build_object('amount', p_amount_rupees, 'farmers', v_f, 'businesses', v_b));
  return jsonb_build_object('ok', true, 'payment_id', v_pay, 'farmer_count', v_f, 'business_count', v_b, 'amount_rupees', p_amount_rupees);
end;
$$;

-- 11. admin: the ledger ---------------------------------------------------------------------------------------
create or replace function public.admin_list_mitra_payments(p_actor uuid, p_mitra_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_admin_session(p_actor, false);
  return (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
            from (select id, mitra_id, amount_rupees, farmer_count, business_count, paid_on, note, created_at
                    from public.kissan_mitra_payments where mitra_id = p_mitra_id order by created_at desc limit 200) x);
end;
$$;

-- 12. grants (exact signatures) -------------------------------------------------------------------------------
revoke all on function public.admin_list_mitras(uuid) from public;
revoke all on function public.admin_upsert_mitra(uuid, uuid, jsonb) from public;
revoke all on function public.admin_list_mitra_registrations(uuid, uuid, integer, integer) from public;
revoke all on function public.admin_reassign_registration(uuid, uuid, uuid) from public;
revoke all on function public.admin_mark_mitra_paid(uuid, uuid, integer, date, text) from public;
revoke all on function public.admin_list_mitra_payments(uuid, uuid) from public;
grant execute on function public.admin_list_mitras(uuid) to anon, authenticated;
grant execute on function public.admin_upsert_mitra(uuid, uuid, jsonb) to anon, authenticated;
grant execute on function public.admin_list_mitra_registrations(uuid, uuid, integer, integer) to anon, authenticated;
grant execute on function public.admin_reassign_registration(uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.admin_mark_mitra_paid(uuid, uuid, integer, date, text) to anon, authenticated;
grant execute on function public.admin_list_mitra_payments(uuid, uuid) to anon, authenticated;
