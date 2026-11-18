-- 0076_mitra_at_offer.sql - Batch 22: the Kissan Mitra moves from sign-up to "offering a service" and to ads.
-- STRICTLY ADDITIVE and IDEMPOTENT. Pure ASCII. Needs 0075 applied first. NOT applied anywhere by the batch (the founder
-- pastes it: staging first, then production).
--
-- What this file does
--   * my_mitra_choice_open(actor)                     anon, authenticated  guarded by require_actor. True only when the person
--                                                      has no Mitra AND has never created an offer listing (ANY status).
--   * set_my_mitra_on_offer(actor, mitra, listing)    anon, authenticated  guarded by require_actor. Saves the Mitra ONCE, only
--                                                      for the person's FIRST offer, made in the last 30 minutes.
--   * ks_mitra_first_offer_at(profile) / ks_mitra_offered(profile)   the ONE place that decides "this person offered a service":
--                                                      at least one listing with listing_type = 'offer', status <> 'removed' and
--                                                      admin_disabled_at is null. A person counts once, however many offers.
--   * announcements gets nullable mitra_id and mitra_paid_id (an ad brought by a Mitra, and the payment that covered it).
--   * admin_set_announcement_mitra / admin_get_announcement_mitras / admin_list_mitra_ads   (admin, guarded inside).
--   * REPLACES (create or replace, same names, same arguments, every old result key kept, new keys added):
--     admin_list_mitras, admin_list_mitra_registrations, admin_reassign_registration (same behaviour), admin_mark_mitra_paid.
-- Counting rules (they replace the 0075 rule "counted = attributed"):
--   * FARMERS: a person counts for a Mitra only AFTER they have offered a service (ks_mitra_offered), is attributed to the
--     Mitra and is not blocked. People attributed at registration under Batch 20 who never offered are NOT counted and NOT
--     paid; the attribution stays stored and they count the day they offer.
--   * ADS: every announcement that has a mitra_id counts as ONE ad for that Mitra. Ads are counted in the "business"
--     columns (businesses_total, counted_unpaid_businesses), so rate_business_rupees means "rupees per ad" and the existing
--     amount maths works unchanged. Deleting an ad removes it from the unpaid count; an ad that was already paid keeps its
--     payment row (the ledger).
--   * Mark paid stamps the counted unpaid farmers AND the unpaid ads of that Mitra in one transaction.
-- What this file does NOT do
--   * It does not touch create_listing_with_location, app_register_phone*, set_my_mitra, the announcement functions
--     (admin_upsert_announcement, admin_list_announcements, admin_duplicate_announcement, admin_delete_announcement,
--     get_active_announcements) or the OTP switches (otp_required, session_enforced).
--   * It does not link anyone to a Mitra by itself. Existing links stay as they are.
-- Error codes the UI maps: not_admin, session_required, invalid_input, not_found, already_paid, nothing_unpaid.
-- Status words of the two person-facing functions: set, already_set, none, no_such_mitra, not_your_offer, too_late,
--   not_first_offer, no_profile (they never raise for a normal "no").

-- 1. announcements: which Mitra brought the ad, and which payment covered it -------------------------------------
alter table public.announcements add column if not exists mitra_id uuid references public.kissan_mitras (id);
alter table public.announcements add column if not exists mitra_paid_id uuid references public.kissan_mitra_payments (id);
create index if not exists announcements_mitra_idx on public.announcements (mitra_id) where mitra_id is not null;

-- 2. "offered a service" - the ONE definition ---------------------------------------------------------------------
create or replace function public.ks_mitra_first_offer_at(p public.profiles)
returns timestamptz
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select min(l.created_at)
    from public.listings l
   where l.user_id = p.id and l.listing_type = 'offer' and l.status <> 'removed' and l.admin_disabled_at is null
$$;
revoke all on function public.ks_mitra_first_offer_at(public.profiles) from public, anon, authenticated;

create or replace function public.ks_mitra_offered(p public.profiles)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$ select public.ks_mitra_first_offer_at(p) is not null $$;
revoke all on function public.ks_mitra_offered(public.profiles) from public, anon, authenticated;

