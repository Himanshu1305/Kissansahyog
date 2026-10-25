# Batch 10G — orphan photos

None. Option 2 (queue-gated Storage API delete) removes the files of a deleted listing (`evidence/photo-proof.md`).
If a removal is interrupted (phone offline, tab closed), the paths stay queued for the person who deleted the
listing and the app retries them the next time My Listings (seller) or the admin listings panel (admin) loads
(`get_my_pending_photo_deletions`). Queued paths older than 30 days can no longer be deleted through the API;
to find any that were never removed, run read-only in the SQL editor:

    select object_name, queued_at from public.listing_photo_deletions d
    where exists (select 1 from storage.objects o where o.bucket_id = 'listing-photos' and o.name = d.object_name)
    order by queued_at;

Photos of listings deleted BEFORE 10G (e.g. through a profile delete) are not covered (pre-existing; BACKLOG).
