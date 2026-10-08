begin;
\ir _helpers.psql
select plan(11);

select tests.create_user('owner-a@test.local', 'dealer') as owner_a \gset
select tests.create_user('staff-a@test.local', 'dealer') as staff_a \gset
select tests.create_user('owner-b@test.local', 'dealer') as owner_b \gset
select tests.create_user('admin@test.local', 'admin') as admin \gset
select tests.create_dealer('st-dealer-a', 'approved', :'owner_a') as dealer_a \gset
select tests.create_dealer('st-dealer-b', 'approved', :'owner_b') as dealer_b \gset
insert into public.dealer_members (dealer_id, user_id, role) values (:'dealer_a', :'staff_a', 'staff');
select tests.create_vehicle(:'dealer_a', 'draft') as a_vehicle \gset
select tests.create_vehicle(:'dealer_b', 'draft') as b_vehicle \gset

select results_eq(
  $$select id, public from storage.buckets where id in ('vehicle-images','dealer-assets','dealer-docs','trade-in-photos') order by id$$,
  $$values ('dealer-assets', true), ('dealer-docs', false), ('trade-in-photos', false), ('vehicle-images', true)$$,
  'buckets exist with the right visibility'
);

select tests.authenticate_as(:'staff_a');
select lives_ok(
  format($$insert into storage.objects (bucket_id, name, owner) values ('vehicle-images', %L, auth.uid())$$,
         :'dealer_a' || '/' || :'a_vehicle' || '/front.webp'),
  'staff can upload photos for own dealer vehicle'
);
select throws_ok(
  format($$insert into storage.objects (bucket_id, name, owner) values ('vehicle-images', %L, auth.uid())$$,
         :'dealer_b' || '/' || :'b_vehicle' || '/evil.webp'),
  '42501', null, 'cannot upload into another dealers folder'
);
select throws_ok(
  format($$insert into storage.objects (bucket_id, name, owner) values ('vehicle-images', %L, auth.uid())$$,
         :'dealer_a' || '/' || :'b_vehicle' || '/mismatch.webp'),
  '42501', null, 'vehicle in the path must belong to the dealer folder'
);
select throws_ok(
  format($$insert into storage.objects (bucket_id, name, owner) values ('dealer-assets', %L, auth.uid())$$,
         :'dealer_a' || '/logo.webp'),
  '42501', null, 'staff cannot change dealer branding'
);
select lives_ok(
  format($$insert into storage.objects (bucket_id, name, owner) values ('dealer-docs', %L, auth.uid())$$,
         :'dealer_a' || '/license.pdf'),
  'members can upload dealer documents'
);

select tests.authenticate_as(:'owner_a');
select lives_ok(
  format($$insert into storage.objects (bucket_id, name, owner) values ('dealer-assets', %L, auth.uid())$$,
         :'dealer_a' || '/logo.webp'),
  'owners can upload dealer branding'
);

select tests.authenticate_as(:'owner_b');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'dealer-docs' and name like :'dealer_a' || '/%'),
  0, 'other dealers cannot read private documents'
);
-- Direct SQL deletes are blocked by storage.protect_delete(); the delete policy is exercised via the
-- Storage API in the Phase 4 e2e suite. Visibility is a prerequisite for API deletes:
select is(
  (select count(*)::int from storage.objects where bucket_id = 'vehicle-images' and name like :'dealer_a' || '/%'),
  0, 'other dealers cannot see (and so cannot delete) another dealers photos'
);

select tests.authenticate_as_anon();
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('vehicle-images', %L)$$,
         :'dealer_a' || '/' || :'a_vehicle' || '/anon.webp'),
  '42501', null, 'anon cannot upload'
);

select tests.authenticate_as(:'admin');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'dealer-docs' and name like :'dealer_a' || '/%'),
  1, 'admins can read every dealers documents'
);

select * from finish();
rollback;
