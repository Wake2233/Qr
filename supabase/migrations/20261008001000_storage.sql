-- Storage buckets and object policies.
-- Paths: vehicle-images/{dealer_id}/{vehicle_id}/{uuid}.webp, dealer-assets/{dealer_id}/...,
--        dealer-docs/{dealer_id}/{uuid}.pdf, trade-in-photos/{lead_id}/{uuid}.jpg

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('vehicle-images', 'vehicle-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('dealer-assets', 'dealer-assets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('dealer-docs', 'dealer-docs', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png']),
  ('trade-in-photos', 'trade-in-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- vehicle-images: members write into {their dealer}/{a vehicle of that dealer}/...
-- Public reads go through the public bucket URL, so no anon SELECT policy (prevents listing).
create policy "vehicle-images: members can read own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'vehicle-images'
    and (storage.foldername(name))[1] in (select d::text from private.user_dealer_ids() d)
  );

create policy "vehicle-images: members can upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'vehicle-images'
    and (storage.foldername(name))[1] in (select d::text from private.user_dealer_ids() d)
    and exists (
      select 1 from public.vehicles v
      where v.id::text = (storage.foldername(name))[2]
        and v.dealer_id::text = (storage.foldername(name))[1]
    )
  );

create policy "vehicle-images: members can update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'vehicle-images'
    and (storage.foldername(name))[1] in (select d::text from private.user_dealer_ids() d)
  )
  with check (
    bucket_id = 'vehicle-images'
    and (storage.foldername(name))[1] in (select d::text from private.user_dealer_ids() d)
  );

create policy "vehicle-images: members can delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'vehicle-images'
    and (storage.foldername(name))[1] in (select d::text from private.user_dealer_ids() d)
  );

-- dealer-assets: owners/managers manage their dealer's logo and banners.
create policy "dealer-assets: managers can read own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'dealer-assets'
    and (storage.foldername(name))[1] in (select d::text from private.user_managed_dealer_ids() d)
  );

create policy "dealer-assets: managers can upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'dealer-assets'
    and (storage.foldername(name))[1] in (select d::text from private.user_managed_dealer_ids() d)
  );

create policy "dealer-assets: managers can update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'dealer-assets'
    and (storage.foldername(name))[1] in (select d::text from private.user_managed_dealer_ids() d)
  )
  with check (
    bucket_id = 'dealer-assets'
    and (storage.foldername(name))[1] in (select d::text from private.user_managed_dealer_ids() d)
  );

create policy "dealer-assets: managers can delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'dealer-assets'
    and (storage.foldername(name))[1] in (select d::text from private.user_managed_dealer_ids() d)
  );

-- dealer-docs: private; members read/upload, managers delete. Served via signed URLs.
create policy "dealer-docs: members can read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'dealer-docs'
    and (storage.foldername(name))[1] in (select d::text from private.user_dealer_ids() d)
  );

create policy "dealer-docs: members can upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'dealer-docs'
    and (storage.foldername(name))[1] in (select d::text from private.user_dealer_ids() d)
  );

create policy "dealer-docs: managers can delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'dealer-docs'
    and (storage.foldername(name))[1] in (select d::text from private.user_managed_dealer_ids() d)
  );

-- trade-in-photos: uploaded through signed upload URLs (Phase 6); dealer members of the lead can read.
create policy "trade-in-photos: lead dealer members can read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'trade-in-photos'
    and exists (
      select 1 from public.leads l
      where l.id::text = (storage.foldername(name))[1]
        and l.dealer_id in (select private.user_dealer_ids())
    )
  );

-- Admins can manage every bucket above.
create policy "storage: admins can manage platform buckets"
  on storage.objects for all to authenticated
  using (
    bucket_id in ('vehicle-images', 'dealer-assets', 'dealer-docs', 'trade-in-photos')
    and (select private.is_admin())
  )
  with check (
    bucket_id in ('vehicle-images', 'dealer-assets', 'dealer-docs', 'trade-in-photos')
    and (select private.is_admin())
  );
