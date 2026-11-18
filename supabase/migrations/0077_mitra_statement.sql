-- 0077_mitra_statement.sql - Batch 22D: the Kissan Mitra STATEMENT - what one Mitra brought, on which date, and the money against each.
-- STRICTLY ADDITIVE and IDEMPOTENT. Pure ASCII. Needs 0075 and 0076 applied first. NOT applied anywhere by the batch (the founder
-- pastes it: staging first, then production). It changes NO existing function and NO existing table.
--
-- What this file does
--   * admin_mitra_statement(actor, mitra, limit, offset)   anon, authenticated   guarded INSIDE by require_admin_session(actor, false).
--     Returns { mitra, totals, rows } for ONE Mitra:
--       mitra   id, display_name, area, is_active, rate_farmer_rupees, rate_business_rupees (NO private phone).
--       totals  farmers, ads, waiting_first_offer, earned_rupees, paid_rupees, due_rupees, rate_missing. They cover ALL rows,
--               not only the returned page. waiting_first_offer = people linked to this Mitra, not blocked, who have not offered
--               a service yet (they are not counted and not paid).
--       rows    newest first by date, then id; limit 1..500 (default 200), offset >= 0. Each row: kind ('farmer' or 'ad'),
--               ref_id (profile id or announcement id), name (farmer full name, or the ad title_hi), village (farmers only),
--               masked_phone (farmers only, last 4 digits, same masking as 0075), category (the category of the farmer's
--               FIRST offer listing; null for ads), on_date (farmers: first offer date; ads: announcement created_at),
--               amount_rupees, paid, paid_on (date of the payment that covered it, joined by mitra_paid_id), payment_id,
--               blocked (always false: blocked people are not rows).
--   * Which farmers are rows: EXACTLY the 0076 rule - attributed to this Mitra, not blocked, ks_mitra_offered(). The date is
--     ks_mitra_first_offer_at(). Those two 0076 helpers are used as they are; the rule is not written a second time. Ads:
--     announcements with this mitra_id.
--   * The category is read from the listing created at that first-offer time (same person, listing_type 'offer').
-- IMPORTANT - the amount per row is the Mitra's CURRENT rate (rate_farmer_rupees for a farmer, rate_business_rupees for an ad;
--   null when that rate is not set). Payments are stored as ONE lump sum and the founder may change the amount when paying, so
--   no per-row amount is stored. If a rate is changed later, the statement shows the new rate against old rows too. paid_rupees and
--   due_rupees are the sums of those per-row amounts for paid and unpaid rows; they are a statement, not the payment ledger
--   (the ledger is admin_list_mitra_payments).
-- What this file does NOT do
--   * It does not return listing details, photos, a full phone number or the Mitra's private phone.
--   * It does not touch 0075 / 0076 functions, create_listing_with_location, registration, announcements, or the OTP switches
--     (otp_required, session_enforced).
-- Error codes the UI maps: not_admin, session_required, not_found.

create or replace function public.admin_mitra_statement(p_actor uuid, p_mitra_id uuid, p_limit integer default 200, p_offset integer default 0)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit  integer := least(greatest(coalesce(p_limit, 200), 1), 500);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_m      public.kissan_mitras%rowtype;
  v_wait   integer;
  v_res    jsonb;
begin
  perform public.require_admin_session(p_actor, false);
  select * into v_m from public.kissan_mitras where id = p_mitra_id;
  if not found then raise exception 'not_found'; end if;

  select count(*) into v_wait
    from public.profiles pp
   where pp.mitra_id = p_mitra_id and not pp.is_blocked and not public.ks_mitra_offered(pp);

  with e as (
    -- farmers: attributed, not blocked, offered a service (0076 helpers); the date is the first offer
    select 'farmer'::text as kind, pp.id as ref_id, pp.full_name as name, pp.village_town as village,
           case when pp.phone is null then null else '******' || right(pp.phone, 4) end as masked_phone,
           (select l.category from public.listings l
             where l.user_id = pp.id and l.listing_type = 'offer' and l.created_at = public.ks_mitra_first_offer_at(pp)
             order by l.id limit 1) as category,
           public.ks_mitra_first_offer_at(pp) as on_date,
           case when public.ks_mitra_kind(pp) = 'business' then v_m.rate_business_rupees else v_m.rate_farmer_rupees end as amount_rupees,
           pp.mitra_paid_id as payment_id
      from public.profiles pp
     where pp.mitra_id = p_mitra_id and not pp.is_blocked and public.ks_mitra_offered(pp)
    union all
    -- ads: one per announcement that has this Mitra
    select 'ad'::text, a.id, a.title_hi, null::text, null::text, null::text, a.created_at, v_m.rate_business_rupees, a.mitra_paid_id
      from public.announcements a
     where a.mitra_id = p_mitra_id
  ),
  f as (
    select e.*, (e.payment_id is not null) as paid, pay.paid_on
      from e left join public.kissan_mitra_payments pay on pay.id = e.payment_id
  )
  select jsonb_build_object(
    'mitra', jsonb_build_object('id', v_m.id, 'display_name', v_m.display_name, 'area', v_m.area, 'is_active', v_m.is_active,
                                'rate_farmer_rupees', v_m.rate_farmer_rupees, 'rate_business_rupees', v_m.rate_business_rupees),
    'totals', (select jsonb_build_object(
                 'farmers', count(*) filter (where f.kind = 'farmer'),
                 'ads', count(*) filter (where f.kind = 'ad'),
                 'waiting_first_offer', v_wait,
                 'earned_rupees', coalesce(sum(f.amount_rupees), 0),
                 'paid_rupees', coalesce(sum(f.amount_rupees) filter (where f.paid), 0),
                 'due_rupees', coalesce(sum(f.amount_rupees) filter (where not f.paid), 0),
                 'rate_missing', coalesce(bool_or(f.amount_rupees is null), false))
               from f),
    'rows', coalesce((select jsonb_agg(to_jsonb(r) order by r.on_date desc, r.ref_id)
                        from (select f.kind, f.ref_id, f.name, f.village, f.masked_phone, f.category, f.on_date, f.amount_rupees,
                                     f.paid, f.paid_on, f.payment_id, false as blocked
                                from f order by f.on_date desc, f.ref_id limit v_limit offset v_offset) r), '[]'::jsonb)
  ) into v_res;
  return v_res;
end;
$$;

revoke all on function public.admin_mitra_statement(uuid, uuid, integer, integer) from public;
grant execute on function public.admin_mitra_statement(uuid, uuid, integer, integer) to anon, authenticated;