-- 3. may the Mitra choice be shown on the offer form? --------------------------------------------------------------
create or replace function public.my_mitra_choice_open(p_actor_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_mitra uuid;
begin
  perform public.require_actor(p_actor_id);
  select mitra_id into v_mitra from public.profiles where id = p_actor_id;
  if not found then return false; end if;
  if v_mitra is not null then return false; end if;
  return not exists (select 1 from public.listings l where l.user_id = p_actor_id and l.listing_type = 'offer');
end;
$$;
revoke all on function public.my_mitra_choice_open(uuid) from public;
grant execute on function public.my_mitra_choice_open(uuid) to anon, authenticated;

-- 4. save the choice right after the FIRST offer was created -------------------------------------------------------
create or replace function public.set_my_mitra_on_offer(p_actor_id uuid, p_mitra_id uuid, p_listing_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_current uuid;
  v_user    uuid;
  v_type    text;
  v_created timestamptz;
  v_rows    integer;
begin
  perform public.require_actor(p_actor_id);
  if p_mitra_id is null then return jsonb_build_object('status', 'none'); end if;
  select mitra_id into v_current from public.profiles where id = p_actor_id;
  if not found then return jsonb_build_object('status', 'no_profile'); end if;
  if v_current is not null then return jsonb_build_object('status', 'already_set'); end if;
  select user_id, listing_type, created_at into v_user, v_type, v_created from public.listings where id = p_listing_id;
  if not found or v_user is distinct from p_actor_id or v_type is distinct from 'offer' then
    return jsonb_build_object('status', 'not_your_offer');
  end if;
  if v_created < now() - interval '30 minutes' then return jsonb_build_object('status', 'too_late'); end if;
  if exists (select 1 from public.listings o
              where o.user_id = p_actor_id and o.listing_type = 'offer' and o.id <> p_listing_id
                and (o.created_at < v_created or (o.created_at = v_created and o.id < p_listing_id))) then
    return jsonb_build_object('status', 'not_first_offer');
  end if;
  if not exists (select 1 from public.kissan_mitras where id = p_mitra_id and is_active) then
    return jsonb_build_object('status', 'no_such_mitra');
  end if;
  update public.profiles set mitra_id = p_mitra_id, mitra_set_at = now()
   where id = p_actor_id and mitra_id is null;
  get diagnostics v_rows = row_count;
  return jsonb_build_object('status', case when v_rows = 1 then 'set' else 'already_set' end);
end;
$$;
revoke all on function public.set_my_mitra_on_offer(uuid, uuid, uuid) from public;
grant execute on function public.set_my_mitra_on_offer(uuid, uuid, uuid) to anon, authenticated;

-- 5. admin: which Mitra brought an ad -----------------------------------------------------------------------------
create or replace function public.admin_set_announcement_mitra(p_actor uuid, p_announcement_id uuid, p_mitra_id uuid)
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
  select mitra_id, mitra_paid_id into v_old, v_paid from public.announcements where id = p_announcement_id for update;
  if not found then raise exception 'not_found'; end if;
  if v_paid is not null then raise exception 'already_paid'; end if;
  if p_mitra_id is not null and not exists (select 1 from public.kissan_mitras where id = p_mitra_id) then
    raise exception 'not_found';
  end if;
  if v_old is not distinct from p_mitra_id then
    return jsonb_build_object('ok', true, 'mitra_id', p_mitra_id, 'changed', false);
  end if;
  update public.announcements set mitra_id = p_mitra_id where id = p_announcement_id;
  perform public.log_admin_action(p_actor, 'announcement_mitra', 'announcement', p_announcement_id::text,
    jsonb_build_object('from', v_old::text, 'to', p_mitra_id::text));
  return jsonb_build_object('ok', true, 'mitra_id', p_mitra_id, 'changed', true);
end;
$$;

-- id -> { mitra_id, paid } for every ad that has a Mitra (the admin list uses it for the chip and the read-only note)
create or replace function public.admin_get_announcement_mitras(p_actor uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_admin_session(p_actor, false);
  return (select coalesce(jsonb_object_agg(a.id::text, jsonb_build_object('mitra_id', a.mitra_id, 'paid', (a.mitra_paid_id is not null))), '{}'::jsonb)
            from public.announcements a where a.mitra_id is not null);
end;
$$;

create or replace function public.admin_list_mitra_ads(p_actor uuid, p_mitra_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_admin_session(p_actor, false);
  return (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc, x.id), '[]'::jsonb)
            from (select a.id, a.title_hi, a.created_at, (a.mitra_paid_id is not null) as paid
                    from public.announcements a where a.mitra_id = p_mitra_id order by a.created_at desc, a.id limit 200) x);
end;
$$;

-- 6. admin: the list with every count computed here (REPLACES 0075; same result keys, new counting rules) ---------
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
begin
  perform public.require_admin_session(p_actor, false);

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
      select e.mitra_id,
        count(*) filter (where e.k = 'farmer')                                         as farmers_total,
        count(*) filter (where e.k = 'business')                                       as businesses_total,
        count(*) filter (where (e.at at time zone 'Asia/Kolkata')::date = v_today)     as today,
        count(*) filter (where e.at >= now() - interval '7 days')                      as last7,
        count(*) filter (where e.k = 'farmer' and not e.paid)                          as unpaid_farmers,
        count(*) filter (where e.k = 'business' and not e.paid)                        as unpaid_businesses,
        count(*) filter (where e.paid)                                                 as paid_total
      from (
        -- farmers: attributed, not blocked, and they have offered a service (the date is their first offer)
        select pp.mitra_id, public.ks_mitra_kind(pp) as k, public.ks_mitra_first_offer_at(pp) as at, (pp.mitra_paid_id is not null) as paid
          from public.profiles pp
         where pp.mitra_id is not null and not pp.is_blocked and public.ks_mitra_offered(pp)
        union all
        -- ads: one per announcement that has this Mitra (counted in the business columns)
        select a.mitra_id, 'business'::text, a.created_at, (a.mitra_paid_id is not null)
          from public.announcements a
         where a.mitra_id is not null
      ) e
      group by e.mitra_id
    ) c on c.mitra_id = m.id
    left join (select mitra_id, sum(amount_rupees)::bigint as total from public.kissan_mitra_payments group by mitra_id) pay on pay.mitra_id = m.id
  ) x;

  return jsonb_build_object(
    'mitras', v_rows,
    'unattributed_total', (select count(*) from public.profiles p where p.mitra_id is null and public.ks_mitra_offered(p))
  );
