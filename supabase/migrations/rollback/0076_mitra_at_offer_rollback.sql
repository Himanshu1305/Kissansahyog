-- Rollback for 0076 (optional, never run by a script): puts the Kissan Mitra back as it was after 0075.
-- WARNING: this DELETES the "which Mitra brought this ad" data (announcements.mitra_id / mitra_paid_id). Mitra choices
-- saved on a first offer are profile data (profiles.mitra_id) and STAY. Payments already recorded stay.
-- It re-creates the four 0075 admin functions (registration-based counting) and drops everything 0076 added.
-- Safe to run twice. Pure ASCII.
drop function if exists public.admin_list_mitra_ads(uuid, uuid);
drop function if exists public.admin_get_announcement_mitras(uuid);
drop function if exists public.admin_set_announcement_mitra(uuid, uuid, uuid);
drop function if exists public.set_my_mitra_on_offer(uuid, uuid, uuid);
drop function if exists public.my_mitra_choice_open(uuid);

-- the four functions below are the 0075 versions (counting by registration, not by service offer)
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

-- the 0076 helper functions can only go after the functions above no longer use them
drop function if exists public.ks_mitra_offered(public.profiles);
drop function if exists public.ks_mitra_first_offer_at(public.profiles);
drop index if exists public.announcements_mitra_idx;
alter table public.announcements drop column if exists mitra_paid_id;
alter table public.announcements drop column if exists mitra_id;
