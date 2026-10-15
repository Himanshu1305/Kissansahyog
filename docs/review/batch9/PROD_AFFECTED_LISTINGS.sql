-- Batch 9B — READ-ONLY. Not run by Claude Code. For the founder to run later on PRODUCTION
-- (Supabase dashboard -> SQL editor -> production project). It only counts; it changes nothing.
-- Works before AND after migrations 0061/0062 (it does not use the new columns).
--
-- Question: how many live shop/vendor and provider listings belong to owners who chose
-- "keep my details hidden"? Those listings keep hiding the number (no consent on old listings).
-- After Batch 9B a NEW listing of that kind shows the number only if the owner ticks "I agree".

-- 1) Live vendor listings + provider offers whose owner is hidden, per category and kind.
select l.category,
       l.listing_source,
       l.listing_type,
       count(*) as listings_with_hidden_owner
from public.listings l
join public.profiles p on p.id = l.user_id
where l.status = 'active'
  and l.expires_at > now()
  and p.consents #>> '{details_visibility,choice}' = 'hidden'
  and (l.listing_source = 'vendor'
       or (l.listing_type = 'offer' and l.category in ('equipment', 'warehouse', 'greenhouse', 'jugaad')))
group by 1, 2, 3
order by 1, 2, 3;

-- 2) Finding F1 on existing rows: Seeds & fertiliser "Shop / Vendor" listings that still carry a
--    phone number in the PUBLIC listing data while the owner is hidden (any status). Batch 9B stops
--    this for new posts only; these old rows are a founder decision (BACKLOG "F1 old rows").
select count(*) as agri_shop_rows_with_public_number_and_hidden_owner
from public.listings l
join public.profiles p on p.id = l.user_id
where l.category = 'agri_inputs'
  and coalesce(l.details->>'contact_phone', '') <> ''
  and p.consents #>> '{details_visibility,choice}' = 'hidden';