end;
$$;

-- 7. admin: one Mitra's people (REPLACES 0075; phones masked; new keys first_offer_at, offers_count, not_counted_yet) ---
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
           public.ks_mitra_first_offer_at(p) as first_offer_at,
           (select count(*) from public.listings l
             where l.user_id = p.id and l.listing_type = 'offer' and l.status <> 'removed' and l.admin_disabled_at is null) as offers_count,
           (not public.ks_mitra_offered(p)) as not_counted_yet,
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

-- 8. admin: move one person to another Mitra, or to none (same behaviour as 0075) -----------------------------------
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

-- 9. admin: mark paid - one transaction, farmers AND ads (REPLACES 0075) ---------------------------------------------
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
  v_ads   integer := 0;
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

  -- Stamp exactly the counted-and-unpaid farmers of THIS Mitra (attributed, not blocked, offered a service) ...
  with stamped as (
    update public.profiles p set mitra_paid_id = v_pay
     where p.mitra_id = p_mitra_id and p.mitra_paid_id is null and not p.is_blocked and public.ks_mitra_offered(p)
     returning public.ks_mitra_kind(p) as k
  )
  select count(*) filter (where k = 'farmer'), count(*) filter (where k = 'business') into v_f, v_b from stamped;

  -- ... and the unpaid ads of this Mitra (each ad counts as one business).
  with stamped_ads as (
    update public.announcements a set mitra_paid_id = v_pay
     where a.mitra_id = p_mitra_id and a.mitra_paid_id is null
     returning a.id
  )
  select count(*) into v_ads from stamped_ads;
  v_b := coalesce(v_b, 0) + coalesce(v_ads, 0);

  if coalesce(v_f, 0) + coalesce(v_b, 0) = 0 then raise exception 'nothing_unpaid'; end if; -- rolls the payment row back too
  update public.kissan_mitra_payments set farmer_count = v_f, business_count = v_b where id = v_pay;
  perform public.log_admin_action(p_actor, 'mitra_paid', 'kissan_mitra', p_mitra_id::text,
    jsonb_build_object('amount', p_amount_rupees, 'farmers', v_f, 'businesses', v_b, 'ads', v_ads));
  return jsonb_build_object('ok', true, 'payment_id', v_pay, 'farmer_count', v_f, 'business_count', v_b, 'amount_rupees', p_amount_rupees);
end;
$$;

-- 10. grants (exact signatures) -------------------------------------------------------------------------------------
revoke all on function public.admin_set_announcement_mitra(uuid, uuid, uuid) from public;
revoke all on function public.admin_get_announcement_mitras(uuid) from public;
revoke all on function public.admin_list_mitra_ads(uuid, uuid) from public;
revoke all on function public.admin_list_mitras(uuid) from public;
revoke all on function public.admin_list_mitra_registrations(uuid, uuid, integer, integer) from public;
revoke all on function public.admin_reassign_registration(uuid, uuid, uuid) from public;
revoke all on function public.admin_mark_mitra_paid(uuid, uuid, integer, date, text) from public;
grant execute on function public.admin_set_announcement_mitra(uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.admin_get_announcement_mitras(uuid) to anon, authenticated;
grant execute on function public.admin_list_mitra_ads(uuid, uuid) to anon, authenticated;
grant execute on function public.admin_list_mitras(uuid) to anon, authenticated;
grant execute on function public.admin_list_mitra_registrations(uuid, uuid, integer, integer) to anon, authenticated;
grant execute on function public.admin_reassign_registration(uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.admin_mark_mitra_paid(uuid, uuid, integer, date, text) to anon, authenticated;
