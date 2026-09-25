-- 0028_land_acreage.sql — Part B Phase 2b
-- Replace Land's size_range bucket string with a plain numeric size_acres inside
-- listings.details. Existing bucketed seed/dummy listings are converted to a
-- representative MIDPOINT value. This is an APPROXIMATION for pre-existing bucketed
-- data (the exact acreage was never captured under the old buckets) — NOT a precision
-- claim. All new listings capture the exact acreage the farmer types.
update public.listings
set details = (details - 'size_range')
  || jsonb_build_object(
       'size_acres',
       case details->>'size_range'
         when '<1'   then 0.5
         when '1-2'  then 1.5
         when '2-5'  then 3.5
         when '5-10' then 7.5
         when '10+'  then 12
         else null
       end)
where category = 'land'
  and details ? 'size_range';
