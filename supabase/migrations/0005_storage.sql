-- Kisan Sahyog — 0005 storage bucket for listing photos (Land).
-- Public-read bucket; anon may upload (trust-based MVP, consistent with the
-- rest of the platform). Photos are optional and capped at 3 per listing in
-- the client. Phase 2 real-auth would scope uploads to auth.uid()'s folder.

insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

-- Public read.
drop policy if exists "listing_photos_public_read" on storage.objects;
create policy "listing_photos_public_read"
  on storage.objects for select to anon
  using (bucket_id = 'listing-photos');

-- Anon upload into this bucket only.
drop policy if exists "listing_photos_anon_insert" on storage.objects;
create policy "listing_photos_anon_insert"
  on storage.objects for insert to anon
  with check (bucket_id = 'listing-photos');
